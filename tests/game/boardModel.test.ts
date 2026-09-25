// Board model invariants a playtest rarely hits: every seeded board starts
// playable, seeds replay exactly, overlapping groups refill once per cell, and a
// reshuffle keeps the gems and leaves a move.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BoardModel, type Move } from '@/game/BoardModel';
import { GEM_TYPES } from '@/game/constants';

const W = 6;
const H = 6;

function seeded(seed: number): BoardModel {
  const model = new BoardModel(W, H);
  model.newBoard(seed);
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

test('a match clears, refills one gem per cleared cell, and leaves a full board', () => {
  const model = seeded(11);
  const phase = model.nextPhase(matchingMove(model));
  assert.ok(phase.groups.length > 0);
  const cleared = new Set(phase.groups.flatMap(group => group.cells.map(cell => cell.join())));
  assert.equal(phase.refills.reduce((sum, [, gems]) => sum + gems.length, 0), cleared.size);
  assert.ok(phase.groups.every(group => group.cells.length >= 3));
  assert.ok(model.getGrid().every(column => column.length === H));
});

test('shuffle keeps the same gems and leaves a valid move', () => {
  const model = seeded(5);
  const sorted = () => model.getGrid().flat().sort();
  const before = sorted();
  model.shuffle();
  assert.deepEqual(sorted(), before);
  assert.ok(model.hasAnyValidMove());
});
