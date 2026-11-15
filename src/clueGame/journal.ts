// The Field Journal: animals this player has identified, kept on their device only.
// Keyed by scientific name so it survives database id changes.
// mergeJournals is the one merge rule: for another tab's saves (saveSolve), and later for a journal
// moved from another device by QR code or link.

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
  /** Plan 054: Sharp eye badges, finds by name with a big pencil bonus. On this device only. */
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

/**
 * Every animal in either journal. For one in both: the larger count, the lower best, the earliest
 * and latest dates, `local`'s names, `local`'s class or else `other`'s, and the larger Sharp eye count.
 * Never drops a find, and safe to repeat.
 */
export function mergeJournals(local: Journal, other: Journal): Journal {
  const merged: Journal = { ...other, ...local };
  for (const [name, theirs] of Object.entries(other)) {
    const ours = local[name];
    if (!ours) continue;
    const className = ours.className ?? theirs.className;
    const sharpEyes = Math.max(ours.sharpEyes ?? 0, theirs.sharpEyes ?? 0);
    merged[name] = {
      scientificName: ours.scientificName,
      commonName: ours.commonName,
      timesSolved: Math.max(ours.timesSolved, theirs.timesSolved),
      bestMoves: Math.min(ours.bestMoves, theirs.bestMoves),
      firstSolvedAt: ours.firstSolvedAt < theirs.firstSolvedAt ? ours.firstSolvedAt : theirs.firstSolvedAt,
      lastSolvedAt: ours.lastSolvedAt > theirs.lastSolvedAt ? ours.lastSolvedAt : theirs.lastSolvedAt,
      ...(className ? { className } : {}),
      ...(sharpEyes ? { sharpEyes } : {}),
    };
  }
  return merged;
}

/** The journal to save for a find: what storage holds now merged with this tab's copy, then the find recorded once. */
export function saveSolve(
  stored: Journal,
  tab: Journal,
  species: { scientificName: string; commonName: string; className?: string | null },
  moves: number,
  at: string,
  sharp = false,
): Journal {
  return recordSolve(mergeJournals(tab, stored), species, moves, at, sharp);
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

/** The bests to save: the largest of what storage holds now, this tab's copy and the session. */
export function saveRecords(stored: Records, tab: Records, session: { score: number; streak: number }): Records {
  return updateRecords({ bestScore: Math.max(stored.bestScore, tab.bestScore), bestStreak: Math.max(stored.bestStreak, tab.bestStreak) }, session);
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
