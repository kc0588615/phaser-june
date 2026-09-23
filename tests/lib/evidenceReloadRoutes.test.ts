import * as liveClaims from '@/lib/liveClaims';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import * as ladder from '@/lib/evidenceLadder';
import { createEmptyEvidenceCharges, EVIDENCE_FAMILIES } from '@/expedition/evidenceFamilies';
import { getRecord } from '@/lib/runCaseState';
import { snapshotEvidenceHints } from '@/lib/evidenceHintSnapshot';

const require = createRequire(`${process.cwd()}/package.json`);
const ts = require('typescript') as typeof import('typescript');
const ids = Object.fromEntries(EVIDENCE_FAMILIES.map((family, index) => [family, [1, 2, 3, 4].map(n => index * 10 + n)])) as Record<typeof EVIDENCE_FAMILIES[number], number[]>;
const familyHints = snapshotEvidenceHints(ids, EVIDENCE_FAMILIES.flatMap(family => ids[family].map(id => ({
  id, family, hintText: `Original ${id}`, weakTag: 'old-tag', traitCategory: 'diet' as const,
}))));

function harness() {
  let metadata: any = {
    casePublic: { version: 4, candidateIds: [1, 2, 3, 4, 5, 6] },
    casePrivate: { version: 4, answerId: 1, familyHintIds: ids, familyHints, familyCardIds: {}, cascadeHintIds: [] },
  };
  const node: any = { id: 'node', nodeStatus: 'active', boardSeed: 1, movesUsed: 3, hazardProfile: {}, boardContext: {
    segmentMovesUsed: 3, hintCounts: { ...createEmptyEvidenceCharges(), habits: 3 }, selectedFamilies: [], lastHintIds: [],
  } };
  let writes = 0;
  const tables = Object.fromEntries(['ecoRunSessions', 'ecoRunNodes', 'evidenceFamilyHints', 'evidenceFamilyCards', 'speciesDeductionProfiles', 'cascadeHints', 'runMemories'].map(name => [name, { name }]));
  const chain = (rows: any[]): any => ({ where: () => chain(rows), limit: () => chain(rows), orderBy: () => chain(rows), then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject) });
  const tx: any = {
    execute: async () => {},
    select: () => ({ from: (table: { name: string }) => {
      // Authoring hints/cards are deliberately unavailable after reload.
      if (['evidenceFamilyHints', 'evidenceFamilyCards'].includes(table.name)) throw new Error('Mutable corpus accessed');
      return chain(table.name === 'ecoRunSessions' ? [{ id: 'run', playerId: 'player', runStatus: 'active', nodeIndexCurrent: 1, metadata }]
        : table.name === 'ecoRunNodes' ? [node]
          : table.name === 'speciesDeductionProfiles' ? [1, 2, 3, 4, 5, 6].map(speciesId => ({ speciesId, dietTags: speciesId === 6 ? [] : ['old-tag'] })) : []);
    } }),
    update: (table: { name: string }) => ({ set: (values: any) => ({ where: async () => {
      writes++;
      if (table.name === 'ecoRunSessions') metadata = values.metadata;
      else Object.assign(node, values);
    } }) }),
  };
  const input = { nodeIndex: 0, moveNumber: 4, directClears: { ...createEmptyEvidenceCharges(), habits: 3 }, directMatchFamilies: ['habits'] };
  const deps: Record<string, unknown> = {
    'drizzle-orm': { eq: () => null, and: () => null, inArray: () => null, sql: () => null },
    'next/server': { NextResponse: { json: (data: unknown, init?: ResponseInit) => Response.json(data, init) } },
    '@/db': { ...tables, db: { ...tx, transaction: async (callback: any) => callback(tx) } },
    '@/lib/authHelpers': { getPlayerIdFromClerk: async () => 'player' },
    '@/lib/evidenceLadder': ladder,
    '@/lib/liveClaims': liveClaims,
    '@/lib/runCaseState': { getRecord, isUuid: () => true, parsePrivateCase: (v: unknown) => v, parseV3EvidenceApplications: () => [], resolveFieldFacts: () => [] },
    '@/lib/runProjection': { parsePublicCaseSnapshot: (v: unknown) => v, projectRunForClient: (_session: unknown, data: unknown) => data },
    '@/lib/evidenceRunState': {
      parseV3NodeEvidenceState: (v: unknown) => v,
      shouldIssueCascadeHint: () => false,
      applyEvidenceProgress: (state: any, _input: unknown, families: string[]) => ({ state: { ...state,
        hintCounts: { ...state.hintCounts, habits: state.hintCounts.habits + families.length }, segmentMovesUsed: 4,
      } }),
    },
    '@/lib/evidenceMoveVerification': { parseEvidenceMoveSubmission: (v: unknown) => v, evidenceMoveSubmissionDigest: () => 'digest', verifyEvidenceMoveDetailed: () => ({ ok: true, input }) },
    '@/game/nodeObstacles': { parseNodeObstacles: () => [], buildNodeBoardContext: () => ({ obstacleSeeds: [] }) },
    '@/game/constants': { GRID_COLS: 6, GRID_ROWS: 6 },
    '@/terrain/terrain': { StoredTerrainError: class extends Error {} },
  };
  function route(file: string): any {
    const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    runInNewContext(code, { exports, require: (id: string) => {
      if (!(id in deps)) throw new Error(`Unmocked dependency ${id}`);
      return deps[id];
    }, console, process: { env: {} } });
    return exports;
  }
  const progress = route('src/app/api/runs/[runId]/evidence-progress/route.ts');
  const resume = route('src/app/api/runs/[runId]/route.ts');
  const params = { params: Promise.resolve({ runId: 'run' }) };
  return {
    post: () => progress.POST({ json: async () => ({ nodeIndex: 0, moveNumber: 4 }) }, params) as Promise<Response>,
    get: () => resume.GET({}, params) as Promise<Response>,
    writes: () => writes,
  };
}

test('progress, retry and resume use the saved fourth rung after authoring rows are deleted', async () => {
  const h = harness();
  const response = await h.post();
  assert.equal(response.status, 200);
  const initial = await response.json();
  assert.equal(initial.facts.length, 1);
  assert.equal(initial.facts[0].rung, 3);
  assert.equal(initial.facts[0].rungTotal, 4);
  assert.equal(initial.facts[0].factText, `Original ${ids.habits[3]}`);
  assert.deepEqual(initial.facts[0].eliminatedIds, [6]);
  const writes = h.writes();
  const retry = await h.post();
  assert.equal(retry.status, 200);
  const duplicate = await retry.json();
  assert.equal(duplicate.duplicate, true);
  assert.deepEqual(duplicate.facts, initial.facts);
  assert.deepEqual(duplicate.hintLines, initial.hintLines);
  assert.equal(h.writes(), writes);
  const resumed = await h.get();
  assert.equal(resumed.status, 200);
  assert.deepEqual((await resumed.json()).publicFacts, initial.facts);
  assert.equal(JSON.stringify(initial.facts).includes('old-tag'), false);
});
