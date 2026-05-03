import { sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  classifyWdpaDesignation,
  WDPA_CATEGORY_PRIORITY,
} from '@/lib/waypointClassification';
import type {
  ExpeditionWaypoint,
  WaypointNodeRole,
  WaypointType,
  WdpaDesignationCategory,
} from '@/types/waypoints';

export interface ExpeditionWaypointRoute {
  origin: { lon: number; lat: number };
  radiusKm: number;
  waypoints: ExpeditionWaypoint[];
  routePolyline: Array<{ lon: number; lat: number; waypointSlot: number }>;
  debug: { candidateCounts: Record<WaypointType, number> };
}

interface HarvestOptions {
  lon: number;
  lat: number;
}

interface BaseCandidate {
  waypointType: WaypointType;
  name: string | null;
  lon: number | string | null;
  lat: number | string | null;
  dist_m: number | string | null;
  source_id: string | number | null;
  source_table: string;
  [key: string]: unknown;
}

interface CityCandidateRow extends BaseCandidate {
  pop_max: number | string | null;
}

interface RiverCandidateRow extends BaseCandidate {
  length_m: number | string | null;
}

interface LakeCandidateRow extends BaseCandidate {
  area_skm: number | string | null;
}

interface WetlandCandidateRow extends BaseCandidate {
  ramsar2014: number | string | null;
  intersect_area_m2: number | string | null;
}

interface ProtectedAreaCandidateRow extends BaseCandidate {
  desig_eng: string | null;
  iucn_cat: string | null;
  gov_type: string | null;
  gis_area: number | string | null;
  rep_area: number | string | null;
}

type CandidateRow =
  | CityCandidateRow
  | RiverCandidateRow
  | LakeCandidateRow
  | WetlandCandidateRow
  | ProtectedAreaCandidateRow
  | BaseCandidate;

interface Candidate {
  key: string;
  waypointType: WaypointType;
  name: string;
  lon: number;
  lat: number;
  distKm: number;
  rankScore: number;
  sourceTable: string | null;
  sourceId: string | number | null;
  designationCategory?: WdpaDesignationCategory;
  fallback: boolean;
}

const SEARCH_RADII_KM = [100, 200, 400] as const;
const NODE_ROLES: WaypointNodeRole[] = [
  'start',
  'river',
  'water',
  'protected_area',
  'protected_area_alt',
  'final',
];

const WAYPOINT_RANKING = {
  city: {
    populationLogWeight: 18,
    distancePenaltyPerKm: 0.22,
  },
  river: {
    lengthLogWeight: 12,
    distancePenaltyPerKm: 0.3,
  },
  lake: {
    areaLogWeight: 18,
    distancePenaltyPerKm: 0.28,
  },
  wetland: {
    baseScore: 42,
    ramsarBoost: 20,
    areaLogWeight: 5,
    distancePenaltyPerKm: 0.28,
  },
  protectedArea: {
    areaLogWeight: 10,
    distancePenaltyPerKm: 0.24,
  },
  bioregionEdge: {
    baseScore: 20,
    distancePenaltyPerKm: 0.05,
  },
} as const;

function toFiniteNumber(value: number | string | null | undefined, fallback = 0): number {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

function isValidCoordinate(lon: number, lat: number): boolean {
  return Number.isFinite(lon) && Number.isFinite(lat) && lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;
}

function bboxDegreesForRadius(radiusKm: number, lat: number): number {
  const latScale = Math.max(Math.cos((lat * Math.PI) / 180), 0.2);
  return radiusKm / (111.32 * latScale);
}

function clampLat(lat: number): number {
  return Math.max(-90, Math.min(90, lat));
}

function wrapLon(lon: number): number {
  if (lon > 180) return lon - 360;
  if (lon < -180) return lon + 360;
  return lon;
}

function scoreCandidate(row: CandidateRow, designationCategory?: WdpaDesignationCategory): number {
  const distKm = toFiniteNumber(row.dist_m) / 1000;

  switch (row.waypointType) {
    case 'city': {
      const popMax = Math.max(0, toFiniteNumber((row as CityCandidateRow).pop_max));
      const weights = WAYPOINT_RANKING.city;
      return Math.log10(popMax + 10) * weights.populationLogWeight - distKm * weights.distancePenaltyPerKm;
    }
    case 'river': {
      const lengthM = Math.max(0, toFiniteNumber((row as RiverCandidateRow).length_m));
      const weights = WAYPOINT_RANKING.river;
      return Math.log10(lengthM + 10) * weights.lengthLogWeight - distKm * weights.distancePenaltyPerKm;
    }
    case 'lake': {
      const areaSkm = Math.max(0, toFiniteNumber((row as LakeCandidateRow).area_skm));
      const weights = WAYPOINT_RANKING.lake;
      return Math.log10(areaSkm + 2) * weights.areaLogWeight - distKm * weights.distancePenaltyPerKm;
    }
    case 'wetland': {
      const areaM2 = Math.max(0, toFiniteNumber((row as WetlandCandidateRow).intersect_area_m2));
      const weights = WAYPOINT_RANKING.wetland;
      const ramsarBoost = toFiniteNumber((row as WetlandCandidateRow).ramsar2014) > 0 ? weights.ramsarBoost : 0;
      return weights.baseScore + ramsarBoost + Math.log10(areaM2 + 10) * weights.areaLogWeight - distKm * weights.distancePenaltyPerKm;
    }
    case 'protected_area': {
      const pa = row as ProtectedAreaCandidateRow;
      const area = Math.max(toFiniteNumber(pa.gis_area), toFiniteNumber(pa.rep_area), 0);
      const categoryBoost = WDPA_CATEGORY_PRIORITY[designationCategory ?? 'protected_area'];
      const weights = WAYPOINT_RANKING.protectedArea;
      return categoryBoost + Math.log10(area + 2) * weights.areaLogWeight - distKm * weights.distancePenaltyPerKm;
    }
    case 'bioregion_edge':
      return WAYPOINT_RANKING.bioregionEdge.baseScore - distKm * WAYPOINT_RANKING.bioregionEdge.distancePenaltyPerKm;
    default:
      return 0;
  }
}

function rowToCandidate(row: CandidateRow): Candidate | null {
  const lon = toFiniteNumber(row.lon, NaN);
  const lat = toFiniteNumber(row.lat, NaN);
  if (!isValidCoordinate(lon, lat)) return null;

  const designationCategory = row.waypointType === 'protected_area'
    ? classifyWdpaDesignation({
      desigEng: (row as ProtectedAreaCandidateRow).desig_eng,
      iucnCat: (row as ProtectedAreaCandidateRow).iucn_cat,
      govType: (row as ProtectedAreaCandidateRow).gov_type,
    })
    : undefined;

  const sourceId = row.source_id ?? null;
  return {
    key: `${row.source_table}:${String(sourceId)}:${row.waypointType}`,
    waypointType: row.waypointType,
    name: row.name || defaultNameForType(row.waypointType),
    lon,
    lat,
    distKm: Number((toFiniteNumber(row.dist_m) / 1000).toFixed(3)),
    rankScore: Number(scoreCandidate(row, designationCategory).toFixed(3)),
    sourceTable: row.source_table,
    sourceId,
    designationCategory,
    fallback: false,
  };
}

function defaultNameForType(type: WaypointType): string {
  switch (type) {
    case 'city':
      return 'Nearest Settlement';
    case 'river':
      return 'River Crossing';
    case 'lake':
      return 'Lake Shore';
    case 'wetland':
      return 'Wetland Edge';
    case 'protected_area':
      return 'Protected Area';
    case 'bioregion_edge':
      return 'Bioregion Edge';
    case 'basecamp':
      return 'Basecamp';
  }
}

async function queryCities(lon: number, lat: number, radiusKm: number, expandDeg: number): Promise<Candidate[]> {
  try {
    const rows = await db.execute<CityCandidateRow>(sql`
      WITH pt AS (
        SELECT ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326) AS geom
      )
      SELECT
        'city' AS waypoint_type,
        COALESCE(NULLIF(c.nameascii, ''), NULLIF(c.name, ''), 'Settlement') AS name,
        ST_X(c.geom) AS lon,
        ST_Y(c.geom) AS lat,
        ST_Distance(c.geom::geography, pt.geom::geography) AS dist_m,
        c.gid AS source_id,
        'natural_earth.populated_places' AS source_table,
        c.pop_max
      FROM natural_earth.populated_places c
      CROSS JOIN pt
      WHERE c.geom && ST_Expand(pt.geom, ${expandDeg})
        AND ST_DWithin(c.geom::geography, pt.geom::geography, ${radiusKm * 1000})
      ORDER BY c.pop_max DESC NULLS LAST, dist_m ASC
      LIMIT 40
    `);
    return [...rows].map((row) => rowToCandidate({ ...row, waypointType: 'city' })).filter(Boolean) as Candidate[];
  } catch {
    return [];
  }
}

async function queryRivers(lon: number, lat: number, radiusKm: number, expandDeg: number): Promise<Candidate[]> {
  try {
    const rows = await db.execute<RiverCandidateRow>(sql`
      WITH pt AS (
        SELECT ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326) AS geom
      )
      SELECT
        'river' AS waypoint_type,
        COALESCE(NULLIF(r.river_map, ''), 'River') AS name,
        ST_X(wp.geom) AS lon,
        ST_Y(wp.geom) AS lat,
        ST_Distance(r.geom::geography, pt.geom::geography) AS dist_m,
        r.gid AS source_id,
        'unesco.world_rivers' AS source_table,
        ST_Length(r.geom::geography) AS length_m
      FROM unesco.world_rivers r
      CROSS JOIN pt
      CROSS JOIN LATERAL (
        SELECT ST_ClosestPoint(r.geom, pt.geom) AS geom
      ) wp
      WHERE r.geom && ST_Expand(pt.geom, ${expandDeg})
        AND ST_DWithin(r.geom::geography, pt.geom::geography, ${radiusKm * 1000})
      ORDER BY dist_m ASC, length_m DESC
      LIMIT 30
    `);
    return [...rows].map((row) => rowToCandidate({ ...row, waypointType: 'river' })).filter(Boolean) as Candidate[];
  } catch {
    return [];
  }
}

async function queryLakes(lon: number, lat: number, radiusKm: number, expandDeg: number): Promise<Candidate[]> {
  try {
    const rows = await db.execute<LakeCandidateRow>(sql`
      WITH pt AS (
        SELECT ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326) AS geom
      )
      SELECT
        'lake' AS waypoint_type,
        COALESCE(NULLIF(l.lake_name, ''), NULLIF(l.near_city, ''), 'Lake') AS name,
        ST_X(wp.geom) AS lon,
        ST_Y(wp.geom) AS lat,
        ST_Distance(l.geom::geography, pt.geom::geography) AS dist_m,
        l.glwd_id AS source_id,
        'wwf.glwd_1' AS source_table,
        l.area_skm
      FROM wwf.glwd_1 l
      CROSS JOIN pt
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN ST_Contains(l.geom, pt.geom) THEN ST_ClosestPoint(ST_Boundary(l.geom), pt.geom)
          ELSE ST_ClosestPoint(l.geom, pt.geom)
        END AS geom
      ) wp
      WHERE l.geom && ST_Expand(pt.geom, ${expandDeg})
        AND ST_DWithin(l.geom::geography, pt.geom::geography, ${radiusKm * 1000})
      ORDER BY dist_m ASC, l.area_skm DESC NULLS LAST
      LIMIT 30
    `);
    return [...rows].map((row) => rowToCandidate({ ...row, waypointType: 'lake' })).filter(Boolean) as Candidate[];
  } catch {
    return [];
  }
}

async function queryWetlands(lon: number, lat: number, radiusKm: number, expandDeg: number): Promise<Candidate[]> {
  try {
    const rows = await db.execute<WetlandCandidateRow>(sql`
      WITH pt AS (
        SELECT ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326) AS geom
      )
      SELECT
        'wetland' AS waypoint_type,
        COALESCE(NULLIF(w.ecoregion, ''), NULLIF(w.mht_txt, ''), 'Wetland') AS name,
        ST_X(wp.geom) AS lon,
        ST_Y(wp.geom) AS lat,
        ST_Distance(w.geom::geography, pt.geom::geography) AS dist_m,
        w.gid AS source_id,
        'ramsar.wetland' AS source_table,
        w.ramsar2014,
        ST_Area(ST_Intersection(w.geom, ST_Expand(pt.geom, ${expandDeg}))::geography) AS intersect_area_m2
      FROM ramsar.wetland w
      CROSS JOIN pt
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN ST_Contains(w.geom, pt.geom) THEN ST_ClosestPoint(ST_Boundary(w.geom), pt.geom)
          ELSE ST_ClosestPoint(w.geom, pt.geom)
        END AS geom
      ) wp
      WHERE w.geom && ST_Expand(pt.geom, ${expandDeg})
        AND ST_DWithin(w.geom::geography, pt.geom::geography, ${radiusKm * 1000})
      ORDER BY dist_m ASC, w.ramsar2014 DESC NULLS LAST
      LIMIT 30
    `);
    return [...rows].map((row) => rowToCandidate({ ...row, waypointType: 'wetland' })).filter(Boolean) as Candidate[];
  } catch {
    return [];
  }
}

async function queryProtectedAreas(lon: number, lat: number, radiusKm: number, expandDeg: number): Promise<Candidate[]> {
  try {
    const rows = await db.execute<ProtectedAreaCandidateRow>(sql`
      WITH pt AS (
        SELECT ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326) AS geom
      )
      SELECT
        'protected_area' AS waypoint_type,
        COALESCE(NULLIF(p.name_eng, ''), NULLIF(p.name, ''), NULLIF(p.desig_eng, ''), 'Protected Area') AS name,
        ST_X(wp.geom) AS lon,
        ST_Y(wp.geom) AS lat,
        ST_Distance(p.geom::geography, pt.geom::geography) AS dist_m,
        COALESCE(p.site_pid, p.site_id::text, p.gid::text) AS source_id,
        'wpda.wdpa_polygons' AS source_table,
        p.desig_eng,
        p.iucn_cat,
        p.gov_type,
        p.gis_area,
        p.rep_area
      FROM wpda.wdpa_polygons p
      CROSS JOIN pt
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN ST_Contains(p.geom, pt.geom) THEN ST_ClosestPoint(ST_Boundary(p.geom), pt.geom)
          ELSE ST_ClosestPoint(p.geom, pt.geom)
        END AS geom
      ) wp
      WHERE p.geom && ST_Expand(pt.geom, ${expandDeg})
        AND ST_DWithin(p.geom::geography, pt.geom::geography, ${radiusKm * 1000})
      ORDER BY dist_m ASC, COALESCE(p.gis_area, p.rep_area) DESC NULLS LAST
      LIMIT 60
    `);
    return [...rows].map((row) => rowToCandidate({ ...row, waypointType: 'protected_area' })).filter(Boolean) as Candidate[];
  } catch {
    return [];
  }
}

async function queryBioregions(lon: number, lat: number, radiusKm: number, expandDeg: number): Promise<Candidate[]> {
  try {
    const rows = await db.execute<BaseCandidate>(sql`
      WITH pt AS (
        SELECT ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326) AS geom
      )
      SELECT
        'bioregion_edge' AS waypoint_type,
        COALESCE(NULLIF(b.bioregion, ''), NULLIF(b.biome, ''), 'Bioregion Edge') AS name,
        ST_X(wp.geom) AS lon,
        ST_Y(wp.geom) AS lat,
        ST_Distance(b.wkb_geometry::geography, pt.geom::geography) AS dist_m,
        COALESCE(b.ogc_fid::text, b.bioregion) AS source_id,
        'oneearth.oneearth_bioregion' AS source_table
      FROM oneearth.oneearth_bioregion b
      CROSS JOIN pt
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN ST_Contains(b.wkb_geometry, pt.geom) THEN ST_ClosestPoint(ST_Boundary(b.wkb_geometry), pt.geom)
          ELSE COALESCE(ST_ClosestPoint(ST_Boundary(b.wkb_geometry), pt.geom), ST_PointOnSurface(b.wkb_geometry))
        END AS geom
      ) wp
      WHERE b.wkb_geometry && ST_Expand(pt.geom, ${expandDeg})
        AND ST_DWithin(b.wkb_geometry::geography, pt.geom::geography, ${radiusKm * 1000})
      ORDER BY dist_m ASC
      LIMIT 12
    `);
    return [...rows].map((row) => rowToCandidate({ ...row, waypointType: 'bioregion_edge' })).filter(Boolean) as Candidate[];
  } catch {
    return [];
  }
}

function dedupeCandidates(candidates: Candidate[]): Candidate[] {
  const byKey = new Map<string, Candidate>();
  for (const candidate of candidates) {
    const existing = byKey.get(candidate.key);
    if (!existing || candidate.rankScore > existing.rankScore) {
      byKey.set(candidate.key, candidate);
    }
  }
  return [...byKey.values()].sort((a, b) => b.rankScore - a.rankScore);
}

async function harvestCandidates(lon: number, lat: number, radiusKm: number): Promise<Candidate[]> {
  const expandDeg = bboxDegreesForRadius(radiusKm, lat);
  const groups = await Promise.all([
    queryCities(lon, lat, radiusKm, expandDeg),
    queryRivers(lon, lat, radiusKm, expandDeg),
    queryLakes(lon, lat, radiusKm, expandDeg),
    queryWetlands(lon, lat, radiusKm, expandDeg),
    queryProtectedAreas(lon, lat, radiusKm, expandDeg),
    queryBioregions(lon, lat, radiusKm, expandDeg),
  ]);
  return dedupeCandidates(groups.flat());
}

function hasEnoughCandidates(candidates: Candidate[]): boolean {
  const counts = countCandidates(candidates);
  const protectedCategories = new Set(
    candidates
      .filter((candidate) => candidate.waypointType === 'protected_area')
      .map((candidate) => candidate.designationCategory)
      .filter(Boolean),
  );

  return counts.city >= 1
    && counts.river >= 1
    && counts.lake + counts.wetland >= 1
    && counts.protected_area >= 2
    && protectedCategories.size >= 2
    && candidates.length >= 6;
}

function countCandidates(candidates: Candidate[]): Record<WaypointType, number> {
  const counts: Record<WaypointType, number> = {
    city: 0,
    river: 0,
    lake: 0,
    wetland: 0,
    protected_area: 0,
    bioregion_edge: 0,
    basecamp: 0,
  };
  for (const candidate of candidates) counts[candidate.waypointType] += 1;
  return counts;
}

function fallbackCandidate(lon: number, lat: number, slot: number, role: WaypointNodeRole): Candidate {
  if (slot === 0) {
    return {
      key: `fallback:${slot}`,
      waypointType: 'basecamp',
      name: 'Basecamp',
      lon,
      lat,
      distKm: 0,
      rankScore: 0,
      sourceTable: null,
      sourceId: null,
      fallback: true,
    };
  }

  const angle = (-90 + slot * 67) * (Math.PI / 180);
  const distanceKm = 8 + slot * 4;
  const latDelta = (Math.sin(angle) * distanceKm) / 111.32;
  const lonDelta = (Math.cos(angle) * distanceKm) / (111.32 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2));
  return {
    key: `fallback:${slot}`,
    waypointType: 'basecamp',
    name: role === 'final' ? 'Survey Turnaround' : `Survey Point ${slot}`,
    lon: wrapLon(lon + lonDelta),
    lat: clampLat(lat + latDelta),
    distKm: Number(distanceKm.toFixed(3)),
    rankScore: -slot,
    sourceTable: null,
    sourceId: null,
    fallback: true,
  };
}

function selectWaypoints(candidates: Candidate[], lon: number, lat: number): ExpeditionWaypoint[] {
  const selectedKeys = new Set<string>();
  const selected: Array<Candidate | null> = [null, null, null, null, null, null];

  const pickBest = (predicate: (candidate: Candidate) => boolean): Candidate | null => {
    const candidate = candidates
      .filter((item) => !selectedKeys.has(item.key) && predicate(item))
      .sort((a, b) => b.rankScore - a.rankScore)[0];
    if (candidate) selectedKeys.add(candidate.key);
    return candidate ?? null;
  };

  selected[0] = pickBest((candidate) => candidate.waypointType === 'city')
    ?? fallbackCandidate(lon, lat, 0, 'start');
  selectedKeys.add(selected[0].key);

  selected[1] = pickBest((candidate) => candidate.waypointType === 'river');
  selected[2] = pickBest((candidate) => candidate.waypointType === 'lake' || candidate.waypointType === 'wetland');

  selected[3] = pickBest((candidate) => candidate.waypointType === 'protected_area');
  const firstProtectedCategory = selected[3]?.designationCategory;
  selected[4] = pickBest((candidate) => (
    candidate.waypointType === 'protected_area'
    && Boolean(firstProtectedCategory)
    && candidate.designationCategory !== firstProtectedCategory
  )) ?? pickBest((candidate) => candidate.waypointType === 'protected_area');

  selected[5] = pickBest((candidate) => candidate.waypointType !== 'city')
    ?? pickBest(() => true);

  for (let slot = 1; slot < selected.length; slot++) {
    if (!selected[slot]) {
      selected[slot] = pickBest((candidate) => candidate.waypointType === 'bioregion_edge')
        ?? fallbackCandidate(lon, lat, slot, NODE_ROLES[slot]);
    }
  }

  return selected.map((maybeCandidate, index) => {
    const candidate = maybeCandidate ?? fallbackCandidate(lon, lat, index, NODE_ROLES[index]);
    return {
      slot: index as ExpeditionWaypoint['slot'],
      waypointType: candidate.waypointType,
      nodeRole: NODE_ROLES[index],
      name: candidate.name,
      lon: Number(candidate.lon.toFixed(6)),
      lat: Number(candidate.lat.toFixed(6)),
      distKm: candidate.distKm,
      rankScore: candidate.rankScore,
      sourceTable: candidate.sourceTable,
      sourceId: candidate.sourceId,
      ...(candidate.designationCategory ? { designationCategory: candidate.designationCategory } : {}),
      fallback: candidate.fallback,
    };
  });
}

function routeDistanceKm(a: { lon: number; lat: number }, b: { lon: number; lat: number }): number {
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const hav = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
}

function buildRoutePolyline(waypoints: ExpeditionWaypoint[], origin: { lon: number; lat: number }) {
  const remaining = new Map<number, ExpeditionWaypoint>(waypoints.map((waypoint) => [waypoint.slot, waypoint]));
  const route: Array<{ lon: number; lat: number; waypointSlot: number }> = [];
  let current = remaining.get(0) ?? origin;

  if (remaining.has(0)) {
    const start = remaining.get(0)!;
    route.push({ lon: start.lon, lat: start.lat, waypointSlot: start.slot });
    remaining.delete(0);
  }

  while (remaining.size > 0) {
    const next = [...remaining.values()].sort((a, b) => (
      routeDistanceKm(current, a) - routeDistanceKm(current, b)
    ))[0];
    route.push({ lon: next.lon, lat: next.lat, waypointSlot: next.slot });
    remaining.delete(next.slot);
    current = next;
  }

  return route;
}

export async function harvestExpeditionWaypoints({ lon, lat }: HarvestOptions): Promise<ExpeditionWaypointRoute> {
  if (!isValidCoordinate(lon, lat)) {
    throw new Error('Invalid lon/lat');
  }

  let finalRadiusKm = SEARCH_RADII_KM[SEARCH_RADII_KM.length - 1];
  let candidates: Candidate[] = [];

  for (const radiusKm of SEARCH_RADII_KM) {
    candidates = await harvestCandidates(lon, lat, radiusKm);
    finalRadiusKm = radiusKm;
    if (hasEnoughCandidates(candidates)) break;
  }

  const waypoints = selectWaypoints(candidates, lon, lat);
  return {
    origin: { lon, lat },
    radiusKm: finalRadiusKm,
    waypoints,
    routePolyline: buildRoutePolyline(waypoints, { lon, lat }),
    debug: { candidateCounts: countCandidates(candidates) },
  };
}
