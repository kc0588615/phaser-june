import { NextRequest, NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';
import { db, icaaView, ensureIcaaViewReady, playerSpeciesDiscoveries } from '@/db';

/**
 * POST /api/discoveries/migrate
 * Migrate localStorage discoveries to database.
 * Body: { userId: string, discoveries: Array<{ id: number, discoveredAt?: string }> }
 */
export async function POST(request: NextRequest) {
  await ensureIcaaViewReady();
  try {
    const body = await request.json();
    const { userId, discoveries } = body;

    if (!userId || !discoveries || !Array.isArray(discoveries)) {
      return NextResponse.json(
        { error: 'Missing userId or discoveries array' },
        { status: 400 }
      );
    }

    if (discoveries.length === 0) {
      return NextResponse.json({ migrated: 0 });
    }

    // Get valid species IDs
    const candidateIds = discoveries
      .map((d: { id: unknown }) => Number(d.id))
      .filter((id: number) => Number.isFinite(id));

    if (candidateIds.length === 0) {
      return NextResponse.json({ migrated: 0 });
    }

    const existingSpecies = await db
      .select({ ogcFid: icaaView.ogcFid })
      .from(icaaView)
      .where(inArray(icaaView.ogcFid, candidateIds));

    const validIds = new Set(existingSpecies.map(s => s.ogcFid));

    // Prepare valid discoveries
    const validDiscoveries = discoveries
      .filter((d: { id: unknown }) => {
        const id = Number(d.id);
        return Number.isFinite(id) && validIds.has(id);
      })
      .map((d: { id: unknown; discoveredAt?: string }) => ({
        playerId: userId,
        speciesId: Number(d.id),
        discoveredAt: d.discoveredAt ? new Date(d.discoveredAt) : new Date(),
        cluesUnlockedBeforeGuess: 0,
        incorrectGuessesCount: 0,
        scoreEarned: 0,
      }));

    if (validDiscoveries.length === 0) {
      return NextResponse.json({ migrated: 0 });
    }

    // Bulk insert, skip duplicates using onConflictDoNothing
    const result = await db
      .insert(playerSpeciesDiscoveries)
      .values(validDiscoveries)
      .onConflictDoNothing()
      .returning({ id: playerSpeciesDiscoveries.id });

    const migrated = result.length;

    console.log(`[API /discoveries/migrate] Migrated ${migrated} discoveries for user ${userId}`);
    return NextResponse.json({ migrated });
  } catch (error) {
    console.error('[API /discoveries/migrate] Error:', error);
    return NextResponse.json(
      { error: 'Failed to migrate discoveries' },
      { status: 500 }
    );
  }
}
