// Invariants on the real content (db/content/): every profile complete, the pool valid.
import { test, describe } from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { validatePool } from '@/clueGame/validatePool';
import { checkCitations, checkProfile, contentRowsFromProfiles, presentCountries, profileClues, type AnimalProfile } from '@/clueGame/profiles';
import { poolFromRows } from '@/clueGame/pool';
import { animalsFromPool, animalsFromProfiles } from '@/clueGame/questionMatchContent';
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

// redList.notPresent: countries IUCN lists as extinct, possibly extinct or presence uncertain drop out of the
// country clue and the regions, through both front doors; checkProfile rejects bad entries without normalizing them.
describe('redList.notPresent', () => {
  type NotPresent = Array<{ code: string; status: string }>;
  const byName = (name: string) => profiles.find(profile => profile.commonName === name)!;
  const withNotPresent = (name: string, notPresent: NotPresent) => {
    const profile = structuredClone(byName(name));
    (profile.redList as { notPresent?: NotPresent }).notPresent = notPresent;
    return profile as AnimalProfile;
  };
  const countryClue = (profile: AnimalProfile) => profileClues(profile).find(clue => clue.tags.some(tag => tag.startsWith('country:')));
  const viaProfiles = (list: AnimalProfile[]) => animalsFromProfiles(list, sources);
  const viaPool = (list: AnimalProfile[]) => animalsFromPool(poolFromRows(contentRowsFromProfiles(list), { registry: sources, pages: citedPages }));
  const places = (animals: ReturnType<typeof viaProfiles>) => [...animals].sort((a, b) => a.id - b.id).map(animal => ({ id: animal.id, region: animal.traits.region ?? [], continents: animal.continents }));
  const notPresentProblems = (profile: AnimalProfile) => checkProfile(profile, sources).filter(problem => problem.includes('redList.notPresent'));

  test('a listed code leaves the country clue text, its tags and the regions; the rest keep their order', () => {
    const turtle = withNotPresent('Yangtze Giant Softshell Turtle', [{ code: 'CHN', status: 'possibly-extinct' }]);
    assert.deepEqual(countryClue(turtle), { ...countryClue(byName('Yangtze Giant Softshell Turtle'))!, text: 'It lives in Vietnam.', tags: ['country:vnm'] });
    const [animal] = viaProfiles([turtle]);
    assert.deepEqual(animal.traits.region, ['region:southeast-asia']);
    assert.deepEqual(animal.continents, ['asia']);

    const aardvark = withNotPresent('Aardvark', [{ code: 'SDN', status: 'uncertain' }, { code: 'BWA', status: 'extinct' }]);
    const kept = byName('Aardvark').range!.countries.filter(country => !['SDN', 'BWA'].includes(country.code));
    assert.deepEqual(countryClue(aardvark)!.tags, kept.map(country => `country:${country.code.toLowerCase()}`));
    const [dropped] = viaProfiles([aardvark]);
    assert.ok(!dropped.traits.region!.includes('region:north-africa'), 'Sudan was its only North African country');
    assert.deepEqual(dropped.continents, ['africa']);
  });

  test('the pool door and the profile door agree on regions and continents', () => {
    const changed = [withNotPresent('Aardvark', [{ code: 'SDN', status: 'uncertain' }]), withNotPresent('Yangtze Giant Softshell Turtle', [{ code: 'CHN', status: 'possibly-extinct' }])];
    assert.deepEqual(places(viaPool(changed)), places(viaProfiles(changed)));
    assert.deepEqual(places(viaPool(profiles)), places(viaProfiles(profiles)));
  });

  test('no real profile keeps a notPresent country in its country clue', () => {
    for (const profile of profiles) {
      const gone = new Set(((profile.redList as { notPresent?: NotPresent }).notPresent ?? []).map(entry => `country:${entry.code.toLowerCase()}`));
      assert.deepEqual(profileClues(profile).flatMap(clue => clue.tags).filter(tag => gone.has(tag)), [], profile.commonName);
    }
  });

  const invalid: Array<[string, NotPresent]> = [
    ['a lowercase code', [{ code: 'chn', status: 'uncertain' }]],
    ['an unknown code', [{ code: 'ZZZ', status: 'uncertain' }]],
    ['a two-letter code', [{ code: 'CN', status: 'uncertain' }]],
    ['a bad status', [{ code: 'CHN', status: 'gone' }]],
    ['a duplicate code', [{ code: 'CHN', status: 'uncertain' }, { code: 'CHN', status: 'extinct' }]],
    ['every country removed', [{ code: 'CHN', status: 'possibly-extinct' }, { code: 'VNM', status: 'extinct' }]],
  ];
  for (const [what, notPresent] of invalid) {
    test(`checkProfile rejects ${what}`, () => {
      assert.equal(notPresentProblems(withNotPresent('Yangtze Giant Softshell Turtle', notPresent)).length, 1);
    });
  }

  test('presentCountries drops the listed codes, keeps the order, and is empty without a range', () => {
    const countries = [{ code: 'AGO', name: 'Angola' }, { code: 'SDN', name: 'Sudan' }, { code: 'BWA', name: 'Botswana' }, { code: 'TCD', name: 'Chad' }];
    const redList = { notPresent: [{ code: 'TCD', status: 'uncertain' as const }, { code: 'SDN', status: 'extinct' as const }] } as AnimalProfile['redList'];
    assert.deepEqual(presentCountries({ range: { realms: [], countries }, redList }), [countries[0], countries[2]]);
    assert.deepEqual(presentCountries({ range: { realms: [], countries }, redList: {} as AnimalProfile['redList'] }), countries);
    assert.deepEqual(presentCountries({ redList }), []);
  });

  test('checkProfile accepts a valid sourced code the range maps no longer list', () => {
    assert.deepEqual(checkProfile(withNotPresent('Yangtze Giant Softshell Turtle', [{ code: 'JPN', status: 'extinct' }, { code: 'CHN', status: 'possibly-extinct' }]), sources), []);
  });
});
