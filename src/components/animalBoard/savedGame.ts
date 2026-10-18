// The game in progress, kept for this tab (sessionStorage) so a reload, a Back that misses the page cache or a
// discarded tab picks up where the player left off. One slot; the globe clears it. Storage can be unavailable.
import type { AnimalSession } from '@/clueGame/animalSession';
import type { ContinentKey } from '@/clueGame/regions';
import type { Grid, Toys } from '@/game/BoardModel';

const KEY = 'cc:explore:game';

/** The board after the last settled move of round `roundNo`; `pins`: where the animals stand now (plan 047: they walk). */
export interface SavedBoard { roundNo: number; grid: Grid; toys: Toys; pins: Array<[cell: [x: number, y: number], id: number]> }

export interface SavedGame {
  v: 1;
  seed: number;
  requested: ContinentKey | null;
  session: Omit<AnimalSession, 'book'>;
  board: SavedBoard | null;
}

export function readSavedGame(): SavedGame | null {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(KEY) ?? 'null');
    return saved?.v === 1 ? saved : null;
  } catch {
    return null;
  }
}

export function writeSavedGame(game: SavedGame): void {
  try { window.sessionStorage.setItem(KEY, JSON.stringify(game)); } catch { /* not resumable this time */ }
}

export function clearSavedGame(): void {
  try { window.sessionStorage.removeItem(KEY); } catch { /* nothing saved */ }
}
