import { eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db, ecoRunSessions } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { getRecord, isUuid } from '@/lib/runCaseState';
import { parsePublicCaseSnapshot } from '@/lib/runProjection';

export async function POST(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const playerId = await getPlayerIdFromClerk();
    if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { runId } = await params;
    if (!isUuid(runId)) return NextResponse.json({ error: 'Invalid runId' }, { status: 400 });

    const result = await db.transaction(async tx => {
      await tx.execute(sql`SELECT id FROM eco_run_sessions WHERE id = ${runId}::uuid FOR UPDATE`);
      const [session] = await tx.select().from(ecoRunSessions).where(eq(ecoRunSessions.id, runId)).limit(1);
      if (!session) return { status: 404, body: { error: 'Run not found' } };
      if (session.playerId !== playerId) return { status: 403, body: { error: 'Forbidden' } };
      const metadata = getRecord(session.metadata);
      if (parsePublicCaseSnapshot(metadata.casePublic)?.version !== 4) {
        return { status: 409, body: { error: 'Incident acknowledgement requires a v4 run' } };
      }
      if (!['active', 'deduction'].includes(session.runStatus)) {
        return { status: 409, body: { error: 'Only unfinished runs can acknowledge the incident' } };
      }
      if (metadata.incidentAcknowledged === true) {
        return { status: 200, body: { ok: true, duplicate: true } };
      }
      await tx.update(ecoRunSessions).set({
        metadata: sql`${ecoRunSessions.metadata} || ${JSON.stringify({ incidentAcknowledged: true })}::jsonb`,
      }).where(eq(ecoRunSessions.id, runId));
      return { status: 200, body: { ok: true, duplicate: false } };
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error('[API POST /api/runs/[runId]/incident] Error:', error);
    return NextResponse.json({ error: 'Failed to acknowledge incident' }, { status: 500 });
  }
}
