import type { ActionGemType } from '@/expedition/domain';
import type { AffinityType } from '@/expedition/affinities';
import type { RunNode } from '@/lib/nodeScoring';
import type { CluePayload } from '@/game/clueConfig';
import type { RoutePoint } from '@/lib/expeditionRoute';
import type { RunEvidenceBundle } from '@/types/gis';
import type { ExpeditionWaypoint } from '@/types/waypoints';
import type { MatchBattleRunState } from '@/game/matchBattle/types';
import type { MatchBattlePartner } from '@/game/matchBattle/partner';

export type { RunNode };

export type RunPhase = 'idle' | 'briefing' | 'in-run' | 'reward' | 'route' | 'deduction' | 'complete';

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
  lootMatchSummary: Record<string, number>;
  pendingNodeModifiers: string[];
  bankedScore: number;
  revealedDuringRun: CluePayload[];
  triviaUnlocked: string[];
  deductionCamp: DeductionCampState | null;
  comparativeDeduction: ComparativeDeductionState | null;
  finalScore: number | null;
  evidenceBundle: RunEvidenceBundle | null;
  selectedPartner: MatchBattlePartner | null;
  matchBattle: MatchBattleRunState | null;
}

// --- New Economy Types ---

export type ClueCategoryKey = 'classification' | 'habitat' | 'geographic' | 'morphology'
  | 'behavior' | 'life_cycle' | 'conservation' | 'key_facts';

export const CLUE_CATEGORY_KEYS: ClueCategoryKey[] = [
  'classification', 'habitat', 'geographic', 'morphology',
  'behavior', 'life_cycle', 'conservation', 'key_facts',
];

export interface ClueShopEntry {
  category: ClueCategoryKey;
  purchased: number;
}

export interface DeductionCampState {
  bankedScore: number;
  clueShop: ClueShopEntry[];
  revealedClues: CluePayload[];
  triviaUnlocked: string[];
  scoreSpent: number;
  wrongGuesses: number;
  guessResult: 'pending' | 'correct' | 'wrong' | null;
  guessBonusAwarded: number;
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
  /** Score spent on clue processing */
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
    scoreSpent: 0,
    guessResult: null,
    guessBonusAwarded: 0,
  };
}

/** Escalating cost for nth clue purchase in a category */
export function getClueShopCost(purchased: number): number {
  const baseCosts = [40, 70, 110, 160, 220];
  return baseCosts[Math.min(purchased, baseCosts.length - 1)];
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

export interface CaptureGrade {
  tier: 1 | 2 | 3;
  label: string;
}

export function getCaptureGrade(cluesUsed: number, wrongGuesses: number): CaptureGrade {
  if (cluesUsed <= 2 && wrongGuesses === 0) return { tier: 3, label: 'Featured Find' };
  if (cluesUsed <= 5 && wrongGuesses <= 1) return { tier: 2, label: 'Documented' };
  return { tier: 1, label: 'Logged' };
}

export function getDeductionFinalScore(camp: DeductionCampState): number {
  const totalPaidClues = camp.clueShop.reduce((sum, entry) => sum + entry.purchased, 0);
  const isCorrect = camp.guessResult === 'correct';
  const { guessBonus, efficiencyBonus } = getGuessBonuses(totalPaidClues, isCorrect);
  return camp.bankedScore - camp.scoreSpent + guessBonus + efficiencyBonus;
}
