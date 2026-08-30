import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPublicMysteryCase, parsePublicMysteryCase, validateAuthoredMysteryCase } from '@/lib/mysteryCase';
import { getMysteryCaseForIucnId } from '@/lib/mysteryCaseCatalog.server';

const SPECIES = [
  { iucnId: 512, terms: ['Addax', 'Addax nasomaculatus'] },
  { iucnId: 5_748, terms: ["De Winton's Golden Mole", 'Cryptochloris wintoni'] },
  { iucnId: 7_140, terms: ['Asian Elephant', 'Elephas maximus'] },
  { iucnId: 12_763, terms: ['Sunda Pangolin', 'Manis javanica'] },
  { iucnId: 15_955, terms: ['Tiger', 'Panthera tigris'] },
  { iucnId: 18_732, terms: ["Livingstone's Flying Fox", 'Pteropus livingstonii'] },
];

const MAP_VIEW = {
  bounds: [-2, -2, 2, 2] as [number, number, number, number],
  route: [0, 1, 2].map(nodeIndex => ({
    nodeIndex,
    lon: nodeIndex - 1,
    lat: nodeIndex - 1,
    biome: 'Test forest',
    nearestFeature: nodeIndex === 0 ? 'Research corridor' : `Site ${nodeIndex + 1}`,
  })) as import('@/expedition/mapView').ExpeditionMapView['route'],
};

describe('authored ecological mysteries', () => {
  test('validates one complete case per prototype species without public identity leaks', () => {
    for (const species of SPECIES) {
      const mystery = getMysteryCaseForIucnId(species.iucnId);
      assert.ok(mystery);
      const forbiddenTerms = species.terms.flatMap(term => [term, ...term.split(/\s+/u)]);
      assert.deepEqual(validateAuthoredMysteryCase(mystery, forbiddenTerms), []);
      const publicCase = buildPublicMysteryCase(mystery, MAP_VIEW);
      const serialized = JSON.stringify(publicCase).toLowerCase();
      for (const term of species.terms) assert.equal(serialized.includes(term.toLowerCase()), false);
      assert.equal(publicCase.location.label, 'Research corridor');
      assert.ok(publicCase.explanationChoices.length >= 3);
    }
  });

  test('public parser allowlists incident fields and drops answer-bearing extras', () => {
    const authored = getMysteryCaseForIucnId(7_140);
    assert.ok(authored);
    const expected = buildPublicMysteryCase(authored, MAP_VIEW);
    assert.deepEqual(parsePublicMysteryCase({
      ...expected,
      answerId: 99,
      answerExplanationId: authored.private.answerExplanationId,
      resolution: authored.private.resolution,
    }), expected);
  });
});
