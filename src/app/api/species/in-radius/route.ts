import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

interface SpatialSpeciesRow {
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
  [key: string]: unknown;
}

/**
 * GET /api/species/in-radius?lon=-122.4&lat=37.7&radius=10000
 *
 * Returns species within a radius (meters) of a point.
 * Uses PostGIS ST_DWithin for efficient spatial query.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lon = parseFloat(searchParams.get('lon') || '');
    const lat = parseFloat(searchParams.get('lat') || '');
    const radiusParam = parseFloat(searchParams.get('radius') || '10000');

    if (isNaN(lon) || isNaN(lat)) {
      return NextResponse.json(
        { error: 'Missing or invalid lon/lat parameters' },
        { status: 400 }
      );
    }

    // Validate radius: must be positive and capped at 500km to prevent timeouts
    const MAX_RADIUS = 500000; // 500km
    const radius = Math.min(Math.max(radiusParam || 10000, 1), MAX_RADIUS);

    // PostGIS spatial query using ST_DWithin on geography type
    const species = await db.execute<SpatialSpeciesRow>(sql`
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
        AND ST_DWithin(
          wkb_geometry::geography,
          ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
          ${radius}
        )
    `);

    // Parse GeoJSON geometry strings (postgres.js returns RowList which is array-like)
    const result = [...species].map((s: SpatialSpeciesRow) => ({
      ...s,
      wkb_geometry: s.wkb_geometry ? JSON.parse(s.wkb_geometry) : null,
    }));

    return NextResponse.json({
      species: result,
      count: result.length,
    });
  } catch (error) {
    console.error('[API /species/in-radius] Error:', error);
    return NextResponse.json(
      { error: 'Failed to query species in radius' },
      { status: 500 }
    );
  }
}
