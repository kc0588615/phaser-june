import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import * as crypto from 'node:crypto';
import { snapshotFromArrays, sourceWindowAt, TerrainExtractionError } from '@/terrain/extract.server';

// Execute the real route with isolated external dependencies; no auth bypass or DB writes.
const require = createRequire(`${process.cwd()}/package.json`);
const ts = require('typescript') as typeof import('typescript');
const compiled = ts.transpileModule(readFileSync('src/app/api/runs/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const terrain = snapshotFromArrays([...Array(36).fill(106), ...Array(36).fill(255)], Array(144).fill(255), sourceWindowAt(-84.1, 10.4), {}, 'original-snapshot');
const publicCase = { version: 4, candidateIds: [1, 2, 3, 4, 5, 6], boardSeeds: [1, 2, 3] };

function harness({ failure, duplicate = false, conflict = false, failNodeInsert = false }: { failure?: Error; duplicate?: boolean; conflict?: boolean; failNodeInsert?: boolean } = {}) {
  let extracts = 0; let transactions = 0; let committed: any[] = [];
  const originalNodes = [1, 2, 3].map(nodeOrder => ({ id: `original-${nodeOrder}`, nodeOrder, boardContext: { terrain } }));
  const session = { id: 'original-run', metadata: { casePublic: publicCase } };
  const names = ['mysteryCases', 'mysteryExplanations', 'mysteryResolutions', 'mysteryEvidenceSteps', 'mysteryRejectedAlternatives', 'mysterySources', 'casePools', 'casePoolMembers', 'cascadeHints', 'ecoRunNodes', 'ecoRunSessions', 'evidenceFamilyCards', 'evidenceFamilyHints', 'speciesDeductionProfiles', 'speciesTable', 'habitatColormap'];
  const tables = Object.fromEntries(names.map(name => [name, { name }]));
  const chain = (rows: any[]): any => ({ where: () => chain(rows), orderBy: () => chain(rows), limit: () => chain(rows), innerJoin: () => chain(rows), then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject) });
  const select = (inTransaction: boolean) => () => ({ from: (table: { name: string }) => chain(
    table.name === 'ecoRunSessions' ? duplicate || (inTransaction && conflict) ? [session] : []
      : table.name === 'ecoRunNodes' ? originalNodes
        : table.name === 'casePools' ? [{ id: 'pool' }]
          : table.name === 'casePoolMembers' ? publicCase.candidateIds.map(id => ({ species: { id, iucnId: id } })) : [],
  ) });
  const db = {
    select: select(false),
    transaction: async (callback: (tx: any) => Promise<unknown>) => {
      transactions++;
      assert.equal(extracts, 1, 'terrain must finish before opening transaction');
      const staged: any[] = [];
      const result = await callback({
        select: select(true),
        insert: (table: { name: string }) => ({ values: (values: any) => {
          if (table.name === 'ecoRunSessions') return { onConflictDoNothing: () => ({ returning: async () => {
            if (conflict) return []; staged.push(values); return [{ id: 'new-run' }];
          } }) };
          return { returning: async () => {
            if (failNodeInsert) throw new Error('node insert failed');
            staged.push(...values); return values.map((value: any) => ({ id: `new-${value.nodeOrder}`, nodeOrder: value.nodeOrder }));
          } };
        } }),
      });
      committed = staged;
      return result;
    },
  };
  const deps: Record<string, unknown> = {
    'node:crypto': crypto,
    'drizzle-orm': { and: () => null, eq: () => null, inArray: () => null },
    'next/server': { NextResponse: { json: (data: unknown, init?: ResponseInit) => Response.json(data, init) } },
    '@/db': { ...tables, db },
    '@/game/constants': { GRID_COLS: 6, GRID_ROWS: 6 },
    '@/game/nodeObstacles': { buildNodeBoardContext: () => ({ cellStateSeeds: [] }) },
    '@/lib/authHelpers': { getPlayerIdFromClerk: async () => 'player' },
    '@/lib/answerPrior': { buildAnswerPrior: () => [] },
    '@/lib/caseTraits': { POOL_SIZE: 6 },
    '@/lib/caseCompilerV3': { compileCaseV4: () => ({ public: publicCase, private: {} }) },
    '@/expedition/evidenceFamilies': { createEmptyEvidenceCharges: () => ({}) },
    '@/lib/seededRng': { createSeededStream: () => () => 0 },
    '@/lib/nodeScoring': { MYSTERY_NODE_COUNT: 3, applyWaypointsToRunNodes: (nodes: unknown) => nodes },
    '@/lib/runProjection': { parsePublicCaseSnapshot: (value: unknown) => value, projectRunCreateResponse: (value: unknown) => value },
    '@/lib/record': { getRecord: (value: unknown) => value && typeof value === 'object' && !Array.isArray(value) ? value : {} },
    '@/lib/runCaseState': { resolveRunCreationIdentifiers: () => ({ runId: 'new-run', createRequestId: 'request' }) },
    '@/expedition/mapView': { deriveExpeditionMapView: () => ({}) },
    '@/expedition/siteSpacing': { satisfiesResearchSiteSpacing: () => true },
    '@/lib/waypointHarvesting': {}, '@/lib/mysteryCase': { assembleMysteryCases: () => new Map() },
    '@/terrain/extract.server': { TerrainExtractionError, extractSiteTerrains: async () => { extracts++; if (failure) throw failure; return [terrain, { ...terrain, id: 'two' }, { ...terrain, id: 'three' }]; } },
  };
  const exports: { POST?: (request: unknown) => Promise<Response> } = {};
  runInNewContext(compiled, { exports, require: (id: string) => {
    if (!(id in deps)) throw new Error(`Unmocked dependency ${id}`); return deps[id];
  }, process: { env: { CASE_COMPILER_SECRET: 'test-secret' } }, Buffer, console: { error: () => {}, warn: () => {} } });
  return { post: () => exports.POST!({ json: async () => ({ lon: -84.1, lat: 10.4, locationKey: 'fixture', nodes: [1, 2, 3].map(boardSeed => ({ boardSeed, node_type: 'custom', obstacles: [], events: [], waypoint: { lon: -84.1, lat: 10.4 } })) }) }), stats: () => ({ extracts, transactions, committed }) };
}

test('terrain failure returns 503/422 before any transaction or insertion', async () => {
  for (const status of [503, 422] as const) {
    const h = harness({ failure: new TerrainExtractionError('terrain unavailable', status) });
    assert.equal((await h.post()).status, status);
    assert.deepEqual(h.stats(), { extracts: 1, transactions: 0, committed: [] });
  }
});

test('run and all three immutable snapshots are inserted in one transaction', async () => {
  const h = harness(); assert.equal((await h.post()).status, 200);
  assert.equal(h.stats().transactions, 1); assert.equal(h.stats().committed.length, 4);
  assert.equal(h.stats().committed[1].boardContext.terrain, terrain);
  assert.deepEqual(h.stats().committed.slice(1).map(row => row.boardContext.terrain.id), ['original-snapshot', 'two', 'three']);
  const rollback = harness({ failNodeInsert: true });
  assert.equal((await rollback.post()).status, 500); assert.equal(rollback.stats().committed.length, 0);
});

test('duplicate requests reuse original nodes without extraction, including changed source; concurrent conflict cannot overwrite them', async () => {
  const h = harness({ duplicate: true, failure: new TerrainExtractionError('source changed') });
  const response = await h.post(); assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).nodeIds, ['original-1', 'original-2', 'original-3']);
  assert.deepEqual(h.stats(), { extracts: 0, transactions: 0, committed: [] });
  const racing = harness({ conflict: true });
  const replay = await (await racing.post()).json();
  assert.equal(replay.runId, 'original-run');
  assert.deepEqual(replay.nodeIds, ['original-1', 'original-2', 'original-3']);
  assert.equal(racing.stats().committed.length, 0);
});
