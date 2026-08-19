import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createFlowState,
  currentNodeIndexForStep,
  nextFlowStep,
  reconcileProjection,
  stageForStep,
  type CaseFlowState,
} from '@/expedition/caseFlow';
import type { ClientRunProjection } from '@/lib/runProjection';

const DONE = { completed: true, chosenFamily: 'body' as const, segmentMovesUsed: 6 };
const OPEN = { completed: false, chosenFamily: null, segmentMovesUsed: 0 };

function flow(nodes: CaseFlowState['nodes']): CaseFlowState {
  return { nodes };
}

function projection(overrides: Partial<ClientRunProjection> = {}): ClientRunProjection {
  return {
    run: { id: 'run-v3', status: 'active', scoreTotal: 100 },
    casePublic: {
      version: 3,
      candidateIds: [1, 2, 3, 4, 5, 6],
      boardSeeds: [10, 20, 30],
      mapView: {
        bounds: [-2, -2, 2, 2],
        route: [0, 1, 2].map(nodeIndex => ({
          nodeIndex,
          lon: nodeIndex - 1,
          lat: nodeIndex - 1,
          biome: 'Forest',
          nearestFeature: `Site ${nodeIndex + 1}`,
        })) as NonNullable<ClientRunProjection['casePublic']>['mapView']['route'],
      },
    },
    checkpoint: {
      activeAffinities: [], habitats: [], rasterHabitats: [], featureFingerprints: [],
      routePolyline: [],
      expeditionSnapshot: {
        protectedAreas: [], availableAffinities: [], primaryNodeFamily: '', primaryVariant: '',
        modifierNodes: [], signals: {}, waypoints: [], waypointRadiusKm: null, nearestRiverDistM: null,
      },
    },
    observations: [],
    nodes: [],
    memory: null,
    legacy: false,
    ...overrides,
  };
}

describe('v3 case flow', () => {
  it('starts on the first board', () => {
    assert.deepEqual(nextFlowStep(createFlowState()), { kind: 'board', nodeIndex: 0 });
  });

  it('offers evidence after six moves', () => {
    const state = createFlowState();
    state.nodes[0].segmentMovesUsed = 6;
    assert.deepEqual(nextFlowStep(state), { kind: 'choose_evidence', nodeIndex: 0 });
  });

  it('advances after applying evidence and guesses after all three sites', () => {
    assert.deepEqual(nextFlowStep(flow([DONE, OPEN, OPEN])), { kind: 'board', nodeIndex: 1 });
    assert.deepEqual(nextFlowStep(flow([DONE, DONE, DONE])), { kind: 'guess' });
  });

  it('maps steps to UI stages and current sites', () => {
    assert.equal(stageForStep({ kind: 'board', nodeIndex: 1 }), 'board');
    assert.equal(stageForStep({ kind: 'choose_evidence', nodeIndex: 2 }), 'choose_evidence');
    assert.equal(stageForStep({ kind: 'guess' }), 'guess');
    assert.equal(currentNodeIndexForStep({ kind: 'board', nodeIndex: 1 }), 1);
    assert.equal(currentNodeIndexForStep({ kind: 'guess' }), 2);
  });
});

describe('v3 resume reconciliation', () => {
  it('rejects unparseable legacy projections', () => {
    assert.deepEqual(reconcileProjection(projection({ legacy: true, casePublic: null })), { kind: 'legacy' });
  });

  it('returns completed score without re-entering flow', () => {
    assert.deepEqual(reconcileProjection(projection({
      run: { status: 'completed', scoreTotal: 120 },
      memory: { routePolyline: [], routeBounds: null, nodes: [], gisFeaturesNearby: [], deductionSummary: null, finalScore: 140 },
    })), { kind: 'completed', finalScore: 140 });
  });

  it('resumes a six-move node at evidence choice', () => {
    const decision = reconcileProjection(projection({
      nodes: [
        { id: 'node-1', nodeOrder: 1, nodeType: 'site', nodeStatus: 'active', movesUsed: 6, obstacles: [], events: [] },
        { id: 'node-2', nodeOrder: 2, nodeType: 'site', nodeStatus: 'locked', movesUsed: 0, obstacles: [], events: [] },
        { id: 'node-3', nodeOrder: 3, nodeType: 'site', nodeStatus: 'locked', movesUsed: 0, obstacles: [], events: [] },
      ],
    }));
    assert.deepEqual(decision.kind === 'active' && decision.step, { kind: 'choose_evidence', nodeIndex: 0 });
  });
});
