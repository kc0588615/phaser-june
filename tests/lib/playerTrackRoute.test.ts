import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { isUuid } from '@/lib/runCaseState';

// Execute the real pages route with stubbed auth/db/tracking; no DB writes.
const require = createRequire(`${process.cwd()}/package.json`);
const ts = require('typescript') as typeof import('typescript');
const compiled = ts.transpileModule(readFileSync('src/pages/api/player/track.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const SESSION = '550e8400-e29b-41d4-a716-446655440000';

async function post(body: Record<string, unknown>) {
  const ended: unknown[][] = [];
  const chain: any = { from: () => chain, where: () => chain, limit: async () => [{ userId: 'player' }] };
  const deps: Record<string, unknown> = {
    '@clerk/nextjs/server': { getAuth: () => ({ userId: 'clerk' }) },
    '@/db': { db: { select: () => chain }, profiles: {} },
    'drizzle-orm': { eq: () => null },
    '@/lib/runCaseState': { isUuid },
    '@/lib/playerTracking': { endGameSession: async (...args: unknown[]) => { ended.push(args); return true; } },
  };
  const exports: { default?: (req: unknown, res: unknown) => Promise<unknown> } = {};
  runInNewContext(compiled, { exports, require: (id: string) => {
    if (!(id in deps)) throw new Error(`Unmocked dependency ${id}`); return deps[id];
  }, Promise, console: { error: () => {} } });
  let status = 200;
  const res = { status(code: number) { status = code; return res; }, json: (data: unknown) => data };
  await exports.default!({ method: 'POST', body }, res);
  return { status, ended };
}

test('endGameSession rejects non-integer or negative totals and bad session ids', async () => {
  for (const body of [
    { action: 'endGameSession', sessionId: SESSION, finalMoves: 1.5, finalScore: 10 },
    { action: 'endGameSession', sessionId: SESSION, finalMoves: 3, finalScore: -1 },
    { action: 'endGameSession', sessionId: SESSION, finalMoves: 2_147_483_648, finalScore: 10 },
    { action: 'endGameSession', sessionId: SESSION, finalMoves: '3', finalScore: 10 },
    { action: 'endGameSession', sessionId: 'not-a-uuid', finalMoves: 3, finalScore: 10 },
  ]) {
    const result = await post(body);
    assert.equal(result.status, 400);
    assert.equal(result.ended.length, 0);
  }
});

test('endGameSession passes valid totals for the authenticated player only', async () => {
  const result = await post({ action: 'endGameSession', sessionId: SESSION, finalMoves: 12, finalScore: 340, playerId: 'someone-else' });
  assert.equal(result.status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(result.ended)), [['player', SESSION, 12, 340]]);
});
