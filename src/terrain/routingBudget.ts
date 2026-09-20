import { BackendPuzzle } from '@/game/BackendPuzzle';
import { GRID_COLS, GRID_ROWS } from '@/game/constants';
import { MoveAction } from '@/game/MoveAction';
import { getAllowedEvidenceGemTypes } from '@/expedition/evidenceFamilies';
import {
  applyExtensionChoice, applyTravel, connectedIds, frontierIds, inkMatchedGround, initialRoutingState,
  slotOf, type RoutingScenario, type SpatialMatchDelta,
} from './routing';
import type { TerrainSnapshotV1 } from './terrain';

export const ROUTING_MEASUREMENT_SEEDS = [91, 7, 13, 21, 34, 55, 89, 144, 233, 377] as const;

export interface RoutingBudgetReport {
  seeds: number;
  moves: number;
  fourPlusMoves: number;
  fourPlusRate: number;
  trailTouchMoves: number;
  trailTouchRate: number;
  reached: number;
  reachRate: number;
}

function firstLegalMove(puzzle: BackendPuzzle): MoveAction | null {
  for (const rowOrCol of ['row', 'col'] as const) {
    const count = rowOrCol === 'row' ? GRID_ROWS : GRID_COLS;
    for (let index = 0; index < count; index++) {
      for (const amount of [1, -1, 2, -2, 3, -3, 4, -4, 5, -5]) {
        const move = new MoveAction(rowOrCol, index, amount);
        if (puzzle.getMatchesFromHypotheticalMove(move).length > 0) return move;
      }
    }
  }
  return null;
}

function playSpatial(puzzle: BackendPuzzle, move: MoveAction): SpatialMatchDelta {
  const direct = puzzle.getNextExplodeAndReplacePhase([move]);
  const directCells = direct.matches.flatMap(match => match.map(([x, y]) => [x, y] as const));
  const directThreePlusCells = direct.matches
    .filter(match => match.length >= 3)
    .flatMap(match => match.map(([x, y]) => [x, y] as const));
  const cascadeCells: Array<readonly [number, number]> = [];
  for (;;) {
    const cascade = puzzle.getNextExplodeAndReplacePhase([]);
    if (cascade.isNothingToDo()) break;
    for (const match of cascade.matches) for (const [x, y] of match) cascadeCells.push([x, y]);
  }
  puzzle.registerMove();
  return {
    directCells, cascadeCells, directThreePlusCells,
    directFourPlus: direct.matches.some(match => match.length >= 4),
  };
}

function manhattanTo(terrain: TerrainSnapshotV1, fromId: string, toId: string): number {
  const from = slotOf(terrain, fromId);
  const to = slotOf(terrain, toId);
  if (!from || !to) return 99;
  return Math.abs(from[0] - to[0]) + Math.abs(from[1] - to[1]);
}

/** First-legal-move policy with greedy frontier picks toward the survey. Does not change budgets. */
export function measureRoutingBudget(
  terrain: TerrainSnapshotV1, scenario: RoutingScenario, seeds: readonly number[] = ROUTING_MEASUREMENT_SEEDS,
): RoutingBudgetReport {
  let fourPlusMoves = 0;
  let trailTouchMoves = 0;
  let reached = 0;
  let moves = 0;
  for (const boardSeed of seeds) {
    const puzzle = new BackendPuzzle(GRID_COLS, GRID_ROWS);
    puzzle.setGemPool({ allowedGemTypes: getAllowedEvidenceGemTypes([]) });
    puzzle.setSeed(boardSeed);
    puzzle.regenerateBoard();
    puzzle.resetMoves();
    puzzle.setMaxMoves(6);
    let state = initialRoutingState(scenario);
    let arrived = false;
    for (let moveNumber = 1; moveNumber <= 6; moveNumber++) {
      const move = firstLegalMove(puzzle);
      if (!move) break;
      const spatial = playSpatial(puzzle, move);
      moves += 1;
      const inked = inkMatchedGround(state, scenario, terrain, spatial);
      state = {
        ...state, inkedIds: inked.inkedIds, pendingExtension: inked.grantedExtension,
        movesUsed: moveNumber,
        fourPlusCount: state.fourPlusCount + (spatial.directFourPlus ? 1 : 0),
        trailTouchCount: state.trailTouchCount + (inked.touchedTrail ? 1 : 0),
        revision: state.revision + 1,
      };
      if (spatial.directFourPlus) fourPlusMoves += 1;
      if (inked.touchedTrail) trailTouchMoves += 1;
      if (state.pendingExtension) {
        const frontier = frontierIds(state, scenario, terrain);
        const pick = frontier.includes(scenario.crossing.toId) ? scenario.crossing.toId
          : [...frontier].sort((a, b) => manhattanTo(terrain, a, scenario.surveyId) - manhattanTo(terrain, b, scenario.surveyId)
            || a.localeCompare(b))[0] ?? null;
        const extended = applyExtensionChoice(state, scenario, terrain, pick);
        state = extended.ok ? extended.state : { ...state, pendingExtension: false };
      }
      if (connectedIds(state, scenario, terrain).has(scenario.surveyId)) {
        const travel = applyTravel(state, scenario, terrain, scenario.surveyId);
        if (travel.ok) {
          state = travel.state;
          arrived = state.arrived;
        }
      }
    }
    if (arrived) reached += 1;
  }
  return {
    seeds: seeds.length, moves, fourPlusMoves,
    fourPlusRate: moves === 0 ? 0 : fourPlusMoves / moves,
    trailTouchMoves, trailTouchRate: moves === 0 ? 0 : trailTouchMoves / moves,
    reached, reachRate: seeds.length === 0 ? 0 : reached / seeds.length,
  };
}
