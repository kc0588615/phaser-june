import Phaser from 'phaser';
import type { Species } from '@/types/database';
import type { RasterHabitatResult } from '@/lib/speciesService';
import type { CluePayload } from './clueConfig';
import type { ExpeditionData, ResourceWallet, ClueCategoryKey } from '@/types/expedition';
import type { AffinityType } from '@/expedition/affinities';
import type { ActionGemType, GemType } from './constants';
import type { NodeBoardContext, NodeObstacle, ObstacleFamily } from './nodeObstacles';
import type { BoardSpawnConfig } from '@/expedition/domain';
import type { FeatureFingerprint } from '@/types/gis';
import type { ArmamentDef, MatchBattleBoardConfig, MatchBattleCombatState, MatchBattleNodeType, RewardOption } from './matchBattle/types';
import type { SpeciesCombatInput } from './matchBattle/speciesMapper';

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
    obstacles?: NodeObstacle[];
    obstacleFamily?: ObstacleFamily | null;
    counterGem?: ActionGemType | null;
    requiredGems?: GemType[];
    activeAffinities?: AffinityType[];
    objectiveTarget?: number;
    objectiveProgress?: number;
    nodeIndex?: number;
    nodeType?: string;
    events?: string[];
    boardContext?: NodeBoardContext;
    boardConfig?: BoardSpawnConfig;
    encounterConfig?: unknown | null;
    matchBattleConfig?: MatchBattleBoardConfig;
    matchBattleNodeType?: MatchBattleNodeType;
    matchBattleCombat?: MatchBattleCombatState;
    matchBattleArmaments?: ArmamentDef[];
    matchBattleCombatants?: SpeciesCombatInput[];
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
    ecoregionId?: number | null;
    expedition: ExpeditionData;
    species: Species[];
    rasterHabitats: RasterHabitatResult[];
    habitats: string[];
    featureFingerprints?: FeatureFingerprint[];
  };
  'expedition-start': Record<string, never>;
  'match-battle-combat-state-updated': MatchBattleCombatState;
  'match-battle-combat-ended': { outcome: 'won' | 'lost'; combat: MatchBattleCombatState; nodeIndex: number; cleanCapture: boolean; creditsDelta: number };
  'match-battle-focus-skill-requested': Record<string, never>;
  'match-battle-reward-draft-opened': { options: RewardOption[] };
  'match-battle-route-node-selected': { routeNodeId: string };
  'match-battle-run-ended': { outcome: 'won' | 'lost' };
  'resource-wallet-updated': {
    wallet: ResourceWallet;
  };
  'node-advance-requested': {
    nodeIndex: number;
    reason: 'objective_complete' | 'analysis_complete' | 'victory' | 'retreat' | 'escaped';
    source: 'game' | 'panel';
  };
  'node-complete': { nodeIndex: number };
  'node-objective-updated': {
    progress: number;
    target: number;
    requiredGems: GemType[];
    counterGem?: ActionGemType | null;
    activeAffinities?: AffinityType[];
  };
  'clue-fragment-earned': { category: ClueCategoryKey; amount: number; source: 'loot_match' | 'key_cache' | 'node_reward' };
  'clue-discount-earned': { amount: number; source: 'thought_match' };
  'deduction-camp-purchase': { category: ClueCategoryKey; cost: number };
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
