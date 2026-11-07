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
- [ ] Architecture: `architect` writes findings and the target design
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

## Summary
