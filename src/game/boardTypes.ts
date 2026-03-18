import type { GemType } from './constants';

export interface BoardCellState {
    blockerId?: string | null;
    durability?: number | null;
    flags?: string[];
}

export interface BoardCell {
    gemType: GemType;
    state?: BoardCellState;
}

export type PuzzleGrid = (BoardCell | null)[][];

export function createBoardCell(gemType: GemType, state?: BoardCellState): BoardCell {
    return state ? { gemType, state } : { gemType };
}

export function getBoardCellGemType(cell: BoardCell | null | undefined): GemType | null {
    return cell?.gemType ?? null;
}
