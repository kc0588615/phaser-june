import { randomUUID } from 'node:crypto';
import { STATIC_HABITAT_CODE_TO_LABEL } from '@/lib/habitatLabels';
import {
  chooseStride, habitatHistogramBbox, parseHabitatShares, type HabitatShare, type TerrainStride,
} from '@/lib/habitatHistogram';
import { HABITAT_SOURCE_V1 as SOURCE } from './source';
import { decodeTerrainNumpy, TERRAIN_RESPONSE_LIMIT } from './numpy.server';
import {
  MAX_MERCATOR_LAT, MERCATOR_RADIUS, TERRAIN_NEUTRAL_COLOR, terrainCellId,
  type TerrainSnapshot, type TerrainStrideReason,
} from './terrain';

export class TerrainExtractionError extends Error {
  constructor(message: string, public readonly status: 422 | 503 = 503) { super(message); }
}

export type SourceWindow = { col: number; row: number; stride: TerrainStride };

/** Costa Rica stride-8 6×6 `resampling=mode` did not match the local raw-block mode. Use the block path. */
export const TITILER_HONORS_MODE_RESAMPLING = false;

export function sourceWindowAt(lon: number, lat: number, stride: TerrainStride = 1): SourceWindow {
  if (!Number.isFinite(lon) || lon < -180 || lon > 180 || !Number.isFinite(lat) || Math.abs(lat) > MAX_MERCATOR_LAT) {
    throw new TerrainExtractionError('No habitat coverage here. Choose another location.', 422);
  }
  const mx = MERCATOR_RADIUS * lon * Math.PI / 180;
  const my = MERCATOR_RADIUS * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
  const [ox, dx, , oy, , dy] = SOURCE.transform;
  const extent = 6 * stride;
  const align = (pixel: number, sourceSize: number) => {
    let start = Math.floor((pixel - 3 * stride) / stride) * stride;
    start = Math.max(0, Math.min(sourceSize - extent, start));
    start = Math.floor(start / stride) * stride;
    if (start + extent > sourceSize) start = Math.max(0, Math.floor((sourceSize - extent) / stride) * stride);
    return start;
  };
  const col = align(Math.floor((mx - ox) / dx), SOURCE.width);
  const row = align(Math.floor((my - oy) / dy), SOURCE.height);
  if (col + extent > SOURCE.width || row + extent > SOURCE.height) {
    throw new TerrainExtractionError('No habitat coverage here. Choose another location.', 422);
  }
  return { col, row, stride };
}

export function extractionUrl(
  base: string, cog: string, window: SourceWindow, colors: boolean,
  options: { resampling?: 'nearest' | 'mode'; outputSize?: number } = {},
): URL {
  const [ox, dx, , oy, , dy] = SOURCE.transform;
  const extent = 6 * window.stride;
  const size = options.outputSize ?? 6;
  const resampling = options.resampling ?? (window.stride === 1 ? 'nearest' : 'mode');
  const bounds = [ox + window.col * dx, oy + (window.row + extent) * dy, ox + (window.col + extent) * dx, oy + window.row * dy];
  const url = new URL(`${base.replace(/\/$/, '')}/cog/bbox/${bounds.join(',')}/${size}x${size}.npy`);
  url.search = new URLSearchParams({
    url: cog, coord_crs: 'epsg:3857', dst_crs: 'epsg:3857', bidx: '1', resampling, return_mask: 'true',
    ...(colors ? { colormap_name: 'habitat_custom' } : {}),
  }).toString();
  return url;
}

/** Mode of valid pixels in one stride×stride block. Ties → lowest code. Invalid if fewer than half the pixels are valid. */
export function majorityCell(
  codes: readonly number[], masks: readonly number[], size: number, cellX: number, cellY: number, stride: number,
): { code: number; valid: boolean } {
  const counts = new Map<number, number>();
  let validPixels = 0;
  for (let dy = 0; dy < stride; dy++) {
    for (let dx = 0; dx < stride; dx++) {
      const i = (cellY * stride + dy) * size + (cellX * stride + dx);
      const code = codes[i];
      if (masks[i] !== 0 && code !== 0) {
        validPixels += 1;
        counts.set(code, (counts.get(code) ?? 0) + 1);
      }
    }
  }
  if (validPixels * 2 < stride * stride || counts.size === 0) return { code: 0, valid: false };
  let code = 0, best = -1;
  for (const [next, count] of counts) {
    if (count > best || (count === best && next < code)) { best = count; code = next; }
  }
  return { code, valid: true };
}

export function majorityGrid(raw: readonly number[], stride: TerrainStride): { code: number; valid: boolean }[][] {
  const size = 6 * stride;
  if (raw.length !== 2 * size * size) throw new TerrainExtractionError('Invalid terrain array dimensions');
  const codes = raw.slice(0, size * size);
  const masks = raw.slice(size * size);
  return Array.from({ length: 6 }, (_, x) => Array.from({ length: 6 }, (_, y) => majorityCell(codes, masks, size, x, y, stride)));
}

function hexColor(rgba: readonly number[], size: number, i: number): string {
  if (rgba[3 * size * size + i] <= 0) return TERRAIN_NEUTRAL_COLOR;
  return `#${[rgba[i], rgba[size * size + i], rgba[2 * size * size + i]].map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

function colorForCell(
  rgba: readonly number[], raw: readonly number[], window: SourceWindow, x: number, y: number, code: number, valid: boolean,
): string {
  if (!valid) return TERRAIN_NEUTRAL_COLOR;
  const stride = window.stride;
  if (rgba.length === 144) return hexColor(rgba, 6, y * 6 + x);
  const size = 6 * stride;
  const codes = raw.slice(0, size * size);
  const masks = raw.slice(size * size);
  for (let dy = 0; dy < stride; dy++) {
    for (let dx = 0; dx < stride; dx++) {
      const i = (y * stride + dy) * size + (x * stride + dx);
      if (masks[i] !== 0 && codes[i] === code) return hexColor(rgba, size, i);
    }
  }
  return TERRAIN_NEUTRAL_COLOR;
}

export function snapshotFromArrays(
  raw: number[], rgba: number[], window: SourceWindow, labels: Record<number, string>,
  id: string = randomUUID(), extractedAt = new Date().toISOString(),
  strideReason?: TerrainStrideReason,
): TerrainSnapshot {
  const stride = window.stride;
  const block = 6 * stride;
  const sixBySix = raw.length === 72;
  if (!sixBySix && raw.length !== 2 * block * block) throw new TerrainExtractionError('Invalid terrain array dimensions');
  if (rgba.length !== 144 && rgba.length !== 4 * block * block) throw new TerrainExtractionError('Invalid terrain array dimensions');
  const grid = sixBySix
    ? Array.from({ length: 6 }, (_, x) => Array.from({ length: 6 }, (_, y) => {
      const i = y * 6 + x;
      const code = raw[i];
      return { code, valid: raw[36 + i] !== 0 && code !== 0 };
    }))
    : majorityGrid(raw, stride);
  const version = stride === 1 && !strideReason ? 1 : 2;
  const cells = grid.map((col, x) => col.map((cell, y) => {
    const label = cell.valid ? labels[cell.code]?.trim() || STATIC_HABITAT_CODE_TO_LABEL[cell.code] || `Habitat code ${cell.code}` : 'No habitat data';
    return {
      id: terrainCellId(SOURCE.revision, window.col + x * stride, window.row + y * stride, stride, version),
      code: cell.code, valid: cell.valid, label,
      color: colorForCell(rgba, raw, window, x, y, cell.code, cell.valid),
    };
  }));
  if (!cells.some(col => col.some(cell => cell.valid))) throw new TerrainExtractionError('No habitat data at a research site. Choose another location.', 422);
  const base = {
    id, datasetRevision: SOURCE.revision, mappingVersion: SOURCE.mappingVersion, extractedAt,
    sourceCrs: SOURCE.crs, transform: SOURCE.transform, sourceWindow: window, width: 6 as const, height: 6 as const, cells,
  };
  if (version === 1) return { version: 1, ...base, sourceWindow: { col: window.col, row: window.row, stride: 1 } };
  return {
    version: 2, ...base,
    strideReason: strideReason ?? { dominantShare: null, chosen: stride },
  };
}

export async function readBoundedTerrainResponse(response: Response, limit = TERRAIN_RESPONSE_LIMIT): Promise<Uint8Array> {
  if (!response.ok || !response.body) throw new TerrainExtractionError('Terrain service unavailable');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    if (Number(response.headers.get('content-length')) > limit) throw new TerrainExtractionError('Terrain response exceeds size limit');
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new TerrainExtractionError('Terrain response exceeds size limit');
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

export async function fetchHabitatHistogram(
  lon: number, lat: number, options: { fetch: typeof fetch; baseUrl: string; cogUrl: string; signal: AbortSignal },
): Promise<HabitatShare[] | null> {
  try {
    const url = new URL(`${options.baseUrl.replace(/\/$/, '')}/cog/statistics`);
    url.search = new URLSearchParams({ url: options.cogUrl, categorical: 'true', max_size: '512' }).toString();
    const response = await options.fetch(url, {
      method: 'POST', signal: options.signal, cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(habitatHistogramBbox(lon, lat).featureCollection),
    });
    if (!response.ok) return null;
    return parseHabitatShares(await response.json());
  } catch {
    return null;
  }
}

async function fetchClip(
  fetcher: typeof fetch, base: string, cog: string, window: SourceWindow, colors: boolean, signal: AbortSignal,
  options: { resampling: 'nearest' | 'mode'; outputSize: number },
): Promise<number[]> {
  const response = await fetcher(extractionUrl(base, cog, window, colors, options), { signal, cache: 'no-store' });
  return decodeTerrainNumpy(await readBoundedTerrainResponse(response), colors ? 'rgba' : 'raw', options.outputSize);
}

/** Entire network operation shares one deadline. Resume never calls this module. */
export async function extractSiteTerrains(sites: readonly { lon: number; lat: number }[], labels: Record<number, string>, options: {
  fetch?: typeof fetch; baseUrl?: string; cogUrl?: string; timeoutMs?: number;
  modeResampling?: boolean; strides?: readonly TerrainStride[];
} = {}): Promise<TerrainSnapshot[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 20000);
  try {
    const base = options.baseUrl ?? process.env.NEXT_PUBLIC_TITILER_BASE_URL;
    const cog = options.cogUrl ?? process.env.NEXT_PUBLIC_COG_URL;
    if (!base || !cog || ![new URL(base), new URL(cog)].every(url => ['https:', 'http:'].includes(url.protocol))) {
      throw new TerrainExtractionError('Terrain source is not configured');
    }
    const fetcher = options.fetch ?? fetch;
    const checkRevision = async () => {
      const response = await fetcher(cog, { method: 'HEAD', signal: controller.signal, cache: 'no-store' });
      if (!response.ok || response.headers.get('etag') !== SOURCE.etag) {
        throw new TerrainExtractionError('Habitat source revision changed. Terrain source needs verification.');
      }
    };
    await checkRevision();
    const useMode = options.modeResampling ?? TITILER_HONORS_MODE_RESAMPLING;
    const snapshots = await Promise.all(sites.map(async (site, index) => {
      const forced = options.strides?.[index];
      const shares = forced ? null : await fetchHabitatHistogram(site.lon, site.lat, { fetch: fetcher, baseUrl: base, cogUrl: cog, signal: controller.signal });
      const choice = forced ? { stride: forced, dominantShare: null as number | null } : chooseStride(shares);
      const window = sourceWindowAt(site.lon, site.lat, choice.stride);
      const strideReason: TerrainStrideReason = { dominantShare: choice.dominantShare, chosen: choice.stride };
      const loadSix = (resampling: 'nearest' | 'mode') => Promise.all(([false, true] as const).map(colors =>
        fetchClip(fetcher, base, cog, window, colors, controller.signal, { resampling, outputSize: 6 })));
      if (useMode && window.stride > 1) {
        try {
          const [raw, rgba] = await loadSix('mode');
          return snapshotFromArrays(raw, rgba, window, labels, undefined, undefined, strideReason);
        } catch {
          /* Deployed mode resampling missing or malformed: fall back to the raw block. */
        }
      }
      if (window.stride === 1) {
        const [raw, rgba] = await loadSix('nearest');
        return snapshotFromArrays(raw, rgba, window, labels, undefined, undefined, strideReason.dominantShare === null && strideReason.chosen === 1 ? undefined : strideReason);
      }
      const size = 6 * window.stride;
      const [raw, rgba] = await Promise.all(([false, true] as const).map(colors =>
        fetchClip(fetcher, base, cog, window, colors, controller.signal, { resampling: 'nearest', outputSize: size })));
      return snapshotFromArrays(raw, rgba, window, labels, undefined, undefined, strideReason);
    }));
    await checkRevision();
    return snapshots;
  } catch (error) {
    if (error instanceof TerrainExtractionError) throw error;
    throw new TerrainExtractionError(controller.signal.aborted ? 'Terrain loading timed out. Try again.' : 'Terrain extraction failed. Try again.');
  } finally { clearTimeout(timer); controller.abort(); }
}
