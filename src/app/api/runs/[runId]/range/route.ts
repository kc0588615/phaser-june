import { eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db, ecoRunSessions } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { getRecord, isUuid, parsePrivateCase } from '@/lib/runCaseState';

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await params;
    const playerId = await getPlayerIdFromClerk();
    if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isUuid(runId)) return NextResponse.json({ error: 'Invalid runId' }, { status: 400 });
    const [session] = await db.select({
      playerId: ecoRunSessions.playerId,
      runStatus: ecoRunSessions.runStatus,
      metadata: ecoRunSessions.metadata,
    }).from(ecoRunSessions).where(eq(ecoRunSessions.id, runId)).limit(1);
    if (!session) return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    if (session.playerId !== playerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const privateCase = parsePrivateCase(getRecord(session.metadata).casePrivate);
    if (privateCase?.version !== 4 || session.runStatus !== 'completed') {
      return NextResponse.json({ error: 'Species range is locked' }, { status: 409 });
    }
    const rows = await db.execute<{ geometry: Record<string, unknown> | null }>(sql`
      SELECT ST_AsGeoJSON(
        ST_SimplifyPreserveTopology(ST_UnaryUnion(ST_Collect(i.wkb_geometry)), 0.02),
        6
      )::jsonb AS geometry
      FROM species s
      JOIN iucn i ON i.id_no = s.iucn_id::numeric
      WHERE s.id = ${privateCase.answerId}
        AND i.wkb_geometry IS NOT NULL
    `);
    const geometry = rows[0]?.geometry ?? null;
    return NextResponse.json({
      range: geometry ? { type: 'Feature', properties: {}, geometry } : null,
    });
  } catch (error) {
    console.error('[API GET /api/runs/[runId]/range] Error:', error);
    return NextResponse.json({ error: 'Failed to load species range' }, { status: 500 });
  }
}
