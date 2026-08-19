import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type maplibregl from 'maplibre-gl';
import type { EcoregionPreviewPick, EcoregionPreviewResponse } from '@/types/ecoregions';
import { mapFeatureToEcoregion } from '@/lib/maplibreGeoJSON';
import { restoreCustomLayerOrder } from '@/lib/maplibreStyle';

const ALL_ECOREGIONS_URL = '/ecoregions.json';
const HOVER_THROTTLE_MS = 80;

function isCoarsePointer() {
  return typeof window !== 'undefined'
    && (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768);
}

export function useMapLibreEcoregions(
  mapRef: MutableRefObject<maplibregl.Map | null>,
  ready: boolean,
  enabled: boolean,
  generation: number,
) {
  const [focusedEcoregion, setFocusedEcoregion] = useState<EcoregionPreviewPick | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const hoveredIdRef = useRef<string | number | null>(null);
  const selectedIdRef = useRef<string | number | null>(null);
  const enabledRef = useRef(enabled);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const setState = useCallback((kind: 'hover' | 'selected', id: string | number | null) => {
    const map = mapRef.current;
    if (!map?.getSource('ecoregions')) return;
    const stateRef = kind === 'hover' ? hoveredIdRef : selectedIdRef;
    if (stateRef.current !== null) {
      try { map.setFeatureState({ source: 'ecoregions', id: stateRef.current }, { [kind]: false }); } catch { /* source replaced */ }
    }
    stateRef.current = id;
    if (id !== null) {
      try { map.setFeatureState({ source: 'ecoregions', id }, { [kind]: true }); } catch { /* source replaced */ }
    }
  }, [mapRef]);

  const selectEcoregion = useCallback((id: string | number | null) => {
    setState('selected', id);
  }, [setState]);

  const pickEcoregionAtPoint = useCallback((point: maplibregl.PointLike): EcoregionPreviewPick | null => {
    const map = mapRef.current;
    if (!map || !enabled || !map.getLayer('ecoregion-fill')) return null;
    const feature = map.queryRenderedFeatures(point, { layers: ['ecoregion-fill'] })[0];
    return feature ? mapFeatureToEcoregion(feature) : null;
  }, [enabled, mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const id of ['ecoregion-fill', 'ecoregion-line', 'ecoregion-label']) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', enabled ? 'visible' : 'none');
    }
    if (!enabled) {
      setFocusedEcoregion(null);
      setState('hover', null);
      setState('selected', null);
    }
  }, [enabled, generation, mapRef, ready, setState]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const controller = new AbortController();
    let cancelled = false;
    let lastHover = 0;

    const pickAtCenter = () => {
      if (!isCoarsePointer() || !enabledRef.current) return;
      const canvas = map.getCanvas();
      const feature = map.queryRenderedFeatures(
        [canvas.clientWidth / 2, canvas.clientHeight / 2],
        { layers: ['ecoregion-fill'] },
      )[0];
      setFocusedEcoregion(feature ? mapFeatureToEcoregion(feature) : null);
    };
    const onMouseMove = (event: maplibregl.MapLayerMouseEvent) => {
      if (isCoarsePointer() || !enabledRef.current) return;
      const now = Date.now();
      if (now - lastHover < HOVER_THROTTLE_MS) return;
      lastHover = now;
      const feature = event.features?.[0];
      const pick = feature ? mapFeatureToEcoregion(feature) : null;
      setState('hover', pick?.id ?? null);
      setFocusedEcoregion(pick);
    };
    const onMouseLeave = () => {
      setState('hover', null);
      if (!isCoarsePointer()) setFocusedEcoregion(null);
    };

    (async () => {
      setIsPreviewLoading(true);
      try {
        // Source/layers survive WebGL context loss; only fetch/add on first run.
        if (!map.getSource('ecoregions')) {
          const response = await fetch(ALL_ECOREGIONS_URL, { signal: controller.signal });
          if (!response.ok) throw new Error(`Ecoregions failed (${response.status})`);
          const data = await response.json() as EcoregionPreviewResponse;
          if (cancelled) return;
          const collection: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: data.features.flatMap(feature => feature.geometry ? [{
              type: 'Feature' as const,
              id: feature.id,
              properties: feature.properties,
              geometry: feature.geometry as GeoJSON.Geometry,
            }] : []),
          };
          map.addSource('ecoregions', {
            type: 'geojson',
            data: collection,
            generateId: true,
            attribution: 'One Earth ecoregions',
          });
          map.addLayer({
            id: 'ecoregion-fill', type: 'fill', source: 'ecoregions',
            paint: {
              'fill-color': ['coalesce', ['get', 'COLOR'], '#70A800'],
              'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'selected'], false], 0.86,
                ['boolean', ['feature-state', 'hover'], false], 0.8,
                0.68,
              ],
            },
            layout: { visibility: enabledRef.current ? 'visible' : 'none' },
          });
          map.addLayer({
            id: 'ecoregion-line', type: 'line', source: 'ecoregions',
            paint: {
              'line-color': ['coalesce', ['get', 'COLOR_BIO'], ['get', 'COLOR'], '#38A700'],
              'line-opacity': 0.95,
              'line-width': [
                'case',
                ['boolean', ['feature-state', 'selected'], false], 2.4,
                ['boolean', ['feature-state', 'hover'], false], 1.8,
                0.8,
              ],
            },
            layout: { visibility: enabledRef.current ? 'visible' : 'none' },
          });
          map.addLayer({
            id: 'ecoregion-label', type: 'symbol', source: 'ecoregions',
            minzoom: 2.5,
            layout: {
              visibility: enabledRef.current ? 'visible' : 'none',
              'text-field': ['get', 'ECO_NAME'],
              'text-font': ['Open Sans Regular'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 2.5, 9, 7, 13],
              'text-max-width': 12,
              'text-variable-anchor': ['center', 'top', 'bottom'],
              'text-radial-offset': 0.35,
              'text-justify': 'auto',
            },
            paint: {
              'text-color': '#ecfeff',
              'text-halo-color': 'rgba(3, 12, 20, 0.92)',
              'text-halo-width': 1.5,
              'text-halo-blur': 0.5,
            },
          });
          restoreCustomLayerOrder(map);
        }
        map.on('mousemove', 'ecoregion-fill', onMouseMove);
        map.on('mouseleave', 'ecoregion-fill', onMouseLeave);
        map.on('moveend', pickAtCenter);
        pickAtCenter();
      } catch (error) {
        if ((error as { name?: string }).name !== 'AbortError') {
          console.warn('[MapLibreExploreMap] Failed to load ecoregions:', error);
        }
      } finally {
        if (!cancelled) setIsPreviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      try {
        map.off('mousemove', 'ecoregion-fill', onMouseMove);
        map.off('mouseleave', 'ecoregion-fill', onMouseLeave);
        map.off('moveend', pickAtCenter);
      } catch { /* map removed */ }
      hoveredIdRef.current = null;
      selectedIdRef.current = null;
    };
  }, [generation, mapRef, ready, setState]);

  return { focusedEcoregion, isPreviewLoading, pickEcoregionAtPoint, selectEcoregion };
}
