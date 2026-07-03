import type { ActionGemType, GemType } from '@/game/constants';
import type { AffinityType } from '@/expedition/affinities';
import { ACTION_GEM_TYPES } from '@/game/constants';
import type { CombatEventType } from './combatEvents';
import type { MatchBattlePartner, MatchBattlePartnerPassive } from './partner';

export type MatchBattleNodeType =
  | 'enemy'
  | 'elite'
  | 'leader'
  | 'shop'
  | 'treasure'
  | 'event'
  | 'repair'
  | 'challenge'
  | 'trivia'
  | 'gis_recon';

export type PieceTrigger = 'match' | 'break' | 'drop' | 'debuff';

export interface PieceEffect {
  stat: 'damage' | 'pierce' | 'heal';
  baseValue: number;
  levelScaling: number;
}

export interface PieceDef {
  id: ActionGemType;
  label: string;
  trigger: PieceTrigger;
  role: string;
  description: string;
  color: string;
  effect: PieceEffect;
}

export interface PiecePoolEntry {
  pieceId: ActionGemType;
  level: number;
  weight: number;
}

export interface MatchBattleEnemy {
  id: string;
  name: string;
  maxHp: number;
  hp: number;
  intent: EnemyIntent;
}

export interface EnemyIntent {
  type: 'attack' | 'debuff' | 'attack_debuff';
  amount: number;
  debuffId?: string;
  label: string;
}

export interface MatchBattleCombatState {
  playerHp: number;
  playerMaxHp: number;
  turn: number;
  enemy: MatchBattleEnemy | null;
  log: string[];
}

export interface ArmamentDef {
  id: string;
  name: string;
  description: string;
  kind: 'economy' | 'risk' | 'defense' | 'scaling';
  trigger?: CombatEventType;
  disposable?: boolean;
}

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  type:
    | 'board_col'
    | 'board_row'
    | 'snippet'
    | 'armament_slot'
    | 'piece_weight_down';
}

export type RewardOption =
  | { kind: 'piece'; pieceId: ActionGemType; label: string; description: string }
  | { kind: 'armament'; armamentId: string; label: string; description: string };

export interface MatchBattleRouteNode {
  id: string;
  type: MatchBattleNodeType;
  depth: number;
  lane: number;
  next: string[];
  completed: boolean;
  available: boolean;
  sourceNodeIndex: number;
  enemyId?: string;
}

export interface MatchBattleRunState {
  schemaVersion: number;
  enabled: boolean;
  form: AffinityType | null;
  routeNodes: MatchBattleRouteNode[];
  currentRouteNodeId: string | null;
  piecePool: PiecePoolEntry[];
  armaments: ArmamentDef[];
  upgrades: string[];
  rerollCost: number;
  maxGearSlots: number;
  combat: MatchBattleCombatState;
  rewardDraft: RewardOption[];
  boardCols: number;
  boardRows: number;
  lootChance: number;
  partnerSpeciesId: number | null;
  partner: MatchBattlePartner | null;
  snippetsEnabled: boolean;
  outcome: 'active' | 'won' | 'lost' | null;
}

export interface MatchBattleBoardConfig {
  piecePool: PiecePoolEntry[];
  lootChance: number;
  snippetsEnabled: boolean;
  boardCols: number;
  boardRows: number;
  partnerPassive?: MatchBattlePartnerPassive | null;
}

export function isActionPiece(gemType: GemType): gemType is ActionGemType {
  return ACTION_GEM_TYPES.includes(gemType as ActionGemType);
}
