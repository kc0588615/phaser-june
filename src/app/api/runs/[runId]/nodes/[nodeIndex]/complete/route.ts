import { and, eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db, ecoRunNodes, ecoRunSessions } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { isUuid, validateNodeCompletionInput } from '@/lib/runCaseState';

export async function POST(request: NextRequest, { params }: { params: Promise<{ runId: string; nodeIndex: string }> }) {
  try {
    const { runId, nodeIndex } = await params;
    const nodeOrder = Number(nodeIndex);
    if (!isUuid(runId)) return NextResponse.json({ error: 'Invalid runId' }, { status: 400 });
    if (!Number.isInteger(nodeOrder) || nodeOrder < 1 || nodeOrder > 3) {
      return NextResponse.json({ error: 'nodeIndex must be 1, 2, or 3' }, { status: 400 });
    }
    const telemetry = validateNodeCompletionInput(await request.json().catch(() => ({})));
    if (!telemetry) return NextResponse.json({ error: 'scoreEarned, movesUsed, and objectiveProgress must be bounded nonnegative integers' }, { status: 400 });
    const playerId = await getPlayerIdFromClerk();

    const result = await db.transaction(async tx => {
      await tx.execute(sql`SELECT id FROM eco_run_sessions WHERE id = ${runId}::uuid FOR UPDATE`);
      await tx.execute(sql`SELECT id FROM eco_run_nodes WHERE run_id = ${runId}::uuid AND node_order = ${nodeOrder} FOR UPDATE`);
      const [session] = await tx.select().from(ecoRunSessions).where(eq(ecoRunSessions.id, runId)).limit(1);
      if (!session) return { status: 404, body: { error: 'Run not found' } };
      if (!playerId) return { status: 401, body: { error: 'Unauthorized' } };
      if (session.playerId !== playerId) return { status: 403, body: { error: 'Forbidden' } };
      const [node] = await tx.select().from(ecoRunNodes).where(and(eq(ecoRunNodes.runId, runId), eq(ecoRunNodes.nodeOrder, nodeOrder))).limit(1);
      if (!node) return { status: 404, body: { error: 'Node not found' } };
      const isLastNode = nodeOrder >= session.nodeCountPlanned;
      if (node.nodeStatus === 'completed') return { status: 200, body: { completed: true, duplicate: true, isLastNode, nodeOrder } };
      if (node.nodeStatus !== 'active') return { status: 409, body: { error: 'Node is not active' } };

      // v0 trust boundary: board score/moves/progress are bounded client telemetry.
      await tx.update(ecoRunNodes).set({
        nodeStatus: 'completed', scoreEarned: telemetry.scoreEarned, movesUsed: telemetry.movesUsed,
        objectiveProgress: telemetry.objectiveProgress, endedAt: new Date(), updatedAt: new Date(),
      }).where(eq(ecoRunNodes.id, node.id));
      if (!isLastNode) {
        await tx.update(ecoRunNodes).set({ nodeStatus: 'active', startedAt: new Date(), updatedAt: new Date() })
          .where(and(eq(ecoRunNodes.runId, runId), eq(ecoRunNodes.nodeOrder, nodeOrder + 1)));
      }
      await tx.update(ecoRunSessions).set({
        scoreTotal: sql`${ecoRunSessions.scoreTotal} + ${telemetry.scoreEarned}`,
        movesUsed: sql`${ecoRunSessions.movesUsed} + ${telemetry.movesUsed}`,
        nodeIndexCurrent: isLastNode ? nodeOrder : nodeOrder + 1,
        ...(isLastNode ? { runStatus: 'deduction' } : {}),
      }).where(eq(ecoRunSessions.id, runId));
      return { status: 200, body: { completed: true, duplicate: false, isLastNode, nodeOrder } };
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('[API POST /api/runs/.../complete] Error:', error);
    return NextResponse.json({ error: 'Failed to complete node' }, { status: 500 });
  }
}
