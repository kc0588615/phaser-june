import { NextRequest, NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';
import { db, speciesTable, playerSpeciesDiscoveries } from '@/db';
import { getPlayerIdFromClerk } from '@/lib/authHelpers';

/**
 * POST /api/discoveries/migrate
 * Migrate localStorage discoveries to database.
 * Accepts entries explicitly marked as stable species.id values only.
 * Raw import ogc_fid values are intentionally not bridged here because full
 * IUCN reimports can reassign ogc_fid and make old client IDs unsafe.
 * Writes for the signed-in player only; any body userId is ignored.
 * Body: { discoveries: Array<{ id: number, idSource: 'species.id', discoveredAt?: string }> }
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getPlayerIdFromClerk();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { discoveries } = await request.json();

    if (!Array.isArray(discoveries)) {
      return NextResponse.json(
        { error: 'Missing discoveries array' },
        { status: 400 }
      );
    }

    if (discoveries.length === 0) {
      return NextResponse.json({ migrated: 0 });
    }

    const markedDiscoveries = discoveries.filter(
      (d: { idSource?: unknown }) => d.idSource === 'species.id'
    );

    if (markedDiscoveries.length === 0) {
      return NextResponse.json({
        migrated: 0,
        skippedUnmarked: discoveries.length,
      });
    }

    // Get candidate stable species IDs from request
    const candidateIds = markedDiscoveries
      .map((d: { id: unknown }) => Number(d.id))
      .filter((id: number) => Number.isFinite(id));

    if (candidateIds.length === 0) {
      return NextResponse.json({ migrated: 0 });
    }

    // Only stable species.id values are valid. Legacy ogc_fid values are not
    // safe to migrate after raw shapefile reimports because ogc_fid is import-owned.
    const validSpeciesRows = await db
      .select({ id: speciesTable.id })
      .from(speciesTable)
      .where(inArray(speciesTable.id, candidateIds));
    const validSpeciesIds = new Set(validSpeciesRows.map(r => r.id));

    const validDiscoveries = markedDiscoveries
      .map((d: { id: unknown; idSource?: string; discoveredAt?: string }) => {
        const rawId = Number(d.id);
        if (!Number.isFinite(rawId)) return null;
        if (!validSpeciesIds.has(rawId)) return null;
        return {
          playerId: userId,
          speciesId: rawId,
          discoveredAt: parseDiscoveredAt(d.discoveredAt),
          incorrectGuessesCount: 0,
          scoreEarned: 0,
        };
      })
      .filter(Boolean) as Array<{
        playerId: string; speciesId: number; discoveredAt: Date;
        incorrectGuessesCount: number; scoreEarned: number;
      }>;

    if (validDiscoveries.length === 0) {
      return NextResponse.json({
        migrated: 0,
        skippedUnmarked: discoveries.length - markedDiscoveries.length,
      });
    }

    // Bulk insert, skip duplicates using onConflictDoNothing
    const result = await db
      .insert(playerSpeciesDiscoveries)
      .values(validDiscoveries)
      .onConflictDoNothing()
      .returning({ id: playerSpeciesDiscoveries.id });

    const migrated = result.length;

    console.log(`[API /discoveries/migrate] Migrated ${migrated} discoveries for user ${userId}`);
    return NextResponse.json({
      migrated,
      skippedUnmarked: discoveries.length - markedDiscoveries.length,
    });
  } catch (error) {
    console.error('[API /discoveries/migrate] Error:', error);
    return NextResponse.json(
      { error: 'Failed to migrate discoveries' },
      { status: 500 }
    );
  }
}

/** A malformed client timestamp falls back to now instead of failing the bulk insert. */
function parseDiscoveredAt(value: unknown): Date {
  const date = typeof value === 'string' ? new Date(value) : new Date(NaN);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}
