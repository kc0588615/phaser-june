import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BackendPuzzle } from '@/game/BackendPuzzle';
import { GRID_COLS, GRID_ROWS, MOVE_HUGE_MATCH_THRESHOLD, MOVE_LARGE_MATCH_THRESHOLD, MULTIPLIER_HUGE_MATCH, MULTIPLIER_LARGE_MATCH } from '@/game/constants';
import { MoveAction } from '@/game/MoveAction';
import { getAllowedEvidenceGemTypes } from '@/expedition/evidenceFamilies';
import { parseEvidenceMoveSubmission } from '@/lib/evidenceMoveVerification';
import { buildFieldSignalSeed } from '@/game/fieldSignal';
import { syntheticRoutingScenario, syntheticRoutingTerrain } from '@/terrain/routingScenario';
import {
  applyRoutingCommand, createRoutingSession, parseRoutingCommand, parseRoutingSession, routingCommandDigest,
  serializeRoutingSession, type RoutingCommand,
} from '@/terrain/routingSession';
import { costaRicaRoutingScenario } from '@/terrain/routingScenario';
import { loadCostaRicaTerrain } from '@/terrain/routingFixture.server';
import { randomUUID } from 'node:crypto';

function puzzle(seed: number): BackendPuzzle {
  const board = new BackendPuzzle(GRID_COLS, GRID_ROWS);
  board.setGemPool({ allowedGemTypes: getAllowedEvidenceGemTypes([]) });
  board.setSeed(seed);
  board.regenerateBoard();
  board.resetMoves();
  board.setMaxMoves(6);
  return board;
}

function firstMove(board: BackendPuzzle): MoveAction {
  for (const rowOrCol of ['row', 'col'] as const) {
    for (let index = 0; index < GRID_COLS; index++) {
      for (const amount of [1, -1, 2, -2, 3, -3, 4, -4, 5, -5]) {
        const move = new MoveAction(rowOrCol, index, amount);
        if (board.getMatchesFromHypotheticalMove(move).length > 0) return move;
      }
    }
  }
  throw new Error('no move');
}

function clientCheckpoint(board: BackendPuzzle, move: MoveAction, boardSeed: number): ReturnType<BackendPuzzle['exportCheckpoint']> {
  const scoreBefore = board.getScore();
  let largest = 0;
  let cascades = 0;
  let phase = board.getNextExplodeAndReplacePhase([move]);
  while (!phase.isNothingToDo()) {
    largest = Math.max(largest, ...phase.matches.map(match => match.length));
    phase = board.getNextExplodeAndReplacePhase([]);
    if (!phase.isNothingToDo()) cascades += 1;
  }
  if (cascades > 0 && !board.hasFieldSignalSpawned()) {
    const seed = buildFieldSignalSeed(board.getGridState(), boardSeed, 0, board.getMovesUsed() + 1);
    if (seed) {
      board.applyCellStateSeeds([seed]);
      board.markFieldSignalSpawned();
    }
  }
  const raw = board.getScore() - scoreBefore;
  const multiplier = largest >= MOVE_HUGE_MATCH_THRESHOLD ? MULTIPLIER_HUGE_MATCH
    : largest >= MOVE_LARGE_MATCH_THRESHOLD ? MULTIPLIER_LARGE_MATCH : 1;
  board.addBonusScore(Math.max(0, Math.round(raw * multiplier) - raw));
  board.registerMove();
  return board.exportCheckpoint();
}

function moveCommand(board: BackendPuzzle, seed: number, revision: number, moveNumber = 1): Extract<RoutingCommand, { kind: 'move' }> {
  const move = firstMove(board);
  const checkpoint = clientCheckpoint(board, move, seed);
  const submission = parseEvidenceMoveSubmission({
    nodeIndex: 0, moveNumber, move: { rowOrCol: move.rowOrCol, index: move.index, amount: move.amount },
    boardCheckpoint: checkpoint,
  });
  assert.ok(submission);
  return { kind: 'move', requestId: randomUUID(), revision, submission: submission! };
}

test('verified move inks ground and rejects unverified, stale, and out-of-order commands', () => {
  const terrain = loadCostaRicaTerrain();
  const session = createRoutingSession(terrain, costaRicaRoutingScenario(terrain), 91);
  const command = moveCommand(puzzle(91), 91, 0);
  const forged = structuredClone(command);
  forged.submission.boardCheckpoint.score += 50;
  assert.deepEqual(applyRoutingCommand(session, forged), { ok: false, reason: 'unverified_move' });
  const first = applyRoutingCommand(session, command);
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.duplicate, false);
  assert.equal(session.state.movesUsed, 1);
  const replay = applyRoutingCommand(session, command);
  assert.equal(replay.ok, true);
  if (!replay.ok) return;
  assert.equal(replay.duplicate, true);
  const stale = applyRoutingCommand(session, { ...command, requestId: randomUUID(), revision: 0 });
  assert.deepEqual(stale, { ok: false, reason: 'stale_revision' });
  const skipped = applyRoutingCommand(session, {
    kind: 'move', requestId: randomUUID(), revision: session.state.revision,
    submission: { ...command.submission, moveNumber: 3 },
  });
  assert.deepEqual(skipped, { ok: false, reason: 'move_out_of_order' });
});

test('pending extension blocks the next move until selected or skipped; illegal frontier fails', () => {
  const terrain = syntheticRoutingTerrain();
  const session = createRoutingSession(terrain, syntheticRoutingScenario(terrain), 91);
  session.state = { ...session.state, pendingExtension: true, revision: 1, movesUsed: 1 };
  const dummy = moveCommand(puzzle(91), 91, 0);
  const blocked = applyRoutingCommand(session, { ...dummy, revision: 1, requestId: randomUUID() });
  assert.deepEqual(blocked, { ok: false, reason: 'pending_extension' });
  const idle = applyRoutingCommand(session, { kind: 'extend', requestId: randomUUID(), revision: 1, cellId: terrain.cells[5][0].id });
  assert.deepEqual(idle, { ok: false, reason: 'illegal_frontier' });
  const skip = applyRoutingCommand(session, { kind: 'extend', requestId: randomUUID(), revision: 1, cellId: null });
  assert.equal(skip.ok, true);
  if (!skip.ok) return;
  assert.equal(session.state.pendingExtension, false);
  const extra = applyRoutingCommand(session, { kind: 'extend', requestId: randomUUID(), revision: session.state.revision, cellId: null });
  assert.deepEqual(extra, { ok: false, reason: 'no_pending_extension' });
});

test('illegal crossing travel fails; legal travel after opening the socket arrives once', () => {
  const terrain = syntheticRoutingTerrain();
  const scenario = syntheticRoutingScenario(terrain);
  const session = createRoutingSession(terrain, scenario, 1);
  session.state = {
    ...session.state, revision: 2, movesUsed: 2,
    inkedIds: [scenario.campId, terrain.cells[0][4].id, terrain.cells[1][4].id, terrain.cells[2][4].id].sort(),
  };
  const across = applyRoutingCommand(session, { kind: 'travel', requestId: randomUUID(), revision: 2, cellId: scenario.crossing.toId });
  assert.deepEqual(across, { ok: false, reason: 'illegal_travel' });
  session.state = { ...session.state, pendingExtension: true };
  const open = applyRoutingCommand(session, { kind: 'extend', requestId: randomUUID(), revision: session.state.revision, cellId: scenario.crossing.toId });
  assert.equal(open.ok, true);
  if (!open.ok) return;
  session.state = {
    ...session.state,
    inkedIds: [...session.state.inkedIds, terrain.cells[4][3].id, terrain.cells[4][2].id, terrain.cells[4][1].id, terrain.cells[4][0].id, scenario.surveyId].sort(),
  };
  const arrive = applyRoutingCommand(session, { kind: 'travel', requestId: randomUUID(), revision: session.state.revision, cellId: scenario.surveyId });
  assert.equal(arrive.ok, true);
  if (!arrive.ok) return;
  assert.equal(session.state.arrived, true);
  const again = applyRoutingCommand(session, { kind: 'travel', requestId: randomUUID(), revision: session.state.revision, cellId: scenario.surveyId });
  assert.equal(again.ok, true);
  if (!again.ok) return;
  assert.equal(session.state.arrived, true);
});

test('parse rejects malformed commands; resume round-trips pending choice', () => {
  assert.equal(parseRoutingCommand({ kind: 'travel', requestId: 'nope', revision: 0, cellId: 'x' }), null);
  assert.equal(parseRoutingCommand({ kind: 'arrive', requestId: randomUUID(), revision: 0, cellId: 'x' }), null);
  const terrain = syntheticRoutingTerrain();
  const session = createRoutingSession(terrain, syntheticRoutingScenario(terrain), 3);
  session.state = { ...session.state, pendingExtension: true, revision: 6, lastAction: { kind: 'move', digest: routingCommandDigest({ kind: 'extend', requestId: randomUUID(), revision: 5, cellId: null }).slice(0, 64) } };
  const parsed = parseRoutingSession(serializeRoutingSession(session), terrain);
  assert.ok(parsed);
  assert.equal(parsed?.state.pendingExtension, true);
  assert.equal(parsed?.state.revision, 6);
});
