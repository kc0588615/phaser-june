// Stored journals, words and records come from localStorage, which can be old,
// edited or corrupt. Playtests start clean, so they never see this.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NO_RECORDS, parseJournal, parseRecords, parseWords, recordSolve } from '@/clueGame/journal';

const frog = { scientificName: 'Rhinoderma darwinii', commonName: 'Darwin Frog' };

test('stored journals round-trip; malformed storage is dropped', () => {
  const journal = recordSolve({}, frog, 4, '2026-09-24T10:00:00Z');
  assert.deepEqual(parseJournal(JSON.stringify(journal)), journal);
  assert.deepEqual(parseJournal(null), {});
  assert.deepEqual(parseJournal('not json'), {});
  assert.deepEqual(parseJournal('[1,2]'), {});
  assert.deepEqual(parseJournal(JSON.stringify({ x: { scientificName: 'y', commonName: 'Y', timesSolved: 1, bestMoves: 1, firstSolvedAt: 'a', lastSolvedAt: 'b' } })), {});
  assert.deepEqual(parseJournal(JSON.stringify({ [frog.scientificName]: { ...frog, timesSolved: 0 } })), {});
});

test('a malformed sighting drops the entry', () => {
  const bad = { [frog.scientificName]: { ...frog, timesSolved: 1, bestMoves: 1, firstSolvedAt: 'a', lastSolvedAt: 'a', sightings: [{ placeKey: 'x' }] } };
  assert.deepEqual(parseJournal(JSON.stringify(bad)), {});
});

test('bad or missing words storage is an empty list', () => {
  assert.deepEqual(parseWords(null), []);
  assert.deepEqual(parseWords('{oops'), []);
  assert.deepEqual(parseWords('{"a":1}'), []);
});

test('stored records round-trip; junk becomes zero', () => {
  assert.deepEqual(parseRecords(JSON.stringify({ bestScore: 300, bestStreak: 6 })), { bestScore: 300, bestStreak: 6 });
  assert.deepEqual(parseRecords(JSON.stringify({ bestScore: -5, bestStreak: 'x' })), NO_RECORDS);
  assert.deepEqual(parseRecords('nope'), NO_RECORDS);
  assert.deepEqual(parseRecords(null), NO_RECORDS);
});
