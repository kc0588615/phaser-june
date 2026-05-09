import { NextRequest, NextResponse } from 'next/server';
import ecoregionsJson from '@/config/ecoregions.json';
import type { EcoregionPreviewFeature, EcoregionPreviewProperties } from '@/types/ecoregions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BBox = [number, number, number, number];

interface SourceFeature {
  type: 'Feature';
  id?: string | number;
  geometry: EcoregionPreviewFeature['geometry'];
  properties?: Partial<EcoregionPreviewProperties> & Record<string, unknown>;
}

const sourceFeatures = (ecoregionsJson as { features?: SourceFeature[] }).features ?? [];
let boundsCache: Array<{ feature: SourceFeature; bbox: BBox }> | null = null;

function getBoundsCache() {
  if (boundsCache) return boundsCache;
  boundsCache = sourceFeatures
    .map((feature) => ({ feature, bbox: getGeometryBbox(feature.geometry?.coordinates) }))
    .filter((entry): entry is { feature: SourceFeature; bbox: BBox } => Boolean(entry.bbox));
  return boundsCache;
}

function getGeometryBbox(coordinates: unknown): BBox | null {
  const bbox: BBox = [Infinity, Infinity, -Infinity, -Infinity];
  visitCoordinates(coordinates, bbox);
  return Number.isFinite(bbox[0]) ? bbox : null;
}

function visitCoordinates(value: unknown, bbox: BBox) {
  if (!Array.isArray(value)) return;
  if (typeof value[0] === 'number' && typeof value[1] === 'number') {
    const lon = value[0];
    const lat = value[1];
    if (Number.isFinite(lon) && Number.isFinite(lat)) {
      bbox[0] = Math.min(bbox[0], lon);
      bbox[1] = Math.min(bbox[1], lat);
      bbox[2] = Math.max(bbox[2], lon);
      bbox[3] = Math.max(bbox[3], lat);
    }
    return;
  }
  value.forEach((child) => visitCoordinates(child, bbox));
}

function bboxIntersects(feature: BBox, viewport: BBox) {
  const [, south, , north] = viewport;
  if (feature[3] < south || feature[1] > north) return false;

  const viewportRanges = longitudeRanges(viewport[0], viewport[2]);
  const featureRanges = longitudeRanges(feature[0], feature[2]);
  return viewportRanges.some(([aWest, aEast]) =>
    featureRanges.some(([bWest, bEast]) => aWest <= bEast && bWest <= aEast)
  );
}

function longitudeRanges(west: number, east: number): Array<[number, number]> {
  if (west <= east) return [[west, east]];
  return [[west, 180], [-180, east]];
}

function parseBBox(request: NextRequest): BBox | null {
  const params = request.nextUrl.searchParams;
  const west = Number(params.get('west'));
  const south = Number(params.get('south'));
  const east = Number(params.get('east'));
  const north = Number(params.get('north'));

  if (![west, south, east, north].every(Number.isFinite)) return null;
  if (south < -90 || north > 90 || south >= north) return null;
  if (west < -180 || west > 180 || east < -180 || east > 180) return null;
  return [west, south, east, north];
}

function originalProperties(properties: SourceFeature['properties']): EcoregionPreviewProperties {
  return {
    ECO_NAME: String(properties?.ECO_NAME ?? ''),
    BIOME_NAME: String(properties?.BIOME_NAME ?? ''),
    REALM: String(properties?.REALM ?? ''),
    COLOR: String(properties?.COLOR ?? '#70A800'),
    COLOR_BIO: String(properties?.COLOR_BIO ?? '#38A700'),
    NNH: typeof properties?.NNH === 'number' ? properties.NNH : null,
    NNH_NAME: typeof properties?.NNH_NAME === 'string' ? properties.NNH_NAME : null,
  };
}

export async function GET(request: NextRequest) {
  const viewport = parseBBox(request);
  if (!viewport) {
    return NextResponse.json({ error: 'Missing or invalid west/south/east/north' }, { status: 400 });
  }

  const visible = getBoundsCache()
    .filter(({ bbox }) => bboxIntersects(bbox, viewport))
    .map(({ feature }) => feature);

  const features: EcoregionPreviewFeature[] = visible.map((feature) => {
    const properties = originalProperties(feature.properties);
    return {
      type: 'Feature',
      id: feature.id,
      geometry: feature.geometry,
      properties,
    };
  });

  return NextResponse.json({
    type: 'FeatureCollection',
    bbox: viewport,
    count: features.length,
    features,
  });
}
