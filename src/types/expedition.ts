import type { ActionGemType, ConsumableItem as DomainConsumableItem, ResourceWallet as DomainResourceWallet } from '@/expedition/domain';
import { createEmptyResourceWallet as createEmptyDomainResourceWallet } from '@/expedition/domain';
import type { RunNode } from '@/lib/nodeScoring';

export type { RunNode };

export type RunPhase = 'idle' | 'briefing' | 'in-run' | 'complete';

export interface ExpeditionData {
  nodes: RunNode[];
  bioregion: { bioregion: string | null; realm: string | null; biome: string | null } | null;
  protectedAreas: Array<{ name: string | null; designation: string | null; iucn_category: string | null }>;
  actionBias: Partial<Record<ActionGemType, number>>;
  primaryNodeFamily: string;
  primaryVariant: string;
  modifierNodes: string[];
  signals: Record<string, number>;
  iccaTerritories?: Array<{ name: string | null; comm_name: string | null; habit_type: string | null; threats: string | null; distance_m: number }>;
  nearestRiverDistM?: number | null;
}

export interface EncounterEffect {
  type: 'bonus_gems' | 'score_boost' | 'objective_boost';
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
  dropChance: number;
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

export type ResourceWallet = DomainResourceWallet;
export type ConsumableItem = DomainConsumableItem;

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
  resourceWallet: ResourceWallet;
  lootMatchSummary: Record<string, number>;
  equippedPassives: PassiveRelic[];
  consumables: ConsumableItem[];
  pendingNodeModifiers: string[];
  currentBattleState: BattleState | null;
  souvenirs: SouvenirDef[];
}

export function createEmptyResourceWallet(): ResourceWallet {
  return createEmptyDomainResourceWallet();
}
