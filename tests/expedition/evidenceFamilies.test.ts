import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyEvidenceCharges,
  deriveEvidenceFamilyOffer,
  getAllowedEvidenceGemTypes,
} from '@/expedition/evidenceFamilies';

describe('evidence-family offers', () => {
  it('offers the two highest unused families', () => {
    assert.deepEqual(deriveEvidenceFamilyOffer({ relatives: 2, body: 8, behavior: 3, habits: 6, place: 1 }, []), ['body', 'habits']);
  });

  it('includes every family tied at the second-place value', () => {
    assert.deepEqual(deriveEvidenceFamilyOffer({ relatives: 5, body: 4, behavior: 4, habits: 1, place: 0 }, []), ['relatives', 'body', 'behavior']);
  });

  it('supports a four-way tie at the offer floor', () => {
    assert.deepEqual(deriveEvidenceFamilyOffer({ relatives: 8, body: 4, behavior: 4, habits: 4, place: 4 }, []), ['relatives', 'body', 'behavior', 'habits', 'place']);
    assert.deepEqual(deriveEvidenceFamilyOffer({ relatives: 8, body: 4, behavior: 4, habits: 4, place: 1 }, []), ['relatives', 'body', 'behavior', 'habits']);
  });

  it('removes selected families from choices and spawning', () => {
    const charges = { ...createEmptyEvidenceCharges(), relatives: 99, body: 4, habits: 3 };
    assert.deepEqual(deriveEvidenceFamilyOffer(charges, ['relatives']), ['body', 'habits']);
    assert.deepEqual(getAllowedEvidenceGemTypes(['relatives', 'place']), ['orange', 'yellow', 'green']);
  });

  it('always offers at least two unused families, including zero-charge ties', () => {
    const empty = createEmptyEvidenceCharges();
    assert.equal(deriveEvidenceFamilyOffer(empty, []).length, 5);
    assert.deepEqual(deriveEvidenceFamilyOffer(empty, ['relatives', 'body', 'behavior']), ['habits', 'place']);
  });
});
