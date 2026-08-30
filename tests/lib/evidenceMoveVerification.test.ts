import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { BackendPuzzle } from '@/game/BackendPuzzle';
import type { ExplodeAndReplacePhase } from '@/game/ExplodeAndReplacePhase';
import { GRID_COLS, GRID_ROWS, MOVE_HUGE_MATCH_THRESHOLD, MOVE_LARGE_MATCH_THRESHOLD, MULTIPLIER_HUGE_MATCH, MULTIPLIER_LARGE_MATCH } from '@/game/constants';
import { MoveAction } from '@/game/MoveAction';
import type { PuzzleGrid } from '@/game/boardTypes';
import { applyFieldSignalMatch, buildFieldSignalSeed, FIELD_SIGNAL_BLOCKER_ID } from '@/game/fieldSignal';
import { buildNodeBoardContext, type CellStateSeed } from '@/game/nodeObstacles';
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

  test('replays every valid first move on a seeded obstacle board', () => {
    const boardSeed = 3407071292;
    const obstacleSeeds = buildNodeBoardContext({
      width: GRID_COLS,
      height: GRID_ROWS,
      obstacles: ['limited_signal', 'unknown_terrain'],
      nodeIndex: 0,
    }).obstacleSeeds;
    const template = initialPuzzle(boardSeed, obstacleSeeds);
    const validMoves = findValidMoves(template);
    assert.ok(validMoves.length > 0);

    for (const move of validMoves) {
      const puzzle = initialPuzzle(boardSeed, obstacleSeeds);
      const largestMatch = resolveMove(puzzle, move, boardSeed);
      applyMoveMultiplier(puzzle, largestMatch, 0);
      puzzle.registerMove();
      const submission = parseEvidenceMoveSubmission({
        nodeIndex: 0,
        moveNumber: 1,
        move: { rowOrCol: move.rowOrCol, index: move.index, amount: move.amount },
        boardCheckpoint: puzzle.exportCheckpoint(),
      });
      assert.ok(submission);
      assert.ok(verifyEvidenceMove(submission, { boardSeed, selectedFamilies: [], obstacleSeeds }),
        `${move.rowOrCol} ${move.index} ${move.amount}`);
    }
  });
});

function initialPuzzle(seed: number, obstacleSeeds: CellStateSeed[] = []): BackendPuzzle {
  const puzzle = new BackendPuzzle(GRID_COLS, GRID_ROWS);
  puzzle.setGemPool({ allowedGemTypes: ['red', 'orange', 'yellow', 'green', 'blue'] });
  puzzle.setSeed(seed);
  puzzle.regenerateBoard();
  puzzle.applyCellStateSeeds(obstacleSeeds);
  puzzle.resetMoves();
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

function findValidMoves(puzzle: BackendPuzzle): MoveAction[] {
  const moves: MoveAction[] = [];
  for (const rowOrCol of ['row', 'col'] as const) {
    for (let index = 0; index < GRID_COLS; index += 1) {
      for (const amount of [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]) {
        const move = new MoveAction(rowOrCol, index, amount);
        if (puzzle.getMatchesFromHypotheticalMove(move).length > 0) moves.push(move);
      }
    }
  }
  return moves;
}

function resolveMove(puzzle: BackendPuzzle, move: MoveAction, boardSeed: number): number {
  let largestMatch = 0;
  let cascades = 0;
  let phase = puzzle.getNextExplodeAndReplacePhase([move]);
  while (!phase.isNothingToDo()) {
    largestMatch = Math.max(largestMatch, ...phase.matches.map(match => match.length));
    damageAdjacentBlockers(puzzle, phase, cascades > 0);
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

function damageAdjacentBlockers(puzzle: BackendPuzzle, phase: ExplodeAndReplacePhase, isCascade: boolean): void {
  const state = phase.matchGridState as PuzzleGrid;
  for (const match of phase.matches) {
    const matchGemType = match.flatMap(([x, y]) => state[x]?.[y]?.gemType ? [state[x][y]!.gemType] : [])[0] ?? null;
    const adjacent = new Set<string>();
    for (const [matchX, matchY] of match) {
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
        const x = matchX + dx;
        const y = matchY + dy;
        const key = `${x},${y}`;
        if (adjacent.has(key) || match.some(([candidateX, candidateY]) => candidateX === x && candidateY === y)) continue;
        adjacent.add(key);
        if (state[x]?.[y]?.state?.blockerId === FIELD_SIGNAL_BLOCKER_ID) {
          applyFieldSignalMatch(puzzle, matchGemType, match.length, isCascade);
        } else {
          puzzle.damageBlocker(x, y);
        }
      }
    }
  }
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
