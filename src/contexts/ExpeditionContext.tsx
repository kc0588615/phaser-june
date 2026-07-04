import React, { createContext, useContext, useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { EventBus } from '@/game/EventBus';
import type { EventPayloads } from '@/game/EventBus';
import { useGameBridge } from './GameBridgeContext';
import { toast } from 'sonner';
import type { RunState, ClueCategoryKey, DeductionCampState, ClueShopEntry, ComparativeDeductionState, HabitatSurveyEntry } from '@/types/expedition';
import { createEmptyClueFragments, createEmptyComparativeState, CLUE_CATEGORY_KEYS, getDeductionFinalScore, getGuessBonuses, deductionCatToWalletKey } from '@/types/expedition';
import { compareReference, filterCandidates, getNextClueForWalletKey, applyEvidenceBundle } from '@/lib/deductionEngine';
import type { DeductionProfile, DeductionClue, ProcessedClue } from '@/lib/deductionEngine';
import type { DeductionClueCategory } from '@/db/schema/species';
import type { AffinityType } from '@/expedition/affinities';
import { GRID_COLS, GRID_ROWS } from '@/game/constants';
import { buildNodeBoardContext } from '@/game/nodeObstacles';
import { buildBoardSpawnConfigForNode } from '@/expedition/domain';
import type { LootGemType } from '@/expedition/domain';
import { buildRunEvidenceBundle } from '@/lib/featureFingerprint';
import { computeExpeditionRoutePolyline, getRoutePolylineThroughWaypointSlot, type RoutePoint } from '@/lib/expeditionRoute';
import type { Species } from '@/types/database';
import type { FeatureFingerprint } from '@/types/gis';
import type { RasterHabitatResult } from '@/lib/speciesService';
import { unlockSpeciesCardDiscovery } from '@/lib/speciesCardUnlocks';
import { getWaypointTypeLabel, type ExpeditionWaypoint } from '@/types/waypoints';

const INITIAL_RUN_STATE: RunState = {
  phase: 'idle',
  expedition: null,
  currentNodeIndex: 0,
  activeAffinities: [],
  bankedScore: 0,
  clueFragments: createEmptyClueFragments(),
  deductionCamp: null,
  comparativeDeduction: null,
  finalScore: null,
  totalThoughtDiscount: 0,
  evidenceBundle: null,
};

interface ExpeditionContextValue {
  runState: RunState;
  boardOpacity: number;
  correctSpeciesId: number;
  hiddenSpeciesName: string;
  handleAffinitySelected: (affinityId: AffinityType | null) => void;
  handleRunResume: (runId: string) => Promise<boolean>;
  handleRunReset: () => void;
  handleDeductionGuessResult: (isCorrect: boolean) => void;
  handleProcessClue: (clueId: number) => void;
  handlePlaceReference: (referenceSpeciesId: number, clueId: number) => void;
  handleComparativeGuessResult: (isCorrect: boolean, guessedName?: string) => void;
  /** Navigate to species list — replaces show-species-list EventBus event */
  showSpeciesList: (speciesId: number) => void;
  /** Register callback for show-species-list navigation */
  onShowSpeciesList: React.MutableRefObject<((speciesId: number) => void) | null>;
  playedAnchorKeys: Set<string>;
  markAnchorPlayed: (anchorKey: string) => void;
}

const ExpeditionContext = createContext<ExpeditionContextValue | null>(null);

export function useExpedition() {
  const ctx = useContext(ExpeditionContext);
  if (!ctx) throw new Error('useExpedition must be used within ExpeditionProvider');
  return ctx;
}

export function ExpeditionProvider({ children }: { children: React.ReactNode }) {
  const { hudRef } = useGameBridge();

  const [runState, setRunState] = useState<RunState>(INITIAL_RUN_STATE);
  const [boardOpacity, setBoardOpacity] = useState(1);
  const [playedAnchorKeys, setPlayedAnchorKeys] = useState<Set<string>>(new Set());

  const expeditionPayloadRef = useRef<EventPayloads['expedition-data-ready'] | null>(null);
  const runIdRef = useRef<string | null>(null);
  const nodeIdsRef = useRef<string[]>([]);
  const nodeStartScoreRef = useRef<number>(0);
  const lastResolvedNodeRef = useRef<number>(-1);
  const correctSpeciesIdRef = useRef<number>(0);
  const hiddenSpeciesNameRef = useRef<string>('');
  const activeAffinitiesRef = useRef<AffinityType[]>([]);
  const plannedRoutePolylineRef = useRef<RoutePoint[]>([]);
  const routePolylineRef = useRef<RoutePoint[]>([]);
  const runStateRef = useRef<RunState>(INITIAL_RUN_STATE);
  const lastObjectiveCheckpointAtRef = useRef(0);
  const objectiveProgressRef = useRef<number>(0);
  const onShowSpeciesListRef = useRef<((speciesId: number) => void) | null>(null);

  useEffect(() => {
    runStateRef.current = runState;
  }, [runState]);

  const resetRunStateLocal = useCallback(() => {
    expeditionPayloadRef.current = null;
    runIdRef.current = null;
    nodeIdsRef.current = [];
    nodeStartScoreRef.current = 0;
    lastResolvedNodeRef.current = -1;
    correctSpeciesIdRef.current = 0;
    hiddenSpeciesNameRef.current = '';
    activeAffinitiesRef.current = [];
    plannedRoutePolylineRef.current = [];
    routePolylineRef.current = [];
    lastObjectiveCheckpointAtRef.current = 0;
    setBoardOpacity(1);
    setRunState(INITIAL_RUN_STATE);
  }, []);

  const handleExpeditionDataReady = useCallback((data: EventPayloads['expedition-data-ready']) => {
    expeditionPayloadRef.current = data;
    activeAffinitiesRef.current = data.expedition.activeAffinities;
    plannedRoutePolylineRef.current = getExpeditionRoutePolyline(data);
    routePolylineRef.current = getRoutePolylineThroughNode(plannedRoutePolylineRef.current, 0);
    const evidenceBundle = data.featureFingerprints?.length
      ? buildRunEvidenceBundle(data.featureFingerprints)
      : null;
    setRunState({
      ...INITIAL_RUN_STATE,
      phase: 'briefing',
      expedition: data.expedition,
      activeAffinities: data.expedition.activeAffinities,
      evidenceBundle,
    });
  }, []);

  const handleExpeditionStart = useCallback(() => {
    setRunState(prev => ({ ...prev, phase: 'mystery', activeAffinities: [...activeAffinitiesRef.current] }));
    nodeStartScoreRef.current = 0;
    lastResolvedNodeRef.current = -1;
    objectiveProgressRef.current = 0;
    setBoardOpacity(1);
    const payload = expeditionPayloadRef.current;
    if (!payload) return;
    plannedRoutePolylineRef.current = getExpeditionRoutePolyline(payload);
    routePolylineRef.current = getRoutePolylineThroughNode(plannedRoutePolylineRef.current, 0);

    const correct = chooseMysterySpecies(payload.species, payload.expedition.activeAnchor ?? null);
    if (correct) {
      correctSpeciesIdRef.current = correct.id;
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
        correctSpeciesId: correct?.id,
        speciesIds: payload.species.map(species => species.id),
        habitats: payload.habitats,
        rasterHabitats: payload.rasterHabitats,
        featureFingerprints: payload.featureFingerprints ?? [],
        routePolyline: plannedRoutePolylineRef.current,
        expeditionSnapshot: {
          protectedAreas: payload.expedition.protectedAreas,
          actionBias: payload.expedition.actionBias,
          availableAffinities: payload.expedition.availableAffinities,
          primaryNodeFamily: payload.expedition.primaryNodeFamily,
          primaryVariant: payload.expedition.primaryVariant,
          modifierNodes: payload.expedition.modifierNodes,
          signals: payload.expedition.signals,
          waypoints: payload.expedition.waypoints ?? [],
          activeAnchor: payload.expedition.activeAnchor ?? null,
          waypointRadiusKm: payload.expedition.waypointRadiusKm ?? null,
          nearestRiverDistM: payload.expedition.nearestRiverDistM ?? null,
        },
      }),
    })
      .then(r => {
        if (!r.ok) { console.warn(`[ExpeditionContext] Run creation failed (${r.status}). Score persistence disabled for this run.`); return null; }
        return r.json();
      })
      .then(data => {
        if (data) {
          runIdRef.current = data.runId;
          nodeIdsRef.current = data.nodeIds;
        }
      })
      .catch(err => console.error('Failed to create run session:', err));

    const firstNode = payload.expedition.nodes[0];
    const firstBoardContext = buildNodeBoardContext({
      width: GRID_COLS, height: GRID_ROWS,
      obstacles: firstNode?.obstacles ?? [], nodeIndex: 0,
    });
    const firstBoardConfig = buildBoardSpawnConfigForNode(
      firstNode?.node_type ?? 'custom', firstNode?.counterGem ?? null,
      payload.expedition.actionBias, activeAffinitiesRef.current,
      buildHabitatLootWeights(payload.rasterHabitats),
    );
    const firstLocation = getNodeRouteLocation(payload, 0);
    EventBus.emit('cesium-location-selected', {
      lon: firstLocation.lon, lat: firstLocation.lat,
      ecoregionId: payload.ecoregionId ?? null,
      species: payload.species, rasterHabitats: payload.rasterHabitats,
      habitats: payload.habitats, difficulty: firstNode?.difficulty,
      moveBudget: firstNode?.moveBudget,
      obstacles: firstNode?.obstacles, obstacleFamily: firstNode?.obstacleFamily,
      counterGem: firstNode?.counterGem, requiredGems: firstNode?.requiredGems,
      activeAffinities: activeAffinitiesRef.current,
      objectiveTarget: firstNode?.objectiveTarget, nodeIndex: 0,
      nodeType: firstNode?.node_type, events: firstNode?.events,
      boardContext: firstBoardContext, boardConfig: firstBoardConfig,
      encounterConfig: firstNode?.encounterConfig,
    });
  }, []);

  const handleAffinitySelected = useCallback((affinityId: AffinityType | null) => {
    const nextAffinities = affinityId ? [affinityId] : [];
    activeAffinitiesRef.current = nextAffinities;
    setRunState(prev => {
      if (!prev.expedition) return prev;
      return { ...prev, activeAffinities: nextAffinities, expedition: { ...prev.expedition, activeAffinities: nextAffinities } };
    });
  }, []);

  const handleRunResume = useCallback(async (runId: string): Promise<boolean> => {
    try {
      const runResponse = await fetch(`/api/runs/${runId}`);
      if (!runResponse.ok) throw new Error(`Run fetch failed (${runResponse.status})`);
      const data = await runResponse.json() as ResumeRunResponse;
      const resume = data.resume;
      if (!resume?.expedition?.nodes?.length) throw new Error('Run has no resumable expedition payload');

      const species = await fetchResumeSpecies(resume.speciesIds, resume.lon, resume.lat);
      const expedition = {
        ...resume.expedition,
        activeAffinities: normalizeAffinities(resume.expedition.activeAffinities),
        availableAffinities: normalizeAffinities(resume.expedition.availableAffinities),
      };
      const payload: EventPayloads['expedition-data-ready'] = {
        lon: resume.lon,
        lat: resume.lat,
        expedition,
        species,
        rasterHabitats: resume.rasterHabitats ?? [],
        habitats: resume.habitats ?? [],
        featureFingerprints: resume.featureFingerprints ?? [],
      };
      const currentNodeIndex = clampNodeIndex(resume.currentNodeIndex, expedition.nodes.length, data.run?.status);
      const correctSpecies = species.find(s => s.id === resume.correctSpeciesId) ?? [...species].sort((a, b) => a.id - b.id)[0];
      const evidenceBundle = payload.featureFingerprints?.length
        ? buildRunEvidenceBundle(payload.featureFingerprints)
        : null;
      const clueFragments = mergeClueFragments(resume.clueFragments);
      const bankedScore = typeof resume.bankedScore === 'number' ? resume.bankedScore : 0;
      const routeNodeIndex = data.run?.status === 'deduction' ? currentNodeIndex : Math.max(0, currentNodeIndex - 1);

      expeditionPayloadRef.current = payload;
      runIdRef.current = runId;
      nodeIdsRef.current = (data.nodes ?? []).sort((a, b) => a.nodeOrder - b.nodeOrder).map(node => node.id);
      correctSpeciesIdRef.current = correctSpecies?.id ?? resume.correctSpeciesId ?? 0;
      hiddenSpeciesNameRef.current = correctSpecies?.common_name || correctSpecies?.scientific_name || 'Unknown Species';
      activeAffinitiesRef.current = expedition.activeAffinities;
      plannedRoutePolylineRef.current = getExpeditionRoutePolyline(payload);
      routePolylineRef.current = getRoutePolylineThroughNode(plannedRoutePolylineRef.current, routeNodeIndex);
      nodeStartScoreRef.current = 0;
      lastResolvedNodeRef.current = Math.max(-1, currentNodeIndex - 1);
      const resumedObjectiveProgress = data.nodes?.find(node => node.nodeOrder === currentNodeIndex + 1)?.objectiveProgress ?? 0;
      objectiveProgressRef.current = resumedObjectiveProgress;
      setBoardOpacity(1);

      if (data.run?.status === 'deduction') {
        const deductionState: RunState = {
          ...INITIAL_RUN_STATE,
          phase: 'mystery',
          expedition,
          currentNodeIndex,
          activeAffinities: expedition.activeAffinities,
          clueFragments,
          bankedScore,
          deductionCamp: buildDeductionCampFromCheckpoint(bankedScore, clueFragments),
          evidenceBundle,
        };
        setRunState(deductionState);
        toast('Resumed mystery', { duration: 1800 });
        return true;
      }

      setRunState({
        ...INITIAL_RUN_STATE,
        phase: 'mystery',
        expedition,
        currentNodeIndex,
        activeAffinities: expedition.activeAffinities,
        clueFragments,
        bankedScore,
        evidenceBundle,
      });

      setTimeout(() => {
        emitBoardForNode(payload, currentNodeIndex, expedition.activeAffinities, resumedObjectiveProgress);
        toast('Resumed expedition checkpoint', { duration: 1800 });
      }, 100);
      return true;
    } catch (error) {
      console.error('Failed to resume run:', error);
      toast.error('Could not resume that expedition');
      return false;
    }
  }, [objectiveProgressRef]);

  const handleNodeAdvanceRequested = useCallback((data: EventPayloads['node-advance-requested']) => {
    setBoardOpacity(1);
    setRunState(prev => {
      if (prev.phase !== 'mystery') return prev;
      if (data.nodeIndex !== prev.currentNodeIndex) return prev;
      if (data.nodeIndex <= lastResolvedNodeRef.current) return prev;

      const nodeOrder = prev.currentNodeIndex + 1;
      const nextIndex = prev.currentNodeIndex + 1;
      lastResolvedNodeRef.current = prev.currentNodeIndex;
      routePolylineRef.current = getRoutePolylineThroughNode(plannedRoutePolylineRef.current, prev.currentNodeIndex);

      const nodeScore = (hudRef.current?.score ?? 0) - nodeStartScoreRef.current;
      const nodeMoves = hudRef.current?.movesUsed ?? 0;
      const objProgress = objectiveProgressRef.current;
      if (runIdRef.current) {
        persistRunCheckpoint(runIdRef.current, prev, nextIndex, routePolylineRef.current, 'deduction');
        fetch(`/api/runs/${runIdRef.current}/nodes/${nodeOrder}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scoreEarned: Math.max(0, nodeScore), movesUsed: nodeMoves,
            objectiveProgress: objProgress,
            encounterOutcome: data.encounterOutcome ?? undefined,
          }),
        }).catch(err => console.error('Failed to complete node:', err));
      }

      EventBus.emit('node-complete', { nodeIndex: prev.currentNodeIndex });
      nodeStartScoreRef.current = hudRef.current?.score ?? 0;

      const campState = buildDeductionCampState(prev);
      const message = data.reason === 'escaped'
        ? 'The animal slipped away. Review the evidence.'
        : 'Field notes ready — time to identify.';
      setTimeout(() => toast(message, { duration: 3000 }), 0);
      return {
        ...prev,
        phase: 'complete' as const,
        currentNodeIndex: nextIndex,
        deductionCamp: campState,
        completionReason: data.reason === 'escaped' ? 'slipped' : 'captured',
      };
    });
  }, [hudRef, objectiveProgressRef]);

  const handleNodeObjectiveCheckpoint = useCallback((data: EventPayloads['node-objective-updated']) => {
    const state = runStateRef.current;
    if (state.phase !== 'mystery' || !runIdRef.current) return;
    if (data.target <= 0 || data.progress <= 0) return;

    const now = Date.now();
    if (now - lastObjectiveCheckpointAtRef.current < 5000 && data.progress < data.target) return;
    lastObjectiveCheckpointAtRef.current = now;

    persistRunCheckpoint(
      runIdRef.current,
      state,
      state.currentNodeIndex,
      routePolylineRef.current,
      undefined,
      data.progress,
    );
  }, []);

  const handleRunReset = useCallback(() => {
    resetRunStateLocal();
    EventBus.emit('game-reset', undefined);
  }, [resetRunStateLocal]);

  const handleNodeRewardsSummary = useCallback((data: EventPayloads['node-rewards-summary']) => {
    const totalReward = data.baseClearReward + data.preservedNodeBonus + data.triviaReward;
    setRunState(prev => {
      if (prev.phase !== 'mystery') return prev;
      return { ...prev, bankedScore: prev.bankedScore + totalReward };
    });
  }, []);

  const handleDeductionClueTriggered = useCallback((data: EventPayloads['deduction-clue-triggered']) => {
    setRunState(prev => {
      if (prev.phase !== 'mystery' || !prev.comparativeDeduction) return prev;
      const comp = prev.comparativeDeduction;
      const walletKey = deductionCatToWalletKey(data.category);
      if (walletKey === 'habitat') {
        const nextSurveyIndex = comp.habitatSurvey.findIndex(entry => !entry.revealed);
        if (nextSurveyIndex === -1) {
          if (!comp.habitatSurveyCompleteNotified) {
            toast('Habitat survey complete', { duration: 1800 });
            return {
              ...prev,
              comparativeDeduction: { ...comp, habitatSurveyCompleteNotified: true },
            };
          }
          return prev;
        }

        const nextEntry = comp.habitatSurvey[nextSurveyIndex];
        const nextSurvey = comp.habitatSurvey.map((entry, index) => (
          index === nextSurveyIndex ? { ...entry, revealed: true } : entry
        ));
        toast(`Habitat survey: ${nextEntry.habitatType} (${nextEntry.percentage}%)`, { duration: 2200 });
        return {
          ...prev,
          comparativeDeduction: { ...comp, habitatSurvey: nextSurvey },
        };
      }

      const processedIds = new Set(comp.processedClues.map(clue => clue.clueId));
      const nextClue = getNextClueForWalletKey(
        comp.mysteryClues,
        walletKey,
        processedIds,
      );
      if (!nextClue) return prev;
      const processed: ProcessedClue = {
        clueId: nextClue.id,
        category: nextClue.category,
        label: nextClue.label,
        status: 'processed',
        compareTags: nextClue.compareTags,
        fragmentCost: 0,
      };
      toast(nextClue.label, { duration: 2200 });
      return {
        ...prev,
        comparativeDeduction: {
          ...comp,
          processedClues: [...comp.processedClues, processed],
        },
      };
    });
  }, []);

  const handleDeductionGuessResult = useCallback((isCorrect: boolean) => {
    setRunState(prev => {
      if (prev.phase !== 'mystery' || !prev.deductionCamp) return prev;
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
                featureFingerprints: expeditionPayloadRef.current?.featureFingerprints ?? [],
                routePolyline: routePolylineRef.current,
              }),
            })
              .then((response) => {
                if (response.ok) {
                  window.dispatchEvent(new CustomEvent('species-card-progress-updated', { detail: { speciesId: correctSpeciesIdRef.current } }));
                }
              })
              .catch(err => console.error('Failed to persist deduction summary:', err));
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

  const showSpeciesList = useCallback((speciesId: number) => {
    onShowSpeciesListRef.current?.(speciesId);
  }, []);

  const markAnchorPlayed = useCallback((anchorKey: string) => {
    setPlayedAnchorKeys(prev => {
      if (prev.has(anchorKey)) return prev;
      const next = new Set(prev);
      next.add(anchorKey);
      return next;
    });
  }, []);

  // --- Comparative deduction: fetch profiles when the mystery starts ---
  useEffect(() => {
    if (runState.phase !== 'mystery' || runState.comparativeDeduction) return;
    const speciesId = correctSpeciesIdRef.current;
    if (!speciesId) return;

    fetch('/api/species/catalog')
      .then(r => r.ok ? r.json() : null)
      .then(catalog => {
        const allSpeciesIds = Array.isArray(catalog?.species)
          ? catalog.species
              .map((species: { id?: unknown }) => species.id)
              .filter((id: unknown): id is number => Number.isInteger(id) && id !== speciesId)
          : [];
        const albumParam = allSpeciesIds.join(',');
        return fetch(`/api/species/deduction?mysteryId=${speciesId}&albumIds=${albumParam}`);
      })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const anchorClues = buildAnchorGeographyClues(
          expeditionPayloadRef.current?.expedition.activeAnchor ?? null,
          data.mysteryProfile?.speciesId,
        );
        const compState = createEmptyComparativeState(
          data.mysteryProfile,
          [...anchorClues, ...data.mysteryClues],
          data.albumProfiles,
          buildHabitatSurvey(expeditionPayloadRef.current?.rasterHabitats ?? []),
        );
        setRunState(prev => {
          if (prev.phase !== 'mystery') return prev;
          // Auto-confirm habitat tags from GIS evidence + recompute candidates
          if (prev.evidenceBundle) {
            const { confirmedCategories, confirmedHabitatTags } = applyEvidenceBundle(prev.evidenceBundle, compState.mysteryProfile);
            if (confirmedHabitatTags.length > 0) {
              compState.confirmedTags = { ...compState.confirmedTags };
              for (const cat of confirmedCategories) {
                compState.confirmedTags[cat] = [...(compState.confirmedTags[cat] ?? []), ...confirmedHabitatTags];
              }
              const allProfiles = [...compState.albumProfiles, compState.mysteryProfile];
              compState.candidateCount = filterCandidates(allProfiles, compState.confirmedTags, new Set(compState.eliminatedSpeciesIds)).length;
            }
          }
          return { ...prev, comparativeDeduction: compState };
        });
      })
      .catch(err => console.error('Failed to fetch deduction profiles:', err));
  }, [runState.phase, runState.comparativeDeduction]);

  // --- Comparative deduction handlers ---

  const handleProcessClue = useCallback((clueId: number) => {
    setRunState(prev => {
      if (prev.phase !== 'mystery' || !prev.comparativeDeduction) return prev;
      const comp = prev.comparativeDeduction;
      const clue = comp.mysteryClues.find(c => c.id === clueId);
      if (!clue || comp.processedClues.some(pc => pc.clueId === clueId)) return prev;

      const processed: ProcessedClue = { clueId: clue.id, category: clue.category, label: clue.label, status: 'processed', compareTags: clue.compareTags, fragmentCost: 0 };
      return {
        ...prev,
        comparativeDeduction: { ...comp, processedClues: [...comp.processedClues, processed] },
      };
    });
  }, []);

  const handlePlaceReference = useCallback((referenceSpeciesId: number, clueId: number) => {
    setRunState(prev => {
      if (prev.phase !== 'mystery' || !prev.comparativeDeduction) return prev;
      const comp = prev.comparativeDeduction;
      const pClue = comp.processedClues.find(pc => pc.clueId === clueId);
      if (!pClue || pClue.status !== 'processed' || !pClue.compareTags) return prev;
      const refProfile = comp.albumProfiles.find(p => p.speciesId === referenceSpeciesId);
      if (!refProfile) return prev;

      const result = compareReference(comp.mysteryProfile, refProfile, pClue.category, pClue.compareTags);
      const attempt: import('@/lib/deductionEngine').ReferenceAttempt = { referenceSpeciesId, referenceName: refProfile.commonName, clueId, category: pClue.category, result };

      const newConfirmed = { ...comp.confirmedTags };
      const newEliminated = [...comp.eliminatedSpeciesIds];
      if (result.matched) {
        const existing = newConfirmed[pClue.category] ?? [];
        newConfirmed[pClue.category] = [...new Set([...existing, ...result.matchedTags])];
      } else {
        if (!newEliminated.includes(referenceSpeciesId)) {
          newEliminated.push(referenceSpeciesId);
        }
      }

      const allProfiles = [...comp.albumProfiles, comp.mysteryProfile];
      const candidates = filterCandidates(allProfiles, newConfirmed, new Set(newEliminated));
      // On a match, mark the clue confirmed. On a mismatch, leave it 'processed'
      // so the player can compare against another reference rather than burning the clue.
      const updatedProcessed = result.matched
        ? comp.processedClues.map(pc => pc.clueId === clueId ? { ...pc, status: 'confirmed' as ProcessedClue['status'] } : pc)
        : comp.processedClues;

      return { ...prev, comparativeDeduction: { ...comp, activeReferenceId: referenceSpeciesId, processedClues: updatedProcessed, referenceHistory: [...comp.referenceHistory, attempt], confirmedTags: newConfirmed, eliminatedSpeciesIds: newEliminated, candidateCount: candidates.length } };
    });
  }, []);

  const handleComparativeGuessResult = useCallback((isCorrect: boolean, guessedName?: string) => {
    setRunState(prev => {
      if (prev.phase !== 'mystery' || !prev.comparativeDeduction || !prev.deductionCamp) return prev;
      const comp = prev.comparativeDeduction;
      const camp = prev.deductionCamp;
      if (isCorrect) {
        const totalClues = comp.processedClues.length;
        const { guessBonus, efficiencyBonus } = getGuessBonuses(totalClues, true);
        const finalScore = camp.bankedScore - camp.scoreSpent - comp.scoreSpent + guessBonus + efficiencyBonus;
        if (runIdRef.current) {
          const rid = runIdRef.current;
          fetch(`/api/runs/${rid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ finalScore, deductionSummary: { scoreSpent: camp.scoreSpent + comp.scoreSpent, processedClues: totalClues, confirmedCategories: Object.keys(comp.confirmedTags).length, candidateCount: comp.candidateCount, referenceAttempts: comp.referenceHistory.length, finalScore }, speciesId: correctSpeciesIdRef.current || undefined, featureFingerprints: expeditionPayloadRef.current?.featureFingerprints ?? [], routePolyline: routePolylineRef.current }) })
            .then((response) => {
              if (response.ok) {
                window.dispatchEvent(new CustomEvent('species-card-progress-updated', { detail: { speciesId: correctSpeciesIdRef.current } }));
              }
            })
            .catch(err => console.error('Failed to persist deduction:', err));
        }
        unlockSpeciesCardDiscovery(correctSpeciesIdRef.current).catch(err => console.error('Failed to unlock species card:', err));
        return {
          ...prev,
          phase: 'complete' as const,
          comparativeDeduction: { ...comp, guessResult: 'correct', guessBonusAwarded: guessBonus + efficiencyBonus },
          finalScore,
          completionReason: 'captured',
        };
      }
      const guessedProfile = guessedName
        ? comp.albumProfiles.find(profile => profile.commonName.toLowerCase() === guessedName.toLowerCase())
        : null;
      const eliminatedSpeciesIds = guessedProfile && !comp.eliminatedSpeciesIds.includes(guessedProfile.speciesId)
        ? [...comp.eliminatedSpeciesIds, guessedProfile.speciesId]
        : comp.eliminatedSpeciesIds;
      const lastWrongGuessFeedback = guessedProfile
        ? (Object.keys(comp.confirmedTags) as DeductionClueCategory[])
            .filter(category => (comp.confirmedTags[category]?.length ?? 0) > 0)
            .map(category => compareReference(comp.mysteryProfile, guessedProfile, category, comp.confirmedTags[category]))
        : null;
      const allProfiles = [...comp.albumProfiles, comp.mysteryProfile];
      const candidateCount = filterCandidates(allProfiles, comp.confirmedTags, new Set(eliminatedSpeciesIds)).length;
      return {
        ...prev,
        comparativeDeduction: {
          ...comp,
          guessResult: 'wrong',
          eliminatedSpeciesIds,
          candidateCount,
          lastWrongGuessFeedback,
        },
      };
    });
  }, []);

  // --- EventBus registration (expedition lifecycle only) ---
  useEffect(() => {
    EventBus.on('expedition-data-ready', handleExpeditionDataReady);
    EventBus.on('expedition-start', handleExpeditionStart);
    EventBus.on('node-advance-requested', handleNodeAdvanceRequested);
    EventBus.on('deduction-clue-triggered', handleDeductionClueTriggered);
    EventBus.on('node-rewards-summary', handleNodeRewardsSummary);
    EventBus.on('node-objective-updated', handleNodeObjectiveCheckpoint);
    EventBus.on('game-reset', resetRunStateLocal);

    return () => {
      EventBus.off('expedition-data-ready', handleExpeditionDataReady);
      EventBus.off('expedition-start', handleExpeditionStart);
      EventBus.off('node-advance-requested', handleNodeAdvanceRequested);
      EventBus.off('deduction-clue-triggered', handleDeductionClueTriggered);
      EventBus.off('node-rewards-summary', handleNodeRewardsSummary);
      EventBus.off('node-objective-updated', handleNodeObjectiveCheckpoint);
      EventBus.off('game-reset', resetRunStateLocal);
    };
  }, [handleExpeditionDataReady, handleExpeditionStart, handleNodeAdvanceRequested, handleDeductionClueTriggered, handleNodeRewardsSummary, handleNodeObjectiveCheckpoint, resetRunStateLocal]);

  const value = useMemo<ExpeditionContextValue>(() => ({
    runState, boardOpacity,
    correctSpeciesId: correctSpeciesIdRef.current,
    hiddenSpeciesName: hiddenSpeciesNameRef.current,
    handleAffinitySelected, handleRunResume, handleRunReset,
    handleDeductionGuessResult,
    handleProcessClue, handlePlaceReference, handleComparativeGuessResult,
    showSpeciesList,
    onShowSpeciesList: onShowSpeciesListRef,
    playedAnchorKeys,
    markAnchorPlayed,
  }), [runState, boardOpacity, handleAffinitySelected, handleRunResume, handleRunReset, handleDeductionGuessResult, handleProcessClue, handlePlaceReference, handleComparativeGuessResult, showSpeciesList, playedAnchorKeys, markAnchorPlayed]);

  return <ExpeditionContext.Provider value={value}>{children}</ExpeditionContext.Provider>;
}

// --- Helpers ---

function getExpeditionRoutePolyline(payload: EventPayloads['expedition-data-ready'] | null) {
  if (!payload) return [];
  return payload.expedition.routePolyline?.length
    ? payload.expedition.routePolyline
    : computeExpeditionRoutePolyline(payload.lon, payload.lat, payload.expedition.nodes.length);
}

function getRoutePolylineThroughNode(route: Array<{ lon: number; lat: number }>, nodeIndex: number) {
  if (route.length === 0) return [];
  return getRoutePolylineThroughWaypointSlot(route, nodeIndex);
}

function getNodeRouteLocation(payload: EventPayloads['expedition-data-ready'], nodeIndex: number) {
  const waypoint = payload.expedition.nodes[nodeIndex]?.waypoint;
  return waypoint
    ? { lon: waypoint.lon, lat: waypoint.lat }
    : { lon: payload.lon, lat: payload.lat };
}

function buildHabitatSurvey(rasterHabitats: RasterHabitatResult[]): HabitatSurveyEntry[] {
  return [...rasterHabitats]
    .filter(entry => typeof entry.habitat_type === 'string' && Number.isFinite(entry.percentage))
    .sort((a, b) => b.percentage - a.percentage)
    .map(entry => ({
      habitatType: entry.habitat_type,
      percentage: Math.round(entry.percentage * 10) / 10,
      revealed: false,
    }));
}

function buildHabitatLootWeights(rasterHabitats: RasterHabitatResult[]): Partial<Record<LootGemType, number>> {
  const weights: Record<LootGemType, number> = {
    black: 1,
    blue: 1,
    green: 1,
    orange: 1,
    red: 1,
    white: 1,
    yellow: 1,
    purple: 1,
  };

  for (const habitat of rasterHabitats) {
    const text = habitat.habitat_type.toLowerCase();
    const pct = Number.isFinite(habitat.percentage)
      ? Math.max(0, habitat.percentage > 1 ? habitat.percentage / 100 : habitat.percentage)
      : 0;
    if (pct <= 0) continue;

    if (text.includes('forest')) weights.green += 3 * pct;
    if (text.includes('savanna')) weights.orange += 3 * pct;
    if (text.includes('shrub')) weights.black += 3 * pct;
    if (text.includes('grass')) weights.white += 3 * pct;
    if (/(wetland|marsh|bog)/.test(text)) weights.blue += 3 * pct;
    if (text.includes('urban')) weights.red += 3 * pct;
  }

  return weights;
}

function chooseMysterySpecies(species: Species[], anchor: ExpeditionWaypoint | null): Species | undefined {
  const sorted = [...species].sort((a, b) => a.id - b.id);
  if (!anchor) return sorted[0];

  return sorted
    .map(candidate => ({ candidate, score: scoreSpeciesForAnchor(candidate, anchor) }))
    .sort((a, b) => b.score - a.score || a.candidate.id - b.candidate.id)[0]?.candidate;
}

function scoreSpeciesForAnchor(species: Species, anchor: ExpeditionWaypoint): number {
  const text = speciesSearchText(species);
  if (anchor.waypointType === 'river' || anchor.waypointType === 'lake' || anchor.waypointType === 'wetland') {
    let score = species.freshwater ? 5 : 0;
    if (/(freshwater|river|stream|lake|wetland|marsh|swamp|aquatic|riparian)/.test(text)) score += 3;
    if (species.marine || /marine|coastal|shore|estuary/.test(text)) score += 1;
    return score;
  }

  if (anchor.waypointType === 'city' || anchor.waypointType === 'basecamp') {
    return /(urban|city|town|settlement|artificial|built|garden|crop|agricultur|pasture)/.test(text) ? 3 : 0;
  }

  if (anchor.waypointType === 'protected_area') {
    const code = (species.conservation_code ?? species.category ?? '').toUpperCase();
    let score = /^(VU|EN|CR)$/.test(code) ? 4 : 0;
    if (/(vulnerable|endangered|critically endangered|threatened)/.test(text)) score += 2;
    return score;
  }

  return 0;
}

function speciesSearchText(species: Species): string {
  const values = [
    species.common_name,
    species.scientific_name,
    species.habitat_description,
    Array.isArray(species.habitat_tags) ? species.habitat_tags.join(' ') : species.habitat_tags,
    species.geographic_description,
    species.distribution_comment,
    species.conservation_text,
    species.conservation_code,
    species.category,
    species.threats,
  ];
  return values.filter(Boolean).join(' ').toLowerCase();
}

function buildAnchorGeographyClues(anchor: ExpeditionWaypoint | null, speciesId: unknown): DeductionClue[] {
  if (!anchor || typeof speciesId !== 'number') return [];
  const typeLabel = getWaypointTypeLabel(anchor.waypointType) ?? 'Site';
  const name = anchor.name || typeLabel;
  const clues: DeductionClue[] = [
    {
      id: -2,
      speciesId,
      category: 'geography',
      label: `Site: ${name} - ${anchorGeographyText(anchor)}`,
      compareTags: null,
      revealOrder: -2,
      unlockMode: 'fragment',
      baseCost: 0,
      isFiltering: false,
    },
  ];

  if (anchor.waypointType === 'protected_area') {
    clues.push({
      id: -1,
      speciesId,
      category: 'geography',
      label: `Inside protected area: ${name}`,
      compareTags: null,
      revealOrder: -1,
      unlockMode: 'fragment',
      baseCost: 0,
      isFiltering: false,
    });
  }

  return clues;
}

function anchorGeographyText(anchor: ExpeditionWaypoint): string {
  switch (anchor.waypointType) {
    case 'river': return 'riverine corridor';
    case 'lake': return 'lake margin';
    case 'wetland': return 'wetland habitat';
    case 'protected_area': return 'protected landscape';
    case 'city':
    case 'basecamp':
      return 'human-edge habitat';
    case 'bioregion_edge': return 'ecoregion transition';
    default: return 'local survey site';
  }
}

function emitBoardForNode(
  payload: EventPayloads['expedition-data-ready'],
  nodeIndex: number,
  activeAffinities: AffinityType[],
  objectiveProgress = 0,
) {
  const node = payload.expedition.nodes[nodeIndex];
  if (!node) return;
  const boardContext = buildNodeBoardContext({
    width: GRID_COLS,
    height: GRID_ROWS,
    obstacles: node.obstacles ?? [],
    nodeIndex,
  });
  const boardConfig = buildBoardSpawnConfigForNode(
    node.node_type ?? 'custom',
    node.counterGem ?? null,
    payload.expedition.actionBias,
    activeAffinities,
    buildHabitatLootWeights(payload.rasterHabitats),
  );
  const nodeLocation = getNodeRouteLocation(payload, nodeIndex);
  EventBus.emit('cesium-location-selected', {
    lon: nodeLocation.lon,
    lat: nodeLocation.lat,
    ecoregionId: payload.ecoregionId ?? null,
    species: payload.species,
    rasterHabitats: payload.rasterHabitats,
    habitats: payload.habitats,
    difficulty: node.difficulty,
    moveBudget: node.moveBudget,
    obstacles: node.obstacles,
    obstacleFamily: node.obstacleFamily,
    counterGem: node.counterGem,
    requiredGems: node.requiredGems,
    activeAffinities,
    objectiveTarget: node.objectiveTarget,
    objectiveProgress,
    nodeIndex,
    nodeType: node.node_type,
    events: node.events,
    boardContext,
    boardConfig,
    encounterConfig: node.encounterConfig,
  });
}

function buildDeductionCampState(prev: RunState): DeductionCampState {
  const campShop: ClueShopEntry[] = CLUE_CATEGORY_KEYS.map(cat => ({
    category: cat, purchased: 0, fragmentCount: prev.clueFragments[cat],
  }));
  return {
    bankedScore: prev.bankedScore,
    clueFragments: { ...prev.clueFragments },
    clueShop: campShop,
    revealedClues: [],
    triviaUnlocked: [],
    scoreSpent: 0,
    guessResult: null,
    guessBonusAwarded: 0,
    thoughtDiscountPct: prev.totalThoughtDiscount,
  };
}

function buildDeductionCampFromCheckpoint(
  bankedScore: number,
  clueFragments: RunState['clueFragments'],
): DeductionCampState {
  const clueShop: ClueShopEntry[] = CLUE_CATEGORY_KEYS.map(category => ({
    category,
    purchased: 0,
    fragmentCount: clueFragments[category],
  }));
  return {
    bankedScore,
    clueFragments: { ...clueFragments },
    clueShop,
    revealedClues: [],
    triviaUnlocked: [],
    scoreSpent: 0,
    guessResult: null,
    guessBonusAwarded: 0,
    thoughtDiscountPct: 0,
  };
}

function persistRunCheckpoint(
  runId: string,
  state: RunState,
  currentNodeIndex: number,
  routePolyline: RoutePoint[],
  status?: 'active' | 'deduction',
  objectiveProgress?: number,
) {
  setTimeout(() => {
    fetch(`/api/runs/${runId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clueFragments: { ...state.clueFragments },
        bankedScore: state.bankedScore,
        currentNodeIndex,
        objectiveProgress,
        routePolyline,
        status,
      }),
    }).catch(err => console.error('Failed to persist run checkpoint:', err));
  }, 0);
}

type ResumeRunResponse = {
  run?: { status?: string };
  nodes?: Array<{ id: string; nodeOrder: number; objectiveProgress: number }>;
  resume?: {
    lon: number;
    lat: number;
    correctSpeciesId: number | null;
    speciesIds: number[];
    habitats: string[];
    rasterHabitats: RasterHabitatResult[];
    currentNodeIndex: number;
    clueFragments: Record<string, number>;
    bankedScore: number;
    featureFingerprints: FeatureFingerprint[];
    expedition: Omit<EventPayloads['expedition-data-ready']['expedition'], 'activeAffinities' | 'availableAffinities'> & {
      activeAffinities: string[];
      availableAffinities: string[];
    };
  };
};

async function fetchResumeSpecies(speciesIds: number[], lon: number, lat: number): Promise<Species[]> {
  if (speciesIds.length === 0) return fetchResumeSpeciesNearPoint(lon, lat);
  const response = await fetch(`/api/species/by-ids?ids=${speciesIds.join(',')}`);
  if (!response.ok) return fetchResumeSpeciesNearPoint(lon, lat);
  const data = await response.json() as { species?: Species[] };
  const species = Array.isArray(data.species) ? data.species : [];
  return species.length > 0 ? species : fetchResumeSpeciesNearPoint(lon, lat);
}

async function fetchResumeSpeciesNearPoint(lon: number, lat: number): Promise<Species[]> {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return [];
  const response = await fetch(`/api/species/in-radius?lon=${lon}&lat=${lat}&radius=10000`);
  if (!response.ok) return [];
  const data = await response.json() as { species?: Species[] };
  return Array.isArray(data.species) ? data.species : [];
}

function normalizeAffinities(values: unknown): AffinityType[] {
  return Array.isArray(values)
    ? values.filter((value): value is AffinityType => typeof value === 'string' && value.length > 0)
    : [];
}

function clampNodeIndex(index: unknown, nodeCount: number, status: string | undefined): number {
  const max = status === 'deduction' ? nodeCount : Math.max(0, nodeCount - 1);
  const value = typeof index === 'number' && Number.isFinite(index) ? Math.trunc(index) : 0;
  return Math.max(0, Math.min(max, value));
}

function mergeClueFragments(value: unknown): RunState['clueFragments'] {
  const fragments = createEmptyClueFragments();
  if (!value || typeof value !== 'object') return fragments;
  for (const key of CLUE_CATEGORY_KEYS) {
    const next = (value as Record<string, unknown>)[key];
    if (typeof next === 'number' && Number.isFinite(next)) fragments[key] = next;
  }
  return fragments;
}
