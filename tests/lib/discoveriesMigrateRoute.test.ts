import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

const require = createRequire(`${process.cwd()}/package.json`);
const ts = require('typescript') as typeof import('typescript');

function migrateRoute(authPlayerId: string | null) {
  const inserted: any[] = [];
  const db = {
    select: () => ({ from: () => ({ where: async () => [{ id: 7 }, { id: 8 }] }) }),
    insert: () => ({ values: (rows: any[]) => ({ onConflictDoNothing: () => ({ returning: async () => {
      inserted.push(...rows); return rows.map((_, id) => ({ id }));
    } }) }) }),
  };
  const deps: Record<string, unknown> = {
    'drizzle-orm': { inArray: () => null },
    'next/server': { NextResponse: { json: (data: unknown, init?: ResponseInit) => Response.json(data, init) } },
    '@/db': { db, speciesTable: { id: 'id' }, playerSpeciesDiscoveries: { id: 'id' } },
    '@/lib/authHelpers': { getPlayerIdFromClerk: async () => authPlayerId },
  };
  const code = ts.transpileModule(readFileSync('src/app/api/discoveries/migrate/route.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: { POST?: (request: unknown) => Promise<Response> } = {};
  runInNewContext(code, { exports, require: (id: string) => {
    if (!(id in deps)) throw new Error(`Unmocked dependency ${id}`);
    return deps[id];
  }, console: { log: () => {}, error: () => {} }, Date });
  return { post: (body: unknown) => exports.POST!({ json: async () => body }), inserted };
}

const discoveries = [{ id: 7, idSource: 'species.id', discoveredAt: 'not a date' }, { id: 8, idSource: 'species.id', discoveredAt: '2026-01-02T00:00:00Z' }];

test('discoveries migrate requires a signed-in player', async () => {
  const route = migrateRoute(null);
  const response = await route.post({ userId: 'victim', discoveries });
  assert.equal(response.status, 401);
  assert.equal(route.inserted.length, 0);
});

test('discoveries migrate writes for the session player, never the body userId', async () => {
  const route = migrateRoute('me');
  const response = await route.post({ userId: 'victim', discoveries });
  assert.equal(response.status, 200);
  assert.deepEqual(route.inserted.map(row => row.playerId), ['me', 'me']);
});

test('discoveries migrate replaces invalid discoveredAt instead of failing the batch', async () => {
  const route = migrateRoute('me');
  await route.post({ discoveries });
  assert.equal(route.inserted.length, 2);
  assert.ok(route.inserted.every(row => !Number.isNaN(row.discoveredAt.getTime())));
  assert.equal(route.inserted[1].discoveredAt.toISOString(), '2026-01-02T00:00:00.000Z');
});
