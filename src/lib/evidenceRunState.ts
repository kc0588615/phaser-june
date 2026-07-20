import { createHash } from 'node:crypto';
import {
  EVIDENCE_FAMILIES,
  MAX_EVIDENCE_CHARGE,
  deriveEvidenceFamilyOffer,
  getAllowedEvidenceGemTypes,
  isEvidenceFamily,
  parseEvidenceCharges,
  type EvidenceChargeState,
  type EvidenceFamily,
} from '@/expedition/evidenceFamilies';
import { parseBoardCheckpoint } from '@/game/boardCheckpoint';
import type { BoardCheckpointV1 } from '@/game/boardTypes';
import { GRID_COLS, GRID_ROWS } from '@/game/constants';
import { getRecord } from '@/lib/runCaseState';

export interface EvidenceProgressInput {
  nodeIndex: number;
  moveNumber: number;
  directClears: EvidenceChargeState;
  directMatchFamilies: EvidenceFamily[];
  cascadeCount: number;
  boardCheckpoint: BoardCheckpointV1;
}

export interface V3NodeEvidenceState {
  evidenceCharges: EvidenceChargeState;
  carriedCharges: EvidenceChargeState;
  hintCounts: EvidenceChargeState;
  cascadeHintCount: number;
  selectedFamilies: EvidenceFamily[];
  selectedFamily?: EvidenceFamily;
  offeredFamilies: EvidenceFamily[];
  segmentMovesUsed: number;
  boardCheckpoint?: BoardCheckpointV1;
  lastMoveDigest?: string;
  lastHintIds: number[];
  lastCascadeHintId?: number;
}

export function parseEvidenceProgressInput(value: unknown): EvidenceProgressInput | null {
  const source = getRecord(value);
  const nodeIndex = source.nodeIndex;
  const moveNumber = source.moveNumber;
  const directClears = parseEvidenceCharges(source.directClears);
  const directMatchFamilies = Array.isArray(source.directMatchFamilies)
    ? source.directMatchFamilies.filter(isEvidenceFamily)
    : [];
  const cascadeCount = source.cascadeCount;
  const boardCheckpoint = parseBoardCheckpoint(source.boardCheckpoint, { width: GRID_COLS, height: GRID_ROWS, maxMoves: 6 });
  if (!Number.isInteger(nodeIndex) || (nodeIndex as number) < 0 || (nodeIndex as number) > 2
    || !Number.isInteger(moveNumber) || (moveNumber as number) < 1 || (moveNumber as number) > 6
    || !directClears || directMatchFamilies.length < 1 || directMatchFamilies.length > 24
    || directMatchFamilies.length !== (source.directMatchFamilies as unknown[]).length
    || !Number.isInteger(cascadeCount) || (cascadeCount as number) < 0 || (cascadeCount as number) > 24
    || !boardCheckpoint || boardCheckpoint.movesUsed !== moveNumber
    || byteLength(boardCheckpoint) > 32_768) return null;
  const total = EVIDENCE_FAMILIES.reduce((sum, family) => sum + directClears[family], 0);
  if (total < 3 || total > GRID_COLS * GRID_ROWS
    || EVIDENCE_FAMILIES.some(family => directClears[family] > GRID_COLS * GRID_ROWS
      || (directClears[family] > 0) !== directMatchFamilies.includes(family))) return null;
  return {
    nodeIndex: nodeIndex as number,
    moveNumber: moveNumber as number,
    directClears,
    directMatchFamilies,
    cascadeCount: cascadeCount as number,
    boardCheckpoint,
  };
}

export function parseV3NodeEvidenceState(value: unknown): V3NodeEvidenceState | null {
  const source = getRecord(value);
  if (source.caseVersion !== 3) return null;
  const evidenceCharges = parseEvidenceCharges(source.evidenceCharges);
  if (!evidenceCharges) return null;
  const carriedCharges = parseEvidenceCharges(source.carriedCharges) ?? { ...evidenceCharges };
  const hintCounts = parseEvidenceCharges(source.hintCounts) ?? createHintCounts();
  const cascadeHintCount = source.cascadeHintCount ?? 0;
  if (!Number.isInteger(cascadeHintCount) || (cascadeHintCount as number) < 0 || (cascadeHintCount as number) > 144) return null;
  const selectedFamilies = Array.isArray(source.selectedFamilies) ? source.selectedFamilies.filter(isEvidenceFamily) : [];
  if (selectedFamilies.length !== (Array.isArray(source.selectedFamilies) ? source.selectedFamilies.length : 0)
    || new Set(selectedFamilies).size !== selectedFamilies.length || selectedFamilies.length > 3) return null;
  const segmentMovesUsed = source.segmentMovesUsed;
  if (!Number.isInteger(segmentMovesUsed) || (segmentMovesUsed as number) < 0 || (segmentMovesUsed as number) > 6) return null;
  const offeredFamilies = Array.isArray(source.offeredFamilies) ? source.offeredFamilies.filter(isEvidenceFamily) : [];
  if (offeredFamilies.length !== (Array.isArray(source.offeredFamilies) ? source.offeredFamilies.length : 0)
    || new Set(offeredFamilies).size !== offeredFamilies.length) return null;
  const boardCheckpoint = source.boardCheckpoint === undefined
    ? undefined
    : parseBoardCheckpoint(source.boardCheckpoint, { width: GRID_COLS, height: GRID_ROWS, maxMoves: 6 }) ?? undefined;
  if (source.boardCheckpoint !== undefined && !boardCheckpoint) return null;
  const lastHintIds = Array.isArray(source.lastHintIds)
    ? source.lastHintIds.filter(value => Number.isSafeInteger(value) && value > 0)
    : [];
  if (lastHintIds.length !== (Array.isArray(source.lastHintIds) ? source.lastHintIds.length : 0) || lastHintIds.length > 24) return null;
  const lastCascadeHintId = source.lastCascadeHintId;
  if (lastCascadeHintId !== undefined && (!Number.isSafeInteger(lastCascadeHintId) || (lastCascadeHintId as number) <= 0)) return null;
  return {
    evidenceCharges,
    carriedCharges,
    hintCounts,
    cascadeHintCount: cascadeHintCount as number,
    selectedFamilies,
    ...(isEvidenceFamily(source.selectedFamily) ? { selectedFamily: source.selectedFamily } : {}),
    offeredFamilies,
    segmentMovesUsed: segmentMovesUsed as number,
    ...(boardCheckpoint ? { boardCheckpoint } : {}),
    ...(typeof source.lastMoveDigest === 'string' && /^[a-f0-9]{64}$/.test(source.lastMoveDigest) ? { lastMoveDigest: source.lastMoveDigest } : {}),
    lastHintIds,
    ...(lastCascadeHintId ? { lastCascadeHintId: lastCascadeHintId as number } : {}),
  };
}

export function evidenceMoveDigest(input: EvidenceProgressInput): string {
  const normalized = {
    nodeIndex: input.nodeIndex,
    moveNumber: input.moveNumber,
    directClears: Object.fromEntries(EVIDENCE_FAMILIES.map(family => [family, input.directClears[family]])),
    directMatchFamilies: input.directMatchFamilies,
    cascadeCount: input.cascadeCount,
    boardCheckpoint: input.boardCheckpoint,
  };
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

export function applyEvidenceProgress(
  state: V3NodeEvidenceState,
  input: EvidenceProgressInput,
): { state: V3NodeEvidenceState; digest: string } | { error: 'move_locked' | 'move_out_of_order' | 'invalid_family' | 'charge_overflow' | 'checkpoint_mismatch' } {
  const digest = evidenceMoveDigest(input);
  if (input.moveNumber === state.segmentMovesUsed) {
    return state.lastMoveDigest === digest ? { state, digest } : { error: 'move_locked' };
  }
  if (input.moveNumber !== state.segmentMovesUsed + 1) return { error: 'move_out_of_order' };
  const selected = new Set(state.selectedFamilies);
  if (EVIDENCE_FAMILIES.some(family => selected.has(family) && input.directClears[family] > 0)) return { error: 'invalid_family' };
  const expectedAllowed = getAllowedEvidenceGemTypes(state.selectedFamilies).sort();
  const actualAllowed = [...input.boardCheckpoint.allowedGemTypes].sort();
  if (expectedAllowed.length !== actualAllowed.length || expectedAllowed.some((gem, index) => gem !== actualAllowed[index])) return { error: 'checkpoint_mismatch' };
  const evidenceCharges = { ...state.evidenceCharges };
  const hintCounts = { ...state.hintCounts };
  for (const family of EVIDENCE_FAMILIES) {
    const next = evidenceCharges[family] + input.directClears[family];
    if (next > MAX_EVIDENCE_CHARGE) return { error: 'charge_overflow' };
    evidenceCharges[family] = next;
  }
  for (const family of input.directMatchFamilies) hintCounts[family] += 1;
  const segmentMovesUsed = input.moveNumber;
  return {
    digest,
    state: {
      ...state,
      evidenceCharges,
      hintCounts,
      cascadeHintCount: state.cascadeHintCount + (input.cascadeCount > 0 ? 1 : 0),
      segmentMovesUsed,
      boardCheckpoint: input.boardCheckpoint,
      lastMoveDigest: digest,
      lastHintIds: [],
      lastCascadeHintId: undefined,
      offeredFamilies: segmentMovesUsed === 6
        ? deriveEvidenceFamilyOffer(evidenceCharges, state.selectedFamilies)
        : [],
    },
  };
}

function createHintCounts(): EvidenceChargeState {
  return { relatives: 0, body: 0, behavior: 0, habits: 0, place: 0 };
}

function byteLength(value: unknown): number {
  try { return Buffer.byteLength(JSON.stringify(value)); } catch { return Number.POSITIVE_INFINITY; }
}

export function parseEvidenceChoiceInput(value: unknown): { nodeIndex: number; family: EvidenceFamily } | null {
  const source = getRecord(value);
  return Number.isInteger(source.nodeIndex) && (source.nodeIndex as number) >= 0 && (source.nodeIndex as number) <= 2
    && isEvidenceFamily(source.family)
    ? { nodeIndex: source.nodeIndex as number, family: source.family }
    : null;
}

export function deriveEvidenceHintIds(
  counts: EvidenceChargeState,
  matchedFamilies: readonly EvidenceFamily[],
  idsByFamily: Record<EvidenceFamily, number[]>,
): number[] {
  const cursors = { ...counts };
  return matchedFamilies.map(family => {
    const ids = idsByFamily[family];
    const id = ids[cursors[family] % ids.length];
    cursors[family] += 1;
    return id;
  });
}

export function deriveCascadeHintId(count: number, ids: readonly number[]): number | null {
  return ids.length > 0 ? ids[count % ids.length] : null;
}
