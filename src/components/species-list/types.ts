import type { FeatureClass } from '@/types/gis';
import type { ExpeditionWaypointMemory } from '@/types/waypoints';

export interface RunSummary {
  id: string;
  status: string;
  locationKey: string;
  realm: string | null;
  biome: string | null;
  bioregion: string | null;
  scoreTotal: number;
  finalScore: number | null;
  nodeCount: number;
  startedAt: string;
  endedAt: string | null;
  affinities: string[];
  discoveredSpecies: { id: number; name: string } | null;
  routePolyline: Array<{ lon: number; lat: number }>;
  routeBounds: { minLon: number; minLat: number; maxLon: number; maxLat: number } | null;
  gisFeaturesNearby: Array<{ featureClass: FeatureClass; name?: string | null }>;
  nodes: Array<{
    nodeOrder: number;
    nodeType: string;
    nodeStatus: string;
    scoreEarned: number;
    movesUsed: number;
    obstacleFamily: string | null;
    waypoint?: ExpeditionWaypointMemory | null;
  }>;
}

export interface SpeciesCardSummary {
  completionPct?: number;
  rarityTier?: string;
  cardVariant?: string | null;
  bestRunScore?: number | null;
}

export type AlbumSortMode = 'recent' | 'completion' | 'rarity' | 'best';
export type CasesGroupMode = 'biome' | 'realm' | 'bioregion';
