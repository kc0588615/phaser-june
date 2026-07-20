// ExpeditionMapHud — in-run 2D map panel for v3 expeditions (Plan 018).
//
// Replaces the Cesium globe while a v3 mystery run is active. Upper region is a
// MapLibre map styled as a field-notebook topo sheet with the dashed route and
// three research-site markers (visited / current / upcoming); lower region is
// the persistent readout: travel note + three-slot EvidenceLog. Tapping a
// marker focuses that site's slot in the readout.
//
// Fullscreen moves the single map instance into a body portal overlay with a
// wider zoom range; Escape or the close button exits, and `#app-container` is
// made inert (board stays visible but keyboard-dead) while the overlay is open.
//
// Base tiles: MapLibre demo tiles restyled inline (plan-approved first cut).
// Set NEXT_PUBLIC_MAP_STYLE_URL to swap in a self-hosted PMTiles style later.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import maplibregl from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Maximize2, X } from 'lucide-react';
import type { RunState } from '@/types/expedition';
import { getWaypointTypeLabel } from '@/types/waypoints';
import { EvidenceLog } from './EvidenceLog';

// Zoom clamps approximate the plan's scales: ~1:6M regional context up to
// ~1:500k single-site detail in the panel; fullscreen unlocks a wider range.
const PANEL_MIN_ZOOM = 5;
const PANEL_MAX_ZOOM = 10;
const FULL_MIN_ZOOM = 2;
const FULL_MAX_ZOOM = 13;
const FIT_PADDING = 48;
/** Give demotiles + WebGL first frame a bounded window before showing Retry. */
const MAP_LOAD_TIMEOUT_MS = 8000;

type SiteStatus = 'visited' | 'current' | 'upcoming';

interface SiteDatum {
  nodeIndex: number;
  name: string;
  lon: number;
  lat: number;
  typeLabel: string | null;
  distKm: number | null;
  biome: string | null;
  status: SiteStatus;
}

const NOTEBOOK_STYLE: StyleSpecification = {
  version: 8,
  name: 'field-notebook',
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    demotiles: { type: 'vector', url: 'https://demotiles.maplibre.org/tiles/tiles.json' },
  },
  layers: [
    { id: 'paper-water', type: 'background', paint: { 'background-color': '#b9ccc9' } },
    {
      id: 'land', type: 'fill', source: 'demotiles', 'source-layer': 'countries',
      paint: { 'fill-color': '#ece4cd' },
    },
    {
      id: 'graticule', type: 'line', source: 'demotiles', 'source-layer': 'geolines',
      paint: { 'line-color': 'rgba(122,109,80,0.3)', 'line-width': 0.6, 'line-dasharray': [1, 3] },
    },
    {
      id: 'country-ink', type: 'line', source: 'demotiles', 'source-layer': 'countries',
      paint: { 'line-color': '#a5936a', 'line-width': 0.8 },
    },
  ],
};

function resolveMapStyle(): string | StyleSpecification {
  return process.env.NEXT_PUBLIC_MAP_STYLE_URL || NOTEBOOK_STYLE;
}

function buildMarkerElement(site: SiteDatum): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = `map-site-marker map-site-marker--${site.status}`;
  element.setAttribute('aria-label', `Site ${site.nodeIndex + 1}: ${site.name} (${site.status})`);
  const dot = document.createElement('span');
  dot.className = 'map-site-marker-dot';
  dot.textContent = site.status === 'visited' ? '✓' : '';
  element.appendChild(dot);
  if (site.status === 'current') {
    const label = document.createElement('span');
    label.className = 'map-site-marker-label';
    label.textContent = site.name;
    element.appendChild(label);
  }
  return element;
}

export function ExpeditionMapHud({ runState, onSiteClick }: {
  runState: RunState;
  onSiteClick?: (nodeIndex: number) => void;
}) {
  const expedition = runState.expedition;
  const caseState = runState.caseState;
  const guessing = caseState?.stage === 'guess';

  // Site positions come from the persisted snapshot mapView when present;
  // waypoint data fills in the label/type/distance detail it doesn't carry.
  const mapView = caseState?.mapView ?? null;
  const sites = useMemo<SiteDatum[]>(() => {
    const nodes = expedition?.nodes ?? [];
    return [0, 1, 2].flatMap(nodeIndex => {
      const point = mapView?.route[nodeIndex as 0 | 1 | 2];
      const waypoint = nodes[nodeIndex]?.waypoint;
      const lon = point?.lon ?? waypoint?.lon;
      const lat = point?.lat ?? waypoint?.lat;
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return [];
      const status: SiteStatus = nodeIndex < runState.currentNodeIndex ? 'visited'
        : nodeIndex === runState.currentNodeIndex ? (guessing ? 'visited' : 'current')
        : 'upcoming';
      return [{
        nodeIndex,
        name: waypoint?.name || point?.nearestFeature || `Site ${nodeIndex + 1}`,
        lon: lon as number,
        lat: lat as number,
        typeLabel: waypoint ? getWaypointTypeLabel(waypoint.waypointType) : null,
        distKm: waypoint && Number.isFinite(waypoint.distKm) ? waypoint.distKm : null,
        biome: point?.biome ?? expedition?.bioregion?.biome ?? null,
        status,
      }];
    });
  }, [expedition, mapView, runState.currentNodeIndex, guessing]);

  const routeCoords = useMemo<[number, number][]>(() => {
    if (mapView) return mapView.route.map(point => [point.lon, point.lat] as [number, number]);
    const polyline = (expedition?.routePolyline ?? [])
      .filter(point => Number.isFinite(point.lon) && Number.isFinite(point.lat))
      .map(point => [point.lon, point.lat] as [number, number]);
    return polyline.length >= 2 ? polyline : sites.map(site => [site.lon, site.lat] as [number, number]);
  }, [expedition, mapView, sites]);

  const [focusNodeIndex, setFocusNodeIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  /** Cover state: loading placeholder, ready (hidden), or error/retry (replaces placeholder). */
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [mapError, setMapError] = useState<string | null>(null);
  /** Bump to tear down and recreate the MapLibre instance (Retry). */
  const [initToken, setInitToken] = useState(0);

  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const panelSlotRef = useRef<HTMLDivElement | null>(null);
  const overlaySlotRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const didFitRef = useRef(false);
  // One-shot layer fetch guards — reset on Retry so a recreated map re-pulls.
  const rangeRequestedRef = useRef(false);
  const gisRequestedRef = useRef(false);
  const fullscreenButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleSiteClick = useCallback((nodeIndex: number) => {
    setFocusNodeIndex(nodeIndex);
    onSiteClick?.(nodeIndex);
  }, [onSiteClick]);

  const retryMap = useCallback(() => {
    setMapReady(false);
    setMapError(null);
    setMapStatus('loading');
    didFitRef.current = false;
    gisRequestedRef.current = false;
    rangeRequestedRef.current = false;
    setInitToken(token => token + 1);
  }, []);

  // Create the map once the panel slot has a non-zero size. Host is reparentable
  // between panel and fullscreen without tearing down the WebGL context.
  // initToken forces a full recreate after Retry / context loss recovery.
  useEffect(() => {
    const slot = panelSlotRef.current;
    if (!slot) return;

    let cancelled = false;
    let started = false;
    let hasCompletedInitialLoad = false;
    let map: maplibregl.Map | null = null;
    let host: HTMLDivElement | null = null;
    let loadTimer: number | null = null;
    let sizeObserver: ResizeObserver | null = null;
    let rafOuter = 0;
    let rafInner = 0;

    const clearLoadTimer = () => {
      if (loadTimer !== null) {
        window.clearTimeout(loadTimer);
        loadTimer = null;
      }
    };

    const destroyMap = () => {
      clearLoadTimer();
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      if (map) {
        try { map.remove(); } catch { /* already removed */ }
        map = null;
      }
      host?.remove();
      host = null;
      mapRef.current = null;
      mapHostRef.current = null;
    };

    const markReady = (instance: maplibregl.Map) => {
      if (cancelled) return;
      hasCompletedInitialLoad = true;
      clearLoadTimer();
      try {
        instance.resize();
        instance.triggerRepaint();
      } catch { /* ignore resize races during teardown */ }
      setMapError(null);
      setMapStatus('ready');
      setMapReady(true);
    };

    const markError = (message: string) => {
      if (cancelled) return;
      clearLoadTimer();
      setMapReady(false);
      setMapError(message);
      setMapStatus('error');
    };

    const startMap = () => {
      if (cancelled || started) return;
      if (slot.clientWidth <= 0 || slot.clientHeight <= 0) return;
      started = true;
      sizeObserver?.disconnect();
      sizeObserver = null;

      host = document.createElement('div');
      host.className = 'map-hud-canvas';
      mapHostRef.current = host;
      slot.appendChild(host);

      try {
        map = new maplibregl.Map({
          container: host,
          style: resolveMapStyle(),
          center: [0, 0],
          zoom: 6,
          minZoom: PANEL_MIN_ZOOM,
          maxZoom: PANEL_MAX_ZOOM,
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
        });
      } catch (error) {
        markError(error instanceof Error ? error.message : 'Map failed to start');
        return;
      }

      map.touchZoomRotate.disableRotation();
      map.keyboard.disableRotation();
      mapRef.current = map;

      const handleLoad = () => {
        if (map) markReady(map);
      };
      // Later source/tile work makes map.loaded() false again. Only the initial
      // load may replace the map with the retry cover.
      const handleError = (event: { error?: Error | { message?: string } }) => {
        if (cancelled || !map || hasCompletedInitialLoad) return;
        const raw = event?.error;
        const message = raw instanceof Error
          ? raw.message
          : (raw && typeof raw === 'object' && 'message' in raw && typeof raw.message === 'string')
            ? raw.message
            : 'Map style failed to load';
        markError(message);
      };
      const handleContextLost = (event: { originalEvent?: Event }) => {
        event.originalEvent?.preventDefault?.();
        markError('Map graphics context lost — retry after Cesium/Phaser settle');
      };
      const handleContextRestored = () => {
        if (cancelled || !map) return;
        try {
          map.resize();
          map.triggerRepaint();
        } catch { /* ignore */ }
        if (map.loaded()) markReady(map);
      };

      map.on('load', handleLoad);
      map.on('error', handleError);
      map.on('webglcontextlost', handleContextLost);
      map.on('webglcontextrestored', handleContextRestored);

      if (map.loaded()) {
        markReady(map);
      } else {
        loadTimer = window.setTimeout(() => {
          if (!cancelled && map && !map.loaded()) {
            markError('Map took too long to load');
          }
        }, MAP_LOAD_TIMEOUT_MS);
      }
    };

    if (typeof ResizeObserver !== 'undefined') {
      sizeObserver = new ResizeObserver(() => startMap());
      sizeObserver.observe(slot);
    }
    // Double-rAF: flex split often settles one frame after mount.
    rafOuter = window.requestAnimationFrame(() => {
      rafInner = window.requestAnimationFrame(startMap);
    });
    startMap();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafOuter);
      window.cancelAnimationFrame(rafInner);
      sizeObserver?.disconnect();
      destroyMap();
    };
  }, [initToken]);

  // Route line + site markers; rebuilt when progress changes (≤3 markers).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const routeData: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: routeCoords },
      properties: {},
    };
    const source = map.getSource('expedition-route') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(routeData);
    } else {
      map.addSource('expedition-route', { type: 'geojson', data: routeData });
      map.addLayer({
        id: 'expedition-route-casing', type: 'line', source: 'expedition-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': 'rgba(122,82,44,0.22)', 'line-width': 5.5 },
      });
      map.addLayer({
        id: 'expedition-route-line', type: 'line', source: 'expedition-route',
        layout: { 'line-join': 'round' },
        paint: { 'line-color': '#7a522c', 'line-width': 2, 'line-dasharray': [1.8, 2.4] },
      });
    }
    markersRef.current.forEach(marker => marker.remove());
    const markerEntries = sites.map(site => {
      const element = buildMarkerElement(site);
      const handleClick = (event: MouseEvent) => {
        event.stopPropagation();
        handleSiteClick(site.nodeIndex);
      };
      element.addEventListener('click', handleClick);
      const marker = new maplibregl.Marker({ element, anchor: 'center' })
        .setLngLat([site.lon, site.lat])
        .addTo(map);
      return { element, handleClick, marker };
    });
    markersRef.current = markerEntries.map(entry => entry.marker);
    return () => {
      markerEntries.forEach(({ element, handleClick, marker }) => {
        element.removeEventListener('click', handleClick);
        marker.remove();
      });
      if (markersRef.current.every(marker => markerEntries.some(entry => entry.marker === marker))) {
        markersRef.current = [];
      }
    };
  }, [mapReady, sites, routeCoords, handleSiteClick]);

  // One-time auto-fit, clamped by the panel zoom range. Snapshot mapView
  // bounds already carry the plan's 20% padding; derived site bounds don't.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || didFitRef.current) return;
    if (mapView) {
      didFitRef.current = true;
      const [west, south, east, north] = mapView.bounds;
      map.fitBounds(new maplibregl.LngLatBounds([west, south], [east, north]),
        { padding: 12, duration: 0, maxZoom: PANEL_MAX_ZOOM });
      return;
    }
    if (sites.length === 0) return;
    didFitRef.current = true;
    const bounds = new maplibregl.LngLatBounds();
    sites.forEach(site => bounds.extend([site.lon, site.lat]));
    map.fitBounds(bounds, { padding: FIT_PADDING, duration: 0, maxZoom: PANEL_MAX_ZOOM });
  }, [mapReady, mapView, sites]);

  // Answer range reveal flourish: fetched only after a server-confirmed
  // correct guess (the endpoint 409s until the run is completed).
  const showRange = caseState?.guessResult === 'correct';
  const layerOriginLon = sites[0]?.lon;
  const layerOriginLat = sites[0]?.lat;

  // Public landscape context only: water, protected areas, and the active
  // One Earth boundary. Species geometry is fetched through the locked range
  // endpoint above and can never enter this response during deduction.
  useEffect(() => {
    if (!mapReady || gisRequestedRef.current || layerOriginLon === undefined || layerOriginLat === undefined) return;
    gisRequestedRef.current = true;
    const controller = new AbortController();
    const params = new URLSearchParams({ lon: String(layerOriginLon), lat: String(layerOriginLat) });
    if (mapView) {
      const [west, south, east, north] = mapView.bounds;
      if (west >= -180 && east <= 180) {
        params.set('west', String(west));
        params.set('south', String(south));
        params.set('east', String(east));
        params.set('north', String(north));
      }
    }
    (async () => {
      try {
        const response = await fetch(`/api/layers/near-point?${params}`, { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json() as Record<string, GeoJSON.FeatureCollection>;
        const map = mapRef.current;
        if (!map) return;
        const beforeId = map.getLayer('expedition-route-casing') ? 'expedition-route-casing' : undefined;
        addLandscapeLayers(map, data, beforeId);
      } catch { /* contextual layers are optional; route play remains available */ }
    })();
    return () => controller.abort();
  }, [mapReady, mapView, layerOriginLon, layerOriginLat]);

  useEffect(() => {
    if (!mapReady || !showRange || !runState.runId || rangeRequestedRef.current) return;
    rangeRequestedRef.current = true;
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(`/api/runs/${runState.runId}/range`, { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json() as { range: GeoJSON.Feature | null };
        const map = mapRef.current;
        if (!data.range || !map || map.getSource('answer-range')) return;
        map.addSource('answer-range', { type: 'geojson', data: data.range });
        const beforeId = map.getLayer('expedition-route-casing') ? 'expedition-route-casing' : undefined;
        map.addLayer({
          id: 'answer-range-fill', type: 'fill', source: 'answer-range',
          paint: { 'fill-color': '#4e8f5b', 'fill-opacity': 0, 'fill-opacity-transition': { duration: 1200 } },
        }, beforeId);
        map.addLayer({
          id: 'answer-range-line', type: 'line', source: 'answer-range',
          paint: { 'line-color': 'rgba(78,143,91,0)', 'line-width': 1.2, 'line-color-transition': { duration: 1200 } },
        }, beforeId);
        requestAnimationFrame(() => {
          mapRef.current?.setPaintProperty('answer-range-fill', 'fill-opacity', 0.24);
          mapRef.current?.setPaintProperty('answer-range-line', 'line-color', 'rgba(78,143,91,0.85)');
        });
      } catch { /* reveal flourish only — never block the run on it */ }
    })();
    return () => controller.abort();
  }, [mapReady, showRange, runState.runId]);

  // Keep the canvas sized to whichever slot currently hosts it.
  useEffect(() => {
    const slot = panelSlotRef.current;
    if (!slot || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      const map = mapRef.current;
      if (!map) return;
      map.resize();
      map.triggerRepaint();
    });
    observer.observe(slot);
    return () => observer.disconnect();
  }, [initToken]);

  // When the panel becomes visible again (display:none → flex, tab back),
  // force a resize/repaint — MapLibre can stay blank after a hidden period.
  useEffect(() => {
    const slot = panelSlotRef.current;
    if (!slot) return;
    const refresh = () => {
      const map = mapRef.current;
      if (!map) return;
      try {
        map.resize();
        map.triggerRepaint();
      } catch { /* map mid-teardown */ }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    let intersection: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      intersection = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio > 0)) {
          refresh();
        }
      }, { threshold: 0.01 });
      intersection.observe(slot);
    }
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      intersection?.disconnect();
    };
  }, [initToken]);

  // Reparent the map host between the panel and the fullscreen overlay.
  useEffect(() => {
    const host = mapHostRef.current;
    const target = isFullscreen ? overlaySlotRef.current : panelSlotRef.current;
    if (!host || !target || host.parentElement === target) return;
    target.appendChild(host);
    const map = mapRef.current;
    if (map) {
      map.setMinZoom(isFullscreen ? FULL_MIN_ZOOM : PANEL_MIN_ZOOM);
      map.setMaxZoom(isFullscreen ? FULL_MAX_ZOOM : PANEL_MAX_ZOOM);
      map.resize();
      map.triggerRepaint();
    }
  }, [isFullscreen]);

  // Fullscreen a11y: Escape exits, background app is inert, focus is managed.
  useEffect(() => {
    if (!isFullscreen) return;
    const app = document.getElementById('app-container');
    const fullscreenTrigger = fullscreenButtonRef.current;
    app?.setAttribute('inert', '');
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullscreen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      app?.removeAttribute('inert');
      document.removeEventListener('keydown', onKeyDown);
      fullscreenTrigger?.focus();
    };
  }, [isFullscreen]);

  if (!caseState) return null;
  const focusedSite = focusNodeIndex !== null ? sites.find(site => site.nodeIndex === focusNodeIndex) ?? null : null;

  return (
    <div className="relative flex h-full w-full min-h-0 flex-col" aria-label="Expedition map">
      <div className="relative min-h-0 flex-[3] overflow-hidden">
        <div ref={panelSlotRef} className="absolute inset-0" />
        {mapStatus !== 'ready' && (
          <div className="absolute inset-0 z-[1] grid place-items-center bg-[#0b1a1d] px-4 text-center">
            {mapStatus === 'error' ? (
              <div className="flex max-w-xs flex-col items-center gap-2">
                <p className="m-0 text-[11px] font-semibold uppercase tracking-[.16em] text-amber-100/80">
                  Map failed to chart
                </p>
                <p className="m-0 text-[10px] leading-snug text-white/55">
                  {mapError ?? 'Unknown map error'}
                </p>
                <button
                  type="button"
                  onClick={retryMap}
                  className="mt-1 rounded-lg border border-cyan-200/40 bg-cyan-100/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.14em] text-cyan-100 transition hover:bg-cyan-100/20"
                >
                  Retry map
                </button>
              </div>
            ) : (
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[.16em] text-cyan-100/60">
                Charting route…
              </p>
            )}
          </div>
        )}
        <button
          ref={fullscreenButtonRef}
          type="button"
          onClick={() => setIsFullscreen(true)}
          aria-label="Expand map to fullscreen"
          className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-lg border border-white/20 bg-[rgba(7,17,20,.85)] text-cyan-100 shadow-lg backdrop-blur-sm transition hover:bg-[rgba(14,32,36,.95)]"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        {focusedSite && (
          <div className="absolute bottom-2 left-2 right-12 z-10 rounded-lg border border-white/15 bg-[rgba(7,17,20,.88)] px-2.5 py-1.5 text-[10px] text-white/80 backdrop-blur-sm">
            <b className="mr-1 text-cyan-100">Site {focusedSite.nodeIndex + 1} · {focusedSite.name}</b>
            {focusedSite.typeLabel && <span className="mr-1">{focusedSite.typeLabel}.</span>}
            {focusedSite.status === 'current' && focusedSite.biome && <span className="mr-1">Biome: {focusedSite.biome}.</span>}
            {focusedSite.distKm !== null && <span>Near here, {focusedSite.distKm.toFixed(1)} km from basecamp.</span>}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-[2] overflow-y-auto border-t border-ds-subtle bg-[rgba(7,17,20,.92)] px-2 py-2">
        {caseState.travelEntry && (
          <p className="m-0 mb-1.5 rounded-lg bg-white/[.04] px-2 py-1 text-[10px] italic text-amber-100/80">{caseState.travelEntry}</p>
        )}
        <EvidenceLog caseState={caseState} focusNodeIndex={focusNodeIndex} />
      </div>

      {isFullscreen && createPortal(
        <div className="map-hud-fullscreen" role="dialog" aria-modal="true" aria-label="Expedition map, fullscreen">
          <div className="map-hud-fullscreen-panel">
            <div ref={overlaySlotRef} className="absolute inset-0" />
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setIsFullscreen(false)}
              aria-label="Close fullscreen map"
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-lg border border-white/20 bg-[rgba(7,17,20,.85)] text-cyan-100 shadow-lg backdrop-blur-sm transition hover:bg-[rgba(14,32,36,.95)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function addLandscapeLayers(
  map: maplibregl.Map,
  data: Record<string, GeoJSON.FeatureCollection>,
  beforeId?: string,
) {
  const addSource = (id: string, collection?: GeoJSON.FeatureCollection) => {
    if (!collection?.features?.length || map.getSource(id)) return false;
    map.addSource(id, { type: 'geojson', data: collection });
    return true;
  };
  if (addSource('map-biome', data.bioregions)) {
    map.addLayer({
      id: 'map-biome-fill', type: 'fill', source: 'map-biome',
      paint: { 'fill-color': '#9b8b5c', 'fill-opacity': 0.08 },
    }, beforeId);
    map.addLayer({
      id: 'map-biome-line', type: 'line', source: 'map-biome',
      paint: { 'line-color': 'rgba(105,85,46,.72)', 'line-width': 1.2, 'line-dasharray': [2, 2] },
    }, beforeId);
  }
  if (addSource('map-protected', data.protected_areas)) {
    map.addLayer({
      id: 'map-protected-fill', type: 'fill', source: 'map-protected',
      paint: { 'fill-color': '#5f8f62', 'fill-opacity': 0.19 },
    }, beforeId);
    map.addLayer({
      id: 'map-protected-line', type: 'line', source: 'map-protected',
      paint: { 'line-color': 'rgba(57,101,61,.75)', 'line-width': 0.8 },
    }, beforeId);
  }
  for (const [key, color, opacity] of [
    ['lakes', '#7ca9b7', 0.45],
    ['wetlands', '#82aaa0', 0.3],
  ] as const) {
    const sourceId = `map-${key}`;
    if (addSource(sourceId, data[key])) map.addLayer({
      id: `${sourceId}-fill`, type: 'fill', source: sourceId,
      paint: { 'fill-color': color, 'fill-opacity': opacity },
    }, beforeId);
  }
  if (addSource('map-rivers', data.rivers)) map.addLayer({
    id: 'map-rivers-line', type: 'line', source: 'map-rivers',
    paint: { 'line-color': '#699bac', 'line-width': 1.1, 'line-opacity': 0.8 },
  }, beforeId);
}
