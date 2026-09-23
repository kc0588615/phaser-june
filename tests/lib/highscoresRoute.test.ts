import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { drizzleToSnake } from '@/lib/drizzleToSnake';

// Execute the real route with a stub db; no DB writes.
const require = createRequire(`${process.cwd()}/package.json`);
const ts = require('typescript') as typeof import('typescript');
const compiled = ts.transpileModule(readFileSync('src/app/api/highscores/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

function route() {
  const inserted: unknown[] = [];
  const db = {
    insert: () => ({ values: (values: unknown) => ({ returning: async () => { inserted.push(values); return [{ id: 1, ...(values as object), createdAt: 'now' }]; } }) }),
  };
  const deps: Record<string, unknown> = {
    'next/server': { NextResponse: { json: (data: unknown, init?: ResponseInit) => Response.json(data, init) } },
    'drizzle-orm': { desc: () => null },
    '@/db': { db, highScores: {} },
    '@/lib/drizzleToSnake': { drizzleToSnake },
  };
  const exports: { POST?: (request: unknown) => Promise<Response> } = {};
  runInNewContext(compiled, { exports, require: (id: string) => {
    if (!(id in deps)) throw new Error(`Unmocked dependency ${id}`); return deps[id];
  }, console: { error: () => {} } });
  return { post: (json: () => Promise<unknown>) => exports.POST!({ json }), inserted };
}

test('rejects malformed bodies and bad fields with 400 and writes nothing', async () => {
  const bodies: Array<() => Promise<unknown>> = [
    async () => { throw new SyntaxError('Unexpected token'); },
    async () => null,
    async () => ({ username: 42, score: 10 }),
    async () => ({ username: 'Ada', score: 1.5 }),
    async () => ({ username: 'Ada', score: -1 }),
    async () => ({ username: 'A', score: 10 }),
  ];
  for (const json of bodies) {
    const r = route();
    assert.equal((await r.post(json)).status, 400);
    assert.equal(r.inserted.length, 0);
  }
});

test('saves a trimmed username and integer score', async () => {
  const r = route();
  const response = await r.post(async () => ({ username: '  Ada  ', score: 120 }));
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(r.inserted)), [{ username: 'Ada', score: 120 }]); // vm-realm objects
  assert.equal((await response.json()).score.created_at, 'now');
});
