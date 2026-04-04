/**
 * Proximity-based node family scoring for eco run generation.
 *
 * Polygon layers:  score = 0.7 * overlap_ratio + 0.3 * exp(-distance_m / 500)
 * Line layers:     score = exp(-distance_m / 500)  (overlap_ratio always 0)
 */

import type { ActionGemType, GemType } from '@/game/constants';
import {
  getCounterGemForObstacleFamily,
  type NodeObstacle,
  type ObstacleFamily,
} from '@/game/nodeObstacles';

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
  counterGem: ActionGemType | null;
  obstacleFamily: ObstacleFamily | null;
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

function createNodeTemplate(config: {
  node_type: string;
  obstacles: NodeObstacle[];
  events: string[];
  rationale: string;
  obstacleFamily: ObstacleFamily | null;
}): Omit<RunNode, 'difficulty' | 'objectiveTarget'> {
  const counterGem = config.obstacleFamily ? getCounterGemForObstacleFamily(config.obstacleFamily) : null;
  return {
    node_type: config.node_type,
    obstacles: config.obstacles,
    events: config.events,
    rationale: config.rationale,
    obstacleFamily: config.obstacleFamily,
    counterGem,
    requiredGems: counterGem ? [counterGem] : [],
  };
}

/** Node templates keyed by node_type — compatibility keeps requiredGems derived from counterGem. */
const NODE_TEMPLATES: Record<string, Omit<RunNode, 'difficulty' | 'objectiveTarget'>> = {
  riverbank_sweep: createNodeTemplate({
    node_type: 'riverbank_sweep',
    obstacleFamily: 'terrain',
    obstacles: ['flow_shift', 'mud_tiles'],
    events: ['amphibian_signal', 'river_crossing'],
    rationale: 'River proximity rewards steady traversal through unstable terrain.',
  }),
  dense_canopy: createNodeTemplate({
    node_type: 'dense_canopy',
    obstacleFamily: 'visibility',
    obstacles: ['overgrowth', 'low_visibility'],
    events: ['trail_markings', 'rare_track'],
    rationale: 'Canopy routes choke sight lines and reward deliberate scanning.',
  }),
  urban_fringe: createNodeTemplate({
    node_type: 'urban_fringe',
    obstacleFamily: 'panic',
    obstacles: ['junk_blockers', 'noise_interference'],
    events: ['human_disturbance', 'corridor_crossing'],
    rationale: 'Urban edges stress gear and supplies more than raw speed.',
  }),
  elevation_ridge: createNodeTemplate({
    node_type: 'elevation_ridge',
    obstacleFamily: 'sighting',
    obstacles: ['steep_terrain'],
    events: ['vantage_scan'],
    rationale: 'Ridge nodes turn narrow sighting windows into the main pressure point.',
  }),
  storm_window: createNodeTemplate({
    node_type: 'storm_window',
    obstacleFamily: 'alert',
    obstacles: ['time_pressure', 'signal_dropout'],
    events: ['urgent_tracking_window', 'migration_shift'],
    rationale: 'Storm nodes lean on composure as the animal spooks faster under pressure.',
  }),
  custom: createNodeTemplate({
    node_type: 'custom',
    obstacleFamily: 'panic',
    obstacles: ['unknown_terrain'],
    events: ['discovery_event'],
    rationale: 'Custom nodes reward field preparation when conditions turn unpredictable.',
  }),
  analysis: createNodeTemplate({
    node_type: 'analysis',
    obstacleFamily: null,
    obstacles: ['limited_signal'],
    events: ['wager_guess'],
    rationale: 'End-of-route evidence review and species identification.',
  }),
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

  // Fill remaining with varied tools — avoid repeating the same counter gem when possible.
  const usedCounterGems = new Set(nodes.map((n) => n.counterGem).filter((value): value is ActionGemType => value != null));
  const fillerPool = ['elevation_ridge', 'riverbank_sweep', 'urban_fringe', 'dense_canopy', 'custom'] as const;
  let fillerIdx = 0;
  while (nodes.length < 5) {
    // Pick next filler whose counter gem is not already used
    let picked = false;
    for (let i = 0; i < fillerPool.length; i++) {
      const candidate = fillerPool[(fillerIdx + i) % fillerPool.length];
      const tmpl = NODE_TEMPLATES[candidate];
      const counterGem = tmpl.counterGem;
      if (counterGem && !usedCounterGems.has(counterGem)) {
        nodes.push({ ...tmpl, difficulty: 2 });
        usedCounterGems.add(counterGem);
        fillerIdx = (fillerIdx + i + 1) % fillerPool.length;
        picked = true;
        break;
      }
    }
    if (!picked) {
      // All unique counter gems are exhausted — pick the next node type not already present when possible.
      const usedNodeTypes = new Set(nodes.map((n) => n.node_type));
      let fallbackTemplate: Omit<RunNode, 'difficulty' | 'objectiveTarget'> | null = null;
      for (let i = 0; i < fillerPool.length; i++) {
        const candidate = fillerPool[(fillerIdx + i) % fillerPool.length];
        const tmpl = NODE_TEMPLATES[candidate];
        if (!usedNodeTypes.has(tmpl.node_type)) {
          fallbackTemplate = tmpl;
          fillerIdx = (fillerIdx + i + 1) % fillerPool.length;
          break;
        }
      }
      if (!fallbackTemplate) {
        fallbackTemplate = NODE_TEMPLATES[fillerPool[fillerIdx % fillerPool.length]];
        fillerIdx++;
      }
      nodes.push({ ...fallbackTemplate, difficulty: 2 });
    }
  }

  // Node 6: always analysis
  nodes.push({ ...NODE_TEMPLATES.analysis, difficulty: 3 });

  // Compute objectiveTarget per node: flat 6 for gem-objective nodes, 0 for analysis
  return nodes.slice(0, 6).map(n => ({
    ...n,
    objectiveTarget: n.counterGem ? 6 : 0,
  }));
}
