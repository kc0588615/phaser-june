// The home globe (MapLibre, globe projection). Shows land, a dot per place in
// the current list, the picked place's outline, and for each animal the player
// found its range, tinted by animal group, with an emoji marker inside it. Ranges
// stack, so the more found somewhere, the brighter it gets. Tapping a dot picks
// that place; picking flies there.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GeoJSONSource, Map as MapLibreMap, Marker, StyleSpecification } from 'maplibre-gl';
import type { Place } from '@/clueGame/places';
import { WORLD_LAND_GEOJSON_URL } from '@/clueGame/worldMap';
import { getJson } from '@/lib/getJson';

export interface GlobeAnimal {
  id: number;
  /** Emoji (or initials) on the marker. */
  badge: string;
  color: string;
}

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

// The logo's map grid on the globe: meridians and parallels every 30°.
const steps = (from: number, to: number, by: number) => Array.from({ length: Math.floor((to - from) / by) + 1 }, (_, i) => from + i * by);
const line = (coordinates: [number, number][]): GeoJSON.Feature => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } });
const GRATICULE: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    ...steps(-180, 150, 30).map(lon => line(steps(-90, 90, 5).map(lat => [lon, lat]))),
    ...steps(-60, 60, 30).map(lat => line(steps(-180, 180, 5).map(lon => [lon, lat]))),
  ],
};

const STYLE: StyleSpecification = {
  version: 8,
  projection: { type: 'globe' },
  sources: {
    land: { type: 'geojson', data: WORLD_LAND_GEOJSON_URL, attribution: 'Natural Earth' },
    graticule: { type: 'geojson', data: GRATICULE },
    selected: { type: 'geojson', data: EMPTY },
    places: { type: 'geojson', data: EMPTY },
    ranges: { type: 'geojson', data: EMPTY },
  },
  layers: [
    { id: 'ocean', type: 'background', paint: { 'background-color': '#0b1a1f' } },
    { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#1f3d47' } },
    { id: 'graticule', type: 'line', source: 'graticule', paint: { 'line-color': '#47788a', 'line-width': 0.6, 'line-opacity': 0.45 } },
    { id: 'land-edge', type: 'line', source: 'land', paint: { 'line-color': '#47788a', 'line-width': 0.6 } },
    { id: 'ranges', type: 'fill', source: 'ranges', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.25 } },
    // Small ranges are slivers at globe zoom; the edge keeps them readable.
    { id: 'ranges-edge', type: 'line', source: 'ranges', paint: { 'line-color': ['get', 'color'], 'line-width': 0.8, 'line-opacity': 0.6 } },
    { id: 'selected-fill', type: 'fill', source: 'selected', paint: { 'fill-color': '#6fa8bc', 'fill-opacity': 0.2 } },
    { id: 'selected-line', type: 'line', source: 'selected', paint: { 'line-color': '#a9cfdc', 'line-width': 1.6 } },
    {
      id: 'places', type: 'circle', source: 'places',
      paint: {
        'circle-radius': ['case', ['get', 'selected'], 7, 4.5],
        'circle-color': ['case', ['get', 'selected'], '#f3f1e8', '#6fa8bc'],
        'circle-opacity': 0.9,
        'circle-stroke-color': '#08110d',
        'circle-stroke-width': 1.5,
      },
    },
  ],
  sky: {
    'sky-color': '#08110d',
    'horizon-color': '#1d3a44',
    'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
  },
};

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function markerElement(animal: GlobeAnimal): HTMLElement {
  const element = document.createElement('div');
  element.className = 'pointer-events-none grid h-7 w-7 place-items-center rounded-full border-2 bg-neutral-1 text-s leading-none';
  element.style.borderColor = animal.color;
  element.textContent = animal.badge;
  element.setAttribute('aria-hidden', 'true');
  return element;
}

export function Globe({ places, selected, found, onPick }: {
  places: Place[];
  selected: Place | null;
  found: GlobeAnimal[];
  onPick: (key: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const libRef = useRef<typeof import('maplibre-gl') | null>(null);
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
      const maplibregl = await import('maplibre-gl');
      if (cancelled || !container.current) return;
      libRef.current = maplibregl;
      // v6 finds its worker from import.meta.url, which the bundler rewrites; point at the emitted file.
      maplibregl.setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).href);
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
    const map = mapRef.current;
    const maplibregl = libRef.current;
    if (!map || !maplibregl || !ready) return;
    const source = map.getSource<GeoJSONSource>('ranges');
    if (found.length === 0) {
      source?.setData(EMPTY);
      return;
    }
    const byId = new Map(found.map(animal => [animal.id, animal]));
    const ids = [...byId.keys()].sort((a, b) => a - b).join(',');
    let current = true;
    const markers: Marker[] = [];
    getJson<GeoJSON.FeatureCollection>(`/api/clue-game/ranges/?species=${ids}`)
      .then(ranges => {
        if (!current) return;
        source?.setData({
          ...ranges,
          features: ranges.features.map(feature => ({ ...feature, properties: { ...feature.properties, color: byId.get(feature.properties?.speciesId)?.color } })),
        });
        for (const { properties } of ranges.features) {
          const animal = byId.get(properties?.speciesId);
          if (!animal) continue;
          // Hidden, not dimmed, on the far side of the globe.
          markers.push(new maplibregl.Marker({ element: markerElement(animal), opacityWhenCovered: '0' }).setLngLat([properties?.lon, properties?.lat]).addTo(map));
        }
      })
      .catch(error => console.error('[Globe] Failed to load ranges:', error));
    return () => {
      current = false;
      markers.forEach(marker => marker.remove());
    };
  }, [found, ready]);

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
    getJson<GeoJSON.Feature>(`/api/places/outline/?key=${encodeURIComponent(selected.key)}`)
      .catch(error => {
        console.error('[Globe] Failed to load an outline:', error);
        return EMPTY;
      })
      .then(outline => { if (current) source?.setData(outline); });
    return () => { current = false; };
  }, [selected, ready]);

  return <div ref={container} className="h-full w-full" role="region" aria-label="Globe. Pick a place from the list, or tap a dot." />;
}
