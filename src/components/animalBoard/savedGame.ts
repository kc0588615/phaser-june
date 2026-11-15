// The game in progress, kept for this tab (sessionStorage) so a reload, a Back that misses the page cache or a
// discarded tab picks up where the player left off. One slot; the globe clears it. Storage can be unavailable.
import type { AnimalSession } from '@/clueGame/animalSession';
import type { ContinentKey } from '@/clueGame/regions';
import type { Grid, Toys } from '@/game/BoardModel';

const KEY = 'cc:explore:game';

/** The board after the last settled move of round `roundNo`; `pins`: where the animals stand now (plan 047: they walk). */
export interface SavedBoard { roundNo: number; grid: Grid; toys: Toys; pins: Array<[cell: [x: number, y: number], id: number]> }

export interface SavedRowOrder { roundNo: number; ids: number[] }

export interface SavedGame {
  v: 1;
  seed: number;
  requested: ContinentKey | null;
  session: Omit<AnimalSession, 'book'>;
  board: SavedBoard | null;
  /** The evidence grid's rows as last drawn, so a reload on the round-end card shows the order the round ended on. */
  rowOrder?: SavedRowOrder | null;
}

export function readSavedGame(): SavedGame | null {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(KEY) ?? 'null');
    return saved?.v === 1 ? saved : null;
  } catch {
    return null;
  }
}

const kindOf = (value: unknown) => (value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value);

/** `saved` is an object that holds every key `fresh` holds with a defined value, each of the same JSON kind
 *  (null on either side matches anything; arrays aren't looked inside). */
function holdsKeys(saved: unknown, fresh: object): boolean {
  if (kindOf(saved) !== 'object') return false;
  const held = saved as Record<string, unknown>;
  return Object.entries(fresh).every(([key, value]) => value === undefined
    || (Object.hasOwn(held, key) && (value === null || held[key] === null || kindOf(held[key]) === kindOf(value))));
}

/** Whether a saved session is structurally compatible with today's code: the session, its round, the round's rules
 *  and the trail each hold every key a fresh round 1's holds (`book` aside), of the same JSON kind. Catches a field
 *  added without a rules version bump (the grid's row order, 2026-11-04). Not a full validation: values inside
 *  arrays and maps, `board` and `rowOrder` aren't checked. A save from before highlights (no `session.highlight`)
 *  is dropped, so `restore`'s `highlight ?? []` is no longer reached from a load (it stays: out of scope). */
export function fitsShape(saved: unknown, fresh: SavedGame['session']): boolean {
  const session = saved as Partial<Record<'round' | 'trail', { rules?: unknown }>> | null | undefined;
  return holdsKeys(saved, fresh) && holdsKeys(session?.round, fresh.round)
    && holdsKeys(session?.round?.rules, fresh.round.rules) && holdsKeys(session?.trail, fresh.trail);
}

export function writeSavedGame(game: SavedGame): void {
  try { window.sessionStorage.setItem(KEY, JSON.stringify(game)); } catch { /* not resumable this time */ }
}

export function clearSavedGame(): void {
  try { window.sessionStorage.removeItem(KEY); } catch { /* nothing saved */ }
}
