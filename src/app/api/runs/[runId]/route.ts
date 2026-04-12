import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db, ecoRunSessions, ecoRunNodes, runMemories } from '@/db';

/**
 * PATCH /api/runs/[runId]
 * Update session metadata (e.g. resource wallet or deduction summary on completion).
 * When finalScore is provided, also persists a run_memories row.
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
    const { resourceWallet, finalScore, deductionSummary, speciesId } = body as {
      resourceWallet?: Record<string, number>;
      finalScore?: number;
      deductionSummary?: Record<string, unknown>;
      speciesId?: number;
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
          ...(typeof finalScore === 'number' ? {
            runStatus: 'completed',
            endedAt: new Date(),
            scoreTotal: finalScore,
          } : {}),
        })
        .where(eq(ecoRunSessions.id, runId));
    }

    // When run completes (finalScore present), persist a run_memories row
    if (typeof finalScore === 'number') {
      try {
        const resolvedSpeciesId = typeof speciesId === 'number' && Number.isInteger(speciesId) && speciesId > 0
          ? speciesId
          : null;

        const [session] = await db
          .select()
          .from(ecoRunSessions)
          .where(eq(ecoRunSessions.id, runId))
          .limit(1);

        if (session) {
          const nodes = await db
            .select()
            .from(ecoRunNodes)
            .where(eq(ecoRunNodes.runId, runId))
            .orderBy(ecoRunNodes.nodeOrder);

          const nodesSummary = nodes.map(n => ({
            nodeOrder: n.nodeOrder,
            nodeType: n.nodeType,
            nodeStatus: n.nodeStatus,
            counterGem: (n.hazardProfile as Record<string, unknown>)?.counterGem ?? null,
            obstacleFamily: (n.hazardProfile as Record<string, unknown>)?.obstacleFamily ?? null,
            objectiveTarget: n.objectiveTarget,
            objectiveProgress: n.objectiveProgress,
            scoreEarned: n.scoreEarned,
            movesUsed: n.movesUsed,
          }));

          await db
            .insert(runMemories)
            .values({
              runId: session.id,
              playerId: session.playerId,
              speciesId: resolvedSpeciesId,
              locationKey: session.locationKey,
              startLon: session.selectedLng,
              startLat: session.selectedLat,
              nodes: nodesSummary,
              deductionSummary: deductionSummary ?? null,
              finalScore,
              realm: session.realm,
              biome: session.biome,
              bioregion: session.bioregion,
            })
            .onConflictDoNothing();
        }
      } catch (memErr) {
        // Non-fatal: log but don't fail the request
        console.error('[API PATCH /api/runs/[runId]] run_memories write failed:', memErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[API PATCH /api/runs/[runId]] Error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
