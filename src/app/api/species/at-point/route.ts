import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/species/at-point?lon=-122.4&lat=37.7
 *
 * Returns species whose habitat polygon contains the given point.
 * Uses PostGIS ST_Contains for point-in-polygon query.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lon = parseFloat(searchParams.get('lon') || '');
    const lat = parseFloat(searchParams.get('lat') || '');

    if (isNaN(lon) || isNaN(lat)) {
      return NextResponse.json(
        { error: 'Missing or invalid lon/lat parameters' },
        { status: 400 }
      );
    }

    // PostGIS spatial query using ST_Contains
    const species = await prisma.$queryRaw<Array<{
      ogc_fid: number;
      comm_name: string | null;
      sci_name: string | null;
      category: string | null;
      realm: string | null;
      biome: string | null;
      order_: string | null;
      family: string | null;
      genus: string | null;
      diet_type: string | null;
      color_prim: string | null;
      hab_desc: string | null;
      key_fact1: string | null;
      key_fact2: string | null;
      key_fact3: string | null;
      wkb_geometry: string | null;
    }>>`
      SELECT
        ogc_fid,
        comm_name,
        sci_name,
        category,
        realm,
        biome,
        order_,
        family,
        genus,
        diet_type,
        color_prim,
        hab_desc,
        key_fact1,
        key_fact2,
        key_fact3,
        ST_AsGeoJSON(wkb_geometry)::text as wkb_geometry
      FROM icaa
      WHERE wkb_geometry IS NOT NULL
        AND ST_Contains(
          wkb_geometry,
          ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)
        )
    `;

    // Parse GeoJSON geometry strings
    const result = species.map(s => ({
      ...s,
      wkb_geometry: s.wkb_geometry ? JSON.parse(s.wkb_geometry) : null,
    }));

    return NextResponse.json({
      species: result,
      count: result.length,
    });
  } catch (error) {
    console.error('[API /species/at-point] Error:', error);
    return NextResponse.json(
      { error: 'Failed to query species at point' },
      { status: 500 }
    );
  }
}
