import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeActualEliminatedIds,
  decideGuess,
  filterEliminatedCandidates,
  hydrateFamilyObservation,
  isUuid,
  parseEvidenceFamilyCard,
  parsePrivateCase,
  parseV3EvidenceApplications,
  resolveFieldFacts,
  resolveRunCreationIdentifiers,
} from '@/lib/runCaseState';

const PRIVATE_CASE = {
  version: 3 as const,
  answerId: 7,
  caseSeed: 'b'.repeat(64),
  familyCardIds: { relatives: 1, body: 2, behavior: 3, habits: 4, place: 5 },
  familyHintIds: {
    relatives: [10, 11, 12], body: [20, 21, 22], behavior: [30, 31, 32],
    habits: [40, 41, 42], place: [50, 51, 52],
  },
  cascadeHintIds: Array.from({ length: 12 }, (_, index) => 100 + index),
};

describe('v3 run case metadata', () => {
  test('accepts v3 private cases and rejects old versions', () => {
    assert.deepEqual(parsePrivateCase(PRIVATE_CASE), PRIVATE_CASE);
    assert.equal(parsePrivateCase({ version: 1, answerId: 7, chainCardIds: [1, 2, 3], caseSeed: 'a'.repeat(64) }), null);
    assert.equal(parsePrivateCase({ version: 2, answerId: 7, caseSeed: 'a'.repeat(64) }), null);
    assert.equal(parsePrivateCase({ ...PRIVATE_CASE, familyHintIds: { ...PRIVATE_CASE.familyHintIds, place: [10, 51, 52] } }), null);
  });

  test('parses one evidence application per node and family', () => {
    const application = {
      nodeIndex: 0,
      ref: 'obs-0',
      cardId: 1,
      family: 'body',
      actualEliminatedIds: [2, 5],
      eliminationReasons: { 2: 'body mismatch', 5: 'body mismatch' },
      candidateTraitPhrases: {
        1: 'striped coat', 2: 'spiral horns', 3: 'grasping trunk',
        4: 'keratin scales', 5: 'flight wings', 6: 'digging claws',
      },
      issuedAt: '2026-07-19T00:00:00.000Z',
    };
    assert.deepEqual(parseV3EvidenceApplications([application]), [application]);
    assert.deepEqual(parseV3EvidenceApplications([application, application]), [application]);
  });

  test('hydrates public evidence without its database card id', () => {
    const card = parseEvidenceFamilyCard({
      id: 99,
      family: 'body',
      observationText: 'Large tracks.',
      inferenceText: 'A heavy animal passed here.',
      traitPhrase: 'large-framed',
      bonusFactText: 'Private unlock copy.',
      traitCategory: 'morphology',
      compareTag: 'gameplay_size:large',
    });
    assert.ok(card);
    const observation = hydrateFamilyObservation(card, {
      nodeIndex: 0,
      ref: 'obs-0',
      cardId: 99,
      family: 'body',
      actualEliminatedIds: [2],
      eliminationReasons: { 2: 'body mismatch' },
      candidateTraitPhrases: {
        1: 'striped coat', 2: 'spiral horns', 3: 'grasping trunk',
        4: 'keratin scales', 5: 'flight wings', 6: 'digging claws',
      },
      issuedAt: '2026-07-19T00:00:00.000Z',
    });
    assert.equal('id' in observation, false);
    assert.equal('cardId' in observation, false);
    assert.equal('bonusFactText' in observation, false);
    assert.equal('traitPhrase' in observation, false);
    assert.equal('compareTag' in observation, false);
    assert.deepEqual(observation.candidateTraitPhrases, { 2: 'spiral horns' });
  });

  test('resolves verdict facts by persisted card id and orders them by node', () => {
    const application = (nodeIndex: number, cardId: number, family: 'body' | 'place' | 'habits') => ({
      nodeIndex,
      ref: `obs-${nodeIndex}`,
      cardId,
      family,
      actualEliminatedIds: [],
      eliminationReasons: {},
      candidateTraitPhrases: {},
      issuedAt: '2026-07-19T00:00:00.000Z',
    });
    const card = (id: number, family: 'body' | 'place' | 'habits', text: string) => ({
      id,
      family,
      observationText: 'Observation.',
      inferenceText: 'Inference.',
      traitPhrase: 'trait',
      bonusFactText: text,
      traitCategory: 'morphology' as const,
      compareTag: 'tag',
    });
    assert.deepEqual(resolveFieldFacts(
      [application(2, 30, 'place'), application(0, 10, 'body'), application(1, 20, 'habits')],
      [card(20, 'habits', 'Fact two.'), card(30, 'place', 'Fact three.'), card(10, 'body', 'Fact one.')],
    ), [
      { nodeIndex: 0, family: 'body', text: 'Fact one.' },
      { nodeIndex: 1, family: 'habits', text: 'Fact two.' },
      { nodeIndex: 2, family: 'place', text: 'Fact three.' },
    ]);
  });

  test('eliminates only mismatching live candidates', () => {
    const profile = (speciesId: number, habitatTags: string[]) => ({
      speciesId,
      habitatTags,
      morphologyTags: [], dietTags: [], behaviorTags: [], reproductionTags: [],
      taxonomyTags: [], geographyTags: [], conservationTags: [], keyFactTags: [],
    });
    const profiles = [profile(1, ['wet']), profile(2, []), profile(3, ['wet']), profile(4, [])];
    assert.deepEqual(computeActualEliminatedIds(profiles, [2], 'habitat', 'wet'), [4]);
    assert.deepEqual(filterEliminatedCandidates(profiles, [2, 4]).map(item => item.speciesId), [1, 3]);
  });

  test('keeps guess state readiness-gated and terminal-idempotent', () => {
    assert.equal(decideGuess('active', 1, 1), 'not_ready');
    assert.equal(decideGuess('deduction', 2, 1), 'wrong');
    assert.equal(decideGuess('deduction', 1, 1), 'correct');
    assert.equal(decideGuess('completed', 1, 1), 'repeat_correct');
    assert.equal(decideGuess('completed', 2, 1), 'terminal_conflict');
  });

  test('validates run and retry UUIDs independently', () => {
    const requestId = '550e8400-e29b-41d4-a716-446655440000';
    const runId = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
    assert.equal(isUuid(requestId), true);
    assert.deepEqual(resolveRunCreationIdentifiers(requestId, () => runId), { runId, createRequestId: requestId });
    assert.equal(resolveRunCreationIdentifiers('old-client-value', () => runId), null);
  });
});
