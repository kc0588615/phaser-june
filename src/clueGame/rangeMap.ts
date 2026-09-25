// Shared by the range map component and the script that draws its world basemap
// (scripts/clue-world-map.ts). Coordinates are lon/lat degrees with y flipped,
// as PostGIS ST_AsSVG writes them; latitudes 84N to 60S are shown.
export const WORLD_VIEWBOX = { x: -180, y: -84, width: 360, height: 144 } as const;

export const WORLD_LAND_URL = '/assets/clue-match/world-land.svg';

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
