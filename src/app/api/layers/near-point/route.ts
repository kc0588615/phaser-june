import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { buildSquare } from '@/lib/geoUtils';

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

    const square30km = buildSquare(lon, lat, 60000);
    const squareJson = JSON.stringify(square30km.geometry);
    const pointWkt = `SRID=4326;POINT(${lon} ${lat})`;

    // Rivers — unesco.world_rivers (SRID 3857)
    let riverFeatures: unknown[] = [];
    try {
      const rows = await db.execute<GeoJsonRow>(sql`
        WITH pt AS (SELECT ST_Transform(ST_GeomFromEWKT(${pointWkt}), 3857) AS geom)
        SELECT
          ST_AsGeoJSON(ST_Transform(ST_Simplify(r.geom, 100), 4326)) AS geojson,
          json_build_object('gid', r.gid, 'river_map', r.river_map,
            'distance_m', ST_Distance(r.geom, pt.geom)
          )::text AS properties
        FROM unesco.world_rivers r CROSS JOIN pt
        WHERE ST_DWithin(r.geom, pt.geom, 30000)
        ORDER BY ST_Distance(r.geom, pt.geom) ASC
        LIMIT 50
      `);
      riverFeatures = [...rows].map((r) => ({
        type: 'Feature',
        geometry: JSON.parse(r.geojson),
        properties: JSON.parse(r.properties),
      }));
    } catch { /* no data */ }

    // Protected areas — wpda.wdpa_polygons (SRID 3857)
    let paFeatures: unknown[] = [];
    try {
      const rows = await db.execute<GeoJsonRow>(sql`
        WITH square AS (
          SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(${squareJson}), 4326), 3857) AS geom
        )
        SELECT
          ST_AsGeoJSON(ST_Transform(ST_SimplifyPreserveTopology(p.geom, 500), 4326)) AS geojson,
          json_build_object('site_pid', p.site_pid,
            'name', COALESCE(p.name_eng, p.name),
            'designation', p.desig_eng,
            'iucn_category', p.iucn_cat
          )::text AS properties
        FROM wpda.wdpa_polygons p
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

    // Bioregions — oneearth.oneearth_bioregion (SRID 4326)
    let bioregionFeatures: unknown[] = [];
    try {
      const rows = await db.execute<GeoJsonRow>(sql`
        WITH square AS (
          SELECT ST_SetSRID(ST_GeomFromGeoJSON(${squareJson}), 4326) AS geom
        )
        SELECT
          ST_AsGeoJSON(ST_SimplifyPreserveTopology(b.wkb_geometry, 0.01)) AS geojson,
          json_build_object(
            'ogc_fid', b.ogc_fid,
            'bioregion', b.bioregion,
            'realm', b.realm,
            'biome', b.biome
          )::text AS properties
        FROM oneearth.oneearth_bioregion b
        CROSS JOIN square
        WHERE ST_Intersects(b.wkb_geometry, square.geom)
        LIMIT 6
      `);
      bioregionFeatures = [...rows].map((r) => ({
        type: 'Feature',
        geometry: JSON.parse(r.geojson),
        properties: JSON.parse(r.properties),
      }));
    } catch { /* no data */ }

    // Wetlands — ramsar.wetland (SRID 3857)
    let wetlandFeatures: unknown[] = [];
    try {
      const rows = await db.execute<GeoJsonRow>(sql`
        WITH square AS (
          SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(${squareJson}), 4326), 3857) AS geom
        )
        SELECT
          ST_AsGeoJSON(ST_Transform(ST_SimplifyPreserveTopology(w.geom, 500), 4326)) AS geojson,
          json_build_object('gid', w.gid,
            'ecoregion', w.ecoregion,
            'mht_txt', w.mht_txt
          )::text AS properties
        FROM ramsar.wetland w
        CROSS JOIN square
        WHERE ST_Intersects(w.geom, square.geom)
        LIMIT 10
      `);
      wetlandFeatures = [...rows].map((r) => ({
        type: 'Feature',
        geometry: JSON.parse(r.geojson),
        properties: JSON.parse(r.properties),
      }));
    } catch { /* no data */ }

    // Lakes — wwf.glwd_1 (SRID 3857)
    let lakeFeatures: unknown[] = [];
    try {
      const rows = await db.execute<GeoJsonRow>(sql`
        WITH pt AS (SELECT ST_Transform(ST_GeomFromEWKT(${pointWkt}), 3857) AS geom)
        SELECT
          ST_AsGeoJSON(ST_Transform(ST_SimplifyPreserveTopology(l.geom, 500), 4326)) AS geojson,
          json_build_object('glwd_id', l.glwd_id,
            'lake_name', l.lake_name, 'type', l.type,
            'area_skm', l.area_skm, 'elev_m', l.elev_m,
            'distance_m', ST_Distance(l.geom, pt.geom)
          )::text AS properties
        FROM wwf.glwd_1 l CROSS JOIN pt
        WHERE ST_DWithin(l.geom, pt.geom, 10000)
        ORDER BY ST_Distance(l.geom, pt.geom) ASC
        LIMIT 10
      `);
      lakeFeatures = [...rows].map((r) => ({
        type: 'Feature',
        geometry: JSON.parse(r.geojson),
        properties: JSON.parse(r.properties),
      }));
    } catch { /* no data */ }

    return NextResponse.json({
      rivers: { type: 'FeatureCollection', features: riverFeatures },
      protected_areas: { type: 'FeatureCollection', features: paFeatures },
      bioregions: { type: 'FeatureCollection', features: bioregionFeatures },
      wetlands: { type: 'FeatureCollection', features: wetlandFeatures },
      lakes: { type: 'FeatureCollection', features: lakeFeatures },
    });
  } catch (error) {
    console.error('[API /layers/near-point] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch layer geometries' }, { status: 500 });
  }
}
