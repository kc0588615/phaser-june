import { and, inArray, lt } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db, ecoRunSessions } from '@/db';

const STALE_DAYS = 7;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'Cron unavailable' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);
    const abandoned = await db.update(ecoRunSessions).set({ runStatus: 'abandoned', endedAt: new Date() }).where(and(
      inArray(ecoRunSessions.runStatus, ['active', 'deduction']),
      lt(ecoRunSessions.startedAt, cutoff),
    )).returning({ id: ecoRunSessions.id });
    return NextResponse.json({ abandoned: abandoned.length, staleDays: STALE_DAYS });
  } catch (error) {
    console.error('[API GET /api/cron/abandon-stale-runs] Error:', error);
    return NextResponse.json({ error: 'Failed to abandon stale runs' }, { status: 500 });
  }
}
