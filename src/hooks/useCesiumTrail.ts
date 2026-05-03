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
  Cartesian2,
  LabelStyle,
  VerticalOrigin,
} from 'cesium';
import { EventBus } from '@/game/EventBus';
import type { EventPayloads } from '@/game/EventBus';
import { computeExpeditionRoutePolyline, getRouteIndexForWaypointSlot, getRoutePolylineThroughWaypointSlot, normalizeRoutePolyline, type RoutePoint } from '@/lib/expeditionRoute';
import { getWaypointTypeLabel, type ExpeditionWaypoint, type WaypointType } from '@/types/waypoints';

const WAYPOINT_COLORS: Record<WaypointType, string> = {
  city: '#f59e0b',
  river: '#38bdf8',
  lake: '#2563eb',
  wetland: '#14b8a6',
  protected_area: '#22c55e',
  bioregion_edge: '#a78bfa',
  basecamp: '#f97316',
};

function getWaypointForRoutePoint(data: EventPayloads['expedition-data-ready'], routePoint: RoutePoint, routeIndex: number): ExpeditionWaypoint | null {
  const slot = Number.isInteger(routePoint.waypointSlot) ? routePoint.waypointSlot! : routeIndex;
  const nodeWaypoint = data.expedition.nodes[slot]?.waypoint;
  if (nodeWaypoint) return nodeWaypoint;
  return data.expedition.waypoints?.find((waypoint) => waypoint.slot === slot) ?? null;
}

function markerColorForWaypoint(waypoint: ExpeditionWaypoint | null) {
  if (!waypoint) return CesiumColor.GRAY;
  return CesiumColor.fromCssColorString(WAYPOINT_COLORS[waypoint.waypointType]).withAlpha(waypoint.fallback ? 0.75 : 1);
}

function markerLabelForWaypoint(waypoint: ExpeditionWaypoint | null, routeIndex: number) {
  if (!waypoint) return `Node ${routeIndex + 1}`;
  const typeLabel = getWaypointTypeLabel(waypoint.waypointType) ?? 'Waypoint';
  const name = waypoint.name.length > 22 ? `${waypoint.name.slice(0, 21)}…` : waypoint.name;
  return `${waypoint.slot + 1}. ${typeLabel}: ${name}`;
}

function getGameplayTrailPositions(route: RoutePoint[], currentSlot: number): RoutePoint[] {
  return getRoutePolylineThroughWaypointSlot(route, currentSlot);
}

function clearActiveMarker(entity: CesiumEntity | undefined) {
  if (!entity?.point) return;
  entity.point.pixelSize = new ConstantProperty(9);
}

/** Manages expedition trail polyline + node markers on the Cesium globe. */
export function useCesiumTrail(viewerRef: MutableRefObject<any>) {
  const trailEntitiesRef = useRef<CesiumEntity[]>([]);
  const trailPositionsRef = useRef<RoutePoint[]>([]);
  const trailCurrentSlotRef = useRef<number>(0);
  const trailActiveMarkerRef = useRef<CesiumEntity | null>(null);
  const spatialLayersRef = useRef<GeoJsonDataSource[]>([]);
  const runPhaseRef: MutableRefObject<string> = useRef('idle');

  const removeTrailEntities = useCallback(() => {
    if (!viewerRef.current?.cesiumElement) return;
    const viewer = viewerRef.current.cesiumElement;
    for (const ent of trailEntitiesRef.current) {
      try { viewer.entities.remove(ent); } catch { /* ok */ }
    }
    trailEntitiesRef.current = [];
    trailPositionsRef.current = [];
    trailCurrentSlotRef.current = 0;
    trailActiveMarkerRef.current = null;
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
      const payloadRoute = normalizeRoutePolyline(data.expedition.routePolyline);
      const positions = payloadRoute.length > 0
        ? payloadRoute
        : computeExpeditionRoutePolyline(data.lon, data.lat, nodeCount);
      trailPositionsRef.current = positions;
      trailCurrentSlotRef.current = 0;
      trailActiveMarkerRef.current = null;

      if (viewerRef.current?.cesiumElement && positions.length > 1) {
        const viewer = viewerRef.current.cesiumElement;
        removeTrailEntities();

        const polyline = viewer.entities.add({
          polyline: {
            positions: new CallbackProperty(() => {
              return getGameplayTrailPositions(trailPositionsRef.current, trailCurrentSlotRef.current).map((p: { lon: number; lat: number }) =>
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
          const waypoint = getWaypointForRoutePoint(data, positions[i], i);
          const markerColor = markerColorForWaypoint(waypoint);
          const pt = viewer.entities.add({
            position: Cartesian3.fromDegrees(positions[i].lon, positions[i].lat),
            point: {
              pixelSize: new ConstantProperty(waypoint?.fallback ? 7 : 9),
              color: new ConstantProperty(markerColor),
              outlineColor: new ConstantProperty(CesiumColor.WHITE),
              outlineWidth: new ConstantProperty(1),
              heightReference: new ConstantProperty(HeightReference.CLAMP_TO_GROUND),
            },
            label: {
              text: new ConstantProperty(markerLabelForWaypoint(waypoint, i)),
              font: new ConstantProperty('12px sans-serif'),
              fillColor: new ConstantProperty(CesiumColor.WHITE),
              outlineColor: new ConstantProperty(CesiumColor.BLACK),
              outlineWidth: new ConstantProperty(2),
              style: new ConstantProperty(LabelStyle.FILL_AND_OUTLINE),
              verticalOrigin: new ConstantProperty(VerticalOrigin.BOTTOM),
              pixelOffset: new ConstantProperty(new Cartesian2(0, -14)),
              showBackground: new ConstantProperty(true),
              backgroundColor: new ConstantProperty(CesiumColor.BLACK.withAlpha(0.55)),
              heightReference: new ConstantProperty(HeightReference.CLAMP_TO_GROUND),
            },
          });
          trailEntitiesRef.current.push(pt);
        }
        const firstPt = trailEntitiesRef.current[1];
        if (firstPt?.point) {
          firstPt.point.color = new ConstantProperty(CesiumColor.YELLOW);
          firstPt.point.pixelSize = new ConstantProperty(11);
          trailActiveMarkerRef.current = firstPt;
        }
      }
    };

    const onExpeditionStart = () => { runPhaseRef.current = 'in-run'; };

    const onNodeComplete = (data: { nodeIndex: number }) => {
      const completedIdx = getRouteIndexForWaypointSlot(trailPositionsRef.current, data.nodeIndex);
      if (completedIdx < 0) return;
      trailCurrentSlotRef.current = Math.max(trailCurrentSlotRef.current, data.nodeIndex + 1);
      const markerIdx = completedIdx + 1;
      clearActiveMarker(trailActiveMarkerRef.current ?? undefined);
      if (trailEntitiesRef.current[markerIdx]?.point) {
        trailEntitiesRef.current[markerIdx].point!.color = new ConstantProperty(CesiumColor.CYAN);
        trailEntitiesRef.current[markerIdx].point!.pixelSize = new ConstantProperty(9);
      }
      const nextRouteIdx = getRouteIndexForWaypointSlot(trailPositionsRef.current, data.nodeIndex + 1);
      const nextMarkerIdx = nextRouteIdx >= 0 ? nextRouteIdx + 1 : -1;
      if (trailEntitiesRef.current[nextMarkerIdx]?.point) {
        trailEntitiesRef.current[nextMarkerIdx].point!.color = new ConstantProperty(CesiumColor.YELLOW);
        trailEntitiesRef.current[nextMarkerIdx].point!.pixelSize = new ConstantProperty(11);
        trailActiveMarkerRef.current = trailEntitiesRef.current[nextMarkerIdx];
      } else {
        trailActiveMarkerRef.current = null;
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
  }, [viewerRef, removeTrailEntities]);

  return { runPhaseRef, spatialLayersRef, loadSpatialLayers };
}
