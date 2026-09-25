// Shape of GET /api/clue-game/pool: every species with clues, plus their clues and
// facts, built from database rows (or the same rows in db/content/*.json).
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

/** Content rows as stored (snake_case columns); extra columns are ignored. */
export interface ContentRows {
  species: Array<{ id: number; common_name: string; scientific_name: string; class: string | null; taxon_order: string | null; family: string | null; genus: string | null; conservation_code: string | null }>;
  clues: Array<{ id: number; species_id: number; category: string; label: string; compare_tags: string[] | null; reveal_order: number; is_filtering: boolean }>;
  facts: Array<{ species_id: number; category: string; fact_text: string; sort_order: number }>;
}

/** The pool: every species that has clues, with its clues and facts in reveal order. */
export function poolFromRows({ species, clues, facts }: ContentRows): CluePool {
  const playable = new Set(clues.map(clue => clue.species_id));
  const byOrder = <T>(key: (row: T) => [number, string, number]) => (a: T, b: T) => {
    const [x, y] = [key(a), key(b)];
    return x[0] - y[0] || x[1].localeCompare(y[1]) || x[2] - y[2];
  };
  return {
    species: species.filter(row => playable.has(row.id)).sort((a, b) => a.id - b.id).map(row => ({
      id: row.id, commonName: row.common_name, scientificName: row.scientific_name, className: row.class,
      taxonOrder: row.taxon_order, family: row.family, genus: row.genus, conservationCode: row.conservation_code,
    })),
    clues: [...clues].sort(byOrder(row => [row.species_id, row.category, row.reveal_order])).map(row => ({
      id: row.id, speciesId: row.species_id, category: row.category as SpeciesClueCategory, label: row.label,
      compareTags: row.compare_tags ?? [], revealOrder: row.reveal_order, isFiltering: row.is_filtering,
    })),
    facts: facts.filter(row => playable.has(row.species_id)).sort(byOrder(row => [row.species_id, row.category, row.sort_order]))
      .map(row => ({ speciesId: row.species_id, category: row.category, text: row.fact_text, sortOrder: row.sort_order })),
  };
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
