import { NextResponse, type NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

type RangeRow = { species_id: number; geojson: string; lon: number; lat: number };

/**
 * GET /api/clue-game/ranges?species=<id>,<id>,...
 * Several species' ranges for the globe as one GeoJSON FeatureCollection, from
 * the clue_match_ranges view (db/schema.sql). Each feature's properties carry
 * speciesId and lon/lat, a point inside the range for a marker. Species without
 * a range are left out.
 */
export async function GET(request: NextRequest) {
  const ids = (request.nextUrl.searchParams.get('species') ?? '').split(',').map(Number);
  if (ids.length > 500 || !ids.every(id => Number.isInteger(id) && id > 0)) {
    return NextResponse.json({ error: 'species must be up to 500 comma-separated positive integer ids' }, { status: 400 });
  }
  try {
    const rows = await db.execute<RangeRow>(sql`
      SELECT species_id, geojson, lon, lat FROM clue_match_ranges
      WHERE species_id IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)}) ORDER BY species_id`);
    const ranges: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [...rows].map(row => ({
        type: 'Feature',
        properties: { speciesId: row.species_id, lon: Number(row.lon), lat: Number(row.lat) },
        geometry: JSON.parse(row.geojson),
      })),
    };
    return NextResponse.json(ranges, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  } catch (error) {
    console.error('[API /clue-game/ranges] Error:', error);
    return NextResponse.json({ error: 'Failed to load the ranges' }, { status: 500 });
  }
}
