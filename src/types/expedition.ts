import type { RunNode } from '@/lib/nodeScoring';

export type { RunNode };

export type RunPhase = 'idle' | 'briefing' | 'in-run' | 'complete';

export interface ExpeditionData {
  nodes: RunNode[];
  bioregion: { bioregion: string | null; realm: string | null; biome: string | null } | null;
  protectedAreas: Array<{ name: string | null; designation: string | null; iucn_category: string | null }>;
  resourceBias: Record<string, number>;
  primaryNodeFamily: string;
  primaryVariant: string;
  modifierNodes: string[];
  signals: Record<string, number>;
  iccaTerritories?: Array<{ name: string | null; comm_name: string | null; habit_type: string | null; threats: string | null; distance_m: number }>;
  nearestRiverDistM?: number | null;
}

/** Board gem name → hex color for UI swatches */
export const GEM_COLOR_MAP: Record<string, string> = {
  // Knowledge gems
  black: '#1e293b',
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f97316',
  red: '#ef4444',
  white: '#e2e8f0',
  yellow: '#eab308',
  purple: '#a855f7',
  // Resource gems
  nature: '#34d399',
  water: '#38bdf8',
  knowledge: '#cbd5e1',
  craft: '#fb923c',
};

/** Short display labels for node_type values */
export const NODE_TYPE_LABELS: Record<string, string> = {
  riverbank_sweep: 'River',
  dense_canopy: 'Canopy',
  urban_fringe: 'Urban',
  elevation_ridge: 'Ridge',
  storm_window: 'Storm',
  analysis: 'Analysis',
  custom: 'Special',
};

/** Shared gem display metadata */
export const GEM_DEFS = [
  { key: 'nature_gem' as const, label: 'Nature', color: '#22c55e' },
  { key: 'water_gem' as const, label: 'Water', color: '#3b82f6' },
  { key: 'knowledge_gem' as const, label: 'Knowledge', color: '#e2e8f0' },
  { key: 'craft_gem' as const, label: 'Craft', color: '#f97316' },
] as const;

// --- Encounter & Souvenir types ---

export type EncounterEffectType = 'bonus_gems' | 'score_boost' | 'objective_boost';

export interface EncounterEffect {
  type: EncounterEffectType;
  label: string;
}

export const ENCOUNTER_CATALOG: Record<string, EncounterEffect> = {
  amphibian_signal:       { type: 'bonus_gems',      label: 'Amphibian Signal!' },
  river_crossing:         { type: 'score_boost',      label: 'River Crossing!' },
  trail_markings:         { type: 'objective_boost',  label: 'Trail Markings!' },
  rare_track:             { type: 'bonus_gems',       label: 'Rare Track!' },
  human_disturbance:      { type: 'score_boost',      label: 'Human Disturbance!' },
  corridor_crossing:      { type: 'objective_boost',  label: 'Corridor Crossing!' },
  vantage_scan:           { type: 'bonus_gems',       label: 'Vantage Scan!' },
  urgent_tracking_window: { type: 'score_boost',      label: 'Urgent Window!' },
  migration_shift:        { type: 'objective_boost',  label: 'Migration Shift!' },
  discovery_event:        { type: 'bonus_gems',       label: 'Discovery!' },
  wager_guess:            { type: 'objective_boost',  label: 'Wager!' },
};

export interface SouvenirDef {
  id: string;
  name: string;
  emoji: string;
  dropChance: number; // 0-1
}

export const SOUVENIR_CATALOG: Record<string, SouvenirDef> = {
  amphibian_signal:       { id: 'frog_charm',      name: 'Frog Charm',      emoji: '🐸', dropChance: 0.6 },
  river_crossing:         { id: 'river_stone',     name: 'River Stone',     emoji: '🪨', dropChance: 0.5 },
  trail_markings:         { id: 'trail_marker',    name: 'Trail Marker',    emoji: '🪵', dropChance: 0.5 },
  rare_track:             { id: 'pawprint_fossil', name: 'Pawprint Fossil', emoji: '🐾', dropChance: 0.35 },
  human_disturbance:      { id: 'urban_artifact',  name: 'Urban Artifact',  emoji: '🏗', dropChance: 0.4 },
  corridor_crossing:      { id: 'feather',         name: 'Flight Feather',  emoji: '🪶', dropChance: 0.3 },
  vantage_scan:           { id: 'spyglass_lens',   name: 'Spyglass Lens',   emoji: '🔭', dropChance: 0.3 },
  urgent_tracking_window: { id: 'storm_crystal',   name: 'Storm Crystal',   emoji: '⚡', dropChance: 0.15 },
  migration_shift:        { id: 'compass_shard',   name: 'Compass Shard',   emoji: '🧭', dropChance: 0.2 },
  discovery_event:        { id: 'mystery_seed',    name: 'Mystery Seed',    emoji: '🌱', dropChance: 0.4 },
  wager_guess:            { id: 'lucky_coin',      name: 'Lucky Coin',      emoji: '🪙', dropChance: 0.2 },
};

export type NodeType = 'collection' | 'standoff' | 'crisis' | 'store';

export interface ResourceWallet {
  nature: number;
  water: number;
  knowledge: number;
  craft: number;
}

export interface ConsumableItem {
  id: string;
  name: string;
  resourceCost: Partial<ResourceWallet>;
  effect: string;
}

export interface PassiveRelic {
  id: string;
  name: string;
  effect: string;
}

export interface BattleState {
  creatureHp: number;
  creatureMaxHp: number;
  creatureArmor: number;
  playerHp: number;
  playerMaxHp: number;
  telegraph: string | null;
  turnsUntilAction: number;
  weaknesses: string[];
  resistances: string[];
}

export interface RunState {
  phase: RunPhase;
  expedition: ExpeditionData | null;
  currentNodeIndex: number;
  /** Legacy flat wallet — kept for backward compat, prefer resourceWallet */
  gemWallet: { nature_gem: number; water_gem: number; knowledge_gem: number; craft_gem: number };
  resourceWallet: ResourceWallet;
  knowledgeMatchSummary: Record<string, number>;
  equippedPassives: PassiveRelic[];
  consumables: ConsumableItem[];
  pendingNodeModifiers: string[];
  currentBattleState: BattleState | null;
  souvenirs: SouvenirDef[];
}

export function createEmptyResourceWallet(): ResourceWallet {
  return { nature: 0, water: 0, knowledge: 0, craft: 0 };
}
