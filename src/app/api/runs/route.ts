import { createHmac, randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { cascadeHints, db, ecoRunNodes, ecoRunSessions, evidenceFamilyCards, evidenceFamilyHints, speciesDeductionProfiles, speciesTable } from '@/db';
import { GRID_COLS, GRID_ROWS } from '@/game/constants';
import { buildNodeBoardContext } from '@/game/nodeObstacles';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { buildAnswerPrior } from '@/lib/answerPrior';
import { type CompilerSpeciesProfile } from '@/lib/caseTraits';
import { compileCaseV4, type CompilerCascadeHint, type CompilerEvidenceFamilyCard, type CompilerEvidenceFamilyHint } from '@/lib/caseCompilerV3';
import { createEmptyEvidenceCharges } from '@/expedition/evidenceFamilies';
import { EVIDENCE_PROTOTYPE_IUCN_IDS } from '@/lib/evidenceSeedValidation';
import { applyWaypointsToRunNodes, MYSTERY_NODE_COUNT, type RunNode } from '@/lib/nodeScoring';
import { parsePublicCaseSnapshot, projectRunCreateResponse } from '@/lib/runProjection';
import { resolveRunCreationIdentifiers } from '@/lib/runCaseState';
import { deriveExpeditionMapView } from '@/expedition/mapView';
import { RELAXED_RESEARCH_SITE_SPACING_KM, satisfiesResearchSiteSpacing } from '@/expedition/siteSpacing';
import { harvestExpeditionWaypoints } from '@/lib/waypointHarvesting';
import { getMysteryCaseForIucnId } from '@/lib/mysteryCaseCatalog.server';

export async function POST(request: NextRequest) {
  try {
    const playerId = await getPlayerIdFromClerk();
    if (!playerId) return NextResponse.json({ error: 'Sign in before starting an expedition' }, { status: 401 });
    const secret = process.env.CASE_COMPILER_SECRET;
    if (!secret) return NextResponse.json({ error: 'Case compiler unavailable: CASE_COMPILER_SECRET is not configured' }, { status: 503 });
    const body = await request.json();
    const identifiers = resolveRunCreationIdentifiers(body?.createRequestId, randomUUID);
    if (!identifiers) return NextResponse.json({ error: 'createRequestId must be a UUID when provided' }, { status: 400 });
    const { runId, createRequestId } = identifiers;
    const [existing] = await db.select().from(ecoRunSessions).where(and(
      eq(ecoRunSessions.playerId, playerId),
      eq(ecoRunSessions.createRequestId, createRequestId),
    )).limit(1);
    if (existing) {
      const casePublic = parsePublicCaseSnapshot(record(existing.metadata).casePublic);
      if (!casePublic) return NextResponse.json({ error: 'Existing run creation is not reusable' }, { status: 409 });
      const existingNodes = await db.select({ id: ecoRunNodes.id, nodeOrder: ecoRunNodes.nodeOrder })
        .from(ecoRunNodes).where(eq(ecoRunNodes.runId, existing.id)).orderBy(ecoRunNodes.nodeOrder);
      return NextResponse.json(projectRunCreateResponse({
        runId: existing.id,
        nodeIds: existingNodes.map(node => node.id),
        casePublic,
      }));
    }
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

    let preparedNodes = applyWaypointsToRunNodes(nodes);
    if (!nodesMeetResearchSpacing(preparedNodes)) {
      try {
        const harvested = await harvestExpeditionWaypoints({ lon, lat });
        preparedNodes = applyWaypointsToRunNodes(nodes.map((node, index) => ({
          ...node,
          waypoint: harvested.waypoints[index],
        })));
        metadataInput.routePolyline = harvested.routePolyline;
        metadataInput.expeditionSnapshot = {
          ...metadataInput.expeditionSnapshot,
          waypoints: harvested.waypoints,
          waypointRadiusKm: harvested.radiusKm,
        };
      } catch (error) {
        console.warn('[API POST /api/runs] Waypoint spacing repair unavailable:', error);
      }
    }
    if (!nodesMeetResearchSpacing(preparedNodes)) {
      console.warn('[API POST /api/runs] Run created with unavailable research-site spacing.');
    }
    if (!hasValidNodeContract(preparedNodes)) {
      return NextResponse.json({ error: 'Expected three valid expedition nodes' }, { status: 400 });
    }

    const speciesRows = await db.select().from(speciesTable).where(inArray(speciesTable.iucnId, [...EVIDENCE_PROTOTYPE_IUCN_IDS]));
    if (speciesRows.length !== EVIDENCE_PROTOTYPE_IUCN_IDS.length
      || new Set(speciesRows.map(row => row.iucnId)).size !== EVIDENCE_PROTOTYPE_IUCN_IDS.length) {
      return NextResponse.json({ error: 'Prototype species corpus is unavailable' }, { status: 503 });
    }
    const speciesIds = speciesRows.map(row => row.id);
    const [profileRows, cardRows, hintRows, cascadeRows] = await Promise.all([
      db.select().from(speciesDeductionProfiles).where(inArray(speciesDeductionProfiles.speciesId, speciesIds)),
      db.select().from(evidenceFamilyCards).where(and(
        inArray(evidenceFamilyCards.speciesId, speciesIds),
        eq(evidenceFamilyCards.reviewStatus, 'reviewed'),
      )),
      db.select().from(evidenceFamilyHints).where(and(
        inArray(evidenceFamilyHints.speciesId, speciesIds),
        eq(evidenceFamilyHints.reviewStatus, 'reviewed'),
      )),
      db.select().from(cascadeHints).where(eq(cascadeHints.reviewStatus, 'reviewed')),
    ]);
    const profiles = profileRows as CompilerSpeciesProfile[];

    const caseSeed = createHmac('sha256', secret).update(runId).digest('hex');
    const gisPrior = buildAnswerPrior(speciesRows.map(row => ({ speciesId: row.id, ...row })), getWaypointAnchors(metadataInput.expeditionSnapshot));
    const compiled = compileCaseV4({
      caseSeed,
      prototypeSpeciesIds: speciesIds,
      speciesPool: profiles,
      cardsBySpecies: new Map<number, CompilerEvidenceFamilyCard[]>(cardRows.reduce<Array<[number, CompilerEvidenceFamilyCard[]]>>((entries, row) => {
        const existing = entries.find(([speciesId]) => speciesId === row.speciesId);
        const card: CompilerEvidenceFamilyCard = { ...row };
        if (existing) existing[1].push(card); else entries.push([row.speciesId, [card]]);
        return entries;
      }, [])),
      hintsBySpecies: new Map<number, CompilerEvidenceFamilyHint[]>(hintRows.reduce<Array<[number, CompilerEvidenceFamilyHint[]]>>((entries, row) => {
        const existing = entries.find(([speciesId]) => speciesId === row.speciesId);
        const hint: CompilerEvidenceFamilyHint = { ...row };
        if (existing) existing[1].push(hint); else entries.push([row.speciesId, [hint]]);
        return entries;
      }, [])),
      cascadeHints: cascadeRows.map((row): CompilerCascadeHint => ({ ...row })),
      gisPrior,
      boardSeeds: preparedNodes.map(node => node.boardSeed!),
      mapView: deriveExpeditionMapView(preparedNodes, { lon, lat }, stringOrNull(body.biome)),
      mysteryCasesBySpeciesId: new Map(speciesRows.flatMap(row => {
        const mystery = getMysteryCaseForIucnId(Number(row.iucnId));
        return mystery ? [[row.id, mystery] as const] : [];
      })),
      answerTermsBySpeciesId: new Map(speciesRows.map(row => [row.id, answerTerms(row.commonName, row.scientificName)])),
    });
    if ('error' in compiled) {
      console.error('[API POST /api/runs] Compiler rejected corpus:', compiled.error, compiled.message);
      return NextResponse.json({ error: 'Case compilation unavailable' }, { status: 503 });
    }

    const created = await db.transaction(async tx => {
      const insertedSession = await tx.insert(ecoRunSessions).values({
        id: runId,
        playerId,
        createRequestId,
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
          evidenceApplications: [],
          ...metadataInput,
        },
      }).onConflictDoNothing().returning({ id: ecoRunSessions.id });

      if (insertedSession.length === 0) {
        const [replayed] = await tx.select().from(ecoRunSessions).where(and(
          eq(ecoRunSessions.playerId, playerId),
          eq(ecoRunSessions.createRequestId, createRequestId),
        )).limit(1);
        const replayedCase = parsePublicCaseSnapshot(record(replayed?.metadata).casePublic);
        if (!replayed || !replayedCase) {
          throw new Error('Run creation conflict is not reusable');
        }
        const replayedNodes = await tx.select({ id: ecoRunNodes.id, nodeOrder: ecoRunNodes.nodeOrder })
          .from(ecoRunNodes).where(eq(ecoRunNodes.runId, replayed.id)).orderBy(ecoRunNodes.nodeOrder);
        return {
          runId: replayed.id,
          nodeIds: replayedNodes.map(node => node.id),
          casePublic: replayedCase,
        };
      }

      const insertedNodes = await tx.insert(ecoRunNodes).values(preparedNodes.map((node, index) => ({
        runId,
        nodeOrder: index + 1,
        nodeType: node.node_type,
        nodeStatus: index === 0 ? 'active' : 'locked',
        hazardProfile: { obstacles: node.obstacles, events: node.events, obstacleFamily: node.obstacleFamily ?? null },
        toolProfile: { activeAffinities: metadataInput.activeAffinities },
        boardContext: {
          rationale: node.rationale,
          difficulty: node.difficulty,
          caseVersion: 4,
          evidenceCharges: createEmptyEvidenceCharges(),
          carriedCharges: createEmptyEvidenceCharges(),
          hintCounts: createEmptyEvidenceCharges(),
          cascadeHintCount: 0,
          lastHintIds: [],
          selectedFamilies: [],
          segmentMovesUsed: 0,
          waypoint: node.waypoint ?? null,
          ...buildNodeBoardContext({ width: GRID_COLS, height: GRID_ROWS, obstacles: node.obstacles, nodeIndex: index }),
        },
        objectiveType: 'evidence_family',
        objectiveTarget: 6,
        moveBudget: 6,
        boardSeed: node.boardSeed,
      }))).returning({ id: ecoRunNodes.id, nodeOrder: ecoRunNodes.nodeOrder });
      return {
        runId,
        nodeIds: insertedNodes.sort((a, b) => a.nodeOrder - b.nodeOrder).map(node => node.id),
        casePublic: compiled.public,
      };
    });

    return NextResponse.json(projectRunCreateResponse(created));
  } catch (error) {
    console.error('[API POST /api/runs] Error:', error);
    return NextResponse.json({ error: 'Failed to create run session' }, { status: 500 });
  }
}

function hasValidNodeContract(nodes: RunNode[]): boolean {
  return nodes.length === MYSTERY_NODE_COUNT && nodes.every((node) => Number.isInteger(node.boardSeed)
    && node.boardSeed! >= 0 && node.boardSeed! <= 0xffff_ffff);
}

function nodesMeetResearchSpacing(nodes: readonly RunNode[]): boolean {
  const sites = nodes.slice(0, 3).flatMap(node => node.waypoint ? [{ lon: node.waypoint.lon, lat: node.waypoint.lat }] : []);
  return satisfiesResearchSiteSpacing(sites, RELAXED_RESEARCH_SITE_SPACING_KM);
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

function answerTerms(commonName: string | null, scientificName: string | null): string[] {
  return [...new Set([
    commonName,
    scientificName,
    scientificName?.split(/\s+/u)[0],
    ...(commonName?.split(/\s+/u) ?? []),
  ].filter((value): value is string => typeof value === 'string' && value.length >= 4))];
}

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
