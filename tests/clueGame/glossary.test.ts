// Glossary markup runs over every clue; a playtest reads only a few of them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLOSSARY, glossaryParts } from '@/clueGame/glossary';
import snapshot from '../fixtures/clueGame/pool.json';

const terms = (text: string) => glossaryParts(text).flatMap(part => typeof part === 'string' ? [] : [part.term.term]);

test('marking terms keeps every character of the text', () => {
  const text = 'Reproduction: Oviparous. Clutch: 8-15 eggs.';
  assert.deepEqual(terms(text), ['Oviparous', 'Clutch']);
  assert.equal(glossaryParts(text).map(part => typeof part === 'string' ? part : part.text).join(''), text);
});

test('every Red List status in the clue text has a definition', () => {
  const pool = snapshot as { clues: Array<{ category: string; label: string }> };
  for (const clue of pool.clues.filter(c => c.category === 'conservation' && c.label.startsWith('Status: '))) {
    assert.ok(terms(clue.label).length > 0, clue.label);
  }
  assert.ok(GLOSSARY.every(entry => entry.definition.endsWith('.')), 'definitions are full sentences');
});
