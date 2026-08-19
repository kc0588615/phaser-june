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
  assert.match(routeSource, /updateSessionProgress\(profile\.userId/);
  assert.match(routeSource, /forceSessionUpdate\(profile\.userId/);
  assert.match(routeSource, /endGameSession\(profile\.userId/);
  assert.match(trackingSource, /eq\(playerGameSessions\.playerId, playerId\)/);
  assert.match(trackingSource, /sessionId = ownedSession\[0\] \? requestedSessionId : null/);
  assert.match(
    trackingSource,
    /eq\(playerClueUnlocks\.playerId, playerId\),\s*eq\(playerClueUnlocks\.speciesId, speciesId\),\s*isNull\(playerClueUnlocks\.discoveryId\)/,
  );
});
