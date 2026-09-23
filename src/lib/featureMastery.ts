/**
 * Feature class mastery tracking.
 * Extends ecoLocationMastery.metadata jsonb with feature class encounter counts.
 */

import type { FeatureClass, RunEvidenceBundle } from '@/types/gis';

export interface FeatureMasteryData {
  featureCounts: Partial<Record<FeatureClass, number>>;
  totalRuns: number;
}

export function createEmptyFeatureMastery(): FeatureMasteryData {
  return { featureCounts: {}, totalRuns: 0 };
}

/** Merge a run's evidence bundle into cumulative mastery data. */
export function updateFeatureMastery(
  current: FeatureMasteryData,
  bundle: RunEvidenceBundle,
): FeatureMasteryData {
  const updated = { ...current, featureCounts: { ...current.featureCounts }, totalRuns: current.totalRuns + 1 };
  for (const [fc, count] of Object.entries(bundle.featureClassCounts) as [FeatureClass, number][]) {
    updated.featureCounts[fc] = (updated.featureCounts[fc] ?? 0) + count;
  }
  return updated;
}
