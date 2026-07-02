import { describe, expect, it } from 'vitest';

import { deriveCombatTraits, type SpeciesRow } from '@/lib/combatTraitDerivation';

function row(overrides: Partial<SpeciesRow> = {}): SpeciesRow {
  return {
    sizeMaxCm: null,
    weightKg: null,
    class: null,
    conservationCode: null,
    behavior1: null,
    behavior2: null,
    dietType: null,
    family: null,
    taxonOrder: null,
    pattern: null,
    habitatTags: [],
    marine: false,
    freshwater: false,
    terrestrial: true,
    ...overrides,
  } as SpeciesRow;
}

describe('deriveCombatTraits', () => {
  it('derives toxic traits from poisonous amphibian rows', () => {
    expect(deriveCombatTraits(row({
      class: 'Amphibia',
      conservationCode: 'EN',
      behavior1: 'poison skin',
      family: 'Dendrobatidae',
      freshwater: true,
      terrestrial: false,
    }))).toMatchObject({
      sizeClass: 'small',
      combatTier: 'rare',
      combatArchetype: 'toxic',
      locomotion: 'aquatic',
      defenseType: 'toxin',
      attackStyle: 'toxin',
      primaryElement: 'water',
    });
  });

  it('uses size, diet, and habitat tags for large herbivores', () => {
    expect(deriveCombatTraits(row({
      sizeMaxCm: '250',
      conservationCode: 'VU',
      dietType: 'Herbivore',
      habitatTags: ['montane meadow'],
    }))).toMatchObject({
      sizeClass: 'large',
      combatTier: 'uncommon',
      combatArchetype: 'defensive',
      defenseType: 'size',
      attackStyle: 'charge',
      primaryElement: 'mountain',
    });
  });

  it('falls back to weight when length is absent', () => {
    expect(deriveCombatTraits(row({
      weightKg: '0.03',
      behavior1: 'fast',
    })).sizeClass).toBe('tiny');
    expect(deriveCombatTraits(row({
      weightKg: '70',
    })).sizeClass).toBe('large');
  });

  it('detects bird locomotion and peck attack style', () => {
    expect(deriveCombatTraits(row({
      class: 'Aves',
      dietType: 'Omnivore',
      habitatTags: ['canopy'],
    }))).toMatchObject({
      sizeClass: 'small',
      locomotion: 'flying',
      attackStyle: 'peck',
      primaryElement: 'forest',
    });
  });

  it('maps shell order to defensive shell traits', () => {
    expect(deriveCombatTraits(row({
      taxonOrder: 'Testudines',
      behavior1: 'retract into shell',
    }))).toMatchObject({
      combatArchetype: 'defensive',
      defenseType: 'shell',
    });
  });

  it('keeps default rows in common evasive earth traits', () => {
    expect(deriveCombatTraits(row())).toMatchObject({
      sizeClass: 'medium',
      combatTier: 'common',
      combatArchetype: 'evasive',
      locomotion: 'terrestrial',
      defenseType: 'none',
      attackStyle: 'none',
      primaryElement: 'earth',
    });
  });
});
