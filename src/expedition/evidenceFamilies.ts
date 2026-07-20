import type { LootGemType } from '@/expedition/domain';

export const EVIDENCE_FAMILIES = [
  'relatives',
  'body',
  'behavior',
  'habits',
  'place',
] as const;

export type EvidenceFamily = typeof EVIDENCE_FAMILIES[number];
export type EvidenceChargeState = Record<EvidenceFamily, number>;

export const MAX_EVIDENCE_CHARGE = 384;

export const EVIDENCE_FAMILY_GEMS: Record<EvidenceFamily, LootGemType> = {
  relatives: 'red',
  body: 'orange',
  behavior: 'yellow',
  habits: 'green',
  place: 'blue',
};

export const GEM_EVIDENCE_FAMILIES = Object.fromEntries(
  EVIDENCE_FAMILIES.map(family => [EVIDENCE_FAMILY_GEMS[family], family]),
) as Partial<Record<LootGemType, EvidenceFamily>>;

export const EVIDENCE_FAMILY_LABELS: Record<EvidenceFamily, string> = {
  relatives: 'Relatives',
  body: 'Body',
  behavior: 'Behavior',
  habits: 'Habits',
  place: 'Place',
};

export const EVIDENCE_FAMILY_QUESTIONS: Record<EvidenceFamily, string> = {
  relatives: 'What is this animal related to?',
  body: 'What does its body reveal?',
  behavior: 'How does this animal act?',
  habits: 'What does it eat?',
  place: 'What does this place reveal?',
};

export function createEmptyEvidenceCharges(): EvidenceChargeState {
  return { relatives: 0, body: 0, behavior: 0, habits: 0, place: 0 };
}

export function isEvidenceFamily(value: unknown): value is EvidenceFamily {
  return typeof value === 'string' && EVIDENCE_FAMILIES.includes(value as EvidenceFamily);
}

export function parseEvidenceCharges(value: unknown): EvidenceChargeState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const result = createEmptyEvidenceCharges();
  for (const family of EVIDENCE_FAMILIES) {
    const amount = source[family];
    if (!Number.isInteger(amount) || (amount as number) < 0 || (amount as number) > MAX_EVIDENCE_CHARGE) {
      return null;
    }
    result[family] = amount as number;
  }
  return result;
}

export function deriveEvidenceFamilyOffer(
  charges: EvidenceChargeState,
  selectedFamilies: readonly EvidenceFamily[],
): EvidenceFamily[] {
  const selected = new Set(selectedFamilies);
  const ranked = EVIDENCE_FAMILIES
    .filter(family => !selected.has(family))
    .sort((left, right) => charges[right] - charges[left]
      || EVIDENCE_FAMILIES.indexOf(left) - EVIDENCE_FAMILIES.indexOf(right));
  if (ranked.length <= 2) return ranked;
  const floor = charges[ranked[1]];
  const offered = ranked.filter(family => charges[family] >= floor);
  return offered.length >= 2 ? offered : ranked.slice(0, 2);
}

export function getAllowedEvidenceGemTypes(selectedFamilies: readonly EvidenceFamily[]): LootGemType[] {
  const selected = new Set(selectedFamilies);
  return EVIDENCE_FAMILIES
    .filter(family => !selected.has(family))
    .map(family => EVIDENCE_FAMILY_GEMS[family]);
}
