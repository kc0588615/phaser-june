// Characterization tests for run-state scoring helpers.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getGuessBonuses } from '@/types/expedition';

describe('guess bonuses', () => {
  test('wrong guesses earn nothing', () => {
    assert.deepEqual(getGuessBonuses(0, false), { guessBonus: 0, efficiencyBonus: 0 });
  });

  test('efficiency bonus tiers by paid clue count', () => {
    assert.deepEqual(getGuessBonuses(0, true), { guessBonus: 250, efficiencyBonus: 200 });
    assert.deepEqual(getGuessBonuses(2, true), { guessBonus: 250, efficiencyBonus: 200 });
    assert.deepEqual(getGuessBonuses(3, true), { guessBonus: 250, efficiencyBonus: 100 });
    assert.deepEqual(getGuessBonuses(5, true), { guessBonus: 250, efficiencyBonus: 100 });
    assert.deepEqual(getGuessBonuses(6, true), { guessBonus: 250, efficiencyBonus: 25 });
  });
});
