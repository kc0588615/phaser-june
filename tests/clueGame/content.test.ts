// Invariants on the real content (db/content/): every profile complete, the pool valid.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validatePool } from '@/clueGame/validatePool';
import { checkProfile } from '@/clueGame/profiles';
import { contentPool as pool, profiles, sources } from './contentPool';

describe('Content', () => {
  test('every profile is complete and the pool validates with no errors or warnings', () => {
    assert.deepEqual(profiles.flatMap(profile => checkProfile(profile, sources).map(problem => `${profile.commonName}: ${problem}`)), []);
    const report = validatePool(pool);
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.warnings, []);
    assert.ok(report.summary.playable >= 8, 'enough species for a full round');
  });
});
