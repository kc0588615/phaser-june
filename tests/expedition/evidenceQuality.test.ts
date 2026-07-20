import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  evidenceTierForMatchLength,
  isBestTargetMatchLength,
  updateBestTargetMatchLength,
} from '@/expedition/evidenceQuality';

test('match lengths map to bounded evidence tiers', () => {
  assert.equal(evidenceTierForMatchLength(0), null);
  assert.equal(evidenceTierForMatchLength(3), 1);
  assert.equal(evidenceTierForMatchLength(4), 2);
  assert.equal(evidenceTierForMatchLength(5), 3);
  assert.equal(evidenceTierForMatchLength(8), 3);
  assert.equal(evidenceTierForMatchLength(9), null);
  for (const value of [0, 3, 4, 5, 8]) assert.equal(isBestTargetMatchLength(value), true);
  for (const value of [1, 2, 9, 3.5, -1]) assert.equal(isBestTargetMatchLength(value), false);
});

test('only direct target groups raise sampling quality; cascades and off-method groups are inert', () => {
  assert.equal(updateBestTargetMatchLength(0, 3, true, true), 3);
  assert.equal(updateBestTargetMatchLength(3, 4, true, true), 4);
  assert.equal(updateBestTargetMatchLength(3, 5, true, true), 5);
  assert.equal(updateBestTargetMatchLength(5, 4, true, true), 5);
  assert.equal(updateBestTargetMatchLength(3, 8, false, true), 3);
  assert.equal(updateBestTargetMatchLength(5, 9, true, true), 8);
  // Cascade groups count for progress, never for tier.
  assert.equal(updateBestTargetMatchLength(3, 8, true, false), 3);
  assert.equal(updateBestTargetMatchLength(0, 5, true, false), 0);
});
