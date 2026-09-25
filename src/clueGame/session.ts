// A play session: rounds back to back, the clue feed, and score. Pure reducer;
// the React page owns the RNG and starts each new round.
import type { GemType } from '@/game/constants';
import type { ClueFit } from '@/clueGame/deduction';
import { keyFacts, type CluePool } from '@/clueGame/pool';
import { buildSpeciesRecords, type SpeciesRecords } from '@/clueGame/traits';
import { WRONG_GUESS_PENALTY, cluesForMatch, registerWrongGuess, revealNext, scoreBreakdown, type RoundState, type ScorePart } from '@/clueGame/round';

const FEED_LIMIT = 120;

/** `bonus`: revealed because the matched group was bigger than three. */
type FeedEntry =
  | { kind: 'round'; round: number; relatives: number; scope?: string }
  | { kind: 'clue'; gem: GemType; text: string; fits: Record<number, ClueFit>; bonus?: true }
  | { kind: 'note'; gem: GemType; text: string; bonus?: true }
  | { kind: 'empty'; gem: GemType }
  | { kind: 'shuffle' }
  | { kind: 'guess'; correct: boolean; speciesId: number; points: number };

export type FeedItem = FeedEntry & { key: number };

/** What the reveal card shows after a correct guess. */
export interface SolveSummary {
  speciesId: number;
  points: number;
  parts: ScorePart[];
  moves: number;
  /** Clues and notes read this round. */
  cluesSeen: number;
  funFact: string | null;
}

export interface SessionState {
  pool: CluePool;
  records: SpeciesRecords;
  round: RoundState;
  phase: 'playing' | 'solved';
  score: number;
  streak: number;
  bestStreak: number;
  solved: number;
  lastSolve: SolveSummary | null;
  feed: FeedItem[];
  /** Mystery ids in play order, so recent ones aren't repeated. */
  history: number[];
  nextKey: number;
}

export interface MatchedGroup { gem: GemType; size: number }

export type SessionAction =
  | { type: 'load'; pool: CluePool; round: RoundState }
  | { type: 'start-round'; round: RoundState }
  /** One explode phase of the board: the player's move (cascade false) or a cascade. */
  | { type: 'matched'; groups: MatchedGroup[]; cascade: boolean }
  | { type: 'guess'; speciesId: number }
  /** The board had no valid move left and was reshuffled. */
  | { type: 'shuffled' };

function withFeed(state: SessionState, entries: FeedEntry[]): SessionState {
  if (entries.length === 0) return state;
  const keyed = entries.map((entry, index) => ({ ...entry, key: state.nextKey + index }));
  return { ...state, feed: [...state.feed, ...keyed].slice(-FEED_LIMIT), nextKey: state.nextKey + entries.length };
}

/** Feed items since the current round began. */
export function currentRoundFeed(feed: readonly FeedItem[]): FeedItem[] {
  return feed.slice(feed.findLastIndex(item => item.kind === 'round') + 1);
}

/** A key fact about the answer that this round's feed hasn't already shown. */
function funFactFor(state: SessionState, speciesId: number): string | null {
  const shown = new Set(currentRoundFeed(state.feed).flatMap(item => 'text' in item ? [item.text.trim().toLowerCase()] : []));
  return keyFacts(state.pool, speciesId).find(text => !shown.has(text.trim().toLowerCase())) ?? null;
}

function beginRound(state: SessionState, round: RoundState): SessionState {
  return withFeed({ ...state, round, phase: 'playing', lastSolve: null, history: [...state.history, round.mysteryId] },
    [{ kind: 'round', round: round.round, relatives: round.relatives, ...(round.scope ? { scope: round.scope } : {}) }]);
}

export function clueSessionReducer(state: SessionState | null, action: SessionAction): SessionState | null {
  if (action.type === 'load') {
    const fresh: SessionState = {
      pool: action.pool, records: buildSpeciesRecords(action.pool), round: action.round, phase: 'playing',
      score: 0, streak: 0, bestStreak: 0, solved: 0, lastSolve: null, feed: [], history: [], nextKey: 1,
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
      for (const { gem, size } of action.groups) {
        for (let n = 0; n < cluesForMatch(size); n++) {
          const result = revealNext(round, gem, state.records);
          round = result.state;
          if (!result.reveal) break;
          entries.push(n > 0 && result.reveal.kind !== 'empty' ? { ...result.reveal, bonus: true } : result.reveal);
        }
      }
      return withFeed({ ...state, round }, entries);
    }

    case 'shuffled':
      return state.phase === 'playing' ? withFeed(state, [{ kind: 'shuffle' }]) : state;

    case 'guess': {
      if (state.phase !== 'playing' || state.round.ruledOut.includes(action.speciesId)) return state;
      if (action.speciesId === state.round.mysteryId) {
        const parts = scoreBreakdown({ moves: state.round.moves, streak: state.streak, firstTry: state.round.wrongGuesses.length === 0 });
        const points = parts.reduce((sum, part) => sum + part.points, 0);
        const streak = state.streak + 1;
        const funFact = funFactFor(state, action.speciesId);
        const cluesSeen = Object.values(state.round.revealedByGem).reduce((sum, count) => sum + (count ?? 0), 0);
        return withFeed(
          {
            ...state, phase: 'solved', score: state.score + points, streak, bestStreak: Math.max(state.bestStreak, streak), solved: state.solved + 1,
            lastSolve: { speciesId: action.speciesId, points, parts, moves: state.round.moves, cluesSeen, funFact },
          },
          [{ kind: 'guess', correct: true, speciesId: action.speciesId, points }],
        );
      }
      return withFeed(
        { ...state, round: registerWrongGuess(state.round, action.speciesId), score: Math.max(0, state.score - WRONG_GUESS_PENALTY), streak: 0 },
        [{ kind: 'guess', correct: false, speciesId: action.speciesId, points: -WRONG_GUESS_PENALTY }],
      );
    }
  }
}
