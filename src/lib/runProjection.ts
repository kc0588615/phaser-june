import { EVIDENCE_FAMILIES, isEvidenceFamily, parseEvidenceCharges, type EvidenceChargeState, type EvidenceFamily } from '@/expedition/evidenceFamilies';
import { parseBoardCheckpoint } from '@/game/boardCheckpoint';
import type { BoardCheckpointV1 } from '@/game/boardTypes';
import { parseExpeditionMapView, type ExpeditionMapView } from '@/expedition/mapView';

const UINT32_MAX = 0xffff_ffff;
const NODE_OBSTACLES = new Set([
  'flow_shift',
  'mud_tiles',
  'overgrowth',
  'low_visibility',
  'junk_blockers',
  'noise_interference',
  'steep_terrain',
  'time_pressure',
  'signal_dropout',
  'unknown_terrain',
  'limited_signal',
]);
const NODE_EVENTS = new Set([
  'amphibian_signal',
  'river_crossing',
  'trail_markings',
  'rare_track',
  'human_disturbance',
  'corridor_crossing',
  'vantage_scan',
  'urgent_tracking_window',
  'migration_shift',
  'discovery_event',
  'wager_guess',
]);
const TRAIT_CATEGORIES = new Set([
  'habitat',
  'morphology',
  'diet',
  'behavior',
  'reproduction',
  'taxonomy',
  'geography',
  'conservation',
  'key_fact',
]);
const SENSITIVE_KEYS = new Set([
  'answerid',
  'answername',
  'caseseed',
  'caseprivate',
  'cardid',
  'cardids',
  'chain',
  'chaincardids',
  'cardidmatrix',
  'correctspeciesid',
  'guessedspeciesid',
  'hiddenspeciesname',
  'playerid',
  'observationsissued',
  'runseed',
  'signaturecardid',
  'familycardids',
  'familyhintids',
  'cascadehintids',
  'hinttext',
  'weaktag',
  'bonusfacttext',
  'speciesid',
]);

type UnknownRecord = Record<string, unknown>;

export interface RunProjectionSource extends UnknownRecord {
  metadata?: unknown;
}

export interface PublicCaseV3 {
  version: 3;
  candidateIds: number[];
  boardSeeds: [number, number, number];
  mapView: ExpeditionMapView;
}

export type PublicCaseSnapshot = PublicCaseV3;

export type ProjectedNodeCaseState =
  | 'board_active'
  | 'objective_met'
  | 'objective_failed'
  | 'evidence_issued'
  | 'choice_ready';

export interface PublicRunNode {
  id: string;
  nodeOrder: number;
  nodeType: string;
  nodeStatus: string;
  objectiveType?: string;
  objectiveTarget?: number;
  objectiveProgress?: number;
  moveBudget?: number;
  movesUsed?: number;
  boardSeed?: number;
  boardSamplingMethod?: string;
  evidenceCharges?: EvidenceChargeState;
  carriedCharges?: EvidenceChargeState;
  offeredFamilies?: EvidenceFamily[];
  selectedFamily?: EvidenceFamily;
  selectedFamilies?: EvidenceFamily[];
  boardCheckpoint?: BoardCheckpointV1;
  travelEntry?: string;
  caseState?: ProjectedNodeCaseState;
  rationale?: string;
  difficulty?: number;
  obstacles: string[];
  events: string[];
  waypoint?: PublicRunCheckpoint['expeditionSnapshot']['waypoints'][number];
  rewardClaimed?: boolean;
  scoreEarned?: number;
  dominantHabitat?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicMemoryNode {
  nodeOrder?: number;
  nodeType?: string;
  nodeStatus?: string;
  objectiveTarget?: number;
  objectiveProgress?: number;
  scoreEarned?: number;
  movesUsed?: number;
  obstacleFamily?: string | null;
  waypoint?: PublicRunCheckpoint['expeditionSnapshot']['waypoints'][number];
}

export interface PublicRunMemory {
  id?: string;
  runId?: string;
  locationKey?: string;
  startLon?: number;
  startLat?: number;
  routePolyline: Array<{ lon: number; lat: number; waypointSlot?: number }>;
  routeBounds: { minLon: number; minLat: number; maxLon: number; maxLat: number } | null;
  nodes: PublicMemoryNode[];
  gisFeaturesNearby: PublicRunCheckpoint['featureFingerprints'];
  deductionSummary: {
    issuedEvidenceCount?: number;
    guessBonus?: number;
    efficiencyBonus?: number;
    wrongGuessCount?: number;
    firstGuessCorrect?: boolean;
  } | null;
  finalScore?: number | null;
  realm?: string | null;
  biome?: string | null;
  bioregion?: string | null;
  createdAt?: string;
}

export interface PublicIssuedObservation {
  ref: string;
  family: EvidenceFamily;
  observationText: string;
  inferenceText?: string;
  traitCategory?: string;
  actualEliminatedIds?: number[];
  eliminationReasons?: Record<string, string>;
  candidateTraitPhrases?: Record<string, string>;
}

export interface PublicRunCheckpoint {
  currentNodeIndex?: number;
  bankedScore?: number;
  objectiveProgress?: number;
  activeAffinities: string[];
  habitats: string[];
  rasterHabitats: Array<{ habitat_type: string; percentage: number }>;
  featureFingerprints: Array<{
    featureClass: string;
    sourceTable: string;
    sourceId: string | number;
    name: string | null;
    distanceM: number;
    overlapRatio: number;
    properties: { bioregion?: string; realm?: string; biome?: string };
  }>;
  routePolyline: Array<{ lon: number; lat: number; waypointSlot?: number }>;
  expeditionSnapshot: {
    protectedAreas: Array<{
      name: string | null;
      designation: string | null;
      iucn_category: string | null;
    }>;
    availableAffinities: string[];
    primaryNodeFamily: string;
    primaryVariant: string;
    modifierNodes: string[];
    signals: Record<string, number>;
    waypoints: Array<{
      slot: number;
      waypointType: string;
      nodeRole: string;
      name: string;
      lon: number;
      lat: number;
      distKm: number;
      rankScore: number;
      sourceTable: string | null;
      sourceId: string | number | null;
      designationCategory?: string;
      fallback: boolean;
    }>;
    waypointRadiusKm: number | null;
    nearestRiverDistM: number | null;
  };
}

export interface PublicRunSummary {
  id?: string;
  status?: string;
  nodeCountPlanned?: number;
  nodeIndexCurrent?: number;
  selectedLng?: number;
  selectedLat?: number;
  selectionZoom?: number;
  locationKey?: string;
  realm?: string | null;
  biome?: string | null;
  bioregion?: string | null;
  moveBudget?: number;
  movesUsed?: number;
  scoreTotal?: number;
  speciesDiscoveredCount?: number;
  startedAt?: string;
  endedAt?: string | null;
}

export interface ClientRunProjection {
  run: PublicRunSummary;
  casePublic: PublicCaseSnapshot | null;
  checkpoint: PublicRunCheckpoint;
  observations: PublicIssuedObservation[];
  nodes: PublicRunNode[];
  memory: PublicRunMemory | null;
  legacy: boolean;
}

export interface RunProjectionInput {
  /** Hydrated, already-issued card content. Stored issuance rows are never read. */
  publicObservations?: readonly unknown[];
  nodes?: readonly unknown[];
  memory?: unknown;
}

export interface PublicRunCreateResponse {
  runId: string;
  nodeIds: string[];
  casePublic: PublicCaseSnapshot;
}

/**
 * Builds the only run shape that API adapters may serialize.
 *
 * The projection deliberately does not spread the session or its metadata.
 * New public fields must be added to an explicit projector below.
 */
export function projectRunForClient(
  session: RunProjectionSource,
  input: RunProjectionInput = {},
): ClientRunProjection {
  const metadata = getRecord(session.metadata);
  const casePublic = parsePublicCaseSnapshot(metadata.casePublic);
  const observations = Array.isArray(input.publicObservations)
    ? input.publicObservations.flatMap(value => {
        const observation = projectObservation(value);
        return observation ? [observation] : [];
      })
    : [];
  const nodes = projectRunNodes(input.nodes);

  return {
    run: projectRunSummary(session),
    casePublic,
    checkpoint: projectCheckpoint(metadata),
    observations,
    nodes: projectNodeCaseStates(nodes, observations),
    memory: projectRunMemory(input.memory),
    legacy: casePublic === null,
  };
}

/** All create-route output passes through this explicit three-field boundary. */
export function projectRunCreateResponse(input: {
  runId: unknown;
  nodeIds: unknown;
  casePublic: unknown;
}): PublicRunCreateResponse {
  const runId = getString(input.runId);
  const nodeIds = getExactStringArray(input.nodeIds);
  const casePublic = parsePublicCaseSnapshot(input.casePublic);
  if (!runId || !nodeIds || !casePublic) {
    throw new Error('Invalid public run create response');
  }
  return { runId, nodeIds, casePublic };
}

function projectRunSummary(session: RunProjectionSource): PublicRunSummary {
  const run: PublicRunSummary = {};
  assignString(run, 'id', session.id);
  assignString(run, 'status', session.runStatus ?? session.status);
  assignNumber(run, 'nodeCountPlanned', session.nodeCountPlanned);
  assignNumber(run, 'nodeIndexCurrent', session.nodeIndexCurrent);
  assignNumber(run, 'selectedLng', session.selectedLng);
  assignNumber(run, 'selectedLat', session.selectedLat);
  const selectionZoom = getFiniteNumber(session.selectionZoom);
  if (selectionZoom !== undefined) run.selectionZoom = selectionZoom;
  assignString(run, 'locationKey', session.locationKey);
  assignNullableString(run, 'realm', session.realm);
  assignNullableString(run, 'biome', session.biome);
  assignNullableString(run, 'bioregion', session.bioregion);
  assignNumber(run, 'moveBudget', session.moveBudget);
  assignNumber(run, 'movesUsed', session.movesUsed);
  assignNumber(run, 'scoreTotal', session.scoreTotal);
  assignNumber(run, 'speciesDiscoveredCount', session.speciesDiscoveredCount);
  assignDate(run, 'startedAt', session.startedAt);
  assignNullableDate(run, 'endedAt', session.endedAt);
  return run;
}

/** v3 only — stored v1/v2 snapshots parse to null and resume as legacy runs. */
export function parsePublicCaseSnapshot(value: unknown): PublicCaseSnapshot | null {
  const source = getRecord(value);
  const candidateIds = getExactIntegerArray(source.candidateIds);
  const boardSeeds = source.boardSeeds;

  if (source.version !== 3
    || !candidateIds
    || candidateIds.length !== 6
    || candidateIds.some(id => id <= 0)
    || new Set(candidateIds).size !== 6
    || !Array.isArray(boardSeeds)
    || boardSeeds.length !== 3
    || boardSeeds.some(seed => getUint32(seed) === undefined)
  ) {
    return null;
  }

  const mapView = parseExpeditionMapView(source.mapView);
  if (!mapView) return null;
  return {
    version: 3,
    candidateIds,
    boardSeeds: [boardSeeds[0] as number, boardSeeds[1] as number, boardSeeds[2] as number],
    mapView,
  };
}

/** Projects persisted node rows without exposing their raw JSONB payloads. */
export function projectRunNodes(value: unknown): PublicRunNode[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const source = getRecord(item);
    const id = getString(source.id);
    const nodeOrder = getInteger(source.nodeOrder);
    const nodeType = getString(source.nodeType);
    const nodeStatus = getString(source.nodeStatus);
    if (!id || nodeOrder === undefined || nodeOrder < 0 || !nodeType || !nodeStatus) return [];
    const boardContext = getRecord(source.boardContext);
    const hazardProfile = getRecord(source.hazardProfile);
    const node: PublicRunNode = {
      id,
      nodeOrder,
      nodeType,
      nodeStatus,
      obstacles: getAllowedStringArray(hazardProfile.obstacles, NODE_OBSTACLES),
      events: getAllowedStringArray(hazardProfile.events, NODE_EVENTS),
    };

    assignString(node, 'objectiveType', source.objectiveType);
    assignNonnegativeInteger(node, 'objectiveTarget', source.objectiveTarget);
    assignNonnegativeInteger(node, 'objectiveProgress', source.objectiveProgress);
    assignNonnegativeInteger(node, 'moveBudget', source.moveBudget);
    assignNonnegativeInteger(node, 'movesUsed', source.movesUsed);
    const boardSeed = getUint32(source.boardSeed);
    if (boardSeed !== undefined) node.boardSeed = boardSeed;
    assignString(node, 'boardSamplingMethod', source.boardSamplingMethod);
    const evidenceCharges = parseEvidenceCharges(boardContext.evidenceCharges);
    if (evidenceCharges) node.evidenceCharges = evidenceCharges;
    const carriedCharges = parseEvidenceCharges(boardContext.carriedCharges);
    if (carriedCharges) node.carriedCharges = carriedCharges;
    const offeredFamilies = getEvidenceFamilies(boardContext.offeredFamilies);
    if (offeredFamilies.length >= 2) node.offeredFamilies = offeredFamilies;
    if (isEvidenceFamily(boardContext.selectedFamily)) node.selectedFamily = boardContext.selectedFamily;
    const selectedFamilies = getEvidenceFamilies(boardContext.selectedFamilies);
    if (selectedFamilies.length > 0) node.selectedFamilies = selectedFamilies;
    const boardCheckpoint = parseBoardCheckpoint(boardContext.boardCheckpoint);
    if (boardCheckpoint) node.boardCheckpoint = boardCheckpoint;
    assignString(node, 'travelEntry', boardContext.travelEntry);
    assignString(node, 'rationale', boardContext.rationale);
    const difficulty = getInteger(boardContext.difficulty);
    if (difficulty !== undefined && difficulty >= 1 && difficulty <= 5) node.difficulty = difficulty;
    const waypoint = projectSingleWaypoint(boardContext.waypoint);
    if (waypoint) node.waypoint = waypoint;
    if (typeof source.rewardClaimed === 'boolean') node.rewardClaimed = source.rewardClaimed;
    assignNumber(node, 'scoreEarned', source.scoreEarned);
    assignNullableString(node, 'dominantHabitat', source.dominantHabitat);
    assignNullableDate(node, 'startedAt', source.startedAt);
    assignNullableDate(node, 'endedAt', source.endedAt);
    assignDate(node, 'createdAt', source.createdAt);
    assignDate(node, 'updatedAt', source.updatedAt);
    return [node];
  });
}

/** Projects a persisted memory row; identity and target fields are intentionally absent. */
export function projectRunMemory(value: unknown): PublicRunMemory | null {
  if (value === null || value === undefined) return null;
  const source = getRecord(value);
  const memory: PublicRunMemory = {
    routePolyline: projectRoute(source.routePolyline),
    routeBounds: projectRouteBounds(source.routeBounds),
    nodes: projectMemoryNodes(source.nodes),
    gisFeaturesNearby: projectFeatureFingerprints(source.gisFeaturesNearby),
    deductionSummary: projectDeductionSummary(source.deductionSummary),
  };
  assignString(memory, 'id', source.id);
  assignString(memory, 'runId', source.runId);
  assignString(memory, 'locationKey', source.locationKey);
  assignNumber(memory, 'startLon', source.startLon);
  assignNumber(memory, 'startLat', source.startLat);
  if (source.finalScore === null) memory.finalScore = null;
  else assignNumber(memory, 'finalScore', source.finalScore);
  assignNullableString(memory, 'realm', source.realm);
  assignNullableString(memory, 'biome', source.biome);
  assignNullableString(memory, 'bioregion', source.bioregion);
  assignDate(memory, 'createdAt', source.createdAt);
  return memory;
}

function projectMemoryNodes(value: unknown): PublicMemoryNode[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const source = getRecord(item);
    const node: PublicMemoryNode = {};
    assignNonnegativeInteger(node, 'nodeOrder', source.nodeOrder);
    assignString(node, 'nodeType', source.nodeType);
    assignString(node, 'nodeStatus', source.nodeStatus);
    assignNonnegativeInteger(node, 'objectiveTarget', source.objectiveTarget);
    assignNonnegativeInteger(node, 'objectiveProgress', source.objectiveProgress);
    assignNumber(node, 'scoreEarned', source.scoreEarned);
    assignNonnegativeInteger(node, 'movesUsed', source.movesUsed);
    assignNullableString(node, 'obstacleFamily', source.obstacleFamily);
    const waypoint = projectSingleWaypoint(source.waypoint);
    if (waypoint) node.waypoint = waypoint;
    return Object.keys(node).length > 0 ? [node] : [];
  });
}

function projectRouteBounds(value: unknown): PublicRunMemory['routeBounds'] {
  const source = getRecord(value);
  const minLon = getFiniteNumber(source.minLon);
  const minLat = getFiniteNumber(source.minLat);
  const maxLon = getFiniteNumber(source.maxLon);
  const maxLat = getFiniteNumber(source.maxLat);
  return minLon === undefined || minLat === undefined || maxLon === undefined || maxLat === undefined
    ? null
    : { minLon, minLat, maxLon, maxLat };
}

export function projectDeductionSummary(value: unknown): PublicRunMemory['deductionSummary'] {
  if (value === null || value === undefined) return null;
  const source = getRecord(value);
  const summary: NonNullable<PublicRunMemory['deductionSummary']> = {};
  assignNonnegativeInteger(summary, 'issuedEvidenceCount', source.issuedEvidenceCount);
  assignNumber(summary, 'guessBonus', source.guessBonus);
  assignNumber(summary, 'efficiencyBonus', source.efficiencyBonus);
  assignNonnegativeInteger(summary, 'wrongGuessCount', source.wrongGuessCount);
  if (typeof source.firstGuessCorrect === 'boolean') summary.firstGuessCorrect = source.firstGuessCorrect;
  return summary;
}

function projectSingleWaypoint(
  value: unknown,
): PublicRunCheckpoint['expeditionSnapshot']['waypoints'][number] | undefined {
  return projectWaypoints([value])[0];
}

function projectCheckpoint(metadata: UnknownRecord): PublicRunCheckpoint {
  const snapshot = getRecord(metadata.expeditionSnapshot);
  const checkpoint: PublicRunCheckpoint = {
    activeAffinities: getStringArray(metadata.activeAffinities),
    habitats: getStringArray(metadata.habitats),
    rasterHabitats: projectRasterHabitats(metadata.rasterHabitats),
    featureFingerprints: projectFeatureFingerprints(metadata.featureFingerprints),
    routePolyline: projectRoute(metadata.routePolyline),
    expeditionSnapshot: {
      protectedAreas: projectProtectedAreas(snapshot.protectedAreas),
      availableAffinities: getStringArray(snapshot.availableAffinities),
      primaryNodeFamily: getString(snapshot.primaryNodeFamily) ?? '',
      primaryVariant: getString(snapshot.primaryVariant) ?? '',
      modifierNodes: getStringArray(snapshot.modifierNodes),
      signals: getNumberRecord(snapshot.signals),
      waypoints: projectWaypoints(snapshot.waypoints),
      waypointRadiusKm: getFiniteNumber(snapshot.waypointRadiusKm) ?? null,
      nearestRiverDistM: getFiniteNumber(snapshot.nearestRiverDistM) ?? null,
    },
  };
  assignNumber(checkpoint, 'currentNodeIndex', metadata.currentNodeIndex);
  assignNumber(checkpoint, 'bankedScore', metadata.bankedScore);
  assignNumber(checkpoint, 'objectiveProgress', metadata.objectiveProgress);
  return checkpoint;
}

function projectObservation(value: unknown): PublicIssuedObservation | null {
  const source = getRecord(value);
  const ref = getObservationRef(source.ref);
  const family = isEvidenceFamily(source.family) ? source.family : undefined;
  const observationText = getString(source.observationText);
  if (!ref || !family || !observationText) return null;

  const observation: PublicIssuedObservation = {
    ref,
    observationText,
    family,
  };
  const inferenceText = getString(source.inferenceText);
  const traitCategory = getString(source.traitCategory);
  if (inferenceText !== undefined) observation.inferenceText = inferenceText;
  if (traitCategory && TRAIT_CATEGORIES.has(traitCategory)) observation.traitCategory = traitCategory;
  const actualEliminatedIds = getIntegerArray(source.actualEliminatedIds);
  if (actualEliminatedIds.length > 0) observation.actualEliminatedIds = actualEliminatedIds;
  const eliminationReasonsSource = getRecord(source.eliminationReasons);
  const eliminationReasons = Object.fromEntries(actualEliminatedIds.flatMap(id => {
    const reason = getString(eliminationReasonsSource[String(id)]);
    return reason && reason.length <= 80 ? [[String(id), reason]] : [];
  }));
  if (Object.keys(eliminationReasons).length > 0) observation.eliminationReasons = eliminationReasons;
  const candidateTraitPhrasesSource = getRecord(source.candidateTraitPhrases);
  const candidateTraitPhrases = Object.fromEntries(actualEliminatedIds.flatMap(speciesId => {
    const phrase = candidateTraitPhrasesSource[String(speciesId)];
    return typeof phrase === 'string' && phrase.length > 0 && phrase.length <= 64
      ? [[String(speciesId), phrase]]
      : [];
  }));
  if (Object.keys(candidateTraitPhrases).length > 0) observation.candidateTraitPhrases = candidateTraitPhrases;
  return observation;
}

function projectNodeCaseStates(
  nodes: PublicRunNode[],
  observations: PublicIssuedObservation[],
): PublicRunNode[] {
  const issued = new Set(observations.map(observation => observation.ref));
  return nodes.map((node, index) => {
    const ref = `obs-${index}`;
    let caseState: ProjectedNodeCaseState | undefined;
    if (issued.has(ref)) caseState = 'evidence_issued';
    else if (node.nodeStatus === 'active' && node.offeredFamilies?.length) caseState = 'choice_ready';
    else if (node.nodeStatus === 'completed') caseState = (node.objectiveProgress ?? 0) >= (node.objectiveTarget ?? 0) ? 'objective_met' : 'objective_failed';
    else if (node.nodeStatus === 'active' && node.evidenceCharges) caseState = 'board_active';
    return caseState ? { ...node, caseState } : node;
  });
}

function projectRasterHabitats(value: unknown): PublicRunCheckpoint['rasterHabitats'] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const source = getRecord(item);
    const habitatType = getString(source.habitat_type);
    const percentage = getFiniteNumber(source.percentage);
    return habitatType === undefined || percentage === undefined
      ? []
      : [{ habitat_type: habitatType, percentage }];
  });
}

function projectFeatureFingerprints(value: unknown): PublicRunCheckpoint['featureFingerprints'] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const source = getRecord(item);
    const featureClass = getString(source.featureClass);
    const sourceTable = getString(source.sourceTable);
    const sourceId = getStringOrNumber(source.sourceId);
    const distanceM = getFiniteNumber(source.distanceM);
    const overlapRatio = getFiniteNumber(source.overlapRatio);
    if (!featureClass || !sourceTable || sourceId === undefined || distanceM === undefined || overlapRatio === undefined) {
      return [];
    }
    const propertiesSource = getRecord(source.properties);
    const properties: { bioregion?: string; realm?: string; biome?: string } = {};
    assignString(properties, 'bioregion', propertiesSource.bioregion);
    assignString(properties, 'realm', propertiesSource.realm);
    assignString(properties, 'biome', propertiesSource.biome);
    return [{
      featureClass,
      sourceTable,
      sourceId,
      name: getString(source.name) ?? null,
      distanceM,
      overlapRatio,
      properties,
    }];
  });
}

function projectRoute(value: unknown): PublicRunCheckpoint['routePolyline'] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const source = getRecord(item);
    const lon = getFiniteNumber(source.lon);
    const lat = getFiniteNumber(source.lat);
    if (lon === undefined || lat === undefined) return [];
    const point: { lon: number; lat: number; waypointSlot?: number } = { lon, lat };
    const waypointSlot = getInteger(source.waypointSlot);
    if (waypointSlot !== undefined) point.waypointSlot = waypointSlot;
    return [point];
  });
}

function projectProtectedAreas(value: unknown): PublicRunCheckpoint['expeditionSnapshot']['protectedAreas'] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const source = getRecord(item);
    const name = getNullableString(source.name);
    const designation = getNullableString(source.designation);
    const category = getNullableString(source.iucn_category);
    if (name === undefined && designation === undefined && category === undefined) return [];
    return [{
      name: name ?? null,
      designation: designation ?? null,
      iucn_category: category ?? null,
    }];
  });
}

function projectWaypoints(value: unknown): PublicRunCheckpoint['expeditionSnapshot']['waypoints'] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const source = getRecord(item);
    const slot = getInteger(source.slot);
    const waypointType = getString(source.waypointType);
    const nodeRole = getString(source.nodeRole);
    const name = getString(source.name);
    const lon = getFiniteNumber(source.lon);
    const lat = getFiniteNumber(source.lat);
    const distKm = getFiniteNumber(source.distKm);
    const rankScore = getFiniteNumber(source.rankScore);
    if (slot === undefined || !waypointType || !nodeRole || !name || lon === undefined || lat === undefined
      || distKm === undefined || rankScore === undefined || typeof source.fallback !== 'boolean') {
      return [];
    }
    const waypoint: PublicRunCheckpoint['expeditionSnapshot']['waypoints'][number] = {
      slot,
      waypointType,
      nodeRole,
      name,
      lon,
      lat,
      distKm,
      rankScore,
      sourceTable: getNullableString(source.sourceTable) ?? null,
      sourceId: getStringOrNumber(source.sourceId) ?? null,
      fallback: source.fallback,
    };
    const designationCategory = getString(source.designationCategory);
    if (designationCategory !== undefined) waypoint.designationCategory = designationCategory;
    return [waypoint];
  });
}

function getRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function getNullableString(value: unknown): string | null | undefined {
  return value === null ? null : getString(value);
}

function getStringOrNumber(value: unknown): string | number | undefined {
  return getString(value) ?? getFiniteNumber(value);
}

function getFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : undefined;
}

function getIntegerArray(value: unknown): number[] {
  return Array.isArray(value) ? value.flatMap(item => {
    const integer = getInteger(item);
    return integer === undefined ? [] : [integer];
  }) : [];
}

function getExactIntegerArray(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const integers = value.map(getInteger);
  return integers.some(item => item === undefined) ? null : integers as number[];
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function getExactStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || item.length === 0)) return null;
  return [...value] as string[];
}

function getAllowedStringArray(value: unknown, allowed: ReadonlySet<string>): string[] {
  return getStringArray(value).filter(item => allowed.has(item));
}

function getEvidenceFamilies(value: unknown): EvidenceFamily[] {
  if (!Array.isArray(value)) return [];
  const result = value.filter(isEvidenceFamily);
  return [...new Set(result)].filter(family => EVIDENCE_FAMILIES.includes(family));
}

function getUint32(value: unknown): number | undefined {
  const integer = getInteger(value);
  return integer !== undefined && integer >= 0 && integer <= UINT32_MAX ? integer : undefined;
}

function getObservationRef(value: unknown): string | undefined {
  return typeof value === 'string' && /^obs-[0-2]$/.test(value) ? value : undefined;
}

function getNumberRecord(value: unknown): Record<string, number> {
  const source = getRecord(value);
  const result: Record<string, number> = {};
  for (const [key, item] of Object.entries(source)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) continue;
    const number = getFiniteNumber(item);
    if (number !== undefined) result[key] = number;
  }
  return result;
}

function assignString<T extends object, K extends keyof T>(target: T, key: K, value: unknown): void {
  const string = getString(value);
  if (string !== undefined) target[key] = string as T[K];
}

function assignNullableString<T extends object, K extends keyof T>(target: T, key: K, value: unknown): void {
  const string = getNullableString(value);
  if (string !== undefined) target[key] = string as T[K];
}

function assignNumber<T extends object, K extends keyof T>(target: T, key: K, value: unknown): void {
  const number = getFiniteNumber(value);
  if (number !== undefined) target[key] = number as T[K];
}

function assignNonnegativeInteger<T extends object, K extends keyof T>(target: T, key: K, value: unknown): void {
  const integer = getInteger(value);
  if (integer !== undefined && integer >= 0) target[key] = integer as T[K];
}

function assignDate<T extends object, K extends keyof T>(target: T, key: K, value: unknown): void {
  const date = getDateString(value);
  if (date !== undefined) target[key] = date as T[K];
}

function assignNullableDate<T extends object, K extends keyof T>(target: T, key: K, value: unknown): void {
  if (value === null) {
    target[key] = null as T[K];
    return;
  }
  assignDate(target, key, value);
}

function getDateString(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return typeof value === 'string' ? value : undefined;
}
