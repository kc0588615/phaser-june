// The solve report the client sends is checked before it reaches the database.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseSolveReport } from '@/clueGame/solveReport';

const good = { seed: 4242, round: 3, speciesId: 14, moves: 4, wrongGuesses: 1, cluesSeen: 6, relatives: 1, points: 110, revealedByGem: { red: 2, blue: 1 } };

describe('parseSolveReport', () => {
  test('a well-formed report passes through', () => {
    assert.deepEqual(parseSolveReport(good), good);
  });

  test('out-of-range, missing, extra and non-integer fields are rejected', () => {
    for (const bad of [
      { ...good, seed: 0 }, { ...good, round: 1.5 }, { ...good, wrongGuesses: 6 }, { ...good, points: -1 },
      { ...good, moves: undefined }, { ...good, extra: 1 }, { ...good, speciesId: '14' },
    ]) assert.equal(parseSolveReport(bad), null, JSON.stringify(bad));
  });

  test('gem counts must use known colors', () => {
    assert.equal(parseSolveReport({ ...good, revealedByGem: { pink: 1 } }), null);
    assert.equal(parseSolveReport({ ...good, revealedByGem: [1] }), null);
    assert.equal(parseSolveReport({ ...good, revealedByGem: { red: -1 } }), null);
  });

  test('an optional place key must look like a place', () => {
    assert.equal(parseSolveReport({ ...good, placeKey: 'country:KEN' })?.placeKey, 'country:KEN');
    for (const bad of ['KEN', 'country:', 'planet:mars', 'area:a b', 7]) assert.equal(parseSolveReport({ ...good, placeKey: bad }), null, String(bad));
  });

  test('non-objects are rejected', () => {
    for (const bad of [null, 'x', 7, []]) assert.equal(parseSolveReport(bad), null);
  });
});
