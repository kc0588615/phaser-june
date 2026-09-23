// Shared case-corpus vocabulary (formerly exported by the v1 case compiler).
export const POOL_SIZE = 6;

export const CASE_TRAIT_CATEGORIES = [
  'habitat',
  'morphology',
  'diet',
  'behavior',
  'reproduction',
  'taxonomy',
  'key_fact',
  'geography',
  'conservation',
] as const;

export type CaseTraitCategory = typeof CASE_TRAIT_CATEGORIES[number];

const CASE_TRAIT_CATEGORY_SET: ReadonlySet<string> = new Set(CASE_TRAIT_CATEGORIES);

export function isCaseTraitCategory(value: unknown): value is CaseTraitCategory {
  return typeof value === 'string' && CASE_TRAIT_CATEGORY_SET.has(value);
}

export interface CompilerSpeciesProfile {
  speciesId: number;
  habitatTags: readonly string[];
  morphologyTags: readonly string[];
  dietTags: readonly string[];
  behaviorTags: readonly string[];
  reproductionTags: readonly string[];
  taxonomyTags: readonly string[];
  geographyTags: readonly string[];
  conservationTags: readonly string[];
  keyFactTags: readonly string[];
  signatureTag: string | null;
}

export const PROFILE_KEY_BY_CATEGORY = {
  habitat: 'habitatTags', morphology: 'morphologyTags', diet: 'dietTags', behavior: 'behaviorTags',
  reproduction: 'reproductionTags', taxonomy: 'taxonomyTags', key_fact: 'keyFactTags',
  geography: 'geographyTags', conservation: 'conservationTags',
} as const satisfies Record<CaseTraitCategory, keyof CompilerSpeciesProfile>;
