// Board model invariants a playtest rarely hits: every seeded board starts
// playable, seeds replay exactly, overlapping groups refill once per cell, and a
// reshuffle keeps the gems and leaves a move.
//
// Toys (special gems left by big matches). Written before the code; the ways they could break:
//  1. A straight 4 leaves no line gem, leaves it in the wrong cell, or clears its cell.
//  2. A straight 5 leaves a line gem instead of a color gem.
//  3. An L or T leaves no blast gem, or two toys.
//  4. A matched line gem doesn't clear its whole row (or clears a toy made in the same phase).
//  5. Swapping a color gem isn't a valid move, or doesn't clear every gem of the other color.
//  6. A toy doesn't fall with its gem (the toy layer drifts from the gem layer).
//  7. A toy inside another toy's blast doesn't go off (or goes off twice).
//  8. The refills don't match the cells cleared, so the board isn't full.
//  9. Gems a toy clears are counted twice (in a match and a blast) or under the wrong color.
// 10. A note gem in a blast isn't collected, or is counted as a color.
// 11. A reshuffle separates a toy from its gem or loses it.
// 12. Two toys swapped together fire twice, or show their clear in the wrong place: a combo is one fire whose
//     cells are the whole clear (a cross, a 5×5, the board), and the other toy is used up, not set off again.
// 13. A color gem swapped with another toy doesn't follow the rule: it clears that toy's color, and the toy goes
//     off with them.
//
// Pinned tiles (plan 044: animals on the board). The ways they could break:
// 14. A tile moves, doubles or vanishes through gravity, cascades or a reshuffle; a toy lands on it.
// 15. A run passes through a tile (a tile must break runs, whatever its grid value).
// 16. A swap touching a tile is allowed.
// 17. A toy's clear removes a tile, or a line stops at it instead of passing behind.
// 18. `touched` misses a tile next to a run or a cleared gem, or names one that wasn't.
// 19. Gems don't fall past a tile, or unpinning leaves a hole.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BoardModel, neighborSwaps, type Cell, type ExplodePhase, type Grid, type Move, type Special } from '@/game/BoardModel';
import { GEM_TYPES, type GemType } from '@/game/constants';

const W = 6;
const H = 6;
const COLORS: GemType[] = ['orange', 'yellow', 'green', 'blue', 'black'];
const NOTE = { type: 'purple' as const, chance: 0.05 };

function seeded(seed: number): BoardModel {
  const model = new BoardModel(W, H);
  model.newBoard(seed);
  return model;
}

/** A swap that makes a match (the board guarantees one exists). */
function matchingMove(model: BoardModel): Move {
  const move = neighborSwaps(W, H).find(swap => model.matchesAfter(swap).length > 0);
  if (!move) throw new Error('no matching move');
  return move;
}

const LETTER: Record<string, GemType> = { O: 'orange', Y: 'yellow', G: 'green', B: 'blue', K: 'black', P: 'purple', X: 'white' };

/** A 5×5 board from rows of letters (row-major, y = 0 at the top), with toys and pinned tiles at the given cells. */
function board(rows: string[], toys: Array<[Cell, Special]> = [], pins: Array<[Cell, number]> = []): BoardModel {
  const grid: Grid = Array.from({ length: 5 }, (_column, x) => rows.map(row => LETTER[row.split(' ')[x]]));
  const model = new BoardModel(5, 5);
  model.newBoard(1, COLORS, NOTE);
  model.loadBoard(grid, toys, pins);
  return model;
}

const has = (cells: readonly Cell[], [x, y]: Cell) => cells.some(([cx, cy]) => cx === x && cy === y);
const refilled = (phase: ExplodePhase) => phase.refills.reduce((sum, [, gems]) => sum + gems.length, 0);
const blastTotal = (phase: ExplodePhase) => phase.groups.filter(group => group.blast).reduce((sum, group) => sum + group.cells.length, 0);

test('a fresh board is full, has no ready-made matches, and has a valid move', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const model = seeded(seed);
    const grid = model.getGrid();
    assert.equal(grid.length, W);
    assert.ok(grid.every(column => column.length === H && column.every(gem => GEM_TYPES.includes(gem))));
    assert.equal(model.nextPhase().groups.length, 0);
    assert.ok(model.hasAnyValidMove());
  }
});

test('the same seed gives the same board and the same refills', () => {
  const [a, b] = [seeded(0x1234_abcd), seeded(0x1234_abcd)];
  assert.deepEqual(a.getGrid(), b.getGrid());
  const move = matchingMove(a);
  assert.deepEqual(b.nextPhase(move), a.nextPhase(move));
  assert.deepEqual(a.getGrid(), b.getGrid());
  assert.deepEqual(a.getToys(), b.getToys());
  assert.notDeepEqual(seeded(1).getGrid(), seeded(2).getGrid());
});

test('a match clears, refills one gem per cleared cell, and leaves a full board', () => {
  const model = seeded(11);
  const phase = model.nextPhase(matchingMove(model));
  assert.ok(phase.groups.length > 0);
  assert.equal(refilled(phase), phase.cleared.length);
  assert.ok(phase.groups.filter(group => !group.blast).every(group => group.cells.length >= 3 || group.gemType === 'purple'));
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

test('a straight 4 leaves a line gem where the swapped gem landed; only 3 cells clear', () => {
  const model = board([
    'G B G B K',
    'B K B K G',
    'O O Y O K',
    'K G O G B',
    'G B K B G',
  ]);
  const phase = model.nextPhase({ from: [2, 2], to: [2, 3] });
  assert.deepEqual(phase.made, [{ cell: [2, 2], special: 'row', gemType: 'orange' }]);
  assert.equal(phase.cleared.length, 3);
  assert.ok(!has(phase.cleared, [2, 2]));
  assert.equal(refilled(phase), 3);
  assert.equal(model.getToys()[2][2], 'row');
  assert.equal(model.getGrid()[2][2], 'orange');
});

test('a straight 5 leaves a color gem', () => {
  const model = board([
    'G B G B K',
    'B K B K G',
    'O O Y O O',
    'K G O G B',
    'G B K B G',
  ]);
  const phase = model.nextPhase({ from: [2, 2], to: [2, 3] });
  assert.deepEqual(phase.made.map(toy => toy.special), ['color']);
  assert.equal(phase.cleared.length, 4);
  assert.equal(model.getToys()[2][2], 'color');
});

test('an L or T leaves one blast gem where the runs cross', () => {
  const model = board([
    'G B G B K',
    'B K O K G',
    'K O Y O B',
    'G B O G K',
    'B G O B G',
  ]);
  const phase = model.nextPhase({ from: [2, 1], to: [2, 2] });
  assert.deepEqual(phase.made, [{ cell: [2, 2], special: 'bomb', gemType: 'orange' }]);
  assert.equal(phase.cleared.length, 4);
  assert.equal(refilled(phase), 4);
});

test('a matched line gem clears its whole row; the extra gems come back as blast groups by color', () => {
  const model = board([
    'G B G B K',
    'B K O K G',
    'K G O B Y',
    'G B Y O K',
    'B G K G B',
  ], [[[2, 2], 'row']]);
  const phase = model.nextPhase({ from: [2, 3], to: [3, 3] });
  assert.equal(phase.fired.length, 1);
  assert.equal(phase.fired[0].special, 'row');
  for (let x = 0; x < 5; x++) assert.ok(has(phase.cleared, [x, 2]), `row cell ${x} cleared`);
  assert.equal(phase.cleared.length, 7);
  assert.equal(blastTotal(phase), 4);
  const blasted = phase.groups.filter(group => group.blast).map(group => group.gemType).sort();
  assert.deepEqual(blasted, ['black', 'blue', 'green', 'yellow']);
  assert.equal(refilled(phase), 7);
});

test('a toy in another toy\'s blast goes off too, once', () => {
  const model = board([
    'G B G B K',
    'B K O K G',
    'K G O B Y',
    'G B Y O K',
    'B G K G B',
  ], [[[2, 2], 'row'], [[4, 2], 'bomb']]);
  const phase = model.nextPhase({ from: [2, 3], to: [3, 3] });
  assert.deepEqual(phase.fired.map(fire => fire.special).sort(), ['bomb', 'row']);
  for (const cell of [[3, 1], [4, 1], [4, 3]] as Cell[]) assert.ok(has(phase.cleared, cell), `bomb cell ${cell} cleared`);
  assert.equal(new Set(phase.cleared.map(cell => cell.join())).size, phase.cleared.length);
  assert.equal(refilled(phase), phase.cleared.length);
});

test('swapping a color gem is a valid move and clears every gem of the other color', () => {
  const model = board([
    'G B G B K',
    'B K Y K G',
    'K G O B Y',
    'G B Y O K',
    'B G K G B',
  ], [[[2, 2], 'color']]);
  const move: Move = { from: [2, 2], to: [3, 2] }; // (3, 2) is blue
  assert.ok(model.canSwap(move));
  const blues = model.getGrid().flat().filter(gem => gem === 'blue').length;
  const phase = model.nextPhase(move);
  assert.equal(phase.fired[0].special, 'color');
  assert.equal(phase.groups.filter(group => group.blast && group.gemType === 'blue').reduce((sum, group) => sum + group.cells.length, 0), blues);
  assert.equal(phase.cleared.length, blues + 1); // the blues and the color gem itself
  assert.equal(refilled(phase), phase.cleared.length);
});

test('a board with no match but a color gem still has a valid move', () => {
  const model = board([
    'G B G B K',
    'B K Y K G',
    'K G O B Y',
    'G B Y O K',
    'B Y K G B',
  ], [[[2, 2], 'color']]);
  assert.ok(neighborSwaps(5, 5).every(move => model.matchesAfter(move).length === 0), 'no swap makes a match');
  assert.ok(model.hasAnyValidMove());
});

test('a toy falls with its gem', () => {
  const model = board([
    'G B G B K',
    'B K B K G',
    'K G O B Y',
    'G B O K B',
    'B K Y O G',
  ], [[[2, 0], 'bomb']]);
  model.nextPhase({ from: [2, 4], to: [3, 4] });
  assert.equal(model.getToys()[2][3], 'bomb');
  assert.equal(model.getGrid()[2][3], 'green');
  assert.equal(model.getToys().flat().filter(Boolean).length, 1);
});

test('a note gem caught in a blast is collected, not counted as a color', () => {
  const model = board([
    'G B G B K',
    'B K O K G',
    'P G O B Y',
    'G B Y O K',
    'B G K G B',
  ], [[[2, 2], 'row']]);
  const phase = model.nextPhase({ from: [2, 3], to: [3, 3] });
  const notes = phase.groups.filter(group => group.gemType === 'purple');
  assert.equal(notes.length, 1);
  assert.ok(!notes[0].blast);
  assert.ok(has(notes[0].cells, [0, 2]));
  assert.ok(phase.groups.filter(group => group.blast).every(group => group.gemType !== 'purple'));
});

test('a reshuffle keeps every toy with its gem', () => {
  const model = board([
    'G B G B K',
    'B K Y K G',
    'K G O B Y',
    'G B Y O K',
    'B G K G B',
  ], [[[2, 2], 'row'], [[0, 0], 'bomb']]);
  const pairs = () => model.getGrid().flatMap((column, x) => column.map((gem, y) => `${gem}:${model.getToys()[x][y] ?? ''}`)).sort();
  const before = pairs();
  model.shuffle();
  assert.deepEqual(pairs(), before);
});

const QUIET = [
  'G B G B K',
  'B K Y K G',
  'K G O B Y',
  'G B Y O K',
  'B Y K G B',
];

test('two line gems swapped together make one cross-shaped clear', () => {
  const model = board(QUIET, [[[1, 2], 'row'], [[2, 2], 'column']]);
  const phase = model.nextPhase({ from: [1, 2], to: [2, 2] });
  assert.equal(phase.fired.length, 1);
  assert.equal(phase.fired[0].combo, 'cross');
  for (let i = 0; i < 5; i++) {
    assert.ok(has(phase.cleared, [i, 2]), `row cell ${i}`);
    assert.ok(has(phase.cleared, [2, i]), `column cell ${i}`);
  }
  assert.equal(phase.cleared.length, 9);
  assert.equal(refilled(phase), 9);
});

test('a blast gem swapped with another toy clears the 5×5 around, cut off at the edges', () => {
  const model = board(QUIET, [[[1, 1], 'bomb'], [[0, 1], 'row']]);
  const phase = model.nextPhase({ from: [0, 1], to: [1, 1] });
  assert.equal(phase.fired.length, 1);
  assert.equal(phase.fired[0].combo, 'square');
  assert.equal(phase.cleared.length, 16); // columns 0-3, rows 0-3
  assert.ok(phase.fired[0].cells.length >= 15);
});

test('two color gems swapped together clear the whole board', () => {
  const model = board(QUIET, [[[2, 2], 'color'], [[3, 2], 'color']]);
  const phase = model.nextPhase({ from: [2, 2], to: [3, 2] });
  assert.equal(phase.fired.length, 1);
  assert.equal(phase.fired[0].combo, 'board');
  assert.equal(phase.cleared.length, 25);
});

test('a color gem swapped with a blast gem clears that color, and the blast gem goes off with it', () => {
  const model = board(QUIET, [[[2, 2], 'color'], [[3, 2], 'bomb']]);
  const blues = model.getGrid().flat().filter(gem => gem === 'blue').length;
  const phase = model.nextPhase({ from: [2, 2], to: [3, 2] });
  assert.deepEqual(phase.fired.map(fire => fire.special), ['color', 'bomb']);
  assert.ok(phase.cleared.length > blues);
  assert.equal(new Set(phase.cleared.map(cell => cell.join())).size, phase.cleared.length);
});

test('a pinned tile breaks a run, whatever its grid value, and can\'t be swapped', () => {
  const model = board([
    'O O O O O',
    'B K B K G',
    'K G Y B Y',
    'G B K G B',
    'B G K G B',
  ], [], [[[2, 0], 7]]);
  assert.equal(model.nextPhase().groups.length, 0);
  assert.equal(model.canSwap({ from: [2, 0], to: [2, 1] }), false);
  assert.equal(model.canSwap({ from: [1, 0], to: [2, 0] }), false);
  assert.deepEqual(model.matchesAfter({ from: [2, 0], to: [3, 0] }), []);
});

test('a line gem passes behind a pinned tile, leaves it, and touches it', () => {
  const model = board([
    'G B G B K',
    'B K O K G',
    'K G O B Y',
    'G B Y O K',
    'B G K G B',
  ], [[[2, 2], 'row']], [[[4, 2], 7]]);
  const phase = model.nextPhase({ from: [2, 3], to: [3, 3] });
  assert.equal(phase.fired[0].special, 'row');
  for (const x of [0, 1, 2, 3]) assert.ok(has(phase.cleared, [x, 2]), `row cell ${x} cleared`);
  assert.ok(!has(phase.cleared, [4, 2]));
  assert.deepEqual(model.pinnedCells(), [[[4, 2], 7]]);
  assert.deepEqual(phase.touched, [7]);
  assert.equal(refilled(phase), phase.cleared.length);
});

test('a run touches the tile next to it, not one further off', () => {
  const model = board([
    'G B G B K',
    'B K B K G',
    'O O Y O K',
    'K G O G B',
    'G B K B G',
  ], [], [[[1, 1], 3], [[4, 0], 9]]);
  const phase = model.nextPhase({ from: [2, 2], to: [2, 3] });
  assert.equal(phase.made.length, 1); // the straight 4; its toy cell counts as next to the tile too
  assert.deepEqual(phase.touched, [3]);
});

test('gems fall past a pinned tile; unpinning fills its cell from above', () => {
  const model = board([
    'G B G B K',
    'B K B K G',
    'X G Y B Y',
    'K G O G B',
    'O O Y K K',
  ], [], [[[0, 2], 5]]);
  const phase = model.nextPhase({ from: [2, 3], to: [2, 4] });
  assert.equal(phase.groups.length, 1);
  assert.deepEqual(phase.touched, []);
  const column = model.getGrid()[0];
  assert.deepEqual([column[1], column[3], column[4]], ['green', 'blue', 'black']); // blue fell from row 1 past the tile to row 3
  assert.deepEqual(model.pinnedCells(), [[[0, 2], 5]]);
  const refills = model.unpin([5]);
  assert.deepEqual(model.pinnedCells(), []);
  assert.equal(refills.reduce((sum, [, gems]) => sum + gems.length, 0), 1);
  assert.equal(model.getGrid()[0][2], column[1]); // the gem above dropped into the freed cell
});

test('pinned tiles never move, double or vanish through play and reshuffles', () => {
  const pins: Array<[Cell, number]> = [[[1, 1], 1], [[5, 1], 2], [[3, 3], 3], [[1, 5], 4], [[5, 5], 5]];
  for (let seed = 1; seed <= 10; seed++) {
    const model = new BoardModel(7, 7);
    model.newBoard(seed, COLORS, NOTE, pins);
    const ids = new Set(pins.map(([, id]) => id));
    for (let turn = 0; turn < 30; turn++) {
      const move = neighborSwaps(7, 7).find(swap => model.canSwap(swap));
      if (!move) { model.shuffle(); continue; }
      assert.ok(!pins.some(([cell]) => has([move.from, move.to], cell)), 'a move never touches a tile');
      for (let phase = model.nextPhase(move); phase.groups.length > 0; phase = model.nextPhase()) {
        assert.ok(phase.touched.every(id => ids.has(id)));
        assert.ok(!pins.some(([cell]) => has(phase.cleared, cell)), 'a tile is never cleared');
      }
      if (turn % 7 === 0) model.shuffle();
      assert.deepEqual(model.pinnedCells().sort((a, b) => a[1] - b[1]), pins);
      const toys = model.getToys();
      assert.ok(pins.every(([[x, y]]) => toys[x][y] === null), 'no toy on a tile');
      const grid = model.getGrid();
      assert.ok(grid.every((column, x) => column.every((gem, y) => model.isPinned([x, y]) || [...COLORS, NOTE.type].includes(gem))));
    }
  }
});
