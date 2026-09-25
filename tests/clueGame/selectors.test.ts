// The gem legend must not leak the answer: nothing a player could compare
// between rounds, so no playtest would notice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRound } from '@/clueGame/round';
import { legendViews } from '@/clueGame/selectors';
import { clueSessionReducer, type SessionState } from '@/clueGame/session';
import { mulberry32 } from '@/lib/seededRng';
import { OTHERS, pool } from './testPool';

test('the legend never depends on which candidate is the mystery', () => {
  const state = clueSessionReducer(null, { type: 'load', pool, round: createRound(pool, mulberry32(1), 1, OTHERS) })!;
  const other = createRound(pool, mulberry32(1), 1, pool.species.map(s => s.id).filter(id => id !== 2));
  const swapped: SessionState = { ...state, round: { ...state.round, mysteryId: other.mysteryId, queues: other.queues } };
  assert.notEqual(swapped.round.mysteryId, state.round.mysteryId);
  assert.deepEqual(legendViews(swapped), legendViews(state));
});
