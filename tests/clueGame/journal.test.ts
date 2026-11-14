// Stored journals, words and records come from localStorage, which can be old,
// edited or corrupt. Playtests start clean, so they never see this.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NO_RECORDS, mergeServerJournal, parseJournal, parseRecords, parseWords, recordSolve, type Journal, type ServerJournalEntry } from '@/clueGame/journal';

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

// A signed-in player's saved solves fold into the device's journal. The E2E can't
// sign in, so this is the merge's only test.
test('saved solves merge in: the larger count, the lower best, the earliest and latest dates, the local names, class and badges', () => {
  const local: Journal = {
    'Rhinoderma darwinii': {
      scientificName: 'Rhinoderma darwinii', commonName: 'Darwin Frog', timesSolved: 2, bestMoves: 9,
      firstSolvedAt: '2026-09-10T10:00:00.000Z', lastSolvedAt: '2026-09-20T10:00:00.000Z', className: 'AMPHIBIA', sharpEyes: 1,
    },
    'Astrochelys radiata': {
      scientificName: 'Astrochelys radiata', commonName: 'Radiated Tortoise', timesSolved: 7, bestMoves: 30,
      firstSolvedAt: '2026-08-01T10:00:00.000Z', lastSolvedAt: '2026-09-01T10:00:00.000Z',
    },
    'Panthera tigris': {
      scientificName: 'Panthera tigris', commonName: 'Tiger', timesSolved: 1, bestMoves: 20,
      firstSolvedAt: '2026-09-05T10:00:00.000Z', lastSolvedAt: '2026-09-05T10:00:00.000Z', className: 'MAMMALIA',
    },
  };
  const server: ServerJournalEntry[] = [
    {
      speciesId: 1, scientificName: 'Rhinoderma darwinii', commonName: "Darwin's Frog", className: 'Amphibia', timesSolved: 5, bestMoves: 12,
      firstSolvedAt: '2026-09-01T10:00:00.000Z', lastSolvedAt: '2026-09-15T10:00:00.000Z', placeKeys: ['continent:south_america'],
    },
    {
      speciesId: 6, scientificName: 'Astrochelys radiata', commonName: 'Radiated tortoise', className: 'REPTILIA', timesSolved: 3, bestMoves: 4,
      firstSolvedAt: '2026-08-15T10:00:00.000Z', lastSolvedAt: '2026-10-01T10:00:00.000Z', placeKeys: ['continent:africa'],
    },
    {
      speciesId: 9, scientificName: 'Okapia johnstoni', commonName: 'Okapi', className: 'MAMMALIA', timesSolved: 2, bestMoves: 11,
      firstSolvedAt: '2026-09-12T10:00:00.000Z', lastSolvedAt: '2026-09-30T10:00:00.000Z', placeKeys: [],
    },
  ];
  const expected: Journal = {
    'Rhinoderma darwinii': {
      scientificName: 'Rhinoderma darwinii', commonName: 'Darwin Frog', timesSolved: 5, bestMoves: 9,
      firstSolvedAt: '2026-09-01T10:00:00.000Z', lastSolvedAt: '2026-09-20T10:00:00.000Z', className: 'AMPHIBIA', sharpEyes: 1,
    },
    'Astrochelys radiata': {
      scientificName: 'Astrochelys radiata', commonName: 'Radiated Tortoise', timesSolved: 7, bestMoves: 4,
      firstSolvedAt: '2026-08-01T10:00:00.000Z', lastSolvedAt: '2026-10-01T10:00:00.000Z', className: 'REPTILIA',
    },
    'Panthera tigris': local['Panthera tigris'],
    'Okapia johnstoni': {
      scientificName: 'Okapia johnstoni', commonName: 'Okapi', timesSolved: 2, bestMoves: 11,
      firstSolvedAt: '2026-09-12T10:00:00.000Z', lastSolvedAt: '2026-09-30T10:00:00.000Z', className: 'MAMMALIA',
    },
  };
  const merged = mergeServerJournal(local, server);
  assert.deepEqual(merged, expected);
  // Safe to repeat: merging the same solves again changes nothing.
  assert.deepEqual(mergeServerJournal(merged, server), expected);
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
