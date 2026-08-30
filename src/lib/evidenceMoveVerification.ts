import { createHash } from 'node:crypto';
import { createEmptyEvidenceCharges, GEM_EVIDENCE_FAMILIES, getAllowedEvidenceGemTypes, type EvidenceChargeState, type EvidenceFamily } from '@/expedition/evidenceFamilies';
import { BackendPuzzle } from '@/game/BackendPuzzle';
import { parseBoardCheckpoint } from '@/game/boardCheckpoint';
import type { BoardCheckpointV1, PuzzleGrid } from '@/game/boardTypes';
import {
  GRID_COLS,
  GRID_ROWS,
  MOVE_HUGE_MATCH_THRESHOLD,
  MOVE_LARGE_MATCH_THRESHOLD,
  MULTIPLIER_HUGE_MATCH,
  MULTIPLIER_LARGE_MATCH,
} from '@/game/constants';
import type { ExplodeAndReplacePhase } from '@/game/ExplodeAndReplacePhase';
import { applyFieldSignalMatch, buildFieldSignalSeed, FIELD_SIGNAL_BLOCKER_ID } from '@/game/fieldSignal';
import { MoveAction, type MoveDirection } from '@/game/MoveAction';
import type { CellStateSeed } from '@/game/nodeObstacles';
import type { EvidenceProgressInput } from '@/lib/evidenceRunState';
import { getRecord } from '@/lib/runCaseState';

export interface EvidenceMoveSubmission {
  nodeIndex: number;
  moveNumber: number;
  move: { rowOrCol: MoveDirection; index: number; amount: number };
  boardCheckpoint: BoardCheckpointV1;
}

export interface EvidenceMoveVerificationContext {
  previousCheckpoint?: BoardCheckpointV1;
  boardSeed: number;
  selectedFamilies: EvidenceFamily[];
  obstacleSeeds: CellStateSeed[];
}

export function parseEvidenceMoveSubmission(value: unknown): EvidenceMoveSubmission | null {
  const source = getRecord(value);
  const move = getRecord(source.move);
  const nodeIndex = source.nodeIndex;
  const moveNumber = source.moveNumber;
  const rowOrCol = move.rowOrCol;
  const index = move.index;
  const amount = move.amount;
  const dimension = rowOrCol === 'row' ? GRID_ROWS : GRID_COLS;
  const shiftSize = rowOrCol === 'row' ? GRID_COLS : GRID_ROWS;
  const checkpoint = parseBoardCheckpoint(source.boardCheckpoint, { width: GRID_COLS, height: GRID_ROWS, maxMoves: 6 });
  if (!Number.isInteger(nodeIndex) || (nodeIndex as number) < 0 || (nodeIndex as number) > 2
    || !Number.isInteger(moveNumber) || (moveNumber as number) < 1 || (moveNumber as number) > 6
    || rowOrCol !== 'row' && rowOrCol !== 'col'
    || !Number.isInteger(index) || (index as number) < 0 || (index as number) >= dimension
    || !Number.isInteger(amount) || (amount as number) < -shiftSize || (amount as number) > shiftSize
    || amount === 0 || (amount as number) % shiftSize === 0
    || !checkpoint || checkpoint.movesUsed !== moveNumber) return null;
  return {
    nodeIndex: nodeIndex as number,
    moveNumber: moveNumber as number,
    move: { rowOrCol, index: index as number, amount: amount as number },
    boardCheckpoint: checkpoint,
  };
}

export function evidenceMoveSubmissionDigest(input: EvidenceMoveSubmission): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

export function verifyEvidenceMove(
  submission: EvidenceMoveSubmission,
  context: EvidenceMoveVerificationContext,
): EvidenceProgressInput | null {
  const puzzle = createPuzzle(context, submission.nodeIndex);
  if (puzzle.getMovesUsed() !== submission.moveNumber - 1) return null;
  const move = new MoveAction(submission.move.rowOrCol, submission.move.index, submission.move.amount);
  if (puzzle.getMatchesFromHypotheticalMove(move).length === 0) return null;

  const summary: ReplaySummary = {
    largestMatch: 0,
    cascades: 0,
    directEvidenceCells: new Map(),
    directMatchFamilies: [],
  };
  const scoreBefore = puzzle.getScore();
  const directPhase = puzzle.getNextExplodeAndReplacePhase([move]);
  if (directPhase.isNothingToDo()) return null;
  processPhase(puzzle, directPhase, false, summary);
  for (;;) {
    const cascade = puzzle.getNextExplodeAndReplacePhase([]);
    if (cascade.isNothingToDo()) break;
    summary.cascades += 1;
    processPhase(puzzle, cascade, true, summary);
  }

  const rawMoveScore = puzzle.getScore() - scoreBefore;
  const multiplier = summary.largestMatch >= MOVE_HUGE_MATCH_THRESHOLD
    ? MULTIPLIER_HUGE_MATCH
    : summary.largestMatch >= MOVE_LARGE_MATCH_THRESHOLD
      ? MULTIPLIER_LARGE_MATCH
      : 1;
  puzzle.addBonusScore(Math.max(0, Math.round(rawMoveScore * multiplier) - rawMoveScore));

  if (summary.cascades > 0 && !puzzle.hasFieldSignalSpawned()) {
    const seed = buildFieldSignalSeed(puzzle.getGridState(), context.boardSeed, submission.nodeIndex, submission.moveNumber);
    if (seed) {
      puzzle.applyCellStateSeeds([seed]);
      puzzle.markFieldSignalSpawned();
    }
  }
  puzzle.registerMove();
  const verifiedCheckpoint = puzzle.exportCheckpoint();
  if (JSON.stringify(verifiedCheckpoint) !== JSON.stringify(submission.boardCheckpoint)) return null;

  const directClears = createEmptyEvidenceCharges();
  for (const family of summary.directEvidenceCells.values()) directClears[family] += 1;
  return {
    nodeIndex: submission.nodeIndex,
    moveNumber: submission.moveNumber,
    directClears,
    directMatchFamilies: summary.directMatchFamilies,
    cascadeCount: summary.cascades,
    signalCleared: summary.signalClearedFamily !== undefined,
    ...(summary.signalClearedFamily ? {
      signalClearedFamily: summary.signalClearedFamily,
      signalHintCount: (summary.signalClearMatchLength ?? 3) >= 4 ? 2 : 1,
    } : {}),
    boardCheckpoint: verifiedCheckpoint,
  };
}

interface ReplaySummary {
  largestMatch: number;
  cascades: number;
  directEvidenceCells: Map<string, EvidenceFamily>;
  directMatchFamilies: EvidenceFamily[];
  signalClearedFamily?: EvidenceFamily;
  signalClearMatchLength?: number;
}

function createPuzzle(context: EvidenceMoveVerificationContext, nodeIndex: number): BackendPuzzle {
  const puzzle = new BackendPuzzle(GRID_COLS, GRID_ROWS);
  puzzle.setGemPool({ allowedGemTypes: getAllowedEvidenceGemTypes(context.selectedFamilies) });
  if (context.previousCheckpoint) {
    puzzle.importCheckpoint(context.previousCheckpoint);
    return puzzle;
  }
  puzzle.setSeed(context.boardSeed);
  puzzle.regenerateBoard();
  puzzle.applyCellStateSeeds(context.obstacleSeeds);
  puzzle.resetMoves();
  puzzle.setMaxMoves(6);
  if (nodeIndex < 0) throw new RangeError('Invalid node index');
  return puzzle;
}

function processPhase(
  puzzle: BackendPuzzle,
  phase: ExplodeAndReplacePhase,
  isCascade: boolean,
  summary: ReplaySummary,
): void {
  const state = phase.matchGridState;
  if (!state) return;
  for (const match of phase.matches) {
    summary.largestMatch = Math.max(summary.largestMatch, match.length);
    const matchGemType = match.flatMap(([x, y]) => state[x]?.[y]?.gemType ? [state[x][y]!.gemType] : [])[0] ?? null;
    const family = matchGemType ? GEM_EVIDENCE_FAMILIES[matchGemType] : undefined;
    if (!isCascade && family) {
      summary.directMatchFamilies.push(family);
      for (const [x, y] of match) {
        if (state[x]?.[y]) summary.directEvidenceCells.set(`${x},${y}`, family);
      }
    }
    damageAdjacentBlockers(puzzle, state, match, matchGemType, isCascade, summary);
  }
}

function damageAdjacentBlockers(
  puzzle: BackendPuzzle,
  state: PuzzleGrid,
  match: Array<[number, number]>,
  matchGemType: string | null,
  isCascade: boolean,
  summary: ReplaySummary,
): void {
  const adjacent = new Set<string>();
  for (const [matchX, matchY] of match) {
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
      const x = matchX + dx;
      const y = matchY + dy;
      const key = `${x},${y}`;
      if (adjacent.has(key) || match.some(([candidateX, candidateY]) => candidateX === x && candidateY === y)) continue;
      adjacent.add(key);
      const cell = state[x]?.[y];
      if (cell?.state?.blockerId === FIELD_SIGNAL_BLOCKER_ID) {
        const payout = applyFieldSignalMatch(puzzle, matchGemType, match.length, isCascade);
        if (payout && match.length > (summary.signalClearMatchLength ?? 0)) {
          summary.signalClearedFamily = payout.family;
          summary.signalClearMatchLength = match.length;
        }
      } else {
        puzzle.damageBlocker(x, y);
      }
    }
  }
}
