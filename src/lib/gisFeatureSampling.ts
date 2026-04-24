import { sql } from 'drizzle-orm';
import { db } from '@/db';
import { buildSquare } from '@/lib/geoUtils';
import type { FeatureClass, FeatureFingerprint } from '@/types/gis';
import type { RoutePoint } from '@/lib/expeditionRoute';

type EnabledLayerSet = Set<string>;

interface SampleGisFeaturesOptions {
  lon: number;
  lat: number;
  sizeMeters?: number;
  enabledLayers?: EnabledLayerSet;
}

interface ProtectedAreaFingerprintRow {
  site_pid: string;
  display_name: string | null;
  name_eng: string | null;
  name: string | null;
  desig_eng: string | null;
  iucn_cat: string | null;
  gov_type: string | null;
  intersect_area_m2: number | string | null;
  [key: string]: unknown;
}

interface BioregionFingerprintRow {
  bioregion: string | null;
  realm: string | null;
  biome: string | null;
  intersect_area_m2: number | string | null;
  distance_m: number | string | null;
  [key: string]: unknown;
}

interface RiverFingerprintRow {
  gid: number;
  river_map: string | null;
  distance_m: number | string;
  [key: string]: unknown;
}

interface LakeFingerprintRow {
  glwd_id: number;
  lake_name: string | null;
  type: string | null;
  area_skm: number | string | null;
  intersect_area_m2: number | string | null;
  distance_m: number | string;
  [key: string]: unknown;
}

interface WetlandFingerprintRow {
  gid: number;
  ecoregion: string | null;
  mht_txt: string | null;
  intersect_area_m2: number | string | null;
  [key: string]: unknown;
}

function toNumber(value: number | string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function layerEnabled(enabledLayers: EnabledLayerSet | undefined, layerKey: string): boolean {
  return !enabledLayers || enabledLayers.has(layerKey);
}

function fingerprintKey(fp: FeatureFingerprint): string {
  return `${fp.featureClass}:${fp.sourceTable}:${String(fp.sourceId)}`;
}

export function dedupeFeatureFingerprints(fingerprints: FeatureFingerprint[]): FeatureFingerprint[] {
  const byKey = new Map<string, FeatureFingerprint>();
  for (const fp of fingerprints) {
    const key = fingerprintKey(fp);
    const existing = byKey.get(key);
    if (!existing || fp.distanceM < existing.distanceM || fp.overlapRatio > existing.overlapRatio) {
      byKey.set(key, fp);
    }
  }
  return [...byKey.values()];
}

export function getGisStampClasses(fingerprints: FeatureFingerprint[]): FeatureClass[] {
  return [...new Set(fingerprints.map((fp) => fp.featureClass))];
}

export async function sampleGisFeaturesAtPoint({
  lon,
  lat,
  sizeMeters = 100,
  enabledLayers,
}: SampleGisFeaturesOptions): Promise<FeatureFingerprint[]> {
  const square = buildSquare(lon, lat, sizeMeters);
  const squareJson = JSON.stringify(square.geometry);
  const pointWkt = `SRID=4326;POINT(${lon} ${lat})`;
  const fingerprints: FeatureFingerprint[] = [];

  try {
    const rows = await db.execute<ProtectedAreaFingerprintRow>(sql`
      WITH square AS (
        SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(${squareJson}), 4326), 3857) AS geom
      )
      SELECT
        p.site_pid,
        COALESCE(p.name_eng, p.name) AS display_name,
        p.name_eng,
        p.name,
        p.desig_eng,
        p.iucn_cat,
        p.gov_type,
        ST_Area(ST_Intersection(p.geom, square.geom)) AS intersect_area_m2
      FROM wpda.wdpa_polygons p
      CROSS JOIN square
      WHERE ST_Intersects(p.geom, square.geom)
      ORDER BY intersect_area_m2 DESC NULLS LAST
      LIMIT 20
    `);

    for (const row of rows) {
      fingerprints.push({
        featureClass: 'protected_area',
        sourceTable: 'wpda.wdpa_polygons',
        sourceId: row.site_pid,
        name: row.display_name ?? row.name_eng ?? row.name ?? null,
        distanceM: 0,
        overlapRatio: toNumber(row.intersect_area_m2) / square.areaM2,
        properties: {
          iucn_cat: row.iucn_cat,
          desig_eng: row.desig_eng,
          gov_type: row.gov_type,
        },
      });
    }
  } catch { /* optional layer */ }

  try {
    const rows = await db.execute<BioregionFingerprintRow>(sql`
      WITH square AS (
        SELECT ST_SetSRID(ST_GeomFromGeoJSON(${squareJson}), 4326) AS geom
      ), pt AS (
        SELECT ST_GeomFromEWKT(${pointWkt}) AS geom
      )
      SELECT
        b.bioregion,
        b.realm,
        b.biome,
        ST_Area(ST_Intersection(b.wkb_geometry, square.geom)::geography) AS intersect_area_m2,
        ST_Distance(b.wkb_geometry::geography, pt.geom::geography) AS distance_m
      FROM oneearth.oneearth_bioregion b
      CROSS JOIN square
      CROSS JOIN pt
      WHERE ST_DWithin(b.wkb_geometry::geography, pt.geom::geography, 5000)
      ORDER BY intersect_area_m2 DESC NULLS LAST
      LIMIT 5
    `);

    for (const row of rows) {
      fingerprints.push({
        featureClass: 'bioregion',
        sourceTable: 'oneearth.oneearth_bioregion',
        sourceId: row.bioregion ?? 'unknown',
        name: row.bioregion,
        distanceM: toNumber(row.distance_m),
        overlapRatio: toNumber(row.intersect_area_m2) / square.areaM2,
        properties: { realm: row.realm, biome: row.biome },
      });
    }
  } catch { /* optional layer */ }

  if (layerEnabled(enabledLayers, 'unesco_rivers')) {
    try {
      const rows = await db.execute<RiverFingerprintRow>(sql`
        WITH pt AS (
          SELECT ST_Transform(ST_GeomFromEWKT(${pointWkt}), 3857) AS geom
        )
        SELECT
          r.gid,
          r.river_map,
          ST_Distance(r.geom, pt.geom) AS distance_m
        FROM unesco.world_rivers r
        CROSS JOIN pt
        WHERE ST_DWithin(r.geom, pt.geom, 20000)
        ORDER BY distance_m ASC
        LIMIT 3
      `);

      for (const row of rows) {
        fingerprints.push({
          featureClass: 'river',
          sourceTable: 'unesco.world_rivers',
          sourceId: row.gid,
          name: row.river_map,
          distanceM: toNumber(row.distance_m),
          overlapRatio: 0,
          properties: { gid: row.gid, river_map: row.river_map },
        });
      }
    } catch { /* optional layer */ }
  }

  if (layerEnabled(enabledLayers, 'wwf_glwd')) {
    try {
      const rows = await db.execute<LakeFingerprintRow>(sql`
        WITH square AS (
          SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(${squareJson}), 4326), 3857) AS geom
        ), pt AS (
          SELECT ST_Transform(ST_GeomFromEWKT(${pointWkt}), 3857) AS geom
        )
        SELECT
          l.glwd_id,
          l.lake_name,
          l.type,
          l.area_skm,
          ST_Area(ST_Intersection(l.geom, square.geom)) AS intersect_area_m2,
          ST_Distance(l.geom, pt.geom) AS distance_m
        FROM wwf.glwd_1 l
        CROSS JOIN square
        CROSS JOIN pt
        WHERE ST_DWithin(l.geom, pt.geom, 5000)
        ORDER BY distance_m ASC
        LIMIT 3
      `);

      for (const row of rows) {
        fingerprints.push({
          featureClass: 'lake',
          sourceTable: 'wwf.glwd_1',
          sourceId: row.glwd_id,
          name: row.lake_name,
          distanceM: toNumber(row.distance_m),
          overlapRatio: toNumber(row.intersect_area_m2) / square.areaM2,
          properties: { type: row.type, area_skm: row.area_skm },
        });
      }
    } catch { /* optional layer */ }
  }

  if (layerEnabled(enabledLayers, 'ramsar_wetland')) {
    try {
      const rows = await db.execute<WetlandFingerprintRow>(sql`
        WITH square AS (
          SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(${squareJson}), 4326), 3857) AS geom
        )
        SELECT
          w.gid,
          w.ecoregion,
          w.mht_txt,
          ST_Area(ST_Intersection(w.geom, square.geom)) AS intersect_area_m2
        FROM ramsar.wetland w
        CROSS JOIN square
        WHERE ST_Intersects(w.geom, square.geom)
        LIMIT 5
      `);

      for (const row of rows) {
        fingerprints.push({
          featureClass: 'ramsar_site',
          sourceTable: 'ramsar.wetland',
          sourceId: row.gid,
          name: row.ecoregion,
          distanceM: 0,
          overlapRatio: toNumber(row.intersect_area_m2) / square.areaM2,
          properties: { mht_txt: row.mht_txt },
        });
      }
    } catch { /* optional layer */ }
  }

  return dedupeFeatureFingerprints(fingerprints);
}

export async function sampleGisFeaturesForRoute(
  points: RoutePoint[],
  options: Omit<SampleGisFeaturesOptions, 'lon' | 'lat'> = {},
): Promise<FeatureFingerprint[]> {
  const samples = await Promise.all(
    points.map((point) => sampleGisFeaturesAtPoint({ ...options, lon: point.lon, lat: point.lat })),
  );
  return dedupeFeatureFingerprints(samples.flat());
}
