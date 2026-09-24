// What the Clue Match HUD shows: candidate cards, the gem legend, feed groups,
// and the dev-bridge summary.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRound } from '@/clueGame/round';
import { candidateViews, debugSummary, fitGroups, legendViews } from '@/clueGame/selectors';
import { clueSessionReducer, type SessionState } from '@/clueGame/session';
import { mulberry32 } from '@/lib/seededRng';
import { OTHERS, pool } from './testPool';

/** A fresh session whose mystery is species 1 (the Rhinoderma frog). */
const start = (): SessionState => clueSessionReducer(null, { type: 'load', pool, round: createRound(pool, mulberry32(1), 1, OTHERS) })!;
const act = (state: SessionState, ...actions: Parameters<typeof clueSessionReducer>[1][]) =>
  actions.reduce((current, action) => clueSessionReducer(current, action)!, state);
const status = (state: SessionState) => Object.fromEntries(candidateViews(state).map(view => [view.species.id, view.status]));

describe('candidateViews', () => {
  test('every candidate starts live with no dots', () => {
    const state = start();
    const views = candidateViews(state);
    assert.deepEqual(views.map(view => view.species.id), state.round.candidateIds);
    assert.ok(views.every(view => view.status === 'live' && view.fits.length === 0 && view.matches === 0));
  });

  test('a deductive clue adds one dot per candidate and rules out contradictions', () => {
    const state = act(start(), { type: 'matched', gems: ['red'], cascade: false });
    for (const view of candidateViews(state)) {
      assert.equal(view.fits.length, 1);
      const amphibian = view.species.className === 'AMPHIBIA';
      assert.equal(view.fits[0], amphibian ? 'fits' : 'contradicts');
      assert.equal(view.status, amphibian ? 'live' : 'ruled-out');
    }
  });

  test('notes add no dots', () => {
    const state = act(start(), { type: 'matched', gems: ['purple'], cascade: false });
    assert.ok(candidateViews(state).every(view => view.fits.length === 0));
  });

  test('a wrong guess and the answer are marked', () => {
    let state = start();
    const decoy = state.round.candidateIds.find(id => id !== 1)!;
    state = act(state, { type: 'guess', speciesId: decoy });
    assert.equal(status(state)[decoy], 'wrong-guess');
    state = act(state, { type: 'guess', speciesId: 1 });
    assert.equal(status(state)[1], 'answer');
  });

  test('dots reset when a new round starts', () => {
    let state = act(start(), { type: 'matched', gems: ['red', 'green'], cascade: false }, { type: 'guess', speciesId: 1 });
    state = act(state, { type: 'start-round', round: createRound(pool, mulberry32(9), 2, state.history) });
    assert.ok(candidateViews(state).every(view => view.fits.length === 0 && view.status === 'live'));
  });
});

describe('legendViews', () => {
  test('counts what each color revealed this round', () => {
    const state = act(start(), { type: 'matched', gems: ['green', 'green', 'purple'], cascade: false });
    const legend = Object.fromEntries(legendViews(state).map(tile => [tile.gem, tile]));
    assert.equal(legend.green.revealed, 2);
    assert.equal(legend.purple.revealed, 1);
    assert.equal(legend.red.revealed, 0);
  });

  test('only deducing colors can be useful, and an empty color is marked', () => {
    const state = act(start(), { type: 'matched', gems: ['white'], cascade: false });
    const legend = Object.fromEntries(legendViews(state).map(tile => [tile.gem, tile]));
    assert.equal(legend.white.exhausted, true);
    for (const tile of legendViews(state)) if (!tile.deduces) assert.equal(tile.useful, false, tile.gem);
    assert.equal(legend.red.useful, true, 'frogs, turtles, tortoises and a tiger differ in taxonomy');
  });

  test('never depends on which candidate is the mystery', () => {
    const state = start();
    const other = createRound(pool, mulberry32(1), 1, pool.species.map(s => s.id).filter(id => id !== 2));
    const swapped: SessionState = { ...state, round: { ...state.round, mysteryId: other.mysteryId, queues: other.queues } };
    assert.notEqual(swapped.round.mysteryId, state.round.mysteryId);
    assert.deepEqual(legendViews(swapped), legendViews(state));
  });
});

describe('fitGroups', () => {
  test('groups follow display order and skip "no record"', () => {
    const groups = fitGroups({ 3: 'fits', 1: 'contradicts', 2: 'fits', 4: 'unknown', 5: 'partial' }, [2, 5, 1, 3, 4]);
    assert.deepEqual(groups, { fits: [2, 3], partial: [5], contradicts: [1] });
  });

  test("a past round's candidates are still named", () => {
    assert.deepEqual(fitGroups({ 8: 'fits', 9: 'contradicts' }, [1, 2]), { fits: [8], partial: [], contradicts: [9] });
  });
});

describe('debugSummary', () => {
  test('is JSON-safe and keeps a short feed tail', () => {
    let state = start();
    for (let i = 0; i < 12; i++) state = act(state, { type: 'matched', gems: ['green'], cascade: true });
    const summary = debugSummary(state, 77);
    assert.deepEqual(JSON.parse(JSON.stringify(summary)), summary);
    assert.equal(summary.seed, 77);
    assert.equal(summary.mysteryId, 1);
    assert.ok(summary.feedTail.length <= 8);
  });
});
