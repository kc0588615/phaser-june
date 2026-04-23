import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

interface SpatialSpeciesRow {
  id: number;
  common_name: string | null;
  scientific_name: string | null;
  conservation_code: string | null;
  realm: string | null;
  biome: string | null;
  taxon_order: string | null;
  family: string | null;
  genus: string | null;
  diet_type: string | null;
  color_primary: string | null;
  habitat_description: string | null;
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

    // PostGIS spatial query: join species + icaa geometry, return all species columns
    const species = await db.execute<SpatialSpeciesRow>(sql`
      SELECT DISTINCT ON (s.id)
        s.*,
        ST_AsGeoJSON(i.wkb_geometry)::text as wkb_geometry
      FROM species s
      JOIN icaa i ON i.species_id = s.iucn_id::numeric
      WHERE i.wkb_geometry IS NOT NULL
        AND ST_DWithin(
          i.wkb_geometry::geography,
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
