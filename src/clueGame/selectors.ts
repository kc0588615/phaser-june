// What the HUD shows, derived from session state. Pure, so it's unit-tested and
// the React components stay presentational.
import { GEM_CATEGORIES, type GemCategory } from '@/clueGame/categories';
import { usefulCategories, type ClueFit } from '@/clueGame/deduction';
import type { PoolSpecies } from '@/clueGame/pool';
import { liveCandidates } from '@/clueGame/round';
import { currentRoundFeed, type SessionState } from '@/clueGame/session';

export type CandidateStatus = 'live' | 'ruled-out' | 'wrong-guess' | 'answer';

export interface CandidateView {
  species: PoolSpecies;
  /** How each deductive clue this round compared with this candidate, in reveal order. */
  fits: ClueFit[];
  matches: number;
  status: CandidateStatus;
}

export function candidateViews(state: SessionState): CandidateView[] {
  const { round } = state;
  const clueItems = currentRoundFeed(state.feed).flatMap(item => item.kind === 'clue' ? [item] : []);
  return round.candidateIds.flatMap(id => {
    const species = state.pool.species.find(candidate => candidate.id === id);
    if (!species) return [];
    const fits = clueItems.map(item => item.fits[id] ?? 'unknown');
    const status: CandidateStatus = state.phase === 'solved' && id === round.mysteryId ? 'answer'
      : round.wrongGuesses.includes(id) ? 'wrong-guess'
      : round.ruledOut.includes(id) ? 'ruled-out'
      : 'live';
    return [{ species, fits, matches: fits.filter(fit => fit === 'fits').length, status }];
  });
}

export interface LegendView extends GemCategory {
  /** Notes shown from this color this round (never how many remain: that would hint at the answer). */
  revealed: number;
  /** This color said it has no more notes. */
  exhausted: boolean;
  /** A clue of this color could still separate the live candidates. */
  useful: boolean;
}

export function legendViews(state: SessionState): LegendView[] {
  const { round } = state;
  const useful = usefulCategories(liveCandidates(round), state.records, GEM_CATEGORIES.flatMap(category => category.clueCategories));
  return GEM_CATEGORIES.map(category => ({
    ...category,
    revealed: round.revealedByGem[category.gem] ?? 0,
    exhausted: round.exhausted.includes(category.gem),
    useful: category.deduces && !round.exhausted.includes(category.gem) && category.clueCategories.some(clueCategory => useful.has(clueCategory)),
  }));
}

/**
 * Fits grouped for a feed line: who matches, partly matches, and was ruled out.
 * Ids follow `displayOrder`; a past round's candidates not in it come last.
 */
export function fitGroups(fits: Record<number, ClueFit>, displayOrder: readonly number[]): Record<'fits' | 'partial' | 'contradicts', number[]> {
  const groups = { fits: [] as number[], partial: [] as number[], contradicts: [] as number[] };
  for (const id of new Set([...displayOrder, ...Object.keys(fits).map(Number)])) {
    const fit = fits[id];
    if (fit === 'fits' || fit === 'partial' || fit === 'contradicts') groups[fit].push(id);
  }
  return groups;
}

/** JSON-safe session summary for the dev bridge (`window.__cc.clue()`). */
export function debugSummary(state: SessionState, seed: number) {
  const { round } = state;
  return {
    seed,
    phase: state.phase,
    round: round.round,
    mysteryId: round.mysteryId,
    candidateIds: round.candidateIds,
    live: liveCandidates(round),
    moves: round.moves,
    ruledOut: round.ruledOut,
    wrongGuesses: round.wrongGuesses,
    revealedByGem: round.revealedByGem,
    score: state.score,
    streak: state.streak,
    solved: state.solved,
    feedTail: state.feed.slice(-8).map(item => ({ kind: item.kind, ...('gem' in item ? { gem: item.gem } : {}), ...('text' in item ? { text: item.text } : {}) })),
  };
}
