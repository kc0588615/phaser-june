import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import * as claims from '@/lib/liveClaims';
import * as caseState from '@/lib/runCaseState';
import * as ladder from '@/lib/evidenceLadder';
import * as completion from '@/lib/runCompletion';
import { getGuessBonuses } from '@/types/expedition';

const require = createRequire(`${process.cwd()}/package.json`);
const ts = require('typescript') as typeof import('typescript');
const compiled = ts.transpileModule(readFileSync('src/app/api/runs/[runId]/guess/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const authored = JSON.parse(readFileSync('db/seeds/pools/prototype-six/cases/tracks-without-footprints.json', 'utf8'));
const runId = '11111111-1111-4111-8111-111111111111';
const requestId = (n: number) => `22222222-2222-4222-8222-${String(n).padStart(12, '0')}`;

function harness(options: { gisFailure?: boolean; wrongGuessCount?: number; eliminated?: number[] } = {}) {
  const session: any = { id: runId, playerId: 'player', runStatus: 'active', scoreTotal: 100, nodeIndexCurrent: 1,
    nodeCountPlanned: 3, selectedLng: 1, selectedLat: 2, locationKey: 'test', speciesDiscoveredCount: 0,
    metadata: { wrongGuessCount: options.wrongGuessCount ?? 0, casePublic: { candidateIds: [1, 2, 3, 4, 5, 6], mystery: authored.public },
      casePrivate: { version: 4, answerId: 1, caseSeed: 'a'.repeat(64), mystery: authored.private,
        familyCardIds: { relatives: 1, body: 2, behavior: 3, habits: 4, place: 5 },
        familyHintIds: { relatives: [1, 2, 3], body: [4, 5, 6], behavior: [7, 8, 9], habits: [10, 11, 12], place: [13, 14, 15] },
        cascadeHintIds: Array.from({ length: 12 }, (_, i) => 30 + i),
      },
      factLedger: options.eliminated ? [{ nodeIndex: 0, moveNumber: 1, family: 'body', hintId: 4, rung: 0, actualEliminatedIds: options.eliminated, issuedAt: 'now' }] : [],
    },
  };
  const nodes = [1, 2, 3].map(nodeOrder => ({ id: `node-${nodeOrder}`, runId, nodeOrder, nodeStatus: nodeOrder === 1 ? 'active' : 'locked', movesUsed: 0,
    boardContext: { waypoint: { lon: nodeOrder, lat: nodeOrder + 1, slot: nodeOrder - 1 } } }));
  const inserts: Array<{ table: string; value: any }> = [];
  const names = ['ecoRunSessions', 'ecoRunNodes', 'runMemories', 'evidenceFamilyCards', 'playerSpeciesDiscoveries', 'speciesCards', 'speciesCardUnlocks', 'speciesTable', 'ecoLocationMastery'];
  const tables: any = Object.fromEntries(names.map(name => [name, new Proxy({ name }, { get: (target, field) => field === 'name' ? target.name : { table: name, field } })]));
  const eq = (col: any, value: unknown) => (row: any) => row[col.field] === value;
  const chain = (rows: any[]): any => ({ where: (predicate: any) => chain(rows.filter(predicate)), limit: (n: number) => chain(rows.slice(0, n)), orderBy: () => chain(rows), then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject) });
  const tx: any = {
    execute: async () => {},
    select: () => ({ from: (table: any) => chain(table.name === 'ecoRunSessions' ? [session] : table.name === 'ecoRunNodes' ? nodes : table.name === 'speciesTable' ? [{ id: 1, conservationCode: 'EN' }] : []) }),
    update: (table: any) => ({ set: (values: any) => ({ where: async (predicate: any) => {
      for (const row of table.name === 'ecoRunSessions' ? [session] : table.name === 'ecoRunNodes' ? nodes : []) {
        if (predicate(row)) Object.assign(row, values);
      }
    } }) }),
    insert: (table: any) => ({ values: (value: any) => {
      inserts.push({ table: table.name, value });
      return { onConflictDoNothing: async () => {}, onConflictDoUpdate: async () => {}, then: (resolve: any) => Promise.resolve().then(resolve) };
    } }),
  };
  let tail = Promise.resolve();
  const db = { transaction: (callback: any) => {
    const result = tail.then(() => callback(tx)); tail = result.then(() => {}, () => {}); return result;
  } };
  const deps: Record<string, unknown> = {
    'drizzle-orm': { eq, and: (...predicates: any[]) => (row: any) => predicates.every(p => p(row)), inArray: (col: any, values: unknown[]) => (row: any) => values.includes(row[col.field]), sql: () => 1 },
    'next/server': { NextResponse: { json: (data: unknown, init?: ResponseInit) => Response.json(data, init) } },
    '@/db': { ...tables, db }, '@/lib/authHelpers': { getPlayerIdFromClerk: async () => 'player' },
    '@/lib/liveClaims': claims, '@/lib/runCaseState': caseState, '@/lib/evidenceLadder': ladder,
    '@/lib/runCompletion': completion, '@/lib/gisFeatureSampling': { sampleGisFeaturesForRoute: async () => { if (options.gisFailure) throw new Error('fixture GIS unavailable'); return []; } },
    '@/lib/speciesCardProgression': { getSpeciesCardRarityTier: () => 'rare' },
    '@/lib/speciesCardProgression.server': { refreshSpeciesCardProgress: async () => {} },
    '@/types/expedition': { getGuessBonuses },
  };
  const exports: any = {};
  runInNewContext(compiled, { exports, console: { error: () => {} }, require: (id: string) => {
    if (!(id in deps)) throw new Error(`Unmocked ${id}`); return deps[id];
  } });
  return { session, nodes, inserts, post: (input: any, id: number) => exports.POST({ json: async () => ({ ...input, requestId: requestId(id) }) }, { params: Promise.resolve({ runId }) }) as Promise<Response> };
}

test('early independent claims resolve once, skip unfinished sites and retain visited route only', async () => {
  const h = harness();
  const first = await h.post({ claim: 'species', speciesId: 1 }, 1);
  assert.equal(first.status, 200); assert.equal((await first.json()).resolved, false);
  assert.equal(h.session.runStatus, 'active'); assert.equal(h.inserts.length, 0);
  const body = { claim: 'explanation', explanationId: authored.private.answerExplanationId };
  const [a, b] = await Promise.all([h.post(body, 2), h.post(body, 2)]);
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  assert.equal((await a.json()).resolved, true); assert.equal((await b.json()).duplicate, true);
  assert.equal(h.session.runStatus, 'completed');
  assert.ok(h.nodes.every(node => node.nodeStatus === 'skipped'));
  assert.equal(h.inserts.filter(row => row.table === 'playerSpeciesDiscoveries').length, 1);
  assert.equal(h.inserts.filter(row => row.table === 'runMemories').length, 1);
  const memory = h.inserts.find(row => row.table === 'runMemories')!.value;
  assert.equal(memory.finalScore, 550);
  assert.ok(memory.routePolyline.every((point: any) => point.lon === 1));
  assert.equal((await h.post({ claim: 'species', speciesId: 2 }, 2)).status, 409);
});

test('wrong-claim retries do not spend attempts; third wrong slips with no award or answer reveal', async () => {
  const h = harness();
  await h.post({ claim: 'species', speciesId: 2 }, 1);
  await h.post({ claim: 'species', speciesId: 2 }, 1);
  assert.equal(h.session.metadata.claims.wrongClaims, 1);
  await h.post({ claim: 'species', speciesId: 3 }, 2);
  const final = await h.post({ claim: 'species', speciesId: 4 }, 3);
  const result = await final.json();
  assert.equal(result.slipped, true); assert.equal(result.resolvedSpeciesId, undefined); assert.equal(result.resolution, undefined);
  assert.equal(h.session.metadata.claims.wrongClaims, 3); assert.equal(h.session.runStatus, 'completed');
  assert.equal(h.inserts.filter(row => row.table !== 'runMemories').length, 0);
  assert.equal(h.inserts[0].value.deductionSummary.slipped, true);
  assert.equal(h.inserts[0].value.finalScore, 100);
  assert.equal((await h.post({ claim: 'species', speciesId: 1 }, 4)).status, 409);
});

test('ladder eliminations block claims without cost and legacy wrong counts carry forward', async () => {
  const h = harness({ eliminated: [2], wrongGuessCount: 1 });
  assert.equal((await h.post({ claim: 'species', speciesId: 2 }, 1)).status, 409);
  assert.equal(h.session.metadata.claims, undefined);
  await h.post({ claim: 'species', speciesId: 3 }, 2);
  assert.equal(h.session.metadata.claims.wrongClaims, 2);
});

test('completion GIS failure preserves the first lock and retryable second claim', async () => {
  const h = harness({ gisFailure: true });
  await h.post({ claim: 'species', speciesId: 1 }, 1);
  const response = await h.post({ claim: 'explanation', explanationId: authored.private.answerExplanationId }, 2);
  assert.equal(response.status, 503);
  assert.equal(h.session.metadata.claims.species, 'locked');
  assert.equal(h.session.metadata.claims.explanation, 'open');
  assert.equal(h.session.runStatus, 'active'); assert.equal(h.inserts.length, 0);
});
