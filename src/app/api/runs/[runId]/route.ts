import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db, ecoRunSessions } from '@/db';

/**
 * PATCH /api/runs/[runId]
 * Update session metadata (e.g. resource wallet or deduction summary on completion).
 *
 * Body: { resourceWallet?: Record<string, number>; finalScore?: number; deductionSummary?: Record<string, unknown> }
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
    const { resourceWallet, finalScore, deductionSummary } = body as {
      resourceWallet?: Record<string, number>;
      finalScore?: number;
      deductionSummary?: Record<string, unknown>;
    };

    const metadataPatch: Record<string, unknown> = {};
    if (resourceWallet) metadataPatch.resourceWallet = resourceWallet;
    if (typeof finalScore === 'number') metadataPatch.finalScore = finalScore;
    if (deductionSummary) metadataPatch.deductionSummary = deductionSummary;

    if (Object.keys(metadataPatch).length > 0) {
      await db
        .update(ecoRunSessions)
        .set({
          metadata: sql`${ecoRunSessions.metadata} || ${JSON.stringify(metadataPatch)}::jsonb`,
        })
        .where(eq(ecoRunSessions.id, runId));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[API PATCH /api/runs/[runId]] Error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
