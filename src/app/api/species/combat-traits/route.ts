import { NextRequest, NextResponse } from 'next/server';
import { getCombatTraitsByIds } from '@/lib/speciesQueries';
import { drizzleToSnake } from '@/lib/drizzleToSnake';

/**
 * GET /api/species/combat-traits?ids=1,2,3
 * Batch fetch species_combat_traits rows for match-battle enemy generation.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json(
        { error: 'Missing ids parameter' },
        { status: 400 }
      );
    }

    const ids = idsParam.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

    if (ids.length === 0) {
      return NextResponse.json({ traits: [] });
    }

    const rows = await getCombatTraitsByIds(ids);

    return NextResponse.json({ traits: rows.map(drizzleToSnake) });
  } catch (error) {
    console.error('[API /species/combat-traits] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch combat traits' },
      { status: 500 }
    );
  }
}
