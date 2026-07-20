export interface ExpeditionMapRoutePoint {
  nodeIndex: 0 | 1 | 2;
  lat: number;
  lon: number;
  biome: string | null;
  nearestFeature: string | null;
}

export interface ExpeditionMapView {
  bounds: [west: number, south: number, east: number, north: number];
  route: [ExpeditionMapRoutePoint, ExpeditionMapRoutePoint, ExpeditionMapRoutePoint];
}

interface MapNodeInput {
  waypoint?: { lon: number; lat: number; name?: string | null } | null;
}

export function deriveExpeditionMapView(
  nodes: readonly MapNodeInput[],
  fallback: { lon: number; lat: number },
  biome: string | null,
): ExpeditionMapView {
  const route = [0, 1, 2].map(index => {
    const waypoint = nodes[index]?.waypoint;
    return {
      nodeIndex: index as 0 | 1 | 2,
      lon: validLon(waypoint?.lon) ? waypoint.lon : fallback.lon,
      lat: validLat(waypoint?.lat) ? waypoint.lat : fallback.lat,
      biome,
      nearestFeature: typeof waypoint?.name === 'string' && waypoint.name.trim() ? waypoint.name.trim() : null,
    };
  }) as ExpeditionMapView['route'];
  const unwrapped = unwrapLongitudes(route.map(point => point.lon));
  const minLon = Math.min(...unwrapped);
  const maxLon = Math.max(...unwrapped);
  const minLat = Math.min(...route.map(point => point.lat));
  const maxLat = Math.max(...route.map(point => point.lat));
  const lonPad = Math.max((maxLon - minLon) * 0.2, 0.25);
  const latPad = Math.max((maxLat - minLat) * 0.2, 0.25);
  return {
    bounds: [minLon - lonPad, Math.max(-90, minLat - latPad), maxLon + lonPad, Math.min(90, maxLat + latPad)],
    route,
  };
}

export function parseExpeditionMapView(value: unknown): ExpeditionMapView | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const bounds = source.bounds;
  if (!Array.isArray(bounds) || bounds.length !== 4 || bounds.some(item => typeof item !== 'number' || !Number.isFinite(item))) return null;
  const [west, south, east, north] = bounds as number[];
  if (west < -540 || east > 540 || west >= east || south < -90 || north > 90 || south >= north || east - west > 360) return null;
  if (!Array.isArray(source.route) || source.route.length !== 3) return null;
  const route = source.route.flatMap((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const point = value as Record<string, unknown>;
    if (point.nodeIndex !== index || !validLon(point.lon) || !validLat(point.lat)
      || !(point.biome === null || typeof point.biome === 'string')
      || !(point.nearestFeature === null || typeof point.nearestFeature === 'string')) return [];
    return [{
      nodeIndex: index as 0 | 1 | 2,
      lon: point.lon,
      lat: point.lat,
      biome: point.biome as string | null,
      nearestFeature: point.nearestFeature as string | null,
    }];
  });
  return route.length === 3 ? {
    bounds: [west, south, east, north],
    route: route as ExpeditionMapView['route'],
  } : null;
}

function validLon(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180;
}

function validLat(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90;
}

function unwrapLongitudes(values: readonly number[]): number[] {
  if (values.length === 0) return [];
  const anchor = values[0];
  return values.map(value => {
    let result = value;
    while (result - anchor > 180) result -= 360;
    while (result - anchor < -180) result += 360;
    return result;
  });
}
