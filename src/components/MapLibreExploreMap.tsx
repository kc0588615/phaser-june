// MapLibreExploreMap — globe exploration, GIS selection, and expedition ingress.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Compass, Layers, Maximize2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { EventBus } from '@/game/EventBus';
import { deriveAvailableAffinities, getDefaultActiveAffinities } from '@/expedition/affinities';
import type { AffinityType } from '@/expedition/affinities';
import { speciesService } from '@/lib/speciesService';
import type { Species } from '@/types/database';
import type { ExpeditionData, RunNode, RunPhase } from '@/types/expedition';
import type { FeatureFingerprint } from '@/types/gis';
import { getAppConfig } from '@/utils/config';
import { useMapLibreEcoregions } from '@/hooks/useMapLibreEcoregions';
import { computeExpeditionRoutePolyline, normalizeRoutePolyline } from '@/lib/expeditionRoute';
import { applyWaypointsToRunNodes } from '@/lib/nodeScoring';
import {
  getWaypointTypeLabel,
  WAYPOINT_TYPE_COLORS,
  type ExpeditionWaypoint,
  type ExpeditionWaypointResponse,
} from '@/types/waypoints';
import { ANIMAL_MARKER, type EcoregionPreviewPick, type EcoregionProgress } from '@/types/ecoregions';
import { applyMapProjection, resolveMapStyle, restoreCustomLayerOrder } from '@/lib/maplibreStyle';
import { removeMapLayersAndSource, setGeoJSONSource } from '@/lib/maplibreLayers';
import { globeZoomAdjustment } from '@/lib/maplibreGeoJSON';
import { cn } from '@/lib/utils';

const TITILER_BASE_URL = process.env.NEXT_PUBLIC_TITILER_BASE_URL || 'https://j8dwwxhoad.execute-api.us-east-2.amazonaws.com';
const COG_URL = process.env.NEXT_PUBLIC_COG_URL || 'https://habitat-cog.s3.us-east-2.amazonaws.com/habitat_cog.tif';
const SPECIES_RADIUS_METERS = 10_000;
const WAYPOINT_FETCH_TIMEOUT_MS = 4_000;
const MAP_LOAD_TIMEOUT_MS = 10_000;

type RasterHabitatSummary = Array<{ habitat_type: string; percentage: number }>;

interface AtPointData {
  generated_nodes?: RunNode[];
  bioregion?: ExpeditionData['bioregion'];
  protected_areas?: ExpeditionData['protectedAreas'];
  primary_node_family?: string;
  primary_variant?: string;
  modifier_nodes?: string[];
  signals?: Record<string, number>;
  nearest_river_dist_m?: number | null;
  feature_fingerprints?: FeatureFingerprint[];
}

interface PendingSelection {
  lon: number;
  lat: number;
  atPointData: AtPointData | null;
  waypointData: ExpeditionWaypointResponse | null;
  species: Species[];
  rasterHabitats: RasterHabitatSummary;
  habitats: string[];
  activeAffinities: AffinityType[];
  availableAffinities: AffinityType[];
  ecoregionId: number | null;
}

export interface MapLibreExploreMapProps {
  onSearchOpen?: () => void;
  expeditionPhase?: RunPhase;
  activeWaypoint?: Pick<ExpeditionWaypoint, 'lon' | 'lat'> | null;
  active?: boolean;
}

function getWaypointRouteOrFallback(
  waypointData: ExpeditionWaypointResponse | null,
  lon: number,
  lat: number,
  count: number,
) {
  const routePolyline = normalizeRoutePolyline(waypointData?.routePolyline);
  return routePolyline.length > 0 ? routePolyline : computeExpeditionRoutePolyline(lon, lat, count);
}

function attachWaypointsToNodes(nodes: RunNode[], waypointData: ExpeditionWaypointResponse | null): RunNode[] {
  if (!waypointData?.waypoints?.length) return nodes;
  const bySlot = new Map(waypointData.waypoints.map(waypoint => [waypoint.slot, waypoint]));
  return applyWaypointsToRunNodes(nodes.map((node, index) => ({
    ...node,
    waypoint: bySlot.get(index as 0 | 1 | 2 | 3 | 4 | 5),
  })));
}

async function fetchWaypointData(lon: number, lat: number): Promise<ExpeditionWaypointResponse | null> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), WAYPOINT_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`/api/expedition/waypoints?lon=${lon}&lat=${lat}`, { signal: controller.signal });
    return response.ok ? response.json() as Promise<ExpeditionWaypointResponse> : null;
  } catch (error) {
    if ((error as { name?: string }).name !== 'AbortError') {
      console.warn('[MapLibreExploreMap] Failed to load waypoints:', error);
    }
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function fetchEcoregionProgress(lon: number, lat: number, signal: AbortSignal): Promise<EcoregionProgress | null> {
  try {
    const response = await fetch(`/api/ecoregions/progress?lon=${lon}&lat=${lat}`, { signal });
    return response.ok ? response.json() as Promise<EcoregionProgress> : null;
  } catch (error) {
    if ((error as { name?: string }).name !== 'AbortError') {
      console.warn('[MapLibreExploreMap] Failed to load ecoregion progress:', error);
    }
    return null;
  }
}

function emitExpeditionReady(input: PendingSelection): boolean {
  const nodes = input.atPointData?.generated_nodes;
  if (!nodes?.length) return false;
  EventBus.emit('expedition-data-ready', {
    lon: input.lon,
    lat: input.lat,
    ecoregionId: input.ecoregionId,
    expedition: {
      nodes: attachWaypointsToNodes(nodes, input.waypointData),
      bioregion: input.atPointData?.bioregion ?? null,
      protectedAreas: input.atPointData?.protected_areas ?? [],
      activeAffinities: input.activeAffinities,
      availableAffinities: input.availableAffinities,
      primaryNodeFamily: input.atPointData?.primary_node_family ?? '',
      primaryVariant: input.atPointData?.primary_variant ?? '',
      modifierNodes: input.atPointData?.modifier_nodes ?? [],
      signals: input.atPointData?.signals ?? {},
      routePolyline: getWaypointRouteOrFallback(input.waypointData, input.lon, input.lat, nodes.length),
      waypoints: input.waypointData?.waypoints ?? [],
      waypointRadiusKm: input.waypointData?.radiusKm ?? null,
      nearestRiverDistM: input.atPointData?.nearest_river_dist_m ?? null,
    },
    species: input.species,
    rasterHabitats: input.rasterHabitats,
    habitats: input.habitats,
    featureFingerprints: input.atPointData?.feature_fingerprints ?? [],
  });
  return true;
}

function habitatsForSpecies(species: Species[]) {
  const habitats = new Set<string>();
  for (const item of species) {
    if (item.habitat_description) habitats.add(item.habitat_description);
    if (item.freshwater) habitats.add('freshwater');
    if (item.terrestrial) habitats.add('terrestrial');
    if (item.marine) habitats.add('marine');
  }
  return [...habitats];
}

function removeSelectionHighlights(map: maplibregl.Map) {
  removeMapLayersAndSource(map, 'species-highlight', ['species-highlight-fill', 'species-highlight-line']);
  removeMapLayersAndSource(map, 'habitat-highlight', ['habitat-highlight-fill', 'habitat-highlight-line']);
}

export default function MapLibreExploreMap({
  onSearchOpen,
  expeditionPhase = 'idle',
  activeWaypoint = null,
  active = true,
}: MapLibreExploreMapProps) {
  const mapHostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const selectionAbortRef = useRef<AbortController | null>(null);
  const selectionRequestRef = useRef(0);
  const habitatTimerRef = useRef<number | null>(null);
  const pointMarkersRef = useRef<maplibregl.Marker[]>([]);
  const waypointMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapGeneration, setMapGeneration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const [ecoregionProgress, setEcoregionProgress] = useState<EcoregionProgress | null>(null);
  const [regionWaypointData, setRegionWaypointData] = useState<ExpeditionWaypointResponse | null>(null);
  const [selectedEcoregion, setSelectedEcoregion] = useState<EcoregionPreviewPick | null>(null);
  const [showEcoregionLayer, setShowEcoregionLayer] = useState(true);
  const [infoBoxData, setInfoBoxData] = useState<{
    habitats: string[];
    species: Species[];
    topHabitat?: string;
    message?: string | null;
    bioregion?: { bioregion?: string | null; realm?: string | null; biome?: string | null };
  }>({ habitats: [], species: [] });

  const ecoregionLayerEnabled = showEcoregionLayer && expeditionPhase === 'idle';
  const { focusedEcoregion, isPreviewLoading, pickEcoregionAtPoint, selectEcoregion } = useMapLibreEcoregions(
    mapRef,
    mapReady,
    ecoregionLayerEnabled,
    mapGeneration,
  );
  const contextEcoregion = selectedEcoregion ?? focusedEcoregion;
  const expeditionBlocksMapClick = expeditionPhase !== 'idle';

  useEffect(() => {
    const host = mapHostRef.current;
    if (!host) return;
    let map: maplibregl.Map | null = null;
    let loadTimer: number | null = null;
    let loaded = false;
    let cancelled = false;

    setMapReady(false);
    setMapStatus('loading');
    setMapError(null);
    try {
      map = new maplibregl.Map({
        container: host,
        style: resolveMapStyle('explore'),
        center: [0, 18],
        zoom: 1.35,
        minZoom: 0.5,
        maxZoom: 14,
        maxPitch: 70,
        attributionControl: { compact: true },
      });
    } catch (error) {
      setMapStatus('error');
      setMapError(error instanceof Error ? error.message : 'Map failed to start');
      return;
    }
    mapRef.current = map;

    const markReady = () => {
      if (!map || cancelled) return;
      loaded = true;
      if (loadTimer !== null) window.clearTimeout(loadTimer);
      applyMapProjection(map, 'explore');
      map.resize();
      map.triggerRepaint();
      setMapReady(true);
      setMapStatus('ready');
    };
    const onStyleLoad = () => {
      if (map) applyMapProjection(map, 'explore');
    };
    const onError = (event: { error?: Error }) => {
      if (loaded || cancelled) return;
      setMapStatus('error');
      setMapError(event.error?.message ?? 'Map style failed to load');
    };
    const onContextLost = (event: { originalEvent?: Event }) => {
      event.originalEvent?.preventDefault?.();
      setMapReady(false);
      setMapStatus('error');
      setMapError('Map graphics context lost');
    };
    const onContextRestored = () => {
      if (!map) return;
      map.resize();
      map.triggerRepaint();
      setMapReady(true);
      setMapStatus('ready');
    };
    map.on('style.load', onStyleLoad);
    map.on('load', markReady);
    map.on('error', onError);
    map.on('webglcontextlost', onContextLost);
    map.on('webglcontextrestored', onContextRestored);
    loadTimer = window.setTimeout(() => {
      if (!loaded && !cancelled) {
        setMapStatus('error');
        setMapError('Map took too long to load');
      }
    }, MAP_LOAD_TIMEOUT_MS);

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          map?.resize();
          map?.triggerRepaint();
        })
      : null;
    observer?.observe(host);

    return () => {
      cancelled = true;
      if (loadTimer !== null) window.clearTimeout(loadTimer);
      observer?.disconnect();
      selectionAbortRef.current?.abort();
      pointMarkersRef.current.forEach(marker => marker.remove());
      waypointMarkersRef.current.forEach(marker => marker.remove());
      pointMarkersRef.current = [];
      waypointMarkersRef.current = [];
      try { map?.remove(); } catch { /* already removed */ }
      if (mapRef.current === map) mapRef.current = null;
    };
  }, [mapGeneration]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const toggle = active ? 'enable' : 'disable';
    if (!active) map.stop();
    for (const handler of [
      map.boxZoom,
      map.scrollZoom,
      map.dragPan,
      map.keyboard,
      map.doubleClickZoom,
      map.touchZoomRotate,
    ]) handler[toggle]();
    if (active) {
      const frame = window.requestAnimationFrame(() => {
        map.resize();
        map.triggerRepaint();
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [active, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const host = mapHostRef.current;
    if (!map || !host || !mapReady) return;
    const refresh = () => {
      if (!active) return;
      map.resize();
      map.triggerRepaint();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    const observer = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(entries => {
          if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio > 0)) refresh();
        }, { threshold: 0.01 })
      : null;
    observer?.observe(host);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
    };
  }, [active, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const controller = new AbortController();
    (async () => {
      try {
        const config = await getAppConfig().catch(() => ({ cogUrl: COG_URL, titilerBaseUrl: TITILER_BASE_URL }));
        const tileJsonUrl = `${config.titilerBaseUrl}/cog/WebMercatorQuad/tilejson.json?url=${encodeURIComponent(config.cogUrl)}&colormap_name=habitat_custom&nodata=0`;
        const response = await fetch(tileJsonUrl, { signal: controller.signal });
        if (!response.ok) throw new Error(`TileJSON failed (${response.status})`);
        const tileJson = await response.json() as {
          tiles?: string[];
          bounds?: [number, number, number, number];
          minzoom?: number;
          maxzoom?: number;
          attribution?: string;
        };
        if (!tileJson.tiles?.length || map.getSource('habitat-raster-source')) return;
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
          id: 'habitat-raster', type: 'raster', source: 'habitat-raster-source',
          paint: { 'raster-opacity': 0.7 },
        });
        restoreCustomLayerOrder(map);
      } catch (error) {
        if ((error as { name?: string }).name !== 'AbortError') {
          console.warn('[MapLibreExploreMap] Habitat raster unavailable:', error);
        }
      }
    })();
    return () => controller.abort();
  }, [mapGeneration, mapReady]);

  const loadAreaDetails = useCallback(async (longitude: number, latitude: number) => {
    const map = mapRef.current;
    if (!map || !mapReady || isLoading) return;
    const requestId = ++selectionRequestRef.current;
    selectionAbortRef.current?.abort();
    const controller = new AbortController();
    selectionAbortRef.current = controller;
    const atPointParams = new URLSearchParams({ lon: String(longitude), lat: String(latitude), size: '500' });

    removeSelectionHighlights(map);
    if (habitatTimerRef.current !== null) window.clearTimeout(habitatTimerRef.current);
    setEcoregionProgress(null);
    setPendingSelection(null);
    setInfoBoxData({ habitats: [], species: [], message: `Querying ${longitude.toFixed(4)}, ${latitude.toFixed(4)}` });
    setIsLoading(true);

    try {
      const [speciesResult, rasterHabitats, atPointData, waypointData, progress] = await Promise.all([
        speciesService.getSpeciesInRadius(longitude, latitude, SPECIES_RADIUS_METERS),
        speciesService.getRasterHabitatDistribution(longitude, latitude),
        fetch(`/api/protected-areas/at-point?${atPointParams}`, { signal: controller.signal })
          .then(response => response.ok ? response.json() as Promise<AtPointData> : null)
          .catch(() => null),
        fetchWaypointData(longitude, latitude),
        fetchEcoregionProgress(longitude, latitude, controller.signal),
      ]);
      if (requestId !== selectionRequestRef.current) return;
      setRegionWaypointData(waypointData);
      setEcoregionProgress(progress);

      const species = speciesResult.species;
      const habitatList = habitatsForSpecies(species);
      if (species.length > 0) {
        const features = species.flatMap(item => item.wkb_geometry ? [{
          type: 'Feature' as const,
          properties: { species_id: item.id, common_name: item.common_name, scientific_name: item.scientific_name },
          geometry: item.wkb_geometry as GeoJSON.Geometry,
        }] : []);
        if (features.length > 0) {
          setGeoJSONSource(map, 'species-highlight', { type: 'FeatureCollection', features });
          map.addLayer({
            id: 'species-highlight-fill', type: 'fill', source: 'species-highlight',
            paint: { 'fill-color': '#22d3ee', 'fill-opacity': 0.22 },
          });
          map.addLayer({
            id: 'species-highlight-line', type: 'line', source: 'species-highlight',
            paint: { 'line-color': '#22d3ee', 'line-width': 2 },
          });
          restoreCustomLayerOrder(map);
        }
      } else {
        const closestHabitat = await speciesService.getClosestHabitat(longitude, latitude);
        if (requestId !== selectionRequestRef.current) return;
        if (closestHabitat) {
          setGeoJSONSource(map, 'habitat-highlight', {
            type: 'FeatureCollection',
            features: [{ type: 'Feature', properties: {}, geometry: closestHabitat as GeoJSON.Geometry }],
          });
          map.addLayer({
            id: 'habitat-highlight-fill', type: 'fill', source: 'habitat-highlight',
            paint: { 'fill-color': '#22d3ee', 'fill-opacity': 0.7 },
          });
          map.addLayer({
            id: 'habitat-highlight-line', type: 'line', source: 'habitat-highlight',
            paint: { 'line-color': '#22d3ee', 'line-width': 3 },
          });
          restoreCustomLayerOrder(map);
          habitatTimerRef.current = window.setTimeout(() => {
            const currentMap = mapRef.current;
            if (currentMap) removeMapLayersAndSource(currentMap, 'habitat-highlight', ['habitat-highlight-fill', 'habitat-highlight-line']);
          }, 3_000);
        }
      }

      const availableAffinities = deriveAvailableAffinities(species);
      setPendingSelection({
        lon: longitude,
        lat: latitude,
        atPointData,
        waypointData,
        species,
        rasterHabitats,
        habitats: habitatList,
        activeAffinities: getDefaultActiveAffinities(availableAffinities),
        availableAffinities,
        ecoregionId: progress?.ecoregion?.ecoregion_id ?? null,
      });
      setInfoBoxData({
        habitats: habitatList,
        species,
        topHabitat: rasterHabitats[0]
          ? `${rasterHabitats[0].habitat_type} (${rasterHabitats[0].percentage}%)`
          : undefined,
        bioregion: atPointData?.bioregion ?? undefined,
        message: null,
      });
    } catch (error) {
      if ((error as { name?: string }).name !== 'AbortError') {
        console.error('[MapLibreExploreMap] Area query failed:', error);
        setInfoBoxData({ habitats: [], species: [], message: 'Failed to load species data' });
      }
    } finally {
      if (requestId === selectionRequestRef.current) setIsLoading(false);
    }
  }, [isLoading, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const onClick = (event: maplibregl.MapMouseEvent) => {
      if (isLoading) return;
      if (expeditionBlocksMapClick) {
        setInfoBoxData({ habitats: [], species: [], message: 'Complete the current expedition first.' });
        return;
      }
      const picked = showEcoregionLayer ? pickEcoregionAtPoint(event.point) : null;
      if (picked) {
        setSelectedEcoregion({ ...picked, lon: event.lngLat.lng, lat: event.lngLat.lat });
        selectEcoregion(picked.id);
        setEcoregionProgress(null);
        setPendingSelection(null);
        setInfoBoxData({ habitats: [], species: [], message: null });
        return;
      }
      setSelectedEcoregion(null);
      selectEcoregion(null);
      void loadAreaDetails(event.lngLat.lng, event.lngLat.lat);
    };
    map.on('click', onClick);
    return () => { try { map.off('click', onClick); } catch { /* removed */ } };
  }, [expeditionBlocksMapClick, isLoading, loadAreaDetails, mapReady, pickEcoregionAtPoint, selectEcoregion, showEcoregionLayer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || expeditionPhase !== 'mystery' || !activeWaypoint) return;
    const center = map.getCenter();
    map.flyTo({
      center: [activeWaypoint.lon, activeWaypoint.lat],
      zoom: Math.min(10, Math.max(5, map.getZoom() + globeZoomAdjustment(center.lat, activeWaypoint.lat))),
      bearing: 20,
      pitch: 48,
      duration: 800,
      essential: true,
    });
  }, [activeWaypoint, expeditionPhase, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const points: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: (ecoregionProgress?.foundPoints ?? []).map(point => ({
        type: 'Feature',
        properties: { id: point.discovery_id },
        geometry: { type: 'Point', coordinates: [point.lon, point.lat] },
      })),
    };
    setGeoJSONSource(map, 'discovered-species', points, { generateId: true });
    if (!map.getLayer('discovered-species-points')) {
      map.addLayer({
        id: 'discovered-species-points', type: 'circle', source: 'discovered-species',
        paint: {
          'circle-radius': 9,
          'circle-color': 'rgba(34,211,238,.32)',
          'circle-stroke-color': '#22d3ee',
          'circle-stroke-width': 2,
        },
      });
    }
    pointMarkersRef.current.forEach(marker => marker.remove());
    pointMarkersRef.current = (ecoregionProgress?.foundPoints ?? []).map(point => {
      const element = document.createElement('span');
      element.className = 'explore-map-animal-marker';
      element.textContent = ANIMAL_MARKER[point.animal_icon] ?? ANIMAL_MARKER.species;
      element.setAttribute('aria-label', point.common_name || point.scientific_name || 'Discovered species');
      return new maplibregl.Marker({ element, anchor: 'bottom', opacityWhenCovered: '0' })
        .setLngLat([point.lon, point.lat])
        .addTo(map);
    });
    restoreCustomLayerOrder(map);
  }, [ecoregionProgress, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const waypoints = expeditionBlocksMapClick ? [] : regionWaypointData?.waypoints ?? [];
    const data: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: waypoints.map(waypoint => ({
        type: 'Feature',
        properties: { color: WAYPOINT_TYPE_COLORS[waypoint.waypointType] ?? '#38bdf8' },
        geometry: { type: 'Point', coordinates: [waypoint.lon, waypoint.lat] },
      })),
    };
    setGeoJSONSource(map, 'region-waypoints-source', data);
    if (!map.getLayer('region-waypoints')) {
      map.addLayer({
        id: 'region-waypoints', type: 'circle', source: 'region-waypoints-source',
        paint: {
          'circle-radius': 9,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.88,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      });
    }
    waypointMarkersRef.current.forEach(marker => marker.remove());
    waypointMarkersRef.current = waypoints.map(waypoint => {
      const typeLabel = getWaypointTypeLabel(waypoint.waypointType) ?? 'Site';
      const name = waypoint.name.length > 26 ? `${waypoint.name.slice(0, 25)}…` : waypoint.name;
      const element = document.createElement('span');
      element.className = 'explore-map-waypoint-label';
      element.textContent = `${typeLabel}: ${name}`;
      return new maplibregl.Marker({ element, anchor: 'left', offset: [10, -12], opacityWhenCovered: '0' })
        .setLngLat([waypoint.lon, waypoint.lat])
        .addTo(map);
    });
    restoreCustomLayerOrder(map);
  }, [expeditionBlocksMapClick, mapReady, regionWaypointData]);

  useEffect(() => {
    if (showEcoregionLayer) return;
    setSelectedEcoregion(null);
    selectEcoregion(null);
  }, [selectEcoregion, showEcoregionLayer]);

  const exploreSelectedArea = useCallback(() => {
    if (selectedEcoregion?.lon == null || selectedEcoregion.lat == null) return;
    void loadAreaDetails(selectedEcoregion.lon, selectedEcoregion.lat);
  }, [loadAreaDetails, selectedEcoregion]);

  const startPendingSelection = useCallback(() => {
    if (!pendingSelection) return;
    if (!emitExpeditionReady(pendingSelection)) {
      toast.error('No expedition data here — try another spot');
      setPendingSelection(null);
    }
  }, [pendingSelection]);

  const recenterGlobe = useCallback(() => {
    mapRef.current?.flyTo({ center: [0, 18], zoom: 1.35, bearing: 0, pitch: 0, duration: 800, essential: true });
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(error => {
        console.error('[MapLibreExploreMap] Fullscreen failed:', error);
      });
      return;
    }
    void document.exitFullscreen();
  }, []);

  const retryMap = useCallback(() => setMapGeneration(value => value + 1), []);

  return (
    <div className="relative h-full w-full bg-[#071923]">
      <div ref={mapHostRef} className="explore-map-canvas absolute inset-0" aria-label="Interactive biodiversity globe" />
      {mapStatus !== 'ready' && (
        <div className="absolute inset-0 z-[1] grid place-items-center bg-[#071923] px-6 text-center text-ds-text-primary">
          {mapStatus === 'error' ? (
            <div className="glass-bg flex max-w-xs flex-col items-center gap-3 rounded-2xl border border-ds-subtle p-5 shadow-card">
              <p className="m-0 text-sm font-semibold">Globe unavailable</p>
              <p className="m-0 text-xs text-ds-text-secondary">{mapError}</p>
              <button type="button" onClick={retryMap} className="rounded-full border border-ds-cyan/60 px-4 py-2 text-sm font-semibold text-ds-cyan">
                Retry map
              </button>
            </div>
          ) : (
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-ds-cyan/70">Charting biodiversity…</p>
          )}
        </div>
      )}
      <ExploreMapOverlay
        info={infoBoxData}
        isLoading={isLoading}
        isPreviewLoading={isPreviewLoading}
        preview={contextEcoregion}
        progress={ecoregionProgress}
        hasSelection={Boolean(pendingSelection)}
        hasSelectedEcoregion={Boolean(selectedEcoregion)}
        layersActive={showEcoregionLayer}
        inRun={expeditionPhase !== 'idle'}
        onSearchOpen={onSearchOpen}
        onExplore={exploreSelectedArea}
        onStart={startPendingSelection}
        onCompass={recenterGlobe}
        onLayers={() => setShowEcoregionLayer(value => !value)}
        onFullscreen={toggleFullscreen}
      />
    </div>
  );
}

function ExploreMapOverlay({
  info,
  isLoading,
  isPreviewLoading,
  preview,
  progress,
  hasSelection,
  hasSelectedEcoregion,
  layersActive,
  inRun,
  onSearchOpen,
  onExplore,
  onStart,
  onCompass,
  onLayers,
  onFullscreen,
}: {
  info: {
    species: Species[];
    topHabitat?: string;
    message?: string | null;
    bioregion?: { bioregion?: string | null; biome?: string | null };
  };
  isLoading: boolean;
  isPreviewLoading: boolean;
  preview: EcoregionPreviewPick | null;
  progress: EcoregionProgress | null;
  hasSelection: boolean;
  hasSelectedEcoregion: boolean;
  layersActive: boolean;
  inRun: boolean;
  onSearchOpen?: () => void;
  onExplore: () => void;
  onStart: () => void;
  onCompass: () => void;
  onLayers: () => void;
  onFullscreen: () => void;
}) {
  const ecoregion = progress?.ecoregion ?? null;
  const title = ecoregion?.bioregion
    ?? preview?.properties.ECO_NAME
    ?? info.bioregion?.bioregion
    ?? info.topHabitat?.replace(/\s+\([^)]*\)$/, '')
    ?? 'Explore Ecoregions';
  const previewSubtitle = preview
    ? [preview.properties.BIOME_NAME, preview.properties.REALM].filter(Boolean).join(' · ')
    : null;
  const subtitle = ecoregion?.biome ?? previewSubtitle ?? info.bioregion?.biome ?? 'Global biodiversity map';
  const speciesCount = hasSelection ? info.species.length : ecoregion?.total_species;
  const groups = progress?.groups ?? [];
  const progressLabel = groups.length > 0
    ? groups.slice(0, 2).map(group => `${group.animal_type} ${group.found_species}/${group.total_species}`).join(' · ')
    : speciesCount != null && speciesCount > 0 ? `${speciesCount} species` : preview?.properties.NNH_NAME ?? 'Collection target pending';
  const showCard = !inRun && Boolean(hasSelectedEcoregion || hasSelection || isLoading || info.message);
  const canExplore = Boolean(preview?.lon != null && preview?.lat != null && !hasSelection && !isLoading);
  const canStart = hasSelection && !isLoading && (speciesCount ?? 0) > 0;
  const buttonLabel = isLoading
    ? 'Loading Area'
    : canExplore
      ? 'Explore Area'
      : canStart
        ? 'Start Expedition'
        : hasSelection && !isLoading
          ? 'No Species Here'
          : 'Select Ecoregion';
  const actionDisabled = isLoading || (!canExplore && !canStart);
  const runAction = canStart ? onStart : onExplore;

  if (inRun) return <div className="pointer-events-none absolute inset-0" style={{ zIndex: 2500 }} />;

  return (
    <div className="pointer-events-none absolute inset-0 text-ds-text-primary" style={{ zIndex: 2500 }}>
      <div className="absolute left-5 right-5 pointer-events-auto" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 18px)' }}>
        <button
          type="button"
          onClick={onSearchOpen}
          className="glass-bg h-14 w-full rounded-[28px] border border-ds-subtle shadow-card flex items-center gap-3 px-5 text-left text-ds-text-muted"
          aria-label="Search species, locations, biomes"
        >
          <Search className="size-6 shrink-0 text-ds-text-secondary" strokeWidth={2} />
          <span className="truncate text-[15px] sm:text-base">Search species, locations, biomes</span>
        </button>
        <GlobeContextBar preview={preview} />
      </div>

      <div
        className="absolute right-4 flex flex-col gap-3 pointer-events-auto"
        style={{ bottom: showCard ? 'calc(env(safe-area-inset-bottom, 0px) + 282px)' : 'calc(env(safe-area-inset-bottom, 0px) + 114px)' }}
      >
        <MapControlButton label="Recenter map" onClick={onCompass}><Compass /></MapControlButton>
        <MapControlButton label="Toggle ecoregion layers" active={layersActive} onClick={onLayers}><Layers /></MapControlButton>
        <MapControlButton label="Toggle fullscreen" onClick={onFullscreen}><Maximize2 /></MapControlButton>
      </div>

      <div
        aria-hidden={!showCard}
        className={cn(
          'glass-bg shadow-card absolute left-4 right-4 rounded-[24px] border border-ds-subtle p-3 transition-[opacity,transform] duration-200 ease-out',
          showCard ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
        )}
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 104px)' }}
      >
        <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-white/25" />
        <div className="grid grid-cols-[86px_minmax(0,1fr)] gap-3">
          <div className="h-[86px] rounded-[18px] border border-ds-subtle overflow-hidden bg-ds-bg">
            <div className="h-full w-full bg-[radial-gradient(circle_at_35%_18%,rgba(34,211,238,0.32),transparent_28%),linear-gradient(150deg,rgba(20,184,166,0.45),rgba(12,28,42,0.15)_42%,rgba(3,7,18,0.95)_72%),linear-gradient(32deg,transparent_43%,rgba(226,232,240,0.16)_44%,transparent_47%)]" />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <h2 className="truncate text-[20px] leading-tight font-semibold text-ds-text-primary">
              {isLoading ? 'Loading ecoregion' : isPreviewLoading && !preview ? 'Loading ecoregions' : title}
            </h2>
            <p className="mt-1 line-clamp-1 text-[12px] leading-snug text-ds-text-secondary">{subtitle}</p>
            <div className="mt-1.5 flex items-center gap-2 text-[13px] text-ds-text-secondary">
              <span className="font-semibold text-ds-cyan">{progressLabel}</span>
              {groups.length > 0 && <><span className="text-ds-text-muted">·</span><span>{speciesCount ?? 0} species</span></>}
            </div>
            <button
              type="button"
              onClick={runAction}
              disabled={actionDisabled || !showCard}
              tabIndex={showCard ? 0 : -1}
              className="mt-2.5 h-11 w-full rounded-full border-0 px-4 text-[15px] font-bold text-[#06101a] shadow-glow-cyan disabled:cursor-default disabled:text-ds-text-secondary disabled:shadow-none"
              style={{ background: canStart || canExplore ? 'var(--ds-gradient-cta)' : 'rgba(34,211,238,0.2)' }}
            >
              {buttonLabel}
            </button>
          </div>
        </div>
        {info.message && !isLoading && <div className="mt-2 truncate text-center text-[11px] text-ds-text-muted">{info.message}</div>}
      </div>
    </div>
  );
}

function GlobeContextBar({ preview }: { preview: EcoregionPreviewPick | null }) {
  const subtitle = preview ? [preview.properties.BIOME_NAME, preview.properties.REALM].filter(Boolean).join(' · ') : '';
  return (
    <div
      aria-hidden={!preview}
      className={cn(
        'glass-bg mt-3 rounded-lg border border-ds-subtle px-4 py-3 shadow-card transition-[opacity,transform] duration-200 ease-out',
        preview ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0',
      )}
    >
      <div className="truncate text-sm font-semibold text-ds-text-primary">{preview?.properties.ECO_NAME ?? 'Ecoregion'}</div>
      <div className="mt-0.5 truncate text-xs text-ds-text-secondary">{subtitle}</div>
    </div>
  );
}

function MapControlButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactElement<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`glass-bg shadow-card grid size-11 place-items-center rounded-full border transition-colors ${
        active ? 'border-ds-cyan/80 bg-ds-cyan/15' : 'border-ds-subtle'
      }`}
    >
      {React.cloneElement(children, {
        className: 'size-5 text-ds-cyan drop-shadow-[0_0_8px_rgba(34,211,238,0.75)]',
        strokeWidth: 2,
      })}
    </button>
  );
}
