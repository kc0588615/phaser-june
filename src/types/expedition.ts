import type { ActionGemType, ConsumableItem as DomainConsumableItem, ResourceWallet as DomainResourceWallet } from '@/expedition/domain';
import type { AffinityType } from '@/expedition/affinities';
import { createEmptyResourceWallet as createEmptyDomainResourceWallet } from '@/expedition/domain';
import type { RunNode } from '@/lib/nodeScoring';
import type { CluePayload } from '@/game/clueConfig';

export type { RunNode };

export type RunPhase = 'idle' | 'briefing' | 'in-run' | 'deduction' | 'complete';

export type SpookTier = 'stabilized' | 'spooked' | 'escaped';

export function getSpookTier(pct: number): SpookTier {
  if (pct > 0.6) return 'stabilized';
  if (pct > 0.2) return 'spooked';
  return 'escaped';
}

export interface ExpeditionData {
  nodes: RunNode[];
  bioregion: { bioregion: string | null; realm: string | null; biome: string | null } | null;
  protectedAreas: Array<{ name: string | null; designation: string | null; iucn_category: string | null }>;
  actionBias: Partial<Record<ActionGemType, number>>;
  activeAffinities: AffinityType[];
  availableAffinities: AffinityType[];
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
  activeAffinities: AffinityType[];
  resourceWallet: ResourceWallet;
  lootMatchSummary: Record<string, number>;
  equippedPassives: PassiveRelic[];
  consumables: ConsumableItem[];
  pendingNodeModifiers: string[];
  currentBattleState: BattleState | null;
  souvenirs: SouvenirDef[];
  // New economy fields
  bankedScore: number;
  clueFragments: ClueFragments;
  triviaUnlocked: string[];
  deductionCamp: DeductionCampState | null;
  comparativeDeduction: ComparativeDeductionState | null;
  currentNodeBonus: NodeBonusState | null;
  lastNodeRewards: NodeRewardLanes | null;
  finalScore: number | null;
  totalThoughtDiscount: number;
}

// --- New Economy Types ---

export type ClueCategoryKey = 'classification' | 'habitat' | 'geographic' | 'morphology'
  | 'behavior' | 'life_cycle' | 'conservation' | 'key_facts';

export const CLUE_CATEGORY_KEYS: ClueCategoryKey[] = [
  'classification', 'habitat', 'geographic', 'morphology',
  'behavior', 'life_cycle', 'conservation', 'key_facts',
];

/** Map DeductionClueCategory → ClueCategoryKey for fragment wallet lookups */
export function deductionCatToWalletKey(cat: string): ClueCategoryKey {
  switch (cat) {
    case 'habitat': return 'habitat';
    case 'morphology': return 'morphology';
    case 'diet': return 'behavior';       // diet fragments stored under behavior
    case 'behavior': return 'behavior';
    case 'reproduction': return 'life_cycle'; // reproduction → life_cycle
    case 'taxonomy': return 'classification'; // taxonomy → classification
    case 'key_fact': return 'key_facts';
    case 'geography': return 'geographic';
    case 'conservation': return 'conservation';
    default: return 'key_facts';
  }
}

export interface ClueFragments {
  classification: number;
  habitat: number;
  geographic: number;
  morphology: number;
  behavior: number;
  life_cycle: number;
  conservation: number;
  key_facts: number;
}

export function createEmptyClueFragments(): ClueFragments {
  return {
    classification: 0, habitat: 0, geographic: 0, morphology: 0,
    behavior: 0, life_cycle: 0, conservation: 0, key_facts: 0,
  };
}

export interface NodeBonusState {
  startPool: number;
  currentPool: number;
  decayRate: number;
  floorPct: number;
  shieldSlowActive: boolean;
}

export interface ClueShopEntry {
  category: ClueCategoryKey;
  purchased: number;
  fragmentCount: number;
}

export interface DeductionCampState {
  bankedScore: number;
  clueFragments: ClueFragments;
  clueShop: ClueShopEntry[];
  revealedClues: CluePayload[];
  triviaUnlocked: string[];
  scoreSpent: number;
  guessResult: 'pending' | 'correct' | 'wrong' | null;
  guessBonusAwarded: number;
  thoughtDiscountPct: number;
}

// ---------------------------------------------------------------------------
// Comparative deduction state (Phase 2)
// ---------------------------------------------------------------------------

import type { DeductionClueCategory } from '@/db/schema/species';
import type {
  DeductionProfile,
  DeductionClue,
  ProcessedClue,
  ReferenceAttempt,
} from '@/lib/deductionEngine';

export interface ComparativeDeductionState {
  /** Mystery species profile (tag arrays for comparison) */
  mysteryProfile: DeductionProfile;
  /** All clues available for the mystery species */
  mysteryClues: DeductionClue[];
  /** Clues the player has processed (unblurred) */
  processedClues: ProcessedClue[];
  /** Album cards available as references */
  albumProfiles: DeductionProfile[];
  /** Currently slotted reference card (null = empty slot) */
  activeReferenceId: number | null;
  /** History of all reference attempts */
  referenceHistory: ReferenceAttempt[];
  /** Confirmed tags per category from successful comparisons */
  confirmedTags: Partial<Record<DeductionClueCategory, string[]>>;
  /** Species IDs eliminated via negative confirmation */
  eliminatedSpeciesIds: number[];
  /** Current candidate count after filtering */
  candidateCount: number;
  /** Fragment + score spending */
  fragmentsSpent: Partial<Record<ClueCategoryKey, number>>;
  scoreSpent: number;
  /** Final guess */
  guessResult: 'pending' | 'correct' | 'wrong' | null;
  guessBonusAwarded: number;
}

export function createEmptyComparativeState(
  mysteryProfile: DeductionProfile,
  mysteryClues: DeductionClue[],
  albumProfiles: DeductionProfile[],
): ComparativeDeductionState {
  return {
    mysteryProfile,
    mysteryClues,
    processedClues: [],
    albumProfiles,
    activeReferenceId: null,
    referenceHistory: [],
    confirmedTags: {},
    eliminatedSpeciesIds: [],
    candidateCount: albumProfiles.length + 1, // +1 for mystery species itself
    fragmentsSpent: {},
    scoreSpent: 0,
    guessResult: null,
    guessBonusAwarded: 0,
  };
}

export interface NodeRewardLanes {
  baseClearReward: number;
  preservedNodeBonus: number;
  triviaReward: number;
  clueFragmentReward: Partial<Record<ClueCategoryKey, number>>;
  tier: SpookTier;
}

/** Escalating cost for nth clue purchase in a category */
export function getClueShopCost(purchased: number, fragmentCount: number, thoughtDiscountPct = 0): number {
  const baseCosts = [40, 70, 110, 160, 220];
  const base = baseCosts[Math.min(purchased, baseCosts.length - 1)];
  const discount = Math.floor(fragmentCount / 3) * 15;
  const discountedBase = Math.round((base - discount) * Math.max(0, 1 - thoughtDiscountPct));
  return Math.max(10, discountedBase);
}

/** Guess bonus based on paid clue count */
export function getGuessBonuses(totalPaidClues: number, isCorrect: boolean): { guessBonus: number; efficiencyBonus: number } {
  if (!isCorrect) return { guessBonus: 0, efficiencyBonus: 0 };
  const guessBonus = 250;
  let efficiencyBonus = 25;
  if (totalPaidClues <= 2) efficiencyBonus = 200;
  else if (totalPaidClues <= 5) efficiencyBonus = 100;
  return { guessBonus, efficiencyBonus };
}

export function getDeductionFinalScore(camp: DeductionCampState): number {
  const totalPaidClues = camp.clueShop.reduce((sum, entry) => sum + entry.purchased, 0);
  const isCorrect = camp.guessResult === 'correct';
  const { guessBonus, efficiencyBonus } = getGuessBonuses(totalPaidClues, isCorrect);
  return camp.bankedScore - camp.scoreSpent + guessBonus + efficiencyBonus;
}

export function createEmptyResourceWallet(): ResourceWallet {
  return createEmptyDomainResourceWallet();
}
