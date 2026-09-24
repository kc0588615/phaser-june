import { useCallback, useEffect, useState } from 'react';
import { JOURNAL_STORAGE_KEY, parseJournal, recordSolve, type Journal } from '@/clueGame/journal';

/** The Field Journal in localStorage. Storage can be unavailable (private mode); play still works. */
export function useJournal() {
  const [journal, setJournal] = useState<Journal>({});

  useEffect(() => {
    try {
      setJournal(parseJournal(window.localStorage.getItem(JOURNAL_STORAGE_KEY)));
    } catch {
      setJournal({});
    }
  }, []);

  const record = useCallback((species: { scientificName: string; commonName: string }, moves: number) => {
    setJournal(previous => {
      const next = recordSolve(previous, species, moves, new Date().toISOString());
      try {
        window.localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Not persisted this time; the in-memory journal still updates.
      }
      return next;
    });
  }, []);

  return { journal, record };
}
