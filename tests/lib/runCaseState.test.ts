import { EVIDENCE_FAMILIES, createEmptyEvidenceCharges } from '@/expedition/evidenceFamilies';
import { preserveRunEvidenceHints } from '@/lib/preserveRunEvidenceHints';
import { snapshotEvidenceHints, type EvidenceHintSnapshot } from '@/lib/evidenceHintSnapshot';
import { hydrateLedgerFact, parseFactLedger, selectLadderIssues } from '@/lib/evidenceLadder';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
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
  version: 4 as const,
  answerId: 7,
  caseSeed: 'b'.repeat(64),
  familyCardIds: { relatives: 1, body: 2, behavior: 3, habits: 4, place: 5 },
  familyHintIds: {
    relatives: [10, 11, 12], body: [20, 21, 22], behavior: [30, 31, 32],
    habits: [40, 41, 42], place: [50, 51, 52],
  },
  cascadeHintIds: Array.from({ length: 12 }, (_, index) => 100 + index),
  mystery: {
    answerExplanationId: 'choice-a',
    explanationFeedback: {
      'choice-a': 'This explanation fits.',
      'choice-b': 'This explanation needs revision.',
      'choice-c': 'This explanation misses the pattern.',
    },
    resolution: {
      headline: 'Resolved.',
      diagnosis: 'The evidence supports the diagnosis.',
      evidenceChain: ['First observation.', 'Second observation.'],
      ecologicalRole: 'This species has an ecological role.',
      taxonomy: 'This species belongs to a mammal lineage.',
      misconception: 'The visible correlation was not sufficient.',
      rejectedAlternatives: ['Alternative one lacked support.', 'Alternative two lacked support.'],
      sources: [{ label: 'Source', url: 'https://example.com/source' }],
    },
  },
};

describe('v3 run case metadata', () => {
  test('accepts v4 private cases and rejects old versions', () => {
    assert.deepEqual(parsePrivateCase(PRIVATE_CASE), PRIVATE_CASE);
    assert.equal(parsePrivateCase({ version: 1, answerId: 7, chainCardIds: [1, 2, 3], caseSeed: 'a'.repeat(64) }), null);
    assert.equal(parsePrivateCase({ version: 2, answerId: 7, caseSeed: 'a'.repeat(64) }), null);
    assert.equal(parsePrivateCase({ ...PRIVATE_CASE, version: 3 }), null);
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

  test('filters eliminated candidates', () => {
    const profile = (speciesId: number, habitatTags: string[]) => ({
      speciesId,
      habitatTags,
      morphologyTags: [], dietTags: [], behaviorTags: [], reproductionTags: [],
      taxonomyTags: [], geographyTags: [], conservationTags: [], keyFactTags: [],
    });
    const profiles = [profile(1, ['wet']), profile(2, []), profile(3, ['wet']), profile(4, [])];
    assert.deepEqual(filterEliminatedCandidates(profiles, [2, 4]).map(item => item.speciesId), [1, 3]);
  });

  test('validates run and retry UUIDs independently', () => {
    const requestId = '550e8400-e29b-41d4-a716-446655440000';
    const runId = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
    assert.equal(isUuid(requestId), true);
    assert.deepEqual(resolveRunCreationIdentifiers(requestId, () => runId), { runId, createRequestId: requestId });
    assert.equal(resolveRunCreationIdentifiers('old-client-value', () => runId), null);
  });
});


describe('saved ladder compatibility across a corpus reload', () => {
  const oldCase = {
    ...PRIVATE_CASE,
    familyHintIds: { ...PRIVATE_CASE.familyHintIds, habits: [40, 41, 42, 43] },
  };
  const corpus = (): EvidenceHintSnapshot[] => EVIDENCE_FAMILIES.flatMap(family =>
    oldCase.familyHintIds[family].map(id => ({
      id, family, hintText: `Original fact ${id}`, weakTag: 'comparison_diet:not_large_prey_hunter', traitCategory: 'diet',
    })));

  test('seed preservation retains a deleted fourth rung and does not alter run state', () => {
    const rows = corpus();
    const metadata = { casePrivate: oldCase, factLedger: [], evidenceApplications: [{ ref: 'keep' }], unrelated: { keep: true } };
    const saved = preserveRunEvidenceHints(metadata, rows);
    rows.splice(rows.findIndex(row => row.id === 43), 1);
    rows.find(row => row.id === 41)!.hintText = 'Changed after seed';
    const resumed = parsePrivateCase(JSON.parse(JSON.stringify(saved)).casePrivate)!;
    assert.deepEqual(resumed.familyHintIds, oldCase.familyHintIds);
    const selected = selectLadderIssues({ directClears: { ...createEmptyEvidenceCharges(), habits: 3 }, directMatchFamilies: ['habits'] },
      { ...createEmptyEvidenceCharges(), habits: 3 }, resumed.familyHintIds);
    assert.deepEqual(selected.issues, [{ family: 'habits', hintId: 43, rung: 3 }]);
    assert.equal(resumed.familyHints!.find(row => row.id === selected.issues[0].hintId)!.hintText, 'Original fact 43');
    assert.equal(saved.unrelated, metadata.unrelated);
    assert.equal(saved.evidenceApplications, metadata.evidenceApplications);
    assert.equal(saved.factLedger, metadata.factLedger);
    assert.equal('familyHints' in metadata.casePrivate, false);
    // Subsequent seeds must not replace the preserved corpus.
    assert.equal(preserveRunEvidenceHints(saved, rows), saved);
  });

  test('resume and duplicate-move facts retain original text, category and eliminations', () => {
    const rows = corpus();
    const entry = { nodeIndex: 0, moveNumber: 2, family: 'habits', hintId: 41, rung: 1, actualEliminatedIds: [], issuedAt: '2026-09-19' };
    const saved = preserveRunEvidenceHints({ casePrivate: oldCase, factLedger: [entry] }, rows);
    const expected = hydrateLedgerFact(parseFactLedger(saved.factLedger)[0], rows.find(row => row.id === 41)!, { traitCategory: 'diet' }, 4);
    Object.assign(rows.find(row => row.id === 41)!, { hintText: 'Its food comes from plants.', weakTag: 'food_source:plants', traitCategory: 'behavior' });
    const resumed = parsePrivateCase(JSON.parse(JSON.stringify(saved)).casePrivate)!;
    const ledger = parseFactLedger(saved.factLedger);
    const hint = resumed.familyHints!.find(row => row.id === 41)!;
    const resumeFact = hydrateLedgerFact(ledger[0], hint, hint, resumed.familyHintIds.habits.length);
    const retryEntry = ledger.find(row => row.nodeIndex === 0 && row.moveNumber === 2)!;
    assert.deepEqual(resumeFact, expected);
    assert.deepEqual(hydrateLedgerFact(retryEntry, hint, hint, resumed.familyHintIds.habits.length), expected);
    assert.equal(hint.weakTag, 'comparison_diet:not_large_prey_hunter');
  });

  test('new-run snapshots survive authoring mutations and malformed snapshots fail closed', () => {
    const rows = corpus();
    const familyHints = snapshotEvidenceHints(oldCase.familyHintIds, rows);
    const saved = { ...oldCase, familyHints };
    rows[0].hintText = 'Edited';
    assert.notEqual(parsePrivateCase(saved)!.familyHints![0].hintText, 'Edited');
    assert.equal(parsePrivateCase({ ...saved, familyHints: familyHints.slice(1) }), null);
    assert.equal(parsePrivateCase({ ...saved, familyHints: familyHints.map((hint, i) => i ? hint : { ...hint, family: 'wrong' }) }), null);
    assert.equal(parsePrivateCase({ ...saved, familyHints: null }), null);
    assert.throws(() => preserveRunEvidenceHints({ casePrivate: oldCase }, rows.slice(1)), /Cannot preserve compiled evidence hint/);
  });
});
