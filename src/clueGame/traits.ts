// What each species' record says, and when two records truly disagree.
//
// Tags are `prefix:value` (docs/CONTENT_SOURCES.md has the vocabulary). A
// species' record is its taxonomy (as class:/order:/family:/genus: tags) plus
// every tag on its own clues. How a clue's tag compares with a candidate:
//   - exclusive prefixes hold one value per species (size:small, diet:plants,
//     family:felidae): the candidate holding another value is ruled out;
//   - complete prefixes list every value a species has, from one data source
//     for all species (realm:, country:, habitat:): a candidate that has some
//     values but not this one is ruled out;
//   - anything else is an open trait: a candidate lacking it has "no record",
//     which proves nothing.
// A candidate with no value at all for a prefix is never ruled out by it.
import type { SpeciesClueCategory } from '@/clueGame/categories';
import type { CluePool, PoolClue, PoolSpecies } from '@/clueGame/pool';

export const TAXONOMY_RANKS = ['class', 'order', 'family', 'genus'] as const;
export type TaxonomyRank = typeof TAXONOMY_RANKS[number];
export type Taxonomy = Record<TaxonomyRank, string | null>;

/** One value per species. */
export const EXCLUSIVE_PREFIXES = new Set<string>([
  ...TAXONOMY_RANKS, 'size', 'lifespan', 'diet', 'activity', 'birth', 'young', 'social', 'covering',
]);

/** IUCN habitat classes (level 1); each class name is also the prefix of its level-2 kinds, e.g. forest:tropical_moist_lowland. */
export const HABITAT_CLASSES = ['forest', 'savanna', 'shrubland', 'grassland', 'wetlands', 'rocky', 'caves', 'desert', 'marine', 'artificial'] as const;

/** Every value a species has, from one source for all species. */
export const COMPLETE_PREFIXES = new Set<string>(['realm', 'country', 'system', 'habitat', ...HABITAT_CLASSES]);

/** Biogeographic realms, tagged on Range clues from each species' IUCN range map. */
export const REALM_TAGS = [
  'realm:nearctic', 'realm:neotropical', 'realm:palearctic', 'realm:afrotropical',
  'realm:indomalayan', 'realm:australasian', 'realm:oceanian', 'realm:antarctic',
] as const;

export function prefixOf(tag: string): string | null {
  const colon = tag.indexOf(':');
  return colon > 0 ? tag.slice(0, colon) : null;
}

export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

export interface SpeciesRecord {
  taxonomy: Taxonomy;
  traits: Map<SpeciesClueCategory, Set<string>>;
}

export type SpeciesRecords = Map<number, SpeciesRecord>;

export function taxonomyOf(species: PoolSpecies): Taxonomy {
  const lower = (value: string | null) => value?.trim().toLowerCase() || null;
  return { class: lower(species.className), order: lower(species.taxonOrder), family: lower(species.family), genus: lower(species.genus) };
}

export function buildSpeciesRecords(pool: Pick<CluePool, 'species' | 'clues'>): SpeciesRecords {
  const records: SpeciesRecords = new Map();
  const add = (record: SpeciesRecord, category: SpeciesClueCategory, tag: string) => {
    const tags = record.traits.get(category) ?? new Set<string>();
    record.traits.set(category, tags.add(tag));
  };
  for (const species of pool.species) {
    const record: SpeciesRecord = { taxonomy: taxonomyOf(species), traits: new Map() };
    for (const rank of TAXONOMY_RANKS) if (record.taxonomy[rank]) add(record, 'taxonomy', `${rank}:${record.taxonomy[rank]}`);
    records.set(species.id, record);
  }
  for (const clue of pool.clues) {
    const record = records.get(clue.speciesId);
    if (record) for (const tag of clue.compareTags) add(record, clue.category, normalizeTag(tag));
  }
  return records;
}

/** Every tag in a record, across categories. */
export function allTraits(record: SpeciesRecord): Set<string> {
  return new Set([...record.traits.values()].flatMap(tags => [...tags]));
}

/** A clue's tags, normalized, with duplicates removed. */
export function clueTags(clue: Pick<PoolClue, 'compareTags'>): string[] {
  return [...new Set(clue.compareTags.map(normalizeTag))];
}
