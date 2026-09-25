import { NextResponse, type NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import type { SpeciesRange } from '@/clueGame/rangeMap';

type RangeRow = { svg_path: string; lon: number; lat: number; area_km2: string | number };

/**
 * GET /api/clue-game/range?species=<id>
 * One species' range map for Clue Match, from the clue_match_ranges
 * materialized view (db/schema.sql). 404 when the species has no range map.
 */
export async function GET(request: NextRequest) {
  const speciesId = Number(request.nextUrl.searchParams.get('species'));
  if (!Number.isInteger(speciesId) || speciesId <= 0) {
    return NextResponse.json({ error: 'species must be a positive integer id' }, { status: 400 });
  }
  try {
    const [row] = await db.execute<RangeRow>(sql`
      SELECT svg_path, lon, lat, area_km2 FROM clue_match_ranges WHERE species_id = ${speciesId}`);
    if (!row) return NextResponse.json({ error: 'No range map for this species' }, { status: 404 });
    const range: SpeciesRange = { speciesId, path: row.svg_path, lon: Number(row.lon), lat: Number(row.lat), areaKm2: Number(row.area_km2) };
    return NextResponse.json(range, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  } catch (error) {
    console.error('[API /clue-game/range] Error:', error);
    return NextResponse.json({ error: 'Failed to load the range map' }, { status: 500 });
  }
}
