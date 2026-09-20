import { HABITAT_SOURCE_V1 as SOURCE } from './source';
import { TERRAIN_NEUTRAL_COLOR, TERRAIN_SIZE, terrainCellId, type TerrainSnapshotV1 } from './terrain';
import { parseRoutingScenario, type RoutingScenario } from './routing';

export const COSTA_RICA_ROUTING_SCENARIO_ID = 'costa-rica-camp-crossing-survey-v1';

/** Authored sockets on the recorded clip. Habitat 1403 is context, not a ford. */
export function costaRicaRoutingScenario(terrain: TerrainSnapshotV1): RoutingScenario {
  const camp = terrain.cells[0][5];
  const survey = terrain.cells[5][0];
  const from = terrain.cells[2][4];
  const to = terrain.cells[4][4];
  const barrierIds = Array.from({ length: TERRAIN_SIZE }, (_, y) => terrain.cells[3][y].id);
  const parsed = parseRoutingScenario({
    version: 1, id: COSTA_RICA_ROUTING_SCENARIO_ID, terrainId: terrain.id,
    campId: camp.id, surveyId: survey.id, barrierIds, crossing: { fromId: from.id, toId: to.id },
  }, terrain);
  if (!parsed) throw new Error('Costa Rica routing sockets do not fit this snapshot');
  return parsed;
}

export function syntheticRoutingTerrain(spec: {
  id?: string;
  invalid?: ReadonlyArray<readonly [number, number]>;
  codes?: ReadonlyArray<readonly [number, number, number]>;
} = {}): TerrainSnapshotV1 {
  const id = spec.id ?? 'synthetic-routing';
  const invalid = new Set((spec.invalid ?? []).map(([x, y]) => `${x},${y}`));
  const codeAt = new Map((spec.codes ?? []).map(([x, y, code]) => [`${x},${y}`, code]));
  const cells = Array.from({ length: TERRAIN_SIZE }, (_, x) => Array.from({ length: TERRAIN_SIZE }, (_, y) => {
    const missing = invalid.has(`${x},${y}`);
    const code = missing ? 0 : codeAt.get(`${x},${y}`) ?? 106;
    return {
      id: terrainCellId(SOURCE.revision, x, y), code, valid: !missing && code !== 0,
      label: missing || code === 0 ? 'No habitat data' : 'Forest - Subtropical-tropical moist lowland',
      color: missing || code === 0 ? TERRAIN_NEUTRAL_COLOR : '#2af434',
    };
  }));
  return {
    version: 1, id, datasetRevision: SOURCE.revision, mappingVersion: SOURCE.mappingVersion,
    extractedAt: '2026-09-19T00:00:00.000Z', sourceCrs: 'EPSG:3857', transform: SOURCE.transform,
    sourceWindow: { col: 0, row: 0, stride: 1 }, width: 6, height: 6, cells,
  };
}

export function syntheticRoutingScenario(terrain: TerrainSnapshotV1, barrierX = 3): RoutingScenario {
  const barrierIds = Array.from({ length: TERRAIN_SIZE }, (_, y) => terrain.cells[barrierX][y].id);
  const parsed = parseRoutingScenario({
    version: 1, id: 'synthetic-camp-crossing-survey', terrainId: terrain.id,
    campId: terrain.cells[0][5].id, surveyId: terrain.cells[5][0].id, barrierIds,
    crossing: { fromId: terrain.cells[barrierX - 1][4].id, toId: terrain.cells[barrierX + 1][4].id },
  }, terrain);
  if (!parsed) throw new Error('Synthetic routing sockets do not fit this snapshot');
  return parsed;
}
