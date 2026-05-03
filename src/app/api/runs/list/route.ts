import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db, ecoRunSessions, ecoRunNodes, runMemories, speciesTable } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';

/**
 * GET /api/runs/list?status=completed&limit=20
 * Use comma-separated statuses to fetch multiple run states.
 * Returns the authenticated player's recent expedition runs with node summaries.
 */
export async function GET(request: NextRequest) {
  try {
    const playerId = await getPlayerIdFromClerk();
    if (!playerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const statusParam = request.nextUrl.searchParams.get('status') || 'completed';
    const statuses = statusParam
      .split(',')
      .map(status => status.trim())
      .filter(Boolean);
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '20', 10), 50);

    const sessions = await db
      .select()
      .from(ecoRunSessions)
      .where(and(
        statuses.length > 1
          ? inArray(ecoRunSessions.runStatus, statuses)
          : eq(ecoRunSessions.runStatus, statuses[0] ?? 'completed'),
        eq(ecoRunSessions.playerId, playerId),
      ))
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
            boardContext: ecoRunNodes.boardContext,
          })
          .from(ecoRunNodes)
          .where(eq(ecoRunNodes.runId, s.id))
          .orderBy(ecoRunNodes.nodeOrder);

        const meta = s.metadata as Record<string, unknown>;
        const hasResumeSnapshot = Boolean(meta?.expeditionSnapshot && typeof meta.expeditionSnapshot === 'object');
        const [memory] = await db
          .select()
          .from(runMemories)
          .where(eq(runMemories.runId, s.id))
          .limit(1);
        const [memorySpecies] = memory?.speciesId
          ? await db
            .select({
              id: speciesTable.id,
              commonName: speciesTable.commonName,
              scientificName: speciesTable.scientificName,
            })
            .from(speciesTable)
            .where(eq(speciesTable.id, memory.speciesId))
            .limit(1)
          : [];

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
          hasResumeSnapshot,
          resourceWallet: meta?.resourceWallet ?? null,
          deductionSummary: meta?.deductionSummary ?? null,
          discoveredSpecies: memorySpecies ? {
            id: memorySpecies.id,
            name: memorySpecies.commonName || memorySpecies.scientificName,
          } : null,
          routePolyline: memory?.routePolyline ?? [],
          routeBounds: memory?.routeBounds ?? null,
          gisFeaturesNearby: memory?.gisFeaturesNearby ?? [],
          nodes: nodes.map(n => ({
            nodeOrder: n.nodeOrder,
            nodeType: n.nodeType,
            nodeStatus: n.nodeStatus,
            scoreEarned: n.scoreEarned,
            movesUsed: n.movesUsed,
            counterGem: (n.hazardProfile as Record<string, unknown>)?.counterGem ?? null,
            obstacleFamily: (n.hazardProfile as Record<string, unknown>)?.obstacleFamily ?? null,
            waypoint: ((n.boardContext as Record<string, unknown>)?.waypoint as Record<string, unknown> | null | undefined) ?? null,
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
