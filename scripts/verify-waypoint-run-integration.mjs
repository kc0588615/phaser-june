import postgres from 'postgres';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local', quiet: true });

const baseUrl = process.env.WAYPOINT_BASE_URL || 'http://localhost:8080';
const databaseUrl = process.env.VERIFY_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Set VERIFY_DATABASE_URL or DATABASE_URL before running this script.');
  process.exit(1);
}

function stripPgBouncer(url) {
  const parsed = new URL(url);
  parsed.searchParams.delete('pgbouncer');
  return parsed.toString();
}

const sql = postgres(stripPgBouncer(databaseUrl), {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isValidLonLat(point) {
  return Number.isFinite(point?.lon)
    && Number.isFinite(point?.lat)
    && point.lon >= -180
    && point.lon <= 180
    && point.lat >= -90
    && point.lat <= 90;
}

async function fetchJson(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.text();
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    throw new Error(`Non-JSON response (${response.status}): ${body.slice(0, 200)}`);
  }
  return { response, data };
}

function attachWaypointsToNodes(nodes, waypoints) {
  const bySlot = new Map(waypoints.map((waypoint) => [waypoint.slot, waypoint]));
  return nodes.map((node, index) => ({ ...node, waypoint: bySlot.get(index) ?? null }));
}

function expectedNodeTypeForWaypoint(waypoint) {
  if (waypoint.nodeRole === 'final') return 'analysis';
  switch (waypoint.waypointType) {
    case 'river':
    case 'lake':
    case 'wetland':
      return 'riverbank_sweep';
    case 'city':
      return 'urban_fringe';
    case 'protected_area':
      return 'custom';
    case 'basecamp':
      return waypoint.fallback ? 'custom' : 'urban_fringe';
    case 'bioregion_edge':
      return 'custom';
    default:
      return null;
  }
}

function expectedTemplateSignatureForWaypoint(waypoint, nodeType) {
  if (waypoint.nodeRole === 'final') {
    return {
      obstacleFamily: null,
      rationaleIncludes: null,
    };
  }
  if (nodeType === 'crisis') return null;

  switch (waypoint.waypointType) {
    case 'protected_area':
      return {
        obstacleFamily: 'sighting',
        rationaleIncludes: 'protected-area boundaries',
      };
    case 'basecamp':
      return waypoint.fallback
        ? {
            obstacleFamily: 'alert',
            rationaleIncludes: 'Route fallback uses',
          }
        : {
            obstacleFamily: 'panic',
            rationaleIncludes: 'urban edge disturbance',
          };
    case 'bioregion_edge':
      return {
        obstacleFamily: 'visibility',
        rationaleIncludes: 'shifting habitat edges',
      };
    default:
      return null;
  }
}

async function createRun({ lon, lat, label = 'dense' }) {
  const [waypointsResult, atPointResult] = await Promise.all([
    fetchJson(`/api/expedition/waypoints?lon=${lon}&lat=${lat}&debug=true`),
    fetchJson(`/api/protected-areas/at-point?lon=${lon}&lat=${lat}&size=500`),
  ]);

  assert(waypointsResult.response.status === 200, `waypoints returned ${waypointsResult.response.status}`);
  assert(atPointResult.response.status === 200, `at-point returned ${atPointResult.response.status}`);

  const waypointData = waypointsResult.data;
  const atPointData = atPointResult.data;
  assert(Array.isArray(waypointData.waypoints) && waypointData.waypoints.length === 6, 'expected six waypoints');
  assert(Array.isArray(waypointData.routePolyline) && waypointData.routePolyline.length === 6, 'expected six route points');
  assert(Array.isArray(atPointData.generated_nodes) && atPointData.generated_nodes.length === 6, 'expected six generated nodes');

  const nodes = attachWaypointsToNodes(atPointData.generated_nodes, waypointData.waypoints);
  const locationKey = `verify-waypoints:${label}:${lon.toFixed(4)},${lat.toFixed(4)}:${Date.now()}`;

  const payload = {
    lon,
    lat,
    locationKey,
    nodes,
    activeAffinities: [],
    bioregion: atPointData.bioregion?.bioregion ?? undefined,
    realm: atPointData.bioregion?.realm ?? undefined,
    biome: atPointData.bioregion?.biome ?? undefined,
    habitats: [],
    rasterHabitats: [],
    featureFingerprints: atPointData.feature_fingerprints ?? [],
    routePolyline: waypointData.routePolyline,
    expeditionSnapshot: {
      protectedAreas: atPointData.protected_areas ?? [],
      actionBias: atPointData.action_bias ?? {},
      availableAffinities: [],
      primaryNodeFamily: atPointData.primary_node_family ?? '',
      primaryVariant: atPointData.primary_variant ?? '',
      modifierNodes: atPointData.modifier_nodes ?? [],
      signals: atPointData.signals ?? {},
      waypoints: waypointData.waypoints,
      waypointRadiusKm: waypointData.radiusKm,
      nearestRiverDistM: atPointData.nearest_river_dist_m ?? null,
    },
  };

  const runResult = await fetchJson('/api/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  assert(runResult.response.status === 200, `run creation returned ${runResult.response.status}: ${JSON.stringify(runResult.data)}`);
  assert(typeof runResult.data.runId === 'string' && runResult.data.runId.length > 0, 'missing runId');
  assert(Array.isArray(runResult.data.nodeIds) && runResult.data.nodeIds.length === 6, 'expected six nodeIds');

  return { runId: runResult.data.runId, waypointData, locationKey };
}

async function verifyPersistedRun(runId, waypointData, locationKey) {
  const [session] = await sql`
    SELECT id, location_key, metadata
    FROM eco_run_sessions
    WHERE id = ${runId}
    LIMIT 1
  `;
  assert(session, 'session was not persisted');
  assert(session.location_key === locationKey, 'persisted locationKey mismatch');
  assert(Array.isArray(session.metadata?.routePolyline), 'metadata.routePolyline missing');
  assert(session.metadata.routePolyline.length === 6, 'metadata.routePolyline must have six points');
  assert(session.metadata.routePolyline.every(isValidLonLat), 'metadata.routePolyline has invalid coordinates');
  assert(
    session.metadata.routePolyline.every((point) => Number.isInteger(point.waypointSlot)),
    'metadata.routePolyline must preserve waypointSlot values',
  );
  assert(Array.isArray(session.metadata?.expeditionSnapshot?.waypoints), 'expeditionSnapshot.waypoints missing');
  assert(session.metadata.expeditionSnapshot.waypoints.length === 6, 'expeditionSnapshot.waypoints must have six entries');
  assert(session.metadata.expeditionSnapshot.waypointRadiusKm === waypointData.radiusKm, 'waypointRadiusKm mismatch');

  const nodes = await sql`
    SELECT node_order, node_type, hazard_profile, board_context
    FROM eco_run_nodes
    WHERE run_id = ${runId}
    ORDER BY node_order
  `;
  assert(nodes.length === 6, `expected six persisted nodes, got ${nodes.length}`);

  for (const node of nodes) {
    const waypoint = node.board_context?.waypoint;
    assert(waypoint && typeof waypoint === 'object', `node ${node.node_order}: missing board_context.waypoint`);
    assert(waypoint.slot === node.node_order - 1, `node ${node.node_order}: waypoint slot mismatch`);
    assert(isValidLonLat(waypoint), `node ${node.node_order}: invalid waypoint coordinates`);
    const expectedNodeType = expectedNodeTypeForWaypoint(waypoint);
    if (expectedNodeType) {
      const crisisPreserved = waypoint.nodeRole !== 'final' && node.node_type === 'crisis';
      assert(
        node.node_type === expectedNodeType || crisisPreserved,
        `node ${node.node_order}: expected ${expectedNodeType}, got ${node.node_type}`,
      );
    }

    const signature = expectedTemplateSignatureForWaypoint(waypoint, node.node_type);
    if (signature) {
      assert(
        (node.hazard_profile?.obstacleFamily ?? null) === signature.obstacleFamily,
        `node ${node.node_order}: expected obstacleFamily ${signature.obstacleFamily}, got ${node.hazard_profile?.obstacleFamily ?? null}`,
      );
      if (signature.rationaleIncludes) {
        assert(
          typeof node.board_context?.rationale === 'string'
            && node.board_context.rationale.includes(signature.rationaleIncludes),
          `node ${node.node_order}: expected rationale to include "${signature.rationaleIncludes}"`,
        );
      }
    }
  }

  const routeSlots = session.metadata.routePolyline.map((point) => point.waypointSlot).join(',');
  console.log(`run integration: ok runId=${runId} routeSlots=${routeSlots}`);
}

async function verifySparseFallbackRun(runId, waypointData, locationKey) {
  const fallbackCount = waypointData.waypoints.filter((waypoint) => waypoint.fallback).length;
  const basecampCount = waypointData.waypoints.filter((waypoint) => waypoint.waypointType === 'basecamp').length;
  const hasBioregionWaypoint = waypointData.waypoints.some((waypoint) => waypoint.waypointType === 'bioregion_edge');

  assert(fallbackCount >= 4, `sparse run expected at least four fallbacks, got ${fallbackCount}`);
  assert(basecampCount >= 4, `sparse run expected basecamp fallbacks, got ${basecampCount}`);

  await verifyPersistedRun(runId, waypointData, locationKey);
  console.log(`sparse fallback: ok runId=${runId} fallbacks=${fallbackCount} basecamps=${basecampCount} bioregion=${hasBioregionWaypoint}`);
}

async function checkpointAndVerifyResumeState(runId, waypointData) {
  const firstRoutePoint = waypointData.routePolyline[0];
  const checkpointResult = await fetchJson(`/api/runs/${runId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentNodeIndex: 0,
      objectiveProgress: 2,
      resourceWallet: { wild: 1 },
      clueFragments: { habitat: 1 },
      bankedScore: 5,
      routePolyline: [firstRoutePoint],
      status: 'active',
    }),
  });

  assert(
    checkpointResult.response.status === 200,
    `checkpoint returned ${checkpointResult.response.status}: ${JSON.stringify(checkpointResult.data)}`,
  );

  const [checkpointSession] = await sql`
    SELECT run_status, metadata
    FROM eco_run_sessions
    WHERE id = ${runId}
    LIMIT 1
  `;
  assert(checkpointSession, 'checkpoint session missing');
  assert(checkpointSession.run_status === 'active', 'checkpoint should keep session active');
  assert(checkpointSession.metadata?.currentNodeIndex === 0, 'checkpoint should persist 0-based currentNodeIndex');
  assert(checkpointSession.metadata?.bankedScore === 5, 'checkpoint should persist bankedScore');
  assert(checkpointSession.metadata?.resourceWallet?.wild === 1, 'checkpoint should persist resourceWallet');
  assert(checkpointSession.metadata?.clueFragments?.habitat === 1, 'checkpoint should persist clueFragments');
  assert(
    Array.isArray(checkpointSession.metadata?.routePolyline)
      && checkpointSession.metadata.routePolyline.length === 1
      && checkpointSession.metadata.routePolyline[0].waypointSlot === firstRoutePoint.waypointSlot,
    'checkpoint should persist routePolyline with waypointSlot',
  );

  const [checkpointNode] = await sql`
    SELECT objective_progress
    FROM eco_run_nodes
    WHERE run_id = ${runId} AND node_order = 1
    LIMIT 1
  `;
  assert(checkpointNode?.objective_progress === 2, 'checkpoint should persist active node objectiveProgress');

  const completeResult = await fetchJson(`/api/runs/${runId}/nodes/1/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scoreEarned: 7,
      movesUsed: 3,
      objectiveProgress: 5,
      souvenirs: [{ id: 'verify-token', name: 'Verifier Token' }],
      encounterOutcome: {
        threats: [],
        finalSpookLevel: 0,
        outcome: 'stabilized',
        chipDamageTotal: 0,
      },
    }),
  });

  assert(
    completeResult.response.status === 200,
    `node completion returned ${completeResult.response.status}: ${JSON.stringify(completeResult.data)}`,
  );

  const [postCompleteSession] = await sql`
    SELECT run_status, node_index_current, score_total, moves_used
    FROM eco_run_sessions
    WHERE id = ${runId}
    LIMIT 1
  `;
  assert(postCompleteSession?.run_status === 'active', 'first node completion should leave run active');
  assert(postCompleteSession.node_index_current === 2, 'session node_index_current should advance to 1-based node 2');
  assert(postCompleteSession.score_total === 7, 'node completion should add score');
  assert(postCompleteSession.moves_used === 3, 'node completion should add moves');

  const completedNodes = await sql`
    SELECT node_order, node_status, objective_progress, reward_profile, board_context
    FROM eco_run_nodes
    WHERE run_id = ${runId} AND node_order IN (1, 2)
    ORDER BY node_order
  `;
  assert(completedNodes.length === 2, 'expected first two nodes after completion');
  assert(completedNodes[0].node_status === 'completed', 'node 1 should be completed');
  assert(completedNodes[0].objective_progress === 5, 'node 1 completion objectiveProgress mismatch');
  assert(completedNodes[0].reward_profile?.souvenirs?.[0]?.id === 'verify-token', 'node 1 souvenir should persist');
  assert(completedNodes[0].board_context?.encounterOutcome?.outcome === 'stabilized', 'node 1 encounterOutcome should persist');
  assert(completedNodes[1].node_status === 'active', 'node 2 should unlock as active');

  const staleCheckpoint = await fetchJson(`/api/runs/${runId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentNodeIndex: 0,
      objectiveProgress: 3,
      routePolyline: [firstRoutePoint],
      status: 'active',
    }),
  });

  assert(
    staleCheckpoint.response.status === 200,
    `stale checkpoint returned ${staleCheckpoint.response.status}: ${JSON.stringify(staleCheckpoint.data)}`,
  );

  const [staleCheckpointNode] = await sql`
    SELECT objective_progress
    FROM eco_run_nodes
    WHERE run_id = ${runId} AND node_order = 1
    LIMIT 1
  `;
  assert(
    staleCheckpointNode?.objective_progress === 5,
    'stale checkpoint should not overwrite completed node objectiveProgress',
  );

  const secondRoutePoint = waypointData.routePolyline.find((point) => point.waypointSlot === 1)
    ?? waypointData.routePolyline[1];
  const resumeCheckpoint = await fetchJson(`/api/runs/${runId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentNodeIndex: 1,
      objectiveProgress: 1,
      routePolyline: [firstRoutePoint, secondRoutePoint],
      status: 'active',
    }),
  });

  assert(
    resumeCheckpoint.response.status === 200,
    `second checkpoint returned ${resumeCheckpoint.response.status}: ${JSON.stringify(resumeCheckpoint.data)}`,
  );

  const [resumeSession] = await sql`
    SELECT metadata
    FROM eco_run_sessions
    WHERE id = ${runId}
    LIMIT 1
  `;
  assert(resumeSession?.metadata?.currentNodeIndex === 1, 'resume checkpoint should persist next 0-based node index');
  assert(
    Array.isArray(resumeSession.metadata.routePolyline)
      && resumeSession.metadata.routePolyline.some((point) => point.waypointSlot === secondRoutePoint.waypointSlot),
    'resume checkpoint should preserve second waypointSlot in routePolyline',
  );

  const [activeNode] = await sql`
    SELECT objective_progress
    FROM eco_run_nodes
    WHERE run_id = ${runId} AND node_order = 2
    LIMIT 1
  `;
  assert(activeNode?.objective_progress === 1, 'resume checkpoint should persist node 2 objectiveProgress');

  console.log(`checkpoint resume: ok runId=${runId}`);
}

async function checkpointAndVerifyDeductionState(runId, waypointData) {
  const result = await fetchJson(`/api/runs/${runId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentNodeIndex: 6,
      routePolyline: waypointData.routePolyline,
      status: 'deduction',
      bankedScore: 12,
      clueFragments: { habitat: 1, morphology: 1 },
    }),
  });

  assert(
    result.response.status === 200,
    `deduction checkpoint returned ${result.response.status}: ${JSON.stringify(result.data)}`,
  );

  const [session] = await sql`
    SELECT run_status, metadata
    FROM eco_run_sessions
    WHERE id = ${runId}
    LIMIT 1
  `;

  assert(session?.run_status === 'deduction', 'deduction checkpoint should set run_status');
  assert(session.metadata?.currentNodeIndex === 6, 'deduction checkpoint should persist one-past-final node index');
  assert(session.metadata?.bankedScore === 12, 'deduction checkpoint should persist bankedScore');
  assert(session.metadata?.clueFragments?.morphology === 1, 'deduction checkpoint should persist clueFragments');
  assert(
    Array.isArray(session.metadata?.routePolyline) && session.metadata.routePolyline.length === 6,
    'deduction checkpoint should persist full routePolyline',
  );

  console.log(`deduction checkpoint: ok runId=${runId}`);
}

async function completeAndVerifyMemory(runId, waypointData) {
  const result = await fetchJson(`/api/runs/${runId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      finalScore: 123,
      deductionSummary: { verifier: 'waypoint-run-integration' },
      routePolyline: waypointData.routePolyline,
    }),
  });

  assert(result.response.status === 200, `run completion returned ${result.response.status}: ${JSON.stringify(result.data)}`);

  const [memory] = await sql`
    SELECT route_polyline, nodes, final_score
    FROM run_memories
    WHERE run_id = ${runId}
    LIMIT 1
  `;

  assert(memory, 'run memory was not persisted');
  assert(memory.final_score === 123, 'run memory final_score mismatch');
  assert(Array.isArray(memory.route_polyline) && memory.route_polyline.length === 6, 'memory route_polyline must have six points');
  assert(
    memory.route_polyline.every((point) => isValidLonLat(point) && Number.isInteger(point.waypointSlot)),
    'memory route_polyline must preserve lon/lat and waypointSlot values',
  );
  assert(Array.isArray(memory.nodes) && memory.nodes.length === 6, 'memory nodes must have six entries');
  assert(
    memory.nodes.every((node, index) => node.waypoint?.slot === index && isValidLonLat(node.waypoint)),
    'memory nodes must preserve board_context.waypoint metadata',
  );

  console.log(`run memory: ok runId=${runId}`);
}

async function cleanupRun(runId) {
  await sql`DELETE FROM eco_run_sessions WHERE id = ${runId}`;

  const [sessionCount] = await sql`
    SELECT COUNT(*)::int AS count
    FROM eco_run_sessions
    WHERE id = ${runId}
  `;
  const [nodeCount] = await sql`
    SELECT COUNT(*)::int AS count
    FROM eco_run_nodes
    WHERE run_id = ${runId}
  `;
  const [memoryCount] = await sql`
    SELECT COUNT(*)::int AS count
    FROM run_memories
    WHERE run_id = ${runId}
  `;

  assert(sessionCount?.count === 0, 'cleanup should delete eco_run_sessions row');
  assert(nodeCount?.count === 0, 'cleanup should cascade-delete eco_run_nodes rows');
  assert(memoryCount?.count === 0, 'cleanup should cascade-delete run_memories row');
  console.log(`run integration: cleaned up runId=${runId}`);
}

const runIds = [];
try {
  const created = await createRun({ lon: 2.3522, lat: 48.8566, label: 'paris' });
  runIds.push(created.runId);
  await verifyPersistedRun(created.runId, created.waypointData, created.locationKey);
  await checkpointAndVerifyResumeState(created.runId, created.waypointData);
  await checkpointAndVerifyDeductionState(created.runId, created.waypointData);
  await completeAndVerifyMemory(created.runId, created.waypointData);

  const sparseCreated = await createRun({ lon: -150, lat: 0, label: 'mid-pacific' });
  runIds.push(sparseCreated.runId);
  await verifySparseFallbackRun(sparseCreated.runId, sparseCreated.waypointData, sparseCreated.locationKey);
} finally {
  for (const runId of runIds.reverse()) {
    await cleanupRun(runId);
  }
  await sql.end();
}
