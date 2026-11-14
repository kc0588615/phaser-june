// The content check's errors a playtest can't see (a misspelled realm rules every
// other candidate with range data out; two values of a one-value trait rule the
// answer's look-alikes out wrongly), and its warnings about a profile's gaps.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CluePool } from '@/clueGame/pool';
import { validatePool } from '@/clueGame/validatePool';
import { clue, pool, species } from './testPool';

test('a misspelled realm is an error', () => {
  const report = validatePool({ ...pool, clues: [...pool.clues, clue(3, 'geography', 'Lives in North America.', ['realm:nearctik'])] });
  assert.ok(report.errors.some(error => error.includes('unknown realm tags [realm:nearctik]')));
});

test('two values of a one-value trait are an error', () => {
  assert.ok(!validatePool(pool).errors.some(error => error.includes('takes one value')));
  const clues = [...pool.clues, clue(7, 'morphology', 'It is large.', ['size:large']), clue(7, 'morphology', 'It is small.', ['size:small'], 2)];
  assert.ok(validatePool({ ...pool, clues }).errors.includes('Species 7: holds size:large and size:small, but size takes one value'));
});

test('the content check warns about each gap, by animal, group and kind', () => {
  const gaps: CluePool = {
    species: [
      species(101, 'AMPHIBIA', 'ANURA', 'RHINODERMATIDAE', 'Rhinoderma'),
      species(102, 'MAMMALIA', 'CARNIVORA', 'FELIDAE', 'Panthera'),
      species(103, 'REPTILIA', 'TESTUDINES', 'TESTUDINIDAE', 'Astrochelys'),
    ],
    clues: [
      clue(101, 'taxonomy', "It's an amphibian.", ['class:amphibia']),
      // Tagged, but not filtering: it can't deduce, so Body still has no tagged clue.
      clue(101, 'morphology', 'It is small.', ['size:small'], 1, false),
      // Behavior & diet from one of its two clue categories.
      clue(101, 'diet', 'It eats insects.', ['diet:insects']),
      clue(101, 'habitat', 'It lives in fresh water.', ['system:freshwater']),
      clue(101, 'geography', 'Lives in Central or South America.', ['realm:neotropical']),
      clue(102, 'taxonomy', 'Its family is Felidae.', ['family:felidae']),
    ],
    facts: [
      // Life cycle from a fact only: notes, but no tagged clue.
      { speciesId: 101, category: 'life_description', text: 'Tadpoles grow up in the vocal sac.', sortOrder: 1 },
      { speciesId: 101, category: 'key_fact', text: 'Named after a famous naturalist.', sortOrder: 1 },
      // 103 has no clue, so it isn't playable and gets no warnings.
      { speciesId: 103, category: 'key_fact', text: 'Its shell has star patterns.', sortOrder: 1 },
    ],
    citations: {},
  };
  const tagged = (animal: string, label: string) => `${animal}: no tagged ${label} clue`;
  const any = (animal: string, label: string) => `${animal}: no ${label} `;
  const bare = ['Body', 'Behavior & diet', 'Habitat', 'Range', 'Life cycle'];
  const starts = [
    tagged('Species 101', 'Body'), tagged('Species 101', 'Life cycle'), any('Species 101', 'Conservation'),
    ...bare.flatMap(label => [tagged('Species 102', label), any('Species 102', label)]),
    any('Species 102', 'Conservation'), any('Species 102', 'Key facts'),
  ];
  assert.equal(starts.length, 15);
  const { warnings } = validatePool(gaps);
  const message = warnings.join('\n');
  // Every warning is one expected gap, and every expected gap is one warning.
  assert.deepEqual(warnings.map(warning => starts.filter(start => warning.startsWith(start)).length), warnings.map(() => 1), message);
  assert.deepEqual(starts.map(start => warnings.filter(warning => warning.startsWith(start)).length), starts.map(() => 1), message);
});
