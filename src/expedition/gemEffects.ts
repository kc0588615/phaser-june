import type { GemType } from './domain';
import type { ClueCategoryKey } from '@/types/expedition';

export type GemEffect =
  | { type: 'direct_score'; amount: number }
  | { type: 'trivia_boost'; factor: number }
  | { type: 'decay_slow'; factor: number; durationMs: number }
  | { type: 'open_cache'; scoreAmount: number; triviaChance: number; fragmentChance: number }
  | { type: 'score_multiply'; factor: number }
  | { type: 'clue_discount'; factor: number }
  | { type: 'grant_consumable' }
  | { type: 'combo_enhance'; factor: number; durationMoves: number }
  | { type: 'clue_fragment'; category: ClueCategoryKey; amount: number };

/** Loot gem color → clue category mapping */
const LOOT_CATEGORY_MAP: Record<string, ClueCategoryKey> = {
  red: 'classification',
  green: 'habitat',
  blue: 'geographic',
  orange: 'morphology',
  yellow: 'behavior',
  black: 'life_cycle',
  white: 'conservation',
  purple: 'key_facts',
};

/** Compute gem effects for a match of the given gem type and size. */
export function getGemEffects(gemType: GemType, matchSize: number): GemEffect[] {
  const bonus = matchSize >= 5 ? 2 : matchSize >= 4 ? 1.5 : 1;

  switch (gemType) {
    case 'sword':
      return [{ type: 'direct_score', amount: Math.round(10 * bonus) }];
    case 'staff':
      return [{ type: 'trivia_boost', factor: 0.1 * bonus }];
    case 'shield':
      return [{ type: 'decay_slow', factor: 0.5, durationMs: 5000 }];
    case 'key':
      return [{ type: 'open_cache', scoreAmount: Math.round(15 * bonus), triviaChance: 0.3, fragmentChance: 0.3 }];
    case 'power':
      return [{ type: 'score_multiply', factor: 1 + 0.15 * bonus }];
    case 'thought':
      return [{ type: 'clue_discount', factor: 0.05 * bonus }];
    case 'crate':
      return [{ type: 'grant_consumable' }];
    case 'multiplier':
      return [{ type: 'combo_enhance', factor: 1.5, durationMoves: 2 }];
    default: {
      const category = LOOT_CATEGORY_MAP[gemType];
      if (category) {
        return [{ type: 'clue_fragment', category, amount: matchSize }];
      }
      return [];
    }
  }
}
