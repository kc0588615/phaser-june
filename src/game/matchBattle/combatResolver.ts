import type { ActionGemType } from '@/game/constants';
import { nextIntent, PIECE_CATALOG } from './catalog';
import { resolveGearTriggers, type CombatEffectResult } from './combatEvents';
import type { ArmamentDef, MatchBattleCombatState, MatchBattleNodeType } from './types';
import { nextSpeciesIntent, type SpeciesCombatInput } from './speciesMapper';
import type { MatchBattlePartnerPassive } from './partner';

export const DEBUFF_LABELS: Record<string, string> = { burn: 'Glare', web: 'Tangle' };

export interface PieceMatchInput {
  pieceId: ActionGemType;
  level: number;
  matchSize: number;
}

export interface ResolverCtx {
  armaments: ArmamentDef[];
  partnerPassive: MatchBattlePartnerPassive | null;
  nodeType: MatchBattleNodeType;
  combatant: SpeciesCombatInput | null;
  difficulty: number;
}

export interface ResolverStats {
  damageDealt: number;
  damageTaken: number;
  debuffsCleansed: number;
}

export interface ResolverResult {
  combat: MatchBattleCombatState;
  scoreDelta: number;
  stats: ResolverStats;
  debuffSeeds: string[];
  outcome: 'ongoing' | 'won' | 'lost';
}

function emptyStats(): ResolverStats {
  return { damageDealt: 0, damageTaken: 0, debuffsCleansed: 0 };
}

function addStats(target: ResolverStats, source: ResolverStats): void {
  target.damageDealt += source.damageDealt;
  target.damageTaken += source.damageTaken;
  target.debuffsCleansed += source.debuffsCleansed;
}

function cloneCombat(combat: MatchBattleCombatState): MatchBattleCombatState {
  return {
    ...combat,
    enemy: combat.enemy ? { ...combat.enemy, intent: { ...combat.enemy.intent } } : null,
    log: [...combat.log],
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function applyPlayerHpDelta(combat: MatchBattleCombatState, amount: number, stats: ResolverStats): void {
  const before = combat.playerHp;
  combat.playerHp = clamp(before + amount, 0, combat.playerMaxHp);
  if (combat.playerHp < before) stats.damageTaken += before - combat.playerHp;
}

function damageMatchBattleEnemy(combat: MatchBattleCombatState, amount: number, stats: ResolverStats): void {
  if (!combat.enemy || amount <= 0) return;
  const prevHp = combat.enemy.hp;
  combat.enemy.hp = Math.max(0, prevHp - amount);
  stats.damageDealt += prevHp - combat.enemy.hp;
}

function effectValue(pieceId: ActionGemType, level: number, matchSize = 3): number {
  const effect = PIECE_CATALOG[pieceId]?.effect;
  if (!effect) return 0;
  const base = effect.baseValue + Math.max(0, level - 1) * effect.levelScaling;
  return base + Math.max(0, matchSize - 3);
}

export function applyCombatEffectResults(
  combat: MatchBattleCombatState,
  results: CombatEffectResult[],
): ResolverResult {
  const next = cloneCombat(combat);
  const stats = emptyStats();
  let scoreDelta = 0;
  const log: string[] = [];

  for (const result of results) {
    if (result.hpDelta) applyPlayerHpDelta(next, result.hpDelta, stats);
    if (result.damageDelta) damageMatchBattleEnemy(next, result.damageDelta, stats);
    if (result.scoreDelta) scoreDelta += result.scoreDelta;
    if (result.log) log.push(result.log);
  }

  if (log.length > 0) next.log = [...log, ...next.log].slice(0, 8);

  return {
    combat: next,
    scoreDelta,
    stats,
    debuffSeeds: [],
    outcome: next.playerHp <= 0 ? 'lost' : 'ongoing',
  };
}

export function applyPieceMatches(
  combat: MatchBattleCombatState,
  matches: PieceMatchInput[],
  ctx: ResolverCtx,
  opts: { cascadeTriggered: boolean; cleansedCount: number },
): ResolverResult {
  let next = cloneCombat(combat);
  const stats = emptyStats();
  let scoreDelta = 0;
  const log: string[] = [];

  for (const match of matches) {
    const def = PIECE_CATALOG[match.pieceId];
    if (!def) continue;
    const amount = effectValue(match.pieceId, match.level, match.matchSize);

    if (def.trigger !== 'match') continue;

    switch (def.effect.stat) {
      case 'damage': {
        const total = amount + (ctx.partnerPassive?.pressureBonus ?? 0);
        damageMatchBattleEnemy(next, total, stats);
        log.push(`${def.label}: ${total} Data.`);
        break;
      }
      case 'pierce':
        damageMatchBattleEnemy(next, amount, stats);
        log.push(`${def.label}: ${amount} Direct Data.`);
        break;
      case 'heal':
        applyPlayerHpDelta(next, amount, stats);
        log.push(`${def.label}: +${amount} Stamina.`);
        break;
      default:
        log.push(`${def.label} matched.`);
        break;
    }
  }

  if (opts.cascadeTriggered) {
    const cascadeEffects = resolveGearTriggers('on_cascade', ctx.armaments, {
      combat: next,
      turn: next.turn,
      cascadeCount: 1,
    });
    const applied = applyCombatEffectResults(next, cascadeEffects);
    next = applied.combat;
    scoreDelta += applied.scoreDelta;
    addStats(stats, applied.stats);
  }

  if (opts.cleansedCount > 0) {
    stats.debuffsCleansed += opts.cleansedCount;
    log.push(`Cleared ${opts.cleansedCount} hindrance${opts.cleansedCount > 1 ? 's' : ''}.`);
  }

  next.log = [...log, ...next.log].slice(0, 8);
  return {
    combat: next,
    scoreDelta,
    stats,
    debuffSeeds: [],
    outcome: next.playerHp <= 0 ? 'lost' : 'ongoing',
  };
}

export function resolveTurn(
  combat: MatchBattleCombatState,
  didAnyMatch: boolean,
  ctx: ResolverCtx,
): ResolverResult {
  let next = cloneCombat(combat);
  const stats = emptyStats();
  const debuffSeeds: string[] = [];
  let scoreDelta = 0;

  if (didAnyMatch) next.log = ['Field action resolved.', ...next.log].slice(0, 8);

  if (next.enemy && next.enemy.hp <= 0) {
    const endEffects = resolveGearTriggers('combat_end', ctx.armaments, {
      combat: next,
      turn: next.turn,
      wasCleanCapture: false,
    });
    const applied = applyCombatEffectResults(next, endEffects);
    addStats(stats, applied.stats);
    return { ...applied, stats, outcome: 'won' };
  }

  if (!next.enemy) {
    return { combat: next, scoreDelta, stats, debuffSeeds, outcome: 'ongoing' };
  }

  const intent = next.enemy.intent;
  const enemyName = next.enemy.name;
  const turnLog: string[] = [];

  if (intent.type === 'attack' || intent.type === 'attack_debuff') {
    const hpDamage = intent.amount;
    applyPlayerHpDelta(next, -hpDamage, stats);
    const hpLossEffects = resolveGearTriggers('on_hp_loss', ctx.armaments, {
      combat: next,
      turn: next.turn,
      damageAmount: hpDamage,
    });
    const applied = applyCombatEffectResults(next, hpLossEffects);
    next = applied.combat;
    scoreDelta += applied.scoreDelta;
    addStats(stats, applied.stats);
    turnLog.push(`${enemyName}: ${intent.label} for ${hpDamage}.`);
  }

  if (intent.type === 'debuff' || intent.type === 'attack_debuff') {
    debuffSeeds.push(intent.debuffId ?? 'burn');
  }

  const nextTurn = next.turn + 1;
  next.turn = nextTurn;
  if (next.enemy) {
    next.enemy.intent = ctx.combatant
      ? nextSpeciesIntent(ctx.combatant, ctx.nodeType, nextTurn, ctx.difficulty)
      : nextIntent(ctx.nodeType, nextTurn, ctx.difficulty);
  }
  next.log = [...turnLog, `Turn ${nextTurn}.`, ...next.log].slice(0, 8);

  const turnEffects = resolveGearTriggers('turn_start', ctx.armaments, { combat: next, turn: nextTurn });
  const applied = applyCombatEffectResults(next, turnEffects);
  next = applied.combat;
  scoreDelta += applied.scoreDelta;
  addStats(stats, applied.stats);

  return {
    combat: next,
    scoreDelta,
    stats,
    debuffSeeds,
    outcome: next.playerHp <= 0 ? 'lost' : 'ongoing',
  };
}
