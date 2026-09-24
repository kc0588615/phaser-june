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
}

export type Journal = Record<string, JournalEntry>;

export function recordSolve(journal: Journal, species: { scientificName: string; commonName: string }, moves: number, at: string): Journal {
  const previous = journal[species.scientificName];
  return {
    ...journal,
    [species.scientificName]: {
      scientificName: species.scientificName,
      commonName: species.commonName,
      timesSolved: (previous?.timesSolved ?? 0) + 1,
      bestMoves: Math.min(previous?.bestMoves ?? Infinity, moves),
      firstSolvedAt: previous?.firstSolvedAt ?? at,
      lastSolvedAt: at,
    },
  };
}

function isEntry(value: unknown): value is JournalEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.scientificName === 'string' && typeof entry.commonName === 'string'
    && Number.isInteger(entry.timesSolved) && (entry.timesSolved as number) > 0
    && typeof entry.bestMoves === 'number' && Number.isFinite(entry.bestMoves)
    && typeof entry.firstSolvedAt === 'string' && typeof entry.lastSolvedAt === 'string';
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
