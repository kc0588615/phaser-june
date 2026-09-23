/** Habitat-mix shares from the existing 10 km TiTiler statistics response. */

export const TERRAIN_STRIDES = [1, 4, 8, 16] as const;
export type TerrainStride = (typeof TERRAIN_STRIDES)[number];
export const DEFAULT_TERRAIN_STRIDE = 8;
export const MAX_TERRAIN_STRIDE = 16;
export const DOMINANT_SHARE_STEP = 0.7;

export interface HabitatShare { readonly code: number; readonly share: number }
export interface StrideChoice {
  readonly stride: 8 | 16;
  readonly dominantShare: number | null;
}

export function isTerrainStride(value: unknown): value is TerrainStride {
  return value === 1 || value === 4 || value === 8 || value === 16;
}

/** Same 10 km square used by speciesService.getRasterHabitatDistribution. */
export function habitatHistogramBbox(longitude: number, latitude: number, radiusMeters = 10000) {
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLon = 111320 * Math.cos(latitude * Math.PI / 180);
  const deltaLat = radiusMeters / metersPerDegreeLat;
  const deltaLon = radiusMeters / metersPerDegreeLon;
  const west = longitude - deltaLon, east = longitude + deltaLon;
  const south = latitude - deltaLat, north = latitude + deltaLat;
  return {
    west, south, east, north,
    featureCollection: {
      type: 'FeatureCollection' as const,
      features: [{
        type: 'Feature' as const,
        geometry: { type: 'Polygon' as const, coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]] },
        properties: {},
      }],
    },
  };
}

/** Nonzero class shares of valid habitat. Null when the statistics payload is unusable. */
export function parseHabitatShares(value: unknown): HabitatShare[] | null {
  if (!value || typeof value !== 'object') return null;
  const features = (value as { features?: unknown }).features;
  if (!Array.isArray(features) || features.length === 0 || !features[0] || typeof features[0] !== 'object') return null;
  const statistics = (features[0] as { properties?: { statistics?: Record<string, unknown> } }).properties?.statistics;
  const band = statistics?.b1 ?? statistics?.['1'];
  if (!band || typeof band !== 'object') return null;
  const counts = new Map<number, number>();
  const categories = (band as { categorical?: Record<string, number>; categories?: Record<string, number> }).categorical
    ?? (band as { categories?: Record<string, number> }).categories;
  if (categories && typeof categories === 'object') {
    for (const [codeStr, count] of Object.entries(categories)) {
      const code = Number(codeStr);
      if (!Number.isInteger(code) || code === 0 || typeof count !== 'number' || !(count > 0)) continue;
      counts.set(code, (counts.get(code) ?? 0) + count);
    }
  } else {
    const histogram = (band as { histogram?: unknown }).histogram;
    if (!Array.isArray(histogram) || histogram.length < 2 || !Array.isArray(histogram[0]) || !Array.isArray(histogram[1])) return null;
    const [binCounts, values] = histogram as [unknown[], unknown[]];
    for (let i = 0; i < values.length; i++) {
      const code = Math.round(Number(values[i]));
      const count = Number(binCounts[i]);
      if (!Number.isInteger(code) || code === 0 || !Number.isFinite(count) || count <= 0) continue;
      counts.set(code, (counts.get(code) ?? 0) + count);
    }
  }
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  if (total <= 0) return null;
  return [...counts.entries()].map(([code, count]) => ({ code, share: count / total })).sort((a, b) => b.share - a.share || a.code - b.code);
}

/** New runs: stride 8, or 16 when one class owns at least 70% of valid habitat. */
export function chooseStride(shares: HabitatShare[] | null): StrideChoice {
  if (!shares || shares.length === 0) return { stride: DEFAULT_TERRAIN_STRIDE, dominantShare: null };
  const dominantShare = shares[0].share;
  const stride = dominantShare >= DOMINANT_SHARE_STEP ? MAX_TERRAIN_STRIDE : DEFAULT_TERRAIN_STRIDE;
  return { stride, dominantShare };
}
