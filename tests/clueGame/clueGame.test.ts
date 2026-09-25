// Clue Match rules a playtest can't check by looking: how clues compare with
// candidates, seeded replays, the difficulty ramp, reveal order, and session
// guards for rare timing and very long sessions.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fitClue, usefulCategories } from '@/clueGame/deduction';
import { normalizeTag } from '@/clueGame/traits';
import { createRound, relativesForRound } from '@/clueGame/round';
import { clueSessionReducer, currentRoundFeed } from '@/clueGame/session';
import { mulberry32 } from '@/lib/seededRng';
import { OTHERS, find, matched, pool, records } from './testPool';

describe('records', () => {
  test('authoring prefixes are ignored', () => {
    assert.equal(normalizeTag('diet_type:Herbivore'), 'herbivore');
    assert.equal(normalizeTag('family:felidae'), 'felidae');
    assert.equal(normalizeTag('continent:asia'), 'continent:asia');
  });

  test('taxonomy implies shells and birth type', () => {
    const traits = (id: number) => new Set([...records.get(id)!.traits.values()].flatMap(tags => [...tags]));
    assert.ok(traits(3).has('shelled') && traits(3).has('egg_laying'));
    assert.ok(traits(1).has('unshelled'));
    assert.ok(traits(7).has('live_birth') && traits(7).has('unshelled'));
  });
});

describe('fitClue', () => {
  test('a taxonomy mismatch rules a candidate out; a match fits', () => {
    const classClue = find('Class: AMPHIBIA, Order: ANURA');
    assert.equal(fitClue(classClue, 2, records), 'fits');
    assert.equal(fitClue(classClue, 3, records), 'contradicts');
    const familyClue = find('Family: Rhinodermatidae, Genus: Rhinoderma');
    assert.equal(fitClue(familyClue, 2, records), 'contradicts');
    assert.equal(fitClue(find('Family: Felidae'), 1, records), 'contradicts');
  });

  test('a missing open trait is "no record", never a contradiction', () => {
    const streams = find('Lives in rainforest streams.');
    assert.equal(fitClue(streams, 3, records), 'partial');
    assert.equal(fitClue(streams, 5, records), 'unknown');
    assert.equal(fitClue(streams, 2, records), 'unknown');
  });

  test('the other value of an exclusive trait rules a candidate out', () => {
    const eggs = find('Lays eggs; lives a few years.');
    assert.equal(fitClue(eggs, 2, records), 'contradicts', 'long_lived vs short_lived');
    assert.equal(fitClue(eggs, 7, records), 'contradicts', 'live_birth vs egg_laying');
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
      for (let round = 1; round <= 10; round++) history.push(createRound(pool, rng, round, history).mysteryId);
      return history;
    };
    assert.deepEqual(sequence(42), sequence(42));
    assert.notDeepEqual(sequence(42), sequence(43));
  });

  test('later rounds bring in the mystery\'s closest relatives', () => {
    assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map(relativesForRound), [0, 0, 1, 1, 2, 2, 3, 3]);
    const notThree = [1, 2, 4, 5, 6, 7];
    for (let seed = 1; seed <= 10; seed++) {
      const late = createRound(pool, mulberry32(seed), 7, notThree);
      assert.equal(late.mysteryId, 3);
      assert.equal(late.relatives, 3);
      for (const relative of [4, 5, 6]) assert.ok(late.candidateIds.includes(relative), `seed ${seed}: turtle/tortoise ${relative} is in the lineup`);
      assert.equal(createRound(pool, mulberry32(seed), 1, notThree).relatives, 0);
    }
  });

  test('recent mysteries are skipped while others remain', () => {
    for (let seed = 1; seed < 20; seed++) assert.equal(createRound(pool, mulberry32(seed), 2, OTHERS).mysteryId, 1);
  });

  test('clues come broad to narrow, then facts, without repeating a clue as a fact', () => {
    const round = createRound(pool, mulberry32(1), 1, OTHERS);
    assert.deepEqual(round.queues.green.map(note => note.text), ['Found near water.', 'Lives in rainforest streams.']);
    assert.deepEqual(round.queues.purple.map(note => note.text), ['Discovered on a famous voyage.', 'Males carry tadpoles in their vocal sac.']);
  });
});

describe('session', () => {
  const start = () => clueSessionReducer(null, { type: 'load', pool, round: createRound(pool, mulberry32(1), 1, OTHERS) })!;

  // A cascade can finish after the guess that solved the round.
  test('matches are ignored between rounds', () => {
    const solved = clueSessionReducer(start(), { type: 'guess', speciesId: 1 })!;
    assert.equal(clueSessionReducer(solved, matched(['red'])), solved);
  });

  test('the feed keeps the newest 120 items and the current round is findable', () => {
    let state = start();
    for (let i = 0; i < 150; i++) state = clueSessionReducer(state, matched(['white'], true))!;
    state = clueSessionReducer(state, { type: 'guess', speciesId: 1 })!;
    state = clueSessionReducer(state, { type: 'start-round', round: createRound(pool, mulberry32(2), 2, [1]) })!;
    assert.ok(state.feed.length <= 120);
    assert.deepEqual(currentRoundFeed(state.feed), []);
    assert.equal(state.feed.at(-1)?.kind, 'round');
  });
});
