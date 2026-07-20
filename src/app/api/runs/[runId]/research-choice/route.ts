import { eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db, ecoRunNodes, ecoRunSessions } from '@/db';
import { isMethodType } from '@/expedition/caseOffers';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import {
  RUN_CHECKPOINT_LIMITS,
  decideMethodChoice,
  getRecord,
  isUuid,
  parsePrivateCase,
} from '@/lib/runCaseState';
import { parsePublicCaseSnapshot } from '@/lib/runProjection';

export async function POST(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await params;
    if (!isUuid(runId)) return NextResponse.json({ error: 'Invalid runId' }, { status: 400 });
    const playerId = await getPlayerIdFromClerk();
    if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const method = getRecord(await request.json().catch(() => ({}))).method;

    const result = await db.transaction(async tx => {
      await tx.execute(sql`SELECT id FROM eco_run_sessions WHERE id = ${runId}::uuid FOR UPDATE`);
      await tx.execute(sql`SELECT id FROM eco_run_nodes WHERE run_id = ${runId}::uuid ORDER BY node_order FOR UPDATE`);
      const [session] = await tx.select().from(ecoRunSessions).where(eq(ecoRunSessions.id, runId)).limit(1);
      if (!session) return response(404, { error: 'Run not found' });
      if (session.playerId !== playerId) return response(403, { error: 'Forbidden' });

      const metadata = getRecord(session.metadata);
      const publicCase = parsePublicCaseSnapshot(metadata.casePublic);
      const privateCase = parsePrivateCase(metadata.casePrivate);
      if (!publicCase || publicCase.version !== 2 || !privateCase || privateCase.version !== 2) {
        return response(409, { reason: 'v2_required' });
      }
      const nodes = await tx.select().from(ecoRunNodes).where(eq(ecoRunNodes.runId, runId)).orderBy(ecoRunNodes.nodeOrder);
      const nodeIndex = session.nodeIndexCurrent - 1;
      const activeNode = nodes[nodeIndex];
      if (!activeNode) return response(409, { reason: 'invalid_offer_path' });
      const priorMethods = nodes.slice(0, nodeIndex).flatMap(node => {
        const prior = getRecord(node.boardContext).method;
        return isMethodType(prior) ? [prior] : [];
      });
      const boardContext = getRecord(activeNode.boardContext);
      const decision = decideMethodChoice({
        publicCase,
        nodeIndex,
        nodeStatus: activeNode.nodeStatus,
        requestedMethod: method,
        persistedMethod: boardContext.method,
        priorMethods,
      });
      if (decision.kind === 'reject') {
        return response(decision.reason === 'invalid_method' ? 400 : 409, { reason: decision.reason });
      }
      if (decision.kind === 'idempotent') {
        return response(200, {
          nodeIndex,
          method: decision.method,
          offeredMethods: decision.offered,
          choiceLatencyMs: integerOrZero(boardContext.choiceLatencyMs),
          duplicate: true,
        });
      }

      const offeredAt = typeof boardContext.choiceOfferedAt === 'string'
        ? Date.parse(boardContext.choiceOfferedAt)
        : Number.NaN;
      if (!Number.isFinite(offeredAt)) return response(409, { reason: 'choice_not_offered' });
      const now = new Date();
      const choiceLatencyMs = Math.min(Math.max(0, now.getTime() - offeredAt), RUN_CHECKPOINT_LIMITS.latencyMs);
      await tx.update(ecoRunNodes).set({
        boardContext: {
          ...boardContext,
          method: decision.method,
          offeredMethods: decision.offered,
          choiceSelectedAt: now.toISOString(),
          choiceLatencyMs,
        },
        updatedAt: now,
      }).where(eq(ecoRunNodes.id, activeNode.id));
      return response(200, {
        nodeIndex,
        method: decision.method,
        offeredMethods: decision.offered,
        choiceLatencyMs,
        duplicate: false,
      });
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('[API POST /api/runs/[runId]/research-choice] Error:', error);
    return NextResponse.json({ error: 'Failed to save research choice' }, { status: 500 });
  }
}

function integerOrZero(value: unknown): number {
  return Number.isInteger(value) && (value as number) >= 0 ? value as number : 0;
}

function response(status: number, body: Record<string, unknown>) { return { status, body }; }
