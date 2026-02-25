import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db, ecoRunSessions, ecoRunNodes } from '@/db';

/**
 * POST /api/runs/[runId]/nodes/[nodeIndex]/complete
 * Mark a node as completed, optionally record score. Advance session.
 *
 * Body: { scoreEarned?, movesUsed? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string; nodeIndex: string }> }
) {
  try {
    const { runId, nodeIndex: nodeIndexStr } = await params;
    const nodeOrder = Number(nodeIndexStr);

    if (!runId || !Number.isFinite(nodeOrder) || nodeOrder < 1) {
      return NextResponse.json({ error: 'Invalid runId or nodeIndex' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { scoreEarned = 0, movesUsed = 0 } = body as { scoreEarned?: number; movesUsed?: number };

    // Find the node
    const [node] = await db
      .select({ id: ecoRunNodes.id, nodeStatus: ecoRunNodes.nodeStatus })
      .from(ecoRunNodes)
      .where(and(eq(ecoRunNodes.runId, runId), eq(ecoRunNodes.nodeOrder, nodeOrder)))
      .limit(1);

    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    if (node.nodeStatus === 'completed') {
      return NextResponse.json({ error: 'Node already completed' }, { status: 409 });
    }

    // Mark node completed
    await db
      .update(ecoRunNodes)
      .set({
        nodeStatus: 'completed',
        scoreEarned,
        movesUsed,
        endedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(ecoRunNodes.id, node.id));

    // Fetch session to check if run is done
    const [session] = await db
      .select({ nodeCountPlanned: ecoRunSessions.nodeCountPlanned })
      .from(ecoRunSessions)
      .where(eq(ecoRunSessions.id, runId))
      .limit(1);

    const isLastNode = nodeOrder >= (session?.nodeCountPlanned ?? 6);

    // Accumulate session totals
    await db
      .update(ecoRunSessions)
      .set({
        scoreTotal: sql`${ecoRunSessions.scoreTotal} + ${scoreEarned}`,
        movesUsed: sql`${ecoRunSessions.movesUsed} + ${movesUsed}`,
        nodeIndexCurrent: nodeOrder,
      })
      .where(eq(ecoRunSessions.id, runId));

    // Advance session
    if (isLastNode) {
      await db
        .update(ecoRunSessions)
        .set({ runStatus: 'completed', endedAt: new Date() })
        .where(eq(ecoRunSessions.id, runId));
    } else {
      // Unlock next node
      const nextOrder = nodeOrder + 1;
      await db
        .update(ecoRunNodes)
        .set({ nodeStatus: 'active', startedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(ecoRunNodes.runId, runId), eq(ecoRunNodes.nodeOrder, nextOrder)));

      await db
        .update(ecoRunSessions)
        .set({ nodeIndexCurrent: nextOrder })
        .where(eq(ecoRunSessions.id, runId));
    }

    return NextResponse.json({ completed: true, isLastNode, nodeOrder });
  } catch (error) {
    console.error('[API POST /api/runs/.../complete] Error:', error);
    return NextResponse.json({ error: 'Failed to complete node' }, { status: 500 });
  }
}
