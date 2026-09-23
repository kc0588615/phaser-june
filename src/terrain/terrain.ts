/** Immutable geographic ground; never part of the movable puzzle checkpoint. */
import { isTerrainStride, type TerrainStride } from '@/lib/habitatHistogram';

export interface TerrainCell {
  readonly id: string;
  readonly code: number;
  readonly valid: boolean;
  readonly label: string;
  readonly color: string;
}

export interface TerrainStrideReason {
  readonly dominantShare: number | null;
  readonly chosen: TerrainStride;
}

interface TerrainSnapshotBase {
  readonly id: string;
  readonly datasetRevision: string;
  readonly mappingVersion: string;
  readonly extractedAt: string;
  readonly sourceCrs: 'EPSG:3857';
  /** GDAL affine: origin X, pixel X, row X, origin Y, column Y, pixel Y. */
  readonly transform: readonly [number, number, number, number, number, number];
  readonly width: 6;
  readonly height: 6;
  readonly cells: readonly (readonly TerrainCell[])[]; // [x][y], north first
}

export interface TerrainSnapshotV1 extends TerrainSnapshotBase {
  readonly version: 1;
  readonly sourceWindow: { readonly col: number; readonly row: number; readonly stride: 1 };
}

export interface TerrainSnapshotV2 extends TerrainSnapshotBase {
  readonly version: 2;
  readonly sourceWindow: { readonly col: number; readonly row: number; readonly stride: TerrainStride };
  readonly strideReason: TerrainStrideReason;
}

export type TerrainSnapshot = TerrainSnapshotV1 | TerrainSnapshotV2;
export interface TerrainSelection { snapshotId: string; cellId: string }
export const TERRAIN_NEUTRAL_COLOR = '#52636b';
export const TERRAIN_SIZE = 6;
export const MERCATOR_RADIUS = 6378137;
export const MAX_MERCATOR_LAT = 85.0511287798066;

/** v1 ids omit stride so saved stride-1 snapshots keep their original identity. */
export function terrainCellId(revision: string, col: number, row: number, stride: number = 1, version: 1 | 2 = 1): string {
  return version === 1 ? `${revision}:${col}:${row}` : `${revision}:${stride}:${col}:${row}`;
}

export function selectedTerrainCell(terrain: TerrainSnapshot | undefined, selection: TerrainSelection | null): TerrainCell | undefined {
  return terrain && selection?.snapshotId === terrain.id
    ? terrain.cells.flat().find(cell => cell.id === selection.cellId) : undefined;
}

export class StoredTerrainError extends Error {
  constructor() { super('Saved terrain is invalid. This expedition cannot be loaded.'); }
}

function parseWindow(value: unknown, version: 1 | 2): TerrainSnapshot['sourceWindow'] | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as { col?: unknown; row?: unknown; stride?: unknown };
  if (!Number.isSafeInteger(source.col) || (source.col as number) < 0
    || !Number.isSafeInteger(source.row) || (source.row as number) < 0) return null;
  if (version === 1) return source.stride === 1 ? { col: source.col as number, row: source.row as number, stride: 1 } : null;
  return isTerrainStride(source.stride) ? { col: source.col as number, row: source.row as number, stride: source.stride } : null;
}

function parseStrideReason(value: unknown, stride: TerrainStride): TerrainStrideReason | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as { dominantShare?: unknown; chosen?: unknown };
  if (source.chosen !== stride) return null;
  if (source.dominantShare === null) return { dominantShare: null, chosen: stride };
  return typeof source.dominantShare === 'number' && Number.isFinite(source.dominantShare)
    && source.dominantShare >= 0 && source.dominantShare <= 1
    ? { dominantShare: source.dominantShare, chosen: stride } : null;
}

function copyCells(cells: TerrainSnapshot['cells']): TerrainCell[][] {
  return cells.map(col => col.map(({ id, code, valid, label, color }) => ({ id, code, valid, label, color })));
}

/** Validate stored data against its own revision, never today's live source. */
export function parseTerrainSnapshot(value: unknown): TerrainSnapshot {
  const fail = (): never => { throw new StoredTerrainError(); };
  if (!value || typeof value !== 'object') return fail();
  const t = value as TerrainSnapshot;
  const string = (v: unknown) => typeof v === 'string' && v.length > 0 && v.length <= 256;
  const version = t.version === 1 || t.version === 2 ? t.version : fail();
  const window = parseWindow(t.sourceWindow, version);
  if (!string(t.id) || !string(t.datasetRevision) || !string(t.mappingVersion)
    || typeof t.extractedAt !== 'string' || !Number.isFinite(Date.parse(t.extractedAt))
    || t.sourceCrs !== 'EPSG:3857' || t.width !== 6 || t.height !== 6
    || !Array.isArray(t.transform) || t.transform.length !== 6 || !t.transform.every(Number.isFinite)
    || t.transform[1] <= 0 || t.transform[5] >= 0 || t.transform[2] !== 0 || t.transform[4] !== 0
    || !window || !Array.isArray(t.cells) || t.cells.length !== 6) return fail();
  const stride = window.stride;
  const strideReason = version === 2 ? parseStrideReason((t as TerrainSnapshotV2).strideReason, stride) : null;
  if (version === 2 && !strideReason) return fail();
  for (let x = 0; x < 6; x++) {
    if (!Array.isArray(t.cells[x]) || t.cells[x].length !== 6) return fail();
    for (let y = 0; y < 6; y++) {
      const cell = t.cells[x][y];
      const expectedId = terrainCellId(t.datasetRevision, window.col + x * stride, window.row + y * stride, stride, version);
      if (!cell || cell.id !== expectedId
        || !Number.isInteger(cell.code) || cell.code < 0 || cell.code > 65535 || typeof cell.valid !== 'boolean'
        || (cell.valid && cell.code === 0) || !string(cell.label)
        || (!cell.valid && cell.label !== 'No habitat data') || !/^#[0-9a-f]{6}$/i.test(cell.color)) return fail();
    }
  }
  if (!t.cells.some((col: readonly TerrainCell[]) => col.some(cell => cell.valid))) return fail();
  const snapshot = version === 1
    ? {
      version: 1 as const, id: t.id, datasetRevision: t.datasetRevision, mappingVersion: t.mappingVersion,
      extractedAt: t.extractedAt, sourceCrs: t.sourceCrs,
      transform: [t.transform[0], t.transform[1], t.transform[2], t.transform[3], t.transform[4], t.transform[5]] as const,
      sourceWindow: { col: window.col, row: window.row, stride: 1 as const }, width: 6 as const, height: 6 as const,
      cells: copyCells(t.cells),
    }
    : {
      version: 2 as const, id: t.id, datasetRevision: t.datasetRevision, mappingVersion: t.mappingVersion,
      extractedAt: t.extractedAt, sourceCrs: t.sourceCrs,
      transform: [t.transform[0], t.transform[1], t.transform[2], t.transform[3], t.transform[4], t.transform[5]] as const,
      sourceWindow: window, width: 6 as const, height: 6 as const, cells: copyCells(t.cells), strideReason: strideReason!,
    };
  for (const [lon, lat] of [terrainCorner(snapshot, 0, 0), terrainCorner(snapshot, 6, 6)]) {
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon) > 180.0000001 || Math.abs(lat) > MAX_MERCATOR_LAT + 1e-7) return fail();
  }
  return snapshot;
}

export function terrainCorner(t: TerrainSnapshot, x: number, y: number): [number, number] {
  const stride = t.sourceWindow.stride;
  const col = t.sourceWindow.col + x * stride;
  const row = t.sourceWindow.row + y * stride;
  const [ox, dx, rx, oy, cy, dy] = t.transform;
  const mx = ox + col * dx + row * rx;
  const my = oy + col * cy + row * dy;
  return [mx / MERCATOR_RADIUS * 180 / Math.PI, (2 * Math.atan(Math.exp(my / MERCATOR_RADIUS)) - Math.PI / 2) * 180 / Math.PI];
}

export function terrainBounds(t: TerrainSnapshot): [number, number, number, number] {
  const [west, north] = terrainCorner(t, 0, 0);
  const [east, south] = terrainCorner(t, 6, 6);
  return [west, south, east, north];
}

export function terrainGeoJSON(t: TerrainSnapshot): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  return { type: 'FeatureCollection', features: t.cells.flatMap((col, x) => col.map((cell, y) => ({
    type: 'Feature' as const, id: cell.id,
    properties: { ...cell, snapshotId: t.id },
    geometry: { type: 'Polygon' as const, coordinates: [[
      terrainCorner(t, x, y), terrainCorner(t, x, y + 1), terrainCorner(t, x + 1, y + 1),
      terrainCorner(t, x + 1, y), terrainCorner(t, x, y),
    ]] },
  }))) };
}

export function localMinZoom(terrain: TerrainSnapshot): number {
  return terrain.sourceWindow.stride >= 8 ? 8 : 12;
}
