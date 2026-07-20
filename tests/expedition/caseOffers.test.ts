import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  deriveMethodOfferTree,
  getMethodOfferAtPath,
  validatePersistedOfferTree,
} from '@/expedition/caseOffers';

const NODE_TYPES = ['riverbank_sweep', 'dense_canopy', 'storm_window'] as const;

describe('contextual method offers', () => {
  test('uses the first two unchosen methods at every public branch', () => {
    const tree = deriveMethodOfferTree(NODE_TYPES);
    assert.deepEqual(tree.offered, ['track', 'survey']);
    assert.deepEqual(getMethodOfferAtPath(tree, ['track']), ['observe', 'listen']);
    assert.deepEqual(getMethodOfferAtPath(tree, ['track', 'observe']), ['survey', 'analyze']);
    assert.deepEqual(getMethodOfferAtPath(tree, ['survey']), ['observe', 'listen']);
    assert.deepEqual(getMethodOfferAtPath(tree, ['survey', 'listen']), ['track', 'analyze']);
  });

  test('never repeats a method on any materialized path', () => {
    const tree = deriveMethodOfferTree(NODE_TYPES);
    for (const first of tree.offered) {
      const secondOffer = getMethodOfferAtPath(tree, [first])!;
      assert.equal(secondOffer.includes(first), false);
      for (const second of secondOffer) {
        const thirdOffer = getMethodOfferAtPath(tree, [first, second])!;
        assert.equal(new Set([first, second, ...thirdOffer]).size, 4);
      }
    }
  });

  test('is independent of answer and seed inputs because neither is accepted', () => {
    assert.deepEqual(deriveMethodOfferTree(NODE_TYPES), deriveMethodOfferTree([...NODE_TYPES]));
  });

  test('re-derives persisted trees and rejects drift', () => {
    const tree = deriveMethodOfferTree(NODE_TYPES);
    assert.deepEqual(validatePersistedOfferTree(NODE_TYPES, JSON.parse(JSON.stringify(tree))), tree);
    const stale = JSON.parse(JSON.stringify(tree));
    stale.offered = ['observe', 'listen'];
    assert.equal(validatePersistedOfferTree(NODE_TYPES, stale), null);
  });
});
