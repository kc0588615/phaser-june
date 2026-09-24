// Invariants on the real Clue Match content (tests/fixtures/clueGame/pool.json,
// refreshed with `npm run clue:pool -- --snapshot`).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import snapshot from '../fixtures/clueGame/pool.json';
import { validatePool } from '@/clueGame/validatePool';
import { buildSpeciesRecords } from '@/clueGame/traits';
import { CLUE_GAME_GEM_TYPES } from '@/clueGame/categories';
import { createRound, liveCandidates, revealNext } from '@/clueGame/round';
import { mulberry32 } from '@/lib/seededRng';
import type { CluePool } from '@/clueGame/pool';

const pool = snapshot as unknown as CluePool;
const records = buildSpeciesRecords(pool);

describe('Clue Match content', () => {
  test('the pool validates with no errors or warnings', () => {
    const report = validatePool(pool);
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.warnings, []);
    assert.ok(report.summary.playable >= 6, 'enough species for a full round');
  });

  test('over many seeded rounds the answer is never ruled out and always stands out', () => {
    const rng = mulberry32(2024);
    for (let n = 1; n <= 300; n++) {
      let round = createRound(pool, rng, n);
      const fits = new Map<number, number>();
      let standsOut = false;
      for (let step = 0; step < 300 && !standsOut; step++) {
        const gem = CLUE_GAME_GEM_TYPES[Math.floor(rng() * CLUE_GAME_GEM_TYPES.length)];
        const result = revealNext(round, gem, records);
        round = result.state;
        assert.ok(liveCandidates(round).includes(round.mysteryId), `round ${n}: the answer was ruled out`);
        if (result.reveal?.kind === 'clue') {
          assert.equal(result.reveal.fits[round.mysteryId], 'fits', `round ${n}: the answer must fit its own clue`);
          for (const [id, fit] of Object.entries(result.reveal.fits)) if (fit === 'fits') fits.set(Number(id), (fits.get(Number(id)) ?? 0) + 1);
        }
        const live = liveCandidates(round);
        const top = Math.max(...live.map(id => fits.get(id) ?? 0));
        standsOut = top > 0 && live.filter(id => (fits.get(id) ?? 0) === top).length === 1;
        if (CLUE_GAME_GEM_TYPES.every(g => round.queues[g].length === 0)) break;
      }
      assert.ok(standsOut, `round ${n}: species ${round.mysteryId} never became the single best match`);
    }
  });
});
