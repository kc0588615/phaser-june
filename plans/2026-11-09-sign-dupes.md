---
mission: sign-dupes
project: critter-connect
branch: agent/sign-dupes
status: active
started: 2026-11-09 04:18 UTC
---

# Mission: Near-duplicate signs merged (Critter Connect)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

No animal shows two signs that say the same thing. The owner spotted it on the chimpanzee: *carries young on back* and *mother carries young* sit side by side and fill a whole page of the signs box beside the photo (plan 058). Across all 76 animals (`db/content/animals/*.json`, the open tags on `clues[].tags`, phrased by `SIGNS` in `src/clueGame/signs.ts`):

1. **Find** every pair (or group) of signs that a player would read as the same fact: on one animal, and across the table (two tags with the same meaning, used on different animals, which also breaks witness notes: two animals that share a trait don't share a tag, so the note never links them). Write them to a table with the tag, its phrase, its holders, and the verdict: merge, keep both (and why they differ), or reword one.
2. **Merge** each true duplicate into one tag: keep the clearer phrase, move every holder's note onto it, drop the other from `SIGNS`. A tag that's a narrower case of another (for example *carries young on back* vs *mother carries young*) is a duplicate on any animal that holds both; across animals, merge only if a player couldn't tell them apart from the notes.
3. Signs stay never hidden; categories stay as `SIGNS` gives them (a merged tag keeps one category; say which when its two parts differed).

### Why

Repeated signs waste the box beside the photo and teach nothing new. Tags with the same meaning split witness notes that should link two animals, which is the deduction the signs are there to teach.

### Scope

In:
- `db/content/animals/*.json` (tags only; note text changes only where the merged tag needs it), `src/clueGame/signs.ts` (`SIGNS` entries), `docs/research/2026-11-07-moves-and-signs/sign-map.csv` (recomputed), a findings table beside it (`sign-dupes.csv`), plan `plans/059-sign-dupes.md` (or the next free number).
- Tests or E2E checks only where an existing one names a dropped tag.

Out:
- New research or new facts; trait values; the question set; layout (plan 058's signs box stays as it is).
- Signs that are only similar in wording but differ in meaning: list them, don't merge them.

### Definition of done

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run content -- preview` exit 0, with 0 content PROBLEMs and 0 sign problems.
- The findings table covers every tag; the plan's Summary gives the counts (tags before and after, merges, kept pairs) and the chimpanzee before/after.
- Balance and witness notes: rerun the balance bot as plan 055 did (`scripts/balance-044.ts`, 400 rounds per continent, seed 44) and report witness notes per round before and after; more linking notes is expected and fine.
- `ANIMAL_RULES.version`: follow the repo's rule (AGENTS.md / `animalBoard.ts` comment); merged tags change witness notes, so a bump is likely. Say why in the plan.
- Dev copy only for anything that touches a database, with the guarded block from plan 055 (`plans/2026-11-08-moves-and-signs-build.md`, V3): `npm run content -- build && npm run content -- check && npm run e2e:fresh`. Never against `.env.local`; never print `DATABASE_URL` or `cat` the dev-copy file.
- One screenshot of the chimpanzee's signs box before and after, in `/srv/critter-ai/agent-state/missions/sign-dupes/`.
- **Handoff item** for the owner: production content build after the deploy, with the backup step first, as H11 did (`pg-backup.sh`, then `npm run content -- build` and `check`, with the expected counts).
- Release `deploy`: merge, `deploy critter-connect`, smoke `/explore` 200 and `version.txt` = the merge commit.

### Decision rules

- When in doubt, keep both and list the pair for the owner in the Summary; a wrong merge teaches a false link.
- Keep the engine as it is.

### Notes

- Start from a fresh `origin/main` (after signs-beside-photo, plan 058, merges).
- 055's `tag-edits.csv` (same folder) records the last round of sign edits; read it so this one doesn't undo them.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

## Baseline

From `origin/main` 5c37fc04 (signs-beside-photo merged, PR #69), 2026-11-09. Rules `055-0`.
- `npm ci`: ok (npm warns 4 install scripts not in allowScripts; unaffected).
- No migrations (schema baseline only; mission changes no schema).
- `npm run typecheck`, `npm run lint`: exit 0. `npm test`: 66/66 pass. `npm run content -- preview`: exit 0, 0 PROBLEMs.
- Content: 76 animals, 201 distinct open tags, 518 uses.
- `npm run e2e:fresh` vs dev copy (guarded block, guard `phaser_june_dev` ok; no content build), `CHROME_PATH=/srv/critter-ai/agent-state/missions/sign-dupes/chrome-nosandbox.sh`: 1575/1575 checks, seed 7. Artifact `/srv/critter-ai/agent-state/missions/sign-dupes/baseline-e2e/` (`report.json` + screenshots); reproduce with the guarded block (plan 055 V2) and `npm run e2e:fresh`.

## Architecture

Read on `agent/sign-dupes` e6bb2858 (= `origin/main` 5c37fc04 + plan); revised on 66911a42 after Astra's review (Revision notes). Every tag's verdict is in `docs/research/2026-11-07-moves-and-signs/sign-dupes.csv` (216 rows = `SIGNS`, columns `tag,phrase,holders,verdict,reason`, holders *before* the change; verdicts `keep, narrows X` (a narrower case of X on the same note: its holders keep it and drop X), `keep, narrowed by X`, `keep both: X`, `owner: X` (kept, listed for the owner), `keep`, `retired in 055`). Note texts were read for every holder, not just tag names. Witness pair counts below are over all 76 animals: a (note, other animal) pair where the other animal's field guide holds every tag of the note.

### Findings

**F1. One tag set drives both the signs and witness fits (Astra MUST-FIX; bug: false shared facts).** `witnessNotes` (`animalBoard.ts:169-174`) counts a suspect as fitting when its guide holds every tag of the note, and the sheet says "N of 5 field guides say this too" (`AnimalSheets.tsx:455`). A note's words are usually narrower than its tags. So dropping the narrower tag from a note whose words state the narrower fact (the first draft) widens its fits to every holder of the broader tag: 50 new pairs, at most 4 of them arguably true (2→12 spines, 63→24 and 63→59 "back or tail", 69→68 ringed horns). The wombat's "Its pouch opens backward" would fit the tree-kangaroo ("Its pouch opens forward"); the addax's spiral horns would fit the okapi, saola, both rhinos, hirola and dama gazelle. **Fix:** on a note holding a tag and its narrower case, keep the narrower one (the note's own words, `CONTENT_SOURCES.md:72`) and drop the broader. Dropping a tag only removes pairs: the narrow notes fit exactly as before (every holder held both), so 0 pairs are added. 43 pairs go, all broad-only notes that stop fitting the narrow holders. About 39 of them were false in the baseline: 43's "Its pouch opens forward" fit the wombat, bilby and devil; 10's "pockets in the mother's back … tiny toads" fit the chimp. 4 are true or close: 24→63 and 59→63 (tail), 54→61 (belly), 68→69 (ringed lyre vs ringed S horns). These go to the owner (F4); keeping them needs a new tag, a retag (out of scope).

**F2. The duplicates (content): 6 on-animal duplicates, 0 cross-animal merges.** Each is a narrower tag on the same note as its broader one:

| Kept (narrower) | Dropped there (broader) | Notes on | Broader's holders after | The notes say |
|---|---|---|---|---|
| `carries_young_on_back` (Life) | `mother_carries_young` | 52 56 61 63 | 10 24 54 59 | the baby rides on her back (61: belly, then back; 63: back or tail). **Chimpanzee case.** |
| `backward_pouch` (Life) | `pouch` | 31 37 48 | 27 43 67 | the pouch opens backward |
| `shoulder_stripe` (Body) | `stripes` | 52 | 25 29 39 43 | one stripe across the shoulders |
| `spectacles` (Body) | `face_markings` | 68 71 | 33 38 42 50 | markings around the eyes like glasses |
| `spiral_horns` (Body) | `horns` | 50 | 29 38 44 66 68 | horns twist in spirals |
| `s_shaped_horns` (Body) | `horns` | 69 | (same) | horns shaped like an S |

- Every holder of a narrower tag holds the broader one on that note only, so the duplicate sign leaves the animal. Each pair is in one category, and none of the 11 `SIGNS` entries has `implies`/`denies`/`restates`, so there are 0 new sign problems.
- Both tags of every pair stay in use, so nothing retires and `SIGNS` needs no edit. 12 notes change, in 11 files (31 37 48 50 52×2 56 61 63 68 69 71); no note text changes.
- Counts: open tags in content 201 → 201; uses 518 → 506; cross-animal merges 0 (first draft 7); `SIGNS` 216 entries, retired 15, both unchanged. Pairs compared 95: 6 deduped on their holders, 80 differ in meaning, 9 for the owner.
- `shell_spines` (2) ~ `spiky_shell` (12), merged in the first draft, now goes to the owner (F4 7). A merge would make 12's note ("Its other name is the sunburst turtle, for the spikes around the edge of its shell") fit 2, whose small spines are only on its front edge.
- **Chimpanzee:** 9 signs → 8. "mother carries young" goes and "carries young on back" stays. It still pages at 390 px: Body 1 line + Habits 4 + Life 1 = 6 lines in a 5-line box, so page 2 holds the Life group, now "carries young on back" alone. That comes from plan 058's layout (out of scope), not from a duplicate left over. The Summary says so plainly (Fable SC4).

**F3. `SIGNS` must keep every shipped tag (fail fast; established interface).** `signsOf` throws on a tag missing from `SIGNS` (`signs.ts:252`, via `signCategory` `:257`), at load, for every species (`questionMatchContent.ts:143`, via `animalsFromPool` in `useAnimalSession.ts:103`). Prod keeps the old rows from the deploy until the owner's production content build. The brief's "drop the other from `SIGNS`" would therefore have taken the game down in that gap. In this design no tag leaves content (F2), so `SIGNS` stays as it is and the gap is harmless: old and new rows load with the same table.

**F4. For the owner (decision rule: when in doubt, keep both).** Pairs a player might read as one fact. Each would be a true link if merged, but the two can be told apart (degree, vocabulary, or the brief's narrower-across rule), or a merge would make one note claim more than the other animal shows:
1. `roosts_in_trees` (45) ~ `sleeps_high_in_trees` (23 35). A bat roosts where it sleeps by day, but merging needs sleep words for 45's note. It would link 45 and 23 in Africa.
2. `walks_upright` (63) ~ `stands_on_hind_legs` (24 36 52 57 61 69). 63 walks on its back legs as 24 runs on them, but 36 52 57 69 only rear up.
3. `never_climbs` (55) ~ `forest_floor` (9 46 76). 55 "never climbs" is close to 76's "hardly ever climbs", and `SIGNS` reads both the same way. But 9 and 46 say nothing about climbing.
4. `climber` ~ `often_in_trees` (71's one note) ~ `seldom_on_ground` (40 54; 40's note also holds `climber`). Each pair differs in ability vs time spent, or in degree.
5. `dung_piles` ~ `scent_marks` (66's one note). Dung marking is scent marking (72 73's droppings are tagged `scent_marks`), but a player may not read dung as scent.
6. `leaf_litter` ~ `forest_floor` (46's one note; 76 holds both). It is the same ground, but one is a Habitat sign (forest) and the other a Habits sign (stays down: trees no), and 3 and 12 hold only `leaf_litter`.
7. `shell_spines` (2) ~ `spiky_shell` (12). The phrases read alike, but 12's note also names the sunburst turtle and spikes all round (F2).

Row 4 holds 3 of the 9 pairs. Also for the owner, all out of scope:
- The 4 true links the dedupe drops (F1). A shared tail-carrying tag would keep 24 59 63's link (a new tag).
- Notes with a broad tag and narrower words already fit animals their words aren't true of, in the baseline and after: 66's "two horns, one behind the other" fits the okapi and saola; 10's back pockets fit 24 54 59; 43's forward pouch fits the echidnas. Fixing them is a note-by-note retag.
- 055's 15 retired tags aren't marked in `SIGNS`, so a later note can reuse one (`coastal_dunes` beside `sand_dunes`) and pass `checkProfile`. A `retired` field plus a `signProblems` check would catch it (the first draft's F2). This mission retires nothing, so it isn't done here.

The other 80 kept pairs differ in meaning: a named food, sound, island or body part vs a general one; land vs water (`giant_tortoise`/`giant_turtle`: `SIGNS` reads the first as land); a different holder (father/mother); the 055 splits (`climbs_boulders`/`climber`). Each has a reason in the CSV. Seen but out of scope, all retags rather than merges: 5's note also says "over a pool" (`eggs_over_water`); 4's and 75's notes also say fast (`fast_streams`); 38's face-gland note is tagged `scent_marks`; 19 spreads seeds by eating fruit (no `fruit_eater`).

**F5. Constraints checked, all fine.**
- Deals read only prefixed traits (`fullTable` `animalBoard.ts:88`, `likeness`/`canTellApart` `questionMatch.ts:313-335`).
- Open tags reach only `witnessNotes` (`:169`), `roundStillFits` (`:182`), `stillPossible` (`:507`, bot/tests) and `travelOf` (`:217`). `travelOf` reads `burrower`, `swimmer`, `fully_aquatic` and `glider`, and the dedupe touches none of them, so travel is unchanged.
- Tests naming tags are unaffected: `animalBoard.test.ts:76` uses `digging_claws` (Aardvark's notes are unchanged), `testPool.ts:26` uses `cold_streams`, and `e2e.mjs:2151` uses `tree_dweller` (still in `SIGNS`; the stale-save check needs it only to load). No test, `scripts/` file or `src/` file outside `signs.ts` names any of the 11 tags.
- 058's forced-box paging animals (13 14 41, seed 7 round 1) are untouched. The 390 px paging shot (round 2) still finds the chimp (F2).
- The e2e's seed 7 deals match the baseline, and only round 2's notes change. In that round (mystery Hirola; suspects 29 50 56 68 69) its horn note fits 2 of 5 instead of 4, because 50 and 69 drop `horns`. It is still shown, and its glasses note still fits only 68 (not shown). The mysteries of rounds 1, 3 and 4 (7 46 41) hold none of the 11 tags.

### Target design

1. **Content** (`db/content/animals/*.json`, the 11 files in F2). On each of the 12 notes, drop the broader tag and keep the rest in order. Make these 12 tag-array edits by hand (Fable SC1; KISS); no apply script. Then check with a one-off query over the files:
   - no clue holds both tags of any of the 6 pairs;
   - each broader tag's holders match F2's table;
   - open tags 201, uses 506;
   - `git diff` touches only `tags` arrays in those 11 files.
2. **Witness-pair diff (Astra SC1).** A one-off `/srv/critter-ai/agent-state/missions/sign-dupes/tools/witness-pairs.ts <label>` (run with 055's `run.sh`, repointed) writes `metrics/pairs-<label>.txt`. Each line is one pair over all 76 animals, sorted: `<mystery id> <note #> <other id>\t<note text>`.
   - Run it on the before tree and on the branch.
   - `comm -13 before after` (added) must be empty, else stop: a dedupe can only remove pairs.
   - `comm -23` (removed) should be F1's 43.
   - Plan 059 lists the removed pairs, grouped by note, each marked true or false from both animals' notes (expected: 4 true, F4). Anyone can re-run it.
3. **`src/clueGame/signs.ts`: no change.** Every tag stays in use and in `SIGNS`, with its category. The load path and the engine stay as they are.
4. **`sign-map.csv`**: recompute with a one-off adapted from 055's `/srv/critter-ai/agent-state/missions/moves-and-signs-build/content/sign-map-update.ts` (copy to `…/sign-dupes/tools/`; drop its `tag-edits.csv`/`can_swim` logic).
   - uses/holders/note_categories come from content. Only the 5 broader tags change.
   - Narrower tags: `rule` gets `; 059: narrows <broader>: its holders drop <broader>`. Broader tags: `; 059: dropped on <ids> (narrower <tag>)`.
   - It asserts 216 rows = `SIGNS` and every category equal to `SIGNS`. Idempotent.
5. **`sign-dupes.csv`**: committed as revised here. The Steps may only correct it.
6. **Docs.** `CONTENT_SOURCES.md` sign rule, one bullet after `:72`: "One sign per fact: never tag a note with a tag and its narrower case (`carries_young_on_back` and `mother_carries_young`); keep the narrower one its words state. A witness note fits every animal holding all its tags, so the broader tag alone would make it fit animals its words aren't true of."
7. **`plans/059-sign-dupes.md`** (next free; 058 is the last), short, in the style of 057/058. It holds:
   - the dedupe table and the counts;
   - why narrower-over-broader, not merge (F1);
   - the 9 owner pairs and the other owner items (F4);
   - the removed-pairs list (2);
   - no version bump and why; DB/H12; verification; the chimp shots.
8. **`ANIMAL_RULES.version` stays `055-0`.** The repo's rule bumps for rules or deal changes (`animalBoard.ts:26`; 057 set the precedent for a tag-only change). No edit touches a prefixed trait or a `travelOf` tag, so every suspect set, deck, answer, travel and score is the same for the same seed. Only witness notes change, and they change when the owner's production content build lands, not at deploy, so a code bump would label old-content rounds as new. `roundStillFits` already re-deals a save whose notes changed, so a bump would only drop saves that still fit.
9. **Tests**: no test or e2e names a changed tag, so there are no test edits.
10. **Balance and witness notes** (as 055 S8). Copy `…/moves-and-signs-build/tools/{run.sh,bot.sh,botsum.py,witness.ts}` to `…/sign-dupes/tools/` and repoint the paths. `prod-tags.ts` isn't needed (13).
    - Before: a detached worktree of 5c37fc04 at `/tmp/sd-before` with `node_modules` symlinked. After: the branch.
    - `witness.ts`, `witness-pairs.ts` and the bot read `db/content` through `animalsFromProfiles` (no database), so both trees run with no env file sourced (Fable SC5). The Steps say so.
    - `witness.ts` gives notes/round and rounds with 0 notes for world + the 4 places, plus static tagged / shareable notes.
    - Bot: `--rounds 400 --seed 44 --places africa,asia,north-america,south-america`.
    - Expected: a small change, likely slightly fewer notes/round and shareable notes (43 mostly false pairs go; a note that fit all 5 can now show), found% within noise. This differs from the brief's "more linking notes is expected", because nothing merges. Record both tables in plan 059 and the Summary.
11. **DB**: dev copy only, plan 055 V3 block verbatim with `M` = this mission's state: `( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a; [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1; npm run content -- build && npm run content -- check && CHROME_PATH=…/sign-dupes/chrome-nosandbox.sh npm run e2e:fresh )`. Never `.env.local`; never print the URL or `cat` the file; if the guard fails, stop and add a handoff item.
12. **Chimp shots.** Before: `baseline-e2e/02f-signs-page-{1,2}-light.png` (round 2 chimp, page 2 = both carry signs). After: the final run's `02f-signs-page-{1,2}-light.png` (page 2 = "carries young on back" alone). Copy both pairs to `/srv/critter-ai/agent-state/missions/sign-dupes/chimp-{before,after}-p{1,2}.png`. If the final report's paging check names another animal, open round 2's chimp sheet and shoot it with a one-off CDP script (a fallback; not expected per F2).
13. **Release.** There's no pre-merge tag gate: `SIGNS` and the code are unchanged, so live rows load either way. **H12** (handoff, H11's format):
    - Step 1: the deploy is live.
    - Step 2: `pg-backup.sh` first, with the `backup ok` line; no backup, no build.
    - Step 3: on WSL `main`: `npm run content -- build`, then `check`. Expected: the dev copy's `Pool: …` line (76 / 2478 / 2086 / 491 if unchanged) and `0 errors, 0 warnings.`.
    - Step 4: `./scripts/db "select count(*) from species_deduction_clues where compare_tags @> '{carries_young_on_back,mother_carries_young}' or compare_tags @> '{backward_pouch,pouch}' or compare_tags @> '{shoulder_stripe,stripes}' or compare_tags @> '{spectacles,face_markings}' or compare_tags @> '{spiral_horns,horns}' or compare_tags @> '{s_shaped_horns,horns}'"` returns 0 (12 before the build).

### Rejected alternatives
- **Keep the broader tag and retire the narrower one (first draft):** F1. The note's narrow words then fit every broad holder: 50 new pairs, nearly all false.
- **Rewrite the 12 notes to state only the broader fact (Astra's option a):** every detail (back, pouch direction, glasses, spirals, age) is false for some broad holder, so each note would shrink to a bare "A mother carries her baby". That loses sourced facts, and the notes would read alike.
- **Keep both tags on the holders (Astra's option b):** the chimp keeps both signs, which fails the goal.
- **Merge `shell_spines` into `spiky_shell`:** 12's note would fit 2 falsely (F2). Kept both and listed for the owner.
- **Drop a tag from `SIGNS`:** no tag leaves content; `SIGNS` keeps every shipped tag (F3).
- **A `narrows` field in `SIGNS` with a `signProblems` check, so a dropped broader tag can't come back:** new code for 6 pairs that only content edits can break. The docs rule and the CSV record them.
- **Mark 055's retired tags now (`retired` field):** nothing retires here; listed for the owner (F4).
- **Hide a broader sign when its narrower one shows** (`signsOf`/UI rule): an engine/UI change, out of scope; the content dedupe gives the same box.
- **Merge the 9 owner pairs:** each is a judgment on degree or vocabulary, needs note words, or would claim too much. The brief's rule says keep both.
- **Add missing or tail-carrying tags (F4):** retags or new tags, out of scope.
- **A repo script for `sign-map.csv`:** it is a research record updated once per sign round, which no code reads, so the 055 one-off is reused.
- **Bump `ANIMAL_RULES.version`:** Target design 8.

## Architecture review (Fable)

VERDICT: APPROVE

Checked on b99e8032 against code and content, not the architect's text.
- F1 holds: `signCategory` throws on a tag missing from `SIGNS` (`signs.ts:257`), reached by `signsOf` from `questionMatchContent.ts:143` at pool load. Retire-not-drop is the only safe way given prod keeps old rows until the owner's content build.
- F3 holds: recomputed over the 76 files: 201 open tags / 518 uses before; 13 notes in 12 files hold a merged tag; every holder of the 6 narrower tags also holds the survivor on the same note (52×2 56 61 63; 31 37 48; 52; 68 71; 50; 69); only 2's `shell_spines` is a replace. After: 194 tags / 506 uses. Survivor holder lists in the CSV match content.
- F5 holds: `travelOf` (`animalBoard.ts:217-221`) reads only `glider`, `fully_aquatic`, `swimmer`, `burrower`; none merged. Deals read prefixed traits only. No test, `scripts/e2e.mjs` or `testPool.ts` names a merged tag (`tree_dweller` at e2e.mjs:2151 stays in `SIGNS`). `roundStillFits` compares note tags, so saves whose chimp note changes re-deal without a bump; 057 set the same no-bump precedent. Target 7 is right.
- Merge judgments: all 7 are same-meaning to a player; the one cross-animal merge (2 "small spines ... along the front edge of its shell" vs 12 "spikes around the edge of its shell") is indistinguishable from the notes and both are read as `covering:shell`. Swept ~30 other candidate pairs (`loud_calls`/`screecher`, `swimmer`/`fully_aquatic`, `face_mask`/`face_markings`, `burrower`/`buries_itself`, `territorial`/`scent_marks`, `hangs_upside_down`/`roosts_in_trees`, `giant_tortoise`/`giant_turtle`, …): each has a correct keep reason in the CSV; no missed true duplicate. The 8 owner pairs are genuine judgment calls; keeping them follows the brief's rule.
- CSV: 216 rows = `SIGNS`; verdict classes sum correctly (7 merge, 6 absorb, 15 retired-055, 12 owner rows = 8 pairs).
- Handoff SQL: `species_deduction_clues.compare_tags` exists (`db/schema.sql:56`).

MUST-FIX: none

MISSED: none

SHOULD-CONSIDER:
1. Target 1: 13 tag-line edits in 12 files is hand-edit territory (KISS). If the apply script stays, keep it as the verifier (assert no note holds a merged tag, survivors present) rather than a CSV-driven rewriter; either way the committed CSV + `git diff` is the record.
2. Target 2: keep the 15 back-filled `retired` reasons short and uniform (`'055: reads as eggs; use sleeping_nests'`); the detail already lives in `sign-map.csv`. Needed, though: the check is only complete if every retired entry is marked.
3. Target 2: put the `retired` branch *before* `implies`/`denies`/`restates` (as written) so `tree_dweller` reports one problem, not two.
4. Summary for the owner: say plainly that the chimp still pages at 390 px (6 lines in a 5-line box) and that this is 058 layout, not a remaining duplicate.
5. Target 9: the "before" worktree at `/tmp/sd-before` must point at the dev copy too, or witness.ts/bot read `.env.local`; name the env source in the Steps.

## Architecture review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. **F3 / Target 1 broadens witness matching without broadening note wording.** The same tags drive displayed signs and witness eligibility. Verified in a reachable world round: removing `backward_pouch` makes “Its pouch opens backward” fit both the wombat and the tree-kangaroo, whose pouch opens forward. Likewise, removing `spiral_horns` makes the addax’s spiral-horn note fit okapi, hirola and dama gazelle. These are false shared facts. Rewrite affected notes to express only the shared meaning, or retain the distinguishing tags. Audit all narrower-to-broader merges before retiring them.

SHOULD-CONSIDER:

1. Validate newly enabled witness links against note meaning. Balance metrics and existing tag-based checks cannot detect these semantic contradictions.

## Revision notes

Revision 1 (architect, after both reviews, on 66911a42).
- **Astra MUST-FIX 1 (merged notes overclaim): resolved by a design change.** All 7 first-draft merges were audited with a witness-pair diff over the 76 animals (F1). Retiring the narrower tag added 50 (note, animal) pairs, at most 4 of them arguably true. Now each of the 6 narrower cases keeps the narrower tag on its holders and drops the broader one there (F2). The on-animal duplicates go, and 0 pairs are added. 43 pairs are removed: about 39 were false in the baseline, and the 4 true or close ones go to the owner (F4).
  - No note text changes. Rewriting would strip sourced facts (option a, rejected), and keeping both tags would leave the duplicate (option b, rejected).
  - The one cross-animal merge (`shell_spines` → `spiky_shell`) fails the same test (12's sunburst note would fit 2), so it is now owner pair 7.
- **Astra SC1 (validate new links): taken.** Target design 2 adds a before/after witness-pair diff. Added pairs must be empty, and the removed pairs are listed in plan 059, each marked true or false.
- **Fable SCs:**
  - Taken: SC1 (hand edits plus a check, no apply script; Target 1), SC4 (the chimp's paging in the Summary; F2) and SC5 (no env file for the tools; Target 10).
  - Moot: SC2 and SC3. There is no `retired` field now, since nothing retires; 055's unmarked retirees are an owner item (F4).
- **Dropped as no longer needed:** the `retired` field and its `signProblems` check, the CSV-driven apply script, and the `prod-tags.ts` pre-merge gate (`SIGNS` and the code are unchanged). `signs.ts` is not edited.
- **Renumbered:** F1 is now the witness-fit finding. Old F1 (`SIGNS` keeps shipped tags) is F3, old F3 (the duplicates) is F2, and old F2 (retired tags unmarked) is an owner item in F4.
- **`sign-dupes.csv`:** 13 rows revised: 6 `keep, narrows X`, 5 `keep, narrowed by X`, and `shell_spines`/`spiky_shell` → `owner`.
- **Final counts:**
  - Open tags 201 → 201; uses 518 → 506.
  - `SIGNS`: 216 entries and 15 retired, both unchanged.
  - Cross-animal merges: 0 (the draft had 7).
  - On-animal dedupes: 6 pairs, on 12 notes in 11 files.
  - Pairs compared: 95 (6 deduped + 80 that differ in meaning + 9 for the owner).
  - Chimpanzee: 9 signs → 8.

## Steps

`M` = `/srv/critter-ai/agent-state/missions/sign-dupes`, `T` = `$M/tools`, repo root = `/srv/critter-ai/worktrees/sign-dupes` (run everything there unless a step says otherwise; set `M`/`T` in the same command, shells don't persist). **Static checks** = Verification V1 items 1–4. Heavy jobs (bot, e2e) one at a time. The tools, bot and preview read `db/content` only: no env file sourced (Fable SC5). Database only through V3's guarded blocks. Before = `5c37fc04` (`origin/main` at baseline).
Order: H12 (S6) and docs/plan 059 (S7) come after the dev run (S5), so both carry its real `Pool:` line, check count and shots. The before tree is only needed in S1, so it goes at S1's end.

- [x] S1. **Tools, before tree, before metrics, chimp before (Target 2, 10, 12).**
  - `mkdir -p $T $M/metrics`. Copy `/srv/critter-ai/agent-state/missions/moves-and-signs-build/tools/{run.sh,bot.sh,botsum.py,witness.ts}` to `$T/`. Repoint: `run.sh` `REPO=/srv/critter-ai/worktrees/sign-dupes`, tmp names `sd-`; `bot.sh` `M=$M`; `botsum.py` `MET=$M/metrics`, every run read from `MET` (drop `BOT` and the design runs); comments name this mission.
  - Write, after Failure modes: `$T/witness-pairs.ts <label>` (book as in `witness.ts`, 76 asserted; for each animal, each tagged note of `notes` at index i, as `witnessNotes` reads them, each other animal whose `tags` hold every note tag → `<mystery id> <i> <other id>\t<full ?? text>`; lines sorted in code-unit order; writes `$M/metrics/pairs-<label>.txt`; prints `pairs-<label>: N pairs; tree <cwd> at <short head>`). `$T/dedupe-check.py` (D1–D6). `$T/spot.sql` (Target 13 step 4's `select count(*) …` as one line, `;`-terminated). `$T/report-check.cjs <report.json>`: prints `<n> checks, <k> failed; paging: <animal>; rounds: <id:outcome …>; console errors: <n>; failed requests: <n>`, exit 1 unless 0 failed, paging `Chimpanzee`, rounds `7:found 68:lost 46:found 41:found`, 0 console errors, 0 failed requests.
  - Before tree: `git worktree add --detach /tmp/sd-before 5c37fc04 && ln -s /srv/critter-ai/worktrees/sign-dupes/node_modules /tmp/sd-before/node_modules`.
  - Runs, one at a time: `ROOT=/tmp/sd-before $T/run.sh $T/witness.ts before > $M/metrics/witness-before.md`; `ROOT=/tmp/sd-before $T/run.sh $T/witness-pairs.ts before`; `(cd /tmp/sd-before && node scripts/run-typescript.mjs scripts/content.ts preview) > $M/metrics/preview-before.txt`; `$T/bot.sh before /tmp/sd-before`.
  - Chimp before: copy `$M/baseline-e2e/02f-signs-page-{1,2}-light.png` to `$M/chimp-before-p{1,2}.png`; view both (page 2 = Life group, "carries young on back" and "mother carries young").
  - Remove the tree: `git worktree remove --force /tmp/sd-before && git worktree prune` (recreate with the command above if a before run must be redone).
  - Checks: `witness-before.md` names `/tmp/sd-before` at 5c37fc04's short head, rules `055-0`; `pairs-before` prints the same tree; `bot-before.txt` ends `# exit 0`; `python3 -I $T/dedupe-check.py` exits 1, reporting 12 notes holding both tags and uses 518 (the check fails before the edits); `node $T/report-check.cjs $M/baseline-e2e/report.json` exits 0 with 1575 checks; `git worktree list` has no `sd-before`; `git status` clean apart from the plan; typecheck + lint exit 0. No E2E (nothing changed).
- [x] S2. **Content: drop the broader tag on the 12 notes (Target 1).**
  - By hand, in `db/content/animals/` (clue = 0-based index in `clues[]`; delete the tag's line, fix the comma before it, nothing else): `31-northern-hairy-nosed-wombat.json` clue 6 `pouch`; `37-greater-bilby.json` 6 `pouch`; `48-tasmanian-devil.json` 5 `pouch`; `50-addax.json` 0 `horns`; `52-giant-anteater.json` 2 `stripes` and 8 `mother_carries_young`; `56-chimpanzee.json` 6 `mother_carries_young`; `61-indri.json` 7 `mother_carries_young`; `63-temmincks-pangolin.json` 7 `mother_carries_young`; `68-hirola.json` 1 `face_markings`; `69-dama-gazelle.json` 0 `horns`; `71-andean-bear.json` 0 `face_markings`.
  - Checks: `python3 -I $T/dedupe-check.py` exits 0 and prints `0 notes with both; 12 notes in 11 files changed, tags only; holders ok; open tags 201, uses 506`. `node scripts/run-typescript.mjs scripts/content.ts preview > $M/metrics/preview-after.txt; diff $M/metrics/preview-before.txt $M/metrics/preview-after.txt`: exactly 12 `<` and 12 `>` lines, each a clue's `[…]` list minus its broader tag. Static checks (0 PROBLEMs, 66/66). No E2E: content reaches the game only through a content build (S5).
- [x] S3. **After metrics, witness-pair diff, bot (Target 2, 10).**
  - At the repo root, one at a time: `$T/run.sh $T/witness.ts after > $M/metrics/witness-after.md`; `$T/run.sh $T/witness-pairs.ts after`; `$T/bot.sh after /srv/critter-ai/worktrees/sign-dupes`.
  - Diff in `$M/metrics`: `LC_ALL=C comm -13 --check-order pairs-before.txt pairs-after.txt > pairs-added.txt`; `LC_ALL=C comm -23 --check-order pairs-before.txt pairs-after.txt > pairs-removed.txt`. `pairs-added.txt` must be empty, else stop: its note was mis-edited; fix it under S2's checks and redo this step. `wc -l < pairs-removed.txt` = 43 (F1); another count: reconcile with F1 in `summary.md` and Decisions.
  - `$M/metrics/pairs-removed.md`: the removed pairs grouped by note (mystery, its note), each other animal with its own note holding the broader tag, marked true or false. Expected 4 true or close (24→63 and 59→63 tail, 54→61 belly, 68→69 ringed horns), the rest false.
  - `python3 -I $T/botsum.py before after > $M/metrics/bot-tables.md`. `$M/metrics/summary.md`: witness table before/after (notes/round, rounds with 0 notes per place; tagged, shareable), pair counts, bot table, the reading (Target 10: small change, likely slightly fewer notes; a |Δ found| > 2 points or |Δ moves left| > 1.5 gets a sentence; no rule change either way).
  - Checks: `bot-after.txt` ends `# exit 0`; `witness-after.md` `Tagged notes` and `Content problems` equal before's; shareable ≤ before's; `git status` clean apart from the plan; typecheck + lint exit 0. No E2E.
- [x] S4. **`sign-map.csv` recompute, `sign-dupes.csv` check (Target 4, 5).**
  - Copy `/srv/critter-ai/agent-state/missions/moves-and-signs-build/content/sign-map-update.ts` to `$T/sign-map-update.ts`. Drop the `tag-edits.csv` logic (`lost`, `replaced`), `NOT_BUILT`/`can_swim`, the `FIXED` marks and new-row creation (a content tag without a row fails). Add `NARROWS` (the 6 pairs): a narrower row's `rule` gets `; 059: narrows <broader>: its holders drop <broader>`; a broader row gets `; 059: dropped on <narrower's holders> (narrower <tag>)`, one per narrower (`horns` gets 2); skip a cell already holding `059:`. Keep the `SIGNS` category assert, the rows↔`SIGNS` check both ways, CRLF (C1–C5).
  - Run `$T/run.sh $T/sign-map-update.ts` twice: `sign-map.csv: 216 rows (was 216); written; categories match SIGNS (216)`, then `… unchanged …`.
  - `git diff --numstat -- docs/research/2026-11-07-moves-and-signs/sign-map.csv` = `11 11`. Broader rows: `mother_carries_young` 4 uses `10 24 54 59`; `pouch` 3 `27 43 67`; `stripes` 4 `25 29 39 43`; `face_markings` 4 `33 38 42 50`; `horns` 5 `29 38 44 66 68`. Narrower rows: `rule` only.
  - `sign-dupes.csv`, one-off python check: 216 rows, tags = `SIGNS` keys; holders = `git show 5c37fc04:docs/research/2026-11-07-moves-and-signs/sign-map.csv` holders for every tag; verdicts `keep, narrows` 6, `keep, narrowed by` 5, `owner` 14 rows, `retired in 055` 15. Reasons that S3's `pairs-removed.md` contradicts get corrected (text only); record each under Decisions.
  - Checks: static checks. No E2E.
- [ ] S5. **Dev copy: content build, check, e2e; chimp after (Target 11, 12).**
  - V3 spot query: prints `12` (dev copy holds 5c37fc04's content). Then V3's block. Expect build `0 citation warnings (see preview).` and `Built. …`; check `Pool: 76 playable of 76 species, 2478 clues (2086 deductive), 491 facts.` and `0 errors, 0 warnings.`; e2e passes. Then the spot query again: `0`.
  - `cp -r "$(ls -d e2e-artifacts/*/ | tail -1)" $M/e2e-s5`; `node $T/report-check.cjs $M/e2e-s5/report.json` exits 0, 1575 checks (another count with 0 failed: explain from round 2's note fits under Decisions).
  - Chimp after: copy `$M/e2e-s5/02f-signs-page-{1,2}-light.png` to `$M/chimp-after-p{1,2}.png`; view: page 2 = "carries young on back" alone, "mother carries young" on neither page. If paging names another animal: Target 12's fallback (one-off CDP script `$T/chimp-shot.mjs`, round 2 chimp sheet), recorded under Decisions.
  - Disk: `rm -rf $M/baseline-e2e` once `chimp-before-p{1,2}.png` exist. Folders left: `e2e-s5/`.
  - Log the `Pool:` line, check count and rounds (S6, S7 quote them).
  - Checks: guard passes; the above; `git status` clean apart from the plan; typecheck + lint exit 0.
- [ ] S6. **Handoff H12 (Target 13).**
  - In `/srv/critter-ai/handoff/critter-connect.md`, under `## Open` above H11 (next free number; H12 today, else the next, and S7 uses it), H11's format:
    ```
    ### H12 · Production content build for the sign dedupe
    Status: waiting on you
    From: sign-dupes · <YYYY-MM-DD>
    Blocks: the deduped signs reaching players (the mission doesn't wait on it)

    **Why:** 12 clue rows drop a broader tag that their narrower one already says (the chimpanzee's "mother carries young" beside "carries young on back"; plan 059). Prod keeps the old rows until a production content build. Code and `SIGNS` are unchanged, so building before or after the deploy is safe; after is the plan.

    **Steps:**
    1. Wait until the sign-dupes PR is merged and deployed: `curl https://play.critterconnect.org/version.txt` shows the PR's merge commit.
    2. **Fresh production dump first** (the build deletes and reloads every clue and fact and has no backup of its own). From WSL: `ssh root@play.critterconnect.org /opt/critter-connect/deploy/backup/pg-backup.sh` (add `-i ~/.ssh/hetzner-vps` if your ssh config doesn't pick the key). Success = exit 0 and a last line `<UTC time> backup ok: /var/backups/critter-connect/daily/phaser_june-<stamp>.dump (<size>)`, about 90-120 MB. No `backup ok`, no build: stop here. Restore steps: `docs/DEPLOY.md#backups` ("Restore drill"; for a real restore add `--clean --if-exists -d phaser_june`).
    3. In WSL on a fresh `main` (`git pull --ff-only`): `npm run content -- build` (expect `0 citation warnings (see preview).` and `Built. …`), then `npm run content -- check`, which must print `Pool: 76 playable of 76 species, 2478 clues (2086 deductive), 491 facts.` and `0 errors, 0 warnings.`
    4. Spot check: `./scripts/db "select count(*) from species_deduction_clues where compare_tags @> '{carries_young_on_back,mother_carries_young}' or compare_tags @> '{backward_pouch,pouch}' or compare_tags @> '{shoulder_stripe,stripes}' or compare_tags @> '{spectacles,face_markings}' or compare_tags @> '{spiral_horns,horns}' or compare_tags @> '{s_shaped_horns,horns}';"` (= `spot.sql`) returns `0` (`12` before the build).
    5. Reply below and set `Status: done`.

    **Your reply:**
    - Dump file name:
    - Built (done/failed + check line):
    - Spot check count:
    ```
  - Step 3's `Pool:` line is the expected one; if S5's differed, write S5's.
  - Checks: `grep -n '^### H12' /srv/critter-ai/handoff/critter-connect.md` = 1 hit, between `## Open` and `## Closed`; next line `Status: waiting on you`; no value in the title, no secret in the item. No repo change.
- [ ] S7. **Docs and plan 059 (Target 6, 7, 8).**
  - `docs/CONTENT_SOURCES.md`: Target 6's bullet, verbatim, after `:72` ("A sign names evidence from its own note…").
  - New `plans/059-sign-dupes.md` (058 is the last), 057/058 style: What changed (F2's table; counts: open tags 201 → 201, uses 518 → 506, `SIGNS` 216 and 15 retired unchanged, 0 merges, 6 pairs deduped on 12 notes in 11 files, 95 pairs compared = 6 + 80 + 9); Why (narrower over broader, F1; rejected merge); For the owner (F4's 9 pairs and the other items, the 4 true links lost); Removed witness pairs (from `$M/metrics/pairs-removed.md`, true/false); Balance (witness and bot tables from `$M/metrics/summary.md`); No version bump (Target 8); DB (H12); Verification (S2–S5 results); Shots (`$M/chimp-{before,after}-p{1,2}.png`; chimp 9 signs → 8, still 2 pages at 390 px from 058's layout). The `Final:` line is added in the final Verification.
  - Checks: every path in 059 exists (`ls`); static checks. No E2E (Markdown only).

## Verification

Run after the Astra code review (its own unit, not a step), from the repo root, one heavy job at a time; `M`, `T` as in Steps. Expected numbers assume content at `5c37fc04`; if a rebase brings content changes, recompute them and record under Decisions. Known VPS flake: 1–3 timing checks can fail once; rerun once, a check failing twice is real. Disk: at most two E2E folders in `M`: `e2e-s5/` and `final-e2e/`.

**V1. Static (no database)**, each exit 0:
1. `npm run typecheck`
2. `npm run lint` (eslint + theme contrast)
3. `npm test`: 66/66 pass
4. `npm run content -- preview > /tmp/sd-preview.txt && ! grep PROBLEM /tmp/sd-preview.txt`: prints nothing (0 content and 0 sign problems: `checkProfile` runs `signProblems`).
5. `python3 -I $T/dedupe-check.py`: `0 notes with both; 12 notes in 11 files changed, tags only; holders ok; open tags 201, uses 506`.
6. `git diff --name-only 5c37fc04 -- src scripts tests` prints nothing (`SIGNS` 216 entries and `ANIMAL_RULES.version` `'055-0'` unchanged; no `next build` needed, `deploy` builds the image).
7. `$T/run.sh $T/sign-map-update.ts`: 216 rows, `unchanged`, categories match SIGNS (216).

**V2. Metrics still current:** `$T/run.sh $T/witness-pairs.ts final && cmp $M/metrics/pairs-final.txt $M/metrics/pairs-after.txt` (identical; then delete `pairs-final.txt`). Bot and witness tables are in `$M/metrics/{summary.md,bot-tables.md,witness-before.md,witness-after.md}` and copied into plan 059 and the Summary.

**V3. Database, dev copy only.** Never `.env.local`, never print `DATABASE_URL` or `cat` the file; if the guard fails, stop and add a handoff item to refresh the file.
- Spot query (S5 before/after the build; here after: `0`):
  ```
  ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a; [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1; psql "$DATABASE_URL" -tA -f /srv/critter-ai/agent-state/missions/sign-dupes/tools/spot.sql )
  ```
- Build, check, E2E (Target 11, verbatim):
  ```
  ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a; [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1; npm run content -- build && npm run content -- check && CHROME_PATH=/srv/critter-ai/agent-state/missions/sign-dupes/chrome-nosandbox.sh npm run e2e:fresh )
  cp -r "$(ls -d e2e-artifacts/*/ | tail -1)" /srv/critter-ai/agent-state/missions/sign-dupes/final-e2e
  ```
  Must show: build `0 citation warnings (see preview).`, `Built. …`; check `Pool: 76 playable of 76 species, 2478 clues (2086 deductive), 491 facts.`, `0 errors, 0 warnings.`; e2e exit 0.

E2E scenario: the existing suite at seed 7, Africa (globe → continent → 4 rounds → resume → journal → sources). Load-bearing here: round 2's 390 px paging check finds the chimpanzee and shoots both pages in light and dark (`field guide: a sheet whose signs page at 390 px was found and shot …`), round 2's Hirola notes read the new fits, and rounds 1, 3 and 4 play as the baseline.

**V4. Artifact must show** (`/srv/critter-ai/agent-state/missions/sign-dupes/final-e2e/report.json` + screenshots):
- `node $T/report-check.cjs $M/final-e2e/report.json` exits 0: `1575 checks, 0 failed; paging: Chimpanzee; rounds: 7:found 68:lost 46:found 41:found; console errors: 0; failed requests: 0`.
- Copy `final-e2e/02f-signs-page-{1,2}-light.png` over `$M/chimp-after-p{1,2}.png`; view all four chimp shots: before page 2 has both carry signs, after page 2 has "carries young on back" alone.
- Reproduce: the V3 build/check/E2E block on `agent/sign-dupes` (seed 7, Africa are the defaults; same seed = same run).

**V5. Record and clean up:** plan 059 gets its `Final:` line (check count, artifact path); the Summary gives tags before/after (201 → 201; uses 518 → 506), merges 0, dedupes 6 pairs on 12 notes, kept pairs 80 + 9 for the owner (listed), the chimp before/after shot paths and that it still pages (058 layout), witness notes per round and bot tables before/after, no version bump and why, `git diff --stat 5c37fc04...HEAD`, the final artifact, and "production content build waits on the owner (H12)". `git worktree list` has no `/tmp/sd-before`; `ls -d $M/*e2e*` = `e2e-s5`, `final-e2e`.

**Release (runner's unit, after Verification):** rebase on `origin/main`, rerun V1–V4, PR, `gh pr merge --merge`, `deploy critter-connect`; smoke `curl -sL -o /dev/null -w '%{http_code}' https://play.critterconnect.org/explore/` = 200 and `curl https://play.critterconnect.org/version.txt` = merge commit. No pre-merge tag gate (Target 13).

## Failure modes

Isolated checks only (content edits, pair diff, `sign-map.csv`); everything else is E2E. Written before the tools (S1, S4).
- **Dedupe check (`dedupe-check.py`, D):** D1 a note still holds both tags of a pair. D2 the narrower tag dropped instead of the broader (narrower holders differ from `52 56 61 63`, `31 37 48`, `52`, `68 71`, `50`, `69`). D3 the wrong note or animal edited (broader holders differ from F2's after lists). D4 any other change: note text, another tag, tag order, key order, formatting, trailing newline (parsed `5c37fc04` file minus the broader tag on those 12 notes ≠ the file now; or a `git diff -U0 5c37fc04 -- db/content/animals` line that isn't a bare tag line; or changed files ≠ the 11). D5 invalid JSON (a left trailing comma): parse fails. D6 open tags ≠ 201 or uses ≠ 506.
- **Pair diff (`witness-pairs.ts`, W):** W1 a pair added: stop (a dedupe only removes). W2 removed ≠ 43: reconcile with F1. W3 the wrong tree read (`ROOT` unset, both runs on the branch): each run prints its tree and head, which must be `/tmp/sd-before` at 5c37fc04 and the repo root at the branch head. W4 a note's text or index differs between trees (it shouldn't): `comm` shows it as removed plus added, caught by W1. W5 unsorted output: `comm --check-order` fails.
- **`sign-map-update.ts` (C):** C1 rows ≠ 216 or a row/`SIGNS` mismatch either way; C2 a category ≠ `SIGNS`; C3 a second run writes again (not idempotent); C4 a row other than the 11 changes (`--numstat` ≠ `11 11`); C5 LF instead of CRLF (whole-file diff).

## Code review (Astra)

## Release

## Decisions

- 2026-11-09 · Revision (architect): narrower cases keep the narrower tag on their holders and drop the broader one there (one sign per fact), instead of merging into the broader tag. A merge made notes fit animals their words aren't true of (Astra MUST-FIX 1). No tag retires, `SIGNS` is unchanged, and `shell_spines`/`spiky_shell` are kept for the owner. The brief's "drop the other from `SIGNS`" doesn't arise: both tags of every pair stay in use.

- 2026-11-09 · S4: `sign-map-update.ts` skips a mark already in the cell (per mark text, not any `059:`), so `horns` gets both marks and a rerun writes nothing.

- 2026-11-09 · S4: 2 `sign-dupes.csv` reasons corrected (text only) against `pairs-removed.md`: `carries_young_on_back` said every merged link was false, but 63 with 24 59 (tail) and 61 with 54 (belly) are true; `s_shaped_horns` left out 68, whose ringed lyre horns are close to 69's.

- 2026-11-09 · S1: `witness-pairs.ts` counts `animalsFromProfiles` load notices (3 at baseline: e.g. Darwin Frog has no countries) instead of throwing, as `witness.ts` does; preview PROBLEMs (0) are checked by preview itself.

## Log

- 2026-11-09 04:33 UTC · Baseline: typecheck, lint, 66/66 tests, preview 0 PROBLEMs; dev-copy e2e:fresh 1575/1575 (`sign-dupes/baseline-e2e/`).
- 2026-11-09 04:52 UTC · Architecture: architect wrote findings + design; 201→194 tags, 7 merges (narrower tag retired via new `retired` field, kept in `SIGNS`), 88 kept pairs (8 for owner), no version bump; draft `sign-dupes.csv`. No code changed.
- 2026-11-09 04:56 UTC · Fable review: APPROVE, 0 MUST-FIX, 5 SHOULD-CONSIDER (claims and counts re-verified vs content).
- 2026-11-09 04:58 UTC · Astra review: APPROVE_WITH_CHANGES, 1 MUST-FIX (narrower→broader merges make witness notes state false shared facts, e.g. backward_pouch, spiral_horns), 5 SHOULD-CONSIDER; to architect in Revision.
- 2026-11-09 05:11 UTC · Revision: architect resolved Astra MUST-FIX via design change: no merges; 6 on-animal dupes drop the broader tag (narrower kept), 0 witness pairs added, 43 removed (~39 false today, 4 to owner); shell_spines/spiky_shell → owner pair; SIGNS untouched; CSV 13 rows revised. No code changed.
- 2026-11-09 05:21 UTC · Steps: planner wrote S1–S7 (before metrics, 12 hand tag edits, pair diff 0 added/43 removed, sign-map recompute, dev-copy build+e2e + chimp shots, H12, docs + plan 059), Verification V1–V5, Failure modes. No code changed.

- 2026-11-09 05:35 UTC · S1: tools in `$M/tools` (055's run/bot/botsum/witness repointed; new witness-pairs.ts, dedupe-check.py, spot.sql, report-check.cjs). Before (5c37fc04, /tmp/sd-before, removed after): witness tagged 433, shareable 307, notes/round world 2.24 / africa 2.12 / asia 1.84 / n-am 1 / s-am 2.01; pairs 1473; preview 0 PROBLEMs; bot exit 0 (7m22s). dedupe-check exits 1 pre-edit (12 notes with both, uses 518); report-check on baseline: 1575/0, paging Chimpanzee. Chimp before shots viewed (p2 = both carry signs). typecheck + lint 0.
- 2026-11-09 05:44 UTC · S2: 12 broader tags dropped by hand in 11 files (tag lines only). dedupe-check exit 0 (0 notes with both; 12 notes/11 files, tags only; holders ok; 201 tags, 506 uses). preview diff 12</12> lines, each minus its broader tag; 0 PROBLEMs. typecheck, lint, 66/66 tests 0.
- 2026-11-09 06:05 UTC · S3: after metrics on da70cd97. Pairs 1473 → 1430: 0 added, 43 removed (4 true/close: 24→63, 59→63, 54→61, 68→69; 39 false; `$M/metrics/pairs-removed.md`). Witness notes/round world 2.24→2.23, africa 2.12→2.04, asia 1.84=, n-am 1→0.98, s-am 2.01→1.94 (0-note rounds 5→10); tagged 433, shareable 307 unchanged. Bot exit 0; found Δ −1…0, moves left Δ −0.5…+0.1 (noise). `summary.md`, `bot-tables.md`. typecheck + lint 0.
- 2026-11-09 06:20 UTC · S4: `sign-map.csv` recomputed (`$T/sign-map-update.ts`): 216 rows, written then unchanged, categories match SIGNS; numstat 11 11, broader uses/holders as planned, narrower rule only, CRLF kept. `sign-dupes.csv` check: 216 rows = SIGNS keys, holders = 5c37fc04 sign-map, verdicts 6/5/14/15; 2 reasons corrected. typecheck, lint, 66/66, preview 0 PROBLEMs.


## Summary
