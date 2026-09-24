// Clue-category game rules: clue queues, deduction marks, and scoring.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildTraitSets, evaluateClue, fitClue, usefulCategories } from '@/clueGame/deduction';
import { correctGuessScore, createRound, liveCandidates, notesLeft, registerWrongGuess, revealNext } from '@/clueGame/round';
import { clueSessionReducer } from '@/clueGame/session';
import { mulberry32 } from '@/lib/seededRng';
import type { CluePool, PoolClue } from '@/clueGame/pool';

let nextId = 1;
const clue = (speciesId: number, category: PoolClue['category'], label: string, compareTags: string[], revealOrder = 1, isFiltering = true): PoolClue =>
  ({ id: nextId++, speciesId, category, label, compareTags, revealOrder, isFiltering });

// 1 frog, 2 frog, 3 turtle, 4 turtle, 5 tortoise, 6 tortoise, 7 tiger.
const pool: CluePool = {
  species: [1, 2, 3, 4, 5, 6, 7].map(id => ({ id, commonName: `Species ${id}`, scientificName: `S${id}`, className: null, taxonOrder: null })),
  clues: [
    clue(1, 'taxonomy', 'An amphibian.', ['amphibian']),
    clue(1, 'habitat', 'Lives in rainforest streams.', ['freshwater', 'rainforest'], 2),
    clue(1, 'habitat', 'Found near water.', ['freshwater'], 1),
    clue(1, 'key_fact', 'Discovered on a famous voyage.', [], 1, false),
    clue(2, 'taxonomy', 'An amphibian.', ['amphibian']),
    clue(2, 'habitat', 'Lives in deserts.', ['desert']),
    clue(3, 'taxonomy', 'A reptile.', ['reptile']),
    clue(3, 'habitat', 'Lives in rivers.', ['freshwater', 'river']),
    clue(4, 'taxonomy', 'A reptile.', ['reptile']),
    clue(4, 'habitat', 'Lives in ponds.', ['freshwater']),
    clue(5, 'taxonomy', 'A reptile.', ['reptile']),
    clue(5, 'habitat', 'Lives in grassland.', ['grassland']),
    clue(6, 'taxonomy', 'A reptile.', ['reptile']),
    clue(6, 'habitat', 'Lives in scrub.', ['scrub']),
    clue(7, 'taxonomy', 'A mammal.', ['mammal']),
    clue(7, 'habitat', 'Lives in forests.', ['forest']),
  ],
  facts: [
    { speciesId: 1, category: 'key_fact', text: 'Males carry tadpoles in their vocal sac.', sortOrder: 1 },
    { speciesId: 1, category: 'key_fact', text: 'Discovered on a famous voyage.', sortOrder: 2 },
  ],
};
const traits = buildTraitSets(pool.clues);

describe('fitClue', () => {
  test('grades shared tags as fits, partial, or contradicts', () => {
    assert.equal(fitClue(['freshwater', 'rainforest'], new Set(['freshwater', 'rainforest', 'stream'])), 'fits');
    assert.equal(fitClue(['freshwater', 'rainforest'], new Set(['freshwater'])), 'partial');
    assert.equal(fitClue(['freshwater'], new Set(['desert'])), 'contradicts');
    assert.equal(fitClue(['freshwater'], new Set()), 'unknown');
  });

  test('a species always fits its own clues', () => {
    for (const own of pool.clues.filter(c => c.compareTags.length > 0)) {
      assert.equal(evaluateClue(own, [own.speciesId], traits)[own.speciesId], 'fits', own.label);
    }
  });
});

describe('usefulCategories', () => {
  test('a category is useful only while the live candidates differ in it', () => {
    const useful = usefulCategories([3, 4], traits, ['taxonomy', 'habitat']);
    assert.deepEqual([...useful], ['habitat']);
    assert.equal(usefulCategories([3], traits, ['taxonomy', 'habitat']).size, 0);
  });
});

describe('rounds', () => {
  test('a round holds six distinct candidates including the mystery', () => {
    const round = createRound(pool, mulberry32(7), 1);
    assert.equal(round.candidateIds.length, 6);
    assert.equal(new Set(round.candidateIds).size, 6);
    assert.ok(round.candidateIds.includes(round.mysteryId));
  });

  test('recent mysteries are skipped while others remain', () => {
    const recent = [2, 3, 4, 5, 6, 7];
    for (let seed = 1; seed < 20; seed++) assert.equal(createRound(pool, mulberry32(seed), 2, recent).mysteryId, 1);
  });

  test('clues come broad to narrow, then facts, without repeating a clue as a fact', () => {
    const round = { ...createRound(pool, mulberry32(1), 1, [2, 3, 4, 5, 6, 7]) };
    assert.deepEqual(round.queues.green.map(note => note.text), ['Found near water.', 'Lives in rainforest streams.']);
    assert.deepEqual(round.queues.purple.map(note => note.text), ['Discovered on a famous voyage.', 'Males carry tadpoles in their vocal sac.']);
  });

  test('deductive clues rule out contradicted candidates; notes do not', () => {
    let round = createRound(pool, mulberry32(1), 1, [2, 3, 4, 5, 6, 7]);
    const amphibians = round.candidateIds.filter(id => id === 1 || id === 2).sort();
    const first = revealNext(round, 'red', traits);
    assert.equal(first.reveal?.kind, 'clue');
    round = first.state;
    assert.deepEqual(liveCandidates(round).sort(), amphibians);
    const note = revealNext(round, 'purple', traits);
    assert.equal(note.reveal?.kind, 'note');
    assert.deepEqual(liveCandidates(note.state).sort(), amphibians);
    assert.equal(note.state.revealed, 2);
  });

  test('an empty category says so once, then stays quiet', () => {
    let round = createRound(pool, mulberry32(1), 1, [2, 3, 4, 5, 6, 7]);
    assert.equal(notesLeft(round, 'white'), 0);
    const first = revealNext(round, 'white', traits);
    assert.equal(first.reveal?.kind, 'empty');
    round = first.state;
    assert.equal(revealNext(round, 'white', traits).reveal, null);
  });

  test('a wrong guess rules the candidate out', () => {
    const round = createRound(pool, mulberry32(1), 1, [2, 3, 4, 5, 6, 7]);
    const decoy = round.candidateIds.find(id => id !== round.mysteryId)!;
    const after = registerWrongGuess(round, decoy);
    assert.ok(!liveCandidates(after).includes(decoy));
    assert.deepEqual(after.wrongGuesses, [decoy]);
  });
});

describe('session', () => {
  const start = () => clueSessionReducer(null, { type: 'load', pool, round: createRound(pool, mulberry32(1), 1, [2, 3, 4, 5, 6, 7]) })!;

  test('matches feed clues in order, cascades included', () => {
    const state = clueSessionReducer(start(), { type: 'matched', gems: ['green', 'green', 'red'] })!;
    assert.deepEqual(state.feed.map(item => item.kind), ['round', 'clue', 'clue', 'clue']);
    assert.equal(state.round.revealed, 3);
  });

  test('a wrong guess costs points and the streak; a right one solves the round', () => {
    let state = start();
    const decoy = state.round.candidateIds.find(id => id !== state.round.mysteryId)!;
    state = clueSessionReducer({ ...state, score: 100, streak: 2 }, { type: 'guess', speciesId: decoy })!;
    assert.equal(state.score, 70);
    assert.equal(state.streak, 0);
    state = clueSessionReducer(state, { type: 'guess', speciesId: state.round.mysteryId })!;
    assert.equal(state.phase, 'solved');
    assert.equal(state.solved, 1);
    const last = state.feed.at(-1);
    assert.ok(last?.kind === 'guess' && last.correct && last.funFact === 'Males carry tadpoles in their vocal sac.');
  });

  test('matches are ignored between rounds', () => {
    const solved = clueSessionReducer(start(), { type: 'guess', speciesId: 1 })!;
    assert.equal(clueSessionReducer(solved, { type: 'matched', gems: ['red'] }), solved);
  });
});

describe('scoring', () => {
  test('earlier and bolder guesses score more', () => {
    assert.ok(correctGuessScore(2, 3, 0) > correctGuessScore(8, 3, 0));
    assert.ok(correctGuessScore(4, 2, 0) > correctGuessScore(4, 1, 0));
    assert.equal(correctGuessScore(50, 1, 0), 20);
  });
});
