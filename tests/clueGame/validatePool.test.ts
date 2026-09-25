// The content checks behind `npm run clue:pool -- --check`: each kind of problem
// a human should fix in the database is reported.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validatePool } from '@/clueGame/validatePool';
import type { CluePool } from '@/clueGame/pool';
import { clue, pool } from './testPool';

const withContent = (extra: Partial<CluePool>): CluePool => ({
  species: pool.species,
  clues: [...pool.clues, ...(extra.clues ?? [])],
  facts: [...pool.facts, ...(extra.facts ?? [])],
});
const warningsFor = (extra: Partial<CluePool>) => validatePool(withContent(extra)).warnings;
const has = (warnings: string[], fragment: string) => warnings.some(warning => warning.includes(fragment));

describe('validatePool text checks', () => {
  test('placeholder facts are flagged', () => {
    assert.ok(has(warningsFor({ facts: [{ speciesId: 1, category: 'diet_flora', text: 'None', sortOrder: 1 }] }), 'placeholder text "None"'));
  });

  test('Red List codes should be spelled out', () => {
    assert.ok(has(warningsFor({ clues: [clue(1, 'conservation', 'Status: EN. Forest loss.', [], 1, false)] }), 'spell out the Red List code'));
    assert.ok(!has(warningsFor({ clues: [clue(1, 'conservation', 'Status: Endangered. Forest loss.', [], 1, false)] }), 'Red List code'));
  });

  test('numbers that lost their dash are flagged, normal numbers are not', () => {
    assert.ok(has(warningsFor({ clues: [clue(1, 'geography', 'Elevation 0150 m.', [], 3, false)] }), 'numbers run together'));
    assert.ok(has(warningsFor({ facts: [{ speciesId: 1, category: 'life_description', text: 'Bred between 20082015.', sortOrder: 1 }] }), 'numbers run together'));
    assert.ok(!has(warningsFor({ clues: [clue(1, 'geography', 'Up to 3,000 m, about 0.5 km inland.', [], 3, false)] }), 'numbers run together'));
  });

  test('text an import cut short is matched to the full fact', () => {
    const warnings = warningsFor({
      clues: [clue(1, 'diet', 'Plant diet: Grazes on grasses and fallen fruit; prefers new g', [], 3, false)],
      facts: [{ speciesId: 1, category: 'diet_flora', text: 'Grazes on grasses and fallen fruit; prefers new growth.', sortOrder: 1 }],
    });
    assert.ok(has(warnings, 'looks cut off; species_facts (diet_flora) has the full text'));
  });

  test('the shared test pool itself is clean', () => {
    assert.deepEqual(validatePool(pool).errors, []);
  });
});
