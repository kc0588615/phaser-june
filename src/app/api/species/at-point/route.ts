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

    // PostGIS spatial query: join species + icaa geometry
    const species = await db.execute<SpatialSpeciesRow>(sql`
      SELECT DISTINCT ON (s.id)
        s.id,
        s.common_name,
        s.scientific_name,
        s.conservation_code,
        s.realm,
        s.biome,
        s.taxon_order,
        s.family,
        s.genus,
        s.diet_type,
        s.color_primary,
        s.habitat_description,
        ST_AsGeoJSON(i.wkb_geometry)::text as wkb_geometry
      FROM species s
      JOIN icaa i ON i.species_id = s.iucn_id::numeric
      WHERE i.wkb_geometry IS NOT NULL
        AND ST_Contains(
          i.wkb_geometry,
          ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)
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
    console.error('[API /species/at-point] Error:', error);
    return NextResponse.json(
      { error: 'Failed to query species at point' },
      { status: 500 }
    );
  }
}
