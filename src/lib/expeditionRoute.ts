export interface RoutePoint {
  lon: number;
  lat: number;
  waypointSlot?: number;
}

export function computeExpeditionRoutePolyline(lon: number, lat: number, count: number): RoutePoint[] {
  const step = 0.003;
  return Array.from({ length: Math.max(0, count) }, (_, i) => ({
    lon: lon + i * step * 0.7,
    lat: lat + i * step * 0.7,
  }));
}

export function normalizeRoutePoint(point: unknown): RoutePoint | null {
  if (!point || typeof point !== 'object') return null;
  const lon = Number((point as { lon?: unknown }).lon);
  const lat = Number((point as { lat?: unknown }).lat);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  if (lon < -180 || lon > 180 || lat < -90 || lat > 90) return null;

  const waypointSlot = Number((point as { waypointSlot?: unknown }).waypointSlot);
  return Number.isInteger(waypointSlot)
    ? { lon, lat, waypointSlot }
    : { lon, lat };
}

export function normalizeRoutePolyline(routePolyline: unknown): RoutePoint[] {
  if (!Array.isArray(routePolyline)) return [];
  return routePolyline.flatMap((point) => {
    const normalized = normalizeRoutePoint(point);
    return normalized ? [normalized] : [];
  });
}

export function getRouteIndexForWaypointSlot(route: RoutePoint[], waypointSlot: number): number {
  if (route.length === 0) return -1;
  const routeIndex = route.findIndex((point) => point.waypointSlot === waypointSlot);
  if (routeIndex >= 0) return routeIndex;
  return Math.min(Math.max(0, waypointSlot), route.length - 1);
}

export function getRoutePolylineThroughWaypointSlot(route: RoutePoint[], waypointSlot: number): RoutePoint[] {
  if (route.length === 0) return [];
  const maxSlot = Math.min(Math.max(0, waypointSlot), route.length - 1);
  const points: RoutePoint[] = [];
  for (let slot = 0; slot <= maxSlot; slot++) {
    const routeIndex = getRouteIndexForWaypointSlot(route, slot);
    if (routeIndex >= 0) points.push(route[routeIndex]);
  }
  return points;
}

export function getRouteBounds(points: RoutePoint[]) {
  if (points.length === 0) return null;

  let minLon = points[0].lon;
  let maxLon = points[0].lon;
  let minLat = points[0].lat;
  let maxLat = points[0].lat;

  for (const point of points) {
    minLon = Math.min(minLon, point.lon);
    maxLon = Math.max(maxLon, point.lon);
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
  }

  return { minLon, minLat, maxLon, maxLat };
}
