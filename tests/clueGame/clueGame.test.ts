// Clue Match rules a playtest can't check by looking: how clues compare with
// candidates, seeded replays, the difficulty ramp, reveal order, and session
// guards for rare timing and very long sessions.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fitClue, usefulCategories } from '@/clueGame/deduction';
import { normalizeTag } from '@/clueGame/traits';
import { createRound, lookalikesForRound } from '@/clueGame/round';
import { clueSessionReducer, currentRoundFeed } from '@/clueGame/session';
import { mulberry32 } from '@/lib/seededRng';
import { OTHERS, find, matched, pool, records } from './testPool';

describe('records', () => {
  test('taxonomy joins a record as prefixed tags; clue tags are lowercased', () => {
    const traits = (id: number) => new Set([...records.get(id)!.traits.values()].flatMap(tags => [...tags]));
    assert.ok(traits(7).has('class:mammalia') && traits(7).has('family:felidae') && traits(7).has('genus:panthera'));
    assert.equal(normalizeTag(' Diet:Plants '), 'diet:plants');
  });
});

describe('fitClue', () => {
  test('a taxonomy mismatch rules a candidate out; a match fits', () => {
    const classClue = find("It's an amphibian (class Amphibia).");
    assert.equal(fitClue(classClue, 2, records), 'fits');
    assert.equal(fitClue(classClue, 3, records), 'contradicts');
    assert.equal(fitClue(find('Its family is Rhinodermatidae.'), 2, records), 'contradicts');
    assert.equal(fitClue(find('Its family is Felidae.'), 1, records), 'contradicts');
  });

  test('a missing open trait is "no record", never a contradiction', () => {
    const streams = find('It lives in cold rainforest streams.');
    assert.equal(fitClue(streams, 3, records), 'partial');
    assert.equal(fitClue(streams, 5, records), 'unknown');
    assert.equal(fitClue(streams, 2, records), 'unknown');
  });

  test('the other value of an exclusive trait rules a candidate out', () => {
    const eggs = find('Lays eggs; lives a few years.');
    assert.equal(fitClue(eggs, 2, records), 'contradicts', 'lifespan:long vs lifespan:short');
    assert.equal(fitClue(eggs, 7, records), 'contradicts', 'birth:live vs birth:eggs');
    assert.equal(fitClue(eggs, 3, records), 'partial', 'turtles lay eggs; lifespan unknown');
  });

  test('realms are complete: a candidate living elsewhere is ruled out, one without realm data is not', () => {
    const neotropical = find('Lives in Central or South America.');
    assert.equal(fitClue(neotropical, 1, records), 'fits');
    assert.equal(fitClue(neotropical, 2, records), 'contradicts', 'lives only in the Afrotropics');
    assert.equal(fitClue(neotropical, 7, records), 'contradicts', 'two realms, neither this one');
    assert.equal(fitClue(neotropical, 3, records), 'unknown', 'no range data');
    assert.equal(fitClue(find('Also lives in northern Asia.'), 7, records), 'fits');
  });

});

describe('usefulCategories', () => {
  test('a category is useful only while the live candidates differ in it', () => {
    assert.deepEqual([...usefulCategories([3, 4], records, ['taxonomy', 'habitat', 'diet'])], ['taxonomy', 'habitat']);
    assert.equal(usefulCategories([3], records, ['taxonomy', 'habitat']).size, 0);
  });
});

describe('rounds', () => {
  test('the same seed gives the same mysteries', () => {
    const sequence = (seed: number) => {
      const rng = mulberry32(seed);
      const history: number[] = [];
      for (let round = 1; round <= 10; round++) history.push(createRound(pool, rng, round, { recent: history }).mysteryId);
      return history;
    };
    assert.deepEqual(sequence(42), sequence(42));
    assert.notDeepEqual(sequence(42), sequence(43));
  });

  test('later rounds bring in more look-alikes', () => {
    assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map(lookalikesForRound), [1, 1, 2, 2, 3, 3, 4, 4]);
    for (let seed = 1; seed <= 10; seed++) {
      assert.equal(createRound(pool, mulberry32(seed), 1, { recent: OTHERS }).relatives, 1);
      assert.equal(createRound(pool, mulberry32(seed), 7, { recent: OTHERS }).relatives, 4);
    }
  });

  test('recent mysteries are skipped while others remain', () => {
    for (let seed = 1; seed < 20; seed++) assert.equal(createRound(pool, mulberry32(seed), 2, { recent: OTHERS }).mysteryId, 1);
  });

  test('clues come broad to narrow, then facts, without repeating a clue as a fact', () => {
    const round = createRound(pool, mulberry32(1), 1, { recent: OTHERS });
    assert.deepEqual(round.queues.green.map(note => note.text), ['It lives in fresh water.', 'It lives in cold rainforest streams.']);
    assert.deepEqual(round.queues.purple.map(note => note.text), ['Discovered on a famous voyage.', 'Males carry tadpoles in their vocal sac.']);
  });
});

describe('session', () => {
  const start = () => clueSessionReducer(null, { type: 'load', pool, round: createRound(pool, mulberry32(1), 1, { recent: OTHERS }) })!;

  // A cascade can finish after the guess that solved the round.
  test('matches are ignored between rounds', () => {
    const solved = clueSessionReducer(start(), { type: 'guess', speciesId: 1 })!;
    assert.equal(clueSessionReducer(solved, matched(['red'])), solved);
  });

  test('the feed keeps the newest 120 items and the current round is findable', () => {
    let state = start();
    for (let i = 0; i < 150; i++) state = clueSessionReducer(state, matched(['white'], true))!;
    state = clueSessionReducer(state, { type: 'guess', speciesId: 1 })!;
    state = clueSessionReducer(state, { type: 'start-round', round: createRound(pool, mulberry32(2), 2, { recent: [1] }) })!;
    assert.ok(state.feed.length <= 120);
    assert.deepEqual(currentRoundFeed(state.feed), []);
    assert.equal(state.feed.at(-1)?.kind, 'round');
  });
});
