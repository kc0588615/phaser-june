// The board model: fresh boards, seeded replays, matching, refills and shuffles.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { BoardModel, applyShift, type Move } from '@/game/BoardModel';
import { GEM_TYPES, type GemType } from '@/game/constants';

const W = 6;
const H = 6;

function seeded(seed: number, types?: GemType[]): BoardModel {
  const model = new BoardModel(W, H);
  model.newBoard(seed, types);
  return model;
}

/** A one-cell shift that makes a match (the board guarantees one exists). */
function matchingMove(model: BoardModel): Move {
  for (const [rowOrCol, lines] of [['row', H], ['col', W]] as const) {
    for (let index = 0; index < lines; index++) {
      for (const amount of [1, -1]) {
        if (model.matchesAfter({ rowOrCol, index, amount }).length > 0) return { rowOrCol, index, amount };
      }
    }
  }
  throw new Error('no matching move');
}

describe('BoardModel boards', () => {
  test('a fresh board is full, has no ready-made matches, and has a valid move', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const model = seeded(seed);
      const grid = model.getGrid();
      assert.equal(grid.length, W);
      assert.ok(grid.every(column => column.length === H && column.every(gem => GEM_TYPES.includes(gem))));
      assert.equal(model.matchesAfter({ rowOrCol: 'row', index: 0, amount: 0 }).length, 0);
      assert.ok(model.hasAnyValidMove());
    }
  });

  test('the same seed gives the same board and the same refills', () => {
    const [a, b] = [seeded(0x1234_abcd), seeded(0x1234_abcd)];
    assert.deepEqual(a.getGrid(), b.getGrid());
    const move = matchingMove(a);
    assert.deepEqual(b.nextPhase(move), a.nextPhase(move));
    assert.deepEqual(a.getGrid(), b.getGrid());
    assert.notDeepEqual(seeded(1).getGrid(), seeded(2).getGrid());
  });

  test('only the chosen colors ever spawn', () => {
    const types: GemType[] = ['red', 'green', 'blue'];
    for (let seed = 0; seed < 16; seed++) {
      const model = seeded(seed, types);
      model.nextPhase(matchingMove(model));
      model.shuffle();
      assert.ok(model.getGrid().flat().every(gem => types.includes(gem)));
    }
    assert.throws(() => seeded(1, ['red', 'blue']), RangeError);
  });

  test('seeds must be uint32', () => {
    for (const bad of [-1, 0x1_0000_0000, Number.NaN, 1.5]) assert.throws(() => seeded(bad), RangeError);
  });
});

describe('BoardModel moves', () => {
  test('hypothetical moves do not change the board', () => {
    const model = seeded(7);
    const before = model.getGrid();
    model.matchesAfter({ rowOrCol: 'row', index: 0, amount: 1 });
    model.matchesAfter({ rowOrCol: 'col', index: 3, amount: -2 });
    assert.deepEqual(model.getGrid(), before);
  });

  test('a full-width shift wraps around and changes nothing', () => {
    const model = seeded(7);
    const before = model.getGrid();
    assert.equal(model.nextPhase({ rowOrCol: 'row', index: 2, amount: W }).groups.length, 0);
    assert.deepEqual(model.getGrid(), before);
  });

  test('shifts wrap around: a row right by one, a column up by one', () => {
    const grid = [['a', 'b'], ['c', 'd'], ['e', 'f']]; // 3 columns x 2 rows
    applyShift(grid, { rowOrCol: 'row', index: 0, amount: 1 });
    assert.deepEqual(grid.map(column => column[0]), ['e', 'a', 'c']);
    applyShift(grid, { rowOrCol: 'col', index: 1, amount: -1 });
    assert.deepEqual(grid[1], ['d', 'a']);
  });

  test('a match clears, refills one gem per cleared cell, and leaves a full board', () => {
    const model = seeded(11);
    const phase = model.nextPhase(matchingMove(model));
    assert.ok(phase.groups.length > 0);
    const cleared = new Set(phase.groups.flatMap(group => group.cells.map(cell => cell.join())));
    assert.equal(phase.refills.reduce((sum, [, gems]) => sum + gems.length, 0), cleared.size);
    assert.ok(phase.groups.every(group => group.cells.length >= 3));
    assert.ok(model.getGrid().every(column => column.length === H));
  });

  test('moves that match are counted; a new board starts at zero', () => {
    const model = seeded(3);
    model.nextPhase({ rowOrCol: 'row', index: 0, amount: W }); // no match: not counted
    assert.equal(model.movesUsed, 0);
    model.nextPhase(matchingMove(model));
    assert.equal(model.movesUsed, 1);
    model.newBoard(3);
    assert.equal(model.movesUsed, 0);
  });

  test('shuffle keeps the same gems and leaves a valid move', () => {
    const model = seeded(5);
    const sorted = () => model.getGrid().flat().sort();
    const before = sorted();
    model.shuffle();
    assert.deepEqual(sorted(), before);
    assert.ok(model.hasAnyValidMove());
  });
});
