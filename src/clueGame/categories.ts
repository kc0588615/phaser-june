// The content check's groups (validatePool.ts warns when a playable animal has no clue or fact in a
// group, or no tagged clue in a group that `deduces`). The eight rows began as the first clue game's
// gem colors; no screen reads them now.

/** `species_deduction_clues.category` values (the table's CHECK constraint). */
export type SpeciesClueCategory = 'habitat' | 'morphology' | 'diet' | 'behavior' | 'reproduction' | 'taxonomy' | 'key_fact' | 'geography' | 'conservation';

export interface GemCategory {
  label: string;
  /** `species_deduction_clues.category` values in this group. */
  clueCategories: readonly SpeciesClueCategory[];
  /** `species_facts.category` values in this group (never deductive). */
  factCategories: readonly string[];
  /** Whether the group needs a tagged clue (false: notes to learn from). */
  deduces: boolean;
}

export const GEM_CATEGORIES: readonly GemCategory[] = [
  { label: 'Family tree', clueCategories: ['taxonomy'], factCategories: [], deduces: true },
  { label: 'Body', clueCategories: ['morphology'], factCategories: [], deduces: true },
  { label: 'Behavior & diet', clueCategories: ['behavior', 'diet'], factCategories: ['behavior', 'diet_prey', 'diet_flora'], deduces: true },
  { label: 'Habitat', clueCategories: ['habitat'], factCategories: [], deduces: true },
  { label: 'Range', clueCategories: ['geography'], factCategories: [], deduces: true },
  { label: 'Life cycle', clueCategories: ['reproduction'], factCategories: ['life_description'], deduces: true },
  { label: 'Conservation', clueCategories: ['conservation'], factCategories: ['threat'], deduces: false },
  { label: 'Key facts', clueCategories: ['key_fact'], factCategories: ['key_fact'], deduces: false },
];
