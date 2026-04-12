import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db, ecoRunSessions, ecoRunNodes } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';

/**
 * GET /api/runs/list?status=completed&limit=20
 * Returns the authenticated player's recent expedition runs with node summaries.
 */
export async function GET(request: NextRequest) {
  try {
    const playerId = await getPlayerIdFromClerk();
    if (!playerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get('status') || 'completed';
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '20', 10), 50);

    const sessions = await db
      .select()
      .from(ecoRunSessions)
      .where(and(eq(ecoRunSessions.runStatus, status), eq(ecoRunSessions.playerId, playerId)))
      .orderBy(desc(ecoRunSessions.startedAt))
      .limit(limit);

    const runs = await Promise.all(
      sessions.map(async (s) => {
        const nodes = await db
          .select({
            nodeOrder: ecoRunNodes.nodeOrder,
            nodeType: ecoRunNodes.nodeType,
            nodeStatus: ecoRunNodes.nodeStatus,
            scoreEarned: ecoRunNodes.scoreEarned,
            movesUsed: ecoRunNodes.movesUsed,
            hazardProfile: ecoRunNodes.hazardProfile,
          })
          .from(ecoRunNodes)
          .where(eq(ecoRunNodes.runId, s.id))
          .orderBy(ecoRunNodes.nodeOrder);

        const meta = s.metadata as Record<string, unknown>;
        return {
          id: s.id,
          status: s.runStatus,
          locationKey: s.locationKey,
          realm: s.realm,
          biome: s.biome,
          bioregion: s.bioregion,
          scoreTotal: s.scoreTotal,
          finalScore: meta?.finalScore ?? null,
          nodeCount: s.nodeCountPlanned,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          affinities: meta?.activeAffinities ?? [],
          deductionSummary: meta?.deductionSummary ?? null,
          nodes: nodes.map(n => ({
            nodeOrder: n.nodeOrder,
            nodeType: n.nodeType,
            nodeStatus: n.nodeStatus,
            scoreEarned: n.scoreEarned,
            movesUsed: n.movesUsed,
            counterGem: (n.hazardProfile as Record<string, unknown>)?.counterGem ?? null,
            obstacleFamily: (n.hazardProfile as Record<string, unknown>)?.obstacleFamily ?? null,
          })),
        };
      })
    );

    return NextResponse.json({ runs });
  } catch (error) {
    console.error('[API GET /api/runs/list] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 });
  }
}
