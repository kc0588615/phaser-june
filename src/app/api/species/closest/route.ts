import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, ensureIcaaViewReady } from '@/db';

interface ClosestSpeciesRow {
  ogc_fid: number;
  common_name: string | null;
  scientific_name: string | null;
  wkb_geometry: string | null;
  distance_meters: number;
  [key: string]: unknown;
}

/**
 * GET /api/species/closest?lon=-30&lat=20
 *
 * Returns the closest species to a point (no distance limit).
 * Uses PostGIS <-> operator for efficient nearest-neighbor search.
 */
export async function GET(request: NextRequest) {
  await ensureIcaaViewReady();
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

    // PostGIS nearest-neighbor query using <-> operator
    const result = await db.execute<ClosestSpeciesRow>(sql`
      SELECT
        ogc_fid,
        common_name,
        scientific_name,
        ST_AsGeoJSON(wkb_geometry)::text as wkb_geometry,
        ST_Distance(
          wkb_geometry::geography,
          ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
        ) as distance_meters
      FROM icaa_view
      WHERE wkb_geometry IS NOT NULL
      ORDER BY wkb_geometry::geography <-> ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
      LIMIT 1
    `);

    // postgres.js returns RowList which is array-like
    const rows = [...result] as ClosestSpeciesRow[];
    if (rows.length === 0) {
      return NextResponse.json({ species: null, geometry: null });
    }

    const closest = rows[0];
    return NextResponse.json({
      species: {
        ogc_fid: closest.ogc_fid,
        common_name: closest.common_name,
        scientific_name: closest.scientific_name,
        distance_km: Math.round(closest.distance_meters / 1000),
      },
      geometry: closest.wkb_geometry ? JSON.parse(closest.wkb_geometry) : null,
    });
  } catch (error) {
    console.error('[API /species/closest] Error:', error);
    return NextResponse.json(
      { error: 'Failed to find closest species' },
      { status: 500 }
    );
  }
}
