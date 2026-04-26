import { NextRequest, NextResponse } from 'next/server';
import { db, ecoRunSessions, ecoRunNodes } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import type { RunNode } from '@/lib/nodeScoring';
import { GRID_COLS, GRID_ROWS } from '@/game/constants';
import { buildNodeBoardContext } from '@/game/nodeObstacles';
import type { FeatureFingerprint } from '@/types/gis';
import type { RasterHabitatResult } from '@/lib/speciesService';
import type { AffinityType } from '@/expedition/affinities';

/**
 * POST /api/runs
 * Create a new expedition run session with 6 pre-generated nodes.
 *
 * Body: { lon, lat, locationKey, nodes: RunNode[], activeAffinities?, bioregion?, realm?, biome?, runSeed?, ...resume snapshot }
 * Returns: { runId, nodeIds: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      lon,
      lat,
      locationKey,
      nodes,
      activeAffinities,
      bioregion,
      realm,
      biome,
      runSeed,
      correctSpeciesId,
      speciesIds,
      habitats,
      rasterHabitats,
      featureFingerprints,
      routePolyline,
      expeditionSnapshot,
    } = body as {
      lon: number;
      lat: number;
      locationKey: string;
      nodes: RunNode[];
      activeAffinities?: AffinityType[];
      bioregion?: string;
      realm?: string;
      biome?: string;
      runSeed?: number;
      correctSpeciesId?: number;
      speciesIds?: number[];
      habitats?: string[];
      rasterHabitats?: RasterHabitatResult[];
      featureFingerprints?: FeatureFingerprint[];
      routePolyline?: Array<{ lon: number; lat: number }>;
      expeditionSnapshot?: Record<string, unknown>;
    };

    if (!Number.isFinite(lon) || !Number.isFinite(lat) || !locationKey || !Array.isArray(nodes) || nodes.length === 0) {
      return NextResponse.json({ error: 'Missing required fields: lon, lat, locationKey, nodes' }, { status: 400 });
    }

    // Resolve player from auth (optional — anonymous runs allowed)
    const playerId = await getPlayerIdFromClerk();

    const { runId, insertedNodes } = await db.transaction(async (tx) => {
      const [session] = await tx
        .insert(ecoRunSessions)
        .values({
          playerId: playerId ?? undefined,
          selectedLng: lon,
          selectedLat: lat,
          locationKey,
          nodeCountPlanned: nodes.length,
          nodeIndexCurrent: 1,
          runSeed: runSeed ?? null,
          realm: realm ?? null,
          biome: biome ?? null,
          bioregion: bioregion ?? null,
          runStatus: 'active',
          metadata: {
            activeAffinities: activeAffinities ?? [],
            correctSpeciesId: Number.isInteger(correctSpeciesId) ? correctSpeciesId : null,
            speciesIds: Array.isArray(speciesIds) ? speciesIds.filter(Number.isInteger) : [],
            habitats: Array.isArray(habitats) ? habitats.filter((value): value is string => typeof value === 'string') : [],
            rasterHabitats: Array.isArray(rasterHabitats) ? rasterHabitats : [],
            featureFingerprints: Array.isArray(featureFingerprints) ? featureFingerprints : [],
            routePolyline: Array.isArray(routePolyline) ? routePolyline : [],
            expeditionSnapshot: expeditionSnapshot && typeof expeditionSnapshot === 'object' ? expeditionSnapshot : {},
          },
        })
        .returning({ id: ecoRunSessions.id });

      const nodeRows = nodes.map((node, i) => {
        const boardContext = buildNodeBoardContext({
          width: GRID_COLS,
          height: GRID_ROWS,
          obstacles: node.obstacles,
          nodeIndex: i,
        });

        return {
          runId: session.id,
          nodeOrder: i + 1,
          nodeType: node.node_type,
          nodeStatus: i === 0 ? 'active' : 'locked',
          hazardProfile: {
            obstacles: node.obstacles,
            events: node.events,
            requiredGems: node.requiredGems ?? [],
            counterGem: node.counterGem ?? null,
            obstacleFamily: node.obstacleFamily ?? null,
          },
          toolProfile: { activeAffinities: activeAffinities ?? [] },
          boardContext: { rationale: node.rationale, difficulty: node.difficulty, encounterConfig: node.encounterConfig ?? null, ...boardContext },
          objectiveType: node.counterGem ? 'counter_gem_match' : 'match_count',
          objectiveTarget: node.objectiveTarget ?? 0,
        };
      });

      const insertedNodes = await tx
        .insert(ecoRunNodes)
        .values(nodeRows)
        .returning({ id: ecoRunNodes.id, nodeOrder: ecoRunNodes.nodeOrder });

      return { runId: session.id, insertedNodes };
    });

    return NextResponse.json({
      runId,
      nodeIds: insertedNodes.sort((a, b) => a.nodeOrder - b.nodeOrder).map((n) => n.id),
    });
  } catch (error) {
    console.error('[API POST /api/runs] Error:', error);
    return NextResponse.json({ error: 'Failed to create run session' }, { status: 500 });
  }
}
