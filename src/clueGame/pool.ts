// Shape of GET /api/clue-game/pool: every species with clues, plus their clues and facts.
import type { SpeciesClueCategory } from '@/clueGame/categories';

export interface PoolSpecies {
  id: number;
  commonName: string;
  scientificName: string;
  className: string | null;
  taxonOrder: string | null;
  family: string | null;
  genus: string | null;
  /** IUCN Red List category code, e.g. 'EN'. */
  conservationCode: string | null;
}

export interface PoolClue {
  id: number;
  speciesId: number;
  category: SpeciesClueCategory;
  label: string;
  compareTags: string[];
  revealOrder: number;
  isFiltering: boolean;
}

export interface PoolFact {
  speciesId: number;
  category: string;
  text: string;
  sortOrder: number;
}

export interface CluePool {
  species: PoolSpecies[];
  clues: PoolClue[];
  facts: PoolFact[];
}

/** Text that stands in for "nothing here" ("None", "N/A"); never shown to players. */
export function isPlaceholderText(text: string): boolean {
  return /^(none|n\/a|unknown|-)?\.?$/i.test(text.trim());
}

/** An animal's key facts (facts first, then key-fact clues), without repeats. */
export function keyFacts(pool: Pick<CluePool, 'facts' | 'clues'>, speciesId: number): string[] {
  return [...new Set([
    ...pool.facts.filter(fact => fact.speciesId === speciesId && fact.category === 'key_fact').map(fact => fact.text),
    ...pool.clues.filter(clue => clue.speciesId === speciesId && clue.category === 'key_fact').map(clue => clue.label),
  ])];
}
