// Per-candidate trait phrases for revealed evidence families (Plan 018 v3).
//
// The server only returns the answer card's trait phrase, so the roster derives
// each candidate's own phrase from its public deduction profile: the shared
// compare tag when the candidate matches the evidence, otherwise the
// candidate's own (contrasting) tag for the same trait category.
import type { DeductionProfile } from '@/lib/deductionEngine';
import type { EvidenceFamily } from '@/expedition/evidenceFamilies';
import type { EarnedObservation } from '@/types/expedition';

type ProfileTagKey =
  | 'habitatTags' | 'morphologyTags' | 'dietTags' | 'behaviorTags' | 'reproductionTags'
  | 'taxonomyTags' | 'keyFactTags' | 'geographyTags' | 'conservationTags';

const CATEGORY_PROFILE_KEY: Record<string, ProfileTagKey> = {
  habitat: 'habitatTags',
  morphology: 'morphologyTags',
  diet: 'dietTags',
  behavior: 'behaviorTags',
  reproduction: 'reproductionTags',
  taxonomy: 'taxonomyTags',
  key_fact: 'keyFactTags',
  geography: 'geographyTags',
  conservation: 'conservationTags',
};

export function humanizeTag(tag: string): string {
  return tag.replace(/[_-]+/g, ' ').trim();
}

export function candidateTraitPhrase(
  profile: DeductionProfile,
  observation: EarnedObservation,
): string | null {
  const key = observation.traitCategory ? CATEGORY_PROFILE_KEY[observation.traitCategory] : undefined;
  if (!key) return null;
  const tags = profile[key];
  if (!Array.isArray(tags) || tags.length === 0) return null;
  const tag = observation.compareTag && tags.includes(observation.compareTag)
    ? observation.compareTag
    : tags[0];
  return humanizeTag(tag);
}

/** First earned observation per family, in reveal order. */
export function revealedFamilyObservations(
  observations: readonly EarnedObservation[],
): Partial<Record<EvidenceFamily, EarnedObservation>> {
  const revealed: Partial<Record<EvidenceFamily, EarnedObservation>> = {};
  for (const observation of observations) {
    if (observation.family && !revealed[observation.family]) revealed[observation.family] = observation;
  }
  return revealed;
}
