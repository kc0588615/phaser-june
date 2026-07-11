import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  canonicalizeDeductionTag,
  countDeductionTagOverlaps,
  isCanonicalDeductionTag,
  isFilteringDeductionTag,
  isKnownTag,
  validateDeductionTagProfile,
  validateSeededSignatures,
  type DeductionTagProfile,
} from '@/lib/deductionTags';

const validProfile = (): DeductionTagProfile => ({
  habitat: ['habitat_tag:grassland'],
  morphology: ['size_bucket:horse'],
  diet: ['diet_type:carnivore'],
  behavior: ['activity_pattern:nocturnal'],
  reproduction: ['care_pattern:den'],
  taxonomy: ['family:felidae', 'genus:panthera'],
  geography: ['continent:asia'],
  conservation: ['iucn:EN'],
  key_fact: ['signature:swims_between_islands'],
  signatureTag: 'signature:swims_between_islands',
});

describe('deduction tag normalization', () => {
  test('canonicalizes legacy bare tags using category semantics', () => {
    assert.equal(canonicalizeDeductionTag('grassland', 'habitat'), 'habitat_tag:grassland');
    assert.equal(canonicalizeDeductionTag('nocturnal', 'behavior'), 'activity_pattern:nocturnal');
    assert.equal(canonicalizeDeductionTag('carnivore', 'diet'), 'diet_type:carnivore');
  });

  test('validates canonical tags and rejects bare or mixed aliases', () => {
    assert.equal(isCanonicalDeductionTag('habitat_tag:grassland', 'habitat'), true);
    assert.equal(isCanonicalDeductionTag('grassland', 'habitat'), false);
    assert.equal(isCanonicalDeductionTag('habitat_tag:habitat_tag:grassland', 'habitat'), false);
    assert.equal(canonicalizeDeductionTag('diet_type:carnivore', 'behavior'), null);
    assert.equal(isCanonicalDeductionTag('toString:x', 'behavior'), false);
    assert.equal(isCanonicalDeductionTag('iucn:bogus', 'conservation'), false);
    assert.equal(isCanonicalDeductionTag('family:Felidae', 'taxonomy'), false);
  });

  test('rejects tags outside their semantic home', () => {
    assert.equal(isCanonicalDeductionTag('foraging_style:ambush', 'diet'), false);
    assert.equal(isCanonicalDeductionTag('foraging_style:ambush', 'behavior'), true);
    assert.equal(isCanonicalDeductionTag('continent:africa', 'habitat'), false);
    assert.equal(isCanonicalDeductionTag('threat_tag:mining', 'conservation'), true);
    assert.equal(isCanonicalDeductionTag('threat_tag:urban_development', 'conservation'), true);
    assert.equal(isCanonicalDeductionTag('threat_tag:urban_development', 'geography'), false);
  });

  test('requires signature membership exactly once', () => {
    assert.deepEqual(validateDeductionTagProfile(validProfile()), []);

    const missing = validProfile();
    missing.key_fact = [];
    assert.match(validateDeductionTagProfile(missing).join('\n'), /must occur exactly once/u);

    const duplicated = validProfile();
    duplicated.key_fact = [...duplicated.key_fact, duplicated.signatureTag!];
    assert.match(validateDeductionTagProfile(duplicated).join('\n'), /duplicate tag/u);
  });

  test('allows a signature in its single semantic host category', () => {
    const profile = validProfile();
    profile.key_fact = [];
    profile.morphology = ['size_bucket:horse', profile.signatureTag!];

    assert.equal(isCanonicalDeductionTag(profile.signatureTag!, 'morphology'), true);
    assert.deepEqual(validateDeductionTagProfile(profile), []);

    profile.key_fact = ['signature:undeclared_fact'];
    assert.match(validateDeductionTagProfile(profile).join('\n'), /undeclared signature tag/u);
  });

  test('genus and misc tags cannot filter', () => {
    assert.equal(isFilteringDeductionTag('family:felidae'), true);
    assert.equal(isFilteringDeductionTag('genus:panthera'), false);
    assert.equal(isFilteringDeductionTag('misc:tracks_rainfall'), false);
    assert.equal(isCanonicalDeductionTag('misc:tracks_rainfall', 'behavior'), false);
  });

  test('validates seeded signatures against the full resulting corpus', () => {
    const first = { id: 1, ...validProfile() };
    const second = { id: 2, ...validProfile(), key_fact: ['signature:other'], signatureTag: 'signature:other' };
    assert.deepEqual(validateSeededSignatures([first, second], new Set([1])), []);

    second.morphology = [...second.morphology, first.signatureTag!];
    second.signatureTag = first.signatureTag!;
    const errors = validateSeededSignatures([first, second], new Set([1]));
    assert.match(errors.join('\n'), /must occur exactly once in profile corpus/u);
    assert.match(errors.join('\n'), /another profile's signature/u);

    const missing = { id: 3, ...validProfile(), key_fact: [], signatureTag: null };
    assert.match(validateSeededSignatures([missing], new Set([3])).join('\n'), /requires a signature tag/u);
  });

  test('reports sorted shared tags by category', () => {
    const second = validProfile();
    second.habitat = ['habitat_tag:grassland', 'habitat_tag:savanna'];
    const overlaps = countDeductionTagOverlaps([validProfile(), second]);
    assert.deepEqual(overlaps.habitat, [{ tag: 'habitat_tag:grassland', count: 2 }]);
    assert.deepEqual(overlaps.key_fact, [{ tag: 'signature:swims_between_islands', count: 2 }]);
  });

  test('preserves permissive legacy tag recognition outside strict seed validation', () => {
    assert.equal(isKnownTag('nocturnal'), true);
    assert.equal(isKnownTag('misc:legacy_note'), true);
    assert.equal(isCanonicalDeductionTag('misc:legacy_note', 'behavior'), false);
  });
});
