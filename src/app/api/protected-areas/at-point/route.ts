import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db, ensureIcaaViewReady, habitatColormap } from '@/db';
import {
  type LayerScore,
  scorePolygonLayer,
  scoreLineLayer,
  selectNodes,
  generateRunNodes,
} from '@/lib/nodeScoring';
import { buildSquare, buildSeed } from '@/lib/geoUtils';
import type { FeatureFingerprint } from '@/types/gis';

interface ProtectedAreaRow {
  site_id: number;
  site_pid: string;
  site_type: string;
  display_name: string | null;
  name_eng: string | null;
  name: string | null;
  realm: string | null;
  desig_eng: string | null;
  iucn_cat: string | null;
  gov_type: string | null;
  intersect_area_m2: number | null;
  [key: string]: unknown;
}

interface ThreatenedSpeciesRow {
  ogc_fid: number;
  common_name: string | null;
  scientific_name: string | null;
  conservation_code: string | null;
  category: string | null;
  intersect_area_m2: number | null;
  [key: string]: unknown;
}

interface RasterHabitatResult {
  habitat_type: string;
  percentage: number;
}

interface BioregionRow {
  bioregion: string | null;
  realm: string | null;
  biome: string | null;
  intersect_area_m2: number | null;
  distance_m: number | null;
  [key: string]: unknown;
}

interface RiverRow {
  gid: number;
  river_map: string | null;
  distance_m: number;
  [key: string]: unknown;
}

interface LakeRow {
  glwd_id: number;
  lake_name: string | null;
  type: string | null;
  area_skm: number | null;
  intersect_area_m2: number | null;
  distance_m: number;
  [key: string]: unknown;
}

interface WetlandRow {
  gid: number;
  ecoregion: string | null;
  mht_txt: string | null;
  intersect_area_m2: number | null;
  [key: string]: unknown;
}


function getSignalRatios(habitats: RasterHabitatResult[]) {
  let waterRatio = 0;
  let forestRatio = 0;
  let urbanRatio = 0;

  for (const habitat of habitats) {
    const name = habitat.habitat_type.toLowerCase();
    const pct = habitat.percentage / 100;

    if (/(water|wetland|river|lake|marine|coastal|mangrove)/.test(name)) {
      waterRatio += pct;
    }
    if (/(forest|woodland|canopy|mangrove)/.test(name)) {
      forestRatio += pct;
    }
    if (/(urban|artificial|built|degraded|plantation|arable|pasture)/.test(name)) {
      urbanRatio += pct;
    }
  }

  return {
    water_ratio: Number(waterRatio.toFixed(4)),
    forest_ratio: Number(forestRatio.toFixed(4)),
    urban_ratio: Number(urbanRatio.toFixed(4)),
  };
}

async function getHabitatDistributionFromTiTiler(
  squareGeoJSON: unknown
): Promise<RasterHabitatResult[]> {
  const titilerBaseUrl = process.env.NEXT_PUBLIC_TITILER_BASE_URL;
  const cogUrl = process.env.NEXT_PUBLIC_COG_URL;
  if (!titilerBaseUrl || !cogUrl) return [];

  const url = new URL(`${titilerBaseUrl}/cog/statistics`);
  url.searchParams.set('url', cogUrl);
  url.searchParams.set('categorical', 'true');
  url.searchParams.set('max_size', '512');

  const featureCollection = {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: squareGeoJSON, properties: {} }],
  };

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(featureCollection),
  });
  if (!response.ok) return [];

  const statsData = await response.json();
  const featureStats = statsData?.features?.[0]?.properties?.statistics;
  const bandStats = featureStats?.b1 ?? featureStats?.['1'];
  if (!bandStats) return [];

  const categories: Record<string, number> | undefined = bandStats.categorical || bandStats.categories;
  const codeCounts: Record<number, number> = {};
  let totalPixels = 0;

  if (categories && Object.keys(categories).length > 0) {
    for (const [code, count] of Object.entries(categories)) {
      const habitatCode = Number(code);
      if (!Number.isFinite(habitatCode) || habitatCode === 0) continue;
      codeCounts[habitatCode] = (codeCounts[habitatCode] || 0) + count;
      totalPixels += count;
    }
  } else if (bandStats.histogram) {
    const [counts, values] = bandStats.histogram as [number[], number[]];
    for (let i = 0; i < values.length; i++) {
      const habitatCode = Math.round(values[i]);
      const count = counts[i];
      if (!Number.isFinite(habitatCode) || habitatCode === 0 || count <= 0) continue;
      codeCounts[habitatCode] = (codeCounts[habitatCode] || 0) + count;
      totalPixels += count;
    }
  }

  if (totalPixels <= 0) return [];

  const colormapRows = await db
    .select({ value: habitatColormap.value, label: habitatColormap.label })
    .from(habitatColormap);
  const labelMap = new Map<number, string>();
  for (const row of colormapRows) labelMap.set(row.value, row.label);

  const results: RasterHabitatResult[] = [];
  for (const [code, count] of Object.entries(codeCounts)) {
    const pct = (count / totalPixels) * 100;
    if (pct < 0.1) continue;
    const habitatCode = Number(code);
    results.push({
      habitat_type: labelMap.get(habitatCode) || `Unknown (${habitatCode})`,
      percentage: Number(pct.toFixed(2)),
    });
  }

  results.sort((a, b) => b.percentage - a.percentage);
  return results;
}

export async function GET(request: NextRequest) {
  await ensureIcaaViewReady();

  try {
    const { searchParams } = new URL(request.url);
    const lon = Number(searchParams.get('lon'));
    const lat = Number(searchParams.get('lat'));
    const sizeMeters = Math.min(Math.max(Number(searchParams.get('size') || '100'), 20), 1000);
    const debug = searchParams.get('debug') === 'true';

    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
      return NextResponse.json(
        { error: 'Missing or invalid lon/lat parameters' },
        { status: 400 }
      );
    }

    const square = buildSquare(lon, lat, sizeMeters);
    const squareJson = JSON.stringify(square.geometry);
    const pointWkt = `SRID=4326;POINT(${lon} ${lat})`;

    // --- Protected areas from wpda.wdpa_polygons (SRID 3857) ---

    const protectedAreas = await db.execute<ProtectedAreaRow>(sql`
      WITH square AS (
        SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(${squareJson}), 4326), 3857) AS geom
      )
      SELECT
        p.site_id,
        p.site_pid,
        p.site_type,
        COALESCE(p.name_eng, p.name) AS display_name,
        p.name_eng,
        p.name,
        p.realm,
        p.desig_eng,
        p.iucn_cat,
        p.gov_type,
        ST_Area(ST_Intersection(p.geom, square.geom)) AS intersect_area_m2
      FROM wpda.wdpa_polygons p
      CROSS JOIN square
      WHERE ST_Intersects(p.geom, square.geom)
      ORDER BY intersect_area_m2 DESC NULLS LAST
      LIMIT 50
    `);

    const threatenedSpecies = await db.execute<ThreatenedSpeciesRow>(sql`
      WITH square AS (
        SELECT ST_SetSRID(ST_GeomFromGeoJSON(${squareJson}), 4326) AS geom
      )
      SELECT
        s.ogc_fid,
        s.common_name,
        s.scientific_name,
        s.conservation_code,
        s.category,
        ST_Area(ST_Intersection(s.wkb_geometry, square.geom)::geography) AS intersect_area_m2
      FROM icaa_view s
      CROSS JOIN square
      WHERE s.wkb_geometry IS NOT NULL
        AND ST_Intersects(s.wkb_geometry, square.geom)
        AND (
          UPPER(COALESCE(s.conservation_code, '')) IN ('CR', 'EN', 'VU')
          OR UPPER(COALESCE(s.category, '')) IN ('CR', 'EN', 'VU')
          OR LOWER(COALESCE(s.conservation_code, '')) ~ '(critically endangered|endangered|vulnerable)'
          OR LOWER(COALESCE(s.category, '')) ~ '(critically endangered|endangered|vulnerable)'
        )
      ORDER BY intersect_area_m2 DESC NULLS LAST
      LIMIT 50
    `);

    const habitatMix = await getHabitatDistributionFromTiTiler(square.geometry);

    // --- Bioregion query ---

    let bioregionRows: BioregionRow[] = [];
    try {
      bioregionRows = [...await db.execute<BioregionRow>(sql`
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
      `)];
    } catch { /* table may be empty or missing */ }

    // --- Resolve enabled layers ---

    const enabledLayers = new Set<string>();
    const layerDecay = new Map<string, number>();
    try {
      const rows = await db.execute<{ layer_key: string; decay_m: number }>(sql`
        SELECT layer_key, decay_m FROM eco_gis_layers WHERE enabled = true
      `);
      for (const r of rows) {
        enabledLayers.add(r.layer_key);
        layerDecay.set(r.layer_key, r.decay_m);
      }
    } catch { /* eco_gis_layers may not exist yet */ }

    // --- Water queries — unesco.world_rivers (3857), wwf.glwd_1 (3857) ---

    let riverRows: RiverRow[] = [];
    if (enabledLayers.has('unesco_rivers')) {
      try {
        riverRows = [...await db.execute<RiverRow>(sql`
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
        `)];
      } catch { /* no data */ }
    }

    let lakeRows: LakeRow[] = [];
    if (enabledLayers.has('wwf_glwd')) {
      try {
        lakeRows = [...await db.execute<LakeRow>(sql`
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
        `)];
      } catch { /* no data */ }
    }

    // --- Ramsar wetlands (3857) ---

    let wetlandRows: WetlandRow[] = [];
    if (enabledLayers.has('ramsar_wetland')) {
      try {
        wetlandRows = [...await db.execute<WetlandRow>(sql`
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
        `)];
      } catch { /* no data */ }
    }

    // --- Compute layer scores ---

    const protectedOverlapM2 = [...protectedAreas].reduce(
      (sum, row) => sum + (row.intersect_area_m2 || 0),
      0
    );
    const protectedCoverage = Math.max(0, Math.min(1, protectedOverlapM2 / square.areaM2));
    const habitatSignals = getSignalRatios(habitatMix);

    const layerScores: LayerScore[] = [];

    // Bioregion score
    if (bioregionRows.length > 0) {
      const br = bioregionRows[0];
      const overlap = (br.intersect_area_m2 || 0) / square.areaM2;
      const dist = br.distance_m ?? 0;
      const biome = (br.biome || 'unknown').toLowerCase();
      let variant = 'generic';
      if (/forest|tropical|subtropical moist/i.test(biome)) variant = 'tropical_forest';
      else if (/desert|dry|xeric/i.test(biome)) variant = 'dryland';
      else if (/montane|alpine/i.test(biome)) variant = 'montane';
      else if (/urban|anthropogenic/i.test(biome)) variant = 'urban';
      else if (/grassland|savanna/i.test(biome)) variant = 'grassland';

      layerScores.push({
        nodeFamily: 'bioregion_node',
        variant,
        score: scorePolygonLayer(overlap, dist),
        overlapRatio: overlap,
        nearestDistanceM: dist,
        features: { bioregion: br.bioregion, realm: br.realm, biome: br.biome },
      });
    }

    // Protected area score
    if (protectedAreas.length > 0) {
      const pa = [...protectedAreas][0];
      const overlap = (pa.intersect_area_m2 || 0) / square.areaM2;
      layerScores.push({
        nodeFamily: 'protected_node',
        variant: pa.iucn_cat || pa.site_type || 'pa',
        score: scorePolygonLayer(overlap, 0),
        overlapRatio: overlap,
        nearestDistanceM: 0,
        features: { site_pid: pa.site_pid, designation: pa.desig_eng, iucn: pa.iucn_cat },
      });
    }

    // Community node (WDPA gov_type proxy)
    const communityParcels = [...protectedAreas].filter((p) => {
      const gov = (p.gov_type || '').toLowerCase();
      return /community|indigenous|shared|local/i.test(gov);
    });
    if (communityParcels.length > 0) {
      const cp = communityParcels[0];
      const overlap = (cp.intersect_area_m2 || 0) / square.areaM2;
      if (overlap >= 0.1) {
        layerScores.push({
          nodeFamily: 'community_node',
          variant: cp.gov_type || 'community',
          score: scorePolygonLayer(overlap, 0),
          overlapRatio: overlap,
          nearestDistanceM: 0,
          features: { site_pid: cp.site_pid, governance: cp.gov_type },
        });
      }
    }

    // Water scores (river = line, lake = polygon)
    if (riverRows.length > 0) {
      const r = riverRows[0];
      const riverDecay = layerDecay.get('unesco_rivers') ?? 500;
      layerScores.push({
        nodeFamily: 'water_node',
        variant: 'river',
        score: scoreLineLayer(r.distance_m, riverDecay),
        overlapRatio: 0,
        nearestDistanceM: r.distance_m,
        features: { gid: r.gid, river_map: r.river_map },
      });
    }
    if (lakeRows.length > 0) {
      const l = lakeRows[0];
      const overlap = (l.intersect_area_m2 || 0) / square.areaM2;
      layerScores.push({
        nodeFamily: 'water_node',
        variant: 'lake',
        score: scorePolygonLayer(overlap, l.distance_m),
        overlapRatio: overlap,
        nearestDistanceM: l.distance_m,
        features: { glwd_id: l.glwd_id, lake_name: l.lake_name, type: l.type },
      });
    }
    // Wetland score from Ramsar
    if (wetlandRows.length > 0) {
      const w = wetlandRows[0];
      const overlap = (w.intersect_area_m2 || 0) / square.areaM2;
      layerScores.push({
        nodeFamily: 'water_node',
        variant: 'wetland',
        score: scorePolygonLayer(overlap, 0),
        overlapRatio: overlap,
        nearestDistanceM: 0,
        features: { gid: w.gid, ecoregion: w.ecoregion, mht_txt: w.mht_txt },
      });
    }

    // Pick best water variant if multiple water scores exist
    const waterScores = layerScores.filter((s) => s.nodeFamily === 'water_node');
    if (waterScores.length > 1) {
      const best = waterScores.sort((a, b) => b.score - a.score)[0];
      for (const ws of waterScores) {
        if (ws !== best) {
          const idx = layerScores.indexOf(ws);
          if (idx >= 0) layerScores.splice(idx, 1);
        }
      }
    }

    // Node selection via scoring
    const nodeSelection = selectNodes(layerScores);

    // Unified node generation from scoring + habitat context
    const nodes = generateRunNodes(
      nodeSelection,
      layerScores,
      habitatSignals,
      threatenedSpecies.length,
      protectedCoverage,
    );

    // Telemetry logging for balance tuning
    console.log('[at-point] scoring', JSON.stringify({
      lon, lat,
      primary: `${nodeSelection.primaryNodeFamily}:${nodeSelection.primaryVariant}`,
      modifiers: nodeSelection.modifierNodes,
      scores: layerScores.map((s) => ({ family: s.nodeFamily, variant: s.variant, score: Number(s.score.toFixed(4)) })),
      nodes: nodes.map((n) => n.node_type),
    }));

    const allSignals = {
      ...habitatSignals,
      protected_coverage_ratio: Number(protectedCoverage.toFixed(4)),
      threatened_species_count: threatenedSpecies.length,
      ...nodeSelection.signals,
    };

    // Build feature fingerprints for evidence pipeline
    const fingerprints: FeatureFingerprint[] = [];
    for (const pa of [...protectedAreas]) {
      fingerprints.push({
        featureClass: 'protected_area', sourceTable: 'wpda.wdpa_polygons',
        sourceId: pa.site_pid, name: pa.display_name ?? pa.name_eng ?? null,
        distanceM: 0, overlapRatio: (pa.intersect_area_m2 || 0) / square.areaM2,
        properties: { iucn_cat: pa.iucn_cat, desig_eng: pa.desig_eng, gov_type: pa.gov_type },
      });
    }
    for (const r of riverRows) {
      fingerprints.push({
        featureClass: 'river', sourceTable: 'unesco.world_rivers',
        sourceId: r.gid, name: r.river_map, distanceM: r.distance_m, overlapRatio: 0,
        properties: { gid: r.gid, river_map: r.river_map },
      });
    }
    for (const l of lakeRows) {
      fingerprints.push({
        featureClass: 'lake', sourceTable: 'wwf.glwd_1',
        sourceId: l.glwd_id, name: l.lake_name, distanceM: l.distance_m,
        overlapRatio: (l.intersect_area_m2 || 0) / square.areaM2,
        properties: { type: l.type, area_skm: l.area_skm },
      });
    }
    for (const w of wetlandRows) {
      fingerprints.push({
        featureClass: 'ramsar_site', sourceTable: 'ramsar.wetland',
        sourceId: w.gid, name: w.ecoregion, distanceM: 0,
        overlapRatio: (w.intersect_area_m2 || 0) / square.areaM2,
        properties: { mht_txt: w.mht_txt },
      });
    }
    for (const br of bioregionRows) {
      fingerprints.push({
        featureClass: 'bioregion', sourceTable: 'oneearth.oneearth_bioregion',
        sourceId: br.bioregion ?? 'unknown', name: br.bioregion,
        distanceM: br.distance_m ?? 0, overlapRatio: (br.intersect_area_m2 || 0) / square.areaM2,
        properties: { realm: br.realm, biome: br.biome },
      });
    }

    return NextResponse.json({
      mission_seed: buildSeed(lon, lat),
      query: {
        lon,
        lat,
        square_size_m: sizeMeters,
        bbox: square.bbox,
      },
      primary_node_family: nodeSelection.primaryNodeFamily,
      primary_variant: nodeSelection.primaryVariant,
      modifier_nodes: nodeSelection.modifierNodes,
      action_bias: nodeSelection.actionBias,
      signals: allSignals,
      protected_areas: [...protectedAreas].map((row) => ({
        site_id: row.site_id,
        site_pid: row.site_pid,
        site_type: row.site_type,
        name: row.display_name,
        realm: row.realm,
        designation: row.desig_eng,
        iucn_category: row.iucn_cat,
        intersect_area_m2: Number((row.intersect_area_m2 || 0).toFixed(2)),
      })),
      threatened_species: [...threatenedSpecies].map((row) => ({
        ogc_fid: row.ogc_fid,
        common_name: row.common_name,
        scientific_name: row.scientific_name,
        conservation_code: row.conservation_code,
        category: row.category,
        intersect_area_m2: Number((row.intersect_area_m2 || 0).toFixed(2)),
      })),
      habitat_mix: habitatMix,
      generated_nodes: nodes,
      bioregion: bioregionRows.length > 0 ? {
        bioregion: bioregionRows[0].bioregion,
        realm: bioregionRows[0].realm,
        biome: bioregionRows[0].biome,
      } : null,
      nearest_river_dist_m: riverRows.length > 0 ? Number(riverRows[0].distance_m.toFixed(1)) : null,
      feature_fingerprints: fingerprints,
      ...(debug ? {
        _debug: {
          layer_scores: layerScores.map((s) => ({
            family: s.nodeFamily, variant: s.variant,
            score: Number(s.score.toFixed(4)),
            overlap: Number(s.overlapRatio.toFixed(4)),
            distance_m: Number(s.nearestDistanceM.toFixed(1)),
          })),
          layer_decay: Object.fromEntries(layerDecay),
          enabled_layers: [...enabledLayers],
        },
      } : {}),
    });
  } catch (error) {
    console.error('[API /protected-areas/at-point] Error:', error);
    return NextResponse.json(
      { error: 'Failed to build protected area mission context' },
      { status: 500 }
    );
  }
}
