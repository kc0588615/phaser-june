import { describe, expect, it } from 'vitest';

import {
  applyWaypointsToRunNodes,
  generateRunNodes,
  mapFamilyToNodeType,
  scoreLineLayer,
  scorePolygonLayer,
  selectNodes,
  type LayerScore,
  type RunNode,
} from '@/lib/nodeScoring';

function score(overrides: Partial<LayerScore>): LayerScore {
  return {
    nodeFamily: 'bioregion_node',
    variant: 'fallback',
    score: 0,
    overlapRatio: 0,
    nearestDistanceM: 9999,
    features: {},
    ...overrides,
  };
}

describe('nodeScoring', () => {
  it('scores polygons from overlap and distance decay', () => {
    expect(scorePolygonLayer(0.5, 0)).toBeCloseTo(0.65);
    expect(scorePolygonLayer(2, 0)).toBe(1);
  });

  it('scores line layers from distance decay only', () => {
    expect(scoreLineLayer(0)).toBe(1);
    expect(scoreLineLayer(500)).toBeCloseTo(Math.exp(-1));
  });

  it('maps families and variants to persisted node types', () => {
    expect(mapFamilyToNodeType('water_node', 'river')).toBe('riverbank_sweep');
    expect(mapFamilyToNodeType('water_node', 'storm')).toBe('storm_window');
    expect(mapFamilyToNodeType('bioregion_node', 'urban edge')).toBe('urban_fringe');
    expect(mapFamilyToNodeType('protected_node', 'park')).toBe('custom');
  });

  it('selects the strongest feature as primary and keeps bioregion as context', () => {
    const selection = selectNodes([
      score({
        nodeFamily: 'bioregion_node',
        variant: 'forest',
        score: 0.4,
        overlapRatio: 0.22,
        nearestDistanceM: 25,
      }),
      score({
        nodeFamily: 'water_node',
        variant: 'river',
        score: 0.6,
        overlapRatio: 0,
        nearestDistanceM: 12,
      }),
      score({
        nodeFamily: 'community_node',
        variant: 'urban',
        score: 0.15,
        overlapRatio: 0.1,
        nearestDistanceM: 30,
      }),
    ]);

    expect(selection.primaryNodeFamily).toBe('water_node');
    expect(selection.primaryVariant).toBe('river');
    expect(selection.modifierNodes).toEqual([
      'bioregion_node:forest',
      'community_node:urban',
    ]);
    expect(selection.actionBias.shield).toBe(0.22);
    expect(selection.signals).toMatchObject({
      bioregion_overlap_ratio: 0.22,
      bioregion_distance_m: 25,
      river_distance_m: 12,
      community_overlap_ratio: 0.1,
    });
  });

  it('falls back to bioregion when feature scores are below threshold', () => {
    const selection = selectNodes([
      score({ nodeFamily: 'bioregion_node', variant: 'forest', score: 0.3 }),
      score({ nodeFamily: 'water_node', variant: 'river', score: 0.04 }),
    ]);

    expect(selection.primaryNodeFamily).toBe('bioregion_node');
    expect(selection.primaryVariant).toBe('forest');
    expect(selection.modifierNodes).toEqual([]);
  });

  it('generates a six-node run ending in analysis', () => {
    const selection = selectNodes([
      score({ nodeFamily: 'water_node', variant: 'river', score: 0.7 }),
      score({ nodeFamily: 'bioregion_node', variant: 'forest', score: 0.4 }),
      score({ nodeFamily: 'protected_node', variant: 'park', score: 0.2 }),
    ]);

    const nodes = generateRunNodes(
      selection,
      [score({ nodeFamily: 'water_node', variant: 'river', score: 0.7 })],
      { water_ratio: 0.45, forest_ratio: 0.5, urban_ratio: 0.1 },
      2,
      0.1,
    );

    expect(nodes).toHaveLength(6);
    expect(nodes[0]).toMatchObject({
      node_type: 'riverbank_sweep',
      difficulty: 4,
      counterGem: 'key',
      objectiveTarget: 9,
    });
    expect(nodes.at(-1)).toMatchObject({
      node_type: 'analysis',
      objectiveTarget: 0,
    });
  });

  it('retunes waypoint nodes without dropping objective targets', () => {
    const baseNode: RunNode = {
      node_type: 'custom',
      difficulty: 3,
      obstacles: [],
      events: [],
      rationale: 'Original.',
      counterGem: null,
      obstacleFamily: null,
      requiredGems: [],
      objectiveTarget: 0,
      encounterConfig: null,
      waypoint: {
        slot: 1,
        name: 'Sample River',
        waypointType: 'river',
        nodeRole: 'river',
        lat: 1,
        lon: 2,
        distKm: 0.5,
        rankScore: 0.8,
        sourceTable: 'test',
        sourceId: 'wp-1',
        fallback: false,
      },
    };

    const [node] = applyWaypointsToRunNodes([baseNode]);

    expect(node).toMatchObject({
      node_type: 'riverbank_sweep',
      counterGem: 'key',
      objectiveTarget: 9,
    });
    expect(node.rationale).toContain('Sample River');
  });
});
