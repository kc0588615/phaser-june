import type { GemType } from './constants';

export interface BoardCell {
    gemType: GemType;
}

/** Column-major: grid[x][y], y = 0 at the top. */
export type PuzzleGrid = (BoardCell | null)[][];

export function createBoardCell(gemType: GemType): BoardCell {
    return { gemType };
}
