---
mission: site-shots-refresh
project: critter-connect
branch: agent/site-shots-refresh
status: done
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
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

## Baseline

Base commit `bc8438d1` (mission start; on `main` at `1a781de4`). Node 24.21 (repo's `engines` says 22.x). No schema change, no migration history (`db/schema.sql`), nothing to migrate.

- `npm run typecheck`: pass. `npm run lint`: pass. `npm test`: 48/48 pass. `npm run site:build`: pass.
- `npm run e2e:site` (served on 3105, `CHROME_PATH=/srv/critter-ai/agent-state/missions/cc-website/bin/chrome`): 444/444, 20 screenshots, `e2e-artifacts/2026-11-01T23-23-17-903Z-site/`.
- `npm run e2e` (full game): not run, on the brief's order (writes many rounds to the live database; known VPS result 524/574, a timing failure).
- Logs: `/srv/critter-ai/agent-state/missions/site-shots-refresh/baseline/`.

## Architecture

Base: `origin/main 1a781de4` (`bc8438d1` adds only this plan). Evidence beyond reading code: seed 1 deal computed offline with the repo's own rules; one public `GET play.critterconnect.org/api/clue-game/pool/`; two `BEGIN READ ONLY` counts on `clue_match_solves`. Nothing written.

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
| `Teachers.tsx:87` | "one who matches without reasoning finds nothing" → "one who matches without reasoning finds about one round in five" | `nameIt` (`animalBoard.ts:405`); `plans/053-name-it.md:17, :25`; paper `:11`. Leaving out how keeps it true, so the brief's rule says no feature mention. "Over 90%" stays: careful 98/97% (`053:22`) |
| `Teachers.tsx:64` | "Students compare them with each animal's field guide and rule out the ones that can't be it, then clear gems next to them to release them." → "Students compare each animal's scouted answers with the camera's and rule out the ones that can't be it. A ruled-out animal wanders off the board, or clearing a gem next to it releases it at once." | While playing, the guide hides the round's question traits (`AnimalSheets.tsx:86, :96`, `clueFaces.ts:37`); comparison is in the grid (`AnimalSheets.tsx:711`); wander on (`animalBoard.ts:59, :368`) |
| `Home.tsx:59` | "Check each animal's field guide against the answers. Rule out the wrong one and it escapes." → "Compare each animal's answers with the camera's. Rule out the one caught on camera and it escapes." | same; wording from `AnimalSheets.tsx:712` |
| `Home.tsx:80` | "credited on every card" → "credited in the game" | credits in the guide and round end (`AnimalSheets.tsx:203, :576`) and journal (`JournalSheet.tsx:70`); pinned cards have none (`AnimalCard.tsx`) |
| `Teachers.tsx:24` | "Signing in is optional; it keeps a player's Field Journal on more than one device." → "Signing in is optional." | F1 |
| `Teachers.tsx:120` | delete "Finished rounds are saved with no link to the player." | F1: no round is saved. Any rewording ("never linked") still implies a stored round. `:118-119` already say no name is asked and where the journal lives |
| `Teachers.tsx:128` | delete "The game keeps the player's results, to sync their Field Journal between devices." | F1: new results aren't kept; `journal/route.ts` only reads old rows. "Nothing is saved" would contradict the policy `:133` links to until F4 is answered, so silence, not a new claim |

True, no edit:
- **"No record" isn't "no" (`:30, :78, :143`), all three stay:** an open trait a record lacks proves nothing (`traits.ts:11`), and a note counts only the guides that record its tags, "N of 5 field guides say this too" (`animalBoard.ts:167`, `AnimalSheets.tsx:373`). So a guide's silence is still there to read. The literal phrase is unrendered (`LogEntryText.tsx:53`, only `WithBlanks` imported) and questions skip missing records (`animalBoard.ts:97`), but neither makes these false.
- **Deletion (`:129`):** old results remain, 23 rows under 3 accounts (read-only count), and Clerk holds the account.
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

**F4. Privacy and Terms look untrue: handoff, no edit.** `Privacy.tsx:19, :29` (rounds and results saved, sync: F1); `Terms.tsx:13` ("sources shown on each reveal card"). One item asks: restore the game's save (game work, makes Privacy true again) or have the policy rewritten? Until answered, the policy overstates what's kept, the safer direction. If the save returns, the bullets deleted at `Teachers.tsx:120, :128` and the clause at `:24` return with it.

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
src/site/shots.ts          header: date, origin/main <commit>, pool <hash> (both from the manifests), "Retake: npm run site:shots, then check every shot by eye".
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

**`run.mjs`.** `play`: spawn `npx next dev -p $PORT -H localhost` detached, cwd root, log to `SHOTS_DIR`; poll `/` up to 180 s; `take`; kill the process group. `start`: `npm run build` with inherited stdio (npm echoes its typecheck and build steps, so a retake doesn't look hung), then `npx next start` the same way. `-H localhost` is required: next dev 16 bound to 127.0.0.1 fails its proxying (on-camera `COMMAND.txt`). Any failure kills the server and exits non-zero. About 60 lines.

**`take.mjs`.** The F2 fixes, plus `<mode>.json` gains `commit` (`git merge-base HEAD origin/main`: the game's commit, so plan and script commits on a branch don't count and a rebase moves it), `pool` (first 10 hex of the sha256 of `GET ${base}/api/clue-game/pool/`, the bytes the deal reads) and, per shot, `{ ids, theme, text (body.innerText), board (rect), clue (__cc.clue() or null) }`. `shot()` throws if `#animal-how-title` or `.ev-hint` is present or the theme isn't light. Track POSTs to `${base}/api/` with `Network.requestWillBeSent` (pattern: `e2e-site.mjs:118-127`) into `record.writes`; print `rounds played: N, API writes: M`. Keep the slide-hint pre-seed. Pill helpers stay a local copy: sharing them means editing `e2e.mjs`, out of scope and not runnable here.

**`convert.mjs`.** Names and sizes come from `SHOTS` in `shots.ts` and `OG_IMAGE` in `config.ts` via esbuild `transform` (the `e2e-site.mjs:34` one-liner), not a third list. Before encoding anything, read `play.json` and `start.json`. Throw if their `commit`, `pool`, `seed` or `place` differ, or if a wanted shot is in neither's `shots`; `take` writes its manifest in `finally`, so this also catches a failed run's partial record. Throw if a raw PNG is missing or its pixels differ from the record. Same encode settings.

**Rounds on the live DB.** Only `play` plays: stops at the first witness note's round, cap 4. `start` plays none and sends only GETs. Report rounds per run from `play.json`, `writes` (expected `[]`), and `clue_match_solves` count read only before and after (expected 188 → 188 unless the owner ships a save).

**Hashes** (`site.mjs:22-28, :82-84`: sha256, 10 hex, `/site/<name>.<hash>.<ext>`; pages get URLs through `shotImage`, `render.tsx:64`). Verify against the base:
```
for f in src/site/shots/*.webp src/site/og.png; do n=$(basename $f); new=$(sha256sum $f | cut -c1-10); old=$(git show 1a781de4:$f | sha256sum | cut -c1-10)
  echo "$n $old -> $new"; grep -rqF "/site/${n%.*}.$new.${n##*.}" out/site --include='*.html' || echo "MISSING $n"; [ "$old" = "$new" ] || ! grep -rqF "$old" out/site --include='*.html' || echo "STALE $n"; done
! grep -rF 'Camera saw' out/site                 # site
! grep -lF 'Camera saw' "$SHOTS_DIR"/*.json      # shots: case-sensitive, DOM text, then eye check
jq -r '.mode as $m | .shots | to_entries[] | select(.value.text | test("camera saw"; "i")) | "\($m) \(.key)"' "$SHOTS_DIR"/*.json   # any case: the list for the Summary
```
A byte-identical shot (globe was, at 368be9e3) keeps its hash: record it as retaken and unchanged. Lowercase "The camera saw #1" on the round-end shot is game copy (`AnimalSheets.tsx:581`), out of scope. Live: same `grep` on `curl` of `/` and `/teachers/`.

**Mission artifacts, not repo:** contact sheet (adapt `site-shots-on-camera/shots/contact.mjs`, old from `git show`) and the hash loop. Also run `node scripts/check-game-css.mjs` (`docs/DEPLOY.md`: on a PR that changes the site).

**Release.**
- **Production content build: not needed.** No `db/content` change. The caddy image bakes `out/site` from the repo with no database (Dockerfile `:21-27`, `render.tsx:72`). Live pool matches profiles today.
- **`.dockerignore`:** `*.png` matches root only; `src/site/og.png` is copied, and CI proves the image.
- **Rebase rule:** `git diff --stat 1a781de4 origin/main -- src/components src/game src/clueGame src/pages src/styles public db/content`. Retake once, by `npm run site:shots`, only if a commit visibly changes a shot; otherwise record it in the Summary. Shots and header stay pinned to `1a781de4`, unless that retake runs: then the header takes `commit` and `pool` from its manifests. The hash loop still compares with `1a781de4`. A content build by the owner can change deals, so compare the manifest's `pool` with `curl -s https://play.critterconnect.org/api/clue-game/pool/ | sha256sum | cut -c1-10`: same rule.
- **Next dev side effects:** after the run, `git status` must show only the scripts, shots, `og.png`, `shots.ts` and pages. Restore anything else (for example `tsconfig.json`).

**For the Summary, out of scope:**
- Game saves nothing since plan 044; route, `parseSolveReport` and `LogEntryText`'s `SourceLine` are dead (F1, F4). Stale: `docs/CLUE_MATCH.md:10, :24, :45, :74`, `src/proxy.ts:3`, `~/AGENTS.md`'s "add rows".
- No per-fact sources anywhere in the game now, only the Red List link (`JournalSheet.tsx:60-64`). Paper `:228, :268` still claims them, which is where the false copy came from.
- Lowercase "camera saw": `AnimalGame.tsx:414`, `AnimalSheets.tsx:581, :696`, `JournalSheet.tsx:43`, plus the shots the `jq` line lists.
- `animalBoard.ts:54-56` comment understates careful (91-95%, now 97-98%).
- `e2e.mjs:76` hard-codes the how-to key and duplicates the pill helpers.
- VPS `.env.local` has `?pgbouncer=true`, which `AGENTS.md` says not to add. App strips it (`src/db/index.ts:10-14`); `psql` rejects it.

## Architecture review (Fable)

VERDICT: APPROVE_WITH_CHANGES

Checked against the code. F1 holds: the client's only sender is `getJson` (`src/lib/getJson.ts:8`); no `sendBeacon`/XHR/`method:` anywhere under `src` outside `src/app/api`; `plans/044-animal-board.md:138` says the POST was never rebuilt. The brief's "each round adds to `clue_match_solves`" is stale; the report rounds + before/after count design is right. F2's table is accurate: key is `v4` (`AnimalSheets.tsx:23`, `e2e.mjs:76`); round-end is `section[aria-labelledby="end-title"]` (`AnimalSheets.tsx:544`); `drag` returns `blocked` (`debugBridge.ts:164`) and `take.mjs:139` discards it; `.ev-flash` 1.8 s (`globals.css:591`), `REVEAL_MS` 3100 (`AnimalGame.tsx:43`); `onNext` refocuses the board (`AnimalGame.tsx:531`). Still-valid selectors confirmed (`EvidenceGrid.tsx:204`, `AnimalSheets.tsx:657, :731`). F7 holds: `import('sharp')` resolves 0.35.4 from `node_modules/sharp`; not in `package.json`, only as `next`'s optional dep in the lockfile (`package-lock.json:6767`); the Dockerfile's `npm ci` (`:10`) would break on an unlockable add. F3's proofs check out: RoundEndSheet has tree + notes, no `RangeMap`/`SourceLine` (`AnimalSheets.tsx:503-662`; `RangeMap` only in `JournalSheet.tsx:66`; `SourceLine` has no importer); guide hides asked prefixes while playing (`AnimalSheets.tsx:86, :96`); `nameIt` (`animalBoard.ts:405`) and random 20% (`plans/053-name-it.md:17, :25`); `AnimalCard.tsx` renders no `PhotoCredit`; auto rule-out defaults off (`autoRuleOut.ts:5`). Target design is as simple as the goal allows: three files, one npm script, defaults clear of 3100/3101/8080, `SHOTS_DIR` default gitignored (`.gitignore:63`). Release section matches the brief's rules (pin to base, retake once only on a visible change, content build not needed: Dockerfile `:21-27`).

MUST-FIX:
1. **`Teachers.tsx:78` edit contradicts keeping `:143`.** Both rest on the same premise ("no record" ≠ "no"). The plan deletes it at `:78` and keeps it at `:143` as true (`animalBoard.ts:167`: a note fits only if the guide records every tag, so an unrecorded trait is real in play; `traits.ts:11`). The wording "No record" being unrendered (`LogEntryText.tsx:53`) doesn't make `:78` false. Brief: correct only what's false, fewest edits. Drop the `:78` edit (or treat both lines the same way; don't split them).
2. **`Teachers.tsx:128` replacement still reads as "results are saved".** "Results saved under an account are kept, and the Field Journal reads them back" tells a teacher the game stores results under the account, which is the F1 falsity being fixed. True today: nothing is saved (`getJson.ts:8` only; `journal/route.ts` reads the 188 old rows). Reword to what the game does now, e.g. drop the bullet or "The game doesn't save results today; the Field Journal stays in the browser", and let the handoff (F4) decide the restore. Same check on `:120`: "never linked" is fine.

MISSED:
- `Home.tsx:80` → "credited in each field guide and on the round-end card" omits the journal, which also credits (`JournalSheet.tsx:70`). Either add it or use a shorter form that stays true ("credited in the game").
- Otherwise none; the findings cover the code paths that matter.

SHOULD-CONSIDER:
1. `Teachers.tsx:87`: "about one round in five, by naming an animal blind" is the bot's number for a random player who names when moves run out (`053:17`). Smaller and safer: "finds about one round in five" and leave the mechanism out.
2. `run.mjs` `start` mode: `npm run build` runs `typecheck` too (`package.json:31`); fine, but say so in the usage line so a retake isn't mistaken for a hang.
3. `take.mjs` how-to: clicking "Let's play" (`AnimalSheets.tsx:731`) is right; also assert the dialog is gone before every board shot (the plan's `shot()` guard on `#animal-how-title` covers it; keep it).
4. `<mode>.json` `text: body.innerText` is the only "Camera saw" check for shots besides eye; make the grep case-sensitive as planned and also list the lowercase hits so the Summary's out-of-scope note is backed by data.
5. The `before/after` `clue_match_solves` count: two read-only queries total; don't add a per-run one to the script, keep it a mission step (the repo script shouldn't touch the DB).

## Architecture review (Astra)

VERDICT: APPROVE

MUST-FIX: none

SHOULD-CONSIDER:
1. Record the actual capture commit after any rebase-triggered retake; retaining `1a781de4` would misidentify newer screenshots.
2. Validate capture manifests before conversion so partial reruns cannot silently combine screenshots from different commits, seeds or places.
3. Record the live content pool’s hash alongside the commit: code and seed alone cannot reproduce deals when database content changes.

## Revision notes

- **Fable MUST-FIX 1 (`Teachers.tsx:78` vs `:143`), resolved:** dropped the `:78` edit. `:30, :78, :143` all stay, as none is false (`traits.ts:11`, `animalBoard.ts:167`, `AnimalSheets.tsx:373`).
- **Fable MUST-FIX 2 (`:128`, re-read `:120`), resolved:** delete both bullets. Any rewording still implies a stored round, and "nothing is saved" would contradict the linked policy until F4 is answered. `:129` stays true (23 old rows under 3 accounts).
- **Fable MISSED (`Home.tsx:80`), resolved:** "credited in the game", true of guide, round end and journal.
- **Fable SHOULD-CONSIDER 1 (`:87`), adopted:** mechanism removed. The sentence is true without it, and the brief limits feature mentions.
- **Fable SHOULD-CONSIDER 2 (build runs typecheck), adopted differently:** `npm run build` inherits stdio, so progress shows and no usage text is needed.
- **Fable SHOULD-CONSIDER 4 (lowercase hits), adopted:** one `jq` line among the mission's checks, no repo code.
- **Astra SHOULD-CONSIDER 1 (capture commit), adopted:** manifest `commit` is the merge-base with `origin/main`; a retake's header takes it, replacing the fixed pin.
- **Astra SHOULD-CONSIDER 2 (validate manifests), adopted:** a few lines in `convert.mjs`. Partial reruns are a designed path and `SHOTS_DIR` persists, so mixing was possible.
- **Astra SHOULD-CONSIDER 3 (pool hash), adopted:** one line in `take.mjs`, one field in convert's check, one token in the header. The on-camera run already saved the pool by hand; its two copies hash the same, so no false alarm is expected.

## Steps

One step per session. Run everything from the worktree root; heavy jobs one at a time. Line numbers in the Architecture are the base's: find by text if a step has moved them.

**Setup, every session:**
```
M=/srv/critter-ai/agent-state/missions/site-shots-refresh
export CHROME_PATH=/srv/critter-ai/agent-state/missions/cc-website/bin/chrome SHOTS_DIR=$M/shots/raw
ss -ltn | grep -E ':(3105|3106)\b'   # must print nothing. 3106 busy: SHOTS_PORT=3107 or higher. Never 3100 or 3101
```

**Site check** (must exit 0, all checks pass, 20 screenshots):
```
npm run typecheck && npm run lint && npm run site:build
python3 -m http.server 3105 -b 127.0.0.1 -d out/site > $M/serve.log 2>&1 & S=$!
E2E_SITE_URL=http://localhost:3105 npm run e2e:site; R=$?; kill $S; [ $R = 0 ]
```
Then keep one intermediate run (disk): `L=$(ls -td e2e-artifacts/*-site | head -1); rm -rf $M/e2e-s[0-9]*; mv "$L" $M/e2e-s<n>; rm -rf e2e-artifacts/*-site`.

**Rows count** (read only; twice in the mission, both in S2):
```
U=$(sed -n 's/^DATABASE_URL=//p' .env.local | tr -d "\"'" | sed -E 's/[?&]pgbouncer=true//')
printf 'BEGIN READ ONLY;\nSELECT count(*) FROM clue_match_solves;\nCOMMIT;\n' | psql "$U" -qAt
```
Never `source .env.local`: its URL has an unquoted `&`, so the shell backgrounds it and prints the password. Never echo `$U`.

- [x] S1. **Move and fix the scripts; prove them with no rounds played.** Files: new `scripts/shots/run.mjs`, `take.mjs`, `convert.mjs`; `package.json` (the `site:shots` script only, no lockfile change). Copy `take.mjs` and `convert.mjs` from `/srv/critter-ai/agent-state/missions/cc-website/shots/` (F2's line numbers are that `take.mjs`'s; the originals stay). Apply every F2 row, then Target design (`run.mjs`, `take.mjs`, `convert.mjs`, env table, manifest fields). F7: plain `sharp` import, no new dependency. Check the port before the build, so a busy port fails at once. No `src/site` change. Check:
  - typecheck, lint.
  - `npm run site:shots -- start`: exit 0; `$SHOTS_DIR` has `globe`, `board-phone`, `hero-board`, `og` PNGs and `start.json`; `jq '{commit, pool, writes, themes: [.shots[].theme]}' $SHOTS_DIR/start.json` shows commit `1a781de4…`, a 10-hex pool, `writes: []`, all `light`. View `hero-board.png`: no how-to dialog. `ss -ltn` shows 3106 free afterwards.
  - `npm run site:shots -- convert`: non-zero (no `play.json`); `git status --short src/site` empty.
  - `python3 -m http.server 3107 -b 127.0.0.1 >/dev/null 2>&1 & H=$!; SHOTS_PORT=3107 npm run site:shots -- start; echo $?; kill $H`: non-zero at once.
  - `git status --short`: only the S1 files; restore anything else (e.g. `tsconfig.json`, `next-env.d.ts`).
- [x] S2. **Retake.** Files: `src/site/shots/*.webp`, `src/site/og.png`; `scripts/shots/take.mjs` only if a scripted step needs adapting (Brief's decision rules; record why under **Decisions**). Do:
  ```
  rm -rf $SHOTS_DIR; mkdir -p $M/shots/old
  # Rows count: "before <n>" into $M/db-counts.txt
  npm run site:shots 2>&1 | tee -a $M/shots/retake.log   # on a failed run: fix, rerun with the same tee -a; every run's rounds count
  # Rows count: "after <n>" into $M/db-counts.txt
  for f in src/site/shots/*.webp src/site/og.png; do git show 1a781de4:$f > $M/shots/old/$(basename $f); done
  cp /srv/critter-ai/agent-state/missions/site-shots-on-camera/shots/contact.mjs $M/shots/contact.mjs   # adapt only if a shot name changed
  node $M/shots/contact.mjs $M/shots/old $M/shots/contact.png
  ```
  Check:
  - Site check (`$M/e2e-s2`).
  - Hash loop (Architecture, **Hashes**), `| tee $M/hash-check.txt`: no `MISSING`, no `STALE`.
  - `jq '{commit, pool, writes, rounds: (.rounds | length)}' $SHOTS_DIR/play.json`: commit `1a781de4…`, `writes: []`, about 2 rounds, cap 4. `grep 'rounds played' $M/shots/retake.log` is the mission's total.
  - Counts: 188 → 188 expected. A difference means the owner shipped a save: record it under **Decisions**.
  - `git status --short`: only the shots, `og.png` and any `take.mjs` fix; restore anything else.
- [x] S3. **Make `shots.ts` true, by eye.** Files: `src/site/shots.ts`; `src/site/config.ts` (`OG_IMAGE.alt`, only if false). View all 10 PNGs in `$SHOTS_DIR` against their alts, with the manifests' `ids`, `text` and `clue`. Apply F5: the header (Target design: date, `origin/main <commit>`, `pool <hash>`, from the manifests), the `fieldGuide` and `heroBoard` alts, and F5's re-verify list; `photos` must equal the animals shown. A shot that's plainly wrong (mid-flash, stray UI): fix `take.mjs`, then `npm run site:shots -- play convert 2>&1 | tee -a $M/shots/retake.log` (or `start convert`), and rerun the hash loop and contact sheet. Write `$M/shots/eye-check.txt`, one line per shot: alt true, `photos` match, no "Camera saw". Check:
  - typecheck, lint, `npm run site:build` (fails on a bad photo id).
  - `grep -cF 'a board of gems with five animal cards pinned on it' out/site/index.html` ≥ 1; the header's commit and pool equal `jq -r '.commit[:8], .pool' $SHOTS_DIR/play.json`.
- [x] S4. **Crops.** Files: `src/site/pages/Home.tsx`, `src/site/pages/Teachers.tsx` (class strings and the comment at `Teachers.tsx:40-42` only). Go through F6 row by row. `board` in the manifests is CSS px: `boardTop` for `Teachers.tsx:52` is grid-marked's in `play.json`, for `Home.tsx:39` board-phone's in `start.json`. The rest by eye. Keep classes literal so Tailwind sees them. Check: Site check (`$M/e2e-s4`), then view `site-home-*-light.png` and `site-teachers-*-light.png` at 390 and 1440 (crop with `sharp` if a full page is too small to read): each image shows F6's "Must show", and nothing is cut mid-element.
- [x] S5. **Copy.** Files: `src/site/pages/Teachers.tsx`, `src/site/pages/Home.tsx`. Apply F3's 11 rows, using the exact "after" text, and touch no other words. If an edit must differ, record before, after and why under **Decisions**. Check: Site check (`$M/e2e-s5`); view `site-teachers-1440-light.png` where the bullets went; then, printing nothing:
  ```
  for s in 'the full record' 'each round-end card lists' 'Every source is on' 'The round-end card has everything needed' 'finds nothing' 'then clear gems next to them' 'Check each animal' 'credited on every card' 'on more than one device' 'Finished rounds are saved' 'to sync their Field Journal' 'mystery' 'Camera saw'; do grep -lF "$s" out/site/index.html out/site/teachers/index.html; done
  ```
  (Privacy keeps "Finished rounds are saved": F4.)
- [x] S6. **Handoff for F4.** File: `/srv/critter-ai/handoff/critter-connect.md` (outside git), under `## Open`, above `## Closed`. Use the next free number (H7 unless taken; H6 is the password item, see **Decisions**). Add this item, unindented:
  ```
  ### H7 · Privacy and Terms no longer match the game: restore the save, or rewrite them?
  Status: waiting on you
  From: site-shots-refresh · <today, UTC>
  Blocks: nothing yet

  **Why:** The game has saved no rounds since plan 044 (nothing sends `POST /api/clue-game/solves`; newest row 2026-10-01) and shows no per-fact sources. So Privacy's "Finished rounds are saved…" and "Our database keeps… your game results", and Terms' "sources shown on each reveal card", overstate what happens. The mission left both pages alone, since overstating what's kept is the safer direction, and removed the same claims from the Teachers page.

  **Steps:**
  1. Read https://critterconnect.org/privacy/ (`src/site/pages/Privacy.tsx:19, :29`) and https://critterconnect.org/terms/ (`src/site/pages/Terms.tsx:13`).
  2. Decide the save. Restore it: game work, Privacy is true again, and what this mission removed at `Teachers.tsx:24, :120, :128` comes back (plan `plans/2026-11-01-site-shots-refresh.md`, F3, F4). Or rewrite: an agent edits Privacy to say new rounds aren't kept and old results remain (23 rows under 3 accounts).
  3. Decide the Terms line. Reword it (the game now shows only a Red List link, in the journal), or bring per-fact sources back (game work).

  **Your reply:**
  - Save: restore, or rewrite the policy
  - Terms line: reword, or bring sources back
  ```
  Check: `grep -c '^### H7 ' /srv/critter-ai/handoff/critter-connect.md` is 1, and the item sits above `## Closed` with `Status: waiting on you`. Typecheck and lint (no repo change expected, so they must still pass).

- [x] S7. **Astra MUST-FIX 1: a signal leaves Chrome behind.** File: `scripts/shots/run.mjs:42`. Its handler registers first and calls `process.exit(130)` at once, so `cdp.mjs`'s later handler (kills Chrome, removes the profile) never runs. Defer the exit: `process.on(signal, () => setImmediate(() => process.exit(130)))`, with a one-line comment why. Listeners run in one synchronous emit, so `cdp.mjs`'s runs and exits when a browser is up; with none, the deferred exit fires; `run.mjs`'s `exit` handler still kills the server. No `cdp.mjs` change. Check, in a scratch dir so the real shots stay put: `SHOTS_DIR=/tmp/shots-sig SHOTS_PORT=3106 node scripts/shots/run.mjs start` in the background; once `/tmp/shots-sig/globe.png` exists, `kill -TERM` the node pid. Then: exit 130, no Chrome with this run's profile (`pgrep -af chrome` empty of it, no new `/tmp/cc-e2e-*` profile dir left), nothing on 3106. `start` plays no rounds. Typecheck and lint. `rm -rf /tmp/shots-sig`.
- [x] S8. **Astra MUST-FIX 2: a killed rerun passes `convert`.** File: `scripts/shots/take.mjs`. The manifest is written only in `finally`, which a kill skips, so the old manifest vouches for partly overwritten PNGs. At the top of `take()`, before any capture: `rmSync(path.join(outDir, `${mode}.json`), { force: true })` (import `rmSync`). Check, on a copy so the real shots stay put: `cp -r $SHOTS_DIR /tmp/shots-kill`, `SHOTS_DIR=/tmp/shots-kill node scripts/shots/run.mjs start` in the background, `kill -TERM` its node pid once `globe.png` is newer than the copy. Then `start.json` is gone, `SHOTS_DIR=/tmp/shots-kill node scripts/shots/run.mjs convert` exits non-zero, and `git status --short` shows no change in `src/site/`. Typecheck and lint. `rm -rf /tmp/shots-kill`.

## Verification

Runs on the final commit, after the Astra code review, with the Steps' Setup. No retake unless a check below demands it. Full game E2E not run (Brief): the shots' own play-through is `npm run site:shots`.

**E2E first.**
1. `git status --short` empty (`check-game-css` reads what's committed).
2. Site check, then `rm -rf $M/e2e-s[0-9]* $M/e2e-site; mv "$(ls -td e2e-artifacts/*-site | head -1)" $M/e2e-site`. Scenario: every page in `config.ts`, phone and desktop, light and dark (axe, one h1, landmarks, meta tags and `og.png` served, Play links, class link, no console errors, same-origin only). Must show: typecheck, lint and site:build exit 0; all checks pass; 20 screenshots. Baseline was 444/444; explain any count change.

**Then:**
3. Hash loop (Architecture, **Hashes**), `| tee $M/hash-check.txt`: no `MISSING`, no `STALE`; a same hash only for a byte-identical shot (record it as retaken, unchanged).
4. The Architecture's three "Camera saw" lines: first two print nothing; the `jq` list goes in the Summary.
5. `node scripts/check-game-css.mjs "$(git merge-base HEAD origin/main)" 2>&1 | tee $M/check-game-css.log`: exit 0. The merge-base keeps an owner's style commit on `main` from failing it before the rebase; after the rebase it's the new base.
   **Changed at final Verification (see Decisions):** the repo script fails on every branch, so the check is `node --input-type=module - "$(git merge-base HEAD origin/main)" /tmp/cc-game-css-fixed < /srv/critter-ai/agent-state/missions/site-shots-refresh/check-game-css.both-sides.mjs`, from the worktree root: exit 0, byte-identical. Run the repo script too, for the record.
6. Only allowed files changed; prints nothing:
   ```
   git diff --name-only "$(git merge-base HEAD origin/main)" HEAD | grep -vE '^(plans/|scripts/shots/|package\.json$|src/site/(shots/[^/]+\.webp|og\.png|shots\.ts|config\.ts|pages/(Home|Teachers)\.tsx)$)'
   ```
   And `git status --short` still empty (no Next side effects left behind).
7. S5's fragment loop prints nothing. The `shots.ts` header's commit and pool equal both manifests'.
8. `$M/shots/eye-check.txt` has all 10 shots and matches the final `shots.ts`; redo the line of any shot or alt changed since S3. Rerun `node $M/shots/contact.mjs $M/shots/old $M/shots/contact.png` and view it: old row over new, 10 columns.
9. `$M/db-counts.txt` has before and after (no new read). Total rounds: `grep 'rounds played' $M/shots/retake.log`.

**Artifacts,** all in `$M` (`/srv/critter-ai/agent-state/missions/site-shots-refresh/`):
- Brief's two: `shots/contact.png` and `e2e-site/report.json` (plus its screenshots).
- Evidence: `shots/raw/` (PNGs, `play.json`, `start.json`), `shots/eye-check.txt`, `shots/retake.log`, `hash-check.txt`, `db-counts.txt`, `check-game-css.log`.

**To reproduce:** Setup, `npm run site:shots`, then Site check. Same `pool` hash in `play.json` means same deals.

**PR body and Summary.** Write `$M/pr-body.md` in the shape of `/srv/critter-ai/agent-state/missions/site-shots-on-camera/pr-body.md`; the release opens the PR with it. Both give, per the Definition of done:
- `Closes #37`; the base commit.
- The shot list, before → after (hash and KB, from `hash-check.txt`; what changed).
- Every copy change before → after with its proof (F3, plus any in **Decisions**).
- Rounds played on the live database and rows added.
- Production content build: not needed unless `db/content` changed (Architecture, **Release**).

The Summary also carries the Architecture's "For the Summary, out of scope" list and the `jq` list.

**Release smoke** (for `## Release`; the rebase rule is in the Architecture's **Release**):
```
for p in / /teachers/; do curl -sfL -o /tmp/live.html -w "$p %{http_code}\n" "https://critterconnect.org$p"
  grep -oE '/site/[a-zA-Z0-9-]+\.[0-9a-f]{10}\.(webp|png)' /tmp/live.html | sort -u | while read -r u; do h=${u%.*}; h=${h##*.}; grep -qF " -> $h" $M/hash-check.txt || echo "OLD $u"; done; done
curl -sfL -o /dev/null -w 'play %{http_code}\n' https://play.critterconnect.org/
```
Must show: three 200s, no `OLD`.

**Risks / open questions**
- **`play` is first run for real in S2,** since S1 plays nothing. F2 says the move path may differ; the Brief's decision rules cover it. A timing failure with critwire missions on the same 2 CPUs: rerun once, and the rounds still count.
- **The pool can change mid-mission** if the owner runs a content build. `convert.mjs` refuses mixed manifests; a change after S3 falls under the Architecture's rebase rule.
- **Disk:** 9.1 GB free, shared. Site check keeps one intermediate `e2e-s*`. Check `df -h /` if a build fails.
- **Shot text checks are DOM text plus eye:** no OCR here (F7).
- No open questions for the owner beyond H6 (password) and H7 (Privacy/Terms); neither blocks anything.

## Code review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. `scripts/shots/run.mjs:42` — Immediate `process.exit(130)` prevents the later signal handlers in `cdp.mjs` from cleaning up Chrome. SIGTERM leaves the browser and temporary profile behind. Coordinate browser/server cleanup before exiting.
2. `scripts/shots/take.mjs:223` — Manifests are replaced only in `finally`, while PNGs are overwritten throughout capture. An interrupted rerun leaves old manifests validating partially replaced images; `convert` accepts them because dimensions still match. Invalidate the previous manifest before writing any captures.

SHOULD-CONSIDER:
1. `scripts/shots/take.mjs:81` — Check `naturalWidth > 0` alongside `img.complete`; failed image downloads also report complete and can silently produce missing-photo screenshots.

## Release

## Decisions

- **Password exposure (H6), 2026-11-01:** at the Steps stage the planner ran `. ./.env.local` to test the row count, and the shell printed the live `DATABASE_URL`, with its password, into that subagent's tool output. Checked by file name only: one transcript on the VPS holds it, not git, the plan or the mission's state folder. Rotation is the owner's call (live server, WSL, QGIS), so H6 asks; the mission goes on. Plan's **Rows count** now reads the URL with `sed`, and says never to source that file. Privacy/Terms item moved to H7.
- **Crops (S4):** `Home.tsx:55` is `object-bottom`, not a tuned %: the only crop with the whole board and the whole hint sentence; 70% cut the bottom gem row and a card, 86% cut the sentence. One grid row shows (Indri), still "part of grid". `Home.tsx:39` stays 84% (`760/908` = 83.7%; board top 380 in `start.json`). Journal crop shows only the Aye-aye; the alt names both finds, true of the shot file, left as is (same since base).
- **Astra code review (2026-11-02):** both MUST-FIX items are real, checked against the code: S7 (`run.mjs` handler registers before `cdp.mjs`'s and exits first), S8 (`finally` doesn't run on a kill; `convert`'s `check` only compares dimensions). The SHOULD-CONSIDER goes in the Summary, unchanged in code.
- **`check-game-css` (final Verification):** Verification's step 5 fails, exit 1, and the fault is the check's, not this branch's. `scripts/check-game-css.mjs` compiles the base with `src/site` and HEAD without it, written before the site reached `main`. Control, same logic with HEAD replaced by the base, so no branch change: exit 1, same two hashes. With `src/site` out of both sides: exit 0, byte-identical (`0630ca48…`, 52396 bytes). `git diff` of `src` outside `src/site` is empty. So step 5 is met in intent, not as written. The script is left unfixed: outside the Brief's scope and step 6's allowed files. Reported in the Summary and PR. Evidence: `check-game-css.log`, `check-game-css.both-sides.mjs` in the state folder.

## Log

- 2026-11-01 23:24 UTC: Baseline. typecheck, lint, unit 48/48, site:build, e2e:site 444/444 pass; full game E2E skipped per brief.
- 2026-11-01 23:39 UTC: Architecture written. Lead confirmed by grep that no client POSTs a solve (F1). 12 false copy statements, take.mjs breaks found, design `npm run site:shots`. No code changed; typecheck/lint n/a.
- 2026-11-01 23:43 UTC: Fable review: APPROVE_WITH_CHANGES, 2 must-fix (`Teachers.tsx:78`, `:128` edits), for Revision. No code changed; typecheck/lint n/a.
- 2026-11-01 23:44 UTC: Astra review: APPROVE, no must-fix, 3 should-consider. No code changed; typecheck/lint n/a.
- 2026-11-01 23:49 UTC: Revision. Fable's 2 must-fix and 1 missed resolved (`Teachers.tsx:78` kept, `:120` and `:128` deleted, `Home.tsx:80` reworded); 6 should-consider adopted, 1 in a different form. Lead checked the diff against `Teachers.tsx`. No code changed; typecheck/lint n/a.
- 2026-11-01 23:55 UTC: Steps. Planner wrote S1-S6 and Verification. Planner printed the live DB password to its tool output while testing a count; H6 added, nothing in git. No code changed; typecheck/lint n/a.
- 2026-11-02 00:01 UTC: S1. Moved take/convert to `scripts/shots/` with `run.mjs`, `npm run site:shots`; F2 fixes, manifests. typecheck, lint pass; `start` exit 0 (4 shots, commit 1a781de4, pool 2207354486, writes [], all light, no how-to, 3106 free after); `convert` refuses with no play.json, src/site untouched; busy port fails at once. No rounds played.
- 2026-11-02 00:07 UTC: S2. Retook all 10 shots from 1a781de4 (pool 2207354486), `take.mjs` unchanged. 2 rounds played, 0 API writes, `clue_match_solves` 188 -> 188. typecheck, lint, site:build pass; e2e:site 444/444, 20 screenshots (`e2e-s2`); hash loop: all 10 changed, no MISSING, no STALE. Contact sheet viewed; shot-by-shot eye check is S3.
- 2026-11-02 00:09 UTC: S3. Viewed all 10 shots against alts and manifests; no retake. `shots.ts` header (2026-11-02, 1a781de4, pool 2207354486, `npm run site:shots`); `fieldGuide`, `heroBoard`, `roundEnd` alts reworded; other alts, `photos`, `ROUND_1`, `OG_IMAGE.alt` already true. typecheck, lint, site:build pass; new hero alt in `out/site/index.html`; header matches manifest. `eye-check.txt` written.
- 2026-11-02 00:13 UTC: S4. Crops: `Teachers.tsx` hero `md:aspect-[780/760]` + comment (board top 380), round-end `object-[50%_70%]` on both pages, `Home.tsx:55` `object-bottom`; other crops already fit. typecheck, lint, site:build pass; e2e:site 444/444, 20 screenshots (`e2e-s4`). Home and Teachers viewed at 390 and 1440: every crop shows F6's must-show.
- 2026-11-02 00:14 UTC: S5. Applied F3's 11 copy rows verbatim (`Teachers.tsx` 9, `Home.tsx` 2). typecheck, lint, site:build pass; e2e:site 444/444, 20 screenshots (`e2e-s5`). Teachers 1440 viewed where the bullets went: both privacy lists read clean. Stale-fragment loop prints nothing.
- 2026-11-02 00:15 UTC: S6. Handoff H7 added (Privacy/Terms vs game), above `## Closed`, `waiting on you`; line refs and no-client-POST rechecked. typecheck, lint pass; no repo change but this plan.
- 2026-11-02 00:18 UTC: Astra code review: APPROVE_WITH_CHANGES, 2 must-fix, both real, added as S7 and S8; 1 should-consider for the Summary. No code changed; typecheck/lint n/a.
- 2026-11-02 00:19 UTC: S7. `run.mjs` signal exit deferred so `cdp.mjs` cleanup runs. SIGTERM on `start` in scratch dir: exit 130, no Chrome of this run, no new profile dir, 3106 free; no rounds played. typecheck, lint pass.
- 2026-11-02 00:22 UTC: S8. `take()` removes its manifest before any capture. SIGTERM on `start` in a scratch copy after `globe.png` was rewritten: exit 130, `start.json` gone, `convert` exits 1 (ENOENT), `src/site` unchanged, 3106 free, no Chrome or profile left; no rounds played. typecheck, lint pass.
- 2026-11-02 00:24 UTC: Final Verification. typecheck, lint, site:build exit 0; e2e:site 444/444, 20 screenshots (`e2e-site/`). Hash loop clean, all 10 changed. No "Camera saw" in site or shot text. Only allowed files changed; fragment loop clean; header = manifests; eye-check current; contact sheet viewed. Repo's `check-game-css` exits 1 (its own flaw, see Decisions); with `src/site` out of both sides, byte-identical. origin/main still 1a781de4, live pool unchanged. Summary and `pr-body.md` written; status done.

## Summary

Done, ready for release. PR body: `/srv/critter-ai/agent-state/missions/site-shots-refresh/pr-body.md`.

**Base:** `1a781de4` (origin/main; still the tip at final Verification), pool `2207354486`, same as live. No retake needed by the rebase rule so far.

**Verification (final commit):** typecheck, lint, site:build exit 0. `e2e:site` 444/444, 20 screenshots. Hash loop clean, no "Camera saw" in `out/site` or shot text (case-sensitive), every shot checked by eye. **Not as written:** Verification step 5, `scripts/check-game-css.mjs`, exits 1 on this branch, and on any branch: it keeps `src/site` in the base and drops it from HEAD. Run with `src/site` out of both sides, the game's stylesheet is byte-identical (Decisions). Full game E2E not run (Brief).

**Artifacts** in `/srv/critter-ai/agent-state/missions/site-shots-refresh/`: `shots/contact.png`, `e2e-site/report.json` + screenshots, `shots/raw/`, `shots/eye-check.txt`, `shots/retake.log`, `hash-check.txt`, `db-counts.txt`, `check-game-css.log`. Reproduce: Steps' Setup, `npm run site:shots`, then Site check.

**Live database:** 2 rounds played, 0 API writes, `clue_match_solves` 188 → 188.

**Production content build:** not needed. No `db/content` change; the site image bakes `out/site` with no database.

### Shots

| File | Old → new hash | KB | What changed |
|---|---|---|---|
| globe.webp | 22d18d99d9 → cea5338469 | 30 → 31 | Same view, re-rendered; no game copy on screen |
| board-phone.webp | 99a0cf755b → a642766bbb | 93 → 96 | "On camera" row, new opener, new grid cells |
| hero-board.webp | 5acfa0bf7c → f595333063 | 88 → 90 | Same changes, desktop |
| field-guide.webp | d856843b5e → a84c9b5c6c | 77 → 86 | "On camera" row, new guide buttons ("It's this one!") |
| grid-marked.webp | 0f17a5c718 → 31e346ca09 | 91 → 95 | "On camera" row, new notes and marks |
| witness-note.webp | bdd4c545c8 → 7a10b8a14a | 78 → 82 | "On camera" row |
| round-end.webp | 2a44fde426 → e3744f20ba | 62 → 92 | Round end now on the board: replay grid above the card |
| journal.webp | 30b1f42e0f → 17a817ffe1 | 79 → 75 | Current journal text |
| globe-found.webp | 2777d9d121 → a99605a364 | 35 → 35 | Same view, re-rendered |
| og.png | 37a7c2b1ac → 39381c1050 | 95 → 94 | "On camera" row, new opener |

Crops: `Teachers.tsx` hero `md:aspect-[780/750]` → `[780/760]`; round-end `object-[50%_40%]` → `[50%_70%]` on both pages; `Home.tsx` board-phone `object-[50%_70%]` → `object-bottom`.

### Copy changes

| Where | Before → after | Proof |
|---|---|---|
| `Teachers.tsx` FAQ, accounts | "Signing in is optional; it keeps a player's Field Journal on more than one device." → "Signing in is optional." | No client sends a solve: only `getJson` fetches (`src/lib/getJson.ts:8`); `POST /api/clue-game/solves` has no caller; `useJournal.ts:42` only reads old solves |
| `Teachers.tsx` FAQ, accuracy | "…the IUCN Red List first, and each round-end card lists its sources. Traits…" → "…the IUCN Red List first. Traits…" | `RoundEndSheet` (`AnimalSheets.tsx:503-662`) has no sources; `SourceLine` has no caller |
| `Teachers.tsx` how it works | "Students compare them with each animal's field guide and rule out the ones that can't be it, then clear gems next to them to release them." → "Students compare each animal's scouted answers with the camera's and rule out the ones that can't be it. A ruled-out animal wanders off the board, or clearing a gem next to it releases it at once." | Guide hides the round's question traits while playing (`AnimalSheets.tsx:86, :96`, `clueFaces.ts:37`); comparison is in the grid (`AnimalSheets.tsx:711`); wander on (`animalBoard.ts:59, :368`) |
| `Teachers.tsx` how it works | "The round-end card shows the full record: the family tree, the range map and the sources." → "The round-end card shows the family tree and the animal's field notes, and the grid above it replays the evidence." | Tree `AnimalSheets.tsx:590-596`, notes `:625-639`; `RangeMap` only in `JournalSheet.tsx:66` |
| `Teachers.tsx` evidence | "one who matches without reasoning finds nothing" → "one who matches without reasoning finds about one round in five" | `nameIt` (`animalBoard.ts:405`); `plans/053-name-it.md:17, :25` |
| `Teachers.tsx` tips | "The round-end card has everything needed." → "The grid and the round-end card have everything needed." | Answers are in the replay grid outside the card (`AnimalSheets.tsx:536-537`, `EvidenceGrid.tsx:204`) |
| `Teachers.tsx` privacy | deleted "Finished rounds are saved with no link to the player." | No round is saved (as the first row) |
| `Teachers.tsx` privacy | deleted "The game keeps the player's results, to sync their Field Journal between devices." | New results aren't kept; `journal/route.ts` only reads old rows |
| `Teachers.tsx` sources | deleted "Every source is on the round-end card." | As the second row |
| `Home.tsx` how it works | "Check each animal's field guide against the answers. Rule out the wrong one and it escapes." → "Compare each animal's answers with the camera's. Rule out the one caught on camera and it escapes." | As the third row; wording from `AnimalSheets.tsx:712` |
| `Home.tsx` sources | "credited on every card" → "credited in the game" | Credits in guide and round end (`AnimalSheets.tsx:203, :576`) and journal (`JournalSheet.tsx:70`); pinned cards have none (`AnimalCard.tsx`) |

Alt text, in `src/site/shots.ts`:
- `heroBoard`: "A round on a computer: the board of gems with five animal cards pinned on it, the evidence grid beside it" → "A round: a board of gems with five animal cards pinned on it". The phone `<picture>` crop shows no grid.
- `fieldGuide`: "…its signs and its answers to the questions" → "…its signs and the questions still to scout". At round start nothing is answered.
- `roundEnd`: "…with its family tree and the evidence lined up" → "…with its family tree, under the grid showing which answers differ from the camera's". The evidence moved onto the board.
- `ROUND_1`, `OG_IMAGE.alt`, photo credits, other alts: re-checked by eye, already true, no edit.

### Out of scope, noticed

- **`scripts/check-game-css.mjs` fails on every branch** since the site reached `main`. Fix: `tree(base, [...deleted, 'src/site'])`.
- Game saves nothing since plan 044; the route, `parseSolveReport` and `LogEntryText`'s `SourceLine` are dead. Stale: `docs/CLUE_MATCH.md:10, :24, :45, :74`, `src/proxy.ts:3`, `~/AGENTS.md`'s "add rows". Privacy and Terms: H7.
- No per-fact sources anywhere in the game now, only the Red List link (`JournalSheet.tsx:60-64`). Paper `:228, :268` still claims them.
- Lowercase "camera saw": `AnimalGame.tsx:414`, `AnimalSheets.tsx:581, :696`, `JournalSheet.tsx:43`. In shot text (`jq`): play round-end, play journal. Journal's is in the DOM under the sheet, not visible.
- `animalBoard.ts:54-56` comment understates careful (91-95%, now 97-98%).
- `e2e.mjs:76` hard-codes the how-to key and duplicates the pill helpers.
- VPS `.env.local` has `?pgbouncer=true`, which `AGENTS.md` says not to add. App strips it (`src/db/index.ts:10-14`); `psql` rejects it.

**Waiting on the owner, blocking nothing:** H6 (rotate the live DB password), H7 (Privacy/Terms), H4 (older).

Astra's should-consider, not done: `scripts/shots/take.mjs:81` `imagesLoaded` checks `img.complete` only, and a failed image download also reports complete, so a missing photo could reach a shot unnoticed (this retake's shots were checked by eye). Adding `naturalWidth > 0` would catch it.
