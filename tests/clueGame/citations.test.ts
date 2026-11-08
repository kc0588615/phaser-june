// Citation rendering and checks: data bugs a playtest can't see (failure modes F1-F18 in
// plans/2026-11-07-fact-sources.md, written before the code).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDay, renderCitation, type CitationSource } from '@/clueGame/citations';
import { checkCitations, type AnimalProfile } from '@/clueGame/profiles';
import { poolFromRows, type ContentRows } from '@/clueGame/pool';
import { validatePool } from '@/clueGame/validatePool';
import { profiles, sources } from './contentPool';
import { clue, pool } from './testPool';

const amphibiaweb: CitationSource = { key: 'amphibiaweb', name: 'AmphibiaWeb', citeAs: '{cite} Accessed {accessed}.', license: 'CC BY-NC 4.0' };
const iucn: CitationSource = { key: 'iucn', name: 'IUCN Red List', citeAs: '{cite} Accessed on {accessed}.' };
const wikipedia: CitationSource = { key: 'wikipedia', name: 'Wikipedia', citeAs: '"{title}." Wikipedia, The Free Encyclopedia. Accessed {accessed}.', license: 'CC BY-SA 4.0' };
const AW_URL = 'https://amphibiaweb.org/species/4322';
const AW_CITE = "AmphibiaWeb 2023 Rhinoderma darwinii: Darwin's Frog <https://amphibiaweb.org/species/4322> University of California, Berkeley, CA, USA.";

test('F1: a page with no entry has no citation and is missing accessed', () => {
  assert.deepEqual(renderCitation(iucn, 'https://www.iucnredlist.org/species/1/2', undefined), { citation: null, missing: ['accessed'] });
});

test('F2: an unknown placeholder throws', () => {
  assert.throws(() => renderCitation({ ...iucn, citeAs: '{author}. {cite}' }, 'https://x.org/a', { accessed: '2026-11-08', cite: 'X.' }), /unknown placeholder \{author\}/);
});

test('F3: a bad accessed date throws', () => {
  for (const accessed of ['2026-13-01', '2026-02-30', '8 Nov 2026']) {
    assert.throws(() => renderCitation(iucn, 'https://x.org/a', { accessed, cite: 'X.' }), /accessed/, accessed);
  }
});

test('F4: a bad archive throws; a good one dates from its timestamp', () => {
  for (const archive of ['https://archive.org/web/20250617172314/https://amphibiaweb.org/species/4322', 'https://web.archive.org/web/2025061717231/https://a.org/', 'https://web.archive.org/web/20251317172314/https://a.org/', 'https://web.archive.org/web/20250617252314/https://a.org/']) {
    assert.throws(() => renderCitation(amphibiaweb, AW_URL, { accessed: '2026-11-08', cite: AW_CITE, archive }), /archive/, archive);
  }
  const archive = `https://web.archive.org/web/20250617172314/${AW_URL}`;
  const { citation } = renderCitation(amphibiaweb, AW_URL, { accessed: '2026-11-08', cite: AW_CITE, archive });
  assert.deepEqual(citation?.archive, { url: archive, date: '17 Jun 2025' });
  assert.equal(citation?.text, `${AW_CITE} Accessed 8 Nov 2026.`);
});

test('F5: a full key with no cite has no citation', () => {
  assert.deepEqual(renderCitation(amphibiaweb, AW_URL, { accessed: '2026-11-08' }), { citation: null, missing: ['cite'] });
});

test("F6: Wikipedia's title is the decoded last path segment", () => {
  const { citation } = renderCitation(wikipedia, 'https://en.wikipedia.org/wiki/Darwin%27s_frog?oldid=1#Diet', { accessed: '2026-01-01' });
  assert.equal(citation?.text, `"Darwin's frog." Wikipedia, The Free Encyclopedia. Accessed 1 Jan 2026.`);
  assert.deepEqual(renderCitation(wikipedia, 'https://en.wikipedia.org/', { accessed: '2026-01-01' }), { citation: null, missing: ['title'] });
});

test('F7: a non-full key with no cite falls back to its name', () => {
  const url = 'https://www.iucnredlist.org/species/1/2';
  assert.deepEqual(renderCitation(iucn, url, { accessed: '2026-11-08' }), {
    citation: { text: 'IUCN Red List. Accessed 8 Nov 2026.', url, license: null, archive: null },
    missing: ['cite'],
  });
});

test("F8: a page's licence beats the registry's; neither is null", () => {
  const page = { accessed: '2026-11-08', cite: AW_CITE };
  assert.equal(renderCitation(amphibiaweb, AW_URL, page).citation?.license, 'CC BY-NC 4.0');
  assert.equal(renderCitation(amphibiaweb, AW_URL, { ...page, license: 'CC BY 4.0' }).citation?.license, 'CC BY 4.0');
  assert.equal(renderCitation(iucn, 'https://x.org/a', page).citation?.license, null);
});

test('F9: formatDay uses no Date or locale', () => {
  assert.equal(formatDay('2026-01-01'), '1 Jan 2026');
  assert.equal(formatDay('2026-12-31'), '31 Dec 2026');
  assert.equal(formatDay('2024-02-29'), '29 Feb 2024');
  assert.throws(() => formatDay('2025-02-29'));
});

test('F10: a cite that still carries its own access date throws', () => {
  const cite = 'Sandoval, M. 2015. "Rhinoderma darwinii" (On-line), Animal Diversity Web. Accessed November 08, 2026 at https://animaldiversity.org/accounts/Rhinoderma_darwinii/';
  assert.throws(() => renderCitation({ ...iucn, key: 'adw' }, 'https://animaldiversity.org/accounts/Rhinoderma_darwinii/', { accessed: '2026-11-08', cite }), /Accessed/);
});

// checkCitations (F11-F15): every clue and fact page needs a dated entry; only full keys need a cite.
const base = profiles.find(profile => profile.clues.length && profile.facts.length)!;
const IUCN = 'https://www.iucnredlist.org/species/1/2';
const ADW = 'https://animaldiversity.org/accounts/X/';
const profile = (overrides: Partial<AnimalProfile>): AnimalProfile => ({ ...base, traits: {}, clues: [], facts: [], sources: { iucn: IUCN, adw: ADW, amphibiaweb: AW_URL }, ...overrides });
const day = { accessed: '2026-11-08' };

test('F11: a clue or fact page with no entry is an error naming it', () => {
  const p = profile({ clues: [{ category: 'behavior', text: 'A.', source: 'iucn' }], facts: [{ category: 'key_fact', text: 'B.', source: 'adw' }] });
  assert.deepEqual(checkCitations(p, sources, {}).errors, [`clues[0]: no citations.json entry for ${IUCN}`, `facts[0]: no citations.json entry for ${ADW}`]);
});

test("F12: an override url is checked, not the profile's page", () => {
  const other = 'https://animaldiversity.org/accounts/Y/';
  const p = profile({ facts: [{ category: 'key_fact', text: 'B.', source: 'adw', url: other }] });
  assert.deepEqual(checkCitations(p, sources, { [other]: { ...day, cite: 'Y.' } }), { errors: [], warnings: [] });
  assert.deepEqual(checkCitations(p, sources, { [ADW]: { ...day, cite: 'X.' } }).errors, [`facts[0]: no citations.json entry for ${other}`]);
});

test('F13: traits and iucn_range are not checked', () => {
  const p = profile({ traits: { size: { value: 'small', source: 'iucn' } }, clues: [{ category: 'geography', text: 'A.', source: 'iucn_range' }] });
  assert.deepEqual(checkCitations(p, sources, {}), { errors: [], warnings: [] });
});

test('F14: a non-full key with no cite warns; a full key errors', () => {
  const p = profile({ clues: [{ category: 'behavior', text: 'A.', source: 'iucn' }], facts: [{ category: 'key_fact', text: 'B.', source: 'amphibiaweb' }] });
  assert.deepEqual(checkCitations(p, sources, { [IUCN]: day, [AW_URL]: day }), {
    errors: [`facts[0]: no full amphibiaweb citation for ${AW_URL} (missing cite)`],
    warnings: [`clues[0]: iucn page ${IUCN} has no cite line yet; shows the fallback`],
  });
});

test('F15: an entry no profile cites gives nothing', () => {
  assert.deepEqual(checkCitations(profile({}), sources, { 'https://example.org/unused': day }), { errors: [], warnings: [] });
});

// Pool join and validatePool (F16-F18): every fact and hand-written clue is cited in the pool.
const cited = (url: string) => ({ name: 'IUCN Red List', url });
const sourceErrors = (report: { errors: string[] }) => report.errors.filter(error => /source page|no citation/.test(error));

test('F16: a fact or hand-written clue with no source page is an error; a template clue is not', () => {
  const handWritten = clue(1, 'behavior', 'It hides under logs.', []);
  const template = clue(1, 'habitat', 'It lives in fresh water.', ['system:freshwater'], 9);
  const report = validatePool({
    ...pool,
    clues: [...pool.clues.filter(c => c.category !== 'key_fact'), handWritten, { ...template, source: null }],
    facts: [{ speciesId: 1, category: 'key_fact', text: 'A.', sortOrder: 1 }, { speciesId: 1, category: 'key_fact', text: 'B.', sortOrder: 2, source: { name: 'IUCN Red List', url: null } }],
    citations: {},
  });
  assert.deepEqual(sourceErrors(report), [
    `clue ${handWritten.id} (Species 1, behavior): no source page`,
    'fact (Species 1, key_fact 1): no source page',
    'fact (Species 1, key_fact 2): no source page',
  ]);
});

test('F17: a cited page missing from pool.citations is an error', () => {
  const report = validatePool({
    ...pool,
    clues: pool.clues.filter(c => c.category !== 'key_fact'),
    facts: [{ speciesId: 1, category: 'key_fact', text: 'A.', sortOrder: 1, source: cited(IUCN) }, { speciesId: 1, category: 'key_fact', text: 'B.', sortOrder: 2, source: cited(ADW) }],
    citations: { [IUCN]: { text: 'X.', url: IUCN, license: null, archive: null } },
  });
  assert.deepEqual(sourceErrors(report), [`fact (Species 1, key_fact 2): no citation for ${ADW}`]);
});

test('F18: poolFromRows cites complete pages, falls back for non-full keys, skips incomplete full keys', () => {
  const fact = (sort_order: number, source_key: string, source_url: string): ContentRows['facts'][number] =>
    ({ species_id: 1, category: 'key_fact', fact_text: `Fact ${sort_order}.`, sort_order, source_key, source_name: source_key, source_url });
  const rows: ContentRows = {
    species: [{ id: 1, common_name: 'A', scientific_name: 'A a', class: 'AMPHIBIA', taxon_order: null, family: null, genus: null, conservation_code: null }],
    clues: [{ id: 1, species_id: 1, category: 'behavior', label: 'It hops.', compare_tags: [], reveal_order: 1, is_filtering: false, source_key: 'iucn', source_name: 'IUCN Red List', source_url: IUCN }],
    facts: [fact(1, 'amphibiaweb', AW_URL), fact(2, 'iucn', IUCN), fact(3, 'adw', ADW)],
  };
  const { citations } = poolFromRows(rows, { registry: [amphibiaweb, iucn, { key: 'adw', name: 'Animal Diversity Web', citeAs: '{cite} Accessed {accessed}.' }], pages: { [AW_URL]: day, [IUCN]: day, [ADW]: { ...day, cite: 'Y.' } } });
  assert.deepEqual(citations, {
    [IUCN]: { text: 'IUCN Red List. Accessed 8 Nov 2026.', url: IUCN, license: null, archive: null },
    [ADW]: { text: 'Y. Accessed 8 Nov 2026.', url: ADW, license: null, archive: null },
  });
});
