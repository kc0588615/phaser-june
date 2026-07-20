import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRouteFeature, getMapSiteStatus, globeZoomAdjustment, normalizeEcoregionProperties } from '@/lib/maplibreGeoJSON';
import { CUSTOM_LAYER_ORDER, MAP_LAYER_GROUPS, createFallbackMapStyle } from '@/lib/maplibreStyle';

describe('MapLibre map helpers', () => {
  test('builds network-independent globe and Mercator fallback styles', () => {
    const explore = createFallbackMapStyle('explore');
    const expedition = createFallbackMapStyle('expedition');
    assert.deepEqual(explore.sources, {});
    assert.equal(explore.projection?.type, 'globe');
    assert.ok(explore.sky);
    assert.deepEqual(expedition.sources, {});
    assert.equal(expedition.projection?.type, 'mercator');
    assert.equal(expedition.sky, undefined);
  });

  test('keeps overlay groups and concrete layers in stable order', () => {
    assert.deepEqual(MAP_LAYER_GROUPS, [
      'basemap', 'habitat-raster', 'ecoregions', 'landscape',
      'species-highlight', 'routes', 'markers',
    ]);
    assert.ok(CUSTOM_LAYER_ORDER.indexOf('habitat-raster') < CUSTOM_LAYER_ORDER.indexOf('ecoregion-fill'));
    assert.ok(CUSTOM_LAYER_ORDER.indexOf('species-highlight-fill') < CUSTOM_LAYER_ORDER.indexOf('expedition-route-line'));
    assert.ok(CUSTOM_LAYER_ORDER.indexOf('expedition-route-line') < CUSTOM_LAYER_ORDER.indexOf('region-waypoints'));
  });

  test('normalizes ecoregion properties without leaking invalid values', () => {
    assert.deepEqual(normalizeEcoregionProperties({ ECO_NAME: 'Tallgrass', NNH: '7' }), {
      ECO_NAME: 'Tallgrass',
      BIOME_NAME: '',
      REALM: '',
      COLOR: '#70A800',
      COLOR_BIO: '#38A700',
      NNH: 7,
      NNH_NAME: null,
    });
    assert.equal(normalizeEcoregionProperties({ ECO_NAME: '' }), null);
  });

  test('converts route progress to statuses and GeoJSON', () => {
    assert.equal(getMapSiteStatus(0, 1, false), 'visited');
    assert.equal(getMapSiteStatus(1, 1, false), 'current');
    assert.equal(getMapSiteStatus(2, 1, false), 'upcoming');
    assert.equal(getMapSiteStatus(1, 1, true), 'visited');
    assert.deepEqual(buildRouteFeature([[1, 2], [3, 4]]).geometry.coordinates, [[1, 2], [3, 4]]);
  });

  test('compensates globe zoom when flying toward poles', () => {
    assert.ok(globeZoomAdjustment(0, 70) < 0);
    assert.ok(globeZoomAdjustment(70, 0) > 0);
  });
});
