// The home globe (MapLibre, globe projection). Shows land, a dot per place in
// the current list, the picked place's outline, and a glowing marker for each
// animal the player found. Tapping a dot picks that place; picking flies there.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GeoJSONSource, Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import { WORLD_LAND_GEOJSON_URL, type Place } from '@/clueGame/places';

export interface GlobeSighting {
  lon: number;
  lat: number;
  color: string;
  name: string;
}

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

const STYLE: StyleSpecification = {
  version: 8,
  projection: { type: 'globe' },
  sources: {
    land: { type: 'geojson', data: WORLD_LAND_GEOJSON_URL, attribution: 'Natural Earth' },
    selected: { type: 'geojson', data: EMPTY },
    places: { type: 'geojson', data: EMPTY },
    sightings: { type: 'geojson', data: EMPTY },
  },
  layers: [
    { id: 'ocean', type: 'background', paint: { 'background-color': '#08202b' } },
    { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#15404a' } },
    { id: 'land-edge', type: 'line', source: 'land', paint: { 'line-color': '#2d7282', 'line-width': 0.6 } },
    { id: 'selected-fill', type: 'fill', source: 'selected', paint: { 'fill-color': '#67e8f9', 'fill-opacity': 0.16 } },
    { id: 'selected-line', type: 'line', source: 'selected', paint: { 'line-color': '#a5f3fc', 'line-width': 1.6 } },
    {
      id: 'places', type: 'circle', source: 'places',
      paint: {
        'circle-radius': ['case', ['get', 'selected'], 7, 4.5],
        'circle-color': ['case', ['get', 'selected'], '#ecfeff', '#67e8f9'],
        'circle-opacity': 0.9,
        'circle-stroke-color': '#06121a',
        'circle-stroke-width': 1.5,
      },
    },
    { id: 'sighting-glow', type: 'circle', source: 'sightings', paint: { 'circle-radius': 18, 'circle-color': ['get', 'color'], 'circle-blur': 0.9, 'circle-opacity': 0.7 } },
    { id: 'sighting-ring', type: 'circle', source: 'sightings', paint: { 'circle-radius': 8, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': ['get', 'color'], 'circle-stroke-width': 1.5, 'circle-stroke-opacity': 0.9 } },
    { id: 'sighting-core', type: 'circle', source: 'sightings', paint: { 'circle-radius': 4.5, 'circle-color': ['get', 'color'], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5 } },
  ],
  sky: {
    'sky-color': '#06121a',
    'horizon-color': '#0e4a5c',
    'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
  },
};

const outlines = new Map<string, Promise<GeoJSON.Feature | null>>();

function loadOutline(key: string): Promise<GeoJSON.Feature | null> {
  let pending = outlines.get(key);
  if (!pending) {
    pending = fetch(`/api/places/outline/?key=${encodeURIComponent(key)}`)
      .then(response => (response.ok ? response.json() as Promise<GeoJSON.Feature> : null))
      .catch(error => {
        console.error('[Globe] Failed to load an outline:', error);
        outlines.delete(key);
        return null;
      });
    outlines.set(key, pending);
  }
  return pending;
}

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Globe({ places, selected, sightings, onPick }: {
  places: Place[];
  selected: Place | null;
  sightings: GlobeSighting[];
  onPick: (key: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const spinning = useRef(true);
  const onPickRef = useRef(onPick);
  useEffect(() => { onPickRef.current = onPick; }, [onPick]);
  // True once the style has loaded, so the data effects below can draw.
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    spinning.current = !reducedMotion();
    (async () => {
      const maplibregl = (await import('maplibre-gl')).default;
      if (cancelled || !container.current) return;
      const map = new maplibregl.Map({
        container: container.current,
        style: STYLE,
        center: [20, 12],
        zoom: 1.1,
        attributionControl: { compact: true },
        renderWorldCopies: false,
      });
      mapRef.current = map;
      const stopSpin = () => { spinning.current = false; };
      map.on('mousedown', stopSpin);
      map.on('touchstart', stopSpin);
      map.on('wheel', stopSpin);
      map.on('load', () => {
        markReady();
        // A slow spin until the player touches the globe or picks a place.
        const spin = () => {
          if (!spinning.current || cancelled) return;
          const center = map.getCenter();
          map.setCenter([center.lng + 0.04, center.lat]);
          frame = requestAnimationFrame(spin);
        };
        frame = requestAnimationFrame(spin);
        // Discovery markers breathe.
        const start = performance.now();
        const pulse = (now: number) => {
          if (cancelled) return;
          if (!reducedMotion() && map.getLayer('sighting-glow')) {
            map.setPaintProperty('sighting-glow', 'circle-radius', 16 + 6 * Math.sin((now - start) / 450));
          }
          requestAnimationFrame(pulse);
        };
        requestAnimationFrame(pulse);
      });
      map.on('click', 'places', event => {
        const key = event.features?.[0]?.properties?.key;
        if (typeof key === 'string') onPickRef.current(key);
      });
      map.on('mouseenter', 'places', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'places', () => { map.getCanvas().style.cursor = ''; });
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [markReady]);

  useEffect(() => {
    const source = mapRef.current?.getSource<GeoJSONSource>('places');
    source?.setData({
      type: 'FeatureCollection',
      features: places.map(place => ({
        type: 'Feature',
        properties: { key: place.key, name: place.name, selected: place.key === selected?.key },
        geometry: { type: 'Point', coordinates: place.center },
      })),
    });
  }, [places, selected, ready]);

  useEffect(() => {
    const source = mapRef.current?.getSource<GeoJSONSource>('sightings');
    source?.setData({
      type: 'FeatureCollection',
      features: sightings.map(sighting => ({
        type: 'Feature',
        properties: { color: sighting.color, name: sighting.name },
        geometry: { type: 'Point', coordinates: [sighting.lon, sighting.lat] },
      })),
    });
  }, [sightings, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource<GeoJSONSource>('selected');
    if (!selected) {
      source?.setData(EMPTY);
      return;
    }
    spinning.current = false;
    const [west, south, east, north] = selected.bbox;
    map.fitBounds([[west, south], [east, north]], { padding: 40, maxZoom: 5, duration: reducedMotion() ? 0 : 1600 });
    let current = true;
    loadOutline(selected.key).then(outline => { if (current) source?.setData(outline ?? EMPTY); });
    return () => { current = false; };
  }, [selected, ready]);

  return <div ref={container} className="h-full w-full" role="region" aria-label="Globe. Pick a place from the list, or tap a dot." />;
}
