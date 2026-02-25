import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { buildSquare } from '@/lib/geoUtils';

async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await db.execute<{ table_name: string | null }>(
      sql.raw(`SELECT to_regclass('public.${tableName}') AS table_name`)
    );
    return !!result[0]?.table_name;
  } catch {
    return false;
  }
}

interface GeoJsonRow {
  geojson: string;
  properties: string;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lon = Number(searchParams.get('lon'));
    const lat = Number(searchParams.get('lat'));

    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      return NextResponse.json({ error: 'Missing or invalid lon/lat' }, { status: 400 });
    }

    const square30km = buildSquare(lon, lat, 60000); // 30km half-width
    const squareJson = JSON.stringify(square30km.geometry);
    const pointWkt = `SRID=4326;POINT(${lon} ${lat})`;

    // Rivers — simplified polylines within 30km
    let riverFeatures: unknown[] = [];
    if (await tableExists('hydro_rivers')) {
      try {
        const rows = await db.execute<GeoJsonRow>(sql`
          WITH pt AS (SELECT ST_GeomFromEWKT(${pointWkt}) AS geom)
          SELECT
            ST_AsGeoJSON(ST_Simplify(r.geom, 0.001)) AS geojson,
            json_build_object('hyriv_id', r.hyriv_id, 'ord_stra', r.ord_stra,
              'distance_m', ST_Distance(r.geom::geography, pt.geom::geography)
            )::text AS properties
          FROM hydro_rivers r CROSS JOIN pt
          WHERE ST_DWithin(r.geom::geography, pt.geom::geography, 30000)
          ORDER BY ST_Distance(r.geom::geography, pt.geom::geography) ASC
          LIMIT 50
        `);
        riverFeatures = [...rows].map((r) => ({
          type: 'Feature',
          geometry: JSON.parse(r.geojson),
          properties: JSON.parse(r.properties),
        }));
      } catch { /* no data */ }
    }

    // Protected areas — simplified polygons intersecting 30km square
    let paFeatures: unknown[] = [];
    if (await tableExists('protected_planet_parcels')) {
      try {
        const rows = await db.execute<GeoJsonRow>(sql`
          WITH square AS (
            SELECT ST_SetSRID(ST_GeomFromGeoJSON(${squareJson}), 4326) AS geom
          )
          SELECT
            ST_AsGeoJSON(ST_SimplifyPreserveTopology(p.geom, 0.005)) AS geojson,
            json_build_object('site_pid', p.site_pid,
              'name', COALESCE(p.name_english, p.name),
              'designation', p.designation_name,
              'iucn_category', p.iucn_category_name
            )::text AS properties
          FROM protected_planet_parcels p
          CROSS JOIN square
          WHERE ST_Intersects(p.geom, square.geom)
          LIMIT 20
        `);
        paFeatures = [...rows].map((r) => ({
          type: 'Feature',
          geometry: JSON.parse(r.geojson),
          properties: JSON.parse(r.properties),
        }));
      } catch { /* no data */ }
    }

    // ICCA points within 50km
    let iccaFeatures: unknown[] = [];
    if (await tableExists('icca_registry_point')) {
      try {
        const rows = await db.execute<GeoJsonRow>(sql`
          WITH pt AS (SELECT ST_GeomFromEWKT(${pointWkt}) AS geom)
          SELECT
            ST_AsGeoJSON(i.geom) AS geojson,
            json_build_object('wdpa_id', i.wdpa_id, 'name', i.name,
              'comm_name', i.comm_name, 'habit_type', i.habit_type,
              'distance_m', ST_Distance(i.geom::geography, pt.geom::geography)
            )::text AS properties
          FROM icca_registry_point i CROSS JOIN pt
          WHERE ST_DWithin(i.geom::geography, pt.geom::geography, 50000)
          ORDER BY ST_Distance(i.geom::geography, pt.geom::geography) ASC
          LIMIT 10
        `);
        iccaFeatures = [...rows].map((r) => ({
          type: 'Feature',
          geometry: JSON.parse(r.geojson),
          properties: JSON.parse(r.properties),
        }));
      } catch { /* no data */ }
    }

    return NextResponse.json({
      rivers: { type: 'FeatureCollection', features: riverFeatures },
      protected_areas: { type: 'FeatureCollection', features: paFeatures },
      icca: { type: 'FeatureCollection', features: iccaFeatures },
    });
  } catch (error) {
    console.error('[API /layers/near-point] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch layer geometries' }, { status: 500 });
  }
}
