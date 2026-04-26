import { GemCategory, type CluePayload } from '@/game/clueConfig';

const CLUE_CATEGORY_KEYS: Partial<Record<GemCategory, string>> = {
  [GemCategory.CLASSIFICATION]: 'classification',
  [GemCategory.HABITAT]: 'habitat',
  [GemCategory.GEOGRAPHIC]: 'geographic',
  [GemCategory.MORPHOLOGY]: 'morphology',
  [GemCategory.BEHAVIOR]: 'behavior',
  [GemCategory.LIFE_CYCLE]: 'life_cycle',
  [GemCategory.CONSERVATION]: 'conservation',
  [GemCategory.KEY_FACTS]: 'key_facts',
};

export type SpeciesCardUnlockFact = 'key_fact_1' | 'key_fact_2' | 'key_fact_3' | string;

export function getClueCategoryUnlockKey(category: GemCategory): string | null {
  return CLUE_CATEGORY_KEYS[category] ?? null;
}

export function getFactUnlocksFromClue(clue: CluePayload): SpeciesCardUnlockFact[] {
  if (clue.category !== GemCategory.KEY_FACTS || !clue.clue) return [];
  return [clue.clue];
}

export async function unlockSpeciesCardFromClue(clue: CluePayload): Promise<void> {
  if (!Number.isFinite(clue.speciesId) || clue.speciesId <= 0) return;

  const category = getClueCategoryUnlockKey(clue.category);
  const facts = getFactUnlocksFromClue(clue);
  if (!category && facts.length === 0) return;

  await postSpeciesCardUnlock(clue.speciesId, {
    unlockType: 'clue',
    payload: {
      ...(category ? { categories: [category] } : {}),
      ...(facts.length > 0 ? { facts } : {}),
    },
  });
}

async function postSpeciesCardUnlock(speciesId: number, body: { unlockType: string; payload: Record<string, unknown> }) {
  const response = await fetch(`/api/species/cards/${speciesId}/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok && response.status !== 401) {
    console.warn(`[speciesCardUnlocks] Failed to persist ${body.unlockType} unlock for species ${speciesId}: ${response.status}`);
  }

  if (response.ok && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('species-card-progress-updated', { detail: { speciesId } }));
  }
}
