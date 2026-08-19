// ExpeditionMapHud — in-run 2D map panel for v3 expeditions (Plan 018).
//
// Upper region is a MapLibre map sharing the exploration globe's habitat cartography, with the dashed route and
// three research-site markers (visited / current / upcoming); the lower region
// keeps only issued evidence in a compact readout. Full reasoning opens over
// the fullscreen map.
//
// Fullscreen moves the single map instance into a body portal overlay with a
// wider zoom range; Escape or the close button exits, and `#app-container` is
// made inert (board stays visible but keyboard-dead) while the overlay is open.
//
// NEXT_PUBLIC_MAP_STYLE_URL may supply a hosted/self-hosted basemap. App GIS
// APIs and the shared habitat raster provide ecological context.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Leaf, Maximize2, NotebookPen, X } from 'lucide-react';
import type { RunState } from '@/types/expedition';
import { getWaypointTypeLabel } from '@/types/waypoints';
import { addHabitatRasterLayer, addLandscapeLayers } from '@/lib/maplibreLayers';
import { applyMapProjection, resolveMapStyle, restoreCustomLayerOrder } from '@/lib/maplibreStyle';
import { buildRouteFeature, getMapSiteStatus, type MapSiteStatus } from '@/lib/maplibreGeoJSON';
import { speciesService, type RasterHabitatResult } from '@/lib/speciesService';
import { EvidenceLog } from './EvidenceLog';
import { FieldPlate } from './FieldPlate';
import { FieldHintTicker } from './FieldHintTicker';

// Zoom clamps approximate the plan's scales: ~1:6M regional context up to
// ~1:500k single-site detail in the panel; fullscreen unlocks a wider range.
const PANEL_MIN_ZOOM = 5;
const PANEL_MAX_ZOOM = 10;
const FULL_MIN_ZOOM = 2;
const FULL_MAX_ZOOM = 13;
const FIT_PADDING = 48;
/** Give style + WebGL first frame a bounded window before showing Retry. */
const MAP_LOAD_TIMEOUT_MS = 8000;

interface SiteDatum {
  nodeIndex: number;
  name: string;
  lon: number;
  lat: number;
  typeLabel: string | null;
  distKm: number | null;
  biome: string | null;
  status: MapSiteStatus;
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

function HabitatReadout({ habitat, loading }: {
  habitat: RasterHabitatResult | null;
  loading: boolean;
}) {
  return (
    <div className="flex max-w-[min(72vw,320px)] items-center gap-2 rounded-lg border border-emerald-200/25 bg-[rgba(3,18,20,.9)] px-2.5 py-1.5 text-left shadow-lg backdrop-blur-sm">
      <Leaf className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-[8px] font-bold uppercase tracking-[.17em] text-emerald-200/65">Habitat type</span>
        <span className="block truncate text-[10px] font-semibold text-emerald-50">
          {loading ? 'Reading landscape…' : habitat?.habitat_type ?? 'Unclassified habitat'}
        </span>
      </span>
      {habitat && (
        <span className="ml-auto shrink-0 font-mono text-[9px] text-emerald-100/60">
          {Math.round(habitat.percentage)}%
        </span>
      )}
    </div>
  );
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
      const status = getMapSiteStatus(nodeIndex, runState.currentNodeIndex, guessing);
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
  const [showEvidenceDetail, setShowEvidenceDetail] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  /** Cover state: loading placeholder, ready (hidden), or error/retry (replaces placeholder). */
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [mapError, setMapError] = useState<string | null>(null);
  const [dominantHabitat, setDominantHabitat] = useState<RasterHabitatResult | null>(null);
  const [habitatLoading, setHabitatLoading] = useState(false);
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

  const openMapFullscreen = useCallback(() => {
    setShowEvidenceDetail(false);
    setIsFullscreen(true);
  }, []);

  const openEvidenceDetail = useCallback((nodeIndex?: number) => {
    if (nodeIndex !== undefined) setFocusNodeIndex(nodeIndex);
    setShowEvidenceDetail(true);
    setIsFullscreen(true);
  }, []);

  const closeFullscreen = useCallback(() => {
    setIsFullscreen(false);
    setShowEvidenceDetail(false);
  }, []);

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
          style: resolveMapStyle('expedition'),
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
        if (map) {
          applyMapProjection(map, 'expedition');
          markReady(map);
        }
      };
      // Later source/tile work makes map.loaded() false again. Only the initial
      // load may replace the map with the retry cover.
      const handleError = (event: { error?: Error | { message?: string }; sourceId?: string; tile?: unknown }) => {
        // Tile/source errors are transient; only style-level failures are fatal.
        if (cancelled || !map || hasCompletedInitialLoad || event.sourceId || event.tile) return;
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
        markError('Map graphics context lost — retry after Phaser settles');
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
      map.on('style.load', () => { if (map) applyMapProjection(map, 'expedition'); });
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
    const routeData = buildRouteFeature(routeCoords);
    const source = map.getSource('expedition-route') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(routeData);
    } else {
      map.addSource('expedition-route', { type: 'geojson', data: routeData });
      map.addLayer({
        id: 'expedition-route-casing', type: 'line', source: 'expedition-route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': 'rgba(3,12,20,.78)', 'line-width': 6 },
      });
      map.addLayer({
        id: 'expedition-route-line', type: 'line', source: 'expedition-route',
        layout: { 'line-join': 'round' },
        paint: { 'line-color': '#67e8f9', 'line-width': 2.25, 'line-dasharray': [1.8, 2.4] },
      });
      restoreCustomLayerOrder(map);
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
  const habitatSite = sites[runState.currentNodeIndex] ?? sites[0];

  // The same classified habitat raster used by the exploration globe.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const controller = new AbortController();
    void addHabitatRasterLayer(map, controller.signal);
    return () => controller.abort();
  }, [mapReady]);

  // Name the dominant classified habitat around the current research site.
  useEffect(() => {
    if (!habitatSite) return;
    const controller = new AbortController();
    setHabitatLoading(true);
    void speciesService.getRasterHabitatDistribution(habitatSite.lon, habitatSite.lat, controller.signal)
      .then(habitats => {
        if (!controller.signal.aborted) setDominantHabitat(habitats[0] ?? null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setHabitatLoading(false);
      });
    return () => controller.abort();
  }, [habitatSite]);

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
        addLandscapeLayers(map, data, { labels: true, cities: true, regionFill: false });
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
        restoreCustomLayerOrder(map);
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
      if (event.key === 'Escape') closeFullscreen();
    };
    document.addEventListener('keydown', onKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      app?.removeAttribute('inert');
      document.removeEventListener('keydown', onKeyDown);
      fullscreenTrigger?.focus();
    };
  }, [closeFullscreen, isFullscreen]);

  if (!caseState) return null;
  const focusedSite = focusNodeIndex !== null ? sites.find(site => site.nodeIndex === focusNodeIndex) ?? null : null;

  return (
    <div className="relative flex h-full w-full min-h-0 flex-col" aria-label="Expedition map">
      <div className="relative min-h-0 flex-1 overflow-hidden">
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
          onClick={openMapFullscreen}
          aria-label="Expand map to fullscreen"
          className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-lg border border-white/20 bg-[rgba(7,17,20,.85)] text-cyan-100 shadow-lg backdrop-blur-sm transition hover:bg-[rgba(14,32,36,.95)]"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <div className="pointer-events-none absolute left-2 top-2 z-10">
          <HabitatReadout habitat={dominantHabitat} loading={habitatLoading} />
        </div>
        {!isFullscreen && (
          <div className="pointer-events-none absolute bottom-2 left-2 right-12 z-10 flex flex-col gap-1.5">
            {focusedSite && (
              <div className="rounded-lg border border-white/15 bg-[rgba(7,17,20,.88)] px-2.5 py-1.5 text-[10px] text-white/80 backdrop-blur-sm">
                <b className="mr-1 text-cyan-100">Site {focusedSite.nodeIndex + 1} · {focusedSite.name}</b>
                {focusedSite.typeLabel && <span className="mr-1">{focusedSite.typeLabel}.</span>}
                {focusedSite.status === 'current' && focusedSite.biome && <span className="mr-1">Biome: {focusedSite.biome}.</span>}
                {focusedSite.distKm !== null && <span>Near here, {focusedSite.distKm.toFixed(1)} km from basecamp.</span>}
              </div>
            )}
            <FieldHintTicker feed={caseState.hintFeed} />
          </div>
        )}
      </div>

      <div className="max-h-[44%] flex-none overflow-y-auto border-t border-ds-subtle bg-[rgba(7,17,20,.92)] px-2 py-1.5">
        {caseState.travelEntry && (
          <p className="m-0 mb-1 rounded-lg bg-white/[.04] px-2 py-1 text-[9px] italic text-amber-100/75">{caseState.travelEntry}</p>
        )}
        <div className="flex items-start gap-2">
          {runState.runId && <FieldPlate runId={runState.runId} selectedFamilies={caseState.selectedFamilies} />}
          <div className="min-w-0 flex-1">
            <EvidenceLog
              caseState={caseState}
              focusNodeIndex={focusNodeIndex}
              variant="compact"
              onOpenDetail={openEvidenceDetail}
            />
          </div>
        </div>
      </div>

      {isFullscreen && createPortal(
        <div className="map-hud-fullscreen" role="dialog" aria-modal="true" aria-label="Expedition map, fullscreen">
          <div className="map-hud-fullscreen-panel">
            <div ref={overlaySlotRef} className="absolute inset-0" />
            <div className="pointer-events-none absolute left-3 top-3 z-10">
              <HabitatReadout habitat={dominantHabitat} loading={habitatLoading} />
            </div>
            <button
              type="button"
              onClick={() => setShowEvidenceDetail(value => !value)}
              aria-expanded={showEvidenceDetail}
              className="absolute right-14 top-3 z-20 flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-[rgba(7,17,20,.85)] px-2.5 text-[9px] font-bold uppercase tracking-[.12em] text-cyan-100 shadow-lg backdrop-blur-sm transition-colors hover:bg-[rgba(14,32,36,.95)]"
            >
              <NotebookPen className="h-3.5 w-3.5" />
              Evidence {caseState.observations.filter(observation => observation.family).length}/3
            </button>
            {showEvidenceDetail && (
              <aside className="absolute bottom-12 left-3 right-3 z-20 max-h-[58%] overflow-y-auto rounded-xl border border-cyan-100/20 bg-[rgba(5,17,21,.95)] p-3 shadow-2xl backdrop-blur-md md:bottom-3 md:left-auto md:right-3 md:top-14 md:max-h-none md:w-[360px]" aria-label="Full evidence details">
                {caseState.travelEntry && (
                  <p className="m-0 mb-2 rounded-lg bg-white/[.04] px-2 py-1.5 text-[10px] italic text-amber-100/75">{caseState.travelEntry}</p>
                )}
                <EvidenceLog caseState={caseState} focusNodeIndex={focusNodeIndex} variant="detail" />
              </aside>
            )}
            <div className={`pointer-events-none absolute bottom-3 left-3 z-10 ${showEvidenceDetail ? 'right-3 md:right-[380px]' : 'right-3'}`}>
              <FieldHintTicker feed={caseState.hintFeed} />
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeFullscreen}
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
