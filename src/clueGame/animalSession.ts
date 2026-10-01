// A plan 044 play session: rounds on a trail (5 rounds, 3 hearts), with score and
// streak. A pure reducer over the round rules in animalBoard.ts; the page owns the
// RNG (it deals each round) and the board (it reports clears and releases).
import {
  applyPhase, endOfMove, mark, nameAtTimeout, newTrail, scoreRound, starsFor, stillPossible, trailAfter,
  type AnimalRound, type PhaseReport, type Trail,
} from '@/clueGame/animalBoard';
import type { GemType } from '@/game/constants';
import type { Book } from '@/clueGame/questionMatch';

export interface AnimalRoundEnd {
  outcome: 'found' | 'lost';
  lostBy: AnimalRound['lostBy'];
  stars: number;
  points: number;
}

export interface AnimalSession {
  book: Book;
  round: AnimalRound;
  /** The board for this round (from the set and the round number, never the mystery). */
  boardSeed: number;
  trail: Trail;
  /** 1 for the session's first trail; roundNo counts rounds across the whole session. */
  trailNo: number;
  roundNo: number;
  score: number;
  streak: number;
  bestStreak: number;
  finds: number;
  /** Mystery ids in play order, so recent ones aren't repeated. */
  history: number[];
  end: AnimalRoundEnd | null;
}

export type AnimalAction =
  | { type: 'load'; book: Book; round: AnimalRound; boardSeed: number; trail: Trail }
  | { type: 'next'; round: AnimalRound; boardSeed: number }
  | { type: 'new-trail'; round: AnimalRound; boardSeed: number; trail: Trail }
  /** One explode phase: gems cleared by color, witness gems, and the animals the board released (marked ones touched). */
  | { type: 'matched'; collected: Partial<Record<GemType, number>>; witness: number; released: number[]; cascade: boolean }
  /** A move and its cascades finished. */
  | { type: 'settled' }
  | { type: 'mark'; id: number; ruledOut: boolean }
  | { type: 'name'; id: number | null };

/** Score what a rules step did: a finished round scores (or breaks the streak) and moves the trail on. */
function advance(session: AnimalSession, round: AnimalRound): AnimalSession {
  if (round === session.round) return session;
  const finished = (round.status === 'found' || round.status === 'lost') && session.round.status !== round.status;
  if (!finished) return { ...session, round };
  const found = round.status === 'found';
  const points = found ? scoreRound(round, session.streak) : 0;
  const streak = found ? session.streak + 1 : 0;
  return {
    ...session, round, score: session.score + points, streak, bestStreak: Math.max(session.bestStreak, streak), finds: session.finds + (found ? 1 : 0),
    trail: trailAfter(round.rules, session.trail, round),
    end: { outcome: found ? 'found' : 'lost', lostBy: round.lostBy, stars: starsFor(round), points },
  };
}

export function animalSessionReducer(session: AnimalSession | null, action: AnimalAction): AnimalSession | null {
  if (action.type === 'load') {
    return {
      book: action.book, round: action.round, boardSeed: action.boardSeed, trail: action.trail, trailNo: 1, roundNo: 1,
      score: 0, streak: 0, bestStreak: 0, finds: 0, history: [action.round.mysteryId], end: null,
    };
  }
  if (!session) return null;
  const { book, round } = session;
  switch (action.type) {
    case 'next':
      return { ...session, round: action.round, boardSeed: action.boardSeed, roundNo: session.roundNo + 1, history: [...session.history, action.round.mysteryId], end: null };
    case 'new-trail':
      return { ...session, round: action.round, boardSeed: action.boardSeed, trail: action.trail, trailNo: session.trailNo + 1, roundNo: session.roundNo + 1, history: [...session.history, action.round.mysteryId], end: null };
    case 'matched': {
      // The board released these because they were marked there; mark them here too, so the two never disagree.
      const marked = action.released.reduce((state, id) => mark(state, id, true), round);
      const report: PhaseReport = { collected: action.collected, witness: action.witness, touched: action.released };
      return advance(session, applyPhase(book, marked, report, action.cascade));
    }
    case 'settled':
      return advance(session, endOfMove(round));
    case 'mark':
      return advance(session, mark(round, action.id, action.ruledOut));
    case 'name':
      return advance(session, nameAtTimeout(round, action.id));
  }
}

export const startTrail = newTrail;

/** A JSON-safe summary for the dev bridge (window.__cc.clue()) and playtests. `possible` is for checks only, never shown. */
export function animalDebugSummary(session: AnimalSession, seed: number) {
  const { round } = session;
  return {
    seed, rulesVersion: round.rules.version, trailNo: session.trailNo, roundNo: session.roundNo, status: round.status, lostBy: round.lostBy,
    mysteryId: round.mysteryId, suspects: round.suspects, marked: round.marked, released: round.released,
    movesLeft: round.movesLeft, movesUsed: round.movesUsed, moves: round.rules.moves,
    orders: round.orders.map(order => ({ tag: order.tag, gem: order.gem, have: order.have, answer: order.answer })),
    notes: round.notes.length, possible: stillPossible(session.book, round),
    score: session.score, streak: session.streak, trail: session.trail, end: session.end, logTail: round.log.slice(-5),
  };
}
