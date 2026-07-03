import { describe, expect, it } from 'vitest';

import {
  applyPieceMatches,
  resolveTurn,
  type PieceMatchInput,
  type ResolverCtx,
} from '@/game/matchBattle/combatResolver';
import type { ArmamentDef, MatchBattleCombatState } from '@/game/matchBattle/types';
import type { SpeciesCombatInput } from '@/game/matchBattle/speciesMapper';

function combat(overrides: Partial<MatchBattleCombatState> = {}): MatchBattleCombatState {
  return {
    playerHp: 10,
    playerMaxHp: 10,
    turn: 1,
    enemy: {
      id: 'enemy_1',
      name: 'Skittish Critter',
      maxHp: 20,
      hp: 20,
      intent: { type: 'attack', amount: 4, label: 'Startle' },
    },
    log: [],
    ...overrides,
  };
}

function combatant(overrides: Partial<SpeciesCombatInput> = {}): SpeciesCombatInput {
  return {
    speciesId: 9,
    commonName: 'Test Species',
    sizeClass: 'small',
    defenseType: 'none',
    combatTier: 'common',
    combatArchetype: 'ambush',
    ...overrides,
  };
}

function ctx(overrides: Partial<ResolverCtx> = {}): ResolverCtx {
  return {
    armaments: [],
    partnerPassive: null,
    nodeType: 'enemy',
    combatant: null,
    difficulty: 2,
    ...overrides,
  };
}

function gear(id: string, trigger: ArmamentDef['trigger']): ArmamentDef {
  return { id, name: id, description: id, kind: 'scaling', trigger };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      if (child && typeof child === 'object' && !Object.isFrozen(child)) deepFreeze(child);
    }
  }
  return value;
}

describe('combatResolver', () => {
  it('applies damage, pierce, and heal scaling', () => {
    const result = applyPieceMatches(
      combat({ playerHp: 5 }),
      [
        { pieceId: 'sword', level: 2, matchSize: 5 },
        { pieceId: 'staff', level: 1, matchSize: 4 },
        { pieceId: 'shield', level: 3, matchSize: 3 },
      ],
      ctx(),
      { cascadeTriggered: false, cleansedCount: 0 },
    );

    expect(result.combat.enemy?.hp).toBe(11);
    expect(result.combat.playerHp).toBe(8);
    expect(result.stats.damageDealt).toBe(9);
    expect(result.stats.damageTaken).toBe(0);
    expect(result.combat.log.slice(0, 3)).toEqual([
      'Spotting Scope: 5 Data.',
      'Telephoto Lens: 4 Direct Data.',
      'Camo Blind: +3 Stamina.',
    ]);
  });

  it('applies partner pressure bonus to damage only', () => {
    const result = applyPieceMatches(
      combat(),
      [
        { pieceId: 'sword', level: 1, matchSize: 3 },
        { pieceId: 'staff', level: 1, matchSize: 3 },
      ],
      ctx({ partnerPassive: { hpBonus: 0, defenseHpBonus: 0, pressureBonus: 2, description: 'Pressure' } }),
      { cascadeTriggered: false, cleansedCount: 0 },
    );

    expect(result.combat.enemy?.hp).toBe(13);
    expect(result.combat.log[0]).toBe('Spotting Scope: 4 Data.');
    expect(result.combat.log[1]).toBe('Telephoto Lens: 3 Direct Data.');
  });

  it('clamps enemy damage and stamina recovery', () => {
    const result = applyPieceMatches(
      combat({ playerHp: 9, enemy: { ...combat().enemy!, hp: 2 } }),
      [
        { pieceId: 'sword', level: 1, matchSize: 5 },
        { pieceId: 'shield', level: 4, matchSize: 5 },
      ],
      ctx(),
      { cascadeTriggered: false, cleansedCount: 0 },
    );

    expect(result.combat.enemy?.hp).toBe(0);
    expect(result.stats.damageDealt).toBe(2);
    expect(result.combat.playerHp).toBe(10);
  });

  it('fires hp-loss gear when the enemy attacks', () => {
    const result = resolveTurn(
      combat(),
      true,
      ctx({ armaments: [gear('crescendo_earrings', 'on_hp_loss')] }),
    );

    expect(result.combat.playerHp).toBe(6);
    expect(result.combat.enemy?.hp).toBe(19);
    expect(result.stats.damageTaken).toBe(4);
    expect(result.stats.damageDealt).toBe(1);
  });

  it('fires combat-end gear once on win', () => {
    const result = resolveTurn(
      combat({ enemy: { ...combat().enemy!, hp: 0 } }),
      true,
      ctx({ armaments: [gear('credit_ledger', 'combat_end')] }),
    );

    expect(result.outcome).toBe('won');
    expect(result.scoreDelta).toBe(8);
    expect(result.combat.log.filter(line => line === 'Grant Ledger: +8 Score.')).toHaveLength(1);
  });

  it('reports loss when stamina reaches zero', () => {
    const result = resolveTurn(
      combat({ playerHp: 3, enemy: { ...combat().enemy!, intent: { type: 'attack', amount: 5, label: 'Startle' } } }),
      false,
      ctx(),
    );

    expect(result.outcome).toBe('lost');
    expect(result.combat.playerHp).toBe(0);
  });

  it('increments turn and advances fallback intent', () => {
    const result = resolveTurn(combat(), true, ctx({ difficulty: 2 }));

    expect(result.combat.turn).toBe(2);
    expect(result.combat.enemy?.intent).toMatchObject({ type: 'attack', amount: 11, label: 'Startle' });
  });

  it('advances species intent when a combatant is present', () => {
    const result = resolveTurn(
      combat(),
      false,
      ctx({ combatant: combatant({ combatArchetype: 'ambush', combatTier: 'rare' }), difficulty: 2 }),
    );

    expect(result.combat.turn).toBe(2);
    expect(result.combat.enemy?.intent).toMatchObject({ type: 'attack', amount: 20, label: 'Pounce' });
  });

  it('caps log at 8 lines', () => {
    const matches: PieceMatchInput[] = Array.from({ length: 10 }, () => ({ pieceId: 'sword', level: 1, matchSize: 3 }));
    const result = applyPieceMatches(
      combat({ log: ['old 1', 'old 2'] }),
      matches,
      ctx(),
      { cascadeTriggered: false, cleansedCount: 2 },
    );

    expect(result.combat.log).toHaveLength(8);
  });

  it('does not mutate input combat', () => {
    const input = deepFreeze(combat({ log: ['before'] }));
    const before = JSON.parse(JSON.stringify(input));

    const result = resolveTurn(input, true, ctx());

    expect(input).toEqual(before);
    expect(result.combat).not.toBe(input);
    expect(result.combat.enemy).not.toBe(input.enemy);
    expect(result.combat.log).not.toBe(input.log);
  });
});
