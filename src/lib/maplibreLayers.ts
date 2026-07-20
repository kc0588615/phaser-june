import type maplibregl from 'maplibre-gl';
import { restoreCustomLayerOrder } from '@/lib/maplibreStyle';

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
) {
  const fallbackStyle = map.getStyle().name === 'field-notebook';
  const addSource = (id: string, collection?: GeoJSON.FeatureCollection) => {
    if (!collection?.features?.length || map.getSource(id)) return false;
    map.addSource(id, { type: 'geojson', data: collection });
    return true;
  };

  if (addSource('map-biome', data.bioregions)) {
    map.addLayer({
      id: 'map-biome-fill', type: 'fill', source: 'map-biome',
      paint: {
        'fill-color': fallbackStyle ? '#ece4cd' : ['coalesce', ['get', 'hex_color'], '#9b8b5c'],
        'fill-opacity': fallbackStyle ? 0.82 : 0.1,
      },
    });
    map.addLayer({
      id: 'map-biome-line', type: 'line', source: 'map-biome',
      paint: { 'line-color': 'rgba(105,85,46,.72)', 'line-width': 1.2, 'line-dasharray': [2, 2] },
    });
  }
  if (addSource('map-protected', data.protected_areas)) {
    map.addLayer({
      id: 'map-protected-fill', type: 'fill', source: 'map-protected',
      paint: { 'fill-color': '#5f8f62', 'fill-opacity': 0.19 },
    });
    map.addLayer({
      id: 'map-protected-line', type: 'line', source: 'map-protected',
      paint: { 'line-color': 'rgba(57,101,61,.75)', 'line-width': 0.8 },
    });
  }
  for (const [key, color, opacity] of [
    ['lakes', '#7ca9b7', 0.45],
    ['wetlands', '#82aaa0', 0.3],
  ] as const) {
    const sourceId = `map-${key}`;
    if (addSource(sourceId, data[key])) {
      map.addLayer({
        id: `${sourceId}-fill`, type: 'fill', source: sourceId,
        paint: { 'fill-color': color, 'fill-opacity': opacity },
      });
    }
  }
  if (addSource('map-rivers', data.rivers)) {
    map.addLayer({
      id: 'map-rivers-line', type: 'line', source: 'map-rivers',
      paint: { 'line-color': '#699bac', 'line-width': 1.1, 'line-opacity': 0.8 },
    });
  }
  restoreCustomLayerOrder(map);
}
