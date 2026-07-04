import type { ActionGemType } from '@/expedition/domain';
import type { AffinityType } from '@/expedition/affinities';
import type { RunNode } from '@/lib/nodeScoring';
import type { CluePayload } from '@/game/clueConfig';
import type { RoutePoint } from '@/lib/expeditionRoute';
import type { RunEvidenceBundle } from '@/types/gis';
import type { ExpeditionWaypoint } from '@/types/waypoints';

export type { RunNode };

export type RunPhase = 'idle' | 'briefing' | 'mystery' | 'complete';

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
  routePolyline?: RoutePoint[];
  waypoints?: ExpeditionWaypoint[];
  waypointRadiusKm?: number | null;
  nearestRiverDistM?: number | null;
}

export type NodeType = 'collection' | 'standoff' | 'crisis' | 'store';

export interface RunState {
  phase: RunPhase;
  expedition: ExpeditionData | null;
  currentNodeIndex: number;
  activeAffinities: AffinityType[];
  bankedScore: number;
  clueFragments: ClueFragments;
  deductionCamp: DeductionCampState | null;
  comparativeDeduction: ComparativeDeductionState | null;
  finalScore: number | null;
  totalThoughtDiscount: number;
  evidenceBundle: RunEvidenceBundle | null;
  routeMatchCount: number;
  visitedWaypointSlot: number;
  completionReason?: 'captured' | 'slipped';
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
  ComparisonResult,
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
  lastWrongGuessFeedback: ComparisonResult[] | null;
  habitatSurvey: HabitatSurveyEntry[];
  habitatSurveyCompleteNotified: boolean;
}

export interface HabitatSurveyEntry {
  habitatType: string;
  percentage: number;
  revealed: boolean;
}

export function createEmptyComparativeState(
  mysteryProfile: DeductionProfile,
  mysteryClues: DeductionClue[],
  albumProfiles: DeductionProfile[],
  habitatSurvey: HabitatSurveyEntry[] = [],
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
    lastWrongGuessFeedback: null,
    habitatSurvey,
    habitatSurveyCompleteNotified: false,
  };
}

export interface NodeRewardLanes {
  baseClearReward: number;
  preservedNodeBonus: number;
  triviaReward: number;
  clueFragmentReward: Partial<Record<ClueCategoryKey, number>>;
  tier: SpookTier;
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
