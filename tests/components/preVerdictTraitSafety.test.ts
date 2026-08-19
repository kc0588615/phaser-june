import assert from 'node:assert/strict';
import test from 'node:test';
import { eliminatedCandidateTraitPhrase } from '@/expedition/candidateTraits';
import type { EarnedObservation } from '@/types/expedition';

test('pre-verdict candidate traits are readable only for candidates that clue eliminated', () => {
  const observations: EarnedObservation[] = [{
    ref: 'obs-0',
    family: 'body',
    observationText: 'A body clue.',
    actualEliminatedIds: [2],
    candidateTraitPhrases: { 1: 'sand swimming', 2: 'light frame' },
    issuedAtMs: 1,
  }];
  assert.equal(eliminatedCandidateTraitPhrase(observations, 1, 'body'), null);
  assert.equal(eliminatedCandidateTraitPhrase(observations, 2, 'body'), 'light frame');
});
