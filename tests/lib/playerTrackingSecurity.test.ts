import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';

const trackingSource = readFileSync('src/lib/playerTracking.ts', 'utf8');
const routeSource = readFileSync('src/pages/api/player/track.ts', 'utf8');

test('player tracking security has no process-global session or delayed timer', () => {
  for (const forbidden of [
    'SessionState',
    'currentSession',
    'sessionUpdateTimer',
    'SESSION_UPDATE_DEBOUNCE',
    'setTimeout',
    'calculateTimeToDiscover',
    'getCurrentSessionId',
  ]) {
    assert.doesNotMatch(trackingSource, new RegExp(forbidden));
  }
});

test('player tracking security scopes mutations to authenticated player', () => {
  assert.match(routeSource, /endGameSession\(profile\.userId/);
  assert.match(trackingSource, /eq\(playerGameSessions\.playerId, playerId\)/);
});

test('player tracking route cannot write discoveries or rewrite session progress', () => {
  assert.doesNotMatch(routeSource, /trackSpeciesDiscovery|updateSessionProgress|forceSessionUpdate/);
  assert.doesNotMatch(trackingSource, /export async function (trackSpeciesDiscovery|updateSessionProgress|forceSessionUpdate)/);
});
