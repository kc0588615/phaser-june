import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { BackendPuzzle } from '@/game/BackendPuzzle';
import { GRID_COLS, GRID_ROWS, MOVE_HUGE_MATCH_THRESHOLD, MOVE_LARGE_MATCH_THRESHOLD, MULTIPLIER_HUGE_MATCH, MULTIPLIER_LARGE_MATCH } from '@/game/constants';
import { MoveAction } from '@/game/MoveAction';
import { buildFieldSignalSeed } from '@/game/fieldSignal';
import { parseEvidenceMoveSubmission, verifyEvidenceMove } from '@/lib/evidenceMoveVerification';

describe('server evidence move verification', () => {
  test('replays the selected move and rejects forged checkpoints', () => {
    const boardSeed = 91;
    const puzzle = initialPuzzle(boardSeed);
    const move = findValidMove(puzzle);
    const largestMatch = resolveMove(puzzle, move, boardSeed);
    applyMoveMultiplier(puzzle, largestMatch, 0);
    puzzle.registerMove();
    const checkpoint = puzzle.exportCheckpoint();
    const submission = parseEvidenceMoveSubmission({
      nodeIndex: 0,
      moveNumber: 1,
      move: { rowOrCol: move.rowOrCol, index: move.index, amount: move.amount },
      boardCheckpoint: checkpoint,
      directClears: { relatives: 36, body: 0, behavior: 0, habits: 0, place: 0 },
    });
    assert.ok(submission);

    const verified = verifyEvidenceMove(submission, {
      boardSeed,
      selectedFamilies: [],
      obstacleSeeds: [],
    });
    assert.ok(verified);
    assert.equal(verified.moveNumber, 1);
    assert.ok(Object.values(verified.directClears).reduce((sum, value) => sum + value, 0) >= 3);
    assert.ok(verified.directMatchFamilies.length >= 1);

    const forged = structuredClone(submission);
    forged.boardCheckpoint.score += 100;
    assert.equal(verifyEvidenceMove(forged, { boardSeed, selectedFamilies: [], obstacleSeeds: [] }), null);
  });
});

function initialPuzzle(seed: number): BackendPuzzle {
  const puzzle = new BackendPuzzle(GRID_COLS, GRID_ROWS);
  puzzle.setGemPool({ allowedGemTypes: ['red', 'orange', 'yellow', 'green', 'blue'] });
  puzzle.setSeed(seed);
  puzzle.regenerateBoard();
  puzzle.setMaxMoves(6);
  return puzzle;
}

function findValidMove(puzzle: BackendPuzzle): MoveAction {
  for (const rowOrCol of ['row', 'col'] as const) {
    for (let index = 0; index < GRID_COLS; index += 1) {
      for (const amount of [-1, 1]) {
        const move = new MoveAction(rowOrCol, index, amount);
        if (puzzle.getMatchesFromHypotheticalMove(move).length > 0) return move;
      }
    }
  }
  throw new Error('Seed has no valid move');
}

function resolveMove(puzzle: BackendPuzzle, move: MoveAction, boardSeed: number): number {
  let largestMatch = 0;
  let cascades = 0;
  let phase = puzzle.getNextExplodeAndReplacePhase([move]);
  while (!phase.isNothingToDo()) {
    largestMatch = Math.max(largestMatch, ...phase.matches.map(match => match.length));
    phase = puzzle.getNextExplodeAndReplacePhase([]);
    if (!phase.isNothingToDo()) cascades += 1;
  }
  if (cascades > 0) {
    const seed = buildFieldSignalSeed(puzzle.getGridState(), boardSeed, 0, 1);
    if (seed) {
      puzzle.applyCellStateSeeds([seed]);
      puzzle.markFieldSignalSpawned();
    }
  }
  return largestMatch;
}

function applyMoveMultiplier(puzzle: BackendPuzzle, largestMatch: number, scoreBefore: number): void {
  const rawScore = puzzle.getScore() - scoreBefore;
  const multiplier = largestMatch >= MOVE_HUGE_MATCH_THRESHOLD
    ? MULTIPLIER_HUGE_MATCH
    : largestMatch >= MOVE_LARGE_MATCH_THRESHOLD
      ? MULTIPLIER_LARGE_MATCH
      : 1;
  puzzle.addBonusScore(Math.max(0, Math.round(rawScore * multiplier) - rawScore));
}
