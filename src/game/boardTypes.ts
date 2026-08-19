import type { GemType, GemFamily } from './constants';
import { getGemFamily } from './constants';

export interface BoardCellState {
    blockerId?: string | null;
    durability?: number | null;
    flags?: string[];
}

export interface BoardCell {
    family: GemFamily;
    gemType: GemType;
    state?: BoardCellState;
}

export type PuzzleGrid = (BoardCell | null)[][];

export interface BoardCheckpointV1 {
    version: 1;
    width: number;
    height: number;
    grid: PuzzleGrid;
    score: number;
    movesUsed: number;
    maxMoves: number;
    nextGemsToSpawn: GemType[];
    allowedGemTypes: GemType[];
    rngState: number;
    /** Durable one-per-site lifecycle marker; remains true after the tile clears. */
    fieldSignalSpawned?: boolean;
}

export function createBoardCell(gemType: GemType, state?: BoardCellState): BoardCell {
    const cell: BoardCell = { family: getGemFamily(gemType), gemType };
    if (state) cell.state = state;
    return cell;
}

export function getBoardCellGemType(cell: BoardCell | null | undefined): GemType | null {
    return cell?.gemType ?? null;
}
