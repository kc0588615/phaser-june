import { NextRequest, NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';
import { db, icaa } from '@/db';

/**
 * GET /api/species/bioregions?ids=1,2,3
 * POST /api/species/bioregions { species_ids: [1, 2, 3] }
 *
 * Returns bioregion data for species by intersecting with OneEarth bioregion polygons.
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
      return NextResponse.json({ bioregions: [] });
    }

    const bioregions = await getBioregionsForSpecies(ids);
    return NextResponse.json({ bioregions });
  } catch (error) {
    console.error('[API /species/bioregions] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch species bioregions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids: number[] = body.species_ids || body.ids || [];

    if (ids.length === 0) {
      return NextResponse.json({ bioregions: [] });
    }

    const bioregions = await getBioregionsForSpecies(ids);
    return NextResponse.json({ bioregions });
  } catch (error) {
    console.error('[API /species/bioregions] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch species bioregions' },
      { status: 500 }
    );
  }
}

async function getBioregionsForSpecies(speciesIds: number[]) {
  // Get species with their pre-populated bioregion columns
  // (bioregion data is already stored in icaa table)
  const species = await db
    .select({
      ogcFid: icaa.ogcFid,
      bioregion: icaa.bioregion,
      realm: icaa.realm,
      subrealm: icaa.subrealm,
      biome: icaa.biome,
    })
    .from(icaa)
    .where(inArray(icaa.ogcFid, speciesIds));

  return species.map(s => ({
    species_id: s.ogcFid,
    bioregion: s.bioregion,
    realm: s.realm,
    subrealm: s.subrealm,
    biome: s.biome,
  }));
}
