// caseFlow — pure decision layer for the client mystery loop (v3 evidence runs).
//
// The live flow (ExpeditionContext) and resume reconciliation both call
// nextFlowStep, so board/evidence/guess sequencing has exactly one
// implementation and it is unit-testable without React or the network.
// The server stays authoritative: every step here only decides which durable
// call or UI beat comes next; verdicts and issuance still come from the API.
import type { ClientRunProjection } from '@/lib/runProjection';
import type { EvidenceFamily } from '@/expedition/evidenceFamilies';

/** Sub-state of run phase 'mystery'. Only a correct server diagnosis leaves 'guess'. */
export type CaseStage = 'incident' | 'choose_evidence' | 'board' | 'interpreting' | 'guess';

export interface FlowNode {
  completed: boolean;
  chosenFamily: EvidenceFamily | null;
  segmentMovesUsed: number;
}

export interface CaseFlowState {
  /** Exactly three route nodes, index = client nodeIndex (DB node_order - 1). */
  nodes: FlowNode[];
}

export type FlowStep =
  | { kind: 'choose_evidence'; nodeIndex: number }
  | { kind: 'board'; nodeIndex: number }
  | { kind: 'guess' };

export function createFlowState(): CaseFlowState {
  return {
    nodes: [
      { completed: false, chosenFamily: null, segmentMovesUsed: 0 },
      { completed: false, chosenFamily: null, segmentMovesUsed: 0 },
      { completed: false, chosenFamily: null, segmentMovesUsed: 0 },
    ],
  };
}

export function nextFlowStep(state: CaseFlowState): FlowStep {
  for (let nodeIndex = 0; nodeIndex < 3; nodeIndex += 1) {
    const node = state.nodes[nodeIndex];
    if (!node?.completed) {
      return node.segmentMovesUsed >= 6 && !node.chosenFamily
        ? { kind: 'choose_evidence', nodeIndex }
        : { kind: 'board', nodeIndex };
    }
  }
  return { kind: 'guess' };
}

export function stageForStep(step: FlowStep): CaseStage {
  if (step.kind === 'choose_evidence') return 'choose_evidence';
  if (step.kind === 'board') return 'board';
  return 'guess';
}

/** Which node the HUD should call current while a step is active. */
export function currentNodeIndexForStep(step: FlowStep): number {
  return step.kind === 'guess' ? 2 : step.nodeIndex;
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
        ?? projection.run.scoreTotal
        ?? null,
    };
  }
  const sortedNodes = [...projection.nodes].sort((a, b) => a.nodeOrder - b.nodeOrder);
  const flow: CaseFlowState = {
    nodes: [0, 1, 2].map(nodeIndex => {
      const node = sortedNodes[nodeIndex];
      return {
        completed: node?.nodeStatus === 'completed',
        chosenFamily: node?.selectedFamily ?? null,
        segmentMovesUsed: node?.movesUsed ?? 0,
      };
    }),
  };
  return { kind: 'active', flow, step: nextFlowStep(flow) };
}
