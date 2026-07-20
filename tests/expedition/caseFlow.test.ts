import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createFlowState,
  currentNodeIndexForStep,
  missedEvidenceNodeIndexes,
  nextFlowStep,
  reconcileProjection,
  stageForStep,
  type CaseFlowState,
} from '@/expedition/caseFlow';
import type { ClientRunProjection } from '@/lib/runProjection';

function flow(overrides: Partial<CaseFlowState>): CaseFlowState {
  return { ...createFlowState(), ...overrides };
}

const DONE = { completed: true, objectiveMet: true, chosenMethod: 'track' as const };
const MISSED = { completed: true, objectiveMet: false, chosenMethod: 'track' as const };
const OPEN = { completed: false, objectiveMet: false, chosenMethod: null };

describe('nextFlowStep', () => {
  it('starts a fresh run on board 0', () => {
    assert.deepEqual(nextFlowStep(createFlowState()), { kind: 'board', nodeIndex: 0 });
  });

  it('starts a fresh v2 run at method choice, then opens the chosen board', () => {
    const state = createFlowState(2);
    assert.deepEqual(nextFlowStep(state), { kind: 'choose_method', nodeIndex: 0 });
    state.nodes[0].chosenMethod = 'survey';
    assert.deepEqual(nextFlowStep(state), { kind: 'board', nodeIndex: 0 });
  });

  it('opens a v3 choice after six moves and guesses after three applied clues', () => {
    const state = createFlowState(3);
    assert.deepEqual(nextFlowStep(state), { kind: 'board', nodeIndex: 0 });
    state.nodes[0].segmentMovesUsed = 6;
    assert.deepEqual(nextFlowStep(state), { kind: 'choose_evidence', nodeIndex: 0 });
    state.nodes = state.nodes.map(node => ({ ...node, completed: true, objectiveMet: true, chosenFamily: 'body', segmentMovesUsed: 6 }));
    assert.deepEqual(nextFlowStep(state), { kind: 'guess' });
  });

  it('recovers the earned observation right after a victorious node completes', () => {
    const state = flow({ nodes: [DONE, OPEN, OPEN] });
    assert.deepEqual(nextFlowStep(state), { kind: 'recover-observation', nodeIndex: 0 });
  });

  it('interprets an issued observation before anything else', () => {
    const state = flow({ nodes: [DONE, OPEN, OPEN], issuedRefs: ['obs-0'] });
    assert.deepEqual(nextFlowStep(state), { kind: 'interpret', ref: 'obs-0' });
  });

  it('advances to the next board once the interpretation is durable', () => {
    const state = flow({ nodes: [DONE, OPEN, OPEN], issuedRefs: ['obs-0'], committedRefs: ['obs-0'] });
    assert.deepEqual(nextFlowStep(state), { kind: 'board', nodeIndex: 1 });
  });

  it('skips straight to the next board after a missed objective', () => {
    const state = flow({ nodes: [MISSED, OPEN, OPEN] });
    assert.deepEqual(nextFlowStep(state), { kind: 'board', nodeIndex: 1 });
  });

  it('interprets the earliest uncommitted observation first', () => {
    const state = flow({ nodes: [DONE, DONE, OPEN], issuedRefs: ['obs-0', 'obs-1'], committedRefs: ['obs-1'] });
    assert.deepEqual(nextFlowStep(state), { kind: 'interpret', ref: 'obs-0' });
  });

  it('attempts the signature exactly once after three resolved nodes', () => {
    const state = flow({ nodes: [DONE, DONE, DONE], issuedRefs: ['obs-0', 'obs-1', 'obs-2'], committedRefs: ['obs-0', 'obs-1', 'obs-2'] });
    assert.deepEqual(nextFlowStep(state), { kind: 'signature-attempt' });
  });

  it('goes to guess when the signature attempt reports unavailable', () => {
    const state = flow({ nodes: [DONE, DONE, DONE], issuedRefs: ['obs-0', 'obs-1', 'obs-2'], committedRefs: ['obs-0', 'obs-1', 'obs-2'], signatureSettled: true });
    assert.deepEqual(nextFlowStep(state), { kind: 'guess' });
  });

  it('requires interpreting an issued signature before guessing', () => {
    const state = flow({ nodes: [DONE, DONE, DONE], issuedRefs: ['obs-0', 'obs-1', 'obs-2', 'obs-3'], committedRefs: ['obs-0', 'obs-1', 'obs-2'] });
    assert.deepEqual(nextFlowStep(state), { kind: 'interpret', ref: 'obs-3' });
  });

  it('goes to guess once the committed signature closes the chain', () => {
    const state = flow({ nodes: [DONE, DONE, DONE], issuedRefs: ['obs-0', 'obs-1', 'obs-2', 'obs-3'], committedRefs: ['obs-0', 'obs-1', 'obs-2', 'obs-3'] });
    assert.deepEqual(nextFlowStep(state), { kind: 'guess' });
  });

  it('still attempts the signature after a missed node (server settles eligibility)', () => {
    const state = flow({ nodes: [DONE, MISSED, DONE], issuedRefs: ['obs-0', 'obs-2'], committedRefs: ['obs-0', 'obs-2'] });
    assert.deepEqual(nextFlowStep(state), { kind: 'signature-attempt' });
  });

  it('never recovers an observation for a failed objective', () => {
    const state = flow({ nodes: [MISSED, MISSED, MISSED], signatureSettled: true });
    assert.deepEqual(nextFlowStep(state), { kind: 'guess' });
  });
});

describe('stageForStep / currentNodeIndexForStep', () => {
  it('maps steps onto the three case stages', () => {
    assert.equal(stageForStep({ kind: 'board', nodeIndex: 1 }), 'board');
    assert.equal(stageForStep({ kind: 'choose_method', nodeIndex: 1 }), 'choose_method');
    assert.equal(stageForStep({ kind: 'interpret', ref: 'obs-1' }), 'interpreting');
    assert.equal(stageForStep({ kind: 'recover-observation', nodeIndex: 0 }), 'interpreting');
    assert.equal(stageForStep({ kind: 'signature-attempt' }), 'interpreting');
    assert.equal(stageForStep({ kind: 'guess' }), 'guess');
  });

  it('reports the node the HUD should call current', () => {
    assert.equal(currentNodeIndexForStep({ kind: 'board', nodeIndex: 2 }), 2);
    assert.equal(currentNodeIndexForStep({ kind: 'choose_method', nodeIndex: 1 }), 1);
    assert.equal(currentNodeIndexForStep({ kind: 'interpret', ref: 'obs-1' }), 1);
    assert.equal(currentNodeIndexForStep({ kind: 'interpret', ref: 'obs-3' }), 2);
    assert.equal(currentNodeIndexForStep({ kind: 'signature-attempt' }), 2);
    assert.equal(currentNodeIndexForStep({ kind: 'guess' }), 2);
  });
});

describe('missedEvidenceNodeIndexes', () => {
  it('lists only completed nodes that failed their objective', () => {
    assert.deepEqual(missedEvidenceNodeIndexes(flow({ nodes: [DONE, MISSED, OPEN] })), [1]);
  });
});

// ---------------------------------------------------------------------------
// reconcileProjection
// ---------------------------------------------------------------------------

function projection(overrides: {
  status?: string;
  legacy?: boolean;
  casePublic?: boolean;
  nodes?: Array<{ nodeOrder: number; nodeStatus: string; objectiveTarget?: number; objectiveProgress?: number }>;
  observations?: string[];
  committed?: string[];
  memoryFinalScore?: number;
  scoreTotal?: number;
}): ClientRunProjection {
  return {
    run: { status: overrides.status ?? 'active', scoreTotal: overrides.scoreTotal },
    casePublic: overrides.casePublic === false ? null : {
      version: 1,
      candidateIds: [1, 2, 3, 4, 5, 6],
      nodeMethods: ['track', 'observe', 'survey'],
      boardSeeds: [11, 22, 33],
    },
    checkpoint: {
      activeAffinities: [], habitats: [], rasterHabitats: [], featureFingerprints: [], routePolyline: [],
      reasoningEvents: (overrides.committed ?? []).map(obsRef => ({ obsRef, predictedEliminatedIds: [], actualEliminatedIds: [], correct: true, latencyMs: 1 })),
      expeditionSnapshot: {
        protectedAreas: [], actionBias: {}, availableAffinities: [], primaryNodeFamily: '', primaryVariant: '',
        modifierNodes: [], signals: {}, waypoints: [], waypointRadiusKm: null, nearestRiverDistM: null,
      },
    },
    observations: (overrides.observations ?? []).map(ref => ({ ref, method: 'track', observationText: 'x', isSignature: ref === 'obs-3' })),
    nodes: (overrides.nodes ?? []).map(node => ({ id: `n${node.nodeOrder}`, nodeType: 'ridge', obstacles: [], events: [], ...node })),
    memory: overrides.memoryFinalScore !== undefined ? { routePolyline: [], routeBounds: null, nodes: [], gisFeaturesNearby: [], deductionSummary: null, finalScore: overrides.memoryFinalScore } : null,
    legacy: overrides.legacy ?? false,
  } as unknown as ClientRunProjection;
}

describe('reconcileProjection', () => {
  it('flags legacy payloads', () => {
    assert.deepEqual(reconcileProjection(projection({ legacy: true })), { kind: 'legacy' });
    assert.deepEqual(reconcileProjection(projection({ casePublic: false })), { kind: 'legacy' });
  });

  it('never re-enters the flow for a completed run and preserves finalScore', () => {
    const decision = reconcileProjection(projection({ status: 'completed', memoryFinalScore: 910, scoreTotal: 640 }));
    assert.deepEqual(decision, { kind: 'completed', finalScore: 910 });
  });

  it('falls back to run scoreTotal when no memory is projected', () => {
    const decision = reconcileProjection(projection({ status: 'completed', scoreTotal: 640 }));
    assert.deepEqual(decision, { kind: 'completed', finalScore: 640 });
  });

  it('resumes a fresh run at board 0', () => {
    const decision = reconcileProjection(projection({
      nodes: [
        { nodeOrder: 1, nodeStatus: 'active', objectiveTarget: 6, objectiveProgress: 2 },
        { nodeOrder: 2, nodeStatus: 'locked', objectiveTarget: 6, objectiveProgress: 0 },
        { nodeOrder: 3, nodeStatus: 'locked', objectiveTarget: 6, objectiveProgress: 0 },
      ],
    }));
    assert.equal(decision.kind, 'active');
    assert.deepEqual(decision.kind === 'active' && decision.step, { kind: 'board', nodeIndex: 0 });
  });

  it('resumes onto the pending interpretation without emitting a board', () => {
    const decision = reconcileProjection(projection({
      nodes: [
        { nodeOrder: 1, nodeStatus: 'completed', objectiveTarget: 6, objectiveProgress: 6 },
        { nodeOrder: 2, nodeStatus: 'active', objectiveTarget: 6, objectiveProgress: 0 },
        { nodeOrder: 3, nodeStatus: 'locked', objectiveTarget: 6, objectiveProgress: 0 },
      ],
      observations: ['obs-0'],
    }));
    assert.deepEqual(decision.kind === 'active' && decision.step, { kind: 'interpret', ref: 'obs-0' });
  });

  it('recovers a lost issuance after a crash between /complete and /observations', () => {
    const decision = reconcileProjection(projection({
      nodes: [
        { nodeOrder: 1, nodeStatus: 'completed', objectiveTarget: 6, objectiveProgress: 6 },
        { nodeOrder: 2, nodeStatus: 'active', objectiveTarget: 6, objectiveProgress: 0 },
        { nodeOrder: 3, nodeStatus: 'locked', objectiveTarget: 6, objectiveProgress: 0 },
      ],
    }));
    assert.deepEqual(decision.kind === 'active' && decision.step, { kind: 'recover-observation', nodeIndex: 0 });
  });

  it('tries the signature once when all regular work is durable', () => {
    const decision = reconcileProjection(projection({
      status: 'deduction',
      nodes: [
        { nodeOrder: 1, nodeStatus: 'completed', objectiveTarget: 6, objectiveProgress: 6 },
        { nodeOrder: 2, nodeStatus: 'completed', objectiveTarget: 6, objectiveProgress: 6 },
        { nodeOrder: 3, nodeStatus: 'completed', objectiveTarget: 6, objectiveProgress: 6 },
      ],
      observations: ['obs-0', 'obs-1', 'obs-2'],
      committed: ['obs-0', 'obs-1', 'obs-2'],
    }));
    assert.deepEqual(decision.kind === 'active' && decision.step, { kind: 'signature-attempt' });
  });

  it('resumes an issued-but-uncommitted signature at its interpretation', () => {
    const decision = reconcileProjection(projection({
      status: 'deduction',
      nodes: [
        { nodeOrder: 1, nodeStatus: 'completed', objectiveTarget: 6, objectiveProgress: 6 },
        { nodeOrder: 2, nodeStatus: 'completed', objectiveTarget: 6, objectiveProgress: 6 },
        { nodeOrder: 3, nodeStatus: 'completed', objectiveTarget: 6, objectiveProgress: 6 },
      ],
      observations: ['obs-0', 'obs-1', 'obs-2', 'obs-3'],
      committed: ['obs-0', 'obs-1', 'obs-2'],
    }));
    assert.deepEqual(decision.kind === 'active' && decision.step, { kind: 'interpret', ref: 'obs-3' });
  });

  it('handles out-of-order node rows', () => {
    const decision = reconcileProjection(projection({
      nodes: [
        { nodeOrder: 3, nodeStatus: 'locked', objectiveTarget: 6, objectiveProgress: 0 },
        { nodeOrder: 1, nodeStatus: 'completed', objectiveTarget: 6, objectiveProgress: 2 },
        { nodeOrder: 2, nodeStatus: 'active', objectiveTarget: 6, objectiveProgress: 0 },
      ],
    }));
    // Node 1 completed but failed its objective (2 < 6): no recovery, straight to board 1.
    assert.deepEqual(decision.kind === 'active' && decision.step, { kind: 'board', nodeIndex: 1 });
    assert.deepEqual(decision.kind === 'active' && missedEvidenceNodeIndexes(decision.flow), [0]);
  });
});
