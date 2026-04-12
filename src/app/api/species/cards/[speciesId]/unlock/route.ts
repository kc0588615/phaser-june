import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, speciesCards, speciesCardUnlocks } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';

/**
 * POST /api/species/cards/[speciesId]/unlock
 * Record an unlock event (discover, fact, stamp, set-complete).
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
          ...(unlockType === 'fact' && payload?.facts ? {
            factsUnlocked: sql`(
              SELECT jsonb_agg(DISTINCT val)
              FROM jsonb_array_elements(${speciesCards.factsUnlocked} || ${JSON.stringify(payload.facts)}::jsonb) AS val
            )`,
          } : {}),
          ...(unlockType === 'stamp' && payload?.stamps ? {
            gisStamps: sql`(
              SELECT jsonb_agg(DISTINCT val)
              FROM jsonb_array_elements(${speciesCards.gisStamps} || ${JSON.stringify(payload.stamps)}::jsonb) AS val
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

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[API POST /api/species/cards/[speciesId]/unlock] Error:', error);
    return NextResponse.json({ error: 'Failed to record unlock' }, { status: 500 });
  }
}
