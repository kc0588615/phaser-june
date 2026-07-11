// Characterization tests for GIS layer scoring and run-node generation.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  scorePolygonLayer,
  scoreLineLayer,
  mapFamilyToNodeType,
  selectNodes,
  generateRunNodes,
  applyWaypointsToRunNodes,
  METHOD_OBJECTIVE_BASE_TARGET,
  METHOD_SLOTS,
  MYSTERY_MOVE_BUDGET,
  MYSTERY_NODE_COUNT,
  type LayerScore,
  type NodeSelection,
  type RunNode,
} from '@/lib/nodeScoring';
import type { ExpeditionWaypoint } from '@/types/waypoints';

function layer(overrides: Partial<LayerScore>): LayerScore {
  return {
    nodeFamily: 'protected_node',
    variant: 'default',
    score: 0,
    overlapRatio: 0,
    nearestDistanceM: 9999,
    features: {},
    ...overrides,
  };
}

function waypoint(overrides: Partial<ExpeditionWaypoint>): ExpeditionWaypoint {
  return {
    slot: 1,
    waypointType: 'river',
    nodeRole: 'river',
    name: 'Test Waypoint',
    lon: 0,
    lat: 0,
    distKm: 1,
    rankScore: 1,
    sourceTable: null,
    sourceId: null,
    fallback: false,
    ...overrides,
  };
}

function baseNode(overrides: Partial<RunNode>): RunNode {
  return {
    node_type: 'custom',
    difficulty: 3,
    obstacles: [],
    events: [],
    rationale: 'base',
    obstacleFamily: null,
    objectiveTarget: 8,
    ...overrides,
  };
}

function selection(overrides: Partial<NodeSelection> = {}): NodeSelection {
  return {
    primaryNodeFamily: 'protected_node',
    primaryVariant: 'reserve',
    modifierNodes: [],
    signals: {},
    ...overrides,
  };
}

describe('layer scoring formulas', () => {
  test('polygon: 0.7*overlap + 0.3*exp(-distance/decay)', () => {
    assert.equal(scorePolygonLayer(1, 0), 1);
    assert.ok(Math.abs(scorePolygonLayer(0, 0) - 0.3) < 1e-12);
    assert.ok(Math.abs(scorePolygonLayer(0.5, 500) - (0.35 + 0.3 * Math.exp(-1))) < 1e-12);
    // Overlap ratio is capped at 1.
    assert.equal(scorePolygonLayer(5, 0), 1);
  });

  test('line: exp(-distance/decay)', () => {
    assert.equal(scoreLineLayer(0), 1);
    assert.ok(Math.abs(scoreLineLayer(500) - Math.exp(-1)) < 1e-12);
    assert.ok(Math.abs(scoreLineLayer(1000, 1000) - Math.exp(-1)) < 1e-12);
  });
});

describe('mapFamilyToNodeType', () => {
  test('water variants', () => {
    assert.equal(mapFamilyToNodeType('water_node', 'river'), 'riverbank_sweep');
    assert.equal(mapFamilyToNodeType('water_node', 'storm'), 'storm_window');
    assert.equal(mapFamilyToNodeType('water_node', 'lake'), 'custom');
  });

  test('bioregion variants use keyword matching', () => {
    assert.equal(mapFamilyToNodeType('bioregion_node', 'Tropical Moist Forest'), 'dense_canopy');
    assert.equal(mapFamilyToNodeType('bioregion_node', 'urban mosaic'), 'urban_fringe');
    assert.equal(mapFamilyToNodeType('bioregion_node', 'Montane Grassland'), 'elevation_ridge');
    assert.equal(mapFamilyToNodeType('bioregion_node', 'desert'), 'custom');
  });

  test('protected and community areas are custom nodes', () => {
    assert.equal(mapFamilyToNodeType('protected_node', 'anything'), 'custom');
    assert.equal(mapFamilyToNodeType('community_node', 'anything'), 'custom');
  });
});

describe('selectNodes', () => {
  test('best feature layer wins; bioregion rides along as modifier context', () => {
    const selection = selectNodes([
      layer({ nodeFamily: 'protected_node', variant: 'national_park', score: 0.8, overlapRatio: 0.6, nearestDistanceM: 0 }),
      layer({ nodeFamily: 'water_node', variant: 'river', score: 0.3, nearestDistanceM: 600 }),
      layer({ nodeFamily: 'bioregion_node', variant: 'forest', score: 0.5, overlapRatio: 1, nearestDistanceM: 0 }),
    ]);
    assert.equal(selection.primaryNodeFamily, 'protected_node');
    assert.equal(selection.primaryVariant, 'national_park');
    assert.equal(selection.modifierNodes[0], 'bioregion_node:forest');
    assert.ok(selection.modifierNodes.includes('water_node:river'));
    // Signals use the documented key names.
    assert.equal(selection.signals.wdpa_overlap_ratio, 0.6);
    assert.equal(selection.signals.river_distance_m, 600);
    assert.equal(selection.signals.protected_node_score, 0.8);
  });

  test('falls back to bioregion when every feature layer is weak', () => {
    const selection = selectNodes([
      layer({ nodeFamily: 'water_node', variant: 'river', score: 0.01 }),
      layer({ nodeFamily: 'bioregion_node', variant: 'steppe', score: 0.4 }),
    ]);
    assert.equal(selection.primaryNodeFamily, 'bioregion_node');
    assert.equal(selection.primaryVariant, 'steppe');
  });

  test('weak modifiers below 0.1 are dropped', () => {
    const selection = selectNodes([
      layer({ nodeFamily: 'protected_node', score: 0.8 }),
      layer({ nodeFamily: 'water_node', variant: 'river', score: 0.05 }),
    ]);
    assert.ok(!selection.modifierNodes.some((m) => m.startsWith('water_node')));
  });
});

describe('generateRunNodes', () => {
  test('creates the fixed three-method route with deterministic public board seeds', () => {
    const scores = [layer({ nodeFamily: 'protected_node', variant: 'reserve', score: 0.4 })];
    const habitat = { water_ratio: 0, forest_ratio: 0, urban_ratio: 0 };
    const first = generateRunNodes(selection(), scores, habitat, 2, 0.25);
    const second = generateRunNodes(selection(), scores, habitat, 2, 0.25);

    assert.equal(first.length, MYSTERY_NODE_COUNT);
    assert.deepEqual(first.map((node) => node.method), METHOD_SLOTS);
    assert.deepEqual(first.map((node) => node.objectiveType), [
      'method_match',
      'method_match',
      'method_match',
    ]);
    assert.deepEqual(first.map((node) => node.objectiveTarget), [
      METHOD_OBJECTIVE_BASE_TARGET,
      METHOD_OBJECTIVE_BASE_TARGET - 2,
      METHOD_OBJECTIVE_BASE_TARGET - 2,
    ]);
    assert.deepEqual(first.map((node) => node.moveBudget), [
      MYSTERY_MOVE_BUDGET,
      MYSTERY_MOVE_BUDGET,
      MYSTERY_MOVE_BUDGET,
    ]);

    const seeds = first.map((node) => node.boardSeed);
    assert.equal(new Set(seeds).size, MYSTERY_NODE_COUNT);
    for (const seed of seeds) {
      assert.ok(Number.isInteger(seed));
      assert.ok((seed ?? -1) >= 0 && (seed ?? 0) <= 0xffff_ffff);
    }
    assert.deepEqual(second, first);
  });

  test('uses GIS primary/modifier/habitat flavor while preserving fixed method order', () => {
    const nodes = generateRunNodes(
      selection({
        primaryNodeFamily: 'water_node',
        primaryVariant: 'river',
        modifierNodes: ['bioregion_node:Tropical Forest'],
      }),
      [layer({ nodeFamily: 'water_node', variant: 'river', score: 0.8 })],
      { water_ratio: 0.5, forest_ratio: 0, urban_ratio: 0 },
      1,
      0.5,
    );

    assert.deepEqual(nodes.map((node) => node.node_type), [
      'riverbank_sweep',
      'dense_canopy',
      'elevation_ridge',
    ]);
    assert.deepEqual(nodes.map((node) => node.method), ['track', 'observe', 'survey']);
    assert.deepEqual(nodes.map((node) => node.objectiveTarget), [8, 6, 4]);
  });

  test('context changes board seeds without using any answer input', () => {
    const scores = [layer({ nodeFamily: 'protected_node', variant: 'reserve', score: 0.4 })];
    const habitat = { water_ratio: 0, forest_ratio: 0, urban_ratio: 0 };
    const baseline = generateRunNodes(selection(), scores, habitat, 2, 0.25);
    const changed = generateRunNodes(
      selection({ primaryVariant: 'community reserve' }),
      scores,
      habitat,
      2,
      0.25,
    );

    assert.notDeepEqual(changed.map((node) => node.boardSeed), baseline.map((node) => node.boardSeed));
  });
});

describe('applyWaypointsToRunNodes', () => {
  test('nodes without waypoints pass through untouched', () => {
    const node = baseNode({ node_type: 'dense_canopy' });
    assert.deepEqual(applyWaypointsToRunNodes([node]), [node]);
  });

  test('river waypoint retunes the node to riverbank_sweep', () => {
    const [tuned] = applyWaypointsToRunNodes([
      baseNode({ waypoint: waypoint({ waypointType: 'river', nodeRole: 'river' }) }),
    ]);
    assert.equal(tuned.node_type, 'riverbank_sweep');
    assert.equal(tuned.difficulty, 3);
    assert.equal(tuned.objectiveTarget, 8);
  });

  test('final waypoint becomes the analysis node', () => {
    const [tuned] = applyWaypointsToRunNodes([
      baseNode({ waypoint: waypoint({ nodeRole: 'final', waypointType: 'basecamp' }) }),
    ]);
    assert.equal(tuned.node_type, 'analysis');
  });

  test('protected-area waypoint mentions the site by name in the rationale', () => {
    const [tuned] = applyWaypointsToRunNodes([
      baseNode({
        waypoint: waypoint({ waypointType: 'protected_area', nodeRole: 'protected_area', name: 'Addax Reserve' }),
      }),
    ]);
    assert.ok(tuned.rationale.includes('Addax Reserve'));
  });

  test('fallback waypoints clamp difficulty to at most 2', () => {
    const [tuned] = applyWaypointsToRunNodes([
      baseNode({ difficulty: 5, waypoint: waypoint({ fallback: true }) }),
    ]);
    assert.equal(tuned.difficulty, 2);
  });

  test('waypoint tuning preserves method and board seed and rescales method objective', () => {
    const [tuned] = applyWaypointsToRunNodes([
      baseNode({
        difficulty: 5,
        method: 'survey',
        objectiveType: 'method_match',
        objectiveTarget: 8,
        boardSeed: 123,
        waypoint: waypoint({ fallback: true }),
      }),
    ]);

    assert.equal(tuned.method, 'survey');
    assert.equal(tuned.boardSeed, 123);
    assert.equal(tuned.difficulty, 2);
    assert.equal(tuned.objectiveTarget, 4);
  });
});
