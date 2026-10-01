// Plan 044 round rules on the real content: what a playtest can't see. Written down first, the ways they could break:
//  1. A clear that releases the mystery and every look-alike counts as a find.
//  2. An unmarked tile is released.
//  3. The deck or the board depends on which suspect is the mystery, so it hints at it.
//  4. A dealt deck lacks a record for some suspect, or two suspects answer every clue alike.
//  5. Two look-alikes no full question can tell apart end up in one set.
//  6. A witness note's count disagrees with the suspects' tags, or a note fits only the mystery.
//  7. A finished round changes after more phases (a second heart, a find after an escape).
//  8. Out of moves, a right name saves the round.
//  9. An order answers before it's full, or answers wrongly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANIMAL_RULES, applyPhase, dealClues, endOfMove, fullTable, mark, nameAtTimeout, newAnimalRound, newTrail, pickSuspectSet,
  stillPossible, tellsApart, tileCells, trailAfter, trailFinished, witnessNotes, type AnimalRound,
} from '@/clueGame/animalBoard';
import { makeBook, poolFor } from '@/clueGame/questionMatch';
import { animalsFromProfiles } from '@/clueGame/questionMatchContent';
import type { ContinentKey } from '@/clueGame/regions';
import { mulberry32 } from '@/lib/seededRng';
import { profiles, sources } from './contentPool';

const animals = animalsFromProfiles(profiles, sources, () => undefined);
const book = makeBook(animals);
const id = (name: string) => animals.find(animal => animal.name === name)!.id;
const PLACES: Array<ContinentKey | null> = ['africa', 'asia', 'north-america', 'south-america', 'oceania', null];

/** Every set the place's seeds make. */
function sets(place: ContinentKey | null): number[][] {
  const pool = poolFor(animals, place);
  return pool.map(seed => pickSuspectSet(book, pool, seed, ANIMAL_RULES, place)).filter((set): set is number[] => set !== null);
}

const africa = ['Okapi', 'Aardvark', 'Giant Pangolin', 'Black Rhinoceros', 'Hirola'].map(id);
const round = (mystery: string) => newAnimalRound(book, ANIMAL_RULES, { suspects: africa, mysteryId: id(mystery), place: 'africa' });
const touch = (state: AnimalRound, touched: number[], cascade = false) => applyPhase(book, state, { collected: {}, witness: 0, touched }, cascade);

test('every set has a deck with a full table that tells all five apart, and no inseparable pair', () => {
  for (const place of PLACES) {
    const all = sets(place);
    assert.ok(all.length > 0, `${place}: some set`);
    for (const set of all) {
      assert.equal(set.length, 5);
      const deck = dealClues(book, set, place, 4)!;
      assert.equal(deck.length, 4);
      assert.ok(tellsApart(deck, 5), `${place}: deck tells ${set} apart`);
      for (const clue of deck) for (const suspect of set) assert.ok(book.traits.get(suspect)!.get(clue.tag.split(':')[0]), `${suspect} has a record for ${clue.tag}`);
    }
  }
  // No question tells these two frogs apart, so they never share a set.
  const frogs = ['Dyeing Poison Dart Frog', 'Golden Poison Frog'].map(id);
  for (const place of PLACES) for (const set of sets(place)) assert.ok(!frogs.every(frog => set.includes(frog)));
});

test('the deck, notes aside, is the same whichever suspect is the mystery', () => {
  for (const set of sets('africa').slice(0, 10)) {
    const decks = set.map(mysteryId => newAnimalRound(book, ANIMAL_RULES, { suspects: set, mysteryId, place: 'africa' }).orders.map(order => order.tag));
    assert.ok(decks.every(deck => deck.join() === decks[0].join()));
  }
  // Tile cells come from a seed alone (the caller seeds it from the set).
  assert.deepEqual(tileCells(7, 7, 5, mulberry32(9)), tileCells(7, 7, 5, mulberry32(9)));
});

test('tile cells are at least 3 apart and never in a corner', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const cells = tileCells(7, 7, 5, mulberry32(seed))!;
    assert.equal(cells.length, 5);
    for (const [x, y] of cells) assert.ok(!((x === 0 || x === 6) && (y === 0 || y === 6)));
    for (const a of cells) for (const b of cells) if (a !== b) assert.ok(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) >= 3);
  }
});

test('witness notes fit 2 to 4 suspects, counted from their tags', () => {
  const notes = witnessNotes(book, africa, id('Aardvark'));
  const claws = notes.find(note => note.tags?.includes('digging_claws'));
  assert.equal(claws?.fits, 2); // the Aardvark and the Giant Pangolin
  for (const note of notes) {
    const fits = africa.filter(suspect => note.tags!.every(tag => book.byId.get(suspect)!.tags?.includes(tag))).length;
    assert.equal(note.fits, fits);
    assert.ok(fits >= 2 && fits <= 4);
  }
});

test('an order answers only when full, and answers the truth', () => {
  let state = round('Aardvark');
  const first = state.orders[0];
  state = applyPhase(book, state, { collected: { [first.gem]: ANIMAL_RULES.orderSize - 1 }, witness: 0, touched: [] }, false);
  assert.equal(state.orders[0].answer, null);
  state = applyPhase(book, state, { collected: { [first.gem]: 1 }, witness: 0, touched: [] }, true);
  const truth = first.row[state.suspects.indexOf(id('Aardvark'))] ? 'yes' : 'no';
  assert.equal(state.orders[0].answer, truth);
  // What's still possible: every suspect whose own answer matches the mystery's.
  assert.deepEqual(stillPossible(book, state), state.suspects.filter((_suspect, i) => first.row[i] === (truth === 'yes')));
  assert.ok(stillPossible(book, state).includes(id('Aardvark')));
});

test('only marked tiles are released; the last look-alike released is a find', () => {
  let state = round('Aardvark');
  state = touch(state, africa); // nothing marked: nothing leaves
  assert.deepEqual(state.released, []);
  for (const name of ['Okapi', 'Black Rhinoceros', 'Hirola', 'Giant Pangolin']) state = mark(state, id(name), true);
  state = touch(state, [id('Okapi'), id('Aardvark')]); // the Aardvark isn't marked
  assert.deepEqual(state.released, [id('Okapi')]);
  state = touch(state, [id('Black Rhinoceros'), id('Hirola'), id('Giant Pangolin')], true);
  assert.equal(state.status, 'found');
});

test('releasing the mystery loses the round, even in the clear that releases every look-alike, and nothing changes after', () => {
  let state = round('Aardvark');
  for (const suspect of africa) state = mark(state, suspect, true);
  state = touch(state, africa);
  assert.equal(state.status, 'lost');
  assert.equal(state.lostBy, 'escaped');
  const after = touch(state, africa, true);
  assert.equal(after, state);
  let trail = trailAfter(ANIMAL_RULES, newTrail(ANIMAL_RULES), state);
  assert.equal(trail.hearts, ANIMAL_RULES.hearts - 1);
  trail = trailAfter(ANIMAL_RULES, trail, state);
  trail = trailAfter(ANIMAL_RULES, trail, state);
  assert.ok(trail.over && !trailFinished(ANIMAL_RULES, trail));
});

test('out of moves, a right name goes in the journal but the round is lost', () => {
  let state = { ...round('Aardvark'), movesLeft: 1 };
  state = touch(state, []);
  state = endOfMove(state);
  assert.equal(state.status, 'out-of-moves');
  state = nameAtTimeout(state, id('Aardvark'));
  assert.equal(state.status, 'lost');
  assert.deepEqual(state.named, { id: id('Aardvark'), correct: true });
});

test('every place has full-table questions for its sets', () => {
  for (const place of PLACES) for (const set of sets(place)) assert.ok(fullTable(book, set, place).length >= 4);
});
