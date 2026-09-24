// A play session: rounds back to back, the clue feed, and score. Pure reducer;
// the React page owns the RNG and starts each new round.
import type { LootGemType } from '@/expedition/domain';
import type { ClueFit } from '@/clueGame/deduction';
import type { CluePool } from '@/clueGame/pool';
import { buildSpeciesRecords, type SpeciesRecords } from '@/clueGame/traits';
import { WRONG_GUESS_PENALTY, correctGuessScore, registerWrongGuess, revealNext, type RoundState } from '@/clueGame/round';

const FEED_LIMIT = 120;

export type FeedItem = { key: number } & (
  | { kind: 'round'; round: number }
  | { kind: 'clue'; gem: LootGemType; text: string; fits: Record<number, ClueFit> }
  | { kind: 'note'; gem: LootGemType; text: string }
  | { kind: 'empty'; gem: LootGemType }
  | { kind: 'guess'; correct: boolean; speciesId: number; points: number; funFact: string | null }
);

export interface SessionState {
  pool: CluePool;
  records: SpeciesRecords;
  round: RoundState;
  phase: 'playing' | 'solved';
  score: number;
  streak: number;
  bestStreak: number;
  solved: number;
  feed: FeedItem[];
  /** Mystery ids in play order, so recent ones aren't repeated. */
  history: number[];
  nextKey: number;
}

export type SessionAction =
  | { type: 'load'; pool: CluePool; round: RoundState }
  | { type: 'start-round'; round: RoundState }
  /** One explode phase of the board: the player's move (cascade false) or a cascade. */
  | { type: 'matched'; gems: LootGemType[]; cascade: boolean }
  | { type: 'guess'; speciesId: number };

type FeedEntry = FeedItem extends infer Item ? Item extends FeedItem ? Omit<Item, 'key'> : never : never;

function withFeed(state: SessionState, entries: FeedEntry[]): SessionState {
  if (entries.length === 0) return state;
  const keyed = entries.map((entry, index) => ({ ...entry, key: state.nextKey + index }) as FeedItem);
  return { ...state, feed: [...state.feed, ...keyed].slice(-FEED_LIMIT), nextKey: state.nextKey + entries.length };
}

/** Feed items since the current round began. */
export function currentRoundFeed(feed: readonly FeedItem[]): FeedItem[] {
  return feed.slice(feed.findLastIndex(item => item.kind === 'round') + 1);
}

/** A key fact about the answer that this round's feed hasn't already shown. */
function funFactFor(state: SessionState, speciesId: number): string | null {
  const shown = new Set(currentRoundFeed(state.feed).flatMap(item => 'text' in item ? [item.text.trim().toLowerCase()] : []));
  const candidates = [
    ...state.pool.facts.filter(fact => fact.speciesId === speciesId && fact.category === 'key_fact').map(fact => fact.text),
    ...state.pool.clues.filter(clue => clue.speciesId === speciesId && clue.category === 'key_fact').map(clue => clue.label),
  ];
  return candidates.find(text => !shown.has(text.trim().toLowerCase())) ?? null;
}

function beginRound(state: SessionState, round: RoundState): SessionState {
  return withFeed({ ...state, round, phase: 'playing', history: [...state.history, round.mysteryId] }, [{ kind: 'round', round: round.round }]);
}

export function clueSessionReducer(state: SessionState | null, action: SessionAction): SessionState | null {
  if (action.type === 'load') {
    const fresh: SessionState = {
      pool: action.pool, records: buildSpeciesRecords(action.pool), round: action.round, phase: 'playing',
      score: 0, streak: 0, bestStreak: 0, solved: 0, feed: [], history: [], nextKey: 1,
    };
    return beginRound(fresh, action.round);
  }
  if (!state) return state;

  switch (action.type) {
    case 'start-round':
      return beginRound(state, action.round);

    case 'matched': {
      if (state.phase !== 'playing') return state;
      let round = action.cascade ? state.round : { ...state.round, moves: state.round.moves + 1 };
      const entries: FeedEntry[] = [];
      for (const gem of action.gems) {
        const result = revealNext(round, gem, state.records);
        round = result.state;
        if (result.reveal) entries.push(result.reveal);
      }
      return withFeed({ ...state, round }, entries);
    }

    case 'guess': {
      if (state.phase !== 'playing' || state.round.ruledOut.includes(action.speciesId)) return state;
      if (action.speciesId === state.round.mysteryId) {
        const points = correctGuessScore({ moves: state.round.moves, streak: state.streak, firstTry: state.round.wrongGuesses.length === 0 });
        const streak = state.streak + 1;
        return withFeed(
          { ...state, phase: 'solved', score: state.score + points, streak, bestStreak: Math.max(state.bestStreak, streak), solved: state.solved + 1 },
          [{ kind: 'guess', correct: true, speciesId: action.speciesId, points, funFact: funFactFor(state, action.speciesId) }],
        );
      }
      return withFeed(
        { ...state, round: registerWrongGuess(state.round, action.speciesId), score: Math.max(0, state.score - WRONG_GUESS_PENALTY), streak: 0 },
        [{ kind: 'guess', correct: false, speciesId: action.speciesId, points: -WRONG_GUESS_PENALTY, funFact: null }],
      );
    }
  }
}
