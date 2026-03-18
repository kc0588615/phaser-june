import Phaser from 'phaser';
import type { Species } from '@/types/database';
import type { RasterHabitatResult } from '@/lib/speciesService';
import type { CluePayload } from './clueConfig';
import type { ExpeditionData, EncounterEffect, SouvenirDef } from '@/types/expedition';
import type { GemType } from './constants';
import type { NodeBoardContext, NodeObstacle } from './nodeObstacles';

// Define all event types and their payloads
export interface EventPayloads {
  'current-scene-ready': Phaser.Scene;
  'cesium-location-selected': {
    lon: number;
    lat: number;
    habitats: string[];
    species: Species[];
    rasterHabitats: RasterHabitatResult[];
    difficulty?: number;
    obstacles?: NodeObstacle[];
    requiredGems?: GemType[];
    objectiveTarget?: number;
    nodeIndex?: number;
    events?: string[];
    boardContext?: NodeBoardContext;
  };
  'game-score-updated': {
    score: number;
    movesRemaining: number;
  };
  'game-over': {
    finalScore: number;
    habitats: string[];
  };
  'clue-revealed': CluePayload;
  'new-game-started': {
    speciesName: string;
    speciesId: number;
    totalSpecies: number;
    currentIndex: number;
    hiddenSpeciesName?: string;  // The real species name (hidden from player)
  };
  'game-reset': undefined;
  'no-species-found': {};
  'all-clues-revealed': {
    speciesId: number;
  };
  'all-species-completed': {
    totalSpecies: number;
  };
  'species-guess-submitted': {
    guessedName: string;
    speciesId: number;
    isCorrect: boolean;
    actualName: string;
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
    expedition: ExpeditionData;
    species: Species[];
    rasterHabitats: RasterHabitatResult[];
    habitats: string[];
  };
  'expedition-start': Record<string, never>;
  'node-advance-requested': {
    nodeIndex: number;
    reason: 'objective_complete' | 'analysis_complete';
    source: 'game' | 'panel';
  };
  'node-complete': { nodeIndex: number };
  'node-objective-updated': { progress: number; target: number; requiredGems: GemType[] };
  'encounter-triggered': { eventKey: string; effect: EncounterEffect; souvenirDrop?: SouvenirDef };
  'souvenir-dropped': { souvenir: SouvenirDef };
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
