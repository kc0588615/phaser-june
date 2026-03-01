import { NextRequest, NextResponse } from 'next/server';
import { db, ecoRunSessions, ecoRunNodes } from '@/db';
import type { RunNode } from '@/lib/nodeScoring';

/**
 * POST /api/runs
 * Create a new expedition run session with 6 pre-generated nodes.
 *
 * Body: { lon, lat, locationKey, nodes: RunNode[], bioregion?, realm?, biome?, runSeed? }
 * Returns: { runId, nodeIds: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lon, lat, locationKey, nodes, bioregion, realm, biome, runSeed } = body as {
      lon: number;
      lat: number;
      locationKey: string;
      nodes: RunNode[];
      bioregion?: string;
      realm?: string;
      biome?: string;
      runSeed?: number;
    };

    if (!Number.isFinite(lon) || !Number.isFinite(lat) || !locationKey || !Array.isArray(nodes) || nodes.length === 0) {
      return NextResponse.json({ error: 'Missing required fields: lon, lat, locationKey, nodes' }, { status: 400 });
    }

    // Insert session
    const [session] = await db
      .insert(ecoRunSessions)
      .values({
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
      })
      .returning({ id: ecoRunSessions.id });

    // Insert all nodes
    const nodeRows = nodes.map((node, i) => ({
      runId: session.id,
      nodeOrder: i + 1,
      nodeType: node.node_type,
      nodeStatus: i === 0 ? 'active' : 'locked',
      hazardProfile: { obstacles: node.obstacles, events: node.events, requiredGems: node.requiredGems ?? [] },
      boardContext: { rationale: node.rationale, difficulty: node.difficulty },
      objectiveType: (node.requiredGems?.length ?? 0) > 0 ? 'required_gem_match' : 'any',
      objectiveTarget: node.objectiveTarget ?? 0,
    }));

    const insertedNodes = await db
      .insert(ecoRunNodes)
      .values(nodeRows)
      .returning({ id: ecoRunNodes.id, nodeOrder: ecoRunNodes.nodeOrder });

    return NextResponse.json({
      runId: session.id,
      nodeIds: insertedNodes.sort((a, b) => a.nodeOrder - b.nodeOrder).map((n) => n.id),
    });
  } catch (error) {
    console.error('[API POST /api/runs] Error:', error);
    return NextResponse.json({ error: 'Failed to create run session' }, { status: 500 });
  }
}
