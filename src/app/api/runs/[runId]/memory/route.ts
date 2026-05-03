import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, ecoRunSessions, ecoRunNodes, runMemories } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';

/**
 * GET /api/runs/[runId]/memory
 * Returns the run memory record, or builds one on-the-fly from session+nodes.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const playerId = await getPlayerIdFromClerk();
    if (!playerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { runId } = await params;
    if (!runId) {
      return NextResponse.json({ error: 'Missing runId' }, { status: 400 });
    }

    // Check if run_memory already exists
    const [existing] = await db
      .select()
      .from(runMemories)
      .where(eq(runMemories.runId, runId))
      .limit(1);

    if (existing) {
      if (existing.playerId !== playerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.json({ memory: existing });
    }

    // Build from session + nodes
    const [session] = await db
      .select()
      .from(ecoRunSessions)
      .where(eq(ecoRunSessions.id, runId))
      .limit(1);

    if (!session) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    if (session.playerId !== playerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const nodes = await db
      .select()
      .from(ecoRunNodes)
      .where(eq(ecoRunNodes.runId, runId))
      .orderBy(ecoRunNodes.nodeOrder);

    const memory = {
      runId: session.id,
      locationKey: session.locationKey,
      startLon: session.selectedLng,
      startLat: session.selectedLat,
      realm: session.realm,
      biome: session.biome,
      bioregion: session.bioregion,
      finalScore: (session.metadata as Record<string, unknown>)?.finalScore as number | null ?? null,
      deductionSummary: (session.metadata as Record<string, unknown>)?.deductionSummary ?? null,
      nodes: nodes.map(n => {
        const bc = (n.boardContext as Record<string, unknown>) ?? {};
        return {
          nodeOrder: n.nodeOrder,
          nodeType: n.nodeType,
          nodeStatus: n.nodeStatus,
          counterGem: (n.hazardProfile as Record<string, unknown>)?.counterGem ?? null,
          obstacleFamily: (n.hazardProfile as Record<string, unknown>)?.obstacleFamily ?? null,
          objectiveTarget: n.objectiveTarget,
          objectiveProgress: n.objectiveProgress,
          scoreEarned: n.scoreEarned,
          movesUsed: n.movesUsed,
          encounterOutcome: bc.encounterOutcome ?? null,
          encounterConfig: bc.encounterConfig ?? null,
          waypoint: bc.waypoint ?? null,
        };
      }),
      startedAt: session.startedAt,
      endedAt: session.endedAt,
    };

    return NextResponse.json({ memory });
  } catch (error) {
    console.error('[API GET /api/runs/[runId]/memory] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch run memory' }, { status: 500 });
  }
}
