// The home globe's slow spin. Any player input pauses it at once; after
// SPIN_IDLE_MS with no input and nothing pressed it eases back in from wherever
// the player left the view. A picked place holds it still. The speed is scaled
// by zoom so the ground moves at about the same on-screen speed at every zoom.
//
// The spin's own setCenter cancels any other camera movement (jumpTo -> stop()),
// so every input pauses it synchronously in the dispatch that starts it, and a
// spin frame never writes while map.isMoving().
import type { Map as MapLibreMap, MapTouchEvent, Subscription } from 'maplibre-gl';
import { reducedMotion } from '@/game/motion';

/** No input for this long, then the spin eases back in. */
const SPIN_IDLE_MS = 3000;
/** Speed goes 0 -> full over this long (smoothstep), so it never snaps. */
const SPIN_EASE_MS = 1500;
/** Longitude speed at or below SPIN_FULL_ZOOM. */
const SPIN_DEG_PER_S = 2.4;
const SPIN_FULL_ZOOM = 1;
/** Above this zoom, no spin and no loop. */
const SPIN_MAX_ZOOM = 5;
/** A stalled or backgrounded frame can't jump far (at most ~2.4°); slow GPUs drawing a few fps still spin at full speed. */
const MAX_STEP_MS = 1000;

/** A degree spans 512·2^z/360 px at the view centre, so 2^-zoom keeps px/s constant. */
const spinRate = (zoom: number) => zoom > SPIN_MAX_ZOOM ? 0 : SPIN_DEG_PER_S * Math.min(1, 2 ** (SPIN_FULL_ZOOM - zoom));
const ease = (t: number) => t >= 1 ? 1 : t * t * (3 - 2 * t);

export interface GlobeSpin {
  /** Tracks input from now on and spins from the map's `load`. Call once, right after `new Map` (so before `load`); throws if called twice. */
  start(): void;
  /** Held (a place is picked): the globe stays still. Released: the idle pause, then the spin. */
  hold(held: boolean): void;
  /** Removes every listener, timer and frame. Final. */
  stop(): void;
}

/** Builds the controller's closure only: no listeners, timers or frames until `start()`. */
export function createGlobeSpin(map: MapLibreMap): GlobeSpin {
  let loaded = false;
  let held = false;
  let touching = false;
  let mouseDown = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let frame = 0;
  let startedAt: number | null = null;
  let lastAt = 0;
  const subs: Subscription[] = [];

  const pressed = () => touching || mouseDown;

  const pause = () => {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
  };

  // Every kind of input calls this: stop now, count the idle pause from now.
  const resumeLater = () => {
    pause();
    if (!pressed()) timer = setTimeout(begin, SPIN_IDLE_MS);
  };

  const step = (now: number) => {
    if (reducedMotion()) return pause();
    if (map.isMoving()) return resumeLater();
    if (startedAt === null) startedAt = lastAt = now;
    const dt = Math.min(now - lastAt, MAX_STEP_MS);
    lastAt = now;
    const { lng, lat } = map.getCenter();
    map.setCenter([lng + spinRate(map.getZoom()) * ease((now - startedAt) / SPIN_EASE_MS) * dt / 1000, lat]);
    frame = requestAnimationFrame(step);
  };

  function begin() {
    pause();
    if (!loaded || held || pressed() || reducedMotion() || spinRate(map.getZoom()) === 0) return;
    startedAt = null;
    frame = requestAnimationFrame(step);
  }

  // The browser's live touch list, filtered like MapLibre's own _getMapTouches:
  // lifting one finger of a pinch leaves the other counted.
  const onTouch = (event: MapTouchEvent) => {
    const container = map.getCanvasContainer();
    touching = Array.from(event.originalEvent.touches).some(touch => container.contains(touch.target as Node));
    resumeLater();
  };
  // MapLibre's mouse pan ends only on a mouseup over the map; released off it, its drag (and isMoving())
  // would last until the next mouse move. So a release elsewhere is forwarded to the map, which ends the pan.
  const onMouseUp = (event: MouseEvent) => {
    if (!mouseDown) return;
    mouseDown = false;
    const container = map.getCanvasContainer();
    if (!container.contains(event.target as Node)) container.dispatchEvent(new MouseEvent('mouseup', event));
    resumeLater();
  };
  // Released after an alt-tab: no mouseup reaches the page. MapLibre ends its own handlers on blur.
  const onBlur = () => {
    if (!mouseDown) return;
    mouseDown = false;
    resumeLater();
  };
  // The spin's own setCenter and the pick's fitBounds carry no originalEvent.
  const onMove = (event: { originalEvent?: unknown }) => { if (event.originalEvent) resumeLater(); };

  return {
    start() {
      if (subs.length > 0) throw new Error('[globeSpin] start() called twice');
      subs.push(
        map.on('touchstart', onTouch),
        map.on('touchend', onTouch),
        map.on('touchcancel', onTouch),
        map.on('mousedown', () => { mouseDown = true; resumeLater(); }),
        map.on('wheel', resumeLater),
        map.on('movestart', onMove),
        map.on('move', onMove),
        map.on('moveend', onMove),
        map.on('load', () => { loaded = true; begin(); }),
      );
      window.addEventListener('mouseup', onMouseUp, true);
      window.addEventListener('blur', onBlur);
      subs.push({ unsubscribe: () => {
        window.removeEventListener('mouseup', onMouseUp, true);
        window.removeEventListener('blur', onBlur);
      } });
    },
    hold(next) {
      if (next === held) return;
      held = next;
      if (held) pause();
      else resumeLater();
    },
    stop() {
      pause();
      subs.forEach(sub => sub.unsubscribe());
      subs.length = 0;
    },
  };
}
