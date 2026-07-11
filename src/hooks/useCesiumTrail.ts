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
  Rectangle,
  SceneMode,
  NearFarScalar,
  PolylineGlowMaterialProperty,
  HorizontalOrigin,
  BoundingSphere,
  HeadingPitchRange,
  Math as CesiumMath,
} from 'cesium';
import { EventBus } from '@/game/EventBus';
import type { EventPayloads } from '@/game/EventBus';
import { computeExpeditionRoutePolyline, getRouteBounds, getRouteIndexForWaypointSlot, getRoutePolylineThroughWaypointSlot, normalizeRoutePolyline, type RoutePoint } from '@/lib/expeditionRoute';
import { getWaypointTypeLabel, type ExpeditionWaypoint, type WaypointType } from '@/types/waypoints';
import type { RunNode } from '@/types/expedition';

// --- Node type emoji icons for map markers ---
const NODE_TYPE_EMOJI: Record<string, string> = {
  riverbank_sweep: '🌊',
  dense_canopy: '🌲',
  urban_fringe: '🏙️',
  elevation_ridge: '⛰️',
  storm_window: '⚡',
  analysis: '🔬',
  custom: '🔎',
};

const WAYPOINT_COLORS: Record<WaypointType, string> = {
  city: '#f59e0b',
  river: '#38bdf8',
  lake: '#2563eb',
  wetland: '#14b8a6',
  protected_area: '#22c55e',
  bioregion_edge: '#a78bfa',
  basecamp: '#f97316',
};

const RUN_ROUTE_VIEW_WIDTH_KM = 220;
const RUN_ROUTE_VIEW_PADDING_RATIO = 0.35;
const NODE_MARKER_SIZE = 14;
const ACTIVE_NODE_MARKER_SIZE = 20;
const ROUTE_LAYER_PADDING_KM = 35;

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
  return `${typeLabel}: ${name}`;
}

function getGameplayTrailPositions(route: RoutePoint[], currentSlot: number): RoutePoint[] {
  return getRoutePolylineThroughWaypointSlot(route, currentSlot);
}

function clearActiveMarker(entity: CesiumEntity | undefined) {
  if (!entity?.point) return;
  entity.point.pixelSize = new ConstantProperty(9);
}

function routeSpanKm(positions: RoutePoint[]): number {
  const bounds = getRouteBounds(positions);
  if (!bounds) return RUN_ROUTE_VIEW_WIDTH_KM;
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const latKm = Math.max(0.01, (bounds.maxLat - bounds.minLat) * 111.32);
  const lonKm = Math.max(
    0.01,
    (bounds.maxLon - bounds.minLon) * 111.32 * Math.max(Math.cos((centerLat * Math.PI) / 180), 0.2),
  );
  return Math.max(latKm, lonKm, RUN_ROUTE_VIEW_WIDTH_KM);
}

function routeBoundsSearchParams(lon: number, lat: number, positions?: RoutePoint[]): URLSearchParams {
  const params = new URLSearchParams({ lon: String(lon), lat: String(lat) });
  const bounds = positions && positions.length > 1 ? getRouteBounds(positions) : null;
  if (!bounds) return params;

  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const latPad = ROUTE_LAYER_PADDING_KM / 111.32;
  const lonPad = latPad / Math.max(Math.cos((centerLat * Math.PI) / 180), 0.2);
  params.set('west', String(Math.max(-180, bounds.minLon - lonPad)));
  params.set('south', String(Math.max(-90, bounds.minLat - latPad)));
  params.set('east', String(Math.min(180, bounds.maxLon + lonPad)));
  params.set('north', String(Math.min(90, bounds.maxLat + latPad)));
  return params;
}

function routeBoundingSphere(positions: RoutePoint[]) {
  return BoundingSphere.fromPoints(positions.map((p) => Cartesian3.fromDegrees(p.lon, p.lat)));
}

/** Fly camera to fit the full expedition route while keeping the 3D horizon visible. */
function flyToRouteBounds(viewer: any, positions: RoutePoint[], duration = 1.2, overview = false) {
  const bounds = getRouteBounds(positions);
  if (!bounds) return;
  viewer.resize?.();
  const centerLon = (bounds.minLon + bounds.maxLon) / 2;
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const routeLonSpan = bounds.maxLon - bounds.minLon;
  const routeLatSpan = bounds.maxLat - bounds.minLat;
  const minLatSpan = RUN_ROUTE_VIEW_WIDTH_KM / 111.32;
  const minLonSpan = minLatSpan / Math.max(Math.cos((centerLat * Math.PI) / 180), 0.2);
  const lonSpan = Math.max(routeLonSpan * (1 + RUN_ROUTE_VIEW_PADDING_RATIO), minLonSpan);
  const latSpan = Math.max(routeLatSpan * (1 + RUN_ROUTE_VIEW_PADDING_RATIO), minLatSpan);
  const rect = Rectangle.fromDegrees(
    centerLon - lonSpan / 2,
    centerLat - latSpan / 2,
    centerLon + lonSpan / 2,
    centerLat + latSpan / 2,
  );
  const destination = viewer.scene?.mode === SceneMode.SCENE2D
    ? viewer.camera.getRectangleCameraCoordinates(rect)
    : rect;
  if (duration <= 0) {
    if (viewer.scene?.mode === SceneMode.SCENE3D && positions.length > 1) {
      viewer.camera.flyToBoundingSphere(routeBoundingSphere(positions), {
        duration: 0,
        offset: new HeadingPitchRange(
          CesiumMath.toRadians(overview ? 0 : 20),
          CesiumMath.toRadians(overview ? -58 : -32),
          routeSpanKm(positions) * 1000 * (overview ? 5.2 : 2.6),
        ),
      });
    } else {
      viewer.camera.setView({ destination });
    }
    viewer.scene?.requestRender?.();
    return;
  }
  if (viewer.scene?.mode === SceneMode.SCENE3D && positions.length > 1) {
    viewer.camera.flyToBoundingSphere(routeBoundingSphere(positions), {
      duration,
      offset: new HeadingPitchRange(
        CesiumMath.toRadians(overview ? 0 : 20),
        CesiumMath.toRadians(overview ? -58 : -32),
        routeSpanKm(positions) * 1000 * (overview ? 5.2 : 2.6),
      ),
    });
    return;
  }
  viewer.camera.flyTo({ destination, duration });
}

/** Manages expedition trail polyline + node markers on the Cesium globe.
 *  Keeps 3D mode during runs and animates camera along the route. */
export function useCesiumTrail(viewerRef: MutableRefObject<any>) {
  const trailEntitiesRef = useRef<CesiumEntity[]>([]);
  const trailPositionsRef = useRef<RoutePoint[]>([]);
  const trailCurrentSlotRef = useRef<number>(0);
  const trailActiveMarkerRef = useRef<CesiumEntity | null>(null);
  const spatialLayersRef = useRef<GeoJsonDataSource[]>([]);

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

  const loadSpatialLayers = useCallback(async (lon: number, lat: number, route?: RoutePoint[]) => {
    if (!viewerRef.current?.cesiumElement) return;
    const viewer = viewerRef.current.cesiumElement;

    for (const ds of spatialLayersRef.current) {
      try { viewer.dataSources.remove(ds, true); } catch { /* ok */ }
    }
    spatialLayersRef.current = [];

    try {
      const resp = await fetch(`/api/layers/near-point?${routeBoundsSearchParams(lon, lat, route).toString()}`);
      if (!resp.ok) return;
      const data = await resp.json();

      if (data.bioregions?.features?.length > 0) {
        const bioDs = new GeoJsonDataSource('spatial-bioregions');
        await bioDs.load(data.bioregions);
        bioDs.entities.values.forEach((e) => {
          if (e.polygon) {
            const color = String(e.properties?.hex_color?.getValue?.() ?? '#a78bfa');
            e.polygon.material = new ColorMaterialProperty(CesiumColor.fromCssColorString(color).withAlpha(0.16));
            e.polygon.outline = new ConstantProperty(true);
            e.polygon.outlineColor = new ConstantProperty(CesiumColor.fromCssColorString(color).withAlpha(0.7));
            e.polygon.outlineWidth = new ConstantProperty(1);
          }
        });
        viewer.dataSources.add(bioDs);
        spatialLayersRef.current.push(bioDs);
      }

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
      const nodeCount = data.expedition.nodes.length;
      const payloadRoute = normalizeRoutePolyline(data.expedition.routePolyline);
      const positions = payloadRoute.length > 0
        ? payloadRoute
        : computeExpeditionRoutePolyline(data.lon, data.lat, nodeCount);
      removeTrailEntities();
      trailPositionsRef.current = positions;
      trailCurrentSlotRef.current = 0;
      trailActiveMarkerRef.current = null;

      void loadSpatialLayers(data.lon, data.lat, positions);

      if (viewerRef.current?.cesiumElement && positions.length > 0) {
        const viewer = viewerRef.current.cesiumElement;
        const nodes = data.expedition.nodes;

        if (positions.length > 1) {
          // --- Full route polyline (upcoming segments, dashed gray) ---
          const fullPolyline = viewer.entities.add({
            polyline: {
              positions: new ConstantProperty(
                positions.map((p: RoutePoint) => Cartesian3.fromDegrees(p.lon, p.lat))
              ),
              material: new PolylineDashMaterialProperty({
                color: CesiumColor.fromAlpha(CesiumColor.WHITE, 0.3),
                dashLength: 10,
              }),
              width: new ConstantProperty(2),
              clampToGround: new ConstantProperty(true),
            },
          });
          trailEntitiesRef.current.push(fullPolyline);

          // --- Completed segments polyline (solid cyan, grows with progress) ---
          const completedPolyline = viewer.entities.add({
            polyline: {
              positions: new CallbackProperty(() => {
                return getGameplayTrailPositions(trailPositionsRef.current, trailCurrentSlotRef.current).map((p: { lon: number; lat: number }) =>
                  Cartesian3.fromDegrees(p.lon, p.lat)
                );
              }, false) as any,
              material: new PolylineGlowMaterialProperty({
                glowPower: 0.15,
                color: CesiumColor.CYAN.withAlpha(0.85),
              }),
              width: new ConstantProperty(4),
              clampToGround: new ConstantProperty(true),
            },
          });
          trailEntitiesRef.current.push(completedPolyline);
        }

        // --- Node markers with type-aware emoji icons ---
        for (let i = 0; i < positions.length; i++) {
          const waypoint = getWaypointForRoutePoint(data, positions[i], i);
          const routeSlot = Number.isInteger(positions[i].waypointSlot) ? positions[i].waypointSlot! : i;
          const node: RunNode | undefined = nodes[routeSlot];
          const emoji = NODE_TYPE_EMOJI[node?.node_type ?? ''] ?? '📍';
          const markerColor = markerColorForWaypoint(waypoint);
          const isFuture = routeSlot > 0;

          const pt = viewer.entities.add({
            position: Cartesian3.fromDegrees(positions[i].lon, positions[i].lat),
            point: {
              pixelSize: new ConstantProperty(isFuture ? NODE_MARKER_SIZE : ACTIVE_NODE_MARKER_SIZE),
              color: new ConstantProperty(isFuture ? CesiumColor.fromAlpha(markerColor, 0.82) : markerColor),
              outlineColor: new ConstantProperty(CesiumColor.WHITE),
              outlineWidth: new ConstantProperty(isFuture ? 2 : 3),
              heightReference: new ConstantProperty(HeightReference.CLAMP_TO_GROUND),
              disableDepthTestDistance: new ConstantProperty(Number.POSITIVE_INFINITY),
            },
            label: {
              text: new ConstantProperty(`${emoji} ${markerLabelForWaypoint(waypoint, i)}`),
              font: new ConstantProperty('14px Inter, system-ui, sans-serif'),
              fillColor: new ConstantProperty(CesiumColor.WHITE),
              outlineColor: new ConstantProperty(CesiumColor.BLACK),
              outlineWidth: new ConstantProperty(2),
              style: new ConstantProperty(LabelStyle.FILL_AND_OUTLINE),
              verticalOrigin: new ConstantProperty(VerticalOrigin.BOTTOM),
              horizontalOrigin: new ConstantProperty(HorizontalOrigin.LEFT),
              pixelOffset: new ConstantProperty(new Cartesian2(10, -8)),
              showBackground: new ConstantProperty(true),
              backgroundColor: new ConstantProperty(CesiumColor.BLACK.withAlpha(0.72)),
              backgroundPadding: new ConstantProperty(new Cartesian2(6, 4)),
              heightReference: new ConstantProperty(HeightReference.CLAMP_TO_GROUND),
              disableDepthTestDistance: new ConstantProperty(Number.POSITIVE_INFINITY),
              scaleByDistance: new ConstantProperty(new NearFarScalar(500, 1.0, 180000, 0.78)),
            },
          });
          trailEntitiesRef.current.push(pt);
        }

        // Highlight first node (current)
        const firstRouteIdx = getRouteIndexForWaypointSlot(positions, 0);
        const markerOffset = positions.length > 1 ? 2 : 0;
        const firstPt = trailEntitiesRef.current[(firstRouteIdx >= 0 ? firstRouteIdx : 0) + markerOffset];
        if (firstPt?.point) {
          firstPt.point.color = new ConstantProperty(CesiumColor.YELLOW);
          firstPt.point.pixelSize = new ConstantProperty(ACTIVE_NODE_MARKER_SIZE);
          trailActiveMarkerRef.current = firstPt;
        }

        if (viewer.scene.mode === SceneMode.SCENE3D) {
          flyToRouteBounds(viewer, positions, 1.0, true);
        }
      }
    };

    const onExpeditionStart = () => {
      const viewer = viewerRef.current?.cesiumElement;
      if (!viewer) return;
      const fitRoute = () => {
        window.requestAnimationFrame(() => {
          viewer.resize?.();
          flyToRouteBounds(viewer, trailPositionsRef.current, 1.0);
        });
      };

      viewer.resize?.();
      if (viewer.scene.mode === SceneMode.SCENE3D) {
        flyToRouteBounds(viewer, trailPositionsRef.current, 0.8, true);
        window.setTimeout(fitRoute, 900);
        return;
      }

      const removeMorphListener = viewer.scene.morphComplete?.addEventListener?.(() => {
        removeMorphListener?.();
        fitRoute();
      });
      viewer.scene.morphTo3D(0.8);
      setTimeout(fitRoute, 950);
      setTimeout(fitRoute, 1400);
    };

    const advanceTrailToSlot = (slot: number) => {
      const completedIdx = getRouteIndexForWaypointSlot(trailPositionsRef.current, Math.max(0, slot - 1));
      if (completedIdx < 0) return;
      trailCurrentSlotRef.current = Math.max(trailCurrentSlotRef.current, slot);

      const markerOffset = trailPositionsRef.current.length > 1 ? 2 : 0;
      const markerIdx = completedIdx + markerOffset;
      clearActiveMarker(trailActiveMarkerRef.current ?? undefined);

      // Mark completed node green
      if (trailEntitiesRef.current[markerIdx]?.point) {
        trailEntitiesRef.current[markerIdx].point!.color = new ConstantProperty(CesiumColor.fromCssColorString('#22d3ee'));
        trailEntitiesRef.current[markerIdx].point!.pixelSize = new ConstantProperty(NODE_MARKER_SIZE);
      }

      // Highlight next node
      const nextRouteIdx = getRouteIndexForWaypointSlot(trailPositionsRef.current, slot);
      const nextMarkerIdx = nextRouteIdx >= 0 ? nextRouteIdx + markerOffset : -1;
      if (trailEntitiesRef.current[nextMarkerIdx]?.point) {
        trailEntitiesRef.current[nextMarkerIdx].point!.color = new ConstantProperty(CesiumColor.YELLOW);
        trailEntitiesRef.current[nextMarkerIdx].point!.pixelSize = new ConstantProperty(ACTIVE_NODE_MARKER_SIZE);
        trailActiveMarkerRef.current = trailEntitiesRef.current[nextMarkerIdx];
      } else {
        trailActiveMarkerRef.current = null;
      }

      // Camera follow: fly to next node position
      const viewer = viewerRef.current?.cesiumElement;
      const nextPos = trailPositionsRef.current[nextRouteIdx >= 0 ? nextRouteIdx : completedIdx];
      if (viewer && nextPos) {
        // In 2D, use a Rectangle centered on the next node
        if (viewer.scene.mode === SceneMode.SCENE2D) {
          const pad = 0.008;
          viewer.camera.flyTo({
            destination: Rectangle.fromDegrees(
              nextPos.lon - pad, nextPos.lat - pad,
              nextPos.lon + pad, nextPos.lat + pad,
            ),
            duration: 0.8,
          });
        } else {
          const spanKm = routeSpanKm(trailPositionsRef.current);
          viewer.camera.flyTo({
            destination: Cartesian3.fromDegrees(nextPos.lon, nextPos.lat, Math.max(45000, spanKm * 450)),
            orientation: {
              heading: CesiumMath.toRadians(20),
              pitch: CesiumMath.toRadians(-35),
              roll: 0,
            },
            duration: 0.8,
          });
        }
      }
    };

    const onNodeComplete = (data: { nodeIndex: number }) => {
      advanceTrailToSlot(data.nodeIndex + 1);
    };

    const onRouteProgressUpdated = (data: EventPayloads['route-progress-updated']) => {
      advanceTrailToSlot(data.slot);
    };

    const onGameReset = () => {
      removeTrailEntities();

      const viewer = viewerRef.current?.cesiumElement;
      if (viewer) {
        for (const ds of spatialLayersRef.current) {
          try { viewer.dataSources.remove(ds, true); } catch { /* already removed */ }
        }
        spatialLayersRef.current = [];
      }
    };

    EventBus.on('expedition-data-ready', onExpeditionReady);
    EventBus.on('expedition-start', onExpeditionStart);
    EventBus.on('node-complete', onNodeComplete);
    EventBus.on('route-progress-updated', onRouteProgressUpdated);
    EventBus.on('game-reset', onGameReset);
    return () => {
      EventBus.off('expedition-data-ready', onExpeditionReady);
      EventBus.off('expedition-start', onExpeditionStart);
      EventBus.off('node-complete', onNodeComplete);
      EventBus.off('route-progress-updated', onRouteProgressUpdated);
      EventBus.off('game-reset', onGameReset);
    };
  }, [viewerRef, removeTrailEntities, loadSpatialLayers]);

  return { spatialLayersRef, loadSpatialLayers };
}
