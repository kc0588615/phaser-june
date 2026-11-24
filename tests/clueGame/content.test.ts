// Invariants on the real content (db/content/): every profile complete, the pool valid.
import { test, describe } from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { validatePool } from '@/clueGame/validatePool';
import { checkCitations, checkProfile, contentRowsFromProfiles, presentCountries, profileClues, type AnimalProfile } from '@/clueGame/profiles';
import { poolFromRows } from '@/clueGame/pool';
import { animalsFromPool, animalsFromProfiles, witnessNameProblems } from '@/clueGame/questionMatchContent';
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

  // ISO aliases resolve in regions.ts but never match range.countries (Natural Earth codes), so they'd drop nothing.
  for (const [alias, naturalEarth] of [['SSD', 'SDS'], ['ESH', 'SAH']]) {
    test(`checkProfile rejects ISO alias ${alias}, naming Natural Earth ${naturalEarth}`, () => {
      const problems = notPresentProblems(withNotPresent('Yangtze Giant Softshell Turtle', [{ code: alias, status: 'uncertain' }]));
      assert.equal(problems.length, 1);
      assert.ok(problems[0].includes(`"${naturalEarth}"`), problems[0]);
    });
  }

  test('checkProfile accepts SDS, which leaves presentCountries and the country clue', () => {
    const aardvark = withNotPresent('Aardvark', [{ code: 'SDN', status: 'uncertain' }, { code: 'SDS', status: 'uncertain' }]);
    assert.deepEqual(checkProfile(aardvark, sources), []);
    assert.ok(byName('Aardvark').range!.countries.some(country => country.code === 'SDS'), 'Aardvark maps South Sudan');
    assert.ok(!presentCountries(aardvark).some(country => country.code === 'SDS'));
    // A short range so the clue names every country (past 6 it shows "and N more countries").
    aardvark.range!.countries = byName('Aardvark').range!.countries.filter(country => ['ETH', 'SDS', 'KEN'].includes(country.code));
    assert.equal(aardvark.range!.countries.length, 3);
    const names = aardvark.range!.countries.filter(country => country.code !== 'SDS').map(country => country.name);
    assert.deepEqual(countryClue(aardvark), { ...countryClue(byName('Aardvark'))!, text: `It lives in ${names.join(' and ')}.`, tags: aardvark.range!.countries.filter(country => country.code !== 'SDS').map(country => `country:${country.code.toLowerCase()}`) });
  });

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

// witnessNameProblems (plan 2026-11-24-witness-signs, S3): the authoring check that no held sign's witness sentence
// names its holder; and the pool door's unknown-tag filter. Ways they can fail:
// witnessNameProblems
//   1. misses a holder's name word in the sentence of a sign it holds: a word of its common name; a group noun or its
//      singular; its genus or species epithet; a country or region it lives in;
//   2. misses a broader sign the holder has only by implication (heldSigns);
//   3. reports a sign the animal doesn't hold, reports or throws on a null sentence, or gives a message that doesn't
//      name both the animal (commonName) and the sign;
//   4. reports anything on the real (HEAD) profiles.
// animalsFromPool
//   5. throws on an unknown open tag;
//   6. drops a known active sign, a retired sign or a trait tag (prefix:value);
//   7. doesn't warn once for each unknown open tag it drops;
//   8. stops passing the raw compareTags to isHandWrittenClue (a generated trait clue with an unknown open tag stays
//      generated; a hand-written clue whose only tag is an unknown open tag stays hand-written).
// animalsFromProfiles
//   9. stops throwing on an unknown open tag.
describe('witnessNameProblems', () => {
  const sign = (witness: string | null, implies?: string[]) => ({ category: 'body' as const, meaning: 'test sign', witness, ...(implies ? { implies } : {}) });
  // One sign per kind of name word, each sentence naming the fixture by that word alone.
  const NAMING: Record<string, string> = {
    common_word: 'It has a mossback ridge.',
    group_singular: 'It is a reptile.',
    group_plural: 'It basks like other tortoises.',
    genus_word: 'It is an Emydoidea.',
    epithet_word: 'Its name ends in quaxensis.',
    country_word: 'It is seen on Bermuda.',
    region_word: 'It ranges over the USA and Canada.',
  };
  const table = {
    ...Object.fromEntries(Object.entries(NAMING).map(([tag, witness]) => [tag, sign(witness)])),
    broad: sign('It wanders about Bermuda.'),
    narrow: sign('It has a small ridge.', ['broad']),
    unheld: sign('It is a mossback.'),
    quiet: sign(null),
    clean: sign('It has a plain ridge.'),
  };
  const fixture = (tags: string[]): AnimalProfile => {
    const profile = structuredClone(profiles.find(entry => entry.commonName === "Blanding's Turtle")!);
    profile.commonName = 'Mossback Slider';
    profile.scientificName = 'Emydoidea quaxensis';
    profile.range = { realms: [], countries: [{ code: 'BMU', name: 'Bermuda' }] };
    profile.clues = tags.map(tag => ({ category: 'morphology', text: 'It has a ridge.', tags: [tag], source: 'adw' }));
    profile.facts = [];
    return profile;
  };
  const reported = (problems: string[]) => problems.map(problem => /the witness sentence of "([^"]+)"/.exec(problem)?.[1]).sort();

  for (const [tag, witness] of Object.entries(NAMING)) {
    test(`reports ${tag} ("${witness}") with the animal and the sign`, () => {
      const problems = witnessNameProblems([fixture([tag])], table);
      assert.equal(problems.length, 1, problems.join('\n'));
      assert.ok(problems[0].startsWith('Mossback Slider: '), problems[0]);
      assert.ok(problems[0].includes(`"${tag}"`), problems[0]);
      assert.ok(problems[0].includes('____'), problems[0]);
    });
  }

  test('reports a broader sign held only by implication, not the clean narrow one', () => {
    assert.deepEqual(reported(witnessNameProblems([fixture(['narrow'])], table)), ['broad']);
  });

  test('skips unheld signs and null sentences, and passes clean ones', () => {
    assert.deepEqual(witnessNameProblems([fixture(['quiet', 'clean'])], table), []);
  });

  test('checks every profile it is given', () => {
    assert.deepEqual(reported(witnessNameProblems([fixture(['common_word', 'clean']), fixture(['narrow', 'quiet'])], table)), ['broad', 'common_word']);
  });

  test('finds nothing on the real profiles', () => {
    assert.deepEqual(witnessNameProblems(profiles), []);
  });
});

// Plan 2026-11-24-witness-signs S8: field notes are whole (no censoring). Written down first, the ways it could break:
//   1. A profile's `animal.notes` aren't exactly its hand-written clues (`profile.clues`) then its facts
//      (`profile.facts`), in profile order and whole, through animalsFromProfiles or animalsFromPool.
//   2. A note in `animal.notes` contains `____`.
//   3. One of the 16 facts once held for the reveal card (more than 2 blanks under censoring) is missing from
//      `animal.notes`, or out of profile order (1's exact match covers it).
describe('Whole field notes', () => {
  const viaProfiles = animalsFromProfiles(profiles, sources);
  const viaPool = new Map(animalsFromPool(pool).map(animal => [animal.id, animal]));
  const expected = (profile: AnimalProfile) => [...profile.clues.map(clue => clue.text), ...profile.facts.map(fact => fact.text)];

  test('notes are the hand-written clues then the facts, whole and in profile order, through both doors', () => {
    assert.equal(viaProfiles.length, profiles.length);
    assert.equal(viaPool.size, profiles.length);
    profiles.forEach((profile, i) => {
      const fromProfile = viaProfiles[i];
      const fromPool = viaPool.get(profile.id);
      assert.ok(fromPool, `${profile.commonName}: in the pool`);
      assert.deepEqual(fromProfile.notes.map(note => note.text), expected(profile), `1 ${profile.commonName} (profiles)`);
      assert.deepEqual(fromPool.notes.map(note => note.text), expected(profile), `1 ${profile.commonName} (pool)`);
      assert.deepEqual(fromPool.notes.map(note => [note.text, note.tags]), fromProfile.notes.map(note => [note.text, note.tags]), `1 ${profile.commonName}: doors agree`);
      for (const note of [...fromProfile.notes, ...fromPool.notes]) assert.ok(!note.text.includes('____'), `2 ${profile.commonName}: "${note.text}"`);
    });
  });
});

describe('Unknown signs at the doors', () => {
  const blanding = () => structuredClone(profiles.find(profile => profile.commonName === "Blanding's Turtle")!);
  const poolOf = (profile: AnimalProfile) => poolFromRows(contentRowsFromProfiles([profile]), { registry: sources, pages: citedPages });

  test('animalsFromPool skips unknown open tags with one warning each and keeps every known, retired and trait tag', () => {
    const pool = poolOf(blanding());
    const hinge = pool.clues.find(clue => clue.compareTags.includes('hinged_shell'))!;
    const scales = pool.clues.find(clue => clue.label === 'It has yellow scales on its legs and tail.')!;
    const size = pool.clues.find(clue => clue.compareTags.includes('size:small'))!;
    assert.deepEqual(scales.compareTags, [], 'fixture: a hand-written clue with no tags');
    hinge.compareTags = [...hinge.compareTags, 'tree_dweller', 'zz_unknown_one'];
    scales.compareTags = ['zz_unknown_two'];
    size.compareTags = [...size.compareTags, 'zz_unknown_three'];

    const warnings: string[] = [];
    const [animal] = animalsFromPool(pool, text => warnings.push(text));
    assert.deepEqual(warnings.sort(), ['zz_unknown_one', 'zz_unknown_three', 'zz_unknown_two'].map(tag => `Blanding's Turtle: skipping unknown sign "${tag}" from pool`));
    const tags = animal.tags ?? [];
    for (const tag of ['hinged_shell', 'tree_dweller', 'size:small', 'covering:shell']) assert.ok(tags.includes(tag), tag);
    assert.ok(!tags.some(tag => tag.startsWith('zz_')), tags.join(', '));
    // The generated size clue stays in the guide, not the notes; the tagless hand-written clue stays a note, its tag gone.
    assert.ok(animal.guide.body.some(line => line.text === size.label), 'size clue in the guide');
    assert.ok(!animal.notes.some(note => note.text === size.label), 'size clue not a note');
    const note = animal.notes.find(entry => entry.text === scales.label);
    assert.ok(note, 'hand-written clue still a note');
    assert.equal(note.tags, undefined);
  });

  test('animalsFromProfiles still throws on an unknown open tag', () => {
    const profile = blanding();
    profile.clues[0].tags = ['zz_unknown'];
    assert.throws(() => animalsFromProfiles([profile], sources), /Unknown sign "zz_unknown"/);
  });
});
