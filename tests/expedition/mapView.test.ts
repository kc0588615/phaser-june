import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveExpeditionMapView, parseExpeditionMapView } from '@/expedition/mapView';

describe('expedition map view', () => {
  test('materializes three public route points with padded bounds', () => {
    const view = deriveExpeditionMapView([
      { waypoint: { lon: 10, lat: 1, name: 'Basecamp' } },
      { waypoint: { lon: 12, lat: 2, name: 'River' } },
      { waypoint: { lon: 14, lat: 3, name: 'Reserve' } },
    ], { lon: 0, lat: 0 }, 'Dry forest');
    assert.deepEqual(view.bounds, [9.2, 0.6, 14.8, 3.4]);
    assert.deepEqual(view.route.map(point => point.nearestFeature), ['Basecamp', 'River', 'Reserve']);
    assert.deepEqual(parseExpeditionMapView(view), view);
  });

  test('uses the selected location when a node lacks a waypoint', () => {
    const view = deriveExpeditionMapView([], { lon: -87, lat: 41 }, null);
    assert.deepEqual(view.route.map(point => [point.lon, point.lat]), [[-87, 41], [-87, 41], [-87, 41]]);
    assert.deepEqual(view.bounds, [-87.25, 40.75, -86.75, 41.25]);
  });

  test('rejects answer-range fields instead of projecting them', () => {
    const value = {
      bounds: [-1, -1, 1, 1],
      route: [0, 1, 2].map(nodeIndex => ({ nodeIndex, lon: nodeIndex - 1, lat: 0, biome: null, nearestFeature: null })),
      speciesRange: { type: 'Polygon', coordinates: [] },
    };
    const parsed = parseExpeditionMapView(value);
    assert.ok(parsed);
    assert.equal('speciesRange' in parsed, false);
  });
});
