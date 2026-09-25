// Helpers behind the home globe: grouping places, marker colors and points,
// and the habitat snapshot URL.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { classColor, groupLabel, groupPlaces, habitatSnapshotUrl, sightingPoint, type Place } from '@/clueGame/places';

const place = (kind: Place['kind'], name: string, group: string, count: number): Place => ({
  kind, key: `${kind}:${name}`, name, group, speciesIds: Array.from({ length: count }, (_, i) => i + 1),
  bbox: [30, -5, 40, 5], center: [35, 0],
});

describe('groupPlaces', () => {
  test('one kind at a time, groups alphabetical, most animals first', () => {
    const places = [
      place('country', 'Kenya', 'Africa', 3), place('country', 'Chad', 'Africa', 5),
      place('country', 'India', 'Asia', 4), place('wildlife_area', 'Congo Basin', 'Afrotropics', 2),
    ];
    const groups = groupPlaces(places, 'country');
    assert.deepEqual(groups.map(g => g.label), ['Africa', 'Asia']);
    assert.deepEqual(groups[0].places.map(p => p.name), ['Chad', 'Kenya']);
  });

  test('wildlife areas are grouped by realm in plain words', () => {
    assert.equal(groupLabel({ kind: 'wildlife_area', group: 'Afrotropics' }), 'Africa south of the Sahara');
    assert.equal(groupLabel({ kind: 'country', group: 'Africa' }), 'Africa');
  });
});

describe('markers', () => {
  test('green for amphibians and reptiles, amber for mammals', () => {
    assert.equal(classColor('AMPHIBIA'), classColor('REPTILIA'));
    assert.notEqual(classColor('MAMMALIA'), classColor('AMPHIBIA'));
    assert.ok(classColor(null).startsWith('#'));
  });

  test('sighting points stay inside the place, differ by animal, and repeat exactly', () => {
    const kenya = place('country', 'Kenya', 'Africa', 3);
    const points = [1, 2, 3, 4, 5].map(id => sightingPoint(kenya, id));
    for (const [lon, lat] of points) {
      assert.ok(lon >= 30 && lon <= 40 && lat >= -5 && lat <= 5);
    }
    assert.equal(new Set(points.map(p => p.join())).size, 5);
    assert.deepEqual(sightingPoint(kenya, 3), points[2]);
  });
});

describe('habitatSnapshotUrl', () => {
  test('pads the box, keeps it on the map, and asks for the habitat colors', () => {
    const url = new URL(habitatSnapshotUrl([170, 80, 179.9, 84], 'https://tiles.example/', 'https://cog.example/h.tif'));
    assert.equal(url.pathname, '/cog/bbox/169.505,79.8,180,84.2.png', '5% (at least 0.2°) padding, clamped to 180°E');
    assert.equal(url.searchParams.get('colormap_name'), 'habitat_custom');
    assert.equal(url.searchParams.get('url'), 'https://cog.example/h.tif');
    assert.equal(url.searchParams.get('max_size'), '512');
  });
});
