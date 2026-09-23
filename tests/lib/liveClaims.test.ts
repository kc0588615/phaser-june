import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { EMPTY_CLAIMS, decideClaim, foldHypotheses, hypothesesFromMetadata, validateExplanationEffects, claimsFromMetadata, withExplanationNote } from '@/lib/liveClaims';
import { resolveCompletedRunRoute } from '@/lib/runCompletion';
const choices = ['answer', 'wind', 'water', 'crowding'];
const open = foldHypotheses(choices, []);
const candidates = [1, 2, 3, 4, 5, 6];

test('each claim locks independently; third wrong claim slips and blocked choices cost nothing', () => {
  const species = decideClaim(EMPTY_CLAIMS, { claim: 'species', speciesId: 1 }, 1, 'answer', candidates, [], open);
  assert.ok('claims' in species); if (!species.claims) return;
  assert.equal(species.claims.species, 'locked'); assert.equal(species.resolved, false);
  const resolved = decideClaim(species.claims, { claim: 'explanation', explanationId: 'answer' }, 1, 'answer', candidates, [], open);
  assert.ok('resolved' in resolved && resolved.resolved);
  let claims = { ...EMPTY_CLAIMS };
  for (const speciesId of [2, 3, 4]) {
    const decision = decideClaim(claims, { claim: 'species', speciesId }, 1, 'answer', candidates, [], open);
    assert.ok('claims' in decision); if (!decision.claims) return;
    claims = decision.claims;
    assert.equal(decision.slipped, speciesId === 4);
  }
  assert.equal(claims.wrongClaims, 3);
  assert.deepEqual(decideClaim(EMPTY_CLAIMS, { claim: 'species', speciesId: 2 }, 1, 'answer', candidates, [2], open), { error: 'candidate_eliminated' });
  assert.deepEqual(decideClaim(EMPTY_CLAIMS, { claim: 'explanation', explanationId: 'wind' }, 1, 'answer', candidates, [], { ...open, wind: 'contradicted' }), { error: 'hypothesis_contradicted' });
  assert.equal(claimsFromMetadata({ wrongGuessCount: 2 }).wrongClaims, 2);
});

test('effect validation rejects unsafe or unsolvable cases and contradiction takes precedence', () => {
  assert.deepEqual(foldHypotheses(choices, [{ supports: ['wind'], contradicts: [] }, { supports: [], contradicts: ['wind'] }, { supports: ['wind'], contradicts: [] }]), { ...open, wind: 'contradicted' });
  assert.ok(validateExplanationEffects([{ supports: [], contradicts: ['answer'] }], choices, 'answer', false).length);
  assert.ok(validateExplanationEffects([{ supports: ['unknown'], contradicts: [] }], choices, 'answer', false).length);
  assert.ok(validateExplanationEffects([], choices, 'answer', true).length);
  assert.deepEqual(validateExplanationEffects([], choices, 'answer', false), []);
  assert.ok(validateExplanationEffects([{ supports: ['wind', 'water', 'crowding'], contradicts: [] }], choices, 'answer', false).length);
  assert.throws(() => foldHypotheses(choices, [{ supports: [], contradicts: ['answer'] }], 'answer'));
});

test('all six authored cases can contradict every wrong hypothesis without contradicting the answer', () => {
  const root = 'db/seeds/pools/prototype-six';
  const cases = readdirSync(`${root}/cases`).filter(n => n.endsWith('.json')).map(n => JSON.parse(readFileSync(`${root}/cases/${n}`, 'utf8')));
  const seeds = readdirSync(`${root}/evidence`).filter(n => n.endsWith('.json') && n !== 'cascade_hints.json').map(n => JSON.parse(readFileSync(`${root}/evidence/${n}`, 'utf8')));
  assert.equal(seeds.length, 6);
  for (const seed of seeds) {
    const c = cases.find(c => c.species_iucn_id === seed.iucn_id);
    const effects = seed.cards.flatMap((card: any) => [card.explains, ...card.hints.map((h: any) => h.explains)]);
    assert.deepEqual(validateExplanationEffects(effects, c.public.explanationChoices.map((x: any) => x.id), c.private.answerExplanationId, true), [], seed.scientific_name);
  }
});

test('only revealed saved effects fold, with no retroactive effects on legacy runs', () => {
  const metadata = { casePublic: { mystery: { explanationChoices: choices.map(id => ({ id })) } },
    casePrivate: { mystery: { answerExplanationId: 'answer' }, familyHints: [
      { id: 1, explains: { supports: ['answer'], contradicts: ['wind'] } },
      { id: 2, explains: { supports: [], contradicts: ['water'] } },
    ], familyCardEffects: { 9: { supports: [], contradicts: ['crowding'] } } },
    factLedger: [{ hintId: 1 }], evidenceApplications: [] as { cardId: number }[],
  };
  assert.deepEqual(hypothesesFromMetadata(metadata), { ...open, answer: 'supported', wind: 'contradicted' });
  metadata.evidenceApplications.push({ cardId: 9 });
  assert.equal(hypothesesFromMetadata(metadata).crowding, 'contradicted');
  assert.deepEqual(hypothesesFromMetadata({ ...metadata, casePrivate: { mystery: metadata.casePrivate.mystery } }), open);
});

test('early completion route excludes unvisited planned sites', () => {
  const route = resolveCompletedRunRoute(1, 2, [], [{ lon: 99, lat: 40 }], false);
  assert.deepEqual(route, [{ lon: 1, lat: 2, waypointSlot: 0 }]);
});

test('withExplanationNote adds public prose only for rungs with explanation effects', () => {
  const metadata = {
    casePrivate: {
      familyHintIds: { body: [11, 12] },
      familyHints: [{ id: 11, explains: { supports: ['wind'], contradicts: ['water'] } }, { id: 12 }],
    },
    casePublic: { mystery: { explanationChoices: [{ id: 'wind', label: 'Wind' }, { id: 'water', label: 'Water' }] } },
  };
  assert.deepEqual(withExplanationNote({ family: 'body', rung: 0 }, metadata), { family: 'body', rung: 0, explanationNote: 'Supports Wind · Weakens Water' });
  assert.deepEqual(withExplanationNote({ family: 'body', rung: 1 }, metadata), { family: 'body', rung: 1 });
});
