import type { MapGeoJSONFeature } from 'maplibre-gl';
import type { EcoregionPreviewPick, EcoregionPreviewProperties } from '@/types/ecoregions';

export type MapSiteStatus = 'visited' | 'current' | 'upcoming';

export function normalizeEcoregionProperties(
  properties: Partial<Record<keyof EcoregionPreviewProperties, unknown>> | null | undefined,
): EcoregionPreviewProperties | null {
  const ecoName = properties?.ECO_NAME;
  if (typeof ecoName !== 'string' || ecoName.length === 0) return null;
  const nnh = Number(properties?.NNH);
  return {
    ECO_NAME: ecoName,
    BIOME_NAME: typeof properties?.BIOME_NAME === 'string' ? properties.BIOME_NAME : '',
    REALM: typeof properties?.REALM === 'string' ? properties.REALM : '',
    COLOR: typeof properties?.COLOR === 'string' ? properties.COLOR : '#70A800',
    COLOR_BIO: typeof properties?.COLOR_BIO === 'string' ? properties.COLOR_BIO : '#38A700',
    NNH: Number.isFinite(nnh) ? nnh : null,
    NNH_NAME: typeof properties?.NNH_NAME === 'string' ? properties.NNH_NAME : null,
  };
}

export function mapFeatureToEcoregion(feature: Pick<MapGeoJSONFeature, 'id' | 'properties'>): EcoregionPreviewPick | null {
  const properties = normalizeEcoregionProperties(feature.properties);
  return properties ? { id: feature.id ?? null, properties } : null;
}

export function globeZoomAdjustment(oldLatitude: number, newLatitude: number): number {
  const oldCos = Math.max(Math.cos(oldLatitude * Math.PI / 180), 0.05);
  const newCos = Math.max(Math.cos(newLatitude * Math.PI / 180), 0.05);
  return Math.log2(newCos / oldCos);
}

export function getMapSiteStatus(
  nodeIndex: number,
  currentNodeIndex: number,
  guessing: boolean,
): MapSiteStatus {
  if (nodeIndex < currentNodeIndex || (nodeIndex === currentNodeIndex && guessing)) return 'visited';
  return nodeIndex === currentNodeIndex ? 'current' : 'upcoming';
}

export function buildRouteFeature(coordinates: [number, number][]): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates },
  };
}
