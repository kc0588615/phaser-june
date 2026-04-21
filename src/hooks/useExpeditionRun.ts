import { useRef, useEffect, useState, useCallback } from 'react';
import { EventBus } from '@/game/EventBus';
import type { EventPayloads } from '@/game/EventBus';
import { toast } from 'sonner';
import type { ConsumableItem, RunState, SouvenirDef, ClueCategoryKey, DeductionCampState, ClueShopEntry, ResourceWallet, ComparativeDeductionState } from '@/types/expedition';
import { createEmptyResourceWallet, createEmptyClueFragments, createEmptyComparativeState, CLUE_CATEGORY_KEYS, getDeductionFinalScore, getGuessBonuses, deductionCatToWalletKey } from '@/types/expedition';
import { compareReference, filterCandidates, getNextClue, getEffectiveClueCost } from '@/lib/deductionEngine';
import type { DeductionProfile, DeductionClue, ProcessedClue } from '@/lib/deductionEngine';
import type { DeductionClueCategory } from '@/db/schema/species';
import type { AffinityType } from '@/expedition/affinities';
import { GRID_COLS, GRID_ROWS } from '@/game/constants';
import { buildNodeBoardContext } from '@/game/nodeObstacles';
import { buildBoardSpawnConfigForNode } from '@/expedition/domain';

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
    comparativeDeduction: null,
    currentNodeBonus: null,
    lastNodeRewards: null,
    finalScore: null,
    totalThoughtDiscount: 0,
    evidenceBundle: null,
};

export function useExpeditionRun() {
    const [runState, setRunState] = useState<RunState>(INITIAL_RUN_STATE);
    const [boardOpacity, setBoardOpacity] = useState(1);

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

    const resetRunStateLocal = useCallback(() => {
        expeditionPayloadRef.current = null;
        runIdRef.current = null;
        nodeIdsRef.current = [];
        hudRef.current = { score: 0, movesUsed: 0 };
        nodeStartScoreRef.current = 0;
        nodeObjectiveProgressRef.current = 0;
        lastResolvedNodeRef.current = -1;
        correctSpeciesIdRef.current = 0;
        hiddenSpeciesNameRef.current = '';
        activeAffinitiesRef.current = [];
        setBoardOpacity(1);
        setRunState(INITIAL_RUN_STATE);
    }, []);

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
        hudRef.current = { score: 0, movesUsed: 0 };
        nodeStartScoreRef.current = 0;
        lastResolvedNodeRef.current = -1;
        setBoardOpacity(1);
        const payload = expeditionPayloadRef.current;
        if (!payload) return;

        const sorted = [...payload.species].sort((a, b) => a.ogc_fid - b.ogc_fid);
        const correct = sorted[0];
        if (correct) {
            correctSpeciesIdRef.current = correct.ogc_fid;
            hiddenSpeciesNameRef.current = correct.common_name || correct.scientific_name || 'Unknown Species';
        }

        const locationKey = `${payload.lon.toFixed(4)},${payload.lat.toFixed(4)}`;
        fetch('/api/runs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                lon: payload.lon, lat: payload.lat, locationKey,
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
                }
            })
            .catch(err => console.error('Failed to create run session:', err));

        nodeObjectiveProgressRef.current = 0;
        const firstNode = payload.expedition.nodes[0];
        const firstBoardContext = buildNodeBoardContext({
            width: GRID_COLS, height: GRID_ROWS,
            obstacles: firstNode?.obstacles ?? [], nodeIndex: 0,
        });
        const firstBoardConfig = buildBoardSpawnConfigForNode(
            firstNode?.node_type ?? 'custom', firstNode?.counterGem ?? null,
            payload.expedition.actionBias, activeAffinitiesRef.current
        );
        EventBus.emit('cesium-location-selected', {
            lon: payload.lon, lat: payload.lat,
            species: payload.species, rasterHabitats: payload.rasterHabitats,
            habitats: payload.habitats, difficulty: firstNode?.difficulty,
            obstacles: firstNode?.obstacles, obstacleFamily: firstNode?.obstacleFamily,
            counterGem: firstNode?.counterGem, requiredGems: firstNode?.requiredGems,
            activeAffinities: activeAffinitiesRef.current,
            objectiveTarget: firstNode?.objectiveTarget, nodeIndex: 0,
            nodeType: firstNode?.node_type, events: firstNode?.events,
            boardContext: firstBoardContext, boardConfig: firstBoardConfig,
        });
    }, []);

    const handleAffinitySelected = useCallback((affinityId: AffinityType | null) => {
        const nextAffinities = affinityId ? [affinityId] : [];
        activeAffinitiesRef.current = nextAffinities;
        setRunState(prev => {
            if (!prev.expedition) return prev;
            return {
                ...prev, activeAffinities: nextAffinities,
                expedition: { ...prev.expedition, activeAffinities: nextAffinities },
            };
        });
    }, []);

    const handleNodeAdvanceRequested = useCallback((data: EventPayloads['node-advance-requested']) => {
        setBoardOpacity(1);
        setRunState(prev => {
            if (prev.phase !== 'in-run') return prev;
            if (data.nodeIndex !== prev.currentNodeIndex) return prev;
            if (data.nodeIndex <= lastResolvedNodeRef.current) return prev;

            // Escaped
            if (data.reason === 'escaped') {
                lastResolvedNodeRef.current = prev.currentNodeIndex;
                const campState = buildDeductionCampState(prev);
                if (runIdRef.current) persistWallet(runIdRef.current, prev.resourceWallet);
                setTimeout(() => toast('Animal escaped! Reviewing gathered evidence...', { duration: 3000 }), 0);
                return { ...prev, phase: 'deduction' as const, deductionCamp: campState };
            }

            const nodeOrder = prev.currentNodeIndex + 1;
            const nextIndex = prev.currentNodeIndex + 1;
            lastResolvedNodeRef.current = prev.currentNodeIndex;

            // Persist node completion
            const nodeScore = hudRef.current.score - nodeStartScoreRef.current;
            const nodeMoves = hudRef.current.movesUsed;
            const objProgress = nodeObjectiveProgressRef.current;
            if (runIdRef.current) {
                fetch(`/api/runs/${runIdRef.current}/nodes/${nodeOrder}/complete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        scoreEarned: Math.max(0, nodeScore), movesUsed: nodeMoves,
                        objectiveProgress: objProgress,
                        souvenirs: prev.souvenirs.length > 0 ? prev.souvenirs.map(s => ({ id: s.id, name: s.name })) : undefined,
                    }),
                }).catch(err => console.error('Failed to complete node:', err));
            }

            EventBus.emit('node-complete', { nodeIndex: prev.currentNodeIndex });
            nodeStartScoreRef.current = hudRef.current.score;

            if (nextIndex >= (prev.expedition?.nodes.length ?? 6)) {
                const campState = buildDeductionCampState(prev);
                if (runIdRef.current) persistWallet(runIdRef.current, prev.resourceWallet);
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
                        width: GRID_COLS, height: GRID_ROWS,
                        obstacles: nextNode?.obstacles ?? [], nodeIndex: nextIndex,
                    });
                    const nextBoardConfig = buildBoardSpawnConfigForNode(
                        nextNode?.node_type ?? 'custom', nextNode?.counterGem ?? null,
                        prev.expedition?.actionBias ?? {}, activeAffinitiesRef.current
                    );
                    EventBus.emit('cesium-location-selected', {
                        lon: payload.lon, lat: payload.lat,
                        species: payload.species, rasterHabitats: payload.rasterHabitats,
                        habitats: payload.habitats, difficulty: nextNode?.difficulty,
                        obstacles: nextNode?.obstacles, obstacleFamily: nextNode?.obstacleFamily,
                        counterGem: nextNode?.counterGem, requiredGems: nextNode?.requiredGems,
                        activeAffinities: activeAffinitiesRef.current,
                        objectiveTarget: nextNode?.objectiveTarget, nodeIndex: nextIndex,
                        nodeType: nextNode?.node_type, events: nextNode?.events,
                        boardContext: nextBoardContext, boardConfig: nextBoardConfig,
                    });
                }, 100);
            }
            return { ...prev, currentNodeIndex: nextIndex };
        });
    }, []);

    const handleResourceWalletUpdate = useCallback((data: EventPayloads['resource-wallet-updated']) => {
        setRunState(prev => {
            if (prev.phase !== 'in-run') return prev;
            const w = { ...prev.resourceWallet };
            for (const [k, v] of Object.entries(data.wallet)) { if (k in w) (w as any)[k] += v; }
            return { ...prev, resourceWallet: w };
        });
    }, []);

    const handleRunReset = useCallback(() => {
        resetRunStateLocal();
        EventBus.emit('game-reset', undefined);
    }, [resetRunStateLocal]);

    const handleCrisisToolSpend = useCallback((): ConsumableItem | null => {
        const spentItem = runState.phase === 'in-run' ? runState.consumables[0] ?? null : null;
        if (!spentItem) return null;
        setRunState(prev => {
            if (prev.phase !== 'in-run') return prev;
            return { ...prev, consumables: prev.consumables.filter(item => item.instanceId !== spentItem.instanceId) };
        });
        toast(`Used ${spentItem.name} to bypass the crisis`, { duration: 1600 });
        return spentItem;
    }, [runState.phase, runState.consumables]);

    const handleHudUpdate = useCallback((data: EventPayloads['game-hud-updated']) => {
        hudRef.current = { score: data.score, movesUsed: data.movesUsed };
    }, []);

    const handleObjectiveUpdate = useCallback((data: EventPayloads['node-objective-updated']) => {
        nodeObjectiveProgressRef.current = data.progress;
    }, []);

    const handleSouvenirDrop = useCallback((data: { souvenir: SouvenirDef }) => {
        setRunState(prev => prev.phase === 'in-run' ? { ...prev, souvenirs: [...prev.souvenirs, data.souvenir] } : prev);
    }, []);

    const handleConsumableFound = useCallback((data: EventPayloads['consumable-found']) => {
        setRunState(prev => prev.phase === 'in-run' ? { ...prev, consumables: [...prev.consumables, data.item] } : prev);
        toast(`Crate yielded ${data.item.name}`, { duration: 1600 });
    }, []);

    const handleClueFragmentEarned = useCallback((data: EventPayloads['clue-fragment-earned']) => {
        setRunState(prev => {
            if (prev.phase !== 'in-run') return prev;
            const frags = { ...prev.clueFragments };
            frags[data.category] += data.amount;
            return { ...prev, clueFragments: frags };
        });
    }, []);

    const handleClueDiscountEarned = useCallback((data: EventPayloads['clue-discount-earned']) => {
        setRunState(prev => {
            if (prev.phase !== 'in-run') return prev;
            return { ...prev, totalThoughtDiscount: prev.totalThoughtDiscount + data.amount };
        });
    }, []);

    const handleNodeRewardsSummary = useCallback((data: EventPayloads['node-rewards-summary']) => {
        const totalReward = data.baseClearReward + data.preservedNodeBonus + data.triviaReward;
        setRunState(prev => {
            if (prev.phase !== 'in-run') return prev;
            return { ...prev, bankedScore: prev.bankedScore + totalReward, lastNodeRewards: data };
        });
    }, []);

    const handleClueRevealed = useCallback((clue: EventPayloads['clue-revealed']) => {
        setRunState(prev => {
            if (prev.phase !== 'deduction' || !prev.deductionCamp) return prev;
            const exists = prev.deductionCamp.revealedClues.some(
                existing => existing.category === clue.category && existing.clue === clue.clue
            );
            if (exists) return prev;
            return { ...prev, deductionCamp: { ...prev.deductionCamp, revealedClues: [clue, ...prev.deductionCamp.revealedClues] } };
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

    const handleDeductionPurchase = useCallback((category: ClueCategoryKey, cost: number) => {
        setRunState(prev => {
            if (prev.phase !== 'deduction' || !prev.deductionCamp) return prev;
            const camp = { ...prev.deductionCamp };
            camp.scoreSpent += cost;
            camp.clueShop = camp.clueShop.map(e => e.category === category ? { ...e, purchased: e.purchased + 1 } : e);
            if (camp.guessResult === 'wrong') camp.guessResult = null;
            return { ...prev, deductionCamp: camp };
        });
        EventBus.emit('deduction-camp-purchase', { category, cost });
    }, []);

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
                        scoreSpent: camp.scoreSpent, purchasedClues: totalPaid,
                        revealedClues: camp.revealedClues.length,
                        thoughtDiscountPct: camp.thoughtDiscountPct, finalScore,
                    };
                    setTimeout(() => {
                        fetch(`/api/runs/${rid}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                finalScore,
                                deductionSummary,
                                speciesId: correctSpeciesIdRef.current || undefined,
                            }),
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

    // --- Comparative deduction: fetch profiles when entering deduction phase ---
    useEffect(() => {
        if (runState.phase !== 'deduction' || runState.comparativeDeduction) return;
        const speciesId = correctSpeciesIdRef.current;
        if (!speciesId) return;

        // For now, use all other species as album cards (later: filter to discovered)
        const allSpeciesIds = Array.from({ length: 24 }, (_, i) => i + 1).filter(id => id !== speciesId && id !== 4 && id !== 11);
        const albumParam = allSpeciesIds.join(',');

        fetch(`/api/species/deduction?mysteryId=${speciesId}&albumIds=${albumParam}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (!data) return;
                const compState = createEmptyComparativeState(
                    data.mysteryProfile,
                    data.mysteryClues,
                    data.albumProfiles,
                );
                setRunState(prev => {
                    if (prev.phase !== 'deduction') return prev;
                    return { ...prev, comparativeDeduction: compState };
                });
            })
            .catch(err => console.error('Failed to fetch deduction profiles:', err));
    }, [runState.phase, runState.comparativeDeduction]);

    // --- Comparative deduction handlers ---

    const handleProcessClue = useCallback((clueId: number) => {
        setRunState(prev => {
            if (prev.phase !== 'deduction' || !prev.comparativeDeduction || !prev.deductionCamp) return prev;
            const comp = prev.comparativeDeduction;
            const camp = prev.deductionCamp;

            // Find the clue
            const clue = comp.mysteryClues.find(c => c.id === clueId);
            if (!clue) return prev;

            // Already processed?
            if (comp.processedClues.some(pc => pc.clueId === clueId)) return prev;

            // Check cost
            const catKey = deductionCatToWalletKey(clue.category);
            const fragCount = camp.clueFragments[catKey] ?? 0;
            const cost = getEffectiveClueCost(clue, fragCount, camp.thoughtDiscountPct);

            if (clue.unlockMode === 'fragment') {
                if (fragCount < cost) return prev;
            } else {
                const available = camp.bankedScore - camp.scoreSpent - comp.scoreSpent;
                if (available < cost) return prev;
            }

            const processed: ProcessedClue = {
                clueId: clue.id,
                category: clue.category,
                label: clue.label,
                status: 'processed',
                compareTags: clue.compareTags,
                fragmentCost: cost,
            };

            const newFragsSpent = { ...comp.fragmentsSpent };
            let newScoreSpent = comp.scoreSpent;
            const newCampFrags = { ...camp.clueFragments };

            if (clue.unlockMode === 'fragment') {
                newFragsSpent[catKey] = (newFragsSpent[catKey] ?? 0) + cost;
                newCampFrags[catKey] = Math.max(0, newCampFrags[catKey] - cost);
            } else {
                newScoreSpent += cost;
            }

            return {
                ...prev,
                comparativeDeduction: {
                    ...comp,
                    processedClues: [...comp.processedClues, processed],
                    fragmentsSpent: newFragsSpent,
                    scoreSpent: newScoreSpent,
                },
                deductionCamp: {
                    ...camp,
                    clueFragments: newCampFrags,
                },
            };
        });
    }, []);

    const handlePlaceReference = useCallback((referenceSpeciesId: number, clueId: number) => {
        setRunState(prev => {
            if (prev.phase !== 'deduction' || !prev.comparativeDeduction) return prev;
            const comp = prev.comparativeDeduction;

            // Find the processed clue
            const pClue = comp.processedClues.find(pc => pc.clueId === clueId);
            if (!pClue || pClue.status !== 'processed' || !pClue.compareTags) return prev;

            // Find reference profile
            const refProfile = comp.albumProfiles.find(p => p.speciesId === referenceSpeciesId);
            if (!refProfile) return prev;

            // Run comparison
            const result = compareReference(comp.mysteryProfile, refProfile, pClue.category);

            const attempt: import('@/lib/deductionEngine').ReferenceAttempt = {
                referenceSpeciesId,
                referenceName: refProfile.commonName,
                clueId,
                category: pClue.category,
                result,
            };

            // Update confirmed tags or eliminations
            const newConfirmed = { ...comp.confirmedTags };
            const newEliminated = [...comp.eliminatedSpeciesIds];

            if (result.matched) {
                const existing = newConfirmed[pClue.category] ?? [];
                newConfirmed[pClue.category] = [...new Set([...existing, ...result.matchedTags])];
            } else {
                // Negative: this reference species doesn't share tags → eliminate it
                if (!newEliminated.includes(referenceSpeciesId)) {
                    newEliminated.push(referenceSpeciesId);
                }
            }

            // Recount candidates
            const allProfiles = [...comp.albumProfiles, comp.mysteryProfile];
            const eliminatedSet = new Set(newEliminated);
            const candidates = filterCandidates(allProfiles, newConfirmed, eliminatedSet);

            // Update clue status
            const updatedProcessed = comp.processedClues.map(pc =>
                pc.clueId === clueId
                    ? { ...pc, status: (result.matched ? 'confirmed' : 'rejected') as ProcessedClue['status'] }
                    : pc
            );

            return {
                ...prev,
                comparativeDeduction: {
                    ...comp,
                    activeReferenceId: referenceSpeciesId,
                    processedClues: updatedProcessed,
                    referenceHistory: [...comp.referenceHistory, attempt],
                    confirmedTags: newConfirmed,
                    eliminatedSpeciesIds: newEliminated,
                    candidateCount: candidates.length,
                },
            };
        });
    }, []);

    const handleComparativeGuessResult = useCallback((isCorrect: boolean) => {
        setRunState(prev => {
            if (prev.phase !== 'deduction' || !prev.comparativeDeduction || !prev.deductionCamp) return prev;
            const comp = prev.comparativeDeduction;
            const camp = prev.deductionCamp;

            if (isCorrect) {
                const totalClues = comp.processedClues.length;
                const { guessBonus, efficiencyBonus } = getGuessBonuses(totalClues, true);
                const finalScore = camp.bankedScore - camp.scoreSpent - comp.scoreSpent + guessBonus + efficiencyBonus;

                if (runIdRef.current) {
                    const rid = runIdRef.current;
                    const deductionSummary = {
                        scoreSpent: camp.scoreSpent + comp.scoreSpent,
                        processedClues: totalClues,
                        confirmedCategories: Object.keys(comp.confirmedTags).length,
                        candidateCount: comp.candidateCount,
                        referenceAttempts: comp.referenceHistory.length,
                        finalScore,
                    };
                    fetch(`/api/runs/${rid}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ finalScore, deductionSummary, speciesId: correctSpeciesIdRef.current || undefined }),
                    }).catch(err => console.error('Failed to persist deduction:', err));
                }

                return {
                    ...prev,
                    phase: 'complete' as const,
                    comparativeDeduction: { ...comp, guessResult: 'correct', guessBonusAwarded: guessBonus + efficiencyBonus },
                    finalScore,
                };
            } else {
                return {
                    ...prev,
                    comparativeDeduction: { ...comp, guessResult: 'wrong' },
                    deductionCamp: { ...camp, scoreSpent: camp.scoreSpent + 25 },
                };
            }
        });
    }, []);

    // --- EventBus registration ---
    useEffect(() => {
        const handleBonusTick = (d: EventPayloads['node-bonus-tick']) => {
            setBoardOpacity(d.pct >= 0.5 ? 1 : 0.35 + d.pct * 1.3);
        };

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
        EventBus.on('node-bonus-tick', handleBonusTick);
        EventBus.on('game-reset', resetRunStateLocal);

        return () => {
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
            EventBus.off('game-reset', resetRunStateLocal);
        };
    }, [handleExpeditionDataReady, handleExpeditionStart, handleNodeAdvanceRequested, handleHudUpdate, handleObjectiveUpdate, handleSouvenirDrop, handleResourceWalletUpdate, handleConsumableFound, handleConsumableUseRequested, handleClueFragmentEarned, handleClueDiscountEarned, handleClueRevealed, handleNodeRewardsSummary, resetRunStateLocal]);

    return {
        runState,
        boardOpacity,
        hudRef,
        correctSpeciesIdRef,
        hiddenSpeciesNameRef,
        handleAffinitySelected,
        handleRunReset,
        handleCrisisToolSpend,
        handleDeductionPurchase,
        handleDeductionGuessResult,
        handleProcessClue,
        handlePlaceReference,
        handleComparativeGuessResult,
    };
}

// --- Helpers ---

function buildDeductionCampState(prev: RunState): DeductionCampState {
    const campShop: ClueShopEntry[] = CLUE_CATEGORY_KEYS.map(cat => ({
        category: cat, purchased: 0, fragmentCount: prev.clueFragments[cat],
    }));
    return {
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
}

function persistWallet(runId: string, wallet: Record<string, number> | ResourceWallet) {
    setTimeout(() => {
        fetch(`/api/runs/${runId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resourceWallet: { ...wallet } }),
        }).catch(err => console.error('Failed to persist resource wallet:', err));
    }, 0);
}
