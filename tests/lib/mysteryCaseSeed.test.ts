import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseMysteryCaseSeed, validateAuthoredMysteryCase } from '@/lib/mysteryCase';

test('mystery case JSON parses and passes authored content validation', () => {
  const directory = path.join(process.cwd(), 'db/seeds/pools/prototype-six/cases');
  for (const file of readdirSync(directory).filter(file => file.endsWith('.json'))) {
    const raw = JSON.parse(readFileSync(path.join(directory, file), 'utf8'));
    const seed = parseMysteryCaseSeed(raw);
    assert.deepEqual(seed, raw);
    assert.deepEqual(validateAuthoredMysteryCase(seed, []), []);
  }
});
