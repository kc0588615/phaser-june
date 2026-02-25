/** Shared geo helpers for spatial API routes */

export function buildSquare(lon: number, lat: number, sizeMeters: number) {
  const halfMeters = sizeMeters / 2;
  const metersPerDegreeLat = 111320;
  const lonScale = Math.max(Math.cos((lat * Math.PI) / 180), 0.01);
  const metersPerDegreeLon = metersPerDegreeLat * lonScale;

  const deltaLat = halfMeters / metersPerDegreeLat;
  const deltaLon = halfMeters / metersPerDegreeLon;

  const west = lon - deltaLon;
  const east = lon + deltaLon;
  const south = lat - deltaLat;
  const north = lat + deltaLat;

  const geometry = {
    type: 'Polygon',
    coordinates: [[
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ]],
  };

  return {
    halfMeters,
    areaM2: sizeMeters * sizeMeters,
    bbox: { west, south, east, north },
    geometry,
  };
}

export function buildSeed(lon: number, lat: number): number {
  const key = `${lon.toFixed(5)}:${lat.toFixed(5)}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
