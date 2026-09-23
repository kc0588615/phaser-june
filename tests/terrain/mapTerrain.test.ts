import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TerrainMapController } from '@/terrain/mapTerrain';
import { snapshotFromArrays, sourceWindowAt } from '@/terrain/extract.server';

function mockMap() {
  const layers = new Map<string, Record<string, unknown>>();
  const sources = new Map<string, { data: GeoJSON.FeatureCollection; setData(data: GeoJSON.FeatureCollection): void }>();
  const events = new Map<string, Set<(...args: any[]) => void>>();
  let camera = { center: [-84, 10], zoom: 7, bearing: 20, pitch: 30 };
  let limits = [5, 10];
  let fitCount = 0;
  const marker = { style: { display: '' } };
  const map = {
    on: (name: string, cb: (...args: any[]) => void) => { if (!events.has(name)) events.set(name, new Set()); events.get(name)!.add(cb); },
    off: (name: string, cb: (...args: any[]) => void) => events.get(name)?.delete(cb),
    getStyle: () => ({}), stop: () => {}, getCenter: () => camera.center, getZoom: () => camera.zoom,
    getBearing: () => camera.bearing, getPitch: () => camera.pitch,
    setMinZoom: (zoom: number) => { assert.ok(zoom <= limits[1]); limits[0] = zoom; },
    setMaxZoom: (zoom: number) => { assert.ok(zoom >= limits[0]); limits[1] = zoom; },
    fitBounds: (_bounds: unknown, options: Record<string, number>) => { assert.equal(options.padding, 24); fitCount++; camera = { center: [-84.1, 10.4], zoom: 15, bearing: options.bearing, pitch: options.pitch }; },
    jumpTo: (next: typeof camera) => { camera = next; },
    getContainer: () => ({ querySelectorAll: () => [marker] }),
    getLayer: (id: string) => layers.get(id), getSource: (id: string) => sources.get(id),
    addSource: (id: string, source: { data: GeoJSON.FeatureCollection }) => sources.set(id, { data: source.data, setData(data) { this.data = data; } }),
    addLayer: (layer: { id: string }) => layers.set(layer.id, layer),
    removeLayer: (id: string) => layers.delete(id), removeSource: (id: string) => sources.delete(id), moveLayer: () => {},
    setFilter: (id: string, filter: unknown) => { layers.get(id)!.filter = filter; },
    setLayoutProperty: (id: string, _key: string, value: string) => { layers.get(id)!.visibility = value; },
    queryRenderedFeatures: () => sources.get('site-terrain')!.data.features.slice(4, 5),
  };
  return { map, layers, sources, events, marker, getCamera: () => camera, getLimits: () => limits, getFits: () => fitCount };
}

test('Local/Region, fullscreen, site changes, style reload and matching cell selection', () => {
  const m = mockMap();
  const terrain = snapshotFromArrays([...Array(36).fill(106), ...Array(36).fill(255)], Array(144).fill(200), sourceWindowAt(-84.1, 10.4), {}, 'site-one');
  const region = m.getCamera();
  const controller = new TerrainMapController(m.map as never, selection => controller.select(selection));
  controller.update(terrain, 'local', false);
  assert.deepEqual(m.getLimits(), [12, 20]); assert.equal(m.getFits(), 1);
  assert.equal(m.getCamera().bearing, 0); assert.equal(m.getCamera().pitch, 0);
  assert.equal(m.marker.style.display, 'none');
  controller.update(terrain, 'local', true);
  assert.deepEqual(m.getLimits(), [12, 20]); assert.equal(m.getFits(), 1);
  m.events.get('click')!.forEach(cb => cb({ point: [0, 0] }));
  assert.deepEqual(m.layers.get('site-terrain-selected')?.filter, ['==', 'id', terrain.cells[0][4].id]);
  controller.select({ snapshotId: terrain.id, cellId: terrain.cells[2][4].id });
  assert.deepEqual(m.layers.get('site-terrain-selected')?.filter, ['==', 'id', terrain.cells[2][4].id]);
  controller.select({ snapshotId: 'other', cellId: terrain.cells[0][0].id });
  assert.deepEqual(m.layers.get('site-terrain-selected')?.filter, ['==', 'id', terrain.cells[2][4].id]);
  controller.update(terrain, 'region', false);
  assert.deepEqual(m.getLimits(), [5, 10]); assert.deepEqual(m.getCamera(), region);
  assert.equal(m.marker.style.display, '');
  assert.equal(m.layers.get('site-terrain-locator')?.visibility, 'visible');
  assert.equal(m.layers.get('site-terrain-fill')?.visibility, 'none');
  const next = { ...terrain, id: 'site-two', sourceWindow: { col: terrain.sourceWindow.col + 20, row: terrain.sourceWindow.row, stride: 1 as const } };
  controller.update(next, 'local', false);
  assert.equal(m.getFits(), 2); assert.deepEqual(m.layers.get('site-terrain-selected')?.filter, ['==', 'id', '']);
  m.sources.clear(); m.layers.clear();
  m.events.get('style.load')!.forEach(cb => cb());
  assert.equal(m.sources.get('site-terrain')?.data.features.length, 37);
  assert.equal(m.layers.size, 5); assert.equal(m.getFits(), 2);
  m.events.get('resize')!.forEach(cb => cb());
  assert.equal(m.getFits(), 3);
  assert.deepEqual(m.getLimits(), [12, 20]);
  controller.update(undefined, 'region', false);
  assert.equal(m.layers.size, 0); assert.deepEqual(m.getLimits(), [5, 10]);
  controller.destroy();
  assert.equal(m.events.get('click')!.size, 0); assert.equal(m.events.get('style.load')!.size, 0);
  assert.equal(m.events.get('resize')!.size, 0);
});
