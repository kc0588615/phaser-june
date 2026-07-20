import type { FeatureClass } from '@/types/gis';
import type { RoutePoint } from '@/lib/expeditionRoute';
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
  hasResumeSnapshot?: boolean;
  discoveredSpecies: { id: number; name: string } | null;
  routePolyline: RoutePoint[];
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
