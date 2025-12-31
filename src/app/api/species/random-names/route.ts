import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Build where clause
    const where = excludeId
      ? { ogc_fid: { not: parseInt(excludeId, 10) } }
      : {};

    // Fetch all species names
    const species = await prisma.iCAA.findMany({
      where,
      select: {
        ogc_fid: true,
        comm_name: true,
        sci_name: true,
      },
    });

    // Extract names and shuffle
    const names = species
      .map(s => s.comm_name || s.sci_name || 'Unknown Species')
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
