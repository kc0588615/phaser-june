---
mission: site-shots-refresh
project: critter-connect
branch: agent/site-shots-refresh
status: active
started: 2026-11-01 23:22 UTC
---

# Mission: bring critterconnect.org up to date with the current game

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Saved as /srv/critter-ai/agent-state/missions/briefs/2026-11-01-site-shots-refresh.md
     Start: mission start critter-connect <this file>   (base: main at 1a781de4 or later)
     Owner, 2026-11-01: run it now, alongside the critwire missions. It replaces mission site-shots-on-camera; PR #38 is closed unmerged. -->

### Goal

critterconnect.org shows and describes the game as it is on `main`, as one PR from `agent/site-shots-refresh`, with "Closes #37". The mission merges and deploys it, as `MISSION_RELEASE=deploy` says.

- **Every screenshot in `src/site/shots.ts` is retaken**, including `src/site/og.png`, from the mission's base commit.
- **The retake is repeatable from the repo.** The game keeps changing, so these shots will be retaken again. Move `take.mjs` and `convert.mjs` from the cc-website mission's artifacts into the repo, behind one npm script, and point `shots.ts`'s header at it, with the new date and commit.
- **Alt text, photo credits and `ROUND_1` are true** of the new shots.
- **The site's words are true.** Check every statement about how the game plays in `src/site/pages/Home.tsx`, `src/site/pages/Teachers.tsx` and `src/site/config.ts` against the code, and correct what's now false with the smallest edit.

### Why

The owner changes the game often. The old shots were taken at `0bbbeb0e`, and PR #38's retake at `368be9e3` is 27 commits behind: since then the round end moved onto the board, and the game gained "name it", the double match bonus, new "On camera" note highlights, an opt-in auto rule-out and a WCAG pass. Teachers read the site to learn how the game works, so a true description matters more than a flattering one.

### Scope

In:
- `src/site/shots/*.webp`, `src/site/og.png`, `src/site/shots.ts`.
- Screenshot `crop` values and copy in `src/site/pages/Home.tsx`, `src/site/pages/Teachers.tsx` and `src/site/config.ts`, where the new game makes them wrong.
- The moved scripts and one npm script.

Out:
- Game code and game copy, including the lowercase "The camera saw" in `src/components/animalBoard/AnimalSheets.tsx`. List what you notice in the Summary.
- `src/site/pages/Privacy.tsx` and `src/site/pages/Terms.tsx`. If either now looks untrue, add a handoff item and leave it.
- The site's look, layout and page structure, and any new marketing for new features.
- Database schema, seeds and the production content build.
- The old branch `agent/site-shots-on-camera`: reference only. Don't reuse its shots.

### Definition of done

- `npm run typecheck`, `npm run lint`, `npm run site:build` and `npm run e2e:site` pass on the final commit.
- **Checks:** no "Camera saw" in `out/site/` or in any shot (a careful look or OCR). The build references the new hashes. Every shot is checked by eye against its alt text and credits.
- **Artifacts** in `/srv/critter-ai/agent-state/missions/site-shots-refresh/`: one contact sheet of old beside new, and the `e2e:site` report.
- **The PR description and the plan's Summary give:** the base commit, the shot list (before and after), every copy change as before → after with the code that proves it, how many rounds the shots played on the live database, and whether the deploy needs the owner's production content build.
- **Live after release:** `https://critterconnect.org/` and `/teachers/` return 200 and reference the new shot hashes, and `https://play.critterconnect.org/` loads.

### Decision rules

- **Show the game as a new player gets it:** light mode, default settings, opt-in features such as auto rule-out off. Judge copy by the same default.
- **Same seeds, rounds, photos and viewports as before** (seed 1, `continent:africa`), where they still work. If a seed now gives a different board, or a scripted step no longer works, adapt the script, pick the closest match, update `ROUND_1`, alt text and credits, and record why under Decisions.
- **A shot's subject may have moved.** The round end is now on the board, for example. Retake what the page's text is about, and change the `crop` to fit. Don't redesign the page around it.
- **Keep copy changes few.** Correct what's false. Mention a new feature only where leaving it out makes a sentence false. Copy says "caught on camera" or "the one the camera saw", never "mystery".
- **`main` may move during the mission,** because the owner keeps pushing. Shots stay pinned to the base commit. At the release rebase, retake only if a new commit visibly changes a shot, and only once. Otherwise record the difference in the Summary and carry on.
- **The deploy ships all of `origin/main`,** including the owner's game commits. That's expected, so don't hold the release for it.

### Notes

- **The scripts today:** `/srv/critter-ai/agent-state/missions/cc-website/shots/` (`take.mjs`, `convert.mjs`, `COMMAND.txt`; `take.mjs` imports the repo's `scripts/cdp.mjs`). Chromium on this ARM VPS uses the `--no-sandbox` wrapper at `/srv/critter-ai/agent-state/missions/cc-website/bin/chrome`. `/srv/critter-ai/agent-state/missions/site-shots-on-camera/shots/` holds the last run's `compare.mjs` and `contact.mjs`, and `pr-body.md` beside it is a good shape for the PR.
- **Ports:** critwire missions run at the same time and share the Claude usage limit. Their E2E uses 3100 and 3101, and `site:serve`'s default is also 3101. **Never use 3100 or 3101, even though `COMMAND.txt` says 3100.** Serve the built site on 3105 (`python3 -m http.server 3105 -b 127.0.0.1 -d out/site`, then `E2E_SITE_URL=http://localhost:3105 npm run e2e:site`), and run the game's servers on 3106 or higher. Check with `ss -ltn` before binding, and don't change the repo's default ports.
- **The database is live.** `.env.local` points at the real `phaser_june`, and each round played adds to `clue_match_solves`. Play only the rounds the shots need. Don't run the full game E2E: it isn't this mission's check, and it writes many rounds there. Its known result on this VPS is 524/574 with a timing failure.
- **The deploy:** `deploy critter-connect`. This is the first real run of that path, so if it fails, stop and add a handoff item with its output. Don't change the server by hand.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

Base commit `bc8438d1` (mission start; on `main` at `1a781de4`). Node 24.21 (repo's `engines` says 22.x). No schema change, no migration history (`db/schema.sql`), nothing to migrate.

- `npm run typecheck`: pass. `npm run lint`: pass. `npm test`: 48/48 pass. `npm run site:build`: pass.
- `npm run e2e:site` (served on 3105, `CHROME_PATH=/srv/critter-ai/agent-state/missions/cc-website/bin/chrome`): 444/444, 20 screenshots, `e2e-artifacts/2026-11-01T23-23-17-903Z-site/`.
- `npm run e2e` (full game): not run, on the brief's order (writes many rounds to the live database; known VPS result 524/574, a timing failure).
- Logs: `/srv/critter-ai/agent-state/missions/site-shots-refresh/baseline/`.

## Architecture

Base: `origin/main 1a781de4` (`bc8438d1` adds only this plan). Evidence beyond reading code: seed 1 deal computed offline with the repo's own rules; one public `GET play.critterconnect.org/api/clue-game/pool/`; one `BEGIN READ ONLY` count on `clue_match_solves`. Nothing written.

### Findings, by impact

**F1. The game saves no rounds, so the brief's "each round adds to `clue_match_solves`" is stale.** The client's only `fetch` is GET (`src/lib/getJson.ts:8`). `POST /api/clue-game/solves` (`src/app/api/clue-game/solves/route.ts:13`) has no caller: `9db33852` deleted the old sender with `MatchGame`, and plan 044 never rebuilt it (`plans/044-animal-board.md:138`). Live table: 188 rows, newest 2026-10-01 04:24 UTC, newest `rules_version` 043-0. Consequences:
- Shots write 0 rows. Report rounds played and rows added (before/after count).
- Sign-in sync no longer carries new finds. `useJournal.ts:42` only reads old solves.
- False copy: `Teachers.tsx:24, :120, :128` (edits below), `Privacy.tsx:19, :29` (handoff).

**F2. `take.mjs` fails against the base.** By step:

| `take.mjs` | Now | Effect | Fix |
|---|---|---|---|
| `:23` how-to key `v3` | `v4` (`AnimalSheets.tsx:23`, `e2e.mjs:76`) | Dialog over every board shot, silently in `start`. In `play`, `drag` returns `blocked` (`debugBridge.ts:164-165`), which `:139` ignores: 45 no-op moves, then a misleading "try another seed" | Stop pre-seeding it. After the board loads, click "Let's play" if `#animal-how-title` is up, wait for it to go. Survives future key bumps |
| `:147` `section[aria-label^="It was the"]` | `section[aria-labelledby="end-title"]` (`AnimalSheets.tsx:544`, `e2e.mjs:784`) | 60 s timeout, throw | New selector |
| `:120` `sleep(600)` before grid-marked | Scout flash 1.8 s (`globals.css:591`), reveal state 3.1 s (`AnimalGame.tsx:43`) | Teachers' hero caught mid-flash | Wait 3200 ms before this shot |
| `:154` Next by script | `AnimalGame.tsx:531` focuses the board; `:492-494` then may show ring and keys hint (`:501`) | Round 2+ shots may show keyboard UI a tapping player doesn't see | `shot()` blurs the active element and waits a beat (as `e2e-site.mjs:197-198`) |
| `:139` `drag` result ignored | | Silent no-ops | Throw on `blocked` or `timedOut` |
| `:8` cwd import; convert's `process.cwd()` and `createRequire` | | Run-from-root only | `../cdp.mjs`; root from `import.meta.url` (`site.mjs:17`) |

Still valid, no change: `tr[data-suspect]`, `table[aria-label="Evidence"]` (`EvidenceGrid.tsx:204, :328`); `button[data-pill]` (`:349`); notes button (`:254`); `__cc` API (`debugBridge.ts:211-227`); `[role=dialog]` + `/^Close/` (`motion.ts:23`, `Sheet.tsx:32`); Menu and "Field journal" (`AnimalGame.tsx:450`, `AnimalSheets.tsx:440`); `#journal-title` (`JournalSheet.tsx:31`); Next/New trail (`AnimalSheets.tsx:657`); `ul button` and `.maplibregl-marker` (`PlaceList.tsx:18, :25`, `Globe.tsx:182`); slide-hint key (`AnimalGame.tsx:30`). Auto rule-out is off on a fresh profile (`autoRuleOut.ts`). Pill helpers match `e2e.mjs`.

**What seed 1 / `continent:africa` still gives.** Live pool bytes equal the 368be9e3 run's (same sha256); 76 species, 26 in Africa. `deal()` depends only on seed and pool (`useAnimalSession.ts:83-94`), never on play, so these are fixed:

| Round | Suspects | Camera's animal | Witness notes |
|---|---|---|---|
| 1 | 23, 29, 50, 56, 61: Aye-aye, Okapi, Addax, Chimpanzee, Indri (`ROUND_1` holds) | Aye-aye | none, so never a note shot |
| 2 | 32, 39, 46, 56, 57 | Aardvark | first: "long snout…", fits 2 |
| 3 | 29, 50, 56, 68, 69 | Addax | 3 |
| 4 | 39, 50, 61, 64, 66 | Black Rhinoceros | 2 |

Deck in round 1 unchanged: size:large, activity:day, habitat:savanna, region:east-africa. **May differ:** the move path. The double (`animalBoard.ts:321, :332`) lands answers earlier, which changes marks and then move choice. So grid-marked's answer and animal, moves used, and whether a purple gem comes in round 2 can change. Those alts are re-read from the run. Expect 2 rounds; 4 is the script's cap (`take.mjs:110`).

**F3. Copy audit** (default player: light mode, opt-in off). False ones, with the smallest edit:

| Where | Before → after | Proof |
|---|---|---|
| `Teachers.tsx:66` | "The round-end card shows the full record: the family tree, the range map and the sources." → "The round-end card shows the family tree and the animal's field notes, and the grid above it replays the evidence." | `RoundEndSheet` (`AnimalSheets.tsx:503-662`) has tree `:590-596`, notes `:625-639`, no range map (only `JournalSheet.tsx:66`), no sources |
| `Teachers.tsx:30` | "…the IUCN Red List first, and each round-end card lists its sources. Traits…" → "…the IUCN Red List first. Traits…" | same; `SourceLine` has no caller |
| `Teachers.tsx:139` | delete "Every source is on the round-end card." | same |
| `Teachers.tsx:97` | "The round-end card has everything needed." → "The grid and the round-end card have everything needed." | answers are in the replay grid outside the card (`AnimalSheets.tsx:536-537`, `EvidenceGrid.tsx:204`); notes in the card (`:532`) |
| `Teachers.tsx:87` | "one who matches without reasoning finds nothing" → "one who matches without reasoning finds about one round in five, by naming an animal blind" | `nameIt` (`animalBoard.ts:405`); `plans/053-name-it.md:17, :25`; paper `:11`. "Over 90%" stays: careful 98/97% (`053:22`) |
| `Teachers.tsx:64` | "Students compare them with each animal's field guide and rule out the ones that can't be it, then clear gems next to them to release them." → "Students compare each animal's scouted answers with the camera's and rule out the ones that can't be it. A ruled-out animal wanders off the board, or clearing a gem next to it releases it at once." | While playing, the guide hides the round's question traits (`AnimalSheets.tsx:86, :96`, `clueFaces.ts:37`); comparison is in the grid (`AnimalSheets.tsx:711`); wander on (`animalBoard.ts:59, :368`) |
| `Home.tsx:59` | "Check each animal's field guide against the answers. Rule out the wrong one and it escapes." → "Compare each animal's answers with the camera's. Rule out the one caught on camera and it escapes." | same; wording from `AnimalSheets.tsx:712` |
| `Teachers.tsx:78` | "…"mostly" isn't "only", and "no record" isn't "no"." → "…"mostly" isn't "only"." | No question can have a missing record (`animalBoard.ts:97`); "No record" exists only in `LogEntryText.tsx:53`, unrendered (only `WithBlanks` is imported). Limits at `:30`, `:143` stay true (`animalBoard.ts:167`) |
| `Home.tsx:80` | "credited on every card" → "credited in each field guide and on the round-end card" | credits at `AnimalSheets.tsx:203, :576`; pinned cards have none (`AnimalCard.tsx`) |
| `Teachers.tsx:24` | "Signing in is optional; it keeps a player's Field Journal on more than one device." → "Signing in is optional." | F1 |
| `Teachers.tsx:120` | "Finished rounds are saved with no link to the player." → "Rounds played without signing in are never linked to the player." | F1; true whether or not the owner restores the save |
| `Teachers.tsx:128` | "The game keeps the player's results, to sync their Field Journal between devices." → "Results saved under an account are kept, and the Field Journal reads them back." | F1; `journal/route.ts`; same |

True, no edit:
- **Rules:** five look-alikes, four questions, 20 gems, 30 moves, 5 rounds, 3 hearts: `animalBoard.ts:59` (`Home:27, :49, :54, :68`, `Teachers:61, :62, :65, :77`). Double: "matching 20 answers it" still holds, the counter still reads n/20 (`EvidenceGrid.tsx:298`), and the +2 needs no mention.
- **Answers never rule anyone out (`Teachers:64`):** true by default; auto rule-out is opt-in (`useAnimalSession.ts:76, :273-276`).
- **Scouting (`:63`):** `animalBoard.ts:322`. **Escape and heart (`:65`, `Home:59`):** `:368-383, :464`. **One left (`Home:27`):** `:379`.
- **Witness notes vs guides (`:79`):** `AnimalSheets.tsx:373`, `animalBoard.ts:167`. **Mostly/only:** `questionMatch.ts:140, :161`.
- **Okapi and hirola (`:80`):** same set 29, 50, 56, 68, 69 (computed). **Regions and tree (`:81`):** `animalBoard.ts:87-97`, `AnimalSheets.tsx:590-596`.
- **Class link (`:28, :98, :104`):** `useAnimalSession.ts:28-33, :92`, `config.ts:9`.
- **Sound, keyboard (`:101`):** `sfx.ts:24`; `AnimalGame.tsx:34-38`, `EvidenceGrid.tsx:358-360`.
- **No account, journal in the browser (`:117-119`, `Home:30`):** `proxy.ts:5`, `useJournal.ts:12, :40`. **No ads or analytics (`:133`):** `package.json:50-61`. **Photos Wikimedia:** 74 of 76 have one, all Wikimedia hosts, 2 none (computed).
- **Globe and journal (`Home:68`):** `Globe.tsx:3-4, :182`, `JournalSheet.tsx:66-68`. **Pictures, categories (`:142, :144`):** `clueFaces.ts:7`, `questionMatch.ts:161`. **Offline (`:31`):** no service worker.
- **`config.ts`:** all descriptions true; `OG_IMAGE.alt` to re-check against the new og.
- **Not provable from code, unchanged:** 5–10 minutes (owner's playtests, `plans/051-landing-page.md:130`); NGSS mapping (paper §5.1); sources tiers (`db/content/sources.json`).
- No "mystery" and no "Camera saw" anywhere in `src/site`.

**F4. Privacy and Terms look untrue: handoff, no edit.** `Privacy.tsx:19, :29` (rounds and results saved, sync: F1); `Terms.tsx:13` ("sources shown on each reveal card"). One item asks: restore the game's save (game work, makes Privacy true again) or have the policy rewritten?

**F5. `shots.ts`.**
- **Consumption:** `alt` → `Screenshot.tsx:14`, `Home.tsx:38`, `Teachers.tsx:51`. `photos` → `photoCredits` (`render.tsx:53-60`), merged per route (`:77`) into each footer (`Layout.tsx`); the build throws on an id with no profile or photo. `seed`, `place`, `round` have no reader: documentation only. Width and height go to `<img>` against layout shift.
- **`fieldGuide` alt is already false:** "its answers to the questions", but the shot is at round start, so every row is an unscouted yes/no pencil pair. Say "…its signs and the questions still to scout".
- **`heroBoard` alt on phones:** the `<picture>` shows `boardPhone`, cropped to the board, under hero's alt ("on a computer… grid beside it"). Change to wording true of both: "A round: a board of gems with five animal cards pinned on it".
- **Re-verify after the run:** gridMarked (answer, animal), witnessNote (quote, fits, round, `photos`), roundEnd (now card plus replay grid), journal and globeFound (count, names; 2 of 76 only if 2 rounds), `ROUND_1` comment (`:22`, holds), `config.ts:12-13`.
- **Credits:** live pool photos equal every profile's (credit, license, page; 0 mismatches), so footers match what shots show.

**F6. Crops are pixel-bound** (phone 780x1688; 3:4 shows 1040 px):

| Where | Now | Must show | Derive |
|---|---|---|---|
| `Teachers.tsx:52` + comment `:40-42` | `md:aspect-[780/750]` | exactly the grid | `780/(2 × boardTop)` |
| `Home.tsx:39` | `object-[50%_84%]` | the board, square | `y = 2 × boardTop / 908` |
| `Home.tsx:55` | `object-[50%_70%]` | board and part of grid | by eye |
| `Home.tsx:77`, `Teachers.tsx:108` | `object-[50%_40%]` | subject moved. Kicker, photo, credit, name, tree, ≥2 grid rows. Tree likely cut at 40%: expect a larger y | by eye |
| `Home.tsx:60`, `Teachers.tsx:69, :89` | `object-bottom` | drawers | check |
| `Home.tsx:50, :71-72`, `Teachers.tsx:148` | top | check | |

`take.mjs` records each shot's board rect so these come from data.

**F7. Converter needs nothing new.** `sharp` 0.35.4 is installed via `next`'s optional dep (arm64 binary loads; lockfile entry present). Do not add it to `package.json`: without a network install the lockfile can't be updated, and `npm ci` (Dockerfile `:10`) would then fail the deploy. Import plainly; a missing module fails loud. No OCR tool here and none installable: shot text checks use DOM text plus eye.

### Target design

Keeps the proven flow: dev build for played shots, production build for round-start shots.

```
scripts/shots/run.mjs      entry: steps, servers, order. No browser code.
scripts/shots/take.mjs     moved; take({ mode, base, outDir }): drives Chrome, writes <shot>.png + <mode>.json.
scripts/shots/convert.mjs  moved; convert(rawDir): raw PNG -> src/site/shots/*.webp, src/site/og.png.
package.json               "site:shots": "node scripts/shots/run.mjs"
src/site/shots.ts          header: date, origin/main 1a781de4, "Retake: npm run site:shots, then check every shot by eye".
```

```
npm run site:shots              # play, start, convert
npm run site:shots -- convert   # any subset, same order
```

| Env | Default | Why |
|---|---|---|
| `CHROME_PATH` | `/usr/bin/google-chrome` (`cdp.mjs:9`) | VPS: `.../missions/cc-website/bin/chrome`, set by the caller, never in the repo |
| `SHOTS_PORT` | `3106` | Game server, both builds, one at a time. Throws if busy. Clear of 3100, 3101, 8080. No repo default changes |
| `SHOTS_DIR` | `e2e-artifacts/shots-raw` (gitignored) | Raw PNGs, JSON, server logs. Mission points it at its state folder |
| `SHOT_SEED`, `SHOT_PLACE` | `1`, `continent:africa` | As today |

**`run.mjs`.** `play`: spawn `npx next dev -p $PORT -H localhost` detached, cwd root, log to `SHOTS_DIR`; poll `/` up to 180 s; `take`; kill the process group. `start`: `npm run build`, then `npx next start` the same way. `-H localhost` is required: next dev 16 bound to 127.0.0.1 fails its proxying (on-camera `COMMAND.txt`). Any failure kills the server and exits non-zero. About 60 lines.

**`take.mjs`.** The F2 fixes, plus `<mode>.json` gains `commit` and, per shot, `{ ids, theme, text (body.innerText), board (rect), clue (__cc.clue() or null) }`. `shot()` throws if `#animal-how-title` or `.ev-hint` is present or the theme isn't light. Track POSTs to `${base}/api/` with `Network.requestWillBeSent` (pattern: `e2e-site.mjs:118-127`) into `record.writes`; print `rounds played: N, API writes: M`. Keep the slide-hint pre-seed. Pill helpers stay a local copy: sharing them means editing `e2e.mjs`, out of scope and not runnable here.

**`convert.mjs`.** Names and sizes come from `SHOTS` in `shots.ts` and `OG_IMAGE` in `config.ts` via esbuild `transform` (the `e2e-site.mjs:34` one-liner), not a third list. Throw if a raw PNG is missing or its pixels differ from the record. Same encode settings.

**Rounds on the live DB.** Only `play` plays: stops at the first witness note's round, cap 4. `start` plays none and sends only GETs. Report rounds per run from `play.json`, `writes` (expected `[]`), and `clue_match_solves` count read only before and after (expected 188 → 188 unless the owner ships a save).

**Hashes** (`site.mjs:22-28, :82-84`: sha256, 10 hex, `/site/<name>.<hash>.<ext>`; pages get URLs through `shotImage`, `render.tsx:64`). Verify against the base:
```
for f in src/site/shots/*.webp src/site/og.png; do n=$(basename $f); new=$(sha256sum $f | cut -c1-10); old=$(git show 1a781de4:$f | sha256sum | cut -c1-10)
  echo "$n $old -> $new"; grep -rqF "/site/${n%.*}.$new.${n##*.}" out/site --include='*.html' || echo "MISSING $n"; [ "$old" = "$new" ] || ! grep -rqF "$old" out/site --include='*.html' || echo "STALE $n"; done
! grep -rF 'Camera saw' out/site                 # site
! grep -lF 'Camera saw' "$SHOTS_DIR"/*.json      # shots: case-sensitive, DOM text, then eye check
```
A byte-identical shot (globe was, at 368be9e3) keeps its hash: record it as retaken and unchanged. Lowercase "The camera saw #1" on the round-end shot is game copy (`AnimalSheets.tsx:581`), out of scope. Live: same `grep` on `curl` of `/` and `/teachers/`.

**Mission artifacts, not repo:** contact sheet (adapt `site-shots-on-camera/shots/contact.mjs`, old from `git show`) and the hash loop. Also run `node scripts/check-game-css.mjs` (`docs/DEPLOY.md`: on a PR that changes the site).

**Release.**
- **Production content build: not needed.** No `db/content` change. The caddy image bakes `out/site` from the repo with no database (Dockerfile `:21-27`, `render.tsx:72`). Live pool matches profiles today.
- **`.dockerignore`:** `*.png` matches root only; `src/site/og.png` is copied, and CI proves the image.
- **Rebase rule:** `git diff --stat 1a781de4 origin/main -- src/components src/game src/clueGame src/pages src/styles public db/content`. Retake once, by `npm run site:shots`, only if a commit visibly changes a shot; otherwise record it in the Summary. Shots and header stay pinned to `1a781de4`. A content build by the owner can change deals: same rule.
- **Next dev side effects:** after the run, `git status` must show only the scripts, shots, `og.png`, `shots.ts` and pages. Restore anything else (for example `tsconfig.json`).

**For the Summary, out of scope:**
- Game saves nothing since plan 044; route, `parseSolveReport` and `LogEntryText`'s `SourceLine` are dead (F1, F4). Stale: `docs/CLUE_MATCH.md:10, :24, :45, :74`, `src/proxy.ts:3`, `~/AGENTS.md`'s "add rows".
- No per-fact sources anywhere in the game now, only the Red List link (`JournalSheet.tsx:60-64`). Paper `:228, :268` still claims them, which is where the false copy came from.
- Lowercase "camera saw": `AnimalGame.tsx:414`, `AnimalSheets.tsx:581, :696`, `JournalSheet.tsx:43`.
- `animalBoard.ts:54-56` comment understates careful (91-95%, now 97-98%).
- `e2e.mjs:76` hard-codes the how-to key and duplicates the pill helpers.
- VPS `.env.local` has `?pgbouncer=true`, which `AGENTS.md` says not to add. App strips it (`src/db/index.ts:10-14`); `psql` rejects it.

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-11-01 23:24 UTC: Baseline. typecheck, lint, unit 48/48, site:build, e2e:site 444/444 pass; full game E2E skipped per brief.
- 2026-11-01 23:39 UTC: Architecture written. Lead confirmed by grep that no client POSTs a solve (F1). 12 false copy statements, take.mjs breaks found, design `npm run site:shots`. No code changed; typecheck/lint n/a.

## Summary
