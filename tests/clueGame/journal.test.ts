// Stored journals, words and records come from localStorage, which can be old,
// edited or corrupt. Playtests start clean, so they never see this.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NO_RECORDS, mergeJournals, mergeServerJournal, parseJournal, parseRecords, parseWords, recordSolve, saveRecords, saveSolve,
  type Journal, type JournalEntry, type ServerJournalEntry,
} from '@/clueGame/journal';

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

// Two tabs share localStorage, and each save merges the tab's copy into what storage holds then (A17).
// Ways the merge could fail: an animal on one side only is dropped; a field takes the wrong side (count, best,
// first or last date, names, class, Sharp eye badges); a badge field appears from nowhere; the stored journal is
// read but its finds lost when the tab's copy is stale; a find made in both tabs counts once; a best saved by
// another tab is lowered by a tab or session that never reached it.
const entry = (scientificName: string, fields: Partial<JournalEntry> = {}): JournalEntry => ({
  scientificName, commonName: scientificName, timesSolved: 1, bestMoves: 10,
  firstSolvedAt: '2026-11-01T10:00:00.000Z', lastSolvedAt: '2026-11-01T10:00:00.000Z', ...fields,
});

test('mergeJournals: an animal in one journal only is taken as it is, from either side', () => {
  const frogEntry = entry('Rhinoderma darwinii', { className: 'AMPHIBIA', sharpEyes: 2 });
  const okapi = entry('Okapia johnstoni', { timesSolved: 3 });
  assert.deepEqual(mergeJournals({ [frogEntry.scientificName]: frogEntry }, {}), { [frogEntry.scientificName]: frogEntry });
  assert.deepEqual(mergeJournals({}, { [okapi.scientificName]: okapi }), { [okapi.scientificName]: okapi });
  assert.deepEqual(mergeJournals({ [frogEntry.scientificName]: frogEntry }, { [okapi.scientificName]: okapi }), { [frogEntry.scientificName]: frogEntry, [okapi.scientificName]: okapi });
});

test('mergeJournals: an animal in both takes each field from the side that wins it', () => {
  const name = 'Rhinoderma darwinii';
  // Each field's winner alternates sides, so a rule that takes one side whole can't pass.
  const local = entry(name, { commonName: 'Darwin Frog', timesSolved: 2, bestMoves: 20, firstSolvedAt: '2026-09-01T10:00:00.000Z', lastSolvedAt: '2026-09-02T10:00:00.000Z', sharpEyes: 1 });
  const other = entry(name, { commonName: "Darwin's frog", timesSolved: 5, bestMoves: 8, firstSolvedAt: '2026-09-05T10:00:00.000Z', lastSolvedAt: '2026-09-30T10:00:00.000Z', className: 'AMPHIBIA', sharpEyes: 4 });
  assert.deepEqual(mergeJournals({ [name]: local }, { [name]: other })[name], {
    scientificName: name, commonName: 'Darwin Frog', timesSolved: 5, bestMoves: 8,
    firstSolvedAt: '2026-09-01T10:00:00.000Z', lastSolvedAt: '2026-09-30T10:00:00.000Z', className: 'AMPHIBIA', sharpEyes: 4,
  });
  // The other way round: local's class wins over other's, local's larger badge count stays, local's names stay.
  assert.deepEqual(mergeJournals({ [name]: { ...other, className: 'Amphibia' } }, { [name]: local })[name], {
    scientificName: name, commonName: "Darwin's frog", timesSolved: 5, bestMoves: 8,
    firstSolvedAt: '2026-09-01T10:00:00.000Z', lastSolvedAt: '2026-09-30T10:00:00.000Z', className: 'Amphibia', sharpEyes: 4,
  });
  // Neither has a badge or a class: neither field appears.
  const plain = mergeJournals({ [name]: entry(name) }, { [name]: entry(name, { timesSolved: 2 }) })[name];
  assert.equal('sharpEyes' in plain, false);
  assert.equal('className' in plain, false);
  assert.equal(plain.timesSolved, 2);
});

test('mergeJournals: two empty journals merge to an empty one', () => {
  assert.deepEqual(mergeJournals({}, {}), {});
});

test("saveSolve: another tab's find in storage is kept when this tab's copy is stale, and the new find is added", () => {
  const okapi = entry('Okapia johnstoni', { timesSolved: 2, bestMoves: 12 });
  const tiger = entry('Panthera tigris');
  const stored: Journal = { [okapi.scientificName]: okapi, [tiger.scientificName]: tiger };
  const tab: Journal = { [okapi.scientificName]: okapi };
  const at = '2026-11-15T12:00:00.000Z';
  const saved = saveSolve(stored, tab, frog, 7, at);
  assert.deepEqual(Object.keys(saved).sort(), ['Okapia johnstoni', 'Panthera tigris', 'Rhinoderma darwinii']);
  assert.deepEqual(saved[okapi.scientificName], okapi);
  assert.deepEqual(saved[tiger.scientificName], tiger);
  assert.deepEqual(saved[frog.scientificName], { ...frog, timesSolved: 1, bestMoves: 7, firstSolvedAt: at, lastSolvedAt: at });
});

test('saveSolve: the same animal found in both tabs counts both finds', () => {
  const first = saveSolve({}, {}, frog, 9, '2026-11-15T12:00:00.000Z');
  // The other tab never read the first find; it finds the frog too, then saves.
  const second = saveSolve(first, {}, frog, 6, '2026-11-15T12:05:00.000Z', true);
  assert.deepEqual(second[frog.scientificName], {
    ...frog, timesSolved: 2, bestMoves: 6, firstSolvedAt: '2026-11-15T12:00:00.000Z', lastSolvedAt: '2026-11-15T12:05:00.000Z', sharpEyes: 1,
  });
});

test('saveRecords: a higher best stored by another tab is kept against a lower tab and session', () => {
  assert.deepEqual(saveRecords({ bestScore: 300, bestStreak: 6 }, { bestScore: 10, bestStreak: 1 }, { score: 50, streak: 1 }), { bestScore: 300, bestStreak: 6 });
  assert.deepEqual(saveRecords(NO_RECORDS, { bestScore: 10, bestStreak: 4 }, { score: 50, streak: 1 }), { bestScore: 50, bestStreak: 4 });
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
