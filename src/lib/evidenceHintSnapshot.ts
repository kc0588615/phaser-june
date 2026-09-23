import { parseExplanationEffects, type ExplanationEffects } from '@/lib/liveClaims';
import { EVIDENCE_FAMILIES, type EvidenceFamily } from '@/expedition/evidenceFamilies';
import { CASE_TRAIT_CATEGORIES, type CaseTraitCategory } from '@/lib/caseTraits';

/** Private run content: independent of mutable authoring rows, including deleted rungs. */
export interface EvidenceHintSnapshot {
  id: number;
  family: EvidenceFamily;
  hintText: string;
  weakTag: string;
  traitCategory: CaseTraitCategory;
  explains?: ExplanationEffects | null;
}

export function snapshotEvidenceHints(
  idsByFamily: Record<EvidenceFamily, number[]>,
  rows: readonly EvidenceHintSnapshot[],
): EvidenceHintSnapshot[] {
  const byId = new Map(rows.map(row => [row.id, row]));
  return EVIDENCE_FAMILIES.flatMap(family => idsByFamily[family].map(id => {
    const row = byId.get(id);
    if (!row || row.family !== family || !row.hintText || !row.weakTag
      || !CASE_TRAIT_CATEGORIES.includes(row.traitCategory)) {
      throw new Error(`Cannot preserve compiled evidence hint ${id}`);
    }
    return { id, family, hintText: row.hintText, weakTag: row.weakTag, traitCategory: row.traitCategory, ...(row.explains !== undefined ? { explains: parseExplanationEffects(row.explains) } : {}) };
  }));
}

export function parseEvidenceHintSnapshot(
  value: unknown,
  idsByFamily: Record<EvidenceFamily, number[]>,
): EvidenceHintSnapshot[] | null {
  if (!Array.isArray(value) || value.length !== Object.values(idsByFamily).flat().length) return null;
  if (value.some(row => !row || typeof row !== 'object'
    || !Number.isSafeInteger(row.id) || typeof row.hintText !== 'string' || typeof row.weakTag !== 'string')
    || new Set(value.map(row => row.id)).size !== value.length) return null;
  try {
    return snapshotEvidenceHints(idsByFamily, value);
  } catch {
    return null;
  }
}
