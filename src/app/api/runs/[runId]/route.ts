import { NextRequest, NextResponse } from 'next/server';
import { and, eq, sql } from 'drizzle-orm';
import { db, ecoRunSessions, ecoRunNodes, runMemories, ecoLocationMastery, speciesCards } from '@/db';
import { createEmptyFeatureMastery, updateFeatureMastery } from '@/lib/featureMastery';
import { buildRunEvidenceBundle } from '@/lib/featureFingerprint';
import type { FeatureFingerprint } from '@/types/gis';

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
    const { resourceWallet, finalScore, deductionSummary, speciesId, featureFingerprints } = body as {
      resourceWallet?: Record<string, number>;
      finalScore?: number;
      deductionSummary?: Record<string, unknown>;
      speciesId?: number;
      featureFingerprints?: unknown[];
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
            };
          });

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
              gisFeaturesNearby: featureFingerprints ?? [],
              deductionSummary: deductionSummary ?? null,
              finalScore,
              realm: session.realm,
              biome: session.biome,
              bioregion: session.bioregion,
            })
            .onConflictDoNothing();

          // Upsert feature mastery on location mastery row
          if (featureFingerprints && featureFingerprints.length > 0 && session.playerId && session.locationKey) {
            try {
              const pid = session.playerId;
              const lk = session.locationKey;
              const bundle = buildRunEvidenceBundle(featureFingerprints as FeatureFingerprint[]);

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

          // Stamp GIS feature classes onto species card
          if (resolvedSpeciesId && session.playerId && featureFingerprints && featureFingerprints.length > 0) {
            try {
              const stamps = [...new Set((featureFingerprints as FeatureFingerprint[]).map(f => f.featureClass))];
              await db
                .update(speciesCards)
                .set({
                  gisStamps: sql`(
                    SELECT COALESCE(jsonb_agg(DISTINCT val), '[]'::jsonb)
                    FROM jsonb_array_elements(COALESCE(${speciesCards.gisStamps}, '[]'::jsonb) || ${JSON.stringify(stamps)}::jsonb) AS val
                  )`,
                  updatedAt: new Date(),
                })
                .where(and(eq(speciesCards.playerId, session.playerId), eq(speciesCards.speciesId, resolvedSpeciesId)));
            } catch (stampErr) {
              console.error('[API PATCH /api/runs/[runId]] gis stamp update failed:', stampErr);
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
