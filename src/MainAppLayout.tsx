import { useRef, useEffect, useState, useCallback } from 'react';
import { PhaserGame, IRefPhaserGame } from './PhaserGame';
import CesiumMap from './components/CesiumMap';
import { SpeciesPanel } from './components/SpeciesPanel';
import SpeciesList from './components/SpeciesList';
import UserMenu from './components/UserMenu';
import { useAuthBridge } from './hooks/useAuthBridge';
import { EventBus } from './game/EventBus';
import type { EventPayloads } from './game/EventBus';
import { toast, Toaster } from 'sonner';
import { PiBookOpenTextLight } from "react-icons/pi";
import { BottomTabBar } from './components/BottomTabBar';
import type { BaseTab } from './components/BottomTabBar';
import type { ConsumableItem, RunState, SouvenirDef, ClueCategoryKey, DeductionCampState, ClueShopEntry } from '@/types/expedition';
import { createEmptyResourceWallet, createEmptyClueFragments, CLUE_CATEGORY_KEYS, getDeductionFinalScore, getGuessBonuses } from '@/types/expedition';
import type { AffinityType } from '@/expedition/affinities';
import { GRID_COLS, GRID_ROWS } from '@/game/constants';
import { buildNodeBoardContext } from '@/game/nodeObstacles';
import { ExpeditionBriefing } from './components/ExpeditionBriefing';
import { RunTrack } from './components/RunTrack';
import { ActiveEncounterPanel } from './components/ActiveEncounterPanel';
import { GemWallet } from './components/GemWallet';
import { SouvenirPouch } from './components/SouvenirPouch';
import { ConsumableTray } from './components/ConsumableTray';
import { DeductionCamp } from './components/DeductionCamp';
import { ProfileContent } from './components/ProfileContent';
import { SpookMeter } from './components/SpookMeter';
import { BankedScore } from './components/BankedScore';
import { CrisisOverlay } from './components/CrisisOverlay';
import { buildBoardSpawnConfigForNode, WALLET_DEFS } from '@/expedition/domain';
import { AFFINITY_DEFINITIONS } from '@/expedition/affinities';

const INITIAL_RUN_STATE: RunState = {
    phase: 'idle',
    expedition: null,
    currentNodeIndex: 0,
    activeAffinities: [],
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

function ProfileTabContent() {
    return (
        <div style={{ paddingTop: '48px' }}>
            <h1 className="text-ds-heading-lg px-4 mb-4">Field Profile</h1>
            <ProfileContent inline />
        </div>
    );
}

function MainAppLayout() {
    useAuthBridge();
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [viewMode, setViewMode] = useState<'map' | 'species'>('map');
    const [scrollToSpeciesId, setScrollToSpeciesId] = useState<number | null>(null);
    const [runState, setRunState] = useState<RunState>(INITIAL_RUN_STATE);
    const [baseTab, setBaseTab] = useState<BaseTab>('explore');

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
    const activeAffinitiesRef = useRef<AffinityType[]>([]);
    const [boardOpacity, setBoardOpacity] = useState(1);

    const handlePhaserSceneReady = (scene: Phaser.Scene) => {
        console.log('MainAppLayout: Phaser scene ready -', scene.scene.key);
        if (phaserRef.current) {
            phaserRef.current.scene = scene;
        }
    };

    // --- Expedition event handlers ---

    const handleExpeditionDataReady = useCallback((data: EventPayloads['expedition-data-ready']) => {
        expeditionPayloadRef.current = data;
        activeAffinitiesRef.current = data.expedition.activeAffinities;
        setRunState({
            ...INITIAL_RUN_STATE,
            phase: 'briefing',
            expedition: data.expedition,
            activeAffinities: data.expedition.activeAffinities,
        });
    }, []);

    const handleExpeditionStart = useCallback(() => {
        setRunState(prev => ({ ...prev, phase: 'in-run', activeAffinities: [...activeAffinitiesRef.current] }));
        // Reset score tracking for this run
        hudRef.current = { score: 0, movesUsed: 0 };
        nodeStartScoreRef.current = 0;
        lastResolvedNodeRef.current = -1;
        setBoardOpacity(1);
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
                activeAffinities: activeAffinitiesRef.current,
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
            firstNode?.counterGem ?? null,
            payload.expedition.actionBias,
            activeAffinitiesRef.current
        );
        EventBus.emit('cesium-location-selected', {
            lon: payload.lon,
            lat: payload.lat,
            species: payload.species,
            rasterHabitats: payload.rasterHabitats,
            habitats: payload.habitats,
            difficulty: firstNode?.difficulty,
            obstacles: firstNode?.obstacles,
            obstacleFamily: firstNode?.obstacleFamily,
            counterGem: firstNode?.counterGem,
            requiredGems: firstNode?.requiredGems,
            activeAffinities: activeAffinitiesRef.current,
            objectiveTarget: firstNode?.objectiveTarget,
            nodeIndex: 0,
            nodeType: firstNode?.node_type,
            events: firstNode?.events,
            boardContext: firstBoardContext,
            boardConfig: firstBoardConfig,
        });
    }, []);

    const handleAffinitySelected = useCallback((affinityId: AffinityType | null) => {
        const nextAffinities = affinityId ? [affinityId] : [];
        activeAffinitiesRef.current = nextAffinities;
        setRunState(prev => {
            if (!prev.expedition) return prev;
            return {
                ...prev,
                activeAffinities: nextAffinities,
                expedition: {
                    ...prev.expedition,
                    activeAffinities: nextAffinities,
                },
            };
        });
    }, []);

    const handleNodeAdvanceRequested = useCallback((data: EventPayloads['node-advance-requested']) => {
        setBoardOpacity(1);
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
                        nextNode?.counterGem ?? null,
                        prev.expedition?.actionBias ?? {},
                        activeAffinitiesRef.current
                    );
                    EventBus.emit('cesium-location-selected', {
                        lon: payload.lon,
                        lat: payload.lat,
                        species: payload.species,
                        rasterHabitats: payload.rasterHabitats,
                        habitats: payload.habitats,
                        difficulty: nextNode?.difficulty,
                        obstacles: nextNode?.obstacles,
                        obstacleFamily: nextNode?.obstacleFamily,
                        counterGem: nextNode?.counterGem,
                        requiredGems: nextNode?.requiredGems,
                        activeAffinities: activeAffinitiesRef.current,
                        objectiveTarget: nextNode?.objectiveTarget,
                        nodeIndex: nextIndex,
                        nodeType: nextNode?.node_type,
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
        activeAffinitiesRef.current = [];
        setBoardOpacity(1);
        setRunState(INITIAL_RUN_STATE);
        EventBus.emit('game-reset', undefined);
    }, []);

    const handleCrisisToolSpend = useCallback((): ConsumableItem | null => {
        const spentItem = runState.phase === 'in-run' ? runState.consumables[0] ?? null : null;
        if (!spentItem) return null;

        setRunState(prev => {
            if (prev.phase !== 'in-run') return prev;
            return {
                ...prev,
                consumables: prev.consumables.filter(item => item.instanceId !== spentItem.instanceId),
            };
        });
        toast(`Used ${spentItem.name} to bypass the crisis`, { duration: 1600 });
        return spentItem;
    }, [runState.phase, runState.consumables]);

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
            setBaseTab('field-guide');
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

        // Board opacity fades as spook drops (Flight Instinct)
        const handleBonusTick = (d: EventPayloads['node-bonus-tick']) => {
            // Fade starts below 50%, reaches 0.35 at 0%
            setBoardOpacity(d.pct >= 0.5 ? 1 : 0.35 + d.pct * 1.3);
        };
        EventBus.on('node-bonus-tick', handleBonusTick);

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
            EventBus.off('node-bonus-tick', handleBonusTick);
        };
    }, [handleExpeditionDataReady, handleExpeditionStart, handleNodeAdvanceRequested, handleHudUpdate, handleObjectiveUpdate, handleSouvenirDrop, handleResourceWalletUpdate, handleConsumableFound, handleConsumableUseRequested, handleClueFragmentEarned, handleClueDiscountEarned, handleClueRevealed, handleNodeRewardsSummary]);

    const inRun = runState.phase === 'in-run';
    const showBriefing = runState.phase === 'briefing';
    const showComplete = runState.phase === 'complete';
    const showDeduction = runState.phase === 'deduction';
    const inExpedition = inRun || showBriefing || showComplete || showDeduction;
    const useSplitLayout = inRun;

    // Tab bar drives viewMode for backward compat
    const handleTabChange = useCallback((tab: BaseTab) => {
        if (tab === 'expedition' && !inExpedition) {
            // No active expedition — bounce to explore so user can pick a location
            setBaseTab('explore');
            setViewMode('map');
            return;
        }
        setBaseTab(tab);
        if (tab === 'explore') setViewMode('map');
        else if (tab === 'field-guide') setViewMode('species');
    }, [inExpedition]);
    const currentNode = inRun && runState.expedition
        ? runState.expedition.nodes[runState.currentNodeIndex]
        : null;

    useEffect(() => {
        if (!phaserRef.current?.game) return;
        const rafId = window.requestAnimationFrame(() => {
            phaserRef.current?.game?.scale.refresh();
        });
        return () => window.cancelAnimationFrame(rafId);
    }, [useSplitLayout, viewMode]);

    const appStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden'
    };
    const phaserGameWrapperStyle: React.CSSProperties = {
        width: '100%',
        height: useSplitLayout ? '66.6667%' : '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: useSplitLayout ? 'relative' : 'absolute',
        inset: useSplitLayout ? undefined : 0,
        overflow: 'hidden',
        visibility: useSplitLayout ? 'visible' : 'hidden',
        pointerEvents: useSplitLayout ? 'auto' : 'none',
        flexShrink: 0,
    };
    const cesiumContainerStyle: React.CSSProperties = {
        width: '100%',
        height: useSplitLayout ? '33.3333%' : '100%',
        minHeight: '0px',
        borderTop: useSplitLayout ? '2px solid #555' : 'none',
        position: useSplitLayout ? 'relative' : 'absolute',
        inset: useSplitLayout ? undefined : 0,
        overflow: 'hidden',
        background: 'var(--ds-background)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: useSplitLayout ? 1 : 2,
    };

    return (
        <div id="app-container" style={appStyle}>
            {/* Show game layout - position off-screen when not on explore/expedition tab */}
            <div style={{
                position: (baseTab !== 'explore' && baseTab !== 'expedition' && !inExpedition) ? 'absolute' : 'relative',
                left: (baseTab !== 'explore' && baseTab !== 'expedition' && !inExpedition) ? '-9999px' : '0',
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%'
            }}>
                {/* RunTrack bar above Phaser canvas */}
                <div style={{ display: inRun && runState.expedition ? 'block' : 'none' }}>
                    {runState.expedition && (
                        <RunTrack
                            nodes={runState.expedition.nodes}
                            currentNodeIndex={runState.currentNodeIndex}
                            activeAffinities={runState.activeAffinities}
                        />
                    )}
                </div>

                <div id="phaser-game-wrapper" style={{ ...phaserGameWrapperStyle, opacity: inRun ? boardOpacity : 1, transition: 'opacity 0.8s ease' }}>
                    {/* Board glassmorphism backdrop */}
                    {inRun && (
                        <div style={{
                            position: 'absolute', inset: 0, zIndex: 0,
                            background: 'var(--ds-glass-bg)',
                            backdropFilter: 'blur(8px)',
                            borderRadius: useSplitLayout ? 0 : '16px',
                        }} />
                    )}

                    <PhaserGame ref={phaserRef} currentActiveScene={handlePhaserSceneReady} />

                    {/* ActiveEncounterPanel overlay inside phaser wrapper */}
                    {inRun && currentNode && (
                        <ActiveEncounterPanel
                            node={currentNode}
                            nodeIndex={runState.currentNodeIndex}
                            activeAffinities={runState.activeAffinities}
                            onComplete={() => EventBus.emit('node-advance-requested', {
                                nodeIndex: runState.currentNodeIndex,
                                reason: 'analysis_complete',
                                source: 'panel',
                            })}
                        />
                    )}

                    {/* Thumb zone — bottom overlays */}
                    {inRun && (
                        <div style={{
                            position: 'absolute', bottom: '6px', left: '6px', right: '6px', zIndex: 50,
                            display: 'flex', alignItems: 'flex-end', gap: '6px',
                        }}>
                            {/* Left: wallet + consumables */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start', flex: '0 0 auto' }}>
                                <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end' }}>
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

                            {/* Center: Spook Meter */}
                            <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <SpookMeter />
                                <BankedScore score={runState.bankedScore} />
                            </div>

                            {/* Right spacer for balance */}
                            <div style={{ flex: '0 0 auto', width: '1px' }} />
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
                            background: 'var(--ds-glass-bg)',
                            backdropFilter: 'blur(12px)',
                            color: 'var(--ds-text-primary)',
                            border: '1px solid var(--ds-border-subtle)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                        onClick={() => { setViewMode('species'); setBaseTab('field-guide'); }}
                        title="Species List"
                    >
                        <PiBookOpenTextLight size={18} />
                    </button>
                </div>

                {/* Deduction Camp phase */}
                {showDeduction && runState.deductionCamp && (
                    <div className="glass-bg" style={{
                        position: 'absolute', inset: 0, zIndex: 900,
                        backdropFilter: 'blur(16px)',
                        overflow: 'auto',
                    }}>
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

                {/* ExpeditionBriefing as bottom sliding glass sheet */}
                {showBriefing && runState.expedition && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 900,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                    }}>
                        {/* Scrim tap-to-close */}
                        <div
                            style={{ flex: '0 0 25%', background: 'rgba(10,14,26,0.4)' }}
                            onClick={handleRunReset}
                        />
                        <div style={{
                            flex: '0 0 75%',
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: 0,
                            borderRadius: '16px 16px 0 0',
                            background: 'var(--ds-glass-bg)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid var(--ds-border-subtle)',
                            borderBottom: 'none',
                            boxShadow: 'var(--ds-shadow-card)',
                            overflow: 'hidden',
                        }}>
                            <ExpeditionBriefing
                                expedition={runState.expedition}
                                onSelectAffinity={handleAffinitySelected}
                                onStart={() => EventBus.emit('expedition-start', {} as Record<string, never>)}
                                onClose={handleRunReset}
                            />
                        </div>
                    </div>
                )}

                {/* Run completion summary — glass overlay with stats grid */}
                {showComplete && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 800,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(10,14,26,0.7)',
                        backdropFilter: 'blur(12px)',
                        fontFamily: 'inherit',
                        padding: '24px 16px',
                        gap: '16px',
                    }}>
                        <div style={{ color: 'var(--ds-accent-cyan)', fontSize: '22px', fontWeight: 700 }}>
                            Expedition Complete!
                        </div>
                        <div style={{ color: 'var(--ds-text-primary)', fontSize: '36px', fontWeight: 700 }}>
                            {runState.finalScore ?? runState.deductionCamp?.bankedScore ?? hudRef.current.score} pts
                        </div>

                        {/* Stats grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', maxWidth: '300px' }}>
                            {[
                                { label: 'Banked Score', value: String(hudRef.current.score), color: 'var(--ds-accent-cyan)' },
                                { label: 'Nodes Done', value: String(runState.expedition?.nodes.length ?? 0), color: 'var(--ds-accent-emerald)' },
                                { label: 'Souvenirs', value: String(runState.souvenirs.length), color: 'var(--ds-accent-amber)' },
                                { label: 'Items Left', value: String(runState.consumables.length), color: 'var(--ds-gem-focus)' },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="glass-bg shadow-card" style={{
                                    border: '1px solid var(--ds-border-subtle)',
                                    borderRadius: '10px', padding: '10px', textAlign: 'center',
                                }}>
                                    <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</div>
                                    <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--ds-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Meta-unlock badge — newly discovered species */}
                        {runState.deductionCamp?.guessResult === 'correct' && hiddenSpeciesNameRef.current && (
                            <div className="glass-bg shadow-card" style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '8px 16px', borderRadius: '12px',
                                border: '1px solid var(--ds-accent-emerald)',
                                animation: 'badge-pop 0.6s ease-out 0.3s both',
                            }}>
                                <span style={{ fontSize: '20px' }}>🔬</span>
                                <div>
                                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ds-accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Species Discovered
                                    </div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ds-text-primary)' }}>
                                        {hiddenSpeciesNameRef.current}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Affinity badge award */}
                        {runState.activeAffinities.length > 0 && (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                {runState.activeAffinities.map(a => {
                                    const def = AFFINITY_DEFINITIONS[a];
                                    return (
                                        <div key={a} className="glass-bg shadow-card" style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '6px 14px', borderRadius: '9999px',
                                            border: `1px solid ${def.color}`,
                                            animation: 'badge-pop 0.5s ease-out both',
                                        }}>
                                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: def.color, flexShrink: 0 }} />
                                            <span style={{ fontSize: '12px', fontWeight: 600, color: def.color }}>{def.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Wallet breakdown */}
                        <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                            {WALLET_DEFS.map(({ key, color, label }) => (
                                <div key={key} style={{ textAlign: 'center' }}>
                                    <div style={{ color, fontWeight: 700, fontSize: '18px' }}>
                                        {runState.resourceWallet[key]}
                                    </div>
                                    <div style={{ color: 'var(--ds-text-secondary)', fontSize: '11px' }}>{label}</div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleRunReset}
                            style={{
                                marginTop: '8px',
                                padding: '12px 32px',
                                fontSize: '14px',
                                fontWeight: 700,
                                background: 'linear-gradient(135deg, var(--ds-accent-cyan), #06b6d4)',
                                color: 'var(--ds-background)',
                                border: 'none',
                                borderRadius: '9999px',
                                cursor: 'pointer',
                                boxShadow: 'var(--ds-glow-cyan)',
                            }}
                        >
                            Return to Globe
                        </button>
                    </div>
                )}

                {/* Crisis event decision overlay */}
                {inRun && (
                    <CrisisOverlay
                        consumables={runState.consumables}
                        onSpendTool={handleCrisisToolSpend}
                    />
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
                display: (viewMode === 'species' || (baseTab === 'field-guide' && !inExpedition)) ? 'block' : 'none',
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                background: 'var(--ds-background)',
                zIndex: 2000
            }}>
                <SpeciesList
                    onBack={() => {
                        setViewMode('map');
                        setBaseTab('explore');
                        setScrollToSpeciesId(null);
                    }}
                    scrollToSpeciesId={scrollToSpeciesId}
                />
            </div>

            {/* Profile tab — full-screen overlay */}
            <div style={{
                display: (baseTab === 'profile' && !inExpedition) ? 'block' : 'none',
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                background: 'var(--ds-background)',
                zIndex: 2000,
                overflowY: 'auto',
                paddingBottom: 90,
            }}>
                <ProfileTabContent />
            </div>

            {/* Inventory tab — souvenir/gear ledger */}
            <div style={{
                display: (baseTab === 'inventory' && !inExpedition) ? 'flex' : 'none',
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                background: 'var(--ds-background)',
                zIndex: 2000,
                flexDirection: 'column',
                overflowY: 'auto',
                padding: '56px 16px 100px',
                boxSizing: 'border-box',
            }}>
                <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600, color: 'var(--ds-text-primary)' }}>Inventory</h2>
                <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--ds-text-muted)' }}>Souvenirs collected during expeditions</p>

                {/* Souvenir grid */}
                {runState.souvenirs.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
                    {runState.souvenirs.map((s, i) => (
                      <div key={`${s.id}-${i}`} className="glass-bg shadow-card" style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        padding: '12px 8px', borderRadius: 12,
                        border: '1px solid var(--ds-border-subtle)',
                      }}>
                        <span style={{ fontSize: 28 }}>{s.emoji}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-primary)', textAlign: 'center' }}>{s.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="glass-bg" style={{
                    padding: '32px 16px', borderRadius: 16, textAlign: 'center',
                    border: '1px solid var(--ds-border-subtle)',
                  }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🎒</div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text-muted)' }}>
                      No souvenirs yet. Complete expeditions to collect items!
                    </p>
                  </div>
                )}

                {/* Consumables section */}
                {runState.consumables.length > 0 && (
                  <>
                    <h3 style={{ margin: '20px 0 8px', fontSize: 14, fontWeight: 600, color: 'var(--ds-text-primary)' }}>Consumables</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
                      {runState.consumables.map((c, i) => (
                        <div key={`${c.instanceId}-${i}`} className="glass-bg shadow-card" style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                          padding: '12px 8px', borderRadius: 12,
                          border: '1px solid var(--ds-border-subtle)',
                        }}>
                          <span style={{ fontSize: 20 }}>🧪</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-primary)', textAlign: 'center' }}>{c.name}</span>
                          <span style={{ fontSize: 9, color: 'var(--ds-text-muted)' }}>{c.effectType}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
            </div>

            {/* Bottom Tab Bar — hidden during expedition phases */}
            {!inExpedition && (
                <BottomTabBar active={baseTab} onChange={handleTabChange} />
            )}

            <Toaster
                position="bottom-right"
                richColors
                theme="dark"
                closeButton
                expand
                visibleToasts={3}
                toastOptions={{
                    classNames: {
                        toast: "glass-bg shadow-card border-ds-subtle text-ds-text-primary",
                        title: "text-ds-cyan",
                        description: "text-ds-text-secondary",
                        actionButton: "bg-ds-surface-elevated text-ds-text-primary",
                    },
                }}
            />
        </div>
    );
}

export default MainAppLayout;
