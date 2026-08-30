import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { projectRunCreateResponse, projectRunForClient } from '@/lib/runProjection';

const CASE_PUBLIC = {
  version: 4 as const,
  candidateIds: [1, 2, 3, 4, 5, 6],
  boardSeeds: [10, 20, 30] as [number, number, number],
  mapView: {
    bounds: [-2, -2, 2, 2] as [number, number, number, number],
    route: [0, 1, 2].map(nodeIndex => ({
      nodeIndex,
      lon: nodeIndex - 1,
      lat: nodeIndex - 1,
      biome: 'Forest',
      nearestFeature: `Site ${nodeIndex + 1}`,
    })) as [
      { nodeIndex: 0; lon: number; lat: number; biome: string; nearestFeature: string },
      { nodeIndex: 1; lon: number; lat: number; biome: string; nearestFeature: string },
      { nodeIndex: 2; lon: number; lat: number; biome: string; nearestFeature: string },
    ],
  },
  mystery: {
    id: 'test-case', title: 'Test case', incident: 'Something changed in the field.',
    atmosphere: 'The signal is broad.', question: 'What explains the change?',
    location: { label: 'Test site', basis: 'GIS-selected sites.', confidence: 'contextual' as const },
    explanationChoices: [
      { id: 'choice-a', label: 'Choice A', description: 'First explanation.' },
      { id: 'choice-b', label: 'Choice B', description: 'Second explanation.' },
      { id: 'choice-c', label: 'Choice C', description: 'Third explanation.' },
    ],
  },
};

describe('v4 run projection', () => {
  test('projects family evidence without private answer or card data', () => {
    const projection = projectRunForClient({
      id: 'run-v3',
      runStatus: 'active',
      metadata: {
        casePublic: { ...CASE_PUBLIC, speciesRange: 'PRIVATE_RANGE' },
        casePrivate: { version: 4, answerId: 4, caseSeed: 'PRIVATE_SEED', familyCardIds: { body: 900 } },
        evidenceApplications: [{ cardId: 900, bonusFactText: 'PRIVATE_FACT' }],
      },
    }, {
      publicObservations: [{
        ref: 'obs-0',
        family: 'body',
        observationText: 'A large body frame left a clear sign.',
        inferenceText: 'A heavy animal passed here.',
        traitCategory: 'morphology',
        compareTag: 'gameplay_size:large',
        actualEliminatedIds: [2, 5],
        eliminationReasons: { 2: 'body mismatch', 5: 'body mismatch' },
        traitPhrase: 'large-framed',
        candidateTraitPhrases: {
          1: 'striped coat', 2: 'spiral horns', 3: 'grasping trunk',
          4: 'keratin scales', 5: 'flight wings', 6: 'digging claws', 99: 'ignored extra',
        },
        cardId: 900,
        bonusFactText: 'PRIVATE_FACT',
      }],
      nodes: [{
        id: 'node-v3', nodeOrder: 1, nodeType: 'custom', nodeStatus: 'active',
        objectiveTarget: 6, objectiveProgress: 2, movesUsed: 2,
        boardContext: {
          evidenceCharges: { relatives: 1, body: 4, behavior: 0, habits: 1, place: 0 },
          carriedCharges: { relatives: 1, body: 0, behavior: 0, habits: 1, place: 0 },
          familyHintIds: { body: [700, 701, 702] },
          cascadeHintIds: [800],
          hintText: 'PRIVATE_HINT',
        },
        hazardProfile: {},
      }],
    });

    assert.deepEqual(projection.casePublic, CASE_PUBLIC);
    assert.deepEqual(projection.observations[0].actualEliminatedIds, [2, 5]);
    assert.deepEqual(projection.observations[0].candidateTraitPhrases, {
      2: 'spiral horns',
      5: 'flight wings',
    });
    assert.deepEqual(projection.nodes[0].evidenceCharges, { relatives: 1, body: 4, behavior: 0, habits: 1, place: 0 });
    const serialized = JSON.stringify(projection);
    for (const privateValue of [
      'PRIVATE_RANGE', 'PRIVATE_SEED', 'PRIVATE_FACT', 'PRIVATE_HINT',
      'familyCardIds', 'familyHintIds', 'cascadeHintIds', '900',
      'large-framed', 'gameplay_size:large', 'striped coat', 'grasping trunk',
      'keratin scales', 'digging claws',
    ]) {
      assert.equal(serialized.includes(privateValue), false, `serialized ${privateValue}`);
    }
  });

  test('allowlists session, checkpoint, node, and memory fields', () => {
    const projection = projectRunForClient({
      id: 'run-1', runStatus: 'active', playerId: 'PRIVATE_PLAYER',
      selectedLng: -87.1, selectedLat: 41.2, locationKey: 'test-place', scoreTotal: 420,
      metadata: {
        casePublic: CASE_PUBLIC,
        habitats: ['forest'],
        routePolyline: [{ lon: -87.1, lat: 41.2, waypointSlot: 1, answerId: 'PRIVATE_ANSWER' }],
        expeditionSnapshot: {
          primaryNodeFamily: 'protected_node', primaryVariant: 'forest',
          waypoints: [{
            slot: 1, waypointType: 'river', nodeRole: 'river', name: 'Public river',
            lon: -87, lat: 41, distKm: 2, rankScore: 1,
            sourceTable: 'rivers', sourceId: 5, fallback: false, cardId: 'PRIVATE_CARD',
          }],
        },
      },
    }, {
      nodes: [{
        id: 'node-1', nodeOrder: 1, nodeType: 'custom', nodeStatus: 'active',
        objectiveType: 'evidence_family', objectiveTarget: 6, movesUsed: 2,
        boardContext: { rationale: 'Public rationale', difficulty: 2 },
        hazardProfile: { obstacles: ['mud_tiles', 'PRIVATE'], events: ['river_crossing', 'PRIVATE'] },
      }],
      memory: {
        id: 'memory-1', runId: 'run-1', playerId: 'PRIVATE_PLAYER', finalScore: 510,
        routePolyline: [{ lon: -87.1, lat: 41.2 }], nodes: [], gisFeaturesNearby: [],
      },
    });

    assert.deepEqual(projection.run, {
      id: 'run-1', status: 'active', selectedLng: -87.1, selectedLat: 41.2,
      locationKey: 'test-place', scoreTotal: 420,
    });
    assert.deepEqual(projection.nodes[0].obstacles, ['mud_tiles']);
    assert.deepEqual(projection.nodes[0].events, ['river_crossing']);
    assert.equal(projection.memory?.finalScore, 510);
    assert.equal(JSON.stringify(projection).includes('PRIVATE_PLAYER'), false);
    assert.equal(JSON.stringify(projection).includes('PRIVATE_ANSWER'), false);
    assert.equal(JSON.stringify(projection).includes('PRIVATE_CARD'), false);
  });

  test('marks missing and earlier snapshots as legacy', () => {
    for (const casePublic of [
      undefined,
      { version: 1, candidateIds: [1, 2, 3, 4, 5, 6], boardSeeds: [1, 2, 3] },
      { version: 2, candidateIds: [1, 2, 3, 4, 5, 6], boardSeeds: [1, 2, 3] },
      { version: 3, candidateIds: [1, 2, 3, 4, 5, 6], boardSeeds: [1, 2, 3] },
    ]) {
      const projection = projectRunForClient({ metadata: { casePublic } });
      assert.equal(projection.casePublic, null);
      assert.equal(projection.legacy, true);
    }
  });

  test('rejects malformed v3 snapshots', () => {
    const malformed = [
      { ...CASE_PUBLIC, candidateIds: [1, 2, 3, 4, 5] },
      { ...CASE_PUBLIC, candidateIds: [1, 2, 3, 4, 5, 5] },
      { ...CASE_PUBLIC, boardSeeds: [1, 2, 4_294_967_296] },
      { ...CASE_PUBLIC, mapView: null },
      { ...CASE_PUBLIC, mystery: null },
    ];
    for (const casePublic of malformed) {
      assert.equal(projectRunForClient({ metadata: { casePublic } }).legacy, true);
    }
  });

  test('returns detached public data', () => {
    const session = {
      metadata: {
        casePublic: structuredClone(CASE_PUBLIC),
        habitats: ['forest'],
        routePolyline: [{ lon: 1, lat: 2 }],
      },
    };
    const projection = projectRunForClient(session);
    projection.casePublic!.candidateIds.push(99);
    projection.checkpoint.habitats.push('wetland');
    projection.checkpoint.routePolyline[0].lon = 50;
    assert.deepEqual(session.metadata.casePublic.candidateIds, [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(session.metadata.habitats, ['forest']);
    assert.equal(session.metadata.routePolyline[0].lon, 1);
  });

  test('projects create responses through the v3 public boundary', () => {
    const input = {
      runId: 'run-2',
      nodeIds: ['node-1', 'node-2', 'node-3'],
      casePublic: { ...CASE_PUBLIC, answerId: 'PRIVATE_ANSWER' },
      private: 'PRIVATE_VALUE',
    };
    const response = projectRunCreateResponse(input);
    assert.deepEqual(response, {
      runId: 'run-2',
      nodeIds: ['node-1', 'node-2', 'node-3'],
      casePublic: CASE_PUBLIC,
    });
  });
});
