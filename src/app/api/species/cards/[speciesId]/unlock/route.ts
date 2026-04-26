import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db, speciesCards, speciesCardUnlocks, speciesTable } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';
import { getSpeciesCardRarityTier } from '@/lib/speciesCardProgression';
import { refreshSpeciesCardProgress } from '@/lib/speciesCardProgression.server';

/**
 * POST /api/species/cards/[speciesId]/unlock
 * Record an unlock event (discover, fact, stamp, clue, clue_category, set-complete).
 * playerId derived from Clerk session.
 *
 * Body: { runId?, unlockType, payload? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ speciesId: string }> }
) {
  try {
    const playerId = await getPlayerIdFromClerk();
    if (!playerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { speciesId } = await params;
    const body = await request.json();
    const { runId, unlockType, payload } = body as {
      runId?: string;
      unlockType: string;
      payload?: Record<string, unknown>;
    };

    const sid = parseInt(speciesId, 10);
    if (isNaN(sid) || !unlockType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isEncounter = unlockType === 'discover' || unlockType === 'encounter';
    const facts = getStringArray(payload?.facts);
    const stamps = getStringArray(payload?.stamps);
    const categories = getStringArray(payload?.categories);
    const [speciesMeta] = await db
      .select({ conservationCode: speciesTable.conservationCode })
      .from(speciesTable)
      .where(eq(speciesTable.id, sid))
      .limit(1);
    if (!speciesMeta) {
      return NextResponse.json({ error: 'Species not found' }, { status: 404 });
    }
    const conservationCode = speciesMeta?.conservationCode ?? null;
    const shouldUnlockFacts = unlockType === 'fact' || unlockType === 'clue';
    const shouldUnlockStamps = unlockType === 'stamp';
    const shouldUnlockCategories = unlockType === 'clue_category' || unlockType === 'clue';

    // Upsert species_cards row
    await db
      .insert(speciesCards)
      .values({
        playerId,
        speciesId: sid,
        discovered: unlockType === 'discover',
        firstDiscoveredAt: unlockType === 'discover' ? new Date() : undefined,
        lastEncounteredAt: isEncounter ? new Date() : undefined,
        timesEncountered: isEncounter ? 1 : 0,
        bestRunId: runId ?? null,
        conservationCode,
        rarityTier: getSpeciesCardRarityTier(conservationCode),
        factsUnlocked: shouldUnlockFacts && facts.length > 0 ? facts : undefined,
        gisStamps: shouldUnlockStamps && stamps.length > 0 ? stamps : undefined,
        clueCategoriesUnlocked: shouldUnlockCategories && categories.length > 0 ? categories : undefined,
      })
      .onConflictDoUpdate({
        target: [speciesCards.playerId, speciesCards.speciesId],
        set: {
          ...(isEncounter ? {
            lastEncounteredAt: new Date(),
            timesEncountered: sql`${speciesCards.timesEncountered} + 1`,
          } : {}),
          ...(unlockType === 'discover' ? {
            discovered: true,
            firstDiscoveredAt: sql`COALESCE(${speciesCards.firstDiscoveredAt}, now())`,
          } : {}),
          conservationCode,
          rarityTier: getSpeciesCardRarityTier(conservationCode),
          ...(shouldUnlockFacts && facts.length > 0 ? {
            factsUnlocked: sql`(
              SELECT jsonb_agg(DISTINCT val)
              FROM jsonb_array_elements(${speciesCards.factsUnlocked} || ${JSON.stringify(facts)}::jsonb) AS val
            )`,
          } : {}),
          ...(shouldUnlockStamps && stamps.length > 0 ? {
            gisStamps: sql`(
              SELECT jsonb_agg(DISTINCT val)
              FROM jsonb_array_elements(${speciesCards.gisStamps} || ${JSON.stringify(stamps)}::jsonb) AS val
            )`,
          } : {}),
          ...(shouldUnlockCategories && categories.length > 0 ? {
            clueCategoriesUnlocked: sql`(
              SELECT jsonb_agg(DISTINCT val)
              FROM jsonb_array_elements(${speciesCards.clueCategoriesUnlocked} || ${JSON.stringify(categories)}::jsonb) AS val
            )`,
          } : {}),
          updatedAt: new Date(),
        },
      });

    // Log the unlock event
    await db.insert(speciesCardUnlocks).values({
      playerId,
      speciesId: sid,
      runId: runId ?? null,
      unlockType,
      payload: payload ?? {},
    });

    await refreshSpeciesCardProgress(playerId, sid);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[API POST /api/species/cards/[speciesId]/unlock] Error:', error);
    return NextResponse.json({ error: 'Failed to record unlock' }, { status: 500 });
  }
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))]
    : [];
}
