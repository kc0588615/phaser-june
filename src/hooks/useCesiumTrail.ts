import { useRef, useEffect, useCallback, type MutableRefObject } from 'react';
import {
  Cartesian3,
  Color as CesiumColor,
  ConstantProperty,
  CallbackProperty,
  PolylineDashMaterialProperty,
  HeightReference,
  GeoJsonDataSource,
  Entity as CesiumEntity,
  ColorMaterialProperty,
} from 'cesium';
import { EventBus } from '@/game/EventBus';
import type { EventPayloads } from '@/game/EventBus';

/** Manages expedition trail polyline + node markers on the Cesium globe. */
export function useCesiumTrail(viewerRef: MutableRefObject<any>) {
  const trailEntitiesRef = useRef<CesiumEntity[]>([]);
  const trailPositionsRef = useRef<{ lon: number; lat: number }[]>([]);
  const trailCompletedIndexRef = useRef<number>(0);
  const spatialLayersRef = useRef<GeoJsonDataSource[]>([]);
  const runPhaseRef: MutableRefObject<string> = useRef('idle');

  const computeTrailPositions = useCallback((lon: number, lat: number, count: number) => {
    const step = 0.003;
    return Array.from({ length: count }, (_, i) => ({
      lon: lon + i * step * 0.7,
      lat: lat + i * step * 0.7,
    }));
  }, []);

  const removeTrailEntities = useCallback(() => {
    if (!viewerRef.current?.cesiumElement) return;
    const viewer = viewerRef.current.cesiumElement;
    for (const ent of trailEntitiesRef.current) {
      try { viewer.entities.remove(ent); } catch { /* ok */ }
    }
    trailEntitiesRef.current = [];
    trailPositionsRef.current = [];
    trailCompletedIndexRef.current = 0;
  }, [viewerRef]);

  const loadSpatialLayers = useCallback(async (lon: number, lat: number) => {
    if (!viewerRef.current?.cesiumElement) return;
    const viewer = viewerRef.current.cesiumElement;

    for (const ds of spatialLayersRef.current) {
      try { viewer.dataSources.remove(ds, true); } catch { /* ok */ }
    }
    spatialLayersRef.current = [];

    try {
      const resp = await fetch(`/api/layers/near-point?lon=${lon}&lat=${lat}`);
      if (!resp.ok) return;
      const data = await resp.json();

      if (data.rivers?.features?.length > 0) {
        const riverDs = new GeoJsonDataSource('spatial-rivers');
        await riverDs.load(data.rivers);
        riverDs.entities.values.forEach((e) => {
          if (e.polyline) {
            e.polyline.material = new ColorMaterialProperty(CesiumColor.fromCssColorString('#3b82f6').withAlpha(0.8));
            e.polyline.width = new ConstantProperty(2);
          }
        });
        viewer.dataSources.add(riverDs);
        spatialLayersRef.current.push(riverDs);
      }

      if (data.protected_areas?.features?.length > 0) {
        const paDs = new GeoJsonDataSource('spatial-pa');
        await paDs.load(data.protected_areas);
        paDs.entities.values.forEach((e) => {
          if (e.polygon) {
            e.polygon.material = new ColorMaterialProperty(CesiumColor.fromCssColorString('#22c55e').withAlpha(0.25));
            e.polygon.outline = new ConstantProperty(true);
            e.polygon.outlineColor = new ConstantProperty(CesiumColor.fromCssColorString('#22c55e'));
            e.polygon.outlineWidth = new ConstantProperty(1);
          }
        });
        viewer.dataSources.add(paDs);
        spatialLayersRef.current.push(paDs);
      }

      if (data.wetlands?.features?.length > 0) {
        const wetDs = new GeoJsonDataSource('spatial-wetlands');
        await wetDs.load(data.wetlands);
        wetDs.entities.values.forEach((e) => {
          if (e.polygon) {
            e.polygon.material = new ColorMaterialProperty(CesiumColor.fromCssColorString('#14b8a6').withAlpha(0.25));
            e.polygon.outline = new ConstantProperty(true);
            e.polygon.outlineColor = new ConstantProperty(CesiumColor.fromCssColorString('#14b8a6'));
            e.polygon.outlineWidth = new ConstantProperty(1);
          }
        });
        viewer.dataSources.add(wetDs);
        spatialLayersRef.current.push(wetDs);
      }

      if (data.lakes?.features?.length > 0) {
        const lakeDs = new GeoJsonDataSource('spatial-lakes');
        await lakeDs.load(data.lakes);
        lakeDs.entities.values.forEach((e) => {
          if (e.polygon) {
            e.polygon.material = new ColorMaterialProperty(CesiumColor.fromCssColorString('#3b82f6').withAlpha(0.3));
            e.polygon.outline = new ConstantProperty(true);
            e.polygon.outlineColor = new ConstantProperty(CesiumColor.fromCssColorString('#3b82f6'));
            e.polygon.outlineWidth = new ConstantProperty(1);
          }
        });
        viewer.dataSources.add(lakeDs);
        spatialLayersRef.current.push(lakeDs);
      }
    } catch (err) {
      console.warn('[CesiumMap] Failed to load spatial layers:', err);
    }
  }, [viewerRef]);

  useEffect(() => {
    const onExpeditionReady = (data: EventPayloads['expedition-data-ready']) => {
      runPhaseRef.current = 'briefing';
      const nodeCount = data.expedition.nodes.length;
      const positions = computeTrailPositions(data.lon, data.lat, nodeCount);
      trailPositionsRef.current = positions;
      trailCompletedIndexRef.current = 0;

      if (viewerRef.current?.cesiumElement && positions.length > 1) {
        const viewer = viewerRef.current.cesiumElement;
        removeTrailEntities();

        const polyline = viewer.entities.add({
          polyline: {
            positions: new CallbackProperty(() => {
              const idx = Math.min(trailCompletedIndexRef.current + 1, trailPositionsRef.current.length);
              return trailPositionsRef.current.slice(0, idx).map((p: { lon: number; lat: number }) =>
                Cartesian3.fromDegrees(p.lon, p.lat)
              );
            }, false) as any,
            material: new PolylineDashMaterialProperty({
              color: CesiumColor.CYAN.withAlpha(0.7),
              dashLength: 12,
            }),
            width: new ConstantProperty(3),
            clampToGround: new ConstantProperty(true),
          },
        });
        trailEntitiesRef.current.push(polyline);

        for (let i = 0; i < positions.length; i++) {
          const pt = viewer.entities.add({
            position: Cartesian3.fromDegrees(positions[i].lon, positions[i].lat),
            point: {
              pixelSize: new ConstantProperty(8),
              color: new ConstantProperty(CesiumColor.GRAY),
              outlineColor: new ConstantProperty(CesiumColor.WHITE),
              outlineWidth: new ConstantProperty(1),
              heightReference: new ConstantProperty(HeightReference.CLAMP_TO_GROUND),
            },
          });
          trailEntitiesRef.current.push(pt);
        }
        const firstPt = trailEntitiesRef.current[1];
        if (firstPt?.point) {
          firstPt.point.color = new ConstantProperty(CesiumColor.YELLOW);
          firstPt.point.pixelSize = new ConstantProperty(10);
        }
      }
    };

    const onExpeditionStart = () => { runPhaseRef.current = 'in-run'; };

    const onNodeComplete = (data: { nodeIndex: number }) => {
      const completedIdx = data.nodeIndex;
      trailCompletedIndexRef.current = completedIdx + 1;
      const markerIdx = completedIdx + 1;
      if (trailEntitiesRef.current[markerIdx]?.point) {
        trailEntitiesRef.current[markerIdx].point!.color = new ConstantProperty(CesiumColor.CYAN);
      }
      const nextMarkerIdx = markerIdx + 1;
      if (trailEntitiesRef.current[nextMarkerIdx]?.point) {
        trailEntitiesRef.current[nextMarkerIdx].point!.color = new ConstantProperty(CesiumColor.YELLOW);
        trailEntitiesRef.current[nextMarkerIdx].point!.pixelSize = new ConstantProperty(10);
      }
    };

    const onGameReset = () => {
      runPhaseRef.current = 'idle';
      removeTrailEntities();
      if (viewerRef.current?.cesiumElement) {
        const viewer = viewerRef.current.cesiumElement;
        for (const ds of spatialLayersRef.current) {
          try { viewer.dataSources.remove(ds, true); } catch { /* already removed */ }
        }
        spatialLayersRef.current = [];
      }
    };

    EventBus.on('expedition-data-ready', onExpeditionReady);
    EventBus.on('expedition-start', onExpeditionStart);
    EventBus.on('node-complete', onNodeComplete);
    EventBus.on('game-reset', onGameReset);
    return () => {
      EventBus.off('expedition-data-ready', onExpeditionReady);
      EventBus.off('expedition-start', onExpeditionStart);
      EventBus.off('node-complete', onNodeComplete);
      EventBus.off('game-reset', onGameReset);
    };
  }, [viewerRef, computeTrailPositions, removeTrailEntities]);

  return { runPhaseRef, spatialLayersRef, loadSpatialLayers };
}
