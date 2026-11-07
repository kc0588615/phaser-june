---
mission: globe-spin-resume
project: critter-connect
branch: agent/globe-spin-resume
status: active
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
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

On `69f45fa6` (= `origin/main`), 2026-11-07 UTC. No migrations to run (live DB, schema unchanged by this mission).
- `npm ci`: ok. `npm run typecheck`: exit 0. `npm run lint`: exit 0. `npm test`: 48/48 pass.
- `npm run e2e:fresh`: 1512/1512 checks, 4 rounds (seed 7). Artifact `e2e-artifacts/2026-11-07T07-54-33-821Z-seed7/` (gitignored).
- E2E needs `CHROME_PATH=/srv/critter-ai/agent-state/missions/globe-spin-resume/chrome-nosandbox.sh` (Playwright Chromium + `--no-sandbox`); default `/usr/bin/google-chrome` isn't installed here. Wait for other missions' E2E runs first (one at a time).

## Architecture

Read on `69f45fa6` (= `origin/main`). MapLibre `6.16.0`; line refs `ml:` are `node_modules/maplibre-gl/dist/maplibre-gl-dev.mjs`.

### Findings (ranked)

1. **The spin never comes back (the bug).** `Globe.tsx:90,116-119,200`: `spinning` is a one-way flag. `mousedown`/`touchstart`/`wheel` and a pick set it false, and nothing sets it true again. Setting it back wouldn't help either: `spin` returns without rescheduling (`:124`), so the rAF chain is gone and there's no way to restart it. This breaks fail-fast/KISS: a boolean standing in for a state machine that has no resume path. **Fix:** a small spin controller with three commands, `pause` / `resumeLater` / `begin` (target design).
2. **Speed depends on frame rate and zoom.** `:126` adds `0.04°` per frame: 2.4°/s at 60 Hz, 4.8°/s on 120 Hz phones, slower when frames drop. It's also the same number of degrees at every zoom, but a degree spans `512·2^z/360` px at the view centre (globe radius `worldSize/(2π·cos lat)`, `ml:45034,45251`, so this holds at any latitude). At `fitBounds`' maxZoom 5 (`:202`) the ground slides about 15× faster on screen than at the opening view. **Fix:** step by the rAF timestamp delta, and scale degrees/s by `2^-zoom`.
3. **The spin's own camera call cancels whatever else is moving the camera (a load-bearing constraint).** `setCenter` → `jumpTo` → `this.stop()` (`ml:56175,56369`) → `_stop` → `_stopHandlers()` (`ml:57020`) → `handlers.stop(false)` (`ml:58577,55738`). That resets every gesture handler and cancels any ease or flight. Today this is hidden only because down-events and a pick kill the spin first. Consequences:
   - **(a) Live bug.** Keyboard pan/zoom (canvas is `tabindex=0`, `ml:61482`; `KeyboardHandler` eases with `{ originalEvent: e }`, `ml:54626`) doesn't stop the spin. The next spin frame cancels the key's ease, so arrow keys barely move the globe while it spins.
   - **(b) Constraint for any resume design.** A spin frame between `touchstart` and `dragstart` (pan activates only past `clickTolerance`, `ml:54269`) kills the drag. A frame during momentum or the pick's `fitBounds` flight cancels it. So the pause must happen synchronously on the raw down event, and a resume must never step while `map.isMoving()`.
4. **The spin is mixed into two unrelated effects (SRP).** It's set up inside the map-setup effect (`:99-100,116-130`), and the outline-data effect turns it off (`:200`). **Fix:** move it into its own module, with a one-line hold effect.
5. **The reduced-motion helper is duplicated (DRY / established interfaces).** `Globe.tsx:70` re-implements `reducedMotion` from `src/game/motion.ts:2`, which `AnimalGame.tsx`/`useRowOrder.ts` already import. Its only other use, `duration: reducedMotion() ? 0 : 1600` (`:202`), repeats what MapLibre already does: `fitBounds` → `flyTo` → `easeTo` sets duration 0 for non-essential animations under `prefers-reduced-motion` (`ml:56359,56899,56446`). **Fix:** delete the local helper and the ternary; the spin module imports `@/game/motion`. Behaviour doesn't change.
6. **Correction to the Brief's Notes:** picking *does* move the camera. `:202` `fitBounds` flies there (up to 1.6 s, maxZoom 5). So the hold must start before the flight (it does: same commit), and the spin can resume at zoom ≤ 5, which is why finding 2 matters.
- **Fine as is:**
  - Today's loop doesn't run forever: it ends on the first frame after the flag drops.
  - Unmount cleanup (`:138-143`) is correct for today's state.
  - Today's reduced motion behaviour is correct (no spin).
  - The places/ranges/markers/outline data effects are untouched by this work.

### Target design

**Files:** new `src/components/globe/globeSpin.ts` (about 70 lines) and a small edit to `Globe.tsx`. `GlobeScreen.tsx` doesn't change, since `selected` already reaches `Globe`. Tests go in `scripts/e2e.mjs`. The only import from outside the folder is the existing `reducedMotion` from `@/game/motion` (unchanged).

**`globeSpin.ts`**

```ts
export interface GlobeSpin { hold(held: boolean): void; remove(): void }
export function attachGlobeSpin(map: MapLibreMap): GlobeSpin   // factory, like new Marker(); starts easing in at once
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

Pure query, module-private:

```ts
spinRate(zoom) = zoom > SPIN_MAX_ZOOM ? 0 : SPIN_DEG_PER_S * Math.min(1, 2 ** (SPIN_FULL_ZOOM - zoom))
```

This gives the same on-screen px/s at every zoom from 1 to 5 (finding 2's math).

State is local to the closure: `held`, `timer`, `frame`, `startedAt`, `lastAt`. There are no React refs.

**Commands**

- **`pause()`:** `cancelAnimationFrame(frame)` and `clearTimeout(timer)`. Nothing runs afterwards: no rAF, so no MapLibre repaint.
- **`resumeLater()`:** `pause()`, then `timer = setTimeout(begin, SPIN_IDLE_MS)`.
- **`begin()`:** start the loop only if none of these apply:
  - `held`;
  - `reducedMotion()` (re-read on every resume, live `matchMedia`);
  - `spinRate(zoom) === 0`;
  - `map.isMoving()` (a held drag, momentum, the scroll-zoom finish timer, or the pick's flight; `ml:59862,55749`). In this case call `resumeLater()` and stay still.

  Otherwise `frame = requestAnimationFrame(step)`.
- **`step(now)`:**
  1. On the first frame, set `startedAt = lastAt = now`.
  2. `dt = min(now − lastAt, MAX_STEP_MS)`.
  3. `map.setCenter([lng + spinRate(zoom) · ease(now − startedAt) · dt/1000, lat])`, starting from `map.getCenter()`, so it begins exactly where the player left it. Zoom, bearing and pitch are untouched.
  4. Reschedule.

**Input wiring.** Each listener is registered through a local `on(type, fn)` that records its `map.off`:

| Events | Action | Why |
|---|---|---|
| `mousedown`, `touchstart` | `pause()` only | Synchronous, before any spin frame (finding 3b). No timer while a pointer is down, so a held-still press never gets spun under. |
| `mouseup`, `touchcancel`, `touchend` when `originalEvent.touches.length === 0`, `wheel` | `resumeLater()` | Wheel has no end event. |
| `move`, `moveend` with a truthy `originalEvent` | `resumeLater()` | Player input of every kind, including keyboard and pinch. |

The `move`/`moveend` filter covers drag, pinch, rotate/pitch, wheel zoom and keyboard, which all carry `originalEvent` (`ml:55949-56003`, `54907`, `54626`). It also covers **momentum**: inertia is `easeTo(…, { originalEvent })` (`ml:55996`), so every momentum frame re-arms the timer and the 3 s counts from the fling's `moveend`. The spin's own `setCenter` and the pick's `fitBounds` pass no `originalEvent`, so they never count as input. The window-level `mouseup` isn't forwarded as a map event (`ml:55515,55673`), but a mouse drag released off the canvas still ends with `dragend`/`moveend` carrying `originalEvent`.

**Handle**

- `hold(next)` does nothing if `next === held`. Otherwise it sets `held`, then `pause()` when held, or `resumeLater()` when released. While held, input still re-arms the timer, but `begin()` refuses. Clearing the pick re-arms a fresh 3 s.
- `remove()` runs `pause()` and all the recorded `off`s, so no timer or rAF outlives the map.

**`Globe.tsx` changes**

- Delete `spinning` (`:90`), `frame`, `stopSpin` and its 3 listeners, the `spin` loop (`:116-130`), `spinning.current = false` (`:200`), the local `reducedMotion` (`:70`), and the duration ternary (`:202`).
- Add `spinRef = useRef<GlobeSpin | null>(null)`.
- In `load`: `spinRef.current = attachGlobeSpin(map)`, then `markReady()`.
- In the cleanup: `spinRef.current?.remove()` before `map.remove()`.
- New effect, declared before the outline effect:

  ```ts
  // A picked place holds the globe still so its outline stays in view.
  useEffect(() => { spinRef.current?.hold(selected !== null); }, [selected, ready]);
  ```

- **Test hook.** Right after `new maplibregl.Map`:

  ```ts
  if (process.env.NODE_ENV !== 'production') holder.__globe = map
  ```

  where `holder = window as unknown as { __globe?: MapLibreMap }`, the same cast and gating as `debugBridge.ts:51,198`. Cleanup deletes it only if `holder.__globe === map` (StrictMode/HMR). Next inlines `NODE_ENV`, so the branch is dropped from production bundles. Players never get it; `e2e:fresh` and CI run `next dev`, so tests do.

**Data flow:** player input → MapLibre events → controller (`pause`/`resumeLater`) → after idle, `begin` → rAF `setCenter`. `selected` → hold effect → `hold()`. The controller never touches React state, and `Globe` never touches spin internals.

**Unit test: none.** The speed law is measured on screen in E2E (below). The repo keeps `npm test` for failures a playtest can't see, and the owner prefers E2E. `spinRate` stays pure and module-private for readability only.

### E2E design (`scripts/e2e.mjs`, new block "1b. The globe's spin" after `01-globe.png`, `:253`)

- **Sampler.** Add it to the existing `addScriptToEvaluateOnNewDocument` block, following the `__watchRows`/`__stopWatchingRows` pattern (`:183-192`). `window.__watchGlobe()` records one sample per rAF from `window.__globe`: `{ t, lng, zoom, moving: isMoving(), x: project(anchor).x }`, where `anchor` is the centre when watching began. `window.__stopWatchingGlobe()` returns the samples.
- **How Node classifies samples:**
  - momentum = samples with `moving`;
  - spin = `!moving` with lng changing;
  - steady rate = deg/s and px/s over a 1 s window after the ease.
- **Input.** Real touch input through CDP `Input.dispatchTouchEvent` at the `section[aria-label="Globe"]` centre. Before lifting a deterministic gesture, hold still for 300 ms, so there's no inertia. Only the fling check releases while moving.

Checks, about 35 s in all (names as they go in `report.json`, details carry the measured numbers):

1. **The globe spins on load, easing in:** lng rises, and the mean velocity over the first 250 ms is under 40% of the steady velocity. Record px/s₀ and deg/s₀.
2. **A drag moves the globe while it was spinning:** the centre shifts more than 10° against the finger. This catches finding 3b.
3. **A finger holding the globe stops the spin:** after the drag, the finger stays down 1 s and lng is constant.
4. **After a fling, the globe stays still about 3 s once its momentum ends, then spins again:** momentum samples exist, and the still gap between the momentum's end and the first spin sample is in [2.5, 4.5] s.
5. **The spin returns from where the player left it, at their zoom, easing in:** the first spin sample is within one steady step of the rest lng, zoom is unchanged, and the early velocity is under 40% of steady.
6. **A pinch zooms in and pauses the spin:** two touch points spread from 60 to 240 px; zoom rises by at least 1.5; still while the fingers hold.
7. **Zoomed in, the spin is slower in degrees but about as fast on screen:** deg/s ÷ deg/s₀ within ±30% of `2^-Δz`, and px/s ÷ px/s₀ in [0.7, 1.4]. Ratios, not absolute values, so slow headless frame rates and CPU throttle don't matter.
8. **A picked place holds the globe still:** click a `ul button`, wait for `!isMoving()` after the flight, and lng is constant for `SPIN_IDLE_MS + SPIN_EASE_MS + 1 s`.
9. **Back to all places lets the spin return after the pause:** spin starts in [2.5, 6] s.
10. **With reduced motion the globe never spins:**
    - `Emulation.setEmulatedMedia({ features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })`, then reload `/`.
    - Still for 4.5 s after load, and still for 5 s after a drag and release.
    - Then `setEmulatedMedia({ features: [] })` immediately. Put this check last in the block, so the game run after it is unaffected.

Screenshots `01b-globe-held.png`, `01c-globe-spin-back.png` and `01d-globe-zoomed-spin.png` serve as the DoD's before/after (copy them to the mission folder). Optional: a wheel check (`Input.dispatchMouseEvent` `mouseWheel`) for the desktop path. It uses the same `move`-with-`originalEvent` code path as the pinch, so it isn't required.

### Risks and failure modes

- **The spin cancels a gesture or flight (3b):** prevented by the synchronous pause on down events and the `isMoving()` guard in `begin()`. Checks 2, 4 and 8 fail loud if it comes back.
- **The idle timer never fires because the spin's moves count as input:** prevented by the `originalEvent` filter. Checks 4 and 9.
- **A MapLibre upgrade stops passing `originalEvent` on some gesture or inertia:** checks 4, 6 and 9 catch it.
- **A press held still and released off the canvas without dragging** (inside a 1–3 px click tolerance) never arms the timer. That degrades to "stays still until the next touch", never to fighting the player. Accepted.
- **Reduced motion switched on mid-spin** takes effect at the next pause or reload: `begin()` re-checks it. That's stricter than today, which reads it at mount. Accepted as KISS; no extra `matchMedia` listener.
- **Low headless frame rate:** `MAX_STEP_MS` is 250, and the checks use ratios and wide windows. The sampler records fps in its details.
- **Emulated reduced motion leaking into the game checks:** reset right after check 10, which runs last.
- **`__globe` reaching production:** it's gated like `debugBridge`. Optional Verification: after `npm run build`, `rg -l __globe .next/static` finds nothing.
- **Scope:** everything is in `src/components/globe/` plus `scripts/e2e.mjs`. Nothing else has to change. Optional docs line: add `globeSpin.ts` and the dev-only `window.__globe` to the AGENTS.md Globe bullet.

### Rejected alternatives

- **Copy MapLibre's example (an `easeTo` every second, chained on `moveend`, constant deg/s to z3, then fading to 0 at z5):** the on-screen speed still grows about 4× by z3, and the chained eases need their own guards against restarting themselves on `moveend`.
- **Raw DOM `pointerdown`/`pointerup` on the container:** misses momentum, keyboard and gesture ends. The Brief's decision rules prefer MapLibre events.
- **Counting `*start`/`*end` pairs:** more state, and easy to unbalance. `originalEvent` plus `isMoving()` covers every case without counters.
- **A `data-center`/`data-zoom` attribute written every frame:** per-frame DOM writes in production just for a test. The dev-only map handle costs nothing in production.
- **Reusing `window.__cc`:** it's the Phaser board's scene-bound bridge. Coupling the globe to it mixes concerns.
- **A `useGlobeSpin` hook taking the map:** the map lives in a ref, which can't be read during render, so it would need a second state. Attaching on `load` is simpler.
- **A unit test of `spinRate`:** E2E check 7 measures it as the player sees it.

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-11-07 08:03 UTC · Baseline: typecheck/lint ok, unit 48/48, e2e:fresh 1512/1512.
- 2026-11-07 08:16 UTC · Architecture: architect wrote findings + design (`globeSpin.ts` attachGlobeSpin, originalEvent input detect, 3 s idle, zoom-scaled speed, dev-only `window.__globe`, e2e block 1b). Docs only; no checks needed.

## Summary
