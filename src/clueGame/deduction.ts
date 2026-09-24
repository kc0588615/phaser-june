// How a clue about the mystery species compares with each candidate in the pool.
//
// A species' traits in a category are the union of the compare_tags on its own
// clues (this covers every tag in the archived legacy profiles), so the mystery
// species always fits its own clues.
import type { SpeciesClueCategory } from '@/clueGame/categories';
import type { PoolClue } from '@/clueGame/pool';

/** fits: shares every tag. partial: shares some. contradicts: shares none (rules it out). */
export type ClueFit = 'fits' | 'partial' | 'contradicts' | 'unknown';

export type TraitSets = Map<number, Map<SpeciesClueCategory, Set<string>>>;

export function buildTraitSets(clues: readonly PoolClue[]): TraitSets {
  const traits: TraitSets = new Map();
  for (const clue of clues) {
    let byCategory = traits.get(clue.speciesId);
    if (!byCategory) traits.set(clue.speciesId, byCategory = new Map());
    let tags = byCategory.get(clue.category);
    if (!tags) byCategory.set(clue.category, tags = new Set());
    for (const tag of clue.compareTags) tags.add(tag);
  }
  return traits;
}

/** Deductive clues carry tags and were authored as filtering; the rest are just notes. */
export function isDeductive(clue: PoolClue): boolean {
  return clue.isFiltering && clue.compareTags.length > 0;
}

export function fitClue(tags: readonly string[], candidateTraits: ReadonlySet<string> | undefined): ClueFit {
  if (!candidateTraits || candidateTraits.size === 0 || tags.length === 0) return 'unknown';
  const shared = tags.filter(tag => candidateTraits.has(tag)).length;
  if (shared === tags.length) return 'fits';
  return shared > 0 ? 'partial' : 'contradicts';
}

export function evaluateClue(clue: PoolClue, candidateIds: readonly number[], traits: TraitSets): Record<number, ClueFit> {
  return Object.fromEntries(candidateIds.map(id => [id, fitClue(clue.compareTags, traits.get(id)?.get(clue.category))]));
}

/**
 * Categories where the live candidates differ, so a clue there can still narrow
 * the field. Uses only the candidates' own traits, never the mystery's identity.
 */
export function usefulCategories(liveIds: readonly number[], traits: TraitSets, categories: readonly SpeciesClueCategory[]): Set<SpeciesClueCategory> {
  const useful = new Set<SpeciesClueCategory>();
  if (liveIds.length < 2) return useful;
  for (const category of categories) {
    const signatures = new Set(liveIds.map(id => [...(traits.get(id)?.get(category) ?? [])].sort().join('|')));
    if (signatures.size > 1) useful.add(category);
  }
  return useful;
}
