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
import { buildBoardSpawnConfigForNode, METHOD_GEM_MAP, type MethodType } from '@/expedition/domain';
import { createEmptyEvidenceCharges, getAllowedEvidenceGemTypes, type EvidenceFamily } from '@/expedition/evidenceFamilies';
import { getMethodOfferAtPath } from '@/expedition/caseOffers';
import type { AffinityType } from '@/expedition/affinities';
import { createFlowState, currentNodeIndexForStep, missedEvidenceNodeIndexes, nextFlowStep, reconcileProjection, stageForStep, type CaseFlowState, type FlowStep } from '@/expedition/caseFlow';
import { computeExpeditionRoutePolyline, getRoutePolylineThroughWaypointSlot, type RoutePoint } from '@/lib/expeditionRoute';
import type { Species } from '@/types/database';

const INITIAL_RUN_STATE: RunState = {
  runId: null, phase: 'idle', expedition: null, currentNodeIndex: 0, bankedScore: 0,
  finalScore: null, visitedWaypointSlot: 0,
  resolvedSpeciesId: null, caseState: null,
};

interface ExpeditionContextValue {
  runState: RunState;
  boardOpacity: number;
  handleRunResume: (runId: string) => Promise<boolean>;
  handleRunReset: () => void;
  handleCommitInterpretation: (obsRef: string, predictedIds: number[]) => Promise<boolean>;
  handleChooseMethod: (method: MethodType) => Promise<boolean>;
  handleChooseEvidenceFamily: (family: EvidenceFamily) => Promise<boolean>;
  handleGuess: (speciesId: number, evidenceRefs: string[]) => Promise<boolean | null>;
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
  const createRequestIdRef = useRef<string | null>(null);
  const nodeIdsRef = useRef<string[]>([]);
  const casePublicRef = useRef<PublicCaseSnapshot | null>(null);
  // Full species rows for the six case candidates — the field-note drip pool.
  // Held per run so object refs stay stable (clueConfig progress is WeakMap-keyed).
  const candidateSpeciesRef = useRef<Species[]>([]);
  const flowRef = useRef<CaseFlowState>(null!);
  if (flowRef.current === null) flowRef.current = createFlowState();
  /** nodeIndex of the board currently mounted in the Phaser scene, null when torn down. */
  const liveBoardRef = useRef<number | null>(null);
  const startingRef = useRef(false);
  const advancingRef = useRef(false);
  const nodeStartScoreRef = useRef(0);
  const objectiveProgressRef = useRef(0);
  const bestTargetMatchLengthRef = useRef(0);
  const objectiveCheckpointTimerRef = useRef<number | null>(null);
  const resolvingNodeRef = useRef<number | null>(null);
  const plannedRouteRef = useRef<RoutePoint[]>([]);
  const routeRef = useRef<RoutePoint[]>([]);
  const onShowSpeciesList = useRef<((speciesId: number) => void) | null>(null);
  useEffect(() => { stateRef.current = runState; }, [runState]);

  const cancelObjectiveCheckpoint = useCallback(() => {
    if (objectiveCheckpointTimerRef.current === null) return;
    window.clearTimeout(objectiveCheckpointTimerRef.current);
    objectiveCheckpointTimerRef.current = null;
  }, []);

  const resetLocal = useCallback(() => {
    cancelObjectiveCheckpoint();
    payloadRef.current = null; runIdRef.current = null; pendingCreatedRunRef.current = null; createRequestIdRef.current = null; nodeIdsRef.current = []; casePublicRef.current = null; candidateSpeciesRef.current = [];
    flowRef.current = createFlowState(); liveBoardRef.current = null; startingRef.current = false; advancingRef.current = false;
    nodeStartScoreRef.current = 0; objectiveProgressRef.current = 0; bestTargetMatchLengthRef.current = 0; resolvingNodeRef.current = null;
    plannedRouteRef.current = []; routeRef.current = []; setBoardOpacity(1); setRunState(INITIAL_RUN_STATE);
  }, [cancelObjectiveCheckpoint]);

  const handleRunReset = useCallback(() => { resetLocal(); EventBus.emit('game-reset', undefined); }, [resetLocal]);

  const emitBoardTracked = useCallback((payload: EventPayloads['expedition-data-ready'], publicCase: PublicCaseSnapshot, nodeIndex: number, objectiveProgress: number, bestTargetMatchLength = 0, boardCheckpoint?: EventPayloads['map-location-selected']['boardCheckpoint']) => {
    liveBoardRef.current = nodeIndex;
    if (publicCase.version === 3) {
      emitBoard(payload, publicCase, nodeIndex, objectiveProgress, 0, undefined, candidateSpeciesRef.current,
        stateRef.current.caseState?.selectedFamilies ?? [], boardCheckpoint);
      return;
    }
    const method = publicCase.version === 1
      ? publicCase.nodeMethods[nodeIndex]
      : flowRef.current.nodes[nodeIndex]?.chosenMethod;
    if (!method) throw new Error(`Missing selected method for board ${nodeIndex}`);
    emitBoard(payload, publicCase, nodeIndex, objectiveProgress, bestTargetMatchLength, method, candidateSpeciesRef.current);
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
        if (step.kind === 'choose_method') {
          const publicCase = casePublicRef.current;
          if (!publicCase || publicCase.version !== 2) throw new Error('Missing v2 offer tree');
          const priorChoices = flowRef.current.nodes.slice(0, step.nodeIndex).flatMap(node => node.chosenMethod ? [node.chosenMethod] : []);
          const offeredMethods = getMethodOfferAtPath(publicCase.offerTree, priorChoices);
          if (!offeredMethods) throw new Error('Invalid public method offer path');
          setRunState(previous => previous.caseState ? {
            ...previous,
            currentNodeIndex: step.nodeIndex,
            caseState: {
              ...previous.caseState,
              stage: 'choose_method',
              pendingInterpretationRef: null,
              offeredMethods,
              selectedMethods: flowRef.current.nodes.map(node => node.chosenMethod),
              objectiveProgress: 0,
              objectiveTarget: previous.expedition?.nodes[step.nodeIndex]?.objectiveTarget ?? 0,
              bestTargetMatchLength: 0,
            },
          } : previous);
          return;
        }
        if (step.kind === 'choose_evidence') {
          setRunState(previous => previous.caseState ? {
            ...previous,
            currentNodeIndex: step.nodeIndex,
            caseState: {
              ...previous.caseState,
              stage: 'choose_evidence',
              pendingInterpretationRef: null,
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
          objectiveProgressRef.current = resumedMoves; bestTargetMatchLengthRef.current = 0; nodeStartScoreRef.current = 0;
          setRunState(previous => previous.caseState ? { ...previous, currentNodeIndex: step.nodeIndex, caseState: {
            ...previous.caseState,
            stage: 'board',
            pendingInterpretationRef: null,
            offeredMethods: null,
            selectedMethods: flowRef.current.nodes.map(node => node.chosenMethod ?? null),
            objectiveProgress: resumedMoves,
            objectiveTarget: publicCase.version === 3 ? 6 : previous.expedition?.nodes[step.nodeIndex]?.objectiveTarget ?? 0,
            bestTargetMatchLength: 0,
          } } : previous);
          emitBoardTracked(payload, publicCase, step.nodeIndex, resumedMoves, 0);
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
          const observation = await requestObservation(runIdRef.current, step.nodeIndex);
          if (!observation) throw new Error('Earned observation was not issued');
          flowRef.current = { ...flowRef.current, issuedRefs: [...flowRef.current.issuedRefs, observation.ref] };
          setRunState(previous => previous.caseState ? { ...previous, caseState: addObservation(previous.caseState, observation) } : previous);
          continue;
        }
        // signature-attempt: exactly one try; an unavailable response settles it permanently.
        const signature = await requestObservation(runIdRef.current, 3);
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
    cancelObjectiveCheckpoint();
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
  }, [cancelObjectiveCheckpoint]);

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
      flowRef.current = createFlowState(created.casePublic.version);
      const caseState = createCaseState(created.casePublic, profiles);
      setRunState(previous => ({ ...previous, runId: created.runId, phase: 'mystery', caseState, currentNodeIndex: 0 }));
      await runFlow();
    } catch (error) {
      console.error('[ExpeditionContext] Failed to start expedition:', error);
      toast.error('Could not start the expedition case.');
    } finally { startingRef.current = false; }
  }, [runFlow]);

  const handleNodeAdvanceRequested = useCallback(async (event: EventPayloads['node-advance-requested']) => {
    const current = stateRef.current;
    if (current.phase !== 'mystery' || current.caseState?.stage !== 'board' || event.nodeIndex !== current.currentNodeIndex || resolvingNodeRef.current !== null) return;
    const runId = runIdRef.current;
    if (!runId) { toast.error('This expedition has no durable run session.'); return; }
    cancelObjectiveCheckpoint();
    resolvingNodeRef.current = event.nodeIndex; setBoardOpacity(1);
    try {
      const earnedScore = Math.max(0, (hudRef.current?.score ?? 0) - nodeStartScoreRef.current);
      const complete = await fetch(`/api/runs/${runId}/nodes/${event.nodeIndex + 1}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scoreEarned: earnedScore, movesUsed: hudRef.current?.movesUsed ?? 0, objectiveProgress: objectiveProgressRef.current, bestTargetMatchLength: bestTargetMatchLengthRef.current }) });
      if (!complete.ok) throw new Error(`Node completion failed (${complete.status})`);
      const completion = await complete.json() as { objectiveMet?: boolean; bestTargetMatchLength?: number };
      routeRef.current = getRoutePolylineThroughWaypointSlot(plannedRouteRef.current, event.nodeIndex);
      const objectiveMet = completion.objectiveMet ?? event.reason === 'victory';
      flowRef.current = {
        ...flowRef.current,
        nodes: flowRef.current.nodes.map((node, index) => index === event.nodeIndex ? { ...node, completed: true, objectiveMet } : node),
      };
      setRunState(previous => {
        const next = { ...previous, bankedScore: previous.bankedScore + earnedScore };
        if (!objectiveMet && next.caseState) {
          next.caseState = { ...next.caseState, missedEvidenceNodeIndexes: [...next.caseState.missedEvidenceNodeIndexes, event.nodeIndex] };
        }
        if (next.caseState) next.caseState = {
          ...next.caseState,
          nodeOutcomes: next.caseState.nodeOutcomes.map((outcome, index) => index === event.nodeIndex ? (objectiveMet ? 'met' : 'failed') : outcome),
          bestTargetMatchLength: completion.bestTargetMatchLength ?? next.caseState.bestTargetMatchLength,
        };
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
  }, [cancelObjectiveCheckpoint, emitNodeCompleteIfLive, hudRef, runFlow]);

  const handleCommitInterpretation = useCallback(async (obsRef: string, predictedIds: number[]) => {
    const runId = runIdRef.current; const current = stateRef.current; const caseState = current.caseState;
    if (!runId || !caseState || caseState.pendingInterpretationRef !== obsRef) return false;
    try {
      const observation = caseState.observations.find(item => item.ref === obsRef);
      if (!observation?.traitCategory || !observation.compareTag) throw new Error('Observation interpretation fields unavailable');
      const eliminatedIds = new Set(caseState.eliminatedIds);
      const live = caseState.profiles.filter(profile => !eliminatedIds.has(profile.speciesId));
      const actualIds = computeActualEliminatedIds(caseState.profiles, caseState.eliminatedIds, observation.traitCategory, observation.compareTag);
      const liveIds = new Set(live.map(profile => profile.speciesId));
      const predicted = [...new Set(predictedIds.filter(id => liveIds.has(id)))].sort((a, b) => a - b);
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

  const handleChooseMethod = useCallback(async (method: MethodType) => {
    const runId = runIdRef.current;
    const current = stateRef.current;
    const nodeIndex = current.currentNodeIndex;
    if (!runId || current.caseState?.version !== 2 || current.caseState.stage !== 'choose_method'
      || !current.caseState.offeredMethods?.includes(method)) return false;
    try {
      const response = await fetch(`/api/runs/${runId}/research-choice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      });
      if (!response.ok) throw new Error(`Research choice failed (${response.status})`);
      const result = await response.json() as { nodeIndex: number; method: MethodType };
      if (result.nodeIndex !== nodeIndex || result.method !== method) throw new Error('Research choice response mismatch');
      flowRef.current = {
        ...flowRef.current,
        nodes: flowRef.current.nodes.map((node, index) => index === nodeIndex ? { ...node, chosenMethod: method } : node),
      };
      setRunState(previous => previous.caseState ? {
        ...previous,
        caseState: { ...previous.caseState, selectedMethods: flowRef.current.nodes.map(node => node.chosenMethod), offeredMethods: null },
      } : previous);
      await runFlow();
      return true;
    } catch (error) {
      console.error('[ExpeditionContext] Research choice failed:', error);
      toast.error('Method choice not saved — try again.');
      return false;
    }
  }, [runFlow]);

  const handleChooseEvidenceFamily = useCallback(async (family: EvidenceFamily) => {
    const runId = runIdRef.current;
    const current = stateRef.current;
    const nodeIndex = current.currentNodeIndex;
    if (!runId || current.caseState?.version !== 3 || current.caseState.stage !== 'choose_evidence'
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
        traitPhrase?: string;
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
          ? { ...node, completed: true, objectiveMet: true, chosenFamily: family, segmentMovesUsed: 6 }
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
          familyTraits: { ...previous.caseState.familyTraits, [family]: result.traitPhrase ?? observation.traitPhrase ?? '' },
          candidateFamilyTraits: mergeCandidateFamilyTraits(previous.caseState.candidateFamilyTraits, family, observation.candidateTraitPhrases),
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

  const handleGuess = useCallback(async (speciesId: number, evidenceRefs: string[]) => {
    const runId = runIdRef.current;
    const activeCase = stateRef.current.caseState;
    if (!runId || activeCase?.stage !== 'guess') return false;
    try {
      const response = await fetch(`/api/runs/${runId}/guess`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(activeCase.version === 3 ? { speciesId } : { speciesId, evidenceRefs }) });
      if (!response.ok) { toast.error('Guess could not be checked.'); return null; }
      const result = await response.json() as { correct: boolean; contrastiveFeedback: ComparisonResult[]; finalScore?: number; citedEvidenceRefs?: string[] };
      if (result.correct) {
        // speciesId is the public candidate the player just selected — safe to keep client-side.
        setRunState(previous => previous.caseState ? { ...previous, phase: 'complete', finalScore: result.finalScore ?? null, completionReason: 'captured', resolvedSpeciesId: speciesId, caseState: { ...previous.caseState, guessResult: 'correct', lastFeedback: null, citedObservationRefs: result.citedEvidenceRefs ?? evidenceRefs } } : previous);
        window.dispatchEvent(new CustomEvent('species-card-progress-updated', { detail: { speciesId } }));
      } else {
        setRunState(previous => previous.caseState ? { ...previous, caseState: { ...previous.caseState, guessResult: 'wrong', lastFeedback: result.contrastiveFeedback, citedObservationRefs: result.citedEvidenceRefs ?? evidenceRefs } } : previous);
      }
      return result.correct;
    } catch (error) {
      console.error('[ExpeditionContext] Guess failed:', error);
      toast.error('Guess could not be checked.');
      return null;
    }
  }, []);

  const handleObjective = useCallback((event: EventPayloads['node-objective-updated']) => {
    objectiveProgressRef.current = event.progress;
    bestTargetMatchLengthRef.current = event.bestTargetMatchLength;
    cancelObjectiveCheckpoint();

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
        bestTargetMatchLength: event.bestTargetMatchLength,
      },
    } : previous);

    if (current.caseState.version === 3) return;

    const nodeIndex = current.currentNodeIndex;
    objectiveCheckpointTimerRef.current = window.setTimeout(() => {
      objectiveCheckpointTimerRef.current = null;
      const latest = stateRef.current;
      if (runIdRef.current !== runId || latest.currentNodeIndex !== nodeIndex
        || latest.phase !== 'mystery' || latest.caseState?.stage !== 'board') return;

      void fetch(`/api/runs/${runId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentNodeIndex: nodeIndex, objectiveProgress: objectiveProgressRef.current, bestTargetMatchLength: bestTargetMatchLengthRef.current }),
      }).then(response => {
        if (!response.ok) throw new Error(`Objective checkpoint failed (${response.status})`);
      }).catch(error => console.error('[ExpeditionContext] Objective checkpoint failed:', error));
    }, 1500);
  }, [cancelObjectiveCheckpoint]);

  const handleEvidenceMoveResolved = useCallback(async (event: EventPayloads['evidence-move-resolved']) => {
    const current = stateRef.current;
    const runId = runIdRef.current;
    if (!runId || current.phase !== 'mystery' || current.caseState?.version !== 3
      || current.caseState.stage !== 'board' || current.currentNodeIndex !== event.nodeIndex) return;
    try {
      const response = await fetch(`/api/runs/${runId}/evidence-progress`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
      if (!response.ok) throw new Error(`Evidence progress failed (${response.status})`);
      const result = await response.json() as {
        segmentMovesUsed: number;
        evidenceCharges: CaseState['evidenceCharges'];
        offeredFamilies: EvidenceFamily[];
        hintLines?: string[];
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
          hintFeed: [
            ...previous.caseState.hintFeed,
            ...(result.hintLines ?? []).map((text, index) => ({ id: `${event.nodeIndex}-${event.moveNumber}-e-${index}`, text, kind: 'evidence' as const, family: event.directMatchFamilies[index] })),
            ...(result.cascadeHintLine ? [{ id: `${event.nodeIndex}-${event.moveNumber}-c`, text: result.cascadeHintLine, kind: 'cascade' as const }] : []),
          ].slice(-32),
        },
      } : previous);
      EventBus.emit('evidence-progress-committed', { nodeIndex: event.nodeIndex, moveNumber: event.moveNumber });
      if (result.segmentMovesUsed >= 6) await runFlow();
    } catch (error) {
      console.error('[ExpeditionContext] Evidence progress failed:', error);
      toast.error('Move not saved — resume this expedition to retry safely.');
    }
  }, [runFlow]);

  const handleFieldNote = useCallback((event: EventPayloads['field-note-dripped']) => {
    const current = stateRef.current;
    if (current.phase !== 'mystery' || current.caseState?.stage !== 'board') return;
    setRunState(previous => previous.caseState ? {
      ...previous,
      // Defensive cap: the scene already limits drips per node.
      caseState: { ...previous.caseState, fieldNotes: [...previous.caseState.fieldNotes, event].slice(-12) },
    } : previous);
  }, []);

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
      const interpretations = projection.checkpoint.reasoningEvents;
      const observations = projection.observations.map(item => ({ ...item, traitCategory: item.traitCategory as EarnedObservation['traitCategory'], issuedAtMs: Date.now() }));
      const projectedNodeIndex = Math.max(0, Math.min(2, (projection.run.nodeIndexCurrent ?? 1) - 1));
      const projectedNode = projection.nodes.find(node => node.nodeOrder === projectedNodeIndex + 1);
      const baseCase: CaseState = {
        ...createCaseState(projection.casePublic!, profiles),
        observations, interpretations,
        eliminatedIds: [...new Set([
          ...interpretations.flatMap(item => item.actualEliminatedIds),
          ...observations.flatMap(item => item.actualEliminatedIds ?? []),
        ])],
        selectedMethods: projection.nodes.map(node => node.method ?? null),
        citedObservationRefs: projection.checkpoint.citedEvidenceRefs,
        evidenceCharges: projectedNode?.evidenceCharges ?? createEmptyEvidenceCharges(),
        carriedCharges: projectedNode?.carriedCharges ?? createEmptyEvidenceCharges(),
        offeredFamilies: projectedNode?.offeredFamilies ?? [],
        selectedFamilies: projectedNode?.selectedFamilies ?? observations.flatMap(item => item.family ? [item.family] : []),
        travelEntry: projectedNode?.travelEntry ?? null,
        eliminationReasons: Object.assign({}, ...observations.map(item => item.eliminationReasons ?? {})),
        familyTraits: Object.fromEntries(observations.flatMap(item => item.family && item.traitPhrase ? [[item.family, item.traitPhrase]] : [])),
        candidateFamilyTraits: observations.reduce((traits, item) => item.family
          ? mergeCandidateFamilyTraits(traits, item.family, item.candidateTraitPhrases)
          : traits, {} as CaseState['candidateFamilyTraits']),
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
        selectedMethods: decision.flow.nodes.map(node => node.chosenMethod ?? null),
        offeredMethods: step.kind === 'choose_method' && projection.casePublic?.version === 2
          ? getMethodOfferAtPath(projection.casePublic.offerTree, decision.flow.nodes.slice(0, step.nodeIndex).flatMap(node => node.chosenMethod ? [node.chosenMethod] : []))
          : null,
        objectiveProgress: projection.nodes.find(node => node.nodeOrder === nodeIndex + 1)?.objectiveProgress ?? 0,
        objectiveTarget: projection.nodes.find(node => node.nodeOrder === nodeIndex + 1)?.objectiveTarget ?? 0,
        bestTargetMatchLength: projection.nodes.find(node => node.nodeOrder === nodeIndex + 1)?.bestTargetMatchLength ?? 0,
        nodeOutcomes: decision.flow.nodes.map(node => node.completed ? (node.objectiveMet ? 'met' : 'failed') : null),
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
        const bestTargetMatchLength = projection.nodes.find(node => node.nodeOrder === step.nodeIndex + 1)?.bestTargetMatchLength ?? 0;
        objectiveProgressRef.current = objectiveProgress;
        bestTargetMatchLengthRef.current = bestTargetMatchLength;
        const checkpoint = projection.nodes.find(node => node.nodeOrder === step.nodeIndex + 1)?.boardCheckpoint;
        window.setTimeout(() => emitBoardTracked(payload, projection.casePublic!, step.nodeIndex, objectiveProgress, bestTargetMatchLength, checkpoint), 100);
      } else if (step.kind === 'recover-observation' || step.kind === 'signature-attempt') {
        void runFlow();
      }
      toast('Expedition case resumed', { duration: 1800 }); return true;
    } catch (error) { console.error('[ExpeditionContext] Resume failed:', error); toast.error('Could not resume that expedition'); return false; }
  }, [emitBoardTracked, resetLocal, runFlow]);

  useEffect(() => {
    EventBus.on('expedition-data-ready', handleExpeditionDataReady); EventBus.on('expedition-start', handleExpeditionStart);
    EventBus.on('node-advance-requested', handleNodeAdvanceRequested);
    EventBus.on('node-objective-updated', handleObjective); EventBus.on('game-reset', resetLocal);
    EventBus.on('field-note-dripped', handleFieldNote);
    EventBus.on('evidence-move-resolved', handleEvidenceMoveResolved);
    return () => { cancelObjectiveCheckpoint(); EventBus.off('expedition-data-ready', handleExpeditionDataReady); EventBus.off('expedition-start', handleExpeditionStart); EventBus.off('node-advance-requested', handleNodeAdvanceRequested); EventBus.off('node-objective-updated', handleObjective); EventBus.off('game-reset', resetLocal); EventBus.off('field-note-dripped', handleFieldNote); EventBus.off('evidence-move-resolved', handleEvidenceMoveResolved); };
  }, [cancelObjectiveCheckpoint, handleExpeditionDataReady, handleExpeditionStart, handleNodeAdvanceRequested, handleObjective, handleFieldNote, handleEvidenceMoveResolved, resetLocal]);

  const showSpeciesList = useCallback((speciesId: number) => onShowSpeciesList.current?.(speciesId), []);
  const value = useMemo(() => ({ runState, boardOpacity, handleRunResume, handleRunReset, handleCommitInterpretation, handleChooseMethod, handleChooseEvidenceFamily, handleGuess, showSpeciesList, onShowSpeciesList }), [runState, boardOpacity, handleRunResume, handleRunReset, handleCommitInterpretation, handleChooseMethod, handleChooseEvidenceFamily, handleGuess, showSpeciesList]);
  return <ExpeditionContext.Provider value={value}>{children}</ExpeditionContext.Provider>;
}

function createCaseState(publicCase: PublicCaseSnapshot, profiles: DeductionProfile[]): CaseState { return {
  version: publicCase.version,
  mapView: publicCase.version === 3 ? publicCase.mapView : null,
  stage: publicCase.version === 2 ? 'choose_method' : 'board',
  candidateIds: publicCase.candidateIds,
  profiles,
  observations: [],
  interpretations: [],
  eliminatedIds: [],
  pendingInterpretationRef: null,
  missedEvidenceNodeIndexes: [],
  guessResult: null,
  lastFeedback: null,
  offeredMethods: publicCase.version === 2 ? publicCase.offerTree.offered : null,
  selectedMethods: publicCase.version === 1 ? [...publicCase.nodeMethods] : [null, null, null],
  objectiveProgress: 0,
  objectiveTarget: 0,
  bestTargetMatchLength: 0,
  nodeOutcomes: [null, null, null],
  citedObservationRefs: [],
  fieldNotes: [],
  evidenceCharges: createEmptyEvidenceCharges(),
  carriedCharges: createEmptyEvidenceCharges(),
  offeredFamilies: [],
  selectedFamilies: [],
  travelEntry: null,
  hintFeed: [],
  eliminationReasons: {},
  familyTraits: {},
  candidateFamilyTraits: {},
}; }
function mergeCandidateFamilyTraits(
  current: CaseState['candidateFamilyTraits'],
  family: EvidenceFamily,
  phrases?: Record<string, string>,
): CaseState['candidateFamilyTraits'] {
  if (!phrases) return current;
  return Object.fromEntries(Object.entries({ ...current, ...Object.fromEntries(Object.entries(phrases).map(([id, phrase]) => [
    id,
    { ...(current[id] ?? {}), [family]: phrase },
  ])) }));
}
function addObservation(state: CaseState, observation: EarnedObservation): CaseState { return state.observations.some(item => item.ref === observation.ref) ? state : { ...state, observations: [...state.observations, observation], pendingInterpretationRef: observation.ref }; }
function sameIds(left: number[], right: number[]) { return left.length === right.length && left.every((id, index) => id === right[index]); }
/** Full rows for the six candidates (field-note drip pool). Non-fatal: on failure drips just fall back to location species. */
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
async function requestObservation(runId: string | null, nodeIndex: number): Promise<EarnedObservation | null> {
  if (!runId) return null;
  const response = await fetch(`/api/runs/${runId}/observations/`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nodeIndex }),
  });
  if (!response.ok) throw new Error(`Observation request failed (${response.status})`);
  const result = await response.json() as Omit<EarnedObservation, 'issuedAtMs'> | { available: false };
  if ('available' in result) return null;
  return { ...result, issuedAtMs: Date.now() };
}

function emitBoard(payload: EventPayloads['expedition-data-ready'], publicCase: PublicCaseSnapshot, nodeIndex: number, objectiveProgress: number, bestTargetMatchLength: number, method?: MethodType, candidateSpecies: Species[] = [], selectedFamilies: EvidenceFamily[] = [], boardCheckpoint?: EventPayloads['map-location-selected']['boardCheckpoint']) {
  const node = payload.expedition.nodes[nodeIndex]; if (!node) throw new Error(`Missing generated node ${nodeIndex}`);
  const methodGem = method ? METHOD_GEM_MAP[method] : undefined;
  const boardConfig = publicCase.version === 3
    ? buildBoardSpawnConfigForNode(node.node_type, undefined, getAllowedEvidenceGemTypes(selectedFamilies))
    : buildBoardSpawnConfigForNode(node.node_type, methodGem ? { [methodGem]: 3 } : undefined);
  const location = node.waypoint ?? { lon: payload.lon, lat: payload.lat };
  EventBus.emit('map-location-selected', { lon: location.lon, lat: location.lat, ecoregionId: payload.ecoregionId ?? null, species: payload.species, rasterHabitats: payload.rasterHabitats, habitats: payload.habitats, difficulty: node.difficulty, moveBudget: publicCase.version === 3 ? 6 : node.moveBudget, obstacles: node.obstacles, obstacleFamily: node.obstacleFamily, objectiveGem: methodGem, activeAffinities: payload.expedition.activeAffinities, objectiveTarget: publicCase.version === 3 ? 6 : node.objectiveTarget, objectiveProgress, bestTargetMatchLength, nodeIndex, nodeType: node.node_type, events: node.events, boardSeed: publicCase.boardSeeds[nodeIndex], boardContext: buildNodeBoardContext({ width: GRID_COLS, height: GRID_ROWS, obstacles: node.obstacles, nodeIndex }), boardConfig, caseVersion: publicCase.version, candidateIds: publicCase.candidateIds, candidateSpecies, boardCheckpoint });
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
