import type maplibregl from 'maplibre-gl';
import { restoreCustomLayerOrder } from '@/lib/maplibreStyle';
import { getAppConfig } from '@/utils/config';

const EMPTY_FEATURE_COLLECTION: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

export async function addHabitatRasterLayer(
  map: maplibregl.Map,
  signal: AbortSignal,
): Promise<boolean> {
  try {
    if (map.getLayer('habitat-raster')) return true;
    if (map.getSource('habitat-raster-source')) {
      map.addLayer({
        id: 'habitat-raster',
        type: 'raster',
        source: 'habitat-raster-source',
        paint: { 'raster-opacity': 0.7 },
      });
      restoreCustomLayerOrder(map);
      return true;
    }

    const config = await getAppConfig();
    const tileJsonUrl = `${config.titilerBaseUrl}/cog/WebMercatorQuad/tilejson.json?url=${encodeURIComponent(config.cogUrl)}&colormap_name=habitat_custom&nodata=0`;
    const response = await fetch(tileJsonUrl, { signal });
    if (!response.ok) throw new Error(`TileJSON failed (${response.status})`);
    const tileJson = await response.json() as {
      tiles?: string[];
      bounds?: [number, number, number, number];
      minzoom?: number;
      maxzoom?: number;
      attribution?: string;
    };
    if (!tileJson.tiles?.length || signal.aborted) return false;

    map.addSource('habitat-raster-source', {
      type: 'raster',
      tiles: tileJson.tiles,
      tileSize: 256,
      minzoom: tileJson.minzoom ?? 0,
      maxzoom: tileJson.maxzoom ?? 18,
      bounds: tileJson.bounds,
      attribution: tileJson.attribution || 'IUCN Habitat Map via TiTiler',
    });
    map.addLayer({
      id: 'habitat-raster',
      type: 'raster',
      source: 'habitat-raster-source',
      paint: { 'raster-opacity': 0.7 },
    });
    restoreCustomLayerOrder(map);
    return true;
  } catch (error) {
    if ((error as { name?: string }).name !== 'AbortError') {
      console.warn('[MapLibre] Habitat raster unavailable:', error);
    }
    return false;
  }
}

export function removeMapLayersAndSource(map: maplibregl.Map, sourceId: string, layerIds: readonly string[]) {
  for (const layerId of layerIds) {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
  }
  if (map.getSource(sourceId)) map.removeSource(sourceId);
}

export function setGeoJSONSource(
  map: maplibregl.Map,
  sourceId: string,
  data: GeoJSON.GeoJSON,
  options?: { generateId?: boolean },
) {
  const source = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
  if (source) {
    source.setData(data);
    return;
  }
  map.addSource(sourceId, { type: 'geojson', data, generateId: options?.generateId });
}

export function addLandscapeLayers(
  map: maplibregl.Map,
  data: Record<string, GeoJSON.FeatureCollection>,
  options: { labels?: boolean; cities?: boolean; regionFill?: boolean } = {},
) {
  const { labels = false, cities = false, regionFill = true } = options;
  const upsertSource = (id: string, collection?: GeoJSON.FeatureCollection) => {
    const source = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(collection ?? EMPTY_FEATURE_COLLECTION);
      return true;
    }
    if (!collection?.features.length) return false;
    map.addSource(id, { type: 'geojson', data: collection });
    return true;
  };

  if (upsertSource('map-biome', data.bioregions)) {
    if (regionFill) {
      if (!map.getLayer('map-biome-fill')) map.addLayer({
        id: 'map-biome-fill', type: 'fill', source: 'map-biome',
        paint: {
          'fill-color': ['coalesce', ['get', 'hex_color'], '#9b8b5c'],
          'fill-opacity': 0.1,
        },
      });
    } else if (map.getLayer('map-biome-fill')) {
      map.removeLayer('map-biome-fill');
    }
    if (!map.getLayer('map-biome-line')) map.addLayer({
      id: 'map-biome-line', type: 'line', source: 'map-biome',
      paint: {
        'line-color': regionFill ? 'rgba(105,85,46,.72)' : 'rgba(207,250,254,.9)',
        'line-width': regionFill ? 1.2 : 1.8,
        'line-dasharray': [2, 2],
      },
    });
    if (labels && !map.getLayer('map-biome-label')) map.addLayer({
      id: 'map-biome-label', type: 'symbol', source: 'map-biome', minzoom: 4,
      layout: {
        'text-field': ['coalesce', ['get', 'bioregion'], ['get', 'biome']],
        'text-font': ['Open Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 8, 14],
        'text-max-width': 12,
      },
      paint: {
        'text-color': '#ecfeff',
        'text-halo-color': 'rgba(3,12,20,.9)',
        'text-halo-width': 1.5,
      },
    });
  }
  if (upsertSource('map-protected', data.protected_areas)) {
    if (!map.getLayer('map-protected-fill')) map.addLayer({
      id: 'map-protected-fill', type: 'fill', source: 'map-protected',
      paint: { 'fill-color': '#5f8f62', 'fill-opacity': 0.19 },
    });
    if (!map.getLayer('map-protected-line')) map.addLayer({
      id: 'map-protected-line', type: 'line', source: 'map-protected',
      paint: { 'line-color': 'rgba(57,101,61,.75)', 'line-width': 0.8 },
    });
    if (labels && !map.getLayer('map-protected-label')) map.addLayer({
      id: 'map-protected-label', type: 'symbol', source: 'map-protected', minzoom: 5,
      layout: {
        'text-field': ['coalesce', ['get', 'name'], ['get', 'designation']],
        'text-font': ['Open Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 5, 10, 10, 13],
        'text-max-width': 11,
        'text-variable-anchor': ['center', 'top', 'bottom'],
        'text-radial-offset': 0.3,
      },
      paint: {
        'text-color': '#bbf7d0',
        'text-halo-color': 'rgba(3,12,20,.94)',
        'text-halo-width': 1.5,
      },
    });
  }
  for (const [key, color, opacity, labelProperty] of [
    ['lakes', '#7ca9b7', 0.45, 'lake_name'],
    ['wetlands', '#82aaa0', 0.3, 'ecoregion'],
  ] as const) {
    const sourceId = `map-${key}`;
    if (upsertSource(sourceId, data[key])) {
      if (!map.getLayer(`${sourceId}-fill`)) map.addLayer({
        id: `${sourceId}-fill`, type: 'fill', source: sourceId,
        paint: { 'fill-color': color, 'fill-opacity': opacity },
      });
      if (labels && !map.getLayer(`${sourceId}-label`)) map.addLayer({
        id: `${sourceId}-label`, type: 'symbol', source: sourceId, minzoom: 5,
        layout: {
          'text-field': ['coalesce', ['get', labelProperty], ['get', 'mht_txt']],
          'text-font': ['Open Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 5, 10, 10, 13],
          'text-max-width': 10,
        },
        paint: {
          'text-color': key === 'lakes' ? '#bae6fd' : '#99f6e4',
          'text-halo-color': 'rgba(3,12,20,.94)',
          'text-halo-width': 1.5,
        },
      });
    }
  }
  if (upsertSource('map-rivers', data.rivers)) {
    if (!map.getLayer('map-rivers-line')) map.addLayer({
      id: 'map-rivers-line', type: 'line', source: 'map-rivers',
      paint: {
        'line-color': '#38bdf8',
        'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.8, 10, 2.2],
        'line-opacity': 0.86,
      },
    });
    if (labels && !map.getLayer('map-rivers-label')) map.addLayer({
      id: 'map-rivers-label', type: 'symbol', source: 'map-rivers', minzoom: 5,
      layout: {
        'symbol-placement': 'line',
        'symbol-spacing': 320,
        'text-field': ['get', 'river_map'],
        'text-font': ['Open Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 5, 10, 11, 13],
        'text-keep-upright': true,
      },
      paint: {
        'text-color': '#bae6fd',
        'text-halo-color': 'rgba(3,12,20,.94)',
        'text-halo-width': 1.5,
      },
    });
  }
  if (cities && upsertSource('map-cities', data.cities)) {
    if (!map.getLayer('map-cities-points')) map.addLayer({
      id: 'map-cities-points', type: 'circle', source: 'map-cities', minzoom: 3,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 2.5, 10, 5],
        'circle-color': '#fbbf24',
        'circle-stroke-color': '#071923',
        'circle-stroke-width': 1.5,
      },
    });
    if (labels && !map.getLayer('map-cities-label')) map.addLayer({
      id: 'map-cities-label', type: 'symbol', source: 'map-cities', minzoom: 3,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 3, 10, 10, 14],
        'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
        'text-radial-offset': 0.65,
        'text-justify': 'auto',
        'text-optional': true,
      },
      paint: {
        'text-color': '#fef3c7',
        'text-halo-color': 'rgba(3,12,20,.96)',
        'text-halo-width': 1.6,
      },
    });
  }
  restoreCustomLayerOrder(map);
}
