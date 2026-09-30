// A play session (plan 041): rounds back to back, with score and streak. A pure
// reducer over the round rules in questionMatch.ts; the page owns the RNG (it picks
// each round) and the board (it reports matches).
import { GEM_OF } from '@/clueGame/gems';
import {
  CHARGE_CATEGORIES, ask, applyMatches, buyFamilyTreeStep, guess, leadQuestions, scoreSolve, shortQuestionText, standing,
  type Book, type GemKind, type RoundState, type ScorePart,
} from '@/clueGame/questionMatch';

/** How a round ended, for the reveal card and the saved round. */
export interface RoundEnd {
  outcome: 'solved' | 'lost';
  points: number;
  parts: ScorePart[];
  /** Solved (or lost) on a last chance. */
  lastChance: boolean;
}

export interface MatchSession {
  book: Book;
  round: RoundState;
  /** 1 for the session's first round. */
  roundNo: number;
  score: number;
  streak: number;
  bestStreak: number;
  solved: number;
  /** Mystery ids in play order, so recent ones aren't repeated. */
  history: number[];
  end: RoundEnd | null;
}

export type MatchAction =
  | { type: 'load'; book: Book; round: RoundState }
  | { type: 'start'; round: RoundState }
  /** One explode phase of the board: the move's own matches (cascade false) or a cascade. */
  | { type: 'matched'; groups: Array<{ kind: GemKind; size: number; blast?: boolean }>; cascade: boolean }
  | { type: 'ask'; tag: string }
  | { type: 'buy-step' }
  | { type: 'guess'; speciesId: number };

const total = (parts: readonly ScorePart[]) => parts.reduce((sum, part) => sum + part.points, 0);

/** Scores what a rules step did: a wrong guess costs points and the streak; a finished round scores or ends the streak. */
function advance(session: MatchSession, round: RoundState): MatchSession {
  if (round === session.round) return session;
  let { score, streak, bestStreak, solved, end } = session;
  if (round.wrongGuesses.length > session.round.wrongGuesses.length) {
    streak = 0;
    score = Math.max(0, score - round.rules.points.wrongGuess);
  }
  const finished = round.status === 'solved' || round.status === 'lost';
  if (finished && session.round.status !== round.status) {
    const lastChance = round.log.some(entry => entry.kind === 'last-chance');
    if (round.status === 'solved') {
      const parts = scoreSolve(round, streak);
      const points = total(parts);
      score += points;
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
      solved += 1;
      end = { outcome: 'solved', points, parts, lastChance };
    } else {
      streak = 0;
      end = { outcome: 'lost', points: 0, parts: [], lastChance };
    }
  }
  return { ...session, round, score, streak, bestStreak, solved, end };
}

export function matchSessionReducer(session: MatchSession | null, action: MatchAction): MatchSession | null {
  if (action.type === 'load') {
    return { book: action.book, round: action.round, roundNo: 1, score: 0, streak: 0, bestStreak: 0, solved: 0, history: [action.round.mysteryId], end: null };
  }
  if (!session) return null;
  const { book, round } = session;
  switch (action.type) {
    case 'start':
      return { ...session, round: action.round, roundNo: session.roundNo + 1, history: [...session.history, action.round.mysteryId], end: null };
    case 'matched':
      return advance(session, applyMatches(book, round, action.groups, action.cascade));
    case 'ask':
      return advance(session, ask(book, round, action.tag));
    case 'buy-step':
      return advance(session, buyFamilyTreeStep(book, round));
    case 'guess':
      return advance(session, guess(book, round, action.speciesId));
  }
}

/** A JSON-safe summary for the dev bridge (window.__cc.clue()) and the e2e test. `legend`: each color's next question, in the order charges are spent. */
export function debugSummary(session: MatchSession, seed: number) {
  const { round } = session;
  const leads = leadQuestions(session.book, round);
  return {
    legend: CHARGE_CATEGORIES.map(category => {
      const lead = leads[category];
      return { category, gem: GEM_OF[category], tag: lead?.tag ?? null, text: lead ? shortQuestionText(lead.tag) : null };
    }),
    questionCost: round.rules.questionCost, perMatch: round.rules.perMatch,
    seed, roundNo: session.roundNo, rulesVersion: round.rules.version, moves: round.rules.moves, candidates: round.rules.candidates, status: round.status,
    mysteryId: round.mysteryId, candidateIds: round.candidateIds,
    standing: standing(round), out: Object.keys(round.out).map(Number), movesLeft: round.movesLeft, movesUsed: round.movesUsed,
    charges: round.charges, notesCollected: round.notesCollected, familyTreeSteps: round.familyTreeSteps, asked: round.asked,
    answered: round.log.filter(entry => entry.kind === 'answer' && entry.answer !== 'no-record').length,
    treeStepsTaken: round.log.filter(entry => entry.kind === 'step' && !entry.free).length,
    wrongGuesses: round.wrongGuesses, score: session.score, streak: session.streak, solved: session.solved, end: session.end,
    logTail: round.log.slice(-5),
  };
}
