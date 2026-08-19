import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeHintFeed } from '@/expedition/hintFeed';

describe('hint feed', () => {
  it('keeps every new line and drops idempotent response duplicates', () => {
    const first = mergeHintFeed([], [
      { id: '0-2-e-0', text: 'First signal.', kind: 'evidence', family: 'body' },
      { id: '0-2-e-1', text: 'Second signal.', kind: 'evidence', family: 'body' },
    ]);
    assert.equal(first.length, 2);
    assert.deepEqual(mergeHintFeed(first, first), first);
  });

  it('retains the newest bounded history', () => {
    const hints = Array.from({ length: 35 }, (_, index) => ({
      id: `${index}`,
      text: `Hint ${index}`,
      kind: 'cascade' as const,
    }));
    assert.deepEqual(mergeHintFeed([], hints).map(hint => hint.id), hints.slice(-32).map(hint => hint.id));
  });
});
