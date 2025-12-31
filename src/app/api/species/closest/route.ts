import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/species/closest?lon=-30&lat=20
 *
 * Returns the closest species to a point (no distance limit).
 * Uses PostGIS <-> operator for efficient nearest-neighbor search.
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

    // PostGIS nearest-neighbor query using <-> operator
    const result = await prisma.$queryRaw<Array<{
      ogc_fid: number;
      comm_name: string | null;
      sci_name: string | null;
      wkb_geometry: string | null;
      distance_meters: number;
    }>>`
      SELECT
        ogc_fid,
        comm_name,
        sci_name,
        ST_AsGeoJSON(wkb_geometry)::text as wkb_geometry,
        ST_Distance(
          wkb_geometry::geography,
          ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
        ) as distance_meters
      FROM icaa
      WHERE wkb_geometry IS NOT NULL
      ORDER BY wkb_geometry::geography <-> ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
      LIMIT 1
    `;

    if (result.length === 0) {
      return NextResponse.json({ species: null, geometry: null });
    }

    const closest = result[0];
    return NextResponse.json({
      species: {
        ogc_fid: closest.ogc_fid,
        comm_name: closest.comm_name,
        sci_name: closest.sci_name,
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
