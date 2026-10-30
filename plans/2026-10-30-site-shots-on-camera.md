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
- [x] Architecture: `architect` writes findings and the target design
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

`A=/srv/critter-ai/agent-state/missions/cc-website`, `M=/srv/critter-ai/agent-state/missions/site-shots-on-camera`.

### How the old shots were taken (from `$A/shots/COMMAND.txt`, `raw/*.json`, `next-*.log`)

- `start` mode: `npm run build && npx next start -p 3100`, then `CHROME_PATH=$A/bin/chrome node $A/shots/take.mjs start http://localhost:3100 $A/shots/raw` → `globe` (390×844 @2x), `board-phone` (390×844 @2x), `hero-board` (1440×900 @1x), **`og`** (1200×630 @1x). Production build: no `__cc`.
- `play` mode: `npx next dev -p 3100`, then `take.mjs play …` → seed 1, `continent:africa` (`SHOT_SEED`/`SHOT_PLACE` defaults), 390×844 @2x, light, how-to and slide hint pre-dismissed via localStorage. Drives the real grid (`__pill`/`__slidePill`/`__holdPill`) and the board through `window.__cc` (`clue`, `state`, `speed(4)`, `validMoves`, `drag`, `touchedBy`): `field-guide`, `grid-marked`, `round-end` (round 1: suspects 23,29,50,56,61, mystery 23, found in 25 moves), `witness-note` (round 2: 32,39,46,56,57, mystery 57, note at move 2), `journal` (23,57), `globe-found`.
- `node $A/shots/convert.mjs $A/shots/raw` (cwd = repo root, repo's sharp 0.35.4 via next) → 9 WebP (q78, effort 6) in `src/site/shots/` **and `src/site/og.png`** (palette PNG).
- To run now, only the port changes: `take.mjs` takes the base URL as an argument, `scripts/cdp.mjs` is unchanged since S3 (`git log 5443eeae..origin/main -- scripts/cdp.mjs`: empty), and every selector and key it uses still exists (`data-suspect`, `data-pill`, `data-mystery`, `data-flight-target="notes"`, `aria-label="Evidence"`/`"Menu"`/`"It was the …"`, `#journal-title`, `animal-board-how-to:v3`, `slide-hint:v1`). Probe: Chrome via the wrapper reaches a server bound to `127.0.0.1` at `http://localhost:<port>`.

### Findings (ranked)

1. **`src/site/og.png` is a game shot with the old label and opener, and isn't in `shots.ts`.** Verified by eye (`$A/shots/raw/og.png`: "Camera saw", "The camera caught one of these 5 animals…"). `config.ts:12` ties it to the shots ("a round start, seed 1, Africa; see shots.ts"), the same `start` run takes it and `convert.mjs:17-18` writes it. Leaving it breaks the brief's Why (wording and pictures ship together); it is every page's share picture. Fix: retake it with the rest; record under Decisions; mention in the `shots.ts` header.
2. **The round-end shot will still say "camera saw", lowercase, by design of the scope.** `AnimalSheets.tsx:478` ("The camera saw #1, the") and `:542` ("A red answer doesn't match what the camera saw") weren't renamed by `1118173b`; both show in `round-end` (old contact sheet). Game copy is Out. Fix: the "no Camera saw" check is case-sensitive on the row label; record under Decisions and name both strings in the PR as a possible follow-up for the owner. Don't touch game copy.
3. **The retake recipe is unversioned and its ports now collide.** `shots.ts:5` points at `$A/shots/`, outside git, and `COMMAND.txt` uses 3100 (critwire L5's). Fix: copy the scripts to `$M/shots/` with a new `COMMAND.txt` on :3106 and point the header there (see Rejected alternatives for why not into the repo).
4. **Seeds: rules unchanged, data not versioned.** `git log 0bbbeb0e..origin/main` touches no `src/clueGame`, `src/game`, `db/content`, `useAnimalSession`; `src/components` changes are copy only (+ S1's no-op Wordmark/theme moves, present at S3 too). Boards are seeded from seed, round and suspects (`useAnimalSession.ts:86,184`). But the deal reads the pool from the dev DB copy (`/api/clue-game/pool`), which the owner may refresh. Fix: compare the new run's ids with the old `raw/*.json` (Verification); the play path is deterministic given state, so `grid-marked`/`witness-note` alt text is checked by eye, not assumed.
5. **No OCR here** (no `tesseract`, ImageMagick or PIL; sharp only). Fix: `take.mjs`'s `shot()` (`take.mjs:32-38`) also records `text: document.body.innerText` per shot; a node one-liner checks it. Exact, repeatable, and a positive proof the shots came from the new code (stale-build guard). One added field, no pipeline change.
6. **"Every shot's hash changed" may be false for screens with no changed copy** (`globe`, `journal`, `globe-found`): same code, same data, deterministic WebP → possibly byte-identical. That is the correct result, not a failure. Fix: list per-file old/new hash; record any unchanged one under Decisions with the reason; never alter a shot to force a new hash.
7. Fine as is: `site.mjs:22-27` hashes by content (sha256, 10 hex) and empties `out/site` per build, so new bytes → new URLs with no code change; `render.tsx:53-68` derives credits from `shots.ts` `photos` + `db/content` and fails the build on a bad id or missing file; `out/site` HTML already has no "Camera saw" (Baseline); alt texts don't use the old label ("the camera's answer" still reads true).

### Target design

No repo code changes. Repo diff: `src/site/shots/*.webp` (those whose bytes changed), `src/site/og.png`, the `shots.ts` header, and `shots.ts` alt/`photos` only if the new shots make them wrong.

1. **Fresh base.** `git fetch`; if `origin/main` moved past `368be9e3`, rebase the branch (plan-only commits). The header records `git merge-base HEAD origin/main`.
2. **Scripts in `$M/shots/`:** `take.mjs` = `$A/shots/take.mjs` + the `text` field (finding 5); `convert.mjs` verbatim; `COMMAND.txt` (below). Raw output `$M/shots/raw/`.
3. **Run** from the worktree root, one heavy job at a time, `ss -ltn` first (3106 free today):
   - `npm run build`, `npx next start -p 3106 -H 127.0.0.1` (bg), `CHROME_PATH=$A/bin/chrome node $M/shots/take.mjs start http://localhost:3106 $M/shots/raw`, stop the server.
   - `npx next dev -p 3106 -H 127.0.0.1` (bg), `… take.mjs play http://localhost:3106 $M/shots/raw`, stop it. A `round … ended`/`no witness note` throw: rerun once (timing); if it persists, see 5.
   - `git show origin/main:src/site/shots/<f>.webp > $M/shots/old/<f>.webp` (and `og.png`) before converting, then `node $M/shots/convert.mjs $M/shots/raw`.
   - `git status`: only `src/site/shots/*`, `src/site/og.png` (+ the plan) changed; `next dev`'s AGENTS.md block is already committed.
4. **`shots.ts` header:** date 2026-10-30, the commit from 1, "(and src/site/og.png)" with the production-build shots, "Retake: take.mjs and convert.mjs in the site-shots-on-camera mission's artifacts (shots/, COMMAND.txt), then check every shot by eye."
5. **Decision rule** (seed gives a different board): keep seed 1, `continent:africa` (closest match: same seed/place, so `shots.ts` stays truthful); update `ROUND_1`, each shot's `photos` and alt text to the new run; credits follow via `render.tsx`. Record under Decisions.
6. **Verification** (artifacts in `$M/`, each with `COMMAND.txt`):
   - **Same boards:** node one-liner, new `raw/{start,play}.json` vs `$A/shots/raw/` — per shot `ids`, per round `suspects`, `mysteryId`, `outcome`, `movesUsed`, `notes` → `$M/shots/compare.txt`. Equal, or a Decision per 5.
   - **Wording (DOM):** every shot's `text` lacks `Camera saw` (case-sensitive); board shots (`board-phone`, `hero-board`, `og`, `field-guide`, `grid-marked`, `witness-note`, `round-end`) contain `On camera`; the three round-start shots contain `Which of these 5 was caught on camera?` → `compare.txt`.
   - **Eye:** open every raw PNG full size, old and new: label, opener, same photos (credits), alt text true (esp. `grid-marked`, `witness-note`, `round-end`, `journal`), light mode, no dev badge.
   - **Contact sheet:** `$M/shots/contact.mjs` (artifact-only, repo's sharp via `createRequire`, like `convert.mjs`): old row over new row, the 9 shots then og, scaled to one height → `$M/shots/contact.png`.
   - **Sizes and hashes:** each new WebP's size equals its `shots.ts` width/height, og 1200×630; per-file old/new sha256[0:10] and KB → `compare.txt`. After `npm run site:build`: every `/site/*.{webp,png}` referenced in `out/site/**/*.html` is a new-hash name, no old hash is referenced, and `grep -r "Camera saw" out/site` is empty.
   - `npm run typecheck`, `npm run lint`, `npm run site:build`, then `python3 -m http.server 3105 -b 127.0.0.1 -d out/site` and `E2E_SITE_URL=http://localhost:3105 CHROME_PATH=$A/bin/chrome npm run e2e:site` (≥ 444/444); copy the run to `$M/e2e-site/`; eye-check `/` and `/teachers/` shots.
   - Game `npm run e2e`: not run (no game code changes; Baseline).

### Rejected alternatives

- **Copy the scripts into the repo:** `take.mjs` repeats `e2e.mjs`'s injected pill helpers, how-to keys and badge hiding (`e2e.mjs:75-101,117-125`); in the repo that's duplication (DRY) unless `e2e.mjs` is refactored, which is out of scope and its full run can't pass on this VPS (524/574). Brief: keep it small.
- **Run `$A/shots/take.mjs` in place, untouched:** no text record, so the wording check is eye-only; and the header would point at a COMMAND with the wrong port.
- **Install tesseract for OCR:** a root change for a fuzzier check than the DOM text.
- **All shots from the dev server:** changes how the round-start shots were made; the brief says same as before.
- **Seed search for the old animals if the DB changed:** pool order shifts make it guesswork; same seed with updated ids is exact and truthful.
- **Re-encode to force new hashes on unchanged shots:** fakes a change.

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
- 2026-10-30 05:20 UTC: Architecture (architect). No repo code changes; scripts copied to mission dir, retake on :3106, adds og.png to scope, DOM-text check replaces OCR (no tesseract). Plan-only; no checks needed.

## Summary
