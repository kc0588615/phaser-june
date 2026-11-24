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
//
// Toy scouting (rules 047-1). The ways it could break:
// 20. A line or blast gem whose clear reaches a tile doesn't show the toy's own color there, shows it with
//     `toyScout` off, shows it on a tile the clear didn't reach, or changes which tiles are `touched`.
//
// Starting witness gem (rules 055-2, `RareGem.atLeast`). Written before the code; the ways it could break:
// G1. For seeds 0-1,999 with `tileCells(7, 7, 5)` pins, `BOARD_GEMS` and `{ type: WITNESS_GEM, chance: 0.03,
//     atLeast: 1 }`, a board has no rare gem on a free (unpinned) cell, a standing match, or no valid move.
// G2. A seed whose `atLeast: 0` board already has a free rare gem gives a different grid with `atLeast: 1`
//     (or a different rng state after it: the bot's paired comparison breaks).
// G3. A seed whose only rolled rare gem sits on a pinned cell gets no extra gem on a free cell.
// G4. The same seed gives two different grids (on a seed that needed a top-up).
// G5. `loadBoard` tops up (a loaded grid with no rare gem must keep none).
// G6. A negative, non-integer or infeasible (`freeCount - atLeast < 3`) `atLeast` doesn't throw `RangeError`;
//     nor does a board whose geometry can't be made playable.
// G7. A tight but feasible `atLeast` gives a board without that many free rare gems, or with a standing match, or
//     with no valid move.
// G8. A rare gem dropped because its type is a normal gem still tops up or throws.
// G9. A feasible tight board throws `RangeError` because random fills miss 3 gems of one color (or high `chance`
//     rolls leave fewer than 3 free normal gems when `freeCount - atLeast >= 3`), or a geometrically impossible
//     board with `freeCount - atLeast >= 3` (such as 2×2 with `atLeast: 1`) fails to throw `RangeError`, or the
//     fallback breaks determinism or alters normal 7×7 boards (G1-G8).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BoardModel, neighborSwaps, type Cell, type ExplodePhase, type Grid, type Move, type Special } from '@/game/BoardModel';
import { GEM_TYPES, type GemType } from '@/game/constants';
import { BOARD_GEMS, WITNESS_GEM, tileCells } from '@/clueGame/animalBoard';
import { mulberry32 } from '@/lib/seededRng';

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

test('with toyScout, a line gem shows its own color to the tiles its clear reaches, and touches no more', () => {
  const rows = [
    'G B G B K',
    'B K O K G',
    'K G O B Y',
    'G B Y O K',
    'B G K G B',
  ];
  const play = (toyScout: boolean) => {
    const model = board(rows, [[[2, 2], 'row']], [[[4, 2], 7], [[0, 0], 8]]);
    model.toyScout = toyScout;
    const preview = model.previewNearColors({ from: [2, 3], to: [3, 3] });
    return { preview, phase: model.nextPhase({ from: [2, 3], to: [3, 3] }) };
  };
  const off = play(false);
  const on = play(true);
  assert.deepEqual(off.phase.nearColors, [[7, ['blue']]]); // only the gem cleared right next to it
  assert.deepEqual(on.phase.nearColors, [[7, ['blue', 'orange']]]); // plus the orange line gem's color; tile 8 not reached
  assert.deepEqual(on.preview, on.phase.nearColors);
  assert.deepEqual(on.phase.touched, off.phase.touched);
});

test('with toyScout, a toy made this phase next to a tile (not cleared) carries no other toy\'s color there', () => {
  const model = board([
    'G B Y G B',
    'G O O B O',
    'Y B B O Y',
    'B G Y B G',
    'G Y G Y B',
  ], [[[2, 2], 'bomb']], [[[3, 0], 7]]);
  model.toyScout = true;
  const move: Move = { from: [3, 2], to: [3, 1] };
  const preview = model.previewNearColors(move);
  const phase = model.nextPhase(move);
  assert.ok(phase.made.some(toy => toy.cell[0] === 3 && toy.cell[1] === 1)); // the orange line gem stays next to the tile
  assert.deepEqual(phase.nearColors, [[7, ['orange']]]); // not the blue blast gem's color
  assert.deepEqual(preview, phase.nearColors);
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

// ---- Starting witness gem (G1-G9) ----

const WITNESS = { type: WITNESS_GEM, chance: 0.03 };
/** The app's pins for a seed: `tileCells` on the 7×7 board with 5 tiles, as useAnimalSession deals them. */
const dealtPins = (seed: number): Array<[Cell, number]> => tileCells(7, 7, 5, mulberry32(seed))!.map((cell, i): [Cell, number] => [cell, i + 1]);
function startBoard(seed: number, atLeast?: number, pins = dealtPins(seed), size = 7, gems: readonly GemType[] = BOARD_GEMS): BoardModel {
  const model = new BoardModel(size, size);
  model.newBoard(seed, gems, { ...WITNESS, ...(atLeast === undefined ? {} : { atLeast }) }, pins);
  return model;
}
/** Rare gems on free cells, and on pinned cells. */
function rareCounts(model: BoardModel, type: GemType = WITNESS_GEM): { free: number; pinned: number } {
  const grid = model.getGrid();
  let free = 0, pinned = 0;
  grid.forEach((column, x) => column.forEach((gem, y) => { if (gem === type) { if (model.isPinned([x, y])) pinned++; else free++; } }));
  return { free, pinned };
}
const playable = (model: BoardModel) => model.nextPhase().groups.length === 0 && model.hasAnyValidMove();

test('G1: every dealt start board has a free witness gem, no standing match and a valid move', () => {
  for (let seed = 0; seed < 2000; seed++) {
    const model = startBoard(seed, 1);
    assert.ok(rareCounts(model).free >= 1, `seed ${seed}: no free witness gem`);
    assert.ok(model.hasAnyValidMove(), `seed ${seed}: no valid move`);
    assert.equal(model.nextPhase().groups.length, 0, `seed ${seed}: a standing match`);
  }
});

test('G2: a board that already rolled a free witness gem is unchanged, rng included', () => {
  let checked = 0;
  for (let seed = 0; seed < 200; seed++) {
    if (rareCounts(startBoard(seed, 0)).free === 0) continue;
    const [plain, topped] = [startBoard(seed, 0), startBoard(seed, 1)];
    assert.deepEqual(topped.getGrid(), plain.getGrid(), `seed ${seed}`);
    const move = neighborSwaps(7, 7).find(swap => plain.canSwap(swap))!;
    assert.deepEqual(topped.nextPhase(move), plain.nextPhase(move), `seed ${seed}: the refills differ`);
    checked++;
  }
  assert.ok(checked >= 10, `only ${checked} seeds rolled a free witness gem`);
});

test('G3: a witness gem rolled only on a pinned cell still gets one on a free cell', () => {
  let checked = 0;
  for (let seed = 0; seed < 2000; seed++) {
    const counts = rareCounts(startBoard(seed, 0));
    if (counts.free > 0 || counts.pinned === 0) continue;
    assert.ok(rareCounts(startBoard(seed, 1)).free >= 1, `seed ${seed}`);
    checked++;
  }
  assert.ok(checked >= 1, 'no seed rolled its only witness gem on a pin');
});

test('G4: a topped-up board replays exactly from its seed', () => {
  const seeds = Array.from({ length: 200 }, (_seed, i) => i).filter(seed => rareCounts(startBoard(seed, 0)).free === 0).slice(0, 5);
  assert.ok(seeds.length > 0, 'no seed needed a top-up');
  for (const seed of seeds) {
    const [a, b] = [startBoard(seed, 1), startBoard(seed, 1)];
    assert.deepEqual(a.getGrid(), b.getGrid(), `seed ${seed}`);
    assert.notDeepEqual(a.getGrid(), startBoard(seed, 0).getGrid(), `seed ${seed}: no top-up happened`);
  }
});

test('G5: loadBoard never tops up', () => {
  const model = startBoard(3, 1);
  const grid: Grid = Array.from({ length: 7 }, (_column, x) => Array.from({ length: 7 }, (_cell, y): GemType => BOARD_GEMS[(x + 2 * y) % BOARD_GEMS.length]));
  model.loadBoard(grid);
  assert.deepEqual(rareCounts(model), { free: 0, pinned: 0 });
});

test('G6: a bad or infeasible atLeast, or an unplayable layout, throws RangeError', () => {
  const pins = dealtPins(7);
  const freeCount = 49 - pins.length;
  for (const atLeast of [-1, 1.5, NaN, freeCount - 2, freeCount, freeCount + 1]) {
    assert.throws(() => startBoard(7, atLeast, pins), RangeError, `atLeast ${atLeast}`);
  }
  // A 3×3 cross of tiles leaves four corners that touch nothing: no move can exist.
  const cross: Array<[Cell, number]> = [[[1, 0], 1], [[0, 1], 2], [[1, 1], 3], [[2, 1], 4], [[1, 2], 5]];
  assert.throws(() => startBoard(1, 1, cross, 3, COLORS), RangeError);
});

test('G7: a tight but feasible atLeast still gives a playable board with that many free witness gems', () => {
  const cases: Array<{ size: number; atLeast: number; pins: (seed: number) => Array<[Cell, number]>; gems: readonly GemType[] }> = [
    { size: 7, atLeast: 30, pins: dealtPins, gems: ['orange', 'yellow', 'green'] },
    { size: 5, atLeast: 15, pins: () => [], gems: BOARD_GEMS },
  ];
  for (const { size, atLeast, pins, gems } of cases) {
    for (let seed = 0; seed < 20; seed++) {
      const model = startBoard(seed, atLeast, pins(seed), size, gems);
      assert.ok(rareCounts(model).free >= atLeast, `${size}×${size} seed ${seed}: too few witness gems`);
      assert.ok(playable(model), `${size}×${size} seed ${seed}: not playable`);
    }
  }
});

test('G8: a rare gem dropped for being a normal color neither tops up nor throws', () => {
  for (let seed = 0; seed < 20; seed++) {
    const plain = new BoardModel(7, 7);
    plain.newBoard(seed, BOARD_GEMS, null, dealtPins(seed));
    for (const atLeast of [1, 99]) {
      const model = new BoardModel(7, 7);
      model.newBoard(seed, BOARD_GEMS, { type: 'orange', chance: 0.03, atLeast }, dealtPins(seed));
      assert.deepEqual(model.getGrid(), plain.getGrid(), `seed ${seed} atLeast ${atLeast}`);
    }
  }
});

test('G9: a feasible tight 3×3 board is built (constructive fallback), replays exactly; an impossible one throws', () => {
  const tight = (seed: number, gems: readonly GemType[], chance = 0): BoardModel => {
    const model = new BoardModel(3, 3);
    model.newBoard(seed, gems, { type: WITNESS_GEM, chance, atLeast: 6 });
    return model;
  };
  const three: GemType[] = ['orange', 'yellow', 'green'];
  const cases: Array<{ gems: readonly GemType[]; chance: number }> = [
    { gems: three, chance: 0 },
    { gems: BOARD_GEMS, chance: 0 },
    { gems: BOARD_GEMS, chance: 0.8 },
  ];
  for (const { gems, chance } of cases) {
    for (let seed = 0; seed < 20; seed++) {
      const label = `${gems.length} colors chance ${chance} seed ${seed}`;
      const model = tight(seed, gems, chance);
      assert.ok(rareCounts(model).free >= 6, `${label}: too few witness gems`);
      assert.deepEqual(tight(seed, gems, chance).getGrid(), model.getGrid(), `${label}: no exact replay`);
      assert.ok(playable(model), `${label}: not playable`);
    }
  }
  // No line of 3 fits a 2×2 board, so no move can ever exist.
  assert.throws(() => new BoardModel(2, 2).newBoard(0, BOARD_GEMS, { type: WITNESS_GEM, chance: 0, atLeast: 1 }), RangeError);
});
