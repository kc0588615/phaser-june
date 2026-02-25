import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db, ecoRunSessions } from '@/db';

/**
 * PATCH /api/runs/[runId]
 * Update session metadata (e.g. gem wallet on completion).
 *
 * Body: { gemWallet?: Record<string, number> }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;
    if (!runId) {
      return NextResponse.json({ error: 'Missing runId' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { gemWallet } = body as { gemWallet?: Record<string, number> };

    if (gemWallet) {
      await db
        .update(ecoRunSessions)
        .set({
          metadata: sql`${ecoRunSessions.metadata} || ${JSON.stringify({ gemWallet })}::jsonb`,
        })
        .where(eq(ecoRunSessions.id, runId));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[API PATCH /api/runs/[runId]] Error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
