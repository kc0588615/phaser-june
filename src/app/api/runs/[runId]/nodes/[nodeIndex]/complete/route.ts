import { and, eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db, ecoRunNodes, ecoRunSessions } from '@/db';
import { getMethodOfferAtPath, isMethodType } from '@/expedition/caseOffers';
import { evidenceTierForMatchLength } from '@/expedition/evidenceQuality';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { decideQualityCheckpoint, getRecord, isUuid, parsePrivateCase, validateNodeCompletionInput } from '@/lib/runCaseState';
import { parsePublicCaseSnapshot } from '@/lib/runProjection';

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
      const metadata = getRecord(session.metadata);
      const publicCase = parsePublicCaseSnapshot(metadata.casePublic);
      const privateCase = parsePrivateCase(metadata.casePrivate);
      const boardContext = getRecord(node.boardContext);
      if (publicCase?.version === 3 || privateCase?.version === 3) {
        return { status: 409, body: { reason: 'v3_uses_evidence_choice' } };
      }
      if (node.nodeStatus === 'completed') {
        const bestTargetMatchLength = typeof boardContext.bestTargetMatchLength === 'number' ? boardContext.bestTargetMatchLength : 0;
        return { status: 200, body: { completed: true, duplicate: true, isLastNode, nodeOrder, objectiveMet: node.objectiveProgress >= node.objectiveTarget, bestTargetMatchLength, qualityTier: evidenceTierForMatchLength(bestTargetMatchLength) } };
      }
      if (node.nodeStatus !== 'active') return { status: 409, body: { error: 'Node is not active' } };
      if (publicCase?.version === 2 && (privateCase?.version !== 2 || !isMethodType(boardContext.method))) {
        return { status: 409, body: { reason: 'method_not_chosen' } };
      }

      const quality = decideQualityCheckpoint(node.nodeStatus, boardContext.bestTargetMatchLength, telemetry.bestTargetMatchLength);
      if (quality.kind === 'reject') return { status: 409, body: { reason: quality.reason } };
      const bestTargetMatchLength = quality.bestTargetMatchLength;
      const objectiveMet = telemetry.objectiveProgress >= node.objectiveTarget;

      // Solo-play trust boundary: bounded board totals and best target group only.
      await tx.update(ecoRunNodes).set({
        nodeStatus: 'completed', scoreEarned: telemetry.scoreEarned, movesUsed: telemetry.movesUsed,
        objectiveProgress: telemetry.objectiveProgress, endedAt: new Date(), updatedAt: new Date(),
        boardContext: { ...boardContext, bestTargetMatchLength, objectiveMet },
      }).where(eq(ecoRunNodes.id, node.id));
      if (!isLastNode) {
        const [nextNode] = await tx.select().from(ecoRunNodes).where(and(
          eq(ecoRunNodes.runId, runId),
          eq(ecoRunNodes.nodeOrder, nodeOrder + 1),
        )).limit(1);
        let nextContext = getRecord(nextNode?.boardContext);
        if (publicCase?.version === 2 && !objectiveMet) {
          const priorNodes = await tx.select().from(ecoRunNodes).where(eq(ecoRunNodes.runId, runId)).orderBy(ecoRunNodes.nodeOrder);
          const choices = priorNodes.slice(0, nodeOrder).flatMap(value => {
            const method = value.id === node.id ? boardContext.method : getRecord(value.boardContext).method;
            return isMethodType(method) ? [method] : [];
          });
          const offeredMethods = getMethodOfferAtPath(publicCase.offerTree, choices);
          if (!offeredMethods) return { status: 409, body: { reason: 'invalid_offer_path' } };
          nextContext = { ...nextContext, offeredMethods, choiceOfferedAt: new Date().toISOString() };
        }
        if (nextNode) await tx.update(ecoRunNodes).set({ nodeStatus: 'active', boardContext: nextContext, startedAt: new Date(), updatedAt: new Date() })
          .where(eq(ecoRunNodes.id, nextNode.id));
      }
      await tx.update(ecoRunSessions).set({
        scoreTotal: sql`${ecoRunSessions.scoreTotal} + ${telemetry.scoreEarned}`,
        movesUsed: sql`${ecoRunSessions.movesUsed} + ${telemetry.movesUsed}`,
        nodeIndexCurrent: isLastNode ? nodeOrder : nodeOrder + 1,
        ...(isLastNode ? { runStatus: 'deduction' } : {}),
      }).where(eq(ecoRunSessions.id, runId));
      return { status: 200, body: { completed: true, duplicate: false, isLastNode, nodeOrder, objectiveMet, bestTargetMatchLength, qualityTier: objectiveMet ? evidenceTierForMatchLength(bestTargetMatchLength) : null } };
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('[API POST /api/runs/.../complete] Error:', error);
    return NextResponse.json({ error: 'Failed to complete node' }, { status: 500 });
  }
}
