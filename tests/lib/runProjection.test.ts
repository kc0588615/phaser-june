import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { projectRunCreateResponse, projectRunForClient } from '@/lib/runProjection';
import { deriveMethodOfferTree } from '@/expedition/caseOffers';

const PRIVATE_VALUES = [
  'PRIVATE_CASE_SEED',
  'PRIVATE_ANSWER',
  'PRIVATE_CHAIN_ID',
  'PRIVATE_CARD_ID',
  'PRIVATE_LEGACY_ANSWER',
  'PRIVATE_METADATA_POISON',
  'PRIVATE_PLAYER',
  'PRIVATE_SPECIES',
];

describe('projectRunForClient', () => {
  test('projects v3 family progress without private answer, card ids, or bonus facts', () => {
    const projection = projectRunForClient({
      id: 'run-v3', runStatus: 'active', metadata: {
        casePublic: {
          version: 3, candidateIds: [1, 2, 3, 4, 5, 6], boardSeeds: [10, 20, 30],
          mapView: {
            bounds: [-2, -2, 2, 2],
            route: [0, 1, 2].map(nodeIndex => ({ nodeIndex, lon: nodeIndex - 1, lat: nodeIndex - 1, biome: 'Forest', nearestFeature: `Site ${nodeIndex + 1}` })),
            speciesRange: 'PRIVATE_RANGE',
          },
        },
        casePrivate: { version: 3, answerId: 4, caseSeed: 'secret', familyCardIds: { body: 900 } },
        evidenceApplications: [{ cardId: 900, bonusFactText: 'PRIVATE_FACT' }],
      },
    }, {
      publicObservations: [{
        ref: 'obs-0', family: 'body', observationText: 'A large body frame left a clear sign.',
        traitCategory: 'morphology', compareTag: 'gameplay_size:large', actualEliminatedIds: [2, 5],
        eliminationReasons: { 2: 'body mismatch', 5: 'body mismatch' }, traitPhrase: 'large-framed',
        candidateTraitPhrases: { 1: 'striped coat', 2: 'spiral horns', 3: 'grasping trunk', 4: 'keratin scales', 5: 'flight wings', 6: 'digging claws', 99: 'ignored extra' },
        isSignature: false, cardId: 900, bonusFactText: 'PRIVATE_FACT',
      }],
      nodes: [{
        id: 'node-v3', nodeOrder: 1, nodeType: 'custom', nodeStatus: 'active',
        objectiveTarget: 6, objectiveProgress: 2, movesUsed: 2,
        boardContext: {
          caseVersion: 3,
          evidenceCharges: { relatives: 1, body: 4, behavior: 0, habits: 1, place: 0 },
          carriedCharges: { relatives: 1, body: 0, behavior: 0, habits: 1, place: 0 },
          familyHintIds: { body: [700, 701, 702] }, cascadeHintIds: [800], hintText: 'PRIVATE_HINT',
          selectedFamilies: [], segmentMovesUsed: 2,
        },
        hazardProfile: {},
      }],
    });
    assert.equal(projection.casePublic?.version, 3);
    assert.equal(projection.observations[0].family, 'body');
    assert.deepEqual(projection.observations[0].actualEliminatedIds, [2, 5]);
    assert.deepEqual(projection.observations[0].eliminationReasons, { 2: 'body mismatch', 5: 'body mismatch' });
    assert.equal(projection.observations[0].traitPhrase, 'large-framed');
    assert.deepEqual(projection.observations[0].candidateTraitPhrases, { 1: 'striped coat', 2: 'spiral horns', 3: 'grasping trunk', 4: 'keratin scales', 5: 'flight wings', 6: 'digging claws' });
    assert.deepEqual(projection.nodes[0].evidenceCharges, { relatives: 1, body: 4, behavior: 0, habits: 1, place: 0 });
    assert.deepEqual(projection.nodes[0].carriedCharges, { relatives: 1, body: 0, behavior: 0, habits: 1, place: 0 });
    const serialized = JSON.stringify(projection);
    assert.equal(serialized.includes('PRIVATE_FACT'), false);
    assert.equal(serialized.includes('familyCardIds'), false);
    assert.equal(serialized.includes('familyHintIds'), false);
    assert.equal(serialized.includes('cascadeHintIds'), false);
    assert.equal(serialized.includes('PRIVATE_HINT'), false);
    assert.equal(serialized.includes('900'), false);
    assert.equal(serialized.includes('PRIVATE_RANGE'), false);
  });

  test('allowlists the session, nested metadata, and explicit observation content', () => {
    const session = {
      id: 'run-1',
      runStatus: 'active',
      playerId: 'player-private',
      gameSessionId: 'game-private',
      runSeed: 999,
      nodeCountPlanned: 3,
      nodeIndexCurrent: 2,
      selectedLng: -87.1,
      selectedLat: 41.2,
      selectionZoom: 8.5,
      locationKey: 'test-place',
      realm: 'Nearctic',
      biome: 'Forest',
      bioregion: 'Test region',
      moveBudget: 30,
      movesUsed: 11,
      scoreTotal: 420,
      speciesDiscoveredCount: 0,
      startedAt: new Date('2026-07-10T12:00:00Z'),
      endedAt: null,
      metadata: {
        correctSpeciesId: 'PRIVATE_LEGACY_ANSWER',
        casePrivate: {
          answerId: 'PRIVATE_ANSWER',
          caseSeed: 'PRIVATE_CASE_SEED',
          chainCardIds: ['PRIVATE_CHAIN_ID'],
        },
        casePublic: {
          version: 1,
          candidateIds: [10, 20, 30, 40, 50, 60],
          nodeMethods: ['track', 'observe', 'survey'],
          boardSeeds: [101, 102, 103],
          answerId: 'PRIVATE_ANSWER',
          caseSeed: 'PRIVATE_CASE_SEED',
          chainCardIds: ['PRIVATE_CHAIN_ID'],
          poison: { cardId: 'PRIVATE_CARD_ID' },
          objectiveOptions: [{
            nodeIndex: 0,
            method: 'track',
            objectiveType: 'method_match',
            objectiveTarget: 6,
            cardId: 'PRIVATE_CARD_ID',
          }, {
            nodeIndex: 1,
            method: 'observe',
            objectiveType: 'method_match',
            objectiveTarget: 7,
          }, {
            nodeIndex: 2,
            method: 'survey',
            objectiveType: 'method_match',
            objectiveTarget: 8,
          }],
        },
        observationsIssued: [{
          nodeIndex: 0,
          ref: 'obs-0',
          cardId: 'PRIVATE_CARD_ID',
          observationText: 'must not hydrate from metadata',
        }],
        currentNodeIndex: 1,
        bankedScore: 400,
        objectiveProgress: 4,
        activeAffinities: ['feline'],
        habitats: ['forest'],
        rasterHabitats: [{
          habitat_type: 'Forest',
          percentage: 72,
          answerId: 'PRIVATE_ANSWER',
        }],
        featureFingerprints: [{
          featureClass: 'bioregion',
          sourceTable: 'oneearth',
          sourceId: 9,
          name: 'Test region',
          distanceM: 0,
          overlapRatio: 1,
          properties: {
            bioregion: 'Public region',
            realm: 'Public realm',
            biome: 'Public biome',
            caseSeed: 'PRIVATE_CASE_SEED',
          },
          cardId: 'PRIVATE_CARD_ID',
        }],
        routePolyline: [{ lon: -87.1, lat: 41.2, waypointSlot: 1, casePrivate: 'PRIVATE_METADATA_POISON' }],
        reasoningEvents: [{
          obsRef: 'obs-0',
          predictedEliminatedIds: [20],
          actualEliminatedIds: [20, 30],
          correct: false,
          latencyMs: 1200,
          cardId: 'PRIVATE_CARD_ID',
        }],
        expeditionSnapshot: {
          protectedAreas: [{ name: 'Park', designation: 'Reserve', iucn_category: 'II', answerId: 'PRIVATE_ANSWER' }],
          actionBias: { sword: 2, caseSeed: 88 },
          availableAffinities: ['feline'],
          primaryNodeFamily: 'protected_node',
          primaryVariant: 'forest',
          modifierNodes: ['water_node'],
          signals: { water_node_score: 0.7, answerId: 99, cardId: 88 },
          waypoints: [{
            slot: 1,
            waypointType: 'river',
            nodeRole: 'river',
            name: 'Public river',
            lon: -87,
            lat: 41,
            distKm: 2,
            rankScore: 1,
            sourceTable: 'rivers',
            sourceId: 5,
            fallback: false,
            chainCardIds: 'PRIVATE_CHAIN_ID',
          }],
          waypointRadiusKm: 20,
          nearestRiverDistM: 50,
          casePrivate: 'PRIVATE_METADATA_POISON',
        },
        unrelated: { poison: 'PRIVATE_METADATA_POISON' },
      },
    };
    const before = structuredClone(session);

    const projection = projectRunForClient(session, {
      publicObservations: [{
        id: 'PRIVATE_CARD_ID',
        cardId: 'PRIVATE_CARD_ID',
        speciesId: 'PRIVATE_ANSWER',
        ref: 'obs-0',
        method: 'track',
        observationText: 'A broad print crosses the mud.',
        inferenceText: 'The track indicates a large-bodied mover.',
        traitCategory: 'morphology',
        compareTag: 'body_size:large',
        isSignature: false,
        casePrivate: 'PRIVATE_METADATA_POISON',
      }],
      nodes: [{
        id: 'node-1',
        runId: 'run-1',
        nodeOrder: 1,
        nodeType: 'custom',
        nodeStatus: 'active',
        objectiveType: 'method_match',
        objectiveTarget: 6,
        objectiveProgress: 4,
        moveBudget: 12,
        movesUsed: 5,
        boardSeed: 4_294_967_295,
        boardSamplingMethod: 'center_point',
        guessedSpeciesId: 'PRIVATE_SPECIES',
        boardContext: {
          method: 'track',
          rationale: 'A public field rationale.',
          difficulty: 2,
          answerId: 'PRIVATE_ANSWER',
          waypoint: {
            slot: 1,
            waypointType: 'river',
            nodeRole: 'river',
            name: 'Public river',
            lon: -87,
            lat: 41,
            distKm: 2,
            rankScore: 1,
            sourceTable: 'rivers',
            sourceId: 5,
            fallback: false,
            cardId: 'PRIVATE_CARD_ID',
          },
        },
        hazardProfile: {
          obstacles: ['mud_tiles', 'PRIVATE_METADATA_POISON'],
          events: ['river_crossing', 'PRIVATE_METADATA_POISON'],
          correctSpeciesId: 'PRIVATE_SPECIES',
        },
        rewardProfile: { answerName: 'PRIVATE_ANSWER', secret: 'PRIVATE_METADATA_POISON' },
        rewardClaimed: false,
        scoreEarned: 90,
        dominantHabitat: 'Forest',
        startedAt: new Date('2026-07-10T12:01:00Z'),
        endedAt: null,
        createdAt: new Date('2026-07-10T12:00:00Z'),
        updatedAt: new Date('2026-07-10T12:02:00Z'),
      }],
      memory: {
        id: 'memory-1',
        runId: 'run-1',
        playerId: 'PRIVATE_PLAYER',
        speciesId: 'PRIVATE_SPECIES',
        locationKey: 'test-place',
        startLon: -87.1,
        startLat: 41.2,
        routePolyline: [{ lon: -87.1, lat: 41.2, waypointSlot: 1, answerId: 'PRIVATE_ANSWER' }],
        routeBounds: { minLon: -88, minLat: 40, maxLon: -86, maxLat: 42, secret: 'PRIVATE_METADATA_POISON' },
        nodes: [{
          nodeOrder: 1,
          nodeType: 'custom',
          nodeStatus: 'completed',
          objectiveTarget: 6,
          objectiveProgress: 6,
          scoreEarned: 90,
          movesUsed: 5,
          obstacleFamily: 'terrain',
          speciesId: 'PRIVATE_SPECIES',
          waypoint: {
            slot: 1,
            waypointType: 'river',
            nodeRole: 'river',
            name: 'Public river',
            lon: -87,
            lat: 41,
            distKm: 2,
            rankScore: 1,
            sourceTable: 'rivers',
            sourceId: 5,
            fallback: false,
            cardId: 'PRIVATE_CARD_ID',
          },
        }],
        gisFeaturesNearby: [{
          featureClass: 'bioregion',
          sourceTable: 'oneearth',
          sourceId: 9,
          name: 'Test region',
          distanceM: 0,
          overlapRatio: 1,
          properties: { bioregion: 'Public region', answerId: 'PRIVATE_ANSWER' },
        }],
        eventsTriggered: [{ answerId: 'PRIVATE_ANSWER' }],
        itemsUsed: [{ cardId: 'PRIVATE_CARD_ID' }],
        deductionSummary: {
          scoreSpent: 20,
          processedClues: 3,
          confirmedCategories: 2,
          candidateCount: 1,
          referenceAttempts: 1,
          issuedEvidenceCount: 4,
          reasoningEventCount: 4,
          guessBonus: 250,
          efficiencyBonus: 100,
          wrongGuessCount: 1,
          firstGuessCorrect: false,
          finalScore: 510,
          answerName: 'PRIVATE_ANSWER',
        },
        finalScore: 510,
        realm: 'Nearctic',
        biome: 'Forest',
        bioregion: 'Test region',
        createdAt: new Date('2026-07-10T12:10:00Z'),
      },
    });

    assert.deepEqual(session, before);
    assert.deepEqual(projection.run, {
      id: 'run-1',
      status: 'active',
      nodeCountPlanned: 3,
      nodeIndexCurrent: 2,
      selectedLng: -87.1,
      selectedLat: 41.2,
      selectionZoom: 8.5,
      locationKey: 'test-place',
      realm: 'Nearctic',
      biome: 'Forest',
      bioregion: 'Test region',
      moveBudget: 30,
      movesUsed: 11,
      scoreTotal: 420,
      speciesDiscoveredCount: 0,
      startedAt: '2026-07-10T12:00:00.000Z',
      endedAt: null,
    });
    assert.deepEqual(projection.casePublic, {
      version: 1,
      candidateIds: [10, 20, 30, 40, 50, 60],
      nodeMethods: ['track', 'observe', 'survey'],
      boardSeeds: [101, 102, 103],
    });
    assert.deepEqual(projection.observations, [{
      ref: 'obs-0',
      method: 'track',
      observationText: 'A broad print crosses the mud.',
      inferenceText: 'The track indicates a large-bodied mover.',
      traitCategory: 'morphology',
      compareTag: 'body_size:large',
      isSignature: false,
    }]);
    assert.equal(projection.legacy, false);
    assert.equal(projection.checkpoint.expeditionSnapshot.signals.water_node_score, 0.7);
    assert.deepEqual(projection.checkpoint.reasoningEvents, [{
      obsRef: 'obs-0',
      predictedEliminatedIds: [20],
      actualEliminatedIds: [20, 30],
      correct: false,
      latencyMs: 1200,
    }]);
    assert.deepEqual(projection.nodes, [{
      id: 'node-1',
      nodeOrder: 1,
      nodeType: 'custom',
      nodeStatus: 'active',
      objectiveType: 'method_match',
      objectiveTarget: 6,
      objectiveProgress: 4,
      moveBudget: 12,
      movesUsed: 5,
      boardSeed: 4_294_967_295,
      boardSamplingMethod: 'center_point',
      caseState: 'interpreted',
      method: 'track',
      rationale: 'A public field rationale.',
      difficulty: 2,
      obstacles: ['mud_tiles'],
      events: ['river_crossing'],
      waypoint: {
        slot: 1,
        waypointType: 'river',
        nodeRole: 'river',
        name: 'Public river',
        lon: -87,
        lat: 41,
        distKm: 2,
        rankScore: 1,
        sourceTable: 'rivers',
        sourceId: 5,
        fallback: false,
      },
      rewardClaimed: false,
      scoreEarned: 90,
      dominantHabitat: 'Forest',
      startedAt: '2026-07-10T12:01:00.000Z',
      endedAt: null,
      createdAt: '2026-07-10T12:00:00.000Z',
      updatedAt: '2026-07-10T12:02:00.000Z',
    }]);
    assert.deepEqual(projection.memory, {
      id: 'memory-1',
      runId: 'run-1',
      locationKey: 'test-place',
      startLon: -87.1,
      startLat: 41.2,
      routePolyline: [{ lon: -87.1, lat: 41.2, waypointSlot: 1 }],
      routeBounds: { minLon: -88, minLat: 40, maxLon: -86, maxLat: 42 },
      nodes: [{
        nodeOrder: 1,
        nodeType: 'custom',
        nodeStatus: 'completed',
        objectiveTarget: 6,
        objectiveProgress: 6,
        scoreEarned: 90,
        movesUsed: 5,
        obstacleFamily: 'terrain',
        waypoint: {
          slot: 1,
          waypointType: 'river',
          nodeRole: 'river',
          name: 'Public river',
          lon: -87,
          lat: 41,
          distKm: 2,
          rankScore: 1,
          sourceTable: 'rivers',
          sourceId: 5,
          fallback: false,
        },
      }],
      gisFeaturesNearby: [{
        featureClass: 'bioregion',
        sourceTable: 'oneearth',
        sourceId: 9,
        name: 'Test region',
        distanceM: 0,
        overlapRatio: 1,
        properties: { bioregion: 'Public region' },
      }],
      deductionSummary: {
        scoreSpent: 20,
        processedClues: 3,
        confirmedCategories: 2,
        candidateCount: 1,
        referenceAttempts: 1,
        issuedEvidenceCount: 4,
        reasoningEventCount: 4,
        citedEvidenceRefs: [],
        guessBonus: 250,
        efficiencyBonus: 100,
        wrongGuessCount: 1,
        firstGuessCorrect: false,
        finalScore: 510,
      },
      finalScore: 510,
      realm: 'Nearctic',
      biome: 'Forest',
      bioregion: 'Test region',
      createdAt: '2026-07-10T12:10:00.000Z',
    });

    assertNoPrivateData(projection);
  });

  test('does not derive observation content from stored issuance rows', () => {
    const projection = projectRunForClient({
      id: 'legacy-run',
      runStatus: 'active',
      metadata: {
        correctSpeciesId: 123,
        casePrivate: { answerId: 123, caseSeed: 'PRIVATE_CASE_SEED' },
        observationsIssued: [{
          ref: 'obs-0',
          cardId: 'PRIVATE_CARD_ID',
          observationText: 'stored private content',
        }],
        currentNodeIndex: 2,
        bankedScore: 50,
      },
    });

    assert.equal(projection.legacy, true);
    assert.equal(projection.casePublic, null);
    assert.deepEqual(projection.observations, []);
    assert.equal(projection.checkpoint.currentNodeIndex, 2);
    assert.equal(projection.checkpoint.bankedScore, 50);
    assertNoPrivateData(projection);
  });

  test('returns detached public data', () => {
    const session = {
      metadata: {
        casePublic: {
          version: 1,
          candidateIds: [1, 2, 3, 4, 5, 6],
          nodeMethods: ['track', 'observe', 'survey'],
          boardSeeds: [4, 5, 6],
        },
        habitats: ['forest'],
        routePolyline: [{ lon: 1, lat: 2 }],
      },
    };
    const projection = projectRunForClient(session, {
      publicObservations: [
        { ref: 'obs-9', method: 'track', observationText: 'invalid ref' },
        { ref: 'obs-1', method: 'invalid', observationText: 'invalid method' },
        { ref: 'obs-1', method: 'observe', observationText: 'valid', isSignature: false },
      ],
    });

    assert.equal(projection.legacy, false);
    assert.equal(projection.observations.length, 1);

    projection.casePublic!.candidateIds.push(99);
    projection.checkpoint.habitats.push('wetland');
    projection.checkpoint.routePolyline[0].lon = 50;
    assert.deepEqual(session.metadata.casePublic.candidateIds, [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(session.metadata.habitats, ['forest']);
    assert.equal(session.metadata.routePolyline[0].lon, 1);
  });

  test('projects v2 offer, choice, and quality state without private matrix leakage', () => {
    const nodeTypes = ['riverbank_sweep', 'dense_canopy', 'storm_window'] as const;
    const projection = projectRunForClient({
      runStatus: 'active',
      metadata: {
        casePublic: {
          version: 2,
          candidateIds: [1, 2, 3, 4, 5, 6],
          nodeTypes,
          boardSeeds: [11, 22, 33],
          offerTree: deriveMethodOfferTree(nodeTypes),
        },
        casePrivate: {
          version: 2,
          answerId: 'PRIVATE_ANSWER',
          cardIdMatrix: 'PRIVATE_CARD_ID',
          signatureCardId: 'PRIVATE_CHAIN_ID',
        },
      },
    }, {
      nodes: [{
        id: 'node-1', nodeOrder: 1, nodeType: nodeTypes[0], nodeStatus: 'active',
        boardContext: {
          method: 'survey',
          offeredMethods: ['track', 'survey'],
          choiceOfferedAt: '2026-07-18T00:00:00.000Z',
          choiceLatencyMs: 900,
          bestTargetMatchLength: 5,
        },
        hazardProfile: {},
      }],
    });

    assert.equal(projection.casePublic?.version, 2);
    assert.deepEqual(projection.nodes[0], {
      id: 'node-1', nodeOrder: 1, nodeType: nodeTypes[0], nodeStatus: 'active',
      obstacles: [], events: [], method: 'survey', offeredMethods: ['track', 'survey'],
      choiceOfferedAt: '2026-07-18T00:00:00.000Z', choiceLatencyMs: 900,
      bestTargetMatchLength: 5, evidenceQualityTier: 3, caseState: 'board_active',
    });
    assertNoPrivateData(projection);
  });

  test('marks every malformed case snapshot as legacy', () => {
    const valid = {
      version: 1,
      candidateIds: [1, 2, 3, 4, 5, 6],
      nodeMethods: ['track', 'observe', 'survey'],
      boardSeeds: [1, 2, 3],
    };
    const malformed = [
      { ...valid, version: 2 },
      { ...valid, candidateIds: [1, 2, 3, 4, 5] },
      { ...valid, candidateIds: [1, 2, 3, 4, 5, 5] },
      { ...valid, candidateIds: [1, 2, 3, 4, 5, -1] },
      { ...valid, nodeMethods: ['track', 'survey', 'observe'] },
      { ...valid, boardSeeds: [1, 2] },
      { ...valid, boardSeeds: [1, 2, 4_294_967_296] },
    ];

    for (const casePublic of malformed) {
      const projection = projectRunForClient({ metadata: { casePublic } });
      assert.equal(projection.casePublic, null);
      assert.equal(projection.legacy, true);
    }
  });

  test('projects create responses with only the three public fields', () => {
    const input = {
      runId: 'run-2',
      nodeIds: ['node-1', 'node-2', 'node-3'],
      casePublic: {
        version: 1,
        candidateIds: [1, 2, 3, 4, 5, 6],
        nodeMethods: ['track', 'observe', 'survey'],
        boardSeeds: [11, 12, 13],
        answerId: 'PRIVATE_ANSWER',
        caseSeed: 'PRIVATE_CASE_SEED',
      },
      private: 'PRIVATE_METADATA_POISON',
    };
    const before = structuredClone(input);

    const response = projectRunCreateResponse(input);

    assert.deepEqual(input, before);
    assert.deepEqual(Object.keys(response), ['runId', 'nodeIds', 'casePublic']);
    assert.deepEqual(response, {
      runId: 'run-2',
      nodeIds: ['node-1', 'node-2', 'node-3'],
      casePublic: {
        version: 1,
        candidateIds: [1, 2, 3, 4, 5, 6],
        nodeMethods: ['track', 'observe', 'survey'],
        boardSeeds: [11, 12, 13],
      },
    });
    assertNoPrivateData(response);
  });
});

function assertNoPrivateData(value: unknown): void {
  const json = JSON.stringify(value);
  for (const privateValue of PRIVATE_VALUES) {
    assert.equal(json.includes(privateValue), false, `serialized ${privateValue}`);
  }

  const forbiddenKeys = new Set([
    'metadata',
    'caseprivate',
    'correctspeciesid',
    'caseseed',
    'answerid',
    'chain',
    'chaincardids',
    'cardidmatrix',
    'cardid',
    'cardids',
    'observationsissued',
    'runseed',
    'signaturecardid',
    'playerid',
    'speciesid',
    'guessedspeciesid',
  ]);
  walk(value, key => {
    assert.equal(forbiddenKeys.has(key.toLowerCase()), false, `serialized forbidden key ${key}`);
  });
}

function walk(value: unknown, visitKey: (key: string) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visitKey);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    visitKey(key);
    walk(item, visitKey);
  }
}
