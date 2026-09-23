import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BackendPuzzle } from '@/game/BackendPuzzle';
import { EVIDENCE_FAMILIES, createEmptyEvidenceCharges } from '@/expedition/evidenceFamilies';
import { buildFieldSignalSeed } from '@/game/fieldSignal';
import { applyEvidenceProgress, deriveCascadeHintId, parseEvidenceProgressInput, shouldIssueCascadeHint, type EvidenceProgressInput, type V3NodeEvidenceState } from '@/lib/evidenceRunState';
import { selectLadderIssues } from '@/lib/evidenceLadder';

/** Five-rung ladders per family; the route derives issued families the same way. */
const LADDER_IDS = {
  relatives: [10, 11, 12, 13, 14], body: [20, 21, 22, 23, 24], behavior: [30, 31, 32, 33, 34],
  habits: [40, 41, 42, 43, 44], place: [50, 51, 52, 53, 54],
};
const climb = (input: EvidenceProgressInput, cursors: V3NodeEvidenceState['hintCounts']) =>
  selectLadderIssues(input, cursors, LADDER_IDS).issues.map(issue => issue.family);
const apply = (current: V3NodeEvidenceState, input: EvidenceProgressInput) =>
  applyEvidenceProgress(current, input, climb(input, current.hintCounts));

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

function signalCheckpoint(moveNumber: number, clear: boolean) {
  const puzzle = new BackendPuzzle(6, 6);
  puzzle.setGemPool({ allowedGemTypes: ['red', 'orange', 'yellow', 'green', 'blue'] });
  puzzle.setSeed(27);
  puzzle.regenerateBoard();
  puzzle.setMaxMoves(6);
  const seed = buildFieldSignalSeed(puzzle.getGridState(), 404, 0, 1);
  assert.ok(seed);
  puzzle.applyCellStateSeeds([seed]);
  puzzle.markFieldSignalSpawned();
  if (clear) assert.equal(puzzle.damageBlocker(seed.x, seed.y), true);
  for (let index = 0; index < moveNumber; index += 1) puzzle.registerMove();
  return { checkpoint: puzzle.exportCheckpoint(), family: seed.family };
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
      const result = apply(current, input);
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
    const first = apply(state(), input);
    assert.ok(!('error' in first));
    const retry = apply(first.state, input);
    assert.ok(!('error' in retry));
    assert.deepEqual(retry.state.evidenceCharges, first.state.evidenceCharges);
    const conflict = apply(first.state, { ...input, directClears: { ...input.directClears, relatives: 4 } });
    assert.deepEqual(conflict, { error: 'move_locked' });
  });

  it('rejects out-of-order moves and clears from locked families', () => {
    const input = parseEvidenceProgressInput({
      nodeIndex: 1, moveNumber: 2,
      directClears: { relatives: 3, body: 0, behavior: 0, habits: 0, place: 0 },
      directMatchFamilies: ['relatives'], cascadeCount: 0,
      boardCheckpoint: checkpoint(2),
    })!;
    assert.deepEqual(apply(state(), input), { error: 'move_out_of_order' });
    const lockedState = { ...state(), selectedFamilies: ['relatives' as const] };
    assert.deepEqual(apply(lockedState, { ...input, moveNumber: 1, boardCheckpoint: checkpoint(1) }), { error: 'invalid_family' });
  });

  it('climbs one ladder rung per swap on the largest direct match and cycles cascade flavor', () => {
    const counts = { ...createEmptyEvidenceCharges(), relatives: 2, body: 1 };
    const input = parseEvidenceProgressInput({
      nodeIndex: 0, moveNumber: 1,
      directClears: { relatives: 3, body: 4, behavior: 0, habits: 0, place: 0 },
      directMatchFamilies: ['relatives', 'body'], cascadeCount: 0,
      boardCheckpoint: checkpoint(1),
    })!;
    // Body cleared more cells, so body speaks; relatives waits for another swap.
    assert.deepEqual(selectLadderIssues(input, counts, LADDER_IDS), {
      issues: [{ family: 'body', hintId: 21, rung: 1 }], reinforcedFamilies: [],
    });
    // A completed ladder yields to the next family; nothing left → reinforce only.
    const topped = { ...counts, body: 5 };
    assert.deepEqual(selectLadderIssues(input, topped, LADDER_IDS).issues, [{ family: 'relatives', hintId: 12, rung: 2 }]);
    assert.deepEqual(selectLadderIssues(input, { ...topped, relatives: 5 }, LADDER_IDS), {
      issues: [], reinforcedFamilies: ['body', 'relatives'],
    });
    assert.equal(deriveCascadeHintId(16, [100, 101, 102]), 101);
  });

  it('spawns once after a cascade, then clears for one extra hint without adding charge', () => {
    const live = signalCheckpoint(1, false);
    const spawned = parseEvidenceProgressInput({
      nodeIndex: 0, moveNumber: 1,
      directClears: { relatives: 3, body: 0, behavior: 0, habits: 0, place: 0 },
      directMatchFamilies: ['relatives'], cascadeCount: 1, signalCleared: false,
      boardCheckpoint: live.checkpoint,
    });
    assert.ok(spawned);
    const first = apply(state(), spawned);
    assert.ok(!('error' in first));

    const cleared = signalCheckpoint(2, true);
    assert.equal(cleared.family, live.family);
    const directFamily = EVIDENCE_FAMILIES.find(family => family !== live.family)!;
    const directClears = createEmptyEvidenceCharges();
    directClears[directFamily] = 3;
    const clearInput = parseEvidenceProgressInput({
      nodeIndex: 0, moveNumber: 2, directClears,
      directMatchFamilies: [directFamily], cascadeCount: 1,
      signalCleared: true, signalClearedFamily: directFamily, signalHintCount: 1,
      boardCheckpoint: cleared.checkpoint,
    });
    assert.ok(clearInput);
    const second = apply(first.state, clearInput);
    assert.ok(!('error' in second));
    assert.equal(second.state.evidenceCharges[live.family], first.state.evidenceCharges[live.family]);
    assert.equal(second.state.hintCounts[directFamily], first.state.hintCounts[directFamily] + 2);
    assert.deepEqual(climb(clearInput, first.state.hintCounts), [directFamily, directFamily]);
    assert.equal(shouldIssueCascadeHint(clearInput), false);
    const retry = apply(second.state, clearInput);
    assert.ok(!('error' in retry));
    assert.equal(retry.digest, second.digest);
  });

  it('pays the clearing match family twice for a 4+ clear, ignoring the under-tile gem', () => {
    const live = signalCheckpoint(1, false);
    const spawned = parseEvidenceProgressInput({
      nodeIndex: 0, moveNumber: 1,
      directClears: { relatives: 3, body: 0, behavior: 0, habits: 0, place: 0 },
      directMatchFamilies: ['relatives'], cascadeCount: 1, signalCleared: false,
      boardCheckpoint: live.checkpoint,
    })!;
    const first = apply(state(), spawned);
    assert.ok(!('error' in first));

    // Payout family deliberately differs from the family of the gem under the tile.
    const payoutFamily = EVIDENCE_FAMILIES.find(family => family !== live.family)!;
    const directClears = createEmptyEvidenceCharges();
    directClears[payoutFamily] = 4;
    const cleared = signalCheckpoint(2, true);
    const clearInput = parseEvidenceProgressInput({
      nodeIndex: 0, moveNumber: 2, directClears,
      directMatchFamilies: [payoutFamily], cascadeCount: 0,
      signalCleared: true, signalClearedFamily: payoutFamily, signalHintCount: 2,
      boardCheckpoint: cleared.checkpoint,
    });
    assert.ok(clearInput);
    assert.deepEqual(climb(clearInput, first.state.hintCounts), [payoutFamily, payoutFamily, payoutFamily]);

    const second = apply(first.state, clearInput);
    assert.ok(!('error' in second));
    // one direct match + two signal hints
    assert.equal(second.state.hintCounts[payoutFamily], first.state.hintCounts[payoutFamily] + 3);
    assert.equal(second.state.evidenceCharges[live.family], first.state.evidenceCharges[live.family]);
    assert.deepEqual(second.state.offeredFamilies, []);

    // Two hints walk the cursor twice and wrap the four-entry pool.
    // Ladders clamp at the top: a payout near the end reveals only what remains, never wraps.
    const nearTop = { ...createEmptyEvidenceCharges(), [payoutFamily]: 4 };
    const clamped = selectLadderIssues(clearInput, nearTop, LADDER_IDS);
    assert.deepEqual(clamped.issues.map(issue => issue.hintId), [LADDER_IDS[payoutFamily][4]]);
    assert.deepEqual(clamped.reinforcedFamilies, []);

    // A retry that recomputes a different count must not be mistaken for the same move.
    const retry = apply(second.state, clearInput);
    assert.ok(!('error' in retry));
    assert.equal(retry.digest, second.digest);
    assert.deepEqual(apply(second.state, { ...clearInput, signalHintCount: 1 }), { error: 'move_locked' });
  });

  it('requires a valid hint count alongside a signal clear', () => {
    const cleared = signalCheckpoint(2, true);
    const base = {
      nodeIndex: 0, moveNumber: 2,
      directClears: { relatives: 3, body: 0, behavior: 0, habits: 0, place: 0 },
      directMatchFamilies: ['relatives'], cascadeCount: 0,
      boardCheckpoint: cleared.checkpoint,
    };
    assert.equal(parseEvidenceProgressInput({ ...base, signalCleared: true, signalClearedFamily: 'relatives' }), null);
    assert.equal(parseEvidenceProgressInput({ ...base, signalCleared: true, signalClearedFamily: 'relatives', signalHintCount: 0 }), null);
    assert.equal(parseEvidenceProgressInput({ ...base, signalCleared: true, signalClearedFamily: 'relatives', signalHintCount: 3 }), null);
    assert.equal(parseEvidenceProgressInput({ ...base, signalCleared: false, signalHintCount: 1 }), null);
    assert.equal(parseEvidenceProgressInput({ ...base, signalCleared: true, signalClearedFamily: 'body', signalHintCount: 1 }), null);
    assert.equal(parseEvidenceProgressInput({ ...base, signalCleared: true, signalClearedFamily: 'relatives', signalHintCount: 2 }), null);
    assert.ok(parseEvidenceProgressInput({ ...base, signalCleared: true, signalClearedFamily: 'relatives', signalHintCount: 1 }));
    assert.ok(parseEvidenceProgressInput({
      ...base,
      directClears: { ...base.directClears, relatives: 4 },
      signalCleared: true,
      signalClearedFamily: 'relatives',
      signalHintCount: 2,
    }));
  });

  it('rejects an uncleared signal claim and signal respawn', () => {
    const live = signalCheckpoint(1, false);
    const prior = { ...state(), segmentMovesUsed: 1, boardCheckpoint: live.checkpoint };
    const clearedNext = signalCheckpoint(2, true);
    const clearInput = parseEvidenceProgressInput({
      nodeIndex: 0, moveNumber: 2,
      directClears: { relatives: 3, body: 0, behavior: 0, habits: 0, place: 0 },
      directMatchFamilies: ['relatives'], cascadeCount: 0,
      signalCleared: true, signalClearedFamily: 'relatives', signalHintCount: 1,
      boardCheckpoint: clearedNext.checkpoint,
    })!;
    assert.ok(!('error' in apply(prior, clearInput)));
    // A clear claimed while the tile is still on the board is still rejected.
    const stillLive = signalCheckpoint(2, false);
    assert.deepEqual(apply(prior, { ...clearInput, boardCheckpoint: stillLive.checkpoint }), { error: 'checkpoint_mismatch' });
    assert.deepEqual(apply(prior, { ...clearInput, signalCleared: false, signalClearedFamily: undefined, signalHintCount: undefined }), { error: 'checkpoint_mismatch' });

    const clearedPrior = signalCheckpoint(1, true);
    const respawnState = { ...state(), segmentMovesUsed: 1, boardCheckpoint: clearedPrior.checkpoint };
    const respawn = signalCheckpoint(2, false);
    const respawnInput = parseEvidenceProgressInput({
      nodeIndex: 0, moveNumber: 2,
      directClears: { relatives: 3, body: 0, behavior: 0, habits: 0, place: 0 },
      directMatchFamilies: ['relatives'], cascadeCount: 1, signalCleared: false,
      boardCheckpoint: respawn.checkpoint,
    })!;
    assert.deepEqual(apply(respawnState, respawnInput), { error: 'checkpoint_mismatch' });
  });

  it('allows a cascade to destroy the signal without a payout', () => {
    const live = signalCheckpoint(1, false);
    const prior = { ...state(), segmentMovesUsed: 1, boardCheckpoint: live.checkpoint };
    const cleared = signalCheckpoint(2, true);
    const directFamily = EVIDENCE_FAMILIES.find(family => family !== live.family)!;
    const directClears = createEmptyEvidenceCharges();
    directClears[directFamily] = 3;
    const input = parseEvidenceProgressInput({
      nodeIndex: 0,
      moveNumber: 2,
      directClears,
      directMatchFamilies: [directFamily],
      cascadeCount: 1,
      signalCleared: false,
      boardCheckpoint: cleared.checkpoint,
    });
    assert.ok(input);
    const result = apply(prior, input);
    assert.ok(!('error' in result));
    assert.deepEqual(climb(input, prior.hintCounts), [directFamily]);
    assert.equal(shouldIssueCascadeHint(input), true);
    assert.equal(result.state.hintCounts[live.family], prior.hintCounts[live.family]);
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
