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

interface ProtectedParcelRow {
  site_id: number;
  site_pid: string;
  site_type: 'pa' | 'oecm';
  display_name: string | null;
  name_english: string | null;
  name: string | null;
  realm_name: string | null;
  designation_name: string | null;
  iucn_category_name: string | null;
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
  hyriv_id: number;
  ord_stra: number | null;
  distance_m: number;
  [key: string]: unknown;
}

interface LakeRow {
  hylak_id: number;
  lake_name: string | null;
  lake_type: number | null;
  intersect_area_m2: number | null;
  distance_m: number;
  [key: string]: unknown;
}

interface MarineRow {
  mrgid: number;
  geoname: string | null;
  intersect_area_m2: number | null;
  distance_m: number;
  [key: string]: unknown;
}

interface IccaRow {
  wdpa_id: number;
  name: string | null;
  comm_name: string | null;
  habit_type: string | null;
  threats: string | null;
  distance_m: number;
  [key: string]: unknown;
}

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

    if (!(await tableExists('protected_planet_parcels'))) {
      return NextResponse.json(
        { error: 'Missing required table "protected_planet_parcels". Run migration 008 first.' },
        { status: 500 }
      );
    }

    const square = buildSquare(lon, lat, sizeMeters);
    const squareJson = JSON.stringify(square.geometry);
    const pointWkt = `SRID=4326;POINT(${lon} ${lat})`;

    // --- Existing queries (protected areas, threatened species, habitat) ---

    const protectedAreas = await db.execute<ProtectedParcelRow>(sql`
      WITH square AS (
        SELECT ST_SetSRID(ST_GeomFromGeoJSON(${squareJson}), 4326) AS geom
      )
      SELECT
        p.site_id,
        p.site_pid,
        p.site_type,
        COALESCE(p.name_english, p.name) AS display_name,
        p.name_english,
        p.name,
        p.realm_name,
        p.designation_name,
        p.iucn_category_name,
        p.governance_type,
        p.governance_subtype,
        ST_Area(ST_Intersection(p.geom, square.geom)::geography) AS intersect_area_m2
      FROM protected_planet_parcels p
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
        FROM oneearth_bioregion b
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

    // --- Water queries (guarded by table existence + layer enabled) ---

    let riverRows: RiverRow[] = [];
    if (enabledLayers.has('hydrorivers') && await tableExists('hydro_rivers')) {
      try {
        riverRows = [...await db.execute<RiverRow>(sql`
          WITH pt AS (
            SELECT ST_GeomFromEWKT(${pointWkt}) AS geom
          )
          SELECT
            r.hyriv_id,
            r.ord_stra,
            ST_Distance(r.geom::geography, pt.geom::geography) AS distance_m
          FROM hydro_rivers r
          CROSS JOIN pt
          WHERE ST_DWithin(r.geom::geography, pt.geom::geography, 20000)
          ORDER BY distance_m ASC
          LIMIT 3
        `)];
      } catch { /* no data yet */ }
    }

    let lakeRows: LakeRow[] = [];
    if (enabledLayers.has('hydrolakes') && await tableExists('hydro_lakes')) {
      try {
        lakeRows = [...await db.execute<LakeRow>(sql`
          WITH square AS (
            SELECT ST_SetSRID(ST_GeomFromGeoJSON(${squareJson}), 4326) AS geom
          ), pt AS (
            SELECT ST_GeomFromEWKT(${pointWkt}) AS geom
          )
          SELECT
            l.hylak_id,
            l.lake_name,
            l.lake_type,
            ST_Area(ST_Intersection(l.geom, square.geom)::geography) AS intersect_area_m2,
            ST_Distance(l.geom::geography, pt.geom::geography) AS distance_m
          FROM hydro_lakes l
          CROSS JOIN square
          CROSS JOIN pt
          WHERE ST_DWithin(l.geom::geography, pt.geom::geography, 5000)
          ORDER BY distance_m ASC
          LIMIT 3
        `)];
      } catch { /* no data yet */ }
    }

    let marineRows: MarineRow[] = [];
    if (enabledLayers.has('marine_eez') && await tableExists('marine_eez')) {
      try {
        marineRows = [...await db.execute<MarineRow>(sql`
          WITH square AS (
            SELECT ST_SetSRID(ST_GeomFromGeoJSON(${squareJson}), 4326) AS geom
          ), pt AS (
            SELECT ST_GeomFromEWKT(${pointWkt}) AS geom
          )
          SELECT
            m.mrgid,
            m.geoname,
            ST_Area(ST_Intersection(m.geom, square.geom)::geography) AS intersect_area_m2,
            ST_Distance(m.geom::geography, pt.geom::geography) AS distance_m
          FROM marine_eez m
          CROSS JOIN square
          CROSS JOIN pt
          WHERE ST_DWithin(m.geom::geography, pt.geom::geography, 10000)
          ORDER BY distance_m ASC
          LIMIT 3
        `)];
      } catch { /* no data yet */ }
    }

    // --- ICCA registry query (point data, 50km radius) ---
    let iccaRows: IccaRow[] = [];
    if (await tableExists('icca_registry_point')) {
      try {
        iccaRows = [...await db.execute<IccaRow>(sql`
          WITH pt AS (
            SELECT ST_GeomFromEWKT(${pointWkt}) AS geom
          )
          SELECT
            i.wdpa_id,
            i.name,
            i.comm_name,
            i.habit_type,
            i.threats,
            ST_Distance(i.geom::geography, pt.geom::geography) AS distance_m
          FROM icca_registry_point i
          CROSS JOIN pt
          WHERE ST_DWithin(i.geom::geography, pt.geom::geography, 50000)
          ORDER BY distance_m ASC
          LIMIT 5
        `)];
      } catch { /* table may be empty */ }
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
        variant: pa.iucn_category_name || pa.site_type || 'pa',
        score: scorePolygonLayer(overlap, 0),
        overlapRatio: overlap,
        nearestDistanceM: 0,
        features: { site_pid: pa.site_pid, designation: pa.designation_name, iucn: pa.iucn_category_name },
      });
    }

    // Community node (WDPA governance_subtype proxy)
    const communityParcels = [...protectedAreas].filter((p) => {
      const gov = ((p as Record<string, unknown>).governance_type as string || '').toLowerCase();
      return /community|indigenous|shared|local/i.test(gov);
    });
    if (communityParcels.length > 0) {
      const cp = communityParcels[0];
      const overlap = (cp.intersect_area_m2 || 0) / square.areaM2;
      // Only score community_node if meaningful overlap (avoids false positives from distant parcels)
      if (overlap >= 0.1) {
        layerScores.push({
          nodeFamily: 'community_node',
          variant: (cp as Record<string, unknown>).governance_type as string || 'community',
          score: scorePolygonLayer(overlap, 0),
          overlapRatio: overlap,
          nearestDistanceM: 0,
          features: { site_pid: cp.site_pid, governance: (cp as Record<string, unknown>).governance_type },
        });
      }
    }

    // ICCA registry score (point proximity)
    if (iccaRows.length > 0) {
      const ic = iccaRows[0];
      layerScores.push({
        nodeFamily: 'community_node',
        variant: 'icca',
        score: scoreLineLayer(ic.distance_m, 10000),
        overlapRatio: 0,
        nearestDistanceM: ic.distance_m,
        features: { wdpa_id: ic.wdpa_id, name: ic.name, comm_name: ic.comm_name },
      });
    }

    // Water scores (river = line, lake = polygon, marine = polygon)
    if (riverRows.length > 0) {
      const r = riverRows[0];
      const riverDecay = layerDecay.get('hydrorivers') ?? 500;
      layerScores.push({
        nodeFamily: 'water_node',
        variant: 'river',
        score: scoreLineLayer(r.distance_m, riverDecay),
        overlapRatio: 0,
        nearestDistanceM: r.distance_m,
        features: { hyriv_id: r.hyriv_id, ord_stra: r.ord_stra },
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
        features: { hylak_id: l.hylak_id, lake_name: l.lake_name },
      });
    }
    if (marineRows.length > 0) {
      const m = marineRows[0];
      const overlap = (m.intersect_area_m2 || 0) / square.areaM2;
      layerScores.push({
        nodeFamily: 'water_node',
        variant: 'marine',
        score: scorePolygonLayer(overlap, m.distance_m),
        overlapRatio: overlap,
        nearestDistanceM: m.distance_m,
        features: { mrgid: m.mrgid, geoname: m.geoname },
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
      resource_bias: nodeSelection.resourceBias,
      signals: allSignals,
      protected_areas: [...protectedAreas].map((row) => ({
        site_id: row.site_id,
        site_pid: row.site_pid,
        site_type: row.site_type,
        name: row.display_name,
        realm: row.realm_name,
        designation: row.designation_name,
        iucn_category: row.iucn_category_name,
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
      icca_territories: iccaRows.map((r) => ({
        wdpa_id: r.wdpa_id,
        name: r.name,
        comm_name: r.comm_name,
        habit_type: r.habit_type,
        threats: r.threats,
        distance_m: Number(r.distance_m.toFixed(1)),
      })),
      nearest_river_dist_m: riverRows.length > 0 ? Number(riverRows[0].distance_m.toFixed(1)) : null,
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
