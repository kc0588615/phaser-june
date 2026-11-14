import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  JOURNAL_STORAGE_KEY, NO_RECORDS, RECORDS_STORAGE_KEY, mergeServerJournal, parseJournal, parseRecords, recordSolve, updateRecords,
  type Journal, type Records, type ServerJournalEntry,
} from '@/clueGame/journal';
import { getJson } from '@/lib/getJson';

function save(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not persisted this time; the in-memory state still updates.
  }
}

/**
 * The Field Journal and personal bests in localStorage. Storage can be
 * unavailable (private mode); play still works. A signed-in player's solves
 * saved before 2026-10-01 are merged in.
 */
export function useJournal() {
  const [journal, setJournal] = useState<Journal>({});
  const [records, setRecords] = useState<Records>(NO_RECORDS);
  const [saved, setSaved] = useState<ServerJournalEntry[]>([]);
  const { isSignedIn } = useAuth();

  useEffect(() => {
    try {
      setJournal(parseJournal(window.localStorage.getItem(JOURNAL_STORAGE_KEY)));
      setRecords(parseRecords(window.localStorage.getItem(RECORDS_STORAGE_KEY)));
    } catch {
      setJournal({});
    }
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    getJson<{ entries: ServerJournalEntry[] }>('/api/clue-game/journal/')
      .then(result => { if (!cancelled) setSaved(result.entries); })
      .catch(error => console.error('[Journal] Could not load saved solves:', error));
    return () => { cancelled = true; };
  }, [isSignedIn]);

  useEffect(() => {
    if (saved.length === 0) return;
    setJournal(previous => {
      const next = mergeServerJournal(previous, saved);
      save(JOURNAL_STORAGE_KEY, next);
      return next;
    });
  }, [saved]);

  const record = useCallback((
    species: { scientificName: string; commonName: string; className?: string | null },
    moves: number,
    session: { score: number; streak: number },
    sharp = false,
  ) => {
    setJournal(previous => {
      const next = recordSolve(previous, species, moves, new Date().toISOString(), sharp);
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
