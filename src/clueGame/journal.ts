// The Field Journal: animals this player has identified, kept on their device.
// Keyed by scientific name so it survives database id changes.

export const JOURNAL_STORAGE_KEY = 'clue-match:journal:v1';

export interface JournalEntry {
  scientificName: string;
  commonName: string;
  timesSolved: number;
  /** Fewest moves this animal was ever identified in. */
  bestMoves: number;
  firstSolvedAt: string;
  lastSolvedAt: string;
  /** e.g. 'MAMMALIA'; colors the animal's markers on the globe. */
  className?: string | null;
  /** Places it was found in from the globe, one per place. */
  sightings?: Sighting[];
}

/** Where on the globe an animal was found. */
export interface Sighting {
  placeKey: string;
  placeName: string;
  lon: number;
  lat: number;
}

export type Journal = Record<string, JournalEntry>;

export function recordSolve(
  journal: Journal,
  species: { scientificName: string; commonName: string; className?: string | null },
  moves: number,
  at: string,
  sighting?: Sighting,
): Journal {
  const previous = journal[species.scientificName];
  const sightings = [...(previous?.sightings ?? []).filter(old => old.placeKey !== sighting?.placeKey), ...(sighting ? [sighting] : [])];
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
      ...(sightings.length ? { sightings } : {}),
    },
  };
}

function isEntry(value: unknown): value is JournalEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.scientificName === 'string' && typeof entry.commonName === 'string'
    && Number.isInteger(entry.timesSolved) && (entry.timesSolved as number) > 0
    && typeof entry.bestMoves === 'number' && Number.isFinite(entry.bestMoves)
    && typeof entry.firstSolvedAt === 'string' && typeof entry.lastSolvedAt === 'string'
    && (entry.sightings === undefined || (Array.isArray(entry.sightings) && entry.sightings.every(isSighting)));
}

function isSighting(value: unknown): value is Sighting {
  const sighting = value as Partial<Sighting> | null;
  return !!sighting && typeof sighting.placeKey === 'string' && typeof sighting.placeName === 'string'
    && Number.isFinite(sighting.lon) && Number.isFinite(sighting.lat);
}

/** Stored JSON back to a journal; anything malformed is dropped rather than trusted. */
export function parseJournal(raw: string | null): Journal {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([key, entry]) => isEntry(entry) && entry.scientificName === key)) as Journal;
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
