import { describe, expect, it, vi } from 'vitest';
import { BackendPuzzle, type PuzzleGrid } from '@/game/BackendPuzzle';
import { createBoardCell } from '@/game/boardTypes';
import { ACTION_GEM_TYPES, LOOT_GEM_TYPES } from '@/game/constants';

const grid = (columns: string[][]): PuzzleGrid =>
  columns.map((column) => column.map((gemType) => createBoardCell(gemType as any)));

const setGrid = (puzzle: BackendPuzzle, nextGrid: PuzzleGrid) => {
  (puzzle as any).puzzleState = nextGrid;
};

const matchesFor = (puzzle: BackendPuzzle, state = puzzle.getGridState()) =>
  (puzzle as any).getMatches(state) as Array<Array<[number, number]>>;

describe('BackendPuzzle', () => {
  it('creates an initial board with dimensions and no pre-existing matches', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const puzzle = new BackendPuzzle(4, 3);
    log.mockRestore();

    const state = puzzle.getGridState();

    expect(state).toHaveLength(4);
    expect(state.every((column) => column.length === 3)).toBe(true);
    expect(matchesFor(puzzle, state)).toEqual([]);
  });

  it('detects horizontal and vertical matches without false positives', () => {
    const puzzle = new BackendPuzzle(4, 4);
    setGrid(puzzle, grid([
      ['sword', 'key', 'crate', 'power'],
      ['sword', 'staff', 'key', 'crate'],
      ['sword', 'crate', 'staff', 'key'],
      ['staff', 'shield', 'shield', 'shield'],
    ]));

    const matches = matchesFor(puzzle).map((match) => match.map(([x, y]) => `${x},${y}`));

    expect(matches).toHaveLength(2);
    expect(matches).toContainEqual(['3,1', '3,2', '3,3']);
    expect(matches).toContainEqual(['0,0', '1,0', '2,0']);
  });

  it('creates replacement counts that match exploded cells per column', () => {
    const puzzle = new BackendPuzzle(4, 4);
    setGrid(puzzle, grid([
      ['sword', 'key', 'crate', 'power'],
      ['sword', 'staff', 'key', 'crate'],
      ['sword', 'crate', 'staff', 'key'],
      ['staff', 'shield', 'shield', 'shield'],
    ]));

    const phase = puzzle.getNextExplodeAndReplacePhase([]);

    expect(phase.isNothingToDo()).toBe(false);
    expect(phase.getTotalReplacements()).toBe(6);
    expect(phase.getReplacementsForColumn(0)).toHaveLength(1);
    expect(phase.getReplacementsForColumn(1)).toHaveLength(1);
    expect(phase.getReplacementsForColumn(2)).toHaveLength(1);
    expect(phase.getReplacementsForColumn(3)).toHaveLength(3);
    expect(puzzle.getGridState().every((column) => column.length === 4)).toBe(true);
  });

  it('uses match battle lootChance for mixed board spawns', () => {
    const puzzle = new BackendPuzzle(4, 3);
    let seed = 7;
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (seed * 48271) % 0x7fffffff;
      return seed / 0x7fffffff;
    });

    puzzle.setMatchBattleConfig({
      piecePool: [
        { pieceId: 'sword', level: 1, weight: 1 },
        { pieceId: 'shield', level: 1, weight: 1 },
        { pieceId: 'staff', level: 1, weight: 1 },
      ],
      lootChance: 0.35,
      snippetsEnabled: false,
      boardCols: 4,
      boardRows: 3,
    });

    const sampleSize = 10_000;
    let lootCount = 0;
    for (let i = 0; i < sampleSize; i++) {
      const gem = (puzzle as any).pickWeightedGem();
      if (LOOT_GEM_TYPES.includes(gem)) lootCount++;
    }
    random.mockRestore();

    const observed = lootCount / sampleSize;
    expect(observed).toBeGreaterThanOrEqual(0.30);
    expect(observed).toBeLessThanOrEqual(0.40);
  });

  it('keeps match battle snippet preview action-only', () => {
    const puzzle = new BackendPuzzle(4, 3);
    puzzle.setMatchBattleConfig({
      piecePool: [
        { pieceId: 'sword', level: 1, weight: 1 },
        { pieceId: 'shield', level: 1, weight: 1 },
        { pieceId: 'staff', level: 1, weight: 1 },
      ],
      lootChance: 1,
      snippetsEnabled: true,
      boardCols: 4,
      boardRows: 3,
    });

    const preview = puzzle.getSnippetPreview();

    expect(preview).toHaveLength(4);
    expect(preview.every(gem => ACTION_GEM_TYPES.includes(gem as any))).toBe(true);
  });
});
