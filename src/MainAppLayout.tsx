import { useRef, useEffect, useState, useCallback } from 'react';
import { PhaserGame, IRefPhaserGame } from './PhaserGame';
import CesiumMap from './components/CesiumMap';
import { SpeciesPanel } from './components/SpeciesPanel';
import SpeciesList from './components/SpeciesList';
import UserMenu from './components/UserMenu';
import { EventBus } from './game/EventBus';
import type { EventPayloads } from './game/EventBus';
import { toast, Toaster } from 'sonner';
import { PiBookOpenTextLight } from "react-icons/pi";
import type { ConsumableItem, RunState, SouvenirDef, ClueCategoryKey, DeductionCampState, ClueShopEntry } from '@/types/expedition';
import { createEmptyResourceWallet, createEmptyClueFragments, CLUE_CATEGORY_KEYS, getDeductionFinalScore, getGuessBonuses } from '@/types/expedition';
import { GRID_COLS, GRID_ROWS } from '@/game/constants';
import { buildNodeBoardContext } from '@/game/nodeObstacles';
import { ExpeditionBriefing } from './components/ExpeditionBriefing';
import { RunTrack } from './components/RunTrack';
import { ActiveEncounterPanel } from './components/ActiveEncounterPanel';
import { GemWallet } from './components/GemWallet';
import { SouvenirPouch } from './components/SouvenirPouch';
import { ConsumableTray } from './components/ConsumableTray';
import { DeductionCamp } from './components/DeductionCamp';
import { buildBoardSpawnConfigForNode, WALLET_DEFS } from '@/expedition/domain';

const INITIAL_RUN_STATE: RunState = {
    phase: 'idle',
    expedition: null,
    currentNodeIndex: 0,
    resourceWallet: createEmptyResourceWallet(),
    lootMatchSummary: {},
    equippedPassives: [],
    consumables: [],
    pendingNodeModifiers: [],
    currentBattleState: null,
    souvenirs: [],
    bankedScore: 0,
    clueFragments: createEmptyClueFragments(),
    triviaUnlocked: [],
    deductionCamp: null,
    currentNodeBonus: null,
    lastNodeRewards: null,
    finalScore: null,
    totalThoughtDiscount: 0,
};

function MainAppLayout() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [viewMode, setViewMode] = useState<'map' | 'species'>('map');
    const [scrollToSpeciesId, setScrollToSpeciesId] = useState<number | null>(null);
    const [runState, setRunState] = useState<RunState>(INITIAL_RUN_STATE);

    // Store full expedition payload for re-emitting cesium-location-selected per node
    const expeditionPayloadRef = useRef<EventPayloads['expedition-data-ready'] | null>(null);
    const runIdRef = useRef<string | null>(null);
    const nodeIdsRef = useRef<string[]>([]);
    const hudRef = useRef<{ score: number; movesUsed: number }>({ score: 0, movesUsed: 0 });
    const nodeStartScoreRef = useRef<number>(0);
    const nodeObjectiveProgressRef = useRef<number>(0);
    const lastResolvedNodeRef = useRef<number>(-1);
    const correctSpeciesIdRef = useRef<number>(0);
    const hiddenSpeciesNameRef = useRef<string>('');

    const handlePhaserSceneReady = (scene: Phaser.Scene) => {
        console.log('MainAppLayout: Phaser scene ready -', scene.scene.key);
        if (phaserRef.current) {
            phaserRef.current.scene = scene;
        }
    };

    // --- Expedition event handlers ---

    const handleExpeditionDataReady = useCallback((data: EventPayloads['expedition-data-ready']) => {
        expeditionPayloadRef.current = data;
        setRunState({
            ...INITIAL_RUN_STATE,
            phase: 'briefing',
            expedition: data.expedition,
        });
    }, []);

    const handleExpeditionStart = useCallback(() => {
        setRunState(prev => ({ ...prev, phase: 'in-run' }));
        // Reset score tracking for this run
        hudRef.current = { score: 0, movesUsed: 0 };
        nodeStartScoreRef.current = 0;
        lastResolvedNodeRef.current = -1;
        const payload = expeditionPayloadRef.current;
        if (!payload) return;

        // Identify correct species (lowest ogc_fid, same as Game.ts)
        const sorted = [...payload.species].sort((a, b) => a.ogc_fid - b.ogc_fid);
        const correct = sorted[0];
        if (correct) {
            correctSpeciesIdRef.current = correct.ogc_fid;
            hiddenSpeciesNameRef.current = correct.common_name || correct.scientific_name || 'Unknown Species';
        }

        // Persist run to DB (fire-and-forget; don't block puzzle init)
        const locationKey = `${payload.lon.toFixed(4)},${payload.lat.toFixed(4)}`;
        fetch('/api/runs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lon: payload.lon,
                lat: payload.lat,
                locationKey,
                nodes: payload.expedition.nodes,
                bioregion: payload.expedition.bioregion?.bioregion ?? undefined,
                realm: payload.expedition.bioregion?.realm ?? undefined,
                biome: payload.expedition.bioregion?.biome ?? undefined,
            }),
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data) {
                    runIdRef.current = data.runId;
                    nodeIdsRef.current = data.nodeIds;
                    console.log('Run session created:', data.runId);
                }
            })
            .catch(err => console.error('Failed to create run session:', err));

        // Emit cesium-location-selected to trigger Game scene puzzle init
        nodeObjectiveProgressRef.current = 0;
        const firstNode = payload.expedition.nodes[0];
        const firstBoardContext = buildNodeBoardContext({
            width: GRID_COLS,
            height: GRID_ROWS,
            obstacles: firstNode?.obstacles ?? [],
            nodeIndex: 0,
        });
        const firstBoardConfig = buildBoardSpawnConfigForNode(
            firstNode?.node_type ?? 'custom',
            firstNode?.requiredGems ?? [],
            payload.expedition.actionBias
        );
        EventBus.emit('cesium-location-selected', {
            lon: payload.lon,
            lat: payload.lat,
            species: payload.species,
            rasterHabitats: payload.rasterHabitats,
            habitats: payload.habitats,
            difficulty: firstNode?.difficulty,
            obstacles: firstNode?.obstacles,
            requiredGems: firstNode?.requiredGems,
            objectiveTarget: firstNode?.objectiveTarget,
            nodeIndex: 0,
            events: firstNode?.events,
            boardContext: firstBoardContext,
            boardConfig: firstBoardConfig,
        });
    }, []);

    const handleNodeAdvanceRequested = useCallback((data: EventPayloads['node-advance-requested']) => {
        setRunState(prev => {
            // Guard: only advance if actively in-run
            if (prev.phase !== 'in-run') return prev;
            if (data.nodeIndex !== prev.currentNodeIndex) return prev;
            if (data.nodeIndex <= lastResolvedNodeRef.current) return prev;

            // Escaped: animal fled — skip remaining nodes, go to Deduction Camp
            if (data.reason === 'escaped') {
                lastResolvedNodeRef.current = prev.currentNodeIndex;
                const campShop: ClueShopEntry[] = CLUE_CATEGORY_KEYS.map(cat => ({
                    category: cat,
                    purchased: 0,
                    fragmentCount: prev.clueFragments[cat],
                }));
                const campState: DeductionCampState = {
                    bankedScore: prev.bankedScore,
                    clueFragments: { ...prev.clueFragments },
                    clueShop: campShop,
                    revealedClues: [],
                    triviaUnlocked: [...prev.triviaUnlocked],
                    scoreSpent: 0,
                    guessResult: null,
                    guessBonusAwarded: 0,
                    thoughtDiscountPct: prev.totalThoughtDiscount,
                };
                if (runIdRef.current) {
                    const wallet = { ...prev.resourceWallet };
                    const rid = runIdRef.current;
                    setTimeout(() => {
                        fetch(`/api/runs/${rid}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ resourceWallet: wallet }),
                        }).catch(err => console.error('Failed to persist resource wallet:', err));
                    }, 0);
                }
                setTimeout(() => toast('Animal escaped! Reviewing gathered evidence...', { duration: 3000 }), 0);
                return { ...prev, phase: 'deduction' as const, deductionCamp: campState };
            }

            const nodeOrder = prev.currentNodeIndex + 1; // 1-based for DB
            const nextIndex = prev.currentNodeIndex + 1;
            lastResolvedNodeRef.current = prev.currentNodeIndex;

            // Persist node completion with actual score/moves + objective progress
            const nodeScore = hudRef.current.score - nodeStartScoreRef.current;
            const nodeMoves = hudRef.current.movesUsed;
            const objProgress = nodeObjectiveProgressRef.current;
            if (runIdRef.current) {
                fetch(`/api/runs/${runIdRef.current}/nodes/${nodeOrder}/complete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        scoreEarned: Math.max(0, nodeScore),
                        movesUsed: nodeMoves,
                        objectiveProgress: objProgress,
                        souvenirs: prev.souvenirs.length > 0
                            ? prev.souvenirs.map(s => ({ id: s.id, name: s.name }))
                            : undefined,
                    }),
                }).catch(err => console.error('Failed to complete node:', err));
            }

            EventBus.emit('node-complete', { nodeIndex: prev.currentNodeIndex });
            // Next node starts from current cumulative score
            nodeStartScoreRef.current = hudRef.current.score;

            if (nextIndex >= (prev.expedition?.nodes.length ?? 6)) {
                // Build deduction camp state
                const campShop: ClueShopEntry[] = CLUE_CATEGORY_KEYS.map(cat => ({
                    category: cat,
                    purchased: 0,
                    fragmentCount: prev.clueFragments[cat],
                }));
                const campState: DeductionCampState = {
                    bankedScore: prev.bankedScore,
                    clueFragments: { ...prev.clueFragments },
                    clueShop: campShop,
                    revealedClues: [],
                    triviaUnlocked: [...prev.triviaUnlocked],
                    scoreSpent: 0,
                    guessResult: null,
                    guessBonusAwarded: 0,
                    thoughtDiscountPct: prev.totalThoughtDiscount,
                };
                // Persist resource wallet to session metadata
                if (runIdRef.current) {
                    const wallet = { ...prev.resourceWallet };
                    const rid = runIdRef.current;
                    setTimeout(() => {
                        fetch(`/api/runs/${rid}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ resourceWallet: wallet }),
                        }).catch(err => console.error('Failed to persist resource wallet:', err));
                    }, 0);
                }
                setTimeout(() => toast.success('All nodes complete — time to identify!', { duration: 3000 }), 0);
                return { ...prev, phase: 'deduction' as const, currentNodeIndex: nextIndex, deductionCamp: campState };
            }
            // Advance to next node
            setTimeout(() => toast(`Node ${nodeOrder} complete — next up!`, { duration: 1500 }), 0);
            const payload = expeditionPayloadRef.current;
            if (payload) {
                const nextNode = prev.expedition?.nodes[nextIndex];
                nodeObjectiveProgressRef.current = 0;
                setTimeout(() => {
                    const nextBoardContext = buildNodeBoardContext({
                        width: GRID_COLS,
                        height: GRID_ROWS,
                        obstacles: nextNode?.obstacles ?? [],
                        nodeIndex: nextIndex,
                    });
                    const nextBoardConfig = buildBoardSpawnConfigForNode(
                        nextNode?.node_type ?? 'custom',
                        nextNode?.requiredGems ?? [],
                        prev.expedition?.actionBias ?? {}
                    );
                    EventBus.emit('cesium-location-selected', {
                        lon: payload.lon,
                        lat: payload.lat,
                        species: payload.species,
                        rasterHabitats: payload.rasterHabitats,
                        habitats: payload.habitats,
                        difficulty: nextNode?.difficulty,
                        obstacles: nextNode?.obstacles,
                        requiredGems: nextNode?.requiredGems,
                        objectiveTarget: nextNode?.objectiveTarget,
                        nodeIndex: nextIndex,
                        events: nextNode?.events,
                        boardContext: nextBoardContext,
                        boardConfig: nextBoardConfig,
                    });
                }, 100);
            }
            return { ...prev, currentNodeIndex: nextIndex };
        });
    }, []);

    /** Accumulate resource gem rewards from board matches into runState.resourceWallet. */
    const handleResourceWalletUpdate = useCallback((data: EventPayloads['resource-wallet-updated']) => {
        setRunState(prev => {
            if (prev.phase !== 'in-run') return prev;
            const w = { ...prev.resourceWallet };
            for (const [k, v] of Object.entries(data.wallet)) {
                if (k in w) (w as any)[k] += v;
            }
            return { ...prev, resourceWallet: w };
        });
    }, []);

    const handleRunReset = useCallback(() => {
        runIdRef.current = null;
        nodeIdsRef.current = [];
        hudRef.current = { score: 0, movesUsed: 0 };
        nodeStartScoreRef.current = 0;
        lastResolvedNodeRef.current = -1;
        setRunState(INITIAL_RUN_STATE);
        EventBus.emit('game-reset', undefined);
    }, []);

    // Track latest HUD state for persisting score/moves on node-complete
    const handleHudUpdate = useCallback((data: EventPayloads['game-hud-updated']) => {
        hudRef.current = { score: data.score, movesUsed: data.movesUsed };
    }, []);

    const handleObjectiveUpdate = useCallback((data: EventPayloads['node-objective-updated']) => {
        nodeObjectiveProgressRef.current = data.progress;
    }, []);

    const handleSouvenirDrop = useCallback((data: { souvenir: SouvenirDef }) => {
        setRunState(prev => prev.phase === 'in-run'
            ? { ...prev, souvenirs: [...prev.souvenirs, data.souvenir] }
            : prev
        );
    }, []);

    const handleConsumableFound = useCallback((data: EventPayloads['consumable-found']) => {
        setRunState(prev => prev.phase === 'in-run'
            ? { ...prev, consumables: [...prev.consumables, data.item] }
            : prev
        );
        toast(`Crate yielded ${data.item.name}`, { duration: 1600 });
    }, []);

    /** Accumulate clue fragments from loot gem matches during expedition nodes. */
    const handleClueFragmentEarned = useCallback((data: EventPayloads['clue-fragment-earned']) => {
        setRunState(prev => {
            if (prev.phase !== 'in-run') return prev;
            const frags = { ...prev.clueFragments };
            frags[data.category] += data.amount;
            return { ...prev, clueFragments: frags };
        });
    }, []);

    /** Accumulate clue shop discounts from thought gem matches during expedition nodes. */
    const handleClueDiscountEarned = useCallback((data: EventPayloads['clue-discount-earned']) => {
        setRunState(prev => {
            if (prev.phase !== 'in-run') return prev;
            return { ...prev, totalThoughtDiscount: prev.totalThoughtDiscount + data.amount };
        });
    }, []);

    /** Bank node reward score when a node is completed. */
    const handleNodeRewardsSummary = useCallback((data: EventPayloads['node-rewards-summary']) => {
        const totalReward = data.baseClearReward + data.preservedNodeBonus + data.triviaReward;
        setRunState(prev => {
            if (prev.phase !== 'in-run') return prev;
            return {
                ...prev,
                bankedScore: prev.bankedScore + totalReward,
                lastNodeRewards: data,
            };
        });
    }, []);

    /** Persist deduction clue history in run state so the UI survives rerenders and remounts. */
    const handleClueRevealed = useCallback((clue: EventPayloads['clue-revealed']) => {
        setRunState(prev => {
            if (prev.phase !== 'deduction' || !prev.deductionCamp) return prev;
            const exists = prev.deductionCamp.revealedClues.some(
                existing => existing.category === clue.category && existing.clue === clue.clue
            );
            if (exists) return prev;
            return {
                ...prev,
                deductionCamp: {
                    ...prev.deductionCamp,
                    revealedClues: [clue, ...prev.deductionCamp.revealedClues],
                },
            };
        });
    }, []);

    const handleConsumableUseRequested = useCallback((data: EventPayloads['consumable-use-requested']) => {
        let consumedItem: ConsumableItem | null = null;
        setRunState(prev => {
            if (prev.phase !== 'in-run') return prev;
            const nextConsumables = prev.consumables.filter((item) => {
                const keep = item.instanceId !== data.itemInstanceId;
                if (!keep) consumedItem = item;
                return keep;
            });
            if (!consumedItem) return prev;
            return { ...prev, consumables: nextConsumables };
        });

        const usedItem = consumedItem as ConsumableItem | null;
        if (usedItem) {
            EventBus.emit('consumable-used', { item: usedItem });
            toast(`Used ${usedItem.name}`, { duration: 1400 });
        }
    }, []);

    /** Handle clue purchase from Deduction Camp. */
    const handleDeductionPurchase = useCallback((category: ClueCategoryKey, cost: number) => {
        setRunState(prev => {
            if (prev.phase !== 'deduction' || !prev.deductionCamp) return prev;
            const camp = { ...prev.deductionCamp };
            camp.scoreSpent += cost;
            camp.clueShop = camp.clueShop.map(e =>
                e.category === category ? { ...e, purchased: e.purchased + 1 } : e
            );
            // Reset wrong guess state so player can guess again after buying a clue
            if (camp.guessResult === 'wrong') camp.guessResult = null;
            return { ...prev, deductionCamp: camp };
        });
        // Trigger actual clue reveal via existing system
        EventBus.emit('deduction-camp-purchase', { category, cost });
    }, []);

    /** Handle guess result from SpeciesGuessSelector inside DeductionCamp. */
    const handleDeductionGuessResult = useCallback((isCorrect: boolean) => {
        setRunState(prev => {
            if (prev.phase !== 'deduction' || !prev.deductionCamp) return prev;
            const camp = { ...prev.deductionCamp };
            const totalPaid = camp.clueShop.reduce((sum, e) => sum + e.purchased, 0);
            if (isCorrect) {
                const { guessBonus, efficiencyBonus } = getGuessBonuses(totalPaid, true);
                camp.guessResult = 'correct';
                camp.guessBonusAwarded = guessBonus + efficiencyBonus;
                const finalScore = getDeductionFinalScore(camp);
                if (runIdRef.current) {
                    const rid = runIdRef.current;
                    const deductionSummary = {
                        scoreSpent: camp.scoreSpent,
                        purchasedClues: totalPaid,
                        revealedClues: camp.revealedClues.length,
                        thoughtDiscountPct: camp.thoughtDiscountPct,
                        finalScore,
                    };
                    setTimeout(() => {
                        fetch(`/api/runs/${rid}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ finalScore, deductionSummary }),
                        }).catch(err => console.error('Failed to persist deduction summary:', err));
                    }, 0);
                }
                return { ...prev, phase: 'complete', deductionCamp: camp, finalScore };
            } else {
                camp.guessResult = 'wrong';
                camp.scoreSpent += 25;
            }
            return { ...prev, deductionCamp: camp, finalScore: null };
        });
    }, []);

    // Handle show-species-list event
    useEffect(() => {
        const handleShowSpeciesList = (data: { speciesId: number }) => {
            setScrollToSpeciesId(data.speciesId);
            setViewMode('species');
        };

        EventBus.on('show-species-list', handleShowSpeciesList);
        EventBus.on('expedition-data-ready', handleExpeditionDataReady);
        EventBus.on('expedition-start', handleExpeditionStart);
        EventBus.on('node-advance-requested', handleNodeAdvanceRequested);
        EventBus.on('game-hud-updated', handleHudUpdate);
        EventBus.on('node-objective-updated', handleObjectiveUpdate);
        EventBus.on('souvenir-dropped', handleSouvenirDrop);
        EventBus.on('resource-wallet-updated', handleResourceWalletUpdate);
        EventBus.on('consumable-found', handleConsumableFound);
        EventBus.on('consumable-use-requested', handleConsumableUseRequested);
        EventBus.on('clue-fragment-earned', handleClueFragmentEarned);
        EventBus.on('clue-discount-earned', handleClueDiscountEarned);
        EventBus.on('clue-revealed', handleClueRevealed);
        EventBus.on('node-rewards-summary', handleNodeRewardsSummary);

        return () => {
            EventBus.off('show-species-list', handleShowSpeciesList);
            EventBus.off('expedition-data-ready', handleExpeditionDataReady);
            EventBus.off('expedition-start', handleExpeditionStart);
            EventBus.off('node-advance-requested', handleNodeAdvanceRequested);
            EventBus.off('game-hud-updated', handleHudUpdate);
            EventBus.off('node-objective-updated', handleObjectiveUpdate);
            EventBus.off('souvenir-dropped', handleSouvenirDrop);
            EventBus.off('resource-wallet-updated', handleResourceWalletUpdate);
            EventBus.off('consumable-found', handleConsumableFound);
            EventBus.off('consumable-use-requested', handleConsumableUseRequested);
            EventBus.off('clue-fragment-earned', handleClueFragmentEarned);
            EventBus.off('clue-discount-earned', handleClueDiscountEarned);
            EventBus.off('clue-revealed', handleClueRevealed);
            EventBus.off('node-rewards-summary', handleNodeRewardsSummary);
        };
    }, [handleExpeditionDataReady, handleExpeditionStart, handleNodeAdvanceRequested, handleHudUpdate, handleObjectiveUpdate, handleSouvenirDrop, handleResourceWalletUpdate, handleConsumableFound, handleConsumableUseRequested, handleClueFragmentEarned, handleClueDiscountEarned, handleClueRevealed, handleNodeRewardsSummary]);

    const appStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden'
    };
    const phaserGameWrapperStyle: React.CSSProperties = {
        width: '100%',
        height: '60%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    };
    const cesiumContainerStyle: React.CSSProperties = {
        width: '100%',
        height: '40%',
        minHeight: '0px',
        borderTop: '2px solid #555',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#0f172a',
        display: 'flex',
        flexDirection: 'column'
    };

    const inRun = runState.phase === 'in-run';
    const showBriefing = runState.phase === 'briefing';
    const showComplete = runState.phase === 'complete';
    const showDeduction = runState.phase === 'deduction';
    const currentNode = inRun && runState.expedition
        ? runState.expedition.nodes[runState.currentNodeIndex]
        : null;

    return (
        <div id="app-container" style={appStyle}>
            {/* Show game layout - position off-screen when in species view */}
            <div style={{
                position: viewMode === 'species' ? 'absolute' : 'relative',
                left: viewMode === 'species' ? '-9999px' : '0',
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%'
            }}>
                {/* RunTrack bar above Phaser canvas */}
                <div style={{ display: inRun && runState.expedition ? 'block' : 'none' }}>
                    {runState.expedition && (
                        <RunTrack nodes={runState.expedition.nodes} currentNodeIndex={runState.currentNodeIndex} />
                    )}
                </div>

                <div id="phaser-game-wrapper" style={phaserGameWrapperStyle}>
                    <PhaserGame ref={phaserRef} currentActiveScene={handlePhaserSceneReady} />

                    {/* ActiveEncounterPanel overlay inside phaser wrapper */}
                    {inRun && currentNode && (
                        <ActiveEncounterPanel
                            node={currentNode}
                            nodeIndex={runState.currentNodeIndex}
                            onComplete={() => EventBus.emit('node-advance-requested', {
                                nodeIndex: runState.currentNodeIndex,
                                reason: 'analysis_complete',
                                source: 'panel',
                            })}
                        />
                    )}

                    {/* GemWallet + SouvenirPouch fixed inside phaser wrapper */}
                    {inRun && (
                        <div style={{ position: 'absolute', bottom: '8px', left: '8px', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                                <GemWallet wallet={runState.resourceWallet} />
                                {runState.souvenirs.length > 0 && (
                                    <SouvenirPouch souvenirs={runState.souvenirs} />
                                )}
                            </div>
                            <ConsumableTray
                                items={runState.consumables}
                                onUse={(itemInstanceId) => EventBus.emit('consumable-use-requested', { itemInstanceId })}
                            />
                        </div>
                    )}
                </div>

                <div id="cesium-map-wrapper" style={cesiumContainerStyle}>
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 1000,
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center'
                }}>
                    <UserMenu />
                    <button
                        style={{
                            padding: '5px 10px',
                            backgroundColor: 'rgba(42, 42, 42, 0.8)',
                            color: 'white',
                            border: '1px solid #555',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                        onClick={() => setViewMode('species')}
                        title="Species List"
                    >
                        <PiBookOpenTextLight size={18} />
                    </button>
                </div>

                {/* Deduction Camp phase */}
                {showDeduction && runState.deductionCamp && (
                    <div style={{ height: '100%', width: '100%', overflow: 'auto' }}>
                        <DeductionCamp
                            camp={runState.deductionCamp}
                            speciesId={correctSpeciesIdRef.current}
                            hiddenSpeciesName={hiddenSpeciesNameRef.current}
                            onPurchase={handleDeductionPurchase}
                            onGuessResult={handleDeductionGuessResult}
                            onFinish={handleRunReset}
                        />
                    </div>
                )}

                {/* CesiumMap stays visible under briefing overlay */}
                <div style={{
                    display: (viewMode === 'map' && !showDeduction) ? 'block' : 'none',
                    height: '100%',
                    width: '100%'
                }}>
                    <CesiumMap />
                </div>

                {/* ExpeditionBriefing as overlay on top of map */}
                {showBriefing && runState.expedition && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 900,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(15,23,42,0.75)',
                        backdropFilter: 'blur(4px)',
                    }}>
                        <div style={{
                            width: '90%',
                            maxWidth: '420px',
                            maxHeight: '90%',
                            borderRadius: '12px',
                            background: 'rgba(15,23,42,0.95)',
                            border: '1px solid #334155',
                            overflow: 'hidden',
                        }}>
                            <ExpeditionBriefing
                                expedition={runState.expedition}
                                onStart={() => EventBus.emit('expedition-start', {} as Record<string, never>)}
                                onClose={() => setRunState(INITIAL_RUN_STATE)}
                            />
                        </div>
                    </div>
                )}

                {/* Run completion summary */}
                {showComplete && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        gap: '12px',
                        fontFamily: 'sans-serif',
                        padding: '16px',
                    }}>
                        <div style={{ color: '#22d3ee', fontSize: '22px', fontWeight: 700 }}>
                            Expedition Complete!
                        </div>
                        <div style={{ color: '#e2e8f0', fontSize: '28px', fontWeight: 700 }}>
                            {runState.finalScore ?? runState.deductionCamp?.bankedScore ?? hudRef.current.score} pts
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                            {WALLET_DEFS.map(({ key, color, label }) => (
                                <div key={key} style={{ textAlign: 'center' }}>
                                    <div style={{ color, fontWeight: 700, fontSize: '18px' }}>
                                        {runState.resourceWallet[key]}
                                    </div>
                                    <div style={{ color: '#94a3b8', fontSize: '11px' }}>{label}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                            {runState.expedition?.nodes.length ?? 6} nodes completed
                        </div>
                        <button
                            onClick={handleRunReset}
                            style={{
                                marginTop: '8px',
                                padding: '8px 24px',
                                fontSize: '14px',
                                fontWeight: 700,
                                background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                            }}
                        >
                            New Expedition
                        </button>
                    </div>
                )}

                {/* SpeciesPanel always mounted but hidden — handles clue-revealed toasts */}
                <SpeciesPanel
                    toastsEnabled={viewMode === 'map' && !showDeduction}
                    style={{
                        display: 'none',
                    }}
                />
            </div>
            </div>

            {/* Full-page species view - keep mounted to preserve state */}
            <div style={{
                display: viewMode === 'species' ? 'block' : 'none',
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                backgroundColor: '#0f172a',
                zIndex: 2000
            }}>
                <SpeciesList
                    onBack={() => {
                        setViewMode('map');
                        setScrollToSpeciesId(null);
                    }}
                    scrollToSpeciesId={scrollToSpeciesId}
                />
            </div>

            <Toaster
                position="bottom-right"
                richColors
                theme="dark"
                closeButton
                expand
                visibleToasts={3}
                toastOptions={{
                    classNames: {
                        toast: "bg-slate-800 border-slate-700 text-slate-100",
                        title: "text-cyan-300",
                        description: "text-slate-300",
                        actionButton: "bg-slate-600 text-white hover:bg-slate-500",
                    },
                }}
            />
        </div>
    );
}

export default MainAppLayout;
