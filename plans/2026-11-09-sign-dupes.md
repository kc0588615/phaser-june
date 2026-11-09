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
- [ ] Steps: `planner` writes Steps and Verification

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

## Verification

## Code review (Astra)

## Release

## Decisions

- 2026-11-09 · Revision (architect): narrower cases keep the narrower tag on their holders and drop the broader one there (one sign per fact), instead of merging into the broader tag. A merge made notes fit animals their words aren't true of (Astra MUST-FIX 1). No tag retires, `SIGNS` is unchanged, and `shell_spines`/`spiky_shell` are kept for the owner. The brief's "drop the other from `SIGNS`" doesn't arise: both tags of every pair stay in use.

## Log

- 2026-11-09 04:33 UTC · Baseline: typecheck, lint, 66/66 tests, preview 0 PROBLEMs; dev-copy e2e:fresh 1575/1575 (`sign-dupes/baseline-e2e/`).
- 2026-11-09 04:52 UTC · Architecture: architect wrote findings + design; 201→194 tags, 7 merges (narrower tag retired via new `retired` field, kept in `SIGNS`), 88 kept pairs (8 for owner), no version bump; draft `sign-dupes.csv`. No code changed.
- 2026-11-09 04:56 UTC · Fable review: APPROVE, 0 MUST-FIX, 5 SHOULD-CONSIDER (claims and counts re-verified vs content).
- 2026-11-09 04:58 UTC · Astra review: APPROVE_WITH_CHANGES, 1 MUST-FIX (narrower→broader merges make witness notes state false shared facts, e.g. backward_pouch, spiral_horns), 5 SHOULD-CONSIDER; to architect in Revision.
- 2026-11-09 05:11 UTC · Revision: architect resolved Astra MUST-FIX via design change: no merges; 6 on-animal dupes drop the broader tag (narrower kept), 0 witness pairs added, 43 removed (~39 false today, 4 to owner); shell_spines/spiky_shell → owner pair; SIGNS untouched; CSV 13 rows revised. No code changed.

## Summary
