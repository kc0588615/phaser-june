import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  METHOD_FRICTION_OBSTACLES,
  METHOD_VERB_RULES,
  METHOD_VERB_RULE_COPY,
  generateSurveyZones,
  methodFrictionForObstacles,
  verbContribution,
  zoneContainsCell,
  type SurveyZone,
  type VerbMatchContext,
} from '@/expedition/methodVerbs';
import { METHOD_TYPES } from '@/expedition/domain';

const baseContext: VerbMatchContext = {
  isCascade: false,
  movesSinceCountingMatch: null,
  cells: [[0, 0], [1, 0], [2, 0]],
  zones: [],
};

test('every method has a verb rule and player copy', () => {
  for (const method of METHOD_TYPES) {
    assert.ok(METHOD_VERB_RULES[method]);
    assert.ok(METHOD_VERB_RULE_COPY[method].length > 0);
  }
});

test('all verbs share the base contribution formula and reject sub-3 groups', () => {
  for (const method of METHOD_TYPES) {
    assert.equal(verbContribution(method, 2, baseContext), 0);
  }
  assert.equal(verbContribution('analyze', 3, baseContext), 1);
  assert.equal(verbContribution('analyze', 4, baseContext), 2);
  assert.equal(verbContribution('analyze', 5, baseContext), 3);
});

test('track counts only on a fresh trail; first find always counts', () => {
  assert.equal(verbContribution('track', 3, { ...baseContext, movesSinceCountingMatch: null }), 1);
  assert.equal(verbContribution('track', 3, { ...baseContext, movesSinceCountingMatch: 0 }), 1);
  assert.equal(verbContribution('track', 3, { ...baseContext, movesSinceCountingMatch: 1 }), 1);
  assert.equal(verbContribution('track', 3, { ...baseContext, movesSinceCountingMatch: 2 }), 0);
  assert.equal(verbContribution('track', 5, { ...baseContext, movesSinceCountingMatch: 7 }), 0);
});

test('observe counts only matches of 4 or more', () => {
  assert.equal(verbContribution('observe', 3, baseContext), 0);
  assert.equal(verbContribution('observe', 4, baseContext), 2);
  assert.equal(verbContribution('observe', 5, baseContext), 3);
});

test('survey counts only matches touching a zone; no zones falls back to baseline', () => {
  const zones: SurveyZone[] = [{ x: 2, y: 0, width: 2, height: 3 }];
  const inside: VerbMatchContext = { ...baseContext, zones, cells: [[0, 0], [1, 0], [2, 0]] };
  const outside: VerbMatchContext = { ...baseContext, zones, cells: [[4, 4], [5, 4], [6, 4]] };
  assert.equal(verbContribution('survey', 3, inside), 1);
  assert.equal(verbContribution('survey', 3, outside), 0);
  assert.equal(verbContribution('survey', 3, { ...outside, zones: [] }), 1);
});

test('listen doubles cascade contributions and keeps direct ones flat', () => {
  assert.equal(verbContribution('listen', 3, { ...baseContext, isCascade: false }), 1);
  assert.equal(verbContribution('listen', 3, { ...baseContext, isCascade: true }), 2);
  assert.equal(verbContribution('listen', 5, { ...baseContext, isCascade: true }), 6);
});

test('zoneContainsCell respects zone bounds', () => {
  const zone: SurveyZone = { x: 1, y: 2, width: 3, height: 2 };
  assert.equal(zoneContainsCell(zone, [1, 2]), true);
  assert.equal(zoneContainsCell(zone, [3, 3]), true);
  assert.equal(zoneContainsCell(zone, [4, 2]), false);
  assert.equal(zoneContainsCell(zone, [1, 4]), false);
});

test('friction hints fire only when a node obstacle stresses the verb', () => {
  assert.equal(typeof methodFrictionForObstacles('track', ['mud_tiles']), 'string');
  assert.equal(methodFrictionForObstacles('track', ['overgrowth']), null);
  assert.equal(methodFrictionForObstacles('observe', ['low_visibility', 'mud_tiles']), 'Poor sightlines here — a long look takes setup.');
  assert.equal(methodFrictionForObstacles('listen', ['junk_blockers']), 'Noisy site — chain reactions are harder to ride.');
  assert.equal(methodFrictionForObstacles('analyze', ['mud_tiles', 'low_visibility', 'junk_blockers']), null);
  assert.equal(methodFrictionForObstacles('survey', []), null);
  assert.equal(methodFrictionForObstacles('survey', undefined), null);
  for (const method of METHOD_TYPES) assert.ok(Array.isArray(METHOD_FRICTION_OBSTACLES[method]));
});

test('survey zones are deterministic, in bounds, non-overlapping, and avoid blockers', () => {
  const blocked = [{ x: 3, y: 3 }, { x: 4, y: 3 }];
  const first = generateSurveyZones(12345, 7, 8, blocked);
  const second = generateSurveyZones(12345, 7, 8, blocked);
  assert.deepEqual(first, second);
  assert.equal(first.length, 2);
  for (const zone of first) {
    assert.ok(zone.x >= 0 && zone.x + zone.width <= 7);
    assert.ok(zone.y >= 0 && zone.y + zone.height <= 8);
    for (const cell of blocked) {
      assert.equal(zoneContainsCell(zone, [cell.x, cell.y]), false);
    }
  }
  const [zoneA, zoneB] = first;
  const overlaps = zoneA.x < zoneB.x + zoneB.width && zoneB.x < zoneA.x + zoneA.width
    && zoneA.y < zoneB.y + zoneB.height && zoneB.y < zoneA.y + zoneA.height;
  assert.equal(overlaps, false);

  const differentSeed = generateSurveyZones(54321, 7, 8, blocked);
  assert.notDeepEqual(first, differentSeed);
});
