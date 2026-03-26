/**
 * Proximity-based node family scoring for eco run generation.
 *
 * Polygon layers:  score = 0.7 * overlap_ratio + 0.3 * exp(-distance_m / 500)
 * Line layers:     score = exp(-distance_m / 500)  (overlap_ratio always 0)
 */

import type { ActionGemType, GemType } from '@/game/constants';
import type { NodeObstacle } from '@/game/nodeObstacles';

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
  actionBias: Partial<Record<ActionGemType, number>>;
  signals: Record<string, number>;
}

export interface RunNode {
  node_type: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  obstacles: NodeObstacle[];
  events: string[];
  rationale: string;
  requiredGems: GemType[];
  objectiveTarget: number;
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
    actionBias: computeActionBias(primary.nodeFamily, scores),
    signals,
  };
}

/** Derive board action bias from primary family + context. */
function computeActionBias(primary: NodeFamily, scores: LayerScore[]): Partial<Record<ActionGemType, number>> {
  const bias: Partial<Record<ActionGemType, number>> = {
    sword: 0.125,
    staff: 0.125,
    shield: 0.125,
    key: 0.125,
    crate: 0.125,
    power: 0.125,
    thought: 0.125,
    multiplier: 0.125,
  };

  if (primary === 'water_node') {
    bias.shield = 0.22;
    bias.power = 0.18;
    bias.staff = 0.16;
    bias.crate = 0.12;
    bias.thought = 0.1;
    bias.key = 0.08;
    bias.sword = 0.08;
    bias.multiplier = 0.06;
  } else if (primary === 'bioregion_node') {
    bias.sword = 0.18;
    bias.crate = 0.17;
    bias.thought = 0.15;
    bias.shield = 0.14;
    bias.power = 0.12;
    bias.staff = 0.1;
    bias.key = 0.08;
    bias.multiplier = 0.06;
  } else if (primary === 'protected_node') {
    bias.key = 0.18;
    bias.shield = 0.18;
    bias.thought = 0.15;
    bias.power = 0.14;
    bias.multiplier = 0.12;
    bias.staff = 0.09;
    bias.sword = 0.08;
    bias.crate = 0.06;
  } else if (primary === 'community_node') {
    bias.thought = 0.18;
    bias.crate = 0.17;
    bias.key = 0.14;
    bias.shield = 0.14;
    bias.power = 0.12;
    bias.sword = 0.1;
    bias.staff = 0.09;
    bias.multiplier = 0.06;
  }

  // Water-heavy contexts should over-index on survival and charge generation.
  const waterScore = scores.find((s) => s.nodeFamily === 'water_node');
  if (waterScore && waterScore.score > 0.2 && primary !== 'water_node') {
    bias.shield = Math.min((bias.shield ?? 0) + 0.05, 0.25);
    bias.power = Math.min((bias.power ?? 0) + 0.04, 0.22);
    bias.staff = Math.min((bias.staff ?? 0) + 0.03, 0.2);
    bias.sword = Math.max((bias.sword ?? 0) - 0.03, 0.06);
    bias.key = Math.max((bias.key ?? 0) - 0.02, 0.06);
  }

  return bias;
}

/** Node templates keyed by node_type — action gem pairs drive YMBAB-style node goals. */
const NODE_TEMPLATES: Record<string, Omit<RunNode, 'difficulty' | 'objectiveTarget'>> = {
  riverbank_sweep: { node_type: 'riverbank_sweep', requiredGems: ['shield', 'power'], obstacles: ['flow_shift', 'mud_tiles'], events: ['amphibian_signal', 'river_crossing'], rationale: 'River proximity emphasizes defense and momentum.' },
  dense_canopy: { node_type: 'dense_canopy', requiredGems: ['sword', 'crate'], obstacles: ['overgrowth', 'low_visibility'], events: ['trail_markings', 'rare_track'], rationale: 'Canopy routes lean on clearing brush and scavenging tools.' },
  urban_fringe: { node_type: 'urban_fringe', requiredGems: ['key', 'thought'], obstacles: ['junk_blockers', 'noise_interference'], events: ['human_disturbance', 'corridor_crossing'], rationale: 'Urban edges favor unlocks, planning, and route reading.' },
  elevation_ridge: { node_type: 'elevation_ridge', requiredGems: ['staff', 'shield'], obstacles: ['steep_terrain'], events: ['vantage_scan'], rationale: 'Ridges reward control, coverage, and survival pressure.' },
  storm_window: { node_type: 'storm_window', requiredGems: ['power', 'multiplier'], obstacles: ['time_pressure', 'signal_dropout'], events: ['urgent_tracking_window', 'migration_shift'], rationale: 'Storm nodes convert urgency into burst turns.' },
  custom: { node_type: 'custom', requiredGems: ['crate', 'thought'], obstacles: ['unknown_terrain'], events: ['discovery_event'], rationale: 'Custom nodes mix improvisation with discovery tools.' },
  analysis: { node_type: 'analysis', requiredGems: [], obstacles: ['limited_signal'], events: ['wager_guess'], rationale: 'End-of-route deduction and wager phase.' },
};

/** Unified 6-node run generator. Derives all nodes from layer scores + habitat context. */
export function generateRunNodes(
  selection: NodeSelection,
  scores: LayerScore[],
  habitat: HabitatSignals,
  threatenedCount: number,
  protectedCoverage: number,
): RunNode[] {
  type PartialNode = Omit<RunNode, 'objectiveTarget'>;
  const nodes: PartialNode[] = [];

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

  // Fill remaining with varied types — avoid repeating gem pairs already in the run
  const usedGemPairs = new Set(nodes.map(n => n.requiredGems.slice().sort().join(',')));
  const fillerPool = ['elevation_ridge', 'riverbank_sweep', 'urban_fringe', 'dense_canopy', 'custom'] as const;
  let fillerIdx = 0;
  while (nodes.length < 5) {
    // Pick next filler whose gem pair isn't already used
    let picked = false;
    for (let i = 0; i < fillerPool.length; i++) {
      const candidate = fillerPool[(fillerIdx + i) % fillerPool.length];
      const tmpl = NODE_TEMPLATES[candidate];
      const pair = tmpl.requiredGems.slice().sort().join(',');
      if (!usedGemPairs.has(pair)) {
        nodes.push({ ...tmpl, difficulty: 2 });
        usedGemPairs.add(pair);
        fillerIdx = (fillerIdx + i + 1) % fillerPool.length;
        picked = true;
        break;
      }
    }
    if (!picked) {
      // All pairs used — just add next in pool
      const tmpl = NODE_TEMPLATES[fillerPool[fillerIdx % fillerPool.length]];
      nodes.push({ ...tmpl, difficulty: 2 });
      fillerIdx++;
    }
  }

  // Node 6: always analysis
  nodes.push({ ...NODE_TEMPLATES.analysis, difficulty: 3 });

  // Compute objectiveTarget per node: flat 6 for gem-objective nodes, 0 for analysis
  return nodes.slice(0, 6).map(n => ({
    ...n,
    objectiveTarget: n.requiredGems.length > 0 ? 6 : 0,
  }));
}
