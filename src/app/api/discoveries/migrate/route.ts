import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/discoveries/migrate
 * Migrate localStorage discoveries to database.
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

    // Get valid species IDs
    const candidateIds = discoveries
      .map((d: any) => Number(d.id))
      .filter((id: number) => Number.isFinite(id));

    if (candidateIds.length === 0) {
      return NextResponse.json({ migrated: 0 });
    }

    const existingSpecies = await prisma.iCAA.findMany({
      where: { ogc_fid: { in: candidateIds } },
      select: { ogc_fid: true },
    });

    const validIds = new Set(existingSpecies.map(s => s.ogc_fid));

    // Prepare valid discoveries
    const validDiscoveries = discoveries
      .filter((d: any) => {
        const id = Number(d.id);
        return Number.isFinite(id) && validIds.has(id);
      })
      .map((d: any) => ({
        player_id: userId,
        species_id: Number(d.id),
        discovered_at: d.discoveredAt ? new Date(d.discoveredAt) : new Date(),
        clues_unlocked_before_guess: 0,
        incorrect_guesses_count: 0,
        score_earned: 0,
      }));

    if (validDiscoveries.length === 0) {
      return NextResponse.json({ migrated: 0 });
    }

    // Upsert discoveries
    let migrated = 0;
    for (const discovery of validDiscoveries) {
      try {
        await prisma.playerSpeciesDiscovery.upsert({
          where: {
            player_species_unique: {
              player_id: discovery.player_id,
              species_id: discovery.species_id,
            },
          },
          create: discovery,
          update: {}, // Don't update if exists
        });
        migrated++;
      } catch (err) {
        console.error('Failed to upsert discovery:', err);
      }
    }

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
