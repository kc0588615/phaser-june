import test from 'node:test';
import assert from 'node:assert/strict';
import { CASE_TRAIT_CATEGORIES, isCaseTraitCategory } from '@/lib/caseTraits';

test('isCaseTraitCategory accepts every trait category and rejects anything else', () => {
  for (const category of CASE_TRAIT_CATEGORIES) assert.equal(isCaseTraitCategory(category), true);
  for (const value of ['Habitat', '', undefined, 1]) assert.equal(isCaseTraitCategory(value), false);
});
