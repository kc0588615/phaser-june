import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLocationMasteryMetadata,
  buildRunMemoryArtifacts,
  getExpeditionRegionKeys,
  getRunAffinityTags,
  getRunGisStamps,
  resolveCompletedRunRoute,
} from '../../src/lib/runCompletion';
import type { FeatureFingerprint } from '../../src/types/gis';

const fingerprints: FeatureFingerprint[] = [
  { featureClass: 'river', sourceTable: 'rivers', sourceId: 1, name: 'A', distanceM: 0, overlapRatio: 1, properties: {} },
  { featureClass: 'protected_area', sourceTable: 'parks', sourceId: 'P1', name: 'Park', distanceM: 0, overlapRatio: 1, properties: {} },
];

test('correct-run artifacts populate memory, mastery, and card aggregates', () => {
  const route = resolveCompletedRunRoute(-90, 40, [
    { nodeStatus: 'completed', boardContext: { waypoint: { lon: -89, lat: 41 } } },
    { nodeStatus: 'completed', boardContext: { waypoint: { lon: -88, lat: 42 } } },
    { nodeStatus: 'completed', boardContext: { waypoint: { lon: -87, lat: 43 } } },
  ], []);
  const memory = buildRunMemoryArtifacts(route, fingerprints);
  const mastery = buildLocationMasteryMetadata(
    { featureMastery: { featureCounts: { river: 2 }, totalRuns: 1 }, bestScore: 500 },
    fingerprints,
    { runId: 'run-1', finalScore: 750, completedAt: new Date('2026-07-13T12:00:00.000Z') },
  );

  assert.equal(memory.routePolyline.length, 4);
  assert.deepEqual(memory.routePolyline.map(point => point.waypointSlot), [0, undefined, undefined, undefined]);
  assert.deepEqual(memory.routeBounds, { minLon: -90, minLat: 40, maxLon: -87, maxLat: 43 });
  assert.equal(memory.gisFeaturesNearby.length, 2);
  assert.deepEqual(getRunGisStamps(fingerprints), ['river', 'protected_area']);
  assert.deepEqual(getExpeditionRegionKeys({ realm: 'Nearctic', biome: 'Forest', bioregion: 'Great Lakes' }), [
    'realm:Nearctic', 'biome:Forest', 'bioregion:Great Lakes',
  ]);
  assert.deepEqual(getRunAffinityTags({ activeAffinities: ['avian', 'avian', 'feline'] }), ['avian', 'feline']);
  assert.deepEqual(mastery.featureMastery, {
    featureCounts: { river: 3, protected_area: 1 },
    totalRuns: 2,
  });
  assert.equal(mastery.bestScore, 750);
  assert.deepEqual(mastery.lastVisit, {
    runId: 'run-1', completedAt: '2026-07-13T12:00:00.000Z', score: 750,
  });
});
