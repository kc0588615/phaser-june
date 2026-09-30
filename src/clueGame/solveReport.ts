// What the client sends to POST /api/clue-game/solves after each round, and the
// server-side check of it. Pure, so it's unit-tested. Since plan 041 every round is
// sent, solved or lost (`outcome`), with how it was played.
import { CLUE_GAME_GEM_TYPES } from '@/clueGame/categories';

export interface SolveReport {
  seed: number;
  round: number;
  speciesId: number;
  /** Moves used. */
  moves: number;
  wrongGuesses: number;
  /** Answers and field notes read. */
  cluesSeen: number;
  /** Retired (look-alike count before plan 041); new rounds send 0. */
  relatives: number;
  points: number;
  /** Questions asked, by gem color. */
  revealedByGem: Record<string, number>;
  /** The globe place it was played in (clue_match_places.key), if any. */
  placeKey?: string;
  /** How the round ended; older clients only reported solves. */
  outcome?: 'solved' | 'lost';
  /** Solved (or lost) on a last chance, so first-try and rescued solves can be told apart (sent since 2026-09-28). */
  lastChance?: boolean;
  /** Rules.version of the rules played (src/clueGame/questionMatch.ts). */
  rulesVersion?: string;
  movesLeft?: number;
  /** Animals still standing at the first guess. */
  standingAtGuess?: number;
  notesSaved?: number;
  /** Family tree steps bought (free ones not counted). */
  treeSteps?: number;
  /** Every question asked, in order, with its answer. */
  questions?: Array<{ tag: string; answer: 'yes' | 'no' | 'no-record' }>;
}

const PLACE_KEY = /^(country|area|continent):[A-Za-z0-9-]{1,80}$/;
const RULES_VERSION = /^[a-z0-9.-]{1,20}$/;
const TAG = /^[a-z_]{1,20}:[a-z0-9_-]{1,60}$/;
const ANSWERS = new Set(['yes', 'no', 'no-record']);

// Same bounds as the table's CHECK constraints (db/schema.sql).
const LIMITS: Record<'seed' | 'round' | 'speciesId' | 'moves' | 'wrongGuesses' | 'cluesSeen' | 'relatives' | 'points', [number, number]> = {
  seed: [1, 0xffff_ffff],
  round: [1, 10000],
  speciesId: [1, 2 ** 31 - 1],
  moves: [0, 10000],
  wrongGuesses: [0, 5],
  cluesSeen: [0, 1000],
  relatives: [0, 5],
  points: [0, 1000],
};
const OPTIONAL_LIMITS: Record<'movesLeft' | 'standingAtGuess' | 'notesSaved' | 'treeSteps', [number, number]> = {
  movesLeft: [0, 100],
  standingAtGuess: [1, 50],
  notesSaved: [0, 100],
  treeSteps: [0, 3],
};

const inRange = (value: unknown, [min, max]: [number, number]) => Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

function validQuestions(value: unknown): boolean {
  return Array.isArray(value) && value.length <= 100 && value.every(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const { tag, answer, ...rest } = item as Record<string, unknown>;
    return Object.keys(rest).length === 0 && typeof tag === 'string' && TAG.test(tag) && typeof answer === 'string' && ANSWERS.has(answer);
  });
}

/** A well-formed report, or null. Unknown gem colors and extra fields are rejected. */
export function parseSolveReport(body: unknown): SolveReport | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const input = body as Record<string, unknown>;
  const allowed = new Set([...Object.keys(LIMITS), ...Object.keys(OPTIONAL_LIMITS), 'revealedByGem', 'placeKey', 'outcome', 'lastChance', 'rulesVersion', 'questions']);
  if (Object.keys(input).some(key => !allowed.has(key))) return null;
  for (const [key, range] of Object.entries(LIMITS)) if (!inRange(input[key], range)) return null;
  for (const [key, range] of Object.entries(OPTIONAL_LIMITS)) if (input[key] !== undefined && !inRange(input[key], range)) return null;
  if (input.placeKey !== undefined && (typeof input.placeKey !== 'string' || !PLACE_KEY.test(input.placeKey))) return null;
  if (input.outcome !== undefined && input.outcome !== 'solved' && input.outcome !== 'lost') return null;
  if (input.lastChance !== undefined && typeof input.lastChance !== 'boolean') return null;
  if (input.rulesVersion !== undefined && (typeof input.rulesVersion !== 'string' || !RULES_VERSION.test(input.rulesVersion))) return null;
  if (input.questions !== undefined && !validQuestions(input.questions)) return null;

  const gems = input.revealedByGem;
  if (!gems || typeof gems !== 'object' || Array.isArray(gems)) return null;
  const colors = new Set<string>(CLUE_GAME_GEM_TYPES);
  const entries = Object.entries(gems as Record<string, unknown>);
  if (entries.some(([gem, count]) => !colors.has(gem) || !inRange(count, [0, 1000]))) return null;

  return { ...(input as Omit<SolveReport, 'revealedByGem'>), revealedByGem: Object.fromEntries(entries) as Record<string, number> };
}
