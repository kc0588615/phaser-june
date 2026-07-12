import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { EventBus, type EventPayloads } from '@/game/EventBus';
import { useGameBridge } from './GameBridgeContext';
import type { CaseState, EarnedObservation, ExpeditionData, InterpretationEvent, RunState } from '@/types/expedition';
import type { DeductionProfile, ComparisonResult } from '@/lib/deductionEngine';
import { computeActualEliminatedIds } from '@/lib/runCaseState';
import type { PublicCaseSnapshot, ClientRunProjection } from '@/lib/runProjection';
import { GRID_COLS, GRID_ROWS } from '@/game/constants';
import { buildNodeBoardContext } from '@/game/nodeObstacles';
import { buildBoardSpawnConfigForNode, METHOD_GEM_MAP } from '@/expedition/domain';
import type { AffinityType } from '@/expedition/affinities';
import { createFlowState, currentNodeIndexForStep, missedEvidenceNodeIndexes, nextFlowStep, reconcileProjection, stageForStep, type CaseFlowState, type FlowStep } from '@/expedition/caseFlow';
import { computeExpeditionRoutePolyline, getRoutePolylineThroughWaypointSlot, type RoutePoint } from '@/lib/expeditionRoute';
import type { Species } from '@/types/database';

const INITIAL_RUN_STATE: RunState = {
  phase: 'idle', expedition: null, currentNodeIndex: 0, activeAffinities: [], bankedScore: 0,
  clueFragments: { classification: 0, habitat: 0, geographic: 0, morphology: 0, behavior: 0, life_cycle: 0, conservation: 0, key_facts: 0 },
  deductionCamp: null, comparativeDeduction: null, finalScore: null, totalThoughtDiscount: 0,
  evidenceBundle: null, routeMatchCount: 0, visitedWaypointSlot: 0, matchedGemCategories: [],
  resolvedSpeciesId: null, caseState: null,
};

interface ExpeditionContextValue {
  runState: RunState;
  boardOpacity: number;
  handleRunResume: (runId: string) => Promise<boolean>;
  handleRunReset: () => void;
  handleCommitInterpretation: (obsRef: string, predictedIds: number[]) => Promise<boolean>;
  handleGuess: (speciesId: number) => Promise<boolean>;
  showSpeciesList: (speciesId: number) => void;
  onShowSpeciesList: React.MutableRefObject<((speciesId: number) => void) | null>;
}

const ExpeditionContext = createContext<ExpeditionContextValue | null>(null);
export function useExpedition() { const value = useContext(ExpeditionContext); if (!value) throw new Error('useExpedition must be used within ExpeditionProvider'); return value; }

type CreatedRun = { runId: string; nodeIds: string[]; casePublic: PublicCaseSnapshot };

export function ExpeditionProvider({ children }: { children: React.ReactNode }) {
  const { hudRef } = useGameBridge();
  const [runState, setRunState] = useState(INITIAL_RUN_STATE);
  const [boardOpacity, setBoardOpacity] = useState(1);
  const stateRef = useRef(runState);
  const payloadRef = useRef<EventPayloads['expedition-data-ready'] | null>(null);
  const runIdRef = useRef<string | null>(null);
  const pendingCreatedRunRef = useRef<CreatedRun | null>(null);
  const nodeIdsRef = useRef<string[]>([]);
  const casePublicRef = useRef<PublicCaseSnapshot | null>(null);
  const flowRef = useRef<CaseFlowState>(null!);
  if (!flowRef.current) flowRef.current = createFlowState();
  /** nodeIndex of the board currently mounted in the Phaser scene, null when torn down. */
  const liveBoardRef = useRef<number | null>(null);
  const startingRef = useRef(false);
  const advancingRef = useRef(false);
  const nodeStartScoreRef = useRef(0);
  const objectiveProgressRef = useRef(0);
  const resolvingNodeRef = useRef<number | null>(null);
  const plannedRouteRef = useRef<RoutePoint[]>([]);
  const routeRef = useRef<RoutePoint[]>([]);
  const onShowSpeciesList = useRef<((speciesId: number) => void) | null>(null);
  useEffect(() => { stateRef.current = runState; }, [runState]);

  const resetLocal = useCallback(() => {
    payloadRef.current = null; runIdRef.current = null; pendingCreatedRunRef.current = null; nodeIdsRef.current = []; casePublicRef.current = null;
    flowRef.current = createFlowState(); liveBoardRef.current = null; startingRef.current = false; advancingRef.current = false;
    nodeStartScoreRef.current = 0; objectiveProgressRef.current = 0; resolvingNodeRef.current = null;
    plannedRouteRef.current = []; routeRef.current = []; setBoardOpacity(1); setRunState(INITIAL_RUN_STATE);
  }, []);

  const handleRunReset = useCallback(() => { resetLocal(); EventBus.emit('game-reset', undefined); }, [resetLocal]);

  const emitBoardTracked = useCallback((payload: EventPayloads['expedition-data-ready'], publicCase: PublicCaseSnapshot, nodeIndex: number, objectiveProgress: number) => {
    liveBoardRef.current = nodeIndex;
    emitBoard(payload, publicCase, nodeIndex, objectiveProgress);
  }, []);

  /** Tears down the Phaser board exactly once, and only if that board is still mounted. */
  const emitNodeCompleteIfLive = useCallback((nodeIndex: number) => {
    if (liveBoardRef.current !== nodeIndex) return;
    liveBoardRef.current = null;
    EventBus.emit('node-complete', { nodeIndex });
  }, []);

  /**
   * Drives the flow machine to its next stable beat (live board, pending
   * interpretation, or guess), performing the durable calls in between.
   */
  const runFlow = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    try {
      for (;;) {
        const step: FlowStep = nextFlowStep(flowRef.current);
        if (step.kind === 'board') {
          const payload = payloadRef.current; const publicCase = casePublicRef.current;
          if (!payload || !publicCase) throw new Error('Missing case data while advancing expedition');
          objectiveProgressRef.current = 0; nodeStartScoreRef.current = 0;
          setRunState(previous => previous.caseState ? { ...previous, currentNodeIndex: step.nodeIndex, caseState: { ...previous.caseState, stage: 'board', pendingInterpretationRef: null } } : previous);
          emitBoardTracked(payload, publicCase, step.nodeIndex, 0);
          return;
        }
        if (step.kind === 'interpret') {
          setRunState(previous => previous.caseState ? { ...previous, currentNodeIndex: currentNodeIndexForStep(step), caseState: { ...previous.caseState, stage: 'interpreting', pendingInterpretationRef: step.ref } } : previous);
          return;
        }
        if (step.kind === 'guess') {
          setRunState(previous => previous.caseState ? { ...previous, currentNodeIndex: 2, caseState: { ...previous.caseState, stage: 'guess', pendingInterpretationRef: null } } : previous);
          return;
        }
        if (step.kind === 'recover-observation') {
          const observation = await requestObservation(runIdRef.current, step.nodeIndex, false);
          if (!observation) throw new Error('Earned observation was not issued');
          flowRef.current = { ...flowRef.current, issuedRefs: [...flowRef.current.issuedRefs, observation.ref] };
          setRunState(previous => previous.caseState ? { ...previous, caseState: addObservation(previous.caseState, observation) } : previous);
          continue;
        }
        // signature-attempt: exactly one try; any 403 settles it permanently.
        const signature = await requestObservation(runIdRef.current, 3, true);
        if (signature) {
          flowRef.current = { ...flowRef.current, issuedRefs: [...flowRef.current.issuedRefs, signature.ref] };
          setRunState(previous => previous.caseState ? { ...previous, caseState: addObservation(previous.caseState, signature) } : previous);
        } else {
          flowRef.current = { ...flowRef.current, signatureSettled: true };
        }
      }
    } catch (error) {
      console.error('[ExpeditionContext] Flow advance failed:', error);
      toast.error('Could not advance the expedition — resume the run to retry.');
    } finally { advancingRef.current = false; }
  }, [emitBoardTracked]);

  const handleExpeditionDataReady = useCallback((data: EventPayloads['expedition-data-ready']) => {
    if (data.expedition.nodes.length !== 3) {
      console.error('[ExpeditionContext] Expected exactly three generated method nodes.', data.expedition.nodes);
      toast.error('Expedition generation failed: three field sites are required.');
      return;
    }
    const pendingRunId = pendingCreatedRunRef.current?.runId;
    if (pendingRunId) {
      pendingCreatedRunRef.current = null;
      runIdRef.current = null;
      nodeIdsRef.current = [];
      casePublicRef.current = null;
      void abandonPendingRun(pendingRunId);
    }
    payloadRef.current = data;
    plannedRouteRef.current = data.expedition.routePolyline?.length ? data.expedition.routePolyline : computeExpeditionRoutePolyline(data.lon, data.lat, 3);
    routeRef.current = getRoutePolylineThroughWaypointSlot(plannedRouteRef.current, 0);
    setRunState({ ...INITIAL_RUN_STATE, phase: 'briefing', expedition: data.expedition, activeAffinities: data.expedition.activeAffinities });
  }, []);

  const handleExpeditionStart = useCallback(async () => {
    const payload = payloadRef.current;
    if (!payload || payload.expedition.nodes.length !== 3) { toast.error('No valid three-site expedition is ready.'); return; }
    if (startingRef.current || (runIdRef.current && !pendingCreatedRunRef.current)) return;
    startingRef.current = true;
    try {
      let created = pendingCreatedRunRef.current;
      if (!created) {
        const response = await fetch('/api/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildCreateBody(payload, plannedRouteRef.current)) });
        if (!response.ok) {
          const failure = await response.json().catch(() => ({})) as { error?: string };
          toast.error(failure.error ?? `Run creation failed (${response.status})`);
          return;
        }
        created = await response.json() as CreatedRun;
        pendingCreatedRunRef.current = created;
        runIdRef.current = created.runId;
        nodeIdsRef.current = created.nodeIds;
        casePublicRef.current = created.casePublic;
      }
      // All six symmetric profiles must be in hand before the run leaves briefing.
      const profiles = await fetchProfiles(created.casePublic.candidateIds);
      pendingCreatedRunRef.current = null;
      flowRef.current = createFlowState();
      const caseState = createCaseState(created.casePublic.candidateIds, profiles);
      setRunState(previous => ({ ...previous, phase: 'mystery', caseState, currentNodeIndex: 0 }));
      emitBoardTracked(payload, created.casePublic, 0, 0);
    } catch (error) {
      console.error('[ExpeditionContext] Failed to start expedition:', error);
      toast.error('Could not start the expedition case.');
    } finally { startingRef.current = false; }
  }, [emitBoardTracked]);

  const handleNodeAdvanceRequested = useCallback(async (event: EventPayloads['node-advance-requested']) => {
    const current = stateRef.current;
    if (current.phase !== 'mystery' || current.caseState?.stage !== 'board' || event.nodeIndex !== current.currentNodeIndex || resolvingNodeRef.current !== null) return;
    const runId = runIdRef.current;
    if (!runId) { toast.error('This expedition has no durable run session.'); return; }
    resolvingNodeRef.current = event.nodeIndex; setBoardOpacity(1);
    try {
      const earnedScore = Math.max(0, (hudRef.current?.score ?? 0) - nodeStartScoreRef.current);
      const complete = await fetch(`/api/runs/${runId}/nodes/${event.nodeIndex + 1}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scoreEarned: earnedScore, movesUsed: hudRef.current?.movesUsed ?? 0, objectiveProgress: objectiveProgressRef.current }) });
      if (!complete.ok) throw new Error(`Node completion failed (${complete.status})`);
      routeRef.current = getRoutePolylineThroughWaypointSlot(plannedRouteRef.current, event.nodeIndex);
      const objectiveMet = event.reason === 'victory';
      flowRef.current = {
        ...flowRef.current,
        nodes: flowRef.current.nodes.map((node, index) => index === event.nodeIndex ? { completed: true, objectiveMet } : node),
      };
      setRunState(previous => {
        const next = { ...previous, bankedScore: previous.bankedScore + earnedScore };
        if (!objectiveMet && next.caseState) {
          next.caseState = { ...next.caseState, missedEvidenceNodeIndexes: [...next.caseState.missedEvidenceNodeIndexes, event.nodeIndex] };
        }
        return next;
      });
      if (objectiveMet) {
        // The finished board stays mounted (inert) until the interpretation is durable.
        toast('Evidence recorded. Interpret it before moving on.', { duration: 2400 });
      } else {
        toast('Evidence missed at this site. The expedition continues.', { duration: 2400 });
        emitNodeCompleteIfLive(event.nodeIndex);
      }
      await runFlow();
    } catch (error) {
      console.error('[ExpeditionContext] Failed to resolve node:', error); toast.error('Could not save this field site. Try again.');
    } finally { resolvingNodeRef.current = null; }
  }, [emitNodeCompleteIfLive, hudRef, runFlow]);

  const handleCommitInterpretation = useCallback(async (obsRef: string, predictedIds: number[]) => {
    const runId = runIdRef.current; const current = stateRef.current; const caseState = current.caseState;
    if (!runId || !caseState || caseState.pendingInterpretationRef !== obsRef) return false;
    try {
      const observation = caseState.observations.find(item => item.ref === obsRef);
      if (!observation?.traitCategory || !observation.compareTag) throw new Error('Observation interpretation fields unavailable');
      const live = caseState.profiles.filter(profile => !caseState.eliminatedIds.includes(profile.speciesId));
      const actualIds = computeActualEliminatedIds(caseState.profiles, caseState.eliminatedIds, observation.traitCategory, observation.compareTag);
      const predicted = [...new Set(predictedIds.filter(id => live.some(profile => profile.speciesId === id)))].sort((a, b) => a - b);
      const interpretation: InterpretationEvent = { obsRef, predictedEliminatedIds: predicted, actualEliminatedIds: actualIds, correct: sameIds(predicted, actualIds), latencyMs: Math.min(Date.now() - observation.issuedAtMs, 3_600_000) };
      const response = await fetch(`/api/runs/${runId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reasoningEvents: [interpretation] }) });
      if (!response.ok) throw new Error(`Interpretation save failed (${response.status})`);
      const result = await response.json() as { reasoningEventsCommitted?: string[] };
      if (!result.reasoningEventsCommitted?.includes(obsRef)) throw new Error('Server did not commit interpretation');
      flowRef.current = { ...flowRef.current, committedRefs: [...flowRef.current.committedRefs, obsRef] };
      setRunState(previous => previous.caseState ? { ...previous, caseState: { ...previous.caseState, interpretations: [...previous.caseState.interpretations, interpretation], eliminatedIds: [...new Set([...previous.caseState.eliminatedIds, ...actualIds])], pendingInterpretationRef: null } } : previous);
      // Interpretation is durable — now it is safe to leave this board.
      const boardNodeIndex = liveBoardRef.current;
      if (boardNodeIndex !== null && `obs-${boardNodeIndex}` === obsRef) emitNodeCompleteIfLive(boardNodeIndex);
      await runFlow();
      return true;
    } catch (error) {
      // The pending observation is untouched, so the commit button simply retries.
      console.error('[ExpeditionContext] Failed to commit interpretation:', error);
      toast.error('Interpretation not saved — try again.');
      return false;
    }
  }, [emitNodeCompleteIfLive, runFlow]);

  const handleGuess = useCallback(async (speciesId: number) => {
    const runId = runIdRef.current;
    if (!runId || stateRef.current.caseState?.stage !== 'guess') return false;
    try {
      const response = await fetch(`/api/runs/${runId}/guess`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ speciesId }) });
      if (!response.ok) { toast.error('Guess could not be checked.'); return false; }
      const result = await response.json() as { correct: boolean; contrastiveFeedback: ComparisonResult[]; finalScore?: number };
      if (result.correct) {
        // speciesId is the public candidate the player just selected — safe to keep client-side.
        setRunState(previous => previous.caseState ? { ...previous, phase: 'complete', finalScore: result.finalScore ?? null, completionReason: 'captured', resolvedSpeciesId: speciesId, caseState: { ...previous.caseState, guessResult: 'correct', lastFeedback: null } } : previous);
        window.dispatchEvent(new CustomEvent('species-card-progress-updated', { detail: { speciesId } }));
      } else {
        setRunState(previous => previous.caseState ? { ...previous, caseState: { ...previous.caseState, guessResult: 'wrong', lastFeedback: result.contrastiveFeedback } } : previous);
      }
      return result.correct;
    } catch (error) {
      console.error('[ExpeditionContext] Guess failed:', error);
      toast.error('Guess could not be checked.');
      return false;
    }
  }, []);

  const handleObservationEarned = useCallback((_event: EventPayloads['observation-earned']) => {
    setRunState(previous => ({ ...previous, routeMatchCount: previous.routeMatchCount + 1 }));
  }, []);
  const handleObjective = useCallback((event: EventPayloads['node-objective-updated']) => { objectiveProgressRef.current = event.progress; }, []);

  const handleRunResume = useCallback(async (runId: string) => {
    try {
      const response = await fetch(`/api/runs/${runId}`); if (!response.ok) throw new Error(`Run fetch failed (${response.status})`);
      const projection = await response.json() as ClientRunProjection;
      const decision = reconcileProjection(projection);
      if (decision.kind === 'legacy') { toast.error('Expedition format updated — start a new run.'); resetLocal(); return false; }
      const profiles = await fetchProfiles(projection.casePublic!.candidateIds);
      const expedition = expeditionFromProjection(projection);
      if (expedition.nodes.length !== 3) throw new Error('Resume payload lacks three generated nodes');
      const payload = payloadFromProjection(projection, expedition, profiles);
      const interpretations = projection.checkpoint.reasoningEvents;
      const observations = projection.observations.map(item => ({ ...item, traitCategory: item.traitCategory as EarnedObservation['traitCategory'], issuedAtMs: Date.now() }));
      const baseCase: CaseState = {
        ...createCaseState(projection.casePublic!.candidateIds, profiles),
        observations, interpretations,
        eliminatedIds: [...new Set(interpretations.flatMap(item => item.actualEliminatedIds))],
      };
      runIdRef.current = runId; nodeIdsRef.current = projection.nodes.map(node => node.id); casePublicRef.current = projection.casePublic; payloadRef.current = payload;
      plannedRouteRef.current = projection.checkpoint.routePolyline;

      if (decision.kind === 'completed') {
        // Never re-emit a board for a completed run. No safe resolved id is
        // projected, so the summary stays generic ('Case resolved').
        routeRef.current = getRoutePolylineThroughWaypointSlot(plannedRouteRef.current, 2);
        setRunState({
          ...INITIAL_RUN_STATE, phase: 'complete', expedition, currentNodeIndex: 2,
          activeAffinities: expedition.activeAffinities, bankedScore: projection.run.scoreTotal ?? 0,
          finalScore: decision.finalScore, completionReason: 'captured',
          caseState: { ...baseCase, stage: 'guess', guessResult: 'correct' },
        });
        toast('Expedition already resolved', { duration: 1800 });
        return true;
      }

      flowRef.current = decision.flow;
      const step = decision.step;
      const nodeIndex = currentNodeIndexForStep(step);
      routeRef.current = getRoutePolylineThroughWaypointSlot(plannedRouteRef.current, nodeIndex);
      const caseState: CaseState = {
        ...baseCase,
        stage: stageForStep(step),
        pendingInterpretationRef: step.kind === 'interpret' ? step.ref : null,
        missedEvidenceNodeIndexes: missedEvidenceNodeIndexes(decision.flow),
      };
      setRunState({ ...INITIAL_RUN_STATE, phase: 'mystery', expedition, currentNodeIndex: nodeIndex, activeAffinities: expedition.activeAffinities, bankedScore: projection.run.scoreTotal ?? 0, caseState });
      if (step.kind === 'board') {
        const objectiveProgress = projection.nodes.find(node => node.nodeOrder === step.nodeIndex + 1)?.objectiveProgress ?? 0;
        objectiveProgressRef.current = objectiveProgress;
        window.setTimeout(() => emitBoardTracked(payload, projection.casePublic!, step.nodeIndex, objectiveProgress), 100);
      } else if (step.kind === 'recover-observation' || step.kind === 'signature-attempt') {
        void runFlow();
      }
      toast('Expedition case resumed', { duration: 1800 }); return true;
    } catch (error) { console.error('[ExpeditionContext] Resume failed:', error); toast.error('Could not resume that expedition'); return false; }
  }, [emitBoardTracked, resetLocal, runFlow]);

  useEffect(() => {
    EventBus.on('expedition-data-ready', handleExpeditionDataReady); EventBus.on('expedition-start', handleExpeditionStart);
    EventBus.on('node-advance-requested', handleNodeAdvanceRequested); EventBus.on('observation-earned', handleObservationEarned);
    EventBus.on('node-objective-updated', handleObjective); EventBus.on('game-reset', resetLocal);
    return () => { EventBus.off('expedition-data-ready', handleExpeditionDataReady); EventBus.off('expedition-start', handleExpeditionStart); EventBus.off('node-advance-requested', handleNodeAdvanceRequested); EventBus.off('observation-earned', handleObservationEarned); EventBus.off('node-objective-updated', handleObjective); EventBus.off('game-reset', resetLocal); };
  }, [handleExpeditionDataReady, handleExpeditionStart, handleNodeAdvanceRequested, handleObservationEarned, handleObjective, resetLocal]);

  const showSpeciesList = useCallback((speciesId: number) => onShowSpeciesList.current?.(speciesId), []);
  const value = useMemo(() => ({ runState, boardOpacity, handleRunResume, handleRunReset, handleCommitInterpretation, handleGuess, showSpeciesList, onShowSpeciesList }), [runState, boardOpacity, handleRunResume, handleRunReset, handleCommitInterpretation, handleGuess, showSpeciesList]);
  return <ExpeditionContext.Provider value={value}>{children}</ExpeditionContext.Provider>;
}

function createCaseState(candidateIds: number[], profiles: DeductionProfile[]): CaseState { return { stage: 'board', candidateIds, profiles, observations: [], interpretations: [], eliminatedIds: [], pendingInterpretationRef: null, missedEvidenceNodeIndexes: [], guessResult: null, lastFeedback: null }; }
function addObservation(state: CaseState, observation: EarnedObservation): CaseState { return state.observations.some(item => item.ref === observation.ref) ? state : { ...state, observations: [...state.observations, observation], pendingInterpretationRef: observation.ref }; }
function sameIds(left: number[], right: number[]) { return left.length === right.length && left.every((id, index) => id === right[index]); }
async function fetchProfiles(ids: number[]): Promise<DeductionProfile[]> { const response = await fetch(`/api/species/profiles?ids=${ids.join(',')}`); if (!response.ok) throw new Error(`Profile fetch failed (${response.status})`); const body = await response.json() as { profiles?: DeductionProfile[] }; if (body.profiles?.length !== 6) throw new Error('Case profiles are incomplete'); return body.profiles; }
async function abandonPendingRun(runId: string): Promise<void> {
  try {
    const response = await fetch(`/api/runs/${runId}/abandon`, { method: 'POST' });
    if (!response.ok) console.error(`[ExpeditionContext] Pending run abandon failed (${response.status})`);
  } catch (error) {
    console.error('[ExpeditionContext] Pending run abandon failed:', error);
  }
}
async function requestObservation(runId: string | null, nodeIndex: number, tolerateForbidden: boolean): Promise<EarnedObservation | null> { if (!runId) return null; const response = await fetch(`/api/runs/${runId}/observations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nodeIndex }) }); if (tolerateForbidden && response.status === 403) return null; if (!response.ok) throw new Error(`Observation request failed (${response.status})`); return { ...await response.json(), issuedAtMs: Date.now() } as EarnedObservation; }

function emitBoard(payload: EventPayloads['expedition-data-ready'], publicCase: PublicCaseSnapshot, nodeIndex: number, objectiveProgress: number) {
  const node = payload.expedition.nodes[nodeIndex]; if (!node) throw new Error(`Missing generated node ${nodeIndex}`);
  const method = publicCase.nodeMethods[nodeIndex]; const methodGem = METHOD_GEM_MAP[method];
  const boardConfig = buildBoardSpawnConfigForNode(node.node_type, { [methodGem]: 3 });
  const location = node.waypoint ?? { lon: payload.lon, lat: payload.lat };
  EventBus.emit('cesium-location-selected', { lon: location.lon, lat: location.lat, ecoregionId: payload.ecoregionId ?? null, species: payload.species, rasterHabitats: payload.rasterHabitats, habitats: payload.habitats, difficulty: node.difficulty, moveBudget: node.moveBudget, obstacles: node.obstacles, obstacleFamily: node.obstacleFamily, objectiveGem: methodGem, activeAffinities: payload.expedition.activeAffinities, objectiveTarget: node.objectiveTarget, objectiveProgress, nodeIndex, nodeType: node.node_type, events: node.events, boardSeed: publicCase.boardSeeds[nodeIndex], boardContext: buildNodeBoardContext({ width: GRID_COLS, height: GRID_ROWS, obstacles: node.obstacles, nodeIndex }), boardConfig });
}

function buildCreateBody(payload: EventPayloads['expedition-data-ready'], routePolyline: RoutePoint[]) { return { lon: payload.lon, lat: payload.lat, locationKey: `${payload.lon.toFixed(4)},${payload.lat.toFixed(4)}`, nodes: payload.expedition.nodes, activeAffinities: payload.expedition.activeAffinities, bioregion: payload.expedition.bioregion?.bioregion ?? undefined, realm: payload.expedition.bioregion?.realm ?? undefined, biome: payload.expedition.bioregion?.biome ?? undefined, speciesIds: payload.species.map(species => species.id), habitats: payload.habitats, rasterHabitats: payload.rasterHabitats, featureFingerprints: payload.featureFingerprints ?? [], routePolyline, expeditionSnapshot: { protectedAreas: payload.expedition.protectedAreas, availableAffinities: payload.expedition.availableAffinities, primaryNodeFamily: payload.expedition.primaryNodeFamily, primaryVariant: payload.expedition.primaryVariant, modifierNodes: payload.expedition.modifierNodes, signals: payload.expedition.signals, waypoints: payload.expedition.waypoints ?? [], waypointRadiusKm: payload.expedition.waypointRadiusKm ?? null, nearestRiverDistM: payload.expedition.nearestRiverDistM ?? null } }; }

function expeditionFromProjection(data: ClientRunProjection): ExpeditionData {
  const snapshot = data.checkpoint.expeditionSnapshot;
  return {
    nodes: data.nodes.map(node => ({
      node_type: node.nodeType,
      difficulty: (node.difficulty ?? 3) as 1 | 2 | 3 | 4 | 5,
      moveBudget: node.moveBudget,
      obstacles: node.obstacles as ExpeditionData['nodes'][number]['obstacles'],
      events: node.events as ExpeditionData['nodes'][number]['events'],
      rationale: node.rationale ?? '',
      obstacleFamily: null,
      method: node.method,
      objectiveType: 'method_match',
      objectiveTarget: node.objectiveTarget ?? 0,
      boardSeed: node.boardSeed,
      waypoint: node.waypoint as ExpeditionData['nodes'][number]['waypoint'],
    })),
    bioregion: { bioregion: data.run.bioregion ?? null, realm: data.run.realm ?? null, biome: data.run.biome ?? null },
    protectedAreas: snapshot.protectedAreas,
    activeAffinities: data.checkpoint.activeAffinities as AffinityType[],
    availableAffinities: snapshot.availableAffinities as AffinityType[],
    primaryNodeFamily: snapshot.primaryNodeFamily,
    primaryVariant: snapshot.primaryVariant,
    modifierNodes: snapshot.modifierNodes,
    signals: snapshot.signals,
    routePolyline: data.checkpoint.routePolyline,
    waypoints: snapshot.waypoints as ExpeditionData['waypoints'],
    waypointRadiusKm: snapshot.waypointRadiusKm,
    nearestRiverDistM: snapshot.nearestRiverDistM,
  };
}
function payloadFromProjection(data: ClientRunProjection, expedition: ExpeditionData, profiles: DeductionProfile[]): EventPayloads['expedition-data-ready'] { return { lon: data.run.selectedLng ?? 0, lat: data.run.selectedLat ?? 0, expedition, species: profiles.map(profile => ({ id: profile.speciesId, common_name: profile.commonName, scientific_name: profile.scientificName } as Species)), rasterHabitats: data.checkpoint.rasterHabitats, habitats: data.checkpoint.habitats, featureFingerprints: data.checkpoint.featureFingerprints as EventPayloads['expedition-data-ready']['featureFingerprints'] }; }
