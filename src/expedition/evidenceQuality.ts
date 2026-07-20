export type EvidenceQualityTier = 1 | 2 | 3;
export type EvidenceQualityLabel = 'Broad' | 'Replicated' | 'High-resolution';

export const EVIDENCE_QUALITY_LABELS: Record<EvidenceQualityTier, EvidenceQualityLabel> = {
  1: 'Broad',
  2: 'Replicated',
  3: 'High-resolution',
};

export function isBestTargetMatchLength(value: unknown): value is number {
  return value === 0 || (Number.isInteger(value) && (value as number) >= 3 && (value as number) <= 8);
}

export function evidenceTierForMatchLength(length: number): EvidenceQualityTier | null {
  if (length === 3) return 1;
  if (length === 4) return 2;
  if (length >= 5 && length <= 8) return 3;
  return null;
}

export function evidenceLabelForMatchLength(length: number): EvidenceQualityLabel | null {
  const tier = evidenceTierForMatchLength(length);
  return tier ? EVIDENCE_QUALITY_LABELS[tier] : null;
}

/** Called for every match group; only direct-resolution (first-swap) target
 *  groups update sampling quality — cascades count for progress, not tier. */
export function updateBestTargetMatchLength(current: number, matchLength: number, isTargetMethod: boolean, isDirect: boolean): number {
  if (!isTargetMethod || !isDirect || matchLength < 3) return current;
  return Math.max(current, Math.min(8, matchLength));
}
