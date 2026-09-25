// The world basemaps (drawn from natural_earth.countries by
// scripts/clue-world-map.ts) and the range maps drawn on them. Range map
// coordinates are lon/lat degrees with y flipped, as PostGIS ST_AsSVG writes
// them; latitudes 84N to 60S are shown.
export const WORLD_VIEWBOX = { x: -180, y: -84, width: 360, height: 144 } as const;

/** Land under the range maps. */
export const WORLD_LAND_URL = '/assets/clue-match/world-land.svg';
/** Land on the home globe. */
export const WORLD_LAND_GEOJSON_URL = '/assets/clue-match/world-land.geojson';

/** GET /api/clue-game/range?species=<id>: one species' range from the clue_match_ranges view. */
export interface SpeciesRange {
  speciesId: number;
  /** SVG path data in WORLD_VIEWBOX coordinates. */
  path: string;
  /** A point inside the largest part of the range, for a marker. */
  lon: number;
  lat: number;
  areaKm2: number;
}
