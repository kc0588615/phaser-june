---
mission: sign-audit
project: critter-connect
branch: agent/sign-audit
status: active
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
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

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

**F2 · `never_climbs` implies `habitat:forest`** (`signs.ts:129`). The note's wording has leaked into the rule: 55's note says "Even though it lives in forests, it never climbs trees".
- `habitat` is a complete prefix, so the rule blocks **32** animals with no forest habitat. Those are exactly the animals most likely to never climb (zebra, addax, rhino, gazelle, hirola).
- **Fix:** `implies: ['trees:no']`, `denies: ['climber']`, using open-tag `denies` (F8).

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
- **Fix:** a discriminated union (§1.1).

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
- **Existing co-holds (verified across all 20 candidates):** only Ethiopian Wolf 33 (`above_tree_line` + `high_mountains`) and Black Rhinoceros 66 (`dung_piles` + `scent_marks`), each on one note.
- Unchecked mutual exclusions: `climber`/`never_climbs`, `long_tail`/`stubby_tail`, `long_tongue`/`no_tongue`, `toothless`/`many_teeth`/`tube_teeth`, `voiceless`/call signs, `fully_aquatic`/`eggs_on_land`.
- Measured on today's content, 14 strict edges:
  - take combinations with ≥1 eligible note from 402 to 407
  - take eligible notes from 940 to 959 (+22 added, −3 that now fit all 5)
  - change 27 fit counts

**F8 · Sign-to-sign rules are only half implemented.**
- An `implies` with an open tag silently does nothing: `tagOutcome` returns `'unknown'` when there's no prefix (`deduction.ts:11`).
- A `denies` with an open tag already works against `record`, because `record` holds the profile's open tags too (`profiles.ts:295,375`). No entry uses it yet.
- "One sign per fact" (`CONTENT_SOURCES.md:76`) is prose only; nothing flags redundant narrow+broad tags.

**F9 · Fits and live compatibility.**
- `witnessNotes` (`animalBoard.ts:231-237`) matches literally on `Animal.tags`, which is every clue tag, traits included (`questionMatchContent.ts:131-136`). Only `witnessNotes` and `travelOf` read `Animal.tags`. `travelOf` is called on the fly (`useAnimalSession.ts:196,266`; `balance-044.ts:90`).
- `roundStillFits` (`:245-260`) compares the saved notes' text, tags and fits. A fit change re-deals only the saves it affects, with no need to bump `ANIMAL_RULES.version`.
- `noteCategories` (`signs.ts:262`) and the field-guide badges (`AnimalSheets.tsx:217`, `animal.signs`) read raw tags.
- Unknown tags throw at load (`signs.ts:257`), so every tag a live row uses must stay in `SIGNS`.
- `pickSuspectSet` and `dealClues` read traits only, never signs.
- `validatePool` (`content -- check`) doesn't run sign rules, so live rows built before the new rules still pass.
- `tests/clueGame/animalBoard.test.ts:79-88` recomputes fits with a literal `tags.includes`, so it changes together with `witnessNotes`.

**Dataset and baseline:**
- `SIGNS`: 216 entries. 201 are active (body 87, habits 75, habitat 22, life 16, range 1) and 15 retired. 506 tag uses, 494 distinct (sign, animal) holds, 433 tagged notes (66 with several signs, none mixing signs and traits), 93 signs held by 2+ animals.
- Pairs: 15,276 (76 × 201) = 494 held + 14,782 open. The open ones are 7,410 cross-class, 5,578 same class but another order, 1,794 same order. Triage should remove about 75–85% of the open pairs, leaving roughly 2,200–3,800 open candidates plus the ~494 held pairs to check.
- Sources: 259 of 267 cited pages are already cached across `cc-clue-verify/sources/` and `cc-clue-design/sources/`. 8 are missing (7 `literature` DOIs, 1 `sdzwa` page). 11 animals have no ADW account.
- Witness baseline (current dealer, `7bce511a`):
  - 105 dealable sets (world 49, africa 23, asia 15, north-america 9, south-america 9), so 525 (set, mystery) combinations
  - 402 combinations (76.6%) have ≥1 eligible note, 940 eligible notes in all
  - 2,091 (combo, note) cases dropped for fitting only the mystery, 22 for fitting all 5

### Target design

The lead's **A3 + B2**, with its four refinements. Part 1 is repo code and content rules, which ship in one **rules commit** before triage. Part 2 is the audit pipeline, in the state folder only.

#### 1. Code and schema

**1.1 `SignEntry` becomes a discriminated union** (`signs.ts:8-18`):

```ts
/** A sign players can be shown and authors can tag. */
export interface ActiveSignEntry {
  category: ChargeCategory;
  /** The definition: what counts and what doesn't, one line. Authoritative for tagging and for the audit. */
  meaning: string;
  /** What its meaning entails. Trait tags (`prefix:value`): the holder's record must not rule them out.
   *  Open tags (active signs): strictly broader signs the holder therefore also holds (witness fits, rule checks). */
  implies?: readonly string[];
  /** What its meaning rules out. Trait tags: the holder must not hold them. Open tags: the holder must not hold
   *  that sign or any sign implying it. One direction is enough for a mutual exclusion. */
  denies?: readonly string[];
  /** The asked trait tag its words simply are. */
  restates?: string;
  retired?: never;
}
/** A tag kept only so rows an older content build wrote still load. No rules, no meaning; never tagged again. */
export interface RetiredSignEntry { category: ChargeCategory; retired: true }
export type SignEntry = ActiveSignEntry | RetiredSignEntry;

const at = (category: ChargeCategory, meaning: string, rules: Pick<ActiveSignEntry, 'implies' | 'denies' | 'restates'> = {}): ActiveSignEntry => ({ category, meaning, ...rules });
const retired = (category: ChargeCategory): RetiredSignEntry => ({ category, retired: true });
```

- The 15 retired tags become `retired('…')`, which drops their false rules, including `tree_dweller`'s `restates`. Retired signs are rejected outright (§1.3), so those rules have nothing left to guard.
- A missing `meaning` on an active entry, or a rule on a retired one, is a compile error.
- `FRESH_WATER` stays for the habitat signs that still use it (`big_rivers`, `cold_streams`, `fast_streams`, `forest_streams`, `sandy_bottoms`, `shallow_wetlands`, `rests_by_waterfalls`).

**1.2 Table check and closure, built once at module load** (pure, in `signs.ts`):
- `export function signTableProblems(table: Readonly<Record<string, SignEntry>>): string[]` is a query. It reports:
  - an active entry whose `meaning.trim()` is empty
  - an `implies`/`denies` target with a colon whose prefix is in neither `EXCLUSIVE_PREFIXES` nor `COMPLETE_PREFIXES` (`traits.ts`), since a prefix typo would otherwise silently match nothing
  - an open-tag target that is missing from the table, or retired
  - a sign that implies or denies itself
  - a cycle in open-tag `implies` (reported as `a -> b -> a`)
  - a `restates` without a known prefix
- At load: `const tableProblems = signTableProblems(SIGNS); if (tableProblems.length) throw new Error(...)`. Every importer fails fast: the app, `content`, the tests, `balance-044`.
- Then `const IMPLIED: ReadonlyMap<string, ReadonlySet<string>>` maps each entry to the open signs it transitively implies, by DFS over open-tag `implies` (the table is now known to have no cycles). Retired entries map to an empty set. The cost is one pass over 216 entries, so nothing needs memoizing per animal.
- A private `entryOf(tag)` throws the existing `Unknown sign "<tag>"…` message. `signCategory` (`:255-259`) and the closure both use it, so the lookup isn't duplicated.

**1.3 Queries** (`signs.ts`; `openTags` (`:246`) stays private and unchanged):
- **`export function heldSigns(tags: readonly string[] | undefined): ReadonlySet<string>`**: the record's own open tags plus every sign they transitively imply (`IMPLIED`). It throws on an unknown tag; live animals never reach that, because `signsOf` already threw at load. A retired tag on a live row is held as itself and implies nothing, so live rows load and fit exactly as tagged.
- **`signsOf`, `signCategory` and `noteCategories` accept retired entries unchanged.** Badges and note marks stay raw: a narrower holder never shows its broader badge.
- **`signProblems(clues, record)`** keeps its signature and its only caller (`profiles.ts:375`, inside `checkProfile`, so it also runs in `content -- preview/build` and in `content.test.ts:15`). `record` is still every tag of `profileClues`, including open tags. Let `own` be the profile's distinct open tags and `closure = heldSigns(own)` (computed only after step 1 passes). It returns:
  1. **Unknown:** each `own` tag missing from `SIGNS` (existing message). If there are any, return now: the remaining checks need the closure.
  2. **Retired:** each `own` tag whose entry is retired: `sign "<tag>" is retired (kept only so old rows load): tag what the note shows with an active sign`.
  3. **Contradiction:** for each `own` tag `t`, and each `s` in `{t} ∪ IMPLIED(t)`:
     - every trait target of `s.implies` whose `tagOutcome` against `record` is `exclusive-conflict` or `complete-conflict` (only trait tags reach `tagOutcome`; `deduction.ts` is unchanged)
     - every trait target of `s.denies` that `record` holds
     - every open target of `s.denies` that `closure` holds. This covers mutual exclusions, and a denied broad sign reached through a narrower one.
     - Reported per `t`, naming the sign `s` the rule comes from: `sign "<t>" contradicts its holder's record (it reads as …, via <s>): tag what the note shows`.
  4. **One sign per fact:** for each ordered pair of distinct `own` tags `x`, `y` with `y ∈ IMPLIED(x)`: `sign "<y>" is already stated by "<x>": keep only the narrower (one sign per fact)`. This applies whether they're on the same note or different notes.
  5. **Restates:** existing.

**1.4 `witnessNotes`** (`animalBoard.ts:231-237`). Each suspect's held set is computed once, as raw tags (traits and signs) plus the closure:
```ts
const held = new Map(suspects.map(id => { const tags = animal(book, id).tags ?? []; return [id, new Set([...tags, ...heldSigns(tags)])]; }));
const fits = suspects.filter(id => note.tags!.every(tag => held.get(id)!.has(tag))).length;
```
- Prefixed tags still match raw, so behaviour stays fully backward compatible.
- A note with several tags fits only when every tag is held.
- The note's own tags are never expanded: a note tagged `pouch` fits `backward_pouch` holders, and a note tagged `backward_pouch` doesn't fit `pouch` holders.
- The doc comment changes to "records every tag of the note, or a narrower sign that states it".
- `tests/clueGame/animalBoard.test.ts:84`'s oracle switches to `heldSigns` in the same commit.

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
| `never_climbs` | `implies: ['trees:no']`, `denies: ['climber']` (plus `often_in_trees` if it stays a climbing sign) |
| `swimmer` | no rules; "swims well or often, by choice" |
| `above_tree_line` | `implies: ['trees:no']`; `denies` dropped |
| `sand_dunes` | `implies` dropped |
| `snorkel_nose` | default: drop `FRESH_WATER` ("breathes through a raised nose or trunk tip while under water"); keep it only if the definition limits it to fresh-water animals |
| `shares_food` | default: keep `denies: ['social:alone']`, defined "shares food with others of its group (a mother feeding her young doesn't count)" |
| `often_in_trees` | default: drop `trees:yes` and `habitat:forest` ("spends much of its time in trees"); if strictly entailed, add the edge `often_in_trees`→`climber` |
| `carries_young_on_back` | decided from all holders' notes (52/56/61/63 mothers; frogs 9/76, toad 10). Default: "a mother carries her young on her back", with the edge →`mother_carries_young`; frogs keep `father_carries_young`. This keeps 059's single badge. The alternative (either parent, no edge) needs both signs on 52/56/61/63, which 059 removed. |

- Every open-tag edge (F7) is wired only once the lead has signed it off in `definitions.csv` as a strict entailment under both meanings.
- **Content fixes forced by the rules commit:**
  - If those edges are approved, drop `high_mountains` from 33's note and `scent_marks` from 66's note. This changes no fit (the closure supplies them).
  - Retag any profile whose sign is split or retired.
  - With these fixes, `content -- preview` stays clean at the commit.

**1.7 Tests first** (`npm test`, per the testing rules). Before any code, the rules commit's author writes down the ways it can fail, then writes these tests:
- `signTableProblems`: each problem in §1.2, on small fixture tables.
- `signProblems`: unknown (with early return); retired; trait conflict through the closure; open `denies` against a directly held sign and against one reached through a narrower sign; one sign per fact on the same note and across notes; restates; a clean profile.
- `heldSigns`: retired tag held raw with no closure; unknown tag throws.
- `witnessNotes`: a narrower holder fits a broad note and not the reverse; a note with several tags.
- `travelOf`: terrestrial-only `swimmer` walks; `swimmer` with `system:freshwater` swims; `fully_aquatic` swims; `glider` and bats fly; `burrower` digs.

**1.8 Live database and `ANIMAL_RULES.version` (stays `055-1`).**
- **Deploy:** the deploy ships the rules commit and the profile edits together, but live rows stay at `7bce511a` content until the owner's content build.
  - The live rows load, because every tag they use is still in `SIGNS`, retired ones included.
  - Fits on live change by exactly the snapshot-2 delta (§2.8).
  - `signProblems` never runs on live rows (`validatePool` doesn't call it), so `content -- check` stays clean.
- **Owner's content build:** fits change by the snapshot-3 delta.
- In both windows, `roundStillFits` drops only the saved rounds whose notes' text, tags or fits changed; every other save resumes. A version bump would throw away every save.
- `travelOf` is computed when a suspect is marked, so saved games keep their shape.
- `pickSuspectSet` and `dealClues` don't change unless a sign rule forces a trait value. Any such change is recorded, and the set list is recomputed in every snapshot.

**1.9 Docs** (in the same rules commit):
- `docs/CONTENT_SOURCES.md` Signs section:
  - each sign's `meaning` in `SIGNS` is its definition
  - Goal 2's rule: a narrower sign `implies` its broader one; witness fits count it; tag only the narrower; `signProblems` flags both on one profile
  - retired tags are rejected
  - corrected examples at `:75-77` (no more "`climber` reads as trees yes" / "`swimmer` reads as fresh water")
- `sign-map.csv` is updated at the end (§2.9).

#### 2. Audit pipeline (`/srv/critter-ai/agent-state/missions/sign-audit/`)

**2.1 Definitions** (lead, before the rules commit): `definitions.csv` holds `sign, category, meaning, holders_at_7bce511a, change (keep|redefine|split:<tags>|retire-into:<tag>), implies, denies, edge_sign_off (lead, date)`. It covers all 201 active signs. The rules commit copies `meaning`/`implies`/`denies` from it into `signs.ts` word for word; afterwards the code is authoritative and the CSV is the record.

**2.2 Pinned export:** `game/` is `git archive` of the rules commit and `game.sha` holds its sha, using the `cc-clue-verify`/`cc-clue-design` layout. That's why `scripts/run-ts.sh` maps `@/*` to `../game/src/*`. All triage, pairs and Astra batches read `game/`. Profile edits happen later, in the worktree.

**2.3 Triage:**
- `triage.csv` holds `sign, rule, excluded_ids, reason`. `rule` comes from a fixed list in `triage-rules.md`: `class`, `body-plan`, `place`, `no-plausible-holder`, each with its lead-written test.
- `scripts/pairs.py` expands it into `pairs.csv`: `sign, category, animal_id, group, status (held|implied|open|triaged), implied_by, triage_rule, batch`. It has exactly 76 × the active signs in `game/`.
  - `held`: the animal's raw tags contain the sign.
  - `implied`: not held, but in `heldSigns` through a held narrower sign (`implied_by` names it).
  - **A held pair can't be triaged.** `pairs.py` exits non-zero if a rule excludes a holder, since either the rule or the tag is wrong. Such a pair goes to a batch.
- **Held pairs are checked** in the normal batches, so false existing tags can get `doesn't` and be removed (Goal 4).
- **Implied pairs** skip Astra only while the narrower hold survives. When a narrower hold's final verdict is `doesn't`, `ledger.py` re-opens each pair it implied into the re-check batch (§2.5).
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
- **Failure handling:**
  - Timeout, missing rows, or a structural reject: halve the batch (`B07a`/`B07b`, `parent` column in `batches.csv`) and rerun.
  - Exit 3: commit what's done and end with `MISSION_WAIT_ASTRA`.
  - Exit 4: handoff item for `codex login --device-auth`, then carry on with work that doesn't need Astra (cross-checks, edits).
  - Exit 5: rerun once halved; if it fails again, record it and add a handoff item.
- **Re-check batch:** one final batch holds the re-opened implied pairs and the material pairs whose fallback sources were fetched.

**2.6 Ledger:** `ledger.csv` has one row for each of the 76 × active signs pairs. `scripts/ledger.py` is rebuilt from `pairs.csv`, the Astra outputs, the cross-checks and `rulings.csv`. Columns:

`sign, category, animal_id, animal, status_at_export, implied_by, triage_rule, batch, astra_verdict, astra_quote, astra_source, opus_check (agree|disagree|can't tell|), opus_evidence, lead_ruling, lead_reason, final_verdict, material (y|n), change, commit`

- **`final_verdict`:**
  - triaged → `no (triage: <rule>)`
  - implied and surviving → `implied (by <x>)`
  - otherwise the lead's ruling if there is one, else Astra's verdict
- **`change`:**
  - `add:<clue index>`, `new_note:<clue index>`, `remove:<clue index>`
  - `none (implied by <x>)` (a broad `has it` where a narrower sign is held or added)
  - `remove (one sign per fact, <x>)`
  - `none`
- **`material`:** y when the animal shares a dealable set with at least one other holder of the sign, or holds it on a note. Then the verdict can change a witness fit.
- **Conflicts `ledger.py` raises for a lead ruling:**
  - a broad `doesn't` while its narrower sign is `has it`
  - both signs of a `denies` pair `has it`
  - a `has it` whose implied trait conflicts with the record
- The plan gets counts by verdict and by category.

**2.7 Cross-check, rulings, edits:**
- **Opus (`claude-task`) cross-checks**, about one task per two batches, into `crosscheck/<batch>.csv`, against the saved source:
  - every pair whose change would be an add or a remove
  - every material `can't tell`
  - every row `validate.py` flagged
  - a seeded sample of 5–10 unchanged rows per batch (`sample.py`, seed = batch id)
  - If ≥2 of a batch's sample rows get `disagree`, the batch's unchanged rows are all cross-checked.
- **The lead rules** every `disagree`, every Opus `can't tell` on a change, and every `ledger.py` conflict, in `rulings.csv` with the reason.
- **Opus edits profiles one sign category at a time** (body, habits, habitat, life + range), one commit each, applying only ledger rows whose final change is an add, new note or remove:
  - **Adds:** a tag goes on the note whose own words state the fact.
  - **New notes:** if no note states it, a new short note is appended at the end of `clues` (earlier row ids don't shift), grade 6–12, in its own words, with source and URL, one sign. Science words get a `glossary.ts` entry.
  - **Narrower and broader:** never add a broad sign that a held narrower one implies. Adding a narrower sign removes the broad tag it implies from that profile's notes (`remove (one sign per fact)`).
  - **Removes:** a tag is taken off its note; the note stays, untagged if nothing is left.
  - Trait values change only when a sign rule forces one, and that's recorded.
  - Citations: new pages' `citations.json` and new keys' `sources.json` entries go in the same commit. **No `citations.json` entry is ever deleted** (live rows cite them until the owner's build).
  - Each commit leaves `checkProfile` and `checkCitations` clean (`content -- preview`, `npm test`), and passes typecheck and lint.
  - The lead accepts or rejects each commit.

**2.8 Metrics:** `metrics/witness.ts`, bundled by `run-ts.sh --code <tree>` against a chosen code tree, run on a given `--content <animals dir>`. It loads with `animalsFromProfiles` and needs no database.
- It enumerates the dealable sets as `balance-044.ts` does, with the repo's real `pickSuspectSet`, `dealClues` and `witnessNotes`.
- It writes `metrics/<snapshot>.json`: for every (set, mystery, note), the fits and whether the note is eligible, plus the summary counts and both SHAs.
- `metrics/diff.py` lists every (set, mystery, note) whose fits or eligibility changed, and any set that appeared or disappeared.
- Three snapshots:

| Snapshot | Code | Content | Shows |
|---|---|---|---|
| 1 baseline | `7bce511a` | `7bce511a` | matches the Findings baseline (402 / 940) |
| 2 deploy delta | rules commit | `7bce511a` | exactly what live players see from deploy until the owner's build; also lists broad-tagged notes whose narrower wording now fits new animals through the closure, for witness-signs |
| 3 final | final HEAD | final HEAD | the Definition of done's before/after, in the plan |

**2.9 End:** `scripts/sign-map-update.ts` recomputes `sign-map.csv`'s `uses`/`holders`/`rule` from final HEAD and marks the rows that changed; the result goes in a repo commit. The Summary lists the definitions, Goal 2's rule, and the tags added and removed per animal with their sources (from `ledger.csv`).

**2.10 Dev database guard:** metrics and triage need no database. The only database step is the Verification's E2E: the brief's guarded block (`current_database()` = `phaser_june_dev`, otherwise stop and add a handoff item), with the dev content build. It never touches `.env.local`, never prints a connection string, and saves its artifact to `e2e-final/`.

**2.11 Session budget** (the run stops at 60):

| Work | Sessions |
|---|---|
| Definitions (`definitions.csv`, edge sign-offs) | 2 |
| Rules commit (tests first, code, docs, forced content fixes) | 2 |
| Export, snapshots 1–2, triage, `pairs.csv` | 2 |
| Source index + 8 missing pages | 1 |
| Pilot batch | 1 |
| Astra batches: ~2,700–4,300 pairs (≈2,200–3,800 open + ~494 held) ÷ ~300 | 9–15 |
| Re-check batch | 1–2 |
| Opus cross-checks (about 1 per 2 batches) | 5–8 |
| Lead rulings | 2 |
| Profile edits by category | 4–5 |
| Snapshot 3, `sign-map.csv`, ledger counts | 1–2 |
| Code reviews, Verification + Summary, Release | 4 |
| **Total** | **34–46** |

That leaves roughly 14–26 sessions for Astra waits (`MISSION_WAIT_ASTRA`) and halved reruns. **Bundling rule:** if the estimate after triage, or the running total, goes past 45, run 2 Astra batches or 2 Opus cross-checks per session.

### Rejected alternatives

- **A1, a separate `broader` field:** it duplicates `implies`, and broad signs' trait rules wouldn't apply to narrower holders.
- **A2, content and vocabulary only:** merges bring back 059's false fits (50 pairs, at most 4 true); tagging both brings back the double badges the owner rejected; Goal 1 fails for broad notes.
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

## Steps

## Verification

## Code review (Astra)

## Code review (Fable)

## Release

## Decisions

- (lead) Architecture A3 + B2: put strict narrower→broader sign edges in `SIGNS[tag].implies` with `heldSigns` closure in `witnessNotes`, split `SignEntry` into a discriminated union (`ActiveSignEntry` with required `meaning` vs `RetiredSignEntry` with `retired: true` and `category` only), enforce retired + closure + profile-level one-sign-per-fact mechanically in `signProblems`, narrow `travelOf` on `system:freshwater`/`system:marine` for `swimmer` using raw tags, keep `ANIMAL_RULES.version` at `055-1`, audit all ~494 held pairs in category × animal-group batches (re-opening implied pairs if a narrow hold fails), and record 3 witness-note snapshots via real `witnessNotes`.

## Log

- 2026-11-23 02:20 UTC · Baseline: verified clean `0d02c12e` (`origin/main` `7bce511a`); typecheck, lint, unit tests (106/106), content preview/check (live + dev, 76 species / 2475 clues / 491 facts, 0 errors/warnings), and `e2e:fresh` on `phaser_june_dev` (1657/1657, artifact in `…/sign-audit/e2e-baseline/`) all pass.
- 2026-11-23 02:42 UTC · Architecture: `architect` audited `SIGNS`/content/sources/witness baseline (F1–F9, 105 sets, 402/525 combos, 940 notes, 259/267 cached sources) and proposed options; lead chose A3 + B2 with 4 refinements (`SignEntry` union, `travelOf` water-system guard, auditing held pairs, 3-snapshot witness metrics); `architect` finalized the single target design. Plan updated; no code changed.
- 2026-11-23 02:47 UTC · Fable review: `architecture-reviewer` (Fable 5.2 · high) returned `APPROVE_WITH_CHANGES` with 3 MUST-FIX (broad-note narrow wording false fits, `stillPossible` third literal fit check, profile-level one-sign-per-fact hiding true notes), 4 MISSED, 5 SHOULD-CONSIDER. Recorded in plan; no code changed.
- 2026-11-23 02:51 UTC · Astra review: `astra-review` (Codex GPT-6.2-Astra · xhigh) returned `APPROVE_WITH_CHANGES` with 4 MUST-FIX (gate broader-sign matching on note wording, unify `witnessNotes`/`stillPossible`/metrics fit predicate, keep one-sign-per-fact per-note and dedupe field-guide badges separately, reconcile ledger across pre-export changes and multi-note tags) and 3 SHOULD-CONSIDER. Recorded in plan; no code changed.

## Summary
