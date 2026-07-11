// Characterization tests for the two small value classes in the move pipeline.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { MoveAction } from '@/game/MoveAction';
import { ExplodeAndReplacePhase } from '@/game/ExplodeAndReplacePhase';

describe('MoveAction', () => {
  test('direction helpers', () => {
    const rowMove = new MoveAction('row', 2, -1);
    assert.equal(rowMove.isHorizontal(), true);
    assert.equal(rowMove.isVertical(), false);
    assert.equal(rowMove.getDistance(), 1);
    assert.equal(rowMove.isPositiveDirection(), false);

    const colMove = new MoveAction('col', 4, 3);
    assert.equal(colMove.isVertical(), true);
    assert.equal(colMove.getDistance(), 3);
    assert.equal(colMove.isPositiveDirection(), true);
  });

  test('toString names the four directions', () => {
    assert.equal(new MoveAction('row', 0, 1).toString(), 'Move row 0 right by 1');
    assert.equal(new MoveAction('row', 2, -1).toString(), 'Move row 2 left by 1');
    assert.equal(new MoveAction('col', 3, 2).toString(), 'Move col 3 down by 2');
    assert.equal(new MoveAction('col', 5, -4).toString(), 'Move col 5 up by 4');
  });
});

describe('ExplodeAndReplacePhase', () => {
  test('reports emptiness, unique coordinates, and per-column replacements', () => {
    const empty = new ExplodeAndReplacePhase();
    assert.equal(empty.isNothingToDo(), true);
    assert.equal(empty.getTotalReplacements(), 0);

    const phase = new ExplodeAndReplacePhase(
      // Overlapping matches: [1,1] appears in both -> deduped in the coord set.
      [
        [[0, 1], [1, 1], [2, 1]],
        [[1, 0], [1, 1], [1, 2]],
      ],
      [
        [0, ['red']],
        [1, ['blue', 'green']],
      ],
    );
    assert.equal(phase.isNothingToDo(), false);
    assert.equal(phase.getAllMatchedCoordinates().size, 5);
    assert.equal(phase.getTotalReplacements(), 3);
    assert.deepEqual(phase.getReplacementsForColumn(1), ['blue', 'green']);
    assert.deepEqual(phase.getReplacementsForColumn(9), []);
  });
});
