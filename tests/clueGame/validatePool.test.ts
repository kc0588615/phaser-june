// The content check's one error a playtest can't see: a misspelled realm rules
// every other candidate with range data out, while the answer still fits.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePool } from '@/clueGame/validatePool';
import { clue, pool } from './testPool';

test('a misspelled realm is an error', () => {
  const report = validatePool({ ...pool, clues: [...pool.clues, clue(3, 'geography', 'Lives in North America.', ['realm:nearctik'])] });
  assert.ok(report.errors.some(error => error.includes('unknown realm tags [realm:nearctik]')));
});
