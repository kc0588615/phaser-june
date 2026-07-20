import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BackendPuzzle } from '@/game/BackendPuzzle';
import { MoveAction } from '@/game/MoveAction';
import { EVIDENCE_FAMILIES, getAllowedEvidenceGemTypes } from '@/expedition/evidenceFamilies';

console.log = () => {};

function findMove(puzzle: BackendPuzzle): MoveAction {
  for (let y = 0; y < 6; y += 1) for (const amount of [1, -1]) {
    const move = new MoveAction('row', y, amount);
    if (puzzle.getMatchesFromHypotheticalMove(move).length > 0) return move;
  }
  for (let x = 0; x < 6; x += 1) for (const amount of [1, -1]) {
    const move = new MoveAction('col', x, amount);
    if (puzzle.getMatchesFromHypotheticalMove(move).length > 0) return move;
  }
  throw new Error('board has no legal move');
}

describe('v3 board generation and resume', () => {
  it('generates legal boards using only each allowed 5/4/3-family set', () => {
    for (let lockedCount = 0; lockedCount <= 2; lockedCount += 1) {
      for (const locked of combinations(EVIDENCE_FAMILIES, lockedCount)) {
        const allowed = getAllowedEvidenceGemTypes(locked);
        for (let seed = 0; seed < 1000; seed += 1) {
          const puzzle = new BackendPuzzle(6, 6);
          puzzle.setGemPool({ allowedGemTypes: allowed });
          puzzle.setSeed(seed);
          puzzle.regenerateBoard();
          assert.equal(puzzle.hasAnyValidMove(), true);
          for (const column of puzzle.getGridState()) for (const cell of column) {
            assert.ok(cell && allowed.includes(cell.gemType));
          }
        }
      }
    }
  });

  it('restores the grid, refill queue, score, moves, and RNG sequence exactly', () => {
    for (let movesUsed = 0; movesUsed <= 6; movesUsed += 1) {
      const original = new BackendPuzzle(6, 6);
      original.setGemPool({ allowedGemTypes: ['orange', 'yellow', 'green'] });
      original.setSeed(0xabc123 + movesUsed);
      original.regenerateBoard();
      original.setMaxMoves(6);
      for (let move = 0; move < movesUsed; move += 1) original.registerMove();
      original.addNextGemsToSpawn(['green', 'orange', 'yellow']);
      const restored = new BackendPuzzle(6, 6);
      restored.importCheckpoint(original.exportCheckpoint());
      assert.deepEqual(restored.exportCheckpoint(), original.exportCheckpoint());
      const move = findMove(original);
      assert.deepEqual(restored.getNextExplodeAndReplacePhase([move]), original.getNextExplodeAndReplacePhase([move]));
      assert.deepEqual(restored.getGridState(), original.getGridState());
    }
  });
});

function combinations<T>(items: readonly T[], count: number): T[][] {
  if (count === 0) return [[]];
  return items.flatMap((item, index) => combinations(items.slice(index + 1), count - 1).map(rest => [item, ...rest]));
}
