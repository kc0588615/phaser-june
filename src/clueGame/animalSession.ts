// A plan 044 play session: rounds on a trail (5 rounds, 3 hearts), with score and
// streak. A pure reducer over the round rules in animalBoard.ts; the page owns the
// RNG (it deals each round) and the board (it reports clears and releases).
import {
  applyPhase, endOfMove, mark, nameIt, newTrail, scoreRound, starsFor, stillPossible, trailAfter, walkOff,
  type AnimalRound, type Heading, type PhaseReport, type Trail,
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
  /** Plan 045: the player's own pencilled answers for hidden cells this round, by `${id}:${tag}`. Read by the rules only at a name (plan 054's bonus); kept once scouted, so the grid can show a guess was right or wrong. */
  pencil: Record<string, 'yes' | 'no'>;
  /** The player's own highlights this round (a long press: "this one matters"): cells by `${id}:${tag}`, question gems by `*:${tag}`. Never read by the rules; see `liveHighlights`. */
  highlight: string[];
  end: AnimalRoundEnd | null;
}

export type AnimalAction =
  | { type: 'load'; book: Book; round: AnimalRound; boardSeed: number; trail: Trail }
  /** A saved game picked back up (savedGame.ts). */
  | { type: 'restore'; session: AnimalSession }
  | { type: 'next'; round: AnimalRound; boardSeed: number }
  | { type: 'new-trail'; round: AnimalRound; boardSeed: number; trail: Trail }
  /** One explode phase: gems cleared by color, witness gems, and the animals the board released (marked ones touched). */
  | { type: 'matched'; collected: Partial<Record<GemType, number>>; witness: number; released: number[]; cascade: boolean; nearColors?: Array<[number, GemType[]]>; double?: GemType[] }
  /** A move and its cascades finished. */
  | { type: 'settled' }
  /** Plan 047: a marked animal walked off the board's edge. */
  | { type: 'walked'; id: number }
  /** `heading`: the way it walks once ruled out (plan 047). */
  | { type: 'mark'; id: number; ruledOut: boolean; heading?: Heading }
  /** Plan 053: name the mystery (once; any time, or out of moves). `null`: skip, out of moves only. */
  | { type: 'name'; id: number | null }
  | { type: 'pencil'; id: number; tag: string; value: 'yes' | 'no' | null }
  /** Toggle a cell's highlight (`id` null: the question's gem, its whole column). */
  | { type: 'highlight'; id: number | null; tag: string };

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
      score: 0, streak: 0, bestStreak: 0, finds: 0, history: [action.round.mysteryId], end: null, pencil: {}, highlight: [],
    };
  }
  if (action.type === 'restore') return { ...action.session, highlight: action.session.highlight ?? [] }; // saved before highlights
  if (!session) return null;
  const { book, round } = session;
  switch (action.type) {
    case 'next':
      return { ...session, round: action.round, boardSeed: action.boardSeed, roundNo: session.roundNo + 1, history: [...session.history, action.round.mysteryId], end: null, pencil: {}, highlight: [] };
    case 'new-trail':
      return { ...session, round: action.round, boardSeed: action.boardSeed, trail: action.trail, trailNo: session.trailNo + 1, roundNo: session.roundNo + 1, history: [...session.history, action.round.mysteryId], end: null, pencil: {}, highlight: [] };
    case 'matched': {
      // The board released these because they were marked there; mark them here too, so the two never disagree.
      const marked = action.released.reduce((state, id) => mark(state, id, true), round);
      const report: PhaseReport = { collected: action.collected, witness: action.witness, touched: action.released, nearColors: action.nearColors, double: action.double };
      return advance(session, applyPhase(book, marked, report, action.cascade));
    }
    case 'settled':
      return advance(session, endOfMove(round));
    case 'walked':
      // The board stepped it from the marks at the start of the move's steps; a mark cleared since then doesn't stop it.
      return advance(session, walkOff(mark(round, action.id, true), action.id));
    case 'mark':
      return advance(session, mark(round, action.id, action.ruledOut, action.heading));
    case 'name':
      return advance(session, nameIt(round, action.id, session.pencil));
    case 'pencil': {
      if (round.status !== 'playing' || round.marked.includes(action.id)) return session;
      const pencil = { ...session.pencil };
      if (action.value) pencil[`${action.id}:${action.tag}`] = action.value;
      else delete pencil[`${action.id}:${action.tag}`];
      return { ...session, pencil };
    }
    case 'highlight': {
      if (round.status !== 'playing') return session;
      const key = `${action.id ?? '*'}:${action.tag}`;
      if (!session.highlight.includes(key) && !live(round, key)) return session;
      const highlight = session.highlight.includes(key) ? session.highlight.filter(other => other !== key) : [...session.highlight, key];
      return { ...session, highlight };
    }
  }
}

export const startTrail = newTrail;

/** Whether a highlight still means something: a cell until its animal is ruled out or its answer scouted; a question gem until the mystery's answer lands. */
function live(round: AnimalRound, key: string): boolean {
  const at = key.indexOf(':');
  const order = round.orders.find(other => other.tag === key.slice(at + 1));
  if (!order) return false;
  if (key.slice(0, at) === '*') return order.answer === null;
  const id = Number(key.slice(0, at));
  const i = round.suspects.indexOf(id);
  return i >= 0 && !order.seen[i] && !round.marked.includes(id);
}

/** The highlights to show (the grid's purple, the board's glowing gems); the rest wait in `highlight` (an animal ruled back in shows its own again). */
export function liveHighlights(round: AnimalRound, highlight: readonly string[]): string[] {
  return round.status === 'playing' ? highlight.filter(key => live(round, key)) : [];
}

/** A JSON-safe summary for the dev bridge (window.__cc.clue()) and playtests. `possible` is for checks only, never shown. */
export function animalDebugSummary(session: AnimalSession, seed: number) {
  const { round } = session;
  return {
    seed, rulesVersion: round.rules.version, trailNo: session.trailNo, roundNo: session.roundNo, status: round.status, lostBy: round.lostBy, pencilBonus: round.pencilBonus, sharp: round.sharp,
    mysteryId: round.mysteryId, suspects: round.suspects, marked: round.marked, headings: round.headings, released: round.released,
    movesLeft: round.movesLeft, movesUsed: round.movesUsed, moves: round.rules.moves,
    orders: round.orders.map(order => ({ tag: order.tag, gem: order.gem, have: order.have, answer: order.answer, row: order.row, seen: order.seen })),
    pencil: session.pencil, highlight: session.highlight,
    notes: round.notes.length, possible: stillPossible(session.book, round),
    score: session.score, streak: session.streak, trail: session.trail, end: session.end, logTail: round.log.slice(-5),
  };
}
