import type maplibregl from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';

export type MapSurface = 'explore' | 'expedition';

export const MAP_LAYER_GROUPS = [
  'basemap',
  'habitat-raster',
  'ecoregions',
  'landscape',
  'species-highlight',
  'routes',
  'markers',
] as const;

export const CUSTOM_LAYER_ORDER = [
  'habitat-raster',
  'ecoregion-fill',
  'ecoregion-line',
  'ecoregion-label',
  'map-biome-fill',
  'map-biome-line',
  'map-biome-label',
  'map-protected-fill',
  'map-protected-line',
  'map-protected-label',
  'map-lakes-fill',
  'map-lakes-label',
  'map-wetlands-fill',
  'map-wetlands-label',
  'map-rivers-line',
  'map-rivers-label',
  'map-cities-points',
  'map-cities-label',
  'species-highlight-fill',
  'species-highlight-line',
  'habitat-highlight-fill',
  'habitat-highlight-line',
  'answer-range-fill',
  'answer-range-line',
  'expedition-route-casing',
  'expedition-route-line',
  'discovered-species-points',
  'region-waypoints',
] as const;

const EXPLORE_SKY: NonNullable<StyleSpecification['sky']> = {
  'atmosphere-blend': [
    'interpolate',
    ['linear'],
    ['zoom'],
    0, 1,
    5, 1,
    7, 0,
  ],
};

/** Shared basemap. Projection changes by surface; cartography stays consistent. */
export function createFallbackMapStyle(surface: MapSurface): StyleSpecification {
  const explore = surface === 'explore';
  return {
    version: 8,
    name: 'biodiversity-basemap',
    projection: { type: explore ? 'globe' : 'mercator' },
    ...(explore ? { sky: EXPLORE_SKY } : {}),
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {},
    layers: [{
      id: 'map-background',
      type: 'background',
      paint: { 'background-color': '#071923' },
    }],
  };
}

export function resolveMapStyle(surface: MapSurface): string | StyleSpecification {
  return process.env.NEXT_PUBLIC_MAP_STYLE_URL || createFallbackMapStyle(surface);
}

export function applyMapProjection(map: maplibregl.Map, surface: MapSurface) {
  map.setProjection({ type: surface === 'explore' ? 'globe' : 'mercator' });
  if (surface === 'explore') map.setSky(EXPLORE_SKY);
}

/** Keep app overlays stable even when a hosted style contributes many layers. */
export function restoreCustomLayerOrder(map: maplibregl.Map) {
  for (const layerId of CUSTOM_LAYER_ORDER) {
    if (map.getLayer(layerId)) map.moveLayer(layerId);
  }
}
