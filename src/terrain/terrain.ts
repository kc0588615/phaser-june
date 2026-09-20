/** Immutable geographic ground; never part of the movable puzzle checkpoint. */
export interface TerrainCell {
  readonly id: string;
  readonly code: number;
  readonly valid: boolean;
  readonly label: string;
  readonly color: string;
}

export interface TerrainSnapshotV1 {
  readonly version: 1;
  readonly id: string;
  readonly datasetRevision: string;
  readonly mappingVersion: string;
  readonly extractedAt: string;
  readonly sourceCrs: 'EPSG:3857';
  /** GDAL affine: origin X, pixel X, row X, origin Y, column Y, pixel Y. */
  readonly transform: readonly [number, number, number, number, number, number];
  readonly sourceWindow: { readonly col: number; readonly row: number; readonly stride: 1 };
  readonly width: 6;
  readonly height: 6;
  readonly cells: readonly (readonly TerrainCell[])[]; // [x][y], north first
}

export interface TerrainSelection { snapshotId: string; cellId: string }
export const TERRAIN_NEUTRAL_COLOR = '#52636b';
export const TERRAIN_SIZE = 6;
export const MERCATOR_RADIUS = 6378137;
export const MAX_MERCATOR_LAT = 85.0511287798066;

export function terrainCellId(revision: string, col: number, row: number): string {
  return `${revision}:${col}:${row}`;
}

export function selectedTerrainCell(terrain: TerrainSnapshotV1 | undefined, selection: TerrainSelection | null): TerrainCell | undefined {
  return terrain && selection?.snapshotId === terrain.id
    ? terrain.cells.flat().find(cell => cell.id === selection.cellId) : undefined;
}

export class StoredTerrainError extends Error {
  constructor() { super('Saved terrain is invalid. This expedition cannot be loaded.'); }
}

/** Validate stored data against its own revision, never today's live source. */
export function parseTerrainSnapshot(value: unknown): TerrainSnapshotV1 {
  const fail = (): never => { throw new StoredTerrainError(); };
  if (!value || typeof value !== 'object') return fail();
  const t = value as TerrainSnapshotV1;
  const string = (v: unknown) => typeof v === 'string' && v.length > 0 && v.length <= 256;
  if (t.version !== 1 || !string(t.id) || !string(t.datasetRevision) || !string(t.mappingVersion)
    || typeof t.extractedAt !== 'string' || !Number.isFinite(Date.parse(t.extractedAt))
    || t.sourceCrs !== 'EPSG:3857' || t.width !== 6 || t.height !== 6
    || !Array.isArray(t.transform) || t.transform.length !== 6 || !t.transform.every(Number.isFinite)
    || t.transform[1] <= 0 || t.transform[5] >= 0 || t.transform[2] !== 0 || t.transform[4] !== 0
    || !t.sourceWindow || !Number.isSafeInteger(t.sourceWindow.col) || t.sourceWindow.col < 0
    || !Number.isSafeInteger(t.sourceWindow.row) || t.sourceWindow.row < 0 || t.sourceWindow.stride !== 1
    || !Array.isArray(t.cells) || t.cells.length !== 6) return fail();
  for (let x = 0; x < 6; x++) {
    if (!Array.isArray(t.cells[x]) || t.cells[x].length !== 6) return fail();
    for (let y = 0; y < 6; y++) {
      const cell = t.cells[x][y];
      if (!cell || cell.id !== terrainCellId(t.datasetRevision, t.sourceWindow.col + x, t.sourceWindow.row + y)
        || !Number.isInteger(cell.code) || cell.code < 0 || cell.code > 65535 || typeof cell.valid !== 'boolean'
        || (cell.valid && cell.code === 0) || !string(cell.label)
        || (!cell.valid && cell.label !== 'No habitat data') || !/^#[0-9a-f]{6}$/i.test(cell.color)) return fail();
    }
  }
  if (!t.cells.some((col: readonly TerrainCell[]) => col.some(cell => cell.valid))) return fail();
  for (const [lon, lat] of [terrainCorner(t, 0, 0), terrainCorner(t, 6, 6)]) {
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180.0000001 || Math.abs(lat) > MAX_MERCATOR_LAT + 1e-7) return fail();
  }
  // Whitelist fields so persisted JSON cannot leak unrelated board/private data.
  return {
    version: 1, id: t.id, datasetRevision: t.datasetRevision, mappingVersion: t.mappingVersion,
    extractedAt: t.extractedAt, sourceCrs: t.sourceCrs,
    transform: [t.transform[0], t.transform[1], t.transform[2], t.transform[3], t.transform[4], t.transform[5]],
    sourceWindow: { col: t.sourceWindow.col, row: t.sourceWindow.row, stride: 1 }, width: 6, height: 6,
    cells: t.cells.map((col: readonly TerrainCell[]) => col.map(({ id, code, valid, label, color }) => ({ id, code, valid, label, color }))),
  };
}

export function terrainCorner(t: TerrainSnapshotV1, x: number, y: number): [number, number] {
  const col = t.sourceWindow.col + x;
  const row = t.sourceWindow.row + y;
  const [ox, dx, rx, oy, cy, dy] = t.transform;
  const mx = ox + col * dx + row * rx;
  const my = oy + col * cy + row * dy;
  return [mx / MERCATOR_RADIUS * 180 / Math.PI, (2 * Math.atan(Math.exp(my / MERCATOR_RADIUS)) - Math.PI / 2) * 180 / Math.PI];
}

export function terrainBounds(t: TerrainSnapshotV1): [number, number, number, number] {
  const [west, north] = terrainCorner(t, 0, 0);
  const [east, south] = terrainCorner(t, 6, 6);
  return [west, south, east, north];
}

export function terrainGeoJSON(t: TerrainSnapshotV1): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  return { type: 'FeatureCollection', features: t.cells.flatMap((col, x) => col.map((cell, y) => ({
    type: 'Feature' as const, id: cell.id,
    properties: { ...cell, snapshotId: t.id },
    geometry: { type: 'Polygon' as const, coordinates: [[
      terrainCorner(t, x, y), terrainCorner(t, x, y + 1), terrainCorner(t, x + 1, y + 1),
      terrainCorner(t, x + 1, y), terrainCorner(t, x, y),
    ]] },
  }))) };
}
