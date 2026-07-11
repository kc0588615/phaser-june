import { createHmac, randomUUID } from 'node:crypto';
import { inArray } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db, ecoRunNodes, ecoRunSessions, evidenceCards, speciesDeductionProfiles, speciesTable } from '@/db';
import { METHOD_SLOTS } from '@/expedition/domain';
import { GRID_COLS, GRID_ROWS } from '@/game/constants';
import { buildNodeBoardContext } from '@/game/nodeObstacles';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { buildAnswerPrior } from '@/lib/answerPrior';
import { compileCase, type CompilerCard, type CompilerSpeciesProfile } from '@/lib/caseCompiler';
import { EVIDENCE_PROTOTYPE_IUCN_IDS } from '@/lib/evidenceSeedValidation';
import { applyWaypointsToRunNodes, MYSTERY_NODE_COUNT, type RunNode } from '@/lib/nodeScoring';
import { projectRunCreateResponse } from '@/lib/runProjection';

export async function POST(request: NextRequest) {
  const secret = process.env.CASE_COMPILER_SECRET;
  if (!secret) return NextResponse.json({ error: 'Case compiler unavailable: CASE_COMPILER_SECRET is not configured' }, { status: 503 });

  try {
    const body = await request.json();
    const lon = Number(body?.lon);
    const lat = Number(body?.lat);
    const locationKey = typeof body?.locationKey === 'string' ? body.locationKey.trim() : '';
    const nodes = Array.isArray(body?.nodes) ? body.nodes as RunNode[] : [];
    if (!Number.isFinite(lon) || lon < -180 || lon > 180 || !Number.isFinite(lat) || lat < -90 || lat > 90
      || !locationKey || locationKey.length > 200 || nodes.length !== MYSTERY_NODE_COUNT || jsonSize(nodes) > 65_536
      || !validOptionalString(body.realm, 160) || !validOptionalString(body.biome, 160) || !validOptionalString(body.bioregion, 160)) {
      return NextResponse.json({ error: 'Missing required fields: lon, lat, locationKey, nodes' }, { status: 400 });
    }
    const metadataInput = validateMetadataInput(body);
    if (!metadataInput) return NextResponse.json({ error: 'Run metadata exceeds allowed shape or size' }, { status: 400 });

    const preparedNodes = applyWaypointsToRunNodes(nodes);
    if (!hasValidNodeContract(preparedNodes)) {
      return NextResponse.json({ error: 'Expected three valid track, observe, and survey nodes' }, { status: 400 });
    }

    const speciesRows = await db.select().from(speciesTable).where(inArray(speciesTable.iucnId, [...EVIDENCE_PROTOTYPE_IUCN_IDS]));
    if (speciesRows.length !== EVIDENCE_PROTOTYPE_IUCN_IDS.length
      || new Set(speciesRows.map(row => row.iucnId)).size !== EVIDENCE_PROTOTYPE_IUCN_IDS.length) {
      return NextResponse.json({ error: 'Prototype species corpus is unavailable' }, { status: 503 });
    }
    const speciesIds = speciesRows.map(row => row.id);
    const [profileRows, cardRows] = await Promise.all([
      db.select().from(speciesDeductionProfiles).where(inArray(speciesDeductionProfiles.speciesId, speciesIds)),
      db.select().from(evidenceCards).where(inArray(evidenceCards.speciesId, speciesIds)),
    ]);
    const profiles = profileRows as CompilerSpeciesProfile[];
    const cardsBySpecies = new Map<number, CompilerCard[]>();
    for (const row of cardRows) {
      if (row.compareTags.length !== 1) return NextResponse.json({ error: 'Prototype evidence corpus is invalid' }, { status: 503 });
      const card: CompilerCard = { ...row, compareTag: row.compareTags[0] };
      cardsBySpecies.set(row.speciesId, [...(cardsBySpecies.get(row.speciesId) ?? []), card]);
    }

    const runId = randomUUID();
    const caseSeed = createHmac('sha256', secret).update(runId).digest('hex');
    const compiled = compileCase({
      caseSeed,
      prototypeSpeciesIds: speciesIds,
      speciesPool: profiles,
      cardsBySpecies,
      gisPrior: buildAnswerPrior(speciesRows.map(row => ({ speciesId: row.id, ...row })), getWaypointAnchors(metadataInput.expeditionSnapshot)),
      routeMethods: METHOD_SLOTS,
      boardSeeds: preparedNodes.map(node => node.boardSeed!),
    });
    if ('error' in compiled) {
      console.error('[API POST /api/runs] Compiler rejected corpus:', compiled.error, compiled.message);
      return NextResponse.json({ error: 'Case compilation unavailable' }, { status: 503 });
    }

    const playerId = await getPlayerIdFromClerk();
    if (!playerId) return NextResponse.json({ error: 'Sign in before starting an expedition' }, { status: 401 });
    const insertedNodes = await db.transaction(async tx => {
      await tx.insert(ecoRunSessions).values({
        id: runId,
        playerId,
        selectedLng: lon,
        selectedLat: lat,
        locationKey,
        nodeCountPlanned: MYSTERY_NODE_COUNT,
        nodeIndexCurrent: 1,
        realm: stringOrNull(body.realm),
        biome: stringOrNull(body.biome),
        bioregion: stringOrNull(body.bioregion),
        runStatus: 'active',
        metadata: {
          casePublic: compiled.public,
          casePrivate: compiled.private,
          observationsIssued: [],
          reasoningEvents: [],
          ...metadataInput,
        },
      });

      return tx.insert(ecoRunNodes).values(preparedNodes.map((node, index) => ({
        runId,
        nodeOrder: index + 1,
        nodeType: node.node_type,
        nodeStatus: index === 0 ? 'active' : 'locked',
        hazardProfile: { obstacles: node.obstacles, events: node.events, obstacleFamily: node.obstacleFamily ?? null },
        toolProfile: { activeAffinities: metadataInput.activeAffinities },
        boardContext: {
          rationale: node.rationale,
          difficulty: node.difficulty,
          method: METHOD_SLOTS[index],
          waypoint: node.waypoint ?? null,
          ...buildNodeBoardContext({ width: GRID_COLS, height: GRID_ROWS, obstacles: node.obstacles, nodeIndex: index }),
        },
        objectiveType: 'method_match',
        objectiveTarget: node.objectiveTarget,
        moveBudget: node.moveBudget ?? 0,
        boardSeed: node.boardSeed,
      }))).returning({ id: ecoRunNodes.id, nodeOrder: ecoRunNodes.nodeOrder });
    });

    return NextResponse.json(projectRunCreateResponse({
      runId,
      nodeIds: insertedNodes.sort((a, b) => a.nodeOrder - b.nodeOrder).map(node => node.id),
      casePublic: compiled.public,
    }));
  } catch (error) {
    console.error('[API POST /api/runs] Error:', error);
    return NextResponse.json({ error: 'Failed to create run session' }, { status: 500 });
  }
}

function hasValidNodeContract(nodes: RunNode[]): boolean {
  return nodes.length === MYSTERY_NODE_COUNT && nodes.every((node, index) => node.method === METHOD_SLOTS[index]
    && node.objectiveType === 'method_match' && Number.isInteger(node.objectiveTarget) && node.objectiveTarget > 0
    && Number.isInteger(node.boardSeed) && node.boardSeed! >= 0 && node.boardSeed! <= 0xffff_ffff);
}

function getWaypointAnchors(snapshotValue: unknown): Array<{ waypointType: string }> {
  const snapshot = record(snapshotValue);
  const waypoints = Array.isArray(snapshot.waypoints) ? snapshot.waypoints : [];
  return waypoints.flatMap(value => {
    const waypoint = record(value);
    return typeof waypoint.waypointType === 'string' ? [{ waypointType: waypoint.waypointType }] : [];
  });
}

function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function stringArray(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function stringOrNull(value: unknown): string | null { return typeof value === 'string' && value ? value : null; }

function validateMetadataInput(body: Record<string, unknown>) {
  const activeAffinities = boundedStringArray(body.activeAffinities, 12, 80);
  const habitats = boundedStringArray(body.habitats, 50, 160);
  const rasterHabitats = boundedJsonArray(body.rasterHabitats, 50, 16_384);
  const featureFingerprints = boundedJsonArray(body.featureFingerprints, 100, 32_768);
  const routePolyline = boundedJsonArray(body.routePolyline, 512, 32_768);
  const expeditionSnapshot = record(body.expeditionSnapshot);
  if (!activeAffinities || !habitats || !rasterHabitats || !featureFingerprints || !routePolyline
    || jsonSize(expeditionSnapshot) > 32_768) return null;
  return { activeAffinities, habitats, rasterHabitats, featureFingerprints, routePolyline, expeditionSnapshot };
}

function boundedStringArray(value: unknown, maxItems: number, maxItemLength: number): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maxItems || value.some(item => typeof item !== 'string' || item.length > maxItemLength)) return null;
  return value as string[];
}

function boundedJsonArray(value: unknown, maxItems: number, maxBytes: number): unknown[] | null {
  if (value === undefined) return [];
  return Array.isArray(value) && value.length <= maxItems && jsonSize(value) <= maxBytes ? value : null;
}

function jsonSize(value: unknown): number {
  try { return Buffer.byteLength(JSON.stringify(value)); } catch { return Number.POSITIVE_INFINITY; }
}

function validOptionalString(value: unknown, maxLength: number): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.length <= maxLength);
}
