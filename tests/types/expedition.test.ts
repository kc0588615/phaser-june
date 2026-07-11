// Characterization tests for run-state helpers and deduction scoring.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLUE_CATEGORY_KEYS,
  createEmptyClueFragments,
  deductionCatToWalletKey,
  getGuessBonuses,
  getDeductionFinalScore,
  type DeductionCampState,
} from '@/types/expedition';

function camp(overrides: Partial<DeductionCampState>): DeductionCampState {
  return {
    bankedScore: 0,
    clueFragments: createEmptyClueFragments(),
    clueShop: [],
    revealedClues: [],
    triviaUnlocked: [],
    scoreSpent: 0,
    guessResult: null,
    guessBonusAwarded: 0,
    thoughtDiscountPct: 0,
    ...overrides,
  };
}

describe('clue fragment wallet', () => {
  test('empty wallet covers all 8 categories with zeros', () => {
    const fragments = createEmptyClueFragments();
    assert.deepEqual(Object.keys(fragments).sort(), [...CLUE_CATEGORY_KEYS].sort());
    assert.ok(Object.values(fragments).every((count) => count === 0));
    assert.equal(CLUE_CATEGORY_KEYS.length, 8);
  });

  test('deduction categories map onto wallet keys', () => {
    assert.equal(deductionCatToWalletKey('diet'), 'behavior');
    assert.equal(deductionCatToWalletKey('reproduction'), 'life_cycle');
    assert.equal(deductionCatToWalletKey('taxonomy'), 'classification');
    assert.equal(deductionCatToWalletKey('key_fact'), 'key_facts');
    assert.equal(deductionCatToWalletKey('geography'), 'geographic');
    assert.equal(deductionCatToWalletKey('habitat'), 'habitat');
    assert.equal(deductionCatToWalletKey('something_new'), 'key_facts');
  });
});

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

describe('getDeductionFinalScore', () => {
  test('banked - spent + bonuses on a correct guess', () => {
    const state = camp({
      bankedScore: 300,
      scoreSpent: 25,
      guessResult: 'correct',
      clueShop: [
        { category: 'habitat', purchased: 3, fragmentCount: 0 },
        { category: 'behavior', purchased: 3, fragmentCount: 0 },
      ],
    });
    // 300 - 25 + 250 guess bonus + 25 efficiency (6 paid clues).
    assert.equal(getDeductionFinalScore(state), 550);
  });

  test('wrong guess keeps banked score minus spend, no bonuses', () => {
    const state = camp({ bankedScore: 300, scoreSpent: 25, guessResult: 'wrong' });
    assert.equal(getDeductionFinalScore(state), 275);
  });
});
