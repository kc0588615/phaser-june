---
mission: site-shots-on-camera
project: critter-connect
branch: agent/site-shots-on-camera
status: active
started: 2026-10-30 04:55 UTC
---

# Mission: retake the website's screenshots after the "On camera" rename (issue #37)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Saved as /srv/critter-ai/agent-state/missions/briefs/2026-10-30-site-shots-on-camera.md
     Start: mission start critter-connect <this file>   (base: main at 368be9e3 or later)
     Owner, 2026-10-30: a small mission now, alongside critwire L5; the owner deploys after this PR merges. -->

### Goal

Issue #37 (https://github.com/kc0588615/phaser-june/issues/37) is done, as one PR to `main` from `agent/site-shots-on-camera`:

- **Every screenshot in `src/site/shots.ts` is retaken** from fresh `origin/main`, using the same seeds, rounds and photos as before.
  - The scripts are `take.mjs` and `convert.mjs` in the cc-website mission's artifacts (`/srv/critter-ai/agent-state/missions/cc-website/`, `shots/`), as the `shots.ts` header describes.
  - The old shots were taken at `0bbbeb0e`. Since then, commits `1118173b` and `e999e86f` renamed the grid row "Camera saw" to "On camera", and the status-line opener now reads "Which of these 5 was caught on camera? Match gems to find out."
- **`shots.ts`'s header comment** gets the new date and commit.
- **Every shot is checked by eye:**
  - no "Camera saw" text anywhere
  - the alt text still matches what's shown (fix the alt text if not)
  - the photo credits still match the photos shown
- `npm run site:build` and `npm run e2e:site` pass.

### Why

The site's copy already says "caught on camera" (commit `368be9e3`), but its pictures still show the old label. The owner wants the wording and the screenshots to ship together in one deploy.

### Scope

In: `src/site/shots/*.webp`, `src/site/shots.ts`, alt text and credits that the new shots make wrong, and copying or adapting the cc-website artifact scripts as the header says.

Out:
- Site copy (done in `368be9e3`) and game copy.
- Any other site or game change.
- Deploying: the owner deploys from WSL after merging. Critter Connect missions never merge or deploy.

### Definition of done

- `npm run typecheck`, `npm run lint`, `npm run site:build` and `npm run e2e:site` pass on the final commit.
- **A grep check:**
  - in the built site's HTML (`out/site/`), no "Camera saw" anywhere
  - in each shot, an OCR check or a careful look finds no "Camera saw"
  - every shot's file name and hash changed, and the build references the new hashes
- **Artifacts** in `/srv/critter-ai/agent-state/missions/site-shots-on-camera/`: the new shots side by side with the old ones (one contact sheet), plus the e2e:site report.
- **One PR to `main`**, linked to #37 ("Closes #37"). Its description gives the shot list (before and after) and says the owner deploys with `npm run deploy` after merging; that deploy also ships the game wording in `e999e86f` and `1118173b`.

### Decision rules

- Same seeds, rounds, photos and viewport sizes as before; only the game's new wording should differ. If a seed now gives a different board, record it and pick the closest match, with the reason under Decisions.
- Keep it small: no refactor of the screenshot pipeline beyond what's needed to run it from the repo or from the artifacts.

### Notes

- The game's e2e on this VPS shows 524/574 with a known timing failure (Baseline in the cc-website plan). That isn't this mission's concern; `e2e:site` is.
- Playwright Chromium on this ARM VPS needs the `--no-sandbox` wrapper the cc-website mission used (see its plan's Baseline).
- **Ports:** critwire mission L5 runs at the same time and shares the Claude usage limit. Its E2E harness uses ports 3100 and 3101, and `site:serve`'s default is also 3101.
  - **Never use 3100 or 3101 here.** Serve the built site on **3105** (`python3 -m http.server 3105 -b 127.0.0.1 -d out/site`) and run `E2E_SITE_URL=http://localhost:3105 npm run e2e:site`.
  - If the screenshot script starts the game's dev server, give it a port of 3106 or higher.
  - Check with `ss -ltn` before binding.
  - Don't change the repo's default ports.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

2026-10-30, worktree at `40a95b02` (origin/main `368be9e3`), Node 24.21.
- Install: `npm ci` clean (install-script gate skipped postinstalls, as in cc-website). Migrate: n/a (no migration history; DB is shared dev copy; this mission touches no data).
- `npm run typecheck`: pass. `npm run lint`: exit 0. `npm test`: 47/47. `npm run site:build`: pass.
- `npm run e2e:site` (built site on :3105, `CHROME_PATH=/srv/critter-ai/agent-state/missions/cc-website/bin/chrome`): **444/444**, 20 screenshots.
- `grep -r "Camera saw" out/site`: no hits in HTML already (copy fixed in `368be9e3`); only the shot images still show it.
- Game `npm run e2e` not run: mission changes only `src/site/shots*`, which the game never loads; known VPS baseline is 524/574 (cc-website plan).
- Artifacts: `/srv/critter-ai/agent-state/missions/site-shots-on-camera/baseline/` (logs, `e2e-site/` report.json + screenshots). Reproduce: `npm run site:build && python3 -m http.server 3105 -b 127.0.0.1 -d out/site`, then `E2E_SITE_URL=http://localhost:3105 CHROME_PATH=/srv/critter-ai/agent-state/missions/cc-website/bin/chrome npm run e2e:site`.

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

- 2026-10-30 05:00 UTC: Baseline. typecheck/lint pass, unit 47/47, site:build ok, e2e:site 444/444 on :3105. Handoff H3 (done) closed; its owner leftovers (Vercel, Clerk/Google branding, WSL pull) moved to H4. No effect on scope.

## Summary
