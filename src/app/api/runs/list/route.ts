import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db, ecoRunSessions, ecoRunNodes, runMemories, speciesTable } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { getRecord } from '@/lib/runCaseState';
import { projectDeductionSummary, projectRunForClient, projectRunMemory } from '@/lib/runProjection';

const RESOURCE_WALLET_KEYS = ['habitat', 'morphology', 'diet', 'behavior', 'reproduction', 'taxonomy', 'geographic', 'conservation'] as const;

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

        const meta = getRecord(s.metadata);
        const publicRun = projectRunForClient(s);
        const hasResumeSnapshot = Object.keys(getRecord(meta.expeditionSnapshot)).length > 0;
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

        const publicMemory = projectRunMemory(memory);
        const summary = publicRun.run;
        return {
          id: summary.id,
          status: summary.status,
          locationKey: summary.locationKey,
          realm: summary.realm,
          biome: summary.biome,
          bioregion: summary.bioregion,
          scoreTotal: summary.scoreTotal,
          finalScore: publicMemory?.finalScore ?? null,
          nodeCount: summary.nodeCountPlanned,
          startedAt: summary.startedAt,
          endedAt: summary.endedAt,
          affinities: publicRun.checkpoint.activeAffinities,
          hasResumeSnapshot,
          resourceWallet: projectResourceWallet(meta.resourceWallet),
          deductionSummary: projectDeductionSummary(meta.deductionSummary),
          discoveredSpecies: s.runStatus === 'completed' && memorySpecies ? {
            id: memorySpecies.id,
            name: memorySpecies.commonName || memorySpecies.scientificName,
          } : null,
          routePolyline: publicMemory?.routePolyline ?? [],
          routeBounds: publicMemory?.routeBounds ?? null,
          gisFeaturesNearby: publicMemory?.gisFeaturesNearby ?? [],
          nodes: nodes.map(n => ({
            nodeOrder: n.nodeOrder,
            nodeType: n.nodeType,
            nodeStatus: n.nodeStatus,
            scoreEarned: n.scoreEarned,
            movesUsed: n.movesUsed,
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

function projectResourceWallet(value: unknown): Record<string, number> | null {
  const source = getRecord(value);
  const projected = Object.fromEntries(RESOURCE_WALLET_KEYS.flatMap(key => {
    const amount = source[key];
    return typeof amount === 'number' && Number.isFinite(amount) ? [[key, amount]] : [];
  }));
  return Object.keys(projected).length > 0 ? projected : null;
}
