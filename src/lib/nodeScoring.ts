/**
 * Proximity-based node family scoring for eco run generation.
 *
 * Polygon layers:  score = 0.7 * overlap_ratio + 0.3 * exp(-distance_m / 500)
 * Line layers:     score = exp(-distance_m / 500)  (overlap_ratio always 0)
 */

export type NodeFamily = 'bioregion_node' | 'protected_node' | 'community_node' | 'water_node';

export interface LayerScore {
  nodeFamily: NodeFamily;
  variant: string;
  score: number;
  overlapRatio: number;
  nearestDistanceM: number;
  features: Record<string, unknown>;
}

export interface NodeSelection {
  primaryNodeFamily: NodeFamily;
  primaryVariant: string;
  modifierNodes: string[];
  resourceBias: Record<string, number>;
  signals: Record<string, number>;
}

export interface RunNode {
  node_type: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  obstacles: string[];
  events: string[];
  rationale: string;
}

export interface HabitatSignals {
  water_ratio: number;
  forest_ratio: number;
  urban_ratio: number;
}

const MODIFIER_THRESHOLD = 0.1;
const BIOREGION_FALLBACK_THRESHOLD = 0.05;

/** Polygon scoring formula */
export function scorePolygonLayer(overlapRatio: number, distanceM: number, decayM = 500): number {
  return 0.7 * Math.min(overlapRatio, 1) + 0.3 * Math.exp(-distanceM / decayM);
}

/** Line scoring formula (no area overlap) */
export function scoreLineLayer(distanceM: number, decayM = 500): number {
  return Math.exp(-distanceM / decayM);
}

/** Node family → persisted node_type mapping */
export function mapFamilyToNodeType(family: NodeFamily, variant: string): string {
  if (family === 'water_node') {
    if (variant === 'river') return 'riverbank_sweep';
    if (variant === 'storm') return 'storm_window';
    // lake, marine, coastal, wetland → custom (water traversal variants)
    return 'custom';
  }
  if (family === 'bioregion_node') {
    if (/forest|tropical/i.test(variant)) return 'dense_canopy';
    if (/urban/i.test(variant)) return 'urban_fringe';
    if (/montane|alpine|elevation/i.test(variant)) return 'elevation_ridge';
    return 'custom';
  }
  if (family === 'protected_node' || family === 'community_node') return 'custom';
  return 'elevation_ridge'; // fallback
}

/** Pick primary + modifiers from scored layers.
 *  Bioregion is background context — only becomes primary when no feature layer exceeds threshold. */
export function selectNodes(scores: LayerScore[]): NodeSelection {
  const featureScores = scores.filter((s) => s.nodeFamily !== 'bioregion_node');
  const bioregion = scores.find((s) => s.nodeFamily === 'bioregion_node');
  const sortedFeatures = [...featureScores].sort((a, b) => b.score - a.score);

  const bestFeature = sortedFeatures[0];
  const useBioregionFallback = !bestFeature || bestFeature.score < BIOREGION_FALLBACK_THRESHOLD;

  const primary = useBioregionFallback
    ? (bioregion ?? {
        nodeFamily: 'bioregion_node' as NodeFamily,
        variant: 'fallback',
        score: 0,
        overlapRatio: 0,
        nearestDistanceM: 9999,
        features: {},
      })
    : bestFeature;

  const modifiers = sortedFeatures
    .filter((s) => s !== primary && s.score >= MODIFIER_THRESHOLD)
    .map((s) => `${s.nodeFamily}:${s.variant}`);
  // Bioregion always appears as modifier context when not primary
  if (!useBioregionFallback && bioregion) {
    modifiers.unshift(`bioregion_node:${bioregion.variant}`);
  }

  // Emit signals using documented key names (docs/ACTION_RUN_SCHEMA_AND_GIS_SOURCES.md)
  const SIGNAL_KEY_MAP: Record<string, { overlap: string; distance: string }> = {
    protected_node: { overlap: 'wdpa_overlap_ratio', distance: 'wdpa_distance_m' },
    community_node: { overlap: 'icca_overlap_ratio', distance: 'icca_distance_m' },
    water_node: { overlap: 'water_overlap_ratio', distance: 'river_distance_m' },
    bioregion_node: { overlap: 'bioregion_overlap_ratio', distance: 'bioregion_distance_m' },
  };
  const signals: Record<string, number> = {};
  for (const s of scores) {
    const keys = SIGNAL_KEY_MAP[s.nodeFamily];
    if (keys) {
      if (s.overlapRatio > 0) signals[keys.overlap] = Number(s.overlapRatio.toFixed(4));
      if (s.nearestDistanceM < 9999) signals[keys.distance] = Number(s.nearestDistanceM.toFixed(1));
    }
    signals[`${s.nodeFamily}_score`] = Number(s.score.toFixed(4));
  }

  return {
    primaryNodeFamily: primary.nodeFamily,
    primaryVariant: primary.variant,
    modifierNodes: modifiers,
    resourceBias: computeResourceBias(primary.nodeFamily, scores),
    signals,
  };
}

/** Derive gem resource bias from primary family + context */
function computeResourceBias(primary: NodeFamily, scores: LayerScore[]): Record<string, number> {
  const bias: Record<string, number> = {
    nature_gem: 0.25,
    water_gem: 0.25,
    knowledge_gem: 0.25,
    craft_gem: 0.25,
  };

  if (primary === 'water_node') {
    bias.water_gem = 0.40;
    bias.nature_gem = 0.30;
    bias.knowledge_gem = 0.15;
    bias.craft_gem = 0.15;
  } else if (primary === 'bioregion_node') {
    bias.nature_gem = 0.40;
    bias.knowledge_gem = 0.25;
    bias.water_gem = 0.20;
    bias.craft_gem = 0.15;
  } else if (primary === 'protected_node') {
    bias.knowledge_gem = 0.35;
    bias.craft_gem = 0.25;
    bias.nature_gem = 0.25;
    bias.water_gem = 0.15;
  } else if (primary === 'community_node') {
    bias.knowledge_gem = 0.35;
    bias.nature_gem = 0.30;
    bias.craft_gem = 0.20;
    bias.water_gem = 0.15;
  }

  // Boost water if any water layer is present
  const waterScore = scores.find((s) => s.nodeFamily === 'water_node');
  if (waterScore && waterScore.score > 0.2 && primary !== 'water_node') {
    bias.water_gem = Math.min(bias.water_gem + 0.10, 0.40);
    bias.nature_gem = Math.max(bias.nature_gem - 0.05, 0.10);
    bias.craft_gem = Math.max(bias.craft_gem - 0.05, 0.10);
  }

  return bias;
}

/** Node templates keyed by node_type */
const NODE_TEMPLATES: Record<string, Omit<RunNode, 'difficulty'>> = {
  riverbank_sweep: { node_type: 'riverbank_sweep', obstacles: ['flow_shift', 'mud_tiles'], events: ['amphibian_signal', 'river_crossing'], rationale: 'River proximity drives water mechanics.' },
  dense_canopy: { node_type: 'dense_canopy', obstacles: ['overgrowth', 'low_visibility'], events: ['trail_markings', 'rare_track'], rationale: 'Forest cover supports canopy pressure gameplay.' },
  urban_fringe: { node_type: 'urban_fringe', obstacles: ['junk_blockers', 'noise_interference'], events: ['human_disturbance', 'corridor_crossing'], rationale: 'Human footprint adds urban-edge friction.' },
  elevation_ridge: { node_type: 'elevation_ridge', obstacles: ['steep_terrain'], events: ['vantage_scan'], rationale: 'Terrain-based traversal node.' },
  storm_window: { node_type: 'storm_window', obstacles: ['time_pressure', 'signal_dropout'], events: ['urgent_tracking_window', 'migration_shift'], rationale: 'High-risk urgency from threatened species + low protection.' },
  custom: { node_type: 'custom', obstacles: ['unknown_terrain'], events: ['discovery_event'], rationale: 'Context-specific challenge from spatial data.' },
  analysis: { node_type: 'analysis', obstacles: ['limited_signal'], events: ['wager_guess'], rationale: 'End-of-route deduction and wager phase.' },
};

/** Unified 6-node run generator. Derives all nodes from layer scores + habitat context. */
export function generateRunNodes(
  selection: NodeSelection,
  scores: LayerScore[],
  habitat: HabitatSignals,
  threatenedCount: number,
  protectedCoverage: number,
): RunNode[] {
  const nodes: RunNode[] = [];

  // Node 1: primary from scoring
  const primaryType = mapFamilyToNodeType(selection.primaryNodeFamily, selection.primaryVariant);
  const t1 = NODE_TEMPLATES[primaryType] ?? NODE_TEMPLATES.custom;
  nodes.push({ ...t1, difficulty: scores[0]?.score > 0.5 ? 4 : 3 });

  // Nodes 2-4: from modifiers and habitat signals
  const modifierTypes = selection.modifierNodes
    .map((m) => {
      const [fam, variant] = m.split(':') as [NodeFamily, string];
      return mapFamilyToNodeType(fam, variant);
    })
    .filter((t) => t !== primaryType); // avoid duplicate of primary

  for (const mt of modifierTypes.slice(0, 2)) {
    const tmpl = NODE_TEMPLATES[mt] ?? NODE_TEMPLATES.custom;
    nodes.push({ ...tmpl, difficulty: 3 });
  }

  // Fill from habitat ratios if we still need nodes
  if (nodes.length < 4 && habitat.water_ratio >= 0.2 && !nodes.some((n) => n.node_type === 'riverbank_sweep')) {
    nodes.push({ ...NODE_TEMPLATES.riverbank_sweep, difficulty: habitat.water_ratio >= 0.4 ? 4 : 3 });
  }
  if (nodes.length < 4 && habitat.forest_ratio >= 0.3 && !nodes.some((n) => n.node_type === 'dense_canopy')) {
    nodes.push({ ...NODE_TEMPLATES.dense_canopy, difficulty: habitat.forest_ratio >= 0.6 ? 4 : 3 });
  }
  if (nodes.length < 4 && habitat.urban_ratio >= 0.15 && !nodes.some((n) => n.node_type === 'urban_fringe')) {
    nodes.push({ ...NODE_TEMPLATES.urban_fringe, difficulty: habitat.urban_ratio >= 0.35 ? 4 : 2 });
  }

  // Storm window if threatened species + low protection
  if (nodes.length < 5 && threatenedCount >= 2 && protectedCoverage < 0.3) {
    nodes.push({ ...NODE_TEMPLATES.storm_window, difficulty: 5 });
  }

  // Fill remaining with elevation_ridge
  while (nodes.length < 5) {
    nodes.push({ ...NODE_TEMPLATES.elevation_ridge, difficulty: 2 });
  }

  // Node 6: always analysis
  nodes.push({ ...NODE_TEMPLATES.analysis, difficulty: 3 });

  return nodes.slice(0, 6);
}
