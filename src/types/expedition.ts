import type { RunNode } from '@/lib/nodeScoring';

export type { RunNode };

export type RunPhase = 'idle' | 'briefing' | 'in-run' | 'complete';

export interface ExpeditionData {
  nodes: RunNode[];
  bioregion: { bioregion: string | null; realm: string | null; biome: string | null } | null;
  protectedAreas: Array<{ name: string | null; designation: string | null; iucn_category: string | null }>;
  resourceBias: Record<string, number>;
  primaryNodeFamily: string;
  primaryVariant: string;
  modifierNodes: string[];
  signals: Record<string, number>;
  iccaTerritories?: Array<{ name: string | null; comm_name: string | null; habit_type: string | null; threats: string | null; distance_m: number }>;
  nearestRiverDistM?: number | null;
}

/** Short display labels for node_type values */
export const NODE_TYPE_LABELS: Record<string, string> = {
  riverbank_sweep: 'River',
  dense_canopy: 'Canopy',
  urban_fringe: 'Urban',
  elevation_ridge: 'Ridge',
  storm_window: 'Storm',
  analysis: 'Analysis',
  custom: 'Special',
};

/** Shared gem display metadata */
export const GEM_DEFS = [
  { key: 'nature_gem' as const, label: 'Nature', color: '#22c55e' },
  { key: 'water_gem' as const, label: 'Water', color: '#3b82f6' },
  { key: 'knowledge_gem' as const, label: 'Knowledge', color: '#e2e8f0' },
  { key: 'craft_gem' as const, label: 'Craft', color: '#f97316' },
] as const;

export interface RunState {
  phase: RunPhase;
  expedition: ExpeditionData | null;
  currentNodeIndex: number;
  gemWallet: { nature_gem: number; water_gem: number; knowledge_gem: number; craft_gem: number };
}
