// Places to explore from the home globe (GET /api/places, built from the
// clue_match_places view, migration 043), plus the small pure helpers the globe
// screen uses. Unit-tested in tests/clueGame/places.test.ts.

export type PlaceKind = 'country' | 'wildlife_area' | 'continent';

export interface Place {
  kind: PlaceKind;
  /** e.g. 'country:KEN', 'area:congolian-rainforests', 'continent:africa'. */
  key: string;
  name: string;
  /** Continent (countries), realm (wildlife areas) or 'Continents'. */
  group: string;
  speciesIds: number[];
  /** Largest part of the place: [west, south, east, north] in degrees. */
  bbox: [number, number, number, number];
  /** A point inside the largest part: [lon, lat]. */
  center: [number, number];
}

/** What the place card shows about each animal (names only once discovered). */
export interface PlaceAnimal {
  id: number;
  commonName: string;
  scientificName: string;
  className: string | null;
  taxonOrder: string | null;
  family: string | null;
}

export interface PlacesResponse {
  places: Place[];
  animals: PlaceAnimal[];
}

export const WORLD_LAND_GEOJSON_URL = '/assets/clue-match/world-land.geojson';

export const PLACE_KIND_LABELS: Record<PlaceKind, string> = {
  country: 'Countries',
  wildlife_area: 'Wildlife areas',
  continent: 'Continents',
};

/** OneEarth realm names, in words kids know (same wording as the Range clues). */
const REALM_NAMES: Record<string, string> = {
  Afrotropics: 'Africa south of the Sahara',
  Australasia: 'Australia and New Guinea',
  IndoMalay: 'South and Southeast Asia',
  Nearctic: 'North America',
  Neotropics: 'Central and South America',
  Oceania: 'Pacific islands',
  Palearctic: 'Europe, North Africa and northern Asia',
  Antarctic: 'Antarctica',
};

export function groupLabel(place: Pick<Place, 'kind' | 'group'>): string {
  return place.kind === 'wildlife_area' ? REALM_NAMES[place.group] ?? place.group : place.group;
}

/** Places of one kind, grouped (alphabetical groups, most animals first within each). */
export function groupPlaces(places: readonly Place[], kind: PlaceKind): Array<{ label: string; places: Place[] }> {
  const groups = new Map<string, Place[]>();
  for (const place of places.filter(p => p.kind === kind)) {
    const label = groupLabel(place);
    groups.set(label, [...(groups.get(label) ?? []), place]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, list]) => ({
      label,
      places: list.sort((a, b) => b.speciesIds.length - a.speciesIds.length || a.name.localeCompare(b.name)),
    }));
}

/** Discovery marker color by animal group: green for amphibians and reptiles, amber for mammals. */
export function classColor(className: string | null | undefined): string {
  switch (className?.toUpperCase()) {
    case 'AMPHIBIA':
    case 'REPTILIA':
      return '#4ade80';
    case 'MAMMALIA':
      return '#fbbf24';
    case 'AVES':
      return '#38bdf8';
    default:
      return '#67e8f9';
  }
}

/**
 * Where a discovery marker goes: inside the place's box, spread by species so
 * several animals from one place don't sit on one point. Deterministic.
 */
export function sightingPoint(place: Pick<Place, 'bbox' | 'center'>, speciesId: number): [number, number] {
  const [west, south, east, north] = place.bbox;
  const angle = ((speciesId * 137.508) % 360) * (Math.PI / 180); // golden-angle spread
  const radius = 0.15 + ((speciesId * 7919) % 100) / 400; // 0.15-0.4 of the half-box
  const lon = place.center[0] + Math.cos(angle) * radius * (east - west) / 2;
  const lat = place.center[1] + Math.sin(angle) * radius * (north - south) / 2;
  return [round(clamp(lon, west, east)), round(clamp(lat, south, north))];
}

/**
 * TiTiler URL for a PNG of the habitat-type raster over a place (the COG the
 * old map used, rendered with its registered `habitat_custom` colors).
 */
export function habitatSnapshotUrl(bbox: Place['bbox'], titilerBaseUrl: string, cogUrl: string, maxSize = 512): string {
  const [west, south, east, north] = bbox;
  const padX = Math.max(0.2, (east - west) * 0.05);
  const padY = Math.max(0.2, (north - south) * 0.05);
  const box = [clamp(west - padX, -180, 180), clamp(south - padY, -85, 85), clamp(east + padX, -180, 180), clamp(north + padY, -85, 85)]
    .map(value => round(value)).join(',');
  const params = new URLSearchParams({ url: cogUrl, colormap_name: 'habitat_custom', nodata: '0', max_size: String(maxSize) });
  return `${titilerBaseUrl.replace(/\/$/, '')}/cog/bbox/${box}.png?${params}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
