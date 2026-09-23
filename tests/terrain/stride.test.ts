import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseStride, parseHabitatShares } from '@/lib/habitatHistogram';
import { extractSiteTerrains, majorityCell, majorityGrid, snapshotFromArrays, sourceWindowAt, TerrainExtractionError } from '@/terrain/extract.server';
import { encodeTerrainNumpy } from '@/terrain/numpy.server';
import { HABITAT_SOURCE_V1 as SOURCE } from '@/terrain/source';
import { parseTerrainSnapshot, terrainBounds, terrainCellId, terrainCorner } from '@/terrain/terrain';
import { TerrainMapController } from '@/terrain/mapTerrain';

function stats(categorical: Record<string, number>) {
  return { features: [{ properties: { statistics: { b1: { categorical } } } }] };
}

function solidBlock(stride: 8 | 16, code = 106): number[] {
  const size = 6 * stride;
  return [...Array(size * size).fill(code), ...Array(size * size).fill(255)];
}

test('stride choice uses the 10 km histogram threshold and fails closed to 8', () => {
  assert.deepEqual(chooseStride(null), { stride: 8, dominantShare: null });
  assert.deepEqual(chooseStride([]), { stride: 8, dominantShare: null });
  assert.equal(parseHabitatShares({}), null);
  const mixed = parseHabitatShares(stats({ 106: 40, 306: 30, 1403: 30, 0: 900 }));
  assert.deepEqual(chooseStride(mixed), { stride: 8, dominantShare: 0.4 });
  const flat = parseHabitatShares(stats({ 306: 70, 106: 30 }));
  assert.deepEqual(chooseStride(flat), { stride: 16, dominantShare: 0.7 });
  const histogram = parseHabitatShares({
    features: [{ properties: { statistics: { b1: { histogram: [[69, 31, 10], [306, 106, 0]] } } } }],
  });
  assert.equal(chooseStride(histogram)?.stride, 8);
  assert.equal(chooseStride(histogram)?.dominantShare, 0.69);
});

test('majority cells: ties take the lowest code; invalid only when under half the pixels are valid', () => {
  const size = 8;
  const codes = Array(size * size).fill(306);
  const masks = Array(size * size).fill(255);
  for (let i = 0; i < 32; i++) codes[i] = 106;
  assert.deepEqual(majorityCell(codes, masks, size, 0, 0, 8), { code: 106, valid: true });
  const half = masks.map((mask, i) => i < 32 ? mask : 0);
  assert.equal(majorityCell(codes, half, size, 0, 0, 8).valid, true);
  const under = masks.map((mask, i) => i < 31 ? mask : 0);
  assert.deepEqual(majorityCell(codes, under, size, 0, 0, 8), { code: 0, valid: false });
});

test('window alignment floors to the stride; stride-1 Costa Rica origin is unchanged', () => {
  assert.deepEqual(sourceWindowAt(-84.1, 10.4), { col: 103621, row: 183195, stride: 1 });
  const eight = sourceWindowAt(-84.1, 10.4, 8);
  assert.equal(eight.col % 8, 0);
  assert.equal(eight.row % 8, 0);
  assert.equal(eight.stride, 8);
  const sixteen = sourceWindowAt(-84.1, 10.4, 16);
  assert.equal(sixteen.col % 16, 0);
  assert.equal(sixteen.row % 16, 0);
  assert.equal(sourceWindowAt(-180, 85.0511287798066, 8).col, 0);
});

test('v1 snapshots keep their id format; v2 ids include stride and parse both ways', () => {
  const v1 = snapshotFromArrays([...Array(36).fill(106), ...Array(36).fill(255)], Array(144).fill(200), sourceWindowAt(-84.1, 10.4), {}, 'v1');
  assert.equal(v1.version, 1);
  assert.equal(v1.cells[0][0].id, terrainCellId(SOURCE.revision, 103621, 183195));
  assert.deepEqual(parseTerrainSnapshot(JSON.parse(JSON.stringify(v1))), v1);
  const window = sourceWindowAt(-84.1, 10.4, 8);
  const v2 = snapshotFromArrays(solidBlock(8), Array(144).fill(200), window, {}, 'v2', '2026-09-20T00:00:00.000Z', { dominantShare: 0.4, chosen: 8 });
  assert.equal(v2.version, 2);
  assert.equal(v2.cells[1][2].id, terrainCellId(SOURCE.revision, window.col + 8, window.row + 16, 8, 2));
  assert.deepEqual(parseTerrainSnapshot(JSON.parse(JSON.stringify(v2))), v2);
  const older = { ...v1, datasetRevision: 'older-source', cells: v1.cells.map(col => col.map(cell => ({ ...cell, id: cell.id.replace(v1.datasetRevision, 'older-source') }))) };
  assert.deepEqual(parseTerrainSnapshot(older), older);
  for (const bad of [
    { ...v2, version: 2, strideReason: { dominantShare: 0.4, chosen: 16 } },
    { ...v2, cells: v2.cells.map(col => col.map(cell => ({ ...cell, id: cell.id.replace(':8:', ':16:') }))) },
  ]) {
    assert.throws(() => parseTerrainSnapshot(bad));
  }
});

test('polygon scaling multiplies cell footprints by stride from the stored transform', () => {
  const origin = { col: 103616, row: 183192, stride: 1 as const };
  const v1 = snapshotFromArrays([...Array(36).fill(106), ...Array(36).fill(255)], Array(144).fill(200), origin, {}, 'p1');
  const v8 = snapshotFromArrays(solidBlock(8), Array(144).fill(200), { ...origin, stride: 8 }, {}, 'p8', '2026-09-20T00:00:00.000Z', { dominantShare: null, chosen: 8 });
  assert.deepEqual(terrainCorner(v8, 0, 0), terrainCorner(v1, 0, 0));
  assert.deepEqual(terrainCorner(v8, 1, 0), terrainCorner(v1, 8, 0));
  const [w1, , e1] = terrainBounds(v1);
  const [w8, , e8] = terrainBounds(v8);
  assert.ok(Math.abs((e8 - w8) / (e1 - w1) - 8) < 1e-6);
});

test('three mixed-stride sites, ETag mismatch, oversize block and mode-resampling fallback', async () => {
  const block = encodeTerrainNumpy(solidBlock(8), 'raw', 48);
  const colors = encodeTerrainNumpy(Array(4 * 48 * 48).fill(200), 'rgba', 48);
  const sixRaw = encodeTerrainNumpy([...Array(36).fill(106), ...Array(36).fill(255)], 'raw');
  const sixRgba = encodeTerrainNumpy(Array(144).fill(200), 'rgba');
  const fetcher = (modeStatus = 200, blockTooBig = false): typeof fetch => async (input, init) => {
    if (init?.method === 'HEAD') return new Response(null, { headers: { etag: SOURCE.etag } });
    if (init?.method === 'POST') return Response.json(stats({ 106: 50, 306: 50 }));
    const url = String(input);
    if (url.includes('/6x6.npy')) {
      if (url.includes('resampling=mode') && modeStatus !== 200) return new Response('no', { status: modeStatus });
      return new Response(url.includes('colormap_name') ? sixRgba : sixRaw);
    }
    if (blockTooBig) return new Response('x', { headers: { 'content-length': '262145' } });
    return new Response(url.includes('colormap_name') ? colors : block);
  };
  const options = { baseUrl: 'https://terrain.test', cogUrl: 'https://source.test' };
  const sites = [{ lon: -84.1, lat: 10.4 }, { lon: -84, lat: 10 }, { lon: -83, lat: 11 }];
  const mixed = await extractSiteTerrains(sites, {}, { ...options, fetch: fetcher(), strides: [8, 16, 8], modeResampling: true });
  assert.deepEqual(mixed.map(t => t.version), [2, 2, 2]);
  assert.deepEqual(mixed.map(t => 'strideReason' in t ? t.sourceWindow.stride : 1), [8, 16, 8]);
  const fallback = await extractSiteTerrains(sites.slice(0, 1), {}, { ...options, fetch: fetcher(503), modeResampling: true, strides: [8] });
  assert.equal(fallback[0].version, 2);
  assert.equal(fallback[0].cells[0][0].code, 106);
  await assert.rejects(extractSiteTerrains(sites.slice(0, 1), {}, { ...options, fetch: fetcher(503, true), modeResampling: true, strides: [8] }), /size limit/);
  await assert.rejects(extractSiteTerrains(sites, {}, { ...options, fetch: async (url, init) => {
    if (init?.method === 'HEAD') return new Response(null, { headers: { etag: 'new-revision' } });
    return fetcher()(url, init);
  } }), /revision changed/);
});

test('majority grid from a raw block matches snapshotFromArrays', () => {
  const stride = 8 as const;
  const size = 48;
  const codes = Array(size * size).fill(306);
  const masks = Array(size * size).fill(255);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) codes[y * size + x] = 1403;
  const raw = [...codes, ...masks];
  const grid = majorityGrid(raw, stride);
  assert.equal(grid[0][0].code, 1403);
  assert.equal(grid[1][0].code, 306);
  const snap = snapshotFromArrays(raw, Array(4 * size * size).fill(255), { col: 103616, row: 183192, stride }, {}, 'block');
  assert.equal(snap.cells[0][0].code, 1403);
  assert.equal(snap.cells[1][0].code, 306);
});

test('Local min zoom widens for stride 8 so a 10 km board can fit', () => {
  const layers = new Map<string, Record<string, unknown>>();
  const sources = new Map<string, { data: GeoJSON.FeatureCollection; setData(data: GeoJSON.FeatureCollection): void }>();
  const events = new Map<string, Set<(...args: never[]) => void>>();
  let limits = [5, 10];
  const map = {
    on: (name: string, cb: (...args: never[]) => void) => { if (!events.has(name)) events.set(name, new Set()); events.get(name)!.add(cb); },
    off: (name: string, cb: (...args: never[]) => void) => events.get(name)?.delete(cb),
    getStyle: () => ({}), stop: () => {}, getCenter: () => [-84, 10], getZoom: () => 7,
    getBearing: () => 0, getPitch: () => 0,
    setMinZoom: (zoom: number) => { assert.ok(zoom <= limits[1]); limits[0] = zoom; },
    setMaxZoom: (zoom: number) => { assert.ok(zoom >= limits[0]); limits[1] = zoom; },
    fitBounds: () => {}, jumpTo: () => {},
    getContainer: () => ({ querySelectorAll: () => [] }),
    getLayer: (id: string) => layers.get(id), getSource: (id: string) => sources.get(id),
    addSource: (id: string, source: { data: GeoJSON.FeatureCollection }) => sources.set(id, { data: source.data, setData(data) { this.data = data; } }),
    addLayer: (layer: { id: string }) => layers.set(layer.id, layer),
    removeLayer: (id: string) => layers.delete(id), removeSource: (id: string) => sources.delete(id), moveLayer: () => {},
    setFilter: () => {}, setLayoutProperty: () => {},
  };
  const terrain = snapshotFromArrays(solidBlock(8), Array(144).fill(200), sourceWindowAt(-84.1, 10.4, 8), {}, 'wide');
  const controller = new TerrainMapController(map as never, () => {});
  controller.update(terrain, 'local', false);
  assert.deepEqual(limits, [8, 20]);
  controller.destroy();
});
