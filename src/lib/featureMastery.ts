/**
 * Feature class mastery tracking.
 * Extends ecoLocationMastery.metadata jsonb with feature class encounter counts.
 */

import type { FeatureClass, RunEvidenceBundle } from '@/types/gis';

export type FeatureMasteryTier = 'novice' | 'familiar' | 'expert' | 'master';

const TIER_THRESHOLDS: [number, FeatureMasteryTier][] = [
  [10, 'master'],
  [5, 'expert'],
  [2, 'familiar'],
  [0, 'novice'],
];

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

/** Get mastery tier for a specific feature class. */
export function getFeatureMasteryTier(data: FeatureMasteryData, featureClass: FeatureClass): FeatureMasteryTier {
  const count = data.featureCounts[featureClass] ?? 0;
  for (const [threshold, tier] of TIER_THRESHOLDS) {
    if (count >= threshold) return tier;
  }
  return 'novice';
}

/** Get overall mastery tier across all feature classes. */
export function getOverallMasteryTier(data: FeatureMasteryData): FeatureMasteryTier {
  const total = Object.values(data.featureCounts).reduce((sum, v) => sum + (v ?? 0), 0);
  for (const [threshold, tier] of TIER_THRESHOLDS) {
    if (total >= threshold * 3) return tier;
  }
  return 'novice';
}
