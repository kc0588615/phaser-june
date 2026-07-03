import React, { createContext, useContext, useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { EventBus } from '@/game/EventBus';
import type { EventPayloads } from '@/game/EventBus';
import { useGameBridge } from './GameBridgeContext';
import { toast } from 'sonner';
import type { RunState, ClueCategoryKey, DeductionCampState, ClueShopEntry, ComparativeDeductionState } from '@/types/expedition';
import { createEmptyComparativeState, CLUE_CATEGORY_KEYS, getDeductionFinalScore, getGuessBonuses } from '@/types/expedition';
import { compareReference, filterCandidates, getNextClue, applyEvidenceBundle } from '@/lib/deductionEngine';
import type { DeductionProfile, DeductionClue, ProcessedClue } from '@/lib/deductionEngine';
import type { DeductionClueCategory } from '@/db/schema/species';
import type { AffinityType } from '@/expedition/affinities';
import { GRID_COLS, GRID_ROWS } from '@/game/constants';
import { buildNodeBoardContext } from '@/game/nodeObstacles';
import { buildBoardSpawnConfigForNode } from '@/expedition/domain';
import { ARMAMENT_CATALOG, createInitialMatchBattleState, createRewardDraft, hasMinimumSpawnablePieces, normalizeMatchBattleRunState } from '@/game/matchBattle/catalog';
import type { ArmamentDef, MatchBattleRouteNode, RewardOption, UpgradeDef } from '@/game/matchBattle/types';
import { logMatchBattleRunEvent, logMatchBattleRunSummary } from '@/game/matchBattle/debug';
import { buildRunEvidenceBundle } from '@/lib/featureFingerprint';
import { computeExpeditionRoutePolyline, getRoutePolylineThroughWaypointSlot, type RoutePoint } from '@/lib/expeditionRoute';
import type { Species } from '@/types/database';
import type { FeatureFingerprint } from '@/types/gis';
import type { RasterHabitatResult } from '@/lib/speciesService';
import type { SpeciesCombatInput } from '@/game/matchBattle/speciesMapper';
import type { CluePayload } from '@/game/clueConfig';
import type { MatchBattlePartner } from '@/game/matchBattle/partner';

// Combat traits cache: speciesId → combatant input. Populated once per
// expedition by prefetchCombatants; read synchronously by emitBoardForNode.
const combatantCache = new Map<number, SpeciesCombatInput>();
let combatantPrefetch: Promise<void> = Promise.resolve();

async function prefetchCombatants(species: { id: number; common_name?: string }[]) {
  combatantCache.clear();
  if (species.length === 0) return;
  try {
    const ids = species.map((s) => s.id).join(',');
    const res = await fetch(`/api/species/combat-traits?ids=${ids}`);
    if (!res.ok) return;
    const data = await res.json() as { traits: Array<{
      species_id: number; size_class: SpeciesCombatInput['sizeClass'];
      defense_type: SpeciesCombatInput['defenseType']; combat_tier: SpeciesCombatInput['combatTier'];
      combat_archetype: SpeciesCombatInput['combatArchetype'];
      hp_override: number | null; guard_override: number | null;
    }> };
    const nameById = new Map(species.map((s) => [s.id, s.common_name ?? 'Wild Critter']));
    for (const t of data.traits) {
      combatantCache.set(t.species_id, {
        speciesId: t.species_id,
        commonName: nameById.get(t.species_id) ?? 'Wild Critter',
        sizeClass: t.size_class,
        defenseType: t.defense_type,
        combatTier: t.combat_tier,
        combatArchetype: t.combat_archetype,
        hpOverride: t.hp_override,
        guardOverride: t.guard_override,
      });
    }
  } catch (err) {
    console.error('[ExpeditionContext] combat traits prefetch failed:', err);
    // cache stays empty → Game.ts falls back to generic enemies
  }
}

const INITIAL_RUN_STATE: RunState = {
  phase: 'idle',
  expedition: null,
  currentNodeIndex: 0,
  activeAffinities: [],
  lootMatchSummary: {},
  pendingNodeModifiers: [],
  bankedScore: 0,
  revealedDuringRun: [],
  triviaUnlocked: [],
  deductionCamp: null,
  comparativeDeduction: null,
  finalScore: null,
  evidenceBundle: null,
  selectedPartner: null,
  matchBattle: null,
};

interface ExpeditionContextValue {
  runState: RunState;
  boardOpacity: number;
  correctSpeciesId: number;
  hiddenSpeciesName: string;
  handleAffinitySelected: (affinityId: AffinityType | null) => void;
  handlePartnerSelected: (partner: MatchBattlePartner | null) => void;
  handleRunResume: (runId: string) => Promise<boolean>;
  handleRunReset: () => void;
  handleDeductionPurchase: (category: ClueCategoryKey, cost: number) => void;
  handleDeductionGuessResult: (isCorrect: boolean) => void;
  handleProcessClue: (clueId: number) => void;
  handlePlaceReference: (referenceSpeciesId: number, clueId: number) => void;
  handleComparativeGuessResult: (isCorrect: boolean) => void;
  selectMatchBattleReward: (option: RewardOption) => void;
  rerollMatchBattleRewards: () => void;
  purchaseMatchBattleUpgrade: (upgrade: UpgradeDef) => void;
  selectMatchBattleRouteNode: (routeNodeId: string) => void;
  /** Navigate to species list — replaces show-species-list EventBus event */
  showSpeciesList: (speciesId: number) => void;
  /** Register callback for show-species-list navigation */
  onShowSpeciesList: React.MutableRefObject<((speciesId: number) => void) | null>;
}

const ExpeditionContext = createContext<ExpeditionContextValue | null>(null);

export function useExpedition() {
  const ctx = useContext(ExpeditionContext);
  if (!ctx) throw new Error('useExpedition must be used within ExpeditionProvider');
  return ctx;
}

// Route node types that resolve between combats (no live board) and warrant a crash-safe flush.
const NON_COMBAT_ROUTE_TYPES = new Set(['repair', 'trivia', 'gis_recon', 'treasure', 'shop', 'event']);

export function ExpeditionProvider({ children }: { children: React.ReactNode }) {
  const { hudRef } = useGameBridge();

  const [runState, setRunState] = useState<RunState>(INITIAL_RUN_STATE);
  const [boardOpacity, setBoardOpacity] = useState(1);

  const expeditionPayloadRef = useRef<EventPayloads['expedition-data-ready'] | null>(null);
  const runIdRef = useRef<string | null>(null);
  const nodeIdsRef = useRef<string[]>([]);
  const nodeStartScoreRef = useRef<number>(0);
  const lastResolvedNodeRef = useRef<number>(-1);
  // Match-Battle route depths can clamp to the same `currentNodeIndex` when expedition.nodes.length < depthCount,
  // so dedupe by route-node id (not by clamped nodeIndex) to avoid silently dropping a second combat resolution.
  const lastResolvedRouteNodeIdRef = useRef<string | null>(null);
  const correctSpeciesIdRef = useRef<number>(0);
  const hiddenSpeciesNameRef = useRef<string>('');
  const activeAffinitiesRef = useRef<AffinityType[]>([]);
  const plannedRoutePolylineRef = useRef<RoutePoint[]>([]);
  const routePolylineRef = useRef<RoutePoint[]>([]);
  const runStateRef = useRef<RunState>(INITIAL_RUN_STATE);
  const objectiveProgressRef = useRef(0);
  const lastObjectiveCheckpointAtRef = useRef(0);
  const selectedPartnerRef = useRef<MatchBattlePartner | null>(null);
  const onShowSpeciesListRef = useRef<((speciesId: number) => void) | null>(null);

  useEffect(() => {
    runStateRef.current = runState;
  }, [runState]);

  const matchBattleCheckpointKeyRef = useRef('');
  const immediateCheckpointRef = useRef(false);

  // Build the sanitized Match Battle checkpoint payload + dedupe key, or null if not persistable.
  const buildMatchBattleCheckpoint = useCallback((state: RunState) => {
    const runId = runIdRef.current;
    if (!runId || !state.matchBattle) return null;
    const checkpointState = sanitizeRunStateForMatchBattleCheckpoint(state);
    const routePolyline = routePolylineRef.current;
    const checkpointKey = JSON.stringify({
      phase: checkpointState.phase,
      currentNodeIndex: checkpointState.currentNodeIndex,
      revealedDuringRun: checkpointState.revealedDuringRun,
      bankedScore: checkpointState.bankedScore,
      routePolyline,
      matchBattle: checkpointState.matchBattle,
    });
    const status: 'active' | 'deduction' | undefined =
      checkpointState.phase === 'deduction' ? 'deduction'
      : checkpointState.phase === 'complete' ? undefined
      : 'active';
    // When phase is 'complete', finalScore must reach the API so route.ts flips runStatus='completed'
    // and persists run_memories. Without it the run lingers as runStatus='active' in the DB.
    const finalScore = checkpointState.phase === 'complete' && typeof checkpointState.finalScore === 'number'
      ? checkpointState.finalScore
      : undefined;
    return { runId, checkpointState, routePolyline, checkpointKey, status, finalScore };
  }, []);

  // Centralized Match Battle checkpoint: debounced for normal changes, but flushed immediately
  // when a high-risk between-combat mutation (reward/reroll/upgrade/utility route) requested it.
  useEffect(() => {
    const immediate = immediateCheckpointRef.current;
    immediateCheckpointRef.current = false; // consume request even on early return
    const cp = buildMatchBattleCheckpoint(runState);
    if (!cp || cp.checkpointKey === matchBattleCheckpointKeyRef.current) return;

    const write = () => {
      // Set the dedupe key up front so in-flight state doesn't re-send, but roll it back on a
      // failed PATCH so the next state change or exit-flush retries instead of deduping forever.
      matchBattleCheckpointKeyRef.current = cp.checkpointKey;
      persistRunCheckpoint(cp.runId, cp.checkpointState, cp.checkpointState.currentNodeIndex, cp.routePolyline, cp.status, undefined, false, cp.finalScore)
        .then(ok => {
          if (!ok && matchBattleCheckpointKeyRef.current === cp.checkpointKey) matchBattleCheckpointKeyRef.current = '';
        });
    };

    if (immediate) { write(); return; }
    const timer = setTimeout(write, 300);
    return () => clearTimeout(timer);
  }, [runState, buildMatchBattleCheckpoint]);

  // Best-effort flush on tab hide / page unload so the latest between-combat state survives exit.
  const flushMatchBattleCheckpointNow = useCallback(() => {
    const cp = buildMatchBattleCheckpoint(runStateRef.current);
    if (!cp || cp.checkpointKey === matchBattleCheckpointKeyRef.current) return;
    matchBattleCheckpointKeyRef.current = cp.checkpointKey;
    persistRunCheckpoint(cp.runId, cp.checkpointState, cp.checkpointState.currentNodeIndex, cp.routePolyline, cp.status, undefined, true, cp.finalScore);
  }, [buildMatchBattleCheckpoint]);

  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'hidden') flushMatchBattleCheckpointNow(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flushMatchBattleCheckpointNow);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flushMatchBattleCheckpointNow);
    };
  }, [flushMatchBattleCheckpointNow]);

  const resetRunStateLocal = useCallback(() => {
    expeditionPayloadRef.current = null;
    runIdRef.current = null;
    nodeIdsRef.current = [];
    nodeStartScoreRef.current = 0;
    lastResolvedNodeRef.current = -1;
    lastResolvedRouteNodeIdRef.current = null;
    correctSpeciesIdRef.current = 0;
    hiddenSpeciesNameRef.current = '';
    activeAffinitiesRef.current = [];
    plannedRoutePolylineRef.current = [];
    routePolylineRef.current = [];
    lastObjectiveCheckpointAtRef.current = 0;
    selectedPartnerRef.current = null;
    setBoardOpacity(1);
    setRunState(INITIAL_RUN_STATE);
  }, []);

  const handleExpeditionDataReady = useCallback((data: EventPayloads['expedition-data-ready']) => {
    expeditionPayloadRef.current = data;
    combatantPrefetch = prefetchCombatants(data.species);
    activeAffinitiesRef.current = data.expedition.activeAffinities;
    selectedPartnerRef.current = null;
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
      selectedPartner: null,
      evidenceBundle,
    });
  }, []);

  const handleExpeditionStart = useCallback(() => {
    const initialMatchBattle = createInitialMatchBattleState(
      activeAffinitiesRef.current[0] ?? null,
      expeditionPayloadRef.current?.expedition.nodes.length ?? 6,
      selectedPartnerRef.current,
    );
    setRunState(prev => ({
      ...prev,
      phase: 'in-run',
      activeAffinities: [...activeAffinitiesRef.current],
      selectedPartner: selectedPartnerRef.current,
      matchBattle: initialMatchBattle,
    }));
    nodeStartScoreRef.current = 0;
    lastResolvedNodeRef.current = -1;
    lastResolvedRouteNodeIdRef.current = null;
    objectiveProgressRef.current = 0;
    setBoardOpacity(1);
    const payload = expeditionPayloadRef.current;
    if (!payload) return;
    plannedRoutePolylineRef.current = getExpeditionRoutePolyline(payload);
    routePolylineRef.current = getRoutePolylineThroughNode(plannedRoutePolylineRef.current, 0);

    const sorted = [...payload.species].sort((a, b) => a.id - b.id);
    const correct = sorted[0];
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
          waypointRadiusKm: payload.expedition.waypointRadiusKm ?? null,
          nearestRiverDistM: payload.expedition.nearestRiverDistM ?? null,
        },
        matchBattle: initialMatchBattle,
      }),
    })
      .then(r => {
        if (!r.ok) {
          console.warn(`[ExpeditionContext] Run creation failed (${r.status}). Score persistence disabled for this run.`);
          toast.warning('Field journal is offline — this expedition won\'t be saved to your records.');
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (data) {
          runIdRef.current = data.runId;
          nodeIdsRef.current = data.nodeIds;
        }
      })
      .catch(err => {
        console.error('Failed to create run session:', err);
        toast.warning('Field journal is offline — this expedition won\'t be saved to your records.');
      });

    void combatantPrefetch.then(() => {
      emitBoardForNode(payload, 0, activeAffinitiesRef.current, 0, initialMatchBattle);
    });
  }, [objectiveProgressRef]);

  const handleAffinitySelected = useCallback((affinityId: AffinityType | null) => {
    const nextAffinities = affinityId ? [affinityId] : [];
    activeAffinitiesRef.current = nextAffinities;
    setRunState(prev => {
      if (!prev.expedition) return prev;
      return { ...prev, activeAffinities: nextAffinities, expedition: { ...prev.expedition, activeAffinities: nextAffinities } };
    });
  }, []);

  const handlePartnerSelected = useCallback((partner: MatchBattlePartner | null) => {
    selectedPartnerRef.current = partner;
    setRunState(prev => ({ ...prev, selectedPartner: partner }));
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
      const revealedDuringRun = mergeRevealedClues(resume.revealedDuringRun);
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
      lastResolvedRouteNodeIdRef.current = null;
      const resumedObjectiveProgress = data.nodes?.find(node => node.nodeOrder === currentNodeIndex + 1)?.objectiveProgress ?? 0;
      objectiveProgressRef.current = resumedObjectiveProgress;
      setBoardOpacity(1);

      if (data.run?.status === 'deduction') {
        selectedPartnerRef.current = null;
        const deductionState: RunState = {
          ...INITIAL_RUN_STATE,
          phase: 'deduction',
          expedition,
          currentNodeIndex,
          activeAffinities: expedition.activeAffinities,
          bankedScore,
          revealedDuringRun,
          selectedPartner: null,
          deductionCamp: buildDeductionCampFromCheckpoint(bankedScore, revealedDuringRun),
          evidenceBundle,
        };
        setRunState(deductionState);
        toast('Resumed deduction camp', { duration: 1800 });
        return true;
      }

      const resumedMatchBattle = normalizeMatchBattleRunState(
        resume.matchBattle as Partial<NonNullable<RunState['matchBattle']>> | null,
        expedition.activeAffinities[0] ?? null,
        expedition.nodes.length,
      );
      selectedPartnerRef.current = resumedMatchBattle.partner;
      setRunState({
        ...INITIAL_RUN_STATE,
        phase: 'in-run',
        expedition,
        currentNodeIndex,
        activeAffinities: expedition.activeAffinities,
        bankedScore,
        revealedDuringRun,
        selectedPartner: resumedMatchBattle.partner,
        evidenceBundle,
        matchBattle: resumedMatchBattle,
      });

      combatantPrefetch = prefetchCombatants(payload.species);
      setTimeout(() => {
        void combatantPrefetch.then(() => {
          emitBoardForNode(payload, currentNodeIndex, expedition.activeAffinities, resumedObjectiveProgress, resumedMatchBattle);
        });
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
      if (prev.phase !== 'in-run') return prev;
      if (data.nodeIndex !== prev.currentNodeIndex) return prev;

      if (prev.matchBattle?.enabled) {
        const matchBattle = prev.matchBattle;
        if (lastResolvedRouteNodeIdRef.current === matchBattle.currentRouteNodeId) return prev;
        const activeRoute = matchBattle.routeNodes.find((node) => node.id === matchBattle.currentRouteNodeId) ?? null;
        lastResolvedRouteNodeIdRef.current = matchBattle.currentRouteNodeId;
        lastResolvedNodeRef.current = prev.currentNodeIndex;
        EventBus.emit('node-complete', { nodeIndex: prev.currentNodeIndex });

        if (data.reason === 'escaped') {
          setTimeout(() => toast('Out of stamina — head to camp with what you gathered.', { duration: 2200 }), 0);
          EventBus.emit('match-battle-run-ended', { outcome: 'lost' });
          const lostMatchBattle = { ...matchBattle, outcome: 'lost' as const, combat: { ...matchBattle.combat, playerHp: 0 } };
          const deductionState: RunState = {
            ...prev,
            phase: 'deduction' as const,
            matchBattle: lostMatchBattle,
            deductionCamp: buildDeductionCampState({ ...prev, matchBattle: lostMatchBattle }),
          };
          logMatchBattleRunSummary('lost', lostMatchBattle.lootChance, deductionState.revealedDuringRun.length);
          if (runIdRef.current) persistRunCheckpoint(runIdRef.current, deductionState, deductionState.currentNodeIndex, routePolylineRef.current, 'deduction');
          return deductionState;
        }

        if (data.reason === 'retreat') {
          setTimeout(() => toast('Breaking camp — time to make the call.', { duration: 2200 }), 0);
          EventBus.emit('match-battle-run-ended', { outcome: 'called' });
          const calledMatchBattle = { ...matchBattle, outcome: 'called' as const };
          const deductionState: RunState = {
            ...prev,
            phase: 'deduction' as const,
            matchBattle: calledMatchBattle,
            deductionCamp: buildDeductionCampState({ ...prev, matchBattle: calledMatchBattle }),
          };
          if (runIdRef.current) persistRunCheckpoint(runIdRef.current, deductionState, deductionState.currentNodeIndex, routePolylineRef.current, 'deduction');
          return deductionState;
        }

        const routeNodes = matchBattle.routeNodes.map((node) => {
          if (node.id === matchBattle.currentRouteNodeId) return { ...node, completed: true, available: false };
          if (activeRoute?.next.includes(node.id)) return { ...node, available: true };
          return node;
        });
        const nodeType = activeRoute?.type ?? 'enemy';
        const nodeScore = nodeType === 'leader' ? 150 : nodeType === 'elite' ? 110 : 75;
        const nextMatchBattle = resetMatchBattleCombatForNodeEntry({ ...matchBattle, routeNodes });

        if (nodeType === 'leader') {
          setTimeout(() => toast.success('Apex documented!', { duration: 2200 }), 0);
          EventBus.emit('match-battle-run-ended', { outcome: 'won' });
          const wonMatchBattle = { ...nextMatchBattle, outcome: 'won' as const };
          const nextBankedScore = prev.bankedScore + nodeScore;
          const deductionState: RunState = {
            ...prev,
            phase: 'deduction' as const,
            matchBattle: wonMatchBattle,
            bankedScore: nextBankedScore,
            deductionCamp: buildDeductionCampState({ ...prev, matchBattle: wonMatchBattle, bankedScore: nextBankedScore }),
          };
          logMatchBattleRunSummary('won', wonMatchBattle.lootChance, deductionState.revealedDuringRun.length);
          if (runIdRef.current) persistRunCheckpoint(runIdRef.current, deductionState, deductionState.currentNodeIndex, routePolylineRef.current, 'deduction');
          return deductionState;
        }

        const rewardDraft = createRewardDraft(nextMatchBattle);
        setTimeout(() => EventBus.emit('match-battle-reward-draft-opened', { options: rewardDraft }), 0);
        return {
          ...prev,
          phase: 'reward' as const,
          bankedScore: prev.bankedScore + nodeScore,
          matchBattle: { ...nextMatchBattle, rewardDraft },
        };
      }

      // Non-matchBattle path: dedupe by monotonic node index.
      if (data.nodeIndex <= lastResolvedNodeRef.current) return prev;

      if (data.reason === 'escaped') {
        lastResolvedNodeRef.current = prev.currentNodeIndex;
        routePolylineRef.current = getRoutePolylineThroughNode(plannedRoutePolylineRef.current, prev.currentNodeIndex);
        const campState = buildDeductionCampState(prev);
        if (runIdRef.current) persistRunCheckpoint(runIdRef.current, prev, prev.currentNodeIndex, routePolylineRef.current, 'deduction');
        setTimeout(() => toast('Animal escaped! Reviewing gathered evidence...', { duration: 3000 }), 0);
        return { ...prev, phase: 'deduction' as const, deductionCamp: campState };
      }

      const nodeOrder = prev.currentNodeIndex + 1;
      const nextIndex = prev.currentNodeIndex + 1;
      lastResolvedNodeRef.current = prev.currentNodeIndex;
      routePolylineRef.current = getRoutePolylineThroughNode(plannedRoutePolylineRef.current, prev.currentNodeIndex);

      const nodeScore = (hudRef.current?.score ?? 0) - nodeStartScoreRef.current;
      const nodeMoves = hudRef.current?.movesUsed ?? 0;
      const objProgress = objectiveProgressRef.current;
      if (runIdRef.current) {
        persistRunCheckpoint(runIdRef.current, prev, nextIndex, routePolylineRef.current);
        fetch(`/api/runs/${runIdRef.current}/nodes/${nodeOrder}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scoreEarned: Math.max(0, nodeScore), movesUsed: nodeMoves,
            objectiveProgress: objProgress,
          }),
        }).catch(err => console.error('Failed to complete node:', err));
      }

      EventBus.emit('node-complete', { nodeIndex: prev.currentNodeIndex });
      nodeStartScoreRef.current = hudRef.current?.score ?? 0;

      if (nextIndex >= (prev.expedition?.nodes.length ?? 6)) {
        const campState = buildDeductionCampState(prev);
        setTimeout(() => toast.success('All nodes complete — time to identify!', { duration: 3000 }), 0);
        return { ...prev, phase: 'deduction' as const, currentNodeIndex: nextIndex, deductionCamp: campState };
      }

      setTimeout(() => toast(`Node ${nodeOrder} complete — next up!`, { duration: 1500 }), 0);
      const payload = expeditionPayloadRef.current;
      if (payload) {
        const nextNode = prev.expedition?.nodes[nextIndex];
        objectiveProgressRef.current = 0;
        setTimeout(() => {
          const nextBoardContext = buildNodeBoardContext({
            width: GRID_COLS, height: GRID_ROWS,
            obstacles: nextNode?.obstacles ?? [], nodeIndex: nextIndex,
          });
          const nextBoardConfig = buildBoardSpawnConfigForNode(
            nextNode?.node_type ?? 'custom', nextNode?.counterGem ?? null,
            prev.expedition?.actionBias ?? {}, activeAffinitiesRef.current
          );
          const nodeLocation = getNodeRouteLocation(payload, nextIndex);
          EventBus.emit('cesium-location-selected', {
            lon: nodeLocation.lon, lat: nodeLocation.lat,
            ecoregionId: payload.ecoregionId ?? null,
            species: payload.species, rasterHabitats: payload.rasterHabitats,
            habitats: payload.habitats, difficulty: nextNode?.difficulty,
            obstacles: nextNode?.obstacles, obstacleFamily: nextNode?.obstacleFamily,
            counterGem: nextNode?.counterGem, requiredGems: nextNode?.requiredGems,
            activeAffinities: activeAffinitiesRef.current,
            objectiveTarget: nextNode?.objectiveTarget, nodeIndex: nextIndex,
            nodeType: nextNode?.node_type,
            boardContext: nextBoardContext, boardConfig: nextBoardConfig,
          });
        }, 100);
      }
      return { ...prev, currentNodeIndex: nextIndex };
    });
  }, [hudRef]);

  const handleNodeObjectiveCheckpoint = useCallback((data: EventPayloads['node-objective-updated']) => {
    const state = runStateRef.current;
    if (state.phase !== 'in-run' || !runIdRef.current) return;
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

  const handleMatchBattleCombatEnded = useCallback((data: EventPayloads['match-battle-combat-ended']) => {
    setRunState(prev => {
      if (!prev.matchBattle) return prev;
      if (data.outcome === 'lost') {
        lastResolvedNodeRef.current = Math.max(lastResolvedNodeRef.current, data.nodeIndex);
        setTimeout(() => toast('Out of stamina — head to camp with what you gathered.', { duration: 2200 }), 0);
        EventBus.emit('match-battle-run-ended', { outcome: 'lost' });
        const lostMatchBattle = {
          ...prev.matchBattle,
          outcome: 'lost' as const,
          combat: { ...data.combat, playerHp: 0 },
        };
        const nextBankedScore = prev.bankedScore + data.scoreDelta;
        const deductionState: RunState = {
          ...prev,
          phase: 'deduction' as const,
          matchBattle: lostMatchBattle,
          bankedScore: nextBankedScore,
          deductionCamp: buildDeductionCampState({ ...prev, matchBattle: lostMatchBattle, bankedScore: nextBankedScore }),
        };
        logMatchBattleRunSummary('lost', lostMatchBattle.lootChance, deductionState.revealedDuringRun.length);
        if (runIdRef.current) persistRunCheckpoint(runIdRef.current, deductionState, deductionState.currentNodeIndex, routePolylineRef.current, 'deduction');
        return deductionState;
      }
      return {
        ...prev,
        bankedScore: prev.bankedScore + data.scoreDelta,
        matchBattle: {
          ...prev.matchBattle,
          combat: data.combat,
        },
      };
    });
  }, []);

  const handleClueRevealed = useCallback((clue: EventPayloads['clue-revealed']) => {
    setRunState(prev => {
      const seenInRun = prev.revealedDuringRun.some(
        existing => existing.category === clue.category && existing.clue === clue.clue
      );
      const revealedDuringRun = seenInRun ? prev.revealedDuringRun : [clue, ...prev.revealedDuringRun];
      if (prev.phase !== 'deduction' || !prev.deductionCamp) return { ...prev, revealedDuringRun };
      const exists = prev.deductionCamp.revealedClues.some(
        existing => existing.category === clue.category && existing.clue === clue.clue
      );
      if (exists) return { ...prev, revealedDuringRun };
      return { ...prev, revealedDuringRun, deductionCamp: { ...prev.deductionCamp, revealedClues: [clue, ...prev.deductionCamp.revealedClues] } };
    });
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
            finalScore,
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

  const selectMatchBattleReward = useCallback((option: RewardOption) => {
    immediateCheckpointRef.current = true; // crash-safe between-combat write
    logMatchBattleRunEvent('reward', option.label);
    setRunState(prev => {
      if (!prev.matchBattle) return prev;
      let matchBattle: NonNullable<RunState['matchBattle']> = { ...prev.matchBattle, rewardDraft: [] };
      if (option.kind === 'piece') {
        const piecePool = matchBattle.piecePool.map(entry => ({ ...entry }));
        const existing = piecePool.find(entry => entry.pieceId === option.pieceId);
        if (existing) existing.weight += 1;
        else piecePool.push({ pieceId: option.pieceId, level: 1, weight: 2 });
        matchBattle.piecePool = piecePool;
      } else if (option.kind === 'armament') {
        const arm = ARMAMENT_CATALOG.find(candidate => candidate.id === option.armamentId);
        if (arm) matchBattle = addMatchBattleArmament(matchBattle, arm);
      }
      return { ...prev, phase: 'route' as const, matchBattle };
    });
  }, []);

  const rerollMatchBattleRewards = useCallback(() => {
    immediateCheckpointRef.current = true; // crash-safe between-combat write
    setRunState(prev => {
      if (!prev.matchBattle || prev.bankedScore < prev.matchBattle.rerollCost) return prev;
      logMatchBattleRunEvent('reroll', `-${prev.matchBattle.rerollCost} Score`);
      const matchBattle = { ...prev.matchBattle };
      return { ...prev, bankedScore: prev.bankedScore - prev.matchBattle.rerollCost, matchBattle: { ...matchBattle, rewardDraft: createRewardDraft(matchBattle) } };
    });
  }, []);

  const purchaseMatchBattleUpgrade = useCallback((upgrade: UpgradeDef) => {
    immediateCheckpointRef.current = true; // crash-safe between-combat write
    setRunState(prev => {
      if (!prev.matchBattle || prev.bankedScore < upgrade.cost) return prev;
      // Repeatable upgrades may stack; single-use ones must not duplicate.
      const repeatable = upgrade.type === 'board_col'
        || upgrade.type === 'board_row'
        || upgrade.type === 'armament_slot'
        || upgrade.type === 'piece_weight_down';
      if (!repeatable && prev.matchBattle.upgrades.includes(upgrade.id)) return prev;
      let thinnedPool: typeof prev.matchBattle.piecePool | null = null;
      if (upgrade.type === 'piece_weight_down') {
        const pool = prev.matchBattle.piecePool;
        if (pool.length === 0) return prev;
        let targetIdx = 0;
        for (let i = 1; i < pool.length; i++) {
          if (pool[i].weight > pool[targetIdx].weight) targetIdx = i;
        }
        const next: typeof pool = [];
        for (let idx = 0; idx < pool.length; idx++) {
          const entry = idx === targetIdx ? { ...pool[idx], weight: pool[idx].weight - 1 } : pool[idx];
          if (entry.weight > 0) next.push(entry);
        }
        if (!hasMinimumSpawnablePieces(next)) {
          setTimeout(() => toast.error('Keep at least 3 piece types', { duration: 1600 }), 0);
          return prev;
        }
        thinnedPool = next;
      }

      const matchBattle = {
        ...prev.matchBattle,
        upgrades: [...prev.matchBattle.upgrades, upgrade.id],
      };

      switch (upgrade.type) {
        case 'board_col':
          matchBattle.boardCols = Math.min(7, matchBattle.boardCols + 1);
          break;
        case 'board_row':
          matchBattle.boardRows = Math.min(6, matchBattle.boardRows + 1);
          break;
        case 'snippet':
          matchBattle.snippetsEnabled = true;
          break;
        case 'armament_slot':
          matchBattle.maxGearSlots += 1;
          break;
        case 'piece_weight_down': {
          if (thinnedPool) matchBattle.piecePool = thinnedPool;
          break;
        }
      }

      logMatchBattleRunEvent('upgrade', `${upgrade.name} (-${upgrade.cost} Score)`);
      return { ...prev, bankedScore: prev.bankedScore - upgrade.cost, matchBattle };
    });
  }, []);

  const selectMatchBattleRouteNode = useCallback((routeNodeId: string) => {
    // Utility/shop/event selections mutate between-combat state; flush them immediately.
    // Combat-entry nodes are left to the debounced path (live combat resets on reload by policy).
    const selectedType = runStateRef.current.matchBattle?.routeNodes.find(n => n.id === routeNodeId && n.available)?.type;
    if (selectedType && NON_COMBAT_ROUTE_TYPES.has(selectedType)) immediateCheckpointRef.current = true;
    setRunState(prev => {
      const payload = expeditionPayloadRef.current;
      if (!payload || !prev.matchBattle || !prev.expedition) return prev;
      const selected = prev.matchBattle.routeNodes.find(node => node.id === routeNodeId && node.available);
      if (!selected) return prev;

      const routeNodes = prev.matchBattle.routeNodes.map(node =>
        node.id === routeNodeId ? { ...node, available: false } : node
      );
      let matchBattle: NonNullable<RunState['matchBattle']> = {
        ...prev.matchBattle,
        currentRouteNodeId: routeNodeId,
        routeNodes,
      };

      if (selected.type === 'repair') {
        const healAmount = Math.round(matchBattle.combat.playerMaxHp * 0.3);
        matchBattle = {
          ...matchBattle,
          combat: {
            ...matchBattle.combat,
            playerHp: Math.min(matchBattle.combat.playerMaxHp, matchBattle.combat.playerHp + healAmount),
            log: [`Repair Bay restored ${healAmount} Stamina.`],
          },
          routeNodes: completeUtilityRouteNode(routeNodes, selected),
        };
        return { ...prev, phase: 'route' as const, matchBattle };
      }

      if (selected.type === 'trivia' || selected.type === 'gis_recon') {
        matchBattle = {
          ...matchBattle,
          routeNodes: completeUtilityRouteNode(routeNodes, selected),
        };
        const scoreReward = selected.type === 'gis_recon' ? 40 : 25;
        return { ...prev, phase: 'route' as const, bankedScore: prev.bankedScore + scoreReward, matchBattle };
      }

      if (selected.type === 'treasure') {
        const arm = ARMAMENT_CATALOG.find(candidate => !matchBattle.armaments.some(existing => existing.id === candidate.id));
        matchBattle = addMatchBattleArmament({
          ...matchBattle,
          routeNodes: completeUtilityRouteNode(routeNodes, selected),
        }, arm);
        return { ...prev, phase: 'route' as const, matchBattle };
      }

      if (selected.type === 'shop' || selected.type === 'event') {
        const rewardDraft = createRewardDraft(matchBattle);
        matchBattle = {
          ...matchBattle,
          rewardDraft,
          routeNodes: completeUtilityRouteNode(routeNodes, selected),
        };
        return {
          ...prev,
          phase: 'reward' as const,
          bankedScore: selected.type === 'event' ? prev.bankedScore + 25 : prev.bankedScore,
          matchBattle,
        };
      }

      setTimeout(() => emitBoardForNode(payload, selected.sourceNodeIndex, activeAffinitiesRef.current, 0, matchBattle), 0);
      return {
        ...prev,
        phase: 'in-run' as const,
        currentNodeIndex: selected.sourceNodeIndex,
        matchBattle,
      };
    });
  }, []);

  // --- Comparative deduction: fetch profiles when entering deduction phase ---
  useEffect(() => {
    if (runState.phase !== 'deduction' || runState.comparativeDeduction) return;
    const speciesId = correctSpeciesIdRef.current;
    if (!speciesId) return;

    const allSpeciesIds = Array.from({ length: 24 }, (_, i) => i + 1).filter(id => id !== speciesId && id !== 4 && id !== 11);
    const albumParam = allSpeciesIds.join(',');

    fetch(`/api/species/deduction?mysteryId=${speciesId}&albumIds=${albumParam}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const compState = createEmptyComparativeState(data.mysteryProfile, data.mysteryClues, data.albumProfiles);
        setRunState(prev => {
          if (prev.phase !== 'deduction') return prev;
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
      if (prev.phase !== 'deduction' || !prev.comparativeDeduction || !prev.deductionCamp) return prev;
      const comp = prev.comparativeDeduction;
      const camp = prev.deductionCamp;
      const clue = comp.mysteryClues.find(c => c.id === clueId);
      if (!clue || comp.processedClues.some(pc => pc.clueId === clueId)) return prev;

      const cost = Math.max(10, clue.baseCost);
      if ((camp.bankedScore - camp.scoreSpent - comp.scoreSpent) < cost) return prev;

      const processed: ProcessedClue = { clueId: clue.id, category: clue.category, label: clue.label, status: 'processed', compareTags: clue.compareTags, fragmentCost: cost };

      return {
        ...prev,
        comparativeDeduction: { ...comp, processedClues: [...comp.processedClues, processed], scoreSpent: comp.scoreSpent + cost },
      };
    });
  }, []);

  const handlePlaceReference = useCallback((referenceSpeciesId: number, clueId: number) => {
    setRunState(prev => {
      if (prev.phase !== 'deduction' || !prev.comparativeDeduction) return prev;
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
          fetch(`/api/runs/${rid}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ finalScore, deductionSummary: { scoreSpent: camp.scoreSpent + comp.scoreSpent, processedClues: totalClues, confirmedCategories: Object.keys(comp.confirmedTags).length, candidateCount: comp.candidateCount, referenceAttempts: comp.referenceHistory.length, finalScore }, speciesId: correctSpeciesIdRef.current || undefined, featureFingerprints: expeditionPayloadRef.current?.featureFingerprints ?? [], routePolyline: routePolylineRef.current }) })
            .then((response) => {
              if (response.ok) {
                window.dispatchEvent(new CustomEvent('species-card-progress-updated', { detail: { speciesId: correctSpeciesIdRef.current } }));
              }
            })
            .catch(err => console.error('Failed to persist deduction:', err));
        }
        return { ...prev, phase: 'complete' as const, comparativeDeduction: { ...comp, guessResult: 'correct', guessBonusAwarded: guessBonus + efficiencyBonus }, finalScore };
      }
      return { ...prev, comparativeDeduction: { ...comp, guessResult: 'wrong' }, deductionCamp: { ...camp, scoreSpent: camp.scoreSpent + 25 } };
    });
  }, []);

  // --- EventBus registration (expedition lifecycle only) ---
  useEffect(() => {
    EventBus.on('expedition-data-ready', handleExpeditionDataReady);
    EventBus.on('expedition-start', handleExpeditionStart);
    EventBus.on('node-advance-requested', handleNodeAdvanceRequested);
    EventBus.on('clue-revealed', handleClueRevealed);
    EventBus.on('match-battle-combat-ended', handleMatchBattleCombatEnded);
    EventBus.on('node-objective-updated', handleNodeObjectiveCheckpoint);
    EventBus.on('game-reset', resetRunStateLocal);

    return () => {
      EventBus.off('expedition-data-ready', handleExpeditionDataReady);
      EventBus.off('expedition-start', handleExpeditionStart);
      EventBus.off('node-advance-requested', handleNodeAdvanceRequested);
      EventBus.off('clue-revealed', handleClueRevealed);
      EventBus.off('match-battle-combat-ended', handleMatchBattleCombatEnded);
      EventBus.off('node-objective-updated', handleNodeObjectiveCheckpoint);
      EventBus.off('game-reset', resetRunStateLocal);
    };
  }, [handleExpeditionDataReady, handleExpeditionStart, handleNodeAdvanceRequested, handleClueRevealed, handleMatchBattleCombatEnded, handleNodeObjectiveCheckpoint, resetRunStateLocal]);

  const value = useMemo<ExpeditionContextValue>(() => ({
    runState, boardOpacity,
    correctSpeciesId: correctSpeciesIdRef.current,
    hiddenSpeciesName: hiddenSpeciesNameRef.current,
    handleAffinitySelected, handlePartnerSelected, handleRunResume, handleRunReset,
    handleDeductionPurchase, handleDeductionGuessResult,
    handleProcessClue, handlePlaceReference, handleComparativeGuessResult,
    selectMatchBattleReward, rerollMatchBattleRewards, purchaseMatchBattleUpgrade, selectMatchBattleRouteNode,
    showSpeciesList,
    onShowSpeciesList: onShowSpeciesListRef,
  }), [runState, boardOpacity, handleAffinitySelected, handlePartnerSelected, handleRunResume, handleRunReset, handleDeductionPurchase, handleDeductionGuessResult, handleProcessClue, handlePlaceReference, handleComparativeGuessResult, selectMatchBattleReward, rerollMatchBattleRewards, purchaseMatchBattleUpgrade, selectMatchBattleRouteNode, showSpeciesList]);

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

function completeUtilityRouteNode(routeNodes: MatchBattleRouteNode[], selected: MatchBattleRouteNode): MatchBattleRouteNode[] {
  return routeNodes.map(node => {
    if (node.id === selected.id) return { ...node, completed: true, available: false };
    if (selected.next.includes(node.id)) return { ...node, available: true };
    return node;
  });
}

function addMatchBattleArmament(
  matchBattle: NonNullable<RunState['matchBattle']>,
  arm: ArmamentDef | null | undefined,
): NonNullable<RunState['matchBattle']> {
  if (!arm || matchBattle.armaments.length >= matchBattle.maxGearSlots || matchBattle.armaments.some(existing => existing.id === arm.id)) {
    return matchBattle;
  }
  const next = { ...matchBattle, armaments: [...matchBattle.armaments, arm] };
  return next;
}

function resetMatchBattleCombatForNodeEntry(matchBattle: NonNullable<RunState['matchBattle']>): NonNullable<RunState['matchBattle']> {
  return {
    ...matchBattle,
    combat: {
      ...matchBattle.combat,
      turn: 1,
      enemy: null,
      log: [],
    },
  };
}

function sanitizeRunStateForMatchBattleCheckpoint(state: RunState): RunState {
  if (!state.matchBattle) return state;
  return { ...state, matchBattle: resetMatchBattleCombatForNodeEntry(state.matchBattle) };
}

function emitBoardForNode(
  payload: EventPayloads['expedition-data-ready'],
  nodeIndex: number,
  activeAffinities: AffinityType[],
  objectiveProgress = 0,
  matchBattle?: RunState['matchBattle'],
) {
  const node = payload.expedition.nodes[nodeIndex];
  if (!node) return;
  const nodeMatchBattle = matchBattle ? resetMatchBattleCombatForNodeEntry(matchBattle) : null;
  const routeNode = nodeMatchBattle?.routeNodes.find((candidate) => candidate.id === nodeMatchBattle.currentRouteNodeId) ?? null;
  const matchBattleNodeType = routeNode?.type;
  const boardContext = buildNodeBoardContext({
    width: nodeMatchBattle?.boardCols ?? GRID_COLS,
    height: nodeMatchBattle?.boardRows ?? GRID_ROWS,
    obstacles: node.obstacles ?? [],
    nodeIndex,
  });
  const boardConfig = buildBoardSpawnConfigForNode(
    node.node_type ?? 'custom',
    node.counterGem ?? null,
    payload.expedition.actionBias,
    activeAffinities,
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
    obstacles: node.obstacles,
    obstacleFamily: node.obstacleFamily,
    counterGem: node.counterGem,
    requiredGems: node.requiredGems,
    activeAffinities,
    objectiveTarget: node.objectiveTarget,
    objectiveProgress,
    nodeIndex,
    nodeType: node.node_type,
    boardContext,
    boardConfig,
    matchBattleConfig: nodeMatchBattle ? {
      piecePool: nodeMatchBattle.piecePool,
      lootChance: nodeMatchBattle.lootChance,
      snippetsEnabled: nodeMatchBattle.snippetsEnabled,
      boardCols: nodeMatchBattle.boardCols,
      boardRows: nodeMatchBattle.boardRows,
      partnerPassive: nodeMatchBattle.partner?.passive ?? null,
    } : undefined,
    matchBattleNodeType,
    matchBattleCombat: nodeMatchBattle?.combat,
    matchBattleArmaments: nodeMatchBattle?.armaments,
    matchBattleCombatants: payload.species
      .map((s) => combatantCache.get(s.id))
      .filter((c): c is SpeciesCombatInput => Boolean(c)),
  });
  // Game scene applies combat_start/turn_start gear and emits match-battle-combat-state-updated.
  // Do not pre-stamp here — that path double-applies and is immediately overwritten.
}

function buildDeductionCampState(prev: RunState): DeductionCampState {
  const campShop: ClueShopEntry[] = CLUE_CATEGORY_KEYS.map(cat => ({
    category: cat, purchased: 0,
  }));
  return {
    bankedScore: prev.bankedScore,
    clueShop: campShop,
    revealedClues: dedupeClues(prev.revealedDuringRun),
    triviaUnlocked: [...prev.triviaUnlocked],
    scoreSpent: 0,
    guessResult: null,
    guessBonusAwarded: 0,
  };
}

function buildDeductionCampFromCheckpoint(
  bankedScore: number,
  revealedDuringRun: CluePayload[],
): DeductionCampState {
  const clueShop: ClueShopEntry[] = CLUE_CATEGORY_KEYS.map(category => ({
    category,
    purchased: 0,
  }));
  return {
    bankedScore,
    clueShop,
    revealedClues: dedupeClues(revealedDuringRun),
    triviaUnlocked: [],
    scoreSpent: 0,
    guessResult: null,
    guessBonusAwarded: 0,
  };
}

function dedupeClues(clues: CluePayload[]): CluePayload[] {
  const seen = new Set<string>();
  const next: CluePayload[] = [];
  for (const clue of clues) {
    const key = `${clue.category}:${clue.clue}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(clue);
  }
  return next;
}

function persistRunCheckpoint(
  runId: string,
  state: RunState,
  currentNodeIndex: number,
  routePolyline: RoutePoint[],
  status?: 'active' | 'deduction',
  objectiveProgress?: number,
  immediate = false,
  finalScore?: number,
): Promise<boolean> {
  const send = (): Promise<boolean> =>
    fetch(`/api/runs/${runId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      // keepalive lets the request survive an unloading tab on the immediate exit-flush path.
      keepalive: immediate,
      body: JSON.stringify({
        revealedDuringRun: state.revealedDuringRun,
        bankedScore: state.bankedScore,
        currentNodeIndex,
        objectiveProgress,
        routePolyline,
        matchBattle: state.matchBattle,
        status,
        finalScore,
      }),
    })
      .then(res => res.ok)
      .catch(err => {
        console.error('Failed to persist run checkpoint:', err);
        return false;
      });
  if (immediate) return send();
  return new Promise<boolean>(resolve => setTimeout(() => { send().then(resolve); }, 0));
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
    revealedDuringRun?: unknown[];
    bankedScore: number;
    matchBattle?: RunState['matchBattle'];
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

function mergeRevealedClues(value: unknown): CluePayload[] {
  if (!Array.isArray(value)) return [];
  return dedupeClues(value.filter((entry): entry is CluePayload =>
    Boolean(entry)
    && typeof entry === 'object'
    && typeof (entry as { clue?: unknown }).clue === 'string'
    && typeof (entry as { category?: unknown }).category === 'number'
  ));
}
