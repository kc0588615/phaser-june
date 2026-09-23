import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyEvidenceCharges } from '@/expedition/evidenceFamilies';
import type { CompilerSpeciesProfile } from '@/lib/caseTraits';
import {
  computeTraitEliminatedIds, hydrateLedgerFact, ledgerEliminatedIds, parseFactLedger, selectLadderIssues, validateFamilyLadder,
} from '@/lib/evidenceLadder';

function profile(speciesId: number, dietTags: string[], taxonomyTags: string[] = []): CompilerSpeciesProfile {
  return {
    speciesId, dietTags, taxonomyTags, habitatTags: [], morphologyTags: [], behaviorTags: [],
    reproductionTags: [], geographyTags: [], conservationTags: [], keyFactTags: [], signatureTag: null,
  };
}

// Six candidates; answer 1 is a plant eater that grazes. Tags widen/narrow deliberately.
const PROFILES = [
  profile(1, ['comparison_diet:not_large_prey_hunter', 'food_source:plants', 'diet_type:herbivore']),
  profile(2, ['comparison_diet:not_large_prey_hunter', 'food_source:plants', 'diet_type:herbivore']),
  profile(3, ['comparison_diet:not_large_prey_hunter', 'food_source:plants', 'diet_type:frugivore']),
  profile(4, ['comparison_diet:not_large_prey_hunter', 'food_source:animals']),
  profile(5, ['comparison_diet:not_large_prey_hunter', 'food_source:animals']),
  profile(6, ['food_source:animals']),
];
const CARD = { family: 'habits' as const, traitCategory: 'diet' as const, compareTag: 'comparison_diet:not_large_prey_hunter' };
const rung = (sequenceIndex: number, weakTag: string) => ({ family: 'habits' as const, sequenceIndex, weakTag });

describe('evidence ladder authoring rules', () => {
  it('accepts a broad → narrow ladder that never identifies the animal alone', () => {
    const ladder = [rung(0, 'comparison_diet:not_large_prey_hunter'), rung(1, 'food_source:plants'), rung(2, 'diet_type:herbivore')];
    assert.deepEqual(validateFamilyLadder(1, CARD, ladder, PROFILES, { strict: true }), []);
  });

  it('flat repeated rungs pass safety but fail the strict narrowing rule', () => {
    const flat = [0, 1, 2].map(index => rung(index, 'comparison_diet:not_large_prey_hunter'));
    assert.deepEqual(validateFamilyLadder(1, CARD, flat, PROFILES, { strict: false }), []);
    const errors = validateFamilyLadder(1, CARD, flat, PROFILES, { strict: true });
    assert.equal(errors.length, 2);
    assert.match(errors[0], /rung-1: rung adds no new elimination/);
  });

  it('rejects tags the answer lacks, single-survivor rungs and wrong categories', () => {
    const answerLacks = [rung(0, 'comparison_diet:not_large_prey_hunter'), rung(1, 'food_source:animals'), rung(2, 'diet_type:herbivore')];
    assert.ok(validateFamilyLadder(1, CARD, answerLacks, PROFILES, { strict: false }).some(error => /answer profile lacks/.test(error)));
    const lonely = [rung(0, 'comparison_diet:not_large_prey_hunter'), rung(1, 'food_source:plants'), rung(2, 'diet_type:frugivore')];
    assert.ok(validateFamilyLadder(3, CARD, lonely, PROFILES, { strict: false }).some(error => /leaves 1 survivors/.test(error)));
    const wrongCategory = [rung(0, 'comparison_diet:not_large_prey_hunter'), rung(1, 'superorder:afrotheria'), rung(2, 'diet_type:herbivore')];
    assert.ok(validateFamilyLadder(1, CARD, wrongCategory, PROFILES, { strict: false }).some(error => /not canonical for diet/.test(error)));
    assert.ok(validateFamilyLadder(1, CARD, [rung(0, 'food_source:plants')], PROFILES, { strict: false }).some(error => /3-5 rungs/.test(error)));
  });
});

describe('evidence ladder runtime', () => {
  it('rules out only live candidates lacking the rung tag, answer-safe by construction', () => {
    assert.deepEqual(computeTraitEliminatedIds(PROFILES, [], 'diet', 'comparison_diet:not_large_prey_hunter'), [6]);
    assert.deepEqual(computeTraitEliminatedIds(PROFILES, [6], 'diet', 'food_source:plants'), [4, 5]);
    assert.deepEqual(computeTraitEliminatedIds(PROFILES, [4, 5, 6], 'diet', 'diet_type:herbivore'), [3]);
  });

  it('eliminates hard-card mismatches among live candidates only', () => {
    const profile = (speciesId: number, habitatTags: string[]) => ({ speciesId, habitatTags });
    const profiles = [profile(1, ['wet']), profile(2, []), profile(3, ['wet']), profile(4, [])];
    assert.deepEqual(computeTraitEliminatedIds(profiles, [2], 'habitat', 'wet'), [4]);
  });

  it('speaks once per swap for the largest direct match and adds signal rungs on the clearing family', () => {
    const ids = { relatives: [1, 2, 3], body: [4, 5, 6], behavior: [7, 8, 9], habits: [10, 11, 12], place: [13, 14, 15] };
    const cursors = { ...createEmptyEvidenceCharges(), habits: 1 };
    const selection = selectLadderIssues({
      directClears: { relatives: 3, body: 0, behavior: 0, habits: 4, place: 0 },
      directMatchFamilies: ['relatives', 'habits'],
      signalClearedFamily: 'relatives', signalHintCount: 2,
    }, cursors, ids);
    assert.deepEqual(selection.issues, [
      { family: 'habits', hintId: 11, rung: 1 },
      { family: 'relatives', hintId: 1, rung: 0 },
      { family: 'relatives', hintId: 2, rung: 1 },
    ]);
    assert.deepEqual(selection.reinforcedFamilies, []);
    const spent = selectLadderIssues({
      directClears: { relatives: 0, body: 0, behavior: 0, habits: 3, place: 0 }, directMatchFamilies: ['habits'],
    }, { ...cursors, habits: 3 }, ids);
    assert.deepEqual(spent, { issues: [], reinforcedFamilies: ['habits'] });
  });

  it('parses a durable ledger defensively and hydrates public facts without ids or tags', () => {
    const ledger = parseFactLedger([
      { nodeIndex: 0, moveNumber: 2, family: 'habits', hintId: 11, rung: 0, actualEliminatedIds: [6], issuedAt: 't' },
      { nodeIndex: 0, moveNumber: 2, family: 'habits', hintId: 11, rung: 0, actualEliminatedIds: [6], issuedAt: 't' },
      { nodeIndex: 1, moveNumber: 1, family: 'habits', hintId: 12, rung: 1, actualEliminatedIds: [5, 4], issuedAt: 't' },
      { nodeIndex: 3, moveNumber: 1, family: 'habits', hintId: 13, rung: 2, actualEliminatedIds: [], issuedAt: 't' },
      { nodeIndex: 0, moveNumber: 1, family: 'nope', hintId: 1, rung: 0, actualEliminatedIds: [], issuedAt: 't' },
    ]);
    assert.equal(ledger.length, 2);
    assert.deepEqual(ledger[1].actualEliminatedIds, [4, 5]);
    assert.deepEqual(ledgerEliminatedIds(ledger), [4, 5, 6]);
    const fact = hydrateLedgerFact(ledger[1], { hintText: 'Its food comes from plants.' }, { traitCategory: 'diet' }, 3);
    assert.deepEqual(fact, {
      nodeIndex: 1, moveNumber: 1, family: 'habits', traitCategory: 'diet', rung: 1, rungTotal: 3,
      factText: 'Its food comes from plants.', eliminatedIds: [4, 5],
      eliminationReasons: { 4: 'Habits fact 2 rules it out', 5: 'Habits fact 2 rules it out' },
    });
    assert.equal('hintId' in fact, false);
  });
});
