---
mission: moves-and-signs-build
project: critter-connect
branch: agent/moves-and-signs-build
status: active
started: 2026-11-08 04:43 UTC
---

# Mission: Lives in trees, signs inside the field guide by category, Farms & towns removed (Critter Connect)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief

### Owner's picks

Owner, 2026-11-07, after reading the design doc. These override the design where they differ.

```
Movement clue:        C (Lives in trees), in Habits, pencil weight (a) 3 points
Farms & towns:        removed (content now; constants in brief B)
Swims:                drop
Leak rules:           none. Signs and witness notes are never hidden for a dealt question (drops design
                      rules 1, 2 and 6). Plan 045's hiding of the guide's own lines for the 4 dealt
                      questions stays as it is.
Restating signs:      reword into evidence (e.g. tree_dweller -> what the note shows), from each note's own words
Misleading signs:     fix in this build (retag to what the note says)
Link option:          1 + 2 merged: signs sit inside the field guide under their category; one icon per
                      category on guide headings, "Its answers" rows, question tiles and witness notes
travelOf:             unchanged
Website shots:        later
```

---


### Goal

The game asks "Does it live in trees?", Farms & towns is no longer asked, and the suspect sheet teaches deduction openly. Every sign sits under the question category it helps answer, one icon marks each category wherever it appears, and no sign is ever hidden. The player reasons from the signs, the photo and the field guide to answer the evidence grid's questions; that reasoning *is* the game's learning moment (owner, 2026-11-07). The guide's own plain-answer lines for the 4 dealt questions stay hidden during play (plan 045), so scouting and the pencil bonus keep their point. Per the **Owner's picks** above and the design doc `docs/research/2026-11-07-moves-and-signs.md` (sections 2, 4, 5), except where the picks differ. Checkable outcomes:

1. **The movement clue, option C**, as the design specifies (doc section 2; the original brief `plans/2026-11-07-moves-and-signs-build-brief.md`, brief A, Goal 1). One `Sourced` yes/no trait `trees` in `profile.traits`, prefix in `EXCLUSIVE_PREFIXES` (missing = no record). Only `trees:yes` is ever asked ("a value `no` records an answer but is never asked", with `no` named once in `traits.ts`, used by `fullTable` in `animalBoard.ts` and `questionsFor` in `questionMatch.ts`). Category Habits, keyed after `social` in `PREFIX_CATEGORY`. Texts: question "Does it live in trees?", short "Lives in trees?", column "Lives in trees"; guide lines "It lives in trees." / "It doesn't live in trees." One unique non-animal face in `clueFaces.ts` (draft 🌲). Pencil weight unchanged (Habits, 3). `travelOf` unchanged.
2. **Content, all 76 animals** (`db/content/animals/*.json`):
   - the `trees` trait for the 71 with a record (10 yes, 61 no; no record: 13, 24, 45, 56, 71) from `STATE/research/moves.csv`, each with a plain-English `note` for grades 6–12, `source` and `url` as the original brief A, Goal 2, says;
   - the design's 5 retags and 19 note tags (`STATE/out/retags.csv`, `STATE/out/note-tags.csv`, rows whose `variants` include `c`; skip the `can_swim` rows);
   - **Farms & towns:** `artificial` and its kinds leave `habitats` in the 20 holders; afterwards `rg -l '"artificial' db/content/animals` finds nothing. Its constants stay until brief B (original brief A, Goal 3: deleting them before the owner's production content build breaks the live game).
3. **Signs that teach, not copy** (owner):
   - **Restating signs reworded into evidence.** A tag whose words simply state a question's answer (`tree_dweller` → "Lives in trees: yes" is the clear one; the `restates` column of `docs/research/2026-11-07-moves-and-signs/sign-map.csv` lists the rest) is replaced on each note by tags naming what *that note* says the animal does or has ("sleeps in branches", "hangs upside down"). Only words the note already contains; no new research.
   - **Misleading signs fixed.** Every tag in the `misleads` column of `sign-map.csv` (doc section 4, "Content notes": `fully_aquatic` on 10 and 17, `swimmer` on 25, 28, 30, 44, 51, 54, `builds_nests` on 23, 40, 46, 56, 71, `climber` on 51 and 60, and the rest) is retagged on that animal to what its note actually says, so a sign's plain reading never contradicts the animal's own answer.
   - Keep the tag vocabulary shared where notes say the same thing: a witness note shows only when two suspects share its tag (plan 044), so renaming tags one animal at a time would quietly remove witness notes. Plan 055 reports witness notes per round before and after (world and each continent with 12+ animals), as the design measured (`STATE/deals/metrics.md`).
   - Every tag still agrees with its holder's traits (design rule 4); a note left with no tag still counts as untagged, as today.
4. **Signs live inside the field guide** (options 1 and 2 merged, owner):
   - The sign chips leave the photo's side (`GuideSigns` in `src/components/animalBoard/AnimalSheets.tsx` and its paging go). Each sign sits under its category's row in the guide (Body, Habits, Habitat, Range, Life cycle), after that row's guide lines. Its category comes from `sign-map.csv` (one fixed category per tag, as the design set it), updated for the reworded tags.
   - A category row shows when it has guide lines *or* signs.
   - **One icon per category**, new `src/components/animalBoard/CategoryMark.tsx`: lucide icons per the design (Body `Eye`, Habits `PawPrint`, Habitat `Trees`, Range `MapPin`, Life cycle `Baby`), each with the category word printed or as its accessible name. Used on the guide's category headings (icon + word), the "Its answers" rows, before each question tile's label in `EvidenceGrid.tsx`, and on witness notes (one mark per distinct category of their tags). No new colour; colour is never the only cue.
   - Every question (every clue tile, "all the gem variations") maps to one of the five categories through `PREFIX_CATEGORY`, so the icon on a question tile matches the heading its signs and guide lines sit under. That match is the link the player learns: tile ↔ heading ↔ signs.
   - The photo keeps its place and credit; nothing replaces the chips beside it unless the sheet reads better with the photo smaller (mission's call, recorded).
   - The design measured option 2 as about 208 px longer per sheet at 390 px. Keep it readable on a phone without hiding anything; signs may wrap.
5. **Signs never hidden** (owner): build none of the design's leak rules 1, 2 or 6. Every sign shows during play, and witness notes are dealt as today. **Plan 045's guide-line hiding stays** (`asked` and the `guides` filter in `SuspectSheet`, `AnimalSheets.tsx`): the guide's own lines for the 4 dealt questions are hidden until round end, as now (owner, 2026-11-07: they state the answer in plain words, which would empty scouting and the pencil bonus). The suspect's own hand-written notes still never show during play (plan 044).
6. `ANIMAL_RULES.version` to the next `055-` value (`animalBoard.ts`; re-read it on `origin/main`).
7. Docs: `docs/CONTENT_SOURCES.md` gets the `trees` trait's row and written rule (doc section 2), the evidence rule (a no needs a quote; sources that disagree mean no record), the artificial class skipped, and **a sign rule**: a sign names evidence from its note, never a question's answer, and never contradicts the holder's traits. `docs/DATABASE_ACCESS.md:202-203` corrected as the original brief A, Goal 9, says. `docs/CLUE_MATCH.md`, `CONTEXT.md` where they describe signs or the guide (045's line hiding stays; say signs are never hidden). Plan `plans/055-<slug>.md` (new).

### Why

Players rule animals out on what they read, so every clue must be checkable from the photo, guide or signs. The owner wants players to *use* the signs to answer the grid, because learning to reason from evidence is what the game is for. Hiding signs to protect a round's difficulty works against that; what keeps a round a puzzle is that signs are evidence to weigh, not answers to copy (so restating signs are reworded), while the guide's plain-answer lines stay hidden (plan 045). Grouping signs under the question categories, with one icon per category on the questions too, shows the player which evidence answers which kind of question.

### Scope

In:
- `src/clueGame/`: `traits.ts`, `questionMatch.ts`, `animalBoard.ts`, `clueFaces.ts`, `profiles.ts`, a new `signs.ts` (the sign table, category per tag, `signPhrase`, `signsOf` moved from `clueFaces.ts`, and `signProblems` for `checkProfile`: an open tag missing from the table, a tag that contradicts its holder's trait, a tag whose words state an asked answer).
- `src/components/animalBoard/`: `AnimalSheets.tsx`, `EvidenceGrid.tsx`, new `CategoryMark.tsx`.
- Tests that follow the changes (`tests/clueGame/animalBoard.test.ts`).
- `scripts/e2e.mjs` where checks read sign chips beside the photo.
- All 76 content files (trait, retags, note tags, restating and misleading signs reworded, Farms & towns).
- `docs/research/2026-11-07-moves-and-signs/sign-map.csv` updated for the reworded tags, or a successor beside it.
- Docs as Goal 7. The dev-copy content build (Definition of done).

Out:
- Deleting the Farms & towns constants (brief B).
- The production content build (owner, from WSL).
- Swims, Hops, Glides; gem colours by category (option 3); a new question category or prefix kind; schema changes.
- The clue audit's parts 2 and 3 beyond the signs named in Goal 3 (label wording, bin edges, note text). Note where they touch; don't fix.
- The website, including the shots refresh.

### Definition of done

- `npm run typecheck`, `npm run lint`, `npm test` and `npm run content -- preview` exit 0, with 0 content PROBLEMs and `signProblems` empty on all 76.
- **Database checks on the dev copy only, at final verification, just before the PR**: exactly the guarded block in the original brief A's Definition of done (`plans/2026-11-07-moves-and-signs-build-brief.md`), which exports `/srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy`, checks `current_database()` is `phaser_june_dev`, then runs `content -- build`, `content -- check` and `e2e:fresh`. Never against `.env.local` (the live `phaser_june`). Never print a connection string or `cat` that file. If the guard fails, stop that step and add a handoff item.
- **Proof the tree question is dealt**: a seed and place that deal `trees:yes`, found with the design's probe (`STATE/tools/probe-seeds.mjs`), then `e2e:fresh` with that seed passing. Plan 055 records the seed, place and commands.
- **E2E** (`scripts/e2e.mjs`) adds checks that, during play: a sign chip shows under its category's row in the guide and not beside the photo; a sign that bears on a dealt question still shows, while that question's guide line stays hidden; each question tile and its guide heading carry the same category icon. Screenshots of a suspect sheet at 390 px, light and dark, during play, in the mission's state folder; their paths in plan 055.
- **Balance bot rerun** (`scripts/balance-044.ts`, 400 rounds per continent, seed 44, as `STATE/bot/summary.md`) with the numbers beside the design's. Signs now always show, so the careful player may get easier rounds; report moves left and find rates per continent, and say plainly how much easier, without changing rules to compensate. Witness notes per round before and after (Goal 3).
- One `graphical-audit` pass on the finished sheet against `GUI.md`.
- Plan 055's Summary: what changed, the picks used, the dealt-proof seed, the bot table, witness-note counts, the reworded and fixed signs (old tag → new tag, per animal), `git diff --stat origin/main...HEAD`, and that the production content build waits on the owner.
- **Handoff item** (owner): "Production content build for 055": run `npm run content -- build` from WSL **only after** the deploy succeeded (`curl https://play.critterconnect.org/version.txt` shows the merge commit), then reply `done` so the control room can start brief B. Content first would let old code read the new rows.
- Release `deploy`: merge, `deploy critter-connect`, smoke `/explore` 200 and `version.txt` = merge commit.

### Decision rules

- The design doc is the design, and the Owner's picks override it. Where `origin/main` has moved and a cited line no longer fits, follow the intent and record the deviation under Decisions in plan 055.
- Tree values come from `STATE/research/moves.csv`. One exception: where an amphibian has no record there and `docs/research/2026-11-07-amphibiaweb-wayback.md` (from mission `fact-sources`, if merged) gives a quoted yes or no on living in trees, use it, with that note's citation. No other new research.
- Rewording a sign uses only words its note already contains. If no evidence tag fits a restating or misleading tag, drop that tag from the note and list it in plan 055; never invent.
- Texts, faces and icons may be polished within the theme. Keep the engine as it is beyond what this brief lists.
- Database writes go only to `phaser_june_dev`, through the guarded block. Read the live DB only if a fact is only there, lightly.
- The accepted cosmetic risk in the original brief A still applies (other branches' CI plays new dev-copy rows with old code between the dev build and merge). Don't fix it.

### Notes

- **Start after `fact-sources` has merged and released** (both edit `AnimalSheets.tsx`; never at the same time). Base: a fresh `origin/main` with fact-sources in it: `git fetch origin --prune`, read its plan and `docs/research/2026-11-07-amphibiaweb-wayback.md`, and expect its numbered Sources on the round-end card and the journal, and its changes to the 15 amphibian files. Rebase before the PR.
- `STATE` = `/srv/critter-ai/agent-state/missions/moves-and-signs-design/` (read-only evidence: `research/moves.csv`, `out/{retags,note-tags,sign-map}.csv`, `deals/metrics.md`, `bot/summary.md`, `patches/move-c.patch`, `mockups/mock.patch` with options 1 and 2, `tools/`).
- The original brief A (`plans/2026-11-07-moves-and-signs-build-brief.md`) has the measured details this brief points to: the guarded DB block, the reference patches, the probe, the Chrome `--no-sandbox` wrapper (`STATE/chrome-nosandbox.sh`), and the known VPS timing flakes. Its Goals 5 (leak rules) and 6 (option 1 only) are replaced by this brief's Goals 3–5.
- Brief B (`ft-cleanup`) is unchanged; the control room starts it after the owner's content build.
- Plans 044 (witness notes) and 045 (scouting, guide hiding) explain the rules this builds on. Plan 054's pencil bonus rewards right pencil marks on unscouted answers; with every sign visible and reworded into evidence, a careful reader pencils better by reasoning. That's intended (owner). Copying stays impossible because the plain-answer guide lines stay hidden.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

From `origin/main` 447e9317 (fact-sources merged, PR #65), 2026-11-08.
- `npm ci`: ok (npm warns 4 install scripts not in allowScripts: esbuild ×2, @tailwindcss/oxide, unrs-resolver; builds and tests unaffected).
- No migrations (schema baseline only; this mission changes no schema).
- `npm run typecheck`, `npm run lint`: exit 0. `npm test`: 66/66 pass. `npm run content -- preview`: exit 0, 0 PROBLEMs.
- `npm run e2e:fresh` against the dev copy (guarded block, guard `phaser_june_dev` ok; no content build), `CHROME_PATH` = no-sandbox wrapper: 1558/1558 checks, default seed 7. Artifact `/srv/critter-ai/agent-state/missions/moves-and-signs-build/baseline-e2e/` (`report.json` + screenshots); reproduce with the guarded block and `npm run e2e:fresh`.

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

- 2026-11-08 04:50 UTC · Baseline: typecheck, lint, 66 unit tests, content preview, e2e:fresh on dev copy (1558/1558) all pass.

## Summary
