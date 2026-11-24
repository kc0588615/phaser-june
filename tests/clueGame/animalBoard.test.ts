// Plan 044 round rules on the real content: what a playtest can't see. Written down first, the ways they could break:
//  1. A clear that releases the mystery and every look-alike counts as a find.
//  2. An unmarked tile is released.
//  3. The deck or the board depends on which suspect is the mystery, so it hints at it.
//  4. A dealt deck lacks a record for some suspect, or two suspects answer every clue alike.
//  5. Two look-alikes no full question can tell apart end up in one set.
//  6. A witness note's count disagrees with the suspects' tags, or a note fits only the mystery.
//     (Per-sign witness notes, W1-W8, and the save guard R1-R5: further down, plan 2026-11-24-witness-signs.)
//  7. A finished round changes after more phases (a second heart, a find after an escape).
//  8. Out of moves, a right name saves the round.
//  9. An order answers before it's full, or answers wrongly.
// Plan 2026-11-23-sign-audit §1.4-1.5 (A7-A9), further down: one fit predicate, and how animals leave the board.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANIMAL_RULES, animalFitsNote, applyPhase, dealClues, endOfMove, fullTable, mark, nameIt, newAnimalRound, newTrail, pickSuspectSet,
  questionGroups, roundStillFits, scoreRound, starsFor, stillPossible, tellsApart, tileCells, trailAfter, trailFinished, travelOf,
  witnessNotes, type AnimalRound, type Clue,
} from '@/clueGame/animalBoard';
import { clueFace } from '@/clueGame/clueFaces';
import { PREFIX_CATEGORY, makeBook, poolFor, type Animal, type Book } from '@/clueGame/questionMatch';
import { animalsFromProfiles } from '@/clueGame/questionMatchContent';
import { SIGNS, heldSigns, signsOf, witnessSentence, type SignEntry } from '@/clueGame/signs';
import type { ContinentKey } from '@/clueGame/regions';
import { hash32, mulberry32 } from '@/lib/seededRng';
import { profiles, sources } from './contentPool';

const animals = animalsFromProfiles(profiles, sources, () => undefined);
const book = makeBook(animals);
const id = (name: string) => animals.find(animal => animal.name === name)!.id;
const PLACES: Array<ContinentKey | null> = ['africa', 'asia', 'north-america', 'south-america', 'oceania', null];

/** Every set the place's seeds make (once per place: the tests share them). */
const setsByPlace = new Map<ContinentKey | null, number[][]>();
function sets(place: ContinentKey | null): number[][] {
  if (!setsByPlace.has(place)) {
    const pool = poolFor(animals, place);
    setsByPlace.set(place, pool.map(seed => pickSuspectSet(book, pool, seed, ANIMAL_RULES, place)).filter((set): set is number[] => set !== null));
  }
  return setsByPlace.get(place)!;
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
  // No North America question tells the two sloths apart (since Farms & towns left 54), so they never share a set
  // there. (Saola and Sumatran Orangutan were such a pair until `trees`; the poison frogs until 9 got `young: few`.)
  const pair = ['Pygmy Three-toed Sloth', 'Brown-throated Sloth'].map(id);
  for (const set of sets('north-america')) assert.ok(!pair.every(animal => set.includes(animal)));
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
  const claws = notes.find(note => note.sign === 'digging_claws');
  assert.equal(claws?.fits, 2); // the Aardvark and the Giant Pangolin
  for (const note of notes) {
    const fits = africa.filter(suspect => animalFitsNote(book.byId.get(suspect)!, { tags: [note.sign] })).length;
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
  // What's still possible to a player who knows every answer: every suspect whose own answer matches the mystery's.
  // Knowing none (all hidden, nothing scouted), nobody is ruled out yet.
  const knowsAll = () => true;
  assert.deepEqual(stillPossible(book, state, knowsAll), state.suspects.filter((_suspect, i) => first.row[i] === (truth === 'yes')));
  assert.ok(stillPossible(book, state, knowsAll).includes(id('Aardvark')));
  assert.deepEqual(stillPossible(book, state), state.suspects);
});

test('only marked tiles are released; the last look-alike released is a find', () => {
  let state = round('Aardvark');
  state = touch(state, africa); // nothing marked: nothing leaves
  assert.deepEqual(state.released, []);
  for (const name of ['Okapi', 'Black Rhinoceros', 'Hirola', 'Giant Pangolin']) state = mark(state, id(name), true);
  state = touch(state, [id('Okapi'), id('Aardvark')]); // the Aardvark isn't marked
  assert.deepEqual(state.released, [id('Okapi')]);
  state = touch(state, [id('Black Rhinoceros'), id('Hirola'), id('Giant Pangolin')], true);
  assert.equal(state.status, 'playing'); // plan 047: decided once the move (and its steps) settle
  assert.equal(endOfMove(state).status, 'found');
});

test('releasing the mystery loses the round, even in the clear that releases every look-alike, and nothing changes after', () => {
  let state = round('Aardvark');
  for (const suspect of africa) state = mark(state, suspect, true);
  state = touch(state, africa);
  assert.equal(state.status, 'playing'); // plan 047: decided once the move (and its steps) settle
  state = endOfMove(state);
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

test('out of moves, a right name finds it with one star', () => {
  let state = { ...round('Aardvark'), movesLeft: 1 };
  state = touch(state, []);
  state = endOfMove(state);
  assert.equal(state.status, 'out-of-moves');
  state = nameIt(state, id('Aardvark'));
  assert.equal(state.status, 'found');
  assert.deepEqual(state.named, { id: id('Aardvark'), correct: true });
  assert.equal(starsFor(state), 1);
});

test('one name any time: right finds (one star, no points for moves left), wrong loses, and a second name changes nothing', () => {
  const right = nameIt(round('Aardvark'), id('Aardvark'));
  assert.equal(right.status, 'found');
  assert.equal(starsFor(right), 1);
  assert.equal(scoreRound(right, 0), ANIMAL_RULES.points.star);
  const wrong = nameIt(round('Aardvark'), id('Okapi'));
  assert.equal(wrong.status, 'lost');
  assert.equal(wrong.lostBy, 'wrong-name');
  assert.equal(nameIt(wrong, id('Aardvark')), wrong);
  assert.equal(nameIt(round('Aardvark'), null).status, 'playing');
});

test('every place has full-table questions for its sets', () => {
  for (const place of PLACES) for (const set of sets(place)) assert.ok(fullTable(book, set, place).length >= 4);
});

// ---- Rules 055-1: the dealer (plan 2026-11-20-clue-data-dealer, Goal 4). Written down first, the ways it could break:
//  10. A birth question with the same split as a covering question is never dealt (only the split's first question stands).
//  11. A 2-region deck is dealt where a 1-region deck also tells all five apart.
//  12. A set that needs 2 regions gets no deck.
//  13. A deck holds two questions with one split.
//  14. Two region questions in a deck share a face, or a set loses its deck because a split's first region collides.
//  15. The deck changes with the order of the ids or with the mystery.
//  16. A deck is dealt from fewer splits than clues (askable questions counted, not splits).
//  17. fullTable isn't questionGroups' first questions, or a group repeats a non-Range category or mixes splits.
//  18. A saved continent round resumes after a suspect leaves that continent, or with an id the book lacks (or throws).
//  19. The dealer's cut-off skips a split combination holding the winning deck (its bound too tight).
// Small hand-built books, so these don't move with content edits.

const rank = (latin: string) => ({ latin, plain: null });
const NOTE = { text: 'Seen in a large group.', source: { name: 'Test', url: null }, tags: ['size:large'] };

/** A synthetic book of five suspects (ids 1-5): per prefix, each suspect's value(s), tagged `prefix:value`. */
function synth(columns: Record<string, Array<string | string[]>>, continents: ContinentKey[] = ['africa']): { book: Book; set: number[] } {
  const list: Animal[] = [1, 2, 3, 4, 5].map((animalId, i) => {
    const traits = Object.fromEntries(Object.entries(columns).map(([prefix, values]) => [prefix, [values[i]].flat().map(value => `${prefix}:${value}`)]));
    return {
      id: animalId, name: `Synth ${animalId}`, scientificName: `Synthus ${animalId}`, photo: null, continents: [...continents], traits,
      familyTree: { class: rank('C'), order: rank('O'), family: rank('F'), genus: 'G', species: `s${animalId}` },
      notes: [NOTE], revealNotes: [], guide: { body: [], habits: [], habitat: [], range: [], life: [], family: [] }, signs: [],
      tags: Object.values(traits).flat(),
    };
  });
  return { book: makeBook(list), set: list.map(animal => animal.id) };
}

const tags = (deck: readonly Clue[] | null) => deck?.map(clue => clue.tag) ?? null;
const regionCount = (deck: readonly Clue[]) => deck.filter(clue => clue.tag.startsWith('region:')).length;
const split = (clue: Clue) => clue.row.map(answer => (answer === clue.row[0] ? 0 : 1)).join('');

// Birth (eggs/live) splits the set exactly as covering (fur/scales) does; size already stands for body.
const shadowedBirth = synth({
  size: ['small', 'large', 'small', 'large', 'large'],
  covering: ['fur', 'fur', 'scales', 'scales', 'scales'],
  birth: ['live', 'live', 'eggs', 'eggs', 'eggs'],
  diet: ['plants', 'meat', 'meat', 'plants', 'meat'],
  social: ['groups', 'groups', 'groups', 'groups', 'alone'],
});
// Three habits questions, each picking out one suspect (1, 2, 3), and two Range questions: {4} and {4, 5}.
const singles = { social: ['alone', 'groups', 'groups', 'groups', 'groups'], diet: ['plants', 'meat', 'plants', 'plants', 'plants'] };
const twoRegions = [['central-africa'], ['central-africa'], ['central-africa'], ['central-africa', 'east-africa', 'west-africa'], ['central-africa', 'west-africa']];
const oneRegionWins = synth({ ...singles, activity: ['day', 'day', 'night', 'day', 'day'], region: twoRegions });
// As above, but activity splits {1, 2}: no deck with one region tells 3 from 5.
const forcedTwo = synth({ ...singles, activity: ['night', 'night', 'day', 'day', 'day'], region: twoRegions });
// Anywhere, forced 2 regions: split {4} is Melanesia (⬆️); split {4, 5} is North Africa (⬆️, sorts first) and West Africa (⬅️).
const collidingFirst = synth({ ...singles, activity: ['night', 'night', 'day', 'day', 'day'],
  region: [['usa-canada'], ['usa-canada'], ['usa-canada'], ['usa-canada', 'melanesia', 'north-africa', 'west-africa'], ['usa-canada', 'north-africa', 'west-africa']] });
// The same without West Africa: the only separating pair shares a face.
const collidingOnly = synth({ ...singles, activity: ['night', 'night', 'day', 'day', 'day'],
  region: [['usa-canada'], ['usa-canada'], ['usa-canada'], ['usa-canada', 'melanesia', 'north-africa'], ['usa-canada', 'north-africa']] });
// Three splits (eight askable questions) that tell all five apart.
const threeSplits = synth({
  covering: ['fur', 'fur', 'scales', 'scales', 'scales'],
  birth: ['live', 'live', 'eggs', 'eggs', 'eggs'],
  diet: ['meat', 'plants', 'meat', 'plants', 'plants'],
  social: ['alone', 'groups', 'groups', 'alone', 'groups'],
});
const SYNTH: Array<{ book: Book; set: number[]; place: ContinentKey | null }> = [
  { ...shadowedBirth, place: 'africa' }, { ...oneRegionWins, place: 'africa' }, { ...forcedTwo, place: 'africa' }, { ...collidingFirst, place: null },
];

test('055-1: a birth question with the same split as covering is dealt when it adds a category', () => {
  const deck = dealClues(shadowedBirth.book, shadowedBirth.set, 'africa', 4)!;
  assert.ok(deck && tellsApart(deck, 5));
  assert.ok(tags(deck)!.includes('birth:eggs'), `deck ${tags(deck)}`);
  assert.ok(!tags(deck)!.some(tag => tag.startsWith('covering:')), `deck ${tags(deck)}`);
});

test('055-1: a deck with one region beats one with two when both tell all five apart', () => {
  const deck = dealClues(oneRegionWins.book, oneRegionWins.set, 'africa', 4)!;
  assert.ok(deck && tellsApart(deck, 5));
  assert.equal(regionCount(deck), 1, `deck ${tags(deck)}`);
});

test('055-1: a set that needs two regions still gets a deck', () => {
  const deck = dealClues(forcedTwo.book, forcedTwo.set, 'africa', 4);
  assert.ok(deck && tellsApart(deck, 5), `deck ${tags(deck)}`);
  assert.equal(regionCount(deck), 2);
});

test('055-1: no deck holds two questions with one split', () => {
  const cases = [...SYNTH, ...PLACES.flatMap(place => sets(place).map(set => ({ book, set, place })))];
  for (const { book: caseBook, set, place } of cases) {
    const deck = dealClues(caseBook, set, place, 4);
    assert.ok(deck, `${place}: a deck for ${set}`);
    assert.equal(new Set(deck.map(split)).size, deck.length, `deck ${tags(deck)}`);
  }
});

test('055-1: a split whose first region collides keeps its other regions; colliding faces are never dealt', () => {
  const deck = dealClues(collidingFirst.book, collidingFirst.set, null, 4);
  assert.ok(deck && tellsApart(deck, 5), `deck ${tags(deck)}`);
  assert.ok(tags(deck)!.includes('region:melanesia') && tags(deck)!.includes('region:west-africa'), `deck ${tags(deck)}`);
  assert.equal(new Set(deck.map(clue => clueFace(clue.tag))).size, 4);
  assert.equal(dealClues(collidingOnly.book, collidingOnly.set, null, 4), null);
});

test('055-1: the deck is the same whatever the order of the ids and whichever suspect is the mystery', () => {
  const cases = [...SYNTH, ...PLACES.flatMap(place => sets(place).slice(0, 5).map(set => ({ book, set, place })))];
  for (const { book: caseBook, set, place } of cases) {
    const deck = tags(dealClues(caseBook, set, place, 4));
    assert.ok(deck, `${place}: a deck for ${set}`);
    for (const order of [[...set].reverse(), [...set.slice(2), ...set.slice(0, 2)]]) assert.deepEqual(tags(dealClues(caseBook, order, place, 4)), deck);
    for (const mysteryId of set) assert.deepEqual(newAnimalRound(caseBook, ANIMAL_RULES, { suspects: [...set].reverse(), mysteryId, place }).orders.map(order => order.tag), deck);
  }
});

test('055-1: no deck when the set has fewer splits than clues, however many questions it has', () => {
  assert.ok(dealClues(threeSplits.book, threeSplits.set, 'africa', 3));
  assert.equal(dealClues(threeSplits.book, threeSplits.set, 'africa', 4), null);
});

test('055-1: fullTable is each split group\'s first question; a group keeps one question per category plus every region', () => {
  const cases = [...SYNTH, { ...collidingOnly, place: null }, { ...threeSplits, place: 'africa' as const },
    ...PLACES.flatMap(place => sets(place).map(set => ({ book, set, place })))];
  for (const { book: caseBook, set, place } of cases) {
    const groups = questionGroups(caseBook, set, place);
    assert.deepEqual(fullTable(caseBook, set, place), groups.map(group => group[0]));
    for (const group of groups) {
      assert.equal(new Set(group.map(split)).size, 1, `one split in ${tags(group)}`);
      const categories = group.map(clue => PREFIX_CATEGORY[clue.tag.split(':')[0]]).filter(category => category !== 'range');
      assert.equal(new Set(categories).size, categories.length, `one question per category in ${tags(group)}`);
    }
  }
  // Both West and North Africa stay in their group; covering and birth share one.
  assert.ok(questionGroups(collidingFirst.book, collidingFirst.set, null).some(group => tags(group)!.join() === 'region:north-africa,region:west-africa'));
  assert.ok(questionGroups(shadowedBirth.book, shadowedBirth.set, 'africa').some(group => tags(group)!.join() === 'covering:fur,birth:eggs'));
});

/** The dealer's rule by brute force, no cut-off: every deck of one question from each of `count` groups, the lowest key wins. */
function dealByBruteForce(caseBook: Book, set: readonly number[], place: ContinentKey | null, count: number): string[] | null {
  const sorted = [...set].sort((a, b) => a - b);
  const groups = questionGroups(caseBook, sorted, place);
  const key = (deck: Clue[]) => {
    const regions = regionCount(deck);
    const minor = deck.map(clue => { const yes = clue.row.filter(Boolean).length; return Math.min(yes, sorted.length - yes); });
    const score = (minor.some(n => n >= 2) ? 4 : 0) + (minor.some(n => n === 1) ? 4 : 0)
      + new Set(deck.map(clue => PREFIX_CATEGORY[clue.tag.split(':')[0]])).size;
    return [Math.max(0, regions - 1), -score, regions, hash32(`${sorted.join(',')}:${deck.map(clue => clue.tag).join('|')}`)];
  };
  const decks: Clue[][] = [];
  const visit = (start: number, deck: Clue[]) => {
    if (deck.length < count) for (let g = start; g < groups.length; g++) for (const clue of groups[g]) visit(g + 1, [...deck, clue]);
    else if (tellsApart(deck, sorted.length) && new Set(deck.map(clue => clueFace(clue.tag))).size === count) decks.push(deck);
  };
  visit(0, []);
  const lower = (a: number[], b: number[]) => { const i = a.findIndex((value, j) => value !== b[j]); return i >= 0 && a[i] < b[i]; };
  const best = decks.map(deck => ({ deck, key: key(deck) }))
    .reduce<{ deck: Clue[]; key: number[] } | null>((min, entry) => (!min || lower(entry.key, min.key) ? entry : min), null);
  return tags(best?.deck ?? null);
}

test('055-1: the dealer deals what a search of every deck deals', () => {
  const cases = [...SYNTH, { ...collidingOnly, place: null }, { ...threeSplits, place: 'africa' as const },
    ...PLACES.flatMap(place => sets(place).map(set => ({ book, set, place })))];
  for (const { book: caseBook, set, place } of cases) {
    assert.deepEqual(tags(dealClues(caseBook, set, place, 4)), dealByBruteForce(caseBook, set, place, 4), `${place}: deck for ${set}`);
  }
});

// A continent round on five Asian suspects, and the same suspects Anywhere.
const asia = synth({ size: ['small', 'large', 'small', 'large', 'large'], covering: ['fur', 'fur', 'scales', 'scales', 'scales'],
  diet: ['plants', 'meat', 'meat', 'plants', 'meat'], social: ['groups', 'groups', 'groups', 'groups', 'alone'] }, ['asia']);
const asiaAnimals = () => [...asia.book.byId.values()];
const asiaRound = (place: ContinentKey | null) => newAnimalRound(asia.book, ANIMAL_RULES, { suspects: asia.set, mysteryId: 1, place });

test('055-1: a saved continent round stops fitting once a suspect leaves that continent', () => {
  assert.equal(roundStillFits(asia.book, asiaRound('asia')), true);
  assert.equal(roundStillFits(asia.book, asiaRound(null)), true);
  // Suspect 3 moved to Africa; its rows and the notes still match.
  const moved = makeBook(asiaAnimals().map(animal => (animal.id === 3 ? { ...animal, continents: ['africa' as const] } : animal)));
  assert.equal(roundStillFits(moved, asiaRound(null)), true);
  assert.equal(roundStillFits(moved, asiaRound('asia')), false);
});

test('055-1: a saved round with a suspect the book lacks doesn\'t fit, and doesn\'t throw', () => {
  const without = (gone: number) => makeBook(asiaAnimals().filter(animal => animal.id !== gone));
  for (const gone of [3, 1]) for (const round of [asiaRound('asia'), asiaRound(null)]) {
    assert.equal(roundStillFits(without(gone), round), false, `missing ${gone}`);
    assert.equal(roundStillFits(without(gone), { ...round, orders: [] }), false, `missing ${gone}, no orders`);
  }
});

// ---- Plan 2026-11-23-sign-audit: a narrower sign states its broader one (§1.4), and travel reads raw tags (§1.5).
// Written down first, the ways they could break:
//  A7 animalFitsNote: a narrower holder doesn't fit a broader note; a broader holder fits a narrower note; a note with
//     several tags fits when only one is held; a transitive narrower sign (narrow -> mid -> broad) doesn't fit a broad
//     note; trait tags get a closure, or don't match raw; a suspect with no tags throws.
//  A8 witnessNotes / stillPossible (a small book around one wired edge read from SIGNS): a note tagged with the broader
//     sign doesn't count the narrower holder; stillPossible rules the narrower holder out, or keeps a suspect holding
//     neither; on real content, witnessNotes' fits differ from animalFitsNote.
//  A9 travelOf: a land-only swimmer swims; a swimmer in fresh or salt water walks; fully_aquatic without a system tag
//     walks; a glider or a bat doesn't fly; a burrower doesn't dig; the order changes (fly, then swim, then dig); a
//     sign implied through an edge changes travel. S1/S2 split none of the four travel signs, so no successor tag exists.

const TRAVEL_SIGNS = ['glider', 'fully_aquatic', 'swimmer', 'burrower'];
const openImplies = (entry: SignEntry): string[] => (entry.retired ? [] : (entry.implies ?? []).filter(target => !target.includes(':')));
/** A wired open-tag edge from SIGNS: [narrower, broader]. */
const wired = (): [string, string] => {
  const edge = Object.entries(SIGNS).flatMap(([tag, entry]) => openImplies(entry).map(broader => [tag, broader] as [string, string]))[0];
  assert.ok(edge, 'SIGNS wires at least one open-tag edge');
  return edge;
};
const TABLE: Record<string, SignEntry> = {
  broad: { category: 'body', meaning: 'Broad.', witness: null },
  mid: { category: 'body', meaning: 'Mid.', witness: null, implies: ['broad'] },
  narrow: { category: 'body', meaning: 'Narrow.', witness: null, implies: ['mid'] },
};

test('A7: a narrower sign fits a note of its broader one, never the reverse', () => {
  const [narrower, broader] = wired();
  assert.equal(animalFitsNote({ tags: ['size:large', narrower] }, { tags: [broader] }), true);
  assert.equal(animalFitsNote({ tags: ['size:large', broader] }, { tags: [narrower] }), false);
  assert.equal(animalFitsNote({ tags: ['narrow'] }, { tags: ['broad'] }, TABLE), true); // narrow -> mid -> broad
  assert.equal(animalFitsNote({ tags: ['broad'] }, { tags: ['narrow'] }, TABLE), false);
});

test('A7: a note with several tags fits only a suspect holding every one', () => {
  const [narrower, broader] = wired();
  assert.equal(animalFitsNote({ tags: [narrower, 'size:large'] }, { tags: [broader, 'size:large'] }), true);
  assert.equal(animalFitsNote({ tags: [narrower, 'size:large'] }, { tags: [broader, 'size:huge'] }), false);
  assert.equal(animalFitsNote({ tags: ['size:large'] }, { tags: [broader, 'size:large'] }), false);
});

test('A7: trait tags match as written, with no closure; no tags fit only an untagged note', () => {
  assert.equal(animalFitsNote({ tags: ['trees:yes'] }, { tags: ['trees:yes'] }), true);
  assert.ok((SIGNS.seldom_on_ground.retired ? [] : SIGNS.seldom_on_ground.implies ?? []).includes('trees:yes'));
  assert.equal(animalFitsNote({ tags: ['seldom_on_ground'] }, { tags: ['trees:yes'] }), false);
  assert.equal(animalFitsNote({ tags: undefined }, { tags: ['burrower'] }), false);
  assert.equal(animalFitsNote({ tags: undefined }, { tags: [] }), true);
  assert.equal(animalFitsNote({ tags: ['burrower'] }, { tags: undefined }), true);
});

test('A8: a broader note counts the narrower holder as a fit, and keeps it possible', () => {
  // A wired edge whose broader sign has a standard sentence, so the dealer can deal it.
  const [narrower, broader] = Object.entries(SIGNS)
    .flatMap(([tag, entry]) => openImplies(entry).map(target => [tag, target] as [string, string]))
    .find(([, target]) => witnessSentence(target) !== null)!;
  const text = witnessSentence(broader)!;
  const note = { text: 'Says the broader thing.', source: { name: 'Test', url: null }, tags: [broader] };
  const held: Record<number, string[]> = { 1: [broader], 2: [narrower], 3: [broader], 4: [], 5: [] };
  const fixture = makeBook(asiaAnimals().map(animal => {
    const tags = [...animal.tags!, ...held[animal.id]];
    return { ...animal, notes: [note], tags, signs: signsOf(tags) };
  }));
  assert.deepEqual(witnessNotes(fixture, asia.set, 1).filter(witness => witness.sign === broader), [{ sign: broader, text, fits: 3, also: [narrower] }]);
  const state = { ...newAnimalRound(fixture, ANIMAL_RULES, { suspects: asia.set, mysteryId: 1, place: 'asia' }), notes: [{ sign: broader, text, fits: 3, also: [narrower] }] };
  assert.deepEqual(stillPossible(fixture, state), [1, 2, 3]);
});

test('A8: on real content, every witness note\'s count is the suspects animalFitsNote fits', () => {
  for (const place of PLACES) for (const set of sets(place)) for (const mysteryId of set) {
    for (const note of witnessNotes(book, set, mysteryId)) {
      const fits = set.filter(suspect => animalFitsNote(book.byId.get(suspect)!, { tags: [note.sign] }));
      assert.equal(note.fits, fits.length);
      assert.ok(fits.includes(mysteryId));
    }
  }
});

const traveler = (tags: string[], order = 'Carnivora') => ({
  tags, familyTree: { class: rank('Mammalia'), order: rank(order), family: rank('F'), genus: 'G', species: 's' },
});

test('A9: a swimmer swims only from fresh or salt water; fully_aquatic always swims', () => {
  assert.equal(travelOf(traveler(['swimmer', 'system:terrestrial'])), 'walk');
  assert.equal(travelOf(traveler(['swimmer'])), 'walk');
  assert.equal(travelOf(traveler(['swimmer', 'system:terrestrial', 'system:freshwater'])), 'swim');
  assert.equal(travelOf(traveler(['swimmer', 'system:marine'])), 'swim');
  assert.equal(travelOf(traveler(['fully_aquatic'])), 'swim');
  assert.equal(travelOf(traveler(['system:freshwater'])), 'walk');
});

test('A9: gliders and bats fly, burrowers dig; fly before swim before dig', () => {
  assert.equal(travelOf(traveler(['glider'])), 'fly');
  assert.equal(travelOf(traveler([], 'Chiroptera')), 'fly');
  assert.equal(travelOf(traveler(['burrower'])), 'dig');
  assert.equal(travelOf(traveler(['burrower', 'fully_aquatic', 'glider'])), 'fly');
  assert.equal(travelOf(traveler(['swimmer', 'system:freshwater'], 'Chiroptera')), 'fly');
  assert.equal(travelOf(traveler(['burrower', 'swimmer', 'system:marine'])), 'swim');
  assert.equal(travelOf(traveler(['burrower', 'swimmer', 'system:terrestrial'])), 'dig');
  assert.equal(travelOf(traveler([])), 'walk');
});

test('A9: no wired edge reaches a travel sign, and each travel sign is still active', () => {
  for (const [tag, entry] of Object.entries(SIGNS)) {
    for (const broader of openImplies(entry)) assert.ok(!TRAVEL_SIGNS.includes(broader), `${tag} -> ${broader}`);
  }
  for (const tag of TRAVEL_SIGNS) assert.ok(SIGNS[tag] && !SIGNS[tag].retired, tag);
});

// ---- Plan 2026-11-23-sign-audit S25b (Astra SC1): the five deals the final review found, pinned on real content.
// Ways they could break: a sign's holder loses or never gets its tag (9 climber, 7 town_dweller, 4 and 49
// crevice_hider), a wrong holder keeps it (1 yellow_legs), or witnessNotes counts fits differently from animalFitsNote.
const PINNED: Array<{ place: ContinentKey | null; set: number[]; mystery: number; sign: string; fits: number[] }> = [
  { place: null, set: [5, 6, 8, 9, 13], mystery: 5, sign: 'climber', fits: [5, 6, 9] },
  { place: 'africa', set: [7, 11, 13, 14, 41], mystery: 13, sign: 'town_dweller', fits: [7, 13, 41] },
  { place: null, set: [1, 2, 4, 12, 15], mystery: 15, sign: 'crevice_hider', fits: [4, 15] },
  { place: null, set: [37, 42, 45, 49, 61], mystery: 42, sign: 'crevice_hider', fits: [42, 49] },
  { place: null, set: [1, 2, 17, 18, 20], mystery: 20, sign: 'yellow_legs', fits: [20] },
];

for (const { place, set, mystery, sign, fits } of PINNED) {
  const label = `${place ?? 'world'} ${set} mystery ${mystery} ${sign}`;
  test(`S25b: ${label} fits exactly ${fits}`, () => {
    for (const suspect of set) assert.ok(book.byId.has(suspect) && (place === null || book.byId.get(suspect)!.continents.includes(place)), `${label}: ${suspect}`);
    assert.ok(heldSigns(book.byId.get(mystery)!.tags).has(sign), `${label}: the mystery holds ${sign}`);
    assert.deepEqual(set.filter(suspect => animalFitsNote(book.byId.get(suspect)!, { tags: [sign] })), fits, label);
    const dealt = witnessNotes(book, set, mystery).filter(witness => witness.sign === sign);
    if (fits.length >= 2) assert.deepEqual(dealt.map(witness => witness.fits), [fits.length], label);
    else assert.deepEqual(dealt, [], label);
  });
}

// ---- Plan 2026-11-24-witness-signs: witness gems deal the mystery's signs as standard sentences, and the save guard.
// Written down first, the ways they could break:
//  W1 A sign repeats in a round's dealt witness notes.
//  W2 A note's `text` isn't `witnessSentence(sign)`, or is null.
//  W3 `fits` isn't the count of suspects holding `sign` (heldSigns / animalFitsNote), or isn't between 2 and
//     suspects.length - 1, or the mystery isn't among the fitters.
//  W4 A dealt sign is implied by another dealt sign (`other !== sign && heldSigns([other]).has(sign)`).
//  W5 `also` isn't sorted, or I4 fails: a fitter's `signs` shows neither `sign` nor any `also` chip, or a non-fitter's
//     `signs` shows `sign` or an `also` chip.
//  W6 A held sign of the mystery that fits 2 to n - 1 suspects has a null sentence and isn't in HELD_BACK; or one with a
//     sentence is neither dealt nor implied by a dealt sign (a dealer that deals nothing passes W1-W5).
//  W7 The dealt notes' signs aren't a subsequence of `[...heldSigns(mystery.tags)]`.
//  W8 A fixture mystery holding retired `tree_dweller`, shared by 2+ suspects, gets a note for it, or throws.
//  R1 roundStillFits is true for a saved note that differs only in `sign`.
//  R2 roundStillFits is true for a saved note that differs only in `also`.
//  R3 roundStillFits is true, or throws, for a note in `notes` (or `notesLeft`) with `also` missing or not an array.
//  R4 roundStillFits is true, or throws, for a `{ kind: 'note' }` entry in `round.log` that is missing, extra, out of
//     order or malformed (no `note`, or a note without `also`).
//  R5 A valid round stops fitting (the 055-1 cases above, and a round with collected notes and their log entries).

/** Held signs that fit 2 to n - 1 suspects yet are never dealt (each needs a recorded Decision in the plan). */
const HELD_BACK: readonly string[] = [];

test('W1-W7: on real content, witness notes deal the mystery\'s signs as standard sentences', () => {
  let dealtAny = 0;
  for (const place of PLACES) for (const set of sets(place)) for (const mysteryId of set) {
    const label = `${place ?? 'world'} ${set} mystery ${mysteryId}`;
    const notes = witnessNotes(book, set, mysteryId);
    dealtAny += notes.length;
    const dealt = notes.map(note => note.sign);
    assert.equal(new Set(dealt).size, dealt.length, `W1 ${label}: ${dealt}`);
    const holders = (sign: string) => set.filter(suspect => heldSigns(book.byId.get(suspect)!.tags).has(sign));
    for (const note of notes) {
      const at = `${label} ${note.sign}`;
      assert.equal(typeof note.text, 'string', `W2 ${at}`);
      assert.equal(note.text, witnessSentence(note.sign), `W2 ${at}`);
      const fitters = holders(note.sign);
      assert.deepEqual(fitters, set.filter(suspect => animalFitsNote(book.byId.get(suspect)!, { tags: [note.sign] })), `W3 ${at}`);
      assert.equal(note.fits, fitters.length, `W3 ${at}`);
      assert.ok(note.fits >= 2 && note.fits < set.length, `W3 ${at}: fits ${note.fits}`);
      assert.ok(fitters.includes(mysteryId), `W3 ${at}`);
      for (const other of dealt) assert.ok(other === note.sign || !heldSigns([other]).has(note.sign), `W4 ${at} implied by ${other}`);
      assert.deepEqual(note.also, [...note.also].sort(), `W5 ${at}: also sorted`);
      for (const suspect of set) {
        const chips = book.byId.get(suspect)!.signs.map(chip => chip.tag);
        const shows = chips.includes(note.sign) || note.also.some(alt => chips.includes(alt));
        assert.equal(shows, fitters.includes(suspect), `W5 ${at}: suspect ${suspect} shows ${chips}`);
      }
    }
    const held = [...heldSigns(book.byId.get(mysteryId)!.tags)];
    for (const sign of held) {
      const fits = holders(sign).length;
      if (fits < 2 || fits >= set.length) continue;
      if (witnessSentence(sign) === null) assert.ok(HELD_BACK.includes(sign), `W6 ${label}: ${sign} fits ${fits} but has no sentence`);
      else assert.ok(dealt.some(other => heldSigns([other]).has(sign)), `W6 ${label}: ${sign} fits ${fits} but isn't dealt`);
    }
    let from = 0;
    for (const sign of dealt) {
      const at = held.indexOf(sign, from);
      assert.ok(at >= 0, `W7 ${label}: ${dealt} not in the order of ${held}`);
      from = at + 1;
    }
  }
  assert.ok(dealtAny > 0, 'some note is dealt');
});

test('W8: a retired sign shared by several suspects gets no witness note, and nothing throws', () => {
  assert.ok(SIGNS.tree_dweller?.retired, 'tree_dweller is retired');
  const note = { text: 'Sleeps high in the trees.', source: { name: 'Test', url: null }, tags: ['tree_dweller'] };
  const held: Record<number, string[]> = { 1: ['tree_dweller'], 2: ['tree_dweller'], 3: ['tree_dweller'], 4: [], 5: [] };
  const fixture = makeBook(asiaAnimals().map(animal => {
    const tags = [...animal.tags!, ...held[animal.id]];
    return { ...animal, notes: [note], tags, signs: signsOf(tags) };
  }));
  assert.doesNotThrow(() => witnessNotes(fixture, asia.set, 1));
  assert.deepEqual(witnessNotes(fixture, asia.set, 1), []);
});

/** A real round with 2 notes collected through applyPhase and at least one still to come. */
function collectedRound(): AnimalRound {
  for (const place of PLACES) for (const set of sets(place)) for (const mysteryId of set) {
    if (witnessNotes(book, set, mysteryId).length < 3) continue;
    const fresh = newAnimalRound(book, ANIMAL_RULES, { suspects: set, mysteryId, place });
    const played = applyPhase(book, fresh, { collected: {}, witness: 2, touched: [] }, false);
    assert.equal(played.notes.length, 2);
    assert.ok(played.notesLeft.length >= 1);
    assert.equal(played.log.filter(entry => entry.kind === 'note').length, 2);
    return played;
  }
  throw new Error('no real round deals 3 or more witness notes');
}
type LooseRound = Omit<AnimalRound, 'notes' | 'notesLeft' | 'log'> & { notes: unknown[]; notesLeft: unknown[]; log: unknown[] };
/** roundStillFits on a round edited past its types, as a corrupt save could be. */
const fitsLoose = (round: LooseRound): boolean => roundStillFits(book, round as AnimalRound);
/** The round with notes[i] replaced by `note`, in `notes` and in its log entry alike (so only the fresh check can fail). */
function withNote(round: AnimalRound, i: number, note: unknown): LooseRound {
  let seen = -1;
  const log = round.log.map(entry => (entry.kind === 'note' && ++seen === i ? { kind: 'note', note } : entry));
  return { ...round, notes: round.notes.map((old, j) => (j === i ? note : old)), log };
}
const noteEntries = (round: AnimalRound) => round.log.filter(entry => entry.kind === 'note');
const otherEntries = (round: AnimalRound) => round.log.filter(entry => entry.kind !== 'note');

test('R5: a valid round with collected notes and their log entries still fits', () => {
  const round = collectedRound();
  assert.equal(roundStillFits(book, round), true);
  assert.equal(roundStillFits(book, newAnimalRound(book, ANIMAL_RULES, { suspects: round.suspects, mysteryId: round.mysteryId, place: round.place })), true);
});

test('R1-R2: a saved note that differs only in sign, or only in also, doesn\'t fit', () => {
  const round = collectedRound();
  const [first] = round.notes;
  const otherSign = round.notes[1].sign;
  assert.equal(fitsLoose(withNote(round, 0, { ...first, sign: otherSign })), false, 'R1 notes');
  assert.equal(fitsLoose({ ...round, notesLeft: [{ ...round.notesLeft[0], sign: otherSign }, ...round.notesLeft.slice(1)] }), false, 'R1 notesLeft');
  assert.equal(fitsLoose(withNote(round, 0, { ...first, also: [...first.also, 'zz_extra'] })), false, 'R2 notes');
  assert.equal(fitsLoose({ ...round, notesLeft: [{ ...round.notesLeft[0], also: ['zz_extra'] }, ...round.notesLeft.slice(1)] }), false, 'R2 notesLeft');
  if (first.also.length) assert.equal(fitsLoose(withNote(round, 0, { ...first, also: [] })), false, 'R2 notes, also dropped');
});

test('R3: a saved note with also missing or not an array doesn\'t fit, and doesn\'t throw', () => {
  const round = collectedRound();
  const { also: _also, ...bare } = round.notes[0];
  const { also: _left, ...bareLeft } = round.notesLeft[0];
  const cases: Array<[string, LooseRound]> = [
    ['notes, also missing', withNote(round, 0, bare)],
    ['notes, also a string', withNote(round, 0, { ...bare, also: round.notes[0].also.join('|') })],
    ['notes, also null', withNote(round, 0, { ...bare, also: null })],
    ['notes, note null', withNote(round, 0, null)],
    ['notesLeft, also missing', { ...round, notesLeft: [bareLeft, ...round.notesLeft.slice(1)] }],
    ['notesLeft, also a string', { ...round, notesLeft: [{ ...bareLeft, also: 'x' }, ...round.notesLeft.slice(1)] }],
    ['notesLeft, note null', { ...round, notesLeft: [null, ...round.notesLeft.slice(1)] }],
  ];
  for (const [label, loose] of cases) {
    assert.doesNotThrow(() => fitsLoose(loose), label);
    assert.equal(fitsLoose(loose), false, label);
  }
});

test('R4: a note log entry missing, extra, out of order or malformed doesn\'t fit, and doesn\'t throw', () => {
  const round = collectedRound();
  const [a, b] = noteEntries(round);
  const { also: _also, ...bare } = round.notes[0];
  const cases: Array<[string, LooseRound]> = [
    ['missing', { ...round, log: [...otherEntries(round), a] }],
    ['none', { ...round, log: otherEntries(round) }],
    ['extra', { ...round, log: [...round.log, b] }],
    ['out of order', { ...round, log: [...otherEntries(round), b, a] }],
    ['no note', { ...round, log: [...otherEntries(round), { kind: 'note' }, b] }],
    ['note null', { ...round, log: [...otherEntries(round), { kind: 'note', note: null }, b] }],
    ['note without also', { ...round, log: [...otherEntries(round), { kind: 'note', note: bare }, b] }],
    ['log not an array', { ...round, log: null as unknown as unknown[] }],
  ];
  for (const [label, loose] of cases) {
    assert.doesNotThrow(() => fitsLoose(loose), label);
    assert.equal(fitsLoose(loose), false, label);
  }
  // A null entry isn't a note entry: skipped, never thrown on.
  assert.doesNotThrow(() => fitsLoose({ ...round, log: [null, ...round.log] }));
});
