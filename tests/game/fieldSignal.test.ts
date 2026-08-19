import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BackendPuzzle } from '@/game/BackendPuzzle';
import {
  applyFieldSignalMatch,
  buildFieldSignalSeed,
  countLiveFieldSignals,
  getFieldSignalFamily,
  getFieldSignalMatchOutcome,
  getFieldSignalPayout,
  isFieldSignal,
} from '@/game/fieldSignal';

console.log = () => {};

function puzzle(seed = 41): BackendPuzzle {
  const result = new BackendPuzzle(6, 6);
  result.setGemPool({ allowedGemTypes: ['red', 'orange', 'yellow', 'green', 'blue'] });
  result.setSeed(seed);
  result.regenerateBoard();
  result.setMaxMoves(6);
  return result;
}

describe('field signal', () => {
  it('chooses one deterministic unblocked evidence cell', () => {
    const first = puzzle();
    const second = puzzle();
    first.applyCellStateSeeds([{ x: 0, y: 0, state: { blockerId: 'mud', durability: 2 } }]);
    second.applyCellStateSeeds([{ x: 0, y: 0, state: { blockerId: 'mud', durability: 2 } }]);
    const firstSeed = buildFieldSignalSeed(first.getGridState(), 9001, 1, 2);
    const secondSeed = buildFieldSignalSeed(second.getGridState(), 9001, 1, 2);
    assert.deepEqual(secondSeed, firstSeed);
    assert.ok(firstSeed);
    assert.notDeepEqual([firstSeed.x, firstSeed.y], [0, 0]);
    assert.ok(firstSeed.family);
    first.applyCellStateSeeds([firstSeed]);
    first.markFieldSignalSpawned();
    assert.equal(countLiveFieldSignals(first.getGridState()), 1);
  });

  it('clears through blocker damage and keeps one-per-site history across resume', () => {
    const original = puzzle();
    const seed = buildFieldSignalSeed(original.getGridState(), 73, 0, 1);
    assert.ok(seed);
    original.applyCellStateSeeds([seed]);
    original.markFieldSignalSpawned();
    assert.equal(getFieldSignalFamily(original.getGridState()[seed.x][seed.y]), seed.family);
    assert.equal(original.damageBlocker(seed.x, seed.y), true);
    assert.equal(countLiveFieldSignals(original.getGridState()), 0);

    const restored = puzzle(99);
    restored.importCheckpoint(original.exportCheckpoint());
    assert.equal(restored.hasFieldSignalSpawned(), true);
    assert.equal(restored.exportCheckpoint().fieldSignalSpawned, true);
  });

  it('pays the clearing match colour and two hints for 4+', () => {
    assert.deepEqual(getFieldSignalPayout('orange', 3, false), { family: 'body', hintCount: 1 });
    assert.deepEqual(getFieldSignalPayout('green', 4, false), { family: 'habits', hintCount: 2 });
    assert.deepEqual(getFieldSignalPayout('green', 6, false), { family: 'habits', hintCount: 2 });
    assert.equal(getFieldSignalPayout('green', 5, true), null);
    assert.equal(getFieldSignalPayout(null, 3, false), null);
    assert.equal(getFieldSignalPayout('orange', 2, false), null);
  });

  it('damages on direct and cascade matches but pays direct matches only', () => {
    assert.deepEqual(getFieldSignalMatchOutcome('green', 4, false), {
      damage: true,
      payout: { family: 'habits', hintCount: 2 },
    });
    assert.deepEqual(getFieldSignalMatchOutcome('green', 4, true), {
      damage: true,
      payout: null,
    });
    assert.deepEqual(getFieldSignalMatchOutcome('green', 2, false), {
      damage: false,
      payout: null,
    });

    const board = puzzle();
    const seed = buildFieldSignalSeed(board.getGridState(), 81, 0, 1);
    assert.ok(seed);
    board.applyCellStateSeeds([seed]);
    const cascade = applyFieldSignalMatch(board, 'blue', 3, true);
    assert.equal(countLiveFieldSignals(board.getGridState()), 0);
    assert.equal(cascade, null);

    const directBoard = puzzle();
    const directSeed = buildFieldSignalSeed(directBoard.getGridState(), 82, 0, 1);
    assert.ok(directSeed);
    directBoard.applyCellStateSeeds([directSeed]);
    assert.deepEqual(applyFieldSignalMatch(directBoard, 'orange', 4, false), {
      family: 'body',
      hintCount: 2,
    });
    assert.equal(countLiveFieldSignals(directBoard.getGridState()), 0);
  });

  it('detects the tile independently of the gem beneath it', () => {
    const board = puzzle();
    const seed = buildFieldSignalSeed(board.getGridState(), 73, 0, 1);
    assert.ok(seed);
    board.applyCellStateSeeds([seed]);
    const cell = board.getGridState()[seed.x][seed.y];
    assert.equal(isFieldSignal(cell), true);
    // Detection must not depend on the under-tile family, which the payout no longer uses.
    assert.equal(isFieldSignal({ ...cell!, gemType: 'white' as never }), true);
    assert.equal(getFieldSignalFamily({ ...cell!, gemType: 'white' as never }), null);
    assert.equal(countLiveFieldSignals(board.getGridState()), 1);
  });
});
