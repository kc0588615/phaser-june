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
  damageDelta?: number;
  scoreDelta?: number;
  log?: string;
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
        results.push({ hpDelta: -2, damageDelta: 4, log: 'Trail Mix: +4 Data, -2 Stamina.' });
        break;
      case 'iron_jaw':
        results.push({ hpDelta: 3, log: 'Reinforced Blind: +3 Stamina.' });
        break;
      case 'credit_ledger':
        results.push({ scoreDelta: 8, log: 'Grant Ledger: +8 Score.' });
        break;
      case 'pain_transmitter':
        results.push({ damageDelta: Math.ceil((ctx.damageAmount ?? 0) / 2), log: 'Endurance Log: counter-read.' });
        break;
      case 'crescendo_earrings':
        results.push({ damageDelta: ctx.cascadeCount ?? 1, log: 'Smartwatch: cascade Data.' });
        break;
      default:
        break;
    }
  }

  return results;
}
