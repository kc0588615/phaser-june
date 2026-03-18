import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db, ecoRunSessions } from '@/db';

/**
 * PATCH /api/runs/[runId]
 * Update session metadata (e.g. resource wallet on completion).
 *
 * Body: { resourceWallet?: Record<string, number> }
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
    const { resourceWallet } = body as { resourceWallet?: Record<string, number> };

    if (resourceWallet) {
      await db
        .update(ecoRunSessions)
        .set({
          metadata: sql`${ecoRunSessions.metadata} || ${JSON.stringify({ resourceWallet })}::jsonb`,
        })
        .where(eq(ecoRunSessions.id, runId));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[API PATCH /api/runs/[runId]] Error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
