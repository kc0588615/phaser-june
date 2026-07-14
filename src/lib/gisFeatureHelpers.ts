import type { FeatureClass, FeatureFingerprint } from '@/types/gis';

function fingerprintKey(fingerprint: FeatureFingerprint): string {
  return `${fingerprint.featureClass}:${fingerprint.sourceTable}:${String(fingerprint.sourceId)}`;
}

export function dedupeFeatureFingerprints(fingerprints: FeatureFingerprint[]): FeatureFingerprint[] {
  const byKey = new Map<string, FeatureFingerprint>();
  for (const fingerprint of fingerprints) {
    const key = fingerprintKey(fingerprint);
    const existing = byKey.get(key);
    if (!existing || fingerprint.distanceM < existing.distanceM || fingerprint.overlapRatio > existing.overlapRatio) {
      byKey.set(key, fingerprint);
    }
  }
  return [...byKey.values()];
}

export function getGisStampClasses(fingerprints: FeatureFingerprint[]): FeatureClass[] {
  return [...new Set(fingerprints.map(fingerprint => fingerprint.featureClass))];
}
