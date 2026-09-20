import { randomUUID } from 'node:crypto';
import { STATIC_HABITAT_CODE_TO_LABEL } from '@/lib/habitatLabels';
import { HABITAT_SOURCE_V1 as SOURCE } from './source';
import { decodeTerrainNumpy } from './numpy.server';
import { MAX_MERCATOR_LAT, MERCATOR_RADIUS, TERRAIN_NEUTRAL_COLOR, terrainCellId, type TerrainSnapshotV1 } from './terrain';

export class TerrainExtractionError extends Error {
  constructor(message: string, public readonly status: 422 | 503 = 503) { super(message); }
}

export function sourceWindowAt(lon: number, lat: number) {
  if (!Number.isFinite(lon) || lon < -180 || lon > 180 || !Number.isFinite(lat) || Math.abs(lat) > MAX_MERCATOR_LAT) {
    throw new TerrainExtractionError('No habitat coverage here. Choose another location.', 422);
  }
  const mx = MERCATOR_RADIUS * lon * Math.PI / 180;
  const my = MERCATOR_RADIUS * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
  const [ox, dx, , oy, , dy] = SOURCE.transform;
  return {
    col: Math.max(0, Math.min(SOURCE.width - 6, Math.floor((mx - ox) / dx) - 3)),
    row: Math.max(0, Math.min(SOURCE.height - 6, Math.floor((my - oy) / dy) - 3)), stride: 1 as const,
  };
}

export function extractionUrl(base: string, cog: string, window: ReturnType<typeof sourceWindowAt>, colors: boolean): URL {
  const [ox, dx, , oy, , dy] = SOURCE.transform;
  const bounds = [ox + window.col * dx, oy + (window.row + 6) * dy, ox + (window.col + 6) * dx, oy + window.row * dy];
  const url = new URL(`${base.replace(/\/$/, '')}/cog/bbox/${bounds.join(',')}/6x6.npy`);
  url.search = new URLSearchParams({ url: cog, coord_crs: 'epsg:3857', dst_crs: 'epsg:3857', bidx: '1', resampling: 'nearest', return_mask: 'true', ...(colors ? { colormap_name: 'habitat_custom' } : {}) }).toString();
  return url;
}

export function snapshotFromArrays(raw: number[], rgba: number[], window: ReturnType<typeof sourceWindowAt>, labels: Record<number, string>, id: string = randomUUID(), extractedAt = new Date().toISOString()): TerrainSnapshotV1 {
  if (raw.length !== 72 || rgba.length !== 144) throw new TerrainExtractionError('Invalid terrain array dimensions');
  const cells = Array.from({ length: 6 }, (_, x) => Array.from({ length: 6 }, (_, y) => {
    const i = y * 6 + x;
    const code = raw[i];
    const valid = raw[36 + i] !== 0 && code !== 0;
    const label = valid ? labels[code]?.trim() || STATIC_HABITAT_CODE_TO_LABEL[code] || `Habitat code ${code}` : 'No habitat data';
    const color = valid && rgba[108 + i] > 0
      ? `#${[rgba[i], rgba[36 + i], rgba[72 + i]].map(c => c.toString(16).padStart(2, '0')).join('')}` : TERRAIN_NEUTRAL_COLOR;
    return { id: terrainCellId(SOURCE.revision, window.col + x, window.row + y), code, valid, label, color };
  }));
  if (!cells.some(col => col.some(cell => cell.valid))) throw new TerrainExtractionError('No habitat data at a research site. Choose another location.', 422);
  return { version: 1, id, datasetRevision: SOURCE.revision, mappingVersion: SOURCE.mappingVersion, extractedAt,
    sourceCrs: SOURCE.crs, transform: SOURCE.transform, sourceWindow: window, width: 6, height: 6, cells };
}

export async function readBoundedTerrainResponse(response: Response): Promise<Uint8Array> {
  if (!response.ok || !response.body) throw new TerrainExtractionError('Terrain service unavailable');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    if (Number(response.headers.get('content-length')) > 65536) throw new TerrainExtractionError('Terrain response exceeds size limit');
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 65536) throw new TerrainExtractionError('Terrain response exceeds size limit');
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

/** Entire network operation shares one deadline. Resume never calls this module. */
export async function extractSiteTerrains(sites: readonly { lon: number; lat: number }[], labels: Record<number, string>, options: {
  fetch?: typeof fetch; baseUrl?: string; cogUrl?: string; timeoutMs?: number;
} = {}): Promise<TerrainSnapshotV1[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 20000);
  try {
    const base = options.baseUrl ?? process.env.NEXT_PUBLIC_TITILER_BASE_URL;
    const cog = options.cogUrl ?? process.env.NEXT_PUBLIC_COG_URL;
    if (!base || !cog || ![new URL(base), new URL(cog)].every(url => ['https:', 'http:'].includes(url.protocol))) {
      throw new TerrainExtractionError('Terrain source is not configured');
    }
    const windows = sites.map(site => sourceWindowAt(site.lon, site.lat));
    const fetcher = options.fetch ?? fetch;
    const checkRevision = async () => {
      const response = await fetcher(cog, { method: 'HEAD', signal: controller.signal, cache: 'no-store' });
      if (!response.ok || response.headers.get('etag') !== SOURCE.etag) {
        throw new TerrainExtractionError('Habitat source revision changed. Terrain source needs verification.');
      }
    };
    await checkRevision();
    const snapshots = await Promise.all(windows.map(async window => {
      const [raw, rgba] = await Promise.all(([false, true] as const).map(async colors => {
        const response = await fetcher(extractionUrl(base, cog, window, colors), { signal: controller.signal, cache: 'no-store' });
        return decodeTerrainNumpy(await readBoundedTerrainResponse(response), colors ? 'rgba' : 'raw');
      }));
      return snapshotFromArrays(raw, rgba, window, labels);
    }));
    await checkRevision();
    return snapshots;
  } catch (error) {
    if (error instanceof TerrainExtractionError) throw error;
    throw new TerrainExtractionError(controller.signal.aborted ? 'Terrain loading timed out. Try again.' : 'Terrain extraction failed. Try again.');
  } finally { clearTimeout(timer); controller.abort(); }
}
