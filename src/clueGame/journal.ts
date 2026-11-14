// The Field Journal: animals this player has identified, kept on their device.
// Keyed by scientific name so it survives database id changes. A signed-in
// player's solves are also on the server; mergeServerJournal folds them in.

export const JOURNAL_STORAGE_KEY = 'clue-match:journal:v1';

export interface JournalEntry {
  scientificName: string;
  commonName: string;
  timesSolved: number;
  /** Fewest moves this animal was ever identified in. */
  bestMoves: number;
  firstSolvedAt: string;
  lastSolvedAt: string;
  /** e.g. 'MAMMALIA'. Kept with each find; no screen reads it. */
  className?: string | null;
  /** Plan 054: Sharp eye badges, finds by name with a big pencil bonus. On this device only (the server keeps no badges). */
  sharpEyes?: number;
}

export type Journal = Record<string, JournalEntry>;

export function recordSolve(
  journal: Journal,
  species: { scientificName: string; commonName: string; className?: string | null },
  moves: number,
  at: string,
  sharp = false,
): Journal {
  const previous = journal[species.scientificName];
  const sharpEyes = (previous?.sharpEyes ?? 0) + (sharp ? 1 : 0);
  return {
    ...journal,
    [species.scientificName]: {
      scientificName: species.scientificName,
      commonName: species.commonName,
      timesSolved: (previous?.timesSolved ?? 0) + 1,
      bestMoves: Math.min(previous?.bestMoves ?? Infinity, moves),
      firstSolvedAt: previous?.firstSolvedAt ?? at,
      lastSolvedAt: at,
      ...(species.className ?? previous?.className ? { className: species.className ?? previous?.className } : {}),
      ...(sharpEyes ? { sharpEyes } : {}),
    },
  };
}

/** One animal the signed-in player solved, from their saved solves (GET /api/clue-game/journal). */
export interface ServerJournalEntry {
  speciesId: number;
  scientificName: string;
  commonName: string;
  className: string | null;
  timesSolved: number;
  bestMoves: number;
  firstSolvedAt: string;
  lastSolvedAt: string;
  /** Globe places it was solved in. The route still sends them; the device has ignored them since sightings went (2026-11). */
  placeKeys: string[];
}

/**
 * The device's journal plus what the player solved while signed in elsewhere:
 * the larger count, the lower best, the earliest and latest dates. Safe to repeat.
 */
export function mergeServerJournal(journal: Journal, entries: readonly ServerJournalEntry[]): Journal {
  const merged: Journal = { ...journal };
  for (const entry of entries) {
    const local = merged[entry.scientificName];
    const className = local?.className ?? entry.className;
    merged[entry.scientificName] = {
      scientificName: entry.scientificName,
      commonName: local?.commonName ?? entry.commonName,
      timesSolved: Math.max(local?.timesSolved ?? 0, entry.timesSolved),
      bestMoves: Math.min(local?.bestMoves ?? Infinity, entry.bestMoves),
      firstSolvedAt: local && local.firstSolvedAt < entry.firstSolvedAt ? local.firstSolvedAt : entry.firstSolvedAt,
      lastSolvedAt: local && local.lastSolvedAt > entry.lastSolvedAt ? local.lastSolvedAt : entry.lastSolvedAt,
      ...(className ? { className } : {}),
      ...(local?.sharpEyes ? { sharpEyes: local.sharpEyes } : {}),
    };
  }
  return merged;
}

/** A stored entry with only JournalEntry's fields, or null when one it needs is missing or wrong. Old and unknown fields (sightings, before 2026-11) are left out; a bad badge count or class drops that field, not the animal. */
function toEntry(value: unknown): JournalEntry | null {
  if (!value || typeof value !== 'object') return null;
  const { scientificName, commonName, timesSolved, bestMoves, firstSolvedAt, lastSolvedAt, className, sharpEyes } = value as Record<string, unknown>;
  if (typeof scientificName !== 'string' || typeof commonName !== 'string' || !Number.isInteger(timesSolved) || (timesSolved as number) <= 0
    || typeof bestMoves !== 'number' || !Number.isFinite(bestMoves) || typeof firstSolvedAt !== 'string' || typeof lastSolvedAt !== 'string') return null;
  return {
    scientificName, commonName, timesSolved: timesSolved as number, bestMoves, firstSolvedAt, lastSolvedAt,
    ...(typeof className === 'string' ? { className } : {}),
    ...(Number.isInteger(sharpEyes) && (sharpEyes as number) > 0 ? { sharpEyes: sharpEyes as number } : {}),
  };
}

/** Stored JSON back to a journal; anything malformed is dropped rather than trusted. */
export function parseJournal(raw: string | null): Journal {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).flatMap(([key, value]) => {
      const entry = toEntry(value);
      return entry && entry.scientificName === key ? [[key, entry] as const] : [];
    }));
  } catch {
    return {};
  }
}

/** Glossary words the player has opened, oldest first (their vocabulary list). */
export const WORDS_STORAGE_KEY = 'clue-match:words:v1';

export function parseWords(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? [...new Set(parsed.filter((word): word is string => typeof word === 'string' && word.length > 0))] : [];
  } catch {
    return [];
  }
}

/** Personal bests across sessions. */
export const RECORDS_STORAGE_KEY = 'clue-match:records:v1';

export interface Records { bestScore: number; bestStreak: number }

export const NO_RECORDS: Records = { bestScore: 0, bestStreak: 0 };

export function updateRecords(records: Records, session: { score: number; streak: number }): Records {
  return { bestScore: Math.max(records.bestScore, session.score), bestStreak: Math.max(records.bestStreak, session.streak) };
}

export function parseRecords(raw: string | null): Records {
  try {
    const parsed = raw ? JSON.parse(raw) as Partial<Records> : null;
    const count = (value: unknown) => (Number.isInteger(value) && (value as number) > 0 ? value as number : 0);
    return { bestScore: count(parsed?.bestScore), bestStreak: count(parsed?.bestStreak) };
  } catch {
    return NO_RECORDS;
  }
}
