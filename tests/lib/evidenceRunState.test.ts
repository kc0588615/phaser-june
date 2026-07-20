import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BackendPuzzle } from '@/game/BackendPuzzle';
import { createEmptyEvidenceCharges } from '@/expedition/evidenceFamilies';
import { applyEvidenceProgress, deriveCascadeHintId, deriveEvidenceHintIds, parseEvidenceProgressInput, type V3NodeEvidenceState } from '@/lib/evidenceRunState';

function checkpoint(moveNumber: number) {
  const puzzle = new BackendPuzzle(6, 6);
  puzzle.setGemPool({ allowedGemTypes: ['red', 'orange', 'yellow', 'green', 'blue'] });
  puzzle.setSeed(10);
  puzzle.regenerateBoard();
  puzzle.setMaxMoves(6);
  for (let index = 0; index < moveNumber; index += 1) puzzle.registerMove();
  return puzzle.exportCheckpoint();
}

function state(): V3NodeEvidenceState {
  return {
    evidenceCharges: createEmptyEvidenceCharges(), carriedCharges: createEmptyEvidenceCharges(),
    hintCounts: createEmptyEvidenceCharges(), cascadeHintCount: 0, lastHintIds: [],
    selectedFamilies: [], offeredFamilies: [], segmentMovesUsed: 0,
  };
}

describe('v3 evidence progress', () => {
  it('stores literal direct-clear totals and derives ties after move six', () => {
    let current = state();
    for (let moveNumber = 1; moveNumber <= 6; moveNumber += 1) {
      const input = parseEvidenceProgressInput({
        nodeIndex: 0, moveNumber,
        directClears: { relatives: 1, body: 1, behavior: 1, habits: 0, place: 0 },
        directMatchFamilies: ['relatives', 'body', 'behavior'], cascadeCount: 0,
        boardCheckpoint: checkpoint(moveNumber),
      });
      assert.ok(input);
      const result = applyEvidenceProgress(current, input);
      assert.ok(!('error' in result));
      current = result.state;
    }
    assert.deepEqual(current.evidenceCharges, { relatives: 6, body: 6, behavior: 6, habits: 0, place: 0 });
    assert.deepEqual(current.offeredFamilies, ['relatives', 'body', 'behavior']);
  });

  it('makes an identical move retry idempotent and locks a conflicting retry', () => {
    const input = parseEvidenceProgressInput({
      nodeIndex: 0, moveNumber: 1,
      directClears: { relatives: 3, body: 0, behavior: 0, habits: 0, place: 0 },
      directMatchFamilies: ['relatives'], cascadeCount: 0,
      boardCheckpoint: checkpoint(1),
    })!;
    const first = applyEvidenceProgress(state(), input);
    assert.ok(!('error' in first));
    const retry = applyEvidenceProgress(first.state, input);
    assert.ok(!('error' in retry));
    assert.deepEqual(retry.state.evidenceCharges, first.state.evidenceCharges);
    const conflict = applyEvidenceProgress(first.state, { ...input, directClears: { ...input.directClears, relatives: 4 } });
    assert.deepEqual(conflict, { error: 'move_locked' });
  });

  it('rejects out-of-order moves and clears from locked families', () => {
    const input = parseEvidenceProgressInput({
      nodeIndex: 1, moveNumber: 2,
      directClears: { relatives: 3, body: 0, behavior: 0, habits: 0, place: 0 },
      directMatchFamilies: ['relatives'], cascadeCount: 0,
      boardCheckpoint: checkpoint(2),
    })!;
    assert.deepEqual(applyEvidenceProgress(state(), input), { error: 'move_out_of_order' });
    const lockedState = { ...state(), selectedFamilies: ['relatives' as const] };
    assert.deepEqual(applyEvidenceProgress(lockedState, { ...input, moveNumber: 1, boardCheckpoint: checkpoint(1) }), { error: 'invalid_family' });
  });

  it('derives deterministic per-family and cascade hint sequences', () => {
    const ids = {
      relatives: [10, 11, 12], body: [20, 21, 22], behavior: [30, 31, 32],
      habits: [40, 41, 42], place: [50, 51, 52],
    };
    const counts = { ...createEmptyEvidenceCharges(), relatives: 2, body: 1 };
    assert.deepEqual(deriveEvidenceHintIds(counts, ['relatives', 'body', 'relatives'], ids), [12, 21, 10]);
    assert.equal(deriveCascadeHintId(16, [100, 101, 102]), 101);
  });

  it('rejects checkpoints larger than 32 KB', () => {
    const oversized = checkpoint(1);
    oversized.grid = oversized.grid.map(column => column.map(cell => cell && ({
      ...cell,
      state: { flags: Array.from({ length: 16 }, (_, index) => `${index}`.padEnd(64, 'x')) },
    })));
    assert.equal(parseEvidenceProgressInput({
      nodeIndex: 0,
      moveNumber: 1,
      directClears: { relatives: 3, body: 0, behavior: 0, habits: 0, place: 0 },
      directMatchFamilies: ['relatives'],
      cascadeCount: 0,
      boardCheckpoint: oversized,
    }), null);
  });
});
