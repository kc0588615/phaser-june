// Shape of GET /api/clue-game/pool: every species with clues, plus their clues and facts.
import type { SpeciesClueCategory } from '@/types/speciesClues';

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
  iucnId: number;
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

const ORDER_EMOJI: Record<string, string> = { ANURA: '🐸', TESTUDINES: '🐢', CARNIVORA: '🐅', ARTIODACTYLA: '🦌' };
const CLASS_EMOJI: Record<string, string> = { AMPHIBIA: '🐸', REPTILIA: '🦎', MAMMALIA: '🐾', AVES: '🐦' };

/** Card portrait: an emoji for the animal's group, else its initials. */
export function speciesBadge(species: PoolSpecies): string {
  return ORDER_EMOJI[species.taxonOrder ?? ''] ?? CLASS_EMOJI[species.className ?? '']
    ?? species.commonName.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase();
}
