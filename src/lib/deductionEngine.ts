/**
 * Comparative deduction engine.
 *
 * Compares a mystery species' deduction profile against reference cards
 * from the player's album, returning match/mismatch results per category
 * and progressively filtering the candidate pool.
 */

import type { DeductionClueCategory } from '@/db/schema/species';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
}

/** A clue row from species_deduction_clues */
export interface DeductionClue {
  id: number;
  speciesId: number;
  category: DeductionClueCategory;
  label: string;
  compareTags: string[] | null;
  revealOrder: number;
  unlockMode: 'fragment' | 'score';
  baseCost: number;
  isFiltering: boolean;
}

/** Result of comparing one category between mystery and reference */
export interface ComparisonResult {
  category: DeductionClueCategory;
  matched: boolean;
  matchedTags: string[];
  message: string;
}

/** Tracks a single reference placement in the slot */
export interface ReferenceAttempt {
  referenceSpeciesId: number;
  referenceName: string;
  clueId: number;
  category: DeductionClueCategory;
  result: ComparisonResult;
}

/** A processed (unblurred) clue */
export interface ProcessedClue {
  clueId: number;
  category: DeductionClueCategory;
  label: string;
  status: 'locked' | 'processed' | 'confirmed' | 'rejected';
  compareTags: string[] | null;
  fragmentCost: number;
}

// The 6 filtering categories that map 1:1 to profile tag arrays
const FILTERING_CATEGORIES: DeductionClueCategory[] = [
  'habitat', 'morphology', 'diet', 'behavior', 'reproduction', 'taxonomy',
];

// Map category → profile key
const CATEGORY_TO_PROFILE_KEY: Record<string, keyof DeductionProfile> = {
  habitat: 'habitatTags',
  morphology: 'morphologyTags',
  diet: 'dietTags',
  behavior: 'behaviorTags',
  reproduction: 'reproductionTags',
  taxonomy: 'taxonomyTags',
};

// ---------------------------------------------------------------------------
// Core comparison
// ---------------------------------------------------------------------------

/**
 * Compare a mystery species against a reference card for a specific category.
 * Returns whether any tags overlap and which ones matched.
 */
export function compareReference(
  mysteryProfile: DeductionProfile,
  referenceProfile: DeductionProfile,
  category: DeductionClueCategory,
): ComparisonResult {
  const profileKey = CATEGORY_TO_PROFILE_KEY[category];
  if (!profileKey) {
    return { category, matched: false, matchedTags: [], message: 'Non-comparable category.' };
  }

  const mysteryTags = mysteryProfile[profileKey] as string[];
  const referenceTags = referenceProfile[profileKey] as string[];
  const intersection = mysteryTags.filter(t => referenceTags.includes(t));
  const matched = intersection.length > 0;

  const message = matched
    ? buildMatchMessage(category, referenceProfile.commonName, intersection)
    : buildMismatchMessage(category, referenceProfile.commonName, mysteryTags);

  return { category, matched, matchedTags: intersection, message };
}

function buildMatchMessage(
  category: DeductionClueCategory,
  refName: string,
  matchedTags: string[],
): string {
  const tagStr = matchedTags.slice(0, 3).map(formatTag).join(', ');
  const catLabel = category.toUpperCase().replace('_', ' ');
  return `${catLabel} CONFIRMED. ${refName} shares: ${tagStr}. Mystery subject likely in same group.`;
}

function buildMismatchMessage(
  category: DeductionClueCategory,
  refName: string,
  _mysteryTags: string[],
): string {
  const catLabel = category.toUpperCase().replace('_', ' ');
  return `NEGATIVE. ${refName} does not match on ${catLabel}. This type is eliminated.`;
}

function formatTag(tag: string): string {
  return tag.replace(/_/g, ' ');
}

// ---------------------------------------------------------------------------
// Candidate filtering
// ---------------------------------------------------------------------------

/**
 * Given all species profiles and a set of confirmed tag matches,
 * return profiles that satisfy ALL confirmed constraints.
 *
 * confirmedTags: Record<category, tags[]> — each entry means
 * "the mystery species has these tags in this category".
 *
 * eliminatedSpeciesIds: species explicitly ruled out via negative confirmation.
 */
export function filterCandidates(
  allProfiles: DeductionProfile[],
  confirmedTags: Partial<Record<DeductionClueCategory, string[]>>,
  eliminatedSpeciesIds: Set<number>,
): DeductionProfile[] {
  return allProfiles.filter(p => {
    if (eliminatedSpeciesIds.has(p.speciesId)) return false;

    for (const cat of FILTERING_CATEGORIES) {
      const required = confirmedTags[cat];
      if (!required || required.length === 0) continue;

      const profileKey = CATEGORY_TO_PROFILE_KEY[cat];
      if (!profileKey) continue;

      const profileTags = p[profileKey] as string[];
      // Candidate must share at least one of the confirmed tags
      const hasOverlap = required.some(t => profileTags.includes(t));
      if (!hasOverlap) return false;
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// Clue helpers
// ---------------------------------------------------------------------------

/** Get the next unprocessed clue for a category, respecting reveal_order */
export function getNextClue(
  clues: DeductionClue[],
  category: DeductionClueCategory,
  processedClueIds: Set<number>,
): DeductionClue | null {
  return clues
    .filter(c => c.category === category && !processedClueIds.has(c.id))
    .sort((a, b) => a.revealOrder - b.revealOrder)[0] ?? null;
}

/** Get all clues for a species grouped by category */
export function groupCluesByCategory(
  clues: DeductionClue[],
): Map<DeductionClueCategory, DeductionClue[]> {
  const map = new Map<DeductionClueCategory, DeductionClue[]>();
  for (const c of clues) {
    const arr = map.get(c.category) ?? [];
    arr.push(c);
    map.set(c.category, arr);
  }
  return map;
}

/** Calculate effective cost for a clue given fragments and discount */
export function getEffectiveClueCost(
  clue: DeductionClue,
  fragmentCount: number,
  thoughtDiscountPct: number,
): number {
  if (clue.unlockMode === 'fragment') {
    const discount = Math.floor(fragmentCount / 3) * 1;
    const base = Math.max(1, clue.baseCost - discount);
    return Math.max(1, Math.round(base * Math.max(0, 1 - thoughtDiscountPct)));
  }
  // Score-based clues: flat cost with thought discount only
  return Math.max(10, Math.round(clue.baseCost * Math.max(0, 1 - thoughtDiscountPct)));
}

/** Check if a category is a filtering (comparative) category */
export function isFilteringCategory(cat: DeductionClueCategory): boolean {
  return FILTERING_CATEGORIES.includes(cat);
}

/** Get the profile tag array name for a category, or null if non-filtering */
export function getProfileKeyForCategory(cat: DeductionClueCategory): keyof DeductionProfile | null {
  return CATEGORY_TO_PROFILE_KEY[cat] as keyof DeductionProfile | null ?? null;
}
