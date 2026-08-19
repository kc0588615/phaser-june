import { EVIDENCE_PROTOTYPE_IUCN_IDS } from '@/lib/evidenceSeedValidation';

export const FIELD_PLATE_IUCN_IDS = EVIDENCE_PROTOTYPE_IUCN_IDS;

const FIELD_PLATE_IUCN_ID_SET = new Set<number>(FIELD_PLATE_IUCN_IDS);

export function hasFieldPlatePortrait(iucnId: number): boolean {
  return FIELD_PLATE_IUCN_ID_SET.has(iucnId);
}
