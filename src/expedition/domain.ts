// Gem domain — the single source of truth for what gems exist and mean.
//
// Investigation methods use five asset-backed color gems. Three other color
// ids remain registered for old board/memory data but do not spawn.
//
// GEM_REGISTRY holds the per-gem metadata (label, color, clue category);
// createBoardSpawnConfig / buildBoardSpawnConfigForNode compute the weighted
// spawn odds the board uses for a given node type. Behavior is pinned by
// tests/expedition/domain.test.ts.
import { GemCategory } from '@/game/clueConfig';

export const LOOT_GEM_TYPES = [
  'black',
  'blue',
  'green',
  'orange',
  'red',
  'white',
  'yellow',
  'purple',
] as const;

export const GEM_TYPES = [...LOOT_GEM_TYPES] as const;

export type LootGemType = typeof LOOT_GEM_TYPES[number];
export type GemType = LootGemType;
export type GemFamily = 'loot';

export const METHOD_TYPES = ['track', 'observe', 'listen', 'survey', 'analyze'] as const;
export type MethodType = typeof METHOD_TYPES[number];

/** Fixed v0 route slots. Board acquisition and case compilation share this order. */
export const METHOD_SLOTS = ['track', 'observe', 'survey'] as const satisfies readonly MethodType[];

export const METHOD_GEM_MAP: Record<MethodType, LootGemType> = {
  track: 'orange',
  observe: 'red',
  listen: 'yellow',
  survey: 'green',
  analyze: 'blue',
};

export const GEM_METHOD_MAP: Partial<Record<LootGemType, MethodType>> = Object.fromEntries(
  METHOD_TYPES.map((method) => [METHOD_GEM_MAP[method], method]),
) as Partial<Record<LootGemType, MethodType>>;

/** The only loot ids allowed to spawn in the investigation-method board. */
export const ACTIVE_GEM_TYPES = METHOD_TYPES.map(
  method => METHOD_GEM_MAP[method],
) as LootGemType[];

/** Player-facing method names (grades 6-12 outdoor-tech tone). */
export const METHOD_LABELS: Record<MethodType, string> = {
  track: 'Track',
  observe: 'Observe',
  listen: 'Listen',
  survey: 'Survey',
  analyze: 'Analyze',
};

export interface GemDefinition {
  gemType: GemType;
  family: GemFamily;
  label: string;
  color: string;
  clueCategory: GemCategory | null;
  assetBacked: boolean;
  isCrate?: boolean;
  isMultiplier?: boolean;
}

const LOOT_GEM_DEFINITIONS: Record<LootGemType, GemDefinition> = {
  black: {
    gemType: 'black',
    family: 'loot',
    label: 'Life Cycle Loot',
    color: '#1e293b',
    clueCategory: GemCategory.LIFE_CYCLE,
    assetBacked: true,
  },
  blue: {
    gemType: 'blue',
    family: 'loot',
    label: 'Geography & Habitat',
    color: '#3b82f6',
    clueCategory: GemCategory.GEOGRAPHIC,
    assetBacked: true,
  },
  green: {
    gemType: 'green',
    family: 'loot',
    label: 'Habitat Survey',
    color: '#22c55e',
    clueCategory: GemCategory.HABITAT,
    assetBacked: true,
  },
  orange: {
    gemType: 'orange',
    family: 'loot',
    label: 'Morphology Loot',
    color: '#f97316',
    clueCategory: GemCategory.MORPHOLOGY,
    assetBacked: true,
  },
  red: {
    gemType: 'red',
    family: 'loot',
    label: 'Classification Loot',
    color: '#ef4444',
    clueCategory: GemCategory.CLASSIFICATION,
    assetBacked: true,
  },
  white: {
    gemType: 'white',
    family: 'loot',
    label: 'Conservation Loot',
    color: '#e2e8f0',
    clueCategory: GemCategory.CONSERVATION,
    assetBacked: true,
  },
  yellow: {
    gemType: 'yellow',
    family: 'loot',
    label: 'Behavior Loot',
    color: '#eab308',
    clueCategory: GemCategory.BEHAVIOR,
    assetBacked: true,
  },
  purple: {
    gemType: 'purple',
    family: 'loot',
    label: 'Key Facts Loot',
    color: '#a855f7',
    clueCategory: GemCategory.KEY_FACTS,
    assetBacked: true,
  },
};

export const GEM_REGISTRY: Record<GemType, GemDefinition> = {
  ...LOOT_GEM_DEFINITIONS,
};

export const GEM_COLOR_MAP: Record<GemType, string> = Object.fromEntries(
  GEM_TYPES.map((gemType) => [gemType, GEM_REGISTRY[gemType].color])
) as Record<GemType, string>;

export const LOOT_GEM_DEFS = LOOT_GEM_TYPES.map((gemType) => GEM_REGISTRY[gemType]);

export function getGemDefinition(gemType: GemType): GemDefinition {
  return GEM_REGISTRY[gemType];
}

export function getGemFamily(gemType: GemType): GemFamily {
  return GEM_REGISTRY[gemType].family;
}

export function getClueCategoryForGemType(gemType: GemType): GemCategory | null {
  return GEM_REGISTRY[gemType].clueCategory;
}

export function isLootGem(gemType: GemType): gemType is LootGemType {
  return LOOT_GEM_TYPES.includes(gemType);
}

export interface BoardSpawnConfig {
  lootWeights?: Partial<Record<LootGemType, number>>;
}

export const DEFAULT_BOARD_SPAWN_CONFIG: BoardSpawnConfig = {
  lootWeights: {},
};

export function createBoardSpawnConfig(config?: {
  lootWeights?: Partial<Record<LootGemType, number>>;
}): BoardSpawnConfig {
  return {
    lootWeights: config?.lootWeights ?? {},
  };
}

export const NODE_TYPE_LABELS: Record<string, string> = {
  riverbank_sweep: 'River',
  dense_canopy: 'Canopy',
  urban_fringe: 'Urban',
  elevation_ridge: 'Ridge',
  storm_window: 'Storm',
  analysis: 'Analysis',
  custom: 'Special',
};

export function getRunNodeLabel(node: {
  node_type?: string;
  nodeType?: string;
  waypoint?: { waypointType?: string; fallback?: boolean } | null;
}): string {
  const nodeType = node.node_type ?? node.nodeType ?? 'custom';

  if (nodeType === 'custom' && node.waypoint) {
    switch (node.waypoint.waypointType) {
      case 'protected_area':
        return 'Protected';
      case 'bioregion_edge':
        return 'Ecotone';
      case 'basecamp':
        return node.waypoint.fallback ? 'Basecamp' : 'Urban';
      case 'lake':
      case 'wetland':
        return 'Water';
    }
  }

  return NODE_TYPE_LABELS[nodeType] || nodeType.replace(/_/g, ' ');
}

export function buildBoardSpawnConfigForNode(
  _nodeType: string,
  lootWeights?: Partial<Record<LootGemType, number>>,
): BoardSpawnConfig {
  return createBoardSpawnConfig({ lootWeights });
}
