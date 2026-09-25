// What the client sends to POST /api/clue-game/solves after each solve, and the
// server-side check of it. Pure, so it's unit-tested.
import { CLUE_GAME_GEM_TYPES } from '@/clueGame/categories';

export interface SolveReport {
  seed: number;
  round: number;
  speciesId: number;
  moves: number;
  wrongGuesses: number;
  cluesSeen: number;
  relatives: number;
  points: number;
  revealedByGem: Record<string, number>;
  /** The globe place it was played in (clue_match_places.key), if any. */
  placeKey?: string;
}

const PLACE_KEY = /^(country|area|continent):[A-Za-z0-9-]{1,80}$/;

// Same bounds as the table's CHECK constraints (migration 042).
const LIMITS: Record<Exclude<keyof SolveReport, 'revealedByGem' | 'placeKey'>, [number, number]> = {
  seed: [1, 0xffff_ffff],
  round: [1, 10000],
  speciesId: [1, 2 ** 31 - 1],
  moves: [0, 10000],
  wrongGuesses: [0, 5],
  cluesSeen: [0, 1000],
  relatives: [0, 5],
  points: [0, 1000],
};

const inRange = (value: unknown, [min, max]: [number, number]) => Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

/** A well-formed report, or null. Unknown gem colors and extra fields are rejected. */
export function parseSolveReport(body: unknown): SolveReport | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const input = body as Record<string, unknown>;
  const allowed = new Set([...Object.keys(LIMITS), 'revealedByGem', 'placeKey']);
  if (Object.keys(input).some(key => !allowed.has(key))) return null;
  for (const [key, range] of Object.entries(LIMITS)) if (!inRange(input[key], range)) return null;
  if (input.placeKey !== undefined && (typeof input.placeKey !== 'string' || !PLACE_KEY.test(input.placeKey))) return null;

  const gems = input.revealedByGem;
  if (!gems || typeof gems !== 'object' || Array.isArray(gems)) return null;
  const colors = new Set<string>(CLUE_GAME_GEM_TYPES);
  const entries = Object.entries(gems as Record<string, unknown>);
  if (entries.some(([gem, count]) => !colors.has(gem) || !inRange(count, [0, 1000]))) return null;

  return { ...(input as Omit<SolveReport, 'revealedByGem'>), revealedByGem: Object.fromEntries(entries) as Record<string, number> };
}
