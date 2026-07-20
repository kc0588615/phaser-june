import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEvidenceLogSlots } from '@/expedition/evidenceLog';
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
      { ref: 'obs-0', family: 'body', observationText: 'Body observation.', inferenceText: 'Body inference.', actualEliminatedIds: [2], isSignature: false, issuedAtMs: 1 },
      { ref: 'obs-1', family: 'habits', observationText: 'Habits observation.', inferenceText: 'Habits inference.', actualEliminatedIds: [3], isSignature: false, issuedAtMs: 2 },
      { ref: 'obs-2', family: 'place', observationText: 'Place observation.', inferenceText: 'Place inference.', actualEliminatedIds: [4], isSignature: false, issuedAtMs: 3 },
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
