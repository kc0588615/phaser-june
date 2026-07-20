import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  computeActualEliminatedIds,
  filterEliminatedCandidates,
  getEliminatedCandidateIds,
  appendReasoningEvents,
  decideGuess,
  decideCheckpointMutation,
  decideObservationIssuance,
  hydrateObservation,
  parseIssuedObservations,
  parsePrivateCase,
  parseV3EvidenceApplications,
  isUuid,
  verifyReasoningEventBatch,
  validateNodeCompletionInput,
  decideMethodChoice,
  decideQualityCheckpoint,
  qualityTierForSuccessfulNode,
  isV2SignatureInterpretationEligible,
  resolveRunCreationIdentifiers,
  validateEvidenceCitations,
} from '@/lib/runCaseState';
import { deriveMethodOfferTree } from '@/expedition/caseOffers';

describe('run case metadata', () => {
  test('accepts only valid private snapshots and issuance records', () => {
    assert.deepEqual(parsePrivateCase({ answerId: 7, chainCardIds: [1, 2, 3], caseSeed: 'a'.repeat(64) }), {
      version: 1, answerId: 7, chainCardIds: [1, 2, 3], caseSeed: 'a'.repeat(64),
    });
    assert.equal(parsePrivateCase({ answerId: 7, chainCardIds: [1, 2], caseSeed: 'secret' }), null);
    const v3 = {
      version: 3, answerId: 7, caseSeed: 'b'.repeat(64),
      familyCardIds: { relatives: 1, body: 2, behavior: 3, habits: 4, place: 5 },
      familyHintIds: {
        relatives: [10, 11, 12], body: [20, 21, 22], behavior: [30, 31, 32],
        habits: [40, 41, 42], place: [50, 51, 52],
      },
      cascadeHintIds: Array.from({ length: 12 }, (_, index) => 100 + index),
    };
    assert.deepEqual(parsePrivateCase(v3), v3);
    assert.equal(parsePrivateCase({ ...v3, familyHintIds: { ...v3.familyHintIds, place: [10, 51, 52] } }), null);
    assert.deepEqual(parseV3EvidenceApplications([{
      nodeIndex: 0, ref: 'obs-0', cardId: 1, family: 'body', actualEliminatedIds: [2, 5],
      eliminationReasons: { 2: 'body mismatch', 5: 'body mismatch' },
      candidateTraitPhrases: { 1: 'striped coat', 2: 'spiral horns', 3: 'grasping trunk', 4: 'keratin scales', 5: 'flight wings', 6: 'digging claws' },
      issuedAt: '2026-07-19T00:00:00.000Z',
    }])[0]?.eliminationReasons, { 2: 'body mismatch', 5: 'body mismatch' });
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
      traitCategory: 'morphology', compareTag: 'track:wide', isSignature: false, specificity: 1,
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
      [91, { id: 91, method: 'track' as const, observationText: 'a', inferenceText: 'a', traitCategory: 'habitat' as const, compareTag: 'wet', isSignature: false, specificity: 1 as const }],
      [92, { id: 92, method: 'observe' as const, observationText: 'b', inferenceText: 'b', traitCategory: 'key_fact' as const, compareTag: 'signature:target', isSignature: true, specificity: 3 as const }],
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

  test('eliminated candidates are rejected by server state and removed from selector input', () => {
    const events = [
      { obsRef: 'obs-0', predictedEliminatedIds: [2], actualEliminatedIds: [2, 3], correct: true, latencyMs: 10 },
      { obsRef: 'invalid', predictedEliminatedIds: [4], actualEliminatedIds: [4], correct: true, latencyMs: 10 },
    ];
    const eliminated = getEliminatedCandidateIds(events);
    assert.deepEqual([...eliminated], [2, 3]);
    assert.deepEqual(
      filterEliminatedCandidates([{ speciesId: 1 }, { speciesId: 2 }, { speciesId: 3 }], eliminated),
      [{ speciesId: 1 }],
    );
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

  test('run creation keeps optional retry identity separate from server run identity', () => {
    const requestedId = '550e8400-e29b-41d4-a716-446655440000';
    const runId = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
    assert.deepEqual(resolveRunCreationIdentifiers(requestedId, () => runId), {
      runId,
      createRequestId: requestedId,
    });
    const generated = [requestedId, runId];
    assert.deepEqual(resolveRunCreationIdentifiers(undefined, () => generated.shift()!), {
      runId,
      createRequestId: requestedId,
    });
    assert.equal(resolveRunCreationIdentifiers('old-client-value', () => runId), null);
  });
});

describe('node completion telemetry', () => {
  test('accepts bounded integer telemetry and rejects unsafe totals', () => {
    assert.deepEqual(validateNodeCompletionInput({ scoreEarned: 10, movesUsed: 4, objectiveProgress: 6 }), {
      scoreEarned: 10, movesUsed: 4, objectiveProgress: 6, bestTargetMatchLength: 0,
    });
    assert.equal(validateNodeCompletionInput({ scoreEarned: -1 }), null);
    assert.equal(validateNodeCompletionInput({ movesUsed: 1.5 }), null);
    assert.equal(validateNodeCompletionInput({ objectiveProgress: Number.POSITIVE_INFINITY }), null);
  });
});

describe('v2 choice, quality, and citation decisions', () => {
  const publicCase = {
    version: 2 as const,
    candidateIds: [1, 2, 3, 4, 5, 6],
    nodeTypes: ['riverbank_sweep', 'dense_canopy', 'storm_window'] as [string, string, string],
    boardSeeds: [1, 2, 3] as [number, number, number],
    offerTree: deriveMethodOfferTree(['riverbank_sweep', 'dense_canopy', 'storm_window']),
  };

  test('method choice validates offers, reuse, and locked retries', () => {
    assert.equal(decideMethodChoice({ publicCase, nodeIndex: 0, nodeStatus: 'active', requestedMethod: 'track', persistedMethod: null, priorMethods: [] }).kind, 'commit');
    assert.deepEqual(decideMethodChoice({ publicCase, nodeIndex: 0, nodeStatus: 'active', requestedMethod: 'observe', persistedMethod: null, priorMethods: [] }), { kind: 'reject', reason: 'not_offered' });
    assert.equal(decideMethodChoice({ publicCase, nodeIndex: 1, nodeStatus: 'active', requestedMethod: 'observe', persistedMethod: null, priorMethods: ['track'] }).kind, 'commit');
    assert.deepEqual(decideMethodChoice({ publicCase, nodeIndex: 1, nodeStatus: 'active', requestedMethod: 'track', persistedMethod: 'observe', priorMethods: ['track'] }), { kind: 'reject', reason: 'choice_locked' });
  });

  test('quality is bounded, monotone, and active-node-only', () => {
    assert.deepEqual(decideQualityCheckpoint('active', 3, 5), { kind: 'store', bestTargetMatchLength: 5 });
    assert.deepEqual(decideQualityCheckpoint('active', 5, 4), { kind: 'idempotent', bestTargetMatchLength: 5 });
    assert.deepEqual(decideQualityCheckpoint('completed', 4, 5), { kind: 'reject', reason: 'node_not_active' });
    assert.deepEqual(decideQualityCheckpoint('active', 0, 2), { kind: 'reject', reason: 'invalid_quality' });
    assert.equal(qualityTierForSuccessfulNode(6, 6, 3), 1);
    assert.equal(qualityTierForSuccessfulNode(6, 6, 4), 2);
    assert.equal(qualityTierForSuccessfulNode(6, 6, 5), 3);
    assert.equal(qualityTierForSuccessfulNode(5, 6, 8), null);
    // Cascade-only completion (no direct target match) still earns Broad.
    assert.equal(qualityTierForSuccessfulNode(6, 6, 0), 1);
  });

  test('citations require the exact interpreted issued set size', () => {
    const issued = [
      { nodeIndex: 0, ref: 'obs-0', cardId: 1, issuedAt: 'now' },
      { nodeIndex: 2, ref: 'obs-2', cardId: 2, issuedAt: 'now' },
    ];
    const interpreted = new Set(['obs-0', 'obs-2']);
    assert.deepEqual(validateEvidenceCitations(['obs-2', 'obs-0'], issued, interpreted), { ok: true, refs: ['obs-2', 'obs-0'] });
    assert.deepEqual(validateEvidenceCitations(['obs-0', 'obs-0'], issued, interpreted), { ok: false, reason: 'duplicate' });
    assert.deepEqual(validateEvidenceCitations(['obs-0'], issued, interpreted), { ok: false, reason: 'wrong_count' });
    assert.deepEqual(validateEvidenceCitations(['obs-0', 'obs-1'], issued, interpreted), { ok: false, reason: 'unissued' });
    assert.deepEqual(validateEvidenceCitations([], [], new Set()), { ok: true, refs: [] });
  });

  test('v2 signature requires at least one interpreted regular observation', () => {
    const issued = [
      { nodeIndex: 0, ref: 'obs-0', cardId: 1, issuedAt: 'now' },
      { nodeIndex: 2, ref: 'obs-2', cardId: 2, issuedAt: 'now' },
    ];
    assert.equal(isV2SignatureInterpretationEligible([], new Set()), false);
    assert.equal(isV2SignatureInterpretationEligible(issued, new Set(['obs-0'])), false);
    assert.equal(isV2SignatureInterpretationEligible(issued, new Set(['obs-0', 'obs-2'])), true);
  });
});
