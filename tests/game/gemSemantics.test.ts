// Characterization tests for gem -> clue-category semantics.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  GEM_SEMANTICS,
  isKnowledgeGem,
  isResourceGem,
} from '@/game/gemSemantics';
import { GEM_TYPES } from '@/game/constants';

describe('gem semantics', () => {
  test('every gem type has a semantic definition', () => {
    for (const gemType of GEM_TYPES) {
      assert.ok(GEM_SEMANTICS[gemType], `missing semantics for ${gemType}`);
      assert.equal(GEM_SEMANTICS[gemType].gemType, gemType);
    }
  });


  test('all board gems are knowledge gems; resource gems are retired', () => {
    assert.equal(isKnowledgeGem('blue'), true);
    assert.equal(isResourceGem('blue'), false);
  });
});
