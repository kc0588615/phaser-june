// How a clue about the mystery species compares with each candidate's record
// (traits.ts says what a record holds and when records truly disagree).
import type { PoolClue } from '@/clueGame/pool';
import { COMPLETE_PREFIXES, EXCLUSIVE_PREFIXES, clueTags, prefixOf } from '@/clueGame/traits';

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
