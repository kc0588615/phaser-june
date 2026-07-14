import { getRouteBounds, normalizeRoutePolyline, type RoutePoint } from '@/lib/expeditionRoute';
import { buildRunEvidenceBundle } from '@/lib/featureFingerprint';
import { createEmptyFeatureMastery, updateFeatureMastery, type FeatureMasteryData } from '@/lib/featureMastery';
import { getGisStampClasses } from '@/lib/gisFeatureHelpers';
import type { FeatureClass, FeatureFingerprint } from '@/types/gis';

interface CompletionNode {
  nodeStatus: string;
  boardContext: unknown;
}

interface CompletionVisit {
  runId: string;
  finalScore: number;
  completedAt: Date;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function validFeatureMastery(value: unknown): FeatureMasteryData {
  const source = record(value);
  const featureCounts = record(source.featureCounts);
  const normalizedCounts: FeatureMasteryData['featureCounts'] = {};
  for (const [key, count] of Object.entries(featureCounts)) {
    if (typeof count === 'number' && Number.isFinite(count) && count >= 0) {
      normalizedCounts[key as FeatureClass] = count;
    }
  }
  return {
    featureCounts: normalizedCounts,
    totalRuns: typeof source.totalRuns === 'number' && Number.isFinite(source.totalRuns) && source.totalRuns >= 0
      ? source.totalRuns
      : 0,
  };
}

/** Use completed node waypoints as the authoritative traversed route. */
export function resolveCompletedRunRoute(
  startLon: number,
  startLat: number,
  nodes: readonly CompletionNode[],
  fallbackRoute: unknown,
): RoutePoint[] {
  const route: RoutePoint[] = [{ lon: startLon, lat: startLat }];
  for (const node of nodes) {
    if (node.nodeStatus !== 'completed') continue;
    const waypoint = record(record(node.boardContext).waypoint);
    const point = normalizeRoutePolyline([waypoint])[0];
    if (point) route.push(point);
  }

  const unique = route.filter((point, index) => index === 0
    || point.lon !== route[index - 1].lon
    || point.lat !== route[index - 1].lat);
  if (unique.length > 1) return unique;

  const fallback = normalizeRoutePolyline(fallbackRoute);
  return fallback.length > 0 ? fallback : unique;
}

export function buildRunMemoryArtifacts(route: RoutePoint[], fingerprints: FeatureFingerprint[]) {
  return {
    routePolyline: route,
    routeBounds: getRouteBounds(route),
    gisFeaturesNearby: fingerprints,
  };
}

export function getRunGisStamps(fingerprints: FeatureFingerprint[]): FeatureClass[] {
  return getGisStampClasses(fingerprints);
}

export function getExpeditionRegionKeys(region: {
  realm: string | null;
  biome: string | null;
  bioregion: string | null;
}): string[] {
  return [
    region.realm ? `realm:${region.realm}` : null,
    region.biome ? `biome:${region.biome}` : null,
    region.bioregion ? `bioregion:${region.bioregion}` : null,
  ].filter((value): value is string => Boolean(value));
}

export function getRunAffinityTags(metadata: unknown): string[] {
  const activeAffinities = record(metadata).activeAffinities;
  return Array.isArray(activeAffinities)
    ? [...new Set(activeAffinities.filter((tag): tag is string => typeof tag === 'string' && tag.length > 0))]
    : [];
}

export function buildLocationMasteryMetadata(
  existingMetadata: unknown,
  fingerprints: FeatureFingerprint[],
  visit: CompletionVisit,
): Record<string, unknown> {
  const existing = record(existingMetadata);
  const currentMastery = existing.featureMastery
    ? validFeatureMastery(existing.featureMastery)
    : createEmptyFeatureMastery();
  const previousBest = typeof existing.bestScore === 'number' && Number.isFinite(existing.bestScore)
    ? existing.bestScore
    : 0;

  return {
    ...existing,
    featureMastery: updateFeatureMastery(currentMastery, buildRunEvidenceBundle(fingerprints)),
    lastVisit: {
      runId: visit.runId,
      completedAt: visit.completedAt.toISOString(),
      score: visit.finalScore,
    },
    bestScore: Math.max(previousBest, visit.finalScore),
  };
}
