/** Trail/party state. Never stored on movable BoardCell.state. Geographic adjacency does not wrap. */
import { TERRAIN_SIZE, type TerrainCell, type TerrainSnapshotV1 } from './terrain';

export const ROUTING_MAX_MOVES = 6 as const;

export interface RoutingScenario {
  readonly version: 1;
  readonly id: string;
  readonly terrainId: string;
  readonly campId: string;
  readonly surveyId: string;
  readonly barrierIds: readonly string[];
  readonly crossing: { readonly fromId: string; readonly toId: string };
}

export interface RoutingState {
  readonly version: 1;
  readonly revision: number;
  readonly scenarioId: string;
  readonly terrainId: string;
  readonly inkedIds: readonly string[];
  readonly partyId: string;
  readonly crossingOpen: boolean;
  readonly pendingExtension: boolean;
  readonly arrived: boolean;
  readonly movesUsed: number;
  readonly fourPlusCount: number;
  readonly trailTouchCount: number;
  readonly lastAction: { readonly kind: 'move' | 'extend' | 'travel'; readonly digest: string } | null;
}

export interface PublicRoutingView {
  readonly revision: number;
  readonly movesUsed: number;
  readonly maxMoves: typeof ROUTING_MAX_MOVES;
  readonly pendingExtension: boolean;
  readonly arrived: boolean;
  readonly crossingOpen: boolean;
  readonly partyId: string;
  readonly campId: string;
  readonly surveyId: string;
  readonly crossingFromId: string;
  readonly crossingToId: string;
  readonly inkedIds: readonly string[];
  readonly barrierIds: readonly string[];
  readonly reachableIds: readonly string[];
  readonly frontierIds: readonly string[];
  readonly fourPlusCount: number;
  readonly trailTouchCount: number;
}

export interface SpatialMatchDelta {
  readonly directCells: ReadonlyArray<readonly [number, number]>;
  readonly cascadeCells: ReadonlyArray<readonly [number, number]>;
  readonly directThreePlusCells: ReadonlyArray<readonly [number, number]>;
  readonly directFourPlus: boolean;
}

const CARDINALS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

export function slotOf(terrain: TerrainSnapshotV1, cellId: string): [number, number] | undefined {
  for (let x = 0; x < TERRAIN_SIZE; x++) {
    for (let y = 0; y < TERRAIN_SIZE; y++) {
      if (terrain.cells[x][y].id === cellId) return [x, y];
    }
  }
  return undefined;
}

export function cellAt(terrain: TerrainSnapshotV1, x: number, y: number): TerrainCell | undefined {
  return terrain.cells[x]?.[y];
}

export function cellById(terrain: TerrainSnapshotV1, cellId: string): TerrainCell | undefined {
  const slot = slotOf(terrain, cellId);
  return slot ? cellAt(terrain, slot[0], slot[1]) : undefined;
}

/** 4-neighbor slots that exist on the clip. Never wraps 0↔5. */
export function geographicNeighbors(x: number, y: number): Array<[number, number]> {
  return CARDINALS.flatMap(([dx, dy]) => {
    const nx = x + dx;
    const ny = y + dy;
    return nx >= 0 && nx < TERRAIN_SIZE && ny >= 0 && ny < TERRAIN_SIZE ? [[nx, ny] as [number, number]] : [];
  });
}

export function isGround(scenario: RoutingScenario, cell: TerrainCell | undefined): cell is TerrainCell {
  return !!cell && cell.valid && !scenario.barrierIds.includes(cell.id);
}

/** Orthogonal 4-neighbor on ground, or the authored crossing only while it is open. Never wraps. */
export function sharesLegalTraversalEdge(
  scenario: RoutingScenario, terrain: TerrainSnapshotV1, crossingOpen: boolean, aId: string, bId: string,
): boolean {
  if (aId === bId) return false;
  const a = slotOf(terrain, aId);
  const b = slotOf(terrain, bId);
  const cellA = cellById(terrain, aId);
  const cellB = cellById(terrain, bId);
  if (!a || !b || !isGround(scenario, cellA) || !isGround(scenario, cellB)) return false;
  if (geographicNeighbors(a[0], a[1]).some(([x, y]) => x === b[0] && y === b[1])) return true;
  if (!crossingOpen) return false;
  return (aId === scenario.crossing.fromId && bId === scenario.crossing.toId)
    || (aId === scenario.crossing.toId && bId === scenario.crossing.fromId);
}

/** Pre-move camp-connected trail. Direct 3+ cells must overlap it or share a legal edge with it. */
export function directMatchTouchesTrail(
  state: RoutingState, scenario: RoutingScenario, terrain: TerrainSnapshotV1, spatial: SpatialMatchDelta,
): boolean {
  if (spatial.directThreePlusCells.length === 0) return false;
  const trail = connectedIds(state, scenario, terrain);
  for (const [x, y] of spatial.directThreePlusCells) {
    const cell = cellAt(terrain, x, y);
    if (!isGround(scenario, cell)) continue;
    if (trail.has(cell.id)) return true;
    for (const id of trail) {
      if (sharesLegalTraversalEdge(scenario, terrain, state.crossingOpen, cell.id, id)) return true;
    }
  }
  return false;
}

export function initialRoutingState(scenario: RoutingScenario): RoutingState {
  return {
    version: 1, revision: 0, scenarioId: scenario.id, terrainId: scenario.terrainId,
    inkedIds: [scenario.campId], partyId: scenario.campId, crossingOpen: false,
    pendingExtension: false, arrived: false, movesUsed: 0, fourPlusCount: 0, trailTouchCount: 0, lastAction: null,
  };
}

function inkedSet(state: RoutingState): Set<string> {
  return new Set(state.inkedIds);
}

function addInk(ids: readonly string[], extra: Iterable<string>): string[] {
  const next = new Set(ids);
  for (const id of extra) next.add(id);
  return [...next].sort();
}

export function connectedIds(state: RoutingState, scenario: RoutingScenario, terrain: TerrainSnapshotV1): Set<string> {
  const inked = inkedSet(state);
  const start = scenario.campId;
  if (!inked.has(start) || !isGround(scenario, cellById(terrain, start))) return new Set();
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length) {
    const id = queue.shift()!;
    const slot = slotOf(terrain, id);
    if (!slot) continue;
    for (const [x, y] of geographicNeighbors(slot[0], slot[1])) {
      const cell = cellAt(terrain, x, y);
      if (!cell || seen.has(cell.id) || !inked.has(cell.id) || !isGround(scenario, cell)) continue;
      seen.add(cell.id);
      queue.push(cell.id);
    }
    if (state.crossingOpen) {
      const other = id === scenario.crossing.fromId ? scenario.crossing.toId
        : id === scenario.crossing.toId ? scenario.crossing.fromId : null;
      if (other && inked.has(other) && !seen.has(other) && isGround(scenario, cellById(terrain, other))) {
        seen.add(other);
        queue.push(other);
      }
    }
  }
  return seen;
}

export function frontierIds(state: RoutingState, scenario: RoutingScenario, terrain: TerrainSnapshotV1): string[] {
  const connected = connectedIds(state, scenario, terrain);
  const inked = inkedSet(state);
  const frontier = new Set<string>();
  for (const id of connected) {
    const slot = slotOf(terrain, id);
    if (!slot) continue;
    for (const [x, y] of geographicNeighbors(slot[0], slot[1])) {
      const cell = cellAt(terrain, x, y);
      if (cell && !inked.has(cell.id) && isGround(scenario, cell)) frontier.add(cell.id);
    }
  }
  if (!state.crossingOpen && connected.has(scenario.crossing.fromId)
    && isGround(scenario, cellById(terrain, scenario.crossing.toId))) {
    frontier.add(scenario.crossing.toId);
  }
  return [...frontier].sort();
}

export function inkMatchedGround(
  state: RoutingState, scenario: RoutingScenario, terrain: TerrainSnapshotV1, spatial: SpatialMatchDelta,
): { inkedIds: string[]; grantedExtension: boolean; touchedTrail: boolean } {
  const extra: string[] = [];
  for (const [x, y] of [...spatial.directCells, ...spatial.cascadeCells]) {
    const cell = cellAt(terrain, x, y);
    if (isGround(scenario, cell)) extra.push(cell.id);
  }
  const inkedIds = addInk(state.inkedIds, extra);
  const next = { ...state, inkedIds };
  const touchedTrail = directMatchTouchesTrail(state, scenario, terrain, spatial);
  const grantedExtension = touchedTrail && frontierIds(next, scenario, terrain).length > 0;
  return { inkedIds, grantedExtension, touchedTrail };
}

export function applyExtensionChoice(
  state: RoutingState, scenario: RoutingScenario, terrain: TerrainSnapshotV1, cellId: string | null,
): { ok: true; state: RoutingState } | { ok: false; reason: 'no_pending_extension' | 'illegal_frontier' } {
  if (!state.pendingExtension) return { ok: false, reason: 'no_pending_extension' };
  if (cellId === null) {
    return { ok: true, state: { ...state, pendingExtension: false, revision: state.revision + 1 } };
  }
  if (!frontierIds(state, scenario, terrain).includes(cellId)) return { ok: false, reason: 'illegal_frontier' };
  const crossingOpen = state.crossingOpen || cellId === scenario.crossing.toId;
  return {
    ok: true,
    state: {
      ...state, pendingExtension: false, crossingOpen, revision: state.revision + 1,
      inkedIds: addInk(state.inkedIds, [cellId]),
    },
  };
}

export function applyTravel(
  state: RoutingState, scenario: RoutingScenario, terrain: TerrainSnapshotV1, cellId: string,
): { ok: true; state: RoutingState } | { ok: false; reason: 'illegal_travel' } {
  const reachable = connectedIds(state, scenario, terrain);
  if (!reachable.has(cellId)) return { ok: false, reason: 'illegal_travel' };
  return {
    ok: true,
    state: {
      ...state, partyId: cellId, revision: state.revision + 1,
      arrived: state.arrived || cellId === scenario.surveyId,
    },
  };
}

export function publicRoutingView(state: RoutingState, scenario: RoutingScenario, terrain: TerrainSnapshotV1): PublicRoutingView {
  const reachable = [...connectedIds(state, scenario, terrain)].sort();
  return {
    revision: state.revision, movesUsed: state.movesUsed, maxMoves: ROUTING_MAX_MOVES,
    pendingExtension: state.pendingExtension, arrived: state.arrived, crossingOpen: state.crossingOpen,
    partyId: state.partyId, campId: scenario.campId, surveyId: scenario.surveyId,
    crossingFromId: scenario.crossing.fromId, crossingToId: scenario.crossing.toId,
    inkedIds: state.inkedIds, barrierIds: scenario.barrierIds, reachableIds: reachable,
    frontierIds: frontierIds(state, scenario, terrain), fourPlusCount: state.fourPlusCount,
    trailTouchCount: state.trailTouchCount,
  };
}

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string' && item.length > 0 && item.length <= 256);
}

export function parseRoutingScenario(value: unknown, terrain: TerrainSnapshotV1): RoutingScenario | null {
  if (!value || typeof value !== 'object') return null;
  const s = value as RoutingScenario;
  if (s.version !== 1 || typeof s.id !== 'string' || s.terrainId !== terrain.id
    || typeof s.campId !== 'string' || typeof s.surveyId !== 'string'
    || !strings([...s.barrierIds ?? []]) || !s.crossing
    || typeof s.crossing.fromId !== 'string' || typeof s.crossing.toId !== 'string') return null;
  const ids = new Set(terrain.cells.flat().map(cell => cell.id));
  if (![s.campId, s.surveyId, s.crossing.fromId, s.crossing.toId, ...s.barrierIds].every(id => ids.has(id))) return null;
  if (s.campId === s.surveyId || s.crossing.fromId === s.crossing.toId) return null;
  if (s.barrierIds.includes(s.campId) || s.barrierIds.includes(s.surveyId)
    || s.barrierIds.includes(s.crossing.fromId) || s.barrierIds.includes(s.crossing.toId)) return null;
  return {
    version: 1, id: s.id, terrainId: s.terrainId, campId: s.campId, surveyId: s.surveyId,
    barrierIds: [...s.barrierIds].sort(),
    crossing: { fromId: s.crossing.fromId, toId: s.crossing.toId },
  };
}

export function parseRoutingState(value: unknown, scenario: RoutingScenario, terrain: TerrainSnapshotV1): RoutingState | null {
  if (!value || typeof value !== 'object' || terrain.id !== scenario.terrainId) return null;
  const s = value as RoutingState;
  const action = s.lastAction;
  const ids = new Set(terrain.cells.flat().map(cell => cell.id));
  if (s.version !== 1 || s.scenarioId !== scenario.id || s.terrainId !== scenario.terrainId
    || !Number.isInteger(s.revision) || s.revision < 0 || s.revision > 10_000
    || !strings([...s.inkedIds ?? []]) || !s.inkedIds.includes(scenario.campId)
    || s.inkedIds.some(id => !ids.has(id))
    || typeof s.partyId !== 'string' || !ids.has(s.partyId) || !s.inkedIds.includes(s.partyId)
    || typeof s.crossingOpen !== 'boolean'
    || typeof s.pendingExtension !== 'boolean' || typeof s.arrived !== 'boolean'
    || !Number.isInteger(s.movesUsed) || s.movesUsed < 0 || s.movesUsed > ROUTING_MAX_MOVES
    || !Number.isInteger(s.fourPlusCount) || s.fourPlusCount < 0 || s.fourPlusCount > ROUTING_MAX_MOVES
    || !Number.isInteger(s.trailTouchCount) || s.trailTouchCount < 0 || s.trailTouchCount > ROUTING_MAX_MOVES
    || (action !== null && action !== undefined && (!action || typeof action !== 'object'
      || (action.kind !== 'move' && action.kind !== 'extend' && action.kind !== 'travel')
      || typeof action.digest !== 'string' || action.digest.length !== 64))) return null;
  const parsed: RoutingState = {
    version: 1, revision: s.revision, scenarioId: s.scenarioId, terrainId: s.terrainId,
    inkedIds: [...s.inkedIds].sort(), partyId: s.partyId, crossingOpen: s.crossingOpen,
    pendingExtension: s.pendingExtension, arrived: s.arrived, movesUsed: s.movesUsed,
    fourPlusCount: s.fourPlusCount, trailTouchCount: s.trailTouchCount,
    lastAction: action ? { kind: action.kind, digest: action.digest } : null,
  };
  if (!connectedIds(parsed, scenario, terrain).has(parsed.partyId)) return null;
  return parsed;
}
