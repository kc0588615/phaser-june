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
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

From `origin/main` 5c37fc04 (signs-beside-photo merged, PR #69), 2026-11-09. Rules `055-0`.
- `npm ci`: ok (npm warns 4 install scripts not in allowScripts; unaffected).
- No migrations (schema baseline only; mission changes no schema).
- `npm run typecheck`, `npm run lint`: exit 0. `npm test`: 66/66 pass. `npm run content -- preview`: exit 0, 0 PROBLEMs.
- Content: 76 animals, 201 distinct open tags, 518 uses.
- `npm run e2e:fresh` vs dev copy (guarded block, guard `phaser_june_dev` ok; no content build), `CHROME_PATH=/srv/critter-ai/agent-state/missions/sign-dupes/chrome-nosandbox.sh`: 1575/1575 checks, seed 7. Artifact `/srv/critter-ai/agent-state/missions/sign-dupes/baseline-e2e/` (`report.json` + screenshots); reproduce with the guarded block (plan 055 V2) and `npm run e2e:fresh`.

## Architecture

Read on `agent/sign-dupes` e6bb2858 (= `origin/main` 5c37fc04 + plan). Every tag's verdict is in `docs/research/2026-11-07-moves-and-signs/sign-dupes.csv` (draft written by the architect: 216 rows = `SIGNS`, columns `tag,phrase,holders,verdict,reason`, holders *before* the merge; verdicts `merge into X`, `keep, absorbs X`, `keep both: X`, `owner: X` (kept, listed for the owner), `keep`, `retired in 055`). Note texts were read for every holder, not just tag names.

### Findings

**F1. "Drop the other from `SIGNS`" would take the live game down (bug; fail fast, established interface).** `signsOf` throws on a tag missing from `SIGNS` (`signs.ts:252`), at load, for every species (`questionMatchContent.ts:143`, via `animalsFromPool` in `useAnimalSession.ts:103`). Prod keeps the old rows (with the merged tags) from the deploy until the owner's production content build, so every player would get the load error in that gap. `SIGNS` already has a policy for this: it keeps every shipped tag (`signs.ts:3-4`, `CONTENT_SOURCES.md:69`; plan 055's F2, 15 retired tags today). **Fix:** retire merged tags; keep their entries. This is the brief's "drop" carried out within the load rule (recorded under Decisions).

**F2. Retired entries look like live ones (fail fast).** Nothing marks the 15 retired tags in `SIGNS` (`signs.ts:27-244`); only `sign-map.csv` does. A later note can use `spectacles` or `tree_dweller` again and pass `checkProfile`. The duplicate or restating sign then comes back without anyone noticing. **Fix:** add a `retired` reason to `SignEntry` and make `signProblems` flag it (Target design 2). `content.test.ts:10` already asserts 0 `checkProfile` problems over all 76 profiles, so `npm test` holds the line.

**F3. The duplicates (content).** 7 merges, all within one category, no `implies`/`denies` change for any holder (so 0 new sign problems):

| Merged tag → survivor | Holders | Kind | Why |
|---|---|---|---|
| `carries_young_on_back` → `mother_carries_young` (Life) | 52 56 61 63 | narrower, same note | Every holder carries both tags on the same note. The survivor is true of all 8 holders (10 24 54 59 carry on belly, tail or in back pockets), so their link stays. "On her back" stays in the note text. **Chimpanzee case.** |
| `backward_pouch` → `pouch` (Life) | 31 37 48 | narrower, same note | Same as above. "Opens backward" stays in the note text. 43's pouch opens forward; it now shares only `pouch`, like the other links. |
| `shoulder_stripe` → `stripes` (Body) | 52 | narrower, same note | — |
| `spectacles` → `face_markings` (Body) | 68 71 | narrower, same note | "Like glasses" stays in the note text. Links them to 33 38 42 50. |
| `spiral_horns` → `horns` (Body) | 50 | narrower, same note | — |
| `s_shaped_horns` → `horns` (Body) | 69 | narrower, same note | — |
| `shell_spines` → `spiky_shell` (Body) | 2 (12 holds `spiky_shell`) | same fact, two animals | "Small spines along the shell's front edge" vs "spikes around the edge of its shell". A player can't tell them apart; same category and reading (`covering:shell`). `spiky_shell` reads like the other "<kind> shell" signs. Links 2 and 12 (world rounds). |

- Narrower cases: the brief's rule drops the narrower tag only from notes that also hold the broader one. In all 6 cases every holder of the narrower tag holds the broader on the same note, so each narrower tag ends with 0 holders and retires. Dropping the broader tag instead would split one fact into two disjoint tags, so the "mother carries young" notes of 10 24 54 59 would stop fitting the chimp (false negatives).
- No merge needs a note-text change. Exactly 13 notes change, in 12 files (2 31 37 48 50 52×2 56 61 63 68 69 71).
- Counts: open tags in content 201 → 194; uses 518 → 506; merges 7; `SIGNS` stays 216 entries (retired 15 → 22); pairs compared and kept 88, of which 8 are for the owner.
- **Chimpanzee:** its box goes from 9 signs to 8. It still pages at 390 px: Body 1 line + Habits 4 + Life 1 = 6 lines in a 5-line box, so page 2 holds "mother carries young" alone. Plan 058's layout is out of scope; this goes to the owner in the Summary.

**F4. Kept for the owner (decision rule: when in doubt, keep both).** Each pair would be a *true* link if merged, but a player can tell the two apart (degree, vocabulary, or the brief's narrower-across rule):
1. `roosts_in_trees` (45) ~ `sleeps_high_in_trees` (23 35). A bat roosts where it sleeps by day, but merging needs sleep words for 45's note. It would link 45 and 23 in Africa.
2. `walks_upright` (63) ~ `stands_on_hind_legs` (24 36 52 57 61 69). 63 walks on its back legs as 24 runs on them, but 36 52 57 69 only rear up.
3. `never_climbs` (55) ~ `forest_floor` (9 46 76). 55 "never climbs" is close to 76's "hardly ever climbs", and `SIGNS` reads both the same way. But 9 and 46 say nothing about climbing.
4. `climber` ~ `often_in_trees` (71's one note) ~ `seldom_on_ground` (40 54; 40's note also holds `climber`). Each pair differs in ability vs time spent, or in degree.
5. `dung_piles` ~ `scent_marks` (66's one note). Dung marking is scent marking (72 73's droppings are tagged `scent_marks`), but a player may not read dung as scent.
6. `leaf_litter` ~ `forest_floor` (46's one note; 76 holds both). It is the same ground, but one is a Habitat sign (forest) and the other a Habits sign (stays down: trees no), and 3 and 12 hold only `leaf_litter`.

(Row 4 holds 3 of the 8 pairs.) The other 80 kept pairs differ in meaning: a named food, sound, island or body part vs a general one; land vs water (`giant_tortoise`/`giant_turtle`: `SIGNS` reads the first as land); a different holder (father/mother); the 055 splits (`climbs_boulders`/`climber`). Each has a reason in the CSV. Seen but out of scope, all retags rather than merges: 5's note also says "over a pool" (`eggs_over_water`); 4's and 75's notes also say fast (`fast_streams`); 38's face-gland note is tagged `scent_marks`; 19 spreads seeds by eating fruit (no `fruit_eater`).

**F5. Constraints checked, all fine.**
- Deals read only prefixed traits (`fullTable` `animalBoard.ts:88`, `likeness`/`canTellApart` `questionMatch.ts:313-335`).
- Open tags reach only `witnessNotes` (`:169`), `roundStillFits` (`:182`), `stillPossible` (`:507`, bot/tests) and `travelOf` (`:217`). `travelOf` reads `burrower`, `swimmer`, `fully_aquatic` and `glider`; no merge touches them, so travel is unchanged.
- Tests naming tags are unaffected: `animalBoard.test.ts:76` uses `digging_claws` (Aardvark's notes are unchanged), `testPool.ts:26` uses `cold_streams`, and `e2e.mjs:2151` uses `tree_dweller` (still in `SIGNS`; the stale-save check needs it only to load).
- 058's forced-box paging animals (13 14 41, seed 7 round 1) are untouched. The 390 px paging shot (round 2) still finds the chimp (F3).
- The e2e's seed 7 rounds should match the baseline. Round 2 (mystery Hirola, 1 move) gains a `face_markings` note.

### Target design

1. **Content** (`db/content/animals/*.json`, the 12 files above). For each `merge into` row of `sign-dupes.csv`, on each holder's notes: drop the merged tag where the survivor is already on the note, otherwise replace it in place (only 2's `shell_spines`). Use a one-off idempotent script in mission state (`/srv/critter-ai/agent-state/missions/sign-dupes/tools/apply-merges.mjs`, plain Node) that reads the CSV, so the record and the content can't drift. Guards: every listed holder holds the tag (or is already done); no unlisted file holds it; the survivor is in `SIGNS` with the same category. Afterwards no note holds a merged tag. It writes `JSON.stringify(x, null, 2) + '\n'`; all 76 files already round-trip byte for byte, so `git diff` shows only tag lines.
2. **`src/clueGame/signs.ts`.** `SignEntry` gets `retired?: string`, documented as "no note may use it: what to use instead, or why it went; kept so older content rows still load".
   - The 7 merged tags get `retired: 'merged into <survivor> (059)'`.
   - The 15 retired in 055 get their reason from `sign-map.csv`: `builds_nests` 'reads as eggs (055): use sleeping_nests'; `climbing_tail` 'reads as trees yes (055)'; `coalitions` 'reads as groups (055)'; `coastal_dunes` 'reads as coast (055): use sand_dunes'; `giant_frog` 'reads as large (055)'; `hair_like_frills` 'reads as fur (055): use side_frills'; `internal_fertilization` and `no_tadpoles` 'reads as live birth (055)'; `rock_basker` 'reads as day (055): use rests_by_waterfalls'; `rock_climber` 'reads as trees yes (055): use climbs_boulders'; `sand_swimmer` and `seasonal_streams` 'reads as fresh water (055)'; `stays_underground` 'reads as a digger (055)'; `tree_dweller` 'restates trees yes (055)'; `yellow_scales` 'reads as scales (055): use yellow_legs'.
   - `signProblems`: after the missing-entry check, `if (entry.retired) { problems.push(\`sign "${tag}" is retired: ${entry.retired}\`); continue; }`.
   - Header comment: retired entries are marked.
   - `signsOf`, `signCategory`, `noteCategories` and the categories are unchanged, so the load path and the engine stay as they are. No new entries.
3. **`sign-map.csv`**: recompute with a one-off adapted from 055's `/srv/critter-ai/agent-state/missions/moves-and-signs-build/content/sign-map-update.ts` (copy to `…/sign-dupes/tools/`; drop its `tag-edits.csv`/`can_swim` logic).
   - uses/holders/note_categories come from content.
   - Merged tags: `rule` gets `; 059: merged into <survivor>`. Survivors: `; 059: absorbs <tags>`.
   - Asserts 216 rows = `SIGNS` and every category equal to `SIGNS`. Idempotent.
4. **`sign-dupes.csv`**: committed as drafted. The Steps may only correct it, and the apply script reads it.
5. **Docs.** `CONTENT_SOURCES.md:69`: retired tags are marked `retired` and `checkProfile` flags their use. One sign-rule bullet: "Don't tag a note with a tag and its narrower case; keep the broader one other animals share (`mother_carries_young`, not also `carries_young_on_back`)."
6. **`plans/059-sign-dupes.md`** (next free; 058 is the last), short, in the style of 057/058: merges table, counts, owner pairs, retire-not-drop, no version bump and why, DB/H12, verification, chimp shots.
7. **`ANIMAL_RULES.version` stays `055-0`.** The repo's rule bumps for rules or deal changes (`animalBoard.ts:26`; 057 set the precedent for a tag-only change). No merge touches a prefixed trait or a `travelOf` tag, so every suspect set, deck, answer, travel and score is the same for the same seed; only witness notes change. They change when the owner's production content build lands, not at deploy, so a code bump would label old-content rounds as new. `roundStillFits` already re-deals a save whose notes changed, so a bump would only drop saves that still fit.
8. **Tests**: no test or e2e names a merged tag, so there are no test edits. The new `retired` check runs in `content.test.ts:10`, `content -- preview` and `build`.
9. **Balance and witness notes** (as 055 S8). Copy `…/moves-and-signs-build/tools/{run.sh,bot.sh,botsum.py,witness.ts,prod-tags.ts}` to `…/sign-dupes/tools/` and repoint the paths.
   - Before: a detached worktree of 5c37fc04 at `/tmp/sd-before` with `node_modules` symlinked. After: the branch.
   - `witness.ts` gives notes/round and rounds with 0 notes for world + the 4 places, plus static tagged / shareable notes.
   - Bot: `--rounds 400 --seed 44 --places africa,asia,north-america,south-america`.
   - Expected: notes/round and shareable notes rise, found% within noise. Record both tables in plan 059 and the Summary.
10. **DB**: dev copy only, plan 055 V3 block verbatim with `M` = this mission's state: `( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a; [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1; npm run content -- build && npm run content -- check && CHROME_PATH=…/sign-dupes/chrome-nosandbox.sh npm run e2e:fresh )`. Never `.env.local`; never print the URL or `cat` the file; if the guard fails, stop and add a handoff item.
11. **Chimp shots.** Before: `baseline-e2e/02f-signs-page-{1,2}-light.png` (round 2 chimp, page 2 = both carry signs). After: the final run's `02f-signs-page-{1,2}-light.png`. Copy both pairs to `/srv/critter-ai/agent-state/missions/sign-dupes/chimp-{before,after}-p{1,2}.png`. If the final report's paging check names another animal, open round 2's chimp sheet and shoot it with a one-off CDP script (a fallback; not expected per F3).
12. **Release.** Before `gh pr merge`, `tools/prod-tags.ts` must exit 0 (the live pool's open tags are all in `SIGNS`). **H12** (handoff, H11's format):
    - Step 1: the deploy is live.
    - Step 2: `pg-backup.sh` first, with the `backup ok` line; no backup, no build.
    - Step 3: on WSL `main`: `npm run content -- build`, then `check`. Expected: the dev copy's `Pool: …` line (76 / 2478 / 2086 / 491 if unchanged) and `0 errors, 0 warnings.`.
    - Step 4: `./scripts/db "select count(*) from species_deduction_clues where compare_tags && array['carries_young_on_back','backward_pouch','shoulder_stripe','spectacles','spiral_horns','s_shaped_horns','shell_spines']"` returns 0; `spiky_shell` holders are 2 and 12.

### Rejected alternatives
- **Delete merged entries from `SIGNS` now:** F1 (live load error until the owner's build).
- **Delete them after the owner's build:** other databases (dev copy, WSL, any old build) still hold them, and the `SIGNS` policy keeps every shipped tag.
- **Keep the narrower tag and drop the broader:** splits one fact into two disjoint tags (false negatives; F3).
- **Hide a broader sign when its narrower one shows** (`signsOf`/UI rule): an engine/UI change, out of scope; witness fits would still need both tags.
- **Merge the 8 owner pairs:** each is a judgment on degree or vocabulary, or needs note words. The brief's rule says keep both.
- **Add the missing tags (F4, last line):** retags, not merges; out of scope.
- **A repo script for `sign-map.csv`:** a research record updated once per sign round, which no code reads; the 055 one-off is reused.
- **Bump `ANIMAL_RULES.version`:** Target design 7.

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-11-09 04:33 UTC · Baseline: typecheck, lint, 66/66 tests, preview 0 PROBLEMs; dev-copy e2e:fresh 1575/1575 (`sign-dupes/baseline-e2e/`).
- 2026-11-09 04:55 UTC · Architecture: architect wrote findings + design; 201→194 tags, 7 merges (narrower tag retired via new `retired` field, kept in `SIGNS`), 88 kept pairs (8 for owner), no version bump; draft `sign-dupes.csv`. No code changed.

## Summary
