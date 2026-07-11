import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  computeActualEliminatedIds,
  appendReasoningEvents,
  decideGuess,
  decideCheckpointMutation,
  decideObservationIssuance,
  hydrateObservation,
  parseIssuedObservations,
  parsePrivateCase,
  isUuid,
  verifyReasoningEventBatch,
  validateNodeCompletionInput,
} from '@/lib/runCaseState';

describe('run case metadata', () => {
  test('accepts only valid private snapshots and issuance records', () => {
    assert.deepEqual(parsePrivateCase({ answerId: 7, chainCardIds: [1, 2, 3], caseSeed: 'a'.repeat(64) }), {
      answerId: 7, chainCardIds: [1, 2, 3], caseSeed: 'a'.repeat(64),
    });
    assert.equal(parsePrivateCase({ answerId: 7, chainCardIds: [1, 2], caseSeed: 'secret' }), null);
    assert.deepEqual(parseIssuedObservations([
      { nodeIndex: 0, ref: 'obs-0', cardId: 91, issuedAt: '2026-07-11T00:00:00.000Z' },
      { nodeIndex: 0, ref: 'obs-0', cardId: 92, issuedAt: '2026-07-11T00:00:01.000Z' },
      { nodeIndex: 1, ref: 'wrong', cardId: 93, issuedAt: '2026-07-11T00:00:02.000Z' },
    ]), [{ nodeIndex: 0, ref: 'obs-0', cardId: 91, issuedAt: '2026-07-11T00:00:00.000Z' }]);
  });

  test('reasoning commits are issued-only and idempotent by obsRef', () => {
    const issued = [{ nodeIndex: 0, ref: 'obs-0', cardId: 91, issuedAt: 'now' }];
    const commit = { obsRef: 'obs-0', predictedEliminatedIds: [2], actualEliminatedIds: [2], correct: false, latencyMs: 500 };
    const first = appendReasoningEvents([], [commit], issued);
    assert.equal(first.rejected, false);
    assert.equal(first.events.length, 1);
    assert.equal(first.events[0].correct, true);
    assert.equal(appendReasoningEvents(first.events, [commit], issued).events.length, 1);
    assert.equal(appendReasoningEvents(first.events, [{ ...commit, obsRef: 'obs-1' }], issued).rejected, true);
  });

  test('public observation hydration never includes database card id', () => {
    const observation = hydrateObservation({
      id: 999, method: 'track', observationText: 'Tracks.', inferenceText: 'A pattern.',
      traitCategory: 'morphology', compareTag: 'track:wide', isSignature: false,
    }, 0);
    assert.equal(JSON.stringify(observation).includes('999'), false);
    assert.equal('id' in observation, false);
    assert.equal('cardId' in observation, false);
  });

  test('server maps key_fact to keyFactTags and computes sequential elimination deltas', () => {
    const issued = [
      { nodeIndex: 0, ref: 'obs-0', cardId: 91, issuedAt: 'now' },
      { nodeIndex: 1, ref: 'obs-1', cardId: 92, issuedAt: 'later' },
    ];
    const cards = new Map([
      [91, { id: 91, method: 'track' as const, observationText: 'a', inferenceText: 'a', traitCategory: 'habitat' as const, compareTag: 'wet', isSignature: false }],
      [92, { id: 92, method: 'observe' as const, observationText: 'b', inferenceText: 'b', traitCategory: 'key_fact' as const, compareTag: 'signature:target', isSignature: true }],
    ]);
    const profiles = [
      { speciesId: 1, habitatTags: ['wet'], keyFactTags: ['signature:target'] },
      { speciesId: 2, habitatTags: [], keyFactTags: [] },
      { speciesId: 3, habitatTags: ['wet'], keyFactTags: [] },
    ];
    const requested = [
      { obsRef: 'obs-1', predictedEliminatedIds: [3], actualEliminatedIds: [1, 2, 3], correct: false, latencyMs: 2 },
      { obsRef: 'obs-0', predictedEliminatedIds: [2], actualEliminatedIds: [], correct: false, latencyMs: 1 },
    ];
    const result = verifyReasoningEventBatch([], requested, issued, [1, 2, 3], cards, profiles);
    assert.equal(result.error, null);
    assert.deepEqual(result.committedRefs, ['obs-0', 'obs-1']);
    assert.deepEqual(result.events.map(event => event.actualEliminatedIds), [[2], [3]]);
    assert.deepEqual(verifyReasoningEventBatch(result.events, requested, issued, [1, 2, 3], cards, profiles).committedRefs, []);

    const skipped = verifyReasoningEventBatch([], [requested[0]], issued, [1, 2, 3], cards, profiles);
    assert.equal(skipped.error, 'out_of_order');
    const first = verifyReasoningEventBatch([], [requested[1]], issued, [1, 2, 3], cards, profiles);
    const second = verifyReasoningEventBatch(first.events, [requested[0]], issued, [1, 2, 3], cards, profiles);
    assert.deepEqual(second.events.map(event => event.actualEliminatedIds), [[2], [3]]);
  });

  test('client elimination uses symmetric profiles and only the current live set', () => {
    const profile = (speciesId: number, habitatTags: string[]) => ({
      speciesId, commonName: `Species ${speciesId}`, scientificName: `Testus ${speciesId}`,
      habitatTags, morphologyTags: [], dietTags: [], behaviorTags: [], reproductionTags: [],
      taxonomyTags: [], geographyTags: [], conservationTags: [], keyFactTags: [], signatureTag: null,
    });
    const profiles = [profile(1, ['wet']), profile(2, []), profile(3, ['wet']), profile(4, [])];
    assert.deepEqual(computeActualEliminatedIds(profiles, [2], 'habitat', 'wet'), [4]);
    assert.deepEqual(computeActualEliminatedIds(profiles, [], 'habitat', 'wet'), [2, 4]);
  });

  test('guess state transitions are readiness-gated and terminal-idempotent', () => {
    assert.equal(decideGuess('active', 1, 1), 'not_ready');
    assert.equal(decideGuess('deduction', 2, 1), 'wrong');
    assert.equal(decideGuess('deduction', 1, 1), 'correct');
    assert.equal(decideGuess('completed', 1, 1), 'repeat_correct');
    assert.equal(decideGuess('completed', 2, 1), 'terminal_conflict');
  });

  test('completed runs allow replays but reject new mutations', () => {
    assert.equal(decideObservationIssuance('completed', true), 'idempotent');
    assert.equal(decideObservationIssuance('completed', false), 'reject');
    assert.equal(decideObservationIssuance('active', false), 'allow');
    assert.equal(decideCheckpointMutation('completed', false), 'idempotent');
    assert.equal(decideCheckpointMutation('completed', true), 'reject');
    assert.equal(decideCheckpointMutation('deduction', true), 'allow');
  });

  test('UUID validation rejects malformed lock values', () => {
    assert.equal(isUuid('550e8400-e29b-41d4-a716-446655440000'), true);
    assert.equal(isUuid('not-a-uuid'), false);
  });
});

describe('node completion telemetry', () => {
  test('accepts bounded integer telemetry and rejects unsafe totals', () => {
    assert.deepEqual(validateNodeCompletionInput({ scoreEarned: 10, movesUsed: 4, objectiveProgress: 6 }), {
      scoreEarned: 10, movesUsed: 4, objectiveProgress: 6,
    });
    assert.equal(validateNodeCompletionInput({ scoreEarned: -1 }), null);
    assert.equal(validateNodeCompletionInput({ movesUsed: 1.5 }), null);
    assert.equal(validateNodeCompletionInput({ objectiveProgress: Number.POSITIVE_INFINITY }), null);
  });
});
