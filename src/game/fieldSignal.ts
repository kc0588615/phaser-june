import { GEM_EVIDENCE_FAMILIES, type EvidenceFamily } from '@/expedition/evidenceFamilies';
import { hash32 } from '@/lib/seededRng';
import type { BoardCell, PuzzleGrid } from './boardTypes';
import type { CellStateSeed } from './nodeObstacles';

export const FIELD_SIGNAL_BLOCKER_ID = 'field_signal';

export interface FieldSignalSeed extends CellStateSeed {
  family: EvidenceFamily;
}

/** Tile detection only. Deliberately independent of the gem under the tile: since
 *  plan 024 the payout family comes from the clearing match, not from this cell. */
export function isFieldSignal(cell: BoardCell | null | undefined): boolean {
  return cell?.state?.blockerId === FIELD_SIGNAL_BLOCKER_ID && Boolean(cell.state.durability);
}

export function getFieldSignalFamily(cell: BoardCell | null | undefined): EvidenceFamily | null {
  return isFieldSignal(cell) ? GEM_EVIDENCE_FAMILIES[cell!.gemType] ?? null : null;
}

export interface FieldSignalPayout {
  family: EvidenceFamily;
  hintCount: 1 | 2;
}

export interface FieldSignalMatchOutcome {
  damage: boolean;
  payout: FieldSignalPayout | null;
}

interface FieldSignalBoard {
  getGridState(): PuzzleGrid;
  damageBlocker(x: number, y: number): boolean;
}

/**
 * What a match clearing the signal pays. The family is the *clearing match's* colour, not
 * the gem under the tile, so the player picks their intel by choosing what to match.
 */
export function getFieldSignalPayout(
  matchGemType: string | null | undefined,
  matchLength: number,
  isCascade: boolean,
): FieldSignalPayout | null {
  if (isCascade || matchLength < 3) return null;
  const family = matchGemType ? GEM_EVIDENCE_FAMILIES[matchGemType as keyof typeof GEM_EVIDENCE_FAMILIES] : undefined;
  return family ? { family, hintCount: matchLength >= 4 ? 2 : 1 } : null;
}

/** Every adjacent match damages the tile; only a direct evidence-colour match pays. */
export function getFieldSignalMatchOutcome(
  matchGemType: string | null | undefined,
  matchLength: number,
  isCascade: boolean,
): FieldSignalMatchOutcome {
  if (matchLength < 3) return { damage: false, payout: null };
  return {
    damage: true,
    payout: getFieldSignalPayout(matchGemType, matchLength, isCascade),
  };
}

/** Applies an adjacent match to the one live signal after board falls have settled. */
export function applyFieldSignalMatch(
  board: FieldSignalBoard,
  matchGemType: string | null | undefined,
  matchLength: number,
  isCascade: boolean,
): FieldSignalPayout | null {
  const outcome = getFieldSignalMatchOutcome(matchGemType, matchLength, isCascade);
  if (!outcome.damage) return null;
  const grid = board.getGridState();
  for (let x = 0; x < grid.length; x += 1) {
    for (let y = 0; y < (grid[x]?.length ?? 0); y += 1) {
      if (!isFieldSignal(grid[x]?.[y])) continue;
      return board.damageBlocker(x, y) ? outcome.payout : null;
    }
  }
  return null;
}

export function countLiveFieldSignals(grid: PuzzleGrid): number {
  let count = 0;
  for (const column of grid) {
    for (const cell of column) {
      if (isFieldSignal(cell)) count += 1;
    }
  }
  return count;
}

export function buildFieldSignalSeed(
  grid: PuzzleGrid,
  boardSeed: number,
  nodeIndex: number,
  moveNumber: number,
): FieldSignalSeed | null {
  const width = grid.length;
  const height = grid[0]?.length ?? 0;
  const candidates: Array<{ x: number; y: number; family: EvidenceFamily }> = [];

  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      const cell = grid[x]?.[y];
      const family = cell ? GEM_EVIDENCE_FAMILIES[cell.gemType] : undefined;
      if (!cell || !family || isBlocked(cell)) continue;
      const hasOpenNeighbor = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => {
        const neighbor = grid[x + dx]?.[y + dy];
        return Boolean(neighbor && !isBlocked(neighbor));
      });
      if (hasOpenNeighbor) candidates.push({ x, y, family });
    }
  }

  if (candidates.length === 0) return null;
  const index = hash32(`field-signal:${boardSeed}:${nodeIndex}:${moveNumber}`) % candidates.length;
  const selected = candidates[index];
  return {
    ...selected,
    state: {
      blockerId: FIELD_SIGNAL_BLOCKER_ID,
      durability: 1,
      flags: [FIELD_SIGNAL_BLOCKER_ID],
    },
  };
}

function isBlocked(cell: BoardCell): boolean {
  return Boolean(cell.state?.blockerId && cell.state.durability && cell.state.durability > 0);
}
