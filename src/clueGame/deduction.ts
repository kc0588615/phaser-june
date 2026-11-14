// How a clue about the mystery species compares with each candidate's record
// (traits.ts says what a record holds and when records truly disagree).
import type { PoolClue } from '@/clueGame/pool';
import { COMPLETE_PREFIXES, EXCLUSIVE_PREFIXES, allTraits, clueTags, prefixOf, type SpeciesRecords } from '@/clueGame/traits';

/**
 * fits: the candidate's record has every tag. partial: some. unknown: its
 * record doesn't mention them (proves nothing). contradicts: its record holds
 * another value of an exclusive prefix, or other values of a complete one,
 * which rules it out.
 */
export type ClueFit = 'fits' | 'partial' | 'contradicts' | 'unknown';

export type TagOutcome = 'match' | 'exclusive-conflict' | 'complete-conflict' | 'unknown';

export function tagOutcome(tag: string, candidateTraits: ReadonlySet<string>): TagOutcome {
  if (candidateTraits.has(tag)) return 'match';
  const prefix = prefixOf(tag);
  if (!prefix || ![...candidateTraits].some(trait => prefixOf(trait) === prefix)) return 'unknown';
  if (EXCLUSIVE_PREFIXES.has(prefix)) return 'exclusive-conflict';
  return COMPLETE_PREFIXES.has(prefix) ? 'complete-conflict' : 'unknown';
}

/** Deductive clues carry tags and were authored as filtering; the rest are just notes. */
export function isDeductive(clue: PoolClue): boolean {
  return clue.isFiltering && clueTags(clue).length > 0;
}

export function fitClue(clue: PoolClue, candidateId: number, records: SpeciesRecords): ClueFit {
  const candidate = records.get(candidateId);
  const tags = clueTags(clue);
  if (!records.has(clue.speciesId) || !candidate || tags.length === 0) return 'unknown';
  const traits = allTraits(candidate);
  const outcomes = tags.map(tag => tagOutcome(tag, traits));
  if (outcomes.includes('exclusive-conflict')) return 'contradicts';
  const matches = outcomes.filter(outcome => outcome === 'match').length;
  if (matches === tags.length) return 'fits';
  // A clue listing several values of a complete prefix (the countries a species
  // lives in) partly fits a candidate that shares some of them.
  if (matches > 0) return 'partial';
  return outcomes.includes('complete-conflict') ? 'contradicts' : 'unknown';
}
