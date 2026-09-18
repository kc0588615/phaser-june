/**
 * Comparative deduction engine.
 *
 * Compares a mystery species' deduction profile against reference cards
 * from the player's album, returning match/mismatch results per category
 * and progressively filtering the candidate pool.
 */

import type { DeductionClueCategory } from '@/db/schema/species';
import type { ConfirmedClue } from '@/types/expedition';

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
  isFiltering: boolean;
  fragmentCost: number;
}

// Filtering categories that map 1:1 to profile tag arrays.
const FILTERING_CATEGORIES: DeductionClueCategory[] = [
  'habitat',
  'morphology',
  'diet',
  'behavior',
  'reproduction',
  'taxonomy',
  'geography',
  'conservation',
  'key_fact',
];

// Map category → profile key
const CATEGORY_TO_PROFILE_KEY: Record<string, keyof DeductionProfile> = {
  habitat: 'habitatTags',
  morphology: 'morphologyTags',
  diet: 'dietTags',
  behavior: 'behaviorTags',
  reproduction: 'reproductionTags',
  taxonomy: 'taxonomyTags',
  geography: 'geographyTags',
  conservation: 'conservationTags',
  key_fact: 'keyFactTags',
};

// ---------------------------------------------------------------------------
// Core comparison
// ---------------------------------------------------------------------------

/**
 * Compare a mystery species against a reference card for a specific category.
 * Returns whether any tags overlap and which ones matched.
 *
 * When `compareTags` is supplied (the specific tags a clue concerns), the
 * comparison is restricted to those tags so the result reflects the clue's
 * actual subject — preventing spurious matches via unrelated category overlap.
 */
export function compareReference(
  mysteryProfile: DeductionProfile,
  referenceProfile: DeductionProfile,
  category: DeductionClueCategory,
  compareTags?: string[] | null,
): ComparisonResult {
  const profileKey = CATEGORY_TO_PROFILE_KEY[category];
  if (!profileKey) {
    return { category, matched: false, matchedTags: [], message: 'Non-comparable category.' };
  }

  const mysteryTags = mysteryProfile[profileKey] as string[];
  const referenceTags = referenceProfile[profileKey] as string[];
  const focusTags = (compareTags && compareTags.length > 0)
    ? mysteryTags.filter(t => compareTags.includes(t))
    : mysteryTags;
  const intersection = focusTags.filter(t => referenceTags.includes(t));
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
 * Given all species profiles and a set of confirmed clue constraints,
 * return profiles that satisfy ALL confirmed constraints.
 *
 * confirmedClues: each entry means "the mystery species has one of these
 * compareTags in this category". Every clue entry must pass. Tags inside one
 * clue are ORed; separate confirmed clues are ANDed.
 *
 * eliminatedSpeciesIds: species explicitly ruled out via negative confirmation.
 */
export function filterCandidates(
  allProfiles: DeductionProfile[],
  confirmedClues: ConfirmedClue[],
  eliminatedSpeciesIds: Set<number>,
): DeductionProfile[] {
  return allProfiles.filter(p => {
    if (eliminatedSpeciesIds.has(p.speciesId)) return false;

    for (const clue of confirmedClues) {
      if (clue.compareTags.length === 0) continue;
      const profileKey = CATEGORY_TO_PROFILE_KEY[clue.category];
      if (!profileKey) continue;

      const profileTags = p[profileKey] as string[];
      const hasOverlap = clue.compareTags.some(t => profileTags.includes(t));
      if (!hasOverlap) return false;
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// Clue helpers
// ---------------------------------------------------------------------------

export function isFilteringCategory(cat: DeductionClueCategory): boolean {
  return FILTERING_CATEGORIES.includes(cat);
}

/** Get the profile tag array name for a category, or null if non-filtering */
export function getProfileKeyForCategory(cat: DeductionClueCategory): keyof DeductionProfile | null {
  return CATEGORY_TO_PROFILE_KEY[cat] as keyof DeductionProfile | null ?? null;
}

// ---------------------------------------------------------------------------
// GIS evidence → auto-confirm habitat tags
// ---------------------------------------------------------------------------

import type { RunEvidenceBundle, FeatureClass } from '@/types/gis';

/** Map GIS feature classes to habitat tags for auto-confirmation. */
const FEATURE_CLASS_HABITAT_TAGS: Record<FeatureClass, string[]> = {
  river: ['freshwater', 'riverine', 'riparian'],
  lake: ['freshwater', 'lacustrine'],
  protected_area: ['protected', 'conservation_area'],
  bioregion: [],
  ramsar_site: ['wetland', 'freshwater', 'marsh', 'ramsar'],
};

/**
 * Auto-confirm habitat tags on a mystery profile using GIS evidence.
 * Returns tags that were confirmed (intersection of evidence-derived tags and profile tags).
 */
export function applyEvidenceBundle(
  bundle: RunEvidenceBundle,
  profile: DeductionProfile,
): { confirmedHabitatTags: string[]; confirmedCategories: DeductionClueCategory[] } {
  const evidenceTags = new Set<string>();
  for (const fp of bundle.fingerprints) {
    const tags = FEATURE_CLASS_HABITAT_TAGS[fp.featureClass] ?? [];
    for (const t of tags) evidenceTags.add(t);
  }

  const confirmedHabitatTags = profile.habitatTags.filter(t => evidenceTags.has(t));
  const confirmedCategories: DeductionClueCategory[] = [];
  if (confirmedHabitatTags.length > 0) {
    confirmedCategories.push('habitat');
  }

  return { confirmedHabitatTags, confirmedCategories };
}
