import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodeTerrainNumpy } from '@/terrain/numpy.server';
import { extractSiteTerrains, extractionUrl, readBoundedTerrainResponse, snapshotFromArrays, sourceWindowAt, TerrainExtractionError } from '@/terrain/extract.server';
import { encodeTerrainNumpy, TERRAIN_RESPONSE_LIMIT } from '@/terrain/numpy.server';
import { HABITAT_SOURCE_V1 as SOURCE } from '@/terrain/source';
import { parseTerrainSnapshot, selectedTerrainCell, terrainBounds, terrainCorner, terrainGeoJSON, TERRAIN_NEUTRAL_COLOR } from '@/terrain/terrain';
import { projectRunNodes } from '@/lib/runProjection';
import { STATIC_HABITAT_CODE_TO_LABEL } from '@/lib/habitatLabels';

const rawFile = readFileSync('tests/fixtures/terrain/costa-rica-raw.npy');
const rgbaFile = readFileSync('tests/fixtures/terrain/costa-rica-rgba.npy');
const raw = decodeTerrainNumpy(rawFile, 'raw');
const rgba = decodeTerrainNumpy(rgbaFile, 'rgba');
const window = sourceWindowAt(-84.1, 10.4);
const fixture = () => snapshotFromArrays(raw, rgba, window, {}, 'fixture');

test('recorded stride-8 Costa Rica uses the raw-block majority and still parses as v2', () => {
  const block = decodeTerrainNumpy(readFileSync('tests/fixtures/terrain/costa-rica-stride8-block.npy'), 'raw', 48);
  const rgba = decodeTerrainNumpy(readFileSync('tests/fixtures/terrain/costa-rica-stride8-block-rgba.npy'), 'rgba', 48);
  const saved = parseTerrainSnapshot(JSON.parse(readFileSync('tests/fixtures/terrain/costa-rica-stride8.json', 'utf8')));
  const rebuilt = snapshotFromArrays(block, rgba, sourceWindowAt(-84.1, 10.4, 8), {}, saved.id, saved.extractedAt, saved.version === 2 ? saved.strideReason : { dominantShare: null, chosen: 8 });
  assert.equal(saved.version, 2);
  assert.equal(saved.sourceWindow.stride, 8);
  assert.deepEqual(rebuilt.cells.map(col => col.map(cell => cell.code)), saved.cells.map(col => col.map(cell => cell.code)));
  assert.equal(new Set(saved.cells.flat().filter(cell => cell.valid).map(cell => cell.code)).size, 2);
});

test('recorded COG clip: exact values, masks, alignment, colors and column-major orientation', () => {
  assert.deepEqual(window, { col: 103621, row: 183195, stride: 1 });
  assert.deepEqual(raw.slice(0, 36), [306,306,306,306,306,306,106,106,306,306,306,306,106,106,306,306,306,306,106,106,106,306,306,306,106,106,1403,106,106,106,306,306,106,106,106,106]);
  assert.ok(raw.slice(36).every(mask => mask === 255));
  const terrain = fixture();
  assert.equal(terrain.cells[2][4].code, 1403);
  assert.equal(terrain.cells[2][4].label, 'Plantations');
  assert.equal(terrain.cells[2][4].color, '#ff0800');
  assert.equal(terrain.cells[4][2].code, 306);
  assert.equal(terrainGeoJSON(terrain).features.length, 36);
  const polygon = terrainGeoJSON(terrain).features.find(feature => feature.properties?.code === 1403)!;
  assert.deepEqual(polygon.geometry.coordinates[0][0], terrainCorner(terrain, 2, 4));
  const [west, south, east, north] = terrainBounds(terrain);
  assert.ok(west < -84.1 && east > -84.1 && south < 10.4 && north > 10.4);
  assert.ok(Math.abs(west - (103621 / 388996 * 360 - 180)) < 1e-10);
  assert.ok(terrainCorner(terrain, 0, 0)[1] > terrainCorner(terrain, 0, 1)[1]);
  assert.equal(sourceWindowAt(-180, 85.0511287798066).col, 0);
  assert.equal(sourceWindowAt(180, -85.0511287798066).row, SOURCE.height - 6);
  assert.throws(() => sourceWindowAt(0, 86), error => error instanceof TerrainExtractionError && error.status === 422);
  const url = extractionUrl('https://example.test', 'https://source.test/a.tif', window, false);
  assert.equal(url.searchParams.get('coord_crs'), 'epsg:3857');
  assert.equal(url.searchParams.get('dst_crs'), 'epsg:3857');
  const bbox = url.pathname.split('/')[3].split(',').map(Number);
  assert.ok(Math.abs((bbox[2] - bbox[0]) / SOURCE.transform[1] - 6) < 1e-8);
});

test('asymmetric synthetic mask takes precedence over zero, labels and palette', () => {
  const codes = raw.slice(); const colors = rgba.slice();
  codes[0] = 0; codes[1] = 1403; codes[37] = 0; codes[7] = 4242; colors[115] = 0;
  const t = snapshotFromArrays(codes, colors, window, { 0: 'Water', 1403: 'DB plantation' });
  assert.equal(STATIC_HABITAT_CODE_TO_LABEL[0], undefined);
  assert.deepEqual([t.cells[0][0].valid, t.cells[0][0].label], [false, 'No habitat data']);
  assert.deepEqual([t.cells[1][0].valid, t.cells[1][0].label], [false, 'No habitat data']);
  assert.deepEqual([t.cells[1][1].valid, t.cells[1][1].label, t.cells[1][1].color], [true, 'Habitat code 4242', TERRAIN_NEUTRAL_COLOR]);
  assert.equal(t.cells[2][4].label, 'DB plantation');
  assert.equal(t.cells[0][1].valid, true);
  assert.throws(() => snapshotFromArrays(Array(72).fill(0), rgba, window, {}), error => error instanceof TerrainExtractionError && error.status === 422);
});

test('NumPy decoder rejects malformed/truncated/unsupported responses', () => {
  for (const length of [0, 9, 30, rawFile.length - 1]) assert.throws(() => decodeTerrainNumpy(rawFile.subarray(0, length), 'raw'));
  const altered = (offset: number, value: number) => { const bytes = Buffer.from(rawFile); bytes[offset] = value; return bytes; };
  for (const [offset, value] of [[0, 0], [6, 2], [7, 1], [8, 0], [9, 255]]) assert.throws(() => decodeTerrainNumpy(altered(offset, value), 'raw'));
  for (const [from, to] of [["'<u2'", "'>u2'"], ['False', 'True '], ['(2, 6, 6)', '(6, 2, 6)'], ["'shape'", "'other'"]]) {
    const bytes = Buffer.from(rawFile); const header = bytes.subarray(10, 10 + bytes.readUInt16LE(8)).toString('ascii');
    assert.ok(header.includes(from)); bytes.write(header.replace(from, to), 10, 'ascii');
    assert.throws(() => decodeTerrainNumpy(bytes, 'raw'));
  }
  assert.throws(() => decodeTerrainNumpy(rawFile, 'rgba'));
  assert.throws(() => decodeTerrainNumpy(Buffer.concat([rawFile, Buffer.from([0])]), 'raw'));
});

test('response limit applies to content-length and chunked streams', async () => {
  await assert.rejects(readBoundedTerrainResponse(new Response(new Uint8Array(TERRAIN_RESPONSE_LIMIT + 1))));
  await assert.rejects(readBoundedTerrainResponse(new Response('x', { headers: { 'content-length': String(TERRAIN_RESPONSE_LIMIT + 1) } })));
  await assert.rejects(readBoundedTerrainResponse(new Response('error', { status: 503 })));
  assert.equal((await readBoundedTerrainResponse(new Response(encodeTerrainNumpy(Array(72).fill(1), 'raw')))).length > 0, true);
});

test('three concurrent clips guarded by before/after ETags; mismatch and timeout fail closed', async () => {
  const calls: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push(init?.method ?? 'GET');
    return init?.method === 'HEAD' ? new Response(null, { headers: { etag: SOURCE.etag } })
      : new Response(new Uint8Array(String(input).includes('colormap_name') ? rgbaFile : rawFile));
  };
  const options = { baseUrl: 'https://terrain.test', cogUrl: 'https://source.test', fetch: fetcher, modeResampling: true };
  const sites = [{ lon: -84.1, lat: 10.4 }, { lon: -84, lat: 10 }, { lon: -83, lat: 11 }];
  const snapshots = await extractSiteTerrains(sites, {}, options);
  assert.equal(snapshots.length, 3); assert.equal(new Set(snapshots.map(t => t.id)).size, 3);
  assert.equal(new Set(snapshots.map(t => t.cells[0][0].id)).size, 3);
  assert.equal(calls.filter(method => method === 'HEAD').length, 2);
  assert.equal(calls.filter(method => method === 'POST').length, 3);
  assert.equal(calls.filter(method => method === 'GET').length, 6);
  let heads = 0;
  await assert.rejects(extractSiteTerrains(sites, {}, { ...options, fetch: async (url, init) => {
    if (init?.method === 'HEAD' && ++heads === 2) return new Response(null, { headers: { etag: 'new-revision' } });
    return fetcher(url, init);
  } }), /revision changed/);
  await assert.rejects(extractSiteTerrains(sites, {}, { ...options, timeoutMs: 5, fetch: async (_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }) }), /timed out/);
  await assert.rejects(extractSiteTerrains(sites, {}, { ...options, baseUrl: '' }), /not configured/);
});

test('resume projects saved terrain without raster calls or current-revision interpretation; legacy remains optional', () => {
  const terrain = fixture();
  const row = { id: 'node', nodeOrder: 1, nodeType: 'custom', nodeStatus: 'active' };
  assert.equal(projectRunNodes([row])[0].terrain, undefined);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Resume must not fetch terrain'); };
  try {
    assert.deepEqual(projectRunNodes([{ ...row, boardContext: { terrain } }])[0].terrain, terrain);
    const older = { ...terrain, datasetRevision: 'older-source', cells: terrain.cells.map(col => col.map(cell => ({ ...cell, id: cell.id.replace(terrain.datasetRevision, 'older-source') }))) };
    assert.deepEqual(parseTerrainSnapshot(older), older);
    for (const bad of [null, {}, { ...terrain, width: 5 }, { ...terrain, cells: [] }, { ...terrain, sourceWindow: { col: 1e12, row: 0, stride: 1 } }]) {
      assert.throws(() => projectRunNodes([{ ...row, boardContext: { terrain: bad } }]), /Saved terrain is invalid/);
    }
    assert.equal(selectedTerrainCell(terrain, { snapshotId: 'another-site', cellId: terrain.cells[0][0].id }), undefined);
    assert.equal(selectedTerrainCell(terrain, { snapshotId: terrain.id, cellId: terrain.cells[2][4].id })?.code, 1403);
  } finally { globalThis.fetch = originalFetch; }
});
