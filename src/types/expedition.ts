import type { AffinityType } from '@/expedition/affinities';
import type { RunNode } from '@/lib/nodeScoring';
import type { RoutePoint } from '@/lib/expeditionRoute';
import type { ExpeditionWaypoint } from '@/types/waypoints';

export type { RunNode };

export type RunPhase = 'idle' | 'briefing' | 'mystery' | 'complete';

export interface EarnedObservation {
  ref: string;
  family: import('@/expedition/evidenceFamilies').EvidenceFamily;
  observationText: string;
  inferenceText?: string;
  traitCategory?: import('@/db/schema/species').DeductionClueCategory;
  actualEliminatedIds?: number[];
  eliminationReasons?: Record<string, string>;
  candidateTraitPhrases?: Record<string, string>;
  issuedAtMs: number;
}

export interface FieldFact {
  nodeIndex: number;
  family: import('@/expedition/evidenceFamilies').EvidenceFamily;
  text: string;
}

/** A revealed ladder rung: which family/category spoke, what it said, who it ruled out. */
export type LedgerFact = import('@/lib/evidenceLadder').PublicLedgerFact;

/** Success body of POST /api/runs/[runId]/evidence-progress. */
export interface EvidenceProgressResponse {
  ok: true;
  duplicate: boolean;
  nodeIndex: number;
  segmentMovesUsed: number;
  evidenceCharges: CaseState['evidenceCharges'];
  offeredFamilies: import('@/expedition/evidenceFamilies').EvidenceFamily[];
  hintLines: string[];
  hintFamilies: import('@/expedition/evidenceFamilies').EvidenceFamily[];
  cascadeHintLine: string | null;
  facts: LedgerFact[];
  hypotheses: import('@/lib/liveClaims').Hypotheses;
  reinforcedFamilies: import('@/expedition/evidenceFamilies').EvidenceFamily[];
}

export interface CaseState {
  version: 4;
  claims: import('@/lib/liveClaims').ClaimState;
  hypotheses: import('@/lib/liveClaims').Hypotheses;
  explanationFeedback: Record<string, string>;
  mapView: import('@/expedition/mapView').ExpeditionMapView | null;
  mystery: import('@/lib/mysteryCase').PublicMysteryCase;
  /** Sub-state of phase 'mystery': incident, board play, evidence choice/reveal, or final diagnosis. */
  stage: import('@/expedition/caseFlow').CaseStage;
  candidateIds: number[];
  profiles: import('@/lib/deductionEngine').DeductionProfile[];
  observations: EarnedObservation[];
  eliminatedIds: number[];
  guessResult: 'correct' | 'wrong' | null;
  lastFeedback: import('@/lib/deductionEngine').ComparisonResult[] | null;
  diagnosisFeedback: import('@/lib/mysteryCase').DiagnosisFeedback | null;
  objectiveProgress: number;
  objectiveTarget: number;
  nodeOutcomes: Array<'met' | 'failed' | null>;
  evidenceCharges: import('@/expedition/evidenceFamilies').EvidenceChargeState;
  carriedCharges: import('@/expedition/evidenceFamilies').EvidenceChargeState;
  offeredFamilies: import('@/expedition/evidenceFamilies').EvidenceFamily[];
  selectedFamilies: import('@/expedition/evidenceFamilies').EvidenceFamily[];
  travelEntry: string | null;
  hintFeed: Array<{
    id: string;
    text: string;
    kind: 'evidence' | 'cascade' | 'reinforce';
    family?: import('@/expedition/evidenceFamilies').EvidenceFamily;
  }>;
  eliminationReasons: Record<string, string>;
  /** Live deduction between hard clues, in reveal order. */
  factLedger: LedgerFact[];
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
  runId: string | null;
  phase: RunPhase;
  expedition: ExpeditionData | null;
  currentNodeIndex: number;
  bankedScore: number;
  finalScore: number | null;
  visitedWaypointSlot: number;
  completionReason?: 'captured' | 'slipped';
  /** The public candidate selected in a server-confirmed correct diagnosis. */
  resolvedSpeciesId: number | null;
  resolvedExplanationId: string | null;
  fieldFacts: FieldFact[];
  caseResolution: import('@/lib/mysteryCase').MysteryResolution | null;
  caseState: CaseState | null;
}

// --- New Economy Types ---

/** Early-resolution bonus based on completed research sites (0–3). */
export function getGuessBonuses(sitesCompleted: number, isCorrect: boolean): { guessBonus: number; efficiencyBonus: number } {
  if (!isCorrect) return { guessBonus: 0, efficiencyBonus: 0 };
  const guessBonus = 250;
  let efficiencyBonus = 25;
  if (sitesCompleted === 0) efficiencyBonus = 200;
  else if (sitesCompleted === 1) efficiencyBonus = 150;
  else if (sitesCompleted === 2) efficiencyBonus = 100;
  return { guessBonus, efficiencyBonus };
}
