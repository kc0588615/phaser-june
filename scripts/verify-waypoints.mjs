const baseUrl = process.env.WAYPOINT_BASE_URL || 'http://localhost:8080';

const cases = [
  { name: 'Paris', lon: 2.3522, lat: 48.8566 },
  { name: 'Tokyo', lon: 139.6917, lat: 35.6895 },
  { name: 'Amazon basin', lon: -63.0, lat: -3.5 },
  { name: 'Sahara', lon: 13.0, lat: 23.0 },
  { name: 'rural Kenya', lon: 37.0, lat: 0.5 },
  { name: 'mid-Pacific', lon: -150.0, lat: 0.0 },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isValidLonLat(point) {
  return Number.isFinite(point.lon)
    && Number.isFinite(point.lat)
    && point.lon >= -180
    && point.lon <= 180
    && point.lat >= -90
    && point.lat <= 90;
}

async function fetchJson(path) {
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.text();
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    throw new Error(`Non-JSON response (${response.status}): ${body.slice(0, 200)}`);
  }
  return { response, data };
}

async function verifyCase({ name, lon, lat }) {
  const path = `/api/expedition/waypoints?lon=${lon}&lat=${lat}&debug=true`;
  const { response, data } = await fetchJson(path);

  assert(response.status === 200, `${name}: expected HTTP 200, got ${response.status}`);
  assert(isValidLonLat(data.origin), `${name}: invalid origin`);
  assert(data.origin.lon === lon && data.origin.lat === lat, `${name}: origin mismatch`);
  assert([100, 200, 400].includes(data.radiusKm), `${name}: unexpected radius ${data.radiusKm}`);
  assert(Array.isArray(data.waypoints), `${name}: waypoints must be an array`);
  assert(data.waypoints.length === 6, `${name}: expected six waypoints, got ${data.waypoints.length}`);
  assert(Array.isArray(data.routePolyline), `${name}: routePolyline must be an array`);
  assert(data.routePolyline.length === 6, `${name}: routePolyline must include six waypoint refs`);
  assert(data.debug?.candidateCounts && typeof data.debug.candidateCounts === 'object', `${name}: missing debug candidateCounts`);

  const slots = new Set();
  for (const waypoint of data.waypoints) {
    assert(Number.isInteger(waypoint.slot) && waypoint.slot >= 0 && waypoint.slot <= 5, `${name}: invalid waypoint slot`);
    assert(!slots.has(waypoint.slot), `${name}: duplicate waypoint slot ${waypoint.slot}`);
    slots.add(waypoint.slot);
    assert(isValidLonLat(waypoint), `${name}: invalid waypoint coordinate for slot ${waypoint.slot}`);
    assert(typeof waypoint.name === 'string' && waypoint.name.length > 0, `${name}: missing waypoint name`);
    assert(Number.isFinite(waypoint.distKm), `${name}: invalid distKm for slot ${waypoint.slot}`);
    assert(Number.isFinite(waypoint.rankScore), `${name}: invalid rankScore for slot ${waypoint.slot}`);
  }

  const routeSlots = data.routePolyline.map((point) => point.waypointSlot);
  assert(new Set(routeSlots).size === 6, `${name}: routePolyline has duplicate slots`);
  for (const point of data.routePolyline) {
    assert(isValidLonLat(point), `${name}: invalid routePolyline coordinate`);
    assert(slots.has(point.waypointSlot), `${name}: routePolyline references missing slot ${point.waypointSlot}`);
  }

  const protectedCategories = data.waypoints
    .filter((waypoint) => waypoint.waypointType === 'protected_area')
    .map((waypoint) => waypoint.designationCategory)
    .filter(Boolean);

  const typeSummary = data.waypoints.map((waypoint) => waypoint.waypointType).join(',');
  const fallbackCount = data.waypoints.filter((waypoint) => waypoint.fallback).length;
  console.log(`${name}: ok radius=${data.radiusKm} route=${routeSlots.join(',')} types=${typeSummary} protectedCategories=${protectedCategories.join(',') || '-'} fallbacks=${fallbackCount}`);
}

async function verifyInvalidRequest() {
  const { response, data } = await fetchJson('/api/expedition/waypoints?lon=999&lat=0');
  assert(response.status === 400, `invalid coordinates: expected HTTP 400, got ${response.status}`);
  assert(typeof data.error === 'string' && data.error.length > 0, 'invalid coordinates: missing error message');
  console.log('invalid coordinates: ok');
}

for (const testCase of cases) {
  await verifyCase(testCase);
}
await verifyInvalidRequest();
