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
  return { incidentAcknowledged: true, nodes };
}

function projection(overrides: Omit<Partial<ClientRunProjection>, 'checkpoint'> & {
  checkpoint?: Partial<ClientRunProjection['checkpoint']>;
} = {}): ClientRunProjection {
  const base: ClientRunProjection = {
    run: { id: 'run-v3', status: 'active', scoreTotal: 100 },
    casePublic: {
      version: 4,
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
      mystery: {
        id: 'test-case', title: 'Test case', incident: 'Something changed in the field.',
        atmosphere: 'The signal is broad.', question: 'What explains the change?',
        location: { label: 'Test site', basis: 'GIS-selected sites.', confidence: 'contextual' },
        explanationChoices: [
          { id: 'choice-a', label: 'Choice A', description: 'First explanation.' },
          { id: 'choice-b', label: 'Choice B', description: 'Second explanation.' },
          { id: 'choice-c', label: 'Choice C', description: 'Third explanation.' },
        ],
      },
    },
    checkpoint: {
      incidentAcknowledged: false,
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
    verdict: null,
  };
  return {
    ...base,
    ...overrides,
    checkpoint: { ...base.checkpoint, ...overrides.checkpoint },
  };
}

function unplayedNodes() {
  return [
    { id: 'node-1', nodeOrder: 1, nodeType: 'site', nodeStatus: 'active', movesUsed: 0, obstacles: [], events: [] },
    { id: 'node-2', nodeOrder: 2, nodeType: 'site', nodeStatus: 'locked', movesUsed: 0, obstacles: [], events: [] },
    { id: 'node-3', nodeOrder: 3, nodeType: 'site', nodeStatus: 'locked', movesUsed: 0, obstacles: [], events: [] },
  ];
}

describe('v3 case flow', () => {
  it('starts on the incident case file', () => {
    assert.deepEqual(nextFlowStep(createFlowState()), { kind: 'incident' });
  });

  it('enters the first board after the incident is acknowledged', () => {
    const state = createFlowState();
    state.incidentAcknowledged = true;
    assert.deepEqual(nextFlowStep(state), { kind: 'board', nodeIndex: 0 });
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
    assert.equal(stageForStep({ kind: 'incident' }), 'incident');
    assert.equal(stageForStep({ kind: 'board', nodeIndex: 1 }), 'board');
    assert.equal(stageForStep({ kind: 'choose_evidence', nodeIndex: 2 }), 'choose_evidence');
    assert.equal(stageForStep({ kind: 'guess' }), 'guess');
    assert.equal(currentNodeIndexForStep({ kind: 'incident' }), 0);
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

  it('resumes an unplayed run on the incident case file', () => {
    const decision = reconcileProjection(projection({ nodes: unplayedNodes() }));
    assert.deepEqual(decision.kind === 'active' && decision.step, { kind: 'incident' });
  });

  it('resumes at the board when incidentAcknowledged is true with zero moves', () => {
    const decision = reconcileProjection(projection({
      checkpoint: { incidentAcknowledged: true },
      nodes: unplayedNodes(),
    }));
    assert.deepEqual(decision.kind === 'active' && decision.step, { kind: 'board', nodeIndex: 0 });
    assert.equal(decision.kind === 'active' && decision.flow.incidentAcknowledged, true);
  });

  it('resumes at the incident when the flag is false or missing with zero moves', () => {
    for (const checkpoint of [{ incidentAcknowledged: false }, {}]) {
      const decision = reconcileProjection(projection({ checkpoint, nodes: unplayedNodes() }));
      assert.deepEqual(decision.kind === 'active' && decision.step, { kind: 'incident' });
      assert.equal(decision.kind === 'active' && decision.flow.incidentAcknowledged, false);
    }
  });

  it('skips the incident after board progress', () => {
    const decision = reconcileProjection(projection({
      nodes: [
        { id: 'node-1', nodeOrder: 1, nodeType: 'site', nodeStatus: 'active', movesUsed: 2, obstacles: [], events: [] },
        { id: 'node-2', nodeOrder: 2, nodeType: 'site', nodeStatus: 'locked', movesUsed: 0, obstacles: [], events: [] },
        { id: 'node-3', nodeOrder: 3, nodeType: 'site', nodeStatus: 'locked', movesUsed: 0, obstacles: [], events: [] },
      ],
    }));
    assert.deepEqual(decision.kind === 'active' && decision.step, { kind: 'board', nodeIndex: 0 });
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
