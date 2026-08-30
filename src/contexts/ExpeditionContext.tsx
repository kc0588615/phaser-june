import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { EventBus, type EventPayloads } from '@/game/EventBus';
import type { CaseState, EarnedObservation, ExpeditionData, FieldFact, RunState } from '@/types/expedition';
import type { DeductionProfile, ComparisonResult } from '@/lib/deductionEngine';
import type { PublicCaseSnapshot, ClientRunProjection } from '@/lib/runProjection';
import { GRID_COLS, GRID_ROWS } from '@/game/constants';
import { buildNodeBoardContext } from '@/game/nodeObstacles';
import { buildBoardSpawnConfigForNode } from '@/expedition/domain';
import { createEmptyEvidenceCharges, getAllowedEvidenceGemTypes, type EvidenceFamily } from '@/expedition/evidenceFamilies';
import { mergeHintFeed } from '@/expedition/hintFeed';
import type { AffinityType } from '@/expedition/affinities';
import { createFlowState, currentNodeIndexForStep, nextFlowStep, reconcileProjection, stageForStep, type CaseFlowState, type FlowStep } from '@/expedition/caseFlow';
import { computeExpeditionRoutePolyline, getRoutePolylineThroughWaypointSlot, type RoutePoint } from '@/lib/expeditionRoute';
import type { Species } from '@/types/database';
import type { DiagnosisFeedback, MysteryResolution } from '@/lib/mysteryCase';

const INITIAL_RUN_STATE: RunState = {
  runId: null, phase: 'idle', expedition: null, currentNodeIndex: 0, bankedScore: 0,
  finalScore: null, visitedWaypointSlot: 0,
  resolvedSpeciesId: null, resolvedExplanationId: null, fieldFacts: [], caseResolution: null, caseState: null,
};

interface ExpeditionContextValue {
  runState: RunState;
  boardOpacity: number;
  handleRunResume: (runId: string) => Promise<boolean>;
  handleRunReset: () => void;
  handleChooseEvidenceFamily: (family: EvidenceFamily) => Promise<boolean>;
  handleAcknowledgeIncident: () => Promise<void>;
  handleDiagnosis: (speciesId: number, explanationId: string) => Promise<boolean | null>;
  showSpeciesList: (speciesId: number) => void;
  onShowSpeciesList: React.MutableRefObject<((speciesId: number) => void) | null>;
}

const ExpeditionContext = createContext<ExpeditionContextValue | null>(null);
export function useExpedition() { const value = useContext(ExpeditionContext); if (!value) throw new Error('useExpedition must be used within ExpeditionProvider'); return value; }

type CreatedRun = { runId: string; nodeIds: string[]; casePublic: PublicCaseSnapshot };

export function ExpeditionProvider({ children }: { children: React.ReactNode }) {
  const [runState, setRunState] = useState(INITIAL_RUN_STATE);
  const [boardOpacity, setBoardOpacity] = useState(1);
  const stateRef = useRef(runState);
  const payloadRef = useRef<EventPayloads['expedition-data-ready'] | null>(null);
  const runIdRef = useRef<string | null>(null);
  const pendingCreatedRunRef = useRef<CreatedRun | null>(null);
  const createRequestIdRef = useRef<string | null>(null);
  const nodeIdsRef = useRef<string[]>([]);
  const casePublicRef = useRef<PublicCaseSnapshot | null>(null);
  // Full species rows for the six case candidates — the field-note drip pool.
  // Held per run so object refs stay stable (clueConfig progress is WeakMap-keyed).
  const candidateSpeciesRef = useRef<Species[]>([]);
  const [initialFlow] = useState(createFlowState);
  const flowRef = useRef<CaseFlowState>(initialFlow);
  /** nodeIndex of the board currently mounted in the Phaser scene, null when torn down. */
  const liveBoardRef = useRef<number | null>(null);
  const startingRef = useRef(false);
  const advancingRef = useRef(false);
  const objectiveProgressRef = useRef(0);
  const plannedRouteRef = useRef<RoutePoint[]>([]);
  const routeRef = useRef<RoutePoint[]>([]);
  const onShowSpeciesList = useRef<((speciesId: number) => void) | null>(null);
  useEffect(() => { stateRef.current = runState; }, [runState]);

  const resetLocal = useCallback(() => {
    payloadRef.current = null; runIdRef.current = null; pendingCreatedRunRef.current = null; createRequestIdRef.current = null; nodeIdsRef.current = []; casePublicRef.current = null; candidateSpeciesRef.current = [];
    flowRef.current = createFlowState(); liveBoardRef.current = null; startingRef.current = false; advancingRef.current = false;
    objectiveProgressRef.current = 0;
    plannedRouteRef.current = []; routeRef.current = []; setBoardOpacity(1); setRunState(INITIAL_RUN_STATE);
  }, []);

  const handleRunReset = useCallback(() => { resetLocal(); EventBus.emit('game-reset', undefined); }, [resetLocal]);

  const emitBoardTracked = useCallback((payload: EventPayloads['expedition-data-ready'], publicCase: PublicCaseSnapshot, nodeIndex: number, objectiveProgress: number, boardCheckpoint?: EventPayloads['map-location-selected']['boardCheckpoint']) => {
    liveBoardRef.current = nodeIndex;
    emitBoard(payload, publicCase, nodeIndex, objectiveProgress, candidateSpeciesRef.current,
      stateRef.current.caseState?.selectedFamilies ?? [], boardCheckpoint);
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
      const step: FlowStep = nextFlowStep(flowRef.current);
      if (step.kind === 'choose_evidence') {
        setRunState(previous => previous.caseState ? {
          ...previous,
          currentNodeIndex: step.nodeIndex,
          caseState: {
            ...previous.caseState,
            stage: 'choose_evidence',
            objectiveProgress: 6,
            objectiveTarget: 6,
          },
        } : previous);
        toast('Six matches logged. Choose an evidence family to continue.', { duration: 3200 });
        return;
      }
      if (step.kind === 'board') {
        const payload = payloadRef.current; const publicCase = casePublicRef.current;
        if (!payload || !publicCase) throw new Error('Missing case data while advancing expedition');
        const resumedMoves = flowRef.current.nodes[step.nodeIndex]?.segmentMovesUsed ?? 0;
        objectiveProgressRef.current = resumedMoves;
        setRunState(previous => previous.caseState ? { ...previous, currentNodeIndex: step.nodeIndex, caseState: {
          ...previous.caseState,
          stage: 'board',
          objectiveProgress: resumedMoves,
          objectiveTarget: 6,
        } } : previous);
        emitBoardTracked(payload, publicCase, step.nodeIndex, resumedMoves);
        return;
      }
      setRunState(previous => previous.caseState ? { ...previous, currentNodeIndex: 2, caseState: { ...previous.caseState, stage: 'guess' } } : previous);
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
      createRequestIdRef.current = null;
      runIdRef.current = null;
      nodeIdsRef.current = [];
      casePublicRef.current = null;
      void abandonPendingRun(pendingRunId);
    }
    payloadRef.current = data;
    createRequestIdRef.current = crypto.randomUUID();
    plannedRouteRef.current = data.expedition.routePolyline?.length ? data.expedition.routePolyline : computeExpeditionRoutePolyline(data.lon, data.lat, 3);
    routeRef.current = getRoutePolylineThroughWaypointSlot(plannedRouteRef.current, 0);
    setRunState({ ...INITIAL_RUN_STATE, phase: 'briefing', expedition: data.expedition });
  }, []);

  const handleExpeditionStart = useCallback(async () => {
    const payload = payloadRef.current;
    if (!payload || payload.expedition.nodes.length !== 3) { toast.error('No valid three-site expedition is ready.'); return; }
    if (startingRef.current || (runIdRef.current && !pendingCreatedRunRef.current)) return;
    startingRef.current = true;
    try {
      let created = pendingCreatedRunRef.current;
      if (!created) {
        createRequestIdRef.current ??= crypto.randomUUID();
        const response = await fetch('/api/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildCreateBody(payload, plannedRouteRef.current, createRequestIdRef.current)) });
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
      candidateSpeciesRef.current = await fetchCandidateSpecies(created.casePublic.candidateIds);
      pendingCreatedRunRef.current = null;
      flowRef.current = createFlowState();
      const caseState = { ...createCaseState(created.casePublic, profiles), stage: 'incident' as const };
      setRunState(previous => ({ ...previous, runId: created.runId, phase: 'mystery', caseState, currentNodeIndex: 0 }));
    } catch (error) {
      console.error('[ExpeditionContext] Failed to start expedition:', error);
      toast.error('Could not start the expedition case.');
    } finally { startingRef.current = false; }
  }, []);

  const handleAcknowledgeIncident = useCallback(async () => {
    if (stateRef.current.caseState?.stage !== 'incident') return;
    await runFlow();
  }, [runFlow]);

  const handleChooseEvidenceFamily = useCallback(async (family: EvidenceFamily) => {
    const runId = runIdRef.current;
    const current = stateRef.current;
    const nodeIndex = current.currentNodeIndex;
    if (!runId || current.caseState?.stage !== 'choose_evidence'
      || !current.caseState.offeredFamilies.includes(family)) return false;
    try {
      const response = await fetch(`/api/runs/${runId}/evidence-choice`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeIndex, family }),
      });
      if (!response.ok) throw new Error(`Evidence choice failed (${response.status})`);
      const result = await response.json() as {
        observation: Omit<EarnedObservation, 'issuedAtMs'>;
        evidenceCharges: CaseState['evidenceCharges'];
        eliminationReasons?: Record<string, string>;
        selectedFamilies: EvidenceFamily[];
        travelEntry: string | null;
        isLastNode: boolean;
        scoreEarned?: number;
      };
      const observation: EarnedObservation = { ...result.observation, issuedAtMs: Date.now() };
      flowRef.current = {
        ...flowRef.current,
        nodes: flowRef.current.nodes.map((node, index) => index === nodeIndex
          ? { ...node, completed: true, chosenFamily: family, segmentMovesUsed: 6 }
          : node),
      };
      emitNodeCompleteIfLive(nodeIndex);
      routeRef.current = getRoutePolylineThroughWaypointSlot(plannedRouteRef.current, nodeIndex);
      setRunState(previous => previous.caseState ? {
        ...previous,
        bankedScore: previous.bankedScore + (result.scoreEarned ?? 0),
        caseState: {
          ...previous.caseState,
          stage: 'interpreting',
          observations: previous.caseState.observations.some(item => item.ref === observation.ref)
            ? previous.caseState.observations
            : [...previous.caseState.observations, observation],
          eliminatedIds: [...new Set([...previous.caseState.eliminatedIds, ...(observation.actualEliminatedIds ?? [])])],
          evidenceCharges: result.evidenceCharges,
          carriedCharges: result.evidenceCharges,
          selectedFamilies: result.selectedFamilies,
          offeredFamilies: [],
          travelEntry: result.travelEntry,
          eliminationReasons: { ...previous.caseState.eliminationReasons, ...(result.eliminationReasons ?? observation.eliminationReasons ?? {}) },
          nodeOutcomes: previous.caseState.nodeOutcomes.map((outcome, index) => index === nodeIndex ? 'met' : outcome),
        },
      } : previous);
      toast(result.travelEntry ?? 'Evidence applied. Candidates updated.', { duration: 1800 });
      await new Promise(resolve => window.setTimeout(resolve, result.travelEntry ? 900 : 650));
      await runFlow();
      return true;
    } catch (error) {
      console.error('[ExpeditionContext] Evidence choice failed:', error);
      toast.error('Evidence choice not saved — try again.');
      return false;
    }
  }, [emitNodeCompleteIfLive, runFlow]);

  const handleDiagnosis = useCallback(async (speciesId: number, explanationId: string) => {
    const runId = runIdRef.current;
    const activeCase = stateRef.current.caseState;
    if (!runId || activeCase?.stage !== 'guess') return false;
    try {
      const response = await fetch(`/api/runs/${runId}/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speciesId, explanationId }),
      });
      if (!response.ok) { toast.error('Diagnosis could not be checked.'); return null; }
      const result = await response.json() as {
        correct: boolean;
        contrastiveFeedback: ComparisonResult[];
        diagnosisFeedback: DiagnosisFeedback;
        finalScore?: number;
        fieldFacts?: FieldFact[];
        resolution?: MysteryResolution;
        selectedExplanationId?: string;
      };
      if (result.correct) {
        // speciesId is the public candidate the player just selected — safe to keep client-side.
        setRunState(previous => previous.caseState ? {
          ...previous,
          phase: 'complete',
          finalScore: result.finalScore ?? null,
          completionReason: 'captured',
          resolvedSpeciesId: speciesId,
          resolvedExplanationId: result.selectedExplanationId ?? explanationId,
          fieldFacts: result.fieldFacts ?? [],
          caseResolution: result.resolution ?? null,
          caseState: { ...previous.caseState, guessResult: 'correct', lastFeedback: null, diagnosisFeedback: result.diagnosisFeedback },
        } : previous);
        window.dispatchEvent(new CustomEvent('species-card-progress-updated', { detail: { speciesId } }));
      } else {
        setRunState(previous => previous.caseState ? {
          ...previous,
          caseState: {
            ...previous.caseState,
            guessResult: 'wrong',
            lastFeedback: result.contrastiveFeedback,
            diagnosisFeedback: result.diagnosisFeedback,
          },
        } : previous);
      }
      return result.correct;
    } catch (error) {
      console.error('[ExpeditionContext] Diagnosis failed:', error);
      toast.error('Diagnosis could not be checked.');
      return null;
    }
  }, []);

  const handleObjective = useCallback((event: EventPayloads['node-objective-updated']) => {
    objectiveProgressRef.current = event.progress;

    const current = stateRef.current;
    const runId = runIdRef.current;
    if (!runId || current.phase !== 'mystery' || current.caseState?.stage !== 'board'
      || !Number.isInteger(event.progress) || event.progress < 0 || event.target <= 0) return;

    setRunState(previous => previous.caseState ? {
      ...previous,
      caseState: {
        ...previous.caseState,
        objectiveProgress: event.progress,
        objectiveTarget: event.target,
      },
    } : previous);
  }, []);

  const handleEvidenceMoveResolved = useCallback(async (event: EventPayloads['evidence-move-resolved']) => {
    const current = stateRef.current;
    const runId = runIdRef.current;
    if (!runId || current.phase !== 'mystery'
      || current.caseState?.stage !== 'board' || current.currentNodeIndex !== event.nodeIndex) return;
    try {
      const response = await fetch(`/api/runs/${runId}/evidence-progress`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
      if (!response.ok) {
        const failure = await response.json().catch(() => ({})) as { error?: string; reason?: string; detail?: string };
        const cause = [failure.reason, failure.detail].filter(Boolean).join('/');
        throw new Error(`Evidence progress failed (${response.status}${cause ? `: ${cause}` : ''})`);
      }
      const result = await response.json() as {
        duplicate?: boolean;
        segmentMovesUsed: number;
        evidenceCharges: CaseState['evidenceCharges'];
        offeredFamilies: EvidenceFamily[];
        hintLines?: string[];
        hintFamilies?: EvidenceFamily[];
        cascadeHintLine?: string | null;
      };
      flowRef.current = {
        ...flowRef.current,
        nodes: flowRef.current.nodes.map((node, index) => index === event.nodeIndex
          ? { ...node, segmentMovesUsed: result.segmentMovesUsed }
          : node),
      };
      setRunState(previous => previous.caseState ? {
        ...previous,
        caseState: {
          ...previous.caseState,
          objectiveProgress: result.segmentMovesUsed,
          objectiveTarget: 6,
          evidenceCharges: result.evidenceCharges,
          offeredFamilies: result.offeredFamilies,
          hintFeed: mergeHintFeed(previous.caseState.hintFeed, [
            ...(result.hintLines ?? []).map((text, index) => ({
              id: `${event.nodeIndex}-${event.moveNumber}-e-${index}`,
              text,
              kind: 'evidence' as const,
              family: result.hintFamilies?.[index],
            })),
            ...(result.cascadeHintLine ? [{ id: `${event.nodeIndex}-${event.moveNumber}-c`, text: result.cascadeHintLine, kind: 'cascade' as const }] : []),
          ]),
        },
      } : previous);
      EventBus.emit('evidence-progress-committed', { nodeIndex: event.nodeIndex, moveNumber: event.moveNumber });
      if (result.segmentMovesUsed >= 6) await runFlow();
    } catch (error) {
      console.error('[ExpeditionContext] Evidence progress failed:', error);
      toast.error('Move not saved — resume this expedition to retry safely.');
    }
  }, [runFlow]);

  const handleRunResume = useCallback(async (runId: string) => {
    try {
      const response = await fetch(`/api/runs/${runId}`); if (!response.ok) throw new Error(`Run fetch failed (${response.status})`);
      const projection = await response.json() as ClientRunProjection;
      const decision = reconcileProjection(projection);
      if (decision.kind === 'legacy') { toast.error('Expedition format updated — start a new run.'); resetLocal(); return false; }
      const profiles = await fetchProfiles(projection.casePublic!.candidateIds);
      candidateSpeciesRef.current = await fetchCandidateSpecies(projection.casePublic!.candidateIds);
      const expedition = expeditionFromProjection(projection);
      if (expedition.nodes.length !== 3) throw new Error('Resume payload lacks three generated nodes');
      const payload = payloadFromProjection(projection, expedition, profiles);
      const observations = projection.observations.map(item => ({ ...item, traitCategory: item.traitCategory as EarnedObservation['traitCategory'], issuedAtMs: Date.now() }));
      const projectedNodeIndex = Math.max(0, Math.min(2, (projection.run.nodeIndexCurrent ?? 1) - 1));
      const projectedNode = projection.nodes.find(node => node.nodeOrder === projectedNodeIndex + 1);
      const baseCase: CaseState = {
        ...createCaseState(projection.casePublic!, profiles),
        observations,
        eliminatedIds: [...new Set(observations.flatMap(item => item.actualEliminatedIds ?? []))],
        evidenceCharges: projectedNode?.evidenceCharges ?? createEmptyEvidenceCharges(),
        carriedCharges: projectedNode?.carriedCharges ?? createEmptyEvidenceCharges(),
        offeredFamilies: projectedNode?.offeredFamilies ?? [],
        selectedFamilies: projectedNode?.selectedFamilies ?? observations.flatMap(item => item.family ? [item.family] : []),
        travelEntry: projectedNode?.travelEntry ?? null,
        eliminationReasons: Object.assign({}, ...observations.map(item => item.eliminationReasons ?? {})),
        hintFeed: [],
      };
      runIdRef.current = runId; nodeIdsRef.current = projection.nodes.map(node => node.id); casePublicRef.current = projection.casePublic; payloadRef.current = payload;
      plannedRouteRef.current = projection.checkpoint.routePolyline;

      if (decision.kind === 'completed') {
        // Never re-emit a board for a completed run. No safe resolved id is
        // projected, so the summary stays generic ('Case resolved').
        routeRef.current = getRoutePolylineThroughWaypointSlot(plannedRouteRef.current, 2);
        setRunState({
          ...INITIAL_RUN_STATE, runId, phase: 'complete', expedition, currentNodeIndex: 2,
          bankedScore: projection.run.scoreTotal ?? 0,
          finalScore: decision.finalScore, completionReason: 'captured',
          resolvedSpeciesId: projection.verdict?.resolvedSpeciesId ?? null,
          resolvedExplanationId: projection.verdict?.resolvedExplanationId ?? null,
          fieldFacts: projection.verdict?.fieldFacts ?? [],
          caseResolution: projection.verdict?.resolution ?? null,
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
        objectiveProgress: projection.nodes.find(node => node.nodeOrder === nodeIndex + 1)?.objectiveProgress ?? 0,
        objectiveTarget: projection.nodes.find(node => node.nodeOrder === nodeIndex + 1)?.objectiveTarget ?? 0,
        nodeOutcomes: decision.flow.nodes.map(node => node.completed ? 'met' : null),
        evidenceCharges: projection.nodes.find(node => node.nodeOrder === nodeIndex + 1)?.evidenceCharges ?? baseCase.evidenceCharges,
        carriedCharges: projection.nodes.find(node => node.nodeOrder === nodeIndex + 1)?.carriedCharges ?? baseCase.carriedCharges,
        offeredFamilies: step.kind === 'choose_evidence'
          ? projection.nodes.find(node => node.nodeOrder === nodeIndex + 1)?.offeredFamilies ?? []
          : [],
        selectedFamilies: projection.nodes.find(node => node.nodeOrder === nodeIndex + 1)?.selectedFamilies ?? baseCase.selectedFamilies,
        travelEntry: projection.nodes.find(node => node.nodeOrder === nodeIndex + 1)?.travelEntry ?? null,
      };
      setRunState({ ...INITIAL_RUN_STATE, runId, phase: 'mystery', expedition, currentNodeIndex: nodeIndex, bankedScore: projection.run.scoreTotal ?? 0, caseState });
      if (step.kind === 'board') {
        const objectiveProgress = projection.nodes.find(node => node.nodeOrder === step.nodeIndex + 1)?.objectiveProgress ?? 0;
        objectiveProgressRef.current = objectiveProgress;
        const checkpoint = projection.nodes.find(node => node.nodeOrder === step.nodeIndex + 1)?.boardCheckpoint;
        window.setTimeout(() => emitBoardTracked(payload, projection.casePublic!, step.nodeIndex, objectiveProgress, checkpoint), 100);
      }
      toast('Expedition case resumed', { duration: 1800 }); return true;
    } catch (error) { console.error('[ExpeditionContext] Resume failed:', error); toast.error('Could not resume that expedition'); return false; }
  }, [emitBoardTracked, resetLocal]);

  useEffect(() => {
    EventBus.on('expedition-data-ready', handleExpeditionDataReady); EventBus.on('expedition-start', handleExpeditionStart);
    EventBus.on('node-objective-updated', handleObjective); EventBus.on('game-reset', resetLocal);
    EventBus.on('evidence-move-resolved', handleEvidenceMoveResolved);
    return () => { EventBus.off('expedition-data-ready', handleExpeditionDataReady); EventBus.off('expedition-start', handleExpeditionStart); EventBus.off('node-objective-updated', handleObjective); EventBus.off('game-reset', resetLocal); EventBus.off('evidence-move-resolved', handleEvidenceMoveResolved); };
  }, [handleExpeditionDataReady, handleExpeditionStart, handleObjective, handleEvidenceMoveResolved, resetLocal]);

  const showSpeciesList = useCallback((speciesId: number) => onShowSpeciesList.current?.(speciesId), []);
  const value = useMemo(() => ({
    runState,
    boardOpacity,
    handleRunResume,
    handleRunReset,
    handleChooseEvidenceFamily,
    handleAcknowledgeIncident,
    handleDiagnosis,
    showSpeciesList,
    onShowSpeciesList,
  }), [runState, boardOpacity, handleRunResume, handleRunReset, handleChooseEvidenceFamily, handleAcknowledgeIncident, handleDiagnosis, showSpeciesList]);
  return <ExpeditionContext.Provider value={value}>{children}</ExpeditionContext.Provider>;
}

function createCaseState(publicCase: PublicCaseSnapshot, profiles: DeductionProfile[]): CaseState { return {
  version: 4,
  mapView: publicCase.mapView,
  mystery: publicCase.mystery,
  stage: 'board',
  candidateIds: publicCase.candidateIds,
  profiles,
  observations: [],
  eliminatedIds: [],
  guessResult: null,
  lastFeedback: null,
  diagnosisFeedback: null,
  objectiveProgress: 0,
  objectiveTarget: 0,
  nodeOutcomes: [null, null, null],
  evidenceCharges: createEmptyEvidenceCharges(),
  carriedCharges: createEmptyEvidenceCharges(),
  offeredFamilies: [],
  selectedFamilies: [],
  travelEntry: null,
  hintFeed: [],
  eliminationReasons: {},
}; }
/** Full rows for the six candidates. Non-fatal: on failure the UI falls back to location species. */
async function fetchCandidateSpecies(ids: number[]): Promise<Species[]> {
  try {
    const response = await fetch(`/api/species/by-ids?ids=${ids.join(',')}`);
    if (!response.ok) return [];
    const body = await response.json() as { species?: Species[] };
    return body.species ?? [];
  } catch (error) {
    console.warn('[ExpeditionContext] Candidate species fetch failed:', error);
    return [];
  }
}

async function fetchProfiles(ids: number[]): Promise<DeductionProfile[]> { const response = await fetch(`/api/species/profiles?ids=${ids.join(',')}`); if (!response.ok) throw new Error(`Profile fetch failed (${response.status})`); const body = await response.json() as { profiles?: DeductionProfile[] }; if (body.profiles?.length !== 6) throw new Error('Case profiles are incomplete'); return body.profiles; }
async function abandonPendingRun(runId: string): Promise<void> {
  try {
    const response = await fetch(`/api/runs/${runId}/abandon`, { method: 'POST' });
    if (!response.ok) console.error(`[ExpeditionContext] Pending run abandon failed (${response.status})`);
  } catch (error) {
    console.error('[ExpeditionContext] Pending run abandon failed:', error);
  }
}
function emitBoard(payload: EventPayloads['expedition-data-ready'], publicCase: PublicCaseSnapshot, nodeIndex: number, objectiveProgress: number, candidateSpecies: Species[] = [], selectedFamilies: EvidenceFamily[] = [], boardCheckpoint?: EventPayloads['map-location-selected']['boardCheckpoint']) {
  const node = payload.expedition.nodes[nodeIndex]; if (!node) throw new Error(`Missing generated node ${nodeIndex}`);
  const boardConfig = buildBoardSpawnConfigForNode(node.node_type, undefined, getAllowedEvidenceGemTypes(selectedFamilies));
  const location = node.waypoint ?? { lon: payload.lon, lat: payload.lat };
  EventBus.emit('map-location-selected', { lon: location.lon, lat: location.lat, ecoregionId: payload.ecoregionId ?? null, species: payload.species, rasterHabitats: payload.rasterHabitats, habitats: payload.habitats, difficulty: node.difficulty, moveBudget: 6, obstacles: node.obstacles, obstacleFamily: node.obstacleFamily, activeAffinities: payload.expedition.activeAffinities, objectiveTarget: 6, objectiveProgress, nodeIndex, nodeType: node.node_type, events: node.events, boardSeed: publicCase.boardSeeds[nodeIndex], boardContext: buildNodeBoardContext({ width: GRID_COLS, height: GRID_ROWS, obstacles: node.obstacles, nodeIndex }), boardConfig, candidateIds: publicCase.candidateIds, candidateSpecies, boardCheckpoint });
}

function buildCreateBody(payload: EventPayloads['expedition-data-ready'], routePolyline: RoutePoint[], createRequestId: string) { return { createRequestId, lon: payload.lon, lat: payload.lat, locationKey: `${payload.lon.toFixed(4)},${payload.lat.toFixed(4)}`, nodes: payload.expedition.nodes, activeAffinities: payload.expedition.activeAffinities, bioregion: payload.expedition.bioregion?.bioregion ?? undefined, realm: payload.expedition.bioregion?.realm ?? undefined, biome: payload.expedition.bioregion?.biome ?? undefined, speciesIds: payload.species.map(species => species.id), habitats: payload.habitats, rasterHabitats: payload.rasterHabitats, featureFingerprints: payload.featureFingerprints ?? [], routePolyline, expeditionSnapshot: { protectedAreas: payload.expedition.protectedAreas, availableAffinities: payload.expedition.availableAffinities, primaryNodeFamily: payload.expedition.primaryNodeFamily, primaryVariant: payload.expedition.primaryVariant, modifierNodes: payload.expedition.modifierNodes, signals: payload.expedition.signals, waypoints: payload.expedition.waypoints ?? [], waypointRadiusKm: payload.expedition.waypointRadiusKm ?? null, nearestRiverDistM: payload.expedition.nearestRiverDistM ?? null } }; }

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
