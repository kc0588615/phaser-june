// caseFlow — pure decision layer for the Plan 013 client mystery loop.
//
// The live flow (ExpeditionContext) and resume reconciliation both call
// nextFlowStep, so board/interpret/signature/guess sequencing has exactly one
// implementation and it is unit-testable without React or the network.
// The server stays authoritative: every step here only decides which durable
// call or UI beat comes next; verdicts and issuance still come from the API.
import type { ClientRunProjection } from '@/lib/runProjection';
import type { MethodType } from '@/expedition/domain';
import type { EvidenceFamily } from '@/expedition/evidenceFamilies';

/** Sub-state of run phase 'mystery'. Only a correct server /guess verdict leaves 'guess'. */
export type CaseStage = 'choose_method' | 'choose_evidence' | 'board' | 'interpreting' | 'guess';

export interface FlowNode {
  completed: boolean;
  /** objectiveProgress >= objectiveTarget on the completed node row. */
  objectiveMet: boolean;
  chosenMethod: MethodType | null;
  chosenFamily?: EvidenceFamily | null;
  segmentMovesUsed?: number;
}

export interface CaseFlowState {
  version: 1 | 2 | 3;
  /** Exactly three route nodes, index = client nodeIndex (DB node_order - 1). */
  nodes: FlowNode[];
  /** Refs of issued observations (obs-0..obs-3). */
  issuedRefs: string[];
  /** Refs whose interpretation commit is durable server-side. */
  committedRefs: string[];
  /** True once the single obs-3 attempt reports unavailable (no_signature / not_eligible). */
  signatureSettled: boolean;
}

export type FlowStep =
  | { kind: 'choose_method'; nodeIndex: number }
  | { kind: 'choose_evidence'; nodeIndex: number }
  | { kind: 'board'; nodeIndex: number }
  | { kind: 'interpret'; ref: string }
  /** Node succeeded but its observation was never issued (crash after /complete). */
  | { kind: 'recover-observation'; nodeIndex: number }
  /** Try POST /observations {nodeIndex: 3} exactly once; unavailable settles it. */
  | { kind: 'signature-attempt' }
  | { kind: 'guess' };

const ALL_REFS = ['obs-0', 'obs-1', 'obs-2', 'obs-3'] as const;

export function createFlowState(version: 1 | 2 | 3 = 1): CaseFlowState {
  return {
    version,
    nodes: [
      { completed: false, objectiveMet: false, chosenMethod: null, chosenFamily: null, segmentMovesUsed: 0 },
      { completed: false, objectiveMet: false, chosenMethod: null, chosenFamily: null, segmentMovesUsed: 0 },
      { completed: false, objectiveMet: false, chosenMethod: null, chosenFamily: null, segmentMovesUsed: 0 },
    ],
    issuedRefs: [],
    committedRefs: [],
    signatureSettled: false,
  };
}

export function nextFlowStep(state: CaseFlowState): FlowStep {
  if (state.version === 3) {
    for (let nodeIndex = 0; nodeIndex < 3; nodeIndex += 1) {
      const node = state.nodes[nodeIndex];
      if (!node?.completed) {
        return (node.segmentMovesUsed ?? 0) >= 6 && !node.chosenFamily
          ? { kind: 'choose_evidence', nodeIndex }
          : { kind: 'board', nodeIndex };
      }
    }
    return { kind: 'guess' };
  }
  const issued = new Set(state.issuedRefs);
  const committed = new Set(state.committedRefs);
  // An issued-but-uncommitted observation is always the next beat (earliest first):
  // the server gates obs-3 and /guess on persisted interpretations.
  for (const ref of ALL_REFS) {
    if (issued.has(ref) && !committed.has(ref)) return { kind: 'interpret', ref };
  }
  for (let nodeIndex = 0; nodeIndex < 3; nodeIndex++) {
    const node = state.nodes[nodeIndex];
    if (!node?.completed) {
      if (state.version === 2 && !node.chosenMethod) return { kind: 'choose_method', nodeIndex };
      return { kind: 'board', nodeIndex };
    }
    if (node.objectiveMet && !issued.has(`obs-${nodeIndex}`)) {
      return { kind: 'recover-observation', nodeIndex };
    }
  }
  if (!issued.has('obs-3') && !state.signatureSettled) return { kind: 'signature-attempt' };
  return { kind: 'guess' };
}

export function stageForStep(step: FlowStep): CaseStage {
  if (step.kind === 'choose_method') return 'choose_method';
  if (step.kind === 'choose_evidence') return 'choose_evidence';
  if (step.kind === 'board') return 'board';
  if (step.kind === 'guess') return 'guess';
  // interpret / recover-observation / signature-attempt are all beats of the
  // interpreting stage; the finished board stays visible but inert.
  return 'interpreting';
}

/** Which node the HUD should call current while a step is active. */
export function currentNodeIndexForStep(step: FlowStep): number {
  if (step.kind === 'choose_method' || step.kind === 'choose_evidence' || step.kind === 'board' || step.kind === 'recover-observation') return step.nodeIndex;
  if (step.kind === 'interpret') {
    const nodeIndex = Number(step.ref.slice(4));
    return Math.min(Number.isNaN(nodeIndex) ? 2 : nodeIndex, 2);
  }
  return 2;
}

export type ResumeDecision =
  | { kind: 'legacy' }
  | { kind: 'completed'; finalScore: number | null }
  | { kind: 'active'; flow: CaseFlowState; step: FlowStep };

/**
 * Maps a server projection onto the same flow machine the live loop uses.
 * Completed runs never re-enter the flow; everything else resumes at whatever
 * step the durable state says comes next.
 */
export function reconcileProjection(projection: ClientRunProjection): ResumeDecision {
  if (projection.legacy || !projection.casePublic) return { kind: 'legacy' };
  if (projection.run.status === 'completed') {
    return {
      kind: 'completed',
      finalScore: projection.memory?.finalScore
        ?? projection.memory?.deductionSummary?.finalScore
        ?? projection.run.scoreTotal
        ?? null,
    };
  }
  const sortedNodes = [...projection.nodes].sort((a, b) => a.nodeOrder - b.nodeOrder);
  const flow: CaseFlowState = {
    version: projection.casePublic.version,
    nodes: [0, 1, 2].map(nodeIndex => {
      const node = sortedNodes[nodeIndex];
      return {
        completed: node?.nodeStatus === 'completed',
        objectiveMet: !!node && (node.objectiveProgress ?? 0) >= (node.objectiveTarget ?? 0),
        chosenMethod: node?.method ?? (projection.casePublic?.version === 1 ? projection.casePublic.nodeMethods[nodeIndex] : null),
        chosenFamily: node?.selectedFamily ?? null,
        segmentMovesUsed: node?.movesUsed ?? 0,
      };
    }),
    issuedRefs: projection.observations.map(observation => observation.ref),
    committedRefs: projection.checkpoint.reasoningEvents.map(event => event.obsRef),
    signatureSettled: false,
  };
  return { kind: 'active', flow, step: nextFlowStep(flow) };
}

/** Completed nodes whose objective failed — the dossier gaps shown to the player. */
export function missedEvidenceNodeIndexes(flow: CaseFlowState): number[] {
  return flow.nodes.flatMap((node, nodeIndex) => node.completed && !node.objectiveMet ? [nodeIndex] : []);
}
