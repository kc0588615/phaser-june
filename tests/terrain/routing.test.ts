import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyExtensionChoice, applyTravel, connectedIds, frontierIds, geographicNeighbors, inkMatchedGround,
  initialRoutingState, parseRoutingState, publicRoutingView, sharesLegalTraversalEdge,
  type RoutingState, type SpatialMatchDelta,
} from '@/terrain/routing';
import { costaRicaRoutingScenario, syntheticRoutingScenario, syntheticRoutingTerrain } from '@/terrain/routingScenario';
import { loadCostaRicaTerrain } from '@/terrain/routingFixture.server';
import { measureRoutingBudget, ROUTING_MEASUREMENT_SEEDS } from '@/terrain/routingBudget';

const spatial = (
  direct: Array<readonly [number, number]>,
  cascade: Array<readonly [number, number]> = [],
  threePlus: Array<readonly [number, number]> = direct.length >= 3 ? direct : [],
  fourPlus = false,
): SpatialMatchDelta => ({
  directCells: direct, cascadeCells: cascade, directThreePlusCells: threePlus, directFourPlus: fourPlus,
});

test('Costa Rica sockets sit on recorded ground; barrier is authored, not inferred from 1403', () => {
  const terrain = loadCostaRicaTerrain();
  const scenario = costaRicaRoutingScenario(terrain);
  assert.equal(terrain.cells[2][4].code, 1403);
  assert.equal(scenario.campId, terrain.cells[0][5].id);
  assert.equal(scenario.surveyId, terrain.cells[5][0].id);
  assert.equal(scenario.crossing.fromId, terrain.cells[2][4].id);
  assert.equal(scenario.crossing.toId, terrain.cells[4][4].id);
  assert.equal(scenario.barrierIds.length, 6);
  assert.ok(scenario.barrierIds.includes(terrain.cells[3][4].id));
  assert.ok(!scenario.barrierIds.includes(terrain.cells[2][4].id));
});

test('geographic neighbors never wrap; puzzle-edge slots stay disconnected', () => {
  assert.deepEqual(geographicNeighbors(0, 0).sort(), [[1, 0], [0, 1]].sort());
  assert.deepEqual(geographicNeighbors(5, 5).sort(), [[4, 5], [5, 4]].sort());
  const terrain = syntheticRoutingTerrain();
  const scenario = syntheticRoutingScenario(terrain);
  let state = initialRoutingState(scenario);
  state = { ...state, inkedIds: [...state.inkedIds, terrain.cells[5][5].id].sort() };
  const connected = connectedIds(state, scenario, terrain);
  assert.ok(connected.has(scenario.campId));
  assert.ok(!connected.has(terrain.cells[5][5].id));
  assert.equal(applyTravel(state, scenario, terrain, terrain.cells[5][5].id).ok, false);
});

test('disconnected ink is stored but only camp-connected ground is travelable', () => {
  const terrain = syntheticRoutingTerrain();
  const scenario = syntheticRoutingScenario(terrain);
  const inked = inkMatchedGround(initialRoutingState(scenario), scenario, terrain, spatial([[5, 0], [4, 0]]));
  assert.ok(inked.inkedIds.includes(terrain.cells[5][0].id));
  const state = { ...initialRoutingState(scenario), inkedIds: inked.inkedIds };
  assert.ok(!connectedIds(state, scenario, terrain).has(scenario.surveyId));
  assert.equal(applyTravel(state, scenario, terrain, scenario.surveyId).ok, false);
});

test('scripted west-bank trail plus one crossing extension reaches the survey once', () => {
  const terrain = syntheticRoutingTerrain();
  const scenario = syntheticRoutingScenario(terrain);
  const path: Array<readonly [number, number]> = [[0, 4], [1, 4], [2, 4]];
  let state: RoutingState = { ...initialRoutingState(scenario), inkedIds: inkMatchedGround(initialRoutingState(scenario), scenario, terrain, spatial(path)).inkedIds };
  assert.ok(connectedIds(state, scenario, terrain).has(scenario.crossing.fromId));
  assert.ok(frontierIds(state, scenario, terrain).includes(scenario.crossing.toId));
  assert.equal(applyTravel(state, scenario, terrain, scenario.crossing.toId).ok, false);
  state = { ...state, pendingExtension: true };
  const opened = applyExtensionChoice(state, scenario, terrain, scenario.crossing.toId);
  assert.ok(opened.ok);
  if (!opened.ok) return;
  state = opened.state;
  assert.equal(state.crossingOpen, true);
  const east: Array<readonly [number, number]> = [[4, 3], [4, 2], [4, 1], [4, 0], [5, 0]];
  state = { ...state, inkedIds: inkMatchedGround(state, scenario, terrain, spatial(east)).inkedIds };
  const first = applyTravel(state, scenario, terrain, scenario.surveyId);
  assert.ok(first.ok && first.ok && first.state.arrived);
  if (!first.ok) return;
  const second = applyTravel(first.state, scenario, terrain, scenario.surveyId);
  assert.ok(second.ok);
  if (!second.ok) return;
  assert.equal(second.state.arrived, true);
  assert.equal(second.state.revision, first.state.revision + 1);
});

test('far bank pre-inked by cascade, extension still opens crossing', () => {
  const terrain = syntheticRoutingTerrain();
  const scenario = syntheticRoutingScenario(terrain);
  const west: Array<readonly [number, number]> = [[0, 4], [1, 4], [2, 4]];
  let state: RoutingState = {
    ...initialRoutingState(scenario),
    inkedIds: inkMatchedGround(initialRoutingState(scenario), scenario, terrain, spatial(west, [[4, 4]])).inkedIds,
    pendingExtension: true,
  };
  assert.ok(state.inkedIds.includes(scenario.crossing.toId));
  assert.equal(state.crossingOpen, false);
  assert.ok(frontierIds(state, scenario, terrain).includes(scenario.crossing.toId));
  const opened = applyExtensionChoice(state, scenario, terrain, scenario.crossing.toId);
  assert.ok(opened.ok);
  if (!opened.ok) return;
  assert.equal(opened.state.crossingOpen, true);
  assert.ok(connectedIds(opened.state, scenario, terrain).has(scenario.crossing.toId));
});

test('adjacent direct three, overlap, and larger matches grant at most one extension', () => {
  const terrain = syntheticRoutingTerrain();
  const scenario = syntheticRoutingScenario(terrain);
  const start = initialRoutingState(scenario);
  const adjacent = [[0, 4], [0, 3], [1, 3]] as const;
  const three = inkMatchedGround(start, scenario, terrain, spatial([...adjacent], [], [...adjacent]));
  assert.equal(three.touchedTrail, true);
  assert.equal(three.grantedExtension, true);
  const overlap = [[0, 5], [0, 4], [1, 5]] as const;
  assert.equal(inkMatchedGround(start, scenario, terrain, spatial([...overlap], [], [...overlap])).grantedExtension, true);
  const five = [[0, 4], [0, 3], [0, 2], [0, 1], [0, 0]] as const;
  assert.equal(inkMatchedGround(start, scenario, terrain, spatial([...five], [], [...five], true)).grantedExtension, true);
  const twoGroups = [[0, 4], [0, 3], [1, 3], [1, 5], [2, 5], [2, 4]] as const;
  assert.equal(inkMatchedGround(start, scenario, terrain, spatial([...twoGroups], [], [...twoGroups], true)).grantedExtension, true);
});

test('distant matches, detached ink, and cascade-only adjacency do not grant', () => {
  const terrain = syntheticRoutingTerrain();
  const scenario = syntheticRoutingScenario(terrain);
  const start = initialRoutingState(scenario);
  const distant = [[5, 0], [4, 0], [5, 1]] as const;
  const far = inkMatchedGround(start, scenario, terrain, spatial([...distant], [], [...distant], true));
  assert.equal(far.touchedTrail, false);
  assert.equal(far.grantedExtension, false);
  const detached = { ...start, inkedIds: [...start.inkedIds, terrain.cells[5][5].id].sort() };
  const nearDetached = [[5, 4], [4, 5], [4, 4]] as const;
  assert.equal(inkMatchedGround(detached, scenario, terrain, spatial([...nearDetached], [], [...nearDetached])).touchedTrail, false);
  const cascadeAdj = [[0, 4], [0, 3], [1, 3]] as const;
  const cascadeOnly = inkMatchedGround(start, scenario, terrain, spatial([], [...cascadeAdj], []));
  assert.equal(cascadeOnly.grantedExtension, false);
  assert.ok(cascadeOnly.inkedIds.includes(terrain.cells[0][4].id));
});

test('wrap and closed-barrier edges are not legal trail touches', () => {
  const terrain = syntheticRoutingTerrain();
  const scenario = syntheticRoutingScenario(terrain);
  const start = initialRoutingState(scenario);
  assert.equal(sharesLegalTraversalEdge(scenario, terrain, false, terrain.cells[0][5].id, terrain.cells[5][5].id), false);
  const wrap = [[5, 5], [5, 4], [4, 5]] as const;
  assert.equal(inkMatchedGround(start, scenario, terrain, spatial([...wrap], [], [...wrap])).touchedTrail, false);
  const nearBank = {
    ...start,
    inkedIds: inkMatchedGround(start, scenario, terrain, spatial([[0, 4], [1, 4], [2, 4]])).inkedIds,
  };
  assert.equal(sharesLegalTraversalEdge(scenario, terrain, false, scenario.crossing.fromId, scenario.crossing.toId), false);
  const far = [[4, 4], [4, 3], [4, 5]] as const;
  assert.equal(inkMatchedGround(nearBank, scenario, terrain, spatial([...far], [], [...far])).touchedTrail, false);
  assert.equal(sharesLegalTraversalEdge(scenario, terrain, true, scenario.crossing.fromId, scenario.crossing.toId), true);
});

test('empty frontier auto-skips; skip and illegal extend are deterministic', () => {
  const terrain = syntheticRoutingTerrain({ invalid: [[0, 4], [1, 5]] });
  const scenario = syntheticRoutingScenario(terrain);
  const start = initialRoutingState(scenario);
  const isolated = inkMatchedGround(start, scenario, terrain, spatial([[5, 0], [4, 0], [5, 1]], [], [[5, 0], [4, 0], [5, 1]], true));
  assert.equal(isolated.grantedExtension, false);
  const pending = { ...start, pendingExtension: true, inkedIds: inkMatchedGround(start, scenario, terrain, spatial([[0, 4]])).inkedIds };
  const skipped = applyExtensionChoice(pending, scenario, terrain, null);
  assert.ok(skipped.ok);
  if (!skipped.ok) return;
  assert.equal(skipped.state.pendingExtension, false);
  assert.equal(applyExtensionChoice(start, scenario, terrain, terrain.cells[5][0].id).ok, false);
  assert.equal(applyExtensionChoice(pending, scenario, terrain, terrain.cells[5][0].id).ok, false);
});

test('barrier matches do not ink; forged arrival has no command other than legal travel', () => {
  const terrain = syntheticRoutingTerrain();
  const scenario = syntheticRoutingScenario(terrain);
  const inked = inkMatchedGround(initialRoutingState(scenario), scenario, terrain, spatial([[3, 4], [3, 5]]));
  assert.ok(!inked.inkedIds.includes(terrain.cells[3][4].id));
  const state = initialRoutingState(scenario);
  assert.equal(applyTravel(state, scenario, terrain, scenario.surveyId).ok, false);
});

test('resume restores pending extension and public view', () => {
  const terrain = syntheticRoutingTerrain();
  const scenario = syntheticRoutingScenario(terrain);
  const pending = {
    ...initialRoutingState(scenario),
    revision: 4, pendingExtension: true, movesUsed: 2, fourPlusCount: 1,
    inkedIds: inkMatchedGround(initialRoutingState(scenario), scenario, terrain, spatial([[0, 4], [1, 4], [2, 4]])).inkedIds,
    lastAction: { kind: 'move' as const, digest: 'a'.repeat(64) },
  };
  const parsed = parseRoutingState(pending, scenario, terrain);
  assert.ok(parsed);
  if (!parsed) return;
  assert.equal(parsed.pendingExtension, true);
  const view = publicRoutingView(parsed, scenario, terrain);
  assert.ok(view.frontierIds.includes(scenario.crossing.toId));
  assert.ok(view.reachableIds.includes(scenario.crossing.fromId));
  assert.ok(!view.reachableIds.includes(scenario.crossing.toId));
  assert.equal(parseRoutingState({ ...pending, partyId: scenario.crossing.toId }, scenario, terrain), null);
  assert.equal(parseRoutingState({ ...pending, partyId: 'not-a-cell' }, scenario, terrain), null);
});

test('greedy six-move measurement records old 4+ vs trail-adjacent 3+ without changing the budget', () => {
  const terrain = loadCostaRicaTerrain();
  const scenario = costaRicaRoutingScenario(terrain);
  const report = measureRoutingBudget(terrain, scenario, ROUTING_MEASUREMENT_SEEDS);
  assert.equal(report.seeds, 10);
  assert.equal(report.moves, 60);
  assert.ok(report.fourPlusRate >= 0 && report.fourPlusRate <= 1);
  assert.ok(report.trailTouchRate >= 0 && report.trailTouchRate <= 1);
  assert.ok(report.reachRate >= 0 && report.reachRate <= 1);
  console.log(`routing budget sample: old 4+ ${report.fourPlusMoves}/${report.moves} (${report.fourPlusRate.toFixed(3)}); trail-3+ ${report.trailTouchMoves}/${report.moves} (${report.trailTouchRate.toFixed(3)}); greedy reach ${report.reached}/${report.seeds} (${report.reachRate.toFixed(3)})`);
});
