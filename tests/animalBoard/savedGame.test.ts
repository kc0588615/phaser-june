// A16: whether a saved game still fits today's code (`fitsShape`). Written down first, the ways it could fail:
//  1. Too strict: it drops a save today's code writes (a value that is null on one side, an array of different
//     length, an extra key a later version no longer writes).
//  2. Too loose: it resumes a save missing a key today's code writes (the grid's row order, 2026-11-04), including a
//     key whose fresh value is null (`end`), in the session, the round, the round's rules or the trail.
//  3. It resumes a save whose value changed JSON kind (a number saved as a string, an array as an object).
//  4. It throws, instead of answering false, on a save whose session or nested object is null, missing or not an object.
//  5. It looks inside data-keyed maps or arrays (`pencil`, `headings`, `history`), so a fresh round that ever
//     pre-filled one would drop valid saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANIMAL_RULES, newAnimalRound, newTrail, pickSuspectSet } from '@/clueGame/animalBoard';
import { animalSessionReducer } from '@/clueGame/animalSession';
import { makeBook, poolFor } from '@/clueGame/questionMatch';
import { animalsFromPool } from '@/clueGame/questionMatchContent';
import { fitsShape, type SavedGame } from '@/components/animalBoard/savedGame';
import { contentPool } from '../clueGame/contentPool';

type Session = SavedGame['session'];
type Json = Record<string, unknown>;

const animals = animalsFromPool(contentPool);
const book = makeBook(animals);
const ids = poolFor(animals, 'africa');
const suspects = ids.map(id => pickSuspectSet(book, ids, id, ANIMAL_RULES, 'africa')).find(set => set !== null)!;
const round = newAnimalRound(book, ANIMAL_RULES, { suspects, mysteryId: suspects[0], place: 'africa' });
const { book: _book, ...live } = animalSessionReducer(null, { type: 'load', book, round, boardSeed: 1, trail: newTrail(ANIMAL_RULES) })!;
/** A fresh round 1 as the hook builds it, and as a tab would save it (through JSON). */
const fresh: Session = live;
const save = (): Json => JSON.parse(JSON.stringify(fresh));
/** The four objects `fitsShape` compares, in a save. */
const parts = (saved: Json): Array<[string, Json]> => [
  ['session', saved], ['round', saved.round as Json], ['rules', (saved.round as Json).rules as Json], ['trail', saved.trail as Json],
];

test('a fresh session fits itself, live and through JSON', () => {
  assert.ok(fitsShape(fresh, fresh));
  assert.ok(fitsShape(save(), fresh));
});

test('a save missing any key of the session, the round, its rules or the trail does not fit', () => {
  for (const [name, part] of parts(save())) {
    const keys = Object.keys(part);
    assert.ok(keys.length > 0, `${name} has keys`);
    for (const key of keys) {
      const saved = save();
      const target = parts(saved).find(([other]) => other === name)![1];
      delete target[key];
      assert.equal(fitsShape(saved, fresh), false, `${name}.${key} removed`);
    }
  }
  assert.ok(Object.hasOwn(save(), 'end') && save().end === null, 'a key whose fresh value is null is covered');
});

test('a value of another kind does not fit', () => {
  const asString = save();
  asString.score = '7';
  assert.equal(fitsShape(asString, fresh), false, 'a number saved as a string');
  const asObject = save();
  (asObject.round as Json).suspects = {};
  assert.equal(fitsShape(asObject, fresh), false, 'an array saved as an object');
  const trailAsArray = save();
  trailAsArray.trail = [];
  assert.equal(fitsShape(trailAsArray, fresh), false, 'an object saved as an array');
});

test('an extra key, null against an object, and a full array against an empty one still fit', () => {
  const extra = save();
  extra.later = 1;
  (extra.round as Json).later = 'x';
  assert.ok(fitsShape(extra, fresh), 'extra keys');
  const ended = save();
  ended.end = { points: 50 };
  assert.ok(fitsShape(ended, fresh), 'a saved object against a fresh null');
  const named: Session = { ...fresh, round: { ...fresh.round, named: { id: suspects[0], correct: true } } };
  assert.ok(fitsShape(save(), named), 'a saved null against a fresh object');
  const played = save();
  played.history = [1, 2, 3];
  (played.round as Json).headings = { [suspects[0]]: 'up' };
  assert.ok(fitsShape(played, fresh), 'arrays and maps are not looked inside');
});

test('a save that is not an object, or holds null where an object belongs, does not fit (and does not throw)', () => {
  for (const saved of [null, undefined, 7, 'save', [], [save()]]) assert.equal(fitsShape(saved, fresh), false, JSON.stringify(saved));
  for (const key of ['round', 'trail'] as const) {
    const saved = save();
    saved[key] = null;
    assert.equal(fitsShape(saved, fresh), false, `${key}: null`);
  }
  const noRules = save();
  (noRules.round as Json).rules = null;
  assert.equal(fitsShape(noRules, fresh), false, 'round.rules: null');
});
