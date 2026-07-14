import type { AffinityType } from '@/expedition/affinities';
import type { RunNode } from '@/lib/nodeScoring';
import type { RoutePoint } from '@/lib/expeditionRoute';
import type { ExpeditionWaypoint } from '@/types/waypoints';
import type { DeductionClueCategory } from '@/db/schema/species';

export type { RunNode };

export type RunPhase = 'idle' | 'briefing' | 'mystery' | 'complete';

export interface EarnedObservation {
  ref: string;
  method: import('@/expedition/domain').MethodType;
  observationText: string;
  inferenceText?: string;
  traitCategory?: import('@/db/schema/species').DeductionClueCategory;
  compareTag?: string;
  isSignature: boolean;
  issuedAtMs: number;
}

export interface InterpretationEvent {
  obsRef: string;
  predictedEliminatedIds: number[];
  actualEliminatedIds: number[];
  correct: boolean;
  latencyMs: number;
}

export interface CaseState {
  /** Sub-state of phase 'mystery': board play, evidence interpretation, or the final guess. */
  stage: import('@/expedition/caseFlow').CaseStage;
  candidateIds: number[];
  profiles: import('@/lib/deductionEngine').DeductionProfile[];
  observations: EarnedObservation[];
  interpretations: InterpretationEvent[];
  eliminatedIds: number[];
  pendingInterpretationRef: string | null;
  missedEvidenceNodeIndexes: number[];
  guessResult: 'correct' | 'wrong' | null;
  lastFeedback: import('@/lib/deductionEngine').ComparisonResult[] | null;
}

export interface ExpeditionData {
  nodes: RunNode[];
  bioregion: { bioregion: string | null; realm: string | null; biome: string | null } | null;
  protectedAreas: Array<{ name: string | null; designation: string | null; iucn_category: string | null }>;
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

export interface RunState {
  phase: RunPhase;
  expedition: ExpeditionData | null;
  currentNodeIndex: number;
  bankedScore: number;
  finalScore: number | null;
  visitedWaypointSlot: number;
  completionReason?: 'captured' | 'slipped';
  /** The public candidate the player selected on a server-confirmed correct guess. */
  resolvedSpeciesId: number | null;
  caseState: CaseState | null;
}

// --- New Economy Types ---

export type ClueCategoryKey = 'classification' | 'habitat' | 'geographic' | 'morphology'
  | 'behavior' | 'life_cycle' | 'conservation' | 'key_facts';

export interface ConfirmedClue {
  clueId: number;
  category: DeductionClueCategory;
  compareTags: string[];
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
