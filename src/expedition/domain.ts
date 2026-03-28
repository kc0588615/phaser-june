import { GemCategory } from '@/game/clueConfig';

export const ACTION_GEM_TYPES = [
  'sword',
  'staff',
  'shield',
  'key',
  'crate',
  'power',
  'thought',
  'multiplier',
] as const;

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

export const GEM_TYPES = [...ACTION_GEM_TYPES, ...LOOT_GEM_TYPES] as const;

export type ActionGemType = typeof ACTION_GEM_TYPES[number];
export type LootGemType = typeof LOOT_GEM_TYPES[number];
export type GemType = typeof GEM_TYPES[number];
export type GemFamily = 'action' | 'loot';

export const CURRENCY_KEYS = ['gold', 'power', 'thought', 'dust'] as const;
export type CurrencyKey = typeof CURRENCY_KEYS[number];

export interface ResourceWallet {
  gold: number;
  power: number;
  thought: number;
  dust: number;
}

export interface GemDefinition {
  gemType: GemType;
  family: GemFamily;
  label: string;
  color: string;
  clueCategory: GemCategory | null;
  currencyKey: CurrencyKey | null;
  assetBacked: boolean;
  isCrate?: boolean;
  isMultiplier?: boolean;
}

const ACTION_GEM_DEFINITIONS: Record<ActionGemType, GemDefinition> = {
  sword: {
    gemType: 'sword',
    family: 'action',
    label: 'Observe',
    color: '#dc2626',
    clueCategory: null,
    currencyKey: null,
    assetBacked: false,
  },
  staff: {
    gemType: 'staff',
    family: 'action',
    label: 'Scan',
    color: '#6366f1',
    clueCategory: null,
    currencyKey: null,
    assetBacked: false,
  },
  shield: {
    gemType: 'shield',
    family: 'action',
    label: 'Camouflage',
    color: '#94a3b8',
    clueCategory: null,
    currencyKey: null,
    assetBacked: false,
  },
  key: {
    gemType: 'key',
    family: 'action',
    label: 'Traverse',
    color: '#f59e0b',
    clueCategory: null,
    currencyKey: 'gold',
    assetBacked: false,
  },
  crate: {
    gemType: 'crate',
    family: 'action',
    label: 'Backpack',
    color: '#b45309',
    clueCategory: null,
    currencyKey: 'gold',
    assetBacked: false,
    isCrate: true,
  },
  power: {
    gemType: 'power',
    family: 'action',
    label: 'Focus',
    color: '#06b6d4',
    clueCategory: null,
    currencyKey: 'power',
    assetBacked: false,
  },
  thought: {
    gemType: 'thought',
    family: 'action',
    label: 'Field Notes',
    color: '#10b981',
    clueCategory: null,
    currencyKey: 'thought',
    assetBacked: false,
  },
  multiplier: {
    gemType: 'multiplier',
    family: 'action',
    label: 'Burst',
    color: '#ec4899',
    clueCategory: null,
    currencyKey: null,
    assetBacked: false,
    isMultiplier: true,
  },
};

const LOOT_GEM_DEFINITIONS: Record<LootGemType, GemDefinition> = {
  black: {
    gemType: 'black',
    family: 'loot',
    label: 'Life Cycle Loot',
    color: '#1e293b',
    clueCategory: GemCategory.LIFE_CYCLE,
    currencyKey: null,
    assetBacked: true,
  },
  blue: {
    gemType: 'blue',
    family: 'loot',
    label: 'Geographic Loot',
    color: '#3b82f6',
    clueCategory: GemCategory.GEOGRAPHIC,
    currencyKey: null,
    assetBacked: true,
  },
  green: {
    gemType: 'green',
    family: 'loot',
    label: 'Habitat Loot',
    color: '#22c55e',
    clueCategory: GemCategory.HABITAT,
    currencyKey: null,
    assetBacked: true,
  },
  orange: {
    gemType: 'orange',
    family: 'loot',
    label: 'Morphology Loot',
    color: '#f97316',
    clueCategory: GemCategory.MORPHOLOGY,
    currencyKey: null,
    assetBacked: true,
  },
  red: {
    gemType: 'red',
    family: 'loot',
    label: 'Classification Loot',
    color: '#ef4444',
    clueCategory: GemCategory.CLASSIFICATION,
    currencyKey: null,
    assetBacked: true,
  },
  white: {
    gemType: 'white',
    family: 'loot',
    label: 'Conservation Loot',
    color: '#e2e8f0',
    clueCategory: GemCategory.CONSERVATION,
    currencyKey: null,
    assetBacked: true,
  },
  yellow: {
    gemType: 'yellow',
    family: 'loot',
    label: 'Behavior Loot',
    color: '#eab308',
    clueCategory: GemCategory.BEHAVIOR,
    currencyKey: null,
    assetBacked: true,
  },
  purple: {
    gemType: 'purple',
    family: 'loot',
    label: 'Key Facts Loot',
    color: '#a855f7',
    clueCategory: GemCategory.KEY_FACTS,
    currencyKey: null,
    assetBacked: true,
  },
};

export const GEM_REGISTRY: Record<GemType, GemDefinition> = {
  ...ACTION_GEM_DEFINITIONS,
  ...LOOT_GEM_DEFINITIONS,
};

export const GEM_COLOR_MAP: Record<GemType, string> = Object.fromEntries(
  GEM_TYPES.map((gemType) => [gemType, GEM_REGISTRY[gemType].color])
) as Record<GemType, string>;

export const ACTION_GEM_DEFS = ACTION_GEM_TYPES.map((gemType) => GEM_REGISTRY[gemType]);
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

export function getCurrencyKeyForGemType(gemType: GemType): CurrencyKey | null {
  return GEM_REGISTRY[gemType].currencyKey;
}

export function isActionGem(gemType: GemType): gemType is ActionGemType {
  return getGemFamily(gemType) === 'action';
}

export function isLootGem(gemType: GemType): gemType is LootGemType {
  return getGemFamily(gemType) === 'loot';
}

export function createEmptyResourceWallet(): ResourceWallet {
  return {
    gold: 0,
    power: 0,
    thought: 0,
    dust: 0,
  };
}

export const WALLET_DEFS: Array<{
  key: CurrencyKey;
  label: string;
  color: string;
  shortLabel: string;
}> = [
  { key: 'gold', label: 'Supplies', color: '#fbbf24', shortLabel: 'S' },
  { key: 'power', label: 'Focus', color: '#06b6d4', shortLabel: 'F' },
  { key: 'thought', label: 'Insight', color: '#10b981', shortLabel: 'I' },
  { key: 'dust', label: 'Samples', color: '#c084fc', shortLabel: 'Sa' },
];

export type ConsumableEffectType = 'score_burst' | 'objective_push' | 'move_buffer' | 'queue_boost';

export interface ConsumableBlueprint {
  id: string;
  name: string;
  description: string;
  effectType: ConsumableEffectType;
}

export interface ConsumableItem extends ConsumableBlueprint {
  instanceId: string;
  source: 'crate';
}

export const CRATE_ITEM_BLUEPRINTS: ConsumableBlueprint[] = [
  {
    id: 'fireball',
    name: 'Signal Flare',
    description: '+75 score. Illuminates the tracking area.',
    effectType: 'score_burst',
  },
  {
    id: 'food',
    name: 'Bait',
    description: '+2 node objective progress.',
    effectType: 'objective_push',
  },
  {
    id: 'shell',
    name: 'Trail Map',
    description: '+3 max moves for this node.',
    effectType: 'move_buffer',
  },
  {
    id: 'tile_bomb',
    name: 'Field Kit',
    description: 'Queues action gems for the next refill.',
    effectType: 'queue_boost',
  },
];

function buildConsumableInstanceId(blueprintId: string): string {
  return `${blueprintId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

export function createConsumableItem(blueprint: ConsumableBlueprint): ConsumableItem {
  return {
    ...blueprint,
    instanceId: buildConsumableInstanceId(blueprint.id),
    source: 'crate',
  };
}

export function rollCrateConsumable(matchSize: number): ConsumableItem {
  const pool =
    matchSize >= 5
      ? [
          CRATE_ITEM_BLUEPRINTS[3],
          CRATE_ITEM_BLUEPRINTS[0],
          CRATE_ITEM_BLUEPRINTS[1],
          CRATE_ITEM_BLUEPRINTS[2],
        ]
      : CRATE_ITEM_BLUEPRINTS;
  const blueprint = pool[Math.floor(Math.random() * pool.length)] ?? CRATE_ITEM_BLUEPRINTS[0];
  return createConsumableItem(blueprint);
}

export interface BoardSpawnConfig {
  lootChance: number;
  actionWeights: Record<ActionGemType, number>;
}

export const DEFAULT_ACTION_WEIGHTS: Record<ActionGemType, number> = {
  sword: 0.125,
  staff: 0.125,
  shield: 0.125,
  key: 0.125,
  crate: 0.125,
  power: 0.125,
  thought: 0.125,
  multiplier: 0.125,
};

export const DEFAULT_BOARD_SPAWN_CONFIG: BoardSpawnConfig = {
  lootChance: 0.12,
  actionWeights: { ...DEFAULT_ACTION_WEIGHTS },
};

function normalizeActionWeights(weights: Partial<Record<ActionGemType, number>>): Record<ActionGemType, number> {
  const merged: Record<ActionGemType, number> = { ...DEFAULT_ACTION_WEIGHTS };
  for (const gemType of ACTION_GEM_TYPES) {
    const raw = weights[gemType];
    if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
      merged[gemType] = raw;
    }
  }

  const total = ACTION_GEM_TYPES.reduce((sum, gemType) => sum + merged[gemType], 0);
  if (total <= 0) {
    return { ...DEFAULT_ACTION_WEIGHTS };
  }

  const normalized = {} as Record<ActionGemType, number>;
  for (const gemType of ACTION_GEM_TYPES) {
    normalized[gemType] = merged[gemType] / total;
  }
  return normalized;
}

export function createBoardSpawnConfig(config?: {
  lootChance?: number;
  actionBias?: Partial<Record<ActionGemType, number>>;
  objectiveActions?: ActionGemType[];
  nodeBoosts?: Partial<Record<ActionGemType, number>>;
}): BoardSpawnConfig {
  const lootChance = Math.min(Math.max(config?.lootChance ?? DEFAULT_BOARD_SPAWN_CONFIG.lootChance, 0), 0.45);
  const mergedWeights: Partial<Record<ActionGemType, number>> = {
    ...DEFAULT_ACTION_WEIGHTS,
    ...(config?.actionBias ?? {}),
  };

  for (const gemType of config?.objectiveActions ?? []) {
    mergedWeights[gemType] = (mergedWeights[gemType] ?? 0) + 0.18;
  }

  for (const [gemType, weight] of Object.entries(config?.nodeBoosts ?? {})) {
    const typedGem = gemType as ActionGemType;
    mergedWeights[typedGem] = (mergedWeights[typedGem] ?? 0) + (weight ?? 0);
  }

  return {
    lootChance,
    actionWeights: normalizeActionWeights(mergedWeights),
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

const NODE_TYPE_BOARD_META: Record<
  string,
  {
    lootChance: number;
    nodeBoosts: Partial<Record<ActionGemType, number>>;
  }
> = {
  riverbank_sweep: {
    lootChance: 0.1,
    nodeBoosts: { shield: 0.1, power: 0.08, staff: 0.05 },
  },
  dense_canopy: {
    lootChance: 0.12,
    nodeBoosts: { sword: 0.1, crate: 0.08, thought: 0.05 },
  },
  urban_fringe: {
    lootChance: 0.11,
    nodeBoosts: { key: 0.1, thought: 0.08, multiplier: 0.04 },
  },
  elevation_ridge: {
    lootChance: 0.1,
    nodeBoosts: { staff: 0.1, shield: 0.08, power: 0.04 },
  },
  storm_window: {
    lootChance: 0.08,
    nodeBoosts: { power: 0.1, multiplier: 0.08, sword: 0.04 },
  },
  custom: {
    lootChance: 0.14,
    nodeBoosts: { crate: 0.1, thought: 0.08, key: 0.04 },
  },
  analysis: {
    lootChance: 0.18,
    nodeBoosts: { thought: 0.08, multiplier: 0.06, crate: 0.04 },
  },
};

export function buildBoardSpawnConfigForNode(
  nodeType: string,
  requiredGems: GemType[] = [],
  actionBias: Partial<Record<ActionGemType, number>> = {}
): BoardSpawnConfig {
  const meta = NODE_TYPE_BOARD_META[nodeType] ?? NODE_TYPE_BOARD_META.custom;
  const objectiveActions = requiredGems.filter(isActionGem);
  return createBoardSpawnConfig({
    lootChance: meta.lootChance,
    actionBias,
    objectiveActions,
    nodeBoosts: meta.nodeBoosts,
  });
}
