export interface RoutePoint {
  lon: number;
  lat: number;
}

export function computeExpeditionRoutePolyline(lon: number, lat: number, count: number): RoutePoint[] {
  const step = 0.003;
  return Array.from({ length: Math.max(0, count) }, (_, i) => ({
    lon: lon + i * step * 0.7,
    lat: lat + i * step * 0.7,
  }));
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
