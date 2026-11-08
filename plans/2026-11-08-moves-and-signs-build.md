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
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
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

Read on `origin/main` 447e9317 (rules `054-1`, fact-sources merged). Line numbers below are 447e9317's.

### Findings (by impact)

1. **`npm test` breaks once `trees` content lands.** `tests/clueGame/animalBoard.test.ts:50-52` asserts Saola (38) and Sumatran Orangutan (40) never share a set. fact-sources moved this guard here (7df0aa5e, after the design read 69f45fa6), and `trees` splits that exact pair (38 no, 40 yes; design: 7 of 8 Asian trees rounds are this pair). Fix, in the content step: recompute the inseparable pairs (`tellsApart(fullTable(book, [a, b], place), 2)` per place). If one is left, move the guard to it; if not, delete the pair lines, because `tellsApart(deck, 5)` at `:45` still covers failure 5.
2. **`trees:no` would be dealt** (a bug). `fullTable` (`animalBoard.ts:89-92`) and `questionsFor` (`questionMatch.ts:438-441`) make a question of every value of a `PREFIX_CATEGORY` prefix. `trees:no` sorts first, so it would show its raw tag and ❓. Fix: `neverAsked`, T1.
3. **Deploy window vs a strict sign table.** Prod runs the new code on old rows until the owner's content build (`tree_dweller`, `builds_nests`, `swimmer` on land animals...). A table that dropped those tags would make the UI throw or file the signs under the wrong heading. Fix: `SIGNS` keeps every open tag ever shipped. Retired tags are flagged only by `signProblems`, never by the UI. Release adds the guard in T9.
4. **Signs sit in the faces module, and paging exists only to fit them beside the photo.** `clueFaces.ts:33-37` (`signPhrase`; `signsOf` returns a `string[]` with no category) breaks SRP: that module is about gem pictures. `AnimalSheets.tsx:270-333` `GuideSigns` (ResizeObserver page split, hidden measuring copy, 5 s timer, pause button; `SIGN_PAGE_MS` `:41`, `useLayoutEffect`, `AnimatePresence` and `Pause` are used only here) can go once the signs move. Fix: T2 and T4.
5. **The design's own new tags mislead or restate.** `retags.csv` gives `rock_climber` (4, 15) and `climbing_tail` (59). `note-tags.csv` gives `above_tree_line` (42), `stays_underground` (26) and `tree_dweller` (54, twice). Each of these is in `sign-map.csv`'s `misleads` or `restates` column. Goal 3 wins over Goal 2 for these rows, so they're decided again in the one tag-edit table (T5), not applied as written. Note tags existed to feed leak rules 1–2 (design rule 5). With those rules dropped, the rest still apply as the brief says, as evidence.
6. **DRY: guide categories listed twice.** `AnimalSheets.tsx:34` `GUIDE` repeats `CHARGE_CATEGORIES` and `CATEGORY_LABELS` (`questionMatch.ts:11`, `:17-19`). Fix: use those two directly.
7. **No query from a question to its category.** `PREFIX_CATEGORY[prefixOf(tag)]` is written inline at `questionMatch.ts:440,481`, `animalBoard.ts:133,472` and `balance-044.ts:93`, and the UI needs it in 3 new places. Fix: `categoryOf(tag): ChargeCategory` in `questionMatch.ts`, which throws when a tag has no category. Leave the existing inline uses alone (no churn).
8. **A tile's accessible name overrides any mark text.** The column button's `aria-label` is the question (`EvidenceGrid.tsx:245`), so an sr-only category word inside it is never read. Fix: `aria-label={`${CATEGORY_LABELS[c]}: ${order.question}`}`.
9. **`travelOf`'s inputs change.** `animalBoard.ts:199-205` reads `fully_aquatic` and `swimmer`. Fixing those misleading tags (10, 17; 25, 28, 30, 44, 51, 54) turns 8 animals from swimmers (they walk off the bottom) into walkers (they walk off a side). The function stays as the owner picked, and the new behaviour is more truthful. Record it in plan 055; the bot measures it.
10. **Trait notes already leak other answers** (out of scope; noted only). A trait's `note` rides on its guide line, which hides only for its own prefix (01's young note "A female lays 9 to 38 round eggs" states `birth:eggs`). The new `trees` notes must not add more such leaks (T5).
11. **Fine as is:**
    - `isHandWrittenClue` and the reserved-tag check (`profiles.ts:292-297`, `:338`) follow `EXCLUSIVE_PREFIXES`. `trees` rows become guide lines, and a hand-written `trees:` tag is rejected, with no new code.
    - Hiding works by prefix (`AnimalSheets.tsx:87`, `:99-102`), so dealing `trees:yes` hides both trees lines.
    - `canTellApart`, `likeness` (`questionMatch.ts:301-323`) and `PENCIL_WEIGHT` (habits 3, `animalBoard.ts:433`) need nothing.
    - `witnessNotes` (`animalBoard.ts:167-173`) fits notes by `animal.tags` (`questionMatchContent.ts:140`), which is unchanged.
    - Every animal file is `JSON.stringify(p, null, 2) + '\n'` (`content.ts:23`).
    - The duplicate `prefixOf` (`questionMatch.ts:174` vs `traits.ts:38`) is noted, not changed.
12. **Facts checked against the evidence.**
    - All 24 note texts in the `c` rows of `retags.csv` and `note-tags.csv` still match exactly.
    - There are 20 `artificial` holders, as listed.
    - Every `moves.csv` tree `source_key` is in `sources.json`. 63 tree rows' `url` is the profile's page for that key and 8 have no page, so those 8 get `url`; none conflict, so the brief's rule is exact.
    - AmphibiaWeb exception: the only amphibian with no tree record is 13, and AmphibiaWeb has no record either, so none applies.
    - Vocabulary: 198 open tags, 526 uses. The design counted 519; fact-sources added uses but no tags. All 198 are in `sign-map.csv`.
13. **Moved since the briefs** (record under Decisions in plan 055):

    | Brief cites | Now |
    |---|---|
    | `profiles.ts:93` / `:139-145` | `:95` / `:141-147` |
    | `isHandWrittenClue` `:290-295`, reserved `:331`, `:310` | `:292-297`, `:338`, `pageUrl :307` / `checkProfile :312` |
    | `AnimalSheets.tsx:86` (`asked`) | `:87` |
    | `e2e.mjs:383` (grid column check) | `:755` |
    | design deal/bot baselines (69f45fa6) | stale: fact-sources changed amphibian traits (09 `young: few`), so measure again on 447e9317 |
    | `STATE/tools/probe-seeds.mjs`, `run.sh` | hard-wired to the design's mockup copy and worktree, and filters `climbs\|digs`: copy and adapt, don't run in place |

    Unchanged: `traits.ts:22,27,30`, `questionMatch.ts:22,152,171,200`, `clueFaces.ts:15`, `animalBoard.ts:59` (`'054-1'`), `:199`, `:282`, `:433`, `DATABASE_ACCESS.md:202-203`.

### Target design

**T1. The `trees` trait, with one never-asked rule.**
- `traits.ts`:
  - Add `'trees'` to `EXCLUSIVE_PREFIXES` (`:22-24`).
  - Add, next to it: `export const NEVER_ASKED_VALUE = 'no'` and `export const neverAsked = (tag: string): boolean => tag.endsWith(`:${NEVER_ASKED_VALUE}`)`, with the doc line "a yes/no trait's `no` records an answer but is never asked; its `yes` question splits the same way". This is the only place `no` is named.
- `questionMatch.ts`:
  - `PREFIX_CATEGORY`: `trees: 'habits'`, keyed after `social`.
  - Texts: `QUESTION_TEXT` "Does it live in trees?", `SHORT_TEXT` "Lives in trees?" and `COLUMN_LABEL` "Lives in trees", for `trees:yes` only.
  - `questionsFor` `:441`: `if (!category || neverAsked(tag) || asked.has(tag)) continue;`
  - New `categoryOf(tag)` (finding 7).
- `animalBoard.ts`:
  - `fullTable` `:90-91`: filter `!neverAsked(tag)`.
  - `ANIMAL_RULES.version` `'055-0'`.
  - `travelOf` unchanged.
- `clueFaces.ts`: `'trees:yes': '🌲'` on the habits line; delete `:33-37`.
- `profiles.ts`:
  - `export type YesNo = 'yes' | 'no'` and `traits.trees?: Sourced<YesNo>`.
  - `TREES_TEXT` = { yes: "It lives in trees.", no: "It doesn't live in trees." }.
  - `trait('behavior', 'trees', traits.trees, TREES_TEXT)` after `:275`, so it lands in Habits after social.
  - `TRAIT_VALUES.trees`.

**T2. `src/clueGame/signs.ts`** (pure; queries only). This is the vocabulary of open tags, and it's authoritative from 055 on.
```ts
export interface SignEntry {
  category: ChargeCategory;
  /** Trait tags its plain reading states: the holder's record must not rule them out (deduction's exclusive/complete conflict). */
  implies?: readonly string[];
  /** Trait tags its plain reading rules out: the holder must not hold them. */
  denies?: readonly string[];
  /** The trait tag its words simply are (tree_dweller -> trees:yes): never used while that trait's prefix is asked. */
  restates?: string;
}
export const SIGNS: Readonly<Record<string, SignEntry>>;   // every open tag ever shipped, retired ones included (finding 3)
export interface Sign { tag: string; text: string; category: ChargeCategory }
export const signPhrase = (tag: string) => tag.replace(/_/g, ' ');                 // moved from clueFaces.ts
export function signCategory(tag: string): ChargeCategory;                         // throws on a tag missing from SIGNS
export function signsOf(tags: readonly string[] | undefined): Sign[];             // moved; open tags (no ':'), in tag order, none filtered
export function noteCategories(tags: readonly string[] | undefined): ChargeCategory[]; // distinct, CHARGE_CATEGORIES order
export function signProblems(clues: ReadonlyArray<{ tags?: readonly string[] }>, record: ReadonlySet<string>): string[];
```
- **Building the table, once:**
  - Start from `sign-map.csv`. Drop `can_swim`, which leaves 205 entries: the 198 in content plus the design's 7 new tags. `category` comes from the CSV's `category` column, and `restates` from its `restates` column (`tree_dweller` → `trees:yes`; also `climber`, `burrower`, `swimmer` → `climbs/digs/swims:yes`, which stay dormant until those traits exist).
  - Encode `implies` and `denies` by hand from the `answers` column, only where it gives a definite value of a prefix this game asks. Examples: `reddish_fur` implies `covering:fur`; `swimmer` implies `system:freshwater`; `fully_aquatic` denies `system:terrestrial`; `builds_nests` implies `birth:eggs`; `climber` implies `trees:yes`; `nectar_drinker` denies `diet:meat`. One line per entry, with no answers text and no counts.
- **No per-tag phrase:** the tag is the phrase, and plan 044's phrase list was never needed.
- **`signProblems` checks three things, mechanically:**
  - (a) an open tag missing from `SIGNS`: "add it to SIGNS with its category";
  - (b) a contradiction: some `implies` tag gets `exclusive-conflict` or `complete-conflict` from `tagOutcome(tag, record)` (`deduction.ts:17`, private today; export it and widen its parameter to `ReadonlySet<string>`, so the game's own comparison rule is reused), or some `denies` tag is in `record`;
  - (c) "states an asked answer": `restates` is set and `PREFIX_CATEGORY[prefixOf(restates)]` exists. The message names `questionText(restates)` and says "tag what the note shows".

  Whether a new tag's words merely restate an answer can't be decided mechanically beyond (c). For the tags this build adds, that's reviewed through the T5 rules and the old → new table in plan 055.
- **Acceptance for the encoding,** before any tag edits (content with `trees`, after `artificial` is removed): `signProblems` over the 76 animals flags exactly 33 contradictions and 11 restating uses.
  - Contradictions (the `misleads` pairs on tags in content, asked prefixes only):
    - Body: `yellow_scales` 1; `hair_like_frills` 7; `giant_frog` 11; `mane` 53.
    - Habits: `builds_nests` 23, 40, 46, 56, 71; `climber` 4, 15, 51, 59, 60; `coalitions` 58; `fully_aquatic` 10, 17; `nectar_drinker` 33; `rock_basker` 11; `sand_swimmer` 32; `snorkel_nose` 28; `swimmer` 25, 28, 30, 44, 51, 54.
    - Habitat: `coastal_dunes` 14, 32; `crevice_hider` 75; `seasonal_streams` 20.
    - Life cycle: `internal_fertilization` 8; `no_tadpoles` 10.
  - Restating uses: `tree_dweller` on 5, 6, 23, 30, 35, 40, 43, 45, 54, 61, 71.
  - An extra flag means the encoding is stronger than the design's judgment: weaken it and record that. It doesn't mean more retagging. A missing flag means strengthen it.

**T3. `checkProfile`** (`profiles.ts:312-348`): at the end, `if (problems.length === 0) problems.push(...signProblems(profile.clues, new Set(profileClues(profile).flatMap(d => d.tags))))`.
- It reuses `profileClues` for the record. The shape is checked first, because `profileClues` needs taxonomy, systems, habitats and redList. There's no import cycle: profiles → signs → deduction/traits, questionMatch.
- `content -- build` already refuses profiles with problems (`content.ts:130-132`), so no unknown, contradicting or restating tag can reach a database.
- `content.test.ts:10` covers it with no new test.

**T4. Interface.**
- **New `src/components/animalBoard/CategoryMark.tsx`:** `CATEGORY_ICON: Record<ChargeCategory, LucideIcon>` = { body `Eye`, habits `PawPrint`, habitat `Trees`, range `MapPin`, life `Baby` } (all present in lucide-react 0.525). Signature: `CategoryMark({ category, word = true, small = false, className = '' })`.
  - Renders `<span data-category-mark={category} class="inline-flex items-center gap-xxs …">`: the icon `aria-hidden` (`h-3.5 w-3.5`, or `h-3 w-3` when `small`), then `CATEGORY_LABELS[category]`, printed or `sr-only`.
  - Default stroke; text colour inherited (`text-neutral-7` at the call sites). No new colour.
- **`SuspectSheet` (`AnimalSheets.tsx`):**
  - Photo row: figure and peeks only. `GuideSigns`, the paging and their imports go. Size and position stay; the brief allows a smaller photo if it reads better (record).
  - "Its answers": each `<li data-answer-tag={order.tag}>` puts `<CategoryMark category={categoryOf(order.tag)} small className="text-xxs font-medium uppercase …"/>` as a small line above the question (mockup option 1). Rows keep deal order, so they match the grid's column order.
  - Guide: `CHARGE_CATEGORIES.flatMap(key => { lines = guide[key] minus lines with an asked prefix (unchanged); chips = signs.filter(s => s.category === key); show if lines.length || chips.length })`.
  - Each row: `<div className="contents" data-guide-cat={key}><dt><CategoryMark category={key}/></dt><dd>` holding the lines `<span data-guide-line={line.tags.map(prefixOf).join(' ')}>`, then `<ul data-signs aria-label="{Label} signs">` with `<li data-sign={tag} className={CHIP}>`.
  - Chips wrap and are never hidden or paged. `asked` and the line filter stay exactly as plan 045 has them.
- **`EvidenceGrid.tsx`:**
  - Before each label (`:249`): `<CategoryMark category={categoryOf(order.tag)} word={false} small className="mr-xxs align-[-1px]"/>`.
  - Button `aria-label` per finding 8.
  - The review grid gets the marks automatically.
- **`NotesList`:** under each note's text, `noteCategories(note.tags).map(c => <CategoryMark small …/>)`, printed words, `text-xxs font-medium uppercase text-neutral-7`. This also covers the desktop side notes.

**T5. Content for all 76 files: one-off script outside the repo.**
- **Location:** `/srv/critter-ai/agent-state/missions/moves-and-signs-build/content/apply.ts`, run through a copy of `STATE/tools/run.sh` pointed at this worktree. It bundles repo imports with `@/`; `scripts/run-typescript.mjs` only runs files under `scripts/`.
- **Inputs:** `moves.csv` (read-only), plus two tables the mission writes in that folder:
  - `trees-notes.csv`: `animal_id, verdict, note` for the 71 values.
  - `tag-edits.csv`: `animal_id, note (exact text), from (tags now), to (tags after), kind (retag | note-tag | restating | misleading), reason`.
- **What it does:** reads profiles with `readProfiles()` and writes them in `content.ts`'s format.
  - Sets `traits.trees = { value, note, source: source_key, url? }`, with `url` only for the 8 rows whose key has no page. The key goes after `social`, so diffs read cleanly.
  - Removes `artificial` and `artificial:*` from `habitats`.
  - Applies each `tag-edits` row: the note must match exactly once and its tags must equal `from` (or already equal `to`); otherwise it stops.
  - Every `to` tag must be in `SIGNS` (it imports it). The script can be rerun safely.
  - It ends by printing `checkProfile` problems (expect 0).
- **Why a script:** about 140 edits across 76 files by hand would be error-prone and couldn't be reviewed or redone. The two tables record every decision, and plan 055's old → new table is printed from `tag-edits.csv`. It stays out of the repo because it's one-off: the content files themselves are the source of truth.
- **`tag-edits.csv`, one row per changed note,** built from the `c` rows of `retags.csv` (5) and `note-tags.csv` (19), then corrected for Goal 3:
  - skip `stays_underground` (26), `above_tree_line` on 42, and `tree_dweller` on 54;
  - re-decide `rock_climber` (4, 15) and `climbing_tail` (59);
  - merge rows that touch the same note (for example 40, 56 and 71: `builds_nests` plus the `climber` note tag);
  - then fix the 33 contradictions and the 11 restating uses from T2.
- **Picking a replacement tag, in this order:**
  1. The note's own words support it. It adds no fact; it may paraphrase only so that one tag is shared by notes stating the same fact.
  2. Reuse an existing tag the note supports, which keeps witness notes. Examples: 28 `snorkel_nose` → `trunk`; 59 drops `climber` and keeps `long_tail`; 30 and 54 drop `tree_dweller` and keep `slow_mover`.
  3. Otherwise, one new tag shared by every note stating that fact (for example 23 and 35 both "sleep high in the trees").
  4. Never an asked answer's own words: habitat class names, fresh water / sea / land, day / night, eggs / live young, alone / pairs / groups, covering words, sizes, "lives in trees". And it must pass `signProblems`.
  5. If nothing fits, drop the tag (listed in plan 055).

  New tags get their `SIGNS` entry in the same step, with the category set by the design's rule: the majority of their notes' categories, ties going by what the sign names.
- **Rules for the `trees` notes:**
  - Grade 6–12 plain words, and only trees vs ground (no habitat, water, diet or activity words; finding 10).
  - No new science term without a `glossary.ts` entry (`CLUE_MATCH.md:70`).
  - Verdicts are taken from `moves.csv`; the script checks them.

**T6. Where the sign map lives now.** `signs.ts` `SIGNS` is the only source the code or checks read. The client needs it bundled, and content JSON is server-only by design (`contentCitations.ts:1-2`). `sign-map.csv` stays the design's research record, updated once by the T5 script so the brief is met:
- uses, holders and note categories recomputed from content;
- rows added for the new tags (`rule` = "055: replaces <old>");
- "fixed in 055" added to the `misleads` and `restates` cells it fixed;
- every row's `category` asserted equal to `SIGNS`.

A header comment in `signs.ts` and a line in `CONTENT_SOURCES.md` say the code is authoritative.

**T7. Metrics** (tools in the mission's state folder, not in the repo).
- **Witness notes per round:** `tools/witness.ts`, adapted from `STATE/tools/deals.ts`'s loop.
  - For the world and each continent with at least `MIN_PLACE_ANIMALS` (12) animals: every pool animal as seed → `pickSuspectSet(ANIMAL_RULES)` → each mystery in the set → `witnessNotes(...).length`.
  - Reports the mean per round and the rounds with no note, plus a static count of tagged notes whose tag set is held by 2 or more animals.
  - Run "before" in a detached temporary worktree of `origin/main` with `node_modules` symlinked, and "after" at HEAD. Compare with the design's move-c "without rule 2" column (world 2.28, Africa 2.02, Asia 2.02, North America 1.09, South America 2.0).
- **Balance bot:** before and after in the same two trees: `--rounds 400 --seed 44 --places africa,asia,north-america,south-america`, shown beside `STATE/bot/summary.md`. Plan 055 must say plainly:
  - The bot doesn't read signs or photos (design, Method), so "signs always show" isn't in its numbers. Its changes come from `trees`, Farms & towns going, witness notes and `travelOf` (finding 9).
  - With no rule 2, North America shouldn't repeat the design's −3.9; that came from rule 2.

**T8. E2E (`scripts/e2e.mjs`).**
- **DOM hooks:** `[data-guide-cat]`, `[data-category-mark]`, `[data-guide-line]` (the line's prefixes), `ul[data-signs]` and `li[data-sign]`, `li[data-answer-tag]`. The existing `th[data-tag]` and `[data-guide-swipe]` stay; `[data-guide-signs]` goes.
- **Removed:** the two `GuideSigns` checks (`:986` "signs showing fit beside the photo", `:987-988` "signs in pages turn…"), their measuring code (`:918-922`) and the photo-width hack (`:950-968`). The one-height drawer check stays.
- **Added:** extend the pool fetch at `:637` to give each species its open tags. Then, during play in round 1, opening each of the 5 guides:
  - E1 "every sign shows under its category's row, none beside the photo": no `[data-sign]` inside `[data-guide-swipe]`; each chip sits in a `[data-guide-cat]`; the chip tags equal the species' open tags, so none is hidden; a tag gets the same row category on every sheet.
  - E2 "a dealt question's guide lines stay hidden while its category's signs show": no `[data-guide-line]` carries a dealt prefix, and at least one (suspect, dealt question) pair has chips in the row matching that question's mark.
  - E3 "tile, answer row and guide heading carry the same category icon": for each column, the tile's mark and its `[data-answer-tag]` row's mark match in category and in the svg's `lucide-*` class; on sheets that show that category's heading, the heading's svg matches too; at least one heading matches per round.
  - E4, at the existing notes check (`:1516`): each witness note has at least one `[data-category-mark]`, none repeated.
  - E5: no column tag ends in `:no`.
- **Screenshots:** `02d-field-guide-{light,dark}.png` (top of the sheet) and `02e-field-guide-rows-{light,dark}.png` (scrolled to the rows), using the `dataset.theme` switch the sources block uses (`:1969-1987`). Copy them to `/srv/critter-ai/agent-state/missions/moves-and-signs-build/`.
- **During the build:** E2E on the dev copy plays new code on old rows, which is also the deploy-window proof.
- **Final run:** after the dev content build, with the probe's trees seed. Copy the probe from `STATE/tools/probe-seeds.mjs` with the import changed to this repo's `scripts/cdp.mjs` and the filter `^trees:`. Run it inside the same guarded subshell against its own dev server on a free port in 3100–3102.

**T9. Release guard.** Before merging, fetch `https://play.critterconnect.org/api/clue-game/pool/` (public, cached; no DB login) and check that every open tag in its `compareTags` is in `SIGNS`. If one is missing, add it before deploying.

**Step order** (each step leaves the checks passing):
1. T1 code and the version bump. No content yet, so nothing new is dealt.
2. T5 part A (`trees` ×71, Farms & towns ×20) and finding 1's test change.
3. `signs.ts` with the table, the moved functions and `signProblems`, not yet wired. `GuideSigns` temporarily maps `s.text`. Run the T2 acceptance (33 + 11).
4. T4 interface, `categoryOf`, the T8 E2E changes and screenshots.
5. T5 part B (`tag-edits.csv`, new `SIGNS` entries, the `sign-map.csv` update), then wire T3 (0 problems). Split restating and misleading into two steps if large.
6. T7 metrics.
7. Docs and plan 055.
8. `graphical-audit`.
9. Final verification: guarded block, probe and E2E; T9; the handoff item.

### Rejected alternatives
- Generate `signs.ts` from the CSV at build time, or read the CSV at runtime: a second source and a generator, and the client can't read a CSV.
- `db/content/signs.json`: breaks the rule that content JSON is server-only; the client would need it bundled.
- A per-tag `phrase` override: a second spelling to keep in sync. A tag is chosen to read as its phrase.
- Detecting restating tags by matching tag words against question text: `tree_dweller` vs "Lives in trees" doesn't match, and it would flag existing evidence tags like `bamboo_forest`.
- Checking contradictions through `restates` alone: it says nothing once rewording is done, and misses every misleading tag.
- `signProblems` in `validatePool`: the brief puts it in `checkProfile`, and the build already gates on `checkProfile`.
- Hand-editing the 76 files: can't be reviewed or redone, and risks format drift.
- Regrouping "Its answers" by category (mockup option 2): breaks the row ↔ grid column order.
- A `category` field on `Clue`/`ClueOrder`: it can be derived, and it would change the saved data shape.
- A `YES_NO_PREFIXES` or movement-prefix constant: `EXCLUSIVE_PREFIXES` plus one never-asked value is enough (YAGNI).
- Keeping chips beside the photo as well: the brief moves them, and a copy in both places would duplicate them.

### Risks and open questions for reviewers
- **Unknown tag → throw** (`signCategory`). Fail loud, made safe by keeping every shipped tag in `SIGNS`, by the build gate (T3) and by T9. The alternative is to skip the tag and log an error. Is throwing in render acceptable?
- **Look-alike tree pictures:** 🌲 (Habits question) next to Habitat's lucide `Trees` icon and 🌳 Forest. Check the shots and the audit, and polish the face if they confuse.
- **"Only words the note contains" vs shared vocabulary:** T5 allows a minimal paraphrase only to share one tag. The owner's own example "sleeps in branches" isn't literal either. Recorded as a Decision.
- **Witness notes lost** where nothing shared fits (for example 44, "It is a good swimmer.", becomes untagged). T7 reports this; no rule change to make up for it.
- **Implies/denies encoding is judgment.** It's anchored by T2's exact-match acceptance, and pairs beyond the design's list are out of scope.
- **The `"Lives in trees"` label plus an icon in a 54 px column** may clamp. E3 and the shots will show it; "In trees" is the fallback polish.
- **The sheet gets longer** (design: about +208 px at 390 px) and the signs fall below the fold. The drawer height is fixed, so the E2E height check holds. Some signs sit under a category other than the question they bear on (`fully_aquatic` is under Habits while "Fresh water" is a Habitat question): that's the design's rule, accepted by the owner, and only noted here.
- **Dead vocabulary:** retired tags (no holders after 055) can leave `SIGNS` once prod's content build is done. That's an optional follow-up for brief B; brief B is otherwise unchanged.

## Architecture review (Fable)

Checked against `origin/main` 447e9317: every cited line and count holds (test `:50-52` pair guard; `fullTable :89-92` and `questionsFor :438-441` deal every value of a `PREFIX_CATEGORY` prefix; `GuideSigns :270-333` is the only user of `useLayoutEffect`, `AnimatePresence`, `Pause` and `SIGN_PAGE_MS` in that file; `EvidenceGrid.tsx:245` `aria-label` overrides inner text; `tagOutcome` private at `deduction.ts:17`; 198 open tags, 526 uses, 20 `artificial` holders, all 198 in `sign-map.csv`; its `restates` column is exactly `burrower/climber/swimmer/tree_dweller`; lucide 0.525 has all five icons; `STATE/tools/run.sh` bundles `@/` imports with esbuild as T5 assumes). No import cycle: profiles → signs → deduction/traits + questionMatch; questionMatch → traits is new but traits imports nothing from it. Hiding by prefix (`:87`, `:99-102`) covers `trees:no` lines when `trees:yes` is dealt, as finding 11 says. The design follows the brief's picks, reuses `tagOutcome`, `CHARGE_CATEGORIES`/`CATEGORY_LABELS`, `profileClues` and the `checkProfile` build gate, and adds no second source for the sign table.

VERDICT: APPROVE

MUST-FIX: none

MISSED:
1. There is no React error boundary in `src/` (no `ErrorBoundary`/`componentDidCatch`). The plan's own open question ("is throwing in render acceptable?") therefore means: an unknown tag in `signCategory` blanks the whole `/explore` page for that player, not just the sheet. The three guards (SIGNS keeps every shipped tag, `checkProfile` gates every content build, T9 before merge) make it unreachable in practice, so this is a recorded trade-off, not a defect; see SHOULD-CONSIDER 1.

SHOULD-CONSIDER:
1. Keep `signCategory` throwing (owner: fail fast) but decide and record where the failure is meant to surface: the build gate (T3) and T9 are the "early" places; if the architect wants the render path to survive a mismatch instead, that must be an explicit Decision, not a quiet fallback.
2. T2 `restates` for `climber → climbs:yes`, `burrower → digs:yes`, `swimmer → swims:yes` encodes prefixes that don't exist (Swims dropped by the owner; Hops/Glides out of scope). YAGNI: keep only `tree_dweller → trees:yes`; add the others when a trait exists.
3. Commit `tag-edits.csv` and `trees-notes.csv` beside `sign-map.csv` in `docs/research/2026-11-07-moves-and-signs/` (the brief allows "a successor beside it"); the one-off `apply.ts` can stay in STATE. Otherwise the per-note decisions live only outside git and in plan 055's printed table.
4. Picture clash: the `trees:yes` face 🌲 sits on a Habits tile whose mark is `PawPrint`, while the Habitat heading's mark is lucide `Trees`. That teaches the opposite of the tile ↔ heading link the design wants; decide from the 390 px shots whether to change the face (non-tree) or Habitat's icon (e.g. `Mountain`/`Tent`).
5. Step 3's "GuideSigns temporarily maps `s.text`" is code written to be deleted in step 4; merge steps 3 and 4, or leave `signsOf` returning `string[]` until T4 lands. Also, finding 8's new `aria-label` must keep the existing `, highlighted` suffix.

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-11-08 04:50 UTC · Baseline: typecheck, lint, 66 unit tests, content preview, e2e:fresh on dev copy (1558/1558) all pass.
- 2026-11-08 05:18 UTC · Architecture: architect wrote findings + target design (signs.ts table, CategoryMark, content script in STATE, 9-step order); plan-only, typecheck ok.
- 2026-11-08 05:25 UTC · Fable review: APPROVE, 0 MUST-FIX, 5 SHOULD-CONSIDER (throw-site, YAGNI restates, commit csvs, tree icon clash, merge steps 3-4); plan-only.

## Summary
