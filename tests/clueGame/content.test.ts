// Invariants on the real content (db/content/): every profile complete, the pool valid.
import { test, describe } from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { validatePool } from '@/clueGame/validatePool';
import { checkCitations, checkProfile } from '@/clueGame/profiles';
import { continentOf, countryName, regionOfCountry } from '@/clueGame/regions';
import { citedPages, contentPool as pool, profiles, sources } from './contentPool';

describe('Content', () => {
  test('every profile is complete and the pool validates with no errors or warnings', () => {
    assert.deepEqual(profiles.flatMap(profile => checkProfile(profile, sources).map(problem => `${profile.commonName}: ${problem}`)), []);
    assert.deepEqual(profiles.flatMap(profile => checkCitations(profile, sources, citedPages).errors.map(problem => `${profile.commonName}: ${problem}`)), []);
    const report = validatePool(pool);
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.warnings, []);
    assert.ok(report.summary.playable >= 8, 'enough species for a full round');
  });
});

// IDP is the range query's own code for Indonesia east of Lydekker's Line (not Natural Earth's).
// The rounds read it via regions.ts, the globe via the SQL: both copies of the SQL and regions.ts must agree.
describe('IDP & SQL drift', () => {
  const sqlFiles = ['scripts/content.ts', 'db/schema.sql'].map(file => ({ file, text: readFileSync(path.join(process.cwd(), file), 'utf8') }));
  const LYDEKKER = 'ST_X(ST_Centroid(d.geom)) > 133.2 OR (ST_X(ST_Centroid(d.geom)) > 130 AND ST_Y(ST_Centroid(d.geom)) > -3.5)';
  const count = (text: string, needle: string) => text.split(needle).length - 1;

  test('IDP is Indonesian New Guinea, in Melanesia, in Oceania', () => {
    assert.equal(regionOfCountry('IDP'), 'melanesia');
    assert.equal(countryName('IDP'), 'Indonesian New Guinea');
    assert.equal(continentOf('country:idp'), 'oceania');
  });

  for (const { file, text } of sqlFiles) {
    test(`${file} splits Indonesia along Lydekker's Line into IDP, named as regions.ts names it`, () => {
      assert.ok(text.includes(`'IDP', '${countryName('IDP')}'`), 'IDP name literal matches countryName(IDP)');
      assert.ok(text.includes(`'IDP', 'Indonesian New Guinea'`));
      assert.ok(text.includes(`NOT IN ('RUS', 'IDN')`));
      assert.ok(text.includes(`AND NOT (${LYDEKKER})`), 'IDN branch keeps the parts west of the line');
      assert.ok(text.includes(`AND (${LYDEKKER})`), 'IDP branch takes the parts east of the line');
    });
  }

  test('every range query keeps IUCN presence 1-2 only', () => {
    const [content, schema] = sqlFiles;
    for (const { text } of sqlFiles) assert.ok(!text.includes('presence IN (1, 2, 3)'));
    assert.ok(count(content.text, 'presence IN (1, 2)') >= 2, 'RANGES_SQL WHERE + OR NOT EXISTS');
    assert.ok(count(schema.text, 'presence IN (1, 2)') >= 4, 'clue_match_ranges and clue_match_places WHERE + OR NOT EXISTS');
  });
});
