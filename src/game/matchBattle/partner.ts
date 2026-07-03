import type {
  CombatArchetype,
  CombatDefenseType,
  CombatSizeClass,
  CombatTier,
} from '@/db/schema/species';

export interface MatchBattlePartnerPassive {
  hpBonus: number;
  defenseHpBonus: number;
  pressureBonus: number;
  description: string;
}

export interface MatchBattlePartner {
  speciesId: number;
  commonName: string;
  scientificName: string | null;
  sizeClass: CombatSizeClass;
  defenseType: CombatDefenseType;
  combatArchetype: CombatArchetype;
  combatTier: CombatTier;
  passive: MatchBattlePartnerPassive;
}

const SIZE_HP_BONUS: Record<CombatSizeClass, number> = {
  tiny: 1,
  small: 2,
  medium: 3,
  large: 4,
  massive: 6,
};

const DEFENSE_HP_BONUS: Partial<Record<CombatDefenseType, number>> = {
  shell: 4,
  size: 2,
};

export function derivePartnerPassive(input: {
  sizeClass: CombatSizeClass;
  defenseType: CombatDefenseType;
  combatArchetype: CombatArchetype;
}): MatchBattlePartnerPassive {
  const hpBonus = SIZE_HP_BONUS[input.sizeClass] ?? 0;
  const defenseHpBonus = DEFENSE_HP_BONUS[input.defenseType] ?? 0;
  const pressureBonus = input.combatArchetype === 'aggressive' || input.combatArchetype === 'ambush' ? 1 : 0;
  const parts = [
    hpBonus + defenseHpBonus > 0 ? `+${hpBonus + defenseHpBonus} Stamina` : null,
    pressureBonus > 0 ? `+${pressureBonus} Data on Pressure matches` : null,
  ].filter(Boolean);
  return {
    hpBonus: hpBonus + defenseHpBonus,
    defenseHpBonus,
    pressureBonus,
    description: parts.join(' · ') || 'Field morale',
  };
}
