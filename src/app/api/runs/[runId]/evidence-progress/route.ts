import { and, eq, inArray, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { cascadeHints, db, ecoRunNodes, ecoRunSessions, evidenceFamilyHints } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { applyEvidenceProgress, deriveCascadeHintId, deriveEvidenceHintIds, parseEvidenceProgressInput, parseV3NodeEvidenceState } from '@/lib/evidenceRunState';
import { getRecord, isUuid, parsePrivateCase } from '@/lib/runCaseState';
import { parsePublicCaseSnapshot } from '@/lib/runProjection';

export async function POST(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await params;
    const playerId = await getPlayerIdFromClerk();
    if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isUuid(runId)) return NextResponse.json({ error: 'Invalid runId' }, { status: 400 });
    const input = parseEvidenceProgressInput(await request.json().catch(() => null));
    if (!input) return NextResponse.json({ error: 'Invalid evidence progress checkpoint' }, { status: 400 });
    const nodeOrder = input.nodeIndex + 1;
    const result = await db.transaction(async tx => {
      await tx.execute(sql`SELECT id FROM eco_run_sessions WHERE id = ${runId}::uuid FOR UPDATE`);
      await tx.execute(sql`SELECT id FROM eco_run_nodes WHERE run_id = ${runId}::uuid AND node_order = ${nodeOrder} FOR UPDATE`);
      const [session] = await tx.select().from(ecoRunSessions).where(eq(ecoRunSessions.id, runId)).limit(1);
      if (!session) return response(404, { error: 'Run not found' });
      if (session.playerId !== playerId) return response(403, { error: 'Forbidden' });
      const metadata = getRecord(session.metadata);
      const privateCase = parsePrivateCase(metadata.casePrivate);
      if (parsePublicCaseSnapshot(metadata.casePublic)?.version !== 3 || privateCase?.version !== 3) {
        return response(409, { error: 'Evidence-family progress requires a v3 run' });
      }
      const [node] = await tx.select().from(ecoRunNodes).where(and(eq(ecoRunNodes.runId, runId), eq(ecoRunNodes.nodeOrder, nodeOrder))).limit(1);
      if (!node) return response(404, { error: 'Node not found' });
      if (session.runStatus !== 'active' || node.nodeStatus !== 'active' || session.nodeIndexCurrent !== nodeOrder) {
        return response(409, { reason: 'node_not_active' });
      }
      const boardContext = getRecord(node.boardContext);
      const state = parseV3NodeEvidenceState(boardContext);
      if (!state || state.selectedFamily) return response(409, { reason: 'invalid_node_state' });
      const applied = applyEvidenceProgress(state, input);
      if ('error' in applied) return response(409, { reason: applied.error });
      const duplicate = input.moveNumber === node.movesUsed;
      const hintIds = duplicate ? applied.state.lastHintIds : deriveEvidenceHintIds(state.hintCounts, input.directMatchFamilies, privateCase.familyHintIds);
      const cascadeHintId = duplicate
        ? applied.state.lastCascadeHintId
        : input.cascadeCount > 0
          ? deriveCascadeHintId(state.cascadeHintCount, privateCase.cascadeHintIds) ?? undefined
          : undefined;
      const persistedState = { ...applied.state, lastHintIds: hintIds, ...(cascadeHintId ? { lastCascadeHintId: cascadeHintId } : {}) };
      if (input.moveNumber > node.movesUsed) {
        await tx.update(ecoRunNodes).set({
          movesUsed: input.moveNumber,
          objectiveProgress: input.moveNumber,
          boardContext: { ...boardContext, ...persistedState },
          updatedAt: new Date(),
        }).where(eq(ecoRunNodes.id, node.id));
      }
      const [hintRows, cascadeRows] = await Promise.all([
        hintIds.length ? tx.select({ id: evidenceFamilyHints.id, hintText: evidenceFamilyHints.hintText })
          .from(evidenceFamilyHints).where(inArray(evidenceFamilyHints.id, hintIds)) : Promise.resolve([]),
        cascadeHintId ? tx.select({ id: cascadeHints.id, hintText: cascadeHints.hintText })
          .from(cascadeHints).where(eq(cascadeHints.id, cascadeHintId)).limit(1) : Promise.resolve([]),
      ]);
      if (hintRows.length !== new Set(hintIds).size || (cascadeHintId && cascadeRows.length !== 1)) {
        throw new Error('Compiled hint corpus changed during active run');
      }
      const hintById = new Map(hintRows.map(row => [row.id, row.hintText]));
      const hintLines = hintIds.flatMap(id => hintById.has(id) ? [hintById.get(id)!] : []);
      return response(200, {
        ok: true,
        duplicate,
        nodeIndex: input.nodeIndex,
        segmentMovesUsed: applied.state.segmentMovesUsed,
        evidenceCharges: persistedState.evidenceCharges,
        offeredFamilies: persistedState.offeredFamilies,
        hintLine: hintLines.at(-1) ?? null,
        hintLines,
        cascadeHintLine: cascadeRows[0]?.hintText ?? null,
      });
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('[API POST /api/runs/[runId]/evidence-progress] Error:', error);
    return NextResponse.json({ error: 'Failed to save evidence progress' }, { status: 500 });
  }
}

function response(status: number, body: Record<string, unknown>) { return { status, body }; }
