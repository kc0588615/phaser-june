import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPublicMysteryCase, parsePublicMysteryCase, validateAuthoredMysteryCase, validatePublicMysteryCase } from '@/lib/mysteryCase';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseMysteryCaseSeed } from '@/lib/mysteryCase';

const seedDirectory = path.join(process.cwd(), 'db/seeds/pools/prototype-six/cases');
const seededCases = readdirSync(seedDirectory).filter(file => file.endsWith('.json'))
  .map(file => parseMysteryCaseSeed(JSON.parse(readFileSync(path.join(seedDirectory, file), 'utf8'))));
const getMysteryCaseForIucnId = (id: number) => seededCases.find(seed => seed.species_iucn_id === id) ?? null;

const SPECIES = [
  { iucnId: 512, terms: ['Addax', 'Addax nasomaculatus'] },
  { iucnId: 5_748, terms: ["De Winton's Golden Mole", 'Cryptochloris wintoni'] },
  { iucnId: 7_140, terms: ['Asian Elephant', 'Elephas maximus'] },
  { iucnId: 12_763, terms: ['Sunda Pangolin', 'Manis javanica'] },
  { iucnId: 15_955, terms: ['Tiger', 'Panthera tigris'] },
  { iucnId: 18_732, terms: ["Livingstone's Flying Fox", 'Pteropus livingstonii'] },
];

function mapViewWith(nearestFeature: string, biome = 'Test forest') {
  return {
    bounds: [-2, -2, 2, 2] as [number, number, number, number],
    route: [0, 1, 2].map(nodeIndex => ({
      nodeIndex,
      lon: nodeIndex - 1,
      lat: nodeIndex - 1,
      biome: nodeIndex === 0 ? biome : 'Test forest',
      nearestFeature: nodeIndex === 0 ? nearestFeature : `Site ${nodeIndex + 1}`,
    })) as import('@/expedition/mapView').ExpeditionMapView['route'],
  };
}

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

  test('omits GIS location labels that contain answer terms', () => {
    const tiger = getMysteryCaseForIucnId(15_955);
    const addax = getMysteryCaseForIucnId(512);
    assert.ok(tiger);
    assert.ok(addax);
    const tigerTerms = ['Tiger', 'Panthera tigris', 'Panthera'];
    const addaxTerms = ['Addax', 'Addax nasomaculatus'];

    const tigerPublic = buildPublicMysteryCase(tiger, mapViewWith('Tiger Reserve'), tigerTerms);
    assert.equal(tigerPublic.location.label, 'Test forest');
    assert.equal(JSON.stringify(tigerPublic).toLowerCase().includes('tiger'), false);
    assert.deepEqual(validatePublicMysteryCase(tigerPublic, tigerTerms), []);

    const addaxPublic = buildPublicMysteryCase(addax, mapViewWith('Addax watering hole', 'Addax range'), addaxTerms);
    assert.equal(addaxPublic.location.label, 'Selected survey region');
    assert.equal(JSON.stringify(addaxPublic).toLowerCase().includes('addax'), false);
    assert.deepEqual(validatePublicMysteryCase(addaxPublic, addaxTerms), []);
  });

  test('rejects a built public case whose location still names the answer', () => {
    const tiger = getMysteryCaseForIucnId(15_955);
    assert.ok(tiger);
    const leaking = buildPublicMysteryCase(tiger, mapViewWith('Tiger Reserve'));
    assert.equal(leaking.location.label, 'Tiger Reserve');
    assert.ok(validatePublicMysteryCase(leaking, ['Tiger']).some(error => error.includes('tiger')));
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
