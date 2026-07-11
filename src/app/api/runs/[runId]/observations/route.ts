import { and, eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db, ecoRunNodes, ecoRunSessions, evidenceCards } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { decideObservationIssuance, getRecord, hydrateObservation, isUuid, parseEvidenceCard, parseIssuedObservations, parsePrivateCase } from '@/lib/runCaseState';

export async function POST(request: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await params;
    if (!isUuid(runId)) return NextResponse.json({ error: 'Invalid runId' }, { status: 400 });
    const playerId = await getPlayerIdFromClerk();
    const body = getRecord(await request.json().catch(() => ({})));
    const nodeIndex = body.nodeIndex;
    if (!Number.isInteger(nodeIndex) || (nodeIndex as number) < 0 || (nodeIndex as number) > 3) {
      return NextResponse.json({ error: 'nodeIndex must be an integer from 0 through 3' }, { status: 409 });
    }

    const result = await db.transaction(async tx => {
      await tx.execute(sql`SELECT id FROM eco_run_sessions WHERE id = ${runId}::uuid FOR UPDATE`);
      const [session] = await tx.select().from(ecoRunSessions).where(eq(ecoRunSessions.id, runId)).limit(1);
      if (!session) return response(404, { error: 'Run not found' });
      if (!playerId) return response(401, { error: 'Unauthorized' });
      if (session.playerId !== playerId) return response(403, { error: 'Forbidden' });
      const metadata = getRecord(session.metadata);
      const privateCase = parsePrivateCase(metadata.casePrivate);
      if (!privateCase) return response(409, { reason: 'legacy_run' });
      const issued = parseIssuedObservations(metadata.observationsIssued);
      const duplicate = issued.find(item => item.nodeIndex === nodeIndex);
      if (duplicate) return cardResponse(tx, duplicate.cardId, nodeIndex as number);
      if (decideObservationIssuance(session.runStatus, false) === 'reject') return response(409, { reason: 'run_completed' });

      if ((nodeIndex as number) < 3) {
        const [node] = await tx.select({ status: ecoRunNodes.nodeStatus, target: ecoRunNodes.objectiveTarget, progress: ecoRunNodes.objectiveProgress })
          .from(ecoRunNodes).where(and(eq(ecoRunNodes.runId, runId), eq(ecoRunNodes.nodeOrder, (nodeIndex as number) + 1))).limit(1);
        if (!node || node.status !== 'completed') return response(409, { reason: 'not_completed' });
        if (node.progress < node.target) return response(403, { reason: 'objective_failed' });
      } else {
        if (!privateCase.chainCardIds[3]) return response(403, { reason: 'no_signature' });
        const committed = new Set((Array.isArray(metadata.reasoningEvents) ? metadata.reasoningEvents : []).flatMap(value => {
          const ref = getRecord(value).obsRef;
          return typeof ref === 'string' ? [ref] : [];
        }));
        if (![0, 1, 2].every(index => issued.some(item => item.nodeIndex === index) && committed.has(`obs-${index}`))) {
          return response(403, { reason: 'not_eligible' });
        }
      }

      const cardId = privateCase.chainCardIds[nodeIndex as number];
      if (!cardId) return response(403, { reason: 'no_signature' });
      const [row] = await tx.select().from(evidenceCards).where(eq(evidenceCards.id, cardId)).limit(1);
      const card = parseEvidenceCard(row);
      if (!card) return response(503, { error: 'Evidence card unavailable' });
      const issuance = { nodeIndex: nodeIndex as number, ref: `obs-${nodeIndex}`, cardId, issuedAt: new Date().toISOString() };
      await tx.update(ecoRunSessions).set({ metadata: sql`${ecoRunSessions.metadata} || ${JSON.stringify({ observationsIssued: [...issued, issuance] })}::jsonb` }).where(eq(ecoRunSessions.id, runId));
      return response(200, hydrateObservation(card, nodeIndex as number));
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('[API POST /api/runs/[runId]/observations] Error:', error);
    return NextResponse.json({ error: 'Failed to issue observation' }, { status: 500 });
  }
}

async function cardResponse(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], cardId: number, nodeIndex: number) {
  const [row] = await tx.select().from(evidenceCards).where(eq(evidenceCards.id, cardId)).limit(1);
  const card = parseEvidenceCard(row);
  return card ? response(200, hydrateObservation(card, nodeIndex)) : response(503, { error: 'Evidence card unavailable' });
}

function response(status: number, body: Record<string, unknown>) { return { status, body }; }
