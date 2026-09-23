// EventBus — the single bridge between the React world (map, HUD,
// panels, ExpeditionContext) and the Phaser world (the match-3 board).
//
// The two sides never import each other's components; they only communicate by
// emitting and listening to the events declared in `EventPayloads` below.
// A typical run flows through it like this:
//
//   Explore map --'expedition-data-ready'----> ExpeditionContext (briefing)
//   Context    --'map-location-selected'----> Game scene (board setup)
//   Context    --'expedition-start'---------->  Game scene (board begins)
//   Game scene --'evidence-move-resolved'----> Context (server-replayed checkpoint)
//   Context    --'node-complete'-------------> Game scene (next board begins)
//
// To add an event: add its name + payload type to `EventPayloads`, then both
// `EventBus.emit` and `EventBus.on` become type-checked for it everywhere.
import Phaser from 'phaser';
import type { Species } from '@/types/database';
import type { RasterHabitatResult } from '@/lib/speciesService';
import type { ExpeditionData } from '@/types/expedition';
import type { NodeBoardContext, NodeObstacle } from './nodeObstacles';
import type { BoardSpawnConfig } from '@/expedition/domain';
import type { FeatureFingerprint } from '@/types/gis';
import type { BoardCheckpointV1 } from './boardTypes';
import type { TerrainSnapshot, TerrainSelection } from '@/terrain/terrain';
import type { PublicRoutingView } from '@/terrain/routing';

// Define all event types and their payloads
export interface EventPayloads {
  'terrain-cell-selected': TerrainSelection;
  'current-scene-ready': Phaser.Scene;
  /** Board setup for one node; Game.ts reads only these fields. */
  'map-location-selected': {
    difficulty?: number;
    moveBudget?: number;
    obstacles?: NodeObstacle[];
    objectiveProgress?: number;
    nodeIndex?: number;
    boardSeed?: number;
    boardContext?: NodeBoardContext;
    boardConfig?: BoardSpawnConfig;
    boardCheckpoint?: BoardCheckpointV1;
    terrain?: TerrainSnapshot;
  };
  'game-reset': undefined;
  'game-hud-updated': {
    score: number;
    movesRemaining: number;
    movesUsed: number;
    maxMoves: number;
    streak: number;
    multiplier: number;
    moveMultiplier?: number;
  };
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
  'node-complete': { nodeIndex: number };
  'route-progress-updated': { slot: number };
  'node-objective-updated': {
    progress: number;
    target: number;
  };
  'evidence-move-resolved': {
    nodeIndex: number;
    moveNumber: number;
    move: { rowOrCol: 'row' | 'col'; index: number; amount: number };
    boardCheckpoint: BoardCheckpointV1;
  };
  'evidence-progress-committed': {
    nodeIndex: number;
    moveNumber: number;
  };
  'routing-state-updated': PublicRoutingView | null;
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

// Re-export event types for convenience
export type GameHudUpdatedEvent = EventPayloads['game-hud-updated'];
