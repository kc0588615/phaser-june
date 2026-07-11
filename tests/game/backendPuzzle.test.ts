// Characterization tests for the board model (BackendPuzzle).
// These pin down current behavior so refactors can prove nothing changed.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { BackendPuzzle } from '@/game/BackendPuzzle';
import { MoveAction } from '@/game/MoveAction';
import { ExplodeAndReplacePhase, type Match } from '@/game/ExplodeAndReplacePhase';
import { ACTIVE_GEM_TYPES } from '@/game/constants';

// BackendPuzzle logs its lifecycle to console.log; keep test output readable.
console.log = () => {};

const W = 6;
const H = 6;

/** Scan all single-step row/col shifts and return one that produces a match. */
function findMatchingMove(puzzle: BackendPuzzle): MoveAction {
  for (let tries = 0; tries < 10; tries++) {
    for (let y = 0; y < H; y++) {
      for (const amt of [1, -1]) {
        const move = new MoveAction('row', y, amt);
        if (puzzle.getMatchesFromHypotheticalMove(move).length > 0) return move;
      }
    }
    for (let x = 0; x < W; x++) {
      for (const amt of [1, -1]) {
        const move = new MoveAction('col', x, amt);
        if (puzzle.getMatchesFromHypotheticalMove(move).length > 0) return move;
      }
    }
    puzzle.shuffle(); // shuffle retries until a valid move exists
  }
  throw new Error('no matching move found even after shuffles');
}

function totalMatchedGems(matches: Match[]): number {
  return matches.reduce((sum, match) => sum + match.length, 0);
}

describe('BackendPuzzle board generation', () => {
  test('creates a full grid of loot gems with no ready-made matches', () => {
    for (let i = 0; i < 5; i++) {
      const puzzle = new BackendPuzzle(W, H);
      const grid = puzzle.getGridState();
      assert.equal(grid.length, W);
      for (const column of grid) {
        assert.equal(column.length, H);
        for (const cell of column) {
          assert.ok(cell, 'no empty cells on a fresh board');
          assert.ok((ACTIVE_GEM_TYPES as readonly string[]).includes(cell.gemType));
          assert.equal(cell.family, 'loot');
        }
      }
      // A zero-amount move leaves the grid as-is, so this returns the
      // matches currently on the board — there must be none.
      const noMove = new MoveAction('row', 0, 0);
      assert.equal(puzzle.getMatchesFromHypotheticalMove(noMove).length, 0);
    }
  });

  test('same uint32 seed reproduces the board and generated refill sequence', () => {
    const first = new BackendPuzzle(W, H);
    const second = new BackendPuzzle(W, H);
    first.setSeed(0x1234_abcd);
    second.setSeed(0x1234_abcd);
    first.regenerateBoard();
    second.regenerateBoard();
    assert.deepEqual(first.getGridState(), second.getGridState());

    const firstMove = findMatchingMove(first);
    const secondMove = findMatchingMove(second);
    assert.deepEqual(secondMove, firstMove);
    assert.deepEqual(
      second.getNextExplodeAndReplacePhase([secondMove]),
      first.getNextExplodeAndReplacePhase([firstMove]),
    );
    assert.deepEqual(first.getGridState(), second.getGridState());
  });

  test('generated fills, refills, and shuffles never introduce disabled loot ids', () => {
    const disabled = new Set(['black', 'white', 'purple']);
    const assertOnlyActive = (puzzle: BackendPuzzle) => {
      for (const column of puzzle.getGridState()) {
        for (const cell of column) {
          assert.ok(cell);
          assert.equal(disabled.has(cell.gemType), false, `disabled gem spawned: ${cell.gemType}`);
          assert.ok((ACTIVE_GEM_TYPES as readonly string[]).includes(cell.gemType));
        }
      }
    };

    for (let seed = 0; seed < 32; seed += 1) {
      const puzzle = new BackendPuzzle(W, H);
      puzzle.setSeed(seed);
      puzzle.regenerateBoard();
      assertOnlyActive(puzzle);
      const move = findMatchingMove(puzzle);
      puzzle.getNextExplodeAndReplacePhase([move]);
      assertOnlyActive(puzzle);
      puzzle.shuffle();
      assertOnlyActive(puzzle);
    }
  });

  test('rejects board seeds outside uint32', () => {
    const puzzle = new BackendPuzzle(W, H);
    assert.throws(() => puzzle.setSeed(-1), RangeError);
    assert.throws(() => puzzle.setSeed(0x1_0000_0000), RangeError);
    assert.throws(() => puzzle.setSeed(Number.NaN), RangeError);
  });

  test('hypothetical moves do not mutate the real board', () => {
    const puzzle = new BackendPuzzle(W, H);
    const before = JSON.stringify(puzzle.getGridState());
    puzzle.getMatchesFromHypotheticalMove(new MoveAction('row', 0, 1));
    puzzle.getMatchesFromHypotheticalMove(new MoveAction('col', 3, -2));
    assert.equal(JSON.stringify(puzzle.getGridState()), before);
  });

  test('a full-width row shift wraps around and changes nothing', () => {
    const puzzle = new BackendPuzzle(W, H);
    const before = JSON.stringify(puzzle.getGridState());
    const phase = puzzle.getNextExplodeAndReplacePhase([new MoveAction('row', 2, W)]);
    assert.ok(phase.isNothingToDo());
    assert.equal(JSON.stringify(puzzle.getGridState()), before);
    assert.equal(puzzle.getScore(), 0);
  });
});

describe('BackendPuzzle matching and refills', () => {
  test('a matching move explodes, refills to full height, and scores 10/gem +5 per extra', () => {
    const puzzle = new BackendPuzzle(W, H);
    const move = findMatchingMove(puzzle);
    const phase = puzzle.getNextExplodeAndReplacePhase([move]);

    assert.ok(phase.matches.length > 0);
    // One replacement gem per unique exploded coordinate.
    assert.equal(phase.getTotalReplacements(), phase.getAllMatchedCoordinates().size);

    // Score: 10 per matched gem, +5 per gem beyond 3 (counted across the phase).
    const matched = totalMatchedGems(phase.matches);
    const expected = matched * 10 + (matched > 3 ? (matched - 3) * 5 : 0);
    assert.equal(puzzle.getScore(), expected);

    // Board is whole again: every column back at full height, no holes.
    for (const column of puzzle.getGridState()) {
      assert.equal(column.length, H);
      assert.ok(column.every((cell) => cell !== null));
    }
  });

  test('queued spawn gems are consumed for refills in column order', () => {
    const puzzle = new BackendPuzzle(W, H);
    const move = findMatchingMove(puzzle);
    puzzle.addNextGemsToSpawn(Array(W * H).fill('red'));
    const phase = puzzle.getNextExplodeAndReplacePhase([move]);
    for (const [, gemTypes] of phase.replacements) {
      assert.ok(gemTypes.every((gemType) => gemType === 'red'));
    }
  });

  test('calculatePhaseBaseScore characterization table', () => {
    const puzzle = new BackendPuzzle(W, H);
    const phaseOf = (matches: Match[]) => new ExplodeAndReplacePhase(matches);
    const line = (len: number): Match =>
      Array.from({ length: len }, (_, i) => [0, i] as [number, number]);

    assert.equal(puzzle.calculatePhaseBaseScore(phaseOf([])), 0);
    assert.equal(puzzle.calculatePhaseBaseScore(phaseOf([line(3)])), 30);
    assert.equal(puzzle.calculatePhaseBaseScore(phaseOf([line(4)])), 45);
    assert.equal(puzzle.calculatePhaseBaseScore(phaseOf([line(5)])), 60);
    // Two separate 3-matches count as 6 gems: 60 base + 15 bonus.
    assert.equal(puzzle.calculatePhaseBaseScore(phaseOf([line(3), line(3)])), 75);
  });
});

describe('BackendPuzzle move budget and score helpers', () => {
  test('registerMove caps at maxMoves and drives isGameOver', () => {
    const puzzle = new BackendPuzzle(W, H);
    puzzle.setMaxMoves(3);
    assert.equal(puzzle.getMovesRemaining(), 3);
    puzzle.registerMove();
    puzzle.registerMove();
    assert.equal(puzzle.isGameOver(), false);
    puzzle.registerMove();
    puzzle.registerMove(); // over-registering must not exceed the cap
    assert.equal(puzzle.getMovesUsed(), 3);
    assert.equal(puzzle.getMovesRemaining(), 0);
    assert.equal(puzzle.isGameOver(), true);
    puzzle.resetMoves();
    assert.equal(puzzle.isGameOver(), false);
  });

  test('addBonusScore floors fractions and ignores non-positive values', () => {
    const puzzle = new BackendPuzzle(W, H);
    puzzle.addBonusScore(10.9);
    assert.equal(puzzle.getScore(), 10);
    puzzle.addBonusScore(0);
    puzzle.addBonusScore(-50);
    assert.equal(puzzle.getScore(), 10);
  });

  test('regenerateBoard resets score and moves', () => {
    const puzzle = new BackendPuzzle(W, H);
    puzzle.addBonusScore(100);
    puzzle.registerMove();
    puzzle.regenerateBoard();
    assert.equal(puzzle.getScore(), 0);
    assert.equal(puzzle.getMovesUsed(), 0);
  });
});

describe('BackendPuzzle blockers', () => {
  test('damageBlocker chips durability and clears the blocker at zero', () => {
    const puzzle = new BackendPuzzle(W, H);
    puzzle.applyCellStateSeeds([
      { x: 1, y: 1, state: { blockerId: 'mud', durability: 2, flags: ['mud_tiles'] } },
    ]);
    assert.equal(puzzle.damageBlocker(1, 1), false); // 2 -> 1, still standing
    assert.equal(puzzle.damageBlocker(1, 1), true); // 1 -> 0, destroyed
    const cell = puzzle.getGridState()[1][1];
    assert.equal(cell?.state?.blockerId, null);
    assert.equal(cell?.state?.durability, null);
    // No blocker at an unseeded cell.
    assert.equal(puzzle.damageBlocker(0, 0), false);
  });

  test('cells with active blockers cannot participate in matches', () => {
    const puzzle = new BackendPuzzle(W, H);
    const seeds = [];
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < H; y++) {
        seeds.push({ x, y, state: { blockerId: 'stone', durability: 1, flags: [] } });
      }
    }
    puzzle.applyCellStateSeeds(seeds);
    // Every cell blocked -> no shift can ever produce a match.
    assert.equal(puzzle.hasAnyValidMove(), false);
  });
});

describe('BackendPuzzle shuffle', () => {
  test('shuffle preserves gem multiset and per-cell obstacle state', () => {
    const puzzle = new BackendPuzzle(W, H);
    puzzle.applyCellStateSeeds([
      { x: 2, y: 3, state: { blockerId: 'vine', durability: 1, flags: ['overgrowth'] } },
    ]);
    const countByType = (grid: ReturnType<BackendPuzzle['getGridState']>) => {
      const counts: Record<string, number> = {};
      for (const column of grid) {
        for (const cell of column) {
          if (cell) counts[cell.gemType] = (counts[cell.gemType] ?? 0) + 1;
        }
      }
      return counts;
    };
    const before = countByType(puzzle.getGridState());
    puzzle.shuffle();
    const after = puzzle.getGridState();
    assert.deepEqual(countByType(after), before);
    // Obstacle state stays glued to the board position, not the gem.
    assert.equal(after[2][3]?.state?.blockerId, 'vine');
    assert.equal(puzzle.hasAnyValidMove(), true);
  });
});
