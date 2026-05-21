import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/db';

interface GeoJsonRow {
  geojson: string;
  properties: string;
  [key: string]: unknown;
}

function isValidBounds(west: number, south: number, east: number, north: number): boolean {
  return [west, south, east, north].every(Number.isFinite)
    && west >= -180 && east <= 180 && south >= -90 && north <= 90
    && west < east && south < north;
}

function toFeature(row: GeoJsonRow) {
  return {
    type: 'Feature',
    geometry: JSON.parse(row.geojson),
    properties: JSON.parse(row.properties),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lon = Number(searchParams.get('lon'));
    const lat = Number(searchParams.get('lat'));
    const west = Number(searchParams.get('west'));
    const south = Number(searchParams.get('south'));
    const east = Number(searchParams.get('east'));
    const north = Number(searchParams.get('north'));

    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      return NextResponse.json({ error: 'Missing or invalid lon/lat' }, { status: 400 });
    }

    const hasBounds = isValidBounds(west, south, east, north);
    const areaWest = hasBounds ? west : Math.max(-180, lon - 0.35);
    const areaSouth = hasBounds ? south : Math.max(-90, lat - 0.35);
    const areaEast = hasBounds ? east : Math.min(180, lon + 0.35);
    const areaNorth = hasBounds ? north : Math.min(90, lat + 0.35);
    const pointWkt = `SRID=4326;POINT(${lon} ${lat})`;

    let riverFeatures: unknown[] = [];
    try {
      const rows = await db.execute<GeoJsonRow>(sql`
        WITH
          pt AS (SELECT ST_GeomFromEWKT(${pointWkt}) AS geom),
          area AS (SELECT ST_MakeEnvelope(${areaWest}, ${areaSouth}, ${areaEast}, ${areaNorth}, 4326) AS geom)
        SELECT
          ST_AsGeoJSON(ST_Simplify(r.geom, 0.003)) AS geojson,
          json_build_object(
            'gid', r.gid,
            'river_map', r.river_map,
            'distance_m', ST_Distance(r.geom::geography, pt.geom::geography)
          )::text AS properties
        FROM unesco.world_rivers r
        CROSS JOIN pt
        CROSS JOIN area
        WHERE r.geom && area.geom
          AND ST_Intersects(r.geom, area.geom)
        ORDER BY ST_Distance(r.geom::geography, pt.geom::geography) ASC
        LIMIT 80
      `);
      riverFeatures = [...rows].map(toFeature);
    } catch { /* no data */ }

    let paFeatures: unknown[] = [];
    try {
      const rows = await db.execute<GeoJsonRow>(sql`
        WITH area AS (SELECT ST_MakeEnvelope(${areaWest}, ${areaSouth}, ${areaEast}, ${areaNorth}, 4326) AS geom)
        SELECT
          ST_AsGeoJSON(ST_SimplifyPreserveTopology(p.geom, 0.01)) AS geojson,
          json_build_object(
            'site_pid', p.site_pid,
            'name', COALESCE(p.name_eng, p.name),
            'designation', p.desig_eng,
            'iucn_category', p.iucn_cat
          )::text AS properties
        FROM wpda.wdpa_polygons p
        CROSS JOIN area
        WHERE p.geom && area.geom
          AND ST_Intersects(p.geom, area.geom)
        LIMIT 40
      `);
      paFeatures = [...rows].map(toFeature);
    } catch { /* no data */ }

    let bioregionFeatures: unknown[] = [];
    try {
      const rows = await db.execute<GeoJsonRow>(sql`
        WITH area AS (SELECT ST_MakeEnvelope(${areaWest}, ${areaSouth}, ${areaEast}, ${areaNorth}, 4326) AS geom)
        SELECT
          ST_AsGeoJSON(ST_SimplifyPreserveTopology(b.wkb_geometry, 0.02)) AS geojson,
          json_build_object(
            'ogc_fid', b.ogc_fid,
            'bioregion', b.bioregion,
            'realm', b.realm,
            'biome', b.biome,
            'eco_id', b.eco_id,
            'eco_sym', b.eco_sym,
            'hex_color', c.hex_color
          )::text AS properties
        FROM oneearth.oneearth_bioregion b
        LEFT JOIN oneearth.eco_sym_colors c ON c.eco_sym = b.eco_sym
        CROSS JOIN area
        WHERE b.wkb_geometry && area.geom
          AND ST_Intersects(b.wkb_geometry, area.geom)
        LIMIT 6
      `);
      bioregionFeatures = [...rows].map(toFeature);
    } catch { /* no data */ }

    let wetlandFeatures: unknown[] = [];
    try {
      const rows = await db.execute<GeoJsonRow>(sql`
        WITH area AS (SELECT ST_MakeEnvelope(${areaWest}, ${areaSouth}, ${areaEast}, ${areaNorth}, 4326) AS geom)
        SELECT
          ST_AsGeoJSON(ST_SimplifyPreserveTopology(w.geom, 0.01)) AS geojson,
          json_build_object(
            'gid', w.gid,
            'ecoregion', w.ecoregion,
            'mht_txt', w.mht_txt
          )::text AS properties
        FROM ramsar.wetland w
        CROSS JOIN area
        WHERE w.geom && area.geom
          AND ST_Intersects(w.geom, area.geom)
        LIMIT 25
      `);
      wetlandFeatures = [...rows].map(toFeature);
    } catch { /* no data */ }

    let lakeFeatures: unknown[] = [];
    try {
      const rows = await db.execute<GeoJsonRow>(sql`
        WITH
          pt AS (SELECT ST_GeomFromEWKT(${pointWkt}) AS geom),
          area AS (SELECT ST_MakeEnvelope(${areaWest}, ${areaSouth}, ${areaEast}, ${areaNorth}, 4326) AS geom)
        SELECT
          ST_AsGeoJSON(ST_SimplifyPreserveTopology(l.geom, 0.01)) AS geojson,
          json_build_object(
            'glwd_id', l.glwd_id,
            'lake_name', l.lake_name,
            'type', l.type,
            'area_skm', l.area_skm,
            'elev_m', l.elev_m,
            'distance_m', ST_Distance(l.geom::geography, pt.geom::geography)
          )::text AS properties
        FROM wwf.glwd_1 l
        CROSS JOIN pt
        CROSS JOIN area
        WHERE l.geom && area.geom
          AND ST_Intersects(l.geom, area.geom)
        ORDER BY ST_Distance(l.geom::geography, pt.geom::geography) ASC
        LIMIT 25
      `);
      lakeFeatures = [...rows].map(toFeature);
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
