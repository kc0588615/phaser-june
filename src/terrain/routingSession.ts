import { createHash, randomUUID } from 'node:crypto';
import type { BoardCheckpointV1 } from '@/game/boardTypes';
import { parseEvidenceMoveSubmission, verifyEvidenceMoveDetailed, type EvidenceMoveSubmission } from '@/lib/evidenceMoveVerification';
import { isUuid } from '@/lib/runCaseState';
import {
  applyExtensionChoice, applyTravel, inkMatchedGround, initialRoutingState, parseRoutingScenario, parseRoutingState,
  publicRoutingView, ROUTING_MAX_MOVES, type PublicRoutingView, type RoutingScenario, type RoutingState,
} from './routing';
import type { TerrainSnapshotV1 } from './terrain';

export interface RoutingSession {
  readonly id: string;
  readonly boardSeed: number;
  readonly terrain: TerrainSnapshotV1;
  readonly scenario: RoutingScenario;
  checkpoint?: BoardCheckpointV1;
  state: RoutingState;
}

export type RoutingCommand =
  | { kind: 'move'; requestId: string; revision: number; submission: EvidenceMoveSubmission }
  | { kind: 'extend'; requestId: string; revision: number; cellId: string | null }
  | { kind: 'travel'; requestId: string; revision: number; cellId: string };

export type RoutingFailure =
  | 'stale_revision'
  | 'pending_extension'
  | 'no_pending_extension'
  | 'illegal_frontier'
  | 'illegal_travel'
  | 'unverified_move'
  | 'move_out_of_order'
  | 'invalid_command';

export type RoutingCommandResult =
  | { ok: true; duplicate: boolean; session: RoutingSession; view: PublicRoutingView }
  | { ok: false; reason: RoutingFailure };

export function createRoutingSession(
  terrain: TerrainSnapshotV1, scenario: RoutingScenario, boardSeed: number, id = randomUUID(),
): RoutingSession {
  return { id, boardSeed, terrain, scenario, state: initialRoutingState(scenario) };
}

export function routingCommandDigest(command: RoutingCommand): string {
  return createHash('sha256').update(JSON.stringify(command)).digest('hex');
}

export function applyRoutingCommand(session: RoutingSession, command: RoutingCommand): RoutingCommandResult {
  const digest = routingCommandDigest(command);
  if (command.revision !== session.state.revision) {
    if (session.state.lastAction?.digest === digest) {
      return { ok: true, duplicate: true, session, view: publicRoutingView(session.state, session.scenario, session.terrain) };
    }
    return { ok: false, reason: 'stale_revision' };
  }
  if (session.state.lastAction?.digest === digest) {
    return { ok: true, duplicate: true, session, view: publicRoutingView(session.state, session.scenario, session.terrain) };
  }
  if (command.kind === 'move') return applyMove(session, command, digest);
  if (command.kind === 'extend') return applyExtend(session, command, digest);
  return applyTravelCommand(session, command, digest);
}

function commit(session: RoutingSession, state: RoutingState, digest: string, kind: 'move' | 'extend' | 'travel'): RoutingCommandResult {
  session.state = { ...state, lastAction: { kind, digest } };
  return { ok: true, duplicate: false, session, view: publicRoutingView(session.state, session.scenario, session.terrain) };
}

function applyMove(session: RoutingSession, command: Extract<RoutingCommand, { kind: 'move' }>, digest: string): RoutingCommandResult {
  if (session.state.pendingExtension) return { ok: false, reason: 'pending_extension' };
  if (command.submission.moveNumber !== session.state.movesUsed + 1 || session.state.movesUsed >= ROUTING_MAX_MOVES) {
    return { ok: false, reason: 'move_out_of_order' };
  }
  const verification = verifyEvidenceMoveDetailed(command.submission, {
    previousCheckpoint: session.checkpoint,
    boardSeed: session.boardSeed,
    selectedFamilies: [],
    obstacleSeeds: [],
  });
  if (!verification.ok) return { ok: false, reason: 'unverified_move' };
  const inked = inkMatchedGround(session.state, session.scenario, session.terrain, verification.spatial);
  session.checkpoint = verification.input.boardCheckpoint;
  return commit(session, {
    ...session.state,
    inkedIds: inked.inkedIds,
    pendingExtension: inked.grantedExtension,
    movesUsed: session.state.movesUsed + 1,
    fourPlusCount: session.state.fourPlusCount + (verification.spatial.directFourPlus ? 1 : 0),
    trailTouchCount: session.state.trailTouchCount + (inked.touchedTrail ? 1 : 0),
    revision: session.state.revision + 1,
  }, digest, 'move');
}

function applyExtend(session: RoutingSession, command: Extract<RoutingCommand, { kind: 'extend' }>, digest: string): RoutingCommandResult {
  const applied = applyExtensionChoice(session.state, session.scenario, session.terrain, command.cellId);
  if (!applied.ok) return { ok: false, reason: applied.reason };
  return commit(session, applied.state, digest, 'extend');
}

function applyTravelCommand(session: RoutingSession, command: Extract<RoutingCommand, { kind: 'travel' }>, digest: string): RoutingCommandResult {
  const applied = applyTravel(session.state, session.scenario, session.terrain, command.cellId);
  if (!applied.ok) return { ok: false, reason: applied.reason };
  return commit(session, applied.state, digest, 'travel');
}

export function parseRoutingCommand(value: unknown): RoutingCommand | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  if (!isUuid(source.requestId) || !Number.isInteger(source.revision) || (source.revision as number) < 0) return null;
  const requestId = source.requestId as string;
  const revision = source.revision as number;
  if (source.kind === 'move') {
    const submission = parseEvidenceMoveSubmission(source.submission);
    return submission ? { kind: 'move', requestId, revision, submission } : null;
  }
  if (source.kind === 'extend') {
    if (source.cellId !== null && (typeof source.cellId !== 'string' || source.cellId.length === 0 || source.cellId.length > 256)) return null;
    return { kind: 'extend', requestId, revision, cellId: source.cellId as string | null };
  }
  if (source.kind === 'travel' && typeof source.cellId === 'string' && source.cellId.length > 0 && source.cellId.length <= 256) {
    return { kind: 'travel', requestId, revision, cellId: source.cellId };
  }
  return null;
}

export function serializeRoutingSession(session: RoutingSession): Record<string, unknown> {
  return {
    id: session.id, boardSeed: session.boardSeed, terrain: session.terrain, scenario: session.scenario,
    checkpoint: session.checkpoint ?? null, state: session.state,
  };
}

export function parseRoutingSession(value: unknown, terrain: TerrainSnapshotV1): RoutingSession | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  if (typeof source.id !== 'string' || !isUuid(source.id) || !Number.isInteger(source.boardSeed)) return null;
  const scenario = parseRoutingScenario(source.scenario, terrain);
  const state = scenario ? parseRoutingState(source.state, scenario, terrain) : null;
  if (!scenario || !state) return null;
  return {
    id: source.id, boardSeed: source.boardSeed as number, terrain, scenario, state,
    checkpoint: source.checkpoint && typeof source.checkpoint === 'object' ? source.checkpoint as BoardCheckpointV1 : undefined,
  };
}
