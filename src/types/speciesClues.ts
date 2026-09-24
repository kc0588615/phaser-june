// Stored clue categories (`species_deduction_clues.category`). Shared by the DB
// schema and the Clue Match rules; keep this file free of imports.
export const SPECIES_CLUE_CATEGORIES = ['habitat', 'morphology', 'diet', 'behavior', 'reproduction', 'taxonomy', 'key_fact', 'geography', 'conservation'] as const;
export type SpeciesClueCategory = typeof SPECIES_CLUE_CATEGORIES[number];
