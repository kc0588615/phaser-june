---
mission: globe-spin-resume
project: critter-connect
branch: agent/globe-spin-resume
status: done
started: 2026-11-07 07:37 UTC
---

# Mission: The globe keeps spinning after you touch it (Critter Connect bug fix)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

On the home page's globe (`src/components/globe/Globe.tsx`, shown by `GlobeScreen.tsx` at `/`), the slow spin comes back after the player is done with it, instead of stopping for good. Done looks like this, on desktop (mouse and wheel) and on a phone (touch and pinch):

- **While the player is touching it** (dragging, pinching, wheel-zooming, a fling's momentum still moving), the globe doesn't spin by itself.
- **After about 3 s with no input**, the spin eases back in smoothly (no jump or snap) from wherever the player left the view, and at the zoom they left.
- **The spin is gentler the closer they're zoomed in:** about the same on-screen speed at every zoom, as in MapLibre's globe spin example, not today's fixed `0.04°` of longitude per frame, which races past countries when zoomed in. Set a sensible zoom above which it doesn't spin at all, if one is needed to keep it calm.
- **While a place is picked** (`selected` is set and its outline shows), the globe holds still so the highlight stays in view. Once the pick is cleared, the idle pause and the spin resume as above.
- **Reduced motion:** with `prefers-reduced-motion: reduce` it never spins, as now.
- Nothing else about the globe changes: picking places, the found animals' range tints and markers, attribution and performance (no extra render loop while it's still; the spin's loop stops while paused).

### Why

Today any touch ends the spin until the page reloads: `stopSpin` sets `spinning.current = false` on `mousedown`, `touchstart` and `wheel` (`Globe.tsx`, about lines 116–119), and nothing sets it back. The spin is the home page's sign of life, and the owner wants it back once the player lets go, without fighting the player while they look around.

### Scope

In:
- `src/components/globe/Globe.tsx` (and `GlobeScreen.tsx` only if the selection state needs passing differently).
- E2E or unit tests for the behaviour.

Out:
- The globe's style, layers, data, the place list and the range API.
- Anything outside `src/components/globe/` and its tests, except a shared helper if it's really needed.
- No content, database or rules-version changes.

### Definition of done

- The Goal's behaviours each have a check:
  - E2E checks in the project's own CDP suite (`scripts/e2e.mjs`, `scripts/cdp.mjs`; it plays at 390×844 mobile touch) for: spin stops on drag, resumes after the idle pause, holds while a place is picked, never spins with reduced motion (CDP `Emulation.setEmulatedMedia` with `prefers-reduced-motion: reduce`);
  - the zoom-scaled speed as a unit test of the speed function, if it's pulled out pure, or measured in E2E.
  - A test hook may read the map's centre (for example a `data-` attribute updated while spinning, or the map on `window` only in test builds); don't ship a debug global to players.
- `npm run typecheck`, `npm run lint`, `npm test` and `npm run e2e:fresh` pass on the final commit.
- A short screen recording or before/after screenshots in `/srv/critter-ai/agent-state/missions/globe-spin-resume/`: drag, let go, spin returns; zoomed-in spin is slow.
- The plan's Summary says what changed, the idle delay and speed values chosen, and the tests added.
- **Release:** the mission merges its PR, deploys, and checks the live home page (`https://play.critterconnect.org/` loads, and `version.txt` shows the merge commit). No production content build is needed.

### Decision rules

- Prefer MapLibre's own events (`dragstart`/`dragend`, `zoomstart`/`zoomend`, `movestart`/`moveend`, `rotatestart`/`pitchstart`) over raw DOM events, so momentum and pinch count as input. Make sure the globe's own `setCenter` from the spin doesn't count as player input, or the idle timer never fires.
- The agent picks the exact idle delay (around 3 s) and speeds, by feel on desktop and a phone-sized viewport, and records them.
- Keep it small: one PR. If a fix needs more than the globe files, stop and say why in the plan.

### Notes

- **Work from the newest game** (owner, 2026-11-07). `git fetch origin --prune` first and check the branch is on the latest `origin/main`; re-fetch and rebase before the PR.
- Another mission, `moves-and-signs-design`, runs at the same time. It's docs only (`docs/research/`, `plans/`), so there's no file overlap. Ports: use `npm run e2e:fresh` (it picks a free port), and run any dev server of your own on a free port, not the default 8080, which the other mission may use.
- The spin today: on `load`, a `requestAnimationFrame` loop adds `0.04` to the centre's longitude each frame while `spinning.current` is true (`Globe.tsx`). Picking a place doesn't move the camera; it only sets `selected`, which fills the `selected` source.
- Critter Connect's pre-push hook runs typecheck and lint (since PR #46), and hasn't been through a mission yet, so a push may fail on lint. Fix the lint, don't skip the hook.
- Checked by the control room on `origin/main` at `69f45fa6`.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

## Baseline

On `69f45fa6` (= `origin/main`), 2026-11-07 UTC. No migrations to run (live DB, schema unchanged by this mission).
- `npm ci`: ok. `npm run typecheck`: exit 0. `npm run lint`: exit 0. `npm test`: 48/48 pass.
- `npm run e2e:fresh`: 1512/1512 checks, 4 rounds (seed 7). Artifact `e2e-artifacts/2026-11-07T07-54-33-821Z-seed7/` (gitignored).
- E2E needs `CHROME_PATH=/srv/critter-ai/agent-state/missions/globe-spin-resume/chrome-nosandbox.sh` (Playwright Chromium + `--no-sandbox`); default `/usr/bin/google-chrome` isn't installed here. Wait for other missions' E2E runs first (one at a time).

## Architecture

Read on `69f45fa6` (= `origin/main`; still current at revision). MapLibre `6.16.0`; line refs `ml:` are `node_modules/maplibre-gl/dist/maplibre-gl-dev.mjs`. Revised once after both reviews (see Revision notes).

### Findings (ranked)

1. **The spin never comes back (the bug).** `Globe.tsx:90,116-119,200`: `spinning` is a one-way flag. `mousedown`/`touchstart`/`wheel` and a pick set it false, and nothing sets it true again. Setting it back wouldn't help either: `spin` returns without rescheduling (`:124`), so the rAF chain is gone and there's no way to restart it. This breaks fail-fast/KISS: a boolean standing in for a state machine that has no resume path. **Fix:** a small spin controller. Creating it has no side effects, then `start` / `hold` / `stop` drive it, with internal `pause` / `resumeLater` / `begin` (target design).
2. **Speed depends on frame rate and zoom.** `:126` adds `0.04°` per frame: 2.4°/s at 60 Hz, 4.8°/s on 120 Hz phones, slower when frames drop. It's also the same number of degrees at every zoom, but a degree spans `512·2^z/360` px at the view centre (globe radius `worldSize/(2π·cos lat)`, `ml:45034,45251`, so this holds at any latitude). At `fitBounds`' maxZoom 5 (`:202`) the ground slides about 15× faster on screen than at the opening view. **Fix:** step by the rAF timestamp delta, and scale degrees/s by `2^-zoom`.
3. **The spin's own camera call cancels whatever else is moving the camera (a load-bearing constraint).** `setCenter` → `jumpTo` → `this.stop()` (`ml:56175,56369`) → `_stop` → `_stopHandlers()` (`ml:57020`) → `handlers.stop(false)` (`ml:58577,55738`). That resets every gesture handler and cancels any ease or flight. Today this is hidden only because down-events and a pick kill the spin first. Consequences:
   - **(a) Live bug.** Keyboard pan/zoom (canvas is `tabindex=0`, `ml:61482`; `KeyboardHandler` eases with `{ originalEvent: e }`, `ml:54626`) doesn't stop the spin. The next spin frame cancels the key's ease, so arrow keys barely move the globe while it spins.
   - **(b) Constraint for any resume design.** A spin frame between `touchstart` and `dragstart` (pan activates only past `clickTolerance`, `ml:54269`) kills the drag. A frame during momentum or the pick's `fitBounds` flight cancels it. So every input must pause the spin synchronously, in the dispatch that starts it (down events, wheel, a key's `movestart`). A spin frame must never write while `map.isMoving()`, and no idle countdown may run while a finger or button is still down (`isMoving()` is false under a finger held still).
4. **The spin is mixed into two unrelated effects (SRP).** It's set up inside the map-setup effect (`:99-100,116-130`), and the outline-data effect turns it off (`:200`). **Fix:** move it into its own module, with a one-line hold effect.
5. **The reduced-motion helper is duplicated (DRY / established interfaces).** `Globe.tsx:70` re-implements `reducedMotion` from `src/game/motion.ts:2`, which `AnimalGame.tsx`/`useRowOrder.ts` already import. Its only other use, `duration: reducedMotion() ? 0 : 1600` (`:202`), repeats what MapLibre already does: `fitBounds` → `flyTo` → `easeTo` sets duration 0 for non-essential animations under `prefers-reduced-motion` (`ml:56359,56899,56446`). **Fix:** delete the local helper and the ternary; the spin module imports `@/game/motion`. Behaviour doesn't change.
6. **Correction to the Brief's Notes:** picking *does* move the camera. `:202` `fitBounds` flies there (up to 1.6 s, maxZoom 5). So the hold must start before the flight (it does: same commit), and the spin can resume at zoom ≤ 5, which is why finding 2 matters.
- **Fine as is:**
  - Today's loop doesn't run forever: it ends on the first frame after the flag drops.
  - Unmount cleanup (`:138-143`) is correct for today's state.
  - Today's reduced motion behaviour is correct (no spin).
  - The places/ranges/markers/outline data effects are untouched by this work.

### Target design

**Files:** new `src/components/globe/globeSpin.ts` (about 90 lines) and a small edit to `Globe.tsx`. `GlobeScreen.tsx` doesn't change, since `selected` already reaches `Globe`. Tests go in `scripts/e2e.mjs`. The only import from outside the folder is the existing `reducedMotion` from `@/game/motion` (unchanged).

**`globeSpin.ts` interface.** Creating it is a query with no side effects; `start`, `hold` and `stop` are commands (CQS).

```ts
export interface GlobeSpin {
  /** Tracks input from now on and spins from the map's `load`. Call once, right after `new Map` (so before `load`); throws if called twice. */
  start(): void;
  /** Held (a place is picked): the globe stays still. Released: the idle pause, then the spin. */
  hold(held: boolean): void;
  /** Removes every listener, timer and frame. Final. */
  stop(): void;
}
/** Builds the controller's closure only: no listeners, timers or frames until `start()`. */
export function createGlobeSpin(map: MapLibreMap): GlobeSpin
```

Module constants (starting values; the implementer tunes them by feel and records the final ones in the Summary):

| Constant | Value | Meaning |
|---|---|---|
| `SPIN_IDLE_MS` | 3000 | No input for this long, then the spin eases back in |
| `SPIN_EASE_MS` | 1500 | Speed goes 0 → full with smoothstep `t²(3−2t)`, so velocity starts at 0 (no snap) |
| `SPIN_DEG_PER_S` | 2.4 | Today's 0.04°/frame at 60 Hz |
| `SPIN_FULL_ZOOM` | 1 | At or below this zoom the spin runs at `SPIN_DEG_PER_S` (never faster than about today's opening view) |
| `SPIN_MAX_ZOOM` | 5 | Above this, no spin and no loop; same cut as MapLibre's example, and `fitBounds`' maxZoom |
| `MAX_STEP_MS` | 250 | A stalled or backgrounded frame can't jump |

Queries (module-private, no side effects):

- `spinRate(zoom) = zoom > SPIN_MAX_ZOOM ? 0 : SPIN_DEG_PER_S * Math.min(1, 2 ** (SPIN_FULL_ZOOM - zoom))`: the same on-screen px/s at every zoom from 1 to 5 (finding 2's math).
- `ease(t) = t >= 1 ? 1 : t * t * (3 - 2 * t)`.
- `pressed() = touching || mouseDown`.

State lives in the closure (no React refs):

| Name | Meaning |
|---|---|
| `loaded` | Set by the map's `load`. Nothing spins before it. |
| `held` | A place is picked. |
| `touching` | A finger that started on the globe is still down. |
| `mouseDown` | A mouse button pressed on the globe is still down. |
| `timer`, `frame` | The idle countdown and the spin's rAF. |
| `startedAt`, `lastAt` | The current spin's first and latest frame times. |
| `subs` | Every `Subscription` `start()` made. |

**Commands**

- **`pause()`:** `cancelAnimationFrame(frame)`, `clearTimeout(timer)`. Nothing runs afterwards: no rAF, so no MapLibre repaint.
- **`resumeLater()`:** `pause()`, then, unless `pressed()`, `timer = setTimeout(begin, SPIN_IDLE_MS)`. This is the one command every kind of input calls.
- **`begin()`:** `pause()` first, so a second call can't start a second loop. It then stays still if any of these apply: `!loaded`, `held`, `pressed()`, `reducedMotion()`, `spinRate(map.getZoom()) === 0`. Otherwise it clears `startedAt`/`lastAt` and sets `frame = requestAnimationFrame(step)`.
- **`step(now)`:**
  1. If `reducedMotion()`: `pause()` and return. It's re-read every frame through the shared helper, so switching it on mid-spin stops the globe on the next frame.
  2. If `map.isMoving()`: `resumeLater()` and return. The spin never writes while another movement owns the camera. Its own `setCenter` → `jumpTo` sets neither the camera's `_moving` nor any handler state (`ml:56368-56400`), so it never blocks itself.
  3. On the first frame, `startedAt = lastAt = now`. Then `dt = min(now − lastAt, MAX_STEP_MS)` and `lastAt = now`.
  4. `map.setCenter([lng + spinRate(zoom) · ease((now − startedAt) / SPIN_EASE_MS) · dt/1000, lat])`, from `map.getCenter()`, so it starts exactly where the player left it. Zoom, bearing and pitch are untouched.
  5. `frame = requestAnimationFrame(step)`.
- **`hold(next)`:** does nothing if `next === held`. Otherwise it sets `held`, then calls `pause()` when held or `resumeLater()` when released. While held, input still re-arms the timer, but `begin()` refuses. Clearing the pick re-arms a fresh 3 s.
- **`start()`:** throws if `subs` isn't empty. It registers the wiring below. Each `map.on(…)` returns a MapLibre `Subscription` (`unsubscribe()`), which goes into `subs`. The window listener goes in as `{ unsubscribe: () => window.removeEventListener('mouseup', onMouseUp, true) }`.
- **`stop()`:** `pause()`, unsubscribe everything, empty `subs`. No timer, rAF or listener outlives the map.

**Input wiring** (registered by `start()`)

| Source | Action | Why |
|---|---|---|
| Map `touchstart`, `touchend`, `touchcancel` | `touching` = whether any of `originalEvent.touches` has its `target` inside `map.getCanvasContainer()` (the same test as MapLibre's own `_getMapTouches`, `ml:55765`). Then `resumeLater()`. | This is the browser's live touch list, so lifting one finger of a pinch leaves `touching` true and nothing arms. `touchend`/`touchcancel` fire on a touch's start target even when it lifts off the canvas, so no release is missed and no touch ids are kept. |
| Map `mousedown` | `mouseDown = true`, then `resumeLater()`. | |
| `window` `mouseup`, capture phase | If `mouseDown`: `mouseDown = false`, then `resumeLater()`. | Catches a release anywhere, off the canvas included. MapLibre routes its document `mouseup` to handlers as `mouseupWindow` and fires no map event for it (`ml:55519-55523,55618-55625`; `MapEventHandler` has no `mouseupWindow`, `ml:53530`). Capture phase, so no `stopPropagation` can hide it. A release that never arrives (alt-tab mid-press) clears at the next `mouseup` anywhere on the page. |
| Map `wheel` | `resumeLater()` | Wheel has no end event, and scroll zoom's movement starts only on a later render frame. |
| Map `movestart`, `move`, `moveend` with a truthy `originalEvent` | `resumeLater()` | Player movement of every kind: drag, pinch, rotate/pitch, wheel zoom, keyboard, double-click/tap zoom, momentum. |
| Map `load` | `loaded = true`, then `begin()` | The first spin. |

**Why the spin can't cancel a gesture or an animation** (finding 3b). There are two guards:

1. **Every input pauses synchronously, in the dispatch that starts it.**
   - The map's `touchstart`, `mousedown` and `wheel` come from `MapEventHandler`, the first handler (`ml:55681`), inside MapLibre's DOM listener (`ml:55519-55560`).
   - A key press, double-click or double-tap runs its `cameraAnimation` at the end of that same `handleEvent` (`ml:55561-55566`). Its `easeTo` → `_prepareEase` sets `_moving` and fires `movestart` with `{ originalEvent }` synchronously (`ml:54615-54626,56499-56505`).

   So a spin frame already queued for the coming frame is cancelled before it can run, whatever the rAF registration order.
2. **`step`'s `isMoving()` check covers anything else that moves the camera:** the pick's flight if it ever runs unheld, a key repeat, or a future programmatic ease. `Map.isMoving()` is the camera's `_moving` or the handlers' events in progress or scroll zoom (`ml:59862,55755`).

**Momentum and idle timing.** Inertia is `easeTo(…, { originalEvent })` (`ml:55996`), so its `movestart`/`move`/`moveend` re-arm the timer, and the 3 s count from the fling's `moveend`. Every handler-driven `move`/`moveend` carries the input event, scroll-zoom render frames included (`ml:55949-56003`). The spin's own `setCenter` and the pick's `fitBounds` pass no `originalEvent`, so they never count as input. The one gesture without it is shift-drag box zoom (`ml:53787`). Its mouse release arms the timer, and `step`'s `isMoving()` guard waits out its ease.

**MapLibre events vs DOM.** Everything is MapLibre's own events, as the Brief's decision rules ask, except the one release MapLibre doesn't expose: a mouse let go off the canvas.

**`Globe.tsx` changes**

- **Delete:**
  - `spinning` (`:90`);
  - `frame` and `spinning.current = !reducedMotion()` (`:99-100`);
  - `stopSpin` and its 3 listeners, and the `spin` loop (`:116-130`);
  - `cancelAnimationFrame(frame)` (`:140`);
  - `spinning.current = false` (`:200`);
  - the local `reducedMotion` (`:70`);
  - the duration ternary (`:202`).
- **Add** `spinRef = useRef<GlobeSpin | null>(null)`.
- **Right after `mapRef.current = map`,** before the other `map.on` calls:

  ```ts
  if (process.env.NODE_ENV !== 'production') (window as unknown as { __globe?: MapLibreMap }).__globe = map;
  const spin = createGlobeSpin(map);
  spinRef.current = spin;
  spin.start(); // input counts from now, so a finger put down while the map loads keeps it still
  ```

- **The `load` handler** just calls `markReady()`. The spin starts itself on `load`.
- **In the cleanup, before `map.remove()`:**
  - `spinRef.current?.stop(); spinRef.current = null;`;
  - in dev only, delete `__globe` if it is this map (StrictMode/HMR).
- **New effect,** declared before the outline effect (belt and braces; `step`'s `isMoving()` guard covers the flight too):

  ```ts
  // A picked place holds the globe still so its outline stays in view.
  useEffect(() => { spinRef.current?.hold(selected !== null); }, [selected, ready]);
  ```

- **Test hook.** `__globe` uses the same cast and gating as `debugBridge.ts:51,198`. Next inlines `NODE_ENV`, so the branch and the string are dropped from production bundles. Players never get it; `e2e:fresh` and CI run `next dev`, so tests do.

**Data flow:**
- Player input → MapLibre events (plus one window `mouseup`) → `resumeLater()` → after the idle pause, `begin` → rAF `setCenter`.
- `load` → `begin`.
- `selected` → hold effect → `hold()`.

The controller never touches React state, and `Globe` never touches spin internals.

**Unit test: none.** The speed law is measured on screen in E2E (below). The repo keeps `npm test` for failures a playtest can't see, and the owner prefers E2E. `spinRate` stays pure and module-private for readability only.

### E2E design (`scripts/e2e.mjs`, new block "1b. The globe's spin" after `01-globe.png`, `:253`)

**Helpers.** Add them to the existing `addScriptToEvaluateOnNewDocument` block, following the `__watchRows`/`__stopWatchingRows` pattern (`:183-192`):

- `window.__watchGlobe()` records one sample per rAF from `window.__globe`: `{ t, lng, zoom, moving: isMoving() }`. `window.__stopWatchingGlobe()` returns the samples and the fps.
- `window.__globeRate(ms = 500)` returns `{ degPerS, pxPerS, zoom }` over one short window. It re-anchors at the window's start: the anchor is the centre then, and px/s comes from `project(anchor).x` at the start and the end. This keeps drift toward the limb to a few px.
- In Node:
  - unwrap lng across ±180 before comparing;
  - **still** means |Δlng| < 1e-6°;
  - **momentum** means samples with `moving`;
  - **spin** means `!moving` with lng changing.
- Waits for "the spin returns" poll, and end at the first spin sample.

**Input:**
- Touch is real input through CDP `Input.dispatchTouchEvent` at the `section[aria-label="Globe"]` centre.
- Mouse is `Input.dispatchMouseEvent`; keys are `Input.dispatchKeyEvent` (`windowsVirtualKeyCode` set, since MapLibre reads `keyCode`).
- Before lifting a deterministic gesture, hold still for 300 ms, so there's no inertia. Only the fling releases while moving.

**Checks,** in run order, about 60 s in all (names as they go in `report.json`; details carry the measured numbers):

1. **The globe spins on its own:** within 10 s of the list showing, lng rises over 1 s. Records deg/s only. The ease-in isn't asserted here, because the test can't time the first spin frame (Fable MF2).
2. **A drag moves the globe while it was spinning:** the finger moves 150 px right and holds. The centre's lng falls by more than 10° (the spin would raise it). This catches finding 3b.
3. **A finger holding the globe keeps it still:** after the drag, the finger stays down for `SPIN_IDLE_MS` + 1 s and the globe is still. Then lift.
4. **After a fling, the globe rests about 3 s once its momentum ends, then spins again:** momentum samples exist, and the still gap from the momentum's end to the first spin sample is in [2.5, 7] s.
5. **The spin comes back where the player left it, at their zoom, easing in:**
   - the first spin sample is within 0.05° of the rest lng;
   - zoom is unchanged;
   - the mean deg/s over its first 250 ms is under 40% of the steady deg/s₀.

   deg/s₀ and px/s₀ come from `__globeRate(500)`, started `SPIN_EASE_MS` + 200 ms after the first spin sample. They're the baseline for check 9.
6. **Arrow keys move the globe while it spins, then the spin returns:**
   - focus the map canvas (`tabindex=0`), then press ArrowLeft (`keyDown`/`keyUp`) while it spins;
   - within 1 s, lng falls by more than 5°: about 30° expected at z≈1.1, and the spin would raise it;
   - then the spin returns in [2.5, 7] s after the key's ease ends.

   This proves finding 3a's fix.
7. **A pinch zooms in and holds the globe still:** two touch points spread from 60 to 240 px, then hold 300 ms + 1 s. Zoom rises by at least 1.5, and the globe is still while both fingers stay down.
8. **Lifting one finger of a pinch keeps the globe still while the other stays down:**
   - release finger 2 only, by sending `touchMove` with finger 1 alone (CDP releases points missing from the list; `touchEnd` must list none);
   - finger 1 stays still for `SPIN_IDLE_MS` + 1 s, and the globe is still;
   - lift finger 1: the spin returns in [2.5, 7] s.
9. **Zoomed in, the spin is slower in degrees but about as fast on screen:** `__globeRate(500)` after the ease.
   - deg/s ÷ deg/s₀ is within ±30% of `2^−(z₁ − max(z₀, SPIN_FULL_ZOOM))`;
   - px/s ÷ px/s₀ is in [0.7, 1.4].

   Ratios, not absolute values, so slow headless frame rates and CPU throttle don't matter.
10. **A picked place holds the globe still:** click a `ul button`, wait for `!isMoving()` after the flight, and the globe is still for `SPIN_IDLE_MS + SPIN_EASE_MS + 1 s`.
11. **Back to all places lets the spin return after the pause:** the spin starts in [2.5, 7] s.
12. **A mouse drag released off the globe lets the spin return:**
    - press at the globe's centre, move in steps to a non-interactive spot just outside the globe (the header's wordmark, at x 40, 20 px above the section), hold 300 ms, release there;
    - the spin returns in [2.5, 7] s.

    Without the window-level release the mouse would stay "down" and the spin would never return.
13. **Turning reduced motion on stops the spin at once:** while it spins, `Emulation.setEmulatedMedia({ features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })`. Starting 300 ms later, the globe is still for 1 s.
14. **With reduced motion the globe never spins:**
    - reload `/` with the emulation still on;
    - still for 4.5 s once `__globe` exists and the list shows;
    - still for 5 s after a drag and release;
    - then `setEmulatedMedia({ features: [] })` at once.

    Checks 13–14 run last in the block, so the game run after them is unaffected.

**Screenshots.** `01b-globe-held.png` (check 3), `01c-globe-spin-back.png` (check 5) and `01d-globe-zoomed-spin.png` (check 9) serve as the DoD's before/after (copy them to the mission folder).

**Optional.** A wheel check (`mouseWheel`). It runs the same `wheel` + `move`-with-`originalEvent` path as the pinch, so it isn't required.

**Not tested in E2E: input while the map loads.** There's no deterministic way to hold `load`: it waits for the land GeoJSON, which MapLibre fetches in its worker, out of the page's reliable CDP interception. The design covers it: input is tracked from `start()` right after `new Map`, nothing spins before `load`, and `begin` refuses while pressed.

### Risks and failure modes

- **The spin cancels a gesture, key press or flight (3a, 3b):** prevented by the synchronous pause on every input event and `step`'s `isMoving()` guard. Checks 2, 4, 6, 7 and 10 fail loud if it comes back.
- **The idle timer arms under a finger (a held press, a half-lifted pinch):** `resumeLater` and `begin` both refuse while `pressed()`. Checks 3 and 8.
- **A release the controller misses:**
  - mouse let go off the canvas: the window `mouseup` in capture phase catches it (check 12);
  - a mouse release lost to alt-tab: clears at the next `mouseup` anywhere;
  - touch can't be missed: `touches` is the browser's live list, and `touchend`/`touchcancel` always reach the start target.
- **Input before `load`:** tracked from right after `new Map`, with no spin before `load`. A finger put down during the dynamic import, before the map exists, isn't seen by MapLibre either, so there's no gesture to cancel. The globe may spin under that finger until the next touch. Accepted.
- **The idle timer never fires because the spin's moves count as input:** prevented by the `originalEvent` filter. Checks 4 and 11.
- **A MapLibre upgrade stops passing `originalEvent` on some gesture or inertia:** checks 4, 6, 7 and 11 catch it.
- **Reduced motion switched on mid-spin:** stops on the next frame (check 13). It's one `matchMedia` call per spinning frame through the shared helper, which is negligible. Switching it off resumes after the next input or a reload. Both are stricter than today, which reads it once at mount; record this in the Summary (Fable SC4).
- **A place picked before the map even exists:** `hold(true)` arrives with `ready`, so a frame or two of spin may run after `load`, before the flight starts in the same effect pass. Harmless.
- **Low headless frame rate:** `MAX_STEP_MS` is 250, and the checks use ratios and wide windows. The sampler records fps.
- **Emulated reduced motion leaking into the game checks:** reset right after check 14, which runs last.
- **`__globe` reaching production:** gated like `debugBridge`. **Required Verification step** (Fable SC5): after `npm run build`, `rg -l __globe .next/static` finds nothing.
- **Scope:** everything is in `src/components/globe/` plus `scripts/e2e.mjs`. Optional docs line: add `globeSpin.ts` and the dev-only `window.__globe` to the AGENTS.md Globe bullet.

### Rejected alternatives

- **Copy MapLibre's example** (an `easeTo` every second, chained on `moveend`, constant deg/s to z3, then fading to 0 at z5): the on-screen speed still grows about 4× by z3, and the chained eases need their own guards against restarting themselves on `moveend`.
- **`attachGlobeSpin(map)`, which registers, starts and returns in one call** (the first design): breaks the owner's CQS rule (Astra MF3).
- **Starting the controller on `load`:** misses a finger put down while the map loads (Astra MF1).
- **A pointer-id set** (`pointerdown` on the container, window `pointerup`/`pointercancel`): one mechanism for all pointer types, but it keeps ids, needs a self-heal for a lost id (otherwise the original bug comes back), and bypasses MapLibre's events. The live `touches` list plus one mouse flag need neither.
- **Counting `*start`/`*end` pairs:** more state, and easy to unbalance. `pressed()` plus `originalEvent` plus `isMoving()` covers every case without counters.
- **A `change` listener on the reduced-motion query** (Astra SC2 as worded): needs a second copy of the query outside `@/game/motion`, or a new export there, outside scope. The per-frame re-read through the existing helper stops the spin just as fast.
- **`map.once('remove', stop)`** (Fable SC3): `Globe` alone owns the map's lifecycle and stops the spin before `map.remove()`. A second cleanup path is duplication.
- **E2E for input during loading** (part of Astra SC1): not deterministic (see the E2E design). The design covers it.
- **A `data-center`/`data-zoom` attribute written every frame:** per-frame DOM writes in production just for a test. The dev-only map handle costs nothing in production.
- **Reusing `window.__cc`:** it's the Phaser board's scene-bound bridge. Coupling the globe to it mixes concerns.
- **A `useGlobeSpin` hook taking the map:** the map lives in a ref, which can't be read during render, so it would need a second state. Creating and starting it right after `new Map` is simpler.
- **A unit test of `spinRate`:** E2E check 9 measures it as the player sees it.

## Architecture review (Fable)

Checked against `Globe.tsx`, `GlobeScreen.tsx`, `motion.ts`, `debugBridge.ts`, `scripts/e2e.mjs`, `e2e-fresh.mjs`, `ci.yml` and `maplibre-gl-dev.mjs` 6.16.0. The cited `ml:` lines hold: `setCenter`→`jumpTo`→`stop()`→`_stopHandlers`→`handlers.stop(false)` (resets every handler, clears inertia); `_fireEvents` passes `originalEvent` on `move`/`moveend` from the handler's event data (`mergeHandlerResult` uses `handlerResult.originalEvent || inputEvent`, so scroll-zoom render frames still carry `_lastWheelEvent`); inertia is `easeTo(…, { originalEvent: originalEndEvent })`; `Map.isMoving()` = camera `_moving` || handlers' `_eventsInProgress`/`scrollZoom.isZooming()`, so a held-still drag, momentum and the pick's flight all read true; `fitBounds`→`flyTo` falls back to `easeTo` with duration 0 under `browser.prefersReducedMotion` (a live `matchMedia` query), so finding 5's deletion is behaviour-neutral; `MapEventHandler` fires `touchstart/touchend/touchcancel/mousedown/mouseup/wheel` synchronously inside `handleEvent`, before any handler runs. Finding 6 (picking flies; the Brief's note is wrong) is correct. The design is small, in-scope, and the `__globe` gating matches `debugBridge.ts`; `e2e:fresh` and CI run `next dev`, so the hook exists where the tests run and nowhere else.

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. **Keyboard fix (finding 3a) rests on rAF registration order; add `movestart` to the `originalEvent` filter.** `KeyboardHandler` returns a `cameraAnimation`; `handleEvent` runs it → `easeTo` → `_prepareEase` fires only `movestart` synchronously (ml:56499-56505); the first `move` comes on MapLibre's next render frame (ml:56489). The spin loop is still live at that moment (no down event, no `wheel`). If the spin's `step` runs before MapLibre's render callback in that frame, `setCenter`→`stop()` cancels the ease and the key does nothing, which is the bug the finding says it fixes. Today it works only because `setCenter` inside `step` calls `triggerRepaint` before `step` reschedules itself, so MapLibre's callback is registered first. Fix: listen on `movestart`, `move`, `moveend` with truthy `originalEvent` → `resumeLater()`. One token in the table; no new state.
2. **E2E check 1 ("spins on load, easing in") is flaky as designed.** `goto` resolves at `readyState === 'complete'`; the map is created after the dynamic import and `load` fires later still, so `__watchGlobe()` called from Node can't be timed to the first spin frame. If the loop has been running for a while when sampling starts, "mean velocity over the first 250 ms < 40% of steady" fails. Fix (KISS): check 1 asserts only that lng rises and records deg/s₀ and px/s₀; the ease-in is asserted once, in check 5, where the test controls t₀ (release → still → first spin sample). If the architect wants the on-load ease measured, the sampler must arm itself from the `addScriptToEvaluateOnNewDocument` script by polling for `window.__globe` and recording from `once('load')`, not from a Node call.

MISSED:
- Nothing that changes the design. Minor: `mouseup` and `dragend`/`moveend` both call `resumeLater()` after a mouse drag (double re-arm, harmless); `hold(true)` + the outline effect's `fitBounds` are in the same commit and `begin()`'s `isMoving()` guard covers the flight anyway, so the ordering note ("declared before the outline effect") is belt-and-braces, not load-bearing.

SHOULD-CONSIDER:
1. Check 4's window [2.5, 4.5] s: the lower edge is tight if a `begin()` lands while `isMoving()` is still true (scroll-zoom's finish timer, a late inertia frame) and re-arms another 3 s; [2.5, 7] loses nothing and removes a CI retry.
2. Check 7's `project(anchor).x` sampling: after a 1 s window at z≈1 the anchor has moved ~7 px, and projecting a point that drifts toward the globe's limb is nonlinear. Re-anchor at the start of each measurement window (the design implies this; say it) and keep the window short.
3. `remove()` could also be wired to `map.once('remove', …)` so the controller can't outlive a map removed by anyone other than `Globe`'s cleanup. Optional; today only `Globe` removes it.
4. Record in the Summary that reduced motion is now re-read at every resume (stricter than today's mount-time read); it's a behaviour change in the player's favour, worth one line.
5. The Optional Verification `rg -l __globe .next/static` after `npm run build` is cheap and proves the DoD's "don't ship a debug global"; make it a required step.

## Architecture review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. **Contact state is missing.** `isMoving()` does not mean a finger remains down. A symmetric pinch can end when one finger lifts, allowing spin to resume beneath the remaining finger. The acknowledged off-canvas release also leaves spin stopped indefinitely. Track contacts independently, including input before map load, and handle release/cancellation outside the canvas.
2. **Camera ownership transfers too late.** Checking `isMoving()` only when starting the loop cannot protect a keyboard animation that starts afterward. Waiting for `move` allows an already scheduled spin frame to cancel that animation. Pause synchronously on user `movestart`; prevent spin writes while another movement owns the camera.
3. **The proposed factory violates explicit CQS rules.** `attachGlobeSpin()` registers listeners, starts animation, and returns a controller. AGENTS.md exempts framework APIs, not custom factories. Separate controller creation from its activation command.

SHOULD-CONSIDER:

1. Add E2E coverage for partial pinch release, off-canvas mouse release, keyboard input, and interaction during loading.
2. Observe reduced-motion preference changes while spinning; checking only on resume can leave animation running indefinitely after the preference changes.

## Revision notes

MUST-FIX, all resolved in `## Architecture`:
- **Fable 1 (keyboard relies on rAF order):** `movestart` (with `originalEvent`) joins `move`/`moveend` → `resumeLater()`, which pauses synchronously inside the keydown. `step` also refuses to write while `map.isMoving()` (the key's `easeTo` sets `_moving` synchronously). New E2E check 6 (ArrowLeft while spinning).
- **Fable 2 (check 1 flaky):** check 1 asserts only that lng rises. The ease-in is asserted in check 5, where the test controls t₀, and check 5 also takes the deg/s₀ and px/s₀ baseline.
- **Astra 1 (no contact state):**
  - `touching` is recomputed from the live `originalEvent.touches` (map `touchstart`/`touchend`/`touchcancel`, filtered as in MapLibre's `_getMapTouches`), so a half-lifted pinch stays "down";
  - `mouseDown` is set by the map's `mousedown` and cleared by a capture-phase `window` `mouseup`, so an off-canvas release counts;
  - `resumeLater`/`begin` refuse while `pressed()`;
  - `start()` runs right after `new Map`, so input during load is tracked, and `loaded` blocks any spin before `load`;
  - new E2E checks 8 (partial pinch) and 12 (off-canvas mouse release).
- **Astra 2 (camera ownership too late):** synchronous pause on user `movestart`, plus `step`'s per-frame `isMoving()` guard, so the spin never writes while another movement owns the camera. MapLibre event order verified (`ml:55519-55566,56499-56505`).
- **Astra 3 (CQS):** `createGlobeSpin(map)` only builds the closure. `start()` (registers and starts on `load`), `hold()` and `stop()` are commands. Subscriptions use MapLibre 6's `on()` → `Subscription`.

SHOULD-CONSIDER:
- **Accepted:**
  - Fable SC1: idle windows are [2.5, 7] s throughout.
  - Fable SC2: `__globeRate(500)` re-anchors per window.
  - Fable SC4: Summary notes that reduced motion is now re-read live.
  - Fable SC5: `rg -l __globe .next/static` after `npm run build` is a required Verification step.
  - Astra SC1, in part: keyboard (check 6), partial pinch (check 8) and off-canvas mouse (check 12).
  - Astra SC2, in spirit: reduced motion is re-read every spinning frame through `@/game/motion`, so the spin stops on the next frame (check 13).
- **Rejected:**
  - Fable SC3 (`once('remove')`): `Globe` solely owns the map lifecycle, and a second cleanup path is duplication.
  - Astra SC1's load-time E2E: `load` can't be held deterministically (the worker fetches the land GeoJSON). The design covers it.
  - Astra SC2's `change` listener: it would duplicate the media query outside `@/game/motion`. The per-frame re-read is as fast and DRY.

## Steps

Each step: one session, commit + push (pre-push hook runs typecheck + lint; fix, never skip). Every E2E run per Verification (prereqs, `CHROME_PATH`, one heavy job at a time, artifact copy rules). No unit tests (Architecture: "Unit test: none").

- [x] S1 · **Spin controller + Globe wiring + dev-only hook** (riskiest: touches the live globe, picking, markers).
  - New `src/components/globe/globeSpin.ts` exactly per Architecture → Target design: `createGlobeSpin(map)` (no side effects) → `start` / `hold` / `stop`; constants table at starting values; private `spinRate`, `ease`, `pressed`; `pause` / `resumeLater` / `begin` / `step` (per-frame `reducedMotion()` from `@/game/motion`, `isMoving()` guard, `MAX_STEP_MS`, timestamp-delta step from `getCenter()`); input wiring table (map `touchstart`/`touchend`/`touchcancel` via live `touches` inside `getCanvasContainer()`, `mousedown`, capture-phase `window` `mouseup`, `wheel`, `movestart`/`move`/`moveend` with truthy `originalEvent`, `load`); every subscription in `subs`; `start()` throws if called twice.
  - `src/components/globe/Globe.tsx`: the Delete / Add list only (drop `spinning`, `frame`, `stopSpin` + 3 listeners, `spin`, its `cancelAnimationFrame`, `spinning.current = false`, local `reducedMotion`, the `duration` ternary; add `spinRef`, create + `start()` right after `mapRef.current = map`, `load` just `markReady()`, `stop()` before `map.remove()`, hold effect before the outline effect, `window.__globe` set/delete gated `process.env.NODE_ENV !== 'production'` like `debugBridge.ts:51`). `GlobeScreen.tsx` unchanged.
  - Check: `npm run typecheck`, `npm run lint`, `npm test` (48/48); `npm run build`, then `rg -l __globe .next/static` prints nothing and control `rg -l maplibregl-canvas .next/static` lists ≥1 file; `npm run e2e:fresh` passes all 1512 existing checks (globe list, `07-globe-found` markers, game) with `consoleErrors` and `failedRequests` empty. Copy run to `e2e-s1/`.
- [x] S2 · **E2E block "1b. The globe's spin", part 1: helpers + checks 1–6.** `scripts/e2e.mjs` only.
  - Page helpers in the `addScriptToEvaluateOnNewDocument` block, pattern `__watchRows` (`:183-192`): `__watchGlobe`, `__stopWatchingGlobe` (samples + fps), `__globeRate(ms = 500)` (re-anchors per window; returns `degPerS`, `pxPerS`, `zoom`).
  - Block top: mirror constants `IDLE_MS = 3000`, `EASE_MS = 1500`, `FULL_ZOOM = 1` with comment "mirror of src/components/globe/globeSpin.ts; change both" (e2e.mjs is plain Node, can't import the TS module). Idle windows written as `[IDLE_MS − 500, IDLE_MS + 4000]` ms (= [2.5, 7] s), so tuning moves them.
  - Node helpers: lng unwrap across ±180; still (|Δlng| < 1e-6°) / momentum (`moving`) / spin (`!moving`, lng changing) classification; "wait until the spin returns" (ends at first spin sample); CDP input via `Input.dispatchTouchEvent` at the `section[aria-label="Globe"]` centre, `Input.dispatchMouseEvent`, `Input.dispatchKeyEvent` with `windowsVirtualKeyCode`; hold still 300 ms before any deterministic lift (only the fling releases moving).
  - Checks 1–6 after `01-globe.png` (`:253`), names and pass rules per E2E design; measured numbers in `detail`. Check 5 stores deg/s₀, px/s₀ for check 9. Screenshots `01b-globe-held.png` (check 3), `01c-globe-spin-back.png` (check 5).
  - Check: typecheck, lint, `npm run e2e:fresh` all pass (1512 + 6); report.json details show deg/s₀, px/s₀, idle gaps, key Δlng. Copy run to `e2e-s2/`, delete `e2e-s1/`.
- [x] S3 · **E2E part 2: checks 7–12.** `scripts/e2e.mjs` only, per E2E design.
  - 7 pinch 60 → 240 px (zoom +≥1.5, still while held); 8 partial pinch release (`touchMove` listing finger 1 only; still for `IDLE_MS` + 1 s; lift → spin in idle window); 9 zoom-scaled speed (`__globeRate(500)` after the ease; deg/s ratio within ±30% of `2^−(z₁ − max(z₀, FULL_ZOOM))`, px/s ratio in [0.7, 1.4]); 10 pick a `ul button`, wait `!isMoving()`, still for `IDLE_MS + EASE_MS` + 1 s; 11 `button[aria-label="Back to all places"]` → spin in idle window; 12 mouse drag released on the header wordmark (x 40, 20 px above the section) → spin in idle window.
  - Screenshot `01d-globe-zoomed-spin.png` (check 9).
  - Check: typecheck, lint, `npm run e2e:fresh` all pass (1512 + 12); check 9 detail shows both ratios and z₀/z₁. Copy run to `e2e-s3/`, delete `e2e-s2/`.
- [x] S4 · **Reduced-motion checks, tuning, DoD captures, docs line.**
  - `scripts/e2e.mjs`: checks 13–14 last in block 1b, per E2E design (`Emulation.setEmulatedMedia` reduce mid-spin → still 1 s from +300 ms; reload `/` → still 4.5 s, drag + release → still 5 s; then `setEmulatedMedia({ features: [] })` at once, before block 2).
  - Tune by measurement: phone numbers from report.json (390×844 touch); desktop from a throwaway script kept in the mission folder (not committed) that imports `scripts/cdp.mjs`, sets 1280×800 non-mobile, mouse-drags, releases, saves frames every 250 ms for ~6 s, then repeats zoomed in at z≈4 and logs `__globe` deg/s and px/s. Its dev server: `NEXT_DIST_DIR=.next-e2e node_modules/.bin/next dev -p <free port>` (check `ss -ltn`; not 8080 or 3100–3102; never while an `e2e:fresh` runs; stop it after). Change constants in `globeSpin.ts` and the e2e mirror together, only if the numbers show a snap, a race or a crawl. Record final `SPIN_IDLE_MS`, `SPIN_EASE_MS`, `SPIN_DEG_PER_S`, `SPIN_FULL_ZOOM`, `SPIN_MAX_ZOOM` and why under **Decisions**.
  - DoD captures to `/srv/critter-ai/agent-state/missions/globe-spin-resume/spin-shots/`: `01b`, `01c`, `01d` from the run (held → spin back → zoomed-in slow spin) plus the desktop frame series (`desktop-*.png`).
  - `AGENTS.md` Globe bullet: one line adding `globeSpin.ts` (spin pauses on input, resumes after idle) and dev-only `window.__globe` (Architecture's optional docs line).
  - Check: typecheck, lint, `npm run e2e:fresh` all pass (1512 + 14; game checks after block 1b unaffected). Copy run to `e2e-s4/`, delete `e2e-s3/`.
- [x] S5 · **Final verification:** `git fetch origin --prune`, note in Log whether `origin/main` moved (the Release unit rebases). Run the full Verification below, in order, on the final commit. Copy the E2E run to `/srv/critter-ai/agent-state/missions/globe-spin-resume/e2e-final/`, then delete the last `e2e-s*`. Write **Summary**: what changed (controller, Globe edits, keyboard-pan fix from finding 3a, picking flies per finding 6), final idle delay / speeds / zooms, the 14 E2E checks added, no unit test (speed measured in check 9), reduced motion now re-read every spinning frame (stricter than today's mount-time read; Fable SC4), artifact paths.
- [x] S6 · **Astra MUST-FIX 1: mouse released off the globe, then held still.** MapLibre's mouse pan ends only on a `mouseup` over the map (`mouse.ts:35`), so `_eventsInProgress.drag` keeps `isMoving()` true until the next mousemove, and the spin never returns. In `globeSpin.ts` `onMouseUp`, when the release target is outside `map.getCanvasContainer()`, forward it: dispatch a `mouseup` (same `button`, `clientX/Y`) on the canvas container so MapLibre's `dragEnd` runs and fires its `moveend`. Also (Astra SC, same path) clear `mouseDown` on window `blur` (released elsewhere after an alt-tab). `scripts/e2e.mjs` check 12: drop the 10 px `mouseMoved` after the release (Astra asked to test without it); the pass rule is unchanged. Check: typecheck, lint, `npm run e2e:fresh` 1526/1526. Copy the run to `e2e-s6/`.
- [x] S7 · **Astra MUST-FIX 2: `load` must not cancel a pending idle pause.** `load` → `begin()` → `pause()` clears the timer, so input released just before load spins at once. Set `timer = undefined` in `pause()`; on `load`, `loaded = true` then `begin()` only when no timer is pending. E2E: a new check in block 1b (after `goto /` and once `window.__globe` exists while `!__globe.loaded()`): tap the globe (touch start/end), and the first spin comes ≥ `IDLE_MS − 500` after the tap. If the map is already loaded at the tap, the detail says so and the check fails (it must not pass vacuously); then make it reliable (for example, delay the style request through CDP `Fetch`). Update the Verification count to 1527. Check: typecheck, lint, `npm run e2e:fresh` all pass. Copy the run to `e2e-s7/`, delete `e2e-s6/`.
- [x] S8 · **Re-run the final Verification** on the final commit (as S5: fetch, all 6 commands), replace `e2e-final/` with the new run, delete `e2e-s7/`, and update the **Summary** (the Astra fixes, the new check count, and the remaining SHOULD-CONSIDER: the fling check passes with `momentumMs: 0`, so inertia is only covered via the key-ease path; see the S2 decision). Then set `status: done`.

## Verification

E2E-first. Failure modes are those in Architecture → Risks and failure modes; each maps to an E2E check there, and no part is tested in isolation, so there's no separate Failure modes section.

**Prereqs**
- Heavy jobs (build, E2E) one at a time. Before each, `pgrep -af 'e2e-fresh|scripts/e2e.mjs|next build'` shows no other run; wait if it does.
- Every E2E run: `CHROME_PATH=/srv/critter-ai/agent-state/missions/globe-spin-resume/chrome-nosandbox.sh` (no `/usr/bin/google-chrome` here). `e2e:fresh` picks its own free port and `.next-e2e`, so it doesn't touch 8080.

**Commands, in order, on the final commit**

| # | Command | Passing looks like |
|---|---|---|
| 1 | `npm run typecheck` | exit 0 |
| 2 | `npm run lint` | exit 0 (eslint `--max-warnings 0` + theme check) |
| 3 | `npm test` | exit 0, 48/48 (no unit tests added) |
| 4 | `CHROME_PATH=/srv/critter-ai/agent-state/missions/globe-spin-resume/chrome-nosandbox.sh npm run e2e:fresh` | exit 0; last line `1527/1527 checks passed. Artifact: e2e-artifacts/<run>/` (baseline 1512 + 15 in block 1b; any other count must be explained by the report); `report.json` has every check `ok`, `consoleErrors` and `failedRequests` empty |
| 5 | `npm run build && rg -l __globe .next/static; echo rg=$?` | build exit 0; rg prints no files and `rg=1` |
| 6 | `rg -l maplibregl-canvas .next/static` | ≥1 file (control: step 5 searched the real globe chunk) |

**E2E scenarios (block 1b, 390×844 mobile touch) → Goal**

| Goal behaviour | Checks |
|---|---|
| Spins on its own | 1 |
| No spin while touching (drag, held finger, pinch, half-lifted pinch) | 2, 3, 7, 8 |
| Momentum counts as input; idle pause then smooth ease-in, from where and at the zoom left | 4, 5 |
| Spin never cancels player input (finding 3a/3b): drag, keys | 2, 6 |
| Gentler when zoomed in (same on-screen speed) | 9 |
| Holds while a place is picked; resumes after clearing | 10, 11 |
| Mouse released off the globe still resumes | 12 |
| Reduced motion: stops at once, never spins | 13, 14 |
| Input just before the map's load keeps its idle pause | 15 |
| Nothing else changes: picking, list, range tints, markers, game | the existing 1512 checks (`01-globe`, `07-globe-found`, rounds) |

The report's `detail` for checks 1, 4, 5, 6, 9 carries the measured deg/s, px/s, ratios, idle gaps and fps.

**Artifact**
- `e2e-artifacts/<run>/report.json` + PNGs (gitignored; newest 10 kept). Key shots: `01-globe.png`, `01b-globe-held.png`, `01c-globe-spin-back.png`, `01d-globe-zoomed-spin.png`.
- Reproduce: `CHROME_PATH=/srv/critter-ai/agent-state/missions/globe-spin-resume/chrome-nosandbox.sh npm run e2e:fresh` (seed 7 default; same seed, same run).
- Final copy: `/srv/critter-ai/agent-state/missions/globe-spin-resume/e2e-final/`. DoD captures: `.../spin-shots/` (S4).
- Disk cap: at most two artifact folders in the mission folder. Intermediate runs go to `e2e-s<n>/`, deleting the previous `e2e-s*`; S5 deletes the last `e2e-s*` once `e2e-final/` is written, leaving `e2e-final/` and `spin-shots/`. Never delete those two.

## Code review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. `src/components/globe/globeSpin.ts:64,88–91`: Drag outside the globe, release, then leave the mouse stationary: MapLibre retains its active drag state, so `isMoving()` prevents spin indefinitely. `scripts/e2e.mjs:473` masks this by injecting another mouse movement. Handle stationary releases and test without that extra movement.

2. `src/components/globe/globeSpin.ts:108`: Loading unconditionally calls `begin()`, cancelling any pending idle delay. Input released shortly before map load therefore resumes spinning immediately. Reproduced with the exact controller in memory. Preserve the remaining three-second pause.

SHOULD-CONSIDER:

- `scripts/e2e.mjs:373–379`: Require observable inertia in the fling test. The final artifact passes with `momentumMs: 0`, leaving momentum handling unverified.
- `src/components/globe/globeSpin.ts:110`: Recover pressed state after window blur. Alt-tabbing during a press and releasing elsewhere leaves `mouseDown` latched until another mouseup reaches the page.

## Release

## Decisions

- S1: E2E failures caused by load from another mission's balance bot are rerun once the box is quiet, not treated as regressions (first S1 run: 1505/1512, 7 game row-timing checks on `/explore`, which the globe doesn't touch, while a 400-round bot held ~1 CPU; rerun on a quiet box: 1512/1512).
- S2: headless Chrome here (SwiftShader on ARM) draws the *moving* globe at 3–5 fps (frames ~250–350 ms; no Chrome flag or DPR 1 helps: fixed GPU-process cost, main-thread redraw is ~2–4 ms). Two consequences, both fixed in the test, not the app:
  - Check 4: MapLibre's inertia keeps only moves from the last 160 ms (`BUFFER_CUTOFF`), so a CDP fling there usually gets no momentum. The check asserts the fling moved the globe (>10°) and the rest from the later of lift and momentum end is in the idle window; `momentumMs` is reported, not required. Inertia's `easeTo(…, {originalEvent})` is the same path as the key's ease (check 6).
  - Check 5: jump threshold 0.5° (not 0.05°): the eased first step at a few fps moves up to ~0.15°, and a snap lands somewhere else entirely. Baseline `__globeRate(1500)` (not 500), so it spans several frames.
- S2 → S3/S4: frames above `MAX_STEP_MS` (250) are clipped, so measured headless deg/s is ~60–70% of nominal (1.5 vs 2.24 at z 1.1) and depends on fps. If check 9's ratios wobble from fps differences between zooms, raise `MAX_STEP_MS` (e.g. 1000: a stalled second still moves only ~2.4°) rather than widen the tolerances.
- S2: the CDP mouse helper moves to S3 (its only user is check 12), so S2 ships no unused code.
- S3: `MAX_STEP_MS` 250 → 1000 (as the S2 note foresaw). At 250, headless frames of ~300 ms were clipped harder at z 1.1 than z 3.1, so check 9's deg ratio read 0.38 vs 0.25 wanted. At 1000 it reads 0.2505 (px ratio 1.005), and headless deg/s₀ is 2.22 (nominal 2.24). A stall still moves at most 2.4°; real 60 Hz frames are never clipped.
- S3: MapLibre 6's mouse pan ends on a `mouseup` over the map only (`handler.mouseup = dragEnd`, not `mouseupWindow`); released off the map, its drag stays active (`isMoving()` true) until the next mouse move with the button up (`buttonNoLongerPressed`). The architecture's "routes its document mouseup as mouseupWindow" holds for the event, not the pan. The capture `window` `mouseup` is still load-bearing: without it `mouseDown` stays true and the drag's `moveend` can't arm the timer. Check 12 moves the mouse 10 px (buttons up) after the release, as a player does; the spin returned 3.7 s later. The release spot (x 40, 20 px above the globe) lands on the header's subtitle `<p>`, not the wordmark; still non-interactive, so kept.
- S3: two runs failed only game row-timing checks on `/explore` (6–7 each) while another mission's balance bot or headless Chrome shared the CPU; the globe block passed in both. Rerun on a quiet box per the S1 rule: all pass.
- S3: `e2e.mjs` mirrors `FULL_ZOOM` (S2 had only `IDLE_MS`/`EASE_MS`); check 9 needs it.
- S4: constants kept at their starting values: `SPIN_IDLE_MS` 3000, `SPIN_EASE_MS` 1500, `SPIN_DEG_PER_S` 2.4, `SPIN_FULL_ZOOM` 1, `SPIN_MAX_ZOOM` 5 (`MAX_STEP_MS` 1000 from S3). Measured, no snap, race or crawl: phone (390×844 touch, e2e) 2.24°/s ≈ 6.8 px/s at z 1.1, 0.55°/s ≈ 6.8 px/s at z 3.1, rests 3.1–4.1 s, first spin step 1e-5° from rest; desktop (1280×800 mouse, `tools/desktop.mjs`) 2.21°/s ≈ 6.7 px/s at z 1.1, 0.275°/s ≈ 6.9 px/s at z 4.1, spin back ~3.5 s after release, easing in over the next frames. ~2.6 min a turn at the home zoom reads as calm; a pick holds the spin whatever zoom its `fitBounds` (maxZoom 5) lands on, so the z 5 cap only stops it when a player zooms right in, where even 6.8 px/s would scroll past small detail.
- S4: the desktop capture's frames are ~1–1.5 s apart, not 250 ms (each 1280×800 SwiftShader screenshot takes ~1 s); the series still shows hold → ease-in → steady spin. Its dev server ran on :3150 and was stopped after.

- Astra code review: both MUST-FIX accepted (verified in MapLibre 6.16 source: `ui/handler/mouse.ts:35`, `handler_manager.ts:405`; `globeSpin.ts:108`), so S6 and S7 were added. SC window blur folded into S6 (same latched-press path, one listener). SC fling inertia left for the owner: SwiftShader's 3–5 fps leaves MapLibre's 160 ms inertia buffer empty (S2 decision), so requiring momentum would make the check flaky here.
- S6: the forwarded release is `new MouseEvent('mouseup', event)` on the canvas container (copies button, coords, modifiers; bubbles), sent only when the target is outside it, after `mouseDown = false` so the controller's own capture listener ignores it. Blur only clears `mouseDown` and re-arms the pause: MapLibre's handler manager already stops its handlers on window `blur` (`handler_manager.ts:436`).
- S7: check 15 runs last in block 1b, after reduced motion is cleared, on a fresh `goto /`. CDP `Fetch` holds `world-land.geojson` (fetched by MapLibre's worker; the page's `Fetch` domain catches it) until 500 ms after the tap, so `load` lands ~0.9 s after it. Not mutation-run against the old code: there `load` → `begin()` would spin ~0.9 s after the tap, below the 2.5 s window floor.

## Log

- 2026-11-07 08:03 UTC · Baseline: typecheck/lint ok, unit 48/48, e2e:fresh 1512/1512.
- 2026-11-07 08:16 UTC · Architecture: architect wrote findings + design (`globeSpin.ts` attachGlobeSpin, originalEvent input detect, 3 s idle, zoom-scaled speed, dev-only `window.__globe`, e2e block 1b). Docs only; no checks needed.
- 2026-11-07 08:22 UTC · Fable review: APPROVE_WITH_CHANGES, 2 MUST-FIX (add `movestart` to originalEvent filter; drop on-load ease-in assert from check 1). Docs only.
- 2026-11-07 08:25 UTC · Astra review: APPROVE_WITH_CHANGES, 3 MUST-FIX (track contacts incl. partial pinch/off-canvas release; pause synchronously on user `movestart`, no spin writes while camera owned by other motion; split factory create/activate for CQS). Docs only.
- 2026-11-07 08:39 UTC · Revision: architect resolved all 5 MUST-FIX (contact tracking via live touches + window mouseup, sync pause on user movestart + per-frame isMoving guard, createGlobeSpin/start/hold/stop CQS split, check 1 lng-only); e2e block now 14 checks. Docs only.
- 2026-11-07 08:43 UTC · Steps: planner wrote S1–S5 (controller+Globe wiring, e2e block 1b in 3 parts incl. tuning/DoD shots, final verification) + Verification (target 1526 checks, build `rg __globe` empty). Docs only.
- 2026-11-07 10:03 UTC · S1: `globeSpin.ts` (createGlobeSpin → start/hold/stop) + Globe wiring, dev-only `window.__globe`. typecheck/lint ok, unit 48/48, build ok, `rg __globe .next/static` empty (rg=1), controller chunk present; e2e:fresh 1512/1512, no console errors/failed requests (`e2e-s1/`).
- 2026-11-07 10:40 UTC · S2: e2e block 1b checks 1–6 + page helpers (`__watchGlobe`, `__globeRate`), fps-robust per Decisions. typecheck/lint ok; e2e:fresh 1518/1518, no console errors/failed requests; deg/s₀ 1.53, px/s₀ 4.7, fling rest 3.0 s, key rest 4.3 s (`e2e-s2/`).
- 2026-11-07 12:31 UTC · S3: e2e block 1b checks 7–12 (pinch, half-lifted pinch, zoomed speed, pick hold, back, off-globe mouse release); `MAX_STEP_MS` 250→1000 (Decisions). typecheck/lint ok; e2e:fresh 1524/1524, no console errors/failed requests; zoomed deg ratio 0.248 (want 0.25), px ratio 0.996, rests 3.2–3.8 s (`e2e-s3/`).
- 2026-11-07 12:55 UTC · S4: checks 13–14 (reduced motion stops the spin at once; never spins after reload or drag), constants unchanged after phone + desktop measurement (Decisions), DoD shots in `spin-shots/`, AGENTS.md Globe line. typecheck/lint ok; e2e:fresh 1526/1526, no console errors/failed requests (`e2e-s4/`).
- 2026-11-07 13:10 UTC · S5: final Verification on `e0ed36ca`: typecheck/lint ok, unit 48/48, e2e:fresh 1526/1526 (no console errors/failed requests), build ok, `rg __globe .next/static` rg=1, maplibre chunk present. `origin/main` moved during the session 69f45fa6 → 4418143d (PR #61, docs/plans only, no overlap; Release rebases). Artifact `e2e-final/`, `e2e-s4/` deleted.
- 2026-11-07 13:35 UTC · Astra code review (`--code origin/main`): APPROVE_WITH_CHANGES, 2 MUST-FIX (off-map mouse release held still; load cancels the idle pause), both verified real in MapLibre source; added S6–S8. Docs only.
- 2026-11-07 14:00 UTC · S6: off-globe mouse release forwarded to the map (ends MapLibre's pan), window blur clears the press; check 12 no longer moves the mouse after release. typecheck/lint ok; e2e:fresh 1526/1526, no console errors/failed requests, check 12 rest 3.0 s (`e2e-s6/`).
- 2026-11-07 14:25 UTC · S7: `pause()` clears `timer`; `load` begins only when no idle pause is pending. New check 15 (tap while the land data is held back; load 910 ms after tap, spin rest 3.4 s). typecheck/lint ok; e2e:fresh 1527/1527, no console errors/failed requests (`e2e-s7/`).
- 2026-11-07 13:43 UTC · S8: final Verification on `ba23ffdc`: typecheck/lint ok, unit 48/48, e2e:fresh 1527/1527 (no console errors/failed requests), build ok, `rg __globe .next/static` rg=1, maplibre chunk present. `origin/main` unchanged since S5 (4418143d). `e2e-final/` replaced, `e2e-s7/` deleted.

## Summary

The home globe's slow spin now pauses on any input and comes back by itself; before, the first touch stopped it for good.

- **Controller** `src/components/globe/globeSpin.ts` (new): `createGlobeSpin(map)` (no side effects), then `start` / `hold` / `stop`. Input (touch contacts tracked through live `touches`, so a half-lifted pinch still counts; mouse down plus a capture-phase `window` mouseup, so a release off the globe counts; wheel; any user `movestart`/`move` with `originalEvent`, which covers keys and momentum) pauses it synchronously. After `SPIN_IDLE_MS` 3000 with no contact and `!isMoving()`, it eases in over `SPIN_EASE_MS` 1500 from where the player left the view, at their zoom. Each step uses the rAF timestamp delta (`MAX_STEP_MS` 1000), and the speed is `SPIN_DEG_PER_S` 2.4 × 2^−(zoom − `SPIN_FULL_ZOOM` 1), which is about 6.8 px/s on screen at any zoom. There's no spin above `SPIN_MAX_ZOOM` 5. The loop stops while paused, and a spin frame never writes while the camera is moving.
- **Astra code-review fixes** (S6, S7): a mouse released off the globe is forwarded to the map as a `mouseup`, so MapLibre ends its pan and the spin returns even if the mouse then stays still; window `blur` clears a latched press. The map's `load` no longer cancels a pending idle pause, so input just before load still gets its 3 s.
- **Globe.tsx**: the one-way `spinning` flag, its rAF loop and its 3 listeners are gone, along with the local `reducedMotion` copy and the `fitBounds` duration ternary (MapLibre already skips the animation under reduced motion). The controller is created and started with the map and stopped before `map.remove()`, and a one-line hold effect keeps the globe still while `selected` is set. `window.__globe` exists in dev builds only. `GlobeScreen.tsx` is unchanged.
- **Fixed as a side effect** (finding 3a): arrow keys move the globe while it spins. Before, each spin frame's `setCenter` cancelled the key's ease. Picking still flies there (`fitBounds`, maxZoom 5; finding 6). The hold starts before the flight, and the spin can resume at the zoom the pick left, which the zoom scaling keeps calm.
- **Reduced motion** is now read on every spinning frame (stricter than the old mount-time read; Fable SC4): turning it on stops the spin at once.
- **Tests**: 15 E2E checks in `scripts/e2e.mjs` block "1b. The globe's spin" (390×844 touch): spins on its own; drag while spinning; held finger; fling rest; ease-in from where it was left; keys; pinch; half-lifted pinch; zoomed speed (deg ratio 0.249 vs 0.25 wanted, px ratio ~1.0); pick hold; back resumes; mouse released off the globe; reduced motion on mid-spin; reduced motion after reload; tap before the map's load keeps its idle pause (land data held back via CDP `Fetch`). No unit test: speed is measured in check 9.
- **Verification** (final commit `ba23ffdc`): typecheck, lint, unit 48/48, e2e:fresh 1527/1527 (baseline 1512 + 15), build ok, no `__globe` in `.next/static`.
- **Artifacts**: `/srv/critter-ai/agent-state/missions/globe-spin-resume/e2e-final/` (`report.json` + PNGs; key shots `01b-globe-held.png`, `01c-globe-spin-back.png`, `01d-globe-zoomed-spin.png`). DoD captures, including a desktop frame series: `.../spin-shots/`. Reproduce: `CHROME_PATH=/srv/critter-ai/agent-state/missions/globe-spin-resume/chrome-nosandbox.sh npm run e2e:fresh`.
- **Left for the owner** (Astra SHOULD-CONSIDER): the fling check passes with `momentumMs: 0`, since headless SwiftShader's 3–5 fps leaves MapLibre's 160 ms inertia buffer empty; momentum is covered only through the key-ease path (same `easeTo(…, {originalEvent})`; S2 decision).
- Needs no production content build (code only).
