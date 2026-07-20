// EventBus — the single bridge between the React world (Cesium map, HUD,
// panels, ExpeditionContext) and the Phaser world (the match-3 board).
//
// The two sides never import each other's components; they only communicate by
// emitting and listening to the events declared in `EventPayloads` below.
// A typical run flows through it like this:
//
//   CesiumMap  --'cesium-location-selected'-->  ExpeditionContext / Game scene
//   Context    --'expedition-start'---------->  Game scene (board begins)
//   Game scene --'node-objective-updated'---->  Context (progress + sample quality)
//   Game scene --'node-advance-requested'---->  Context (durable node completion)
//
// To add an event: add its name + payload type to `EventPayloads`, then both
// `EventBus.emit` and `EventBus.on` become type-checked for it everywhere.
import Phaser from 'phaser';
import type { Species } from '@/types/database';
import type { RasterHabitatResult } from '@/lib/speciesService';
import type { CluePayload } from './clueConfig';
import type { ExpeditionData } from '@/types/expedition';
import type { AffinityType } from '@/expedition/affinities';
import type { GemType } from './constants';
import type { NodeBoardContext, NodeObstacle, ObstacleFamily } from './nodeObstacles';
import type { BoardSpawnConfig } from '@/expedition/domain';
import type { FeatureFingerprint } from '@/types/gis';
import type { BoardCheckpointV1 } from './boardTypes';
import type { EvidenceChargeState, EvidenceFamily } from '@/expedition/evidenceFamilies';

// Define all event types and their payloads
export interface EventPayloads {
  'current-scene-ready': Phaser.Scene;
  'cesium-location-selected': {
    lon: number;
    lat: number;
    ecoregionId?: number | null;
    habitats: string[];
    species: Species[];
    rasterHabitats: RasterHabitatResult[];
    difficulty?: number;
    moveBudget?: number;
    obstacles?: NodeObstacle[];
    obstacleFamily?: ObstacleFamily | null;
    objectiveGem?: GemType;
    activeAffinities?: AffinityType[];
    objectiveTarget?: number;
    objectiveProgress?: number;
    bestTargetMatchLength?: number;
    nodeIndex?: number;
    nodeType?: string;
    events?: string[];
    boardSeed?: number;
    boardContext?: NodeBoardContext;
    boardConfig?: BoardSpawnConfig;
    /** Case snapshot version — verb rules apply to v2 only (v1 runs keep legacy counting). */
    caseVersion?: number;
    /** Public case candidates — the pool field-note drips draw from. */
    candidateIds?: number[];
    /** Full rows for those candidates (drips need clue fields; location species may not cover them). */
    candidateSpecies?: Species[];
    boardCheckpoint?: BoardCheckpointV1;
  };
  'clue-revealed': CluePayload;
  /** Off-method 4+ match earned a fact about a public candidate (client-only). */
  'field-note-dripped': {
    nodeIndex: number;
    speciesId: number;
    speciesName: string;
    categoryName: string;
    icon: string;
    text: string;
  };
  'new-game-started': {
    speciesName: string;
    speciesId: number;
    totalSpecies: number;
    currentIndex: number;
  };
  'game-reset': undefined;
  'no-species-found': {};
  'all-clues-revealed': {
    speciesId: number;
  };
  'all-species-completed': {
    totalSpecies: number;
  };
  'show-species-list': {
    speciesId: number;
  };
  'game-hud-updated': {
    score: number;
    movesRemaining: number;
    movesUsed: number;
    maxMoves: number;
    streak: number;
    multiplier: number;
    moveMultiplier?: number;
  };
  'game-restart': Record<string, never>;
  'expedition-data-ready': {
    lon: number; lat: number;
    ecoregionId?: number | null;
    expedition: ExpeditionData;
    species: Species[];
    rasterHabitats: RasterHabitatResult[];
    habitats: string[];
    featureFingerprints?: FeatureFingerprint[];
  };
  'expedition-start': Record<string, never>;
  'node-advance-requested': {
    nodeIndex: number;
    reason: 'victory' | 'escaped';
    source: 'game' | 'panel';
  };
  'node-complete': { nodeIndex: number };
  'route-progress-updated': { slot: number };
  'node-objective-updated': {
    progress: number;
    target: number;
    bestTargetMatchLength: number;
  };
  'evidence-move-resolved': {
    nodeIndex: number;
    moveNumber: number;
    directClears: EvidenceChargeState;
    directMatchFamilies: EvidenceFamily[];
    cascadeCount: number;
    boardCheckpoint: BoardCheckpointV1;
  };
  'evidence-progress-committed': {
    nodeIndex: number;
    moveNumber: number;
  };
  'auth-user-ready': { playerId: string; sessionId?: string };
}

// Type-safe EventBus class
class TypedEventBus extends Phaser.Events.EventEmitter {
  emit<K extends keyof EventPayloads>(event: K, ...args: [EventPayloads[K]]): boolean {
    return super.emit(event, ...args);
  }

  on<K extends keyof EventPayloads>(
    event: K,
    fn: (arg: EventPayloads[K]) => void,
    context?: any
  ): this {
    return super.on(event, fn, context);
  }

  once<K extends keyof EventPayloads>(
    event: K,
    fn: (arg: EventPayloads[K]) => void,
    context?: any
  ): this {
    return super.once(event, fn, context);
  }

  off<K extends keyof EventPayloads>(
    event: K,
    fn?: (arg: EventPayloads[K]) => void,
    context?: any
  ): this {
    return super.off(event, fn, context);
  }

  removeListener<K extends keyof EventPayloads>(
    event: K,
    fn?: (arg: EventPayloads[K]) => void,
    context?: any
  ): this {
    return super.removeListener(event, fn, context);
  }
}

// Used to emit events between React components and Phaser scenes
// https://newdocs.phaser.io/docs/3.70.0/Phaser.Events.EventEmitter
export const EventBus = new TypedEventBus();

// Export event names as constants for consistency
export const EVT_GAME_HUD_UPDATED = 'game-hud-updated' as const;
export const EVT_GAME_RESTART = 'game-restart' as const;

// Re-export event types for convenience
export type GameHudUpdatedEvent = EventPayloads['game-hud-updated'];
export type GameRestartEvent = EventPayloads['game-restart'];
