// Shared case-corpus vocabulary (formerly exported by the v1 case compiler).
export const PROTOTYPE_SPECIES_COUNT = 6;

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
