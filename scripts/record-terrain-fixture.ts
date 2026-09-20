import { config } from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { extractionUrl, readBoundedTerrainResponse, sourceWindowAt } from '../src/terrain/extract.server';
import { decodeTerrainNumpy } from '../src/terrain/numpy.server';
import { HABITAT_SOURCE_V1 } from '../src/terrain/source';

config({ path: '.env.local', quiet: true });
async function main() {
  try {
    const base = process.env.NEXT_PUBLIC_TITILER_BASE_URL!;
    const cog = process.env.NEXT_PUBLIC_COG_URL!;
    const signal = AbortSignal.timeout(20000);
    const before = await fetch(cog, { method: 'HEAD', signal });
    if (before.headers.get('etag') !== HABITAT_SOURCE_V1.etag) throw new Error('Source revision mismatch');
    const window = sourceWindowAt(-84.1, 10.4);
    const files = await Promise.all(([false, true] as const).map(async colors => {
      const bytes = await readBoundedTerrainResponse(await fetch(extractionUrl(base, cog, window, colors), { signal }));
      const values = decodeTerrainNumpy(bytes, colors ? 'rgba' : 'raw');
      return { name: colors ? 'costa-rica-rgba.npy' : 'costa-rica-raw.npy', bytes, values };
    }));
    const after = await fetch(cog, { method: 'HEAD', signal });
    if (after.headers.get('etag') !== before.headers.get('etag')) throw new Error('Source changed');
    const dir = 'tests/fixtures/terrain';
    mkdirSync(dir, { recursive: true });
    for (const file of files) writeFileSync(`${dir}/${file.name}`, file.bytes);
    const provenance = { recordedAt: new Date().toISOString(), point: { lon: -84.1, lat: 10.4 },
      source: HABITAT_SOURCE_V1, sourceWindow: window, endpoint: '/cog/bbox/{bounds}/6x6.npy',
      parameters: { coord_crs: 'epsg:3857', dst_crs: 'epsg:3857', bidx: 1, resampling: 'nearest', return_mask: true },
      files: files.map(file => ({ name: file.name, sha256: createHash('sha256').update(file.bytes).digest('hex'), values: file.values })),
    };
    writeFileSync(`${dir}/provenance.json`, JSON.stringify(provenance, null, 2) + '\n');
    console.log(JSON.stringify({ window, raw: files[0].values, palette: [...new Set(files[0].values.slice(0, 36))].map(code => {
      const i = files[0].values.indexOf(code); return { code, rgba: [0, 36, 72, 108].map(offset => files[1].values[offset + i]) };
    }) }));
  } catch (error) { console.error(error instanceof Error ? error.message : 'Fixture recording failed'); process.exitCode = 1; }
}
void main();
