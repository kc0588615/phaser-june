// Places to explore from the home globe (GET /api/places: the continents of the
// clue_match_places view in db/schema.sql), plus small pure helpers for the globe and the journal.

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

/** A continent opens once it has this many animals (plan 041); a round shows 8 of them. */
export const MIN_PLACE_ANIMALS = 12;

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
      return '#6fa8bc';
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
