import { NextRequest, NextResponse } from 'next/server';
import { inArray, sql } from 'drizzle-orm';
import { db, speciesTable, playerSpeciesDiscoveries } from '@/db';

/**
 * POST /api/discoveries/migrate
 * Migrate localStorage discoveries to database.
 * Accepts both old ogc_fid-based IDs and new species.id values.
 * Body: { userId: string, discoveries: Array<{ id: number, discoveredAt?: string }> }
 */
export async function POST(request: NextRequest) {
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

    // Get candidate IDs from request
    const candidateIds = discoveries
      .map((d: { id: unknown }) => Number(d.id))
      .filter((id: number) => Number.isFinite(id));

    if (candidateIds.length === 0) {
      return NextResponse.json({ migrated: 0 });
    }

    // Build ogc_fid → species.id bridge + valid species.id set in one pass
    const ogcFidMap = new Map<number, number>(); // old ogc_fid → new species.id
    const bridged = await db.execute<{ ogc_fid: number; species_id: number }>(sql`
      SELECT i.ogc_fid, s.id AS species_id
      FROM icaa i
      JOIN species s ON s.iucn_id = i.species_id::bigint
      WHERE i.ogc_fid = ANY(${candidateIds})
    `);
    for (const row of bridged) {
      ogcFidMap.set(row.ogc_fid, row.species_id);
    }

    // Also get valid species.id set for direct matching
    const validSpeciesRows = await db
      .select({ id: speciesTable.id })
      .from(speciesTable)
      .where(inArray(speciesTable.id, candidateIds));
    const validSpeciesIds = new Set(validSpeciesRows.map(r => r.id));

    // Resolve each discovery:
    // - If rawId is a valid species.id, use it directly (handles new localStorage format)
    // - Else if rawId bridges through ogc_fid to a different species.id, use the bridge (legacy)
    // This avoids misremapping when a new species.id collides with an old ogc_fid
    const validDiscoveries = discoveries
      .map((d: { id: unknown; discoveredAt?: string }) => {
        const rawId = Number(d.id);
        if (!Number.isFinite(rawId)) return null;
        const speciesId = validSpeciesIds.has(rawId)
          ? rawId
          : ogcFidMap.get(rawId);
        if (!speciesId) return null;
        return {
          playerId: userId,
          speciesId,
          discoveredAt: d.discoveredAt ? new Date(d.discoveredAt) : new Date(),
          cluesUnlockedBeforeGuess: 0,
          incorrectGuessesCount: 0,
          scoreEarned: 0,
        };
      })
      .filter(Boolean) as Array<{
        playerId: string; speciesId: number; discoveredAt: Date;
        cluesUnlockedBeforeGuess: number; incorrectGuessesCount: number; scoreEarned: number;
      }>;

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
