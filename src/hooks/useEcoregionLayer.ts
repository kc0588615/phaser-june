import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import {
  Cartesian2,
  Color as CesiumColor,
  ColorMaterialProperty,
  ConstantProperty,
  GeoJsonDataSource,
  HeightReference,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
} from 'cesium';
import type { EcoregionPreviewPick, EcoregionPreviewProperties, EcoregionPreviewResponse } from '@/types/ecoregions';

const SOURCE_NAME = 'ecoregion-preview';
const HOVER_THROTTLE_MS = 80;
const ALL_ECOREGIONS_URL = '/api/ecoregions/preview?west=-180&south=-90&east=180&north=90';

function propertyValue(entity: any, key: keyof EcoregionPreviewProperties) {
  return entity?.properties?.[key]?.getValue?.() ?? entity?.properties?.[key] ?? null;
}

function pickToEcoregion(viewer: any, position: Cartesian2): EcoregionPreviewPick | null {
  const picked = viewer.scene.pick(position);
  const entity = picked?.id;
  if (!entity?.properties || entity.name !== SOURCE_NAME) return null;

  const ecoName = propertyValue(entity, 'ECO_NAME');
  if (typeof ecoName !== 'string' || !ecoName) return null;

  return {
    id: entity.id ?? null,
    properties: {
      ECO_NAME: ecoName,
      BIOME_NAME: String(propertyValue(entity, 'BIOME_NAME') ?? ''),
      REALM: String(propertyValue(entity, 'REALM') ?? ''),
      COLOR: String(propertyValue(entity, 'COLOR') ?? '#70A800'),
      COLOR_BIO: String(propertyValue(entity, 'COLOR_BIO') ?? '#38A700'),
      NNH: Number.isFinite(Number(propertyValue(entity, 'NNH'))) ? Number(propertyValue(entity, 'NNH')) : null,
      NNH_NAME: typeof propertyValue(entity, 'NNH_NAME') === 'string' ? propertyValue(entity, 'NNH_NAME') : null,
    },
  };
}

function isMobilePointer() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
}

export function useEcoregionLayer(viewerRef: MutableRefObject<any>, enabled = true) {
  const [focusedEcoregion, setFocusedEcoregion] = useState<EcoregionPreviewPick | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const dataSourceRef = useRef<GeoJsonDataSource | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const removeDataSource = useCallback((viewer: any) => {
    if (!dataSourceRef.current) return;
    try {
      viewer.dataSources.remove(dataSourceRef.current, true);
    } catch {
      /* ok */
    }
    dataSourceRef.current = null;
  }, []);

  const pickEcoregionAtPosition = useCallback((position: Cartesian2): EcoregionPreviewPick | null => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || !enabled) return null;
    return pickToEcoregion(viewer, position);
  }, [enabled, viewerRef]);

  useEffect(() => {
    let cleanup: (() => void) | null = null;
    let cancelled = false;

    const setup = (viewer: any) => {
      const pickCenter = () => {
        if (!isMobilePointer()) return;
        const canvas = viewer.scene.canvas;
        const center = new Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
        setFocusedEcoregion(pickToEcoregion(viewer, center));
      };

      const loadPreview = async () => {
        if (!enabled) {
          abortRef.current?.abort();
          removeDataSource(viewer);
          setFocusedEcoregion(null);
          return;
        }

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setIsPreviewLoading(true);

        try {
          const response = await fetch(ALL_ECOREGIONS_URL, { signal: controller.signal });
          if (!response.ok) return;
          const data = await response.json() as EcoregionPreviewResponse;
          if (cancelled) return;

          const nextSource = new GeoJsonDataSource(SOURCE_NAME);
          await nextSource.load({ type: 'FeatureCollection', features: data.features }, { clampToGround: true });
          if (cancelled) return;

          nextSource.entities.values.forEach((entity) => {
            entity.name = SOURCE_NAME;
            if (!entity.polygon) return;
            const color = String(propertyValue(entity, 'COLOR') ?? '#70A800');
            const outlineColor = String(propertyValue(entity, 'COLOR_BIO') ?? color);
            entity.polygon.material = new ColorMaterialProperty(CesiumColor.fromCssColorString(color).withAlpha(0.72));
            entity.polygon.outline = new ConstantProperty(true);
            entity.polygon.outlineColor = new ConstantProperty(CesiumColor.fromCssColorString(outlineColor).withAlpha(0.95));
            entity.polygon.outlineWidth = new ConstantProperty(1);
            entity.polygon.heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
            entity.polygon.zIndex = new ConstantProperty(10);
          });

          removeDataSource(viewer);
          viewer.dataSources.add(nextSource);
          dataSourceRef.current = nextSource;
          pickCenter();
        } catch (error) {
          if ((error as { name?: string }).name !== 'AbortError') {
            console.warn('[CesiumMap] Failed to load ecoregion preview:', error);
          }
        } finally {
          if (!cancelled) setIsPreviewLoading(false);
        }
      };

      const onMoveEnd = () => {
        pickCenter();
      };

      const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
      let lastHover = 0;
      handler.setInputAction((movement: { endPosition: Cartesian2 }) => {
        if (isMobilePointer()) return;
        const now = Date.now();
        if (now - lastHover < HOVER_THROTTLE_MS) return;
        lastHover = now;
        setFocusedEcoregion(pickToEcoregion(viewer, movement.endPosition));
      }, ScreenSpaceEventType.MOUSE_MOVE);

      viewer.camera.moveEnd.addEventListener(onMoveEnd);
      loadPreview();

      return () => {
        viewer.camera.moveEnd.removeEventListener(onMoveEnd);
        handler.destroy();
        abortRef.current?.abort();
        removeDataSource(viewer);
      };
    };

    const timer = window.setInterval(() => {
      const viewer = viewerRef.current?.cesiumElement;
      if (!viewer || cleanup) return;
      cleanup = setup(viewer);
      window.clearInterval(timer);
    }, 100);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      cleanup?.();
    };
  }, [enabled, removeDataSource, viewerRef]);

  return { focusedEcoregion, isPreviewLoading, pickEcoregionAtPosition };
}
