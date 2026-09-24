// Dev-only playtest bridge. Exposes `window.__cc` so an agent driving the
// browser (chrome-devtools `evaluate_script`) can read the board and play real
// moves. Moves are synthetic mouse drags on the canvas, so they go through the
// same pointer handlers a player uses. Reads client-visible state only; every
// entry point is a no-op in production builds.
import { EventBus, type EventPayloads } from '@/game/EventBus';
import { MoveAction, type MoveDirection } from '@/game/MoveAction';
import type { BackendPuzzle } from '@/game/BackendPuzzle';
import type { PuzzleGrid } from '@/game/boardTypes';
import type { RunState } from '@/types/expedition';

export interface DebugBoardSnapshot {
  ready: boolean;
  canMove: boolean;
  isResolvingMove: boolean;
  isDragging: boolean;
  isPaused: boolean;
  inRun: boolean;
  nodeIndex: number;
  boardSeed: number | null;
  movesUsed: number;
  maxMoves: number;
  gameOver: boolean;
  objective: { progress: number; target: number; completed: boolean };
  streak: number;
  hasAnyValidMove: boolean;
  gemSize: number;
  boardOffset: { x: number; y: number };
  grid: PuzzleGrid;
}

/** What the Game scene hands the bridge; typed so field renames fail typecheck. */
export interface DebugScene {
  debugSnapshot(): DebugBoardSnapshot;
  debugPuzzle(): BackendPuzzle | null;
  readonly game: Phaser.Game;
  readonly scale: Phaser.Scale.ScaleManager;
  readonly tweens: Phaser.Tweens.TweenManager;
  readonly time: Phaser.Time.Clock;
}

type RunSource = () => { runId: string | null; runState: RunState };
/** Clue Match session summary (JSON-safe), registered by the Clue Match page. */
type ClueSource = () => unknown;
type Move = { rowOrCol: MoveDirection; index: number; amount: number };
type LoggedEvent = { at: number; name: keyof EventPayloads; payload: unknown };

const enabled = process.env.NODE_ENV !== 'production' && typeof window !== 'undefined';
const MAX_EVENTS = 200;
// Every EventBus event; a Record so a new event missing here fails typecheck.
const LOGGED: Record<keyof EventPayloads, true> = {
  'terrain-cell-selected': true, 'current-scene-ready': true, 'map-location-selected': true,
  'game-reset': true, 'game-hud-updated': true, 'expedition-data-ready': true,
  'expedition-start': true, 'node-complete': true, 'route-progress-updated': true,
  'node-objective-updated': true, 'evidence-move-resolved': true, 'evidence-progress-committed': true,
  'routing-state-updated': true, 'auth-user-ready': true, 'gems-matched': true,
  'clue-board-setup': true, 'clue-board-lock': true, 'clue-board-shuffled': true,
};

let scene: DebugScene | null = null;
let runSource: RunSource | null = null;
let clueSource: ClueSource | null = null;
const log: LoggedEvent[] = [];

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** Keep the log small: drop bulky payload fields, keep what an agent reasons about. */
function summarize(name: keyof EventPayloads, payload: unknown): unknown {
  if (name === 'current-scene-ready') return (payload as Phaser.Scene).sys.settings.key;
  if (name === 'expedition-data-ready') {
    const p = payload as EventPayloads['expedition-data-ready'];
    return { lon: p.lon, lat: p.lat, species: p.species.length };
  }
  if (!payload || typeof payload !== 'object') return payload;
  const { boardCheckpoint, terrain, ...rest } = payload as Record<string, unknown>;
  return { ...rest, ...(boardCheckpoint ? { boardCheckpoint: '[omitted]' } : {}), ...(terrain ? { terrain: '[omitted]' } : {}) };
}

function requireScene(): DebugScene {
  if (!scene) throw new Error('Game scene not ready');
  return scene;
}

/** Board cell (x, y) -> page (client) coordinates, respecting canvas scaling. */
function cellCenter(x: number, y: number): { x: number; y: number } {
  const s = requireScene();
  const { gemSize, boardOffset } = s.debugSnapshot();
  const rect = s.game.canvas.getBoundingClientRect();
  const worldX = boardOffset.x + (x + 0.5) * gemSize;
  const worldY = boardOffset.y + (y + 0.5) * gemSize;
  return {
    x: rect.left + worldX * rect.width / s.scale.gameSize.width,
    y: rect.top + worldY * rect.height / s.scale.gameSize.height,
  };
}

/** Moves (shifts of 1-3 cells either way) that would produce a match right now. */
function validMoves(): Array<Move & { matches: number }> {
  const puzzle = requireScene().debugPuzzle();
  if (!puzzle) return [];
  const { width, height } = puzzle;
  const found: Array<Move & { matches: number }> = [];
  for (const rowOrCol of ['row', 'col'] as const) {
    const lines = rowOrCol === 'row' ? height : width;
    for (let index = 0; index < lines; index++) {
      for (const amount of [1, -1, 2, -2, 3]) {
        const matches = puzzle.getMatchesFromHypotheticalMove(new MoveAction(rowOrCol, index, amount)).length;
        if (matches > 0) found.push({ rowOrCol, index, amount, matches });
      }
    }
  }
  return found;
}

/** Settled = no animation or drag in flight, and input is back (or the board is done). */
function isSettled(state: DebugBoardSnapshot): boolean {
  if (!state.ready || state.isResolvingMove || state.isDragging) return false;
  return state.canMove || state.gameOver || state.objective.completed || state.movesUsed >= state.maxMoves;
}

async function waitIdle(timeoutMs = 15000): Promise<DebugBoardSnapshot & { timedOut: boolean }> {
  const deadline = Date.now() + timeoutMs;
  let stableTicks = 0;
  while (Date.now() < deadline) {
    stableTicks = isSettled(requireScene().debugSnapshot()) ? stableTicks + 1 : 0;
    if (stableTicks >= 2) return { ...requireScene().debugSnapshot(), timedOut: false };
    await sleep(100);
  }
  return { ...requireScene().debugSnapshot(), timedOut: true };
}

function fire(type: 'mousedown' | 'mousemove' | 'mouseup', point: { x: number; y: number }): void {
  requireScene().game.canvas.dispatchEvent(new MouseEvent(type, {
    clientX: point.x, clientY: point.y, bubbles: true, cancelable: true, view: window,
    button: 0, buttons: type === 'mouseup' ? 0 : 1,
  }));
}

/** What a player's pointer would hit at this point, or null when it's the board canvas. */
function overlayAt(point: { x: number; y: number }): string | null {
  const hit = document.elementFromPoint(point.x, point.y);
  if (hit === requireScene().game.canvas) return null;
  if (!hit) return 'nothing (off-screen)';
  const label = hit.closest('[aria-label], [role=dialog]')?.getAttribute('aria-label');
  return `${hit.tagName.toLowerCase()}${label ? ` in "${label}"` : ''}`;
}

/**
 * Drag a row/column like a player: mouse down on one cell, move in steps, release
 * `amount` cells away. Resolves once the board settles. A drag that makes no match
 * snaps back and uses no move. Refuses (`blocked`) when UI covers the start cell,
 * since a player couldn't make that drag either.
 */
async function drag(move: Move, timeoutMs = 15000) {
  const before = requireScene().debugSnapshot();
  const last = (move.rowOrCol === 'row' ? before.grid[0]?.length ?? 6 : before.grid.length) - 1;
  const start = move.amount > 0 ? 0 : last;
  const from = move.rowOrCol === 'row' ? { x: start, y: move.index } : { x: move.index, y: start };
  const to = move.rowOrCol === 'row' ? { x: start + move.amount, y: move.index } : { x: move.index, y: start + move.amount };
  const a = cellCenter(from.x, from.y);
  const b = cellCenter(to.x, to.y);
  const blocked = overlayAt(a);
  if (blocked) return { move, counted: false, movesUsed: before.movesUsed, timedOut: false, blocked, after: before };
  fire('mousedown', a);
  for (let step = 1; step <= 6; step++) {
    await sleep(16);
    fire('mousemove', { x: a.x + (b.x - a.x) * step / 6, y: a.y + (b.y - a.y) * step / 6 });
  }
  fire('mouseup', b);
  await sleep(50);
  const after = await waitIdle(timeoutMs);
  return { move, counted: after.movesUsed > before.movesUsed, movesUsed: after.movesUsed, timedOut: after.timedOut, blocked: null, after };
}

/** Scale animation speed (1 = normal). Pausing resets the clock to 1. */
function speed(scale: number): number {
  const s = requireScene();
  s.tweens.timeScale = scale;
  s.time.timeScale = scale;
  return scale;
}

function install(): void {
  const holder = window as unknown as { __cc?: unknown; __ccUninstall?: () => void };
  holder.__ccUninstall?.(); // HMR: drop the previous module's listeners
  const listeners = (Object.keys(LOGGED) as Array<keyof EventPayloads>).map(name => {
    const fn = (payload: unknown) => {
      log.push({ at: Date.now(), name, payload: summarize(name, payload) });
      if (log.length > MAX_EVENTS) log.shift();
    };
    EventBus.on(name, fn as never);
    return () => { EventBus.off(name, fn as never); };
  });
  holder.__ccUninstall = () => listeners.forEach(off => off());
  holder.__cc = {
    state: () => requireScene().debugSnapshot(),
    run: () => runSource?.() ?? null,
    clue: () => clueSource?.() ?? null,
    validMoves,
    cellCenter,
    drag,
    waitIdle,
    events: (n = 20) => log.slice(-n),
    speed,
  };
}

let installed = false;
function ensureInstalled(): void {
  if (installed) return;
  installed = true;
  install();
}

export function attachDebugScene(next: DebugScene): void {
  if (!enabled) return;
  ensureInstalled();
  scene = next;
}

export function detachDebugScene(prev: DebugScene): void {
  if (enabled && scene === prev) scene = null;
}

/** Register the React-side run state getter; returns the unregister function. */
export function setDebugRunSource(source: RunSource): () => void {
  if (!enabled) return () => {};
  ensureInstalled();
  runSource = source;
  return () => { if (runSource === source) runSource = null; };
}

/** Register the Clue Match session getter; returns the unregister function. */
export function setDebugClueSource(source: ClueSource): () => void {
  if (!enabled) return () => {};
  ensureInstalled();
  clueSource = source;
  return () => { if (clueSource === source) clueSource = null; };
}
