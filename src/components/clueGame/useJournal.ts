import { useCallback, useEffect, useRef, useState } from 'react';
import {
  JOURNAL_STORAGE_KEY, NO_RECORDS, RECORDS_STORAGE_KEY, parseJournal, parseRecords, saveRecords, saveSolve,
  type Journal, type Records,
} from '@/clueGame/journal';

/** What storage holds under `key` now, or null when it can't be read (the tab's copy then stands alone). */
function stored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function save(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not persisted this time; the in-memory state still updates.
  }
}

/**
 * The Field Journal and personal bests in localStorage. Storage can be
 * unavailable (private mode); play still works. Every save merges into what
 * storage holds at that moment, so another tab's finds and bests are kept
 * (no storage listener: this tab shows them after its own next save).
 */
export function useJournal() {
  const [journal, setJournal] = useState<Journal>({});
  const [records, setRecords] = useState<Records>(NO_RECORDS);
  // The tab's copy, read outside state updaters (React may run those twice) and current before a re-render.
  const journalRef = useRef<Journal>({});
  const recordsRef = useRef<Records>(NO_RECORDS);
  const showJournal = useCallback((next: Journal) => { journalRef.current = next; setJournal(next); }, []);
  const showRecords = useCallback((next: Records) => { recordsRef.current = next; setRecords(next); }, []);

  useEffect(() => {
    showJournal(parseJournal(stored(JOURNAL_STORAGE_KEY)));
    showRecords(parseRecords(stored(RECORDS_STORAGE_KEY)));
  }, [showJournal, showRecords]);

  const record = useCallback((
    species: { scientificName: string; commonName: string; className?: string | null },
    moves: number,
    session: { score: number; streak: number },
    sharp = false,
  ) => {
    const nextJournal = saveSolve(parseJournal(stored(JOURNAL_STORAGE_KEY)), journalRef.current, species, moves, new Date().toISOString(), sharp);
    save(JOURNAL_STORAGE_KEY, nextJournal);
    showJournal(nextJournal);
    const nextRecords = saveRecords(parseRecords(stored(RECORDS_STORAGE_KEY)), recordsRef.current, session);
    save(RECORDS_STORAGE_KEY, nextRecords);
    showRecords(nextRecords);
  }, [showJournal, showRecords]);

  return { journal, records, record };
}
