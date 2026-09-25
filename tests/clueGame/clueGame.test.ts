// Clue Match rules: records, honest deduction, rounds, session, scoring.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateClue, fitClue, usefulCategories } from '@/clueGame/deduction';
import { normalizeTag } from '@/clueGame/traits';
import { cluesForMatch, correctGuessScore, createRound, liveCandidates, notesLeft, registerWrongGuess, revealNext } from '@/clueGame/round';
import { clueSessionReducer, currentRoundFeed } from '@/clueGame/session';
import { mulberry32 } from '@/lib/seededRng';
import type { CluePool } from '@/clueGame/pool';
import { OTHERS, clue, find, matched, pool, records } from './testPool';

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

  test('every species fits its own clues', () => {
    for (const own of pool.clues.filter(c => c.compareTags.length > 0)) {
      assert.equal(evaluateClue(own, [own.speciesId], records)[own.speciesId], 'fits', own.label);
    }
  });
});

describe('usefulCategories', () => {
  test('a category is useful only while the live candidates differ in it', () => {
    assert.deepEqual([...usefulCategories([3, 4], records, ['taxonomy', 'habitat', 'diet'])], ['taxonomy', 'habitat']);
    assert.equal(usefulCategories([3], records, ['taxonomy', 'habitat']).size, 0);
  });
});

describe('rounds', () => {
  test('a round holds six distinct candidates including the mystery', () => {
    const round = createRound(pool, mulberry32(7), 1);
    assert.equal(round.candidateIds.length, 6);
    assert.equal(new Set(round.candidateIds).size, 6);
    assert.ok(round.candidateIds.includes(round.mysteryId));
  });

  test('a small pool plays with fewer candidates', () => {
    const small: CluePool = { ...pool, clues: pool.clues.filter(c => c.speciesId <= 3) };
    const round = createRound(small, mulberry32(3), 1);
    assert.deepEqual([...round.candidateIds].sort(), [1, 2, 3]);
  });

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

  test('recent mysteries are skipped while others remain', () => {
    for (let seed = 1; seed < 20; seed++) assert.equal(createRound(pool, mulberry32(seed), 2, OTHERS).mysteryId, 1);
  });

  test('clues come broad to narrow, then facts, without repeating a clue as a fact', () => {
    const round = createRound(pool, mulberry32(1), 1, OTHERS);
    assert.deepEqual(round.queues.green.map(note => note.text), ['Found near water.', 'Lives in rainforest streams.']);
    assert.deepEqual(round.queues.purple.map(note => note.text), ['Discovered on a famous voyage.', 'Males carry tadpoles in their vocal sac.']);
  });

  test('notes skip what a clue already said, lead in bare lists, and never show placeholders', () => {
    const withFacts: CluePool = {
      ...pool,
      clues: [...pool.clues, clue(1, 'diet', 'Diet type: Carnivore. Preys on: ants; beetles', ['carnivore'])],
      facts: [
        ...pool.facts,
        { speciesId: 1, category: 'diet_prey', text: 'Ants; beetles', sortOrder: 1 },
        { speciesId: 1, category: 'diet_flora', text: 'None', sortOrder: 1 },
        { speciesId: 1, category: 'threat', text: 'logging; fire', sortOrder: 1 },
      ],
    };
    const round = createRound(withFacts, mulberry32(1), 1, OTHERS);
    assert.deepEqual(round.queues.yellow.map(note => note.text), ['Diet type: Carnivore. Preys on: ants; beetles']);
    assert.deepEqual(round.queues.white.map(note => note.text), ['Threats: logging; fire']);
  });

  test('deductive clues rule out contradicted candidates; notes do not', () => {
    let round = createRound(pool, mulberry32(1), 1, OTHERS);
    const amphibians = round.candidateIds.filter(id => id <= 2).sort();
    const first = revealNext(round, 'red', records);
    assert.equal(first.reveal?.kind, 'clue');
    round = first.state;
    assert.deepEqual(liveCandidates(round).sort(), amphibians);
    const note = revealNext(round, 'purple', records);
    assert.equal(note.reveal?.kind, 'note');
    assert.deepEqual(liveCandidates(note.state).sort(), amphibians);
    assert.deepEqual(note.state.revealedByGem, { red: 1, purple: 1 });
  });

  test('an empty category says so once, then stays quiet', () => {
    let round = createRound(pool, mulberry32(1), 1, OTHERS);
    assert.equal(notesLeft(round, 'white'), 0);
    const first = revealNext(round, 'white', records);
    assert.equal(first.reveal?.kind, 'empty');
    round = first.state;
    assert.equal(revealNext(round, 'white', records).reveal, null);
  });

  test('a wrong guess rules the candidate out', () => {
    const round = createRound(pool, mulberry32(1), 1, OTHERS);
    const decoy = round.candidateIds.find(id => id !== round.mysteryId)!;
    const after = registerWrongGuess(round, decoy);
    assert.ok(!liveCandidates(after).includes(decoy));
    assert.deepEqual(after.wrongGuesses, [decoy]);
  });
});

describe('session', () => {
  const start = () => clueSessionReducer(null, { type: 'load', pool, round: createRound(pool, mulberry32(1), 1, OTHERS) })!;

  test('each explode phase reveals one clue per group; only player moves count as moves', () => {
    let state = clueSessionReducer(start(), matched(['green', 'green']))!;
    state = clueSessionReducer(state, matched(['red'], true))!;
    assert.deepEqual(state.feed.map(item => item.kind), ['round', 'clue', 'clue', 'clue']);
    assert.equal(state.round.moves, 1);
  });

  test('a bigger match reveals extra clues of its color, marked as a bonus', () => {
    const four = clueSessionReducer(start(), matched(['green'], false, 4))!;
    assert.deepEqual(currentRoundFeed(four.feed).map(item => [item.kind, 'bonus' in item && item.bonus === true]), [['clue', false], ['clue', true]]);
    // Species 1 has two green clues: a 5-match shows both, then says green is out.
    const five = clueSessionReducer(start(), matched(['green'], false, 5))!;
    assert.deepEqual(currentRoundFeed(five.feed).map(item => item.kind), ['clue', 'clue', 'empty']);
    assert.equal(five.round.moves, 1);
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
    assert.ok(last?.kind === 'guess' && last.correct && last.points === correctGuessScore({ moves: 0, streak: 0, firstTry: false }));
    assert.ok(last?.kind === 'guess' && last.funFact === 'Males carry tadpoles in their vocal sac.');
  });

  test('guesses on ruled-out candidates are ignored', () => {
    const state = clueSessionReducer(start(), matched(['red']))!;
    const out = state.round.ruledOut[0];
    assert.ok(out !== undefined, 'the taxonomy clue should rule someone out');
    assert.equal(clueSessionReducer(state, { type: 'guess', speciesId: out }), state);
  });

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

describe('scoring', () => {
  test('matches of 4 and 5+ reveal one and two extra clues', () => {
    assert.deepEqual([3, 4, 5, 6].map(cluesForMatch), [1, 2, 3, 3]);
  });

  test('fewer moves, a first try, and a streak score more', () => {
    assert.ok(correctGuessScore({ moves: 2, streak: 0, firstTry: false }) > correctGuessScore({ moves: 8, streak: 0, firstTry: false }));
    assert.ok(correctGuessScore({ moves: 4, streak: 0, firstTry: true }) > correctGuessScore({ moves: 4, streak: 0, firstTry: false }));
    assert.ok(correctGuessScore({ moves: 4, streak: 3, firstTry: false }) > correctGuessScore({ moves: 4, streak: 0, firstTry: false }));
    assert.equal(correctGuessScore({ moves: 50, streak: 0, firstTry: false }), 50);
  });
});
