import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEvidenceContrastOptions, buildEvidenceLogSlots, buildIssuedEvidenceLogSlots, getEvidenceContrastMode } from '@/expedition/evidenceLog';
import type { CaseState } from '@/types/expedition';

test('evidence log keeps all three observation, inference, and ruled-out trails', () => {
  const profiles = [1, 2, 3, 4, 5, 6].map(speciesId => ({
    speciesId,
    commonName: `Candidate ${speciesId}`,
    scientificName: `Species ${speciesId}`,
  }));
  const caseState = {
    profiles,
    observations: [
      { ref: 'obs-0', family: 'body', observationText: 'Body observation.', inferenceText: 'Body inference.', actualEliminatedIds: [2], issuedAtMs: 1 },
      { ref: 'obs-1', family: 'habits', observationText: 'Habits observation.', inferenceText: 'Habits inference.', actualEliminatedIds: [3], issuedAtMs: 2 },
      { ref: 'obs-2', family: 'place', observationText: 'Place observation.', inferenceText: 'Place inference.', actualEliminatedIds: [4], issuedAtMs: 3 },
    ],
  } as unknown as CaseState;
  const slots = buildEvidenceLogSlots(caseState);
  assert.deepEqual(slots.map(slot => ({
    observation: slot.observation?.observationText,
    inference: slot.inference,
    ruledOut: slot.ruledOut,
  })), [
    { observation: 'Body observation.', inference: 'Body inference.', ruledOut: ['Candidate 2'] },
    { observation: 'Habits observation.', inference: 'Habits inference.', ruledOut: ['Candidate 3'] },
    { observation: 'Place observation.', inference: 'Place inference.', ruledOut: ['Candidate 4'] },
  ]);
});

test('compact evidence log omits unissued slots', () => {
  const caseState = {
    profiles: [{ speciesId: 1, commonName: 'Candidate 1', scientificName: 'Species 1' }],
    observations: [
      { ref: 'obs-0', family: 'body', observationText: 'Body observation.', actualEliminatedIds: [], issuedAtMs: 1 },
    ],
  } as unknown as CaseState;

  assert.deepEqual(buildIssuedEvidenceLogSlots(caseState).map(slot => slot.nodeIndex), [0]);
  assert.deepEqual(buildIssuedEvidenceLogSlots({ ...caseState, observations: [] }).map(slot => slot.nodeIndex), []);
});

test('contrast offers only candidates eliminated by that observation', () => {
  const caseState = {
    profiles: [1, 2, 3].map(speciesId => ({
      speciesId,
      commonName: `Candidate ${speciesId}`,
      scientificName: `Species ${speciesId}`,
    })),
    observations: [{
      ref: 'obs-0',
      family: 'body',
      observationText: 'Body observation.',
      actualEliminatedIds: [2, 3],
      eliminationReasons: { 2: 'body mismatch', 3: 'body mismatch' },
      candidateTraitPhrases: { 1: 'answer trait', 2: 'light frame', 3: 'winged frame' },
      issuedAtMs: 1,
    }],
  } as unknown as CaseState;

  assert.deepEqual(buildEvidenceContrastOptions(caseState, caseState.observations[0]), [
    { speciesId: 2, commonName: 'Candidate 2', candidateTrait: 'light frame', eliminationReason: 'body mismatch' },
    { speciesId: 3, commonName: 'Candidate 3', candidateTrait: 'winged frame', eliminationReason: 'body mismatch' },
  ]);
  assert.equal(JSON.stringify(buildEvidenceContrastOptions(caseState, caseState.observations[0])).includes('Candidate 1'), false);
  assert.equal(JSON.stringify(buildEvidenceContrastOptions(caseState, caseState.observations[0])).includes('answer trait'), false);
});

test('why-ruled-out hides without an eliminated candidate phrase', () => {
  const caseState = {
    profiles: [{ speciesId: 2, commonName: 'Candidate 2', scientificName: 'Species 2' }],
    observations: [{
      ref: 'obs-0',
      family: 'body',
      observationText: 'Body observation.',
      actualEliminatedIds: [2],
      candidateTraitPhrases: {},
      issuedAtMs: 1,
    }],
  } as unknown as CaseState;

  assert.deepEqual(buildEvidenceContrastOptions(caseState, caseState.observations[0]), []);
  assert.deepEqual(buildEvidenceContrastOptions({
    ...caseState,
    observations: [{ ...caseState.observations[0], actualEliminatedIds: [], candidateTraitPhrases: { 2: 'light frame' } }],
  }, { ...caseState.observations[0], actualEliminatedIds: [], candidateTraitPhrases: { 2: 'light frame' } }), []);
});

test('one eliminated candidate is direct; multiple candidates use a selector', () => {
  const base = {
    version: 3,
    stage: 'board',
    profiles: [1, 2, 3].map(speciesId => ({
      speciesId,
      commonName: `Candidate ${speciesId}`,
      scientificName: `Species ${speciesId}`,
    })),
    observations: [{
      ref: 'obs-0',
      family: 'body',
      observationText: 'Body observation.',
      inferenceText: 'Body inference.',
      actualEliminatedIds: [2],
      eliminationReasons: { 2: 'body mismatch' },
      candidateTraitPhrases: { 2: 'light frame' },
      issuedAtMs: 1,
    }],
  } as unknown as CaseState;
  const single = buildEvidenceContrastOptions(base, base.observations[0]);
  assert.equal(getEvidenceContrastMode(single), 'direct');
  assert.equal(single[0].candidateTrait, 'light frame');

  const multipleCase = {
    ...base,
    observations: [{
      ...base.observations[0],
      actualEliminatedIds: [2, 3],
      eliminationReasons: { 2: 'body mismatch', 3: 'body mismatch' },
      candidateTraitPhrases: { 2: 'light frame', 3: 'winged frame' },
    }],
  };
  const multiple = buildEvidenceContrastOptions(multipleCase, multipleCase.observations[0]);
  assert.equal(getEvidenceContrastMode(multiple), 'selector');
  assert.deepEqual(multiple.map(option => option.commonName), ['Candidate 2', 'Candidate 3']);
  assert.equal(getEvidenceContrastMode([]), 'hidden');
});
