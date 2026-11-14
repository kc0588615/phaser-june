// Stored journals, words and records come from localStorage, which can be old,
// edited or corrupt. Playtests start clean, so they never see this.
import { readFileSync } from 'node:fs';
import path from 'node:path';
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

// tests/clueGame/old-journal.json was written by the journal code from before 2026-11, which saved sightings (and has
// one malformed sighting and one unknown field, added by hand). Every find in it must survive the parser.
test('a journal saved with sightings (before 2026-11) keeps every find; old and unknown fields are left out', () => {
  const raw = readFileSync(path.join(process.cwd(), 'tests/clueGame/old-journal.json'), 'utf8');
  const stored = JSON.parse(raw) as Record<string, Record<string, unknown>>;
  assert.ok(Object.keys(stored).length >= 4 && Object.values(stored).every(entry => Array.isArray(entry.sightings)), 'the fixture is the old shape');
  const kept = Object.fromEntries(Object.entries(stored).map(([key, { sightings: _old, legacy: _unknown, ...entry }]) => [key, entry]));
  assert.deepEqual(parseJournal(raw), kept);
  // A bad badge count or class drops that field, not the animal.
  const [name, entry] = Object.entries(kept)[0];
  const { sharpEyes: _count, className: _class, ...plain } = entry;
  assert.deepEqual(parseJournal(JSON.stringify({ [name]: { ...entry, sharpEyes: -1, className: 7 } })), { [name]: plain });
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
