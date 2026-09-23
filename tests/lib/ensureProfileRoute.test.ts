import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const require = createRequire(`${process.cwd()}/package.json`);
const ts = require('typescript') as typeof import('typescript');

// selects: rows returned by each successive select; inserted: rows the insert "wins" with.
function ensureProfile(selects: Array<Array<{ userId: string }>>, inserted: Array<{ userId: string }>) {
  const db = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => selects.shift() ?? [] }) }) }),
    insert: () => ({ values: () => ({ onConflictDoNothing: () => ({ returning: async () => inserted }) }) }),
  };
  const deps: Record<string, unknown> = {
    '@clerk/nextjs/server': {
      getAuth: () => ({ userId: 'clerk-1' }),
      clerkClient: async () => ({ users: { getUser: async () => ({ username: 'ranger', imageUrl: null }) } }),
    },
    '@/db': { db, profiles: { userId: 'user_id', clerkUserId: 'clerk_user_id' } },
    'drizzle-orm': { eq: () => null },
    crypto: { randomUUID: () => 'new-id' },
  };
  const code = ts.transpileModule(readFileSync('src/pages/api/player/ensure-profile.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: { default?: (req: unknown, res: unknown) => Promise<unknown> } = {};
  runInNewContext(code, { exports, require: (id: string) => {
    if (!(id in deps)) throw new Error(`Unmocked dependency ${id}`);
    return deps[id];
  }, console: { error: () => {} }, Promise });
  return async () => {
    const out: { status: number; body?: any } = { status: 200 };
    const res = { status(code: number) { out.status = code; return res; }, json(body: unknown) { out.body = body; return res; } };
    await exports.default!({ method: 'POST' }, res);
    return out;
  };
}

test('ensure-profile creates a profile when none exists', async () => {
  const out = await ensureProfile([[]], [{ userId: 'new-id' }])();
  assert.deepEqual(JSON.parse(JSON.stringify(out)), { status: 200, body: { playerId: 'new-id', isNew: true } });
});

test('ensure-profile returns the concurrent winner instead of failing on the unique clerk id', async () => {
  const out = await ensureProfile([[], [{ userId: 'winner' }]], [])();
  assert.deepEqual(JSON.parse(JSON.stringify(out)), { status: 200, body: { playerId: 'winner', isNew: false } });
});
