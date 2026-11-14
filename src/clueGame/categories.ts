// Clue-category game: each gem color outputs clues from one category of the
// mystery species (the classic clue-board mapping).

/** `species_deduction_clues.category` values (the table's CHECK constraint). */
export type SpeciesClueCategory = 'habitat' | 'morphology' | 'diet' | 'behavior' | 'reproduction' | 'taxonomy' | 'key_fact' | 'geography' | 'conservation';

export interface GemCategory {
  label: string;
  /** `species_deduction_clues.category` values this gem draws from, merged by reveal order. */
  clueCategories: readonly SpeciesClueCategory[];
  /** `species_facts.category` values used once the clues run out (never deductive). */
  factCategories: readonly string[];
  /** Whether this color's clues narrow the candidates (false: notes to learn from). */
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
