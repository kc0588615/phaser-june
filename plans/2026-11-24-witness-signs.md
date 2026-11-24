---
mission: witness-signs
project: critter-connect
branch: agent/witness-signs
status: active
started: 2026-11-24 00:49 UTC
---

# Mission: Witness notes in standard sentences, and a witness gem on the starting board (Critter Connect, Neon-led)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Neon-led. Starts from main after mission sign-audit (2a) has released, with --harness agy (not queue-chain.sh, which drops it):
     mission start critter-connect /srv/critter-ai/agent-state/missions/briefs/2026-11-23-witness-signs.md --harness agy
     Part 2b of Neon's roadmap. Reviewed by Gemini 4 Neon (2026-11-23). -->

### Goal

Witness notes stop giving the animal away, and every round with an eligible note starts with a witness gem. The owner chose (2026-11-23): **a standard sentence for each sign during the round, and the animal's own vivid sentence in the reveal after it**, plus **a witness gem on the starting board**. Mission sign-audit (just before this one) defined every sign and made every animal's signs complete; read its Summary, its sign definitions and its ledger (`/srv/critter-ai/agent-state/missions/sign-audit/`).

Today a witness gem shows one of the mystery's own hand-written sentences, dealt only if its signs fit 2 or more of the 5 suspects but not all (`witnessNotes`, `src/clueGame/animalBoard.ts:231-237`). The sign is shared, but the words often aren't: the verification counted 77 of 263 dealt notes that fit only the mystery by their wording ("Its long snout curves down like a beak" can only be the echidna; `research/critter-connect/clue-verification.md` and `clue-design.md` in the vault, at `/srv/critter-ai/vault`). When it's done:

1. **In a round, a witness note is the sign's standard sentence.** Each sign that can be dealt has one sentence that every holder shares, true of every holder under sign-audit's definition, readable for the game's players (grades 6–12, read solo), and naming no animal, place or group. It describes the trait in other words than the sign's short label, so a kid thinks about the animal rather than matching words, **but the note also shows the sign's label** (or links it through the glossary, `GlossaryText`), so a kid can connect the sentence to the "false thumb" in a field guide (`AnimalSheets.tsx:217,266,455`). How a note with several signs works, and whether notes are dealt per sign rather than per hand-written note, **the lead decides** (dealing per sign would avoid two notes with the same sentence, and the tagged notes now held back for the reveal because they had too many blanks, `questionMatchContent.ts:121-128`).
2. **The reveal keeps the animal's own sentences.** After a round, the reveal card's Field notes still show the mystery's hand-written notes in full, as today (`AnimalSheets.tsx:716-720` renders `animal.notes` and `animal.revealNotes`, each as `note.full ?? note.text`), including the one behind each witness note the player collected.
3. **The starting board has a witness gem whenever the mystery has an eligible note.** Today `freshGrid` (`src/game/BoardModel.ts:476-489`) already turns each of the 44 unpinned starting cells into a witness gem with chance `witnessChance` (0.03), so about 74% of starting boards have at least one, even when the mystery has no eligible note. **The lead decides**, and records:
   - "at least one" (place one only when the random roll gave none) or "exactly one" (no random witness gems on the starting board, then one placed);
   - what happens to witness gems when the mystery has no eligible note (today they appear anyway);
   - whether the board may now depend on the mystery: today it doesn't (`useAnimalSession.ts:72,82`), and the balance bot relies on that (`scripts/balance-044.ts:363-364`).
   The placed gem is on an unpinned cell, the board still has a valid move afterwards (including after any `shuffle()`), and a given seed gives the same board.
4. **No dealt note gives the animal away by its words.** The plan shows, before and after, on the current 105 dealable sets (525 set-and-mystery combinations, recomputed after sign-audit): dealt notes that fit only the mystery by their words (target 0), combinations with at least one eligible note, and the share of rounds that start with a witness gem.

### Why

The owner's players are solo kids discovering the game on the web (owner, 2026-11-20). A witness note is the round's biology puzzle ("two of these frogs have dads that carry tadpoles: which two?"), and today it either gives the answer away or never matters. A standard sentence makes each note a fair puzzle and scales to every new animal for free; the animal's own line becomes the payoff after the round.

### Scope

In:
- `src/clueGame/` (`signs.ts` or a table beside it for the sentences, if the lead keeps them in code; `animalBoard.ts` for dealing and the starting gem; `questionMatchContent.ts` and `glossary.ts`), `src/game/` (`BoardModel.ts` and what builds the starting board), `src/components/animalBoard/` (`useAnimalSession.ts`, `AnimalSheets.tsx` and what shows notes), and their tests
- `scripts/balance-044.ts`: it builds boards itself (`board.newBoard(...)`, lines 385-387), so it must follow the new starting-board rule, or the "after" run doesn't measure it
- `scripts/e2e.mjs`: new checks for the starting gem, a standard sentence in a round and the hand-written sentence on the reveal card. Today it checks notes only when a round happens to have one (`e2e.mjs:1992-2010`). `e2e:fresh` already takes about 14 minutes against CI's 15-minute job: add the checks to rounds the E2E already plays, not new rounds.
- `docs/CLUE_MATCH.md`, `docs/ANIMAL_BOARD_PAPER.md`, `CONTEXT.md`, as far as they describe what changes
- Animal profiles only if the lead puts sentences in content rather than code; then the owner's content build is needed (Notes)

Out:
- Any write to the live database. Never run `npm run content -- build`, `ranges` or `npm run iucn` with the mission's `.env.local`.
- Tag changes: sign-audit did them. Fix only a tag the new sentences prove wrong, and record it.
- Auto rule-out, the round-end screen's wrong-pick line, spaced review (part 4), birds (part 3).

### Definition of done

- `npm run typecheck`, `npm run lint` and `npm test` pass. `npm run content -- preview` reports no problems.
- `npm run e2e:fresh` passes against the dev copy `phaser_june_dev`, never `.env.local`, after a dev content build:
  ```
  ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a
    [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1
    npm run content -- build && CHROME_PATH=$HOME/.local/bin/chrome-nosandbox npm run e2e:fresh )
  ```
  Never print a connection string or `cat` that file. If the guard fails, stop and add a handoff item. The E2E shows a round starting with a witness gem, a collected note's standard sentence in the round, and the hand-written sentence on the reveal card. Save the final run's artifact as `/srv/critter-ai/agent-state/missions/witness-signs/e2e-final/`.
- `npm run content -- check` (read-only) still passes on the live database.
- `ANIMAL_RULES.version` changes (the starting board does), saved games of the old version are handled as the repo's rules say, and a seeded round stays reproducible.
- The balance bot (updated for the new starting board), run before and after on the same seeds, in the plan. The bot judges notes by their signs, not their words (`stillPossible`, `animalBoard.ts:575`), so it measures the starting gem, not the sentences. An early witness note should make rounds easier for players who use it; the lead sets the acceptable change for each player type before the run, and records why any move outside it is right, or adjusts.
- **Every standard sentence is reviewed before it ships.** The plan lists each sentence with its sign and a check that it's true of every current holder. Fable reviews the list for truth and reading level (a `claude-task --model claude-fable-5-2 --effort high` job), and the lead rules on each item. **If Fable is out of usage, the sentences don't ship unreviewed:** wait for Fable (end the session with `MISSION_WAIT_CLAUDE` if Opus is also out; otherwise try again in a later session), or have Astra review the list instead (`astra-review --task`). This overrides `mission-lead.md`'s "skip a Fable review" for this one review.
- The final reviews are recorded: `## Code review (Astra)` and `## Code review (Fable)`, with the lead's ruling on each item.
- The Summary says whether the owner's content build is needed.

### Decision rules

- **Neon decides** (`~/.gemini/mission-lead.md`): where the sentences live (code is simpler and needs no content build), how multi-sign notes work, per-note or per-sign dealing, the starting-gem rule, and the balance limits.
- **True for every holder, or not dealt.** If no sentence is true of all a sign's holders, the sign isn't dealt as a witness note (and that goes in the Summary for a later fix), rather than a sentence that's wrong for some.
- **The deployed code must work with the live rows as they are when it deploys,** which may still be from before sign-audit's content build if the owner hasn't run it yet: a tag with no standard sentence (a retired or old sign) is skipped as a witness note or falls back safely, never throws.

### Notes

- **If any content changes** (sentences in profiles, or a tag fix), add one handoff item after the deploy's smoke tests pass: from WSL, update `main`, take a fresh dump, `npm run content -- build`, then `npm run content -- check`, with the expected summary line.
- The research's scripts are in `/srv/critter-ai/agent-state/missions/cc-clue-design/scripts/`, pinned to `0837540a`; recompute anything that depends on the dealer or the tags.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

## Baseline

- Branch / base: `agent/witness-signs` at `a1a33d3d`, cut from `origin/main` `8d246c70` (PR #86 `sign-audit`). Clean working tree; `/srv/critter-ai/handoff/critter-connect.md` has one open item `H22` (`Status: waiting on you`, `sign-audit` production content build; no `Status: done` items).
- Runtime: Node `v24.21.0`, npm `11.19.0`; `node_modules` installed; no DB migrations (baseline `db/schema.sql` already live and on `phaser_june_dev`).
- `npm run typecheck`: pass (exit 0).
- `npm run lint` (`eslint` + `check-theme.mjs`): pass (exit 0, 0 warnings).
- `npm test`: pass (147/147 tests, 3 suites, 0 failed, 5.5 s).
- `npm run content -- preview`: pass (exit 0, 0 problems across 76 profiles).
- `npm run content -- check` (live `phaser_june`, read-only): pass — `Pool: 76 playable of 76 species, 2475 clues (2083 deductive), 491 facts. 0 errors, 0 warnings.` (live DB still holds `7bce511a` rows pending H22).
- Guarded `phaser_june_dev` `npm run content -- build && npm run content -- check`: pass — `content_sources: 16 rows`, `species: 76 rows`, `species_deduction_clues: 3653 rows`, `species_facts: 491 rows`; `Pool: 76 playable of 76 species, 3653 clues (3041 deductive), 491 facts. 0 errors, 0 warnings.`
- Guarded `phaser_june_dev` `CHROME_PATH=$HOME/.local/bin/chrome-nosandbox npm run e2e:fresh`: pass — `1554/1554 checks passed` (Anywhere load median 2374 ms at 1x, 4800 ms at 4x). Artifact: `/srv/critter-ai/agent-state/missions/witness-signs/e2e-baseline/`.
- Balance bot before (`node scripts/run-typescript.mjs scripts/balance-044.ts --rounds 200 --seed 44 --places world,africa,asia`, rules `055-1`, `witnessChance 0.03`, full table at `/srv/critter-ai/agent-state/missions/witness-signs/balance-before.txt`):

| Place | Player | Found | ★★★ | Escaped | Ran out | Identified | Moves left | Orders | Notes | Points |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| world (76, 49 sets) | careful | 99% ±1 | 82% | 0% | 2% | 98% | 19.4 | 1.6 | 3.2 | 330.6 |
| world | novice | 99% ±1 | 84% | 0% | 2% | 99% | 19.4 | 1.5 | 3.2 | 331.8 |
| world | expert | 100% ±0 | 91% | 0% | 0% | 100% | 20.4 | 1.3 | 3.0 | 348.3 |
| world | reader | 97% ±2 | 60% | 0% | 6% | 96% | 15.6 | 1.7 | 3.5 | 270.6 |
| world | guesser | 20% ±6 | 20% | 80% | 0% | - | 27.7 | 0.0 | 0.8 | 85.5 |
| world | random | 22% ±6 | 0% | 0% | 100% | - | 0.0 | 3.9 | 5.1 | 10.8 |
| world | oracle | 100% ±0 | 100% | 0% | 0% | - | 27.8 | 0.0 | 0.9 | 428.3 |
| africa (26, 23 sets) | careful | 100% ±0 | 87% | 0% | 3% | 97% | 19.3 | 1.8 | 3.2 | 333.8 |
| africa | novice | 98% ±2 | 85% | 0% | 3% | 98% | 19.6 | 1.8 | 3.3 | 331.9 |
| africa | expert | 100% ±0 | 91% | 0% | 0% | 100% | 20.0 | 1.5 | 3.0 | 345.9 |
| africa | reader | 97% ±2 | 62% | 0% | 9% | 94% | 15.2 | 1.9 | 3.6 | 268.7 |
| africa | guesser | 20% ±6 | 20% | 80% | 0% | - | 27.9 | 0.0 | 0.7 | 85.8 |
| africa | random | 22% ±6 | 0% | 0% | 100% | - | 0.0 | 3.9 | 5.3 | 10.8 |
| africa | oracle | 100% ±0 | 100% | 0% | 0% | - | 27.8 | 0.0 | 1.0 | 428.3 |
| asia (17, 15 sets) | careful | 99% ±1 | 81% | 0% | 3% | 98% | 18.2 | 1.8 | 3.1 | 316.2 |
| asia | novice | 100% ±1 | 81% | 0% | 1% | 99% | 18.2 | 2.0 | 3.2 | 317.6 |
| asia | expert | 100% ±0 | 89% | 0% | 0% | 100% | 19.4 | 1.6 | 2.9 | 336.8 |
| asia | reader | 98% ±2 | 58% | 0% | 4% | 96% | 14.8 | 2.0 | 3.2 | 265.6 |
| asia | guesser | 20% ±6 | 20% | 80% | 0% | - | 27.9 | 0.0 | 0.6 | 85.8 |
| asia | random | 22% ±6 | 0% | 0% | 100% | - | 0.0 | 3.9 | 4.8 | 10.8 |
| asia | oracle | 100% ±0 | 100% | 0% | 0% | - | 27.8 | 0.0 | 0.8 | 428.2 |

Careful moves left at find (20th/40th/60th pct): world `14/19/22`, africa `15/19/21`, asia `14/17/21`.

## Architecture

Pass 2: one design. Code at `7f1f5dd2` (HEAD = `origin/main` `8d246c70` plus the plan). "Live" means HEAD code run on the `7bce511a` content, which the live `phaser_june` rows hold until H22 runs. Figures were recomputed offline. The "after" figures model this design: per-sign dealing, the 10 edges wired, implied signs dropped, and `null` for `floreana_island`, `pinta_island` and `prairie_dog_towns`. Dealable sets are enumerated as `balance-044.ts reportDeals` does: 105 sets and 525 combos on both content versions. Pass 1's working is in `$STATE/tasks/20261124-011126-architect.md`.

### Pre-change facts

| Measure | HEAD profiles | Live `7bce511a` rows |
|---|---:|---:|
| Combos with ≥1 note: today, dealt per note (`animalBoard.ts:240-246`) | 525/525 | 403/525 |
| Combos with ≥1 note: this design, per sign | 525/525 (min 3 a combo) | 458/525 |
| Notes dealt: today / this design | 5,803 / 6,107 | 943 / 1,355 |
| Notes in this design that need `also` chips | 455 (7.5%) | 169 |
| Signs dealt at least once (this design) | 142 | 82 (all within HEAD's) |
| Dealt notes with several signs; repeating a sign already dealt in the combo (today) | 65; 40 | 107; 20 |
| Dealt notes shown with blanks (today) | 60 | 69 |
| Dealt notes whose text isn't the sign's shared standard sentence (today) | 509 (157 distinct) | 921 (257 distinct) |
| Items censored into `revealNotes` (>2 blanks) | 16 untagged facts on 13 animals, 0 tagged | 16, 0 tagged |
| Notes shown with blanks (`full` set) | 294 | 286 |
| Retired tags held; unknown tags | 0; 0 | 0; 0 |
| `signProblems` with the 10 edges wired | 0 | 2, both already there (33 `above_tree_line`+`high_mountains`, 66 `dung_piles`+`scent_marks`; preview-only, not in `validatePool`) |
| Field guides that lose a badge when the 10 edges are wired | 2 | 0 |
| Held signs summed over the 76 animals (`heldSigns`) | 1,458 (max 33 for one animal) | 506 |
| `animalsFromProfiles` warnings | 3 ("no countries" for 3 profiles, from the scratch read) | 3 |

- **Starting board.** `freshGrid` rolls `witnessChance` 0.03 on all 49 cells, and `setPins` makes 5 of them ignored. P(no gem on the 44 free cells) = 0.97^44 = 26.18%, so P(≥1) = 73.82%, with a mean of 1.32. Pinned cells keep a grid value, possibly purple (`BoardModel.ts:6-7`), so every count must skip pins. Placing a gem on the boards that had none removed the last valid move once in 5,267 boards, and `shuffle()` fixed it.
- **The 10 deferred edges** (sign-audit Summary): `backward_pouch→pouch`, `carries_young_on_back→mother_carries_young`, `face_mask→face_markings`, `feathery_gills→underwater_breathing`, `s_shaped_horns→horns`, `shoulder_stripe→stripes`, `spectacles→face_markings`, `spiral_horns→horns`, `tear_lines→face_markings`, `walks_upright→stands_on_hind_legs`. Each passed entailment and was blocked only by the wording of old notes, which per-sign dealing no longer shows.
- **Callers.**
  - `WithBlanks`: `AnimalGame.tsx:20,55` and `AnimalSheets.tsx:18,447`, both witness notes.
  - `noteCategories`: `AnimalSheets.tsx:15,449` and `signs.test.ts:19,160`.
  - `BLANK`: `WithBlanks.tsx:2` and `censor`.
  - `revealNotes` / `full`: `questionMatchContent.ts:121-134`, `questionMatch.ts:30-31,47-48`, `AnimalSheets.tsx:616,717`, and the fixture at `animalBoard.test.ts:188`.
  - `RareGem`: `BoardModel.ts:26,119,132`. `EventBus.ts:55` repeats its shape inline.
  - `newBoard` with a rare gem: `ClueBoardScene.ts:150`, `balance-044.ts:385,387`, `boardModel.test.ts:45,62,417`.
  - `animalDebugSummary`: `useAnimalSession.ts:253`. Its `notes` count is read by `e2e.mjs` and `scripts/shots/take.mjs:167-191`.
  - `ANIMAL_RULES`: `useAnimalSession.ts`, `balance-044.ts:323-333`, `savedGame.test.ts`, `animalBoard.test.ts`.
  - Sign-table literals: the `sign()` helper and `T` in `signs.test.ts:24-45`, `TABLE` in `animalBoard.test.ts:372-376`.

### Findings

1. **A witness note is the mystery's own sentence, so its words give the animal away.**
   - Where: `animalBoard.ts:231-246` (`WitnessNote extends FieldNote`, dealt per note); shown at `AnimalSheets.tsx:447` and `AnimalGame.tsx:55`.
   - On HEAD, 509 of 5,803 dealt notes aren't the sign's shared sentence. On live it's 921 of 943, including sign-audit's listed giveaways. 76 signs have 2 or more different texts across holders.
   - Breaks: Goal 4 (correctness) and DRY (one fact written once per holder).
   - Fix: deal per sign; the text is `SIGNS[sign].witness`.
2. **Censoring notes becomes dead code once the round stops showing them.**
   - Where: `questionMatchContent.ts:22-25,51-59,111-129` (censor, `BLANK`, `MAX_BLANKS`, the `notes`/`full`/`revealNotes` split), `questionMatch.ts:30-31,45-48`, `WithBlanks.tsx`.
   - Today the blanks also mangle sign-audit's standard sentences, for example "It was a giant ____."
   - After the fix, the only reader is the reveal card (`AnimalSheets.tsx:616,717`), which always shows `full ?? text`, the whole note.
   - Breaks: KISS (data nobody reads, docs saying notes are blanked).
   - Fix: notes keep their whole text in profile order; `full`, `revealNotes`, `MAX_BLANKS`, the `BLANK` export and `WithBlanks.tsx` go. The censor and the name-word list (`giveaways`) stay, used for one new job: warning when a witness sentence names an animal that holds its sign (finding 9).
3. **Dealing per note repeats signs, ties several signs together, and skips signs held only by implication.**
   - Where: `animalBoard.ts:225-229,240-246`.
   - 40 HEAD notes repeat a sign already dealt in the same round. 65 notes have several signs and fit only suspects holding all of them. `high_mountains` held through `above_tree_line` is never dealt.
   - Breaks: KISS (the unit dealt is a sentence, not a fact).
   - Fix: per-sign dealing over `heldSigns`, dropping signs implied by another eligible one.
4. **A witness note shows no sign label, and the field guide's one-badge-per-fact rule hides the broader chip.**
   - `NotesList` shows only `CategoryMark`s (`AnimalSheets.tsx:445-451`).
   - `signsOf` (`signs.ts:358-367`) hides a broader chip behind a narrower one. So a "climber" note fits a guide that shows only "climbs boulders": 455 of 6,107 notes on HEAD.
   - Fix: the shared `SignChip`, plus `also` chips joined by "or".
5. **Starting witness gems are left to chance.**
   - Where: `BoardModel.ts:132-144,476-489`.
   - 26.2% of boards start with none.
   - `EventBus.ts:55` repeats `RareGem`'s shape inline (DRY).
   - Fix: B3 top-up; the event payload reuses `RareGem`.
6. **The 10 deferred edges.**
   - Where: `signs.ts:46,65,87,92,179,195,205,208,230,247`. They are documented as deferred at `CONTENT_SOURCES.md:84-98`, and pinned as unwired at `signs.test.ts:163-166`.
   - With per-sign sentences every fit they add is true by definition.
   - Fix: wire all 10. That test must be replaced, or `npm test` fails.
7. **The save guard compares the old note shape.**
   - `roundStillFits` (`animalBoard.ts:254-269`) compares `text`/`tags`/`fits`.
   - `stillPossible` (`:582-586`) passes the note itself as a `FieldNote`.
   - Fix: compare `sign`/`text`/`fits`/`also`; fit on `{ tags: [note.sign] }`. Old saves are already dropped by the version check, which runs first (`useAnimalSession.ts:119`).
8. **E2E gaps and one bug the new shape would cause.**
   - Notes are checked once, only in the first round that collects one (`e2e.mjs:2011-2029`).
   - Starting gems and the reveal card's Field notes are never checked.
   - The stale-save fixture pushes the old shape (`:2309`), and the predicate `note.tags.includes(...)` (`:2325`) would throw on the new shape. Inside `waitFor(...).catch(() => null)` that error is hidden, and the later A16 checks fail with a confusing message.
9. **No guard keeps a sentence from naming a holder.**
   - The only per-animal name-word list is built inside `buildAnimal` (`questionMatchContent.ts:111-119`, which needs countries; `Animal` doesn't keep them).
   - Fix: extract into `witnessNameProblems(profiles)` in `questionMatchContent.ts`, called by `scripts/content.ts` (`preview`) and a unit test. Fails loud in CI and authoring without burning regexes on browser page load.
10. **Stale docs and comments.**
    - `CLUE_MATCH.md:20,22,51,53,61,90`; `CONTEXT.md:58-59,100-101`; `ANIMAL_BOARD_PAPER.md:3` (plus a new later-rules note); `CONTENT_SOURCES.md:81,84-98,102`.
    - The comment at `AnimalGame.tsx:499` says the side notes are "only blanked copies".

**Areas that are fine:**
- `animalFitsNote` (one fit check; it stays the only one).
- The `heldSigns` closure: retired tags are held as themselves, and unknown tags throw, but already at load in `signsOf` (`questionMatchContent.ts:135-136`), so dealing never meets one.
- Seeded `newBoard`; `shuffle()` keeps the gems it has; `loadBoard` on resume.
- `fitsShape` doesn't look inside arrays, so the note shape doesn't affect it. It does catch the new `rules.startWitness` key.
- The reveal card's markup; `GlossaryText`; `glossary.ts` (no change).

### Target design

**Answers to the brief's questions:**
- Sentences live in code, one per sign, on its `SIGNS` entry.
- Notes are dealt per sign, so there are no notes with several signs.
- The starting board has at least one witness gem, always, whatever the mystery.
- If a round has no note, its gems give none, as today (0/525 on HEAD; 67/525 live until H22).
- The board doesn't depend on the mystery.
- Rules version `'055-2'`.

#### Code changes, file by file

**`src/clueGame/signs.ts`**

New field and helper:
```ts
export interface ActiveSignEntry { category; meaning; /** The standard witness sentence: true of every holder, names no animal, group or place, doesn't repeat the label; null = never dealt (comment why). */ witness: string | null; implies?; denies?; retired?: never }
const at = (category: ChargeCategory, meaning: string, witness: string | null, rules: Pick<ActiveSignEntry, 'implies' | 'denies'> = {}): ActiveSignEntry => ({ category, meaning, witness, ...rules });
/** Whether `tag` exists in `table` (active or retired). */
export function isKnownSign(tag: string, table: SignTable = SIGNS): boolean
/** A sign's standard sentence; null for a retired, unknown or deliberately unwritten sign (never throws: old live rows load). */
export function witnessSentence(tag: string, table: SignTable = SIGNS): string | null
```
- `RetiredSignEntry` doesn't change. The union's excess-property check (keyed on `retired`) already rejects `witness` on a retired entry, the same way it rejects `meaning` today.
- All 201 `at(...)` calls get the sentence as the third argument.
- `null` only on `floreana_island`, `pinta_island` and `prairie_dog_towns` (one holder each; they can't be said without a place or animal). Each gets a one-line comment.

`signTableProblems` additions, for each active entry with `witness !== null`:
- empty, or `witness !== witness.trim()`;
- contains `_` (a blank);
- repeats its label. The label pattern is `new RegExp(\`\\\\b\${tag.split('_').map(escapeRegExp).join('[\\\\s-]+')}\\\\b\`, 'i')`: whole phrase, case-insensitive, with space or hyphen between words. So `s_shaped_horns` matches "S-shaped horns" and "s shaped horns", and `mane` doesn't match "remains". Inflections ("horn" for `horns`) are left to the Fable review.
- The existing load-time throw (`signs.ts:261-262`) covers it.

The 10 edges are wired: the broader sign is appended to each narrower one's `implies`.

Removed: `noteCategories` (dead).

**`src/clueGame/questionMatch.ts`**
- `FieldNote = { text: string; source: Source; tags?: readonly string[] }`; `full` goes.
- `Animal.revealNotes` goes.
- `Animal.notes`' doc becomes "hand-written clues then facts, in profile order, whole: the reveal card's Field notes".

**`src/clueGame/questionMatchContent.ts`**
- `buildAnimal` pushes every item into `notes` whole.
- `MAX_BLANKS` and the `BLANK` export go. `BLANK` stays module-local inside private `censor`, and `censor`/`giveaways` are removed from `buildAnimal`'s runtime path (zero page-load regex work in the browser).
- New exported authoring/CI check `witnessNameProblems(profiles: readonly AnimalProfile[], table: SignTable = SIGNS): string[]`: builds each profile's `giveaways` list and checks `witnessSentence(sign, table)` for every `sign` in `heldSigns(allTags, table)` via private `censor` (no blanket label-word exemption, so animal/group nouns like `tortoise`, `turtle`, `pig` stay blocked). Returns one message per hit (`${profile.commonName}: the witness sentence of "${sign}" names it ("${named.text}"): reword it in SIGNS (src/clueGame/signs.ts)`). Called by `tests/clueGame/content.test.ts` and `scripts/content.ts` (`preview`).
- Live pool resilience (`animalsFromPool`): before passing clues to `buildAnimal`, filter out any unknown open tag (`!tag.includes(':') && !isKnownSign(tag)`), calling `warn(`${species.commonName}: skipping unknown sign "${tag}" from pool`)` for each dropped tag, while keeping trait tags and known/retired signs. `isHandWrittenClue` still inspects raw `compareTags` (trait prefixes only). `animalsFromProfiles`, `signsOf`, `heldSigns`, and `signProblems`/`checkProfile` remain strict (throw on unknown signs).
- Header comments at `:1-6` and `:109-110` are updated.

**`scripts/content.ts`**
- In `preview` mode, also print any problems from `witnessNameProblems([profile])` as `  PROBLEM ...`.

**`src/clueGame/animalBoard.ts`**
```ts
/** One of the mystery's signs as its standard sentence; `fits`: suspects holding the sign; `also`: narrower signs some suspects' guides show instead of this one (sorted). */
export interface WitnessNote { sign: string; text: string; fits: number; also: string[] }
export function witnessNotes(book: Book, suspects: readonly number[], mysteryId: number): WitnessNote[]
```
How `witnessNotes` deals:
1. Go through `[...heldSigns(mystery.tags)]` in its fixed order: own tags in clue order, each followed by what it implies.
2. Keep a sign when `witnessSentence(sign) !== null` and `fits = suspects.filter(id => animalFitsNote(animal(book, id), { tags: [sign] })).length` is between 2 and `suspects.length - 1`.
3. Drop a kept sign that another kept sign implies (`other !== sign && heldSigns([other]).has(sign)`). The narrower one says it already.
4. Set `also = chips.filter(tag => tag !== sign && heldSigns([tag]).has(sign))`, where `chips` is the sorted, distinct `signs[].tag` across all suspects.

What this guarantees:
- Every fitting suspect shows `sign` or one `also` chip, and no non-fitter shows either.
- `also` depends only on the sign and the set, so it tells the player nothing beyond `fits`.
- Order is the profile's, deterministic, and there are no repeats.
- No new export: `heldSigns` covers both "implies" tests. `narrowerSigns` isn't needed.

Other changes in the file:
- `roundStillFits`: guard `same` so malformed/missing fields return `false` cleanly (`typeof a?.sign === 'string' && typeof a?.text === 'string' && typeof a?.fits === 'number' && Array.isArray(a?.also) && a.sign === b.sign && a.text === b.text && a.fits === b.fits && a.also.join('|') === b.also.join('|')`), check `[...round.notes, ...round.notesLeft]` against `fresh`, AND verify every `{ kind: 'note' }` entry in `round.log` matches `round.notes` in order (`logged.length === round.notes.length && logged.every((note, i) => same(note, round.notes[i]))`); doc updated.
- `stillPossible`: `animalFitsNote(animal(book, id), { tags: [note.sign] })`.
- `animalFitsNote` stays.
- `AnimalRules.startWitness: number` ("witness gems a new board's free cells hold at least").
- `ANIMAL_RULES`: `version: '055-2'`, `startWitness: 1`; the tuning comment gets one line on the 055-2 bot result.
- `applyPhase` doesn't change.

**`src/game/BoardModel.ts`**
- `RareGem { type; chance; /** a new board's free cells hold at least this many */ atLeast?: number }`.
- `newBoard`: `noToys()` → `setPins(pins)` → validate `minRare = this.rare?.atLeast ?? 0` (throw `RangeError` if `!Number.isInteger(minRare) || minRare < 0 || (minRare > 0 && freeCount - minRare < 3)`, where `freeCount = width * height - pinnedCells().length`) → loop up to 20 attempts: `freshGrid()` → `this.topUpRare()` → `if (!this.hasAnyValidMove()) this.shuffle()` → return once `this.findMatches(this.grid, this.toys).length === 0 && this.hasAnyValidMove()`; if all 20 attempts fail (impossible geometry), throw `RangeError`.
- Private command `topUpRare()`:
  - count rare gems on unpinned cells;
  - while the count is under `rare.atLeast ?? 0` and unpinned non-rare cells remain, turn `free.splice(Math.floor(this.rng() * free.length), 1)[0]` into the rare gem.
- On normal boards it finishes on attempt 0 and uses the rng only when it places a gem, so the 73.8% of boards that already roll a gem come out byte-identical, which keeps the bot comparison paired.
- A rare gem never matches, so placing one can't create a standing match.
- `loadBoard` and refills don't change; `pickGem` keeps `chance`.

**`src/game/EventBus.ts:55`**
- `rare?: RareGem` (type import from `./BoardModel`, which it already imports from).

**`src/components/animalBoard/useAnimalSession.ts:205`**
- `rare: { type: WITNESS_GEM, chance: round.rules.witnessChance, atLeast: round.rules.startWitness }`.
- `boardSeed` still comes from the set alone (`:72,82` unchanged).

**`src/components/animalBoard/AnimalSheets.tsx`**
- Module-local `function SignChip({ tag, as: Tag = 'li' }: { tag: string; as?: 'li' | 'span' })` renders `<Tag data-sign={tag} className={CHIP}>{signPhrase(tag)}</Tag>`. `SignGroups` (`:332`) uses it, unchanged in the DOM (`sign.text === signPhrase(sign.tag)` by `signsOf`).
- `NotesList` item:
  - `<li data-witness-sign={note.sign}>`
  - `<p><GlossaryText text={note.text} /></p>`
  - label row `<p className="m-0 flex flex-wrap items-center gap-xxs">`:
    - `<span className={MARK_CAPTION}><CategoryMark category={signCategory(note.sign)} small /></span>`
    - `<SignChip tag={note.sign} as="span" />`
    - then for each `also`: `<span className="text-xxs text-neutral-7">or</span><SignChip as="span" />`
    - The chips sit outside `MARK_CAPTION`, whose `uppercase` would otherwise make them differ from the guide's chips.
  - the fits row, unchanged.
- Reveal card: `const notes = animal.notes;` and `text: note.text`. Its markup doesn't change.
- Imports: `noteCategories` and `WithBlanks` go; `signCategory` and `signPhrase` come in.

**`src/components/animalBoard/AnimalGame.tsx`**
- `LogText` note: `{note.text} <span className="text-neutral-7">({[note.sign, ...note.also].map(signPhrase).join(' or ')}) Fits {fits} of {count}.</span>`. It stays plain text in the live region, without `GlossaryText`.
- The `WithBlanks` import goes; the comment at `:499` is fixed.

**Deleted: `src/components/clueGame/WithBlanks.tsx`.**

**`src/clueGame/animalSession.ts` `animalDebugSummary`**
- Keeps `notes` as a count (e2e and `shots/take.mjs` read it).
- Adds `witness: round.notes.map(n => ({ sign: n.sign, text: n.text, also: n.also, behind: mystery.notes.filter(f => heldSigns(f.tags).has(n.sign)).map(f => f.text) }))`.
- `behind` is never empty: every held sign comes from an open tag on a hand-written note, and every hand-written clue is now in `notes`.

**`src/game/debugBridge.ts`**
- Adds `signWitness(): Record<string, string>` (active signs with a sentence, through `witnessSentence`), beside `signImplies`.

**`scripts/balance-044.ts`**
- `rules.startWitness = Number(arg('start-witness', String(ANIMAL_RULES.startWitness)))`.
- `:387` passes `atLeast: rules.startWitness`. The scratch board at `:385` stays at 0, since it is only reloaded.
- The header prints the start count. One line per place: "starting boards with a witness gem: X% (mean Y)", counted on unpinned cells after `newBoard`.
- `--explain` prints `"${note.text}" (${note.sign}) fits …`.

#### Invariants and failure modes

| # | Invariant | Held by |
|---|---|---|
| I1 | Every dealt note's text is `SIGNS[sign].witness`, true of every HEAD holder, names none, and isn't blanked | dealer, `signTableProblems`, `witnessNameProblems` (`content -- preview` + test), Fable gate |
| I2 | No two notes in a round share a sign, and none is implied by another | dealer step 3, unit test |
| I3 | `fits` = suspects holding the sign by `heldSigns`, between 2 and n−1, mystery included; the bot and `stillPossible` use the same predicate | `animalFitsNote`, unit test |
| I4 | Every fitter shows `sign` or an `also` chip; no non-fitter does | dealer step 4, unit test |
| I5 | Retired, unknown or `null`-sentence signs are skipped and never throw on the live pool door; authoring/tests stay strict | `isKnownSign` filter in `animalsFromPool`, `witnessSentence`, unit tests |
| I6 | A new board has ≥ `startWitness` witness gems on unpinned cells, no standing match and a valid move; infeasible `atLeast` fails fast with `RangeError`; same seed gives the same board; boards that rolled one are unchanged | `newBoard` validation + retry loop, `topUpRare`, board tests |
| I7 | The board doesn't depend on the mystery | `atLeast` comes from rules |
| I8 | 055-1 saves are dropped; a malformed or mismatched 055-2 note in `notes`, `notesLeft`, or `log` returns `false` from `roundStillFits` and is dropped cleanly | `roundStillFits`, `useAnimalSession.ts:117-133` |

#### Tests (failure modes written first, in each block's header comment)

**`tests/clueGame/signs.test.ts`**
- Fixtures: `sign(meaning, rules, witness = null)` and `T` include `witness`.
- A1:
  - an empty, whitespace or untrimmed sentence is a problem;
  - `_` is a problem;
  - the label is a problem, single-word, multi-word, hyphen form and any case;
  - a label inside another word passes;
  - `null` passes; retired entries are skipped.
- A1 on the real table:
  - `signTableProblems(SIGNS)` is empty;
  - the `null` signs are exactly `['floreana_island', 'pinta_island', 'prairie_dog_towns']`.
- A2 (`@ts-expect-error`): an active entry without `witness`; a retired entry with `witness`.
- `witnessSentence` & `isKnownSign`: retired → `null` / `true`; unknown → `null` / `false`, with no throw; `null` entry → `null` / `true`; active → its text / `true`.
- A4: the deferred-pair test (`:163-166`) is replaced by "the 10 former deferred edges are wired": each in `implies`, and `badges(['backward_pouch', 'pouch'])` → `['backward_pouch']`.
- The `noteCategories` assertion (`:160`) goes.

**`tests/clueGame/animalBoard.test.ts`**
- `TABLE` gets `witness: null`; the synth fixture loses `revealNotes`.
- `:82-91` keys on `note.sign`.
- A8: the fixture note becomes `{ sign: broader, text, fits: 3, also: [] }`; `witnessNotes(...).filter(w => w.sign === broader)`. Its `also` contains `narrower` when suspect 2 shows it.
- A8 on real content and S25b: they use `{ tags: [note.sign] }` and `witness.sign === sign`. All 5 pinned cases still hold under this design (recomputed).
- New W-block, on real content over `PLACES × sets(place) × mystery`:
  - W1: no repeated sign;
  - W2: `text === witnessSentence(sign)`, never null;
  - W3: `fits` is right and between 2 and n−1;
  - W4: no implied sign among the notes;
  - W5: `also` is sorted and I4 holds;
  - W6: every held sign that fits 2 to n−1 has a non-null sentence, against an explicit `HELD_BACK` list that starts empty (an entry needs a recorded Decision);
  - W7: the order is a subsequence of `heldSigns(mystery.tags)`;
  - W8: a fixture mystery holding retired `tree_dweller`, shared by 2 or more suspects, gets no note for it and nothing throws.
- `roundStillFits`: a saved note that differs only in `sign`, or only in `also`, doesn't fit; a malformed note missing `also` in `notes` or a mismatched/malformed `{ kind: 'note' }` entry in `round.log` returns `false` cleanly without throwing.

**`tests/clueGame/content.test.ts`**
- `witnessNameProblems(profiles)` is empty on HEAD.
- Negative case: clone a profile and rename it with a 4-letter-or-longer word taken from one of its held signs' sentences. `witnessNameProblems` reports it and names the sign.
- Pool resilience: an unknown open tag in a pool clue is skipped by `animalsFromPool` with a warning (and loads cleanly with no throw), whereas `animalsFromProfiles` still throws on an unknown open tag.

**`tests/game/boardModel.test.ts`**
- For seeds 0–1,999 with `tileCells` pins and `atLeast: 1`: ≥1 rare gem on unpinned cells, no standing match, a valid move.
- A seed whose `atLeast: 0` board already has one gives the identical grid.
- A seed whose only rolled gem lands on a pinned cell gets one more on a free cell.
- Same seed twice gives the same grid.
- `loadBoard` never tops up.
- Infeasible `atLeast` (negative, non-integer, or `freeCount - atLeast < 3`) throws `RangeError`; a tight but feasible `atLeast` still returns a playable board with no standing match, a valid move, and ≥ `atLeast` rare gems on free cells.

**`tests/animalBoard/savedGame.test.ts`**: no change (it builds from `ANIMAL_RULES`).

#### E2E (`scripts/e2e.mjs`, no new rounds; DOM reads only, a few seconds)

1. **Every round start** (`:904-910`): `__cc.state().movesUsed === 0` and `clue().movesUsed === 0`, and ≥1 `grid[x][y] === 'purple'` on a cell not in `pins`.
2. **The existing notes check** (`:2011-2029`): for every `li[data-witness-sign]`:
   - the first `<p>`'s `textContent.trim()` equals `__cc.signWitness()[sign]`, and equals `clue().witness[i].text`;
   - the li holds `[data-sign="${sign}"]`, plus `[data-sign="${alt}"]` and an "or" for each `also`;
   - exactly one `[data-category-mark]`;
   - the count equals `state.notes`;
   - the dialog text has no `____`.
3. **Every round end with `state.notes > 0`**, next to `checkSources`: for each `clue().witness` entry, some `section[aria-labelledby="end-notes"] [data-sourced-facts] > li` starts with one of its `behind` texts, and the section has no `____`.
4. **The run as a whole**: `check('the run collected and checked a witness note', notesChecked)`. The baseline run collected notes in 3 of its 4 rounds; confirm on the first E2E run and steer one move next to a purple gem if the new boards don't collect one naturally (never weaken the check).
5. **The stale save**: push `{ sign: 'tree_dweller', text: 'It sleeps high in the trees.', fits: 2, also: [] }`; the predicate at `:2325` becomes `note.sign === 'tree_dweller'`.

#### Fable sentence-review gate (blocks shipping)

1. A read-only `$STATE/scripts/witness-list.ts` (esbuild with the `@/` paths, like Pass 1's runner) writes `$STATE/witness-sentences.csv` with these columns: `sign, category, meaning, witness, HEAD holders (id name), live-only holders, dealt in N HEAD combos, label hit, label_word_hits (3+ letter tag words/stems in witness), censor blanks per holder`.
2. Fable (`claude-task --model claude-fable-5-2 --effort high`) reviews:
   - truth for every **HEAD** holder (live-only pre-H22 holders — `1:yellow_legs`, `9:forest_floor`, `14:puffs_up`, `39:rarely_drinks` — are tags sign-audit already removed pending H22; listed for visibility only, accepted until H22 runs);
   - reading level for grades 6–12, read solo;
   - no animal, group or place named;
   - other words than the label (using `label_word_hits` to catch inflections and reordered words).
3. The lead rules on every item in **Decisions**.
   - A sign with no sentence true of all HEAD holders gets `null`, a `HELD_BACK` entry, and a line in the Summary.
   - A proven wrong tag is fixed and recorded, which makes a content build needed.
4. If Fable is out of usage: wait, or use `astra-review --task`. Never ship unreviewed.

#### Before/after metrics (Goal 4)

`$STATE/scripts/witness-metrics.ts` runs on HEAD and on the `7bce511a` copy, on the 105 sets × 5 mysteries:
- **Combos with ≥1 note.** HEAD 525 → 525; live 403 → 458.
- **Dealt notes that fit only the mystery by their words (sentences only; required sign label chips already appear on field guides and always fit 2–4 suspects).**
  - Before: Opus classifies HEAD's 157 distinct non-shared dealt texts against their fitting suspects, reusing sign-audit's `wording.csv` rulings where a pair is already ruled. Saved as `$STATE/before-wording.csv`; the count is reported over 525 combos.
  - After: 0. The script asserts every dealt text equals `witnessSentence(sign)` across all combos; Fable's truth review covers the rest.
- **Rounds starting with a witness gem.** 73.82% → 100% exactly. The bot's line gives the empirical figure on the 200 × 3 seeded deals.

#### Balance (pre-registered, from the Decision)

- Command: `node scripts/run-typescript.mjs scripts/balance-044.ts --rounds 200 --seed 44 --places world,africa,asia`.
- Runs:
  - Run 1 with `--start-witness 0`: the new dealer plus the edges, on boards identical to Baseline;
  - Run 2 with `--start-witness 1`: the full change.
- Limits, Run 2 against Baseline:
  - careful, novice, expert, reader: Found −1 to +2 pts; ★★★ −2 to +8 pts; moves left at find −0.5 to +2.0; notes a round 0 to +0.8;
  - guesser, random: Found ±4 pts, ★★★ ±4 pts;
  - oracle: Found 100%, ★★★ 100%, moves left ±0.3.
- `starMoves` stays `[8, 14]` unless careful's 20th-percentile moves left shifts by more than 2.
- Any result outside these limits is explained in **Decisions**, or the rules are adjusted.
- The bot judges notes by sign, so Run 1 against Baseline measures the dealer and the edges, and Run 2 against Run 1 the starting gem.

#### Docs

- `docs/CLUE_MATCH.md`:
  - `:20` drop `WithBlanks`;
  - `:22` "field notes (whole)";
  - `:51` "notes up to 055-2";
  - `:53` witness gems show the sign's standard sentence and chip, and every board starts with at least one;
  - `:61` profiles' notes show in profile order, whole, on the reveal card (moving the 16 former `revealNotes` from end to profile order), and witness sentences live in `SIGNS`;
  - `:90` the new E2E checks.
- `CONTEXT.md`:
  - `:58-59` witness gem: at least one on every starting board;
  - `:100-101` witness note: "one of the mystery's signs in its standard sentence, with its sign and how many field guides hold it; fits 2 to 4".
- `docs/ANIMAL_BOARD_PAPER.md`:
  - `:3` "up to 055-2";
  - add `> **Rules 055-2 (2026-11-24) change §2.2 and §2.4:** …` covering per-sign standard sentences with chips, ≥1 starting witness gem, the 10 edges wired, and the bot result.
- `docs/CONTENT_SOURCES.md`:
  - `:81` fits counted per sign;
  - `:84-98` the edges are wired in 055-2, and the table becomes history;
  - document the `witness` field and its checks;
  - `:102` "a witness note shows when 2 to 4 suspects hold its sign".

### Rejected alternatives

- **A2, per-note dealing with standard sentences swapped in:** more rules (several signs on one note, repeats, `null`) for less coverage (403 vs 458 live), and it keeps the note coupling.
- **A3, sentences in profile JSON:** one fact repeated per holder, already drifting (76 signs with different texts), and it needs the owner's content build before live players see it.
- **A1(b), a separate `witnessSentences.ts` table:** two tables to keep in sync, and the sentence moves away from the `meaning` it must agree with.
- **U2, sign labels as glossary terms:** duplicates `meaning` 142–201 times and mixes signs into the science-word glossary.
- **U3, an inline "Sign: …" caption:** no visual link to the guide's chips.
- **B1, at least one only when the mystery has a note:** makes the board depend on the mystery (`useAnimalSession.ts:72,82`, `balance-044.ts:363-364`) and is identical to B3 on HEAD.
- **B2, exactly one:** changes every board's rng from the first cell, so bot runs aren't paired, and it cuts gems on the 39% of boards that roll 2 or more.
- **C2, sentences only for the 142–143 dealable signs:** a new holder would make a sign dealable with no sentence. W6 would catch it, but only after the fact.
- **Reveal-card edits** (marking the notes behind collected signs, hiding sign-audit's duplicate sentences): Goal 2 is met as it is, and they are out of the brief.
- **Editing note 14:2 ("puffs up") in the profile:** a content change that would need a build; it goes in the Summary for a content PR.
- **Keeping `WithBlanks` on witness notes:** code sentences carry no blanks by construction (checked), so it would only hide a bug.
- **Keeping the notes' censor split:** blanked text nobody reads (finding 2).
- **`rare: null` for rounds with no note:** changes the refill rng, adds mystery dependence, and never happens on HEAD.
- **Deferring the 10 edges again:** nothing blocks them under per-sign dealing, and waiting keeps true fits out of play.
- **The name check as a throw at load:** would break the game on live rows; `warn` plus a CI test fails loud where authors are.
- **The name check inside `signTableProblems`:** the table can't see holders' names or countries.
- **A `narrowerSigns` export:** `heldSigns([tag]).has(sign)` already answers "implies".
- **Sorting notes by fits:** changes balance for no stated gain; profile order is today's rule.

### Decision (lead)

Choosing **A1(a) + U1 + B3 + C1**, wiring all 10 deferred open-tag `implies` edges, bumping `ANIMAL_RULES.version` to `'055-2'`, and keeping this mission pure code (no profile edits, no new content build unless Fable's truth review proves an existing tag wrong):

1. **Dealing & storage — A1(a) (per sign, `witness: string | null` on `ActiveSignEntry` in `src/clueGame/signs.ts`):**
   - Dealing per sign eliminates duplicate-sign notes (40 HEAD / 20 live), multi-sign coupling (65 HEAD / 107 live), and `revealNotes` coupling, and immediately lifts live `7bce511a` coverage from `403/525` to `458/525` (with the 10 deferred edges wired) while fixing every live giveaway on deploy before H22 runs.
   - Keeping `witness: string | null` directly on `ActiveSignEntry` (`RetiredSignEntry` forbids `witness?: never`) puts each sentence beside its authoritative `meaning` for local review, prevents two-table drift, and needs no content build.
   - `signTableProblems` validates every non-null `witness`: non-empty trimmed text, no `_` blank tokens, and **no case-insensitive whole-phrase word-boundary match** (`\b...\b`, `i`) of `signPhrase(tag)` (word-boundary avoids false hits like `mane` in `remains`).
   - `witnessSentence(tag, table = SIGNS): string | null` returns `null` safely (never throws) for retired, `null`, or unknown tags (satisfying Decision Rule 3 for older live DB rows).
   - **Implied-sign deduplication & `also` chips:** Drop any eligible sign implied by another eligible sign (same one-fact rule as `signsOf`; DAG guarantees ≥1 maximal sign whenever any sign is eligible). Compute `also` as the sorted distinct chips in `suspect.signs` across all suspects in the round that transitively imply `note.sign` (`c.tag !== note.sign && implied.get(c.tag)?.has(note.sign)`). Because any suspect holding a narrower sign necessarily fits `note.sign`, `also` depends only on `(note.sign, suspects)` and leaks zero information about the mystery.
   - `WitnessNote` is `{ sign: string; text: string; fits: number; also: string[] }`. `stillPossible` checks `heldSigns` on `note.sign`; `roundStillFits` compares `sign`, `text`, `fits`, and `also`.
2. **Label UI — U1 (`SignChip` shared with `GuideSigns`) + `GlossaryText` + explicit `"or"` separators:**
   - Extract `SignChip` from `SignGroups` (`AnimalSheets.tsx`) so witness notes and field-guide signs share one component and chip shape (`data-sign`).
   - Render each note's sentence with `<GlossaryText text={note.text} />` (never `WithBlanks`). Render the label row as `<CategoryMark>` + `<SignChip tag={note.sign} />`, followed by `<span className="text-xxs text-neutral-7">or</span> <SignChip tag={alt} />` for each entry in `note.also` so players never misread alternative narrower chips as AND.
   - Status line (`AnimalGame.tsx` `LogText`): show the plain standard sentence plus `(${[note.sign, ...note.also].map(signPhrase).join(' or ')})` (accepting architect's Pass 2 consistency refinement so the status line matches `NotesList`'s "or" chips).
   - Remove dead `WithBlanks.tsx`, `noteCategories`, `FieldNote.full`, `Animal.revealNotes`, `MAX_BLANKS`, and the `BLANK` export (confirmed dead once witness notes stop showing blanked profile text); move the `censor`/`giveaways` witness-sentence giveaway check out of runtime `buildAnimal` into `witnessNameProblems` (called by `content -- preview` and unit tests), with no blanket label-word exemption.
3. **Starting witness gem — B3 ("at least one", always, mystery-independent):**
   - Add `startWitness: number` (`1`) to `AnimalRules` and optional `atLeast?: number` to `RareGem` (`BoardModel.ts`, reused by `EventPayloads['clue-board-setup'].rare`).
   - In `BoardModel.newBoard`: `noToys()` → `setPins(pins)` → reject infeasible `atLeast` (`< 0`, non-integer, or `freeCount - atLeast < 3`) with `RangeError` → loop up to 20 attempts (`freshGrid()` → top-up unpinned non-rare cells using the board's seeded `rng` until `rareCount >= atLeast` → `if (!this.hasAnyValidMove()) this.shuffle()` → return once no standing match and a valid move exist, else throw `RangeError`). Random `witnessChance` rolls stay as today (only the 26.2% of boards rolling 0 witness gems gain 1; mean rises 1.32 → 1.58; the other 73.8% replay identically for clean paired bot comparisons). `shuffle()` preserves placed gems; resumed boards load saved grids without re-placing.
   - **Mystery independence preserved:** On HEAD profiles, `525/525` combos have ≥1 eligible note (min 3), so B3 and B1 are 100% identical on HEAD. Keeping the board independent of the mystery preserves the invariant at `useAnimalSession.ts:72,82` and `balance-044.ts:363-364`. On the temporary 67/525 pre-H22 live combos with 0 eligible notes, witness gems still appear as they already do on 74% of boards today and yield no note when collected.
4. **Scope, edge cases & review gate — C1 (all 201 active signs):**
   - Write standard sentences for all 201 active signs except deliberate `null` entries where no place-/animal-free sentence exists: `floreana_island`, `pinta_island`, and `prairie_dog_towns` (all 1-holder, non-dealable signs). `kopjes` and `one_island` get place-free sentences.
   - Unit test on real profiles enforces: (a) every dealable sign across the 105 sets has a non-null `witness` sentence (explicit empty allowlist unless a Fable truth failure forces a recorded `null`), and (b) `witnessNameProblems(profiles)` is empty across all 76 animals (strict, no blanket label-word exemption).
   - Every sentence is reviewed by Fable (`claude-task --model claude-fable-5-2 --effort high`) for biological truth across every **HEAD** holder and grade 6–12 reading level (with the lead ruling on every item; never shipped unreviewed, falling back to waiting or `astra-review --task` if Fable hits usage limit). Live-only pre-H22 holders (`1:yellow_legs`, `9:forest_floor`, `14:puffs_up`, `39:rarely_drinks`) are listed for visibility only and accepted until H22 runs.
5. **10 deferred open-tag `implies` edges:** Wire all 10 in `src/clueGame/signs.ts` with A1 (zero profile churn, 0 `signProblems` on HEAD, safe on live `7bce511a` rows).
6. **Reveal card & `14:2`:** Keep `RoundEndSheet` rendering unchanged (Goal 2 is met cleanly; E2E verifies `#end-notes` contains the full text of an underlying note for each collected sign). Do not edit `14:2` in profiles (out of scope, already untagged, avoids triggering a new content build); note it in Summary for a future content PR.
7. **Before/after metrics (Goal 4):** Run a reproducible script + Opus classification of HEAD's 157 distinct non-shared dealt texts against their fitting suspects (reusing `sign-audit`'s `wording.csv` where already ruled), saved to `$STATE/before-wording.csv`, to report exact before vs after (0) counts on the 525 combos.
8. **Version & pre-registered balance limits:** Bump `ANIMAL_RULES.version` to `'055-2'`. Run `scripts/balance-044.ts --rounds 200 --seed 44 --places world,africa,asia` (matching Baseline's 200 paired rounds) for Run (1) (`--start-witness 0`, isolating A1 + 10 edges) and Run (2) (`--start-witness 1`, full change). Acceptable deltas (Run 2 vs Baseline Run 0):
   - `careful`, `novice`, `expert`, `reader`: Found `−1 to +2 pts`, ★★★ `−2 to +8 pts`, Moves left at find `−0.5 to +2.0`, Notes/round `0 to +0.8`.
   - `guesser`, `random`: Found `±4 pts`, ★★★ `±4 pts`.
   - `oracle`: Found `100%` (unchanged), ★★★ `100%` (unchanged), Moves left `±0.3`.
   - `starMoves` stays `[8, 14]` unless careful's 20th-percentile moves left shifts by more than 2. Any move outside these limits must be explained in **Decisions** or adjusted.

## Architecture review (Fable)

Saved reply: `/srv/critter-ai/agent-state/missions/witness-signs/tasks/20261124-014241-architecture-reviewer.md`

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. **The plan contradicts itself on live-row holders, and the brief's "true for every holder, or not dealt" rule depends on the answer.** The Architecture's Fable gate treats live-only holders as "for information only"; the lead's Decision 4 says Fable checks truth "across every HEAD and live holder". I computed the gap: 4 animal/sign pairs are held on the `7bce511a` rows but not on HEAD (`1:yellow_legs`, `9:forest_floor`, `14:puffs_up`, `39:rarely_drinks`). Until H22 runs, a round with one of those animals as the mystery can deal a sentence sign-audit ruled untrue of it. Pick one and record it under Decisions: accept it until H22 (the live guides already show those chips today), or have the gate cover those 4 pairs.

MISSED:
1. **The note's new label chip can name a suspect, and nothing guards it.** The name guard checks only the sentence. On HEAD, 10 animal/sign pairs have a name word in the label itself:
   - `red_eyes` on Red-eyed Tree Frog, `pig_nose` on Pig-nosed Turtle, `snub_nose` on Golden Snub-nosed Monkey;
   - `brown_throat` on Brown-throated Sloth, `purple_gray` on Purple Frog;
   - `giant_tortoise` on three tortoises, `giant_turtle` on Yangtze Giant Softshell Turtle;
   - `forest_floor` on African Forest Elephant.

   The brief requires the label, and the guides already show these chips, so this is not a blocker. But Goal 4's "after: 0" should say it counts sentences only, and the lead should rule on these labels (accept, or hold the sign back when a suspect's name contains a label word).
2. **The name guard will reject natural sentences for those same signs.** "Its eyes are red" warns for the Red-eyed Tree Frog while the chip beside it says "red eyes". Decide before writing the sentences whether a word in the sign's own label is exempt; otherwise the content test forces awkward wording or `null`.
3. **The website's witness-note screenshot goes stale.** `src/site/shots.ts:46-48` has a `witnessNote` shot whose alt text quotes an old hand-written note ("Its long snout looks like a stretched-out pig's snout"), shown on `Teachers.tsx:89`. After this change the game no longer shows that. The site is outside the brief's scope, so either retake the shot and alt text or put it in the Summary for the owner.

SHOULD-CONSIDER:
1. The name check in `buildAnimal` runs on every page load in the browser, but the game calls `animalsFromPool(pool)` with a no-op `warn` (`useAnimalSession.ts:93`), so its result is discarded. That is finding 2's own smell (work nobody reads). A content check that `content -- preview` and the unit test call would take `censor` and `giveaways` out of the runtime path.
2. The reveal card's order changes slightly: the 16 facts now in `revealNotes` are shown last today and will move to profile order. It is harmless, but say so in the docs line for the reveal card.
3. The label regex misses inflections and reordered words ("horn", "striped", "eyes that are red"). The plan leaves that to the Fable review; make it an explicit column in the review CSV so it isn't skipped.
4. E2E check 4 (`the run collected and checked a witness note`) depends on how the seeded player happens to play on the new boards. Confirm it on the first run, and steer the player toward a purple gem if it fails rather than weakening the check.

**What checked out against the code**
- Line references and callers match, including `WithBlanks`, `noteCategories`, `revealNotes`, `full` and `BLANK`.
- The version check runs before `roundStillFits`.
- `shuffle()` moves only unpinned cells, so the top-up count survives it.
- A rare gem never matches.
- The `also` chips depend only on the sign and the set.
- `behind` is never empty on HEAD: no profile clue carrying an open tag is classed as not hand-written at the pool door.

## Architecture review (Astra)

Saved reply: `/srv/critter-ai/agent-state/missions/witness-signs/tasks/20261124-014749-astra-architecture.md`

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. Enforce sentence truth on both supported content snapshots. On `7bce511a`, the proposed dealer gives Dyeing Poison Dart Frog `forest_floor` in two sets and Grévy’s Zebra `rarely_drinks` in five. The sign audit removed both assignments. Withhold a sign whenever an incorrect holder would be counted among its fits, including when that holder is a decoy. [Sentence-review gate](/srv/critter-ai/worktrees/witness-signs/plans/2026-11-24-witness-signs.md:424)
2. Guarantee a playable board after witness placement. `shuffle()` silently returns its last arrangement after 50 failed attempts. An oversized `atLeast` can also turn every free cell into a witness gem, making a match impossible. Reject infeasible minima and verify a legal move before returning the board. [BoardModel.ts](/srv/critter-ai/worktrees/witness-signs/src/game/BoardModel.ts:363)
3. Handle unknown signs at pool ingestion. `signsOf` and `heldSigns` throw before `witnessSentence` can skip an unknown tag, so one unsupported tag prevents the entire game from loading. Filter unknown signs on the live read path and keep authoring validation strict. [Content ingestion](/srv/critter-ai/worktrees/witness-signs/src/clueGame/questionMatchContent.ts:136)
4. Cover persisted log entries in the save guard. `roundStillFits` checks `notes` and `notesLeft`, but the status line also reads a separately serialized note from `round.log`. A log entry missing `also` passes restore and throws during rendering. Validate logged notes or resolve them from the validated collected notes. [Save guard](/srv/critter-ai/worktrees/witness-signs/src/clueGame/animalBoard.ts:264)

SHOULD-CONSIDER:

1. Count how many suspects can actually *receive* each sign. In six proposed HEAD deals, only one can. For example, `climber` fits three suspects, but only Giant Panda can receive it because the other two receive `climbs_boulders`. A player who knows the dealing rule can identify the mystery from that clue alone. [Dealer rule](/srv/critter-ai/worktrees/witness-signs/plans/2026-11-24-witness-signs.md:282)

## Revision notes

**Fable review (`APPROVE_WITH_CHANGES`)**
- **MUST-FIX 1 (live-only holder contradiction):** **Accepted.** Aligned Decision 4 with Architecture: Fable's truth gate checks every **HEAD** holder (post-`sign-audit` truth, matching Goal 1); the 4 stale pre-H22 live-only pairs (`1:yellow_legs`, `9:forest_floor`, `14:puffs_up`, `39:rarely_drinks`) are already displayed on live field guides today, are listed in the review CSV for visibility only, and are accepted until the owner runs H22 rather than disabling valid HEAD signs.
- **MISSED 1 (sign label chip can share a word with a suspect's common name):** **Accepted.** Keep existing sign label chips as-is (the brief requires showing the sign label, field guides already show those chips, and every dealt note fits 2–4 suspects); clarified Goal 4's "after: 0" metric counts witness sentences.
- **MISSED 2 (name guard vs natural sentences for label-overlapping signs):** **Accepted.** Keep the giveaway guard strict with no blanket label-word exemption (which would permit animal/group nouns like `tortoise`, `turtle`, `pig`); reword affected sentences using natural grade 6–12 synonyms (e.g. woodland/woods, crimson/scarlet, chestnut/tan, violet-slate, flat round disc), also satisfying Goal 1's "other words than the sign's short label".
- **MISSED 3 (website `src/site/shots.ts` `witnessNote` shot & alt text go stale):** **Accepted.** Out of brief scope; will note in Summary for the owner to retake `npm run site:shots` and refresh `Teachers.tsx` alt text.
- **SHOULD-CONSIDER 1 (move name check off runtime `buildAnimal` path):** **Accepted.** Extracted into `witnessNameProblems(profiles, table = SIGNS)` in `questionMatchContent.ts`, called by `tests/clueGame/content.test.ts` and `scripts/content.ts` (`preview`), removing ~20k regex compilations from browser page load.
- **SHOULD-CONSIDER 2 (reveal-card ordering change for 16 former `revealNotes`):** **Accepted.** Added "in profile order, whole" to the `docs/CLUE_MATCH.md:61` update.
- **SHOULD-CONSIDER 3 (explicit inflection/word-overlap column in Fable review CSV):** **Accepted.** Added `label_word_hits` (3+ letter tag words/stems in `witness`) to `$STATE/witness-sentences.csv` so Fable audits inflections and reordered label words on every row.
- **SHOULD-CONSIDER 4 (confirm E2E check 4 collects a witness note on new boards):** **Accepted.** Added to E2E spec: confirm on first E2E run and steer a move next to a purple gem if needed rather than weakening the check.

**Astra review (`APPROVE_WITH_CHANGES`)**
- **MUST-FIX 1 (withhold signs whenever an incorrect `7bce511a` holder would be counted):** **Rejected** (resolved via Fable MF1). Withholding `forest_floor`, `rarely_drinks`, `yellow_legs`, or `puffs_up` globally would break valid HEAD signs permanently, and hardcoding species-ID denylists in game rules violates KISS for 4 stale rows pending H22 (already shown on live guides today); will note in Summary.
- **MUST-FIX 2 (guarantee playable board after witness placement; reject infeasible `atLeast`):** **Accepted.** `BoardModel.newBoard` now rejects negative, non-integer, or infeasible `atLeast` (`freeCount - atLeast < 3`) with `RangeError`, and retries `freshGrid` + `topUpRare` + `shuffle` up to 20 times before throwing `RangeError` if no legal, match-free board can be built (preserving byte-identical RNG on normal boards).
- **MUST-FIX 3 (handle unknown signs at pool ingestion):** **Accepted.** Exported `isKnownSign(tag, table = SIGNS)` in `signs.ts`; `animalsFromPool` (live DB door only) filters unknown open tags with a `warn` so an unsupported DB tag never crashes the app, while `animalsFromProfiles`, `signsOf`, `heldSigns`, and `signProblems`/`checkProfile` remain strict.
- **MUST-FIX 4 (cover persisted `round.log` note entries in `roundStillFits`):** **Accepted.** `roundStillFits` now guards `same` against missing/non-array `also` (returning `false` cleanly) and validates every `{ kind: 'note' }` entry in `round.log` against `round.notes` in order, with unit tests for both.
- **SHOULD-CONSIDER 1 (counterfactual dealer-rule deduction on 6 HEAD deals where only 1 suspect can receive the broader sign):** **Rejected.** Keep simple per-mystery implied-sign deduplication: solo grade 6–12 players read the note and `also` chips at face value ("Fits 3 of 5"), and simulating counterfactual deals for all 5 suspects in `witnessNotes` violates KISS for a 1.1% (6/525) theoretical source-code meta-exploit.

## Steps

How each step runs (`~/.gemini/mission-lead.md`):
- The lead writes Opus a brief at `$STATE/prompts/sN.md` and runs `claude-task -f $STATE/prompts/sN.md` from the worktree root.
- The lead then reviews `git status` and `git diff`, runs the step's checks itself, and either commits code and plan together and pushes, or rejects as the rules say.
- `$STATE` = `/srv/critter-ai/agent-state/missions/witness-signs`.
- **CHECKS**, which must all pass before every commit: `npm run typecheck && npm run lint && npm test && npm run content -- preview > /tmp/ws-preview.txt && ! grep -n PROBLEM /tmp/ws-preview.txt`
- **E2E-DEV** runs on the dev copy and never prints the connection string:
  ```
  ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a
    [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1
    CHROME_PATH=$HOME/.local/bin/chrome-nosandbox npm run e2e:fresh )
  ```
  - If the guard fails: stop, add a handoff item, and block.
  - After a pass, move the newest `e2e-artifacts/<run>/` to `$STATE/e2e-sN/`, clear any remaining `e2e-artifacts/*`, and delete the previous `$STATE/e2e-s*` (disk is 92% full). Keep `e2e-baseline/`.
- **RUN-TS** runs a `$STATE` script: `bash $STATE/scripts/run-ts.sh --code <tree> <entry.ts> [args]`.
  - It is a copy of `/srv/critter-ai/agent-state/missions/sign-audit/scripts/run-ts.sh`, made in S1, with `modules=` set to `/srv/critter-ai/worktrees/witness-signs/node_modules`.
- **Trees:**
  - "base" is `/tmp/ws-base` (`mkdir -p /tmp/ws-base && git archive 8d246c70 src db/content | tar -x -C /tmp/ws-base`).
  - "live content" is `/tmp/ws-c7b/db/content` (`mkdir -p /tmp/ws-c7b && git archive 7bce511a db/content | tar -x -C /tmp/ws-c7b`).
- **Testing rule:** in any step that touches `signs.ts`, `questionMatchContent.ts`, `animalBoard.ts` or `BoardModel.ts`, Opus writes the failure-mode header comment and failing tests FIRST, runs `npm test` (and `npm run typecheck` for compile-time checks) to confirm the new tests are red for the right reason, and ONLY THEN implements the code. Opus cites the red output in its report, and the lead verifies the failure-mode comment and tests cover every listed failure mode before accepting.

- [ ] S1. **Witness field, helpers, table checks, and the 88 body + range sentences.**
  - **Files:** `src/clueGame/signs.ts`, `tests/clueGame/signs.test.ts`, `tests/clueGame/animalBoard.test.ts` (the `TABLE` fixture only).
  - **State files:** `$STATE/scripts/run-ts.sh`; `$STATE/scripts/sign-holders.ts` (read-only), which writes `$STATE/sign-holders.csv`.
    - Columns: sign, category, meaning, direct implies, HEAD holders (id name), and each holder's note texts tagged with the sign.
    - Holders come from `heldSigns` over a copy of `SIGNS` that has the 10 deferred edges added. That way each broader sign's sentence is written against its future holders: `horns` with the spiral- and S-shaped-horn holders; `face_markings` with face mask, spectacles and tear lines; and so on.
  - **Failure modes first** (header of `signs.test.ts`, blocks A1-W, A2-W and A10):
    - A1-W: these all pass `signTableProblems` when they shouldn't:
      - an empty, whitespace-only or untrimmed sentence;
      - a sentence containing `_`;
      - a sentence containing its label as a whole phrase (one word like `mane`, several words like `digging claws`, the hyphen form `S-shaped horns`, any case).
    - A1-W also fails if the check wrongly flags any of these:
      - a label inside another word ("remains" for `mane`);
      - a `null` sentence;
      - a retired entry.
    - A2-W (`@ts-expect-error`): an active entry without `witness` compiles; a retired entry with `witness` compiles.
    - A10: `witnessSentence` throws, or returns text, for a retired or unknown tag or for an inherited key like `constructor`. `isKnownSign` is `true` for an unknown tag or `constructor`, `false` for a retired one, or throws.
    - The real table: `signTableProblems(SIGNS)` isn't empty.
  - **Then implement:**
    - `witness: string | null` on `ActiveSignEntry`, with `at(category, meaning, witness, rules)`.
    - `isKnownSign` and `witnessSentence` (both go through `lookup`, so they never throw).
    - The three `signTableProblems` checks, with the label regex exactly as in the Architecture section.
    - The test fixtures `sign(meaning, rules, witness = null)` and `T`, and `witness: null` on each `TABLE` entry in `animalBoard.test.ts`.
  - **Sentences:** write the 87 `body` sentences and the 1 `range` sentence. Every other active entry gets `null` for now, with a `// S2` comment. S2 replaces all of them, and nothing deals them before S4.
    - Each sentence is one short sentence, present tense, starting with "It"/"Its".
    - It agrees with `meaning` and is never stronger than it ("in at least one sex", "some individuals").
    - It is true of every HEAD holder in `sign-holders.csv`.
    - It reads at grades 6–12, read solo.
    - It names no animal, group noun (frog, turtle, monkey, cat), country, region or island.
    - It avoids the label's words and their inflections.
  - **Verify:**
    - CHECKS.
    - The lead reads 20 random body rows of `sign-holders.csv` against their sentences, and logs any it sends back.

- [ ] S2. **The remaining 113 sentences (75 habits, 22 habitat, 16 life) and the exact `null` list.**
  - **Files:** `src/clueGame/signs.ts`, `tests/clueGame/signs.test.ts`.
  - **Failure mode first** (A1 on the real table): the active signs with `witness === null` aren't exactly `['floreana_island', 'pinta_island', 'prairie_dog_towns']`.
  - **Then:** replace every `// S2` `null` with a sentence under S1's rules, using `$STATE/sign-holders.csv` (regenerate it with RUN-TS if needed). The three deliberate nulls each get a one-line comment on why. `kopjes` and `one_island` get sentences that name no place.
  - **Verify:**
    - CHECKS.
    - `git grep -n "// S2" src/clueGame/signs.ts` is empty.
    - The lead spot-checks 20 rows, as in S1.

- [ ] S3. **Name guard and the pool door's unknown-tag filter.**
  - **Files:** `src/clueGame/questionMatchContent.ts`, `scripts/content.ts`, `tests/clueGame/content.test.ts`. If the guard flags any HEAD sentence, it is reworded in `src/clueGame/signs.ts` in this step.
  - **Failure modes first** (header of `content.test.ts`):
    - `witnessNameProblems` misses a holder's name word in the sentence of a sign it holds. The name word can be:
      - a word of its common name;
      - a group noun or its singular;
      - its genus or species epithet;
      - a country or region it lives in.
    - It misses a broader sign the holder has only by implication.
    - It reports a sign the animal doesn't hold, reports or throws on a `null` sentence, or gives a message that doesn't name the animal and the sign.
    - It reports anything on HEAD profiles.
    - `animalsFromPool` has any of these faults:
      - it throws on an unknown open tag;
      - it drops a known, retired or trait tag;
      - it doesn't warn once for each tag it drops;
      - its `isHandWrittenClue` stops reading the raw tags.
    - `animalsFromProfiles` stops throwing on an unknown open tag.
  - **Then implement:**
    - Pull the list of name words that `buildAnimal` builds into one private helper. `buildAnimal` keeps using it until S8, and `witnessNameProblems(profiles, table = SIGNS)` uses it too (DRY).
    - Add the pool-door filter with `warn`, as the Architecture section says.
    - In `content.ts`, `preview` prints `  PROBLEM …` for each hit of `witnessNameProblems([profile])`.
  - **Verify:** CHECKS. Preview reports 0 problems.

- [ ] S4. **Per-sign dealer, the 10 edges wired, and the save guard.**
  - **Files:**
    - `src/clueGame/signs.ts`: wire the 10 `implies` edges, remove `noteCategories` (and reword any broader sign's sentence if wiring the 10 edges triggers `witnessNameProblems` on a newly implied holder).
    - `src/clueGame/animalBoard.ts`:
      - `WitnessNote { sign, text, fits, also }`, `witnessNotes`, `roundStillFits` (with the `round.log` check) and `stillPossible`;
      - the header comment.
    - `tests/clueGame/signs.test.ts`:
      - replace the deferred-pair test with "the 10 former deferred edges are wired";
      - drop the `noteCategories` assertion and its import.
    - `tests/clueGame/animalBoard.test.ts`: `:82-91` keyed on `note.sign`, A8, S25b, the W-block, the `roundStillFits` cases, and `HELD_BACK = []`.
    - `src/components/animalBoard/AnimalSheets.tsx`: only the swap `noteCategories(note.tags)` → `[signCategory(note.sign)]` so it compiles. S7 rewrites `NotesList`.
    - `scripts/balance-044.ts`: `--explain` prints `"${note.text}" (${note.sign}) fits …`.
    - `scripts/e2e.mjs`, the stale save only:
      - the fixture becomes `{ sign: 'tree_dweller', text: 'It sleeps high in the trees.', fits: 2, also: [] }`;
      - the predicate at `:2325` becomes `note.sign === 'tree_dweller'`.
  - **Failure modes first** (header of `animalBoard.test.ts`):
    - W1: a sign repeats.
    - W2: `text !== witnessSentence(sign)`, or it is null.
    - W3: `fits` isn't the count of suspects that hold the sign, or isn't between 2 and n−1, or the mystery isn't among them.
    - W4: a dealt sign is implied by another dealt sign.
    - W5: `also` isn't sorted, or I4 fails (a fitter shows neither `sign` nor an `also` chip, or a non-fitter shows one).
    - W6: a held sign that fits 2 to n−1 suspects has a `null` sentence and isn't in `HELD_BACK`.
    - W7: the notes' order isn't a subsequence of `heldSigns(mystery.tags)`.
    - W8: a retired `tree_dweller` mystery shared by 2 or more suspects gets a note for it, or throws.
    - A4: an edge isn't wired, or `badges(['backward_pouch','pouch'])` isn't `['backward_pouch']`.
    - `roundStillFits` returns `true` for any of these:
      - (R1) a note that differs only in `sign`;
      - (R2) a note that differs only in `also`;
      - (R3) a note in `notes` with `also` missing or not an array;
      - (R4) a `{ kind: 'note' }` log entry that is missing, extra, out of order or malformed.
    - It throws for R3 or R4.
    - (R5) A valid 055-2 round stops fitting (`:336-348` stay green).
  - **Verify:**
    - CHECKS.
    - `node scripts/run-typescript.mjs scripts/balance-044.ts --places world --explain 0` prints sentence + sign lines.
    - E2E-DEV passes every check: the existing notes checks still hold, with one mark per note. Artifact: `$STATE/e2e-s4/`.

- [ ] S5. **Fable sentence-review gate, part 1: list, review, rulings (blocking; no code).**
  - **Who:** Opus writes `$STATE/scripts/witness-list.ts`, extending S1's helper, and runs it on the worktree to write `$STATE/witness-sentences.csv`.
    - Columns: `sign, category, meaning, witness, HEAD holders (id name), live-only holders, dealt in N HEAD combos, label hit, label_word_hits, censor blanks per holder`.
    - HEAD holders come from the real wired `heldSigns`.
    - Live-only holders come from `/tmp/ws-c7b`.
    - The `dealt in N` count uses the real `witnessNotes` over the 105 sets / 525 combos, enumerated as `balance-044.ts reportDeals` does. The script asserts both totals.
    - `label hit` uses the `signTableProblems` regex.
    - `label_word_hits` holds the tag's words or stems of 3 or more letters that appear in the sentence.
    - `censor blanks per holder` comes from `witnessNameProblems`.
  - **The review:** the lead writes `$STATE/prompts/fable-sentences.md` and runs `claude-task --model claude-fable-5-2 --effort high -f $STATE/prompts/fable-sentences.md`.
    - Fable reviews every row for truth of every HEAD holder (the 4 live-only pairs are for information only), reading level for grades 6–12 read solo, no animal, group or place named, and no label word or inflection used (`label_word_hits`).
    - For each sign it answers `OK`, `FIX: <sentence> — why` or `NULL — why`.
    - If Fable exits 3: do not skip. Run `astra-review --task $STATE/prompts/fable-sentences.md plans/2026-11-24-witness-signs.md` from `$STATE`, and save its stdout beside the prompt. If Astra is out too, end per the rules and retry in a later session.
  - **Rulings:** the lead rules on every item under **Decisions**: one line for each FIX or NULL (accepted or rejected, and why), plus one line listing how many rows were accepted as OK.
  - **Verify:**
    - The CSV has 201 rows; `label hit` and `censor blanks` are 0 on every row.
    - Fable's (or Astra's) reply is saved under `$STATE/tasks/`.
    - Every FIX or NULL has a ruling. Plan-only commit.

- [ ] S6. **Fable gate, part 2: apply the accepted fixes.**
  - **Files:**
    - `src/clueGame/signs.ts` (accepted rewordings and nulls).
    - `tests/clueGame/signs.test.ts` (the exact `null` list, if changed).
    - `tests/clueGame/animalBoard.test.ts` (a `HELD_BACK` entry for each new `null`, with its Decision cited).
    - Only if a ruling proved a tag wrong: the one profile JSON. Record it under Decisions, and note that a content build will be needed (a handoff item after the deploy, as the Brief's Notes say).
    - (If S5 accepted 0 changes, check off as "none needed" with a plan-only commit.)
  - **Verify:**
    - CHECKS.
    - Regenerate `$STATE/witness-sentences.csv`: every `witness` equals the accepted text, and `label hit` and `censor blanks` are 0.
    - If a profile changed: `npm run content -- build` on the guarded dev copy (the E2E-DEV guard, then the build) before the next E2E. Never with `.env.local`.

- [ ] S7. **Label UI and debug bridge.**
  - **Files:**
    - `src/components/animalBoard/AnimalSheets.tsx`:
      - module-local `SignChip`, which `SignGroups` reuses with the same DOM;
      - the `NotesList` item: `data-witness-sign`, `GlossaryText`, a label row with `CategoryMark` + `SignChip` + "or" + `also` chips (outside `MARK_CAPTION`), and the fits row unchanged.
    - `src/components/animalBoard/AnimalGame.tsx`: the `LogText` note `(…sign or also…)` as plain text; drop the `WithBlanks` import; fix the comment at `:499`.
    - `src/game/debugBridge.ts`: `signWitness()`.
    - Delete `src/components/clueGame/WithBlanks.tsx`; both of its callers are gone.
  - **Verify:**
    - CHECKS.
    - `git grep -n "WithBlanks" src scripts tests` is empty.
    - E2E-DEV passes every check. Artifact: `$STATE/e2e-s7/`; delete `e2e-s4/`.
    - The lead looks at `02c-notes.png` (and DOM checks): the chips match the guide's, aren't uppercase, and show "or" between alternatives.

- [ ] S8. **Remove the dead censoring; reveal card and `animalDebugSummary.witness`.**
  - **Files:**
    - `src/clueGame/questionMatch.ts`: `FieldNote` loses `full`; `Animal` loses `revealNotes`; the docs on `notes`.
    - `src/clueGame/questionMatchContent.ts`:
      - `buildAnimal` pushes every item whole;
      - `MAX_BLANKS` goes;
      - `BLANK` becomes module-local;
      - `censor` and the name-word list stay only for `witnessNameProblems`;
      - the header comments `:1-6`, `:109-110`.
    - `src/components/animalBoard/AnimalSheets.tsx` reveal card: `const notes = animal.notes`, `text: note.text`.
    - `src/clueGame/animalSession.ts`: `witness: [{ sign, text, also, behind }]`.
    - `tests/clueGame/animalBoard.test.ts`: the synth fixture drops `revealNotes`.
  - **Failure modes first:**
    - In `content.test.ts`: a profile's `notes` aren't exactly its hand-written clues then its facts, in profile order and whole; a note contains `____`; one of the 16 former `revealNotes` is missing.
    - In `animalBoard.test.ts` (W9): a dealt sign has no mystery note whose `heldSigns(tags)` holds it, so `behind` would be empty.
  - **Verify:**
    - CHECKS.
    - `git grep -n -E "revealNotes|MAX_BLANKS|\.full\b|noteCategories" src tests scripts` is empty.
    - E2E-DEV passes. Artifact: `$STATE/e2e-s8/`; delete `e2e-s7/`.

- [ ] S9. **Starting witness gem, rules `055-2`, and the bot's flag.**
  - **Files:**
    - `src/game/BoardModel.ts`: `RareGem.atLeast`; `newBoard` validation and the 20-attempt loop; private `topUpRare`.
    - `src/game/EventBus.ts`: `rare?: RareGem`.
    - `src/components/animalBoard/useAnimalSession.ts`: `atLeast: round.rules.startWitness`.
    - `src/clueGame/animalBoard.ts`: `AnimalRules.startWitness`; `ANIMAL_RULES` gets `version: '055-2'`, `startWitness: 1`.
    - `scripts/balance-044.ts`:
      - `--start-witness`, plus its usage line;
      - `atLeast` at `:387`, while `:385` stays at 0;
      - the start count in the header;
      - one line per place: "starting boards with a witness gem: X% (mean Y)", counted on free cells after `newBoard`.
    - `tests/game/boardModel.test.ts`.
  - **Failure modes first** (header of `boardModel.test.ts`):
    - G1: for seeds 0–1,999 with `tileCells` pins and `atLeast: 1`, a board has no rare gem on a free cell, a standing match, or no valid move.
    - G2: a seed whose `atLeast: 0` board already has a free rare gem gives a different grid with `atLeast: 1`.
    - G3: a seed whose only rolled gem sits on a pin gets no extra gem on a free cell.
    - G4: the same seed gives two different grids.
    - G5: `loadBoard` tops up.
    - G6: a negative, non-integer or infeasible (`freeCount − atLeast < 3`) `atLeast` doesn't throw `RangeError`.
    - G7: a tight but feasible `atLeast` gives a board without that many free rare gems, or with a standing match, or with no valid move.
    - G8: a rare gem dropped because its type is a normal gem still tops up or throws.
  - **Verify:**
    - CHECKS.
    - `node scripts/run-typescript.mjs scripts/balance-044.ts --rounds 20 --places world --players careful --start-witness 1` prints 100%; the same with `--start-witness 0` prints about 74%.
    - E2E-DEV passes (old-version saves are dropped through the version check). Artifact: `$STATE/e2e-s9/`; delete `e2e-s8/`.

- [ ] S10. **E2E checks for the new behavior** (no new rounds; DOM reads only).
  - **File:** `scripts/e2e.mjs`.
  - **Checks to add:**
    1. Every round start (`:904-910`) has at least one `grid[x][y] === 'purple'` on a cell not in `pins`, with `movesUsed === 0`.
    2. The notes check (`:2011-2029`), for each `li[data-witness-sign]`:
       - the first `<p>`'s trimmed text equals `__cc.signWitness()[sign]` and `clue().witness[i].text`;
       - it holds `[data-sign=sign]`, plus one `[data-sign=alt]` and an "or" for each `also`;
       - it has exactly one `[data-category-mark]`;
       - the count equals `state.notes`;
       - the dialog has no `____`.
    3. Every round end with `state.notes > 0` (next to `checkSources`): for each `clue().witness` entry, some `section[aria-labelledby="end-notes"] [data-sourced-facts] > li` starts with one of its `behind` texts, and the section has no `____`.
    4. `check('the run collected and checked a witness note', notesChecked)`.
  - **Verify:**
    - E2E-DEV passes, and `report.json` holds all four new check names.
    - If check 4 fails, make the player prefer a move next to a purple gem (as `shots/take.mjs:180` does) until a note is collected. Never weaken the check.
    - The run's time is in the Log (CI's job allows 15 min).
    - CHECKS. Artifact: `$STATE/e2e-s10/`; delete older `e2e-s*`.

- [ ] S11. **Goal 4 metrics script, counts and the "after = 0" check.**
  - **State files:** `$STATE/scripts/witness-metrics.ts` and `$STATE/witness-metrics.md`. No repo change.
  - **Runs:** RUN-TS on the base tree and on the worktree, each with `--content` set to HEAD's `db/content` and then `/tmp/ws-c7b/db/content`.
  - **It reports:** sets, combos, combos with at least one note, notes dealt, notes needing `also` chips, and dealt texts that aren't the sign's standard sentence.
    - For the worktree, it asserts that every dealt `text === witnessSentence(sign)` across all 525 combos on both content versions, with nothing thrown. The live-row run is the proof that the code works with the rows as they are today.
    - It reports the exact starting-gem share (73.82% → 100%); S13 adds the empirical figure from the bot's line.
  - **Verify:**
    - The numbers match the Pre-change facts table: base 525/525 and 403/525; after 525/525 and 458/525. If the S6 nulls move them, explain why.
    - The lead adds the table under a new `## Results` section, above `## Code review (Astra)`.

- [ ] S12. **Goal 4 "before" giveaway count.**
  - **Who:** Opus classifies HEAD's 157 distinct non-shared dealt texts (base tree) against the fitting suspects of each combo they appear in. It reuses the rulings in `/srv/critter-ai/agent-state/missions/sign-audit/wording.csv` where a mystery/clue/suspect pair was already ruled, and marks the rest as newly judged.
  - **Output:** `$STATE/before-wording.csv` (text, sign, mystery, fitting suspects, gives it away by its words yes/no, why, source of the ruling). `witness-metrics.ts` reads it to count giveaway notes over the 525 combos (after = 0).
  - **Verify:**
    - The lead samples 15 rulings; the table in `## Results` gets its before/after row.
    - Delete `/tmp/ws-base` and `/tmp/ws-c7b` afterwards (disk).

- [ ] S13. **Paired balance runs and the tuning comment.**
  - **Runs:** `node scripts/run-typescript.mjs scripts/balance-044.ts --rounds 200 --seed 44 --places world,africa,asia --start-witness 0 > $STATE/balance-run1.txt`, then the same with `--start-witness 1` into `$STATE/balance-run2.txt`.
  - **Comparison:** the lead compares Run 2 against Baseline using the pre-registered limits.
    - Explorers (careful, novice, expert, reader): Found −1 to +2 points; ★★★ −2 to +8 points; moves left −0.5 to +2.0; notes 0 to +0.8.
    - Guesser and random: Found and ★★★ ±4 points.
    - Oracle: Found and ★★★ 100%; moves left ±0.3.
    - The `starMoves` rule applies (careful's 20th percentile moves by more than 2).
    - Run 1 against Baseline measures the dealer and the edges; Run 2 against Run 1 measures the starting gem.
    - Any result out of limits gets a Decision, or the rules are adjusted.
  - **Then Opus:** one line on the 055-2 result in `ANIMAL_RULES`'s tuning comment (`src/clueGame/animalBoard.ts`).
  - **Verify:**
    - CHECKS.
    - Both tables and the empirical starting-gem lines go into `## Results`.

- [ ] S14. **Docs.**
  - **Files and what changes:**
    - `docs/CLUE_MATCH.md`:
      - `:20`, `:22`, `:51` ("up to 055-2"), `:53`;
      - `:61`: whole notes in profile order on the reveal card, and sentences in `SIGNS`;
      - `:90`: the new E2E checks.
    - `CONTEXT.md` `:58-59`, `:100-101`.
    - `docs/ANIMAL_BOARD_PAPER.md`: `:3`, plus the `> **Rules 055-2 (2026-11-24) …**` note with the bot result.
    - `docs/CONTENT_SOURCES.md`:
      - `:81`;
      - `:84-98`: the edges are wired, and the table becomes history;
      - the `witness` field and its checks;
      - `:102`.
  - **Verify:**
    - CHECKS.
    - `git grep -n -E "WithBlanks|revealNotes|____|blanked" docs CONTEXT.md` shows only history lines.

## Verification

Run these one at a time, after both final code reviews are recorded and their accepted MUST-FIX steps are done. Run them from the worktree root and record each result in **Log** and `## Results`.

1. **E2E (the Definition of done).** A dev content build, then the E2E:
   ```
   ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a
     [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1
     npm run content -- build && CHROME_PATH=$HOME/.local/bin/chrome-nosandbox npm run e2e:fresh )
   ```
   - Never `cat` or print the dev-copy file or `DATABASE_URL`. If the guard fails: stop, add a handoff item, end with `MISSION_BLOCKED`.
   - **It must show:**
     - The build's row counts match Baseline: `species: 76`, `species_deduction_clues: 3653`, `species_facts: 491` (unless S6 changed a tag).
     - `N/N checks passed`, with N at or above Baseline's 1554 plus the new checks.
     - Every round starts with a free purple gem.
     - Each collected note's text equals `signWitness()[sign]`, with its `SignChip`, the "or" `also` chips and one category mark, and no `____`.
     - Each round end's `#end-notes` starts with a `behind` text, with no `____`.
     - `the run collected and checked a witness note` passes.
     - The stale-save and A16 checks pass.
     - The run time is recorded (CI allows 15 min).
   - **Artifact:** move the newest `e2e-artifacts/<run>/` to `/srv/critter-ai/agent-state/missions/witness-signs/e2e-final/` (`report.json` + screenshots; re-run the same command with the same seed to reproduce it), clear any remaining `e2e-artifacts/*`, and delete every `$STATE/e2e-s*`. Keep `e2e-baseline/` and `e2e-final/`.
2. **Static checks:** `npm run typecheck`, `npm run lint` (0 warnings), `npm test` (all pass, more than Baseline's 147), and `npm run content -- preview > /tmp/ws-preview.txt && ! grep -n PROBLEM /tmp/ws-preview.txt`.
3. **Live database, read-only:** `npm run content -- check` with the worktree's `.env.local`.
   - Expected: `Pool: 76 playable of 76 species, 2475 clues (2083 deductive), 491 facts. 0 errors, 0 warnings.` (or the 3653-clue line if H22 has run).
   - Never `build`, `ranges` or `iucn`.
4. **Production build:** `npm run build` (typecheck + `next build`) passes with no errors. Run it alone, since memory is tight.
5. **Balance:** `## Results` shows Baseline, Run 1 (`--start-witness 0`) and Run 2 (`--start-witness 1`) on `--rounds 200 --seed 44 --places world,africa,asia`.
   - Every Run 2 result is within the pre-registered limits, or has a Decision.
   - The starting-gem line reads 100% in Run 2.
   - `starMoves` is unchanged, or there is a Decision.
6. **Goal 4:** `## Results` has the before and after table for HEAD content and live `7bce511a`:
   - combos with at least one note: 525→525 and 403→458, or explained;
   - dealt notes that give the mystery away by their words: before from `$STATE/before-wording.csv`, after 0;
   - rounds starting with a witness gem: 73.82%→100%.
   - Re-run `witness-metrics.ts` on the final tree (re-extracting `/tmp/ws-c7b` from `7bce511a` and deleting it right after); its "after" check passes on both content versions.
7. **Fable gate is complete:**
   - `$STATE/witness-sentences.csv` was regenerated from the final tree; `label hit` and `censor blanks` are 0.
   - Every FIX or NULL from Fable (or Astra) has a ruling under Decisions, and the accepted ones are in `signs.ts`.
   - Every `HELD_BACK` entry has a Decision and a Summary line.
8. **Dead code is gone:** `git grep -n -E "WithBlanks|revealNotes|noteCategories|MAX_BLANKS|\.full\b" src tests scripts` is empty.
9. **Owner's content build:** not needed if no profile changed (pure code: the sentences are in `SIGNS`), and the Summary says so. If S6 changed a tag, add the handoff item after the deploy's smoke tests (WSL: update `main`, take a fresh dump, `npm run content -- build`, `npm run content -- check`, with the expected summary line).

### Risks / open questions

- **Fable may hold signs back.** Each `null` it forces shrinks coverage; W6 and `HELD_BACK` make each one a recorded decision. If many signs fall, the 525/525 figure drops; report it.
- **E2E time.** `e2e:fresh` is close to CI's 15 minutes. The new checks are DOM reads only, but the steering for check 4 may add moves; watch the run time.
- **Disk is at 92%** (3.8 GB free). Keep one intermediate E2E folder, clear `e2e-artifacts/*` after moving, and delete the `/tmp/ws-*` trees after S12.
- **Before H22, live rows** keep 4 untrue pairs (`1:yellow_legs`, `9:forest_floor`, `14:puffs_up`, `39:rarely_drinks`), and 67/525 combos get a starting witness gem that gives no note. Both were accepted; the Summary must say so.
- **The starting gem** raises the mean number of witness gems from 1.32 to 1.58, which may push reader or novice above the ★★★ limit (+8 points). Decide that in S13 against the limits, not afterwards.
- **For the Summary, outside this mission:**
  - the website's `witnessNote` shot and alt text are now stale (`src/site/shots.ts:46-48`, `Teachers.tsx:89`);
  - the untagged note 14:2 ("puffs up") is left for a content PR.

## Code review (Astra)

## Code review (Fable)

## Release

## Decisions

- (lead) Architecture **A1(a) + U1 + B3 + C1**: store `witness: string | null` directly on `ActiveSignEntry` in `src/clueGame/signs.ts` and deal witness notes per sign (`{ sign, text, fits, also }`), wiring all 10 deferred open-tag `implies` edges from `sign-audit`. Eliminates duplicate-sign notes, multi-sign coupling, and `revealNotes` coupling; fixes every giveaway on live `7bce511a` rows immediately on deploy (`403 → 458/525` live combos) with zero content build needed.
- (lead) **Label UI & dead-code cleanup**: share `SignChip` between `GuideSigns` and `NotesList`, render sentences with `GlossaryText`, join `also` chips with explicit `"or"` (in both `NotesList` and `LogText`) so players never read narrower alternatives as AND, and remove dead `WithBlanks.tsx`, `noteCategories`, `FieldNote.full`, `Animal.revealNotes`, `MAX_BLANKS`, and the `BLANK` export while moving private `censor` into `witnessNameProblems` (`content -- preview` + unit tests).
- (lead) **Starting witness gem (B3)**: guarantee `>= 1` witness gem on unpinned starting cells on every board (`ANIMAL_RULES.startWitness = 1`, `RareGem.atLeast`), keeping random `witnessChance` rolls and strict board independence from the mystery (identical to conditional B1 on HEAD's `525/525` combos; preserves paired-round bot comparisons on the 73.8% of boards that already roll a witness gem).
- (lead) **Scope, reveal card, `14:2`, version & balance limits**: write sentences for all 201 active signs (`null` only for `floreana_island`, `pinta_island`, `prairie_dog_towns`, plus any sign Fable's truth review flags); keep reveal-card markup unchanged and defer untagged `14:2` to Summary so the mission stays pure code; bump `ANIMAL_RULES.version` to `'055-2'` and pre-register Run 2 vs Baseline balance limits (`--rounds 200 --seed 44 --places world,africa,asia`).
- (lead) **Revision rulings (Fable + Astra)**: Fable truth gate targets HEAD holders only (4 stale pre-H22 live pairs accepted until H22 runs; Astra MF1 rejected); keep sign labels as-is and keep `witnessNameProblems` strict (no label-word exemption) off the runtime path (`content -- preview` + tests); reject infeasible `RareGem.atLeast` and guarantee a playable board after `topUpRare` in `BoardModel.newBoard`; filter unknown open tags on the live `animalsFromPool` door only (authoring stays strict); validate `{ kind: 'note' }` entries in `round.log` inside `roundStillFits`; reject counterfactual multi-mystery filtering (Astra SC1, KISS).

## Log

- 2026-11-24 01:08 UTC — Baseline stage: verified typecheck, lint (0 warnings), unit tests (147/147), `content -- preview` (0 problems), live `content -- check` (2475 clues, 0 errors/warnings), guarded `phaser_june_dev` `content -- build && check` (3653 clues, 0 errors/warnings) + `e2e:fresh` (1554/1554 pass; saved at `$STATE/e2e-baseline/`), and baseline `balance-044.ts` (`--rounds 200 --seed 44 --places world,africa,asia`).
- 2026-11-24 01:40 UTC — Architecture stage: `architect` Pass 1 findings/options (`$STATE/tasks/20261124-011126-architect.md`), lead Decision (`A1(a) + U1 + B3 + C1`, 10 deferred edges wired, version `'055-2'`, pure code), and `architect` Pass 2 single-design rewrite (`$STATE/tasks/20261124-012648-architect.md`) recorded in plan. No code changes; plan-only commit.
- 2026-11-24 01:46 UTC — Fable review stage: `architecture-reviewer` returned `APPROVE_WITH_CHANGES` (1 MUST-FIX, 3 MISSED, 4 SHOULD-CONSIDER; saved at `$STATE/tasks/20261124-014241-architecture-reviewer.md`), recorded under `## Architecture review (Fable)`. Plan-only commit.
- 2026-11-24 01:50 UTC — Astra review stage: `astra-review` returned `APPROVE_WITH_CHANGES` (4 MUST-FIX, 1 SHOULD-CONSIDER; saved at `$STATE/tasks/20261124-014749-astra-architecture.md`), recorded under `## Architecture review (Astra)`. Plan-only commit.
- 2026-11-24 01:58 UTC — Revision stage: ruled on all 13 items from Fable (8) and Astra (5) under Revision notes (11 accepted, 2 rejected: Astra MF1, Astra SC1); updated Architecture, invariants, tests, Fable gate CSV, and Decision to match. Plan-only commit.
- 2026-11-24 02:08 UTC — Steps stage: `planner` drafted S1–S14 and E2E-first Verification (`$STATE/tasks/20261124-015853-planner.md`); lead reviewed and refined (`git grep` for missing `rg`, single-session TDD red-first check, `e2e-artifacts/` move/cleanup for 92% disk, S4 edge-triggered name-reword note, S11/S13 bot-line ordering, Verification step 6 `/tmp/ws-c7b` re-extract). Plan-only commit.

## Summary
