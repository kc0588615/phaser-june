import type { SolveReport } from '@/clueGame/solveReport';

/** Send a solve to POST /api/clue-game/solves. Best effort: play never waits on it or fails because of it. */
export function reportSolve(report: SolveReport): void {
  fetch('/api/clue-game/solves/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report),
    keepalive: true,
  }).catch(error => console.error('[ClueMatch] Failed to record a solve:', error));
}
