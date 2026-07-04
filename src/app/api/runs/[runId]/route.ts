import { NextRequest, NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { db, ecoRunSessions, ecoRunNodes, runMemories, ecoLocationMastery, speciesCards } from '@/db';
import { createEmptyFeatureMastery, updateFeatureMastery } from '@/lib/featureMastery';
import { buildRunEvidenceBundle } from '@/lib/featureFingerprint';
import { computeExpeditionRoutePolyline, getRouteBounds, type RoutePoint } from '@/lib/expeditionRoute';
import { dedupeFeatureFingerprints, getGisStampClasses, sampleGisFeaturesForRoute } from '@/lib/gisFeatureSampling';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { refreshSpeciesCardProgress } from '@/lib/speciesCardProgression.server';
import type { RunNode } from '@/lib/nodeScoring';
import type { FeatureFingerprint } from '@/types/gis';

type EcoRunSessionRow = typeof ecoRunSessions.$inferSelect;
type EcoRunNodeRow = typeof ecoRunNodes.$inferSelect;

/**
 * GET /api/runs/[runId]
 * Returns the authenticated player's persisted run state for resume/detail views.
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

    const [memory] = await db
      .select()
      .from(runMemories)
      .where(eq(runMemories.runId, runId))
      .limit(1);

    if (memory?.playerId && memory.playerId !== playerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      run: {
        id: session.id,
        status: session.runStatus,
        playerId: session.playerId,
        gameSessionId: session.gameSessionId,
        runSeed: session.runSeed,
        nodeCountPlanned: session.nodeCountPlanned,
        nodeIndexCurrent: session.nodeIndexCurrent,
        selectedLng: session.selectedLng,
        selectedLat: session.selectedLat,
        selectionZoom: session.selectionZoom,
        locationKey: session.locationKey,
        realm: session.realm,
        biome: session.biome,
        bioregion: session.bioregion,
        moveBudget: session.moveBudget,
        movesUsed: session.movesUsed,
        scoreTotal: session.scoreTotal,
        speciesDiscoveredCount: session.speciesDiscoveredCount,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        metadata: session.metadata,
      },
      nodes: nodes.map(node => ({
        id: node.id,
        runId: node.runId,
        nodeOrder: node.nodeOrder,
        nodeType: node.nodeType,
        nodeStatus: node.nodeStatus,
        objectiveType: node.objectiveType,
        objectiveTarget: node.objectiveTarget,
        objectiveProgress: node.objectiveProgress,
        moveBudget: node.moveBudget,
        movesUsed: node.movesUsed,
        boardSeed: node.boardSeed,
        boardSamplingMethod: node.boardSamplingMethod,
        boardContext: node.boardContext,
        hazardProfile: node.hazardProfile,
        toolProfile: node.toolProfile,
        rewardProfile: node.rewardProfile,
        rewardClaimed: node.rewardClaimed,
        wagerTier: node.wagerTier,
        wagerResult: node.wagerResult,
        guessedSpeciesId: node.guessedSpeciesId,
        guessCorrect: node.guessCorrect,
        scoreEarned: node.scoreEarned,
        dominantHabitat: node.dominantHabitat,
        startedAt: node.startedAt,
        endedAt: node.endedAt,
        createdAt: node.createdAt,
        updatedAt: node.updatedAt,
      })),
      memory: memory ?? null,
      resume: buildResumePayload(session, nodes),
    });
  } catch (error) {
    console.error('[API GET /api/runs/[runId]] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch run' }, { status: 500 });
  }
}

function buildResumePayload(session: EcoRunSessionRow, nodes: EcoRunNodeRow[]) {
  const metadata = getRecord(session.metadata);
  const snapshot = getRecord(metadata.expeditionSnapshot);
  const speciesIds = getNumberArray(metadata.speciesIds);

  return {
    lon: session.selectedLng,
    lat: session.selectedLat,
    correctSpeciesId: getNumberOrNull(metadata.correctSpeciesId),
    speciesIds,
    habitats: getStringArray(metadata.habitats),
    rasterHabitats: Array.isArray(metadata.rasterHabitats) ? metadata.rasterHabitats : [],
    currentNodeIndex: getNumberOrNull(metadata.currentNodeIndex) ?? Math.max(0, session.nodeIndexCurrent - 1),
    resourceWallet: getNumberRecord(metadata.resourceWallet),
    clueFragments: getNumberRecord(metadata.clueFragments),
    bankedScore: getNumberOrNull(metadata.bankedScore) ?? session.scoreTotal,
    featureFingerprints: Array.isArray(metadata.featureFingerprints)
      ? metadata.featureFingerprints as FeatureFingerprint[]
      : [],
    expedition: {
      nodes: nodes.map(reconstructRunNode),
      bioregion: {
        bioregion: session.bioregion,
        realm: session.realm,
        biome: session.biome,
      },
      protectedAreas: Array.isArray(snapshot.protectedAreas) ? snapshot.protectedAreas : [],
      actionBias: getRecord(snapshot.actionBias),
      activeAffinities: getStringArray(metadata.activeAffinities),
      availableAffinities: getStringArray(snapshot.availableAffinities),
      primaryNodeFamily: typeof snapshot.primaryNodeFamily === 'string' ? snapshot.primaryNodeFamily : '',
      primaryVariant: typeof snapshot.primaryVariant === 'string' ? snapshot.primaryVariant : '',
      modifierNodes: getStringArray(snapshot.modifierNodes),
      signals: getNumberRecord(snapshot.signals),
      routePolyline: normalizeRoutePolyline(Array.isArray(metadata.routePolyline) ? metadata.routePolyline : undefined),
      waypoints: Array.isArray(snapshot.waypoints) ? snapshot.waypoints : [],
      waypointRadiusKm: getNumberOrNull(snapshot.waypointRadiusKm),
      nearestRiverDistM: getNumberOrNull(snapshot.nearestRiverDistM),
    },
  };
}

function reconstructRunNode(node: EcoRunNodeRow): RunNode {
  const boardContext = getRecord(node.boardContext);
  const hazardProfile = getRecord(node.hazardProfile);
  const difficulty = Number(boardContext.difficulty);

  return {
    node_type: node.nodeType,
    difficulty: (Number.isInteger(difficulty) ? Math.max(1, Math.min(5, difficulty)) : 1) as RunNode['difficulty'],
    obstacles: Array.isArray(hazardProfile.obstacles) ? hazardProfile.obstacles as RunNode['obstacles'] : [],
    events: getStringArray(hazardProfile.events),
    rationale: typeof boardContext.rationale === 'string' ? boardContext.rationale : '',
    counterGem: typeof hazardProfile.counterGem === 'string' ? hazardProfile.counterGem as RunNode['counterGem'] : null,
    obstacleFamily: typeof hazardProfile.obstacleFamily === 'string' ? hazardProfile.obstacleFamily as RunNode['obstacleFamily'] : null,
    requiredGems: getStringArray(hazardProfile.requiredGems) as RunNode['requiredGems'],
    objectiveTarget: node.objectiveTarget,
    encounterConfig: boardContext.encounterConfig && typeof boardContext.encounterConfig === 'object'
      ? boardContext.encounterConfig as RunNode['encounterConfig']
      : null,
    waypoint: boardContext.waypoint && typeof boardContext.waypoint === 'object'
      ? boardContext.waypoint as RunNode['waypoint']
      : undefined,
  };
}

/**
 * PATCH /api/runs/[runId]
 * Update session metadata (e.g. resource wallet or deduction summary on completion).
 * When finalScore is provided, also persists a run_memories row.
 *
 * Body: { resourceWallet?: Record<string, number>; finalScore?: number; status?: 'active' | 'deduction'; deductionSummary?: Record<string, unknown> }
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

    const playerId = await getPlayerIdFromClerk();
    const [existingSession] = await db
      .select({ playerId: ecoRunSessions.playerId })
      .from(ecoRunSessions)
      .where(eq(ecoRunSessions.id, runId))
      .limit(1);

    if (!existingSession) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    if (existingSession.playerId && existingSession.playerId !== playerId) {
      return NextResponse.json({ error: playerId ? 'Forbidden' : 'Unauthorized' }, { status: playerId ? 403 : 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { resourceWallet, finalScore, deductionSummary, speciesId, featureFingerprints, routePolyline, clueFragments, bankedScore, currentNodeIndex, objectiveProgress, status } = body as {
      resourceWallet?: Record<string, number>;
      finalScore?: number;
      status?: string;
      deductionSummary?: Record<string, unknown>;
      speciesId?: number;
      featureFingerprints?: unknown[];
      routePolyline?: unknown[];
      clueFragments?: Record<string, number>;
      bankedScore?: number;
      currentNodeIndex?: number;
      objectiveProgress?: number;
    };
    const normalizedCheckpointRoute = normalizeRoutePolyline(routePolyline);

    const metadataPatch: Record<string, unknown> = {};
    if (resourceWallet) metadataPatch.resourceWallet = resourceWallet;
    if (clueFragments) metadataPatch.clueFragments = clueFragments;
    if (typeof bankedScore === 'number') metadataPatch.bankedScore = bankedScore;
    if (Number.isInteger(currentNodeIndex)) metadataPatch.currentNodeIndex = currentNodeIndex;
    if (routePolyline) metadataPatch.routePolyline = normalizedCheckpointRoute;
    if (typeof finalScore === 'number') metadataPatch.finalScore = finalScore;
    if (deductionSummary) metadataPatch.deductionSummary = deductionSummary;

    const runStatusPatch = status === 'active' || status === 'deduction' ? status : null;
    if (Object.keys(metadataPatch).length > 0 || runStatusPatch) {
      await db
        .update(ecoRunSessions)
        .set({
          metadata: sql`${ecoRunSessions.metadata} || ${JSON.stringify(metadataPatch)}::jsonb`,
          ...(typeof finalScore === 'number' ? {
            runStatus: 'completed',
            endedAt: new Date(),
            scoreTotal: finalScore,
          } : runStatusPatch ? {
            runStatus: runStatusPatch,
          } : {}),
        })
        .where(eq(ecoRunSessions.id, runId));
    }

    if (typeof currentNodeIndex === 'number' && Number.isInteger(currentNodeIndex) && typeof objectiveProgress === 'number' && Number.isFinite(objectiveProgress)) {
      const nodeOrder = currentNodeIndex + 1;
      await db
        .update(ecoRunNodes)
        .set({
          objectiveProgress: Math.max(0, Math.trunc(objectiveProgress)),
          updatedAt: new Date(),
        })
        .where(and(
          eq(ecoRunNodes.runId, runId),
          eq(ecoRunNodes.nodeOrder, nodeOrder),
          sql`${ecoRunNodes.nodeStatus} <> 'completed'`,
        ));
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

          const nodesSummary = nodes.map(n => {
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
          });

          const providedRoute = normalizedCheckpointRoute;
          const resolvedRoutePolyline = providedRoute.length > 0
            ? providedRoute
            : computeExpeditionRoutePolyline(session.selectedLng, session.selectedLat, nodes.length || session.nodeCountPlanned);

          const providedFingerprints = Array.isArray(featureFingerprints)
            ? featureFingerprints as FeatureFingerprint[]
            : [];
          const routeFingerprints = await sampleGisFeaturesForRoute(
            resolvedRoutePolyline.length > 0
              ? resolvedRoutePolyline
              : [{ lon: session.selectedLng, lat: session.selectedLat }],
          );
          const resolvedFingerprints = dedupeFeatureFingerprints([...providedFingerprints, ...routeFingerprints]);

          await db
            .insert(runMemories)
            .values({
              runId: session.id,
              playerId: session.playerId,
              speciesId: resolvedSpeciesId,
              locationKey: session.locationKey,
              startLon: session.selectedLng,
              startLat: session.selectedLat,
              routePolyline: resolvedRoutePolyline,
              routeBounds: getRouteBounds(resolvedRoutePolyline),
              nodes: nodesSummary,
              gisFeaturesNearby: resolvedFingerprints,
              deductionSummary: deductionSummary ?? null,
              finalScore,
              realm: session.realm,
              biome: session.biome,
              bioregion: session.bioregion,
            })
            .onConflictDoUpdate({
              target: runMemories.runId,
              set: {
                speciesId: resolvedSpeciesId,
                routePolyline: resolvedRoutePolyline,
                routeBounds: getRouteBounds(resolvedRoutePolyline),
                nodes: nodesSummary,
                gisFeaturesNearby: resolvedFingerprints,
                deductionSummary: deductionSummary ?? null,
                finalScore,
              },
            });

          // Upsert feature mastery on location mastery row
          if (resolvedFingerprints.length > 0 && session.playerId && session.locationKey) {
            try {
              const pid = session.playerId;
              const lk = session.locationKey;
              const bundle = buildRunEvidenceBundle(resolvedFingerprints);

              // Read existing row to merge mastery data
              const [existing] = await db
                .select({ metadata: ecoLocationMastery.metadata })
                .from(ecoLocationMastery)
                .where(and(eq(ecoLocationMastery.playerId, pid), eq(ecoLocationMastery.locationKey, lk)))
                .limit(1);

              const current = (existing?.metadata as Record<string, unknown>)?.featureMastery ?? createEmptyFeatureMastery();
              const updated = updateFeatureMastery(current as ReturnType<typeof createEmptyFeatureMastery>, bundle);
              const metaJson = JSON.stringify({ featureMastery: updated });

              await db
                .insert(ecoLocationMastery)
                .values({
                  playerId: pid,
                  locationKey: lk,
                  realm: session.realm,
                  biome: session.biome,
                  bioregion: session.bioregion,
                  runsCompleted: 1,
                  lastPlayedAt: new Date(),
                  metadata: sql`${metaJson}::jsonb`,
                })
                .onConflictDoUpdate({
                  target: [ecoLocationMastery.playerId, ecoLocationMastery.locationKey],
                  set: {
                    metadata: sql`COALESCE(${ecoLocationMastery.metadata}, '{}'::jsonb) || ${metaJson}::jsonb`,
                    runsCompleted: sql`${ecoLocationMastery.runsCompleted} + 1`,
                    lastPlayedAt: new Date(),
                  },
                });
            } catch (fmErr) {
              console.error('[API PATCH /api/runs/[runId]] feature mastery update failed:', fmErr);
            }
          }

          // Keep collectible card progression in sync with completed runs.
          if (resolvedSpeciesId && session.playerId) {
            try {
              const stamps = getGisStampClasses(resolvedFingerprints);
              const regionsSeen = getExpeditionRegionKeys({
                realm: session.realm,
                biome: session.biome,
                bioregion: session.bioregion,
              });
              const affinityTags = getRunAffinityTags(session.metadata);
              await db
                .update(speciesCards)
                .set({
                  ...(stamps.length > 0 ? {
                    gisStamps: sql`(
                      SELECT COALESCE(jsonb_agg(DISTINCT val), '[]'::jsonb)
                      FROM jsonb_array_elements(COALESCE(${speciesCards.gisStamps}, '[]'::jsonb) || ${JSON.stringify(stamps)}::jsonb) AS val
                    )`,
                  } : {}),
                  ...(regionsSeen.length > 0 ? {
                    expeditionRegionsSeen: sql`(
                      SELECT COALESCE(jsonb_agg(DISTINCT val), '[]'::jsonb)
                      FROM jsonb_array_elements(COALESCE(${speciesCards.expeditionRegionsSeen}, '[]'::jsonb) || ${JSON.stringify(regionsSeen)}::jsonb) AS val
                    )`,
                  } : {}),
                  ...(affinityTags.length > 0 ? {
                    affinityTags: sql`(
                      SELECT COALESCE(jsonb_agg(DISTINCT val), '[]'::jsonb)
                      FROM jsonb_array_elements(COALESCE(${speciesCards.affinityTags}, '[]'::jsonb) || ${JSON.stringify(affinityTags)}::jsonb) AS val
                    )`,
                  } : {}),
                  bestRunId: sql`CASE
                    WHEN ${speciesCards.bestRunScore} IS NULL OR ${speciesCards.bestRunScore} < ${finalScore}
                    THEN ${session.id}::uuid
                    ELSE ${speciesCards.bestRunId}
                  END`,
                  bestRunScore: sql`GREATEST(COALESCE(${speciesCards.bestRunScore}, 0), ${finalScore})`,
                  updatedAt: new Date(),
                })
                .where(and(eq(speciesCards.playerId, session.playerId), eq(speciesCards.speciesId, resolvedSpeciesId)));
              await refreshSpeciesCardProgress(session.playerId, resolvedSpeciesId);
            } catch (stampErr) {
              console.error('[API PATCH /api/runs/[runId]] card progression update failed:', stampErr);
            }
          }
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

function normalizeRoutePolyline(routePolyline: unknown[] | undefined): RoutePoint[] {
  if (!Array.isArray(routePolyline)) return [];

  return routePolyline.flatMap((point) => {
    if (!point || typeof point !== 'object') return [];
    const lon = Number((point as { lon?: unknown }).lon);
    const lat = Number((point as { lat?: unknown }).lat);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return [];
    const waypointSlot = Number((point as { waypointSlot?: unknown }).waypointSlot);
    return [Number.isInteger(waypointSlot) ? { lon, lat, waypointSlot } : { lon, lat }];
  });
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
}

function getNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => Number.isInteger(item))
    : [];
}

function getNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getNumberRecord(value: unknown): Record<string, number> {
  const record = getRecord(value);
  return Object.fromEntries(
    Object.entries(record).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]))
  );
}

function getExpeditionRegionKeys(region: { realm: string | null; biome: string | null; bioregion: string | null }): string[] {
  return [
    region.realm ? `realm:${region.realm}` : null,
    region.biome ? `biome:${region.biome}` : null,
    region.bioregion ? `bioregion:${region.bioregion}` : null,
  ].filter((value): value is string => Boolean(value));
}

function getRunAffinityTags(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== 'object') return [];
  const activeAffinities = (metadata as { activeAffinities?: unknown }).activeAffinities;
  return Array.isArray(activeAffinities)
    ? [...new Set(activeAffinities.filter((tag): tag is string => typeof tag === 'string' && tag.length > 0))]
    : [];
}
