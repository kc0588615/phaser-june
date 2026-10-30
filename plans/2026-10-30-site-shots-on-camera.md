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
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none): none needed
- [x] Steps: `planner` writes Steps and Verification

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

VERDICT: APPROVE

Checked: `shots.ts`, `config.ts:12`, `site.mjs:22-27,80-87`, `render.tsx:53-68`, `AnimalSheets.tsx:478,542`, `AnimalGame.tsx:390`, `EvidenceGrid.tsx:224,240`, `$A/shots/{take,convert}.mjs`, `COMMAND.txt`, `raw/start.json`, `cdp.mjs` (`--remote-debugging-port=0`, no fixed port), `git diff 0bbbeb0e origin/main` on game/content paths (copy + Wordmark/theme-color refactors only; no rules, board or content changes). All seven findings are accurate; og.png (finding 1) is a real omission from the brief and the fix is in scope by the brief's Why. The design adds no repo code, keeps seeds/ports/sizes, and every check is repeatable from `compare.txt` + the raw JSON.

MUST-FIX: none

MISSED: none

SHOULD-CONSIDER:
1. Run `play` (dev server) before `build`+`start`, as the old run did (raw timestamps: play 12:19-12:20, start 12:21-12:22). Avoids `next dev` and a fresh production `.next` in the same dir back to back; same result, one fewer thing to reason about.
2. Finding 2: the brief's eye check says "no Camera saw" without a case rule; the case-sensitive reading is right (the row label is the thing renamed), but say so in the PR body next to the two lowercase strings so the owner isn't surprised by the round-end shot.
3. Finding 6: `globe`/`globe-found` are MapLibre renders with a 3 s sleep, so byte-identity is unlikely anyway; don't spend time on it, just record what happened.
4. In `compare.txt`, also note each shot's `theme` field from the JSON (`light`), since light mode is in the eye check and the old JSON already records it.

## Architecture review (Astra)

VERDICT: APPROVE

MUST-FIX: none

SHOULD-CONSIDER:
1. Preserve the pool response with capture artifacts; seeds alone cannot reproduce screenshots after dev database changes.
2. Reconcile hash verification with unchanged-image allowance: require URLs matching current asset bytes; reject old hashes only for changed assets.
3. Explicitly document inclusion of `og.png` and retention of lowercase “camera saw” in the PR’s scope.

## Revision notes

None needed: Fable and Astra both APPROVE, 0 MUST-FIX; architect not re-run. SHOULD-CONSIDER items adopted for the Steps (no design change):
- Fable 1: run `play` (dev server) before `build` + `start`, as the old run did.
- Fable 2, Astra 3: PR body names og.png's inclusion and the two lowercase "camera saw" strings (`AnimalSheets.tsx:478,542`, game copy, out of scope) as a possible follow-up; the "Camera saw" check is case-sensitive.
- Fable 3: globe hashes: just record what happened.
- Fable 4: `compare.txt` also lists each shot's `theme`.
- Astra 1: save `/api/clue-game/pool` responses used by the run (seed 1, `continent:africa`) to `$M/shots/raw/pool-*.json`.
- Astra 2: hash check = every referenced `/site/*.{webp,png}` name matches its current file's sha256[0:10]; no old hash referenced for a changed asset; unchanged assets listed under Decisions.

## Steps

Shared: cwd = worktree root. `A=/srv/critter-ai/agent-state/missions/cc-website`, `M=/srv/critter-ai/agent-state/missions/site-shots-on-camera`, `CHROME_PATH=$A/bin/chrome`. `SHOTS="globe board-phone hero-board field-guide grid-marked witness-note round-end journal globe-found"` (+ `og`). Heavy jobs one at a time. Never 3100/3101: game server **3106**, built site **3105**; `ss -ltn | grep -E ':310[56] '` must be empty before binding (else F1). Wait for a server: `timeout 180 bash -c 'until curl -sf -o /dev/null http://localhost:<port>/; do sleep 2; done'`. Stop one: `fuser -k <port>/tcp`, then `ss -ltn` clear.

- [ ] S1. Fresh base + retake kit in `$M/shots/` (no repo change).
  - `git fetch origin`. If `git log --oneline 368be9e3..origin/main` is non-empty: `git rebase origin/main` (plan-only commits), `npm ci` if `package-lock.json` changed, `git push --force-with-lease`; `git log --stat 368be9e3..origin/main -- src/components src/game src/clueGame src/app src/pages src/lib src/styles db/content scripts/cdp.mjs` empty or copy-only, else Decisions. `B=$(git rev-parse --short=8 $(git merge-base HEAD origin/main))` → Log.
  - `mkdir -p $M/shots/raw $M/shots/old && cp $A/shots/take.mjs $A/shots/convert.mjs $M/shots/`. `take.mjs`: `shot()` also stores `text: await evaluate(() => document.body.innerText)` in `record.shots[name]`; usage comments 3100 → 3106. `convert.mjs` verbatim.
  - Old shipped files: `for f in $SHOTS; do git show $B:src/site/shots/$f.webp > $M/shots/old/$f.webp; done; git show $B:src/site/og.png > $M/shots/old/og.png`.
  - `$M/shots/contact.mjs` (repo sharp via `createRequire`, as `convert.mjs`): `node $M/shots/contact.mjs <oldDir> <out.png>`; top row `<oldDir>/<f>.webp` + `og.png`, bottom row the repo's `src/site/shots/<f>.webp` + `src/site/og.png`; columns `$SHOTS` then og, each scaled to 600 px high.
  - `$M/shots/compare.mjs` (`node $M/shots/compare.mjs <newRawDir>`; prints 4 sections, PASS/FAIL per line, exit 1 on any FAIL; must fail on everything listed in F0):
    1. **boards** vs `$A/shots/raw/{start,play}.json`: per shot `ids`, `theme` (= `light`); per round `suspects`, `mysteryId`, `outcome`, `movesUsed`, `notes`.
    2. **wording** (case-sensitive): no shot's `text` has `Camera saw` (missing/empty `text` = FAIL); `board-phone hero-board og field-guide grid-marked witness-note round-end` have `On camera`; `board-phone hero-board og` have `Which of these 5 was caught on camera?`; lists (not FAIL) shots with lowercase `camera saw`.
    3. **files** (9 WebP + og.png): old/new sha256[0:10], KB, changed/unchanged (unchanged = listed, not FAIL); new pixel size = `shots.ts` width/height (load `shots.ts` via esbuild `transform`, as `scripts/e2e-site.mjs` loads `config.ts`), og 1200×630.
    4. **build**: every `/site/<name>.<hash>.(webp|png)` in `out/site/**/*.html` has hash = sha256[0:10] of current `src/site/shots/<name>` / `src/site/og.png`; no old hash of a changed file referenced or in `out/site/site/`; `Camera saw` in no `out/site` file.
  - `$M/shots/COMMAND.txt`: base `$B`, ports, the S2 and S3 commands in order (play before start), pool files, column order of `contact.png`.
  - Verify: `node --check` each `.mjs`; `diff -u $A/shots/take.mjs $M/shots/take.mjs` = `text` field + comments only; `npm run site:build && node $M/shots/compare.mjs $A/shots/raw`: boards PASS, wording FAIL "no text" (expected: fails loud on the old shots), files all unchanged, build PASS (old copies = shipped bytes); `node $M/shots/contact.mjs $M/shots/old /tmp/contact-smoke.png`, look at it (rows identical), delete it; `git status`: plan only.

- [ ] S2. Retake raw shots on :3106 (play, then start), save pool responses, check boards + wording.
  - Play (dev): `nohup npx next dev -p 3106 -H 127.0.0.1 > $M/shots/next-dev.log 2>&1 &`; wait on :3106; `curl -sf http://localhost:3106/api/clue-game/pool/ -o $M/shots/raw/pool-play.json && curl -sf http://localhost:3106/api/places/ -o $M/shots/raw/places-play.json` (the deal reads both, `useAnimalSession.ts:36,95`); `CHROME_PATH=$A/bin/chrome node $M/shots/take.mjs play http://localhost:3106 $M/shots/raw 2>&1 | tee $M/shots/play.log`; stop :3106.
  - Start (production): `npm run build 2>&1 | tee $M/shots/build.log`; `nohup npx next start -p 3106 -H 127.0.0.1 > $M/shots/next-start.log 2>&1 &`; wait; `curl -sf http://localhost:3106/api/clue-game/pool/ -o $M/shots/raw/pool-start.json`; `CHROME_PATH=$A/bin/chrome node $M/shots/take.mjs start http://localhost:3106 $M/shots/raw 2>&1 | tee $M/shots/start.log`; stop :3106.
  - `git status`: plan only (F7 if not).
  - Verify: `$M/shots/raw/` has 10 PNGs, `start.json`, `play.json`, `pool-play.json`, `pool-start.json`, `places-play.json`; `cmp $M/shots/raw/pool-play.json $M/shots/raw/pool-start.json` (if it differs, `diff <(jq -S . …) <(jq -S . …)`: order only = fine, data = Decision); `node $M/shots/compare.mjs $M/shots/raw`: boards + wording PASS (files/build still show the old files: unchanged, PASS). Board differs → F2; throw → F3.

- [ ] S3. Convert into the repo, contact sheet, eye check, `shots.ts` header, commit.
  - `node $M/shots/convert.mjs $M/shots/raw 2>&1 | tee $M/shots/convert.log` (9 `src/site/shots/*.webp` + `src/site/og.png`); `node $M/shots/contact.mjs $M/shots/old $M/shots/contact.png`.
  - Eye check (Read full size, each new `$M/shots/raw/<f>.png` beside `$A/shots/raw/<f>.png`): row label "On camera", new opener on the 3 round-start shots, same animals and photos (credits), light mode, no dev badge/overlay, nothing cut off; each `shots.ts` alt still true, esp. `fieldGuide` (Aye-aye), `gridMarked` (size answer no, Okapi ruled out), `witnessNote` (quote, "2 of 5"), `roundEnd`, `journal` ("2 of 76", Aye-aye + Aardvark), `globeFound` ("2 found"). Then `contact.png`. One line per file → `$M/shots/eye-check.txt`.
  - `src/site/shots.ts` header: "Taken 2026-10-30 from the game at origin/main `$B`", "globe, board-phone and hero-board (and src/site/og.png) from the production build", last line "Retake: take.mjs and convert.mjs in the site-shots-on-camera mission's artifacts (shots/, COMMAND.txt), then check every shot by eye." Change alt / `photos` / `ROUND_1` only where the eye check or F2 requires.
  - Decisions: og.png retaken (`config.ts:12`, finding 1); "Camera saw" check is case-sensitive, lowercase `AnimalSheets.tsx:478,542` in round-end kept (game copy out of scope; owner follow-up); each unchanged file + reason (F8); any F2 change.
  - Verify: `npm run typecheck`, `npm run lint`, `npm run site:build`, `node $M/shots/compare.mjs $M/shots/raw > $M/shots/compare.txt` exit 0 (all 4 sections); `git diff --stat`: only `src/site/shots/*.webp`, `src/site/og.png`, `src/site/shots.ts`, plan. Commit `site shots: retake after "On camera" rename (#37)` with the plan; push.

- [ ] S4. Rebase on fresh origin/main, re-run checks, push, open the PR (never merge).
  - `git fetch origin && git rebase origin/main`. If origin/main moved past `$B`: `git diff --stat $B origin/main -- src/components src/game src/clueGame src/app src/pages src/lib src/styles db/content public`; anything that changes a shot's screen → don't open the PR, add steps "S2–S3 again" before this one, stop (F9). Else note under Decisions (shots stay "at `$B`").
  - Re-run: `npm run typecheck`, `npm run lint`, `npm run site:build`, `node $M/shots/compare.mjs $M/shots/raw > $M/shots/compare.txt` (exit 0); `nohup python3 -m http.server 3105 -b 127.0.0.1 -d out/site > $M/serve.log 2>&1 &`; `E2E_SITE_URL=http://localhost:3105 CHROME_PATH=$A/bin/chrome npm run e2e:site 2>&1 | tee $M/e2e-s4.log` (444/444); `mv "$(ls -td e2e-artifacts/*-site | head -1)" $M/e2e-s4`; `rm -rf $M/baseline/e2e-site` (older intermediate; keep baseline logs); stop :3105.
  - `git push --force-with-lease origin agent/site-shots-on-camera` (plain push if the rebase was a no-op).
  - `$M/pr-body.md`: `Closes #37`; shot table (file, old → new hash, KB old → new, what changed, from `compare.txt` + `eye-check.txt`); og.png retaken and why; check is case-sensitive, lowercase "camera saw" at `AnimalSheets.tsx:478` and `:542` (round-end shot) left as an owner follow-up (game copy, out of scope); unchanged files if any; checks + e2e:site count; VPS artifacts (`$M/shots/contact.png`, `compare.txt`, `eye-check.txt`, `COMMAND.txt`, `raw/`, `e2e-s4/`); deploy: owner runs `npm run deploy` from WSL after merging, which also ships the game wording in `e999e86f` and `1118173b`; session's PR attribution line last. `gh pr create --base main --head agent/site-shots-on-camera --title 'site: retake screenshots after "On camera" rename' --body-file $M/pr-body.md` (`gh pr edit --body-file` if one exists).
  - Verify: `gh pr view --json url,state,body` open, has `Closes #37`; `git log --oneline origin/main..HEAD` = plan + shots commits only; `git status` clean.

## Verification

Final run on the final commit (after the code review), cwd = worktree root, ports and one-job rule as in Steps.

1. **Static:** `npm run typecheck` pass, `npm run lint` exit 0, `npm run site:build` pass. (`npm test` and game `npm run e2e` not needed: no game or rules code changes; Baseline 47/47, 524/574 known.)
2. **Shots (DoD grep check):** `node $M/shots/compare.mjs $M/shots/raw > $M/shots/compare.txt`, exit 0: boards equal the old run (or each difference under Decisions, F2), all `light`; no shot's DOM text has `Camera saw`, board shots have `On camera`, round-start shots have the new opener; each file's size = `shots.ts`; each changed file has a new hash, the build references only current-bytes hashes, no old hash of a changed file in `out/site`; `grep -rl "Camera saw" out/site` empty. `$M/shots/eye-check.txt` covers all 10 files.
3. **E2E (artifact):** `nohup python3 -m http.server 3105 -b 127.0.0.1 -d out/site > $M/serve.log 2>&1 &`; `E2E_SITE_URL=http://localhost:3105 CHROME_PATH=$A/bin/chrome npm run e2e:site 2>&1 | tee $M/e2e-site.log` → `444/444 checks passed, 20 screenshots`; `mv "$(ls -td e2e-artifacts/*-site | head -1)" $M/e2e-site` (report.json + page screenshots; the brief's named folder, never deleted). Open `site-home-390-light.png`, `site-home-1440-light.png`, `site-teachers-390-light.png`, `site-teachers-1440-light.png`: the new shots show, no "Camera saw". Stop :3105.
4. **Contact sheet:** `node $M/shots/contact.mjs $M/shots/old $M/shots/contact.png` from the final repo files; look at it.
5. **Artifacts** in `$M`: `shots/` (`raw/` PNG + JSON + pool/places, `old/`, `contact.png`, `compare.txt`, `eye-check.txt`, `COMMAND.txt`, logs), `e2e-site/`. At most two E2E folders (`e2e-s4/`, `e2e-site/`). Reproduce: `$M/shots/COMMAND.txt`; same seed + same pool = same boards.

## Failure modes

F0. **`compare.mjs` must FAIL on** (written before it; S1's smoke covers the no-text path): any of the 10 PNG/JSON entries missing; `text` missing or empty; `Camera saw` in a shot's text or in `out/site`; `On camera` / opener missing where expected; any id, round field or theme differing; new pixel size ≠ `shots.ts`; a built reference whose hash ≠ current bytes; an old hash of a changed file referenced or present; `out/site` missing.

F1. **Port busy** (3105/3106): `ss -ltnp`; our stale server → `fuser -k`; someone else's → next free port ≥ 3107 for either, recorded in Log and `COMMAND.txt`. Never 3100/3101; never change repo defaults.

F2. **Seed gives a different board** (boards FAIL): compare `pool-play.json` size with the old run (journal's "of 76"); keep seed 1, `continent:africa` (rule 5); update `ROUND_1`, each shot's `photos` and alt text to the new run (credits follow via `render.tsx`); Decision with old → new ids.

F3. **`take.mjs` throws** (`round N ended …`, `no witness note in 4 rounds`, a `waitFor` timeout): rerun that mode once (server warm). `the board (dev build?)` timeout in play → not the dev server or `__cc` missing. Still throws with the same board → read the log and last screenshot; don't change game code or the pipeline beyond the `text` field; handoff item if it's a game regression.

F4. **Dev DB unreachable** (pool/places `curl` fails, 500 in `next-dev.log`): `.env.local` present, `psql "$DATABASE_URL" -c 'select 1'`; retry once; persistent → handoff item (owner's DB), `MISSION_BLOCKED` only if nothing else can proceed.

F5. **Stale/wrong build** (start shots show a dev badge or old wording → wording FAIL): `rm -rf .next && npm run build`, retake `start`.

F6. **Chrome won't start:** `$A/bin/chrome --version`; the wrapper adds `--no-sandbox`; don't install another browser.

F7. **Tracked files changed by `next dev`/`build`** (e.g. `AGENTS.md`): `git checkout -- <file>` (out of scope); note in Log.

F8. **A file's hash didn't change** (likely none: globe shots are MapLibre renders): correct result; list under Decisions; never re-encode to force one.

F9. **origin/main moves with screen-affecting changes before the PR:** S4's diff check → retake (S2–S3) so shots match the merged code.

F10. **Dialog shot's DOM text lacks `On camera`** although the grid shows (sheet hides it from `innerText`): eye check decides; narrow `compare.mjs`'s expected set for that shot with the reason under Decisions.

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-10-30 05:00 UTC: Baseline. typecheck/lint pass, unit 47/47, site:build ok, e2e:site 444/444 on :3105. Handoff H3 (done) closed; its owner leftovers (Vercel, Clerk/Google branding, WSL pull) moved to H4. No effect on scope.
- 2026-10-30 05:20 UTC: Architecture (architect). No repo code changes; scripts copied to mission dir, retake on :3106, adds og.png to scope, DOM-text check replaces OCR (no tesseract). Plan-only; no checks needed.

- 2026-10-30 05:35 UTC: Fable review (architecture-reviewer): APPROVE, 0 MUST-FIX, 4 SHOULD-CONSIDER (play before start, case rule in PR, globe hash, theme in compare.txt). Plan-only; no checks needed.

- 2026-10-30 05:50 UTC: Astra review: APPROVE, 0 MUST-FIX, 3 SHOULD-CONSIDER (save pool response, hash check vs unchanged shots, og.png + lowercase in PR). Plan-only; no checks needed.

- 2026-10-30 06:00 UTC: Revision: none needed (both reviews APPROVE, 0 MUST-FIX); 6 SHOULD-CONSIDER items adopted into Revision notes for Steps. Plan-only; no checks needed.

- 2026-10-30 06:15 UTC: Steps (planner): S1 kit in $M/shots (take+text, convert, contact, compare, COMMAND), S2 retake on :3106 play then start + pool saves, S3 convert/eye check/shots.ts header/commit, S4 rebase/checks/PR. Verification + F0-F10 failure modes. Plan-only; no checks needed.

## Summary
