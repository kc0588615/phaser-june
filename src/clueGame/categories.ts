// Clue-category game: each gem color outputs clues from one category of the
// mystery species (the classic clue-board mapping, docs/DEVELOPER_ONBOARDING.md §6).
import type { LootGemType } from '@/expedition/domain';
import type { SpeciesClueCategory } from '@/types/speciesClues';

export { SPECIES_CLUE_CATEGORIES, type SpeciesClueCategory } from '@/types/speciesClues';

export interface GemCategory {
  gem: LootGemType;
  label: string;
  /** Fits a phone legend tile. */
  shortLabel: string;
  question: string;
  /** `species_deduction_clues.category` values this gem draws from, merged by reveal order. */
  clueCategories: readonly SpeciesClueCategory[];
  /** `species_facts.category` values used once the clues run out (never deductive). */
  factCategories: readonly string[];
  /** HUD swatch; the light stop of the gem icon's gradient. */
  color: string;
  /** Whether this color's clues narrow the candidates (false: notes to learn from). */
  deduces: boolean;
}

export const GEM_CATEGORIES: readonly GemCategory[] = [
  { gem: 'red', label: 'Family tree', shortLabel: 'Family', question: 'What is it related to?', clueCategories: ['taxonomy'], factCategories: [], color: '#ff8b81', deduces: true },
  { gem: 'orange', label: 'Body', shortLabel: 'Body', question: 'What does it look like?', clueCategories: ['morphology'], factCategories: [], color: '#ffc56b', deduces: true },
  { gem: 'yellow', label: 'Behavior & diet', shortLabel: 'Habits', question: 'How does it live and eat?', clueCategories: ['behavior', 'diet'], factCategories: ['behavior', 'diet_prey', 'diet_flora'], color: '#ffe87c', deduces: true },
  { gem: 'green', label: 'Habitat', shortLabel: 'Habitat', question: 'Where does it live?', clueCategories: ['habitat'], factCategories: [], color: '#7bd99b', deduces: true },
  { gem: 'blue', label: 'Range', shortLabel: 'Range', question: 'Which part of the world?', clueCategories: ['geography'], factCategories: [], color: '#79d7ff', deduces: true },
  { gem: 'black', label: 'Life cycle', shortLabel: 'Life', question: 'How does it grow up?', clueCategories: ['reproduction'], factCategories: ['life_description'], color: '#a7afbd', deduces: true },
  { gem: 'white', label: 'Conservation', shortLabel: 'Status', question: 'Is it in danger?', clueCategories: ['conservation'], factCategories: ['threat'], color: '#e8eef5', deduces: false },
  { gem: 'purple', label: 'Key facts', shortLabel: 'Facts', question: 'What makes it special?', clueCategories: ['key_fact'], factCategories: ['key_fact'], color: '#c9a2ff', deduces: false },
];

export const CLUE_GAME_GEM_TYPES: readonly LootGemType[] = GEM_CATEGORIES.map(category => category.gem);

const BY_GEM = new Map(GEM_CATEGORIES.map(category => [category.gem, category]));

export function gemCategory(gem: LootGemType): GemCategory {
  const category = BY_GEM.get(gem);
  if (!category) throw new Error(`No clue category for gem ${gem}`);
  return category;
}
