// Pure derivation rules: no DB access, no I/O.
// Takes a speciesTable row and returns deterministic combat traits.

import type { speciesTable } from '@/db/schema/species';
import type {
  CombatSizeClass,
  CombatArchetype,
  CombatLocomotion,
  CombatDefenseType,
  CombatAttackStyle,
  CombatElement,
  CombatTier,
} from '@/db/schema/species';

export type SpeciesRow = typeof speciesTable.$inferSelect;

export interface DerivedCombatTraits {
  sizeClass: CombatSizeClass;
  combatArchetype: CombatArchetype;
  locomotion: CombatLocomotion;
  defenseType: CombatDefenseType;
  attackStyle: CombatAttackStyle;
  primaryElement: CombatElement;
  combatTier: CombatTier;
}

function sizeClassFromRow(s: SpeciesRow): CombatSizeClass {
  const maxCm = Number(s.sizeMaxCm) || 0;
  if (maxCm > 0) {
    if (maxCm < 10) return 'tiny';
    if (maxCm < 30) return 'small';
    if (maxCm < 100) return 'medium';
    if (maxCm < 300) return 'large';
    return 'massive';
  }
  const kg = Number(s.weightKg) || 0;
  if (kg > 0) {
    if (kg < 0.05) return 'tiny';
    if (kg < 0.5) return 'small';
    if (kg < 10) return 'medium';
    if (kg < 100) return 'large';
    return 'massive';
  }
  // class fallback
  const cls = (s.class ?? '').toLowerCase();
  if (cls === 'amphibia') return 'small';
  if (cls === 'aves') return 'small';
  if (cls === 'reptilia' || cls === 'mammalia') return 'medium';
  return 'medium';
}

function combatTierFromRow(s: SpeciesRow): CombatTier {
  const code = (s.conservationCode ?? '').toUpperCase();
  if (code === 'CR') return 'apex';
  if (code === 'EN') return 'rare';
  if (code === 'VU') return 'uncommon';
  return 'common';
}

function combatArchetypeFromRow(s: SpeciesRow): CombatArchetype {
  const behavior = `${s.behavior1 ?? ''} ${s.behavior2 ?? ''}`.toLowerCase();
  const diet = (s.dietType ?? '').toLowerCase();
  const fam = (s.family ?? '').toLowerCase();
  const ord = (s.taxonOrder ?? '').toLowerCase();

  if (/poison|venom|toxic|noxious/.test(behavior) || /dendrobatidae|phyllobates/.test(fam)) {
    return 'toxic';
  }
  if (/ambush|sit.and.wait|lurk|camouflage/.test(behavior)) {
    return 'ambush';
  }
  if (/shell|retract|burrow|hide|armor/.test(behavior) || /testudines|chelonia/.test(ord)) {
    return 'defensive';
  }
  if (/carniv/.test(diet) || /aggress|territorial|predator/.test(behavior)) {
    return 'aggressive';
  }
  if (/flee|nocturnal|shy|cryptic|fast/.test(behavior)) {
    return 'evasive';
  }
  if (/herbiv/.test(diet)) return 'defensive';
  return 'evasive';
}

function defenseTypeFromRow(s: SpeciesRow, sizeMaxCm: number): CombatDefenseType {
  const behavior = `${s.behavior1 ?? ''} ${s.behavior2 ?? ''}`.toLowerCase();
  const fam = (s.family ?? '').toLowerCase();
  const ord = (s.taxonOrder ?? '').toLowerCase();
  const pattern = (s.pattern ?? '').toLowerCase();

  if (/testudines|chelonia/.test(ord)) return 'shell';
  if (/poison|venom|toxic/.test(behavior) || /dendrobatidae|phyllobates|bufonidae/.test(fam)) return 'toxin';
  if (/camouflage|cryptic|mimicry/.test(behavior) || /camouflage|cryptic|mimicry/.test(pattern)) return 'camouflage';
  if (/flee|fast|agile/.test(behavior)) return 'speed';
  if (sizeMaxCm > 200) return 'size';
  return 'none';
}

function attackStyleFromRow(
  s: SpeciesRow,
  archetype: CombatArchetype,
  sizeClass: CombatSizeClass,
): CombatAttackStyle {
  const behavior = `${s.behavior1 ?? ''} ${s.behavior2 ?? ''}`.toLowerCase();
  const diet = (s.dietType ?? '').toLowerCase();
  const cls = (s.class ?? '').toLowerCase();

  if (archetype === 'toxic') return 'toxin';
  if (/constrict/.test(behavior)) return 'constrict';
  if (cls === 'aves') return 'peck';
  if (/carniv|insectiv/.test(diet)) return 'bite';
  if ((sizeClass === 'large' || sizeClass === 'massive') && /herbiv/.test(diet)) return 'charge';
  return 'none';
}

function primaryElementFromRow(s: SpeciesRow): CombatElement {
  const tags = (s.habitatTags ?? []).map(t => t.toLowerCase()).join(' ');
  if (s.marine || s.freshwater) return 'water';
  if (/forest|tropical|canopy/.test(tags)) return 'forest';
  if (/mountain|alpine|montane/.test(tags)) return 'mountain';
  if (/urban|suburban|agricultural/.test(tags)) return 'urban';
  return 'earth';
}

function locomotionFromRow(s: SpeciesRow): CombatLocomotion {
  const behavior = `${s.behavior1 ?? ''} ${s.behavior2 ?? ''}`.toLowerCase();
  const tags = (s.habitatTags ?? []).map(t => t.toLowerCase()).join(' ');
  const cls = (s.class ?? '').toLowerCase();

  if (s.marine && !s.terrestrial) return 'aquatic';
  if (/burrow|fossorial/.test(behavior)) return 'burrowing';
  if (cls === 'aves') return 'flying';
  if (/arboreal|tree|canopy/.test(behavior) || /arboreal|tree|canopy/.test(tags)) return 'arboreal';
  if (s.freshwater && !s.terrestrial) return 'aquatic';
  return 'terrestrial';
}

export function deriveCombatTraits(species: SpeciesRow): DerivedCombatTraits {
  const sizeMaxCm = Number(species.sizeMaxCm) || 0;
  const sizeClass = sizeClassFromRow(species);
  const combatArchetype = combatArchetypeFromRow(species);
  const defenseType = defenseTypeFromRow(species, sizeMaxCm);
  const attackStyle = attackStyleFromRow(species, combatArchetype, sizeClass);

  return {
    sizeClass,
    combatTier: combatTierFromRow(species),
    combatArchetype,
    locomotion: locomotionFromRow(species),
    defenseType,
    attackStyle,
    primaryElement: primaryElementFromRow(species),
  };
}
