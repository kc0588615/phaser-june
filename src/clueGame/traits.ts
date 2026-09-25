// What each species' record says, and when two records truly disagree.
//
// A record is the species' taxonomy (from the species table) plus the tags on
// its own clues, normalized. Most tags are open traits: a candidate whose
// record lacks one has "no record" of it, which proves nothing. Only three kinds
// of difference count as a contradiction:
//   - taxonomy: every species has exactly one class, order, family, and genus;
//   - exclusive axes: pairs like egg-laying vs live birth, where having one
//     value means not having the other;
//   - complete families: tags computed for every species from full data, like
//     realms from range maps, so a record with some realm but not this one
//     truly doesn't live there.
import type { SpeciesClueCategory } from '@/types/speciesClues';
import type { CluePool, PoolClue, PoolSpecies } from '@/clueGame/pool';

export const TAXONOMY_RANKS = ['class', 'order', 'family', 'genus'] as const;
export type TaxonomyRank = typeof TAXONOMY_RANKS[number];
export type Taxonomy = Record<TaxonomyRank, string | null>;

/** Tags that are mutually exclusive: a record holding one value rules out the others. */
export const EXCLUSIVE_AXES = {
  birth: ['egg_laying', 'live_birth'],
  lifespan: ['long_lived', 'short_lived'],
  size: ['tiny', 'large_bodied'],
  voice: ['vocal', 'voiceless'],
  diet: ['carnivore', 'herbivore'],
  shell: ['shelled', 'unshelled'],
  sociality: ['herd', 'solitary'],
} as const satisfies Record<string, readonly string[]>;
export type ExclusiveAxis = keyof typeof EXCLUSIVE_AXES;

/** Biogeographic realms, tagged on Range clues from each species' IUCN range map (migration 039). */
export const REALM_TAGS = [
  'realm:nearctic', 'realm:neotropical', 'realm:palearctic', 'realm:afrotropical',
  'realm:indomalayan', 'realm:australasian', 'realm:oceanian', 'realm:antarctic',
] as const;

/** Tag families that are complete wherever a record has any member (see the header). */
const COMPLETE_FAMILIES = ['realm:'] as const;

export function completeFamilyOf(tag: string): string | null {
  return COMPLETE_FAMILIES.find(prefix => tag.startsWith(prefix)) ?? null;
}

const AXIS_BY_TAG = new Map<string, ExclusiveAxis>(
  (Object.entries(EXCLUSIVE_AXES) as Array<[ExclusiveAxis, readonly string[]]>)
    .flatMap(([axis, values]) => values.map(value => [value, axis] as const)),
);

// Authoring prefixes that don't change a tag's meaning.
const MEANINGLESS_PREFIXES = ['diet_type:', 'activity_pattern:', 'sociality:', 'body_plan:', 'distinctive_features:', 'family:', 'parity:'];

export function normalizeTag(tag: string): string {
  const lower = tag.trim().toLowerCase();
  const prefix = MEANINGLESS_PREFIXES.find(candidate => lower.startsWith(candidate));
  return prefix ? lower.slice(prefix.length) : lower;
}

export function axisOf(tag: string): ExclusiveAxis | null {
  return AXIS_BY_TAG.get(tag) ?? null;
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

/** Facts that follow from taxonomy, added to every record so axes can compare fairly. */
function derivedTraits(taxonomy: Taxonomy): Array<[SpeciesClueCategory, string]> {
  const derived: Array<[SpeciesClueCategory, string]> = [];
  if (taxonomy.order === 'testudines') derived.push(['morphology', 'shelled']);
  else if (taxonomy.class) derived.push(['morphology', 'unshelled']);
  if (taxonomy.class === 'mammalia') derived.push(['reproduction', 'live_birth']);
  if (taxonomy.order === 'testudines') derived.push(['reproduction', 'egg_laying']);
  return derived;
}

export function buildSpeciesRecords(pool: Pick<CluePool, 'species' | 'clues'>): SpeciesRecords {
  const records: SpeciesRecords = new Map();
  for (const species of pool.species) {
    const taxonomy = taxonomyOf(species);
    const traits = new Map<SpeciesClueCategory, Set<string>>();
    const add = (category: SpeciesClueCategory, tag: string) => {
      let tags = traits.get(category);
      if (!tags) traits.set(category, tags = new Set());
      tags.add(tag);
    };
    for (const [category, tag] of derivedTraits(taxonomy)) add(category, tag);
    for (const rank of TAXONOMY_RANKS) if (taxonomy[rank]) add('taxonomy', taxonomy[rank]!);
    records.set(species.id, { taxonomy, traits });
  }
  for (const clue of pool.clues) {
    const record = records.get(clue.speciesId);
    if (!record) continue;
    for (const tag of clue.compareTags.map(normalizeTag)) {
      let tags = record.traits.get(clue.category);
      if (!tags) record.traits.set(clue.category, tags = new Set());
      tags.add(tag);
    }
  }
  return records;
}

/** The taxonomy rank a tag names for the clue's own species, if any. */
export function rankOfTag(tag: string, ownTaxonomy: Taxonomy): TaxonomyRank | null {
  return TAXONOMY_RANKS.find(rank => ownTaxonomy[rank] === tag) ?? null;
}

/** A clue's tags, normalized, with duplicates removed. */
export function clueTags(clue: Pick<PoolClue, 'compareTags'>): string[] {
  return [...new Set(clue.compareTags.map(normalizeTag))];
}
