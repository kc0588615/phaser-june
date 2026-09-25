// Science words in clue text become tappable glossary terms.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GLOSSARY, glossaryParts } from '@/clueGame/glossary';
import snapshot from '../fixtures/clueGame/pool.json';

const terms = (text: string) => glossaryParts(text).flatMap(part => typeof part === 'string' ? [] : [part.term.term]);

describe('glossaryParts', () => {
  test('splits text around terms and keeps every character', () => {
    const text = 'Reproduction: Oviparous. Clutch: 8-15 eggs.';
    const parts = glossaryParts(text);
    assert.deepEqual(terms(text), ['Oviparous', 'Clutch']);
    assert.equal(parts.map(part => typeof part === 'string' ? part : part.text).join(''), text);
  });

  test('the longest term wins and each term is marked once', () => {
    assert.deepEqual(terms('Status: Critically Endangered.'), ['Critically Endangered']);
    assert.deepEqual(terms('Endangered, and still Endangered'), ['Endangered']);
    assert.deepEqual(terms('Now functionally extinct.'), ['Functionally extinct']);
  });

  test('plurals and variants map to one term', () => {
    assert.deepEqual(terms('Smooth scutes'), ['Scute']);
    assert.deepEqual(terms('Is carnivorous.'), ['Carnivore']);
    assert.deepEqual(terms('Order: Carnivora'), ['Order', 'Carnivora']);
  });

  test('taxonomy labels only count with a colon', () => {
    assert.deepEqual(terms('Class: Amphibia, Order: Anura'), ['Class', 'Amphibia', 'Order', 'Anura']);
    assert.deepEqual(terms('It moves in order to feed.'), []);
  });

  test('text with no terms comes back whole', () => {
    assert.deepEqual(glossaryParts('Hunts alone.'), ['Hunts alone.']);
  });

  test('every Red List status in the clue text has a definition', () => {
    const pool = snapshot as { clues: Array<{ category: string; label: string }> };
    for (const clue of pool.clues.filter(c => c.category === 'conservation' && c.label.startsWith('Status: '))) {
      assert.ok(terms(clue.label).length > 0, clue.label);
    }
    assert.ok(GLOSSARY.every(entry => entry.definition.endsWith('.')), 'definitions are full sentences');
  });
});
