import { useCallback, useEffect, useState } from 'react';
import { JOURNAL_STORAGE_KEY, NO_RECORDS, RECORDS_STORAGE_KEY, parseJournal, parseRecords, recordSolve, updateRecords, type Journal, type Records, type Sighting } from '@/clueGame/journal';

function save(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not persisted this time; the in-memory state still updates.
  }
}

/** The Field Journal and personal bests in localStorage. Storage can be unavailable (private mode); play still works. */
export function useJournal() {
  const [journal, setJournal] = useState<Journal>({});
  const [records, setRecords] = useState<Records>(NO_RECORDS);

  useEffect(() => {
    try {
      setJournal(parseJournal(window.localStorage.getItem(JOURNAL_STORAGE_KEY)));
      setRecords(parseRecords(window.localStorage.getItem(RECORDS_STORAGE_KEY)));
    } catch {
      setJournal({});
    }
  }, []);

  const record = useCallback((
    species: { scientificName: string; commonName: string; className?: string | null },
    moves: number,
    session: { score: number; streak: number },
    sighting?: Sighting,
  ) => {
    setJournal(previous => {
      const next = recordSolve(previous, species, moves, new Date().toISOString(), sighting);
      save(JOURNAL_STORAGE_KEY, next);
      return next;
    });
    setRecords(previous => {
      const next = updateRecords(previous, session);
      save(RECORDS_STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { journal, records, record };
}
