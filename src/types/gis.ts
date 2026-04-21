export type FeatureClass = 'river' | 'lake' | 'protected_area' | 'bioregion' | 'ramsar_site';

export interface FeatureFingerprint {
  featureClass: FeatureClass;
  sourceTable: string;
  sourceId: string | number;
  name: string | null;
  distanceM: number;
  overlapRatio: number;
  properties: Record<string, unknown>;
}

export interface RunEvidenceBundle {
  fingerprints: FeatureFingerprint[];
  featureClassCounts: Partial<Record<FeatureClass, number>>;
  dominantFeatureClass: FeatureClass | null;
  uniqueProtectedAreas: string[];
  bioregionContext: { bioregion: string | null; realm: string | null; biome: string | null } | null;
}
