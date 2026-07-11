/**
 * Proximity-based node family scoring for eco run generation.
 *
 * Given the GIS layers near the clicked point (protected areas, water,
 * bioregions, communities), this module scores each layer, picks the primary
 * node family (selectNodes), and expands it into concrete run nodes with
 * obstacles/board tuning (generateRunNodes + applyWaypointsToRunNodes).
 * Used server-side by /api/runs when a run is created.
 *
 * Polygon layers:  score = 0.7 * overlap_ratio + 0.3 * exp(-distance_m / 500)
 * Line layers:     score = exp(-distance_m / 500)  (overlap_ratio always 0)
 *
 * Behavior is pinned by tests/lib/nodeScoring.test.ts.
 */

import { METHOD_SLOTS, type MethodType } from '@/expedition/domain';
import type { ExpeditionWaypoint, WaypointType } from '@/types/waypoints';
import type { NodeObstacle, ObstacleFamily } from '@/game/nodeObstacles';

export { METHOD_SLOTS } from '@/expedition/domain';

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
  signals: Record<string, number>;
}

export interface RunNode {
  node_type: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  moveBudget?: number;
  obstacles: NodeObstacle[];
  events: string[];
  rationale: string;
  obstacleFamily: ObstacleFamily | null;
  method?: MethodType;
  objectiveType?: 'method_match';
  objectiveTarget: number;
  boardSeed?: number;
  waypoint?: ExpeditionWaypoint;
}

export interface HabitatSignals {
  water_ratio: number;
  forest_ratio: number;
  urban_ratio: number;
}

export const METHOD_OBJECTIVE_BASE_TARGET = 6;
export const MYSTERY_NODE_COUNT = METHOD_SLOTS.length;

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
    community_node: { overlap: 'community_overlap_ratio', distance: 'community_distance_m' },
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
    signals,
  };
}

function createNodeTemplate(config: {
  node_type: string;
  obstacles: NodeObstacle[];
  events: string[];
  rationale: string;
  obstacleFamily: ObstacleFamily | null;
}): Omit<RunNode, 'difficulty' | 'objectiveTarget'> {
  return {
    node_type: config.node_type,
    obstacles: config.obstacles,
    events: config.events,
    rationale: config.rationale,
    obstacleFamily: config.obstacleFamily,
  };
}

/** Node templates keyed by node_type. */
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
    rationale: 'Storm nodes lean on route timing and careful evidence gathering.',
  }),
  custom: createNodeTemplate({
    node_type: 'custom',
    obstacleFamily: 'panic',
    obstacles: ['unknown_terrain'],
    events: ['discovery_event'],
    rationale: 'Custom nodes reward field preparation when conditions turn unpredictable.',
  }),
  protected_area_survey: createNodeTemplate({
    node_type: 'custom',
    obstacleFamily: 'sighting',
    obstacles: ['limited_signal', 'steep_terrain'],
    events: ['vantage_scan', 'discovery_event'],
    rationale: 'Protected-area surveys trade speed for careful boundaries, permits, and evidence checks.',
  }),
  basecamp_survey: createNodeTemplate({
    node_type: 'custom',
    obstacleFamily: 'alert',
    obstacles: ['limited_signal', 'unknown_terrain'],
    events: ['discovery_event', 'trail_markings'],
    rationale: 'Sparse-route basecamps emphasize orientation, signal checks, and keeping the field plan playable.',
  }),
  ecotone_edge: createNodeTemplate({
    node_type: 'custom',
    obstacleFamily: 'visibility',
    obstacles: ['low_visibility', 'flow_shift'],
    events: ['corridor_crossing', 'migration_shift'],
    rationale: 'Ecotone edges mix habitats and create shifting sight lines along the route boundary.',
  }),
  analysis: createNodeTemplate({
    node_type: 'analysis',
    obstacleFamily: null,
    obstacles: ['limited_signal'],
    events: ['wager_guess'],
    rationale: 'End-of-route evidence review and species identification.',
  }),
};

function waypointNodeTemplateKey(waypoint: ExpeditionWaypoint): keyof typeof NODE_TEMPLATES {
  if (waypoint.nodeRole === 'final') return 'analysis';

  switch (waypoint.waypointType) {
    case 'river':
    case 'lake':
    case 'wetland':
      return 'riverbank_sweep';
    case 'city':
      return 'urban_fringe';
    case 'protected_area':
      return 'protected_area_survey';
    case 'bioregion_edge':
      return 'ecotone_edge';
    case 'basecamp':
      return waypoint.fallback ? 'basecamp_survey' : 'urban_fringe';
  }
}

function waypointRationale(waypoint: ExpeditionWaypoint, baseRationale: string): string {
  if (waypoint.fallback) {
    return `${baseRationale} Route fallback uses ${waypoint.name} to keep the expedition playable in sparse data.`;
  }

  switch (waypoint.waypointType) {
    case 'river':
      return `Waypoint route crosses ${waypoint.name}, so traversal pressure centers on riverbank terrain.`;
    case 'lake':
    case 'wetland':
      return `Waypoint route follows ${waypoint.name}, turning water-edge movement into the main pressure.`;
    case 'city':
      return `Waypoint route starts near ${waypoint.name}, where urban edge disturbance shapes the opening node.`;
    case 'protected_area':
      return `Waypoint route enters ${waypoint.name}, emphasizing protected-area boundaries, access, and evidence checks.`;
    case 'bioregion_edge':
      return `Waypoint route reaches ${waypoint.name}, where shifting habitat edges shape the fieldwork.`;
    case 'basecamp':
      return `Waypoint route starts from ${waypoint.name}, keeping the opening node anchored to the selected location.`;
  }
}

export function applyWaypointsToRunNodes(nodes: RunNode[]): RunNode[] {
  return nodes.map((node) => {
    const waypoint = node.waypoint;
    if (!waypoint) return node;

    const templateKey = waypointNodeTemplateKey(waypoint);
    const template = NODE_TEMPLATES[templateKey] ?? NODE_TEMPLATES.custom;
    const difficulty = waypoint.fallback
      ? Math.min(node.difficulty, 2) as RunNode['difficulty']
      : node.difficulty;

    return {
      ...node,
      ...template,
      difficulty,
      moveBudget: node.moveBudget,
      waypoint,
      rationale: waypointRationale(waypoint, template.rationale),
      objectiveTarget: node.objectiveType === 'method_match'
        ? methodObjectiveTargetForDifficulty(difficulty)
        : node.objectiveTarget,
    };
  });
}

export const MYSTERY_MOVE_BUDGET = 12;

function methodObjectiveTargetForDifficulty(difficulty: RunNode['difficulty']): number {
  if (difficulty <= 2) return METHOD_OBJECTIVE_BASE_TARGET - 2;
  if (difficulty >= 4) return METHOD_OBJECTIVE_BASE_TARGET + 2;
  return METHOD_OBJECTIVE_BASE_TARGET;
}

function hashToUint32(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deriveBoardSeedBase(
  selection: NodeSelection,
  scores: LayerScore[],
  habitat: HabitatSignals,
  threatenedCount: number,
  protectedCoverage: number,
  anchorType?: WaypointType | null,
): number {
  const scoreFingerprint = [...scores]
    .sort((a, b) => `${a.nodeFamily}:${a.variant}`.localeCompare(`${b.nodeFamily}:${b.variant}`))
    .map((score) => [
      score.nodeFamily,
      score.variant,
      Number(score.score.toFixed(6)),
      Number(score.overlapRatio.toFixed(6)),
      Number(score.nearestDistanceM.toFixed(2)),
    ]);
  const signalFingerprint = Object.entries(selection.signals).sort(([a], [b]) => a.localeCompare(b));

  return hashToUint32(JSON.stringify({
    primary: [selection.primaryNodeFamily, selection.primaryVariant],
    modifiers: selection.modifierNodes,
    signals: signalFingerprint,
    scores: scoreFingerprint,
    habitat,
    threatenedCount,
    protectedCoverage: Number(protectedCoverage.toFixed(6)),
    anchorType: anchorType ?? null,
  }));
}

interface NodeTemplateCandidate {
  template: Omit<RunNode, 'difficulty' | 'objectiveTarget'>;
  difficulty: RunNode['difficulty'];
}

function selectNodeTemplateCandidates(
  selection: NodeSelection,
  scores: LayerScore[],
  habitat: HabitatSignals,
  anchorType?: WaypointType | null,
): NodeTemplateCandidate[] {
  const candidates: NodeTemplateCandidate[] = [];
  const usedTemplateKeys = new Set<string>();
  const addCandidate = (key: keyof typeof NODE_TEMPLATES, difficulty: RunNode['difficulty']) => {
    if (usedTemplateKeys.has(key) || candidates.length >= MYSTERY_NODE_COUNT) return;
    usedTemplateKeys.add(key);
    candidates.push({ template: NODE_TEMPLATES[key] ?? NODE_TEMPLATES.custom, difficulty });
  };

  const primaryKey = anchorType
    ? nodeTypeForAnchorType(anchorType)
    : mapFamilyToNodeType(selection.primaryNodeFamily, selection.primaryVariant);
  addCandidate(primaryKey as keyof typeof NODE_TEMPLATES, scores[0]?.score > 0.5 ? 4 : 3);

  for (const modifier of selection.modifierNodes) {
    const separator = modifier.indexOf(':');
    if (separator < 0) continue;
    const family = modifier.slice(0, separator) as NodeFamily;
    const variant = modifier.slice(separator + 1);
    addCandidate(mapFamilyToNodeType(family, variant) as keyof typeof NODE_TEMPLATES, 3);
  }

  if (habitat.water_ratio >= 0.2) {
    addCandidate('riverbank_sweep', habitat.water_ratio >= 0.4 ? 4 : 3);
  }
  if (habitat.forest_ratio >= 0.3) {
    addCandidate('dense_canopy', habitat.forest_ratio >= 0.6 ? 4 : 3);
  }
  if (habitat.urban_ratio >= 0.15) {
    addCandidate('urban_fringe', habitat.urban_ratio >= 0.35 ? 4 : 2);
  }

  for (const filler of ['elevation_ridge', 'riverbank_sweep', 'urban_fringe', 'dense_canopy', 'custom'] as const) {
    addCandidate(filler, 2);
  }

  return candidates.slice(0, MYSTERY_NODE_COUNT);
}

/** Three-node mystery generator. GIS chooses flavor; each slot earns one investigation method. */
export function generateRunNodes(
  selection: NodeSelection,
  scores: LayerScore[],
  habitat: HabitatSignals,
  threatenedCount: number,
  protectedCoverage: number,
  anchorType?: WaypointType | null,
): RunNode[] {
  const candidates = selectNodeTemplateCandidates(selection, scores, habitat, anchorType);
  const seedBase = deriveBoardSeedBase(
    selection,
    scores,
    habitat,
    threatenedCount,
    protectedCoverage,
    anchorType,
  );

  return METHOD_SLOTS.map((method, slot) => {
    const candidate = candidates[slot];
    const difficulty = candidate.difficulty;

    return {
      ...candidate.template,
      difficulty,
      moveBudget: MYSTERY_MOVE_BUDGET,
      method,
      objectiveType: 'method_match',
      objectiveTarget: methodObjectiveTargetForDifficulty(difficulty),
      boardSeed: (seedBase + Math.imul(slot + 1, 0x9e3779b9)) >>> 0,
    };
  });
}

function nodeTypeForAnchorType(anchorType: WaypointType): keyof typeof NODE_TEMPLATES {
  switch (anchorType) {
    case 'river':
    case 'lake':
    case 'wetland':
      return 'riverbank_sweep';
    case 'basecamp':
    case 'city':
      return 'urban_fringe';
    case 'protected_area':
      return 'dense_canopy';
    case 'bioregion_edge':
      return 'custom';
    default:
      return 'custom';
  }
}
