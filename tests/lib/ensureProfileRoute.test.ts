import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const require = createRequire(`${process.cwd()}/package.json`);
const ts = require('typescript') as typeof import('typescript');

// selects: rows returned by each successive select (clerk id, then username, then winner);
// inserted: rows the insert "wins" with. `values` records what the route tried to insert.
function ensureProfile(selects: Array<Array<{ userId: string }>>, inserted: Array<{ userId: string }>) {
  const values: Array<{ username: string }> = [];
  const db = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => selects.shift() ?? [] }) }) }),
    insert: () => ({ values: (row: { username: string }) => { values.push(row); return { onConflictDoNothing: () => ({ returning: async () => inserted }) }; } }),
  };
  const deps: Record<string, unknown> = {
    '@clerk/nextjs/server': {
      getAuth: () => ({ userId: 'clerk-1' }),
      clerkClient: async () => ({ users: { getUser: async () => ({ username: 'ranger', imageUrl: null }) } }),
    },
    '@/db': { db, profiles: { userId: 'user_id', clerkUserId: 'clerk_user_id', username: 'username' } },
    'drizzle-orm': { eq: () => null },
    crypto: { randomUUID: () => 'abcdef12-3456-7890-abcd-ef1234567890' },
  };
  const code = ts.transpileModule(readFileSync('src/pages/api/player/ensure-profile.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: { default?: (req: unknown, res: unknown) => Promise<unknown> } = {};
  runInNewContext(code, { exports, require: (id: string) => {
    if (!(id in deps)) throw new Error(`Unmocked dependency ${id}`);
    return deps[id];
  }, console: { error: () => {} }, Promise });
  const call = async () => {
    const out: { status: number; body?: any } = { status: 200 };
    const res = { status(code: number) { out.status = code; return res; }, json(body: unknown) { out.body = body; return res; } };
    await exports.default!({ method: 'POST' }, res);
    return out;
  };
  return Object.assign(call, { values });
}

test('ensure-profile creates a profile when none exists', async () => {
  const out = await ensureProfile([[]], [{ userId: 'new-id' }])();
  assert.deepEqual(JSON.parse(JSON.stringify(out)), { status: 200, body: { playerId: 'new-id', isNew: true } });
});

test('ensure-profile returns the concurrent winner instead of failing on the unique clerk id', async () => {
  const out = await ensureProfile([[], [], [{ userId: 'winner' }]], [])();
  assert.deepEqual(JSON.parse(JSON.stringify(out)), { status: 200, body: { playerId: 'winner', isNew: false } });
});

test('ensure-profile keeps a free username as-is', async () => {
  const route = ensureProfile([[], []], [{ userId: 'new-id' }]);
  await route();
  assert.equal(route.values[0].username, 'ranger');
});

test('ensure-profile suffixes a username another player already has instead of failing', async () => {
  const route = ensureProfile([[], [{ userId: 'someone-else' }]], [{ userId: 'new-id' }]);
  const out = await route();
  assert.equal(out.status, 200);
  assert.equal(route.values[0].username, 'ranger-abcdef');
});
