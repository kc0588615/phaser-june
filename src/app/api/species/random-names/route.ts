import { NextRequest, NextResponse } from 'next/server';
import { ne } from 'drizzle-orm';
import { db, icaa } from '@/db';

/**
 * GET /api/species/random-names?count=15&exclude=5
 *
 * Returns random species names for the guessing game
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get('count') || '15', 10);
    const excludeId = searchParams.get('exclude');

    // Build query
    let query = db
      .select({
        ogcFid: icaa.ogcFid,
        commonName: icaa.commonName,
        scientificName: icaa.scientificName,
      })
      .from(icaa);

    if (excludeId) {
      query = query.where(ne(icaa.ogcFid, parseInt(excludeId, 10))) as typeof query;
    }

    const species = await query;

    // Extract names and shuffle
    const names = species
      .map(s => s.commonName || s.scientificName || 'Unknown Species')
      .filter(name => name !== 'Unknown Species')
      .sort(() => Math.random() - 0.5)
      .slice(0, count);

    // Add fallbacks if needed
    const fallbacks = [
      'Loggerhead Sea Turtle',
      'Hawksbill Sea Turtle',
      'Leatherback Sea Turtle',
      'Olive Ridley Sea Turtle',
      'Eastern Box Turtle',
      'Painted Turtle',
    ];

    while (names.length < count && fallbacks.length > 0) {
      const fallback = fallbacks.shift()!;
      if (!names.includes(fallback)) {
        names.push(fallback);
      }
    }

    return NextResponse.json({ names });
  } catch (error) {
    console.error('[API /species/random-names] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch random species names' },
      { status: 500 }
    );
  }
}
