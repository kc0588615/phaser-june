import { readFileSync } from 'node:fs';
import { decodeTerrainNumpy } from './numpy.server';
import { snapshotFromArrays, sourceWindowAt } from './extract.server';
import type { TerrainSnapshotV1 } from './terrain';

let cached: TerrainSnapshotV1 | undefined;

export function loadCostaRicaTerrain(): TerrainSnapshotV1 {
  if (cached) return cached;
  const raw = decodeTerrainNumpy(readFileSync('tests/fixtures/terrain/costa-rica-raw.npy'), 'raw');
  const rgba = decodeTerrainNumpy(readFileSync('tests/fixtures/terrain/costa-rica-rgba.npy'), 'rgba');
  const snapshot = snapshotFromArrays(raw, rgba, sourceWindowAt(-84.1, 10.4), {}, 'costa-rica-routing-fixture');
  if (snapshot.version !== 1) throw new Error('Routing fixture must stay on the recorded stride-1 snapshot');
  cached = snapshot;
  return cached;
}
