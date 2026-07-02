import { describe, expect, it } from 'vitest';

import {
  createEnemyFromSpecies,
  nextSpeciesIntent,
  pickCombatant,
  type SpeciesCombatInput,
} from '@/game/matchBattle/speciesMapper';

function combatant(overrides: Partial<SpeciesCombatInput> = {}): SpeciesCombatInput {
  return {
    speciesId: 10,
    commonName: 'Field Sparrow',
    sizeClass: 'medium',
    defenseType: 'none',
    combatTier: 'common',
    combatArchetype: 'evasive',
    ...overrides,
  };
}

describe('speciesMapper', () => {
  it('cycles deterministic intent patterns by archetype and turn', () => {
    const input = combatant({
      combatArchetype: 'ambush',
      combatTier: 'rare',
    });

    expect(nextSpeciesIntent(input, 'enemy', 1, 2)).toEqual({
      type: 'guard',
      amount: 10,
      debuffId: undefined,
      label: 'Lie in Wait',
    });
    expect(nextSpeciesIntent(input, 'enemy', 2, 2)).toEqual({
      type: 'attack',
      amount: 20,
      debuffId: undefined,
      label: 'Pounce',
    });
    expect(nextSpeciesIntent(input, 'enemy', 3, 2).label).toBe('Lie in Wait');
  });

  it('sorts combatants by tier and species id for leaders and elites', () => {
    const common = combatant({ speciesId: 4, combatTier: 'common' });
    const rareHighId = combatant({ speciesId: 7, combatTier: 'rare' });
    const rareLowId = combatant({ speciesId: 3, combatTier: 'rare' });

    expect(pickCombatant([common, rareHighId, rareLowId], 'leader', 0)).toBe(rareLowId);
    expect(pickCombatant([common, rareHighId, rareLowId], 'elite', 0)).toBe(rareHighId);
  });

  it('cycles regular encounters through lower-ranked combatants', () => {
    const inputs = [
      combatant({ speciesId: 1, combatTier: 'apex' }),
      combatant({ speciesId: 2, combatTier: 'rare' }),
      combatant({ speciesId: 3, combatTier: 'uncommon' }),
      combatant({ speciesId: 4, combatTier: 'common' }),
    ];

    expect(pickCombatant(inputs, 'enemy', 0)?.speciesId).toBe(3);
    expect(pickCombatant(inputs, 'enemy', 1)?.speciesId).toBe(4);
    expect(pickCombatant(inputs, 'enemy', 2)?.speciesId).toBe(3);
  });

  it('avoids reusing the leader species for regular encounters when possible', () => {
    const leader = combatant({ speciesId: 1, combatTier: 'rare' });
    const regular = combatant({ speciesId: 2, combatTier: 'common' });

    expect(pickCombatant([leader, regular], 'leader', 0)).toBe(leader);
    expect(pickCombatant([leader, regular], 'enemy', 0)).toBe(regular);
  });

  it('creates enemies with compact-board hp, defense guard, and first-turn intent', () => {
    const enemy = createEnemyFromSpecies(
      combatant({
        speciesId: 42,
        commonName: 'River Turtle',
        sizeClass: 'small',
        defenseType: 'shell',
        combatTier: 'uncommon',
        combatArchetype: 'defensive',
      }),
      'elite',
      3,
    );

    expect(enemy).toMatchObject({
      id: 'species_42_elite',
      name: 'River Turtle',
      maxHp: 26,
      hp: 26,
      guard: 12,
      intent: {
        type: 'guard',
        amount: 14,
        label: 'Hunker Down',
      },
    });
  });

  it('honors hp and guard overrides when present', () => {
    const enemy = createEnemyFromSpecies(
      combatant({
        hpOverride: 20,
        guardOverride: 5,
      }),
      'enemy',
      1,
    );

    expect(enemy.maxHp).toBe(20);
    expect(enemy.hp).toBe(20);
    expect(enemy.guard).toBe(5);
  });

  it('caps top-end species hp for compact-board leader fights', () => {
    const enemy = createEnemyFromSpecies(
      combatant({
        commonName: 'Apex Giant',
        sizeClass: 'massive',
        combatTier: 'apex',
      }),
      'leader',
      2,
    );

    expect(enemy.maxHp).toBe(56);
    expect(enemy.hp).toBe(56);
  });

  it('keeps small common regular encounters short on the starter board', () => {
    const enemy = createEnemyFromSpecies(
      combatant({
        commonName: 'Suriname Toad',
        sizeClass: 'small',
        combatTier: 'common',
      }),
      'enemy',
      2,
    );

    expect(enemy.maxHp).toBe(18);
    expect(enemy.hp).toBe(18);
  });
});
