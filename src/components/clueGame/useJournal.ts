import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  JOURNAL_STORAGE_KEY, NO_RECORDS, RECORDS_STORAGE_KEY, mergeServerJournal, parseJournal, parseRecords, recordSolve, updateRecords,
  type Journal, type Records, type ServerJournalEntry, type Sighting,
} from '@/clueGame/journal';
import type { Place } from '@/clueGame/places';
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
 * unavailable (private mode); play still works. A signed-in player's saved
 * solves are merged in, so the journal follows them between devices; pass the
 * globe's places to turn their solves there into sightings.
 */
export function useJournal(places?: readonly Place[]) {
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
    const byKey = new Map((places ?? []).map(place => [place.key, place]));
    setJournal(previous => {
      const next = mergeServerJournal(previous, saved, key => byKey.get(key));
      save(JOURNAL_STORAGE_KEY, next);
      return next;
    });
  }, [saved, places]);

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
