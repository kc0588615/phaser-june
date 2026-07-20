import assert from 'node:assert/strict';
import test from 'node:test';
import { createRouteProjector } from '../../src/components/ExpeditionRouteMap';

test('route projector preserves longitude and latitude scale', () => {
  const project = createRouteProjector([
    { lon: 0, lat: 0 },
    { lon: 10, lat: 1 },
  ]);
  const start = project(0, 0);
  const end = project(10, 1);
  const pixelsPerLonDegree = Math.abs(end.x - start.x) / 10;
  const pixelsPerLatDegree = Math.abs(end.y - start.y);

  assert.ok(Math.abs(pixelsPerLonDegree - pixelsPerLatDegree) < 0.0001);
});
