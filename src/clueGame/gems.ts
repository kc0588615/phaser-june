// Which board gem is which Question Match kind (plan 041), and how the HUD shows
// it. The board only knows gem colors; the rules only know kinds.
import type { GemType } from '@/game/constants';
import { CHARGE_CATEGORIES, type GemKind } from '@/clueGame/questionMatch';

export const GEM_OF: Record<GemKind, GemType> = { body: 'orange', habits: 'yellow', habitat: 'green', range: 'blue', life: 'black', notes: 'purple' };

const KINDS = new Map(Object.entries(GEM_OF).map(([kind, gem]) => [gem, kind as GemKind]));

/** The kind a gem color stands for; null for colors the game doesn't use. */
export function kindOf(gem: GemType): GemKind | null {
  return KINDS.get(gem) ?? null;
}

/** The five colors that match; the note gem never does. */
export const MATCH_GEMS: GemType[] = CHARGE_CATEGORIES.map(category => GEM_OF[category]);

/** The rare note gem: collected when a match happens next to it. About 1 in 20 new gems. */
export const NOTE_GEM = { type: GEM_OF.notes, chance: 0.05 };

/** HUD swatches: the light stop of each gem icon's gradient. */
export const KIND_COLOR: Record<GemKind, string> = {
  body: '#ffc56b', habits: '#ffe87c', habitat: '#7bd99b', range: '#79d7ff', life: '#a7afbd', notes: '#c9a2ff',
};

/** Fits a phone chip. */
export const SHORT_LABEL: Record<GemKind, string> = { body: 'Body', habits: 'Habits', habitat: 'Habitat', range: 'Range', life: 'Life', notes: 'Notes' };
