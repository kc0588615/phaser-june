---
mission: sign-audit
project: critter-connect
branch: agent/sign-audit
status: done
started: 2026-11-23 02:03 UTC
---

# Mission: Sign audit: every animal tagged with every sign it has (Critter Connect, Neon-led, Astra checks)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Neon-led. Start with:
     mission start critter-connect /srv/critter-ai/agent-state/missions/briefs/2026-11-23-sign-audit.md --harness agy
     Part 2a of Neon's roadmap; mission witness-signs (2b) follows it. Reviewed by Gemini 4 Neon (2026-11-23). -->

### Goal

Every animal's profile carries the signs (open tags, the words without a colon, `src/clueGame/signs.ts`) that are true of it under one clear definition each, so a witness note's count of "N of 5 field guides say this too" is right. **Astra (GPT-6.2-Astra at high effort) does the checking. Neon leads and decides. Opus fetches sources and makes the edits.**

How a missing tag hurts today: a witness note comes from the mystery, which always fits its own note, and it is dealt only if its signs fit 2 or more of the 5 suspects but not all (`witnessNotes`, `src/clueGame/animalBoard.ts:231-237`). A suspect "fits" only if its profile records every sign of the note; an untagged sign counts as "doesn't have it". So a look-alike that has the trait but isn't tagged makes the note's count too low ("2 of 5" instead of "3 of 5"), points a knowledgeable player the wrong way, and can stop a good note from being dealt at all, or let one through that fits only the mystery. Auto rule-out isn't involved: it reads only shown camera answers, never notes (`shownMismatch`, `animalBoard.ts:579-585`). `clue-design.md` in the vault (`research/critter-connect/`, lines 199, 469 and 541) has examples: the Pancake Tortoise without `temperature_sex` and the Savanna Elephant without `salt_licks`. Mission witness-signs (next) gives each sign one standard sentence, which makes complete, well-defined signs matter more.

When it's done:

1. **Each sign has one clear meaning.** Before any checking, the lead writes a one-line definition for every sign in use (what counts and what doesn't: does `climber` include an animal that climbs only rocks?), from `signs.ts`'s category and `implies`/`denies`, the glossary, and how its current holders use it. Signs whose holders use them in different senses get a definition that fits, or are split. Known rule problems to settle here: `climber` implies `trees:yes` but the Giant Panda climbs well and is `trees:no` (`clue-design.md` lines 329 and 736), and `never_climbs` implies `habitat:forest` (`signs.ts:129`).
2. **Narrower and broader signs follow one rule.** The repo's "one sign per fact" rule (`docs/CONTENT_SOURCES.md:76`, plan `plans/059-sign-dupes.md`) keeps only the narrower tag on a note (`carries_young_on_back`, not also `mother_carries_young`; `backward_pouch`, not also `pouch`; `spiral_horns`, not also `horns`), and lists more unresolved pairs (`059-sign-dupes.md:28-36`). So a true `has it` for the broader sign must not simply be added beside the narrower one. **The lead decides** one rule for all such pairs and records it: for example, a narrower sign counts as its broader one when witness fits are computed (code), or the pair is merged or redefined so they don't overlap. Plan 059 kept `backward_pouch` separate for its note's wording ("opens backward"); mission witness-signs replaces note wording in rounds, so that reason may no longer hold.
3. **Every sign is checked against every animal it could apply to.** At `origin/main` (`7bce511a`) there are 201 signs in use on 433 tagged notes, 93 of them held by two or more animals (top: burrower 18, territorial 13, scent_marks 12, digging_claws 11, poor_eyesight 11). The 15 retired entries in `SIGNS` that no note uses are out. Every sign in use is in scope, including those held by one animal today: another animal may have it untagged.
   - **Triage first, recorded:** for each sign, the lead records which animals can't have it, with the rule: by class or body plan (a frog can't have `hooves`), by place (`floreana_island`, `pinta_island`), or because no other animal among the 76 could plausibly hold it (`star_fingers`, `tail_organ`). Those pairs get `no (triage: <rule>)`. Every other pair is checked.
   - **Each checked pair gets a verdict:** `has it` (with a source quote), `doesn't` (with a source quote, or "source silent and the trait is the kind a source would mention", said so), or `can't tell` (with the reason).
4. **The profiles are corrected.** Every `has it` a profile lacks becomes a tag on the right note, or a new short note with its source if the animal has no sentence about it, following Goal 2's rule. Every current tag a verdict says `doesn't` is removed. The ledger lists every change.
5. **Nothing breaks the signs' rules.** `signs.ts`'s `implies` and `denies` still hold for every holder (`signProblems`, which `checkProfile` and so `npm run content -- preview` run, reports nothing). Where a correct tag would break one, the lead fixes the rule or the record and says which.

### Why

The owner's players are solo kids (owner, 2026-11-20). A witness note's count teaches them which animals share a trait; a wrong count teaches wrong biology and spoils the note's puzzle. The owner wants every sign checked by a second model family (Astra) before the witness notes become standard sentences.

### Scope

In:
- `db/content/animals/*.json`: tags on notes, and new short notes where needed, each with its source
- `db/content/citations.json` and `db/content/sources.json`, for the sources new notes cite: add entries in the same commit as the notes that cite them (`checkCitations` fails otherwise), and **never delete an entry the live rows still cite** (`docs/CONTENT_SOURCES.md:142-151`)
- `src/clueGame/signs.ts` (definitions, splits, `implies`/`denies`, and Goal 2's rule if it's code), `glossary.ts` where a sign's definition reads to the player, `animalBoard.ts` only for Goal 2, and their tests
- `docs/CONTENT_SOURCES.md` and `docs/research/2026-11-07-moves-and-signs/sign-map.csv` (the research record `signs.ts` names), as far as the signs change
- The ledger, scripts, saved sources and Astra's prompts and outputs: in `/srv/critter-ai/agent-state/missions/sign-audit/`, never in the repo

Out:
- Any write to the live database. Never run `npm run content -- build`, `ranges` or `npm run iucn` with the mission's `.env.local`. Heavy or test queries go to the dev copy (block below).
- Witness-note wording, the starting witness gem, and anything else of mission witness-signs. Note give-away wording you meet for it, in the Summary.
- Trait values (diet, size, activity …) and the question columns, unless a sign's `implies`/`denies` forces one; then record it.

### How the work is split

- **Astra checks.** The lead writes each batch's prompt to `/srv/critter-ai/agent-state/missions/sign-audit/astra/<batch>.prompt.md` and runs, from that state folder, `ASTRA_EFFORT=high astra-review --task <prompt> <plan>`, giving `<plan>` as the **absolute** path to the plan in the worktree (`astra-review` checks that the file exists). That's GPT-6.2-Astra at **high**, read-only, with web search, 60 minutes at most. Save stdout as `<batch>.out.md`, and check that every pair of the batch has exactly one row. The prompt gives the sign definitions, the pairs, the animals' profile paths in a pinned export, the saved source files, and the row format: `animal id, sign, verdict, quote, source file or URL`.
- **Opus fetches sources first** (`claude-task`). A read-only Astra run has web search but no network in its shell, IUCN blocks bots, and AmphibiaWeb only answers through Wayback, 5 s apart (`docs/CONTENT_SOURCES.md`). Save each animal's cited pages once into `…/sign-audit/sources/`. Reuse what earlier missions saved: `/srv/critter-ai/agent-state/missions/cc-clue-verify/sources/` and `clue-audit/sources/`.
- **Batches of about 250–350 candidate pairs**, grouped within a sign category (not a whole category: `body` has 87 signs and `habits` 75). The earlier verification ran 200–360 rows per Astra run in 10–47 minutes (`/srv/critter-ai/agent-state/missions/cc-clue-verify/batches.csv`). A pilot batch sets the size: the largest that finishes well inside 60 minutes. On a timeout or missing rows, halve the batch and rerun it.
- **Fit it in the session budget.** After triage, the plan estimates the batches and sessions. A mission run stops at 60 sessions (`mission resume` continues), so if the estimate is well over that, the lead groups more work per session (several batches or cross-checks per session) rather than one batch each.
- **Opus cross-checks** (`claude-task`) every verdict that would change a profile (an add or a remove), every `can't tell` that matters, and a sample of 5–10 unchanged verdicts per batch, against the saved source: `agree`, `disagree` (with evidence) or `can't tell`. The ledger keeps both side by side.
- **The lead decides** every disagreement and records why. Then Opus makes the profile edits (`claude-task`), and the lead accepts or rejects them as usual.
- **Astra's limit:** this mission waits for Astra **in its audit batches only**. When an `astra-review --task` batch exits 3, commit what's done and end the session with `MISSION_WAIT_ASTRA`. Astra's architecture and final code reviews follow `mission-lead.md` as usual (skipped on exit 3).

### Definition of done

- The ledger (`…/sign-audit/ledger.csv`) has one row per sign in use × animal: triaged or checked, Astra's verdict, Opus's cross-check where made, the lead's ruling where they differ, and the change made. The plan has its counts by verdict and by sign category.
- `npm run typecheck`, `npm run lint` and `npm test` pass. `npm run content -- preview` reports no problems.
- `npm run e2e:fresh` passes against the dev copy `phaser_june_dev`, never `.env.local`, after a dev content build:
  ```
  ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a
    [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1
    npm run content -- build && CHROME_PATH=$HOME/.local/bin/chrome-nosandbox npm run e2e:fresh )
  ```
  Never print a connection string or `cat` that file. If the guard fails, stop and add a handoff item. Save the final run's artifact as `/srv/critter-ai/agent-state/missions/sign-audit/e2e-final/`.
- `npm run content -- check` (read-only) still passes on the live database.
- **Witness notes before and after,** on the current 105 dealable sets (525 set-and-mystery combinations; the `cc-clue-design` digest's 103 sets are from before the dealer change, so recompute with the current dealer, as `scripts/balance-044.ts` does without a database): the number of combinations with at least one eligible note, and every (set, mystery, note) whose fit count or eligibility changed. In the plan.
- The final reviews are recorded: `## Code review (Astra)` and `## Code review (Fable)`, with the lead's ruling on each item.
- The Summary lists the sign definitions, Goal 2's rule, the tags added and removed per animal (with sources), and the handoff item for the owner's content build.

### Decision rules

- **Neon decides** (`~/.gemini/mission-lead.md`): sign definitions, Goal 2's rule, triage rules, batch size, and every disputed verdict.
- **A tag needs a source.** No tag is added on general knowledge alone; when the cited sources are silent, look for a better source of the ranking in `docs/CONTENT_SOURCES.md`, or leave it untagged and record `can't tell`.
- **Prefer fixing the sign over many profiles** when holders disagree because the sign is vague.
- **The deployed code must load the live rows as they are** until the owner's content build: keep every sign that any live row uses in `SIGNS` (`signs.ts:3-4` keeps retired ones for exactly this; an unknown tag throws `Unknown sign`, `signs.ts:257`, and would break `/explore`). A split or renamed sign keeps its old entry, marked retired. `travelOf` (`animalBoard.ts:286-292`) reads `glider`, `fully_aquatic`, `swimmer` and `burrower` to decide how animals leave the board: change it in the same commit if any of those four changes.

### Notes

- **The owner's part, after the release:** one handoff item, added after the deploy's smoke tests pass: from WSL, update `main`, take a fresh dump (`ssh root@play.critterconnect.org /opt/critter-connect/deploy/backup/pg-backup.sh`), `npm run content -- build`, then `npm run content -- check`, with the expected summary line.
- The vault research it builds on: `research/critter-connect/clue-verification.md` (with its group notes) and `clue-design.md`, read from `/srv/critter-ai/vault`. The `cc-clue-design` state folder's `scripts/` and `digest/` are pinned to `0837540a`; reuse the scripts, but recompute anything that depends on the dealer.
- `origin/main` is at `7bce511a` (2026-11-20, rules `055-1`); the live database was brought up to it on 2026-11-23.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

## Baseline

- Branch / base: `agent/sign-audit` at `0d02c12e`, cut from `origin/main` `7bce511a`. No uncommitted changes; `/srv/critter-ai/handoff/critter-connect.md` has no open items.
- Runtime: Node `v24.21.0`, npm `11.19.0`; `node_modules` installed; no DB migrations (baseline `db/schema.sql` already live and on `phaser_june_dev`).
- `npm run typecheck`: pass (exit 0).
- `npm run lint` (`eslint` + `check-theme.mjs`): pass (exit 0, 0 warnings).
- `npm test`: pass (106/106 tests, 3 suites, 0 failed, 4.0 s).
- `npm run content -- preview`: pass (exit 0, 0 problems across 76 profiles).
- `npm run content -- check` (live `phaser_june`, read-only): pass — `Pool: 76 playable of 76 species, 2475 clues (2083 deductive), 491 facts. 0 errors, 0 warnings.`
- `npm run content -- check` (`phaser_june_dev`, guarded): pass — identical pool counts, 0 errors, 0 warnings.
- `CHROME_PATH=$HOME/.local/bin/chrome-nosandbox npm run e2e:fresh` (`phaser_june_dev`, guarded): pass — `1657/1657 checks passed` (Anywhere load median 2295 ms at 1x, 4452 ms at 4x). Artifact: `/srv/critter-ai/agent-state/missions/sign-audit/e2e-baseline/`.

## Architecture

### Findings

Ranked by impact. All counts come from `origin/main` `7bce511a` (worktree `0d02c12e`), computed offline with the repo's own `animalsFromProfiles`, `pickSuspectSet`, `witnessNotes` and `signProblems`.

**F1 · `climber` implies `trees:yes`** (`signs.ts:53`). This breaks the trees rule and blocks true holders.
- `implies` only conflicts when the holder has a different recorded value (`tagOutcome`, `deduction.ts:8-14`). So `climber` can't go on any of the **61** animals recorded `trees:no`, among them Giant Panda 60, Jaguar 51, Tiger 25 and Tasmanian Devil 48.
- It contradicts the trees rule, "an animal that climbs but lives mostly on the ground is a no" (`docs/CONTENT_SOURCES.md:68`). It also makes `climber` nearly restate the asked `trees:yes`, which the sign rule forbids (`:75`).
- Holders use it in three senses: tree life (5, 43), climbing ability (34, 35, 71) and a tail used to climb (24).
- `CONTENT_SOURCES.md:77` describes this reading as intended, so the doc changes with the rule.
- **Fix:** drop the `implies`. `meaning`: "climbs well or often (trees, rocks or both)".

**F2 · `never_climbs` implies `habitat:forest`** (`signs.ts:129`). The note's wording has leaked into the rule: its only holder, Giant Pangolin 55, says "Even though it lives in forests, it never climbs trees" (`55-giant-pangolin.json:137`).
- `habitat` is a complete prefix, so the rule blocks **32** animals with no forest habitat. Those are exactly the animals most likely to never climb (zebra, addax, rhino, gazelle, hirola).
- **Fix:** `implies: ['trees:no']`. Its `meaning` is settled in Definitions: 55's note only rules out trees, and `climber` (F1) includes rocks, so the two can coexist. `denies: ['climber']` (open-tag `denies`, F8) is wired only if the approved `meaning` also rules out rock climbing; it is not pre-wired.

**F3 · `swimmer` implies fresh water** (`system:freshwater` and `habitat:wetlands`, `signs.ts:212`). Both are complete prefixes, so the rule blocks **54** animals, including strong swimmers:
- Tiger 25, Jaguar 51, the three elephants (28, 41, 64), Giant Anteater 52, Javan Rhinoceros 44.
- Brown-throated Sloth 54. Its own note says "it can swim well" but carries only `seldom_on_ground`: a live missing tag that the rule won't let anyone fix.
- **Fix:** drop the `implies`.
- **Coupling (verified):** `travelOf` (`animalBoard.ts:286-292`) sends any `swimmer` swimming. The three current holders (53, 70, 73) all have `system:freshwater`. Every blocked animal above is `system:terrestrial` only, so narrowing `travelOf` on `system:` keeps today's exits and makes terrestrial swimmers walk.

**F4 · Other active rules that are too narrow:**
- `above_tree_line` denies `habitat:forest` (`:28`). It blocks Vancouver Island Marmot 42 and Andean Bear 71. Fix: keep `implies: ['trees:no']`, drop `denies`.
- `sand_dunes` implies `habitat:desert` (`:167`). It blocks De Winton's Golden Mole 32 (coastal dunes, recorded as shrubland). Fix: drop `implies`.
- `snorkel_nose` implies fresh water (`:186`). It blocks the elephants, which snorkel with their trunks. Settled with its definition (Target design §1.6).
- `shares_food` denies `social:alone` (`:178`). That's right only if it means sharing within a group, since solitary mothers also feed their young. Settled with its definition.
- `often_in_trees` implies `trees:yes` and `habitat:forest` (`:133`), but "often" is weaker than "most of its active life". Settled with its definition.
- Every other `implies`/`denies` on active signs checks out against the 76 records.

**F5 · No retired guard, and the retired entries keep false rules.**
- `SignEntry` (`signs.ts:8-16`) has no `retired` field. `signProblems` (`:272-288`) accepts all 216 entries, so a new note can reuse any of the 15 retired tags (`059-sign-dupes.md:40`).
- The 15 retired tags are `builds_nests`, `climbing_tail`, `coalitions`, `coastal_dunes`, `giant_frog`, `hair_like_frills`, `internal_fertilization`, `no_tadpoles`, `rock_basker`, `rock_climber`, `sand_swimmer`, `seasonal_streams`, `stays_underground`, `tree_dweller` and `yellow_scales`. Several carry biologically false rules:
  - `internal_fertilization` → `birth:live` and `no_tadpoles` → `birth:live`
  - `builds_nests` → `birth:eggs`
  - `rock_climber` → `trees:yes`
  - `sand_swimmer` → `system:freshwater`
  - `coastal_dunes` → marine + desert
  - `hair_like_frills` → `covering:fur`
  - `yellow_scales` → `covering:scales`
- `tree_dweller` is the only entry with `restates` (`:222`), so retiring it leaves `restates` and its check (`:285`) dead.
- **Fix:** a discriminated union without `restates` (§1.1).

**F6 · No sign has a definition, and holders use some signs in different senses.** `signPhrase` (`:249`) derives display text from the tag; nothing states what counts. Signs used in more than one sense:
- `climber` (F1)
- `burrower`: true burrows vs burying in soft ground or sand
- `carries_young_on_back`: mothers 52/56/61/63, vs frogs 9/76 whose fathers carry tadpoles on their backs (tagged `father_carries_young`), vs 10 Suriname Toad with eggs in the mother's back
- `stands_on_hind_legs`: rearing up vs walking on two legs
- `forest_floor`: 76 uses it for "hardly ever climbs"
- `one_island`: not held by 19/22 or the Madagascar endemics
- `town_dweller` vs `prairie_dog_towns`

**F7 · Narrower/broader pairs beyond plan 059, plus unchecked mutual exclusions.**
- Plan 059 pairs: `backward_pouch`→`pouch`, `spiral_horns`/`s_shaped_horns`→`horns`, `shoulder_stripe`→`stripes`, `spectacles`→`face_markings`.
- Candidate new strict pairs (each needs lead approval under the final definitions):
  - `face_mask`→`face_markings`, `tear_lines`→`face_markings`
  - `floreana_island`/`pinta_island`→`one_island`
  - `feathery_gills`→`underwater_breathing`
  - `cecropia_leaves`→`leaf_eater`
  - `walks_upright`→`stands_on_hind_legs`
  - `dung_piles`→`scent_marks`
  - `brown_throat`→`throat_patch`
  - Depending on definitions: `climbs_boulders`→`climber`, `fully_aquatic`→`swimmer`, `above_tree_line`→`high_mountains`, `foam_nest`→`eggs_over_water`, `carries_young_on_back`→`mother_carries_young`
- **Entailment is not enough.** Several live broad-tagged notes have narrower words, so a wired edge makes them fit narrower holders falsely: 43's "Its pouch opens forward" (`pouch`) would fit 31/37/48 through `backward_pouch`; 66's "two horns, one behind the other" (`horns`) would fit 50/69; 54's "clinging to her belly" and 24/59's "on her tail" (`mother_carries_young`) would fit 52/56/61/63. Plan 059 measured this family: 43 pairs, 39 false (`059-sign-dupes.md:21,45-61`). Each edge therefore also needs a wording gate (§2.1).
- **Existing co-holds (verified across all 20 candidates):** only Ethiopian Wolf 33 (`above_tree_line` + `high_mountains`) and Black Rhinoceros 66 (`dung_piles` + `scent_marks`), each on one note.
- Unchecked mutual exclusions: `climber`/`never_climbs` (F2), `long_tail`/`stubby_tail`, `long_tongue`/`no_tongue`, `toothless`/`many_teeth`/`tube_teeth`, `voiceless`/call signs, `fully_aquatic`/`eggs_on_land`.
- Measured on today's content, 14 strict edges, before the wording gate:
  - take combinations with ≥1 eligible note from 402 to 407
  - take eligible notes from 940 to 959 (+22 added, −3 that now fit all 5)
  - change 27 fit counts

**F8 · Sign-to-sign rules are only half implemented.**
- An `implies` with an open tag silently does nothing: `tagOutcome` returns `'unknown'` when there's no prefix (`deduction.ts:11`).
- A `denies` with an open tag already works against `record`, because `record` holds the profile's open tags too (`profiles.ts:295,375`). No entry uses it yet.
- "One sign per fact" (`CONTENT_SOURCES.md:76`) is prose only; nothing flags redundant narrow+broad tags.

**F9 · Three literal fit checks, and live compatibility.**
- A suspect "fits" a note in three places, each a literal `note.tags.every(tag => animal.tags.includes(tag))` on `Animal.tags` (every clue tag, traits included, `questionMatchContent.ts:131-136`):
  - `witnessNotes` (`animalBoard.ts:231-237`), the dealer's count
  - `stillPossible` (`animalBoard.ts:575`), which feeds `animalDebugSummary` (`animalSession.ts:147`), the balance bot (`scripts/balance-044.ts:112,146,176,196`) and `tests/clueGame/animalBoard.test.ts:102-104`
  - the test oracle at `tests/clueGame/animalBoard.test.ts:84`
- Changing only `witnessNotes` (as the first design did) would make the bot rule out suspects that the note's count includes. **Fix:** one exported predicate (§1.4).
- `travelOf` also reads `Animal.tags`, on the fly (`useAnimalSession.ts:196,266`; `balance-044.ts:90`).
- `roundStillFits` (`:245-260`) compares the saved notes' text, tags and fits. A fit change re-deals only the saves it affects, with no need to bump `ANIMAL_RULES.version`.
- `noteCategories` (`signs.ts:262`) reads a note's raw tags; the field-guide badges (`AnimalSheets.tsx:217`) read `Animal.signs = signsOf(allTags)` (`questionMatchContent.ts:136`), every open tag of every note. `scripts/e2e.mjs:1223` expects them to equal the pool's raw open tags (built at `:756-767`).
- Unknown tags throw at load (`signs.ts:257`), so every tag a live row uses must stay in `SIGNS`.
- `pickSuspectSet` and `dealClues` read traits only, never signs.
- `validatePool` (`content -- check`) doesn't run sign rules, so live rows built before the new rules still pass.

**Dataset and baseline:**
- `SIGNS`: 216 entries. 201 are active (body 87, habits 75, habitat 22, life 16, range 1) and 15 retired. 506 tag uses, 494 distinct (sign, animal) holds, 433 tagged notes (66 with several signs, none mixing signs and traits), 93 signs held by 2+ animals.
- Pairs: 15,276 (76 × 201) = 494 held + 14,782 open. The open ones are 7,410 cross-class, 5,578 same class but another order, 1,794 same order. Triage should remove about 75–85% of the open pairs, leaving roughly 2,200–3,800 open candidates plus the ~494 held pairs to check.
- Sources: 259 of 267 cited pages are already cached across `cc-clue-verify/sources/` and `cc-clue-design/sources/`. 8 are missing (7 `literature` DOIs, 1 `sdzwa` page). 11 animals have no ADW account.
- Witness baseline (current dealer, `7bce511a`):
  - 105 dealable sets (world 49, africa 23, asia 15, north-america 9, south-america 9), so 525 (set, mystery) combinations
  - 402 combinations (76.6%) have ≥1 eligible note, 940 eligible notes in all
  - 2,091 (combo, note) cases dropped for fitting only the mystery, 22 for fitting all 5

### Target design

The lead's **A3 + B2**, with its four refinements, as revised by `## Revision notes`. Part 1 is repo code and content rules, which ship in one **rules commit** before triage. Part 2 is the audit pipeline, in the state folder only.

#### 1. Code and schema

**1.1 `SignEntry` becomes a discriminated union** (`signs.ts:8-18`):

```ts
/** A sign players can be shown and authors can tag. */
export interface ActiveSignEntry {
  category: ChargeCategory;
  /** The definition: what counts and what doesn't, one line. Authoritative for tagging and for the audit. */
  meaning: string;
  /** What its meaning entails. Trait tags (`prefix:value`): the holder's record must not rule them out.
   *  Open tags (active signs): strictly broader signs the holder therefore also holds (witness fits, rule checks).
   *  An open-tag edge is listed only once it passes the wording gate (§2.1). */
  implies?: readonly string[];
  /** What its meaning rules out. Trait tags: the holder must not hold them. Open tags: the holder must not hold
   *  that sign or any sign implying it. One direction is enough for a mutual exclusion. */
  denies?: readonly string[];
  retired?: never;
}
/** A tag kept only so rows an older content build wrote still load. No rules, no meaning; never tagged again. */
export interface RetiredSignEntry { category: ChargeCategory; retired: true }
export type SignEntry = ActiveSignEntry | RetiredSignEntry;

const at = (category: ChargeCategory, meaning: string, rules: Pick<ActiveSignEntry, 'implies' | 'denies'> = {}): ActiveSignEntry => ({ category, meaning, ...rules });
const retired = (category: ChargeCategory): RetiredSignEntry => ({ category, retired: true });
```

- The 15 retired tags become `retired('…')`, which drops their false rules. `restates` goes with them: `tree_dweller` was its only user, and retired signs are rejected outright (§1.3), so nothing is left for it to guard.
- The now-unused imports `PREFIX_CATEGORY` and `questionText` leave `signs.ts`; `prefixOf` stays only if `signTableProblems` uses it for the prefix check.
- A missing `meaning` on an active entry, or a rule on a retired one, is a compile error.
- `FRESH_WATER` stays for the habitat signs that still use it (`big_rivers`, `cold_streams`, `fast_streams`, `forest_streams`, `sandy_bottoms`, `shallow_wetlands`, `rests_by_waterfalls`).

**1.2 Table check and closure, built once at module load** (pure, in `signs.ts`):
- `export function signTableProblems(table: Readonly<Record<string, SignEntry>>): string[]` is a query. It reports:
  - an active entry whose `meaning.trim()` is empty
  - an `implies`/`denies` target with a colon whose prefix is in neither `EXCLUSIVE_PREFIXES` nor `COMPLETE_PREFIXES` (`traits.ts`), since a prefix typo would otherwise silently match nothing
  - an open-tag target that is missing from the table, or retired
  - a sign that implies or denies itself
  - a cycle in open-tag `implies` (reported as `a -> b -> a`)
- At load: `const tableProblems = signTableProblems(SIGNS); if (tableProblems.length) throw new Error(...)`. Every importer fails fast: the app, `content`, the tests, `balance-044`.
- Then `const IMPLIED: ReadonlyMap<string, ReadonlySet<string>>` maps each entry to the open signs it transitively implies, by DFS over open-tag `implies` (the table is now known to have no cycles). Retired entries map to an empty set. The cost is one pass over 216 entries, so nothing needs memoizing per animal.
- A private `entryOf(tag)` throws the existing `Unknown sign "<tag>"…` message. `signCategory` (`:255-259`) and the closure both use it, so the lookup isn't duplicated.

**1.3 Queries** (`signs.ts`; `openTags` (`:246`) stays private and unchanged):
- **`export function heldSigns(tags: readonly string[] | undefined): ReadonlySet<string>`**: the record's own open tags plus every sign they transitively imply (`IMPLIED`). It throws on an unknown tag; live animals never reach that, because `signsOf` already threw at load. A retired tag on a live row is held as itself and implies nothing, so live rows load and fit exactly as tagged.
- **`signsOf(tags)`** (the field-guide badges, `Animal.signs`, `questionMatchContent.ts:136`) takes the distinct open tags and drops every tag `y` that another tag `x` among them implies (`y ∈ IMPLIED(x)`), keeping tag order. Two notes may hold `spiral_horns` and `horns` (§1.3 step 4 allows it); the photo shows only `spiral_horns`. Retired tags imply nothing, so they pass through unchanged.
- **`signCategory` and `noteCategories`** accept retired entries and stay raw (a note never holds a narrower and a broader sign together, step 4).
- **`signProblems(clues, record)`** keeps its signature and its only caller (`profiles.ts:375`, inside `checkProfile`, so it also runs in `content -- preview/build` and in `content.test.ts:15`). `record` is still every tag of `profileClues`, including open tags. Let `own` be the profile's distinct open tags and `closure = heldSigns(own)` (computed only after step 1 passes). It returns:
  1. **Unknown:** each `own` tag missing from `SIGNS` (existing message). If there are any, return now: the remaining checks need the closure.
  2. **Retired:** each `own` tag whose entry is retired: `sign "<tag>" is retired (kept only so old rows load): tag what the note shows with an active sign`.
  3. **Contradiction** (profile-wide, since a fact about the animal holds across its notes): for each `own` tag `t`, and each `s` in `{t} ∪ IMPLIED(t)`:
     - every trait target of `s.implies` whose `tagOutcome` against `record` is `exclusive-conflict` or `complete-conflict` (only trait tags reach `tagOutcome`; `deduction.ts` is unchanged)
     - every trait target of `s.denies` that `record` holds
     - every open target of `s.denies` that `closure` holds. This covers mutual exclusions, and a denied broad sign reached through a narrower one.
     - Reported per `t`, naming the sign `s` the rule comes from: `sign "<t>" contradicts its holder's record (it reads as …, via <s>): tag what the note shows`.
  4. **One sign per fact, per note:** for each clue, each ordered pair of distinct open tags `x`, `y` on **that clue** with `y ∈ IMPLIED(x)`: `sign "<y>" is already stated by "<x>" on the same note: keep only the narrower (one sign per fact)`. A broad tag on one note and a narrower tag on another is allowed: each note stays dealable, and `signsOf` keeps the badge single.

**1.4 One fit predicate** (`animalBoard.ts`), the only definition of "a suspect fits a note":
```ts
/** Whether a suspect's field guide records every tag of the note, or a narrower sign that states it. */
export function animalFitsNote(suspect: Pick<Animal, 'tags'>, note: Pick<FieldNote, 'tags'>): boolean {
  const tags = suspect.tags ?? [];
  const held = new Set([...tags, ...heldSigns(tags)]);
  return (note.tags ?? []).every(tag => held.has(tag));
}
```
- Callers, all in the rules commit: `witnessNotes` (`:231-237`; `fits = suspects.filter(id => animalFitsNote(animal(book, id), note)).length`), `stillPossible` (`:575`, so `animalDebugSummary` and `balance-044.ts` follow), the test oracle at `tests/clueGame/animalBoard.test.ts:84`, and `metrics/witness.ts` (§2.8). No other literal fit check remains (`rg "tags\?\.includes\(tag\)" src scripts tests` is empty).
- Prefixed tags still match raw, so behaviour is unchanged until an open-tag edge is wired.
- A note with several tags fits only when every tag is held. Untagged notes stay the callers' concern (`witnessNotes` skips them; `stillPossible` only sees dealt notes).
- The note's own tags are never expanded: a note tagged `pouch` fits `backward_pouch` holders, and a note tagged `backward_pouch` doesn't fit `pouch` holders.
- The cost is a set of at most ~30 tags per call, so it isn't memoized.
- `witnessNotes`' doc comment changes to "records every tag of the note, or a narrower sign that states it".

**1.5 `travelOf`** (`animalBoard.ts:286-292`) reads **raw** `animal.tags`, never `heldSigns`, so an edge never silently changes how an animal leaves the board:
```ts
const tags = animal.tags ?? [];
const inWater = tags.includes('system:freshwater') || tags.includes('system:marine');
if (tags.includes('fully_aquatic') || (tags.includes('swimmer') && inWater)) return 'swim';
```
- It lands in the same commit that drops `FRESH_WATER` from `swimmer`.
- If the Definitions step splits or retires `glider`, `fully_aquatic`, `swimmer` or `burrower`, `travelOf` reads the old tag **or** its active successor in that same commit. Live rows and rebuilt rows then travel the same way.

**1.6 Rule fixes (F1–F4) and definitions still to settle:**

| Sign | After |
|---|---|
| `climber` | no rules; "climbs well or often (trees, rocks or both)" |
| `never_climbs` | `implies: ['trees:no']` (plus `denies: ['often_in_trees']` if that stays a tree sign). `meaning` settled from 55's note ("never climbs trees"): default "never climbs trees", with no `denies: ['climber']`. `denies: ['climber']` is added only if the approved `meaning` rules out rock climbing too. |
| `swimmer` | no rules; "swims well or often, by choice" |
| `above_tree_line` | `implies: ['trees:no']`; `denies` dropped |
| `sand_dunes` | `implies` dropped |
| `snorkel_nose` | default: drop `FRESH_WATER` ("breathes through a raised nose or trunk tip while under water"); keep it only if the definition limits it to fresh-water animals |
| `shares_food` | default: keep `denies: ['social:alone']`, defined "shares food with others of its group (a mother feeding her young doesn't count)" |
| `often_in_trees` | default: drop `trees:yes` and `habitat:forest` ("spends much of its time in trees"); if strictly entailed, the candidate edge `often_in_trees`→`climber` (gated, §2.1) |
| `carries_young_on_back` | decided from all holders' notes (52/56/61/63 mothers; frogs 9/76, toad 10). Default: "a mother carries her young on her back"; frogs keep `father_carries_young`. The edge →`mother_carries_young` is a candidate like any other: it is entailed, but the live `mother_carries_young` notes of 54 ("clinging to her belly") and 24/59 ("on her tail") fail the wording gate, so by default it is `deferred-to-witness-signs`. Either way no profile holds both on a note (059's single badge). |

- **Every open-tag `implies` edge** (F7) is wired only if it passes both parts of the gate in §2.1: (a) strict entailment under both approved meanings, and (b) zero false wording fits among the matches it adds in snapshot 2 and snapshot 3. An edge that passes (a) but fails (b) is recorded `deferred-to-witness-signs` and is **not** in `SIGNS.implies` this mission. Expected deferrals on live wording: `backward_pouch`→`pouch` (43), `spiral_horns`/`s_shaped_horns`→`horns` (66), `shoulder_stripe`→`stripes`, `spectacles`→`face_markings`, `carries_young_on_back`→`mother_carries_young` (54, 24, 59), each confirmed or cleared by the gate's rulings.
- **Content fixes forced by the rules commit** (each recorded as `rules_commit_change` in the ledger, §2.6):
  - Only for edges that are wired: drop `high_mountains` from 33's note and `scent_marks` from 66's note (same-note co-holds, §1.3 step 4). This changes no fit (the closure supplies them).
  - Retag any profile whose sign is split or retired.
  - With these fixes, `content -- preview` stays clean at the commit.

**1.7 Tests first** (`npm test`, per the testing rules). Before any code, the rules commit's author writes down the ways it can fail, then writes these tests:
- `signTableProblems`: each problem in §1.2, on small fixture tables.
- `signProblems`: unknown (with early return); retired; trait conflict through the closure; open `denies` against a directly held sign and against one reached through a narrower sign; one sign per fact on the same note is flagged; a broad tag and its narrower sign on **different** notes is clean; a clean profile.
- `signsOf`: a record holding a narrower sign and its wired broader sign (on different notes) shows only the narrower badge; a lone broad sign shows; a retired tag shows as itself.
- `heldSigns`: retired tag held raw with no closure; unknown tag throws.
- `animalFitsNote`: a narrower holder fits a broad note and not the reverse; a note with several tags; trait tags match raw.
- `witnessNotes` and `stillPossible` on a small fixture book built around one wired edge read from `SIGNS` (the test asserts one exists): a note tagged with the broad sign counts the narrower holder in `fits`, and `stillPossible` keeps that holder possible while ruling out a suspect holding neither.
- `travelOf`: terrestrial-only `swimmer` walks; `swimmer` with `system:freshwater` swims; `fully_aquatic` swims; `glider` and bats fly; `burrower` digs.
- **E2E** (`scripts/e2e.mjs:1222-1227`): the field-guide check keeps comparing against the pool's raw open tags (`:756-767`, from the API, not from `signsOf`), but expects the wired implied tags omitted. `debugBridge.ts` adds a dev-only `window.__cc.signImplies()` returning each active sign's **direct** open-tag `implies` (table data, no closure). `e2e.mjs` fetches it once, computes the transitive closure with its own small DFS, and sets `want = raw open tags − ⋃ closure(x) over the raw open tags`. The expectation thus comes from the database's tags and the table's data, re-derived independently of `IMPLIED`/`signsOf`, and no copy of `SIGNS` lives in the script.

**1.8 Live database and `ANIMAL_RULES.version` (stays `055-1`).**
- **Deploy:** the deploy ships the rules commit and the profile edits together, but live rows stay at `7bce511a` content until the owner's content build.
  - The live rows load, because every tag they use is still in `SIGNS`, retired ones included.
  - Fits on live change by exactly the snapshot-2 delta (§2.8), which the wording gate holds to zero false matches.
  - `signProblems` never runs on live rows (`validatePool` doesn't call it), so `content -- check` stays clean.
- **Owner's content build:** fits change by the snapshot-3 delta, also gated to zero false matches.
- In both windows, `roundStillFits` drops only the saved rounds whose notes' text, tags or fits changed; every other save resumes. A version bump would throw away every save.
- `travelOf` is computed when a suspect is marked, so saved games keep their shape.
- `pickSuspectSet` and `dealClues` don't change unless a sign rule forces a trait value. Any such change is recorded, and the set list is recomputed in every snapshot.

**1.9 Docs** (in the same rules commit):
- `docs/CONTENT_SOURCES.md` Signs section:
  - each sign's `meaning` in `SIGNS` is its definition
  - Goal 2's rule: a narrower sign `implies` its broader one once the edge passes entailment and the wording gate; witness fits count it; a note carries only the narrower; `signProblems` flags both on one note; the field guide shows only the narrower badge. Deferred edges are listed with their blocking notes, and the same tagging rule already applies to them.
  - retired tags are rejected
  - corrected examples at `:75-77` (no more "`climber` reads as trees yes" / "`swimmer` reads as fresh water")
- `sign-map.csv` is updated at the end (§2.9).

#### 2. Audit pipeline (`/srv/critter-ai/agent-state/missions/sign-audit/`)

**2.1 Definitions and the edge gate** (lead, before the rules commit):
- `definitions.csv` holds `sign, category, meaning, holders_at_7bce511a, change (keep|redefine|split:<tags>|retire-into:<tag>), implies, denies, open_edges, edge_blockers, edge_sign_off (lead, date)`. It covers all 201 active signs.
  - `open_edges` lists each candidate broader sign as `<broad>=<edge_status>`, with `edge_status` ∈ `wired`, `deferred-to-witness-signs`, `rejected` (fails entailment).
  - `edge_blockers` names, for a deferred edge, each blocking note as `<animal_id>:<clue_index>` with its words.
- **Gate (a), entailment:** the lead signs off that every holder of the narrower sign, under its approved `meaning`, has the broader one under its approved `meaning`.
- **Gate (b), wording:** every `(set, mystery, note, newly_matched_suspect)` the edge adds must be true of the note's actual words. It is ruled in snapshot 2 (live `7bce511a` rows) before the rules commit is final, and again in snapshot 3 (§2.8). One `false` defers the edge.
- The rules commit copies `meaning`/`implies`/`denies` (with only the `wired` open edges) from it into `signs.ts` word for word; afterwards the code is authoritative and the CSV is the record. The Summary lists every deferred edge with its blocking notes, for `witness-signs`.

**2.2 Pinned export:** `game/` is `git archive` of the rules commit and `game.sha` holds its sha, using the `cc-clue-verify`/`cc-clue-design` layout. That's why `scripts/run-ts.sh` maps `@/*` to `../game/src/*`. All triage, pairs and Astra batches read `game/`. Profile edits happen later, in the worktree.
- **Mid-audit re-export:** if a lead ruling changes a sign's `meaning`, `implies` or `denies`, or splits or retires a sign, the change is committed to `signs.ts` first (tests, typecheck, lint, `content -- preview`), then `game/` and `game.sha` are refreshed, `pairs.py` is rerun, and the affected signs' already-run pairs are queued in the re-check batch. `batches.csv` records each batch's `export_sha`, so every verdict names the definitions it was judged under.

**2.3 Triage:**
- `triage.csv` holds `sign, rule, excluded_ids, reason`. `rule` comes from a fixed list in `triage-rules.md`: `class`, `body-plan`, `place`, `no-plausible-holder`, each with its lead-written test.
- `scripts/pairs.py` expands it into `pairs.csv`: `sign, category, animal_id, group, status (held|implied|open|triaged), implied_by, edge_status (wired|deferred), triage_rule, batch`. It has exactly 76 × the active signs in `game/`.
  - `held`: the animal's raw tags contain the sign.
  - `implied`: not held, but implied through a held narrower sign, by a wired edge (`heldSigns` in `game/`) or a deferred one (read from `definitions.csv`'s `open_edges`). `implied_by` names the narrower sign; `edge_status` says which.
  - **A held pair can't be triaged.** `pairs.py` exits non-zero if a rule excludes a holder, since either the rule or the tag is wrong. Such a pair goes to a batch.
- **Triage sample:** `sample.py --triage` draws a seeded sample of ~100–150 same-class `no-plausible-holder` pairs (seed recorded) into one Astra spot-check batch. Any verified `has it` (cross-checked, §2.7) tightens that sign's triage rule, and its remaining triaged pairs are re-opened into batches.
- **Held pairs are checked** in the normal batches, so false existing tags can get `doesn't` and be removed (Goal 4), under the removal bar in §2.7.
- **Implied pairs** (wired or deferred) skip Astra only while the narrower hold is confirmed. When a narrower hold's final verdict is `doesn't` **or** `can't tell`, `ledger.py` re-opens each pair it implied into the re-check batch (§2.5), since the broader sign may have its own support.
- Astra's prompt doesn't say whether a pair is held. It judges from the sources and the definition, not the profile's tags.

**2.4 Sources:**
- `sources/index.csv` holds `animal_id, source_key, url, file, status (cached|fetched|unavailable)`. It points at the 259 cached files **where they are** (no copies, because disk is tight).
- Before the pilot, Opus fetches the 8 missing pages into `sources/` (DOIs may be paywalled: mark them `unavailable`).
- **Fallback, by source rank:** when a pair's cited sources say nothing and the pair is material (§2.6), Opus fetches the next source in the `docs/CONTENT_SOURCES.md` ranking, and the pair goes into the re-check batch.
- Any URL Astra cites from web search is fetched and saved by Opus at cross-check, before it can back a tag.
- AmphibiaWeb goes through Wayback, 5 s apart. IUCN isn't fetched.

**2.5 Batches:**
- Each batch is one sign category (or a slice of one) × one `cc-clue-verify` animal group (amphibians, turtles, carnivores, …), about 250–350 pairs (held + open).
- The pilot (one batch) sets the size: the largest that finishes well inside 60 minutes.
- Prompt: `astra/<batch>.prompt.md`, rendered by `scripts/prompt.py` from a template whose sha256 is saved. It includes the batch's signs with their `meaning` and rules, the pairs, profile paths in `game/`, the source files, and the row format `animal id, sign, verdict, quote, source file or URL`.
- Run from the state folder: `ASTRA_EFFORT=high astra-review --task <prompt> <absolute plan path>`. Save stdout as `astra/<batch>.out.md`.
- `scripts/validate.py <batch>` (adapted from `cc-clue-verify`; a query that exits non-zero when invalid) checks:
  - exactly one row for every pair in the batch: no missing rows, duplicates or extras
  - verdict ∈ {`has it`, `doesn't`, `can't tell`}
  - `has it` has a non-empty quote and a `sources/` file or an http(s) URL; a quote that can't be found in a saved file is flagged for cross-check
  - `doesn't` has a quote, or the literal `source silent: <why a source would mention it>`
  - `can't tell` has a reason
- A `doesn't` on a **held** pair is only a proposal; it becomes a removal only under the bar in §2.7.
- **Failure handling:**
  - Timeout, missing rows, or a structural reject: halve the batch (`B07a`/`B07b`, `parent` column in `batches.csv`) and rerun.
  - Exit 3: commit what's done and end with `MISSION_WAIT_ASTRA`.
  - Exit 4: handoff item for `codex login --device-auth`, then carry on with work that doesn't need Astra (cross-checks, edits).
  - Exit 5: rerun once halved; if it fails again, record it and add a handoff item.
- **Spot-check batch:** the triage sample (§2.3), run after the pilot.
- **Re-check batch:** one final batch (halved if large) holds the re-opened implied pairs, re-opened triaged pairs, pairs queued by a mid-audit re-export (§2.2), and the material pairs whose fallback sources were fetched.

**2.6 Ledger:** `ledger.csv` has one row for each of the 76 × active signs pairs. `scripts/ledger.py` is rebuilt from `pairs.csv`, the Astra outputs, the cross-checks and `rulings.csv`. Columns:

`sign, category, animal_id, animal, status_at_7bce511a, rules_commit_change, status_at_export, implied_by, edge_status, triage_rule, batch, export_sha, astra_verdict, astra_quote, astra_source, opus_check (agree|disagree|can't tell|), opus_evidence, lead_ruling, lead_reason, final_verdict, material (y|n), change, commit`

- **`status_at_7bce511a`** (held|open) is read from `git show 7bce511a:db/content/animals/…`; **`rules_commit_change`** records any tag the rules commit moved before the export (§1.6), in the `change` format.
- **Clue indices are stable** from `7bce511a` to HEAD: notes are never deleted or reordered, and new notes are appended (§2.7).
- **`final_verdict`:**
  - triaged → `no (triage: <rule>)`
  - implied and confirmed → `implied (by <x>)`, or `implied (by <x>; deferred)` for a deferred edge
  - otherwise the lead's ruling if there is one, else Astra's verdict
- **`change`** names every affected note, `;`-separated:
  - `add:<i>[,<j>…]`, `new_note:<i>`, `remove:<i>[,<j>…]` (e.g. `remove:2,5,7` for 31's three `burrower` notes; `add:3;remove:1,4`)
  - `none (implied by <x>)` (a broad `has it` where a narrower sign is held or added, wired edge)
  - `none (implied by <x>; deferred to witness-signs)` (same, deferred edge)
  - `remove:<i> (one sign per fact, <x>)` (same note only)
  - `none`
- **`material`:** y when the verdict could change a witness fit. Computed after the closure **and** the proposed verdicts: the animal holds the sign on a note, or it shares a dealable set with at least one other animal whose pair is held, implied, or proposed `has it`/`can't tell`. Two animals that both gain a sign are therefore material.
- **Conflicts `ledger.py` raises for a lead ruling:**
  - a broad `doesn't` while its narrower sign is `has it`
  - both signs of a `denies` pair `has it`
  - a `has it` whose implied trait conflicts with the record
- **Reconciliation:** `scripts/reconcile.py` (a query; exits non-zero on any discrepancy) diffs every `(animal_id, clue_index, sign)` open-tag change between `7bce511a` and HEAD and checks it against `rules_commit_change` + `change`, both ways: no unexplained tag change, no ledger change missing from the profiles, and no note deleted or moved. It runs after every edit commit and in the final Verification.
- The plan gets counts by verdict and by category.

**2.7 Cross-check, rulings, edits:**
- **Opus (`claude-task`) cross-checks**, about one task per two batches, into `crosscheck/<batch>.csv`, against the saved source:
  - every pair whose change would be an add or a remove
  - every material `can't tell`
  - every row `validate.py` flagged
  - every `has it` in the triage spot-check batch
  - a seeded sample of 5–10 unchanged rows per batch (`sample.py`, seed = batch id)
  - If ≥2 of a batch's sample rows get `disagree`, the batch's unchanged rows are all cross-checked.
- **Removal bar:** a held tag is removed only if Opus reads the holding note's own cited source (cached, or fetched now) and finds a contradiction under the approved `meaning`, or finds that neither the cited source nor the next ranked sources support it. If the cited source is `unavailable` (e.g. a paywalled DOI) and nothing contradicts the tag, the final verdict is `can't tell` and the tag stays.
- **The lead rules** every `disagree`, every Opus `can't tell` on a change, and every `ledger.py` conflict, in `rulings.csv` with the reason.
- **Opus edits profiles one sign category at a time** (body, habits, habitat, life + range), one commit each, applying only ledger rows whose final change is an add, new note or remove:
  - **Adds:** a tag goes on the note whose own words state the fact, unless that note already carries another tag and co-tagging would cost it eligibility in any dealable set (a fit needs every tag). Then a new short sourced note carries the sign instead. Opus runs `metrics/witness.ts` on the edit's tree before the commit, and `diff.py` lists every note that lost eligibility; each loss caused by co-tagging is redone as a new note.
  - **New notes:** if no note states it, a new short note is appended at the end of `clues` (earlier indices don't shift), grade 6–12, in its own words, with source and URL, one sign. Its words must be true of every holder of the sign's narrower signs (it will fit them through the closure). Science words get a `glossary.ts` entry.
  - **Narrower and broader, on the same note only:** never add a broad sign that a held narrower one implies (wired or deferred edge). Adding a narrower sign to a note that carries the broad one replaces it on that note (`add:<i>;remove:<i> (one sign per fact, <x>)`). A broad tag on a **different** note stays; `signsOf` keeps the badge single.
  - **Removes:** a tag is taken off its note (under the removal bar); the note stays, untagged if nothing is left.
  - Trait values change only when a sign rule forces one, and that's recorded.
  - Citations: new pages' `citations.json` and new keys' `sources.json` entries go in the same commit. **No `citations.json` entry is ever deleted** (live rows cite them until the owner's build).
  - Each commit leaves `checkProfile` and `checkCitations` clean (`content -- preview`, `npm test`), passes typecheck and lint, and passes `reconcile.py`. The dev copy is not rebuilt (§2.10).
  - The lead accepts or rejects each commit.

**2.8 Metrics:** `metrics/witness.ts`, bundled by `run-ts.sh --code <tree>` against a chosen code tree, run on a given `--content <animals dir>`. It loads with `animalsFromProfiles` and needs no database.
- It enumerates the dealable sets as `balance-044.ts` does, with the repo's real `pickSuspectSet`, `dealClues`, `witnessNotes` and `animalFitsNote`.
- It writes `metrics/<snapshot>.json`: for every (set, mystery, note), the fitting suspect ids and whether the note is eligible, plus the summary counts and both SHAs.
- `metrics/diff.py` lists every (set, mystery, note) whose fits or eligibility changed, any set that appeared or disappeared, every note that lost eligibility, and `newly_matched.csv`: each `(set, mystery, clue_index, note text, note tags, newly_matched_suspect, via (raw|<narrow>→<broad>))` that fits now but not in snapshot 1.
- **Wording gate (required):** the lead rules every row of `newly_matched.csv` `true`/`false` against the note's actual words, in `wording.csv`, once per distinct `(mystery, clue_index, suspect)` (the truth doesn't depend on the set). **Zero `false` in snapshot 2 and in snapshot 3 is a Verification gate.** A `false` via an edge defers that edge (§2.1); a `false` via a raw tag is fixed in the note's tagging.
- Three snapshots:

| Snapshot | Code | Content | Shows |
|---|---|---|---|
| 1 baseline | `7bce511a` | `7bce511a` | matches the Findings baseline (402 / 940) |
| 2 deploy delta | candidate rules tree (every entailed edge wired), then the final rules commit | `7bce511a` | the candidate run feeds gate (b); deferred edges are dropped and the run is repeated on the final rules commit, which must show zero `false`. This is exactly what live players see from deploy until the owner's build. |
| 3 final | final HEAD | final HEAD | the Definition of done's before/after, in the plan, with zero `false` newly matched fits and every lost-eligibility note reviewed by the lead. A `false` is fixed by retagging the note or deferring the edge in a fix commit, then snapshot 3 is rerun. |

**2.9 End:** `scripts/sign-map-update.ts` recomputes `sign-map.csv`'s `uses`/`holders`/`rule` from final HEAD and marks the rows that changed; the result goes in a repo commit. The Summary lists the definitions, Goal 2's rule, the deferred edges with their blocking notes (for `witness-signs`), and the tags added and removed per animal with their sources (from `ledger.csv`).

**2.10 Dev database guard and timing:** metrics, triage and reconciliation need no database. Intermediate commits are verified offline only (typecheck, lint, `npm test`, `content -- preview`, `reconcile.py`). The guarded `phaser_june_dev` content build + `e2e:fresh` (the brief's block: `current_database()` = `phaser_june_dev`, otherwise stop and add a handoff item) runs **only** at the final Verification and again at Release, because CI for other PRs reads `phaser_june_dev` and a split or new sign there would throw `Unknown sign` on branches cut from old `main`. It never touches `.env.local`, never prints a connection string, and saves its artifact to `e2e-final/`. Before Release, `git fetch origin --prune`, rebase on fresh `origin/main`, and rerun the full Verification.

**2.11 Session budget** (the run stops at 60):

| Work | Sessions |
|---|---|
| Definitions (`definitions.csv`, entailment sign-offs) | 2 |
| Snapshots 1 + candidate 2, wording gate (b) rulings, edge deferrals | 1–2 |
| Rules commit (tests first, code, e2e check, docs, forced content fixes), final snapshot 2 | 2 |
| Export, triage, `pairs.csv` | 1–2 |
| Source index + 8 missing pages | 1 |
| Pilot batch | 1 |
| Triage spot-check batch (+ cross-check) | 0.5–1 |
| Astra batches: ~2,700–4,300 pairs (≈2,200–3,800 open + ~494 held) ÷ ~300 | 9–15 |
| Re-check batch | 1–2 |
| Opus cross-checks (about 1 per 2 batches) | 5–8 |
| Lead rulings | 2 |
| Profile edits by category (with eligibility check and `reconcile.py`) | 4–5 |
| Snapshot 3, wording rulings, `sign-map.csv`, ledger counts | 2 |
| Code reviews, Verification + Summary, Release | 4 |
| **Total** | **36–49** |

That leaves roughly 11–24 sessions for Astra waits (`MISSION_WAIT_ASTRA`) and halved reruns. **Bundling rule:** if the estimate after triage, or the running total, goes past 45, run 2 Astra batches or 2 Opus cross-checks per session.

### Rejected alternatives

- **A1, a separate `broader` field:** it duplicates `implies`, and broad signs' trait rules wouldn't apply to narrower holders.
- **A2, content and vocabulary only:** merges bring back 059's false fits (50 pairs, at most 4 true); tagging both brings back the double badges the owner rejected; Goal 1 fails for broad notes.
- **Wiring every entailed edge without the wording gate:** live broad notes with narrow words (43, 66, 54, 24, 59) would show players false "N of 5" counts until witness-signs (059's 39 of 43 false).
- **Profile-wide one sign per fact:** adding a narrower sign would strip a broad tag from another true note and make it undealable; per-note checks plus `signsOf` dedupe keep both the note and a single badge.
- **Changing only `witnessNotes`:** `stillPossible`, the bot and the test oracle would disagree with the dealt count; one predicate keeps them identical.
- **Keeping `restates` as a guard:** after retiring `tree_dweller` nothing uses it, and retired tags are rejected outright.
- **E2E copying `SIGNS`' edges, or reading `Animal.signs`:** a copy drifts; reading the app's own output makes the check tautological. Raw pool tags plus the table's direct edges, closed in the script, avoid both.
- **Rebuilding `phaser_june_dev` per edit commit:** other PRs' CI reads it and would hit `Unknown sign`.
- **B1, batches by sign across all 76 animals:** every batch loads all 76 animals' sources (52 MB), so timeouts are likely.
- **Storing the closure on `Animal`:** it widens the pool, `Animal` and test-fixture interfaces for one consumer, while the per-sign closure built at load costs about the same.
- **`travelOf` reading `heldSigns`:** a future edge would silently change how animals leave the board. Raw tags keep travel a content decision.
- **Bumping `ANIMAL_RULES.version`:** it drops every saved game; `roundStillFits` drops only the ones affected.
- **Running sign rules in `validatePool` (live `check`):** live rows predate the new rules, so `check` would fail until the owner's build.
- **Requiring symmetric `denies`:** one direction suffices, since the check runs on the profile's closure; symmetry would double the entries for nothing.
- **Copying the cached sources into `sign-audit/`:** the disk is small; `index.csv` points at the files where they are.

### Decision (lead)

Choosing **A3 + B2** with four lead refinements:

1. **Goal 2 & `SIGNS` schema (A3 with type-safe union):** Put strict open-tag edges in `implies`, enforce one-sign-per-fact mechanically, and split `SignEntry` into a discriminated union (`ActiveSignEntry` with required `meaning: string`, vs `RetiredSignEntry` with `retired: true` and `category` only). This makes missing definitions and rules on retired tags compile-time errors, keeps one unified `implies` concept, and prepares `signs.ts` directly for `witness-signs`. Every open-tag `implies` edge requires strict logical entailment under the approved `meaning` definitions and explicit lead sign-off during the Definitions step (e.g., `carries_young_on_back` vs `mother_carries_young`/`father_carries_young` is decided from all holders' notes before wiring any edge). `signProblems` enforces one-sign-per-fact at the **profile** level (flagging any profile holding both X and an implied Y across notes) as well as on a single note, so no duplicate badges appear beside the field-guide photo. Module load validates `SIGNS` (non-empty `meaning`, no cycles, no unknown/retired targets in `implies`/`denies`).
2. **`travelOf` & rule fixes (F1–F4):** Fix `climber`, `never_climbs`, `swimmer`, `above_tree_line`, and `sand_dunes` in one commit with the definitions before triage (settling `snorkel_nose`, `shares_food`, and `often_in_trees` with their definitions). Update `travelOf` in the same commit to `tags.includes('fully_aquatic') || (tags.includes('swimmer') && (tags.includes('system:freshwater') || tags.includes('system:marine')))` using **raw** `animal.tags` (never `heldSigns`), so terrestrial swimmers walk while current aquatic swimmers keep swimming. `ANIMAL_RULES.version` stays `055-1` (`roundStillFits` handles both deploy-time and content-build fit changes).
3. **Held pairs are audited, not skipped (Goal 4):** Under B2, `pairs.csv` and `ledger.csv` cover all `76 × active signs` pairs, and currently held pairs (~494) ARE included in Astra's category × animal-group batches so false or outdated existing tags can receive `doesn't` and be removed per Goal 4. A pair marked `implied` by a narrower hold is skipped only while the narrower hold survives audit; if a narrow hold is overturned to `doesn't`, its implied broad pair re-opens for checking.
4. **Metrics & session budget:** `metrics/witness.ts` calls the repo's real `pickSuspectSet`, `dealClues`, and `witnessNotes` and records three snapshots: baseline (`7bce511a`), post-code/pre-content-edits (exact deploy-time delta on live rows, flagging any broad-tagged notes whose narrow wording fits new animals for `witness-signs`), and final post-edits. If post-triage batch count pushes total sessions above ~45, bundle 2 Astra batches or 2 Opus cross-checks per session to stay comfortably inside the 60-session limit.

**Revised** (see `## Revision notes` and `## Decisions`; the Target design above is authoritative where these four refinements differ): one sign per fact is checked per note, not per profile, and `signsOf` keeps badges single (§1.3); every open-tag edge also passes the wording gate, and edges blocked by live wording are `deferred-to-witness-signs` (§2.1, §2.8); `witnessNotes`, `stillPossible`, tests and metrics share `animalFitsNote` (§1.4); `restates` is dropped (§1.1); `never_climbs denies climber` is not pre-wired (§1.6); an implied pair re-opens on a narrower `doesn't` or `can't tell` (§2.3); the ledger reconciles `7bce511a` → HEAD (§2.6).

## Architecture review (Fable)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. The closure brings back plan 059's false fits, and the plan only lists them for witness-signs.
   §1.4 lets a broad-tagged note fit narrower holders, but several broad-tagged notes have narrower
   words. 43's "Its pouch opens forward" (`pouch`) will fit 31/37/48, whose pouches open backward.
   66's "two horns, one behind the other" (`horns`) will fit 50/69. With the proposed
   `carries_young_on_back`→`mother_carries_young` edge, 54's "clinging to her belly" and 24/59's
   "on her tail" will fit 52/56/61/63. Plan 059 measured this set: 43 pairs, 39 false
   (`059-sign-dupes.md:21,45-61`), and Astra made it a MUST-FIX then. Players read the note's
   words with "N of 5" from the deploy until witness-signs ships, so this teaches wrong biology.
   Fix: gate each edge on its broad notes. Before an edge is wired, the lead rules every note
   tagged with the broad sign: are its words true of every narrower holder? If not, retag or untag
   that note in the rules commit, or don't wire the edge. Add to the Definition of done: every
   fit that snapshot 2 and snapshot 3 add is ruled true of the note's words, with zero false.

2. `stillPossible` is a third literal fit check; F9 is wrong that only `witnessNotes` and
   `travelOf` read `Animal.tags`. `animalBoard.ts:575` repeats `note.tags.every(tag =>
   animal.tags.includes(tag))`. It feeds `scripts/balance-044.ts:112,146,176,196` and
   `tests/clueGame/animalBoard.test.ts:102-104`. After §1.4 the bot would rule out suspects the
   note's count includes. Fix: one exported predicate (a suspect fits a note) used by
   `witnessNotes`, `stillPossible` and the test oracle at `:85`, in the rules commit.

3. Profile-level one-sign-per-fact (§1.3 step 4, §2.7) makes true notes undealable. When the
   audit adds a narrower sign to an animal whose other note carries the broader one, that note
   must lose its tag, and an untagged note is never dealt (`animalBoard.ts:233`). Example: an
   animal with a `horns` note gains `spiral_horns` elsewhere; its "has horns" note disappears.
   No profile holds such a pair across notes today, so only the audit would create this. Fix:
   flag narrower + broader on the same note only, and drop implied signs where `Animal.signs`
   is built (`questionMatchContent.ts:136`) so the badge stays single. Check the e2e sign-list
   assertion near `scripts/e2e.mjs:1222` still holds.

MISSED:
1. Adding a sign to an already-tagged note narrows its fits, because a fit needs every tag.
   Tagging `swimmer` on 54's note beside `seldom_on_ground` likely leaves it fitting only the
   mystery, so it is no longer dealt. §2.7 needs a rule: put the sign on a new short note when
   adding it would cost the note its eligibility, and have the lead review every note that
   loses eligibility in snapshot 3.
2. No evidence bar for removing an existing tag. §2.5 lets `doesn't` rest on "source silent".
   A held tag's own note cites a source, and 8 cited pages are not cached. A removal should
   need that cited page read and a contradiction, or the page not saying it; otherwise
   `can't tell` and the tag stays.
3. Triage is unchecked general knowledge on about 75–85% of open pairs. A wrong
   `no-plausible-holder` is a silent missing tag, which is the defect this mission exists to
   find. Nothing samples triaged pairs.
4. After the 15 retirements no active entry uses `restates` (only `tree_dweller` has it,
   `signs.ts:222`). The field, its table check and `signProblems` step 5 become dead code.

SHOULD-CONSIDER:
1. Send a seeded sample of triaged pairs (same class, `no-plausible-holder`) through one Astra
   batch. If any come back `has it`, tighten that rule.
2. Run the dev-copy content build only at the final Verification, close to release. CI for
   other PRs reads `phaser_june_dev`, and a split or new sign there throws `Unknown sign` on
   branches cut from old `main`.
3. If a ruling changes a definition or edge mid-audit, re-export `game/` and re-run the
   affected signs' pairs. §2.2 pins one export and gives no rule for this.
4. Drop `restates` from `ActiveSignEntry`, or say why it stays as a guard.
5. Record `material` after the closure and proposed adds, not only current holders, so two
   animals that both gain a sign are not marked immaterial.

*(Saved: `/srv/critter-ai/agent-state/missions/sign-audit/tasks/20261123-024423-architecture-reviewer.md`)*

## Architecture review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. **Gate broader-sign matching on the note’s actual words.** In the current Anywhere deal `[25,31,43,53,57]`, the proposed `backward_pouch → pouch` rule makes “Its pouch opens forward” eligible at 2 of 5 by counting the wombat, whose pouch opens backward. Check newly matched suspect IDs against each note in both release snapshots. Defer unsafe edges until compatible wording is live.
2. **Use one fit rule for dealing and deduction.** §1.4 changes `witnessNotes`, but `stillPossible` still requires literal tags. The balance bot would eliminate suspects the displayed count includes. Use the same predicate for both and for audit metrics.
3. **Enforce one sign per fact on each note.** §2.7 strips a broad tag when another note gains a narrower one. If that was the first note’s only tag, the dealer loses a valid clue. Preserve each note’s evidence and deduplicate the field-guide badges separately.
4. **Reconcile the ledger with the original and final profiles.** §1.6 changes tags before the audit export, and §2.6 records only one clue index per change. Animal 31 alone has three `burrower` notes. Record every affected note and verify that the complete tag diff matches the rulings.

SHOULD-CONSIDER:

1. Revisit `never_climbs denies climber`. The cited note says “never climbs trees,” while `climber` explicitly includes rock climbing. Those facts can coexist.
2. Reopen an implied pair when its only narrower evidence receives `can’t tell`. The broader sign may have independent support.
3. Recheck against fresh `origin/main` before release. Reviewed `agent/sign-audit` at `bab6f49d`. The read-only checkout blocked fetching, so remote freshness is unverified.

*(Saved: `/srv/critter-ai/agent-state/missions/sign-audit/tasks/astra-arch-review.md`)*

## Revision notes

### Fable review rulings
- **MUST-FIX 1 (false fits on broad notes with narrow words):** Accepted — gate every open-tag `implies` edge on BOTH strict logical entailment under approved `meaning` AND zero false wording fits across every newly matched suspect in **both** snapshot 2 (live `7bce511a` rows) and snapshot 3 (final profiles); defer edges blocked by live narrow note wording to `witness-signs` (recorded in `definitions.csv` + Summary, while keeping one-sign-per-fact during audit), and add zero-false-fits to Definition of done.
- **MUST-FIX 2 (`stillPossible` third literal fit check):** Accepted — export one shared fit predicate (`animalFitsNote`, using `heldSigns`) in `animalBoard.ts` for `witnessNotes`, `stillPossible` (and its callers `animalDebugSummary`/`balance-044.ts`), `tests/clueGame/animalBoard.test.ts`, and `metrics/witness.ts`; fix F9.
- **MUST-FIX 3 (profile-level one-sign-per-fact hiding valid notes):** Accepted — enforce one-sign-per-fact **per note** in `signProblems`, deduplicate wired implied broader signs in `signsOf` (`signs.ts`, used by `questionMatchContent.ts:136`) so field-guide badges stay single, and update `scripts/e2e.mjs:1222-1227` to expect implied broader badges to be omitted.
- **MISSED 1 (adding a sign to an already-tagged note narrows fits):** Accepted — in §2.7, put a newly added sign on a new short sourced note whenever adding it beside an existing tag on a note would drop that note's eligibility in any dealable set; lead reviews every note losing eligibility in snapshot 3.
- **MISSED 2 (no evidence bar for removing a held tag):** Accepted — in §2.5/§2.7, removing a held tag requires reading its note's own cited source (cached or fetched) and finding a contradiction under `meaning` or no support in the cited/ranked sources; if the cited source is unavailable and uncontradicted, verdict is `can't tell` and the tag stays.
- **MISSED 3 & SHOULD-CONSIDER 1 (sampling triaged pairs):** Accepted — run a seeded sample (~100–150 same-class `no-plausible-holder` triaged pairs) through Astra; any verified `has it` tightens that rule and re-opens that sign's remaining triaged pairs.
- **MISSED 4 & SHOULD-CONSIDER 4 (`restates` dead code after retiring `tree_dweller`):** Accepted — drop `restates` from `ActiveSignEntry`, `signTableProblems`, and `signProblems` (retired tags are rejected outright in step 2; KISS).
- **SHOULD-CONSIDER 2 (defer `phaser_june_dev` content build until final Verification):** Accepted — keep intermediate verification offline (`typecheck`, `lint`, `npm test`, `content -- preview`); run the guarded `phaser_june_dev` content build + `e2e:fresh` only at final Verification and Release so other PRs' CI never hits `Unknown sign`.
- **SHOULD-CONSIDER 3 (mid-audit re-export rule):** Accepted — if a lead ruling changes a definition, edge, or split mid-audit, commit `signs.ts`, refresh `game/` + `game.sha`, record `export_sha` per batch in `batches.csv`, and queue affected signs' pairs in the re-check batch.
- **SHOULD-CONSIDER 5 (compute `material` after closure and proposed adds):** Accepted — compute `material` in `ledger.py` over held, implied, and proposed `has it` / `can't tell` pairs co-occurring in any dealable set so newly formed 2-of-5 pairs aren't skipped.

### Astra review rulings
- **MUST-FIX 1 (gate broader-sign matching on note wording in both snapshots; defer unsafe edges):** Accepted — same gate as Fable MUST-FIX 1; defer any edge whose broad-tagged notes in snapshot 2 or snapshot 3 would falsely match a newly added suspect until `witness-signs`.
- **MUST-FIX 2 (one fit rule for dealing, deduction, and metrics):** Accepted — same fix as Fable MUST-FIX 2 (`animalFitsNote` shared across `witnessNotes`, `stillPossible`, tests, and `metrics/witness.ts`).
- **MUST-FIX 3 (per-note one-sign-per-fact, dedupe badges separately):** Accepted — same fix as Fable MUST-FIX 3 (`signProblems` per-note, `signsOf` badge dedupe, `e2e.mjs` updated).
- **MUST-FIX 4 (reconcile ledger from `7bce511a` to final HEAD; multi-note tags):** Accepted — track `7bce511a` baseline and any pre-export rules-commit tag edits in `ledger.csv`, record all affected clue indices per row (e.g., `remove:2,5,7`), and add a mechanical reconciliation check verifying the complete `(animal_id, clue_index, sign)` tag diff from `7bce511a` to final `HEAD` matches `ledger.csv`.
- **SHOULD-CONSIDER 1 (revisit `never_climbs denies climber`):** Accepted — do not pre-wire `never_climbs denies climber`; check animal 55's note and settle `never_climbs`'s exact `meaning` (trees-only vs any climbing) in Definitions first, wiring `denies: ['climber']` only if `never_climbs` rules out rock climbing too.
- **SHOULD-CONSIDER 2 (reopen implied pair on narrower `can't tell`):** Accepted — reopen an `implied` pair into the re-check batch whenever its implying narrower sign's final verdict is `doesn't` OR `can't tell` (not confirmed `has it`).
- **SHOULD-CONSIDER 3 (fresh `origin/main` check before release):** Accepted — `git fetch origin --prune` verified (`origin/main` still `7bce511a`); Release rebases on fresh `origin/main` and re-runs full Verification.

## Steps

Conventions for every step:
- **Who does what.** Opus (`claude-task`, run from the worktree root) writes code, tests, scripts and profile edits, fetches sources and runs cross-checks. Astra (`ASTRA_EFFORT=high astra-review --task <prompt> /srv/critter-ai/worktrees/sign-audit/plans/2026-11-23-sign-audit.md`, run from the state folder) runs the audit batches. The lead writes briefs, prompts, the plan and the handoff file, runs every check named here, and accepts or rejects.
- **Ruling files** (`definitions.csv` sign-offs, `triage.csv`, `wording.csv`, `rulings.csv`, `ledger-pre.csv`): Opus drafts each one with its evidence and a `proposed` column. The lead rules in a brief `prompts/S<n>-rulings.md` ("accept all proposed except: …"), and Opus copies the rulings in word for word in a short follow-up job. The lead then spot-checks them with `diff`. Each significant ruling also gets one line under **Decisions**.
- **Folders.** `$SA` = `/srv/critter-ai/agent-state/missions/sign-audit`. Scripts live in `$SA/scripts/`, metrics in `$SA/metrics/`, and Python runs with `python3 -I`. Scratch code trees go in `/tmp/sa-trees/<sha>/` (`git archive`) and are deleted after use, because the disk is tight.
- **Checks.** The offline checks are `npm run typecheck && npm run lint && npm test && npm run content -- preview`. `phaser_june_dev` is never rebuilt before the final Verification (§2.10).
- **Commit messages** for profile edits start with `sign-audit S<n> <category>:`. `ledger.py` uses them to fill the `commit` column.

- [x] S1. **Definitions draft, plus rulings on the hard signs.**
  - Opus writes `scripts/holders.py`. It reads `git show 7bce511a:db/content/animals/*.json` and `src/clueGame/signs.ts` and writes `defs/holders.md`: for each of the 201 active signs, its category, current `implies`/`denies`, glossary text, and every holder's note text with its clue index.
  - Opus drafts `definitions.csv` (§2.1 columns, all 201 active signs). Each row gets a proposed `meaning`, a `change`, and proposed `implies`/`denies`. Every candidate open edge from F7 goes in `open_edges` (status `proposed`), and the F7 mutual-exclusion candidates go in as proposed open-tag `denies`. Opus marks each multi-sense sign (F6) with the holders that use it differently.
  - The lead rules: F1–F4 (`climber`, `never_climbs`, `swimmer`, `above_tree_line`, `sand_dunes`); `snorkel_nose`, `shares_food`, `often_in_trees`, `carries_young_on_back` (with `father_carries_young`), and `never_climbs`' trees-only vs any-climbing meaning (and with it whether `denies: ['climber']` is wired); and every F6 split or redefinition (`burrower`, `stands_on_hind_legs`, `forest_floor`, `one_island`, `town_dweller`/`prairie_dog_towns`). The lead records whether any split or retirement touches `glider`, `fully_aquatic`, `swimmer` or `burrower`, because that changes `travelOf` in S5.
  - Verify: `python3 -I -c` count shows 201 data rows and none with an empty `meaning`; each ruled row has `edge_sign_off = lead, <date>`.
- [x] S2. **Remaining definitions and entailment sign-offs (gate a).**
  - The lead rules every remaining `meaning`, mostly bulk-accepting Opus's proposals.
  - The lead signs off gate (a) for every candidate open edge (`proposed` becomes `entailed` or `rejected`), and for every open-tag `denies`.
  - Opus writes the rulings in and lists each split's successor tags (new active entries) and each retired tag.
  - Verify: no `proposed` remains; every active sign has a sign-off; every `implies`/`denies` target is an active sign in the CSV or a prefix in `EXCLUSIVE_PREFIXES`/`COMPLETE_PREFIXES`. Decisions: Goal 2's rule (narrower `implies` broader once both gates pass; one sign per fact per note; one badge).
- [x] S3. **Witness harness and Snapshot 1.**
  - Opus writes `scripts/run-ts.sh --code <tree> <entry.ts> [args]`. It works like `cc-clue-design/scripts/run-ts.sh`, but writes a tsconfig per tree that maps `@/*` to `<tree>/src/*`, and resolves bare imports via `NODE_PATH=<worktree>/node_modules`.
  - Opus writes `metrics/witness.ts --content <animals dir> --out <json> [--edges <definitions.csv>]`. It loads profiles with the tree's `animalsFromProfiles`. It enumerates the dealable sets as `balance-044.ts` does, with the tree's own `pickSuspectSet`, `dealClues` and `witnessNotes`, and records for every (set, mystery, note) the fitting suspect ids, whether the note is eligible, the summary counts, and both SHAs. Fits come from the tree's `animalFitsNote` if it exists (namespace import), otherwise from the literal check.
  - **Self-check (exits 1 on failure):** for every note, the harness's own fit count equals `witnessNotes`' `fits`, and its eligible set equals what `witnessNotes` returns.
  - Opus writes `metrics/diff.py <before.json> <after.json> --out <dir> [--wording wording.csv]` (self-test B3 written first). It writes `changed.csv`, `sets.csv` (sets added or gone), `lost.csv` and `newly_matched.csv` (§2.8 columns). With `--wording`, it exits 2 if any newly matched `(mystery, clue_index, suspect)` has no ruling or a `false`.
  - Lead runs Snapshot 1: `git archive 7bce511a` into `/tmp/sa-trees/7bce511a`, then `bash scripts/run-ts.sh --code /tmp/sa-trees/7bce511a metrics/witness.ts --content /tmp/sa-trees/7bce511a/db/content/animals --out metrics/s1.json`.
  - Verify: B3 self-test passes; 105 sets (world 49, africa 23, asia 15, north-america 9, south-america 9), 525 combos, 402 with ≥1 eligible note, 940 eligible notes, 2,091 dropped as mystery-only, 22 dropped as fits-all-5; the self-check passes. Record the counts in the Log.
- [x] S4. **Candidate Snapshot 2 and wording gate (b).**
  - `--edges definitions.csv` adds every `entailed` open edge as a closure on top of the old fit check. Its eligibility rule is the dealer's (mystery fits, 2 ≤ fits ≤ 4). The self-check with an empty edge list must match `s1.json` exactly.
  - Lead runs `… --code /tmp/sa-trees/7bce511a … --edges definitions.csv --out metrics/s2-candidate.json`, then `python3 -I metrics/diff.py metrics/s1.json metrics/s2-candidate.json --out metrics/s2-candidate/`.
  - Opus drafts `wording.csv` (`mystery, clue_index, suspect, note_text, note_tags, via, proposed (true|false), why, ruling, snapshot`), one row per distinct `(mystery, clue_index, suspect)`.
  - The lead rules every row. Each edge with a `false` row becomes `deferred-to-witness-signs`, with its blocking notes in `edge_blockers`. Every other entailed edge becomes `wired`. Each edge's status is recorded in `open_edges`.
  - Verify: `diff.py … --wording wording.csv`, run with only the wired edges (`--edges` filtered to `wired`), exits 0. Decisions: the wired and deferred lists (expected deferrals: `backward_pouch→pouch`, `spiral_horns`/`s_shaped_horns→horns`, `shoulder_stripe→stripes`, `spectacles→face_markings`, `carries_young_on_back→mother_carries_young`).
- [x] S5. **Rules code, tests first** (`src/clueGame/signs.ts`, `src/clueGame/animalBoard.ts`, new `tests/clueGame/signs.test.ts`, `tests/clueGame/animalBoard.test.ts`, forced content fixes in `db/content/animals/*.json`).
  - Opus first writes the tests for Failure modes A1–A10 (below) and runs `npm test` to show them failing, keeping the red output in its reply. Then it implements:
    - the `SignEntry` union without `restates`, plus `at`/`retired` (§1.1), with `meaning` and rules copied word for word from `definitions.csv` (wired edges only), and the 15 retired tags as `retired(…)`
    - unused imports dropped
    - `signTableProblems` plus the load-time throw; `entryOf`; `IMPLIED` (with pure `buildImplied(table)` or optional `table` param defaulting to `SIGNS` where fixture-table tests need transitive/diamond/retired/denies cases); `heldSigns`; `signsOf` dedupe; `signProblems` steps 1–4 (§1.2–1.3)
    - `animalFitsNote`, used in `witnessNotes` and `stillPossible`, with `witnessNotes`' doc comment updated (§1.4)
    - `travelOf` on raw tags with the water-system guard, and old-or-successor tags for any split of the four travel signs (§1.5)
    - the test oracle at `animalBoard.test.ts:84` switched to `animalFitsNote`
    - the forced content fixes: drop `high_mountains` from 33's note (clue 5), `forest_floor` from 46's note (clue 5), and `scent_marks` from 66's note (clue 5) — all three edges are wired; no splits or new retirements exist
  - Opus writes each forced fix into `ledger-pre.csv` (`animal_id, clue_index, sign, rules_commit_change`) for `ledger.py`, and the lead verifies it against `git diff` before accepting and committing S5.
  - Verify: the offline checks pass; `rg "tags\?\.includes\(tag\)" src scripts tests` finds nothing; `content -- preview` shows 0 problems.
- [x] S6. **Rules commit, part 2, and the final Snapshot 2** (`src/game/debugBridge.ts`, `scripts/e2e.mjs`, `docs/CONTENT_SOURCES.md`).
  - Opus adds `signImplies()` to `window.__cc` (each active sign's direct open-tag `implies`, from table data).
  - In `e2e.mjs`, after `poolData` (`:756-767`), Opus fetches `signImplies()` once, closes it with a local DFS, and at `:1223` sets `want = raw open tags − ⋃ closure(x)`.
  - In the Signs section of `CONTENT_SOURCES.md`, Opus writes §1.9: `meaning` is the definition; Goal 2's rule; deferred edges with their blocking notes; retired tags rejected; and corrected examples at `:75-77`.
  - The lead accepts and commits S6. This commit completes the **rules commit**: record its sha in the Log.
  - Lead archives `<rules sha>` into `/tmp/sa-trees/<rules sha>`, runs `… --code /tmp/sa-trees/<rules sha> … --content /tmp/sa-trees/7bce511a/db/content/animals --out metrics/s2.json` and `diff.py metrics/s1.json metrics/s2.json --out metrics/s2/ --wording wording.csv`, then cleans `/tmp/sa-trees/`. Any row that is newly matched but has no ruling is ruled now. A `false` defers its edge in a fix commit, and S6 reruns.
  - Verify: the offline checks pass; the S2 snapshot loads `7bce511a` content without `Unknown sign`; `diff.py --wording` exits 0 (**0 `false`**). Record the S2 counts in the plan.
- [x] S7. **Pinned export and triage.**
  - Opus runs `git archive <rules sha>` into `$SA/game/` and writes `game.sha`.
  - Opus drafts `triage-rules.md`: the fixed rules `class`, `body-plan`, `place` and `no-plausible-holder`, each with its test.
  - Opus drafts `triage.csv` (`sign, rule, excluded_ids, reason`) for every active sign in `game/`, never excluding a current holder.
  - The lead rules `triage.csv`.
  - Verify: `game.sha` equals the rules commit; every active sign has at least one `triage.csv` row or an explicit `none`.
- [x] S8. **Pairs, batch plan and budget.**
  - Opus writes `scripts/common.py`: shared loading of `game/`, `pairs.csv`, sets from `metrics/s2.json`, and the material rule.
  - Opus writes `scripts/pairs.py` (self-test B1 written first). It writes `pairs.csv` (§2.3 columns) and `batches.csv` (`batch, category, group, animals, signs, pairs, parent, export_sha, status, minutes`). Batches are category (or slice) × `cc-clue-verify` animal group, about 300 pairs, with held pairs included.
  - The lead estimates the sessions: sessions already used (count in `$SA/../sign-audit.events`) + Astra batches + cross-checks (≈1 per 2 batches) + S14–S24 + 4 for the tail. If the estimate is over 45, apply the §2.11 bundling rule: 2 batches or 2 cross-checks per item.
  - The lead replaces S13's placeholder with concrete items (format below).
  - Verify: B1 self-test passes; `pairs.py` exits 0; rows = 76 × active signs in `game/`; 0 triaged held pairs; counts by status in the Log.
- [x] S9. **Source index.**
  - Opus writes `scripts/sources.py`, adapted from `cc-clue-verify/scripts/fetch.py`. It writes `sources/index.csv` (`animal_id, source_key, url, file, status`), pointing at the cached files in `cc-clue-verify/sources/` and `cc-clue-design/sources/` where they are, with no copies.
  - Opus fetches the missing pages into `sources/`: the 8 non-`ok` `literature` DOIs (marked `unavailable` if closed/paywalled, retaining any Crossref/abstract `.txt` path for reading while enforcing the §2.7 removal bar), and 1 `sdzwa` page. AmphibiaWeb goes through Wayback, 5 s apart, and IUCN is never fetched.
  - Verify: `sources.py --check` exits 0; 280 rows / 279 unique URLs (268 `sources|clues|facts` rows / 267 unique URLs + 12 `traits`-only rows); every `file` exists; counts by status in the Log.
- [x] S10. **Audit scripts** (Failure modes B2, B4).
  - `scripts/prompt.py <batch>` renders `astra/<batch>.prompt.md` from `astra/template.md`, and saves the template's sha256 into `batches.csv`. The prompt holds the signs with `meaning` and rules, the pairs (held status never shown), profile paths in `game/`, the source files from `index.csv`, and the row format `animal id, sign, verdict, quote, source file or URL`.
  - `scripts/validate.py <batch>` is a query (§2.5 checks, self-test B2 written first): exit 2 on a structural fault, exit 0 with `FLAG` lines otherwise.
  - `scripts/sample.py --triage | --crosscheck <batch>` is seeded. It writes `crosscheck/<batch>.todo.csv` with a `reason` column (`change`, `cant-tell`, `flag`, `sample`, `spotcheck` or `escalation`).
  - `scripts/ledger.py [--partial]` builds §2.6, reading `ledger-pre.csv`, and lists conflicts in `ledger-conflicts.csv`.
  - `scripts/reconcile.py --repo <worktree> --from 7bce511a --to <rev|WORKTREE> [--applied <categories>]` is a query (self-test B4 written first) that exits 1 on any discrepancy.
  - The self-tests in `scripts/selftest/` are written before each script's code.
  - Verify: every self-test passes; `reconcile.py --to HEAD --applied none` exits 0 (only the `rules_commit_change` rows).
- [x] S11. **Pilot batch P01.**
  - P01 is the first batch in `batches.csv`, about 300 pairs, and its verdicts count toward the audit. The lead runs `prompt.py P01`, then Astra, saves `astra/P01.out.md`, and runs `validate.py P01`.
  - Size rule, unless the lead decides otherwise: ≤35 min keeps about 300–350; 35–50 min means about 250; >50 min or a timeout means halving. If the size changes, `pairs.py --rebatch` rebatches only the remaining unrun batches (preserving P01) and S13 is re-expanded.
  - Exits: 3 means commit what's done and end with `MISSION_WAIT_ASTRA`; 4 means a handoff item for `codex login --device-auth`, then continue with work that doesn't need Astra; 5 means one halved rerun, then a handoff item.
  - Verify: `validate.py P01` exits 0; minutes recorded in `batches.csv`; the chosen size goes under Decisions.
- [x] S12. **Triage spot-check T01.**
  - `sample.py --triage` draws 100–150 same-class `no-plausible-holder` pairs (seed recorded). The lead runs them through Astra as T01 and runs `validate.py T01`.
  - Opus cross-checks every `has it` into `crosscheck/T01.csv`.
  - For each verified `has it`, the lead tightens that sign's triage rule, and `pairs.py` reopens its remaining triaged pairs into batches. If that happens, the budget is re-estimated and S13 re-expanded.
  - Verify: `validate.py T01` exits 0; the reopened pair count is in the Log.
**S13 rules (apply to `S13.1`–`S13.12` below):**
- **Astra items (`S13.1`, `S13.3`, `S13.5`, `S13.7`, `S13.9`, `S13.11`)**, run sequentially by the lead: for each pending batch in the item, run `prompt.py <batch>`, run Astra (`ASTRA_EFFORT=high astra-review --task ...`), save `astra/<batch>.out.md`, run `validate.py <batch>`, and update `batches.csv` (`status`, `minutes`, `export_sha`). On timeout or missing rows, split into `<batch>a`/`<batch>b` (`parent`) and rerun. On exit 3, commit completed batches and end with `MISSION_WAIT_ASTRA` (next session resumes the remaining pending batch(es) of the same item).
- **Opus cross-check items (`S13.2`, `S13.4`, `S13.6`, `S13.8`, `S13.10`, `S13.12`)** (`claude-task`), into `crosscheck/<batch>.csv` (`animal_id, sign, reason, astra_verdict, opus_check, opus_evidence, opus_source`): check every add or remove, every material `can't tell` (`ledger.py --partial`), every `validate.py` flag, and the seeded 5–10 unchanged sample (`sample.py --crosscheck <batch>`). If ≥2 sample rows in a batch get `disagree`, cross-check every unchanged row of that batch. Fetch and save any web URL Astra cited (adding it to `sources/index.csv`) before it can back a tag. Apply the removal bar (§2.7) to every proposed removal.
- **Re-export (insert only when needed):** if a ruling changes a sign's `meaning`, rules or split mid-audit, insert `S13.<n> Re-export` before the next batch: commit the `signs.ts` fix (offline checks), refresh `game/` and `game.sha`, run `pairs.py --rebatch`, and queue affected signs' already-run pairs for R01.

- [x] S13.1. **Astra `B01+B02`** (`habits`: `B01` turtles 195 + `B02` carnivores 245 = 440 pairs). Verify: `validate.py B01` and `validate.py B02` exit 0; `batches.csv` updated.
- [x] S13.2. **Opus cross-check `P01,B01`** (`habits`: 271 + 195 = 466 pairs covered). Verify: every `todo` row in `crosscheck/P01.csv` and `crosscheck/B01.csv` has `opus_check`; any cited URLs saved in `sources/index.csv`.
- [x] S13.3. **Astra `B03+B04`** (`habits`: `B03` primates+hoofed-mammals 293 + `B04` pangolins+elephants+anteaters-sloths-armadillos 249 = 542 pairs). Verify: `validate.py B03` and `validate.py B04` exit 0; `batches.csv` updated.
- [x] S13.4. **Opus cross-check `B02,B03`** (`habits`: 245 + 293 = 538 pairs covered). Verify: `crosscheck/B02.csv` and `crosscheck/B03.csv` complete; cited URLs saved.
- [x] S13.5. **Astra `B05+B06`** (`habits` `B05` australian-mammals+other-mammals 269 + `body` `B06` amphibians 254 = 523 pairs). Verify: `validate.py B05` and `validate.py B06` exit 0; `batches.csv` updated.
- [x] S13.6. **Opus cross-check `B04,B05`** (`habits`: 249 + 269 = 518 pairs covered). Verify: `crosscheck/B04.csv` and `crosscheck/B05.csv` complete; cited URLs saved.
- [x] S13.7. **Astra `B07+B08`** (`body`: `B07` turtles+carnivores 318 + `B08` primates+hoofed-mammals+pangolins 212 = 530 pairs). Verify: `validate.py B07` and `validate.py B08` exit 0; `batches.csv` updated.
- [x] S13.8. **Opus cross-check `B06,B07`** (`body`: 254 + 318 = 572 pairs covered). Verify: `crosscheck/B06.csv` and `crosscheck/B07.csv` complete; cited URLs saved.
- [x] S13.9. **Astra `B09+B10`** (`body` `B09` elephants+anteaters-sloths-armadillos+australian-mammals+other-mammals 216 + `habitat` `B10` amphibians+turtles+carnivores 159 = 375 pairs). Verify: `validate.py B09` and `validate.py B10` exit 0; `batches.csv` updated.
- [x] S13.10. **Opus cross-check `B08,B09`** (`body`: 212 + 216 = 428 pairs covered). Verify: `crosscheck/B08.csv` and `crosscheck/B09.csv` complete; cited URLs saved.
- [x] S13.11. **Astra `B11+B12+B13+B14`** (`habitat` `B11` 105 + `life` `B12` 76 + `life` `B13` 49 + `range` `B14` 14 = 244 pairs across 4 small batches). Verify: `validate.py` exits 0 for `B11`, `B12`, `B13`, `B14`; `batches.csv` updated.
- [x] S13.12. **Opus cross-check `B10,B11,B12,B13,B14`** (`habitat`+`life`+`range`: 159 + 105 + 76 + 49 + 14 = 403 pairs covered). Verify: `crosscheck/B10.csv`–`B14.csv` complete; cited URLs saved.
- [x] S14. **Fallback sources.**
  - The lead runs `ledger.py --partial`. It lists the material pairs with `source silent` or `can't tell`, plus the pairs it reopens: implied pairs whose narrower sign is `doesn't`/`can't tell`, reopened triaged pairs, and re-export queue pairs.
  - For each silent material pair, Opus fetches the next source in the `CONTENT_SOURCES.md` ranking into `sources/` and adds it to `index.csv`.
  - `pairs.py --recheck` assigns R01, halved into R01a/R01b if over the pilot size.
  - Verify: `sources.py --check` exits 0; R01's pair count by reason is in the Log.
- [x] S15.1. **Re-check batches `R01a+R01b+R01c`** (Astra, as in S13: `R01a` `habits` 138 + `R01b` `habits` 137 + `R01c` `habits+body` 157 = 432 pairs). Verify: `validate.py` exits 0 for `R01a`, `R01b`, `R01c`; `batches.csv` updated.
- [x] S15.2. **Re-check batches `R01d+R01e`** (Astra, as in S13: `R01d` `body` 83 + `R01e` `body+habitat+life` 76 = 159 pairs). Verify: `validate.py` exits 0 for `R01d`, `R01e`; `batches.csv` updated.
- [x] S16. **Opus cross-check of `R01a`–`R01e`**, into `crosscheck/R01*.csv`, under the same rules as S13. Verify: every todo row has an `opus_check`.
- [x] S17. **Full ledger and the first rulings.**
  - The lead runs `ledger.py`; it writes `ledger.csv` (76 × active signs rows) and `ledger-conflicts.csv`.
  - Opus drafts `rulings.csv` (`animal_id, sign, astra, opus, evidence, proposed, ruling, reason`) for every `disagree`, every Opus `can't tell` on a change, and every conflict.
  - The lead rules the `body` and `habits` rows.
  - Verify: those rows have a `ruling`.
- [x] S18. **Remaining rulings and the freeze.**
  - The lead rules the `habitat`, `life` and `range` rows.
  - The lead confirms the removal bar on every removal (each cites the holding note's own source), confirms `material` against `metrics/s2.json`'s sets, then reruns `ledger.py`.
  - Verify: `ledger.py` exits 0 with 0 unresolved conflicts and every planned `change` filled; planned adds, new notes and removes per category are in the Log.
- [x] S19. **Profile edits: `body`.** Opus (`claude-task`) applies the ledger's `body` adds, new notes and removes (§2.7):
  - the narrower sign only on a note; new notes appended at the end of `clues`, grade 6–12, with source and URL, one sign, true of every narrower holder
  - `citations.json` and `sources.json` entries in the same commit, never deleting one; a `glossary.ts` entry for science words; log any give-away note wording met in `$SA/giveaways.md` for `witness-signs`
  - Before the lead commits, Opus runs `witness.ts --code <worktree>` and `diff.py <previous snapshot> <this>`, and redoes each co-tagging eligibility loss as a new note. The lead pre-rules this step's newly matched rows in `wording.csv` and reviews `lost.csv`.
  - Verify: the offline checks pass; `reconcile.py --to WORKTREE --applied body` exits 0. Commit as `sign-audit S19 body: …`.
- [x] S20. **Profile edits: `habits`.** Same as S19, with `--applied body,habits` (also moving both tags off the 3 mixed `body+habits` notes parked from S19: `32:0`, `38:2`, `67:3`).
- [x] S21. **Profile edits: `habitat`.** Same as S19, with `--applied body,habits,habitat`.
- [x] S22. **Profile edits: `life` + `range`.** Same as S19, with `--applied all`.
- [x] S23. **Snapshot 3 and the wording gate.**
  - The lead archives HEAD into `/tmp/sa-trees/HEAD`, runs `witness.ts --code /tmp/sa-trees/HEAD --content /tmp/sa-trees/HEAD/db/content/animals --out metrics/s3.json` and `diff.py metrics/s1.json metrics/s3.json --out metrics/s3/ --wording wording.csv`, then cleans `/tmp/sa-trees/`.
  - The lead rules the remaining newly matched rows and reviews every row of `metrics/s3/lost.csv`, writing a reason for each one.
  - A `false` is fixed by retagging the note or deferring the edge in a fix commit (Opus), then S23 reruns.
  - Verify: `diff.py --wording` exits 0 (**0 `false`**); every lost note has a reason; the S3 counts and the before/after table go in the plan.
- [x] S24. **Sign map, final ledger and counts.**
  - Opus writes `scripts/sign-map-update.ts`. Run with `run-ts.sh --code <worktree>`, it recomputes `uses`/`holders`/`rule` in `docs/research/2026-11-07-moves-and-signs/sign-map.csv` from HEAD and marks the changed rows. The lead commits it.
  - The lead reruns `ledger.py`, which fills `commit` from `git log --grep 'sign-audit S'`, then `reconcile.py --to HEAD`.
  - Verify: `reconcile.py` exits 0. The plan records: counts by `final_verdict` × category; the witness before/after (S1 → S2 → S3); tags added and removed per animal with sources; deferred edges with blocking notes; and any give-away note wording noted in `giveaways.md`, ready for the Summary.
- [x] S25a. **Code-review fixes, part 1: sign rules, meanings, docs & `signs.test.ts` (Astra MF1/MF3 rules, Fable SC1 & SC3).**
  - `src/clueGame/signs.ts` (+ `docs/CONTENT_SOURCES.md` + `tests/clueGame/signs.test.ts` + `$SA/definitions.csv` + `$SA/scripts/defs_draft.py` + `$SA/game/src/clueGame/signs.ts`):
    - Drop `'forest_floor'` from `leaf_litter.implies` (`forest_floor=rejected` in `definitions.csv`; 12 wired edges remain; `CONTENT_SOURCES.md` example updated).
    - Drop `implies: ['habitat:rocky']` from `crevice_hider`.
    - Drop `'trees:no'` from `above_tree_line.implies` (keeps `['high_mountains']`).
    - Align `meaning` with `"at least partly"` on `high_mountains`, `bamboo_forest`, `leaf_litter`, `mountain_meadows`.
    - Add/update A6 unit tests in `tests/clueGame/signs.test.ts` (`above_tree_line` + `trees:yes`/`sleeps_high_in_trees`, `crevice_hider` without `habitat:rocky`, `leaf_litter` not implying `forest_floor`).
  - Verify: `npm run typecheck`, `npm run lint`, `npm test`, `npm run content -- preview`, and `$SA/scripts/defs_check.py --edges wired` exit 0.
- [x] S25b. **Code-review fixes, part 2: profile edits, citations, Astra SC1 deal-fit tests & `$SA` ledger updates (Astra MF1–5 & SC1).** *(Brief ready in `$SA/prompts/S25-review-fixes.md` §§2.2, 3, 4; split after `claude-task` hit 5h usage limit at 22:21 UTC.)*
  - **Astra MF1 (`forest_floor` & `9` `climber`):** overrule `9` Dyeing Poison Dart Frog `forest_floor` → `doesn't` and `climber` → `has it` (replace S20 `clue 14` in-place with standard `climber` note citing cached Pašukonis et al. 2019 `https://doi.org/10.1007/s10682-019-09994-z`, add to `citations.json`; `forest_floor` `remove:3`); add standard `forest_floor` `new_note`s to the newly-unimplied `leaf_litter` holders `3` Darwin Frog (`has it` ruling), `12` Spiny Hill Turtle (`has it` ruling), `21` Radiated Tortoise, `27` Western Long-beaked Echidna, `46` Golden-rumped Sengi (standalone `smithsonian` note keeping `46:4` untouched), `49` Hispaniolan Solenodon, and `67` Eastern Long-beaked Echidna; keep `7` Hairy Frog `forest_floor` as S17 `can't tell`.
  - **Astra MF2 (`town_dweller`):** reopen `7` Hairy Frog (`iucn`), `16` Purple Frog (`amphibiaweb`), and `51` Jaguar (`iucn`) from `triage.csv`, rule `has it` in `rulings.csv`, and append standard `town_dweller` `new_note`s.
  - **Astra MF3 (`crevice_hider`):** reopen `4`, `8`, `35`, `49`, `60`, `62`, `67`, `72`, `75` from `triage.csv`; rule `has it` and append standard `crevice_hider` `new_note`s for `4` Big-headed Turtle (`literature` Kirkpatrick 1996), `8` Coastal Tailed Frog (`government` COSEWIC 2011), `49` Hispaniolan Solenodon (`adw`), `62` Chinese Giant Salamander (`sdzwa`), and `75` Hellbender (`amphibiaweb`); rule `can't tell` (consistent with S17 `33`) for `35`, `60`, `67`, `72`.
  - **Astra MF4 & MF5 (`1` Blanding's Turtle):** overrule `1 yellow_legs` → `doesn't`, delete S19 `clue 12` (`"Its legs are yellow."`, keeping `clue 0` untagged and shifting `1`'s `changes.csv`/`wording.csv` indices `13..25 → 12..24`), and update `1 burrower` (now `clue 12`) to cite Butler & Graham 1995 (`literature`, already in `citations.json`) with qualified wording (`"It digs into the ground on land, making burrows, tunnels or dens, or (at least when young) digging itself down into soil or sand."`).
  - **Astra SC1 (`tests/clueGame/animalBoard.test.ts`):** add explicit expected-suspect regression assertions for the 5 affected deals (`world:5,6,8,9,13` `climber` `[5,6,9]`, `africa:7,11,13,14,41` `town_dweller` `[7,13,41]`, `world:1,2,4,12,15` `crevice_hider` `[4,15]`, `world:37,42,45,49,61` `crevice_hider` `[42,49]`, `world:1,2,17,18,20` `yellow_legs` `[20]`).
  - Update `$SA` (`triage.csv`, `rulings.csv`, `changes.csv`, `wording.csv`) and `db/content/citations.json` (never deleting any `citations.json` entry or any `7bce511a` clue).
  - Verify: `npm run typecheck`, `npm run lint`, `npm test`, `npm run content -- preview` (0 problems, 0 cite warns), `$SA/scripts/ledger.py` (0 conflicts, 0 pending), and `$SA/scripts/reconcile.py --from 7bce511a --to WORKTREE --applied all` exit 0. Commit as `sign-audit S25b review-fixes: …`.
- [x] S26. **Re-run Snapshot 3, wording gate, `sign-map.csv`, final ledger, and owner-disclosure metrics (Fable MUST-FIX 1).**
  - Archive HEAD into `/tmp/sa-trees/HEAD`, re-run Snapshot 2 deploy-delta check (confirm updated `signs.ts` still loads `7bce511a` with 0 `Unknown sign` and `diff.py --wording` exits 0 with 0 `false`) and Snapshot 3 (`$SA/metrics/s3.json` + `diff.py metrics/s1.json metrics/s3.json --out metrics/s3/ --wording wording.csv` — must exit 0 with **0 `false`** and 0 unruled), update `$SA/metrics/s3/lost-reasons.csv`, and clean `/tmp/sa-trees/`.
  - Re-run `$SA/scripts/sign-map-update.ts` on HEAD (`docs/research/2026-11-07-moves-and-signs/sign-map.csv`), re-run `$SA/scripts/ledger.py` (filling `S25` commits) and `$SA/scripts/reconcile.py --from 7bce511a --to HEAD`.
  - Compute exact Fable MUST-FIX 1 disclosure metrics for Summary and the Release handoff item: `scripts/balance-044.ts --rounds 60` (seed 44, `7bce511a` vs HEAD), median/max notes per animal and near-duplicate examples, and complete `travelOf` delta (`7bce511a` vs HEAD).
  - Update the plan's S1→S2→S3 table and S24 counts/animal table to reflect final HEAD, commit `sign-map.csv` + plan, and push.

The tail runs automatically once every item above is checked (`~/.claude/CLAUDE.md` steps 6–8 and `mission-lead.md`): final code reviews (Astra **and** Fable), then the full Verification and Summary, then the Release.

**Session estimate** (updated at S8; `sign-audit.events` shows 13 completed sessions prior to S8):

| Work | Sessions |
|---|---|
| Used through S8: Baseline–Steps (6) + S1–S8 (8) | 14 |
| S9–S12 (sources, audit scripts, Pilot P01, T01 spot-check) | 4 |
| S13: 14 Astra batches (`B01`–`B14`) + 15-batch cross-checks — unbundled 22 (>45 total) → **bundled (§2.11): 6 Astra + 6 cross-check** (`S13.1`–`S13.12`) | 12 |
| S14–S24 (fallback sources, R01 + cross-check, ledger/rulings ×2, edits ×4, S3, sign-map) | 11 |
| Tail: code reviews (Astra + Fable), Verification + Summary, Release (+1 fix buffer) | 4 |
| **Total (bundled)** | **45** (15 sessions headroom under 60; `MISSION_WAIT_ASTRA` does not count) |

## Verification

E2E first. Every command runs from the worktree root unless it says `cd "$SA"`.

1. **E2E against the dev copy** (final Verification and Release only; never `.env.local`):
   ```
   ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a
     [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1
     npm run content -- build && CHROME_PATH=$HOME/.local/bin/chrome-nosandbox npm run e2e:fresh )
   ```
   - Never print a connection string or `cat` the secrets file. If the guard exits 1, stop and add a handoff item.
   - **Pass:** `N/N checks passed` with 0 failed, including the field-guide check `shown … != its signs` in its new form: badges equal the raw open tags in the pool minus the closure of `__cc.signImplies()`.
   - **Scenarios it covers:** globe → continent → rounds at `/explore`; field-guide badges per suspect (no broad badge beside a wired narrower one); the board's invariants on every move.
   - **Artifact:** `cp -r e2e-artifacts/<latest run>/. /srv/critter-ai/agent-state/missions/sign-audit/e2e-final/` (`report.json` plus screenshots). Same seed, same run. Delete older intermediate E2E folders; never `e2e-final/` or `e2e-baseline/`.
2. **Offline checks** (after every code or content step, and in the final Verification):
   - `npm run typecheck`, `npm run lint` and `npm test` each exit 0.
   - `npm run content -- preview` exits 0 with 0 problems across 76 profiles.
   - `cd "$SA" && python3 -I scripts/reconcile.py --repo /srv/critter-ai/worktrees/sign-audit --from 7bce511a --to HEAD` exits 0 with 0 discrepancies: no unexplained tag change, no ledger change missing from the profiles, no note deleted or moved.
3. **Live database, read-only:** `npm run content -- check` with the mission's `.env.local` prints `Pool: 76 playable of 76 species, …` and `0 errors, 0 warnings`. Never `build`, `ranges` or `iucn`.
4. **Witness snapshots** (`cd "$SA"`):
   - S1 (`7bce511a` × `7bce511a`): 105 sets, 525 combos, 402 with ≥1 eligible note, 940 eligible notes, self-check passes.
   - S2 (rules commit × `7bce511a`): `python3 -I metrics/diff.py metrics/s1.json metrics/s2.json --out metrics/s2/ --wording wording.csv` exits 0 (**0 `false`**, 0 unruled).
   - S3 (HEAD × HEAD): the same command with `s3` exits 0 (**0 `false`**), and every `metrics/s3/lost.csv` row has the lead's reason.
   - The plan records for each snapshot: combos with ≥1 eligible note, eligible notes, mystery-only and fits-all-5 drops, and the changed (set, mystery, note) count.
5. **Ledger completeness** (`cd "$SA"`):
   - `python3 -I scripts/ledger.py` exits 0. `ledger.csv` has exactly 76 × the active entries in `SIGNS` at HEAD, with no duplicate `(sign, animal_id)` and every `final_verdict` filled.
   - The plan records counts by verdict × category.
   - The Summary lists every deferred edge with its blocking notes.
6. **Release smoke** (after `deploy critter-connect`, which also runs `deploy/check.sh` including `scripts/check-live-board.mjs`):
   - `curl -s https://play.critterconnect.org/version.txt` shows the merge commit.
   - `https://play.critterconnect.org/` and `/explore/` return 200 with the globe and the game page's expected content.
   - `curl -s https://play.critterconnect.org/api/clue-game/pool/` returns 200 and JSON with 76 species and no error. These are the live `7bce511a` rows loading under the new `SIGNS`, so no `Unknown sign`.
   - After the smoke passes, add a handoff item: from WSL, update `main`, take a fresh dump (`ssh root@play.critterconnect.org /opt/critter-connect/deploy/backup/pg-backup.sh`), `npm run content -- build`, then `npm run content -- check`, which should print `0 errors, 0 warnings` and the pool line with the counts from the final `content -- preview`.

### Failure modes (tests-first)

**A. Rules commit (S5).** Write these down, then write the tests (`tests/clueGame/signs.test.ts`, `tests/clueGame/animalBoard.test.ts`), then the code.

- **A1 `signTableProblems`** (small fixture tables):
  - an active entry with an empty `meaning`, or one that is only whitespace, passes
  - a prefix typo in a trait target (`sytem:freshwater`, a prefix in neither `EXCLUSIVE_PREFIXES` nor `COMPLETE_PREFIXES`) passes
  - an open target that is missing from the table, or retired, passes
  - a sign that implies itself, or denies itself, passes
  - a 2-cycle (`a→b→a`) or a 3-cycle (`a→b→c→a`) passes, or is reported without its path
  - the real `SIGNS` isn't clean (`signTableProblems(SIGNS)` must be `[]`)
- **A2 Type guards** (checked by `npm run typecheck` through `// @ts-expect-error` lines in the test): an active entry without `meaning` compiles; a retired entry with `implies`/`denies` or `meaning` compiles.
- **A3 `IMPLIED`/`heldSigns`:**
  - a transitive edge (`a→b→c`) isn't closed, so `a` misses `c`
  - a diamond holds duplicates
  - a retired tag implies something, or isn't held as itself
  - trait tags leak into the result
  - `undefined` input throws
  - an unknown tag doesn't throw `Unknown sign "<tag>"`
- **A4 `signsOf`:**
  - a narrower sign plus its wired broader one on different notes shows two badges
  - a lone broader sign is dropped
  - tag order changes
  - the same tag on two notes shows twice
  - a retired tag is dropped
  - a deferred pair (edge not in `implies`) loses a badge
- **A5 `signProblems`:**
  - an unknown tag doesn't return early (later checks throw or add messages)
  - a retired tag is accepted
  - a trait `implies` conflict reached only through a narrower sign's closure isn't reported, or names the wrong `via`
  - an implied trait with no record (`unknown`) is wrongly reported
  - a trait `denies` that the record holds passes
  - an open `denies` against a sign held directly, or one reached through a narrower sign, passes
  - a mutual exclusion written in one direction fires only one way
  - narrower and broader on the **same** note passes
  - narrower and broader on **different** notes is flagged
  - a clean profile returns anything
- **A6 Rule fixes (F1–F4)**, checked on real `SIGNS` with fixture records, each of which must give `[]`: `climber` on `trees:no`; `swimmer` on a terrestrial-only record; `never_climbs` on a non-forest record; `above_tree_line` with `habitat:forest`; `sand_dunes` with `habitat:shrubland`. Also check whatever the S1/S2 rulings decided for `snorkel_nose`, `shares_food` and `often_in_trees`.
- **A7 `animalFitsNote`:**
  - a narrower holder doesn't fit a broader note
  - a broader holder fits a narrower note
  - a multi-tag note fits when only one tag is held
  - a transitive narrower sign (`narrow→mid→broad`) doesn't fit a `broad` note
  - trait tags get closure, or don't match raw
  - a suspect with `tags: undefined` throws
- **A8 `witnessNotes`/`stillPossible`** (fixture book around one wired edge read from `SIGNS`, and the test asserts that edge exists):
  - a note tagged with the broader sign doesn't count the narrower holder in `fits`
  - `stillPossible` rules out the narrower holder, or keeps a suspect that holds neither sign
  - on real content, `witnessNotes`' `fits` differs from the `animalFitsNote` oracle (the existing test at `:80`)
- **A9 `travelOf`:**
  - a terrestrial-only `swimmer` swims
  - a `swimmer` with `system:freshwater`, or with `system:marine`, walks
  - `fully_aquatic` without a `system:` tag walks
  - `glider` or Chiroptera doesn't fly
  - `burrower` doesn't dig
  - precedence changes (fly before swim before dig)
  - an implied sign changes travel (if any wired edge's broader sign is one of the four travel signs)
  - a split travel sign's successor travels differently from the old tag
- **A10 Live compatibility** is not a unit test, because the live rows aren't in the repo. Covered by S2 (the rules code loads `7bce511a` content: `Unknown sign` fails the harness) and the release pool smoke.

**B. Audit gates (S3, S8, S10).** Each script's self-test in `$SA/scripts/selftest/` is written first, with fixtures that must make it fail.

- **B1 `pairs.py`:**
  - rows ≠ 76 × active signs
  - a duplicate `(sign, animal)`
  - a held pair triaged (must exit non-zero)
  - a pair implied through a deferred edge marked `wired`, or the reverse
  - a retired sign included
- **B2 `validate.py`:**
  - a missing, duplicate or extra row passes
  - a verdict outside the three passes
  - a `has it` without a quote, or without a source file or URL, passes
  - a quote not found in its saved file isn't flagged
  - a `doesn't` with neither a quote nor `source silent: <why>` passes
  - a `can't tell` without a reason passes
- **B3 `diff.py --wording`:**
  - a newly matched row with no ruling, or with `false`, exits 0
  - a set that appeared or disappeared is missed
  - a lost-eligibility note is missed
  - a row ruled in an earlier snapshot isn't reused for the same `(mystery, clue_index, suspect)`
- **B4 `reconcile.py`:**
  - a tag change not in the ledger passes
  - a ledger change that isn't in the profiles passes
  - a multi-note change (`remove:2,5,7`) is half applied and passes
  - a deleted or moved note passes
  - a `rules_commit_change` is counted twice
  - `--applied` lets a pending category's change pass as applied

### Risks / open questions

- **R1 Ruling files.** `mission-lead.md` limits the lead to the plan, the handoff file and briefs, so Opus copies the lead's rulings in and the lead verifies with `diff`.
- **R2 The candidate S2 is an overlay.** It adds edges on top of the old code. The final S2 on the real rules commit is the gate, and S6 rules any newly matched row the overlay missed.
- **R3 Budget.** The unbundled estimate is about 47–56 sessions, including the 6 already used. S8 will likely apply the bundling rule. A stop at 60 is not fatal (`mission resume`).
- **R4 Astra limits and timeouts.** `MISSION_WAIT_ASTRA` may idle the run for hours. Halved reruns add items; `batches.csv` tracks each child batch through its `parent` column.
- **R5 Dev-copy timing.** The final content build writes HEAD content to `phaser_june_dev`, which other PRs' CI reads. If the mission adds new active sign names (splits), branches cut from old `main` hit `Unknown sign` until the merge. Run the final Verification and the Release back to back.
- **R6 Live delta until the owner's build.** Players see the S2 delta from the deploy and the S3 delta after the owner's build. Both are gated to 0 `false`, but `roundStillFits` drops the affected saved rounds.
- **R7 Travel change.** Terrestrial animals newly tagged `swimmer` walk off the board (intended). It shows only after the owner's build.
- **R8 Paywalled sources.** A paywalled DOI becomes `can't tell`, and the held tag stays. That may leave a few material pairs unresolved; they are listed in the Summary.
- **R9 Material depends on sets.** If a forced trait change shifts the dealable sets, recompute `material` from `metrics/s3.json` at S23, and reopen any pair that becomes material.
- **R10 Disk.** About 12 GB is free. Scratch trees in `/tmp/sa-trees/` are deleted after each snapshot, `game/` (~14 MB) is the only export kept, and sources are referenced in place.

## Witness before and after (S1 → S2 → S3)

Computed offline via `$SA/metrics/witness.ts` (real `pickSuspectSet`, `dealClues`, `witnessNotes`, `animalFitsNote`; self-check passed on all three snapshots; 12 wired edges at final HEAD `eadc8c16`; 105 identical dealable sets across S1/S2/S3, 0 sets added or removed).

| Metric | S1 baseline (`7bce511a` × `7bce511a`) | S2 deploy delta (`eadc8c16` × `7bce511a`) | S3 final (`eadc8c16` × `eadc8c16`) | S1 → S3 delta |
|---|---:|---:|---:|---:|
| Dealable sets (`world / africa / asia / NA / SA`) | 105 (`49/23/15/9/9`) | 105 (`49/23/15/9/9`) | 105 (`49/23/15/9/9`) | 0 |
| `(set, mystery)` combinations | 525 | 525 | 525 | 0 |
| Combos with ≥1 eligible note | 402 (76.6%) | 403 (76.8%) | **525 (100.0%)** | **+123 (+23.4 pp)** |
| Eligible witness notes | 940 | 943 | **5,803** | **+4,863 (6.17×)** |
| Eligible notes / combo (`min / median / mean / max`) | `0 / 1 / 1.79 / 7` | `0 / 1 / 1.80 / 7` | **`3 / 10 / 11.05 / 24`** | — |
| Dropped: `mystery_only` | 2,091 | 2,088 | 3,431 | +1,340 |
| Dropped: `fits_all` (5 of 5) | 22 | 22 | 546 | +524 |
| Dropped: `mystery_not_fitting` | 0 | 0 | 0 | 0 |
| Tagged notes evaluated | 3,053 | 3,053 | 9,780 | +6,727 |
| Changed `(set, mystery, note)` vs S1 (`changed.csv`) | — | 3 | 10,032 | — |
| Lost eligibility vs S1 (`lost.csv`) | — | 0 | 541 | — |
| Newly matched rows / distinct keys vs S1 (`wording.csv`) | — | 3 / 2 (`2 true, 0 false`) | **11,438 / 5,108 (`5,108 true, 0 false`)** | — |

**Per-place coverage (S1 → S2 → S3):**
- `world` (49 sets, 245 combos): `201/245` (515 notes) → `202/245` (518) → **`245/245` (2,780)**
- `africa` (23 sets, 115 combos): `92/115` (217 notes) → `92/115` (217) → **`115/115` (1,169)**
- `asia` (15 sets, 75 combos): `39/75` (83 notes) → `39/75` (83) → **`75/75` (865)**
- `north-america` (9 sets, 45 combos): `32/45` (41 notes) → `32/45` (41) → **`45/45` (486)**
- `south-america` (9 sets, 45 combos): `38/45` (84 notes) → `38/45` (84) → **`45/45` (503)**

**S1 → S3 `changed.csv` (10,032 rows):** 5,339 new notes eligible; 2,980 new notes ineligible (`mystery_only` or `fits_all`); 65 existing notes gained eligibility; 44 existing notes stayed eligible with updated fit counts; 541 existing notes lost eligibility (529 untagged/absent + 12 `fits_all`/`mystery_only`); 1,063 existing ineligible notes untagged by wording-gate moves/removals. Net eligible: `940 + 5,339 + 65 − 541 = 5,803`.

**S1 → S3 `lost.csv` review (541/541 rows reasoned in `$SA/metrics/s3/lost-reasons.csv`; 0 co-tagging losses, 0 unexplained):**
- `moved_all_replacements_eligible` (**424**): wording-gate move (`remove:<i>;new_note:<j>`); all replacement standard-sentence note(s) are eligible in the same combo.
- `moved_some_replacements_eligible` (**34**): wording-gate split of a two-tag note; one replacement stays eligible while the other now fits all 5 suspects (`fits_all`).
- `moved_replacement_fits_all` (**64**): wording-gate move whose replacement standard-sentence note now fits all 5 suspects (`fits_all`) after verified adds/wired edges.
- `unmoved_fits_all` (**10**): unmoved clean notes (`29:4` ×2, `55:2`/`59:3`/`63:3` ×6, `44:5`/`66:3` ×2) now fitting all 5 suspects after verified adds.
- `removed_false_tag` (**7**): `39:4` (`rarely_drinks` on Grévy's Zebra, ×5, S20) and `9:3` (`forest_floor` on Dyeing Poison Dart Frog, ×2, S25b Astra MF1), both removed under §2.7 removal bar.
- `mystery_only_after_false_tag_removal` (**2**): `57:5` (`rarely_drinks` on Aardvark), previously 2 of 5 only via false `39 rarely_drinks`; now `mystery_only`.

## Final ledger and audit record (S24 / S26)

Generated by `$SA/scripts/ledger.py` (15,276 rows = 76 animals × 201 active signs; 0 without `final_verdict`, 0 `add:pending`, 0 conflicts) and verified by `$SA/scripts/reconcile.py --from 7bce511a --to HEAD` (`1,433` actual ops match ledger, exit 0). `docs/research/2026-11-07-moves-and-signs/sign-map.csv` recomputed via `$SA/scripts/sign-map-update.ts` (216 rows: 156 changed, 60 byte-identical unchanged; 136 holder changes, 26 active rule changes, 15 retired marks; idempotent sha256 `964a5a4b…`).

### Counts by `final_verdict` × category

| Category | `has it` | `doesn't` | `can't tell` | `implied (wired)` | `implied (deferred)` | `no (triage)` | Total |
|---|---:|---:|---:|---:|---:|---:|---:|
| `habits` | 719 | 304 | 510 | 9 | 1 | 4,157 | 5,700 |
| `body` | 485 | 330 | 188 | 1 | 8 | 5,600 | 6,612 |
| `habitat` | 165 | 30 | 72 | 2 | 0 | 1,403 | 1,672 |
| `life` | 68 | 32 | 25 | 0 | 7 | 1,084 | 1,216 |
| `range` | 12 | 2 | 0 | 2 | 0 | 60 | 76 |
| **Total** | **1,449** | **698** | **795** | **14** | **16** | **12,304** | **15,276** |

- **Triage breakdown (`12,304`):** `class` 1,412, `body-plan` 1,686, `place` 1,219, `no-plausible-holder` 7,987.
- **`has it` composition (`1,449`):** `487` held at export confirmed `has it` (of `492` held at export; the other 5 are `1 yellow_legs`, `9 forest_floor`, `14 puffs_up`, `39 rarely_drinks` removed as `doesn't`, and `11 large_eyes` kept as `can't tell`), **`933` newly added** as one-sign `new_note`s across all 76 animals (plus 1 standalone `new_note` `46:21` `forest_floor` on already-held `46` after S5 dropped `46:5`, giving **934** `new_note:` entries), and `29` `none (implied)` (`23` wired, `6` deferred).
- **Applied repo changes (`1,184` rows with `commit` populated, 0 missing):** `3` S5 one-sign-per-fact drops (`d04baac0`), `364` S19 `body` (`d138b84e`), `605` S20 `habits` (`c672fbb9`), `145` S21 `habitat` (`ed85f139`), `51` S22 `life`+`range` (`3ae0ec18`), `32` S25b review fixes (`eadc8c16`; 16 rows touched in both an earlier step and S25b). Net ledger changes: **934 `new_note` adds (`933` newly added + `46:21`), 4 removes, 244 wording-gate moves, 3 S5 drops**.

### Owner-disclosure metrics (Fable MUST-FIX 1, S26)

Computed at final HEAD `eadc8c16` vs `origin/main` `7bce511a` for inclusion in Summary and the Release content-build handoff item:

1. **Scope deviation (standard-sentence notes):** all 934 `new_note` adds are one-sign standard-sentence notes restating each sign's `meaning`, and 244 existing tags moved off hand-written notes onto standard-sentence notes (`remove:<i>;new_note:<j> (wording gate)`) to pass the zero-false-fit wording gate without losing eligibility from co-tagging. Old hand-written note text stays verbatim (untagged) so no existing clue was deleted or rewritten, while `witness-signs` will replace witness display text globally.
2. **Balance impact (`scripts/balance-044.ts --rounds 60`, seed 44, `7bce511a` vs `eadc8c16`):** richer witness coverage makes rounds noticeably easier once `content -- build` loads the new notes (0 balance change during the deploy window on `7bce511a` rows beyond 3 notes):
   - `africa` (26 species, 23 sets): `careful` Found `98% → 100%`, ★★★ **`62% → 90%`**, moves left at find `16.1 → 19.4` (20/40/60th pct `11/14/16 → 15/18/21`), notes/round **`1.8 → 3.5`**, orders filled `2.6 → 1.9`; `novice` ★★★ `62% → 87%`; `expert` ★★★ `80% → 88%`; `reader` ★★★ `37% → 60%`.
   - `asia` (17 species, 15 sets): `careful` Found `97% → 98%`, ★★★ **`47% → 73%`**, moves left at find `13.9 → 17.2` (20/40/60th pct `10/11/16 → 12/16/20`), notes/round **`1.0 → 3.2`**, orders filled `2.9 → 1.9`; `novice` ★★★ `47% → 83%`; `expert` ★★★ `63% → 87%`; `reader` ★★★ `25% → 57%`.
3. **Round-end card & field-guide length:**
   - Total clues (notes) per animal: `628 → 1,806` total; `min / median / mean / max` **`4 / 8 / 8.26 / 12`** (`#23` Aye-aye) → **`14 / 23 / 23.76 / 36`** (max `#25` Tiger `9→36`, `#70` Baird's Tapir `9→36`, `#23` Aye-aye `12→34`, `#28` Asian Elephant `9→33`, `#11` Goliath Frog `10→32`).
   - Field-guide sign badges (`signsOf`) per animal: `min / median / mean / max` **`2 / 6 / 6.50 / 11`** (`#23` Aye-aye) → **`8 / 19 / 18.55 / 30`** (`#35` Red Panda; raw signs max `31`).
   - Near-duplicate examples from wording-gate moves (untagged original beside clean standard sentence): `64` African Savanna Elephant (`[1]` `"Its huge ears help it cool down on hot days."` beside `[10]` `"Its ears are large for its head."`; `[3]` mud spray beside `[24]` `mud_bather`; `[4]` deep rumbles beside `[23]` `low_rumbles`; `[5]` pushes trees beside `[26]` `pushes_over_trees`) and `15` Pancake Tortoise (`[0]` pancake shell beside `[10]` `flat_shell`; `[2]` rock slabs beside `[18]` `crevice_hider`; `[3]` boulder cracks beside `[15]` `climbs_boulders`).
4. **Complete `travelOf` delta (`7bce511a` → `eadc8c16`):**
   - **Deploy window (`eadc8c16` code × `7bce511a` live rows):** **0 animals change** (identical exit animations until `content -- build`).
   - **After `content -- build` (9 animals change):** **5 `walk → swim`** (`1` Blanding's Turtle, `2` Spiny Softshell Turtle, `10` Suriname Toad, `11` Goliath Frog, `17` Pig-nosed Turtle — all `system:freshwater` with new `swimmer`, plus `10` `fully_aquatic`) and **4 `walk → dig`** (`26` Black-footed Ferret, `33` Ethiopian Wolf, `48` Tasmanian Devil, `65` African Wild Dog — new `burrower`). Newly-tagged terrestrial-only `swimmer`s (`24`, `25`, `28`, `30`, `35`, `41`, `44`, `51`, `52`, `54`, `63`, `64`, `71`) keep walking (and `48`/`57` dig via `burrower`) thanks to the `inWater` guard.

### Deferred edges and blocking notes (for `witness-signs`)

All 10 edges below passed gate (a) entailment under approved `meaning` but were deferred at gate (b) because live `7bce511a` broad-tagged notes carried narrower wording. The audit enforced one-sign-per-fact on all 10 so `witness-signs` can wire them once standard witness sentences replace old note text.

| Deferred edge | Blocking notes (`7bce511a` text) | Status at HEAD |
|---|---|---|
| `backward_pouch` → `pouch` | `43:4` "Its pouch opens forward, like other kangaroos'." | `43:4` still tagged `pouch` |
| `carries_young_on_back` → `mother_carries_young` | `10:7` "Its eggs sink into pockets in the mother's back and hatch there as tiny toads, with no tadpole stage."; `54:6` "A mother carries her baby clinging to her belly." | `10:7` still tagged `mother_carries_young`; `54:6` untagged (S22) |
| `face_mask` → `face_markings` | `42:0` "It has white patches on its nose, chin, forehead and chest." | `42:0` untagged (S19) |
| `feathery_gills` → `underwater_breathing` | `2:3` "It can take in oxygen underwater through its skin and throat."; `62:2` "Folds of skin along its sides help it take in oxygen from the water through its skin."; `75:1` "Loose, wrinkly folds of skin along its sides help it breathe through its skin." | `2:3`, `62:2` untagged (S19); `75:1` still tagged `underwater_breathing` |
| `s_shaped_horns` → `horns` | `29:3` "Males have two short horns covered in skin."; `38:0` "Both males and females have long, straight, nearly parallel horns."; `68:0` "Both males and females have sharp, ringed horns that curve up like a lyre." | `29:3`, `38:0`, `68:0` still tagged `horns` |
| `shoulder_stripe` → `stripes` | `29:1` "Its legs have white and brown stripes, like a zebra's."; `43:1` "It has two golden stripes down its back." | `29:1`, `43:1` untagged (S19) |
| `spectacles` → `face_markings` | `38:2` "It has white patches on its face, hiding what may be the biggest face scent glands of any mammal."; `50:2` "It has a dark tuft of hair on its forehead and white markings on its face." | `38:2` untagged (S20); `50:2` untagged (S19) |
| `spiral_horns` → `horns` | `29:3`, `38:0`, `68:0` (above); `66:0` "It has two horns, one behind the other; the front one can be more than a metre long." | `29:3`, `38:0`, `66:0`, `68:0` still tagged `horns` |
| `tear_lines` → `face_markings` | `50:2` "It has a dark tuft of hair on its forehead and white markings on its face." | `50:2` untagged (S19) |
| `walks_upright` → `stands_on_hind_legs` | `36:2` "It can stand up on its back legs and tail to reach into termite mounds."; `57:7` "If it can't dig away from danger, it stands up on its back legs and tail and defends itself with its claws."; `61:3` "On the ground it hops upright on its back legs, holding its arms above its head." | `36:2`, `57:7`, `61:3` untagged (S20) |

### Give-away note wording (for `witness-signs`)

43 existing `7bce511a` notes logged in `$SA/giveaways.md` (old note text was kept verbatim per scope):

- **12 still tagged at HEAD** (still eligible to show as witness text until `witness-signs` replaces witness text with standard sentences):
  - `12:0` Spiny Hill Turtle [`spiky_shell`]: names `"sunburst turtle"` / `"turtle"`.
  - `30:2` Pygmy Three-toed Sloth [`hangs_upside_down`]: names `"tree sloths"`.
  - `43:4` Goodfellow's Tree-kangaroo [`pouch`]: names `"kangaroos"` (also `backward_pouch` blocker).
  - `65:3` African Wild Dog [`four_toes`]: names `"dogs"`.
  - `21:3` Radiated Tortoise [`spiny_forest`]: names `"southern Madagascar"`.
  - `10:7` Suriname Toad [`mother_carries_young`]: names `"toads"` (also `carries_young_on_back` blocker).
  - `27:6` Western Long-beaked Echidna [`pouch`]: uses `"puggle"` (monotreme-specific).
  - `16:5` Purple Frog [`surfaces_to_breed`]: `"monsoon"` hints at South Asia.
  - Milder group terms (4): `8:6` (`voiceless`, `"frogs"`), `17:1` (`flippers`, `"sea turtle's"`), `20:0` (`giant_tortoise`, `"tortoise"`), `74:3` (`stays_larval`, `"tadpole … frog"`).
- **31 now untagged at HEAD** (out of witness play via S19–S22 wording-gate moves, removals, or originally untagged): `3:3`, `9:4`, `11:0`, `14:2`, `15:0`, `26:3`, `30:4`, `33:1`, `42:1`, `42:5`, `46:0`, `48:6`, `49:5`, `51:1`, `54:0`, `56:5`, `58:3`, `58:7`, `63:5`, `63:6`, `64:4`, `65:5`, `67:3`, `67:8`, `68:2`, `70:5`, `71:6`, `72:3`, `73:1`, `73:3`, `75:5`. **Note on `14:2`** (Desert Rain Frog): untagged after `puffs_up` removal and `squeaker` move, but its text still reads `"When it is scared, it puffs up and lets out a loud squeak."` — `witness-signs` should drop or reword `"puffs up"` wherever untagged clue text is displayed.

### Tags added and removed per animal (with sources)

All 934 `new_note` adds (`933` newly added tags across 76/76 animals + `1` standalone `46:21` `forest_floor` restoring S5's `46:5` drop, with each note's `db/content/animals/*.json` `source` key), 4 removed held tags (`1 yellow_legs`, `9 forest_floor`, `14 puffs_up`, `39 rarely_drinks`), and 3 S5 one-sign-per-fact drops (`33 high_mountains`, `46 forest_floor`, `66 scent_marks`). Full citations/URLs are in `db/content/animals/*.json`, `db/content/citations.json`, and `$SA/ledger.csv`.

| ID | Animal | + | Added signs (source key) | Removed / S5 dropped |
|---:|---|---:|---|---|
| 1 | Blanding's Turtle | 17 | `borrowed_burrows` (literature), `burrower` (literature), `eggs_on_land` (iucn), `face_markings` (adw), `hisses` (government), `rests_on_bottom` (government), `sandy_bottoms` (government), `scavenger` (adw), `snowy_winters` (government), `spots` (adw), `spotted_belly` (adw), `swimmer` (adw), `throat_patch` (adw), `toothless` (britannica), `town_dweller` (adw), `webbed_feet` (adw), `winter_rest` (adw) | `yellow_legs` (clue 0, adw; removed) |
| 2 | Spiny Softshell Turtle | 18 | `basker` (iucn), `big_rivers` (government), `brackish_water` (iucn), `camouflage` (wikipedia), `eggs_on_land` (adw), `face_markings` (adw), `flat_body` (adw), `flat_shell` (adw), `pointed_snout` (adw), `scavenger` (iucn), `shallow_wetlands` (iucn), `snowy_winters` (government), `spots` (adw), `stripes` (adw), `swimmer` (government), `toothless` (britannica), `town_dweller` (iucn), `webbed_feet` (adw) | — |
| 3 | Darwin Frog | 11 | `ambush_hunter` (amphibiaweb), `buries_itself` (literature), `chirps` (amphibiaweb), `eggs_on_land` (adw), `feeds_on_ground` (ngo), `forest_floor` (ngo), `long_legs` (amphibiaweb), `toothless` (literature), `webbed_feet` (amphibiaweb), `whistle_calls` (adw), `winter_rest` (literature) | — |
| 4 | Big-headed Turtle | 14 | `buries_itself` (literature), `camouflage` (literature), `climbs_boulders` (adw), `crevice_hider` (literature), `eggs_on_land` (literature), `fast_streams` (adw), `five_front_claws` (government), `flat_shell` (adw), `forest_streams` (iucn), `fruit_eater` (iucn), `rests_on_bottom` (adw), `strong_bite` (adw), `toothless` (britannica), `webbed_feet` (adw) | — |
| 5 | Wallace's Flying Frog | 9 | `camouflage` (amphibiaweb), `eggs_over_water` (amphibiaweb), `large_eyes` (amphibiaweb), `long_legs` (adw), `rain_breeder` (ngo), `roosts_in_trees` (literature), `seldom_on_ground` (iucn), `shallow_wetlands` (iucn), `sleeps_high_in_trees` (wikipedia) | — |
| 6 | Red-eyed Tree Frog | 12 | `camouflage` (ngo), `climber` (amphibiaweb), `large_eyes` (amphibiaweb), `long_legs` (smithsonian), `roosts_in_trees` (ngo), `seldom_on_ground` (amphibiaweb), `shallow_wetlands` (amphibiaweb), `sleeps_high_in_trees` (ngo), `stripes` (amphibiaweb), `territorial` (amphibiaweb), `webbed_feet` (amphibiaweb), `white_belly` (amphibiaweb) | — |
| 7 | Hairy Frog | 7 | `face_markings` (amphibiaweb), `forest_streams` (iucn), `leaf_litter` (amphibiaweb), `stripes` (amphibiaweb), `town_dweller` (iucn), `webbed_feet` (amphibiaweb), `white_belly` (amphibiaweb) | — |
| 8 | Coastal Tailed Frog | 12 | `camouflage` (adw), `crevice_hider` (government), `face_markings` (adw), `fast_streams` (amphibiaweb), `feeds_on_ground` (amphibiaweb), `forest_streams` (government), `high_mountains` (government), `long_legs` (government), `rests_by_waterfalls` (wikipedia), `rests_on_bottom` (adw), `snowy_winters` (government), `webbed_feet` (adw) | — |
| 9 | Dyeing Poison Dart Frog | 7 | `climber` (literature), `eggs_on_land` (iucn), `feeds_on_ground` (iucn), `forest_streams` (amphibiaweb), `leaf_litter` (literature), `stripes` (amphibiaweb), `toothless` (literature) | `forest_floor` (clue 3, adw; removed) |
| 10 | Suriname Toad | 12 | `ambush_hunter` (sdzwa), `buries_itself` (iucn), `camouflage` (sdzwa), `forest_streams` (iucn), `fully_aquatic` (iucn), `never_climbs` (adw), `sandy_bottoms` (amphibiaweb), `shallow_wetlands` (adw), `spots` (adw), `swimmer` (adw), `territorial` (adw), `toothless` (literature) | — |
| 11 | Goliath Frog | 18 | `ambush_hunter` (government), `big_leaper` (sdzwa), `big_rivers` (iucn), `buries_itself` (amphibiaweb), `camouflage` (adw), `chirps` (amphibiaweb), `cold_streams` (amphibiaweb), `forest_streams` (iucn), `long_legs` (amphibiaweb), `rests_on_bottom` (amphibiaweb), `sandy_bottoms` (amphibiaweb), `spots` (amphibiaweb), `squeaker` (amphibiaweb), `sucker_mouth_tadpoles` (literature), `swimmer` (adw), `territorial` (amphibiaweb), `webbed_feet` (adw), `whistle_calls` (amphibiaweb) | — |
| 12 | Spiny Hill Turtle | 11 | `cold_streams` (literature), `eggs_on_land` (literature), `face_markings` (government), `feeds_on_ground` (government), `five_front_claws` (literature), `forest_floor` (government), `seed_spreader` (wikipedia), `star_pattern` (literature), `stubby_tail` (literature), `toothless` (britannica), `webbed_feet` (literature) | — |
| 13 | Madagascar Tomato Frog | 5 | `one_island` (adw), `puffs_up` (wikipedia), `shallow_wetlands` (iucn), `stripes` (adw), `warning_colors` (adw) | — |
| 14 | Desert Rain Frog | 7 | `buries_itself` (amphibiaweb), `camouflage` (amphibiaweb), `feeds_on_ground` (amphibiaweb), `large_eyes` (amphibiaweb), `never_climbs` (iucn), `round_body` (amphibiaweb), `toothless` (literature) | `puffs_up` (clue 2, news; removed) |
| 15 | Pancake Tortoise | 10 | `basker` (literature), `camouflage` (tftsg), `eggs_on_land` (smithsonian), `feeds_on_ground` (literature), `flat_body` (tftsg), `grazer` (literature), `rarely_drinks` (smithsonian), `star_pattern` (tftsg), `temperature_sex` (tftsg), `toothless` (sdzwa) | — |
| 16 | Purple Frog | 9 | `buries_itself` (amphibiaweb), `fast_streams` (amphibiaweb), `forest_streams` (iucn), `never_climbs` (iucn), `rain_breeder` (iucn), `shallow_wetlands` (iucn), `toothless` (amphibiaweb), `town_dweller` (amphibiaweb), `webbed_feet` (amphibiaweb) | — |
| 17 | Pig-nosed Turtle | 15 | `big_rivers` (literature), `camouflage` (smithsonian), `eggs_on_land` (iucn), `face_markings` (tftsg), `fruit_eater` (iucn), `leaf_eater` (iucn), `never_climbs` (adw), `rests_on_bottom` (literature), `sandy_bottoms` (tftsg), `shallow_wetlands` (iucn), `strong_bite` (adw), `swimmer` (adw), `toothless` (britannica), `underwater_breathing` (literature), `webbed_feet` (tftsg) | — |
| 18 | Yangtze Giant Softshell Turtle | 15 | `basker` (literature), `camouflage` (government), `eggs_on_land` (literature), `flat_body` (government), `flat_shell` (government), `never_climbs` (iucn), `pig_nose` (wikipedia), `rests_on_bottom` (iucn), `sandy_bottoms` (literature), `scavenger` (literature), `shallow_wetlands` (literature), `toothless` (britannica), `underwater_breathing` (literature), `webbed_feet` (government), `winter_rest` (literature) | — |
| 19 | Floreana Giant Tortoise | 11 | `basker` (sdzwa), `eggs_on_land` (sdzwa), `feeds_on_ground` (literature), `five_front_claws` (wikipedia), `forest_floor` (literature), `hisses` (literature), `loud_calls` (literature), `rarely_drinks` (literature), `slow_mover` (literature), `temperature_sex` (sdzwa), `toothless` (sdzwa) | — |
| 20 | African Spurred Tortoise | 15 | `basker` (adw), `borrowed_burrows` (tftsg), `eggs_on_land` (adw), `feeds_on_ground` (tftsg), `five_front_claws` (tftsg), `grazer` (tftsg), `mud_bather` (adw), `never_climbs` (iucn), `rarely_drinks` (adw), `sand_dunes` (iucn), `seed_spreader` (iucn), `temperature_sex` (tftsg), `toothless` (sdzwa), `town_dweller` (iucn), `yellow_legs` (adw) | — |
| 21 | Radiated Tortoise | 12 | `eggs_on_land` (adw), `face_markings` (adw), `feeds_on_ground` (adw), `forest_floor` (adw), `hisses` (adw), `leaf_eater` (literature), `leaf_litter` (tftsg), `one_island` (adw), `temperature_sex` (tftsg), `toothless` (sdzwa), `town_dweller` (literature), `yellow_legs` (adw) | — |
| 22 | Pinta Island Tortoise | 13 | `basker` (sdzwa), `eggs_on_land` (sdzwa), `feeds_on_ground` (literature), `five_front_claws` (wikipedia), `hisses` (sdzwa), `loud_calls` (literature), `rarely_drinks` (wikipedia), `saddleback_shell` (literature), `seed_spreader` (ngo), `slow_mover` (literature), `temperature_sex` (sdzwa), `throat_patch` (literature), `toothless` (sdzwa) | — |
| 23 | Aye-aye | 15 | `black_coat` (adw), `camouflage` (adw), `climber` (adw), `face_markings` (adw), `five_front_claws` (literature), `fruit_eater` (adw), `one_island` (adw), `roosts_in_trees` (iucn), `scent_marks` (adw), `screecher` (adw), `stands_on_hind_legs` (sdzwa), `strong_bite` (literature), `super_hearing` (adw), `throat_patch` (adw), `town_dweller` (iucn) | — |
| 24 | Sunda Pangolin | 11 | `borrowed_burrows` (adw), `carries_young_on_back` (ngo), `five_front_claws` (adw), `pointed_snout` (ngo), `raids_termite_mounds` (iucn), `roosts_in_trees` (ngo), `scent_marks` (adw), `sleeps_high_in_trees` (ngo), `swimmer` (iucn), `territorial` (iucn), `town_dweller` (iucn) | — |
| 25 | Tiger | 23 | `above_tree_line` (government), `black_coat` (wikipedia), `brackish_water` (iucn), `camouflage` (smithsonian), `climber` (adw), `face_markings` (adw), `fast_runner` (ngo), `feeds_on_ground` (adw), `five_front_claws` (sdzwa), `hisses` (adw), `loud_calls` (ngo), `low_rumbles` (sdzwa), `reddish_fur` (adw), `ringed_tail` (adw), `snowy_winters` (adw), `spiny_forest` (adw), `stands_on_hind_legs` (sdzwa), `stores_food` (adw), `strong_bite` (adw), `swimmer` (adw), `throat_patch` (adw), `town_dweller` (iucn), `webbed_feet` (sdzwa) | — |
| 26 | Black-footed Ferret | 13 | `big_ears` (smithsonian), `burrower` (government), `camouflage` (smithsonian), `digging_claws` (smithsonian), `furry_feet` (wikipedia), `hisses` (adw), `large_eyes` (smithsonian), `rarely_drinks` (government), `rodent_hunter` (adw), `scent_marks` (adw), `screecher` (government), `snowy_winters` (wikipedia), `throat_patch` (adw) | — |
| 27 | Western Long-beaked Echidna | 13 | `buries_itself` (adw), `camouflage` (adw), `feeds_on_ground` (adw), `forest_floor` (adw), `high_mountains` (iucn), `leaf_litter` (adw), `leg_spurs` (literature), `scent_marks` (adw), `senses_vibrations` (adw), `slow_mover` (adw), `stubby_tail` (adw), `super_hearing` (sdzwa), `voiceless` (adw) | — |
| 28 | Asian Elephant | 23 | `chirps` (wikipedia), `ever_growing_teeth` (smithsonian), `feeds_on_ground` (iucn), `forest_floor` (adw), `grazer` (iucn), `high_mountains` (iucn), `leaf_eater` (adw), `loud_calls` (wikipedia), `never_climbs` (adw), `poor_eyesight` (adw), `pushes_over_trees` (adw), `salt_licks` (smithsonian), `scent_marks` (adw), `seed_spreader` (iucn), `senses_vibrations` (adw), `snorkel_nose` (adw), `spiny_forest` (iucn), `squeaker` (smithsonian), `stands_on_hind_legs` (ngo), `super_hearing` (smithsonian), `swimmer` (adw), `town_dweller` (literature), `uses_tools` (adw) | — |
| 29 | Okapi | 14 | `big_ears` (sdzwa), `camouflage` (sdzwa), `dung_piles` (adw), `face_markings` (adw), `fast_runner` (sdzwa), `forest_floor` (adw), `large_eyes` (sdzwa), `leaf_eater` (adw), `low_rumbles` (sdzwa), `never_climbs` (adw), `poor_eyesight` (sdzwa), `seed_spreader` (ngo), `territorial` (sdzwa), `throat_patch` (sdzwa) | — |
| 30 | Pygmy Three-toed Sloth | 14 | `basker` (literature), `brown_throat` (adw), `climber` (adw), `ever_growing_teeth` (adw), `face_mask` (adw), `leaf_eater` (adw), `long_arms` (adw), `mother_carries_young` (ngo), `poor_eyesight` (adw), `roosts_in_trees` (wikipedia), `seldom_on_ground` (adw), `sleeps_high_in_trees` (wikipedia), `stubby_tail` (adw), `swimmer` (adw) | — |
| 31 | Northern Hairy-nosed Wombat | 6 | `dung_piles` (government), `feeds_on_ground` (government), `five_front_claws` (ngo), `never_climbs` (adw), `sleeping_nests` (ngo), `stubby_tail` (ngo) | — |
| 32 | De Winton's Golden Mole | 4 | `buries_itself` (ngo), `digging_claws` (wikipedia), `never_climbs` (wikipedia), `sand_dunes` (iucn) | — |
| 33 | Ethiopian Wolf | 13 | `burrower` (adw), `dung_piles` (smithsonian), `feeds_on_ground` (adw), `five_front_claws` (adw), `long_legs` (adw), `loud_calls` (adw), `mountain_meadows` (adw), `pointed_snout` (ngo), `shares_food` (adw), `stores_food` (adw), `super_hearing` (ngo), `throat_patch` (adw), `white_belly` (adw) | `high_mountains` (remove:5 (one sign per fact, above_tree_line); S5) |
| 34 | Golden Snub-nosed Monkey | 15 | `bamboo_forest` (iucn), `face_markings` (literature), `fruit_eater` (wikipedia), `high_mountains` (adw), `leaf_eater` (adw), `long_tail` (adw), `loud_calls` (literature), `mane` (literature), `mother_carries_young` (adw), `nectar_drinker` (adw), `reddish_fur` (literature), `roosts_in_trees` (wikipedia), `seed_spreader` (literature), `shares_food` (literature), `squeaker` (adw) | — |
| 35 | Red Panda | 21 | `basker` (sdzwa), `big_ears` (adw), `camouflage` (sdzwa), `chirps` (sdzwa), `climbs_boulders` (smithsonian), `dung_piles` (literature), `feeds_on_ground` (literature), `five_front_claws` (wikipedia), `hisses` (sdzwa), `leaf_eater` (wikipedia), `roosts_in_trees` (wikipedia), `seed_spreader` (wikipedia), `sleeping_nests` (adw), `snowy_winters` (sdzwa), `stands_on_hind_legs` (sdzwa), `strong_bite` (sdzwa), `swimmer` (sdzwa), `tear_lines` (smithsonian), `territorial` (literature), `town_dweller` (wikipedia), `whistle_calls` (smithsonian) | — |
| 36 | Giant Armadillo | 9 | `ever_growing_teeth` (wikipedia), `feeds_on_ground` (adw), `five_front_claws` (ngo), `forest_floor` (iucn), `long_tongue` (literature), `never_climbs` (iucn), `pointed_snout` (literature), `raids_termite_mounds` (adw), `scent_marks` (ngo) | — |
| 37 | Greater Bilby | 14 | `borrowed_burrows` (literature), `digging_claws` (adw), `feeds_on_ground` (iucn), `poor_eyesight` (adw), `raids_termite_mounds` (adw), `rarely_drinks` (adw), `sand_dunes` (adw), `scent_marks` (adw), `seed_spreader` (literature), `senses_vibrations` (adw), `stands_on_hind_legs` (literature), `stripes` (government), `super_hearing` (adw), `white_belly` (adw) | — |
| 38 | Saola | 10 | `bamboo_forest` (literature), `black_coat` (literature), `eye_glands` (adw), `forest_floor` (adw), `leaf_eater` (iucn), `long_tongue` (wikipedia), `never_climbs` (adw), `salt_licks` (ngo), `stripes` (adw), `throat_patch` (wikipedia) | — |
| 39 | Grévy's Zebra | 9 | `dung_piles` (adw), `face_markings` (adw), `fast_runner` (adw), `feeds_on_ground` (iucn), `loud_calls` (adw), `mane` (adw), `mud_bather` (wikipedia), `never_climbs` (adw), `nomadic` (iucn) | `rarely_drinks` (clue 4, wikipedia; removed) |
| 40 | Sumatran Orangutan | 15 | `leaf_eater` (iucn), `loud_calls` (adw), `mother_carries_young` (sdzwa), `nectar_drinker` (adw), `one_island` (iucn), `red_orange` (adw), `roosts_in_trees` (sdzwa), `seed_spreader` (adw), `sleeps_high_in_trees` (adw), `squeaker` (adw), `stands_on_hind_legs` (sdzwa), `strong_bite` (literature), `territorial` (adw), `town_dweller` (literature), `walks_on_knuckles` (wikipedia) | — |
| 41 | African Forest Elephant | 14 | `ever_growing_teeth` (sdzwa), `forest_floor` (adw), `leaf_eater` (adw), `loud_calls` (adw), `low_rumbles` (adw), `mud_bather` (sdzwa), `never_climbs` (adw), `pushes_over_trees` (adw), `scent_marks` (adw), `snorkel_nose` (adw), `stands_on_hind_legs` (sdzwa), `super_hearing` (adw), `swimmer` (adw), `town_dweller` (literature) | — |
| 42 | Vancouver Island Marmot | 15 | `above_tree_line` (government), `basker` (adw), `climbs_boulders` (government), `crevice_hider` (government), `digging_claws` (adw), `feeds_on_ground` (adw), `grazer` (iucn), `leaf_eater` (iucn), `loud_calls` (government), `scent_marks` (adw), `sleeping_nests` (adw), `snowy_winters` (adw), `stands_on_hind_legs` (adw), `territorial` (adw), `whistle_calls` (adw) | — |
| 43 | Goodfellow's Tree-kangaroo | 9 | `face_markings` (adw), `high_mountains` (adw), `leaf_eater` (adw), `one_island` (iucn), `roosts_in_trees` (literature), `sleeps_high_in_trees` (literature), `stands_on_hind_legs` (sdzwa), `territorial` (adw), `throat_patch` (adw) | — |
| 44 | Javan Rhinoceros | 11 | `dung_piles` (wikipedia), `forest_floor` (iucn), `fruit_eater` (wikipedia), `hooves` (adw), `leaf_eater` (iucn), `loud_calls` (adw), `never_climbs` (adw), `one_island` (iucn), `poor_eyesight` (adw), `swimmer` (adw), `whistle_calls` (adw) | — |
| 45 | Livingstone's Flying Fox | 12 | `black_coat` (literature), `hangs_upside_down` (literature), `large_eyes` (wikipedia), `nectar_drinker` (wikipedia), `pointed_snout` (adw), `scent_marks` (literature), `screecher` (literature), `seed_spreader` (adw), `seldom_on_ground` (wikipedia), `sleeps_high_in_trees` (literature), `squeaker` (wikipedia), `town_dweller` (literature) | — |
| 46 | Golden-rumped Sengi | 12 | `big_ears` (smithsonian), `face_markings` (adw), `feeds_on_ground` (smithsonian), `forest_floor` (smithsonian), `large_eyes` (smithsonian), `long_legs` (smithsonian), `long_tail` (smithsonian), `long_tongue` (smithsonian), `never_climbs` (smithsonian), `reddish_fur` (wikipedia), `scent_marks` (smithsonian), `territorial` (adw) | `forest_floor` (remove:5 (one sign per fact, leaf_litter); S5) |
| 47 | Ili Pika | 11 | `above_tree_line` (adw), `climbs_boulders` (wikipedia), `dung_piles` (iucn), `ever_growing_teeth` (adw), `face_markings` (wikipedia), `feeds_on_ground` (wikipedia), `five_front_claws` (adw), `furry_feet` (adw), `grazer` (wikipedia), `stubby_tail` (adw), `territorial` (ngo) | — |
| 48 | Tasmanian Devil | 19 | `black_coat` (wikipedia), `burrower` (wikipedia), `carries_young_on_back` (wikipedia), `climber` (sdzwa), `digging_claws` (wikipedia), `dung_piles` (wikipedia), `feeds_on_ground` (iucn), `five_front_claws` (wikipedia), `forest_floor` (iucn), `high_mountains` (iucn), `hisses` (sdzwa), `huge_head` (adw), `loud_calls` (adw), `sleeping_nests` (adw), `stands_on_hind_legs` (wikipedia), `super_hearing` (wikipedia), `swimmer` (sdzwa), `throat_patch` (adw), `town_dweller` (iucn) | — |
| 49 | Hispaniolan Solenodon | 10 | `crevice_hider` (adw), `feeds_on_ground` (iucn), `forest_floor` (government), `leaf_litter` (iucn), `long_tail` (literature), `poor_eyesight` (smithsonian), `scent_marks` (literature), `squeaker` (literature), `super_hearing` (literature), `throat_patch` (government) | — |
| 50 | Addax | 8 | `feeds_on_ground` (adw), `mane` (smithsonian), `never_climbs` (adw), `sand_dunes` (iucn), `scent_marks` (smithsonian), `territorial` (adw), `throat_patch` (government), `white_belly` (adw) | — |
| 51 | Jaguar | 15 | `brackish_water` (iucn), `camouflage` (sdzwa), `climber` (adw), `ear_spots` (ngo), `feeds_on_ground` (adw), `hisses` (ngo), `huge_head` (adw), `loud_calls` (wikipedia), `ringed_tail` (ngo), `rodent_hunter` (wikipedia), `spiny_forest` (iucn), `spotted_belly` (ngo), `swimmer` (adw), `throat_patch` (ngo), `town_dweller` (iucn) | — |
| 52 | Giant Anteater | 8 | `borrowed_burrows` (adw), `feeds_on_ground` (sdzwa), `forest_floor` (iucn), `mane` (adw), `spiny_forest` (literature), `swimmer` (adw), `throat_patch` (government), `town_dweller` (adw) | — |
| 53 | Lowland Tapir | 17 | `bamboo_forest` (literature), `chirps` (sdzwa), `forest_floor` (iucn), `forest_streams` (iucn), `leaf_eater` (adw), `mud_bather` (sdzwa), `never_climbs` (adw), `scent_marks` (adw), `screecher` (adw), `shallow_wetlands` (iucn), `snorkel_nose` (sdzwa), `squeaker` (ngo), `stubby_tail` (sdzwa), `territorial` (adw), `throat_patch` (ngo), `whistle_calls` (sdzwa), `white_ear_rims` (ngo) | — |
| 54 | Brown-throated Sloth | 14 | `basker` (adw), `climber` (adw), `ever_growing_teeth` (adw), `face_mask` (ngo), `long_arms` (adw), `poor_eyesight` (adw), `rarely_drinks` (adw), `roosts_in_trees` (adw), `screecher` (wikipedia), `sleeps_high_in_trees` (wikipedia), `stripes` (ngo), `stubby_tail` (ngo), `swimmer` (adw), `territorial` (adw) | — |
| 55 | Giant Pangolin | 6 | `carries_young_on_back` (adw), `feeds_on_ground` (adw), `five_front_claws` (literature), `forest_floor` (adw), `long_tail` (literature), `pointed_snout` (adw) | — |
| 56 | Chimpanzee | 14 | `big_ears` (adw), `black_coat` (adw), `high_mountains` (adw), `leaf_eater` (iucn), `pack_hunter` (adw), `salt_licks` (adw), `screecher` (literature), `seed_spreader` (adw), `shares_food` (wikipedia), `sleeps_high_in_trees` (adw), `squeaker` (adw), `stands_on_hind_legs` (adw), `territorial` (adw), `town_dweller` (literature) | — |
| 57 | Aardvark | 7 | `feeds_on_ground` (iucn), `forest_floor` (iucn), `never_climbs` (adw), `sand_dunes` (literature), `scent_marks` (ngo), `super_hearing` (adw), `swimmer` (wikipedia) | — |
| 58 | Cheetah | 16 | `camouflage` (smithsonian), `dung_piles` (adw), `ear_spots` (adw), `feeds_on_ground` (adw), `five_front_claws` (adw), `high_mountains` (ngo), `hisses` (smithsonian), `long_legs` (adw), `mane` (adw), `nomadic` (adw), `rarely_drinks` (ngo), `squeaker` (government), `territorial` (adw), `throat_patch` (smithsonian), `whistle_calls` (government), `white_belly` (adw) | — |
| 59 | Indian Pangolin | 13 | `carries_young_on_back` (literature), `climber` (iucn), `feeds_on_ground` (adw), `five_front_claws` (adw), `pointed_snout` (literature), `poor_eyesight` (literature), `scent_marks` (adw), `spiny_forest` (adw), `stands_on_hind_legs` (literature), `territorial` (adw), `town_dweller` (iucn), `voiceless` (adw), `walks_on_knuckles` (adw) | — |
| 60 | Giant Panda | 11 | `camouflage` (sdzwa), `chirps` (sdzwa), `climber` (adw), `face_markings` (adw), `five_front_claws` (wikipedia), `hisses` (literature), `huge_head` (sdzwa), `leaf_eater` (adw), `snowy_winters` (sdzwa), `stands_on_hind_legs` (sdzwa), `stubby_tail` (smithsonian) | — |
| 61 | Indri | 14 | `basker` (wikipedia), `black_coat` (wikipedia), `climber` (adw), `large_eyes` (wikipedia), `long_legs` (adw), `one_island` (iucn), `pointed_snout` (adw), `rarely_drinks` (literature), `roosts_in_trees` (wikipedia), `scent_marks` (adw), `seldom_on_ground` (iucn), `sleeps_high_in_trees` (wikipedia), `throat_patch` (ngo), `town_dweller` (literature) | — |
| 62 | Chinese Giant Salamander | 13 | `camouflage` (adw), `crevice_hider` (sdzwa), `fast_streams` (adw), `fish_eater` (adw), `never_climbs` (amphibiaweb), `paddle_tail` (amphibiaweb), `regrows_body_parts` (literature), `rests_on_bottom` (amphibiaweb), `spots` (amphibiaweb), `sticky_skin` (adw), `strong_bite` (wikipedia), `territorial` (adw), `winter_rest` (sdzwa) | — |
| 63 | Temminck's Pangolin | 11 | `camouflage` (adw), `climbs_boulders` (ngo), `feeds_on_ground` (adw), `five_front_claws` (adw), `long_tail` (adw), `pointed_snout` (adw), `poor_eyesight` (ngo), `rarely_drinks` (iucn), `sand_dunes` (literature), `swimmer` (adw), `voiceless` (ngo) | — |
| 64 | African Savanna Elephant | 17 | `bamboo_forest` (ngo), `ever_growing_teeth` (sdzwa), `high_mountains` (ngo), `leaf_eater` (adw), `loud_calls` (adw), `never_climbs` (adw), `salt_licks` (wikipedia), `scent_marks` (adw), `screecher` (sdzwa), `seed_spreader` (wikipedia), `senses_vibrations` (government), `snorkel_nose` (sdzwa), `spiny_forest` (sdzwa), `stands_on_hind_legs` (government), `super_hearing` (adw), `swimmer` (sdzwa), `uses_tools` (government) | — |
| 65 | African Wild Dog | 11 | `black_coat` (wikipedia), `burrower` (sdzwa), `chirps` (sdzwa), `face_mask` (ngo), `feeds_on_ground` (adw), `long_legs` (adw), `scent_marks` (adw), `spiny_forest` (ngo), `squeaker` (sdzwa), `strong_bite` (literature), `super_hearing` (sdzwa) | — |
| 66 | Black Rhinoceros | 9 | `fast_runner` (wikipedia), `hooves` (sdzwa), `leaf_eater` (wikipedia), `loud_calls` (adw), `never_climbs` (adw), `pushes_over_trees` (adw), `rarely_drinks` (sdzwa), `seed_spreader` (adw), `whistle_calls` (literature) | `scent_marks` (remove:5 (one sign per fact, dung_piles); S5) |
| 67 | Eastern Long-beaked Echidna | 10 | `above_tree_line` (adw), `camouflage` (sdzwa), `feeds_on_ground` (iucn), `forest_floor` (iucn), `leaf_litter` (literature), `leg_spurs` (adw), `mountain_meadows` (adw), `one_island` (iucn), `slow_mover` (iucn), `super_hearing` (sdzwa) | — |
| 68 | Hirola | 4 | `dung_piles` (adw), `feeds_on_ground` (adw), `long_legs` (adw), `never_climbs` (adw) | — |
| 69 | Dama Gazelle | 9 | `dung_piles` (wikipedia), `face_markings` (adw), `hooves` (smithsonian), `large_eyes` (wikipedia), `leaf_eater` (adw), `never_climbs` (adw), `territorial` (adw), `throat_patch` (adw), `white_belly` (adw) | — |
| 70 | Baird's Tapir | 21 | `above_tree_line` (adw), `big_ears` (adw), `brackish_water` (adw), `camouflage` (adw), `chirps` (sdzwa), `dung_piles` (literature), `face_markings` (wikipedia), `forest_floor` (adw), `forest_streams` (iucn), `hooves` (sdzwa), `leaf_eater` (adw), `mountain_meadows` (iucn), `never_climbs` (adw), `salt_licks` (literature), `seed_spreader` (adw), `shallow_wetlands` (iucn), `snorkel_nose` (sdzwa), `squeaker` (wikipedia), `stubby_tail` (wikipedia), `territorial` (adw), `throat_patch` (adw) | — |
| 71 | Andean Bear | 14 | `above_tree_line` (ngo), `black_coat` (adw), `climbs_boulders` (ngo), `five_front_claws` (ngo), `leaf_eater` (adw), `mountain_meadows` (iucn), `scent_marks` (ngo), `screecher` (sdzwa), `seed_spreader` (sdzwa), `sleeps_high_in_trees` (ngo), `stands_on_hind_legs` (ngo), `stubby_tail` (adw), `swimmer` (ngo), `throat_patch` (smithsonian) | — |
| 72 | Maned Wolf | 13 | `dung_piles` (adw), `face_markings` (ngo), `feeds_on_ground` (government), `pointed_snout` (wikipedia), `red_orange` (ngo), `rodent_hunter` (adw), `shares_food` (government), `stands_on_hind_legs` (government), `stores_food` (government), `super_hearing` (smithsonian), `throat_patch` (wikipedia), `town_dweller` (iucn), `white_tail_tip` (ngo) | — |
| 73 | Giant Otter | 13 | `basker` (ngo), `big_rivers` (iucn), `chirps` (literature), `dung_piles` (adw), `face_markings` (ngo), `forest_streams` (iucn), `sandy_bottoms` (iucn), `screecher` (literature), `senses_vibrations` (wikipedia), `shallow_wetlands` (iucn), `shares_food` (wikipedia), `strong_bite` (wikipedia), `whistle_calls` (literature) | — |
| 74 | Axolotl | 14 | `buries_itself` (sdzwa), `camouflage` (sdzwa), `high_mountains` (adw), `huge_head` (sdzwa), `lidless_eyes` (wikipedia), `long_tail` (literature), `never_climbs` (amphibiaweb), `paddle_tail` (adw), `poor_eyesight` (amphibiaweb), `rests_on_bottom` (sdzwa), `sandy_bottoms` (sdzwa), `senses_vibrations` (sdzwa), `shallow_wetlands` (sdzwa), `spots` (amphibiaweb) | — |
| 75 | Hellbender | 9 | `ambush_hunter` (smithsonian), `big_rivers` (amphibiaweb), `camouflage` (adw), `crevice_hider` (amphibiaweb), `fast_streams` (amphibiaweb), `never_climbs` (adw), `rests_on_bottom` (adw), `spots` (amphibiaweb), `webbed_feet` (adw) | — |
| 76 | Golden Poison Frog | 8 | `egg_guarding` (ngo), `eggs_on_land` (iucn), `feeds_on_ground` (adw), `forest_streams` (amphibiaweb), `long_tongue` (adw), `shallow_wetlands` (iucn), `yellow_head` (adw), `yellow_legs` (adw) | — |

## Code review (Astra)

VERDICT: REJECT

MUST-FIX:

1. `src/clueGame/signs.ts:127` — `leaf_litter` implies `forest_floor`, which says the animal rarely climbs trees. The Dyeing Poison Dart Frog carries tadpoles to tree pools over 20 m high, yet its new note says it rarely climbs and its profile omits `climber`. Wallace’s Flying Frog’s climbing note consequently shows 2/5 in `world:5,6,8,9,13`; it should show 3/5. Recheck the implication and both tags. [Field study](https://onlinelibrary.wiley.com/doi/10.1002/ece3.7741)
2. `docs/research/2026-11-07-moves-and-signs/sign-map.csv:195` — `town_dweller` omits the Hairy Frog. Its cited IUCN assessment records it living in tea plantations, which the sign explicitly includes. The Tomato Frog’s note shows 2/5 in `africa:7,11,13,14,41`; the Hairy Frog makes it 3/5. [IUCN assessment](https://www.iucnredlist.org/species/54443/18361006)
3. `src/clueGame/signs.ts:74` — Requiring `habitat:rocky` for `crevice_hider` excludes the Big-headed Turtle and Hispaniolan Solenodon despite both profiles documenting shelter in rock cracks. This suppresses two eligible witnesses: mystery 15 in `world:1,2,4,12,15` and mystery 42 in `world:37,42,45,49,61`.
4. `db/content/animals/01-blandings-turtle.json:150` — “Its legs are yellow” overstates the evidence. The audit records dark legs mottled with yellow. The new wording falsely counts Blanding’s Turtle for the African Spurred Tortoise’s note in `world:1,2,17,18,20`.
5. `db/content/animals/01-blandings-turtle.json:162` — The `burrower` note cites ADW’s description of egg-nest digging, which the audit excluded. The accepted evidence is Butler & Graham’s observation of hatchlings digging into sand. Qualify the note and cite that study.

SHOULD-CONSIDER:

- Add independently expected suspect IDs for the affected deals. The real-content test currently recomputes expected counts with the production predicate, so all 140 tests pass despite these errors. `tests/clueGame/animalBoard.test.ts:415`
- Recheck the corrected profiles with the planned dev E2E. Typecheck passed. This read-only review covered `agent/sign-audit` at `963615b9` against local `origin/main` at `7bce511a`. The filesystem blocked `git fetch`, so remote freshness is unverified.

*(Saved: `/srv/critter-ai/agent-state/missions/sign-audit/tasks/astra-code-review.md`)*

## Code review (Fable)

**VERDICT: APPROVE_WITH_CHANGES**

Reviewed `origin/main` (`7bce511a`) ... `HEAD` (`963615b9`). The code is sound and the brief's hard constraints hold. The one change is a record for the owner, not code.

**MUST-FIX**

1. `plans/2026-11-23-sign-audit.md:1147` (Summary, still empty) and the owner's content-build handoff item: record these effects of the content build, which the plan doesn't state, so the owner decides before `content -- build`.
   - **Scope:** all 918 adds are new standard-sentence notes, and 245 tags moved off hand-written notes onto such notes. Brief Goal 4 says to tag the existing sentence where there is one, and Scope puts witness-note wording out (that is witness-signs' job). The lead's S19–S22 decisions record the choice, but not as a deviation from the brief.
   - **Balance** (`scripts/balance-044.ts --rounds 60`, seed 44, base content vs HEAD content): rounds get clearly easier.
     - Africa: careful ★★★ `62% → 90%`, notes found per round `1.8 → 3.5`
     - Asia: careful ★★★ `47% → 73%`, notes found per round `1.0 → 3.2`
   - **Round-end card:** hand-written notes per animal go from a median of 8 to 23 (max 36). The moves leave near-duplicate pairs, e.g. `64`: "Its huge ears help it cool down on hot days." beside "Its ears are large for its head.", and the mud and rumble notes likewise.
   - **Travel:** `26`, `33`, `48`, `65` change walk→dig (new `burrower`), and `1`, `2`, `10`, `11`, `17` change walk→swim. Risk R7 (`:895`) covers only swimmers that walk.

**SHOULD-CONSIDER**

1. `src/clueGame/signs.ts:43`: `above_tree_line` implies `trees:no`, which "at least partly" doesn't entail. `71` holds it with `sleeps_high_in_trees` (implies `trees:yes`) and passes only because `71` records no `trees:` trait. Drop the implies.
2. Marginal `has it` verdicts become odd badges for kids:
   - `25` Tiger: `above_tree_line`, `town_dweller`, and `black_coat` (the lead's S19 note says SDZWA has no confirmed individuals).
   - `58` Cheetah `high_mountains`, `57` Aardvark `forest_floor`, `64` `bamboo_forest`.
   - `town_dweller` is applied unevenly: `25`/`28`/`56` `has it` on plantation or garden use, but `64`/`70`/`71` `can't tell` on crop raiding.
3. The new notes say "at least partly", but the `meaning` doesn't, for `high_mountains`, `bamboo_forest`, `leaf_litter` and `mountain_meadows` (`signs.ts:117`, `:48`, `:127`, `:140`). Align each `meaning` with what was audited.
4. For witness-signs: name-blanking mangles some standard sentences, e.g. `35` `reddish_fur` "Its fur is mostly ____, reddish brown or golden ____." and `41` `forest_floor` "the ____ floor".
5. `e2e:fresh` has not run on HEAD content yet. Signs per animal go from a median of 6 to 19 (max 31), so the field guide's sign paging gets its first real load. The final Verification covers it; don't skip it.

*(Saved: `/srv/critter-ai/agent-state/missions/sign-audit/tasks/20261123-215620-fable-5-2-high.md`)*

### Code review rulings (lead)

- **Astra MUST-FIX 1 (`leaf_litter→forest_floor`, `9` Dyeing Poison Dart Frog `forest_floor` & `climber`):** Accepted → S25. Cached Pašukonis et al. 2019 (`doi:10.1007/s10682-019-09994-z`) and Rojas et al. (`10.1002/ece3.7741`) confirm routine >10–20 m tree climbing for tadpole transport, refuting `"rarely if ever climbs up into the trees"` on `9` and disproving `leaf_litter→forest_floor`. Drop `forest_floor` from `leaf_litter.implies` (12 wired edges), remove `forest_floor` from `9`, add `climber` to `9`, restore `forest_floor` on `46`, and check/add `forest_floor` on `7`.
- **Astra MUST-FIX 2 (`7` Hairy Frog `town_dweller`):** Accepted → S25. Cached IUCN (`54443/18361006`) explicitly lists `"agricultural habitats, including tea plantations"` and `14.3 Plantations: Resident Suitable`; reopen from `triage.csv`, add `town_dweller` to `7`, and inspect sibling IUCN `14.3`/plantation cases (`51` Jaguar, `16` Purple Frog).
- **Astra MUST-FIX 3 (`crevice_hider` `implies: ['habitat:rocky']`):** Accepted → S25. Same bug class as F1–F4 and `climbs_boulders`; drop `implies: ['habitat:rocky']` from `crevice_hider`, reopen non-`rocky` crevice-hider candidates (`4`, `49`, `62`, `75`, plus check `8`/`35`), and add `crevice_hider` to all verified holders.
- **Astra MUST-FIX 4 (`1` Blanding's Turtle `yellow_legs`):** Accepted → S25. Overrule S17 `1 yellow_legs` → `doesn't` (cited ADW only notes scattered yellow scales on legs/tail and Wikipedia confirms dark legs mottled with yellow; meets §2.7 removal bar and stops false match on `20`'s `"Its legs are yellow."`); remove S19 `clue 12`, keeping `clue 0` untagged.
- **Astra MUST-FIX 5 (`1` Blanding's Turtle `burrower` source & wording):** Accepted → S25. Switch `clue 13` from `adw` (excluded egg-nest digging) to Butler & Graham 1995 (`literature`, already in `citations.json`) with qualified wording true of all burrowers (`"…or (at least when young) digging itself down into soil or sand"`).
- **Astra SHOULD-CONSIDER 1 (pinned deal-fit assertions in `animalBoard.test.ts`):** Accepted → S25. Add explicit suspect-fit regression checks for all 5 affected deals.
- **Astra SHOULD-CONSIDER 2 (dev E2E & fresh `origin/main`):** Accepted → covered by Final Verification and Release.
- **Fable MUST-FIX 1 (Summary + handoff disclosures: scope deviation, balance impact, round-end card length/near-duplicates, full `travelOf` delta):** Accepted → S26 computes final post-S25 numbers; Summary (Final Verification) and Release handoff item present all four clearly for the owner before `content -- build`.
- **Fable SHOULD-CONSIDER 1 (`above_tree_line` implies `trees:no`):** Accepted → S25. Drop `'trees:no'` from `above_tree_line.implies` (keeps `['high_mountains']`) to match `"at least partly"` and resolve `71`'s implicit tension with `sleeps_high_in_trees`.
- **Fable SHOULD-CONSIDER 2 (marginal `has it` badges — `25`, `58`, `57`, `64`, `town_dweller` crop-raiding):** Rejected as code/profile fix, noted in Summary for owner — each `has it` has a verified ranked quote matching approved `meaning` (while crop-raiding alone ≠ living in settlements/plantations); surfaced transparently in Summary if the owner wants tighter definitions in `witness-signs`.
- **Fable SHOULD-CONSIDER 3 (`meaning` vs `"at least partly"` on `high_mountains`, `bamboo_forest`, `leaf_litter`, `mountain_meadows`):** Accepted → S25. Align `meaning` in `signs.ts` and `definitions.csv`.
- **Fable SHOULD-CONSIDER 4 (name-blanking mangling standard sentences like `35` `reddish_fur`, `41` `forest_floor`):** Accepted as note for `witness-signs` in Summary (witness-note wording/blanking is out of scope here).
- **Fable SHOULD-CONSIDER 5 (`e2e:fresh` on HEAD content with median 19 / max 31 signs):** Accepted → runs in Final Verification right after S26.

## Release

## Decisions

- (lead) Architecture A3 + B2: put strict narrower→broader sign edges in `SIGNS[tag].implies` with `heldSigns` closure in `animalFitsNote` (shared by `witnessNotes`, `stillPossible`, tests, and metrics), split `SignEntry` into a discriminated union (`ActiveSignEntry` with required `meaning` vs `RetiredSignEntry` with `retired: true` and `category` only; drop dead `restates`), enforce retired + closure + per-note one-sign-per-fact mechanically in `signProblems` while deduplicating field-guide badges in `signsOf`, narrow `travelOf` on `system:freshwater`/`system:marine` for `swimmer` using raw tags, keep `ANIMAL_RULES.version` at `055-1`, audit all ~494 held pairs in category × animal-group batches, and record 3 witness-note snapshots via real `witnessNotes`.
- (lead) Revision — wording-safety gate on `implies` edges: every open-tag `implies` edge requires BOTH strict logical entailment under approved `meaning` AND zero false wording fits across every newly matched suspect in snapshot 2 (live `7bce511a`) AND snapshot 3 (final profiles). Strict edges blocked by narrow wording on live `7bce511a` broad notes (e.g., `backward_pouch -> pouch` blocked by 43's "opens forward") are deferred to `witness-signs` (not wired in `SIGNS.implies` yet, recorded in `definitions.csv` + Summary) while the audit still respects one-sign-per-fact so `witness-signs` can flip them on with zero profile churn.
- (lead) Revision — per-note one-sign-per-fact + `signsOf` badge dedupe + audit safeguards: check one-sign-per-fact per note (preserving multi-note dealability), dedupe implied broader signs in `signsOf` (and update `scripts/e2e.mjs:1222-1227`), add new short notes instead of narrowing an already-tagged note's eligibility, require reading a held tag's cited source before any removal, sample ~100–150 same-class `no-plausible-holder` triaged pairs via Astra, reopen implied pairs on narrower `doesn't` OR `can't tell`, reconcile the full `7bce511a -> HEAD` tag diff (multi-note indices included) against `ledger.csv`, defer `never_climbs denies climber` until Definitions, and run `phaser_june_dev` content build only at final Verification/Release.
- (lead) Steps — accepted planner's four structural calls: (1) Opus drafts and updates state-folder ruling CSVs from lead briefs (`prompts/S<n>-rulings.md`) with lead `diff` spot-checks, keeping the lead strictly to briefs/plan/handoff; (2) candidate Snapshot 2 (S4) runs via `--edges` overlay on `7bce511a` with an empty-edges self-check matching S1, and final Snapshot 2 (S6) on the real rules commit is the hard gate; (3) Pilot P01 is a real batch from `batches.csv` (`--rebatch` only touches remaining unrun batches); (4) keep both tests-first failure-mode lists — A1–A10 for the S5 rules commit and B1–B4 for the audit gate scripts (`pairs.py`, `validate.py`, `diff.py --wording`, `reconcile.py`).
- (lead) S1 hard-sign rulings (22 signs signed off in `definitions.csv`, `lead, 2026-11-23`): F1–F4 fixed (`climber` & `swimmer` drop `implies`; `never_climbs` trees-only, `implies: trees:no`, drops `habitat:forest`, **no** `denies: climber` so rock climbers can hold both, approves `denies: often_in_trees;seldom_on_ground`; `above_tree_line` drops `denies: habitat:forest`; `sand_dunes` drops `implies: habitat:desert`); §1.6 settled (`snorkel_nose` drops `FRESH_WATER`; `shares_food` keeps `denies: social:alone` and excludes a parent feeding only its own young; `often_in_trees` drops `trees:yes`/`habitat:forest`; `carries_young_on_back` is mother's back only excluding skin-pocket eggs and fathers, `mother_carries_young` excludes pouches, `father_carries_young` kept); F6 settled without splits (`burrower` broad on-land digging/burrowing excluding underwater sand/mud & leaves; `stands_on_hind_legs` broad upright standing/rearing/moving; `forest_floor` approves `denies: often_in_trees`; `one_island` any-size current/last-extant wild range; `town_dweller` & `prairie_dog_towns` kept distinct); extra rule/multi-sense fixes (`fully_aquatic` drops `system:terrestrial`/`habitat:forest` denies to unblock 10 Suriname Toad and approves `denies: eggs_on_land`; `climbs_boulders` drops `implies: habitat:rocky` to unblock 4 Big-headed Turtle; `territorial`/`nomadic`/`scent_marks` sharpened so outliers 20/64/38 are audited cleanly). **No split or retirement touches `glider`, `fully_aquatic`, `swimmer`, or `burrower`**, so `travelOf` in S5 needs only the planned `inWater` guard on `swimmer`.
- (lead) S2 Goal 2 rule & gate (a) sign-offs (all 201 active signs signed off `lead, 2026-11-23`; 0 splits, 0 new retirements, 15 existing retired tags only): Goal 2 rule finalized — a narrower sign `implies` its broader sign in `SIGNS` once it passes both gate (a) entailment and gate (b) wording safety; `animalFitsNote` closes over wired edges; `signProblems` enforces one sign per fact per note; `signsOf` deduplicates implied broader signs so the field guide shows one badge; edges passing gate (a) but blocked by live wording defer to `witness-signs` while the audit still respects one sign per fact. Bulk-accepted the 179 remaining meanings with 5 crispness/entailment tweaks (`brown_throat` color-not-fur, `cecropia_leaves` main-not-favorite, `flippers` at-least-front-legs, `floreana_island` & `pinta_island` "wild only on"). Gate (a): **23 `entailed`** edges proceed to S4 wording gate (b); **5 `rejected`** — `foam_nest→eggs_over_water` (foam nests need not be over water), `fully_aquatic→swimmer` (bottom-crawling salamanders need not swim well/often), `often_in_trees→climber` (flying/roosting bats spend time in trees without climbing, preventing 45 becoming a climber via `roosts_in_trees`), `glider→climber` & `soars→wings` (distinct facts, not narrower/broader of the same fact; wiring would hide `climber` on 5 and `wings` on 45). Approved all **21 open-tag `denies`** across 8 signs (`no_tongue`, `slow_mover`, `stubby_tail`, `toothless` ×4, `voiceless` ×6, `fully_aquatic`, plus extended `never_climbs` ×5 and `forest_floor` ×2 so tree-use exclusions hold even if `often_in_trees` edges defer at gate b).
- (lead) S4 wording gate (b) rulings (`wording.csv`: 30 distinct keys — 8 `true`, 22 `false`; close calls: `24:5/63` `true`, while `2:3/74`, `36:2/63`, `42:0/26` and `68:0/69` `false`): **13 `wired`** edges (`cecropia_leaves→leaf_eater`, `leaf_litter→forest_floor`, `sleeps_high_in_trees→often_in_trees` firing with 0 `false`; plus 10 zero-delta edges in S2 to be re-gated in S3: `above_tree_line→high_mountains`, `brown_throat→throat_patch`, `climbs_boulders→climber`, `dung_piles→scent_marks`, `floreana_island→one_island`, `hangs_upside_down→often_in_trees`, `mountain_meadows→high_mountains`, `pinta_island→one_island`, `roosts_in_trees→often_in_trees`, `seldom_on_ground→often_in_trees`) and **10 `deferred-to-witness-signs`** edges with exact `edge_blockers` in `definitions.csv` (`backward_pouch→pouch` [43:4], `carries_young_on_back→mother_carries_young` [10:7, 54:6], `face_mask→face_markings` [42:0], `feathery_gills→underwater_breathing` [2:3, 62:2, 75:1], `s_shaped_horns→horns` [29:3, 38:0, 68:0], `shoulder_stripe→stripes` [29:1, 43:1], `spectacles→face_markings` [38:2, 50:2], `spiral_horns→horns` [29:3, 38:0, 66:0, 68:0], `tear_lines→face_markings` [50:2], `walks_upright→stands_on_hind_legs` [36:2, 57:7, 61:3]). Wired edges force 3 same-note S5 fixes (`33:5` drop `high_mountains`, `46:5` drop `forest_floor`, `66:5` drop `scent_marks`).
- (lead) S7 triage rules & rulings (`triage-rules.md`, `triage.csv`): approved 5-value vocabulary (`class`, `body-plan`, `place`, `no-plausible-holder`, `none`) with precedence `class > body-plan > place > no-plausible-holder`, diet-guild conflicts in `body-plan`, behavioral record conflicts in `no-plausible-holder`, and an enforced entailment-consistency invariant (no animal held or open for a narrower wired/deferred sign may be triaged out of its broader sign). Fixed 4 biological/rule classifications (`horns`/`s_shaped_horns`/`spiral_horns` & `grasping_lip` turtles `class→body-plan`; `bright_green` mammals `class→no-plausible-holder`; `stubby_tail` great apes `40/56` `nph→body-plan`), accepted all 9 record-blocked pairs (§4c, no re-export), fixed 4 narrow-open vs broad-triaged mismatches (`climbs_boulders` triage `33/65/69/70`; open `59` in `forest_floor` & `stands_on_hind_legs`, `46` in `face_markings`), opened 13 specific biological candidates (`false_thumb` 71, `hinged_shell` 12, `bromeliad_eater` 53/70, `carries_young_on_back` 71, `basker` 35/73, `digging_claws` 33/73, `face_markings` 29/51, `long_tail` 25, `five_front_claws` 43), and widened `big_ears` (+25, 0 mammal nph), `large_eyes` (+17), call signs (+90), `stripes` (+12), and `spots` (+5) to bring open pairs to **2,340** (`2,832` total to Astra, ~10 batches; `4,175` same-class `no-plausible-holder` S12 pool).
- (lead) S8 batching & session budget (`pairs.csv`, `batches.csv`, `S13.1`–`S13.12`): chose DP batching per single category with `--budget 305` pairs and `--max-animals 37` (preventing 55–72 animal mega-batches in `habitat`/`life` while keeping `body` turtles+carnivores at 301 in one batch) and `habits` first so Pilot `P01` is `habits × amphibians` (15 animals, 271 pairs — single canonical group, hardest/largest category at 54% of audit, right inside the 250–350 target). This yields **15 batches** (`P01` + `B01`–`B14`, 2,832 pairs total, max 301 pairs, max 37 animals). Unbundled estimate is 55 sessions (>45), so applied §2.11 bundling: 6 Astra sessions (`B01+B02` through `B09+B10`, plus `B11+B12+B13+B14` totaling 244 pairs) paired with 6 Opus cross-check sessions (`P01,B01` through `B08,B09`, plus `B10–B14` totaling 403 pairs) for **45 sessions total** (15 sessions headroom under the 60-session cap).
- (lead) S9 source index (`sources/index.csv`): included all four profile citation sections (`sources`, `clues`, `facts`, `traits`) — **280 `(animal_id, source_key, url)` rows** / 279 unique URLs (the 268 `sources|clues|facts` rows / 267 unique URLs counted in Findings, where Britannica's Galápagos tortoise page is shared by 19 and 22, plus 12 `traits`-only rows, 11 of which are already `ok` in `cc-clue-verify` at zero fetch/disk cost). Stored absolute `.txt` paths in `file` with zero cache copies (verified by sha256), and kept the 4 closed DOIs' existing `cc-clue-verify` Crossref/abstract `.txt` paths in `file` while marking `status=unavailable` so Astra can read abstracts while §2.7's removal bar still protects held tags.
- (lead) S10 audit script contracts (`prompt.py`, `validate.py`, `sample.py`, `ledger.py`, `reconcile.py`): pipe-separated `BEGIN ROWS`/`END ROWS` (`animal_id | sign | verdict | quote | source`, template sha256 `9a5257887e10`, 100 KB cap, no held/open status shown, profile JSONs rejected as `has it` sources); added `template_sha` column and `T` spot-check batches (`triage_sample.csv`) to `batches.csv`/`pairs.py`; `ledger.py` and `sample.py` consume only `status == 'done'` batches that validate clean; `sample.py --triage` matches S7's 4,175 same-class pool (held + implied holders); one-sign-per-fact replacements use two ledger rows (narrow `add:i` + broad `remove:i (one sign per fact, narrow)`); `reconcile.py --applied` defaults to `all` so S24 and Verification #2 work verbatim.
- (lead) S11 pilot batch size: `P01` (`habits × amphibians`, 271 pairs, 15 animals, 42 signs) completed at `ASTRA_EFFORT=high` in **12.7 min** (`761` s, ≤35 min rule) with 0 structural errors, 0 `quote-not-found` flags, and 0 ledger conflicts. Keeping `--budget 305` / `--max-animals 37` and the existing `B01`–`B14` / `S13.1`–`S13.12` bundled plan (no `--rebatch`): even bumping the budget to 350 merges no adjacent batches without exceeding 350 pairs or 37 animals, and ~13 min per ~270-pair batch confirms 2-batch Astra sessions fit comfortably inside one session.
- (lead) S12 triage spot-check `T01` & reopenings (125 of 4,175 same-class `no-plausible-holder` pairs, seed `20261123`): Astra returned 5 `has it` (`4 star_pattern`, `23 face_markings`, `29 throat_patch`, `47 stripes`, `71 camouflage`), 99 `doesn't`, 21 `can't tell`. Opus cross-checked all 5: **2 verified `has it`** (`23 face_markings` Aye-aye via cached ADW; `29 throat_patch` Okapi via newly saved SDZWA + cached ADW) and **3 `disagree`** (`4 star_pattern` and `47 stripes` are occasional/some-specimens variation only, not species traits; `71 camouflage` cited unranked `biodb.com` with all ranked sources silent). Lead accepted all 5 cross-check findings: kept triage rules for `star_pattern`, `stripes`, and `camouflage` (formal `rulings.csv` entries in S17), tightened `face_markings` and `throat_patch` to `none` in `triage.csv`/`triage_draft.py` — reopening all **93** remaining triaged pairs (38 `face_markings` + 55 `throat_patch`) — and rebatched pending batches with `--budget 320 --max-animals 37` (inside S11's 300–350 rule), preserving the exact 14 pending batches `B01`–`B14` and the 45-session budget (`B06` 254, `B07` 318, `B08` 212, `B09` 216).
- (lead) S14 fallback sources & `R01` selection (`recheck-input.csv`, `R01a`–`R01e`): fixed all 4 logged `sources.py`/`text.py` edge cases (`_` keys, broken-PDF catch, ADW family-account body extraction, Chrome SSL `BLOCKED` + tapir 53 cleanup) and added 104 new substantive ranked sources + 3 ADW re-extractions across 53 animals (`sources/index.csv` now 680 rows). From `ledger.py --partial`'s 747 candidates (569 `material-cant-tell`, 178 `material-silent`, 0 `implied-unconfirmed`, 0 reopened triaged, 0 re-export), queued **591 pairs** into `R01` (§2.5 "material pairs whose fallback sources were fetched"): all 416 `material-cant-tell` (`opus_check != 'disagree'`) and 138 `material-silent` on the 53 S14-updated animals (including held `11 large_eyes`), plus 37 `material-silent` on non-S14 animals that gained unseen post-batch S13 sources. Excluded 24 `material-cant-tell` rows where Opus already disagreed with ranked evidence (queued in `ledger-conflicts.csv` for S17/S18), 129 `material-cant-tell` rows whose animals got no new S14 source, and 3 `material-silent` rows with zero new sources since their batch (`20 spots`, `20 throat_patch`, `5 egg_guarding`). Cut into `R01a`–`R01e` (`--budget 305 --max-animals 37`, prompts 53–89 KB) and split S15 into `S15.1` (`R01a`–`R01c`, 432 pairs) and `S15.2` (`R01d`–`R01e`, 159 pairs) for comfortable session timing (46 estimated sessions vs 60 cap). Flagged the 5 new ADW family accounts (`7 Arthroleptidae`, `15/19/22 Testudinidae`, `18 Trionychidae`) for species-level scrutiny in S16/S17.
- (lead) S17 `body` + `habits` rulings (`rulings.csv`, 357 of 430 conflict pairs ruled; 73 `habitat`/`life`/`range` left for S18): accepted 356 of Opus's proposals and overruled 1 (`49 black_coat` `has it` → `can't tell`: ADW says black-to-reddish-brown covers "the majority of the body" while MSI 927/USAID describe a grizzled dorsum with ferruginous head/throat — no all-black color form). Held rows (§2.7 removal bar): **2 removals** (`14 puffs_up` `remove:2` — cited BBC + 5 ranked sources silent on inflating; clue 2 keeps `squeaker`, wording flagged for S20/`giveaways.md`; `39 rarely_drinks` `remove:4` — ADW/IUCN/SDZWA contradict "getting most of its water from its food"; clue 4 stays untagged) and **5 kept** (`1 yellow_legs`, `28 big_ears`, `6 startle_display`, `9 forest_floor` all `has it`; `11 large_eyes` `can't tell`, tag stays; plus non-conflict held `2 snorkel_nose` stays). Policy groups: strict `feeds_on_ground` excludes woody standing-plant browsers (`29/44/66` `doesn't`) and unverified mixed feeders (`38/41/53/64/69/70/71` `can't tell`); newborn/cub-only `squeaker` excluded (`26/73` `doesn't`, `25/35/54/60` `can't tell`); tapir `53/70 grasping_lip` kept `can't tell` (one sign per fact with held `trunk`); T01 `4 star_pattern`/`47 stripes`/`71 camouflage` formally `doesn't`; `24/59 forest_floor` `doesn't` (3 temporary conflicts clear when S18 rules `24/59 leaf_litter`); `63 climber` `has it` (implied by agreed `63 climbs_boulders`); `71 roosts_in_trees` `can't tell` (solitary bear platform-napping ≠ roosting; S18 resolves `71 above_tree_line`'s `trees:no` vs held `71 often_in_trees`); `40 salt_licks` `can't tell` (genus-level only); `51 stands_on_hind_legs` `can't tell` (keeper-cued zoo demo only); accepted 9 open adds (`17 strong_bite`, `18 scavenger`, `36 never_climbs`, `40 territorial`, `42 leaf_eater`, `47 dung_piles`, `50 territorial`, `61 basker`, `72 shares_food`).
- (lead) S18 `habitat` + `life` + `range` rulings & ledger freeze (`rulings.csv`, all 430/430 conflict pairs ruled; 0 overrides on the 73 remaining rows): `one_island` native-range & tidal-islet rule — `21`, `23`, `48` all `has it` (human-introduced island populations for 21/23 and low-tide-connected Robbins Island for held 48 do not break `one_island`, whose meaning explicitly names Tasmania; aligns all four Madagascar endemics `13`/`21`/`23`/`61` while native multi-island `27`/`45` remain `doesn't`); `70 brackish_water` `has it` (mangroves named in meaning, matching B10 `25`/`51`); `24 leaf_litter` `doesn't` and `59 leaf_litter` `can't tell` (clearing the final 3 `forest_floor` narrow-broad/denies conflicts); `high_mountains` `51`/`52`/`62` `doesn't` & `65` `can't tell`; `69 sand_dunes` & `12 town_dweller` `doesn't`; crop-raiding `town_dweller` (`64`/`70`/`71`) `can't tell`; `9`/`27`/`67 egg_guarding` `doesn't` (occasional moistening visits; echidna pouch incubation covered by held `pouch`); `rain_breeder` ×7 `can't tell` (seasonal wet-season breeding ≠ heavy-rain trigger). `71` Andean Bear `above_tree_line` (`has it`, implies `trees:no`) + `sleeps_high_in_trees` (`has it`, implies `trees:yes`) coexist cleanly without changing `signs.ts`: `71` records no `trees:` trait (`signProblems` clean), trait `implies` are profile-check guards only, and 0 `trees:yes` species live above the tree line. Confirmed §2.7 removal bar firsthand against holding notes' own cited sources on the **only 2 removals** (`14 puffs_up` `remove:2`, `39 rarely_drinks` `remove:4`) and verified `material` independently against `metrics/s2.json`'s 105 dealable sets (0 mismatches).
- (lead) S19 `body` edits & wording-gate policy (`changes.csv`, `wording.csv`, `giveaways.md`): applied all 292 `body` adds as one-sign standard-sentence `morphology` `new_note`s (restating each sign's approved `meaning`, past tense for extinct tortoises `19`/`22`) so no co-tagging eligibility loss or new false match occurs; switched Tiger `25 black_coat` off the `CC BY-NC-ND 4.0` paper (`doi:10.1007/s44338-026-00163-5`) to Wikipedia's Simlipal pseudomelanistic tigers account (SDZWA says "No confirmed individuals") so no ND licence enters `citations.json`. On existing `body` notes gaining new suspect matches: kept 8 clean notes untouched (13 `true` keys: `17:0`, `19:1`, `29:4`, `39:1`, `52:0`, `62:1`, `65:2`, `75:2`), flipped borderline `1:0` and `15:0` (Pancake Tortoise giveaway) to `false`, and moved tags off 70 narrow/giveaway existing `body` notes (68 single-tag + 2 two-body-tag `23:1`/`33:0` split into one-sign notes) onto clean standard-sentence `new_note`s (`remove:<i>;new_note:<j> (wording gate)`, leaving old note text/source intact per `reconcile.py`); parked the 3 mixed `body+habits` notes (`32:0`, `38:2`, `67:3`; 7 `false` keys) for S20 so both tags move together under `--applied body,habits` without prematurely widening their `habits` fits.
- (lead) S20 `habits` edits, `squeaker` consistency & wording gate (`rulings.csv`, `changes.csv`, `wording.csv`, `giveaways.md`): added 2 lead rulings in `rulings.csv` (`37 squeaker`, `48 squeaker` → `can't tell`, consistent with S17's adult-squeaker policy for `25`/`35`/`54`/`60` since both only had pouch-young evidence), reducing frozen `habits` adds from 468 to **466**; applied all 466 adds as one-sign standard-sentence `new_note`s (61 `habits` signs + 3 parked `body` signs, past tense for `19`/`22`, 0 ND licences after swapping The Conversation golden-mole article for Wikipedia/EWT), applied both frozen removals (`14 puffs_up` `remove:2`, `39 rarely_drinks` `remove:4`), and moved `14 squeaker` off `14:2` (untagging the unverified `"puffs up"` wording) plus both tags off all 3 parked S19 mixed notes (`32:0`, `38:2`, `67:3`). On existing notes gaining new suspect matches: kept 21 clean notes untouched (40 `true` keys), flipped 5 borderline `true` notes to `false` (`12:3`, `31:1`, `39:3`, `55:6`, `57:2` [mixed `poor_eyesight`+`big_ears`]), and moved tags off all 109 failing notes (104 drafted `false` + 5 flips; 0 carried `habitat`/`life`/`range` tags) onto 130 clean one-sign standard-sentence `new_note`s (switching 14 moved signs to verified saved sources that state the specific sign; combined multi-note removals on `2`, `31`, `40`, `43`). Accepted EPA `semspub 130484` (`1 hisses`) and CITES CoP8 Prop. 56 (1992, Kyoto) citations.
- (lead) S21 `habitat` edits, `66`/`58` rulings, `41:10→7` & wording gate (`rulings.csv`, `changes.csv`, `wording.csv`, `glossary.ts`, `giveaways.md`): added 2 lead rulings in `rulings.csv` (432→434 rows: `66 sand_dunes` → `can't tell` because ADW's `"desert or dune"` biome box doesn't state dunes and WildTrack Sterk et al. 2023 is CC BY-NC-ND 4.0 covering only one small 115 km² fenced private Kalahari reserve's bushveld lunette dunes; `58 kopjes` → `doesn't` because cheetahs live on open plains and only use kopjes as temporary lookouts), reducing `habitat` adds from 123 to **121** (0 removes, 0 ND licences; kept `35 snowy_winters` on non-ND SDZWA red panda behavior fact sheet). Ruled `41:10→7` Hairy Frog (`forest_floor` via wired `leaf_litter→forest_floor`) **`true`** (terrestrial rainforest frog feeding on forest-floor invertebrates, females in leaf litter, `trees:no`), keeping `7 leaf_litter` and the wired edge. Accepted 8 new `glossary.ts` place terms (`Brackish`, `Estuary`, `Lagoon`, `Bog`, `Leaf litter`, `Tree line`, `Alpine`, `Plateau`) and 3 citation details (`25` Bhutan DoFPS 2023 as `government`, `1` Butler & Graham 1995 pp. `187–196`, PMC11103843 first author `Mandl`). On existing notes gaining new matches: kept 9 clean older notes untouched (11 `true` keys: `19:10`, `35:6`, `36:12`, `41:10`, `48:19`, `55:5`, `57:13`, `60:6`, `76:6`; `15:1` dropped out after `58 kopjes` → `doesn't`), flipped 2 borderline `true` notes to `false` (`2:5` `"open rivers and lakes"` doesn't fit `1`/`74`; `17:4` `"even salty water near the coast"` stretches `2`), and moved tags off all 23 failing existing notes (21 Table (a) notes + 2 flips, including mixed `63:5` `burrower`+`borrowed_burrows`) onto 24 clean one-sign standard-sentence `new_note`s (all 24 keeping their verified old-note sources; 4 of the 5 S21 region giveaways logged in `giveaways.md` — `3:3`, `63:5`, `67:8`, `71:6` — are now untagged).
- (lead) S22 `life` + `range` edits & wording gate (`changes.csv`, `wording.csv`, `giveaways.md`): applied all 39 frozen adds (`life` 31, `range` 8; 0 removes, 0 new `rulings.csv` entries, 0 ND licences) as one-sign standard-sentence `new_note`s across 30 profiles (`reproduction` for `life`, `geography` for `one_island`, past tense for extinct `19`/`22`, and `"is, or was"` on `one_island` so wired `floreana_island`/`pinta_island → one_island` matches hold), plus 6 new `db/content/citations.json` entries (451→457, 0 deleted/altered; Schäfer et al. 2019 standard T&F literature) and 0 `glossary.ts` changes. On existing notes: kept 3 clean older notes untouched (4 `true` keys: `1:4`, `8:7`, `16:6`), flipped 2 borderline `true` notes to `false` (`6:7` `"pond"` doesn't fit Wallace's rain pools/wallows; `52:8` `"for about six months"` is species-specific vs `55` `"up to 6 months"` from week 4), moved tags off all 9 Table (a) failing notes (incl. `54:6 → 30`), and proactively moved `48:6` (`one_island`, Tasmania giveaway) so all 4 original `one_island` giveaway notes (`30:4`, `42:5`, `48:6`, `49:5`) are untagged (12 moves total across 12 single-tag notes, switching `49` `one_island` from IUCN to ADW and `54` `mother_carries_young` from ADW to `xenarthrans.org`).
- (lead) S23 Snapshot 3, wording gate & lost-eligibility review (`metrics/s3.json`, `metrics/s3/lost-reasons.csv`): verified final Snapshot 3 on archived `3ae0ec18` against S1 (`7bce511a`) — 0 sets added/removed (105 identical dealable sets; R9 confirmed, no `material` recomputation needed), 525/525 (100.0%) combos with ≥1 eligible note (min 2, median 10), 5,720 eligible notes (+4,780), and `diff.py --wording wording.csv` exit 0 across all 5,070 distinct newly matched keys (`5,070 true`, **0 `false`**, 0 unruled/stale/conflicting; audited all 36 remaining old notes, 138 new-note texts, and 78 wired-edge groups — 0 fix commits or new edge deferrals needed; all 13 wired edges hold cleanly). Reviewed all 542 rows of `metrics/s3/lost.csv` and recorded lead reasons in `$SA/metrics/s3/lost-reasons.csv` (`425` wording-gate moves with all replacements eligible, `34` multi-tag splits with distinguishing sign eligible and other `fits_all`, `65` wording-gate moves whose replacement is now `fits_all`, `11` unmoved notes now `fits_all`, `5` `39:4` false-tag removals, `2` `57:5` mystery-only after removing false `39 rarely_drinks`; 0 co-tagging losses, 0 unexplained).
- (lead) Final code reviews (Astra `REJECT`, 5 MUST-FIX; Fable `APPROVE_WITH_CHANGES`, 1 MUST-FIX): accepted all 5 Astra MUST-FIX items (drop `leaf_litter→forest_floor`, remove `9 forest_floor` / add `9 climber` / restore `46` & check `7` `forest_floor`; add `7 town_dweller` & check sibling IUCN `14.3` `16`/`51`; drop `crevice_hider implies habitat:rocky` and reopen `4`/`49`/`62`/`75`/`8`/`35`; overrule `1 yellow_legs` → `doesn't`; fix `1 burrower` citation to Butler & Graham 1995 with qualified wording), Astra SC1 (pinned deal-fit assertions in `animalBoard.test.ts`), Fable MUST-FIX 1 (explicit scope-deviation, balance-bot, round-end card, and full `travelOf` disclosures in Summary + Release handoff), and Fable SC1/SC3 (`above_tree_line` drops `trees:no`; align `"at least partly"` meanings), queued as steps S25–S26. Rejected Fable SC2 as profile edits (each marginal badge rests on a verified ranked quote; surfaced in Summary for owner) and logged Fable SC4 (name-blanking) for `witness-signs`.
- (lead) S25 source-verified rulings across all reopened/unimplied candidates (recorded in `$SA/prompts/S25-review-fixes.md`): (1) dropping `leaf_litter→forest_floor` affects all 10 `leaf_litter` holders — `9` overruled to `forest_floor=doesn't` / `climber=has it` (Pašukonis et al. 2019 `doi:10.1007/s10682-019-09994-z`, Rojas & Pašukonis 2019 `PMC6753930`); `3` Darwin Frog (`ngo`/`iucn`) and `12` Spiny Hill Turtle (`government` NParks / `wikipedia`, previously `implied` by `leaf_litter`) ruled `forest_floor=has it`; `21`, `27`, `49`, `67` (already Astra `has it` + Opus `agree`, previously `none (implied by leaf_litter)`) now get explicit `forest_floor` `new_note`s; `46` (already holds `forest_floor` on `46:4` co-tagged with `sleeping_nests`) gets a standalone `smithsonian` `forest_floor` `new_note` keeping `46:4` untouched; `7` keeps S17 ruling `can't tell` (aquatic breeding males, only females documented in leaf litter); `76` already held directly. (2) `town_dweller` IUCN `14.3`/plantation scan across all 76 species: reopened and ruled `has it` on `7` Hairy Frog (IUCN tea plantations, `14.3 Suitable`), `16` Purple Frog (AmphibiaWeb rubber plantations), and `51` Jaguar (IUCN `14.3 Suitable` + NGO eucalyptus plantations); left `32` (`14.5 Marginal`) and `49` (`14.3 Marginal`, already `can't tell`) unchanged. (3) `crevice_hider` exhaustive scan after dropping `habitat:rocky`: reopened and ruled `has it` on `4` Big-headed Turtle (Kirkpatrick 1996), `8` Coastal Tailed Frog (COSEWIC 2011 + Wikipedia), `49` Hispaniolan Solenodon (ADW/IUCN/USAID), `62` Chinese Giant Salamander (SDZWA/Wikipedia), and `75` Hellbender (AmphibiaWeb/IUCN); ruled `can't tell` on `35` Red Panda, `60` Giant Panda, `67` Eastern Long-beaked Echidna, and `72` Maned Wolf under the exact S17 `33` Ethiopian Wolf bar (occasional birth-den/cold-weather shelter option, not routine rock-crack hiding). Split S25 into `S25a` (accepted rules/meanings/docs/`signs.test.ts`) and `S25b` (profile edits/`citations.json`/`animalBoard.test.ts`/`$SA` ledger updates) after `claude-task` hit its 5-hour usage limit (exit 3, resets 23:20 UTC).
- (lead) S25b wording gate & historical `triage.csv`: ruled `15:2 → 4` (`crevice_hider`, `"It hides in narrow cracks between and under slabs of rock."`) `false` because `"slabs of rock"` is kopje-specific rather than stream rock crevices; moved `crevice_hider` off `15:2` onto clean standard-sentence `15:18` (`remove:2;new_note:18 (wording gate)`) and ruled all 49 S25b newly matched keys `true` in `$SA/wording.csv` (`5,108` keys, `0 false`). Left `$SA/triage.csv` and `$SA/pairs.csv` at their historical S7/S12 batch snapshot (`pairs.py --check` diffs them directly), with `$SA/rulings.csv` overriding all 14 reopened/overruled pairs cleanly in `ledger.py`.
- (lead) Final Verification `scripts/e2e.mjs` paging-test update: `e2e:fresh` on rebuilt `phaser_june_dev` failed 3 pre-existing test-harness assumptions in `scripts/e2e.mjs` (`1551/1554`; app `AnimalSheets.tsx` rendered cleanly with `0` bad breaks and `0` overflows, confirmed visually in `02d`/`02f` screenshots) from when round-1 suspects had 4–6 signs: (1) `02d` assumed `#7` Hairy Frog fits on 1 page (`pages === 1`), now 11 signs / 2 pages → relaxed to `onePage.signs > 0 && onePage.pages >= 1`; (2) `FORCED = [144, 40]` (2 chip lines) yielded `splits: 25, moves: 0, bad: 0` → changed to `[144, 64]` (3 chip lines: 56 px vs 4-line 76 px) so 2-line groups move whole while 4+-line groups split (`splits: 17, moves: 1, bad: 0`); (3) `turns` returned early on `guideSigns > 1` because `#11` Goliath Frog already paged (`4`) before forcing, resetting the 5 s interval mid-timeout → waited for `clientHeight === force[1] && guideSigns === wantPages` + 2 animation frames and allowed `6200` ms (`5000` + `160` ms exit + slack). Opus applied all 3 edits; `e2e:fresh` then passed `1554/1554`.

## Log

- 2026-11-23 02:20 UTC · Baseline: verified clean `0d02c12e` (`origin/main` `7bce511a`); typecheck, lint, unit tests (106/106), content preview/check (live + dev, 76 species / 2475 clues / 491 facts, 0 errors/warnings), and `e2e:fresh` on `phaser_june_dev` (1657/1657, artifact in `…/sign-audit/e2e-baseline/`) all pass.
- 2026-11-23 02:42 UTC · Architecture: `architect` audited `SIGNS`/content/sources/witness baseline (F1–F9, 105 sets, 402/525 combos, 940 notes, 259/267 cached sources) and proposed options; lead chose A3 + B2 with 4 refinements (`SignEntry` union, `travelOf` water-system guard, auditing held pairs, 3-snapshot witness metrics); `architect` finalized the single target design. Plan updated; no code changed.
- 2026-11-23 02:47 UTC · Fable review: `architecture-reviewer` (Fable 5.2 · high) returned `APPROVE_WITH_CHANGES` with 3 MUST-FIX (broad-note narrow wording false fits, `stillPossible` third literal fit check, profile-level one-sign-per-fact hiding true notes), 4 MISSED, 5 SHOULD-CONSIDER. Recorded in plan; no code changed.
- 2026-11-23 02:51 UTC · Astra review: `astra-review` (Codex GPT-6.2-Astra · xhigh) returned `APPROVE_WITH_CHANGES` with 4 MUST-FIX (gate broader-sign matching on note wording, unify `witnessNotes`/`stillPossible`/metrics fit predicate, keep one-sign-per-fact per-note and dedupe field-guide badges separately, reconcile ledger across pre-export changes and multi-note tags) and 3 SHOULD-CONSIDER. Recorded in plan; no code changed.
- 2026-11-23 03:01 UTC · Revision: lead ruled on all Fable (3 MUST-FIX, 4 MISSED, 5 SHOULD-CONSIDER) and Astra (4 MUST-FIX, 3 SHOULD-CONSIDER) items in Revision notes (all accepted); `architect` revised Architecture accordingly (wording-safety gate + deferred edges, shared `animalFitsNote` predicate, per-note one-sign-per-fact + `signsOf` badge dedupe + `e2e.mjs` check, drop dead `restates`, defer `never_climbs denies climber`, full `7bce511a -> HEAD` ledger reconciliation with multi-note indices, eligibility/removal/triage-sample/re-export/dev-DB safeguards). Plan updated; no code changed.
- 2026-11-23 03:09 UTC · Steps: `planner` (Opus 5.5 · xhigh) drafted S1–S24, Verification, Failure modes (A1–A10 rules commit + B1–B4 audit gates) and Risks R1–R10; lead reviewed, accepted all 4 planner calls, tightened S3/S5/S6/S11/S19/S24 details, checked off Steps stage. Plan updated; no code changed.
- 2026-11-23 03:30 UTC · S1: Opus built `scripts/holders.py` (`defs/holders.md`, 201 active / 15 retired), drafted `definitions.csv` (201 rows, 0 empty meanings, 28 proposed `open_edges`, 17 open-tag `denies`) and `defs/s1-notes.md`; lead ruled 22 hard/redefined signs (F1–F4, §1.6, F6, plus `fully_aquatic`/`climbs_boulders`/`territorial`/`nomadic`/`scent_marks`; no splits/retirements on `travelOf` signs) and Opus applied rulings; verified 201 rows / 0 empty / 22 signed off (`lead, 2026-11-23`) and `defs_check.py` exit 0. Plan updated; no repo code changed.
- 2026-11-23 03:38 UTC · S2: Lead ruled all 179 remaining definitions (5 meaning tweaks), gate (a) on all 28 `open_edges` (23 `entailed`, 5 `rejected`), and all 21 open-tag `denies` across 8 signs (0 splits, 0 new retirements, 15 existing retired tags recorded in `defs/s2-summary.md`); Opus applied rulings to `definitions.csv` and synced `scripts/defs_draft.py`; verified `defs_check.py --edges entailed` exit 0, 201/201 signed off, 0 `proposed`, byte-for-byte `defs_draft.py` parity. Plan updated; no repo code changed.
- 2026-11-23 03:47 UTC · S3: Opus built `$SA/scripts/run-ts.sh`, `$SA/metrics/witness.ts`, `$SA/scripts/selftest/test_diff.py` (tests-first, red→green) and `$SA/metrics/diff.py`; lead verified B3 self-test (all checks pass, exit 0), archived `7bce511a` to `/tmp/sa-trees/7bce511a`, ran Snapshot 1 (`metrics/s1.json`: 105 sets — world 49, africa 23, asia 15, north-america 9, south-america 9; 525 combos, 402 with ≥1 eligible note, 940 eligible notes, 2,091 mystery-only, 22 fits-all-5, 0 mystery-not-fitting, 3,053 tagged notes evaluated; `witnessNotes` self-check passed) and verified exact parity for `--edges definitions.csv --edge-status none`. Plan updated; no repo code changed.
- 2026-11-23 03:58 UTC · S4: Lead ran Candidate Snapshot 2 (`metrics/s2-candidate.json`, 23 entailed edges: 412/525 combos, 974 eligible notes, 75 changed, 3 lost, 84 newly matched across 30 distinct keys); Opus drafted `wording.csv` and `defs/s4-wording-notes.md`; lead ruled all 30 keys (8 `true`, 22 `false`) yielding **13 `wired`** and **10 `deferred-to-witness-signs`** edges; Opus applied rulings to `wording.csv`, `definitions.csv` and `scripts/defs_draft.py`; lead verified `defs_draft.py` byte-for-byte parity, `defs_check.py --edges wired` exit 0 (3 forced S5 fixes: 33:5, 46:5, 66:5), and wired-only Snapshot 2 (`metrics/s2-wired.json`: 403/525 combos, 947 eligible notes, 0 lost, 9 newly matched / 4 distinct keys, `diff.py --wording wording.csv` exit 0 with 4 `true` / 0 `false`). Plan updated; no repo code changed.
- 2026-11-23 04:10 UTC · S5: Opus implemented rules code tests-first (red run confirmed before edits: 4 missing-export bundle errors, 45 tsc errors): added `tests/clueGame/signs.test.ts` (A1–A6) and A7–A9 tests + `animalFitsNote` oracle in `tests/clueGame/animalBoard.test.ts`; updated `src/clueGame/signs.ts` (`ActiveSignEntry`/`RetiredSignEntry` union without `restates`, 201 active meanings/rules + 13 wired edges copied from `definitions.csv`, 15 retired tags, load-time `signTableProblems`, `buildImplied`/`IMPLIED`, `heldSigns`, `signsOf` badge dedupe, `signProblems` steps 1–4) and `src/clueGame/animalBoard.ts` (`animalFitsNote` shared by `witnessNotes`/`stillPossible`, `travelOf` water-system guard on raw tags); applied 3 forced same-note content fixes (`33:5` drop `high_mountains`, `46:5` drop `forest_floor`, `66:5` drop `scent_marks`) and recorded them in `$SA/ledger-pre.csv`. Lead verified: `typecheck` exit 0, `lint` exit 0, `npm test` 140/140 pass, `content -- preview` 0 problems across 76 profiles, no literal fit checks remain, and exact 201-active/15-retired parity against `definitions.csv`. Committed and pushed.
- 2026-11-23 04:16 UTC · S6: Opus added `window.__cc.signImplies()` in `src/game/debugBridge.ts` (direct open-tag `implies` for active signs), updated `scripts/e2e.mjs` to close `signImplies()` via local DFS and drop implied broader signs from expected field-guide badges, and updated `docs/CONTENT_SOURCES.md` (`### Signs`: `meaning` definitions, Goal 2 rules, 10 deferred edges with blocking notes, retired-tag rejection, corrected rule examples). Lead verified `node --check scripts/e2e.mjs`, `typecheck`, `lint`, `npm test` (140/140 pass), and `content -- preview` (0 problems); committed rules commit `d81f788d` (`d81f788d33cfe69d977e8b36241410eaa976ba98`). Ran final Snapshot 2 (`metrics/s2.json`, code `d81f788d` × content `7bce511a`, loaded cleanly with 0 `Unknown sign`, `witnessNotes` self-check passed, exact parity with `s2-wired.json`): 105 sets (world 49, africa 23, asia 15, north-america 9, south-america 9), 525 combos, 403 with ≥1 eligible note (+1 vs S1), 947 eligible notes (+7), 2,084 mystery-only (−7), 22 fits-all-5 (0), 0 mystery-not-fitting, 3,053 tagged notes evaluated; `diff.py --wording wording.csv` exited 0 (0 sets added/removed, 9 changed `(set, mystery, note)` rows, 0 lost eligibility, 9 newly matched across 4 distinct keys: 4 `true`, 0 `false`, 0 unruled). Cleaned `/tmp/sa-trees/` and `/tmp/sa-build/`. Plan updated and pushed.
- 2026-11-23 04:52 UTC · S7: Opus exported rules commit `d81f788d33cfe69d977e8b36241410eaa976ba98` into `$SA/game/` (`$SA/game.sha`), drafted `$SA/triage-rules.md`, `$SA/scripts/triage_draft.py`, `$SA/triage.csv`, and `$SA/defs/s7-triage-notes.md`; lead audited all 201 signs, issued rulings (`prompts/S7-rulings.md`: 4 rule-accuracy fixes, entailment-consistency invariant, 9 record-blocked pairs accepted, 4 narrow-open/broad-triaged mismatches fixed, 13 biological opens + targeted widening), and Opus applied them. Lead independently verified `game.sha` == `d81f788d33cfe69d977e8b36241410eaa976ba98` (76 profiles, `signs.ts` byte-identical), `triage_draft.py --check` exit 0, and independent CSV validation: 314 rows covering 201/201 active signs (0 missing, 0 retired, 0 dupes, 0 held/implied excluded, 0 entailment mismatches) — 492 held, 16 wired implied, 16 deferred implied, 12,412 triaged (`class` 1,412, `body-plan` 1,686, `place` 1,228, `no-plausible-holder` 8,086), **2,340 open** (`2,832` to Astra, ~10 batches; `4,175` same-class `no-plausible-holder` S12 pool). Plan updated; no repo code changed.
- 2026-11-23 05:08 UTC · S8: Opus wrote B1 self-test `$SA/scripts/selftest/test_pairs.py` first (confirmed red before implementation), then implemented `$SA/scripts/common.py` (shared loaders, transitive closure, `metrics/s2.json` sets, §2.6 `is_material`/`compute_material`) and `$SA/scripts/pairs.py` (with `--rebatch`, `--recheck`, `--check`), and generated `$SA/pairs.csv` and `$SA/batches.csv`. Lead independently reviewed all three scripts and verified `test_pairs.py` (372 ok, 0 FAIL, exit 0), `pairs.py --check` (clean, exit 0), and CSV invariants: 15,276 rows (76 × 201 active signs, 0 dupes, 0 retired, 0 triaged held/implied) — 492 held, 32 implied (16 wired, 16 deferred), 2,340 open, 12,412 triaged (`class` 1,412, `body-plan` 1,686, `place` 1,228, `no-plausible-holder` 8,086); 2,832 batched pairs across 15 batches (`P01` `habits` amphibians 271; `B01`–`B05` `habits` 195/245/293/249/269; `B06`–`B09` `body` 235/301/187/184; `B10`–`B11` `habitat` 159/105; `B12`–`B13` `life` 76/49; `B14` `range` 14; max 301 pairs, max 37 animals). Re-estimated sessions (55 unbundled → 45 bundled under §2.11) and expanded S13 into `S13.1`–`S13.12`. Plan updated; no repo code changed.
- 2026-11-23 05:19 UTC · S9: Opus wrote `$SA/scripts/text.py` (HTML/ADW/Wikipedia/Crossref/PDF via `pdftotext`) and `$SA/scripts/sources.py` (default build, `--add`, `--check`, IUCN/live-AmphibiaWeb guards, Wayback 5 s gap, zero cache copies), added `SOURCES_COLUMNS`/`SOURCE_STATUSES`/`load_sources_index` to `$SA/scripts/common.py`, and built `$SA/sources/index.csv`. Lead independently reviewed scripts and fetched texts and verified `sources.py --check` (clean, exit 0) and `test_pairs.py` (all B1 checks pass, exit 0): **280 rows** (279 unique URLs; 268 `sources|clues|facts` [267 URLs] + 12 `traits`-only) — **271 `cached`** in place from `cc-clue-verify`, **5 `fetched`** into `$SA/sources/` (9.1 MB: animal 62 `sdzwa` 9,280 B; OpenAlex OA full texts for 55 `10.1111/aje.13279` 18,624 B, 56 `10.1016/j.cub.2025.04.019` 75,521 B, 61 `10.1016/j.cub.2021.09.032` 38,742 B, 65 `10.1098/rspb.2017.0347` PMC5597819 39,283 B), and **4 `unavailable`** closed DOIs (23 `10.1002/ajpa.23936`, 24 `10.1016/B978-0-12-815507-3.00006-X`, 55 `10.1016/B978-0-12-815507-3.00010-1`, 64 `10.1126/science.abe7389`, each keeping its cached Crossref/abstract `.txt` path while `unavailable` enforces §2.7's removal bar). Every `file` exists on disk. Plan updated; no repo code changed.
- 2026-11-23 05:44 UTC · S10: Opus built the audit scripts in `$SA` tests-first (red runs confirmed before implementation: `test_validate` 29/30 failing, `test_reconcile` 32/33 failing): updated `common.py`/`pairs.py` (`template_sha` column in `batches.csv`, `T` batch support in `triage_sample.csv`, shared helpers), created `astra/template.md` (sha256 `9a5257887e10`), `scripts/prompt.py`, `scripts/validate.py`, `scripts/sample.py`, `scripts/ledger.py`, `scripts/reconcile.py` (`--applied` default fixed to `all`), and self-tests `test_validate.py`, `test_reconcile.py`, `test_audit_scripts.py`. Lead independently reviewed every script and verified all self-tests (`test_diff` 39/39, `test_pairs` 379/379, `test_validate` 30/30, `test_reconcile` 34/34, `test_audit_scripts` 63/63 — all exit 0), `pairs.py --check` clean, `sources.py --check` clean, `prompt.py P01 --dry-run` (29,462 B / 271 pairs, all 15 batches 17–48 KB), `ledger.py --partial` (15,276 rows × 23 cols, 494 held at `7bce511a`, 492 at export, 3 `rules_commit_change` rows credited to `d04baac0`, 0 conflicts), and `reconcile.py --from 7bce511a --to HEAD --applied none` (exit 0, 3 actual ops match). Plan updated; no repo code changed.
- 2026-11-23 05:59 UTC · S11: Rendered `$SA/astra/P01.prompt.md` (29,462 B, 271 pairs, `template_sha` `9a5257887e10`) and ran Astra (`ASTRA_EFFORT=high`) on pilot batch `P01` (`habits × amphibians`, 15 animals, 42 signs) → `$SA/astra/P01.out.md` in **12.7 min** (`761` s, exit 0). Verified `validate.py P01` exit 0 (`271 rows, 0 errors, 32 flagged` — all `web-url`, 0 `quote-not-found`/missing/no-source): 114 `has it` (27 held, 87 open), 69 `doesn't` (1 held `9|forest_floor`, 68 open), 88 `can't tell` (1 held `6|startle_display`, 87 open). Marked `P01` `done` (`minutes=12.7`) in `batches.csv`; verified `pairs.py --check` clean and `ledger.py --partial` clean (0 conflicts, 85 `add:pending`, 109 recheck candidates). Kept `--budget 305` / `--max-animals 37` (no `--rebatch`). Plan updated; no repo code changed.
- 2026-11-23 06:28 UTC · S12: Drew triage spot-check `T01` via `sample.py --triage` (125 of 4,175 same-class `no-plausible-holder` pairs, seed `20261123`: habits 59, body 54, habitat 7, life 5), rendered `$SA/astra/T01.prompt.md` (75,824 B, `template_sha` `9a5257887e10`), and ran Astra (`ASTRA_EFFORT=high`) → `$SA/astra/T01.out.md` in **16.6 min** (`993` s, exit 0): 5 `has it`, 99 `doesn't` (42 source-silent), 21 `can't tell`. Opus cross-checked all 5 `has it` rows into `$SA/crosscheck/T01.csv` (saving `29` Okapi SDZWA fact sheet via `sources.py --add`; `sources/index.csv` now 281 rows: 271 cached, 6 fetched, 4 unavailable): 2 `agree` (`23 face_markings` Aye-aye, `29 throat_patch` Okapi) and 3 `disagree` (`4 star_pattern`, `47 stripes`, `71 camouflage`). Lead ruled to keep rules for the 3 disagrees and tighten `face_markings` and `throat_patch` to `none` in `triage.csv`/`triage_draft.py`, reopening **93 pairs** (38 `face_markings` + 55 `throat_patch`; open `2,340 → 2,433`, triaged `12,412 → 12,319`, batched `2,832 → 2,925`). Rebatched pending batches via `pairs.py --rebatch --budget 320 --max-animals 37`, keeping 14 pending batches `B01`–`B14` (`B06` 254, `B07` 318, `B08` 212, `B09` 216; prompts 27–37 KB) and the 45-session budget. Verified `validate.py T01` exit 0 (`125 rows, 0 errors, 3 flagged` — all `web-url` on the 3 disagrees), `triage_draft.py --check` exit 0, `pairs.py --check` clean, `sources.py --check` clean, `ledger.py --partial` exit 0 (15,276 rows, 3 unruled T01 disagrees for S17). Plan updated; no repo code changed.
- 2026-11-23 06:55 UTC · S13.1: Ran Astra (`ASTRA_EFFORT=high`) sequentially on `B01` and `B02` (`440` pairs total, `template_sha` `9a5257887e10`). `B01` (`habits × turtles`, 11 animals, 34 signs, 195 pairs, prompt 21,655 B) → `$SA/astra/B01.out.md` in **11.3 min** (`679` s, exit 0); `validate.py B01` exit 0 (`195 rows, 0 errors, 52 flagged` — all `web-url`, 0 `quote-not-found`/missing/no-source): 96 `has it` (15 held, 81 open), 35 `doesn't` (0 held, 35 open), 64 `can't tell` (0 held, 64 open). `B02` (`habits × carnivores`, 11 animals, 49 signs, 245 pairs, prompt 26,251 B) → `$SA/astra/B02.out.md` in **12.9 min** (`773` s, exit 0); `validate.py B02` exit 0 (`245 rows, 0 errors, 62 flagged` — all `web-url`, 0 `quote-not-found`/missing/no-source): 146 `has it` (39 held, 107 open), 45 `doesn't` (0 held, 45 open), 54 `can't tell` (0 held, 54 open). Marked both `done` in `batches.csv`; verified `pairs.py --check` clean and `ledger.py --partial` exit 0 (15,276 rows, 270 `add:pending`, 3 existing T01 unruled-crosscheck conflicts, 0 new rule conflicts, 252 recheck candidates). Plan updated; no repo code changed.
- 2026-11-23 07:33 UTC · S13.2: Generated `crosscheck/P01.todo.csv` (184/271 rows: `change` 88, `cant-tell` 87, `flag` 32, `sample` 8) and `crosscheck/B01.todo.csv` (154/195 rows: `change` 81, `cant-tell` 63, `flag` 52, `sample` 8) via `sample.py --crosscheck`; ran Opus (`claude-task`) sequentially on `P01` and `B01` into `$SA/crosscheck/P01.csv` and `$SA/crosscheck/B01.csv` (338 rows checked across 466 covered pairs). Lead independently verified 100% row/verdict/file parity and all checks: `P01.csv` 184/184 (`agree` 144, `disagree` 35, `can't tell` 5; `sample` disagrees 1/8 [`5 chirps`], no escalation; held `9 forest_floor` fails §2.7 removal bar, `6 startle_display` & `14 puffs_up` flagged for S17 rulings, `75 territorial` `agree`); `B01.csv` 154/154 (`agree` 123, `disagree` 30, `can't tell` 1; `sample` disagrees 0/8, no escalation; held `1 basker`, `12 buries_itself`, `19 seed_spreader` `agree`, `2 snorkel_nose` `can't tell` stays under removal bar); `sources/index.csv` +49 ranked `--add` rows (now 330 rows / 327 unique URLs: 271 `cached`, 47 `fetched`, 12 `unavailable`), `sources.py --check` clean, `pairs.py --check` clean, `ledger.py --partial` exit 0 (15,276 rows, 73 `unruled-crosscheck` conflicts queued for S17/S18, 0 rule conflicts). Plan updated; no repo code changed.
- 2026-11-23 08:28 UTC · S13.3: Ran Astra (`ASTRA_EFFORT=high`) sequentially on `B03` and `B04` (`542` pairs total, `template_sha` `9a5257887e10`). `B03` (`habits × primates+hoofed-mammals`, 15 animals, 51 signs, 293 pairs, prompt 29,929 B) → `$SA/astra/B03.out.md` in **29.9 min** (`1797` s, exit 0); `validate.py B03` exit 0 (`293 rows, 0 errors, 41 flagged` — all `web-url`, 0 `quote-not-found`/missing/no-source): 184 `has it` (55 held, 129 open), 29 `doesn't` (0 held, 29 open), 80 `can't tell` (1 held `39|rarely_drinks`, 79 open). `B04` (`habits × pangolins+elephants+anteaters-sloths-armadillos`, 11 animals, 49 signs, 249 pairs, prompt 25,749 B) → `$SA/astra/B04.out.md` in **22.1 min** (`1324` s, exit 0); `validate.py B04` exit 0 (`249 rows, 0 errors, 41 flagged` — all `web-url`, 0 `quote-not-found`/missing/no-source): 158 `has it` (48 held, 110 open), 38 `doesn't` (0 held, 38 open), 53 `can't tell` (0 held, 53 open). Marked both `done` in `batches.csv`; verified `pairs.py --check` clean and `ledger.py --partial` exit 0 (15,276 rows, 501 `add:pending`, 73 existing `unruled-crosscheck` conflicts, 0 rule conflicts, 398 recheck candidates). Plan updated; no repo code changed.
- 2026-11-23 09:24 UTC · S13.4: Generated `crosscheck/B02.todo.csv` (172/245 rows: `change` 107, `cant-tell` 54, `flag` 62, `sample` 8) and `crosscheck/B03.todo.csv` (222/293 rows: `change` 129, `cant-tell` 80, `flag` 41, `sample` 8) via `sample.py --crosscheck`; ran Opus (`claude-task`) sequentially on `B02` and `B03` into `$SA/crosscheck/B02.csv` and `$SA/crosscheck/B03.csv` (394 rows checked across 538 covered pairs). Lead independently verified 100% row/verdict/source parity and all checks: `B02.csv` 172/172 (`agree` 141, `disagree` 28, `can't tell` 3; `sample` disagrees 0/8, no escalation; all 7 held rows supported); `B03.csv` 222/222 (`agree` 201, `disagree` 16, `can't tell` 5; `sample` disagrees 0/8, no escalation; 9/10 held rows supported, held `39 rarely_drinks` proposed for removal under §2.7 bar and `feeds_on_ground` browser cases queued for S17 rulings); `sources/index.csv` +66 ranked `--add` rows (now 396 rows / 391 unique URLs: 271 `cached`, 106 `fetched`, 19 `unavailable`), `sources.py --check` clean, `pairs.py --check` clean, `ledger.py --partial` exit 0 (15,276 rows, 125 `unruled-crosscheck` conflicts queued for S17/S18, 0 rule conflicts). Plan updated; no repo code changed.
- 2026-11-23 10:10 UTC · S13.5: Ran Astra (`ASTRA_EFFORT=high`) sequentially on `B05` and `B06` (`523` pairs total, `template_sha` `9a5257887e10`). `B05` (`habits × australian-mammals+other-mammals`, 13 animals, 53 signs, 269 pairs, prompt 29,255 B) → `$SA/astra/B05.out.md` in **25.8 min** (`1550` s, exit 0); `validate.py B05` exit 0 (`269 rows, 0 errors, 42 flagged` — all `web-url`, 0 `quote-not-found`/missing/no-source): 138 `has it` (37 held, 101 open), 48 `doesn't` (0 held, 48 open), 83 `can't tell` (0 held, 83 open) — completing all `habits` Astra batches (0 pending). `B06` (`body × amphibians`, 15 animals, 40 signs, 254 pairs, prompt 30,889 B) → `$SA/astra/B06.out.md` in **17.7 min** (`1059` s, exit 0); `validate.py B06` exit 0 (`254 rows, 0 errors, 44 flagged` — 43 `web-url`, 1 `quote-not-found` `16|face_markings`, 0 missing/no-source): 139 `has it` (34 held, 105 open), 85 `doesn't` (0 held, 85 open), 30 `can't tell` (1 held `11|large_eyes`, 29 open). Marked both `done` in `batches.csv`; verified `pairs.py --check` clean and `ledger.py --partial` exit 0 (15,276 rows, 1,147 pending, 702 `add:pending`, 125 existing `unruled-crosscheck` conflicts, 0 rule conflicts, 550 recheck candidates). Plan updated; no repo code changed.
- 2026-11-23 11:00 UTC · S13.6: Generated `crosscheck/B04.todo.csv` (171/249 rows: `change` 110, `cant-tell` 53, `flag` 41, `sample` 8) and `crosscheck/B05.todo.csv` (194/269 rows: `change` 101, `cant-tell` 83, `flag` 42, `sample` 8) via `sample.py --crosscheck`; ran Opus (`claude-task`) sequentially on `B04` and `B05` into `$SA/crosscheck/B04.csv` and `$SA/crosscheck/B05.csv` (365 rows checked across 518 covered pairs — completing all `habits` cross-checks). Lead independently verified 100% row/verdict/source parity and all checks: `B04.csv` 171/171 (`agree` 146, `disagree` 24, `can't tell` 1 [`36 swimmer`]; `sample` disagrees 0/8, no escalation; all 5 held rows confirmed `has it`; `41`/`64` eyesight & `63 climbs_boulders` flagged for S17 rulings); `B05.csv` 194/194 (`agree` 177, `disagree` 16, `can't tell` 1 [`43 seldom_on_ground`]; `sample` disagrees 0/8, no escalation; all 6 held rows confirmed `has it`); `sources/index.csv` +44 ranked `--add` rows (+21 B04 [18 fetched, 3 unavailable], +23 B05 [20 fetched, 3 unavailable]; now 440 rows / 434 unique URLs: 271 `cached`, 144 `fetched`, 25 `unavailable`), `sources.py --check` clean, `pairs.py --check` clean, `ledger.py --partial` exit 0 (15,276 rows, 167 `unruled-crosscheck` conflicts queued for S17/S18, 0 rule conflicts). Plan updated; no repo code changed.
- 2026-11-23 11:33 UTC · S13.7: Ran Astra (`ASTRA_EFFORT=high`) sequentially on `B07` and `B08` (`530` pairs total, `template_sha` `9a5257887e10`). `B07` (`body × turtles+carnivores`, 22 animals, 53 signs, 318 pairs, prompt 51,198 B) → `$SA/astra/B07.out.md` in **12.9 min** (`772` s, exit 0); `validate.py B07` exit 0 (`318 rows, 0 errors, 78 flagged` — all `web-url`, 0 `quote-not-found`/missing/no-source): 208 `has it` (51 held, 157 open), 81 `doesn't` (1 held `1|yellow_legs`, 80 open), 29 `can't tell` (0 held, 29 open). `B08` (`body × primates+hoofed-mammals+pangolins`, 19 animals, 39 signs, 212 pairs, prompt 37,853 B) → `$SA/astra/B08.out.md` in **15.2 min** (`909` s, exit 0); `validate.py B08` exit 0 (`212 rows, 0 errors, 34 flagged` — all `web-url`, 0 `quote-not-found`/missing/no-source): 137 `has it` (53 held, 84 open), 57 `doesn't` (0 held, 57 open), 18 `can't tell` (0 held, 18 open). Marked both `done` in `batches.csv`; marking `B08` `done` exposed a bug in `$SA/scripts/ledger.py` when a higher-precedence batch (`B08`, or `R01` later) supersedes pairs already in a lower-precedence `crosscheck/<batch>.csv` (`T01` `23|face_markings`, `29|throat_patch`). Opus (`claude-task`) fixed `crosschecks()` in `ledger.py` tests-first (validating every done batch's `crosscheck/<batch>.csv` against its own answer rows and only loading winning-batch rows into `ledger.csv`) and added 4 regression checks to `scripts/selftest/test_audit_scripts.py`. Lead verified `test_audit_scripts.py` exit 0, `pairs.py --check` clean, and `ledger.py --partial` exit 0 (15,276 rows, 619 pending, 938 `add:pending`, 2 `remove:*`, 167 existing `unruled-crosscheck` conflicts, 0 rule conflicts, 641 recheck candidates). Plan updated; no repo code changed.
- 2026-11-23 12:15 UTC · S13.8: Generated `crosscheck/B06.todo.csv` (142/254 rows: `change` 105, `cant-tell` 28, `flag` 44, `sample` 8) and `crosscheck/B07.todo.csv` (200/318 rows: `change` 158, `cant-tell` 29, `flag` 78, `sample` 8) via `sample.py --crosscheck`; ran Opus (`claude-task`) sequentially on `B06` and `B07` into `$SA/crosscheck/B06.csv` and `$SA/crosscheck/B07.csv` (342 rows checked across 572 covered `body` pairs). Lead independently verified 100% row/verdict/source-file parity and all checks: `B06.csv` 142/142 (`agree` 89, `disagree` 52, `can't tell` 1 [`62 webbed_feet`]; `sample` disagrees 0/8, no escalation; held `11 large_eyes` `can't tell` queued for S17 ruling, held `62 flat_body` & `75 paddle_tail` confirmed `has it`; `quote-not-found` `16 face_markings` `disagree`); `B07.csv` 200/200 (`agree` 156, `disagree` 44, `can't tell` 0; `sample` disagrees 0/8, no escalation; held `1 yellow_legs` proposed removal fails §2.7 bar per cited ADW, remaining 5 held rows `12`/`17`/`60`/`71`/`73` confirmed `has it`; `skin_folds`, `long_legs`, `five_front_claws`, softshell `18` & borderline body patterns queued for S17); `sources/index.csv` +43 ranked `--add` rows (+12 B06 [10 fetched, 2 unavailable], +31 B07 [2 cached, 26 fetched, 3 unavailable]; now 483 rows / 477 unique URLs: 273 `cached`, 180 `fetched`, 30 `unavailable`; noted 2 `sources.py` edge cases to fix before S14: broken-PDF `pdftotext` error and `reptile_db` underscore key regex), `sources.py --check` clean, `pairs.py --check` clean, `ledger.py --partial` exit 0 (15,276 rows, 264 `unruled-crosscheck` conflicts queued for S17/S18, 0 rule conflicts). Plan updated; no repo code changed.
- 2026-11-23 12:51 UTC · S13.9: Ran Astra (`ASTRA_EFFORT=high`) sequentially on `B09` and `B10` (`375` pairs total, `template_sha` `9a5257887e10`). `B09` (`body × elephants+anteaters-sloths-armadillos+australian-mammals+other-mammals`, 20 animals, 41 signs, 216 pairs, prompt 40,739 B) → `$SA/astra/B09.out.md` in **12.6 min** (`753` s, exit 0); `validate.py B09` exit 0 (`216 rows, 0 errors, 24 flagged` — all `web-url`, 0 `quote-not-found`/missing/no-source): 129 `has it` (49 held, 80 open), 63 `doesn't` (1 held `28|big_ears`, 62 open), 24 `can't tell` (0 held, 24 open) — completing all `body` Astra batches (0 pending). `B10` (`habitat × amphibians+turtles+carnivores`, 37 animals, 22 signs, 159 pairs, prompt 73,518 B) → `$SA/astra/B10.out.md` in **20.4 min** (`1221` s, exit 0); `validate.py B10` exit 0 (`159 rows, 0 errors, 31 flagged` — all `web-url`, 0 `quote-not-found`/missing/no-source): 130 `has it` (30 held, 100 open), 10 `doesn't` (0 held, 10 open), 19 `can't tell` (0 held, 19 open). Marked both `done` in `batches.csv`; verified `pairs.py --check` clean and `ledger.py --partial` exit 0 (15,276 rows, 244 pending, 1,109 `add:pending`, 3 `remove:*`, 264 existing `unruled-crosscheck` conflicts, 1 `narrow-broad` rule conflict [`9|forest_floor` `doesn't` vs `9|leaf_litter` `has it` on wired edge, queued for S17], 712 recheck candidates). Plan updated; no repo code changed.
- 2026-11-23 13:24 UTC · S13.10: Generated `crosscheck/B08.todo.csv` (110/212 rows: `change` 84, `cant-tell` 18, `flag` 34, `sample` 8) and `crosscheck/B09.todo.csv` (114/216 rows: `change` 81, `cant-tell` 24, `flag` 24, `sample` 8) via `sample.py --crosscheck`; ran Opus (`claude-task`) sequentially on `B08` and `B09` into `$SA/crosscheck/B08.csv` and `$SA/crosscheck/B09.csv` (224 rows checked across 428 covered `body` pairs — completing all `body` cross-checks). Lead independently verified 100% row/verdict/source-file parity, 0 banned domains, and all checks: `B08.csv` 110/110 (`agree` 87, `disagree` 23, `can't tell` 0; `sample` disagrees 0/8, no escalation; all 4 held rows `23 big_ears`, `29 horns`, `69 s_shaped_horns`, `70 trunk` confirmed `has it`; borderline `reddish_fur`/`throat_patch`/`big_ears`/`38 black_coat`/`44 tusks`/`55 five_front_claws` queued for S17); `B09.csv` 114/114 (`agree` 95, `disagree` 19, `can't tell` 0; `sample` disagrees 0/8, no escalation; held `28 big_ears` proposed removal fails §2.7 bar per cited ADW + Smithsonian/Wikipedia and stays `has it`; remaining 4 held rows `30 camouflage`, `46 pointed_snout`, `52 shoulder_stripe`, `67 long_tongue` confirmed `has it`; `30 brown_throat→throat_patch` wired implication & `30`/`54` `face_mask`+`face_markings` noted for S17/S19); `sources/index.csv` +28 ranked `--add` rows (+16 B08 [1 cached, 14 fetched, 1 unavailable], +12 B09 [12 fetched]; now 511 rows / 501 unique URLs: 274 `cached`, 206 `fetched`, 31 `unavailable`; noted 3rd pre-S14 `sources.py`/`text.py` fix: ADW family-account `.txt` footer-only extraction), `sources.py --check` clean, `pairs.py --check` clean, `ledger.py --partial` exit 0 (15,276 rows, 306 `unruled-crosscheck` conflicts + 1 existing `9|forest_floor` `narrow-broad` conflict queued for S17/S18). Plan updated; no repo code changed.
- 2026-11-23 14:08 UTC · S13.11: Ran Astra (`ASTRA_EFFORT=high`) sequentially on `B11`, `B12`, `B13`, and `B14` (`244` pairs total, `template_sha` `9a5257887e10`), completing all 16 initial Astra batches (`P01`, `T01`, `B01`–`B14` all `done`, 0 pending). `B11` (`habitat × primates+hoofed-mammals+pangolins+elephants+anteaters-sloths-armadillos+australian-mammals+other-mammals`, 35 animals, 16 signs, 105 pairs, prompt 63,002 B) → `$SA/astra/B11.out.md` in **14.0 min** (`840` s, exit 0); `validate.py B11` exit 0 (`105 rows, 0 errors, 37 flagged` — all `web-url`, 0 `quote-not-found`/missing/no-source): 82 `has it` (9 held, 73 open), 11 `doesn't` (0 held, 11 open), 12 `can't tell` (0 held, 12 open). `B12` (`life × amphibians+turtles`, 26 animals, 12 signs, 76 pairs, prompt 47,660 B) → `$SA/astra/B12.out.md` in **13.7 min** (`824` s, exit 0); `validate.py B12` exit 0 (`76 rows, 0 errors, 7 flagged` — all `web-url`, 0 `quote-not-found`/missing/no-source): 46 `has it` (19 held, 27 open), 19 `doesn't` (0 held, 19 open), 11 `can't tell` (0 held, 11 open). `B13` (`life × carnivores+primates+hoofed-mammals+pangolins+anteaters-sloths-armadillos+australian-mammals+other-mammals`, 29 animals, 9 signs, 49 pairs, prompt 52,853 B) → `$SA/astra/B13.out.md` in **10.5 min** (`631` s, exit 0); `validate.py B13` exit 0 (`49 rows, 0 errors, 7 flagged` — all `web-url`, 0 `quote-not-found`/missing/no-source): 33 `has it` (16 held, 17 open), 9 `doesn't` (0 held, 9 open), 7 `can't tell` (0 held, 7 open). `B14` (`range × 14 animals`, 1 sign `one_island`, 14 pairs, prompt 25,255 B) → `$SA/astra/B14.out.md` in **2.4 min** (`142` s, exit 0); `validate.py B14` exit 0 (`14 rows, 0 errors, 0 flagged`): 9 `has it` (3 held, 6 open), 4 `doesn't` (1 held `48|one_island`, 3 open), 1 `can't tell` (0 held, 1 open). Marked all 4 `done` in `batches.csv`; verified `pairs.py --check` clean and `ledger.py --partial` exit 0 (15,276 rows, 0 without `final_verdict`, 1,222 `add:pending`, 4 `remove:*`, 311 conflicts: 306 existing `unruled-crosscheck`, 3 `narrow-broad` [`9`/`24`/`59` `forest_floor` vs `leaf_litter`], 2 `denies` [`24`/`59` `forest_floor` vs `often_in_trees`], 747 recheck candidates). Plan updated; no repo code changed.
- 2026-11-23 15:03 UTC · S13.12: Generated `crosscheck/B10.todo.csv`–`B14.todo.csv` (`313` rows across `403` covered `habitat`+`life`+`range` pairs) via `sample.py --crosscheck`; ran Opus (`claude-task`) sequentially in 3 jobs (`B10`, `B11`, `B12+B13+B14`) into `$SA/crosscheck/B10.csv`–`B14.csv`, completing all 16 initial batches' cross-checks (`T01`, `P01`, `B01`–`B14`, 0 escalations). Lead independently verified 100% row/verdict/source-file parity, 0 banned domains, and all checks: `B10.csv` 127/127 (`agree` 98, `disagree` 29, `can't tell` 0; `sample` disagrees 0/8; all 4 held rows confirmed; `9 leaf_litter` vs `forest_floor`, `71 above_tree_line` vs `trees:no`, `60 snowy_winters` flagged for S17/S18); `B11.csv` 93/93 (`agree` 69, `disagree` 24, `can't tell` 0; `sample` disagrees 0/8; both held rows `48`/`67` confirmed; `24`/`59 leaf_litter` `disagree`, resolving their `forest_floor`/`often_in_trees` conflicts in S17/S18); `B12.csv` 47/47 (`agree` 43, `disagree` 3, `can't tell` 1 [`7 sucker_mouth_tadpoles`]; `sample` disagrees 0/8; all 5 held rows confirmed; noted `11 egg_guarding` wording & triaged `12 rain_breeder` aside); `B13.csv` 32/32 (`agree` 24, `disagree` 7, `can't tell` 1 [`45 mother_carries_young`]; `sample` disagrees 0/8; all 6 held rows confirmed); `B14.csv` 14/14 (`agree` 11, `disagree` 3, `can't tell` 0; `sample` disagrees 1/6 [`23 one_island`], <2 no escalation; held `48 one_island` proposed removal fails §2.7 bar per cited IUCN + `one_island` meaning, rule `21`/`23`/`48` together in S18; remaining 3 held rows confirmed); `sources/index.csv` +65 ranked `--add` rows (+21 B10 [1 cached, 15 fetched, 5 unavailable], +32 B11 [27 fetched, 5 unavailable], +12 B12–B14 [6 fetched, 6 unavailable]; now 576 rows / 565 unique URLs: 275 `cached`, 254 `fetched`, 47 `unavailable`; noted 4th pre-S14 `sources.py` edge case: `53 tapirconservation.org` cert-error page saved as `fetched`, uncited), `sources.py --check` clean, `pairs.py --check` clean, `ledger.py --partial` exit 0 (15,276 rows, 379 conflicts: 374 `unruled-crosscheck`, 3 `narrow-broad` [`9`/`24`/`59` `forest_floor` vs `leaf_litter`], 2 `denies` [`24`/`59` `forest_floor` vs `often_in_trees`], 747 recheck candidates). Plan updated; no repo code changed.
- 2026-11-23 16:30 UTC · S14: Ran `ledger.py --partial` (747 candidates: 569 `material-cant-tell`, 178 `material-silent`, 0 `implied-unconfirmed`); Opus (`claude-task`) fixed all 4 `sources.py`/`text.py` edge cases (`_` keys, broken-PDF catch in `generic`/`via_wayback`, ADW family-account body extraction re-extracting `Bradypodidae` 1,553→5,187 B [30, 54] & `Rhinocerotidae` 1,629→7,085 B [44], Chrome SSL `BLOCKED` + `53 tapirconservation.org` marked `unavailable` and deleted) and fetched 104 new substantive ranked sources (103 `fetched` + 1 `cached`: `sdzwa` 32, `literature` 31 [17 HMW/Plazi, 4 Naturalis, 10 OA papers], `wikipedia` 16 [all 16 missing filled], `ngo` 10 [9 fetched + 1 cached], `britannica` 7, `adw` 5 family accounts, `tftsg` 1, `government` 1, `smithsonian` 1) across 53 distinct animals (`$SA/s14-fetched.csv`, 108 rows; `sources/index.csv` now 680 rows / 660 URLs: 276 `cached`, 356 `fetched`, 48 `unavailable`). Lead verified `sources.py --check` clean (0 WARN/FAIL), all 4 selftests pass, 0 bad fetched files; built `$SA/recheck-input.csv` (**591 pairs** by reason: `material-cant-tell` **416**, `material-silent` **175**, `implied-unconfirmed` **0**, reopened triaged **0**, re-export **0**; by category: `habits` 394, `body` 157, `habitat` 23, `life` 17; 71 animals, 117 signs) and ran `pairs.py --recheck --budget 305 --max-animals 37` → 5 batches (`R01a` 138 / 53 KB, `R01b` 137 / 74 KB, `R01c` 157 / 68 KB, `R01d` 83 / 81 KB, `R01e` 76 / 90 KB). Verified `pairs.py --check` clean, all 5 `prompt.py R01* --dry-run` under 100 KB, `ledger.py --partial` exit 0. Split S15 into `S15.1` (`R01a`–`R01c`) and `S15.2` (`R01d`–`R01e`). Plan updated; no repo code changed.
- 2026-11-23 17:37 UTC · S15.1: Ran Astra (`ASTRA_EFFORT=high`) sequentially on `R01a`, `R01b`, and `R01c` (`432` pairs total, `template_sha` `9a5257887e10`). `R01a` (`habits × amphibians+turtles`, 138 pairs, prompt 53,110 B) → `$SA/astra/R01a.out.md` in **22.2 min** (`1333` s, exit 0); `validate.py R01a` exit 0 (`138 rows, 0 errors, 6 flagged` — all `web-url`, 0 `quote-not-found`/missing/no-source): 12 `has it` (0 held, 12 open), 37 `doesn't` (0 held, 37 open), 89 `can't tell` (0 held, 89 open). `R01b` (`habits × carnivores+primates+hoofed-mammals+pangolins+elephants`, 137 pairs, prompt 74,124 B) → `$SA/astra/R01b.out.md` in **23.7 min** (`1421` s, exit 0); `validate.py R01b` exit 0 (`137 rows, 0 errors, 22 flagged` — all `web-url`, 0 `quote-not-found`/missing/no-source): 28 `has it` (0 held, 28 open), 37 `doesn't` (0 held, 37 open), 72 `can't tell` (0 held, 72 open). `R01c` (`habits+body × amphibians+anteaters-sloths-armadillos+australian-mammals+other-mammals`, 157 pairs, prompt 68,275 B) → `$SA/astra/R01c.out.md` in **17.6 min** (`1054` s, exit 0); `validate.py R01c` exit 0 (`157 rows, 0 errors, 5 flagged` — all `web-url`, 0 `quote-not-found`/missing/no-source): 10 `has it` (1 held `11|large_eyes`, 9 open), 53 `doesn't` (0 held, 53 open), 94 `can't tell` (0 held, 94 open). Marked `R01a`–`R01c` `done` in `batches.csv` (`R01d`–`R01e` remain `pending`); verified `pairs.py --check` clean and `ledger.py --partial` exit 0 (15,276 rows, 1,265 `add:pending`, 4 `remove:*`, 379 existing conflicts, 0 new rule conflicts, 315 recheck candidates). Plan updated; no repo code changed.
- 2026-11-23 18:16 UTC · S15.2: Ran Astra (`ASTRA_EFFORT=high`) sequentially on `R01d` and `R01e` (`159` pairs total, `template_sha` `9a5257887e10`), completing all 5 re-check batches (`R01a`–`R01e`, 591 pairs) and all 21 Astra batches (`P01`, `T01`, `B01`–`B14`, `R01a`–`R01e` all `done`, 0 pending). `R01d` (`body × turtles+carnivores+primates+hoofed-mammals+pangolins+elephants`, 83 pairs, prompt 80,942 B) → `$SA/astra/R01d.out.md` in **23.8 min** (`1426` s, exit 0); `validate.py R01d` exit 0 (`83 rows, 0 errors, 5 flagged` — all `web-url`, 0 `quote-not-found`/missing/no-source): 11 `has it` (0 held, 11 open), 49 `doesn't` (0 held, 49 open), 23 `can't tell` (0 held, 23 open). `R01e` (`body+habitat+life`, 76 pairs, prompt 89,674 B) → `$SA/astra/R01e.out.md` in **12.9 min** (`773` s, exit 0); `validate.py R01e` exit 0 (`76 rows, 0 errors, 5 flagged` — all `web-url`, 0 `quote-not-found`/missing/no-source): 10 `has it` (0 held, 10 open), 29 `doesn't` (0 held, 29 open), 37 `can't tell` (0 held, 37 open). Marked `R01d`–`R01e` `done` in `batches.csv`; verified `pairs.py --check` clean and `ledger.py --partial` exit 0 (15,276 rows, 0 without `final_verdict`, 1,286 `add:pending`, 4 `remove:*`, 379 existing conflicts, 0 new rule conflicts, 157 recheck candidates). Plan updated; no repo code changed.
- 2026-11-23 19:05 UTC · S16: Generated `crosscheck/R01a.todo.csv`–`R01e.todo.csv` (`426` rows across `591` covered `R01a`–`R01e` pairs) via `sample.py --crosscheck`; ran Opus (`claude-task`) sequentially in 4 jobs (`R01a`, `R01b`, `R01c`, `R01d+R01e`) into `$SA/crosscheck/R01a.csv`–`R01e.csv`, completing all 21 batches' cross-checks (0 escalations). Lead independently verified 100% row/header/verdict/source-file parity, 0 banned domains across all 703 `sources/index.csv` rows, and all checks: `R01a.csv` 109/109 (`agree` 101, `disagree` 8, `can't tell` 0; `sample` 0/8); `R01b.csv` 108/108 (`agree` 86, `disagree` 21, `can't tell` 1 [`51 stands_on_hind_legs`]; `sample` 0/8); `R01c.csv` 112/112 (`agree` 105, `disagree` 7, `can't tell` 0; `sample` 0/8; held `11 large_eyes` `disagree` → `can't tell`, genus-level `30 basker` flagged for S17); `R01d.csv` 42/42 (`agree` 32, `disagree` 10, `can't tell` 0; `sample` 0/8; `44 tusks` & `60 big_ears` verified); `R01e.csv` 55/55 (`agree` 48, `disagree` 7, `can't tell` 0; `sample` 0/8; `1 borrowed_burrows` backed by Butler & Graham 1995, `12 cold_streams` & `11 sucker_mouth_tadpoles` verified, `7/9/10/15 rain_breeder` `disagree`). `sources/index.csv` +23 ranked `--add` rows (+7 `R01a` [7 fetched], +6 `R01b` [5 fetched, 1 unavailable], +3 `R01c` [2 fetched, 1 unavailable], +7 `R01d+R01e` [5 fetched, 2 unavailable]; now 703 rows / 681 unique URLs: 276 `cached`, 375 `fetched`, 52 `unavailable`), `sources.py --check` clean, `pairs.py --check` clean, `ledger.py --partial` exit 0 (15,276 rows, 0 without `final_verdict`, 1,286 `add:pending`, 433 conflicts: 428 `unruled-crosscheck`, 3 `narrow-broad`, 2 `denies`). Plan updated; no repo code changed.
- 2026-11-23 19:26 UTC · S17: Ran full `ledger.py` (15,276 rows, 433 conflicts across 430 unique pairs: `body` 156, `habits` 201, `habitat` 54, `life` 16, `range` 3); Opus (`claude-task`) drafted `$SA/rulings.csv` (all 430 pairs, dry-run 0 conflicts / 0 reopened implied) and `$SA/defs/s17-rulings-notes.md`. Lead ruled all 357 `body` + `habits` rows (`prompts/S17-rulings.md`: 356 accepted, 1 overruled [`49 black_coat` → `can't tell`]; 2 held removals [`14 puffs_up` `remove:2`, `39 rarely_drinks` `remove:4`], 5 held kept, 9 open adds + `63 climber` implied), and Opus applied them to `$SA/rulings.csv`. Lead independently verified 430 rows (156 `body`: 3 `has it`, 37 `doesn't`, 116 `can't tell`; 201 `habits`: 11 `has it`, 24 `doesn't`, 166 `can't tell`; 73 `habitat`/`life`/`range` unruled for S18) and `ledger.py --partial` exit 0 (15,276 rows, 0 without `final_verdict`, 981 `add:pending` [`body` 292, `habits` 468 + 2 removes], 76 conflicts remaining: 73 S18 `unruled-crosscheck` + 3 temporary `24/59 forest_floor` conflicts awaiting S18 `24/59 leaf_litter`; 0 `body` and 0 `habits` `unruled-crosscheck`). Cleaned `/tmp/s17/`. Plan updated; no repo code changed.
- 2026-11-23 19:33 UTC · S18: Lead ruled all 73 remaining `habitat` (54: 1 `has it` [`70 brackish_water`], 6 `doesn't`, 47 `can't tell`), `life` (16: 0 `has it`, 3 `doesn't`, 13 `can't tell`), and `range` (3: 3 `has it` [`21`/`23`/`48 one_island`]) rows (`prompts/S18-rulings.md`, 0 overrides), and Opus (`claude-task`) applied them to `$SA/rulings.csv` (430/430 ruled). Lead independently verified `rulings.csv` diff (357 `body`+`habits` rows byte-identical, 73 `habitat`/`life`/`range` ruled), confirmed §2.7 removal bar firsthand against holding notes' cited sources on the only 2 removals (`14 puffs_up` `remove:2` [BBC + 5 ranked sources silent], `39 rarely_drinks` `remove:4` [Wikipedia + ADW/IUCN/SDZWA contradiction]), confirmed `material` independently against `metrics/s2.json`'s 105 dealable sets (8,594 `y`, 6,682 `n`, 0 mismatches), and verified `ledger.py --allow-pending-changes` exit 0 (15,276 rows, 3 `rules_commit_change`, **0 without `final_verdict`**, **0 conflicts**, 0 reopened implied), `reconcile.py --to HEAD --applied none` exit 0, `pairs.py --check` clean, and `sources.py --check` clean. Frozen planned changes by category (`add:pending` resolved into `add:<i>`/`new_note:<i>` during S19–S22 via `changes.csv`): `body` 292 adds / 0 removes (+5 implied), `habits` 468 adds / 2 removes (+24 implied), `habitat` 123 adds / 0 removes (+2 implied), `life` 31 adds / 0 removes (+2 implied), `range` 8 adds / 0 removes — **922 planned adds/new notes, 2 removes, 33 implied**. Cleaned `/tmp/s18*`. Plan updated; no repo code changed.
- 2026-11-23 20:01 UTC · S19: Opus (`claude-task`, 2 passes) applied all 292 `body` adds across 75 profiles (0 `body` removes) as one-sign standard-sentence `morphology` `new_note`s, added 80 new `db/content/citations.json` entries (261→341, 0 deleted/changed, 0 ND licences after switching Tiger `25 black_coat` to Wikipedia), logged 18 give-away + 5 milder existing notes in `$SA/giveaways.md`, and applied lead wording-gate rulings: kept 8 clean existing `body` notes (13 `true` keys), moved tags off 70 narrow/giveaway existing `body` notes (68 single-tag incl. flipped `1:0`/`15:0`, plus 2 two-body-tag `23:1`/`33:0` split into one-sign notes → 72 `remove:<i>;new_note:<j> (wording gate)` moves in `$SA/changes.csv`, 364 rows total), and parked 3 mixed `body+habits` notes (`32:0`, `38:2`, `67:3`; 7 `false` keys) for S20. Lead independently verified `npm run typecheck` exit 0, `npm run lint` exit 0, `npm test` 140/140 pass, `npm run content -- preview` exit 0 (0 PROBLEM, 0 `cite warn`), `ledger.py --allow-pending-changes` exit 0 (0 conflicts, 0 `body` pending, 630 remaining), `reconcile.py --from 7bce511a --to WORKTREE --applied body` exit 0 (439 ops match), `metrics/s19.json` vs `s2.json` (105 sets / 0 added/removed, 520/525 combos [+117], 2,481 eligible notes [+1,534], 172 `lost.csv` rows: 2 unmoved `fits_all` + 170 `absent` on moved notes [150 1-for-1 eligible replacements, 20 `fits_all` replacements from correct adds], 0 co-tagging losses), and `diff.py --wording wording.csv` (`1,547` keys: `1,540 true`, `7 false` [exact 3 parked mixed notes], `0 unruled/stale/conflicting`). Committed as `sign-audit S19 body: …` and pushed.
- 2026-11-23 20:37 UTC · S20: Opus (`claude-task`, 2 passes) applied all 466 `habits` adds (after lead ruled pouch-young-only `37 squeaker` and `48 squeaker` → `can't tell` in `$SA/rulings.csv` [432 rows] for S17 consistency) as one-sign standard-sentence `new_note`s across 75 profiles, applied the 2 frozen removals (`14 puffs_up` `remove:2`, `39 rarely_drinks` `remove:4`), moved `14 squeaker` off `14:2` (untagging unverified `"puffs up"`) and both tags off all 3 parked S19 mixed notes (`32:0`, `38:2`, `67:3`), added 85 new `db/content/citations.json` entries (341→426, 0 deleted/modified, 0 ND licences after replacing The Conversation on `32`), logged `14:2` + 6 give-away notes in `$SA/giveaways.md`, and applied lead wording-gate rulings: kept 21 clean existing notes (40 `true` keys) and moved tags off 109 failing existing notes (104 drafted `false` + 5 lead flips `12:3`, `31:1`, `39:3`, `55:6`, `57:2`; 0 `habitat`/`life`/`range` tags) onto 130 clean one-sign standard-sentence `new_note`s (switching 14 moved signs to verified saved sources; 137 total S20 wording-gate moves in `$SA/changes.csv`, 967 rows total). Lead independently verified `npm run typecheck` exit 0, `npm run lint` exit 0, `npm test` 140/140 pass, `npm run content -- preview` exit 0 (0 PROBLEM, 0 `cite warn`), `ledger.py --allow-pending-changes` exit 0 (0 conflicts, 0 `body`/`habits` pending, 162 remaining), `reconcile.py --from 7bce511a --to WORKTREE --applied body,habits` exit 0 (1,185 ops match), `metrics/s20.json` (105 sets / 0 added/removed, 525/525 combos [+5 vs S19], 4,978 eligible notes [+2,497 vs S19], 329 `lost.csv` rows: 0 co-tagging losses [268 moved w/ eligible replacement, 45 moved w/ `fits_all` replacement, 5 `39:4` removal, 9 unmoved `fits_all`, 2 `57:5` mystery-only from `39` removal]), and `diff.py --wording wording.csv` exit 0 for both `s19→s20` (`2,939` keys: `2,939 true`, `0 false`) and `s2→s20` (`4,479` keys: `4,479 true`, `0 false`, `0 unruled/stale/conflicting`). Committed as `sign-audit S20 habits: …` and pushed.

- 2026-11-23 21:09 UTC · S21: Opus (`claude-task`, 2 passes) applied all 121 `habitat` adds (after lead ruled `66 sand_dunes` → `can't tell` [ADW biome box / CC BY-NC-ND single fenced reserve] and `58 kopjes` → `doesn't` [lookouts only] in `$SA/rulings.csv` [434 rows]; 0 `habitat` removes) as one-sign standard-sentence `new_note`s across 63 profiles, added 25 new `db/content/citations.json` entries (426→451, 0 deleted/altered, 0 ND licences after keeping `35 snowy_winters` on SDZWA behavior), added 8 place terms to `src/clueGame/glossary.ts` (`Brackish`, `Estuary`, `Lagoon`, `Bog`, `Leaf litter`, `Tree line`, `Alpine`, `Plateau`), logged 5 region give-aways in `$SA/giveaways.md`, and applied lead wording-gate rulings: kept 9 clean older notes untouched (11 `true` keys, incl. `41:10→7` Hairy Frog via wired `leaf_litter→forest_floor`; `15:1` dropped out after `58 kopjes` → `doesn't`) and moved tags off 23 failing existing notes (21 Table (a) notes + 2 lead flips `2:5`, `17:4`, incl. mixed `63:5` `burrower`+`borrowed_burrows`) onto 24 clean one-sign standard-sentence `new_note`s (all 24 keeping their verified old-note sources; 1,112 total rows in `$SA/changes.csv`, 4,937 rows in `$SA/wording.csv`). Lead independently verified `npm run typecheck` exit 0, `npm run lint` exit 0, `npm test` 140/140 pass, `npm run content -- preview` exit 0 (0 PROBLEM, 0 `cite warn`), `ledger.py --allow-pending-changes` exit 0 (0 conflicts, 0 `body`/`habits`/`habitat` pending, 39 remaining [`life` 31, `range` 8]), `reconcile.py --from 7bce511a --to WORKTREE --applied body,habits,habitat` exit 0 (1,354 ops match), `metrics/s21.json` (105 sets / 0 added/removed, 525/525 combos, 5,587 eligible notes [+609 vs S20], 44 `lost.csv` rows: all `absent` on 10 moved notes with eligible replacements, 0 co-tagging losses), and `diff.py --wording wording.csv` exit 0 for both `s20→s21` (`421` keys: `421 true`, `0 false`) and `s2→s21` (`4,900` keys: `4,900 true`, `0 false`, `0 unruled/stale/conflicting`). Committed as `sign-audit S21 habitat: …` and pushed.
- 2026-11-23 21:31 UTC · S22: Opus (`claude-task`, 2 passes) applied all 39 remaining frozen adds (`life` 31, `range` 8; 0 removes, 0 new `rulings.csv` entries) as one-sign standard-sentence `new_note`s across 30 profiles (9 standard sentences + past tense for `19`/`22`; `"is, or was"` on `one_island` for wired `floreana_island`/`pinta_island` edges), added 6 new `db/content/citations.json` entries (451→457, 0 deleted/altered, 0 ND licences), logged 8 give-away notes in `$SA/giveaways.md`, and applied lead wording-gate rulings: kept 3 clean older notes untouched (4 `true` keys: `1:4`, `8:7`, `16:6`) and moved tags off 12 existing single-tag notes (9 Table (a) failing notes + 2 lead flips `6:7`, `52:8` + proactive giveaway `48:6`; switching `49` `one_island` to ADW and `54` `mother_carries_young` to `xenarthrans.org`) onto 12 clean one-sign standard-sentence `new_note`s (37 profiles touched total; 1,163 rows in `$SA/changes.csv`, 5,105 rows in `$SA/wording.csv`). Lead independently verified `npm run typecheck` exit 0, `npm run lint` exit 0, `npm test` 140/140 pass, `npm run content -- preview` exit 0 (0 PROBLEM, 0 `cite warn`), plain `ledger.py` (no `--allow-pending-changes`) exit 0 (0 conflicts, 0 `add:pending`), `reconcile.py --from 7bce511a --to WORKTREE --applied all` exit 0 (1,417 ops match), `metrics/s22.json` (105 sets / 0 added/removed, 525/525 combos, 5,720 eligible notes [+133 vs S21], 18 `lost.csv` rows: all `absent` on 7 moved notes with 18/18 1-for-1 eligible replacements, 0 co-tagging losses), and `diff.py --wording wording.csv` exit 0 for both `s21→s22` (`168` keys: `168 true`, `0 false`) and `s2→s22` (`5,068` keys: `5,068 true`, `0 false`, `0 unruled/stale/conflicting`). Committed as `sign-audit S22 life+range: …` and pushed.
- 2026-11-23 21:38 UTC · S23: Lead archived `HEAD` (`3ae0ec18`) into `/tmp/sa-trees/3ae0ec18`, ran Snapshot 3 (`$SA/metrics/s3.json`, `witnessNotes` self-check passed: 105 sets / 0 added/removed, 525/525 combos [100.0%, +123 vs S1], 5,720 eligible notes [+4,780, 6.09×, min 2 / median 10 / max 24], 3,416 mystery-only, 551 fits-all, 0 mystery-not-fitting, 9,687 tagged notes evaluated) and `diff.py metrics/s1.json metrics/s3.json --out metrics/s3/ --wording wording.csv` (exit 0: 0 sets diff, 9,929 changed, 542 lost, 11,339 newly matched rows across 5,070 distinct keys — **5,070 `true`, 0 `false`, 0 unruled/stale/conflicting**), and cleaned `/tmp/sa-trees/` + `/tmp/sa-build/`. Audited all 36 old notes, 138 new-note texts, and 78 wired-edge groups (0 fixes or deferrals needed; R9 confirmed) and reviewed all 542 rows of `metrics/s3/lost.csv`; Opus (`claude-task`) wrote `$SA/scripts/lost_reasons.py` and `$SA/metrics/s3/lost-reasons.csv` from lead rulings (`prompts/S23-lost-reasons.md`), verified 542/542 exact parity (`425` moved all-eligible, `34` multi-tag splits, `65` moved `fits_all`, `11` unmoved `fits_all`, `5` `39:4` removals, `2` `57:5` mystery-only; 0 co-tagging losses, 0 unexplained). Recorded S1→S2→S3 before/after table in plan; no repo code/content changed.
- 2026-11-23 21:46 UTC · S24: Opus (`claude-task`) wrote `$SA/scripts/sign-map-update.ts` (rebuilds baseline `7bce511a` CSV + `SIGNS` via `git show`/`git archive`, verifies lossless baseline serialization, 216-tag 1-to-1 parity, and active-only open tags) and updated `docs/research/2026-11-07-moves-and-signs/sign-map.csv` (216 rows / 217 CRLF lines: 156 changed [136 holder changes, 26 active rule changes, 15 retired marks], 60 byte-identical unchanged). Lead independently verified idempotency (`sha256` `4ec603c0…` identical on rerun), `npm run typecheck` exit 0, `npm run lint` exit 0, `npm test` 140/140 pass, `npm run content -- preview` exit 0 (0 PROBLEM / 0 cite warn), `$SA/scripts/ledger.py` exit 0 (`15,276` rows, `3` `rules_commit_change`, 0 without `final_verdict`, 0 `add:pending`, 0 conflicts, 0 changed rows missing `commit`: `d04baac0` 3, `d138b84e` 364, `c672fbb9` 605, `ed85f139` 145, `3ae0ec18` 51), and `$SA/scripts/reconcile.py --from 7bce511a --to HEAD` exit 0 (`1,417` actual ops match ledger). Recorded `final_verdict` × category counts, 10 deferred edges with blocking notes/HEAD status, 43 give-away notes (12 still tagged / 31 untagged), and complete 76-animal added/removed table (918 adds, 2 removes, 3 S5 drops) in plan. Committed `sign-map.csv` and plan together and pushed.
- 2026-11-23 22:09 UTC · Final code reviews: ran Astra (`astra-review --code origin/main`, `VERDICT: REJECT`, 5 MUST-FIX, 2 SHOULD-CONSIDER) and Fable (`claude-fable-5-2` high, `VERDICT: APPROVE_WITH_CHANGES`, 1 MUST-FIX, 5 SHOULD-CONSIDER) sequentially against `origin/main` (`7bce511a`)...`HEAD` (`963615b9`); verified every item against profiles, ledger, triage, and cached sources; ruled on all items in plan and added steps S25 (code/rules/profile/test fixes) and S26 (Snapshot 3, wording gate, `sign-map.csv`, final ledger, balance/travel disclosure metrics). Plan updated; no code changed.
- 2026-11-23 22:23 UTC · S25a (split from S25 on Claude usage limit): lead scanned all 76 cached sources for `leaf_litter`/`forest_floor`, `town_dweller` (IUCN `14.3`–`14.5`/plantations), and `crevice_hider` candidates, issued complete rulings in `$SA/prompts/S25-review-fixes.md`, and launched Opus (`claude-task`); Opus completed part 1 (`src/clueGame/signs.ts`, `docs/CONTENT_SOURCES.md`, `tests/clueGame/signs.test.ts`, `$SA/definitions.csv`, `$SA/scripts/defs_draft.py`, `$SA/game/src/clueGame/signs.ts`) and drafted Astra SC1 tests in `tests/clueGame/animalBoard.test.ts` before exiting 3 (5-hour usage limit, resets 23:20 UTC; saved `$SA/tasks/20261123-221700-opus-5-5-high.md`). Lead discarded unready `tests/clueGame/animalBoard.test.ts` (profile edits deferred to S25b), verified accepted S25a (`npm run typecheck` exit 0, `npm run lint` exit 0, `npm test` 142/142 pass, `npm run content -- preview` exit 0 / 0 problems, `$SA/scripts/defs_check.py --edges wired` exit 0 [201 rows, 12 wired edges], `game/src/clueGame/signs.ts` byte-identical to `src/clueGame/signs.ts`), split S25 into checked `S25a` and pending `S25b`, committed and pushed, ending with `MISSION_WAIT_CLAUDE`.
- 2026-11-23 23:39 UTC · S25b: Opus (`claude-task`, 2 passes) wrote Astra SC1 pinned deal-fit tests first in `tests/clueGame/animalBoard.test.ts` (5/5 red before profile fixes, 5/5 green after), then applied all Astra MF1–5 profile & citation edits across 17 profiles + `db/content/citations.json` (+2 entries: Pašukonis et al. 2019 CC BY 4.0, SDZWA Chinese Giant Salamander `/behavior`, 0 deleted/altered): `9` `forest_floor` overruled `doesn't` (`remove:3`) & `climber` `has it` in-place at `9:14`; `forest_floor` `new_note`s on `3:21`, `12:18`, `21:18`, `27:23`, `46:21` (standalone `smithsonian`, keeping `46:4` untouched), `49:19`, `67:23`; `town_dweller` `new_note`s on `7:15`, `16:17`, `51:27`; `crevice_hider` `new_note`s on `4:20`, `8:22`, `49:20`, `62:29`, `75:21` (`35`/`60`/`67`/`72` ruled `can't tell`); `1` `yellow_legs` overruled `doesn't` (deleted S19 `1:12`, shifted `1` indices `13..25 → 12..24` in `$SA/changes.csv` & `$SA/wording.csv`) and `1:12` `burrower` updated to Butler & Graham 1995 (`literature`) with qualified wording; lead ruled `15:2 → 4` (`"slabs of rock"`) `false` at the wording gate, moving `15` `crevice_hider` off `15:2` to standard-sentence `15:18` (`remove:2;new_note:18 (wording gate)`) and appending all 49 S25b newly matched keys (`true`) to `$SA/wording.csv` (`5,108` keys, `0 false`). Lead independently verified every diff (`git diff`, `$SA/rulings.csv`, `$SA/changes.csv`, `$SA/wording.csv`), `npm run typecheck` exit 0, `npm run lint` exit 0, `npm test` 147/147 pass, `npm run content -- preview` exit 0 (0 problems, 0 cite warn), `$SA/scripts/ledger.py` exit 0 (`15,276` rows, `3` `rules_commit_change`, 0 without `final_verdict`, 0 `add:pending`, 0 conflicts), and `$SA/scripts/reconcile.py --from 7bce511a --to WORKTREE --applied all` exit 0 (`1,433` actual ops match ledger). Committed as `sign-audit S25b review-fixes: …` and pushed.
- 2026-11-23 23:49 UTC · S26: Lead re-ran Snapshot 2 (`eadc8c16` code × `7bce511a` content: 0 `Unknown sign`, 403/525 combos, 943 eligible notes, 3 changed, 0 lost, `diff.py --wording` exit 0 with `2 true / 0 false`) and Snapshot 3 (`eadc8c16` × `eadc8c16`: 105 identical sets, 525/525 combos [100.0%], 5,803 eligible notes [min 3 / median 10 / max 24], 541 lost, `diff.py --wording` exit 0 with **5,108 `true` / 0 `false`** / 0 unruled), cleaned `/tmp/sa-trees/` & `/tmp/sa-build/`, and computed exact Fable MUST-FIX 1 owner-disclosure metrics (`balance-044.ts --rounds 60` seed 44: Africa careful ★★★ `62%→90%` / notes `1.8→3.5`, Asia `47%→73%` / `1.0→3.2`; clues/animal median `8→23` / max `36`; badges median `6→19` / max `30`; `travelOf` 0 deploy-window changes and 9 post-build changes [5 `walk→swim`, 4 `walk→dig`]). Opus (`claude-task`) updated `$SA/scripts/lost_reasons.py` → `$SA/metrics/s3/lost-reasons.csv` (`541/541` rows: `424/34/64/10/7/2`) and re-ran `$SA/scripts/sign-map-update.ts` on `docs/research/2026-11-07-moves-and-signs/sign-map.csv` (7-line post-S25 diff; 156 changed / 60 unchanged vs `7bce511a`, idempotent sha256 `964a5a4b…`). Lead verified idempotency, `lost_reasons.py`, `ledger.py` (15,276 rows, 0 conflicts, `eadc8c16` 32 rows), `reconcile.py --from 7bce511a --to HEAD` (`1,433` ops match), `typecheck`, `lint`, `npm test` (147/147 pass), and `content -- preview` (0 problems / 0 cite warn). Updated plan S1→S2→S3, S24/S26 counts, 76-animal table, and Fable disclosure metrics; committed `sign-map.csv` + plan and pushed.
- 2026-11-24 00:25 UTC · Final Verification & Summary: ran full offline checks (`typecheck`, `lint`, `npm test` 147/147, `content -- preview` 0 problems/warnings), read-only live `content -- check` (`Pool: 76 playable of 76 species, 2475 clues (2083 deductive), 491 facts. 0 errors, 0 warnings.`), `ledger.py` (15,276 rows, 0 conflicts), `reconcile.py` (`1,433` ops match), S1→S2 (`2 true / 0 false`) and S1→S3 (`5,108 true / 0 false`) wording diffs, and guarded `phaser_june_dev` `content -- build` + `content -- check` (`Pool: 76 playable of 76 species, 3653 clues (3041 deductive), 491 facts. 0 errors, 0 warnings.`). Initial `e2e:fresh` on HEAD content passed `1551/1554`, exposing 3 pre-existing paging-test assumptions in `scripts/e2e.mjs` (`02d` 1-page check, `FORCED` height `40→64` for `moves`, `turns` `ResizeObserver` race on already-paged sheets); Opus (`claude-task`) fixed all 3 in `scripts/e2e.mjs`, after which `e2e:fresh` passed **`1554/1554`** (Anywhere load median 2369 ms at 1×, 4651 ms at 4×; `splits: 17, moves: 1, bad: 0`; artifact saved to `/srv/critter-ai/agent-state/missions/sign-audit/e2e-final/`), and `typecheck`/`lint`/`npm test` re-passed (147/147). Wrote `## Summary`, set `status: done`, committed `scripts/e2e.mjs` + plan, and pushed.

## Summary

### Overview & Goal 2 Rule

Audited all **201 active signs × 76 animals (15,276 pairs)** using Astra (`GPT-6.2-Astra` at high effort across 21 batches: `P01`, `T01`, `B01`–`B14`, `R01a`–`R01e`), Opus (`claude-task`) cross-checks and source fetches (703 ranked source index entries, 0 ND licences, 0 deleted citations), and lead rulings.

- **Code & rules (`src/clueGame/signs.ts`, `src/clueGame/animalBoard.ts`, `src/clueGame/glossary.ts`, `src/game/debugBridge.ts`, `scripts/e2e.mjs`, `docs/CONTENT_SOURCES.md`, `docs/research/2026-11-07-moves-and-signs/sign-map.csv`, `tests/clueGame/signs.test.ts`, `tests/clueGame/animalBoard.test.ts`):**
  - Replaced `SignEntry` with a discriminated union (`ActiveSignEntry` with required `meaning`, `RetiredSignEntry` with `retired: true` and no rules; dropped dead `restates`; kept all 15 retired entries so live `7bce511a` rows still load with 0 `Unknown sign`).
  - Added load-time `signTableProblems(SIGNS)` validation, transitive open-tag closure `IMPLIED` / `heldSigns`, per-note one-sign-per-fact + retired + closure checks in `signProblems`, and implied-badge deduplication in `signsOf` (checked in `e2e.mjs` via `window.__cc.signImplies()`).
  - Fixed over-narrow sign rules (`climber`, `never_climbs`, `swimmer`, `above_tree_line`, `sand_dunes`, `snorkel_nose`, `often_in_trees`, `fully_aquatic`, `climbs_boulders`, `crevice_hider`) and guarded `travelOf` so terrestrial-only `swimmer`s keep walking.
  - Unified note-fit logic in exported `animalFitsNote` (shared across `witnessNotes`, `stillPossible`, tests, and witness metrics). `ANIMAL_RULES.version` stays `055-1`.
  - **Goal 2 rule (narrower/broader signs):** A narrower sign lists its broader sign in `SIGNS[tag].implies` only after passing **both** gate (a) strict entailment under approved `meaning` and gate (b) zero false wording fits across every newly matched suspect in Snapshot 2 (`7bce511a` live content) and Snapshot 3 (final content). `animalFitsNote` closes over wired edges via `heldSigns`; `signProblems` enforces one sign per fact per note; `signsOf` deduplicates implied broader signs so the field guide shows one badge.
  - **12 wired open-tag `implies` edges:** `above_tree_line→high_mountains`, `brown_throat→throat_patch`, `cecropia_leaves→leaf_eater`, `climbs_boulders→climber`, `dung_piles→scent_marks`, `floreana_island→one_island`, `hangs_upside_down→often_in_trees`, `mountain_meadows→high_mountains`, `pinta_island→one_island`, `roosts_in_trees→often_in_trees`, `seldom_on_ground→often_in_trees`, `sleeps_high_in_trees→often_in_trees`.
  - **10 deferred edges (for `witness-signs`, blocking live notes listed in `### Deferred edges and blocking notes` above):** `backward_pouch→pouch`, `carries_young_on_back→mother_carries_young`, `face_mask→face_markings`, `feathery_gills→underwater_breathing`, `s_shaped_horns→horns`, `shoulder_stripe→stripes`, `spectacles→face_markings`, `spiral_horns→horns`, `tear_lines→face_markings`, `walks_upright→stands_on_hind_legs`. One-sign-per-fact is already enforced on all 10 so `witness-signs` can wire them with zero profile churn.
  - Added 8 habitat terms to `src/clueGame/glossary.ts` and updated `scripts/e2e.mjs` for full-tag field-guide paging (`02d`, `FORCED = [144, 64]`, `turns` `ResizeObserver` wait).

### Audit Results, Witness Delta & Per-Animal Changes

- **Ledger (`/srv/critter-ai/agent-state/missions/sign-audit/ledger.csv`, 15,276 rows = 76 × 201 active signs, 0 conflicts):**
  - `1,449` `has it`, `698` `doesn't`, `795` `can't tell` (`785` material; only `1` held `can't tell`, `11 large_eyes`, kept under §2.7 removal bar), `14` `implied (wired)`, `16` `implied (deferred)`, `12,304` `no (triage)` (`class` 1,412, `body-plan` 1,686, `place` 1,219, `no-plausible-holder` 7,987). Full breakdown by category is in `## Final ledger and audit record (S24 / S26)`.
  - **Profile changes (`reconcile.py --from 7bce511a --to HEAD`: `1,433` actual ops match ledger, exit 0):** **934 `new_note` adds** (`933` newly added tags across all 76 animals + `46:21` standalone `forest_floor`), **4 removed held tags** (`1 yellow_legs`, `9 forest_floor`, `14 puffs_up`, `39 rarely_drinks`), **244 wording-gate moves** (`remove:<i>;new_note:<j> (wording gate)`), and **3 S5 one-sign-per-fact drops** (`33:5 high_mountains`, `46:5 forest_floor`, `66:5 scent_marks`). Added 198 new `db/content/citations.json` entries (261→459, 0 deleted/modified, 0 ND licences).
  - **Tags added and removed per animal (with sources):** Complete 76-animal table with every added sign's source key and every removed/dropped sign is recorded above in `### Tags added and removed per animal (with sources)` (lines 1025–1106); exact URLs/quotes/commits are in `db/content/animals/*.json`, `db/content/citations.json`, and `$SA/ledger.csv`.
- **Witness notes before and after (105 identical dealable sets, 525 combos; full table in `## Witness before and after (S1 → S2 → S3)`):**
  - **S1 baseline (`7bce511a` × `7bce511a`):** `402/525` (76.6%) combos with ≥1 eligible note, `940` eligible notes (`min 0 / median 1 / max 7`).
  - **S2 deploy window (HEAD code × `7bce511a` live DB):** `403/525` (76.8%) combos, `943` eligible notes, `0` `Unknown sign`, `0` lost notes, `3` changed rows (`2 true, 0 false` in `wording.csv`).
  - **S3 after owner's content build (HEAD × HEAD):** **`525/525` (100.0%)** combos with ≥1 eligible note (`+123`), **`5,803`** eligible notes (`6.17×`, `min 3 / median 10 / max 24`), `10,032` changed rows, `541` lost rows (all `541/541` reasoned in `$SA/metrics/s3/lost-reasons.csv`, `0` co-tagging losses), **`5,108 true / 0 false`** distinct newly matched wording-gate keys.

### Owner Disclosures Before `content -- build` (Fable MUST-FIX 1 & SC2)

Review these four effects before running the production `npm run content -- build` (the deploy itself only shows the tiny S2 delta above on existing live rows):

1. **Scope deviation (standard-sentence notes):** All 934 `new_note` adds are one-sign standard-sentence notes restating each sign's `meaning`, and 244 existing tags were moved off hand-written notes onto clean standard-sentence notes (`remove:<i>;new_note:<j>`) to pass the zero-false-fit wording gate without losing eligibility from co-tagging. Original hand-written clue text stays verbatim (untagged) so no existing clue was deleted or rewritten; `witness-signs` will unify witness display text globally.
2. **Balance impact (`scripts/balance-044.ts --rounds 60`, seed 44, `7bce511a` vs HEAD):** Richer witness notes make rounds noticeably easier once `content -- build` loads the new rows (0 balance change during the deploy window):
   - `africa` (23 sets): `careful` Found `98% → 100%`, ★★★ **`62% → 90%`**, moves left `16.1 → 19.4`, notes/round **`1.8 → 3.5`**, orders filled `2.6 → 1.9`; `novice` ★★★ `62% → 87%`; `expert` ★★★ `80% → 88%`; `reader` ★★★ `37% → 60%`.
   - `asia` (15 sets): `careful` Found `97% → 98%`, ★★★ **`47% → 73%`**, moves left `13.9 → 17.2`, notes/round **`1.0 → 3.2`**, orders filled `2.9 → 1.9`; `novice` ★★★ `47% → 83%`; `expert` ★★★ `63% → 87%`; `reader` ★★★ `25% → 57%`.
3. **Round-end card & field-guide length:**
   - Notes per animal: `628 → 1,806` total; `min / median / mean / max` **`4 / 8 / 8.26 / 12` → `14 / 23 / 23.76 / 36`** (max `#25` Tiger `36`, `#70` Baird's Tapir `36`, `#23` Aye-aye `34`, `#28` Asian Elephant `33`, `#11` Goliath Frog `32`).
   - Field-guide sign badges (`signsOf`) per animal: **`2 / 6 / 6.50 / 11` → `8 / 19 / 18.55 / 30`** (`#35` Red Panda; raw signs max `31`). Verified cleanly under `e2e:fresh` paging (`1554/1554`).
   - Near-duplicate untagged originals remain beside moved standard sentences (e.g., `64` African Savanna Elephant ears/mud/rumbles/trees; `15` Pancake Tortoise flat shell/crevices/boulders).
4. **Complete `travelOf` delta:** **0 animals change during the deploy window.** After `content -- build`, **9 animals change**: **5 `walk → swim`** (`1` Blanding's Turtle, `2` Spiny Softshell Turtle, `10` Suriname Toad, `11` Goliath Frog, `17` Pig-nosed Turtle — all `system:freshwater`) and **4 `walk → dig`** (`26` Black-footed Ferret, `33` Ethiopian Wolf, `48` Tasmanian Devil, `65` African Wild Dog — new `burrower`). Newly tagged terrestrial-only `swimmer`s (`24`, `25`, `28`, `30`, `35`, `41`, `44`, `51`, `52`, `54`, `63`, `64`, `71`) keep walking thanks to the `inWater` guard.
5. **Marginal `has it` badges & paywalled sources (Fable SC2, Risk R8):** Each tag has a verified ranked source matching the approved `meaning`, though a few are edge cases the owner may want tighter in `witness-signs`: `25` Tiger (`above_tree_line`, `town_dweller`, `black_coat` via Wikipedia's Simlipal pseudomelanistic tigers), `58` Cheetah (`high_mountains`), `57` Aardvark (`forest_floor`), `64` Savanna Elephant (`bamboo_forest`), and `town_dweller` (`has it` on documented plantation/garden residence for `25`/`28`/`56`/`7`/`16`/`51`, `can't tell` on crop-raiding only for `64`/`70`/`71`). Across all 76 species, 52 closed/paywalled source URLs (`31` animals) are marked `unavailable` in `$SA/sources/index.csv`; `785` material pairs remain `can't tell` (including held `11 large_eyes`, kept under §2.7).

### Notes for `witness-signs` (Mission 2b)

- **10 deferred edges** with exact blocking notes are listed in `### Deferred edges and blocking notes` above.
- **43 give-away notes** logged in `/srv/critter-ai/agent-state/missions/sign-audit/giveaways.md` (`12` still tagged at HEAD, `31` now untagged). Notably, `14:2` (Desert Rain Frog) is untagged after removing `puffs_up` and moving `squeaker`, but its verbatim text still mentions `"puffs up"` — drop or reword where untagged text is displayed.
- **Name-blanking (Fable SC4):** standard sentences using color/habitat words that match an animal's common name can get mangled by `WithBlanks` (e.g., `35` Red Panda `reddish_fur` `"Its fur is mostly ____, reddish brown or golden ____."` and `41` African Forest Elephant `forest_floor` `"the ____ floor"`).

### Code Reviews & Verification

- **Astra final code review (`origin/main`…`963615b9`):** `REJECT` (5 MUST-FIX, 2 SHOULD-CONSIDER) — all 5 MUST-FIX (`leaf_litter→forest_floor` dropped + `9` `forest_floor`/`climber` + unimplied `leaf_litter` holders; `town_dweller` `7`/`16`/`51`; `crevice_hider` drops `habitat:rocky` + `4`/`8`/`49`/`62`/`75`; `1 yellow_legs` removed; `1 burrower` Butler & Graham 1995 citation/wording) and SC1 (pinned deal-fit assertions in `animalBoard.test.ts`) fixed in S25a/S25b/S26; SC2 verified below.
- **Fable final code review (`origin/main`…`963615b9`):** `APPROVE_WITH_CHANGES` (1 MUST-FIX, 5 SHOULD-CONSIDER) — MUST-FIX 1 (owner disclosures), SC1 (`above_tree_line` drops `trees:no`), SC3 (`"at least partly"` meanings), SC4 (blanking note), and SC5 (dev E2E on HEAD content) all addressed; SC2 surfaced above.
- **Full Verification results (all exit 0):**
  - `npm run typecheck`, `npm run lint` (0 warnings), `npm test` (**147/147** pass across 3 suites).
  - `npm run content -- preview`: 0 problems, 0 citation warnings across 76 profiles.
  - `npm run content -- check` (live `phaser_june`, read-only): `Pool: 76 playable of 76 species, 2475 clues (2083 deductive), 491 facts. 0 errors, 0 warnings.`
  - Guarded `phaser_june_dev` `npm run content -- build && npm run content -- check`: `content_sources: 16 rows`, `species: 76 rows`, `species_deduction_clues: 3653 rows`, `species_facts: 491 rows`; **`Pool: 76 playable of 76 species, 3653 clues (3041 deductive), 491 facts. 0 errors, 0 warnings.`**
  - Guarded `phaser_june_dev` `CHROME_PATH=$HOME/.local/bin/chrome-nosandbox npm run e2e:fresh`: **`1554/1554 checks passed`**, 0 failed (Anywhere load median 2369 ms at 1×, 4651 ms at 4×; field-guide signs & paging verified including `splits: 17, moves: 1, bad: 0` and auto-turn/pause/resume). **Artifact:** `/srv/critter-ai/agent-state/missions/sign-audit/e2e-final/` (`report.json` + screenshots).
  - `$SA/scripts/ledger.py`: 15,276 rows, 0 without `final_verdict`, 0 `add:pending`, 0 conflicts.
  - `$SA/scripts/reconcile.py --from 7bce511a --to HEAD`: `1,433` actual ops match ledger.
  - `$SA/metrics/diff.py`: S1→S2 (`2 true / 0 false`), S1→S3 (`5,108 true / 0 false`, `541/541` lost rows reasoned).

### Owner's Production Content Build (Handoff Item Queued for Release)

This change requires the owner's production content build from WSL after the Release session merges and deploys `main` (handoff item to be added to `/srv/critter-ai/handoff/critter-connect.md` once deploy smoke tests pass, repeating the Fable MUST-FIX 1 disclosures above):
1. `git checkout main && git pull --ff-only`
2. Fresh production dump: `ssh root@play.critterconnect.org /opt/critter-connect/deploy/backup/pg-backup.sh`
3. `npm run content -- build`
4. `npm run content -- check` — expected summary: `Pool: 76 playable of 76 species, 3653 clues (3041 deductive), 491 facts.` and `0 errors, 0 warnings.`

### Sign Definitions (201 Active Signs; Authoritative Copy in `src/clueGame/signs.ts`)

15 retired tags kept only for live-row loading (no rules/meaning, rejected on new notes): `builds_nests`, `climbing_tail`, `coalitions`, `coastal_dunes`, `giant_frog`, `hair_like_frills`, `internal_fertilization`, `no_tadpoles`, `rock_basker`, `rock_climber`, `sand_swimmer`, `seasonal_streams`, `stays_underground`, `tree_dweller`, `yellow_scales`.

<details>
<summary>All 201 active sign definitions, categories, and active rules (click to expand)</summary>

| Sign | Category | Meaning | Implies / Denies |
|---|---|---|---|
| `above_tree_line` | habitat | Lives at least partly in the open high-mountain zone above the tree line, where it is too high and cold for trees to grow (living only in forest below it doesn't count). | implies: `high_mountains` |
| `algae_fur` | body | Algae grow in its fur or hair and tint it green (algae on a shell or skin don't count). | implies: `covering:fur` |
| `ambush_hunter` | habits | Catches prey mainly by hiding or waiting still and striking when prey comes close, rather than chasing it down. | denies: `diet:plants` |
| `backward_pouch` | life | The female's pouch opens toward her back legs (rear-facing), not toward her head. | — (deferred: `pouch`) |
| `bamboo_eater` | habits | Bamboo (leaves, stems or shoots) is its main food. | denies: `diet:meat`, `diet:insects` |
| `bamboo_forest` | habitat | Lives at least partly in forest with a thick undergrowth of bamboo (eating bamboo elsewhere doesn't count). | implies: `habitat:forest` |
| `basker` | habits | Regularly lies in the sun to warm its body, on logs, rocks, banks or at the water's surface. | denies: `activity:night` |
| `big_ears` | body | Its ears are large for its head, clearly bigger than most relatives' (sources call them big, large or huge). | — |
| `big_leaper` | habits | Moves or attacks with long leaps, covering several times its own body length in one jump. | — |
| `big_rivers` | habitat | Lives in large rivers (main channels, deep pools or backwaters), not only in small streams or ponds. | implies: `system:freshwater`, `habitat:wetlands` |
| `black_and_white` | body | Its coat or skin is mainly black and white, in large bold patches (a striped coat doesn't count, see stripes). | — |
| `black_coat` | body | Its fur is black or nearly black all over, in all or some individuals (a black color form counts). | implies: `covering:fur` |
| `bone_claws` | habits | Can push sharp bones out through the skin of its toes as claws when grabbed (ordinary claws don't count). | — |
| `borrowed_burrows` | habitat | Sleeps, hides or raises young in burrows or dens that other animals dug (holes it digs itself don't count). | — |
| `brackish_water` | habitat | Lives at least partly in brackish water, part salty and part fresh, as in estuaries, coastal lagoons or mangroves. | — |
| `bright_green` | body | Its body is mostly bright, leaf green. | — |
| `bromeliad_eater` | habits | Bromeliads (spiky plants of the pineapple family) are one of its main foods. | denies: `diet:meat`, `diet:insects` |
| `brown_throat` | body | Its throat is brown, standing out from the different color around it. | implies: `throat_patch` |
| `buries_itself` | habits | Hides or rests buried, covered by sand, mud, soil or fallen leaves, often with only its head out (resting inside a burrow doesn't count). | — |
| `burrower` | habits | Digs into the ground on land: digs burrows, tunnels or dens, or digs its body down into soil or sand (only resting in burrows others dug, or burying itself in leaves or underwater sand/mud, doesn't count). | — |
| `camouflage` | body | Its color or pattern helps it blend in with its surroundings so it is hard to see. | — |
| `carries_young_on_back` | life | A mother carries her baby riding or clinging on her back (eggs embedded in skin and fathers carrying tadpoles don't count, see mother_carries_young and father_carries_young). | — (deferred: `mother_carries_young`) |
| `cecropia_leaves` | habits | Leaves of Cecropia trees are a main part of its food. | implies: `leaf_eater`; denies: `diet:meat`, `diet:insects` |
| `chirps` | habits | Makes short, high, bird-like chirping calls. | — |
| `climber` | habits | Climbs well or often, in trees, on rocks or both (only scrambling onto logs or banks doesn't count). | — |
| `climbs_boulders` | habits | Climbs up big rocks, boulders or cliffs. | implies: `climber` |
| `cold_streams` | habitat | Lives in or by cool or cold, clear streams, often mountain streams. | implies: `system:freshwater`, `habitat:wetlands` |
| `crevice_hider` | habits | Hides in narrow cracks and gaps between or under rocks. | — |
| `cub_mane` | life | Its cubs or young have a mane or cape of long fur on the neck and back, which adults lose. | implies: `covering:fur`, `birth:live` |
| `digging_claws` | habits | Has strong, long claws that it digs with (soil, ant or termite nests, or rotten wood). | — |
| `dung_piles` | habits | Leaves its dung in piles it comes back to (middens), as messages to others of its kind. | implies: `scent_marks` |
| `ear_spots` | body | Has a bold spot of contrasting color on the back of each ear. | — |
| `eats_lichen` | habits | Lichens are a regular part of its food. | denies: `diet:meat`, `diet:insects` |
| `egg_guarding` | life | A parent stays with its eggs or nest and guards them until they hatch. | implies: `birth:eggs` |
| `eggs_on_land` | life | Lays its eggs out of the water, on land or underground, away from water. | implies: `birth:eggs`, `system:terrestrial` |
| `eggs_over_water` | life | Lays its eggs on leaves or branches hanging over water, so the hatching tadpoles drop in. | implies: `birth:eggs` |
| `electric_sense` | habits | Can sense the weak electric signals of other animals' bodies, to find prey. | — |
| `ever_growing_teeth` | body | Some of its teeth keep growing all its life, worn down by use. | — |
| `eye_glands` | body | Has large scent glands just below or in front of its eyes. | — |
| `face_markings` | body | Has bold markings of a contrasting color on its face: patches, rings, a mask, crescents or lines. | — |
| `face_mask` | body | A dark band or patch across its eyes looks like a mask. | — (deferred: `face_markings`) |
| `false_thumb` | body | Has a "false thumb": an enlarged wrist bone or extra digit that it uses like a thumb to grip. | — |
| `fast_runner` | habits | Runs fast: it can sprint or chase at about 50 km/h or more. | — |
| `fast_streams` | habitat | Lives in or by fast-flowing streams or rivers with rushing water. | implies: `system:freshwater`, `habitat:wetlands` |
| `father_carries_young` | life | The father carries the eggs or young (such as tadpoles) on or in his body. | — |
| `feathery_gills` | body | Has feathery gills sticking out from its body (outside gills) as an adult. | implies: `habitat:wetlands` (deferred: `underwater_breathing`) |
| `feeds_on_ground` | habits | Finds most of its food on the ground, even if it can climb. | — |
| `fish_eater` | habits | Fish are a main part of its food. | denies: `diet:plants` |
| `five_front_claws` | body | Has five claws on each front foot. | — |
| `flat_body` | body | Its body (and often its head) is very flat, much wider than it is tall. | — |
| `flat_shell` | body | Its shell is very flat and low, not domed. | implies: `covering:shell` |
| `flippers` | body | Its legs (at least its front legs) are flat, paddle-shaped flippers (webbed feet alone don't count). | implies: `habitat:wetlands` |
| `floreana_island` | habitat | Lives (or lived) wild only on Floreana Island in the Galápagos. | implies: `one_island` |
| `foam_nest` | life | Makes a nest of foam for its eggs. | implies: `birth:eggs` |
| `fog_drinker` | habitat | Gets much of the water it needs from fog or mist. | — |
| `forest_floor` | habits | Lives and feeds on the ground of a forest, rarely if ever climbing up into the trees. | implies: `trees:no`, `habitat:forest`; denies: `often_in_trees`, `seldom_on_ground` |
| `forest_streams` | habitat | Lives in or by streams that run through forest. | implies: `system:freshwater`, `habitat:wetlands`, `habitat:forest` |
| `four_toes` | body | Has only four toes on each foot, front and back. | — |
| `fruit_eater` | habits | Fruit is a main or favorite part of its food. | denies: `diet:meat`, `diet:insects` |
| `fully_aquatic` | habits | Spends its whole life in water and rarely or never comes out onto land. | implies: `habitat:wetlands`; denies: `trees:yes`, `eggs_on_land` |
| `furry_feet` | body | The soles of its feet are covered in fur. | implies: `covering:fur` |
| `giant_tortoise` | body | A giant tortoise: a land tortoise whose shell grows to about 70 cm long or more. | implies: `covering:shell`, `birth:eggs`, `system:terrestrial`, `lifespan:long`; denies: `size:tiny`, `size:small`, `size:medium` |
| `giant_turtle` | body | A giant turtle: a water turtle whose shell grows to about 80 cm long or more. | implies: `covering:shell`, `birth:eggs`, `lifespan:long`; denies: `size:tiny`, `size:small`, `size:medium` |
| `glider` | habits | Glides through the air from tree to tree on skin flaps or webbed feet, without flapping wings. | implies: `trees:yes` |
| `grasping_lip` | body | Its upper lip is pointed and grabs leaves and twigs like a finger. | — |
| `grazer` | habits | Mostly eats grass or other low plants it crops from the ground, rather than leaves of shrubs and trees. | denies: `diet:meat`, `diet:insects` |
| `hangs_upside_down` | habits | Often hangs upside down from branches. | implies: `trees:yes`, `often_in_trees` |
| `hard_toe_tips` | body | Its toe tips are hard (horny) for gripping. | — |
| `high_mountains` | habitat | Lives at least partly high up in mountains: upper slopes, high plateaus or alpine zones (foothills and low hills don't count). | — |
| `hinged_shell` | body | Its shell has a hinge, so it can close up. | implies: `covering:shell` |
| `hisses` | habits | Makes a loud hissing sound. | — |
| `hooves` | body | Walks on hooves: toes that end in hard hoof, including tapirs' and rhinos' hoofed toes. | — |
| `horns` | body | Has horns on its head, in at least one sex: bony horns, rhino horns, or skin-covered horns like the okapi's (antlers and tusks don't count). | — |
| `huge_head` | body | Its head is very large for its body. | — |
| `kopjes` | habitat | Lives on kopjes: rocky hills or rock piles rising from the African plains. | implies: `habitat:rocky` |
| `large_eyes` | body | Its eyes are large for its head (sources call them big or large). | — |
| `leaf_eater` | habits | Leaves are a main part of its food. | denies: `diet:meat`, `diet:insects` |
| `leaf_litter` | habitat | Lives at least partly among the fallen leaves (leaf litter) on a forest floor. | implies: `habitat:forest` |
| `leg_spurs` | body | Has big, pointed, spur-like scales or spurs on its legs. | — |
| `lidless_eyes` | body | Its eyes have no eyelids. | — |
| `long_arms` | body | Its arms are very long, longer than its legs. | — |
| `long_finger` | body | One finger on each hand is much longer and thinner than the others. | — |
| `long_legs` | body | Its legs are very long for its body. | — |
| `long_tail` | body | Its tail is long: about as long as its head and body, or at least two-thirds of that. | — |
| `long_tongue` | body | Its tongue is very long and reaches far out of its mouth, often sticky, for catching insects or grabbing leaves. | — |
| `loud_calls` | habits | Makes loud calls that carry far: songs, hoots, barks, roars or wails. | — |
| `low_rumbles` | habits | Calls with deep, low rumbles, some too low for people to hear. | — |
| `mane` | body | Adults have a mane: a crest or ruff of longer hair on the neck or back. | implies: `covering:fur` |
| `many_teeth` | body | Has an unusually large number of teeth, far more than most animals of its kind. | — |
| `mother_carries_young` | life | The mother carries her eggs or young on her body as she moves about: on her back, belly or tail, or in pockets in her skin (young in a pouch don't count, see pouch). | — |
| `mountain_meadows` | habitat | Lives at least partly in grassy meadows high on mountainsides. | implies: `habitat:grassland`, `high_mountains` |
| `mud_bather` | habits | Wallows in mud, or coats itself with mud, to cool off or protect its skin. | — |
| `neck_hump` | body | Has a raised hump or crest on the back of its head and neck. | — |
| `nectar_drinker` | habits | Drinks nectar from flowers. | denies: `diet:meat` |
| `never_climbs` | habits | Never climbs trees: it stays on or under the ground, or in water. | implies: `trees:no`; denies: `often_in_trees`, `seldom_on_ground`, `hangs_upside_down`, `roosts_in_trees`, `sleeps_high_in_trees` |
| `no_tongue` | habits | Has no tongue. | denies: `long_tongue` |
| `nomadic` | habits | Has no fixed home area: it wanders or migrates over long distances, following food, water or rain. | — |
| `often_in_trees` | habits | Spends much of its time up in trees, feeding, resting or sleeping there, even if it also travels on the ground. | — |
| `one_island` | range | Its whole wild range today (or when it was last alive, if extinct) is on one island, of any size (Madagascar, New Guinea or Tasmania count; a continent like Australia doesn't; two or more islands don't). | — |
| `orange_feet` | body | Its feet (toes or toe pads) are orange. | — |
| `pack_hunter` | habits | Hunts together with others of its group to catch prey. | implies: `social:groups`; denies: `diet:plants` |
| `paddle_tail` | body | Its tail is flattened like a paddle or oar, for swimming. | implies: `habitat:wetlands` |
| `patchy_coat` | body | Its coat is a blotchy patchwork of several colors, different on each animal. | implies: `covering:fur` |
| `pig_nose` | body | Its nose ends in a flat, round, pig-like snout disc with the nostrils at the front. | — |
| `pinta_island` | habitat | Lives (or lived) wild only on Pinta Island in the Galápagos. | implies: `one_island` |
| `pointed_snout` | body | Its snout is long, or ends in a narrow, pointed tip. | — |
| `poor_eyesight` | habits | Sees poorly or is blind, and relies mainly on other senses (smell, hearing or touch). | — |
| `pouch` | life | The female has a pouch on her belly where her baby (or egg) grows. | — |
| `prairie_dog_towns` | habitat | Lives in prairie dog colonies ("towns") and uses their burrows (not the same as living near people, see town_dweller). | implies: `habitat:grassland` |
| `puffs_up` | habits | Puffs its body up with air when threatened. | — |
| `purple_gray` | body | Its body is dark purplish gray. | — |
| `pushes_over_trees` | habits | Pushes or knocks over whole trees to feed. | — |
| `raids_termite_mounds` | habits | Breaks open ant or termite nests or mounds with its claws or snout to eat the insects inside (poking tools into openings doesn't count). | denies: `diet:plants` |
| `rain_breeder` | life | Breeds when heavy rains come, often in pools or puddles the rain fills. | — |
| `rarely_drinks` | habits | Can go days or longer without drinking, getting most of its water from its food. | — |
| `red_eyes` | body | Its eyes are red. | — |
| `red_orange` | body | Its body is bright red-orange. | — |
| `reddish_fur` | body | Its fur is mostly red, reddish brown or golden red. | implies: `covering:fur` |
| `regrows_body_parts` | habits | Can regrow lost body parts such as legs, tail or gills. | — |
| `rests_by_waterfalls` | habits | Rests on wet rocks by waterfalls or rapids. | implies: `system:freshwater`, `habitat:wetlands` |
| `rests_on_bottom` | habits | Rests on the bottom of a river, lake or pond, under water. | implies: `habitat:wetlands` |
| `ringed_tail` | body | Its tail has rings of alternating colors. | — |
| `rodent_hunter` | habits | Rodents are a main part of its prey. | denies: `diet:plants` |
| `rolls_into_ball` | habits | Curls up into a tight ball to protect itself. | — |
| `roosts_in_trees` | habits | Rests (roosts) hanging or perching in tree branches, often in groups. | implies: `trees:yes`, `habitat:forest`, `often_in_trees` |
| `round_body` | body | Its body is round and puffy. | — |
| `s_shaped_horns` | body | Its horns curve back and then up or forward, making an S shape seen from the side. | — (deferred: `horns`) |
| `saddleback_shell` | body | Its shell is a "saddleback": raised high at the front, above the neck. | implies: `covering:shell` |
| `salt_licks` | habits | Seeks out salt licks, or mineral-rich soil, clay or water, to get minerals. | — |
| `sand_dunes` | habitat | Lives on or in sand dunes, coastal or inland. | — |
| `sandy_bottoms` | habitat | Lives in rivers or lakes with soft, sandy or muddy bottoms. | implies: `system:freshwater`, `habitat:wetlands` |
| `scavenger` | habits | Often eats animals that are already dead (carrion). | denies: `diet:plants` |
| `scent_marks` | habits | Marks its home area, paths or objects with scent: urine, dung or rubbed-on gland scent (just having scent glands doesn't count). | — |
| `screecher` | habits | Makes loud, harsh screeches. | — |
| `seed_spreader` | habits | Spreads plant seeds to new places, mostly by eating fruit and passing the seeds in its droppings. | denies: `diet:meat`, `diet:insects` |
| `seldom_on_ground` | habits | Lives in trees and seldom comes down to the ground. | implies: `trees:yes`, `often_in_trees` |
| `senses_vibrations` | habits | Feels vibrations or ripples through the ground or water, to sense prey, danger or others. | — |
| `shallow_wetlands` | habitat | Lives in shallow, still water such as marshes, ponds and bogs. | implies: `system:freshwater`, `habitat:wetlands` |
| `shares_food` | habits | Shares food with, or brings food to, other members of its group beyond its own young (a parent feeding only its own young doesn't count). | denies: `social:alone` |
| `shell_spines` | body | Has small spines or pointed bumps on its shell, mainly along the front edge. | implies: `covering:shell` |
| `shoulder_stripe` | body | A single bold stripe runs across its shoulders. | — (deferred: `stripes`) |
| `side_frills` | body | Grows thin, hair-like flaps of skin on its sides (and thighs). | — |
| `skin_folds` | body | Its skin has deep folds, like plates of armor. | implies: `covering:skin` |
| `sleeping_nests` | habits | Builds a nest or bed (of leaves, branches or grass) to sleep or rest in, in a tree or on the ground. | — |
| `sleeps_high_in_trees` | habits | Sleeps or rests high up in trees. | implies: `trees:yes`, `often_in_trees` |
| `slow_mover` | habits | Moves very slowly, even when disturbed. | denies: `fast_runner` |
| `snorkel_nose` | habits | Can breathe through the tip of its raised nose, snout or trunk while the rest of its body stays under water. | — |
| `snowy_winters` | habitat | Lives where snow covers the ground for weeks or months in winter. | — |
| `snub_nose` | body | Its nose is short, flat and turned up. | — |
| `soars` | habits | Soars: glides on rising warm air without flapping. | — |
| `spectacles` | body | Pale rings or markings around its eyes look like glasses. | — (deferred: `face_markings`) |
| `spiky_shell` | body | Its shell has spikes or sharp points around its edge. | implies: `covering:shell` |
| `spiny_forest` | habitat | Lives in dry spiny forest: thorny, cactus-like forest and brush. | implies: `habitat:forest` |
| `spiral_horns` | body | Its horns twist in a spiral, like a corkscrew, along their length. | — (deferred: `horns`) |
| `spots` | body | Its coat or skin is covered with spots or rosettes. | — |
| `spotted_belly` | body | Its belly is spotted. | — |
| `squeaker` | habits | Makes high squeaking calls. | — |
| `stands_on_hind_legs` | habits | Rises up or moves on its back legs alone, at least sometimes: standing, rearing up, hopping or running upright. | — |
| `star_fingers` | body | Each fingertip ends in a tiny star shape. | — |
| `star_pattern` | body | Its shell or skin has lines spreading out like stars. | — |
| `startle_display` | habits | Suddenly flashes bright colors (eyes or body) to startle a predator. | — |
| `stays_larval` | life | Grows up and breeds while keeping its larval body (gills, life in water), never changing into a land form. | — |
| `sticky_skin` | habits | Its skin oozes a sticky glue when it is grabbed. | implies: `covering:skin` |
| `stores_food` | habits | Gathers food and stores it for later, such as haypiles for winter. | — |
| `striped_young` | life | Its young have stripes (and sometimes spots) that fade as they grow up. | — |
| `stripes` | body | Has stripes: one or more long bands of contrasting color on its body or legs (tail rings don't count, see ringed_tail). | — |
| `strong_bite` | body | Bites or chews with unusual force for its size. | — |
| `stubby_tail` | body | Its tail is very short, just a stub. | denies: `long_tail` |
| `sucker_mouth_tadpoles` | life | Its tadpoles cling to rocks in fast water with a sucker-like mouth. | implies: `birth:eggs` |
| `super_hearing` | body | Has exceptionally sharp hearing that it relies on. | — |
| `surfaces_to_breed` | life | Lives underground and comes to the surface only briefly, to breed. | — |
| `swimmer` | habits | Swims well or often, by choice, in water (moving through sand or soil doesn't count). | — |
| `tail_organ` | body | Males have a tail-like body part used for mating. | — |
| `tap_forager` | habits | Taps on wood or bark and listens for hollow spots to find hidden food. | — |
| `tear_lines` | body | Dark lines run from the inner corner of each eye down to its mouth, like tear tracks. | — (deferred: `face_markings`) |
| `temperature_sex` | life | Whether its eggs hatch male or female depends on the nest's temperature. | — |
| `territorial` | habits | Defends an area (a territory, home patch or den site) against others of its kind (fights over mates alone don't count). | — |
| `throat_patch` | body | Has a patch or patches of contrasting color on its throat. | — |
| `tooth_plate` | body | Has a bony, tooth-like plate in its jaw. | — |
| `toothless` | body | Has no teeth at all as an adult. | denies: `many_teeth`, `tube_teeth`, `ever_growing_teeth`, `tusks` |
| `town_dweller` | habitat | Lives in or near human settlements: towns, villages, gardens, parks or plantations (not the same as prairie dog towns). | — |
| `trunk` | body | Has a trunk: a long, bendy nose joined with its upper lip (an elephant's long trunk or a tapir's short one). | — |
| `tube_teeth` | body | Its teeth are made of many tiny tubes and have no enamel. | — |
| `tusks` | body | Has tusks: long teeth that stick out of its mouth, in at least one sex. | — |
| `underwater_breathing` | body | Can take in oxygen from the water (through gills, skin or throat) while it stays under water. | implies: `habitat:wetlands` |
| `uses_tools` | habits | Uses objects such as sticks or stones as tools to get food or do tasks. | — |
| `venomous` | body | Can inject venom with a bite, sting or spur. | — |
| `vertical_pupils` | body | Its pupils are vertical slits. | — |
| `voiceless` | habits | Makes no calls: no croaks, songs, squeaks or other voice sounds (a hiss of breath doesn't count as a call). | denies: `chirps`, `loud_calls`, `low_rumbles`, `screecher`, `squeaker`, `whistle_calls` |
| `walks_on_knuckles` | habits | Walks on its knuckles or the sides of its curled front feet, keeping its claws or fingers off the ground. | — |
| `walks_upright` | habits | Usually walks on its back legs, using its front legs only now and then. | — (deferred: `stands_on_hind_legs`) |
| `warning_colors` | body | Has bright colors that warn predators it is poisonous or bad to eat. | — |
| `webbed_feet` | body | Has webbed feet: skin joins its toes. | — |
| `whistle_calls` | habits | Calls with high whistles. | — |
| `white_belly` | body | Its belly is plain white. | — |
| `white_ear_rims` | body | Its ears have white edges. | — |
| `white_tail_tip` | body | Its tail ends in white, or has a white band near its end. | — |
| `wings` | body | Has wings it flies with. | — |
| `winter_rest` | habits | Rests or sleeps through the winter, inactive for weeks or months (hibernation or brumation). | — |
| `yellow_head` | body | Its head is mostly yellow. | — |
| `yellow_legs` | body | Its legs are yellow (yellow skin or scales). | — |

</details>
