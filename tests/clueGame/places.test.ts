// The habitat picture's TiTiler URL. A box past 180° fails silently (the
// picture just hides), so no playtest of an ordinary place would notice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { habitatSnapshotUrl } from '@/clueGame/places';

test('habitatSnapshotUrl pads the box, keeps it on the map, and asks for the habitat colors', () => {
  const url = new URL(habitatSnapshotUrl([170, 80, 179.9, 84], 'https://tiles.example/', 'https://cog.example/h.tif'));
  assert.equal(url.pathname, '/cog/bbox/169.505,79.8,180,84.2.png', '5% (at least 0.2°) padding, clamped to 180°E');
  assert.equal(url.searchParams.get('colormap_name'), 'habitat_custom');
  assert.equal(url.searchParams.get('url'), 'https://cog.example/h.tif');
  assert.equal(url.searchParams.get('max_size'), '512');
});
