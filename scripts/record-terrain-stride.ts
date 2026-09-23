import { config } from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {
  extractionUrl, fetchHabitatHistogram, majorityGrid, readBoundedTerrainResponse, snapshotFromArrays, sourceWindowAt,
} from '../src/terrain/extract.server';
import { decodeTerrainNumpy } from '../src/terrain/numpy.server';
import { HABITAT_SOURCE_V1 } from '../src/terrain/source';
import { chooseStride } from '../src/lib/habitatHistogram';

config({ path: '.env.local', quiet: true });

const POINT = { lon: -84.1, lat: 10.4 };
const VARIETY_POINTS = [
  POINT,
  { lon: -83.8, lat: 9.9 }, { lon: -84.5, lat: 10.8 }, { lon: -85.2, lat: 9.5 },
  { lon: -60, lat: -3 }, { lon: -76, lat: -10 }, { lon: -57, lat: -17 }, { lon: -99, lat: 19 },
  { lon: -80, lat: 35 }, { lon: -122, lat: 45 }, { lon: -81, lat: 27 },
  { lon: 16, lat: 0 }, { lon: 37, lat: 0 }, { lon: 25, lat: -25 }, { lon: 47, lat: -20 },
  { lon: 78, lat: 22 }, { lon: 110, lat: 30 }, { lon: 114, lat: 0 }, { lon: 107, lat: -7 }, { lon: 145, lat: -20 },
] as const;

async function main() {
  const base = process.env.NEXT_PUBLIC_TITILER_BASE_URL!;
  const cog = process.env.NEXT_PUBLIC_COG_URL!;
  const signal = AbortSignal.timeout(20000);
  const before = await fetch(cog, { method: 'HEAD', signal });
  if (before.headers.get('etag') !== HABITAT_SOURCE_V1.etag) throw new Error('Source revision mismatch');
  const window = sourceWindowAt(POINT.lon, POINT.lat, 8);
  const shares = await fetchHabitatHistogram(POINT.lon, POINT.lat, { fetch, baseUrl: base, cogUrl: cog, signal });
  const choice = chooseStride(shares);
  const blockUrl = extractionUrl(base, cog, window, false, { resampling: 'nearest', outputSize: 48 });
  const blockRgbaUrl = extractionUrl(base, cog, window, true, { resampling: 'nearest', outputSize: 48 });
  const modeUrl = extractionUrl(base, cog, window, false, { resampling: 'mode', outputSize: 6 });
  const [blockBytes, blockRgbaBytes, modeBytes] = await Promise.all([
    readBoundedTerrainResponse(await fetch(blockUrl, { signal })),
    readBoundedTerrainResponse(await fetch(blockRgbaUrl, { signal })),
    readBoundedTerrainResponse(await fetch(modeUrl, { signal })),
  ]);
  const block = decodeTerrainNumpy(blockBytes, 'raw', 48);
  const blockRgba = decodeTerrainNumpy(blockRgbaBytes, 'rgba', 48);
  const mode = decodeTerrainNumpy(modeBytes, 'raw', 6);
  const local = majorityGrid(block, 8);
  const titiler = Array.from({ length: 6 }, (_, x) => Array.from({ length: 6 }, (_, y) => {
    const i = y * 6 + x;
    return { code: mode[i], valid: mode[36 + i] !== 0 && mode[i] !== 0 };
  }));
  const honorsMode = JSON.stringify(local) === JSON.stringify(titiler);
  const after = await fetch(cog, { method: 'HEAD', signal });
  if (after.headers.get('etag') !== before.headers.get('etag')) throw new Error('Source changed');
  const dir = 'tests/fixtures/terrain';
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/costa-rica-stride8-block.npy`, blockBytes);
  writeFileSync(`${dir}/costa-rica-stride8-block-rgba.npy`, blockRgbaBytes);
  writeFileSync(`${dir}/costa-rica-stride8-mode.npy`, modeBytes);
  const snapshot = snapshotFromArrays(block, blockRgba, window, {}, 'costa-rica-stride8', new Date().toISOString(), {
    dominantShare: choice.dominantShare, chosen: 8,
  });
  writeFileSync(`${dir}/costa-rica-stride8.json`, JSON.stringify(snapshot) + '\n');
  const provenance = {
    recordedAt: new Date().toISOString(), point: POINT, source: HABITAT_SOURCE_V1, sourceWindow: window,
    stride: 8, histogram: shares, strideChoice: choice, honorsModeResampling: honorsMode,
    localMode: local, titilerMode: titiler,
    files: [
      { name: 'costa-rica-stride8-block.npy', sha256: createHash('sha256').update(blockBytes).digest('hex') },
      { name: 'costa-rica-stride8-block-rgba.npy', sha256: createHash('sha256').update(blockRgbaBytes).digest('hex') },
      { name: 'costa-rica-stride8-mode.npy', sha256: createHash('sha256').update(modeBytes).digest('hex') },
    ],
  };
  writeFileSync(`${dir}/provenance-stride8.json`, JSON.stringify(provenance, null, 2) + '\n');
  console.log(JSON.stringify({ window, honorsMode, choice, classes: [...new Set(snapshot.cells.flat().filter(c => c.valid).map(c => c.code))] }, null, 2));
}

async function variety() {
  const base = process.env.NEXT_PUBLIC_TITILER_BASE_URL!;
  const cog = process.env.NEXT_PUBLIC_COG_URL!;
  const signal = AbortSignal.timeout(120000);
  const rows: Array<{ lon: number; lat: number; stride8: number; stride16: number }> = [];
  for (const point of VARIETY_POINTS) {
    const [eight, sixteen] = await Promise.all(([8, 16] as const).map(async stride => {
      const window = sourceWindowAt(point.lon, point.lat, stride);
      const bytes = await readBoundedTerrainResponse(await fetch(extractionUrl(base, cog, window, false, { resampling: 'nearest', outputSize: 6 * stride }), { signal }));
      const raw = decodeTerrainNumpy(bytes, 'raw', 6 * stride);
      const grid = majorityGrid(raw, stride);
      return new Set(grid.flat().filter(cell => cell.valid).map(cell => cell.code)).size;
    }));
    rows.push({ ...point, stride8: eight, stride16: sixteen });
  }
  const count = (key: 'stride8' | 'stride16') => rows.filter(row => row[key] >= 3).length;
  console.log(JSON.stringify({ n: rows.length, atLeast3: { stride8: count('stride8'), stride16: count('stride16') }, rows }, null, 2));
}

async function site(lon: number, lat: number, slug: string) {
  const base = process.env.NEXT_PUBLIC_TITILER_BASE_URL!;
  const cog = process.env.NEXT_PUBLIC_COG_URL!;
  const signal = AbortSignal.timeout(20000);
  const window = sourceWindowAt(lon, lat, 8);
  const shares = await fetchHabitatHistogram(lon, lat, { fetch, baseUrl: base, cogUrl: cog, signal });
  const bytes = await readBoundedTerrainResponse(await fetch(extractionUrl(base, cog, window, false, { resampling: 'nearest', outputSize: 48 }), { signal }));
  const rgbaBytes = await readBoundedTerrainResponse(await fetch(extractionUrl(base, cog, window, true, { resampling: 'nearest', outputSize: 48 }), { signal }));
  const snapshot = snapshotFromArrays(
    decodeTerrainNumpy(bytes, 'raw', 48), decodeTerrainNumpy(rgbaBytes, 'rgba', 48),
    window, {}, slug, new Date().toISOString(), { dominantShare: chooseStride(shares).dominantShare, chosen: 8 },
  );
  writeFileSync(`tests/fixtures/terrain/${slug}.json`, JSON.stringify(snapshot) + '\n');
  const classes = [...new Set(snapshot.cells.flat().filter(cell => cell.valid).map(cell => cell.code))];
  console.log(JSON.stringify({ lon, lat, window, classes, classCount: classes.length }));
}

const command = process.argv[2];
const run = command === 'variety' ? variety()
  : command === 'site' ? site(Number(process.argv[3]), Number(process.argv[4]), process.argv[5] ?? 'site')
    : main();
void run.catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
