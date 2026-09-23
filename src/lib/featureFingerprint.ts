/**
 * Aggregates FeatureFingerprints into a RunEvidenceBundle for deduction/card systems.
 */

import type { FeatureClass, FeatureFingerprint, RunEvidenceBundle } from '@/types/gis';

/** Aggregate fingerprints across nodes into a run-level evidence bundle. */
export function buildRunEvidenceBundle(allFingerprints: FeatureFingerprint[]): RunEvidenceBundle {
  const counts: Partial<Record<FeatureClass, number>> = {};
  const paNames = new Set<string>();
  let bioCtx: RunEvidenceBundle['bioregionContext'] = null;

  for (const fp of allFingerprints) {
    counts[fp.featureClass] = (counts[fp.featureClass] ?? 0) + 1;

    if (fp.featureClass === 'protected_area' && fp.name) {
      paNames.add(fp.name);
    }
    if (fp.featureClass === 'bioregion' && !bioCtx) {
      bioCtx = {
        bioregion: (fp.properties.bioregion as string) ?? null,
        realm: (fp.properties.realm as string) ?? null,
        biome: (fp.properties.biome as string) ?? null,
      };
    }
  }

  let dominant: FeatureClass | null = null;
  let maxCount = 0;
  for (const [fc, count] of Object.entries(counts) as [FeatureClass, number][]) {
    if (fc !== 'bioregion' && count > maxCount) {
      dominant = fc;
      maxCount = count;
    }
  }

  return {
    fingerprints: allFingerprints,
    featureClassCounts: counts,
    dominantFeatureClass: dominant,
    uniqueProtectedAreas: [...paNames],
    bioregionContext: bioCtx,
  };
}
