// The Field Journal keeps solves per animal and never trusts malformed storage.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { NO_RECORDS, parseJournal, parseRecords, parseWords, recordSolve, updateRecords } from '@/clueGame/journal';

const frog = { scientificName: 'Rhinoderma darwinii', commonName: 'Darwin Frog' };

describe('journal', () => {
  test('recording solves counts them and keeps the best move count', () => {
    let journal = recordSolve({}, frog, 6, '2026-09-24T10:00:00Z');
    journal = recordSolve(journal, frog, 3, '2026-09-24T11:00:00Z');
    journal = recordSolve(journal, frog, 5, '2026-09-24T12:00:00Z');
    assert.deepEqual(journal[frog.scientificName], {
      ...frog, timesSolved: 3, bestMoves: 3, firstSolvedAt: '2026-09-24T10:00:00Z', lastSolvedAt: '2026-09-24T12:00:00Z',
    });
  });

  test('stored journals round-trip; malformed storage is dropped', () => {
    const journal = recordSolve({}, frog, 4, '2026-09-24T10:00:00Z');
    assert.deepEqual(parseJournal(JSON.stringify(journal)), journal);
    assert.deepEqual(parseJournal(null), {});
    assert.deepEqual(parseJournal('not json'), {});
    assert.deepEqual(parseJournal('[1,2]'), {});
    assert.deepEqual(parseJournal(JSON.stringify({ x: { scientificName: 'y', commonName: 'Y', timesSolved: 1, bestMoves: 1, firstSolvedAt: 'a', lastSolvedAt: 'b' } })), {});
    assert.deepEqual(parseJournal(JSON.stringify({ [frog.scientificName]: { ...frog, timesSolved: 0 } })), {});
  });
});

describe('sightings', () => {
  const kenya = { placeKey: 'country:KEN', placeName: 'Kenya', lon: 37, lat: 0 };
  test('one sighting per place, the newest kept; class is remembered', () => {
    let journal = recordSolve({}, { ...frog, className: 'AMPHIBIA' }, 4, 'a', kenya);
    journal = recordSolve(journal, frog, 3, 'b', { ...kenya, lon: 38 });
    journal = recordSolve(journal, frog, 5, 'c');
    const entry = journal[frog.scientificName];
    assert.deepEqual(entry.sightings, [{ ...kenya, lon: 38 }]);
    assert.equal(entry.className, 'AMPHIBIA');
    assert.deepEqual(parseJournal(JSON.stringify(journal)), journal);
  });

  test('a malformed sighting drops the entry', () => {
    const bad = { [frog.scientificName]: { ...frog, timesSolved: 1, bestMoves: 1, firstSolvedAt: 'a', lastSolvedAt: 'a', sightings: [{ placeKey: 'x' }] } };
    assert.deepEqual(parseJournal(JSON.stringify(bad)), {});
  });
});

describe('parseWords', () => {
  test('keeps unique non-empty strings in order and drops the rest', () => {
    assert.deepEqual(parseWords(JSON.stringify(['Clutch', 'Realm', 'Clutch', '', 7, null])), ['Clutch', 'Realm']);
  });

  test('bad or missing storage is an empty list', () => {
    assert.deepEqual(parseWords(null), []);
    assert.deepEqual(parseWords('{oops'), []);
    assert.deepEqual(parseWords('{"a":1}'), []);
  });
});

describe('records', () => {
  test('bests only go up', () => {
    let records = updateRecords(NO_RECORDS, { score: 300, streak: 4 });
    records = updateRecords(records, { score: 120, streak: 6 });
    assert.deepEqual(records, { bestScore: 300, bestStreak: 6 });
  });

  test('stored records round-trip; junk becomes zero', () => {
    assert.deepEqual(parseRecords(JSON.stringify({ bestScore: 300, bestStreak: 6 })), { bestScore: 300, bestStreak: 6 });
    assert.deepEqual(parseRecords(JSON.stringify({ bestScore: -5, bestStreak: 'x' })), NO_RECORDS);
    assert.deepEqual(parseRecords('nope'), NO_RECORDS);
    assert.deepEqual(parseRecords(null), NO_RECORDS);
  });
});
