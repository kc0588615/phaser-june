// Dev-only playtest bridge. Exposes `window.__cc` so an agent driving the
// browser (chrome-devtools `evaluate_script`) can read the board and play real
// moves. Moves are synthetic mouse or touch swipes (or taps) on the canvas, so
// they go through the same pointer handlers a player uses. Reads client-visible state
// only; every entry point is a no-op in production builds.
import { EventBus, type EventPayloads } from './EventBus';
import { neighborSwaps, type BoardModel, type Cell, type Grid, type Move, type Toys } from './BoardModel';

export interface DebugBoardSnapshot {
  ready: boolean;
  canMove: boolean;
  /** The page locked the board (between rounds). */
  locked: boolean;
  isResolvingMove: boolean;
  isDragging: boolean;
  boardSeed: number | null;
  movesUsed: number;
  hasAnyValidMove: boolean;
  gemSize: number;
  boardOffset: { x: number; y: number };
  /** Column-major gem colors, grid[x][y]. */
  grid: Grid;
  /** Column-major toys ('row', 'column', 'bomb', 'color' or null), toys[x][y]. */
  toys: Toys;
  /** Column-major texture key each sprite shows (gem_<color>, toy_<special>_<color>, toy_color, 'tile'), view[x][y]. */
  view: (string | null)[][];
  /** Plan 044: the animals pinned on the board, [cell, id], and the ones the release preview outlines. */
  pins: Array<[Cell, number]>;
  preview: number[];
}

/** What the board scene hands the bridge; typed so field renames fail typecheck. */
interface DebugScene {
  debugSnapshot(): DebugBoardSnapshot;
  debugModel(): BoardModel;
  readonly game: Phaser.Game;
  readonly scale: Phaser.Scale.ScaleManager;
  readonly tweens: Phaser.Tweens.TweenManager;
  readonly time: Phaser.Time.Clock;
}

/** Clue Match session summary (JSON-safe), registered by the Clue Match page. */
type ClueSource = () => unknown;
type LoggedEvent = { at: number; name: keyof EventPayloads; payload: unknown };

const enabled = process.env.NODE_ENV !== 'production' && typeof window !== 'undefined';
const MAX_EVENTS = 200;
// Every EventBus event; a Record so a new event missing here fails typecheck.
const LOGGED: Record<keyof EventPayloads, true> = {
  'current-scene-ready': true, 'gems-matched': true, 'clue-board-setup': true, 'clue-board-lock': true, 'clue-board-shuffled': true,
  'clue-board-key': true, 'clue-board-announce': true, 'clue-board-marks': true, 'clue-board-settled': true,
};

let scene: DebugScene | null = null;
let clueSource: ClueSource | null = null;
const log: LoggedEvent[] = [];

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** Keep the log small: the scene becomes its key. */
function summarize(name: keyof EventPayloads, payload: unknown): unknown {
  return name === 'current-scene-ready' ? (payload as Phaser.Scene).sys.settings.key : payload;
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

/** Swaps that would produce a match right now; `largest` is the biggest group. */
/** Every move: swaps that match, and (`trigger`) swaps that only set toys off (a color gem, or two toys together). */
function validMoves(): Array<Move & { matches: number; largest: number; colors: string[]; trigger: boolean }> {
  const model = requireScene().debugModel();
  return neighborSwaps(model.width, model.height).flatMap(move => {
    if (!model.canSwap(move)) return [];
    const groups = model.matchesAfter(move);
    return [{
      ...move, matches: groups.length, largest: groups.length ? Math.max(...groups.map(group => group.cells.length)) : 0,
      colors: [...new Set(groups.map(group => group.gemType))], trigger: groups.length === 0,
    }];
  });
}

/** Settled = no animation or drag in flight, and input is back (or the page locked the board). */
function isSettled(state: DebugBoardSnapshot): boolean {
  return state.ready && !state.isResolvingMove && !state.isDragging && (state.canMove || state.locked);
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

type Phase = 'down' | 'move' | 'up';
type DragInput = 'mouse' | 'touch';

function fireMouse(phase: Phase, point: { x: number; y: number }): void {
  const type = ({ down: 'mousedown', move: 'mousemove', up: 'mouseup' } as const)[phase];
  requireScene().game.canvas.dispatchEvent(new MouseEvent(type, {
    clientX: point.x, clientY: point.y, bubbles: true, cancelable: true, view: window,
    button: 0, buttons: phase === 'up' ? 0 : 1,
  }));
}

/** One finger, as a phone sends it: touches on the canvas, which Phaser turns into pointer events. */
function fireTouch(phase: Phase, point: { x: number; y: number }): void {
  const canvas = requireScene().game.canvas;
  const type = ({ down: 'touchstart', move: 'touchmove', up: 'touchend' } as const)[phase];
  const touch = new Touch({
    identifier: 1, target: canvas, clientX: point.x, clientY: point.y,
    pageX: point.x + window.scrollX, pageY: point.y + window.scrollY, radiusX: 8, radiusY: 8, force: 1,
  });
  const down = phase === 'up' ? [] : [touch];
  canvas.dispatchEvent(new TouchEvent(type, { touches: down, targetTouches: down, changedTouches: [touch], bubbles: true, cancelable: true, view: window }));
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
 * Swipe like a player: press on `move.from`, move in steps to `move.to`, release,
 * with the mouse or (`input: 'touch'`) a finger. Resolves once the board settles.
 * A swap that makes no match slides back and uses no move. Refuses (`blocked`)
 * when UI covers the start cell, since a player couldn't make that swipe either.
 */
async function drag(move: Move, { timeoutMs = 15000, input = 'mouse' }: { timeoutMs?: number; input?: DragInput } = {}) {
  const fire = input === 'touch' ? fireTouch : fireMouse;
  const before = requireScene().debugSnapshot();
  const a = cellCenter(...move.from);
  const b = cellCenter(...move.to);
  const blocked = overlayAt(a);
  if (blocked) return { move, counted: false, movesUsed: before.movesUsed, timedOut: false, blocked, after: before };
  fire('down', a);
  for (let step = 1; step <= 6; step++) {
    await sleep(16);
    fire('move', { x: a.x + (b.x - a.x) * step / 6, y: a.y + (b.y - a.y) * step / 6 });
  }
  fire('up', b);
  await sleep(50);
  const after = await waitIdle(timeoutMs);
  return { move, counted: after.movesUsed > before.movesUsed, movesUsed: after.movesUsed, timedOut: after.timedOut, blocked: null, after };
}

/** Tap one cell like a player (press and release in place). Tap a gem, then a neighbor, to swap them. Resolves once the board settles. */
async function tap([x, y]: Cell, { timeoutMs = 15000, input = 'mouse' }: { timeoutMs?: number; input?: DragInput } = {}) {
  const fire = input === 'touch' ? fireTouch : fireMouse;
  const point = cellCenter(x, y);
  const blocked = overlayAt(point);
  if (blocked) return { blocked, timedOut: false, after: requireScene().debugSnapshot() };
  fire('down', point);
  await sleep(16);
  fire('up', point);
  await sleep(50);
  const after = await waitIdle(timeoutMs);
  return { blocked: null, timedOut: after.timedOut, after };
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
    clue: () => clueSource?.() ?? null,
    validMoves,
    /** Plan 044: the pinned animals a move's first clear would touch (what the release preview uses). */
    touchedBy: (move: Move) => requireScene().debugModel().previewTouched(move),
    cellCenter,
    drag,
    tap,
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

/** Register the Clue Match session getter; returns the unregister function. */
export function setDebugClueSource(source: ClueSource): () => void {
  if (!enabled) return () => {};
  ensureInstalled();
  clueSource = source;
  return () => { if (clueSource === source) clueSource = null; };
}
