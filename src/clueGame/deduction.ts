// How a clue about the mystery species compares with each candidate's record
// (see traits.ts for what a record holds and when records truly disagree).
import type { SpeciesClueCategory } from '@/types/speciesClues';
import type { PoolClue } from '@/clueGame/pool';
import { EXCLUSIVE_AXES, axisOf, clueTags, completeFamilyOf, rankOfTag, type SpeciesRecord, type SpeciesRecords } from '@/clueGame/traits';

/**
 * fits: the candidate's record has every tag. partial: some. unknown: its
 * record doesn't mention them (proves nothing). contradicts: its record holds
 * a different taxonomy rank, the other value of an exclusive trait, or other
 * members of a complete family (a different realm), which rules it out.
 */
export type ClueFit = 'fits' | 'partial' | 'contradicts' | 'unknown';

type TagOutcome = 'match' | 'conflict' | 'unknown';

function allTraits(record: SpeciesRecord): Set<string> {
  return new Set([...record.traits.values()].flatMap(tags => [...tags]));
}

function tagOutcome(tag: string, category: SpeciesClueCategory, own: SpeciesRecord, candidate: SpeciesRecord, candidateTraits: Set<string>): TagOutcome {
  if (category === 'taxonomy') {
    const rank = rankOfTag(tag, own.taxonomy);
    const value = rank ? candidate.taxonomy[rank] : null;
    if (rank && value) return value === tag ? 'match' : 'conflict';
  }
  if (candidateTraits.has(tag)) return 'match';
  const axis = axisOf(tag);
  if (axis && EXCLUSIVE_AXES[axis].some(value => value !== tag && candidateTraits.has(value))) return 'conflict';
  const family = completeFamilyOf(tag);
  if (family && [...candidateTraits].some(trait => trait.startsWith(family))) return 'conflict';
  return 'unknown';
}

/** Deductive clues carry tags and were authored as filtering; the rest are just notes. */
export function isDeductive(clue: PoolClue): boolean {
  return clue.isFiltering && clueTags(clue).length > 0;
}

export function fitClue(clue: PoolClue, candidateId: number, records: SpeciesRecords): ClueFit {
  const own = records.get(clue.speciesId);
  const candidate = records.get(candidateId);
  const tags = clueTags(clue);
  if (!own || !candidate || tags.length === 0) return 'unknown';
  const traits = allTraits(candidate);
  const outcomes = tags.map(tag => tagOutcome(tag, clue.category, own, candidate, traits));
  if (outcomes.includes('conflict')) return 'contradicts';
  const matches = outcomes.filter(outcome => outcome === 'match').length;
  if (matches === tags.length) return 'fits';
  return matches > 0 ? 'partial' : 'unknown';
}

export function evaluateClue(clue: PoolClue, candidateIds: readonly number[], records: SpeciesRecords): Record<number, ClueFit> {
  return Object.fromEntries(candidateIds.map(id => [id, fitClue(clue, id, records)]));
}

/**
 * Categories where the live candidates' records differ, so a clue there may
 * still separate them. Uses only the candidates' records, never the answer.
 */
export function usefulCategories(liveIds: readonly number[], records: SpeciesRecords, categories: readonly SpeciesClueCategory[]): Set<SpeciesClueCategory> {
  const useful = new Set<SpeciesClueCategory>();
  if (liveIds.length < 2) return useful;
  for (const category of categories) {
    const signatures = new Set(liveIds.map(id => [...(records.get(id)?.traits.get(category) ?? [])].sort().join('|')));
    if (signatures.size > 1) useful.add(category);
  }
  return useful;
}
