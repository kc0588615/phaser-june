/**
 * Deduction profile types shared by the expedition run state.
 *
 * The comparative-reference runtime (compareReference, filterCandidates, …)
 * was removed as dead code in plan 039; only the persisted shapes remain.
 */

import type { DeductionClueCategory } from '@/db/schema/species';

/** Subset of species_deduction_profiles needed at runtime */
export interface DeductionProfile {
  speciesId: number;
  commonName: string;
  scientificName: string;
  habitatTags: string[];
  morphologyTags: string[];
  dietTags: string[];
  behaviorTags: string[];
  reproductionTags: string[];
  taxonomyTags: string[];
  geographyTags: string[];
  conservationTags: string[];
  keyFactTags: string[];
  signatureTag: string | null;
}

/** Result of comparing one category between mystery and reference */
export interface ComparisonResult {
  category: DeductionClueCategory;
  matched: boolean;
  matchedTags: string[];
  message: string;
}
