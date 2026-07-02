import type { ArmamentDef, MatchBattleCombatState } from './types';

export type CombatEventType =
  | 'combat_start'
  | 'combat_end'
  | 'turn_start'
  | 'turn_end'
  | 'on_match'
  | 'on_cascade'
  | 'on_shuffle'
  | 'on_hp_loss'
  | 'on_damage_taken'
  | 'on_creature_damaged'
  | 'on_overkill'
  | 'on_death'
  | 'on_purchase';

export interface CombatEventContext {
  combat: MatchBattleCombatState;
  turn: number;
  matchCount?: number;
  cascadeCount?: number;
  damageAmount?: number;
  wasCleanCapture?: boolean;
}

export interface CombatEffectResult {
  hpDelta?: number;
  guardDelta?: number;
  attackDelta?: number;
  focusDelta?: number;
  creditsDelta?: number;
  log?: string;
}

export interface FocusSkillResult {
  combat: MatchBattleCombatState;
  damage: number;
}

export function resolveFocusSkill(combat: MatchBattleCombatState): FocusSkillResult {
  if (!combat.enemy || combat.focusStored < combat.maxAccel) {
    return { combat, damage: 0 };
  }

  const damage = combat.focusStored;
  return {
    combat: {
      ...combat,
      focusStored: 0,
      enemy: {
        ...combat.enemy,
        hp: Math.max(0, combat.enemy.hp - damage),
      },
    },
    damage,
  };
}

export function resolveGearTriggers(
  event: CombatEventType,
  gear: ArmamentDef[],
  ctx: CombatEventContext,
): CombatEffectResult[] {
  const results: CombatEffectResult[] = [];

  for (const item of gear) {
    if (item.trigger !== event) continue;

    switch (item.id) {
      case 'assault_potion':
        results.push({ hpDelta: -2, attackDelta: 4, log: 'Trail Mix: +4 Approach, -2 Stamina.' });
        break;
      case 'iron_jaw':
        results.push({ guardDelta: 6, log: 'Reinforced Blind: +6 Cover.' });
        break;
      case 'credit_ledger':
        results.push({ creditsDelta: 8, log: 'Grant Ledger: +8 Grants.' });
        break;
      case 'pain_transmitter':
        results.push({ focusDelta: Math.ceil((ctx.damageAmount ?? 0) / 2), log: 'Endurance Log fed Focus.' });
        break;
      case 'crescendo_earrings':
        results.push({ attackDelta: ctx.cascadeCount ?? 1, log: 'Smartwatch scaled Approach.' });
        break;
      default:
        break;
    }
  }

  return results;
}
