// The Clue Match board fills its square canvas and stays centered.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SQUARE_LAYOUT, squareBoardLayout } from '@/game/board/squareLayout';

describe('squareBoardLayout', () => {
  test('a phone-width square canvas gets large, centered gems', () => {
    const { gemSize, offset } = squareBoardLayout(358, 358, 6, 6);
    assert.equal(gemSize, 57);
    assert.equal(offset.x, Math.round((358 - 6 * 57) / 2));
    assert.equal(offset.y, offset.x);
    assert.ok(gemSize >= 44, 'gems are comfortable touch targets');
  });

  test('a wide canvas is bound by its height and centered horizontally', () => {
    const { gemSize, offset } = squareBoardLayout(1000, 400, 6, 6);
    assert.equal(gemSize, Math.floor((400 - 2 * SQUARE_LAYOUT.padding) / 6));
    assert.equal(offset.x, Math.round((1000 - 6 * gemSize) / 2));
  });

  test('gem size is clamped', () => {
    assert.equal(squareBoardLayout(3000, 3000, 6, 6).gemSize, SQUARE_LAYOUT.maxGem);
    assert.equal(squareBoardLayout(60, 60, 6, 6).gemSize, SQUARE_LAYOUT.minGem);
  });
});
