// Maps species_combat_traits rows to MatchBattleEnemy. Generic catalog enemies
// remain the fallback when no species combat traits are available.

import type { EnemyIntent, MatchBattleEnemy, MatchBattleNodeType } from './types';
import type {
  CombatSizeClass,
  CombatDefenseType,
  CombatTier,
  CombatArchetype,
} from '@/db/schema/species';

export interface SpeciesCombatInput {
  speciesId: number;
  commonName: string;
  sizeClass: CombatSizeClass;
  defenseType: CombatDefenseType;
  combatTier: CombatTier;
  combatArchetype: CombatArchetype;
  /** Exact max HP override. When set, size/tier/node/difficulty scaling is skipped. */
  hpOverride?: number | null;
  guardOverride?: number | null;
}

const SIZE_HP: Record<CombatSizeClass, number> = {
  tiny: 8, small: 14, medium: 20, large: 30, massive: 42,
};

const TIER_HP_MULT: Record<CombatTier, number> = {
  common: 1.0, uncommon: 1.15, rare: 1.35, apex: 1.65,
};

const NODE_HP_MULT: Partial<Record<MatchBattleNodeType, number>> = {
  enemy: 1.0, challenge: 1.1, elite: 1.25, leader: 1.6,
};

const DIFFICULTY_HP_BONUS = 2;
const HP_CAP_BASE: Partial<Record<MatchBattleNodeType, number>> = {
  enemy: 28, challenge: 36, elite: 46, leader: 52,
};
const HP_CAP_PER_DIFFICULTY = 2;

const DEFENSE_GUARD: Record<CombatDefenseType, number> = {
  shell: 12, size: 8, toxin: 0, camouflage: 0, speed: 0, none: 0,
};

const TIER_RANK: Record<CombatTier, number> = { common: 0, uncommon: 1, rare: 2, apex: 3 };

// Per-archetype intent patterns, cycled deterministically by turn so the
// same encounter always plays out the same way. Labels follow the
// wildlife-observation copy style of catalog.ts ("Startle", "Tangle Board").
interface IntentStep {
  type: EnemyIntent['type'];
  base: number;          // amount before difficulty/tier/node scaling
  perDifficulty: number; // amount added per difficulty point
  debuffId?: 'burn' | 'web';
  label: string;
}

const ARCHETYPE_PATTERNS: Record<CombatArchetype, IntentStep[]> = {
  aggressive: [
    { type: 'attack', base: 8, perDifficulty: 2, label: 'Startle' },
    { type: 'attack', base: 8, perDifficulty: 2, label: 'Bluff Charge' },
    { type: 'attack', base: 12, perDifficulty: 2, label: 'Fast Approach' },
  ],
  defensive: [
    { type: 'guard', base: 8, perDifficulty: 1, label: 'Hunker Down' },
    { type: 'attack', base: 6, perDifficulty: 1, label: 'Defensive Display' },
    { type: 'guard', base: 8, perDifficulty: 1, label: 'Hunker Down' },
    { type: 'attack', base: 6, perDifficulty: 2, label: 'Defensive Display' },
  ],
  evasive: [
    { type: 'attack', base: 5, perDifficulty: 1, label: 'Startle' },
    { type: 'debuff', base: 0, perDifficulty: 0, debuffId: 'web', label: 'Tangle Board' },
    { type: 'attack', base: 6, perDifficulty: 1, label: 'Quick Dash' },
  ],
  toxic: [
    { type: 'attack_debuff', base: 5, perDifficulty: 1, debuffId: 'burn', label: 'Warning Display' },
    { type: 'attack', base: 6, perDifficulty: 1, label: 'Startle' },
    { type: 'debuff', base: 0, perDifficulty: 0, debuffId: 'burn', label: 'Bright Flash' },
  ],
  ambush: [
    { type: 'guard', base: 6, perDifficulty: 1, label: 'Lie in Wait' },
    { type: 'attack', base: 14, perDifficulty: 2, label: 'Pounce' },
  ],
};

const TIER_AMOUNT_BONUS: Record<CombatTier, number> = { common: 0, uncommon: 1, rare: 2, apex: 4 };
const NODE_AMOUNT_BONUS: Partial<Record<MatchBattleNodeType, number>> = { elite: 2, leader: 4 };

export function nextSpeciesIntent(
  input: SpeciesCombatInput,
  nodeType: MatchBattleNodeType,
  turn: number,
  difficulty: number,
): EnemyIntent {
  const pattern = ARCHETYPE_PATTERNS[input.combatArchetype];
  const step = pattern[(Math.max(1, turn) - 1) % pattern.length];
  const scale = Math.max(1, difficulty);
  const amount = step.base === 0
    ? 0
    : step.base + step.perDifficulty * scale + TIER_AMOUNT_BONUS[input.combatTier] + (NODE_AMOUNT_BONUS[nodeType] ?? 0);
  return { type: step.type, amount, debuffId: step.debuffId, label: step.label };
}

/**
 * Deterministic species pick per combat node. Leaders get the highest-tier
 * species, elites the next band down, regular encounters cycle the rest by
 * node index. Returns null when no combatants are available (caller falls
 * back to the generic createEnemy()).
 */
export function pickCombatant(
  combatants: SpeciesCombatInput[],
  nodeType: MatchBattleNodeType,
  nodeIndex: number,
): SpeciesCombatInput | null {
  if (combatants.length === 0) return null;
  const sorted = [...combatants].sort(
    (a, b) => TIER_RANK[b.combatTier] - TIER_RANK[a.combatTier] || a.speciesId - b.speciesId,
  );
  if (nodeType === 'leader') return sorted[0];
  if (nodeType === 'elite') return sorted[Math.min(1, sorted.length - 1)];
  const regularPool = sorted.length > 2 ? sorted.slice(2) : sorted.slice(1);
  const rest = regularPool.length > 0 ? regularPool : sorted;
  return rest[nodeIndex % rest.length];
}

export function createEnemyFromSpecies(
  input: SpeciesCombatInput,
  nodeType: MatchBattleNodeType,
  difficulty: number,
): MatchBattleEnemy {
  const scale = Math.max(1, difficulty);
  const rawHp = input.hpOverride ?? Math.round(
    SIZE_HP[input.sizeClass] * TIER_HP_MULT[input.combatTier] * (NODE_HP_MULT[nodeType] ?? 1.0)
    + scale * DIFFICULTY_HP_BONUS,
  );
  const cap = input.hpOverride == null
    ? (HP_CAP_BASE[nodeType] ?? HP_CAP_BASE.enemy ?? 28) + scale * HP_CAP_PER_DIFFICULTY
    : rawHp;
  const maxHp = Math.max(1, Math.min(rawHp, cap));
  return {
    id: `species_${input.speciesId}_${nodeType}`,
    name: input.commonName,
    maxHp,
    hp: maxHp,
    guard: input.guardOverride ?? DEFENSE_GUARD[input.defenseType],
    intent: nextSpeciesIntent(input, nodeType, 1, scale),
  };
}
