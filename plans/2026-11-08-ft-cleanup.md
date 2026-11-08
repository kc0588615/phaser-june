---
mission: ft-cleanup
project: critter-connect
branch: agent/ft-cleanup
status: active
started: 2026-11-08 21:26 UTC
---

# Mission: Farms & towns constants removed (Critter Connect)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

The code no longer knows the `artificial` habitat class: removed from `HABITAT_CLASSES` (`src/clueGame/traits.ts`, which drops it from `COMPLETE_PREFIXES`), its entries in `src/clueGame/questionMatch.ts` (question, short and column texts), its 🏡 face in `src/clueGame/clueFaces.ts` (free again), and its `profiles.ts` guide-line texts (the class line and the 7 `artificial:` kind lines). `isHandWrittenClue` and the reserved-tag check stay as they are: they read `COMPLETE_PREFIXES`, so they follow the shorter class list by themselves. No content change; `rg -n "artificial" src db/content` finds nothing.

### Why

Plan 055 removed Farms & towns from content but kept these constants so the live game wouldn't misread the old rows between its deploy and the owner's production content build (clue audit's `isHandWrittenClue` trap). Once prod holds no `artificial` rows, they're dead code.

### Scope

In:
- `src/clueGame/traits.ts`, `questionMatch.ts`, `clueFaces.ts`, `profiles.ts`; `docs/CLUE_MATCH.md` / `CONTEXT.md` if they still mention it; plan `plans/056-ft-cleanup.md` (new; or the next free number).

Out:
- Content files, the database, any other rule. No `ANIMAL_RULES.version` bump (nothing a round deals changes: no row holds the class).

### Definition of done

- Before any code: confirm the live rows hold no Farms & towns, one light read-only query through `.env.local`: `select count(*) from species_deduction_clues c, unnest(c.compare_tags) t where t = 'habitat:artificial' or t like 'artificial:%'` (`src/db/schema/species.ts:20-25`) = 0. If not 0, stop and add a handoff item: the owner's content build hasn't reached prod.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run content -- preview` exit 0.
- `npm run e2e:fresh` passes **against the dev copy `phaser_june_dev`, never `.env.local`**, with the same guarded block plan 055 used (`plans/2026-11-08-moves-and-signs-build.md`, V3: export `/srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy`, check `current_database()` is `phaser_june_dev`, then run it; `CHROME_PATH` = the no-sandbox wrapper from `/srv/critter-ai/agent-state/missions/moves-and-signs-build/`). The dev copy already holds 055's content, so no content build is needed. Never print `DATABASE_URL` or any connection string, and never `cat` that file.
- Release `deploy`; smoke `/explore` 200 and `version.txt` = the merge commit.

### Decision rules

- Delete only what names `artificial`; anything else that looks dead is a note in the plan, not an edit.

### Notes

- The owner ran the production content build for 055 on 2026-11-08 (handoff H10, `done`): 2478 clues, 491 facts, 0 citation warnings, on main `36dc1a5d` (PR #66). The 11-minute pool cache (`src/app/api/clue-game/pool/route.ts:13`) has long passed; the live-rows query above is still the gate.
- The sites, as of `36dc1a5d` (checked by the control room): `traits.ts:31`, `questionMatch.ts:158,178,214`, `clueFaces.ts:15`, `profiles.ts:98` and `:144-150`. Re-read them on `origin/main`.
- Plan numbers on main go to `055`, so this is `056`.
- One session.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none): none needed
- [x] Steps: `planner` writes Steps and Verification

## Baseline

From `agent/ft-cleanup` @ `cd1d6007` (= `origin/main` `36dc1a5d` + mission start). `node_modules` present; no migrations in this repo.
- **Gate (live `phaser_june`, read-only):** `Farms & towns` tags in `species_deduction_clues.compare_tags` = **0** (of 2478 clue rows). Prod content build reached prod; proceed. psql needs the URL's `pgbouncer` param stripped (as `scripts/connect.ts` does).
- `npm run typecheck` 0, `npm run lint` 0, `npm test` 66/66 pass, `npm run content -- preview` 0.
- `npm run e2e:fresh` on dev copy (`current_database()` guard = `phaser_june_dev`, no-sandbox Chrome wrapper): **1565/1565 checks**, seed 7. Artifact `/srv/critter-ai/agent-state/missions/ft-cleanup/baseline-e2e/`.
- `rg -n artificial src db/content`: 13 lines, exactly the brief's sites (`traits.ts:31`, `questionMatch.ts:158,178,214`, `clueFaces.ts:15`, `profiles.ts:98,144-150`); none in `db/content`.

## Architecture

Read on `agent/ft-cleanup` = `origin/main` `36dc1a5d` + plan commits (`git fetch` 2026-11-08; `git diff origin/main HEAD` touches only this plan). `git grep -i artificial origin/main` outside `plans/` and `docs/research/`: 14 lines = the 13 code lines below + `docs/CONTENT_SOURCES.md:25`.

### Findings

**F1. Dead `artificial` constants (the brief's work).** KISS: they describe a class no content or live row holds (Baseline: `rg` 0 in `db/content`; live gate 0, which counts `habitat:artificial` and `artificial:%`). Fix: delete them. Exactly:
- `src/clueGame/traits.ts:31`: `'artificial'`, the last item of `HABITAT_CLASSES` (`COMPLETE_PREFIXES`, `:34`, spreads it and follows).
- `src/clueGame/questionMatch.ts:158` (`QUESTION_TEXT`) and `:178` (`SHORT_TEXT`): whole lines. `:214` (`COLUMN_LABEL`): only `, 'habitat:artificial': 'Farms & towns'`; `'habitat:marine': 'Coasts & sea',` stays on the line.
- `src/clueGame/clueFaces.ts:15`: only `, 'habitat:artificial': '🏡'`; 🏡 is used nowhere else (`rg`).
- `src/clueGame/profiles.ts:98` (`HABITAT_TEXT` class line) and `:144-150` (`HABITAT_KIND_TEXT`, 7 `artificial:` kind lines): whole lines.

**F2. Verification gap (note, no edit).** `npm run content -- preview` exits 0 even when it prints `PROBLEM` lines (`scripts/content.ts:77-89` only logs; `build` throws at `:131-132`). So "preview exits 0" proves nothing alone: Verification must also check the output.

Everything else in scope is fine; consumers checked below.

### Consumers: removal compiles and changes nothing for content without `artificial`

- **No union-keyed records, no exhaustiveness, no positions.** `HABITAT_CLASSES` has one consumer, `traits.ts:34` (spread into a `Set`, so order doesn't matter); no `typeof HABITAT_CLASSES[number]` type exists (`rg HabitatClass`: none). `QUESTION_TEXT`, `SHORT_TEXT`, `COLUMN_LABEL` (`questionMatch.ts:139,162,202`), `FACES` (`clueFaces.ts:4`), `HABITAT_TEXT`, `HABITAT_KIND_TEXT` (`profiles.ts:88,101`) are all `Record<string, string>` lookups with fallbacks (`questionText` → tag, `clueFace` → ❓, `profileClues:260-261` → template). Gem colors come from order index, not from faces. `PREFIX_ORDER` is `Object.keys(PREFIX_CATEGORY)` (`questionMatch.ts:23-30`), untouched.
- **What's askable doesn't come from these tables.** It's `PREFIX_CATEGORY` by prefix (`habitat` stays) applied to content tags (`questionMatchContent.ts:85`, `animalBoard.ts:90`). With no `habitat:artificial` tag, it was never dealt; deck face-uniqueness (`animalBoard.ts:133`) only sees dealt tags.
- **`COMPLETE_PREFIXES` readers.** `deduction.ts:22` (`tagOutcome`, and through it `fitClue` and `signProblems` implies), `profiles.ts:302` (`isHandWrittenClue`), `profiles.ts:348` (reserved tag check). Each changes only for a tag with prefix `artificial`: 0 in content, 0 live. No `SIGNS` implies or denies an `artificial` tag (`rg`). These three stay untouched, as the brief says.
- **Content checks.** `checkProfile:335` now rejects `habitats: ["artificial" | "artificial:*"]` as `unknown habitat`, and `build` refuses it (`scripts/content.ts:131-132`): fail loud. One side effect, accepted: a hand-written clue tag `artificial:<kind>` is no longer "reserved" (`:348`). It isn't askable (no `PREFIX_CATEGORY`) and the `CONTENT_SOURCES.md:25` rule covers it. No guard added (brief: the checks stay as they are).
- **Tests and scripts.** `tests/`: only a comment (`animalBoard.test.ts:50`), no fixture or assertion. `scripts/` (`balance-044.ts`, `e2e.mjs`, `content.ts`): no mention. Lint: no unused symbol is left (`HABITAT_CLASSES` still feeds `:34`).

### `ANIMAL_RULES.version` stays `055-0` (`animalBoard.ts:60`)

A deal reads the book (from the pool) and the rules. These constants only add text and faces for a tag no animal holds, and the comparison rules for a prefix no tag uses, so every deal, answer, note and score is identical (the e2e `rounds` comparison below checks this). Saved games: a round dealt with `habitat:artificial` before the content build already fails `roundStillFits` (`animalBoard.ts:182-191`, `useAnimalSession.ts:121-122`). A dealt tag is held by at least one suspect (`animalBoard.ts:90`), and the fresh book no longer has it, so such a round is re-dealt. Even if one were resumed, it would show the raw tag and ❓ without crashing (`categoryOf` reads prefix `habitat`). A bump would only throw away players' current saved games for nothing.

### Docs (plans and `docs/research/` are history and stay)

- `docs/CLUE_MATCH.md:54`: drop the clause `; Farms & towns is no longer asked`. The guide describes the current game, which no longer has the class; 055 holds the history.
- `docs/CONTENT_SOURCES.md:25`: keep the skip rule, because IUCN tables still list Artificial and authors copy them. Change its reason to `the game doesn't know it (plans 055, 056): the content check rejects it as an unknown habitat.` This doc isn't among the brief's named ones, but the intent is the same and the edit is one clause.
- `CONTEXT.md`, `README.md`: no mention. `plans/README.md`'s index stops at 053 (054 and 055 have no row), so 056 gets no row either.

### Notes, not edits (brief's decision rule)

- `tests/clueGame/animalBoard.test.ts:50` comment ("since Farms & towns left 54"): content history, still true.
- `signs.ts:221` `town_dweller`: a content sign (held by 13 and 54), still shown; not dead code.
- `traits.ts:30` comment "IUCN habitat classes (level 1)": still accurate, since the list was already a subset of IUCN's.

### Target design: ordered edits (one commit: one concept, and no type ties force an order)

0. Before editing, save `npm run content -- preview > /tmp/ft-preview-before.txt` (reads files only, no DB).
1. `traits.ts:31`. 2. `questionMatch.ts:158,178,214`. 3. `clueFaces.ts:15`. 4. `profiles.ts:98,144-150` (exactly as F1).
5. `docs/CLUE_MATCH.md:54`, `docs/CONTENT_SOURCES.md:25` as above.
6. New `plans/056-ft-cleanup.md`, about 15 lines in the style of 052/053: what went, why now (H10 build, gate 0 on 2026-11-08), why there's no version bump, verification results.

**Verification**
- `rg -n artificial src db/content` prints nothing.
- `npm run typecheck`, `npm run lint`, `npm test` (66/66) exit 0.
- Preview: `diff /tmp/ft-preview-before.txt <(npm run content -- preview)` is empty (every generated row of all 76 profiles is unchanged), and `grep -c PROBLEM` = 0 (F2).
- `npm run e2e:fresh` with the brief's guarded dev-copy block. Inside the guard, after `current_database()` = `phaser_june_dev`, run the same gate query on the dev copy and require 0, so the e2e really runs without `artificial`. Pass = all checks, 0 console errors. Compare `report.json` `rounds` with `baseline-e2e/report.json` (seed 7): they should be identical. If they differ, investigate before release.
- Release: run the live gate query again just before `deploy critter-connect` (cheap, read-only). Then the brief's smoke: `/explore` 200, `version.txt` = merge commit.

**Risk.** The only failure mode is `artificial` rows coming back to prod, for example a content build from a stale checkout. Their kind lines would then show as witness notes ("It also lives in towns or cities."), and a dealt `habitat:artificial` would show its raw tag and ❓. The pre-deploy gate covers this.

### Rejected alternatives
- Bump `ANIMAL_RULES.version`: no rule or deal changes, and it would drop saved games.
- Add a guard so the reserved check still rejects `artificial:*` tags: it re-adds the knowledge being removed; the content rule and the `unknown habitat` check suffice.
- Leave `CONTENT_SOURCES.md:25` unchanged: it's still true, but its reason ("not asked") understates the new behaviour (rejected).
- Split into several commits: the sites don't depend on each other, but they're one change.

## Architecture review (Fable)

VERDICT: APPROVE
MUST-FIX: none
MISSED: none
SHOULD-CONSIDER:
1. Verified against the code: all 13 sites exist as cited; `HABITAT_CLASSES` has the single consumer `traits.ts:34`; every text/face table is a `Record<string, string>` with a fallback (`questionText` → tag, `clueFace` → ❓, `profileClues:260-261` → template); `roundStillFits` fails a stale `habitat:artificial` order because `book.traits.get(id)?.get('habitat')?.has(tag)` is `undefined`, never equal to a boolean; `preview` only logs `PROBLEM` (`scripts/content.ts:81-84`) while `build` throws (`:131`). F2 is a real gap; keep the `grep -c PROBLEM` check.
2. `docs/CONTENT_SOURCES.md:25` is outside the brief's named docs; the one-clause edit is justified, but record it under Decisions so the scope widening is explicit.
3. In `COLUMN_LABEL` (`questionMatch.ts:214`) and `FACES` (`clueFaces.ts:15`) the removal is a partial-line edit; after it, confirm the trailing comma/line still parses (typecheck will catch it, but say so in Steps so the implementer doesn't reflow the surrounding entries).
4. The `rounds` comparison with `baseline-e2e/report.json` is the strongest behavioural check here; make "identical" a hard pass condition in Verification, not just "investigate".
5. After the `isHandWrittenClue` change, a live row tagged `artificial:<kind>` would turn into a field note (text "It also lives in towns or cities."). The pre-deploy live gate covers it; keep that gate as a hard stop, not advisory.

## Architecture review (Astra)

VERDICT: APPROVE
MUST-FIX: none
SHOULD-CONSIDER: none

## Revision notes

None needed: Fable and Astra both APPROVE with 0 MUST-FIX. Fable's SHOULD-CONSIDER 2-5 go to the `planner` for Steps/Verification (record `CONTENT_SOURCES.md` widening under Decisions; partial-line edits keep surrounding entries; rounds match and pre-deploy live gate are hard pass/stop conditions).

## Steps

`M=/srv/critter-ai/agent-state/missions/ft-cleanup`. V1–V4 and `GATE` are under Verification.

- [x] S1. **Delete the 13 `artificial` lines, edit 2 doc clauses, write plan 056; one commit.**
  - First, before any edit (code = `origin/main` `36dc1a5d`): `npm run -s content -- preview > $M/preview-before.txt 2>&1`; `grep -c PROBLEM` on it = 0. Kept in `M` so V2 works in later sessions.
  - Edits, exactly. Partial-line edits change only the named text; neighbouring entries stay on their lines, no reflow:
    - `src/clueGame/traits.ts:31`: `'marine', 'artificial'] as const;` → `'marine'] as const;`
    - `src/clueGame/questionMatch.ts`: delete lines 158 and 178; line 214 → `  'habitat:marine': 'Coasts & sea',`
    - `src/clueGame/clueFaces.ts:15`: drop ` 'habitat:artificial': '🏡',`; line ends `'habitat:marine': '🏖️',`
    - `src/clueGame/profiles.ts`: delete line 98 and lines 144-150.
    - `docs/CLUE_MATCH.md:54`: drop `; Farms & towns is no longer asked` (sentence ends `(only its yes is asked).`).
    - `docs/CONTENT_SOURCES.md:25`: `the game no longer asks it (plan 055), so profiles don't record it.` → `the game doesn't know it (plans 055, 056): the content check rejects it as an unknown habitat.`
    - New `plans/056-ft-cleanup.md`, ~15 lines, style of 052/053: what went (sites above); why now (H10 prod build 2026-11-08, live gate 0 of 2478); `ANIMAL_RULES.version` stays `055-0` and why (Architecture); side effect (`artificial:*` hand-written tag no longer reserved; the `CONTENT_SOURCES.md` rule and unknown-habitat check cover it); notes left unedited (Architecture "Notes, not edits"); a Verification line (S2 and the final run fill it).
    - This plan, **Decisions**: `S1 · docs/CONTENT_SOURCES.md:25 edited, outside the brief's named docs (Fable SC2): same intent, one clause; its old reason ("not asked") understated the new behaviour (now rejected as an unknown habitat).`
  - Checks: V1, V2. No E2E (S2). Commit code + docs + plan 056 + this plan; push.
- [x] S2. **Dev-copy E2E; `rounds` = baseline.**
  - V3 with `<out>` = `e2e-s2`, then V4 on it. Hard pass: V4 exit 0. `rounds` differ: no release; record under Decisions, find the cause, add a fix step or a handoff item.
  - Record the V4 line in plan 056's Verification line and **Log**. If `next dev` rewrote its `AGENTS.md` block, commit it (repo rule). Commit, push.

Not a step: after S2 the runner does the Astra code review, then the full Verification (artifact `$M/final-e2e/`, Summary, `status: done`), then the Release (`~/.claude/CLAUDE.md` "In a mission session" 6-8). A Verification checkbox here would run it before the code review, and twice.

## Verification

Repo root; `M=/srv/critter-ai/agent-state/missions/ft-cleanup`; one heavy job at a time; each block in one Bash call, with `GATE` defined (shell state doesn't persist). Final run (after the Astra code review): V1–V5, `<out>` = `final-e2e`. E2E: the existing suite (globe → Africa → 4 rounds at seed 7 → resume → journal → sources); no new scenario, since behaviour must not change and the `rounds` match proves it.
```
GATE="select count(*) from species_deduction_clues c, unnest(c.compare_tags) t where t = 'habitat:artificial' or t like 'artificial:%'"
```

**V1. Static**, each must hold:
1. `npm run typecheck`, `npm run lint`, `npm test` exit 0; tests 66/66.
2. `rg -n artificial src db/content` prints nothing.
3. `B=$(git merge-base origin/main HEAD); git diff --numstat $B -- src; git diff --quiet $B -- db && echo "db untouched"` → exactly `1 1 …/traits.ts`, `1 3 …/questionMatch.ts`, `1 1 …/clueFaces.ts`, `0 8 …/profiles.ts`, then `db untouched`. `git diff --name-only $B` + `git status --short`: only those 4, the 2 docs, `plans/056-ft-cleanup.md`, this plan.

**V2. Content preview** (files only, no DB):
```
npm run -s content -- preview > /tmp/ft-preview-after.txt 2>&1; echo "exit $?"
diff $M/preview-before.txt /tmp/ft-preview-after.txt && echo "preview unchanged"
echo "PROBLEM lines: $(grep -c PROBLEM /tmp/ft-preview-after.txt)"
```
Must show `exit 0`, `preview unchanged` (all 76 profiles' rows identical), `PROBLEM lines: 0` (preview exits 0 even with PROBLEMs, F2).

**V3. E2E, dev copy `phaser_june_dev` only** (never `.env.local`; never print `DATABASE_URL`; never `cat` the secrets file):
```
( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a
  [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1
  [ "$(psql "$DATABASE_URL" -tAc "$GATE")" = 0 ] || exit 2
  E2E_SEED=7 E2E_PLACE=continent:africa CHROME_PATH=/srv/critter-ai/agent-state/missions/moves-and-signs-build/chrome-nosandbox.sh npm run e2e:fresh ) \
  && rm -rf $M/<out> && cp -r "$(ls -d e2e-artifacts/*/ | tail -1)" $M/<out>
```
Exit 1: wrong DB, stop. Exit 2: dev copy holds `artificial` rows (0 of 2478 on 2026-11-08), baseline void: stop, log, add a step. No content build (dev copy holds 055's content). Known VPS flake: 1–3 timing checks (row-slide press, re-order click, sparkle) can fail; rerun once; failing twice is real. A failed run's evidence stays in `e2e-artifacts/`.

**V4. Artifact must show** (hard pass, exit 0):
```
node -e 'const [a,b]=process.argv.slice(1).map(f=>require(f)),bad=b.checks.filter(c=>!c.ok),same=a.seed===b.seed&&a.place.key===b.place.key&&JSON.stringify(a.rounds)===JSON.stringify(b.rounds);console.log(b.checks.length,"checks (baseline",a.checks.length+"),",bad.length,"failed,",b.consoleErrors.length,"console errors,",b.failedRequests.length,"failed requests; rounds same as baseline:",same);process.exit(bad.length||b.consoleErrors.length||!same?1:0)' $M/baseline-e2e/report.json $M/<out>/report.json
```
0 failed, 0 console errors, `rounds same as baseline: true` (seed 7, Africa; baseline 1565 checks). Same seed and code = same `rounds` (055's `final-e2e` and `release-e2e` match), so a difference is a real change: fail. Artifact `$M/<out>/` (`report.json` + screenshots); reproduce with V3. Disk: once `final-e2e` passes, `rm -rf $M/e2e-s2`; keep `baseline-e2e` (V4 reference), `final-e2e`, and the release's `release-e2e`.

**V5. Summary** (final run): `git diff --stat origin/main...HEAD`, `$M/final-e2e/` + its V4 line, both architecture verdicts, code-review verdict and SHOULD-CONSIDERs. Same V4 line in plan 056.

**Release** (runner's unit, `deploy`):
1. `git fetch origin --prune`, rebase on `origin/main`, rerun V1–V4 with `<out>` = `release-e2e`. If `git diff --quiet 36dc1a5d origin/main -- src db scripts` fails (main changed code, content or the e2e), V2's diff and V4's `rounds` match don't apply: record under Decisions; the rest must hold.
2. Live gate, **hard stop**, right before `gh pr merge` (merge and `deploy critter-connect` follow back to back). Read-only; URL never printed:
```
U=$(node --env-file=.env.local -e 'const u=new URL(process.env.DATABASE_URL);u.searchParams.delete("pgbouncer");process.stdout.write(u.href)')
echo "live gate: $(psql "$U" -tAc "$GATE")"
```
Must print `live gate: 0`. Else no merge, no deploy: `Result: failed: live gate <n>` under Release, handoff item (prod content holds `artificial` again, e.g. a build from a stale checkout), `MISSION_BLOCKED`.
3. `gh pr merge <n> --merge`, `deploy critter-connect`, smoke:
```
MC=$(gh pr view <n> --json mergeCommit -q .mergeCommit.oid)
echo "explore: $(curl -sL -o /dev/null -w '%{http_code}' https://play.critterconnect.org/explore/)"
[ "$(curl -s https://play.critterconnect.org/version.txt)" = "$MC" ] && echo "version.txt = merge commit"
```
Must show `explore: 200` and `version.txt = merge commit`.

## Code review (Astra)

## Release

## Decisions

- S1 · docs/CONTENT_SOURCES.md:25 edited, outside the brief's named docs (Fable SC2): same intent, one clause; its old reason ("not asked") understated the new behaviour (now rejected as an unknown habitat).

## Log

- 2026-11-08 21:40 UTC: Baseline. Live gate 0; typecheck/lint/test/preview 0; dev-copy e2e 1565/1565.
- 2026-11-08 21:50 UTC: Architecture. `architect`: 13 code lines + 2 doc clauses go; no union-keyed types or positional deps; no version bump; Verification adds preview diff + rounds comparison. Plan-only edit.
- 2026-11-08 22:00 UTC: Fable review. `architecture-reviewer`: APPROVE, 0 MUST-FIX, 5 SHOULD-CONSIDER (for Steps: hard-pass rounds match + live gate, partial-line edits, record CONTENT_SOURCES widening). Plan-only edit.
- 2026-11-08 22:10 UTC: Astra review. APPROVE, 0 MUST-FIX, 0 SHOULD-CONSIDER. Plan-only edit.
- 2026-11-08 22:15 UTC: Revision. None needed (0 MUST-FIX); Fable SHOULD-CONSIDERs handed to Steps. Plan-only edit.
- 2026-11-08 22:25 UTC: Steps. `planner`: S1 (13 code lines, 2 doc clauses, plan 056, V1+V2), S2 (dev-copy e2e, rounds = baseline hard pass); V1-V5 + Release (live gate hard stop). Planner dry-ran gate cmds (dev copy + live: 0). Plan-only edit.

- 2026-11-08 22:40 UTC: S1. 13 `artificial` code lines gone (numstat 1/1, 1/3, 1/1, 0/8), 2 doc clauses, plan 056. V1: typecheck/lint/test(66/66) 0, `rg` empty, db untouched. V2: preview exit 0, unchanged vs before, 0 PROBLEM.
- 2026-11-08 22:00 UTC: S2. V3 dev copy (db guard + gate 0): 1565/1565; V4: 1565 checks (baseline 1565), 0 failed, 0 console errors, 0 failed requests; rounds same as baseline: true. Artifact `$M/e2e-s2/`. No AGENTS.md rewrite.

## Summary
