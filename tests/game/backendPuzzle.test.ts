// The board model (BackendPuzzle): fresh boards, seeded replays, matching,
// refills and shuffles.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { BackendPuzzle } from '@/game/BackendPuzzle';
import { MoveAction } from '@/game/MoveAction';
import { GEM_TYPES, type GemType } from '@/game/constants';

const W = 6;
const H = 6;

function seeded(seed: number, types?: GemType[]): BackendPuzzle {
  const puzzle = new BackendPuzzle(W, H);
  if (types) puzzle.setGemTypes(types);
  puzzle.setSeed(seed);
  puzzle.regenerateBoard();
  return puzzle;
}

/** A one-cell shift that makes a match (the board guarantees one exists). */
function matchingMove(puzzle: BackendPuzzle): MoveAction {
  for (const [rowOrCol, lines] of [['row', H], ['col', W]] as const) {
    for (let index = 0; index < lines; index++) {
      for (const amount of [1, -1]) {
        const move = new MoveAction(rowOrCol, index, amount);
        if (puzzle.getMatchesFromHypotheticalMove(move).length > 0) return move;
      }
    }
  }
  throw new Error('no matching move');
}

const gemsOf = (puzzle: BackendPuzzle) => puzzle.getGridState().flat().map(cell => cell?.gemType);

describe('BackendPuzzle boards', () => {
  test('a fresh board is full, has no ready-made matches, and has a valid move', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const puzzle = seeded(seed);
      const grid = puzzle.getGridState();
      assert.equal(grid.length, W);
      assert.ok(grid.every(column => column.length === H && column.every(cell => cell && GEM_TYPES.includes(cell.gemType))));
      assert.equal(puzzle.getMatchesFromHypotheticalMove(new MoveAction('row', 0, 0)).length, 0);
      assert.ok(puzzle.hasAnyValidMove());
    }
  });

  test('the same seed gives the same board and the same refills', () => {
    const [a, b] = [seeded(0x1234_abcd), seeded(0x1234_abcd)];
    assert.deepEqual(a.getGridState(), b.getGridState());
    const move = matchingMove(a);
    assert.deepEqual(b.getNextExplodeAndReplacePhase([move]), a.getNextExplodeAndReplacePhase([move]));
    assert.deepEqual(a.getGridState(), b.getGridState());
    assert.notDeepEqual(seeded(1).getGridState(), seeded(2).getGridState());
  });

  test('only the chosen colors ever spawn', () => {
    const types: GemType[] = ['red', 'green', 'blue'];
    for (let seed = 0; seed < 16; seed++) {
      const puzzle = seeded(seed, types);
      puzzle.getNextExplodeAndReplacePhase([matchingMove(puzzle)]);
      puzzle.shuffle();
      assert.ok(gemsOf(puzzle).every(gem => gem && types.includes(gem)));
    }
    assert.throws(() => new BackendPuzzle(W, H).setGemTypes(['red', 'blue']), RangeError);
  });

  test('seeds must be uint32', () => {
    const puzzle = new BackendPuzzle(W, H);
    for (const bad of [-1, 0x1_0000_0000, Number.NaN, 1.5]) assert.throws(() => puzzle.setSeed(bad), RangeError);
  });
});

describe('BackendPuzzle moves', () => {
  test('hypothetical moves do not change the board', () => {
    const puzzle = seeded(7);
    const before = JSON.stringify(puzzle.getGridState());
    puzzle.getMatchesFromHypotheticalMove(new MoveAction('row', 0, 1));
    puzzle.getMatchesFromHypotheticalMove(new MoveAction('col', 3, -2));
    assert.equal(JSON.stringify(puzzle.getGridState()), before);
  });

  test('a full-width shift wraps around and changes nothing', () => {
    const puzzle = seeded(7);
    const before = JSON.stringify(puzzle.getGridState());
    assert.ok(puzzle.getNextExplodeAndReplacePhase([new MoveAction('row', 2, W)]).isNothingToDo());
    assert.equal(JSON.stringify(puzzle.getGridState()), before);
  });

  test('a match clears, refills one gem per cleared cell, and leaves a full board', () => {
    const puzzle = seeded(11);
    const phase = puzzle.getNextExplodeAndReplacePhase([matchingMove(puzzle)]);
    assert.ok(phase.matches.length > 0);
    assert.equal(phase.getTotalReplacements(), phase.getAllMatchedCoordinates().size);
    assert.ok(puzzle.getGridState().every(column => column.length === H && column.every(cell => cell !== null)));
  });

  test('registerMove counts moves; a new board starts at zero', () => {
    const puzzle = seeded(3);
    puzzle.registerMove();
    assert.equal(puzzle.registerMove(), 2);
    puzzle.regenerateBoard();
    assert.equal(puzzle.getMovesUsed(), 0);
  });

  test('shuffle keeps the same gems and leaves a valid move', () => {
    const puzzle = seeded(5);
    const sorted = () => gemsOf(puzzle).sort();
    const before = sorted();
    puzzle.shuffle();
    assert.deepEqual(sorted(), before);
    assert.ok(puzzle.hasAnyValidMove());
  });
});
