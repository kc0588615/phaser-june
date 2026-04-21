/**
 * Normalizes near-point API responses into FeatureFingerprint arrays
 * and aggregates them into RunEvidenceBundle for deduction/card systems.
 */

import type { FeatureClass, FeatureFingerprint, RunEvidenceBundle } from '@/types/gis';

interface GeoJsonFeature {
  type: 'Feature';
  geometry: unknown;
  properties: Record<string, unknown>;
}

interface FeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

/** Shape returned by /api/layers/near-point */
export interface NearPointResponse {
  rivers: FeatureCollection;
  protected_areas: FeatureCollection;
  bioregions: FeatureCollection;
  wetlands: FeatureCollection;
  lakes: FeatureCollection;
}

function extractFingerprints(
  fc: FeatureCollection | undefined,
  featureClass: FeatureClass,
  sourceTable: string,
  idKey: string,
  nameKey: string | null,
): FeatureFingerprint[] {
  if (!fc?.features?.length) return [];
  return fc.features.map((f) => ({
    featureClass,
    sourceTable,
    sourceId: (f.properties[idKey] as string | number) ?? 0,
    name: nameKey ? (f.properties[nameKey] as string | null) ?? null : null,
    distanceM: (f.properties.distance_m as number) ?? 0,
    overlapRatio: (f.properties.overlap_ratio as number) ?? 0,
    properties: f.properties,
  }));
}

/** Flatten a near-point API response into a uniform FeatureFingerprint array. */
export function normalizeNearPointResponse(data: NearPointResponse): FeatureFingerprint[] {
  return [
    ...extractFingerprints(data.rivers, 'river', 'unesco.world_rivers', 'gid', 'river_map'),
    ...extractFingerprints(data.protected_areas, 'protected_area', 'wpda.wdpa_polygons', 'site_pid', 'name'),
    ...extractFingerprints(data.bioregions, 'bioregion', 'oneearth.oneearth_bioregion', 'ogc_fid', 'bioregion'),
    ...extractFingerprints(data.wetlands, 'ramsar_site', 'ramsar.wetland', 'gid', 'ecoregion'),
    ...extractFingerprints(data.lakes, 'lake', 'wwf.glwd_1', 'glwd_id', 'lake_name'),
  ];
}

/** Aggregate fingerprints across nodes into a run-level evidence bundle. */
export function buildRunEvidenceBundle(allFingerprints: FeatureFingerprint[]): RunEvidenceBundle {
  const counts: Partial<Record<FeatureClass, number>> = {};
  const paNames = new Set<string>();
  let bioCtx: RunEvidenceBundle['bioregionContext'] = null;

  for (const fp of allFingerprints) {
    counts[fp.featureClass] = (counts[fp.featureClass] ?? 0) + 1;

    if (fp.featureClass === 'protected_area' && fp.name) {
      paNames.add(fp.name);
    }
    if (fp.featureClass === 'bioregion' && !bioCtx) {
      bioCtx = {
        bioregion: (fp.properties.bioregion as string) ?? null,
        realm: (fp.properties.realm as string) ?? null,
        biome: (fp.properties.biome as string) ?? null,
      };
    }
  }

  let dominant: FeatureClass | null = null;
  let maxCount = 0;
  for (const [fc, count] of Object.entries(counts) as [FeatureClass, number][]) {
    if (fc !== 'bioregion' && count > maxCount) {
      dominant = fc;
      maxCount = count;
    }
  }

  return {
    fingerprints: allFingerprints,
    featureClassCounts: counts,
    dominantFeatureClass: dominant,
    uniqueProtectedAreas: [...paNames],
    bioregionContext: bioCtx,
  };
}
