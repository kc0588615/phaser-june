---
mission: clue-data-dealer
project: critter-connect
branch: agent/clue-data-dealer
status: active
started: 2026-11-20 06:45 UTC
---

# Mission: Clue data and dealer fixes (Critter Connect, Neon-led)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- The first Antigravity-led mission. Start with:
     mission start critter-connect /srv/critter-ai/agent-state/missions/briefs/2026-11-20-clue-data-dealer.md --harness agy
     Gemini 4 Neon · high leads (~/.gemini/mission-lead.md); Opus 5.5 implements through claude-task; Fable 5.2 and Astra review. -->

### Goal

Fix the four systemic problems that make the game's questions wrong or lopsided for every animal. This is part 1 of Neon's roadmap (owner, 2026-11-20). The evidence is in the vault: `research/critter-connect/clue-design.md` (above all "Judge a question by both possible answers" and the dealt-slot table near its line 305) and `research/critter-connect/clue-verification.md` with its ten group notes. Read them from `/srv/critter-ai/vault`. That research's own scripts and data, including how it built the dealt-slot table and the set ids (S005, S018 …), are in `/srv/critter-ai/agent-state/missions/cc-clue-design/` (`scripts/`, `digest/`). When it's done:

1. **Diet questions are true for the animals they're asked about.** Today they ask "plants only" and "other animals only", and the verification found animals the game answers yes for although their own guide line, or their source, says otherwise (red panda, pancake tortoise, African spurred tortoise, Ethiopian wolf, spiny softshell, Suriname toad, and the other diet rows in the group notes). **The lead decides** the wording: keep "only" and correct the animals' diet values, or move to "mostly" with clear labels (for example: mostly plants, mostly meat, mostly bugs and small invertebrates, plants and animals). Either way, every diet row the verification marks high or medium is resolved, or recorded in the Summary with the reason it stays. The decision, the options weighed and both reviews' views are under **Decisions**. The diet answers also drive the sign checks (`NOT_PLANTS` and `NOT_ANIMALS` in `src/clueGame/signs.ts`) and the guide's diet sentences (`DIET_TEXT` in `src/clueGame/profiles.ts`): whatever the lead chooses, both stay consistent with the new wording and values.
2. **Every bin edge and short label is unambiguous.**
   - Size: 2 kg and 30 kg are each claimed by two sizes (Small "100 g to 2 kg" and Medium "2 to 30 kg"; Medium and Large "30 to 300 kg"), and 300 kg is claimed twice in the column label only ("Large 30–300 kg" and "Huge 300+ kg"; the questions say "over 300 kg"). 100 g is already clean. Each edge belongs to exactly one size everywhere the edges are written: the questions, the short questions and the column labels in `src/clueGame/questionMatch.ts`, the guide sentences (`SIZE_TEXT` in `src/clueGame/profiles.ts`), and `docs/CONTENT_SOURCES.md`. No animal's size changes unless its weight sits on an edge that moved.
   - The same one-line edge bugs in the column labels (`questionMatch.ts`): young "3–10" against "10+" (the question says "more than 10"), lifespan "5–20" against "20+" (the question says "more than 20"), and the activity labels "Day" and "Night", which drop the questions' "mainly". Each label says what its question asks. These are wording fixes only: no profile changes.
3. **Region answers follow where the animal lives, and the globe agrees with the rounds.**
   - An animal of Indonesia's part of New Guinea (Papua, the Vogelkop) answers yes to "New Guinea and nearby islands". Today `src/clueGame/regions.ts` maps one country code to one region, and all of Indonesia (`IDN`) to Southeast Asia, so the Western Long-beaked Echidna answers no in set S018. The verification says the fix belongs in the country-to-region rule, not in one profile.
   - **Ten profiles carry `IDN`, and seven of them are Asian:** Wallace's Flying Frog, Spiny Hill Turtle, Sunda Pangolin, Tiger, Asian Elephant, Sumatran Orangutan and Javan Rhinoceros must stay in Southeast Asia. The other three, the Western and Eastern Long-beaked Echidnas and the Pig-nosed Turtle, are New Guinea animals. So simply changing the `IDN` row would break seven animals. The lead checks all ten and chooses between (a) splitting `IDN` in code by the realm each profile already carries (`realm:australasian` vs `realm:indomalayan`), and (b) splitting Indonesia geographically in the range query (`RANGES_SQL` in `scripts/content.ts`) and the `clue_match_places` view (`db/schema.sql`), the way Russia is split at 60°E.
   - **Whichever it chooses, the globe and the rounds must agree.** The globe's continent lists come from the `clue_match_places` view (`src/lib/places.ts`, `GlobeScreen.tsx`), but the round pools come from code (`useAnimalSession.ts`). Option (a) alone would leave the Western Long-beaked Echidna listed under Asia on the globe while only Oceania rounds deal it. The plan shows, for each of the ten animals, its continent on the globe and in the rounds, before and after, and they match (or the lead records why a difference is acceptable until the owner's database change).
   - A region answer doesn't rest on a country where IUCN lists the animal as "presence uncertain", "possibly extinct" or "extinct" (the aardvark's and the African wild dog's North Africa, and the other rows in the group notes). **Countries come from the range maps, not from hand edits:** `RANGES_SQL` keeps `presence IN (1, 2, 3)`, and 3 is "possibly extant". A country removed by hand from a profile's `range.countries` comes back the next time `npm run content -- ranges` runs. So the fix goes where the countries come from: the presence filter (in both `RANGES_SQL` and the views that use the same rule, `scripts/content.ts:44` and `db/schema.sql:112,169` say "change both together"), or the shapefile data, if it's older than IUCN's current page. The lead records every place where the shapefile and IUCN's page disagree.
4. **The dealer deals every kind of question.** In the 103 distinct decks, birth is dealt in 0 of 412 slots, because `fullTable` (`src/clueGame/animalBoard.ts`) sorts questions in a fixed prefix order and drops any later question with the same split, so `covering` always wins. `dealClues` adds 4 points to a deck that has a 1-vs-4 split, and a deck can hold several region questions (set S005 deals four). After the change, the same table of dealt slots by category shows birth and the life-cycle questions dealt, no deck holds more than one region question unless no other deck tells the suspects apart, and decks keep telling all five suspects apart. The lead sets the targets in the plan before the change and checks them after.

### Why

The owner's players are solo kids discovering the game on the web (owner, 2026-11-20). A question that's wrong for the animal teaches the wrong biology, and a dealer that never asks about birth or life cycle teaches only geography and habitat. These fixes improve all 76 animals at once, before any new animals (birds) or new game features are added.

### Scope

In:
- `src/clueGame/` (question wording and labels in `questionMatch.ts`, `regions.ts`, `questionMatchContent.ts`, `signs.ts`, `profiles.ts`, the dealer in `animalBoard.ts`, and whatever rules files the changes reach), `src/lib/places.ts` and the round pool code only as Goal 3 needs, `scripts/` (`content.ts`'s range query and the balance bot, only as the changes need), `tests/`
- `db/schema.sql`: the view definitions only, as Goal 3 needs. **The mission never applies it**: the owner's database change does (below).
- Animal profiles in `db/content/animals/*.json`: only the values these four goals change, each with its source
- `docs/CONTENT_SOURCES.md`, `docs/CLUE_MATCH.md`, `docs/ANIMAL_BOARD_PAPER.md`, `CONTEXT.md`, as far as they describe what changes

Out:
- **Any write to the live database (`phaser_june`)**: no rows, views, grants or tables. Never run `npm run content -- build`, `npm run iucn -- import`, or `npm run content -- ranges` with the mission's `.env.local` (it points at the live database, and `ranges` runs 15-minute queries). Heavy or test queries run on the dev copy `phaser_june_dev` (the dev-copy block below). Nothing to migrate.
- Witness notes, a witness gem on the starting board, Auto rule-out, the round-end screen and spaced review (parts 2 and 4 of the roadmap, later missions)
- Birds and any new animal or question (part 3)
- Filling in missing trait records (trees 5, size 8, young 11, activity 14, lifespan 17, social 20): they need sourcing, so a later mission does them. Record any the dealer change makes urgent.
- Verification rows outside the four goals (the tapir's fur, the tiger's activity, the giant otter's family and the like). List the ones the lead thinks matter most in the Summary for a later mission.

### Definition of done

- `npm run typecheck`, `npm run lint` and `npm test` pass.
- **`npm run e2e:fresh` passes against the dev copy `phaser_june_dev`, never `.env.local`**:
  ```
  ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a
    [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1
    CHROME_PATH=$HOME/.local/bin/chrome-nosandbox npm run e2e:fresh )
  ```
  Never print a connection string or `cat` that file. If the guard fails, stop and add a handoff item. If the change needs the dev copy's rows or views rebuilt to test it, the same block may run `npm run content -- build` or `ranges` against `phaser_june_dev` only, after the guard. Save the final run's artifact as `/srv/critter-ai/agent-state/missions/clue-data-dealer/e2e-final/`.
- `npm run content -- preview` reports no problems: it is what checks the **edited profiles** (`checkProfile` and `checkCitations`).
- `npm run content -- check` (read-only) still passes against the live database. It proves the new code still works with the rows players have until the owner's content build.
- The balance bot (`scripts/balance-044.ts`), run before and after on the same seeds: no player type's find rate moves more than 3 points in any place, or the lead records why the new numbers are right. (Plan 044's original targets aren't a fair bar: its own results missed some, and the rules were retuned since.) Both runs' numbers are in the plan.
- The dealt-slot table (Goal 4) before and after is in the plan, built the way `clue-design.md` built its table, and meets the targets the lead set.
- New or changed rules have unit tests, written first and seen failing (the repo's rule).
- If the change alters what a saved game or a `?seed=` round holds, `ANIMAL_RULES.version` changes, as the repo's rules say. A seeded round stays reproducible.
- The final reviews are recorded: `## Code review (Astra)` and `## Code review (Fable)`, with the lead's ruling on each item.
- The Summary lists every changed answer (animal, question, old → new, source), and says exactly what the owner must run afterwards (below).

### Decision rules

- **Neon decides.** Every judgment call in this brief is the lead's (`~/.gemini/mission-lead.md`): the diet wording, which edge each size owns, how to map Indonesian New Guinea, the presence filter, the dealer's new tie-break and scoring. Weigh the options, ask Opus or Fable for analysis if useful, then decide and record why.
- **Truth over convenience.** An answer follows the animal's source (IUCN, ADW, AmphibiaWeb, as `docs/CONTENT_SOURCES.md` ranks them). When sources disagree, follow the source ranking and record it.
- **Smallest change that fixes the cause.** Fix a rule (the region map, the dealer, a label) rather than many profiles, where the rule is the cause.
- **Don't make the game easier or harder by accident** (the balance bot check above).
- **The code that deploys must work with today's live rows and views,** because the owner's database change and content build come after the deploy.

### Notes

- **The owner's part, after the release.** One handoff item lists, in order, what he runs from WSL: the view change (`db/schema.sql`'s new view definitions, as SQL to paste, with a fresh dump first, `docs/DATABASE_ACCESS.md`), if Goal 3 changed a view; then `npm run content -- ranges` if the range query changed; then `npm run content -- build` if any profile or range changed. Say what players see before and after each, and add the item only after the deploy's smoke tests pass.
- The mission's `.env.local` points at the live database, which the game reads. Read-only queries on it are fine; heavy ones go to the dev copy.
- `origin/main` is at `0837540a` (2026-11-15). The repo's pre-push hook runs typecheck and lint.
- Neon's review of the research (2026-11-20) is the source of this brief. Its claims about `witnessChance`, `fullTable`, `dealClues` and the 87–92% blind win rate were checked against the code, and Fable reviewed the brief (2026-11-20).

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

Recorded 2026-11-20 (branch `agent/clue-data-dealer` at `4430269b`, base `origin/main` `0837540a`, rules `055-0`; Node v24.21.0, npm 11.19.0; `node_modules` installed; no DB migration needed). Handoff `/srv/critter-ai/handoff/critter-connect.md` checked: no `Status: done` items (only H9 `Status: later`).

### Checks

| Check | Result | Notes |
|---|---|---|
| `npm run typecheck` | PASS | Exit 0 |
| `npm run lint` | PASS | ESLint (`--max-warnings 0`) + `scripts/check-theme.mjs`, exit 0 |
| `npm test` | PASS | 76/76 passed, 0 failed, 0 skipped (2771 ms) |
| `npm run content -- preview` | PASS | Exit 0, 76 profiles checked, 0 problems |
| `npm run content -- check` (live DB, read-only) | PASS | `Pool: 76 playable of 76 species, 2478 clues (2086 deductive), 491 facts. 0 errors, 0 warnings.` |
| `npm run e2e:fresh` (`phaser_june_dev`, guarded) | PASS | **1588/1588** checks passed (4 rounds, seed 7; AmphibiaWeb probe 14342 ms). Artifact: `/srv/critter-ai/agent-state/missions/clue-data-dealer/e2e-baseline/` |

### Dealt-slot table (before, commit `0837540a`, rules `055-0`)

103 distinct sets (anywhere 47, africa 23, asia 15, north-america 9, south-america 9; europe/oceania fall back to anywhere), 412 deck slots (`cc-clue-design/digest/facts.md` on `0837540a`):

| Category | Questions dealt, by subject | Missing records (of 76) |
|---|---|---|
| Body | Size 51, covering 39 | Size 8 |
| Habits | Diet 66, activity 21, trees 12, social 8 | Social 20, activity 14, trees 5 |
| Habitat | Habitat 96, system 15 | None |
| Range | Region 89 | Region 3 |
| Life cycle | Young 11, lifespan 4, birth 0 | Lifespan 17, young 11 |

- Birth splits 16 sets, enters `fullTable` in 0 (shadowed by `covering` in 15, `diet` in 1).
- Fixed questions never dealt: `size:tiny`, `social:pairs`, `birth:eggs`, `birth:live`, `lifespan:short`, `lifespan:medium`.

### Balance bot (before, rules `055-0`)

Command: `node scripts/run-typescript.mjs scripts/balance-044.ts --places world,africa,asia,north-america,south-america --rounds 400 --seed 44`
Full output: `/srv/critter-ai/agent-state/missions/clue-data-dealer/balance-before.txt`

| Place (pool, sets) | Player | Found | ★★★ | Identified | Moves left | Orders | Notes | Seen | Points |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| world (76, 47) | careful | 98% ±2 | 64% | 95% | 15.5 | 2.6 | 1.8 | 9.1 | 276.2 |
| world (76, 47) | novice | 97% ±2 | 62% | 93% | 15.1 | 2.7 | 1.8 | 9.6 | 268.3 |
| world (76, 47) | expert | 100% ±0 | 78% | 100% | 17.2 | 2.3 | 1.7 | 6.7 | 309.4 |
| world (76, 47) | reader | 94% ±2 | 31% | 84% | 10.4 | 2.9 | 1.9 | 7.5 | 189.5 |
| world (76, 47) | guesser | 18% ±4 | 18% | - | 27.8 | 0.0 | 0.5 | 0.2 | 77.0 |
| world (76, 47) | random | 20% ±4 | 0% | - | 0.0 | 3.9 | 2.0 | 14.4 | 10.0 |
| world (76, 47) | oracle | 100% ±0 | 100% | - | 27.8 | 0.0 | 0.6 | 0.3 | 428.4 |
| africa (26, 23) | careful | 98% ±1 | 73% | 95% | 16.9 | 2.3 | 1.7 | 8.5 | 296.7 |
| africa (26, 23) | novice | 98% ±2 | 70% | 95% | 16.6 | 2.4 | 1.7 | 9.0 | 289.6 |
| africa (26, 23) | expert | 100% ±1 | 81% | 100% | 18.1 | 2.0 | 1.6 | 6.4 | 318.0 |
| africa (26, 23) | reader | 94% ±2 | 43% | 88% | 12.3 | 2.6 | 1.7 | 7.0 | 218.5 |
| africa (26, 23) | guesser | 18% ±4 | 18% | - | 28.0 | 0.0 | 0.5 | 0.2 | 77.3 |
| africa (26, 23) | random | 20% ±4 | 0% | - | 0.0 | 3.9 | 1.9 | 14.5 | 10.0 |
| africa (26, 23) | oracle | 100% ±0 | 100% | - | 27.9 | 0.0 | 0.7 | 0.3 | 428.9 |
| asia (20, 15) | careful | 96% ±2 | 51% | 91% | 13.8 | 2.9 | 1.3 | 10.3 | 246.0 |
| asia (20, 15) | novice | 94% ±2 | 52% | 89% | 13.6 | 3.0 | 1.3 | 11.2 | 237.3 |
| asia (20, 15) | expert | 100% ±0 | 63% | 100% | 15.4 | 2.6 | 1.2 | 8.2 | 281.9 |
| asia (20, 15) | reader | 89% ±3 | 25% | 76% | 8.9 | 3.2 | 1.4 | 9.0 | 161.0 |
| asia (20, 15) | guesser | 18% ±4 | 18% | - | 27.7 | 0.0 | 0.3 | 0.2 | 76.9 |
| asia (20, 15) | random | 20% ±4 | 0% | - | 0.0 | 3.9 | 1.6 | 14.6 | 10.0 |
| asia (20, 15) | oracle | 100% ±0 | 100% | - | 27.8 | 0.0 | 0.4 | 0.3 | 428.1 |
| north-america (13, 9) | careful | 96% ±2 | 65% | 92% | 15.7 | 2.5 | 0.9 | 8.3 | 274.2 |
| north-america (13, 9) | novice | 97% ±2 | 67% | 93% | 15.8 | 2.6 | 0.9 | 9.3 | 276.9 |
| north-america (13, 9) | expert | 100% ±0 | 75% | 100% | 17.0 | 2.2 | 0.9 | 6.8 | 303.8 |
| north-america (13, 9) | reader | 94% ±2 | 34% | 83% | 11.0 | 2.8 | 0.9 | 7.5 | 198.1 |
| north-america (13, 9) | guesser | 18% ±4 | 18% | - | 27.8 | 0.0 | 0.4 | 0.2 | 77.1 |
| north-america (13, 9) | random | 20% ±4 | 0% | - | 0.0 | 3.9 | 1.0 | 14.5 | 10.0 |
| north-america (13, 9) | oracle | 100% ±0 | 100% | - | 27.8 | 0.0 | 0.5 | 0.3 | 427.9 |
| south-america (14, 9) | careful | 96% ±2 | 74% | 93% | 16.8 | 2.3 | 1.8 | 7.6 | 291.1 |
| south-america (14, 9) | novice | 99% ±1 | 72% | 96% | 16.1 | 2.5 | 1.8 | 8.8 | 287.8 |
| south-america (14, 9) | expert | 100% ±0 | 80% | 100% | 17.7 | 2.0 | 1.7 | 6.1 | 315.1 |
| south-america (14, 9) | reader | 93% ±3 | 38% | 84% | 11.5 | 2.8 | 1.8 | 6.9 | 204.8 |
| south-america (14, 9) | guesser | 18% ±4 | 18% | - | 27.8 | 0.0 | 0.6 | 0.2 | 77.1 |
| south-america (14, 9) | random | 20% ±4 | 0% | - | 0.0 | 3.9 | 1.9 | 14.3 | 10.0 |
| south-america (14, 9) | oracle | 100% ±0 | 100% | - | 27.8 | 0.0 | 0.7 | 0.3 | 428.1 |

Careful moves left at find (20th/40th/60th pct): world 11/15/18, africa 13/16/19, asia 9/12/16, north-america 10/15/18, south-america 12/16/19.

## Architecture

*Architect, final pass, 2026-11-20. Code at `8ae493ce` (base `origin/main` `0837540a`, rules `055-0`). Numbers come from read-only SELECTs on `phaser_june_dev`, from esbuild scripts outside the repo (`/tmp/cdd-ana/`) that call the game's own builder and dealer, and from headless-Chrome label measurements (`/tmp/cdd-p2/`). The scripts reproduce the brief's baseline exactly: 103 sets, 412 slots, the same set ids.*

### Findings

Ranked by impact.

#### F1 · Goal 4: the dealer drops questions that split the set the same way, and never limits region questions (bug)

**Where:** `src/clueGame/animalBoard.ts:88-108` (`fullTable`), `:126-140` (`dealClues`).

- **`fullTable` keeps one question per split.** It sorts tags in `PREFIX_CATEGORY` key order (`questionMatch.ts:18-24`: size, covering, diet, activity, social, trees, system, habitat, region, birth, young, lifespan) and keeps only the first tag for each split (`:102-104`). Life-cycle questions come last, so they lose every split they share with an earlier question.
  - Birth splits 16 sets and reaches the table in none: covering takes 15, diet takes 1.
- **`dealClues` doesn't limit regions.** Its score is `(any 2v3 ? 4 : 0) + (any 1v4 ? 4 : 0) + #categories` (`:135`).
- **The split bonuses aren't the cause.** 99/103 decks already have a 2-vs-3 split and 103/103 have a 1-vs-4. Dropping either bonus moved at most 1 slot.
- **Baseline:**

  | Measure | Value |
  |---|---|
  | Slots by subject | habitat 96, region 89, diet 66, size 51, covering 39, activity 21, system 15, trees 12, young 11, social 8, lifespan 4, birth 0 |
  | Region questions per deck (regions: decks) | 0:33, 1:58, 2:7, 3:3, 4:2 |
  | Categories per deck (categories: decks) | 1:2, 2:11, 3:48, 4:42 |
  | `fullTable` size | 4–12 questions |
  | Speed | 103 decks in 78 ms; Anywhere load (76 seeds) 117 ms |

- **12 decks hold more than one region question.**
  - 6 are avoidable: a valid deck with at most one region exists.
  - 6 are forced by missing trait records: S005 and S006 need 4 regions, S031 and S044 need 3, S010 and S021 need 2. All are in Anywhere.
  - In S005 and S006 the five frogs share every recorded non-region trait. The tomato frog lacks `trees`; the purple frog lacks `size`.
- **Forcing birth isn't needed.** A valid deck with birth exists in all 16 sets that birth splits. A valid deck with a life-cycle question exists in 48 sets.
- **How the research built its table** (`cc-clue-design/scripts/digest.ts:33-96`):
  - Places are Anywhere plus continents with at least `MIN_PLACE_ANIMALS` (12) animals: Anywhere 76, Africa 26, Asia 20, North America 13, South America 14. Europe and Oceania fall back to Anywhere.
  - For each seed it runs `pickSuspectSet`, dedupes sets by members within each place, deals each set once, and counts `prefixOf(tag)`. Set ids follow place order, then seed order.
  - The script is pinned to `0837540`, so it can't run on new code. `scripts/balance-044.ts:270` already builds the same sets.
- **Callers:**
  - `pickSuspectSet`: `useAnimalSession.ts:101` (once per seed at load), `balance-044.ts:270`, tests.
  - `dealClues`: `animalBoard.ts:157` (inside `pickSuspectSet`) and `:295` (`newAnimalRound`).
  - `fullTable`: `:155` (`tellsApart` while growing a set), `:128`, tests.
  - `ANIMAL_RULES.version`: `useAnimalSession.ts:119`, together with `roundStillFits` (`:182-191`).
  - `witnessNotes` doesn't depend on the deck (`:300`).

#### F2 · Goal 1: diet answers contradict their own guide lines and sources (wrong biology)

**Where:** `questionMatch.ts:62-63` (questions), `:84` (short), `:121` (column); `profiles.ts:162-167` (`DIET_TEXT`); `signs.ts:21-23,:128`; `glossary.ts:58-61`; `docs/CONTENT_SOURCES.md:59`.

Diet values today: plants 31, meat 15, insects 22, mixed 8. "Sets dealing diet" are baseline sets that deal a diet question with this animal.

| # | Animal (file) | Now | Guide note | Source evidence (tier) | Astra / Opus, severity | Sets dealing diet |
|---|---|---|---|---|---|---|
| 1 | Red panda (35) | plants | "also eats … bird eggs" | ADW bird eggs; IUCN insects (1, 2) | checks 1-3 high, agree | S025, S032, S043, S081 |
| 2 | Pancake tortoise (15) | plants | "plus the odd beetle" | IUCN beetles in faeces (1) | 1-3 high, agree | S001, S052, S054 |
| 3 | African spurred tortoise (20) | plants | "dead animals or garbage" | TFTSG carrion (2) | 1-3 high, agree | S002, S052, S054 |
| 4 | Andean bear (71) | plants | "sometimes small animals" | ADW; IUCN "omnivorous" (1) | 1-3 high, agree | S025, S037, S043, S099-S103 |
| 5 | Golden snub-nosed monkey (34) | plants | leaves, lichens | IUCN "insects, and small vertebrates" (1) | check 1 high, agree; check 3 high, Opus disagrees | S032, S081 |
| 6 | Sumatran orangutan (40) | plants | "sometimes insects" | IUCN termites, slow loris; ADW ~5 % insects | 1-3 medium (Opus disagrees on check 3) | none |
| 7 | Giant panda (60) | plants | "Bamboo is almost all" | ADW "small mammals, fish and insects" (2) | high (Opus: medium) | S025, S037, S043, S081 |
| 8 | Ethiopian wolf (33) | meat | "mostly eats rodents"; `clues[4]`, `facts[1]` nectar | Ecology 2024 nectar study, doi 10.1002/ecy.4470 (literature) | 1-2 high, agree | S024, S030, S034, S046, S054, S068 |
| 9 | Tasmanian devil (48) | meat | hunts, scavenges | ADW "small amounts of vegetation" | high (Opus: low) | S027 |
| 10 | African wild dog (65) | meat | antelope | ADW "except for small amounts of grass" | high (Opus: low) | S024, S030, S046, S066, S068 |
| 11 | Spiny softshell (02) | meat | water insects, crayfish | ADW macroinvertebrates (2); IUCN "omnivorous, tends to carnivory" (1) | wrong, high, agree | S001, S002, S013, S086, S087 |
| 12 | Suriname toad (10) | meat | worms, insects, crustaceans, fish | ADW "aquatic omnivores"; AmphibiaWeb "mostly of invertebrates" (2) | wrong, high, agree | S003, S009, S010, S012, S047, S095, S096 |
| 13 | Goliath frog (11) | meat | insects, crabs, … frogs | ADW lists foods, no proportions; 60 % arthropods only in an uncited Brill paper | wrong, high; Opus disagrees | S007, S010, S048-S051 |
| 14 | Hellbender (75) | meat | "mostly eats crayfish" | ADW "primarily crayfish" (2) | 1-2 high; Opus disagrees ("crayfish isn't a bug") | S047, S086, S087, S089 |
| 15 | Big-headed turtle (04) | meat | fish, snails, worms | IUCN "fruits … most commonly eaten" (1) | check 3 high; Opus: the real fault is check 1 | S002, S004, S071, S074, S075, S085 |
| 16 | Floreana (19), Pinta (22) tortoises | plants | (none) | Britannica page names no food; Reptiles of Ecuador does | unsupported, medium | none |
| 17 | Purple frog (16) | insects | "Mostly termites" | AmphibiaWeb "likely" | overstated, medium (Opus: low) | value holds |

**Wording rows** (no value change):
- `diet:meat`, high. "other animals only" also fits insect-eaters: Wallace's flying frog (05), red-eyed tree frog (06), coastal tailed frog (08), Hispaniolan solenodon (49), Sunda pangolin (24, S081).
- `diet:insects`. "small bugs" leaves out worms (echidna, S072) and crayfish.
- `diet:plants`. `DIET_TEXT` "It eats plants." lacks the column's "only" (sloth 54, okapi 29, tapir 53, Livingstone's flying fox 45).
- Aye-aye (23, mixed) and giant armadillo (36, insects) are disputes about proportions.

**Signs:**
- `NOT_PLANTS` (`signs.ts:21`) lets plant signs deny meat and insects. `NOT_ANIMALS` (`:23`) lets animal signs deny plants. `nectar_drinker` (`:128`) denies meat.
- The Ethiopian wolf's nectar clue has no tag, so no sign check sees it.
- `signProblems` over all 76 profiles with the 1A′ values: **0 problems** (simulated).

**Before the owner's build:** question and column text are code and change at deploy. Diet values and `DIET_TEXT` are database rows and change only at the build.

#### F3 · Goal 3: Indonesian New Guinea maps to Southeast Asia, and the globe and rounds compute continents separately (bug)

**Where:** `regions.ts:201` (`IDN → southeast-asia`); `questionMatchContent.ts:89-97` (continents from countries in rounds); `src/lib/places.ts:12-31` (the globe reads `clue_match_places.species_ids`); `db/schema.sql:172-188` (the view takes Natural Earth's `continent`, which is Asia for all of IDN).

- **Ten profiles carry `IDN`:**
  - 7 Asian: 05, 12, 24, 25, 28, 40, 44 (`realm:indomalayan`; the tiger also palearctic).
  - 3 New Guinea: 17 pig-nosed turtle, 27 western long-beaked echidna, 67 eastern long-beaked echidna (`realm:australasian`).
- **Goodfellow's tree-kangaroo (43)** is the only other New Guinea animal (PNG). It has no Indonesian polygon, so it's unaffected.
- **Realm is unsafe as a split key.** OneEarth puts all of Wallacea under Australasia: Sulawesi, Lombok, Timor, Halmahera and Seram (point lookups on dev).
- **Natural Earth's IDN parts** (all 97 eastern polygons verified on `phaser_june_dev`):
  - **Sahul Shelf / Indonesian New Guinea (`IDP`, Oceania):** mainland Papua (centroid 137.45°E, 4.00°S; xmin 130.95°E), Yos Sudarso (138.37°E, 7.91°S), Cenderawasih Bay islands (Biak 135.90°E, Yapen 136.19°E, Numfor 134.90°E), Raja Ampat (Waigeo 130.84°E, 0.21°S; Salawati 130.89°E, 1.10°S; Batanta 130.65°E, 0.85°S; Misool 130.13°E, 1.88°S; Ayu/Asia 131.26°E, 1.06°N), Adi (133.44°E, 4.20°S), Karas (132.68°E, 3.46°S), and Aru (134.2–134.8°E, 5.8–6.7°S, Sahul Shelf).
  - **Wallacea / Maluku (`IDN`, Asia):** Seram (129.46°E, 3.20°S), Halmahera (128.02°E, 0.87°N), Gorong/Watubela (131.2–131.7°E, 4.0–4.7°S), Kai (132.0–133.0°E, 5.3–5.8°S), and Tanimbar (Yamdena 131.41°E, 7.59°S; Selaru 130.97°E, 8.20°S; Larat 131.88°E, 7.16°S).
  - A plain `lon > 130` rule would misfile Tanimbar, Kai, and Gorong/Watubela as Oceania. The exact Lydekker's Line centroid predicate `lon > 133.2 OR (lon > 130 AND lat > -3.5)` separates Sahul/Papua from Maluku/Wallacea cleanly across all 97 parts, the way France's overseas parts are reassigned (`schema.sql:175-177`).
- **Range inside Indonesia** (km², presence 1): W echidna 88,930 (all of it); E echidna 49,423 (PNG 124,846); pig-nosed turtle 111,132 (AUS 54,430, PNG 71,800).

**Globe and rounds under the chosen 3B, with the owner's steps in the order the Target design gives** (1 dump, 2 `ranges` check, 3 view SQL, 4 build). "Rounds" is the round pool's continents, with regions in brackets. Oceania rounds fall back to Anywhere (pool under 12).

| id | Animal | Globe / rounds now | After deploy (live rows, old views) | After step 3 (globe / rounds) | After step 4 (globe / rounds) |
|---|---|---|---|---|---|
| 5 | Wallace's flying frog | Asia / Asia (SE Asia) | same | Asia / Asia | Asia / Asia |
| 12 | Spiny hill turtle | Asia / Asia | same | Asia / Asia | Asia / Asia |
| 17 | Pig-nosed turtle | Asia+Oceania / Asia+Oceania (AU-NZ, SE Asia, Melanesia) | same | **Oceania / Asia+Oceania ✗** (about 1 min) | Oceania / Oceania (AU-NZ, Melanesia) |
| 24 | Sunda pangolin | Asia / Asia | same | Asia / Asia | Asia / Asia (loses East Asia via `notPresent`) |
| 25 | Tiger | Asia / Asia | same | Asia / Asia | Asia / Asia |
| 27 | W. long-beaked echidna | Asia / Asia (SE Asia; answers no in S018) | same | **Oceania / Asia ✗** (about 1 min) | Oceania / Oceania (Melanesia; S018 yes) |
| 28 | Asian elephant | Asia / Asia | same | Asia / Asia | Asia / Asia |
| 40 | Sumatran orangutan | Asia / Asia | same | Asia / Asia | Asia / Asia |
| 44 | Javan rhinoceros | Asia / Asia | same | Asia / Asia | Asia / Asia |
| 67 | E. long-beaked echidna | Asia+Oceania / Asia+Oceania (SE Asia, Melanesia) | same | **Oceania / Asia+Oceania ✗** (about 1 min) | Oceania / Oceania (Melanesia) |

- **Pools after step 4:** Asia rounds 20 → 17 (still at least 12); globe Asia 22 → 19; Oceania 6 → 7.
- **The two echidnas stay separable** after both become Melanesia-only: the eastern one has shrubland and grassland.
- **Unrelated mismatches already exist** (caused by F5): Darwin's frog, Livingstone's flying fox and the solenodon have no continent in rounds; the spurred tortoise and the cheetah show under Asia on the globe only. `docs/CLUE_MATCH.md:67` already says counts "can differ by one or two".

#### F4 · Goal 3: the presence filter isn't what puts wrong countries into region answers (finding against the brief's premise)

**Where:** `scripts/content.ts:55-56`, `db/schema.sql:112-113`, `:169-170`.

**Presence codes in `iucn` for our 76 species:**

| Presence | Polygons | Species |
|---|---|---|
| 1 | 159 | 74 |
| 2 | 1 | 1 (wild dog) |
| 3 | 12 | 9 (cheetah, addax, giant panda, Asian elephant, both African elephants, orangutan, both tapirs) |
| 4 | 12 | 10 |
| 5 | 13 | 7 |
| 6 | 5 | 5 |

- De Winton's golden mole (presence 4 only) and the Pinta tortoise (6 only) rely on the `OR NOT EXISTS` fallback. The Floreana tortoise has one presence-1 polygon of 42 km².
- **What `IN (1, 2)` changes in profile countries:**
  - The cheetah loses DJI. Its LBY is already dropped by `HAVING`.
  - The forest elephant loses CAF and TGO.
  - Through `HAVING count(*) >= 2` (`content.ts:94`), the aardvark then loses DJI and TGO. That incidentally fixes Opus's note about Togo.
  - **No region answer changes.**
- **No globe continent changes either.** All 33 species with polygons of presence 2–6 were checked, including the case where a smaller range lowers the 5 % threshold and adds a continent.
- **`= 1`** would also drop the wild dog's DZA (its only presence-2 polygon, 15,420 km²) and throw away "probably extant" range.
- **The extinct-species fallback is unaffected** by either filter.

**Every place the shapefile and IUCN's page disagree:**

| Animal | Country | IUCN page | Shapefile (map year / Red List year) | Cause | Region answer it carries |
|---|---|---|---|---|---|
| Aardvark (57) | SDN | Presence uncertain | presence 1 (2015 / 2015) | map coarser than page | **North Africa** (its only North Africa country; S040) |
| Aardvark | TGO | not listed | presence 1 | map vs page | none (dropped by 3P-A via `HAVING`) |
| African wild dog (65) | DZA | Possibly extinct | presence 2 (2008 / 2025) | stale map | **North Africa** (with SDN; S030) |
| African wild dog | SDN | Extinct | presence 1 (2008) | stale map | **North Africa** |
| African wild dog | BFA, CMR, MWI, NGA | Extinct | presence 1 | stale map | none |
| African wild dog | TCD | Presence uncertain | presence 1 | stale map | none |
| Sunda pangolin (24) | CHN | Presence uncertain | presence 1 (2019 / 2019) | coarse map | **East Asia** (S018, S076, S078) |
| Yangtze giant softshell (18) | CHN | Possibly extinct | presence 1 (compiled 2025 from assessment text, not the IUCN download) | non-IUCN map | **East Asia** |
| Cheetah (58) | SDN 7,495 km², SDS 46,615 km² | Possibly extinct | presence 1 (2024 / 2024) | coarse map | none (DZA, ETH, KEN keep its regions) |
| Addax (50) | MRT | Possibly extinct | 2016 / 2016 | coarse map | none |
| Giant anteater (52) | CRI | Possibly extinct | presence 1 (2014 / 2025) | stale map | none |
| Giant pangolin (55) | AGO | not listed (ADW lists it) | presence 1 | map vs page | none |
| Temminck's pangolin (63) | SWZ | Possibly extinct | presence 1 (2019 / 2019) | coarse map | none |
| Hairy frog (07) | COG | Presence uncertain | presence 1 (2025) | map vs page | none |
| Floreana (19), Pinta (22) | ECU | Extinct | extinct species | historical range by design | keep (South America) |

- **Not verifiable in `iucn`:** countries IUCN lists where the map share is under the threshold (Darwin's frog ARG, red-eyed tree frog COL, red panda MMR, Asian elephant CHN, forest elephant SDS, Goodfellow's IDN). These are "can't check" rows, not region errors.
- **Conclusion:** the four region-flipping errors need a sourced correction where countries become clues. A newer map wouldn't fix the aardvark or the Sunda pangolin, whose maps are the same year as their pages.

#### F5 · `HAVING count(*) >= 2` drops countries with a single pool animal (out of scope, recorded)

**Where:** `scripts/content.ts:94`.

- Darwin's frog (Chile), Livingstone's flying fox (Comoros) and the Hispaniolan solenodon (Hispaniola) get no country, so no region. These are the 3 missing region records.
- The tiger loses Russia (226,201 km²). If Russia were kept, `regions.ts:129` would map all of it to `eastern-europe`, a latent error.
- **It matters for 3B:** `IDP` holds 3 animals, so it passes `HAVING`.

#### F6 · Goal 2: shared bin edges, dropped qualifiers, and column labels cut off by the 2-line clamp (wording and UI bug)

| Where | Today | Problem |
|---|---|---|
| `questionMatch.ts:58-59` questions, `:80-81` short | small "100 g to 2 kg", medium "2 to 30 kg", large "30 to 300 kg", huge "over 300 kg" | 2 kg and 30 kg each claimed twice |
| `:119` column | `Small 0.1–2 kg`, `Medium 2–30 kg`, `Large 30–300 kg`, `Huge 300+ kg` | 2, 30 and 300 kg each claimed twice; Medium and Large also cut off (below) |
| `profiles.ts:154-160` `SIZE_TEXT` | "between 100 g and 2 kg" … "between 30 and 300 kg" | as the questions |
| `docs/CONTENT_SOURCES.md:56` | same | same |
| `:125` young column | `3–10 young` vs `10+ young` | the question says "more than 10" |
| `:126` lifespan column | `5–20 years` vs `20+ years` | the question says "more than 20" |
| `:122` activity column | `Day`, `Night`, `Dawn & dusk` | the questions say "mainly" |
| `:85` activity short | `Out in the day?`, `Out at night?`, `Out at dawn and dusk?` | drop "mainly" |
| `profiles.ts:169-172` `ACTIVITY_TEXT` | day and night lines lack "mainly" | check 2, low |

- `YOUNG_TEXT`, `LIFESPAN_TEXT` and the short texts `Over 10 young at once?` and `Lives over 20 years?` are already clean. No test pins any of these strings (`tests/`, `scripts/e2e*.mjs`).
- **Column labels already get cut off (verified).** In the baseline E2E screenshot `e2e-baseline/04-round-3-landed.png`, the `Southern Africa` header reads "Southern…".
  - The header is a 54 px column (`EvidenceGrid.tsx:227`), with `text-xs` (Nunito 12 px / 16 px, −0.01 em), `line-clamp-2`, and a 12 px category mark plus 4 px margin at the start of line 1 (`:248`).
  - Rebuilt in headless Chrome with the app's font and checked against two baseline headers (`Central Africa` fits at 56 px; `Southern Africa` clips in both):

    | Label | 54–56 px |
    |---|---|
    | `Medium 2–30 kg`, `Large 30–300 kg` (today) | 3 lines, cut off |
    | `Medium >2–30 kg`, `Large >30–300 kg`, `Large >30–300kg` | 3 lines, cut off |
    | `<100 g`, `0.1–2 kg`, `>2–30 kg`, `>30–300 kg`, `>300 kg` | fit |
    | `Over 10 young`, `Over 20 years`, `Mainly day`, `Mainly night`, `Mainly dawn/dusk`, `Mainly twilight` | fit |
    | `South­ern Africa` (soft hyphen) | fits |
    | `Austra­lia & NZ` (today), `Australia, NZ` | cut off |

  - The "8 letters a line" comment (`questionMatch.ts:116`) is already wrong. Nothing in E2E checks clamping.
- **Weights at or near an edge** (all 68 size records checked; 8 animals have none: 02, 04, 07, 10, 12, 16, 17, 32):

  | Edge | Animals |
  |---|---|
  | 2 kg | Goliath frog 0.6–3.25 kg (medium); greater bilby 0.6–2.5 (small); aye-aye about 2.5 (medium); pygmy sloth 2.5–3.5 (medium) |
  | 30 kg | maned wolf 20–30 (medium); giant armadillo 19–32 (medium); wild dog 18–36 (medium); orangutan 30–90 (large); hairy-nosed wombat about 32 (large); giant pangolin ">30" (large); giant anteater 27–45 (large) |
  | 300 kg | tiger "up to about 300" (large); Baird's tapir 150–300 (large); okapi about 290 average (large) |

  Each value follows the animal's typical weight, not an endpoint, so **no animal changes size under either edge convention**.

#### F7 · Areas checked and found fine

- `roundStillFits` already re-checks saved rounds against fresh content.
- Deals depend on the set alone (sorted ids plus a hash tie-break).
- `validatePool` checks neither countries nor diet meaning, so `content -- check` stays valid on live rows.
- An unknown country code only warns (`questionMatchContent.ts:90`).
- `content -- ranges` writes `{ ...profile, range }` (`content.ts:180-181`), so any other profile field (such as `redList.notPresent`) survives a range refresh.
- `checkCitations` checks only clues and facts, not traits (`profiles.ts:357-366`). Trait source changes need a known source key and a page (`trait.url` or `profile.sources[key]`) and no `citations.json` entry.
- All 43 non-region clue faces are distinct (`clueFaces.ts`). Only region faces repeat across continents (⬆️ for north-africa, northern-europe, melanesia).

### Target design

One design: **1A′ + 2B (weight-only size labels) + 3B / 3P-A / 3P-C + 4C**, as decided by the lead.

#### Goal 1 · Diet (1A′)

**Rule** (`docs/CONTENT_SOURCES.md:59`; the diet row becomes this decision order):
1. **plants** when the sources name no animal food;
2. **insects** when they say it eats mostly small animals without backbones (insects, worms, snails, crayfish and other invertebrates);
3. **meat** when they name no plant food;
4. otherwise **mixed**.

- **Carve-out for meat-eaters:** grass or other plant bits a meat-eater swallows in small amounts don't count. Plant food it seeks out (fruit, nectar) does.
- For plant-eaters, any animal food a source names counts.
- Record each judgement call in the plan's Summary.

**Wording:**

| Tag | `QUESTION_TEXT` | `SHORT_TEXT` | `COLUMN_LABEL` | `DIET_TEXT` |
|---|---|---|---|---|
| `diet:plants` | Is it a plant-eater (only plants)? | Eats only plants? | `Only plants` (same) | It eats only plants. |
| `diet:meat` | Is it a meat-eater (only other animals, and not mostly bugs)? | Only other animals (not mostly bugs)? | `Only meat` (same) | It eats only other animals (not mostly bugs). |
| `diet:insects` | Does it mostly eat bugs and other small animals without backbones, like worms, snails or crayfish? | Mostly bugs and small invertebrates? | `Mostly bugs` (same) | It mostly eats insects and other small invertebrates, like worms, snails or crayfish. |
| `diet:mixed` | Does it eat both plants and animals (and not mostly bugs)? | Plants and animals (not mostly bugs)? | `Plants & animals` (same) | It eats both plants and animals (not mostly bugs). |

- Full questions, short questions (used for gem screen-reader labels and grid hidden-cell `aria-label`s), and guide sentences (`DIET_TEXT`) all express the same "(not mostly bugs)" / "small invertebrates" distinction; only the 54 px `COLUMN_LABEL` stays short.
- **`glossary.ts`:** add `['Invertebrate', 'An animal without a backbone, like an insect, worm, snail or crayfish.', 'invertebrates?']`. "invertebrates" already appears in `DIET_TEXT` and in one profile note.
- **`signs.ts`:** unchanged (`NOT_PLANTS`, `NOT_ANIMALS`, `nectar_drinker`). `signProblems` gives 0 problems on the 1A′ values.

**Profile edits** (12 value changes + 1 omission + 3 source/note cleanups). Every source key below exists in `sources.json`; the URL comes from `trait.url` or `profile.sources[key]`.

| id | Animal | Value | `source` (`url`) | `note` |
|---|---|---|---|---|
| 35 | Red panda | plants → **mixed** | `adw` | "Bamboo leaves are most of its food; it also eats berries, blossoms and bird eggs." |
| 15 | Pancake tortoise | plants → **mixed** | `iucn` | unchanged ("… plus the odd beetle.") |
| 20 | African spurred tortoise | plants → **mixed** | `tftsg` | unchanged ("It sometimes eats dead animals or garbage too.") |
| 71 | Andean bear | plants → **mixed** | `adw` | unchanged |
| 34 | Golden snub-nosed monkey | plants → **mixed** | `iucn` | "It eats leaves, buds, seeds, bark and lichens, and sometimes insects and small animals." |
| 40 | Sumatran orangutan | plants → **mixed** | `iucn` | unchanged ("… sometimes insects.") |
| 60 | Giant panda | plants → **mixed** | `adw` | "Bamboo is almost all of its food; now and then it eats small mammals, fish or insects." |
| 33 | Ethiopian wolf | meat → **mixed** | `literature` (`url: https://doi.org/10.1002/ecy.4470`; the profile has no `literature` key) | "It mostly eats rodents, and it also licks nectar from flowers." |
| 04 | Big-headed turtle | meat → **mixed** | `iucn` (was `adw`) | "Fruit is what it eats most often; it also eats animals like snails, worms and fish." (implementer verifies each named food against the IUCN page and drops any it doesn't name) |
| 02 | Spiny softshell | meat → **insects** | `adw` | unchanged |
| 10 | Suriname toad | meat → **insects** | `amphibiaweb` (was `adw`, which says "omnivores") | "It mostly eats invertebrates, like worms, insects and crustaceans, plus some small fish." |
| 75 | Hellbender | meat → **insects** | `adw` | unchanged |
| 11 | Goliath frog | meat → **unrecorded** (remove `traits.diet`) | — | ADW lists insects, crabs, snails, fish, small mammals and frogs with no proportions, so it cannot establish `insects` vs `meat` ("not mostly bugs"); leave unrecorded per `profiles.ts:44`. |
| 19 | Floreana tortoise | plants (same) | `literature` (`url: https://www.reptilesofecuador.com/chelonoidis_niger.html`; same URL its `trees` trait already uses) | none |
| 22 | Pinta tortoise | plants (same) | `literature` (`url: https://www.reptilesofecuador.com/chelonoidis_abingdonii.html`) | none |
| 16 | Purple frog | insects (same) | `amphibiaweb` | "It probably eats mostly termites, catching them underground." |

- **Diet counts after:** plants 24, meat 9, insects 25, mixed 17, unrecorded 1.
- **Kept as they are** (reasons go in the Summary):
  - Tasmanian devil (48) and African wild dog (65) stay `meat`: ADW's "small amounts of vegetation" and "of grass" fall under the carve-out.
  - Aye-aye (23, mixed) and giant armadillo (36, insects) are disputes about proportions, not wrong values.
  - Wording-only rows (05, 06, 08, 24, 29, 45, 49, 53, 54, echidna 27/67) are fixed by the new question text and need no value change.
  - The wolf's nectar clue stays untagged. Tagging it `nectar_drinker` would add a visible sign, which is a gameplay change outside the goal.
  - Five newly-`mixed` animals keep their plant signs (`35` red panda `bamboo_eater`, `60` giant panda `bamboo_eater`, `40` orangutan `fruit_eater`, `71` Andean bear `fruit_eater`, `34` golden snub-nosed monkey `eats_lichen`): `signProblems` stays 0; list all five in the Summary for the playtest and roadmap part 2.

#### Goal 2 · Edges and labels (2B)

Edges: tiny < 100 g; small 100 g to 2 kg (owns 100 g and 2 kg); medium over 2 kg up to 30 kg; large over 30 kg up to 300 kg; huge over 300 kg. No animal moves.

| Tag | `QUESTION_TEXT` | `SHORT_TEXT` | `COLUMN_LABEL` | `SIZE_TEXT` |
|---|---|---|---|---|
| `size:tiny` | (same) Is it tiny (under 100 g)? | (same) | `<100 g` | (same) |
| `size:small` | (same) Is it small (100 g to 2 kg)? | (same) | `0.1–2 kg` | It is small: from 100 g up to 2 kg. |
| `size:medium` | Is it medium-sized (over 2 kg, up to 30 kg)? | Medium (over 2, up to 30 kg)? | `>2–30 kg` | It is medium-sized: over 2 kg, up to 30 kg. |
| `size:large` | Is it large (over 30 kg, up to 300 kg)? | Large (over 30, up to 300 kg)? | `>30–300 kg` | It is large: over 30 kg, up to 300 kg. |
| `size:huge` | (same) Is it huge (over 300 kg)? | (same) | `>300 kg` | (same) |

- **Why weight-only column labels:** every form of `Medium …` and `Large …` with a weight range gets cut off in the 54 px header (F6), including today's. The gem face (`XS`/`S`/`M`/`L`/`XL`) and the full question still name the size.
- **Accessible hidden-cell labels (`src/components/animalBoard/EvidenceGrid.tsx:414`):** replace `columnLabel(order.tag)` with `order.short.replace(/\?$/, '')` in the hidden-cell `aria-label` so screen readers still hear the size word and diet qualifiers (e.g. `"Tiger, Medium (over 2, up to 30 kg): not scouted…"`) while the visible 54 px header stays compact.
- **Other labels:**
  - Young: `young:many` → `Over 10 young`.
  - Lifespan: `lifespan:long` → `Over 20 years`.
  - Activity columns: `Mainly day`, `Mainly night`, `Mainly dawn/dusk`; `Day & night` unchanged.
  - Activity short texts: `Mainly out by day?`, `Mainly out at night?`, `Mainly out at dawn and dusk?`.
  - `ACTIVITY_TEXT`: "It is mainly active during the day.", "It is mainly active at night.", "It is mainly active at dawn and dusk."; `any` unchanged.
  - `region:southern-africa` → `South\u00adern Africa` (fixes existing clip in seed-7 round 3).
- The `questionMatch.ts:116` comment becomes: "two lines of the 54 px column at most, category mark included; the E2E checks it."
- **`docs/CONTENT_SOURCES.md:56`:** "tiny < 100 g, small 100 g to 2 kg, medium over 2 up to 30 kg, large over 30 up to 300 kg, huge over 300 kg (an animal's typical adult weight decides)".
- **E2E header check** (`scripts/e2e.mjs`):
  - **(a)** In every round at every viewport the E2E uses (390×844, 375×548, 320×720), each `table[aria-label="Evidence"] thead th[data-tag] span.line-clamp-2` has `scrollHeight <= clientHeight` and a width no wider than its `th`.
  - **(b)** A probe like the existing long-name probe (`e2e.mjs:1062`): sets one header span's text, mark kept, to each label this mission changes (5 sizes, `Over 10 young`, `Over 20 years`, 3 activity, `South­ern Africa`), checks (a), then restores it.
  - **Fallbacks if a label still fails:** `Mainly dawn/dusk` → `Mainly twilight` (measured to fit). For any other pre-existing label the new decks deal, use a soft hyphen or shorter text that passes (a).

#### Goal 3 · Regions and presence (3B + 3P-A + 3P-C)

**SQL, identical in `scripts/content.ts` (`RANGES_SQL`) and `db/schema.sql` (`clue_match_places`).** In `country_parts`, the first branch excludes IDN as it excludes RUS (`AND c.adm0_a3 NOT IN ('RUS', 'IDN')`). Two branches then mirror Russia's split:

```sql
  UNION ALL
  -- Indonesia west of Lydekker's Line (Sumatra through Maluku/Wallacea: Seram, Halmahera, Gorong/Watubela, Kai, Tanimbar) stays Asia.
  SELECT c.adm0_a3, c.name, c.continent, d.geom, c.continent
  FROM natural_earth.countries c CROSS JOIN LATERAL ST_Dump(ST_MakeValid(c.geom)) d
  WHERE c.adm0_a3 = 'IDN'
    AND NOT (ST_X(ST_Centroid(d.geom)) > 133.2 OR (ST_X(ST_Centroid(d.geom)) > 130 AND ST_Y(ST_Centroid(d.geom)) > -3.5))
  UNION ALL
  -- Its parts east of Lydekker's Line (mainland Papua, Raja Ampat, Cenderawasih Bay, Adi/Karas, Aru) are Oceania,
  -- under the project code IDP (regions.ts: melanesia). Same name literal as regions.ts.
  SELECT 'IDP', 'Indonesian New Guinea', 'Oceania', d.geom, 'Oceania'
  FROM natural_earth.countries c CROSS JOIN LATERAL ST_Dump(ST_MakeValid(c.geom)) d
  WHERE c.adm0_a3 = 'IDN'
    AND (ST_X(ST_Centroid(d.geom)) > 133.2 OR (ST_X(ST_Centroid(d.geom)) > 130 AND ST_Y(ST_Centroid(d.geom)) > -3.5))
```

- In `content.ts`, `country_shapes` (`WHERE continent = home OR adm0_a3 = 'RUS'`, grouped by `adm0_a3, name, home`) keeps both IDN and IDP as separate shapes without change, because each has `continent = home`.
- In `clue_match_places`, the IDP parts join `continent:oceania` and the IDN parts stay in `continent:asia` (keeping Tanimbar, Kai, and Gorong/Watubela in Asia's globe outline).
- **Presence 1–2 (3P-A):** in all three queries (`RANGES_SQL`, `clue_match_ranges`, `clue_match_places`), both `presence IN (1, 2, 3)` become `presence IN (1, 2)`: the `WHERE` and the `OR NOT EXISTS` fallback. Update comments `schema.sql:93`, `:146` and `content.ts:44-46` to match and note "Indonesia split along Lydekker's Line (`> 133.2°E` or `> 130°E` north of `3.5°S`)".
- **`clue_match_ranges`** changes only its presence filter (range maps lose presence-3 patches).
- **`regions.ts`:** add `['IDP', '', 'melanesia', 'Indonesian New Guinea']`, noting IDP is this project's code from the range query, not Natural Earth's. The name must equal the SQL literal in both `scripts/content.ts` and `db/schema.sql` (pinned by a unit test in `content.test.ts`), because the pool door uses `countryName` and the profile door uses the SQL name.

**`redList.notPresent` (3P-C):**
- **Type** (`profiles.ts`): `redList: { …; notPresent?: Array<{ code: string; status: 'uncertain' | 'possibly-extinct' | 'extinct' }> }`. Cited by `redList.url` (same assessment's Country Occurrence list).
- **Helper** (query, pure): `export function presentCountries(profile: Pick<AnimalProfile, 'range' | 'redList'>): Array<{ code: string; name: string }>`. Returns `range.countries` without the `notPresent` codes, in the same order.
- **Called by both doors that read profiles:**
  - `profileClues` (`profiles.ts:261`): the country clue's text and `country:` tags, and so the database rows, and so `animalsFromPool`.
  - `animalsFromProfiles` (`questionMatchContent.ts:183`): the bot and the tests.
  - `animalsFromPool` needs no change: it reads the already-filtered tags.
- **`checkProfile` fails loudly (no case normalization) when:**
  - a `code` is not 3 uppercase ASCII letters (`/^[A-Z]{3}$/`) or unknown to `regionOfCountry(code)` (catches lowercase codes and typos);
  - a `status` is outside `'uncertain' | 'possibly-extinct' | 'extinct'`;
  - a `code` appears twice in `notPresent`;
  - `range?.countries` is non-empty and `presentCountries(profile)` becomes empty (every country removed).
  - *Decoupled from `HAVING count(*) >= 2`:* a valid sourced `notPresent` code that is currently absent from `range.countries` is allowed (not an error), so adding/removing another animal never breaks unrelated profiles or drops a sourced exclusion that should take effect again if the country returns.
- **`range.countries` stays raw map output and is never hand-edited.**
- **Save-restore continent check (`animalBoard.ts`, `useAnimalSession.ts`):** `roundStillFits(book, round)` also verifies every suspect exists in `book.byId` and, when `round.place !== null`, belongs to `round.place` (`book.byId.get(id)?.continents.includes(round.place)`). `useAnimalSession.ts:119` also checks `saved.session.round.place === data.continent`. This drops saved Asia rounds containing echidnas after the owner's content build even if their 4 dealt clue rows still match.
- **Entries:**

  | id | Animal | `notPresent` |
  |---|---|---|
  | 57 | Aardvark | SDN uncertain |
  | 65 | African wild dog | DZA possibly-extinct; SDN, BFA, CMR, MWI, NGA extinct; TCD uncertain |
  | 24 | Sunda pangolin | CHN uncertain |
  | 18 | Yangtze giant softshell | CHN possibly-extinct |
  | 58 | Cheetah | SDN, SDS possibly-extinct |
  | 50 | Addax | MRT possibly-extinct |
  | 52 | Giant anteater | CRI possibly-extinct |
  | 63 | Temminck's pangolin | SWZ possibly-extinct |
  | 07 | Hairy frog | COG uncertain |

  - All codes exist in today's `range.countries`, and none is removed by 3P-A (verified).
  - Floreana and Pinta keep ECU (historical range by design). Giant pangolin AGO is skipped (not an uncertain or extinct status; changes no region).
- **Effect** (simulated):
  - Exactly 4 region answers flip: aardvark North Africa yes → no; wild dog North Africa yes → no; Sunda pangolin East Asia yes → no; Yangtze East Asia yes → no.
  - No continent changes in rounds or on the globe. The views use polygons, not `notPresent`; range maps still draw those countries (acceptable, recorded in Summary).

**Dev copy (`phaser_june_dev`), done by the lead.** Every command runs inside the brief's guard block. Never `.env.local`.
1. **Golden diff:** on today's query, run `content -- ranges`. `git diff --quiet -- db/content/animals` must pass (proves dev's map data matches committed profiles).
2. With the new `RANGES_SQL`, run `content -- ranges` again. Only expected diffs: 17 (`IDN → IDP`), 27 (`IDN → IDP`), 67 (`IDN → IDP`), 57 (`−DJI, −TGO`), 58 (`−DJI`), 41 (`−CAF, −TGO`). Any other diff: stop and investigate. Commit the result.
3. Apply profile edits (diet, `notPresent`). Run `content -- preview`: 0 problems.
4. Run the **zero-downtime view-swap SQL** on dev (the exact SQL the owner will paste on live):
   - Outside any swap lock: `DROP MATERIALIZED VIEW IF EXISTS clue_match_ranges_new, clue_match_places_new;` then `CREATE MATERIALIZED VIEW clue_match_ranges_new AS …; CREATE UNIQUE INDEX clue_match_ranges_new_species_id ON clue_match_ranges_new (species_id);` and `CREATE MATERIALIZED VIEW clue_match_places_new AS …; CREATE UNIQUE INDEX clue_match_places_new_key ON clue_match_places_new (key);`.
   - Then in one short transaction (milliseconds; no 15 s `critter_app` timeout): `BEGIN; DROP MATERIALIZED VIEW clue_match_places; DROP MATERIALIZED VIEW clue_match_ranges; ALTER MATERIALIZED VIEW clue_match_ranges_new RENAME TO clue_match_ranges; ALTER INDEX clue_match_ranges_new_species_id RENAME TO clue_match_ranges_species_id; ALTER MATERIALIZED VIEW clue_match_places_new RENAME TO clue_match_places; ALTER INDEX clue_match_places_new_key RENAME TO clue_match_places_key; DO $$ … GRANT SELECT ON clue_match_places, clue_match_ranges TO critter_app; … $$; COMMIT;`.
5. `content -- build` on dev, then `content -- check` on dev, then `e2e:fresh` (including the globe-vs-rounds agreement check).
6. Read-only check: `clue_match_places` continents for the 10 IDN ids match `animalsFromProfiles` continents. Record the table in the plan.

#### Goal 4 · Dealer (4C)

```ts
/** Every askable question for the set, grouped by how it splits the set (a question and its opposite share a group).
 *  Groups in the order of their first question (prefix order, then tag); each keeps one question per category
 *  (the first) plus every region question (their faces differ). */
export function questionGroups(book: Book, set: readonly number[], place: ContinentKey | null): Clue[][];
/** Unchanged contract and output: one question per split. */
export function fullTable(book, set, place) { return questionGroups(book, set, place).map(group => group[0]); }
```

**`dealClues(book, set, place, count)`:**
- Sort the ids. Take `groups = questionGroups(...)`. If `groups.length < count`, return `null`.
- For each `combinations(groups, count)`: skip it unless `tellsApart(groupHeads)` holds. All members of a group share its split, so the heads decide.
- Then for each `product(groups)` deck, skip it unless all `clueFace`s are distinct, and score it:

  ```
  key = [ -max(0, regions - 1),
          (any minor >= 2 ? 4 : 0) + (any minor === 1 ? 4 : 0) + #categories,
          -regions,
          -hash32(`${sortedIds}:${tags.join('|')}`) ]
  ```

  The highest key wins, compared element by element (same hash tie-break as today: lower hash wins).

**Why it's correct:**
- One question per category per split loses no deck that would score higher. Non-region faces are all distinct, and the score depends only on regions, splits and categories.
- So if a dealt deck holds more than one region, no valid deck with at most one exists. The dealer proves "forced" by itself.
- Two questions in one deck never share a split (each comes from a different group).
- Colliding region faces in one group don't matter: a deck takes one question per group, and the face check covers the deck.

**`pickSuspectSet`:**
- Unchanged code. Calls `fullTable` to grow a set and `dealClues` for the final check.
- The new dealer finds a deck whenever the old one did, so no set is lost. A seed the old dealer rejected may now form a set; `--deals` reports the set count.

**Other changes:**
- `ANIMAL_RULES.version = '055-1'`.
- **Speed fallback (measure first — KISS):** implement `dealClues` without branch-and-bound first and measure with `--deals`. Add the lossless branch-and-bound cut-off (`[-max(0, #all-region groups - 1), splitMix + min(count, |categories across the groups' members|)]`) only if the measured worst deck is `>= 20 ms` or Anywhere load exceeds target.

**`scripts/balance-044.ts --deals`:**
- Deals only, with no rounds. Uses `--places` (default `world,africa,asia,north-america,south-america`; `world` = Anywhere).
- Builds sets like `digest.ts`: per place, seed order, deduped by members, ids `S001…` in place order.
- Prints: (1) sets per place and total slots; (2) slot table by category then subject (Baseline format); (3) region-per-deck and categories-per-deck histograms; (4) decks with birth (including separate `birth:eggs` and `birth:live` counts) and life-cycle slots; (5) each deck with >1 region (id, place, names, missing records); (6) fixed questions never dealt; (7) timing (total ms, worst deck ms + set id, Anywhere load ms).

**Targets** (set by the lead before the change):
- birth in ≥ 5 decks (fallback: if the final table with all profile edits lands at 4 while all other targets pass, accept 4 and record why in Decisions/Summary rather than adding an ad-hoc birth bias; if `< 4`, investigate);
- life-cycle slots ≥ 35;
- region slots ≤ 75;
- > 1 region only where forced;
- 100 % of decks tell all five apart;
- ≥ 60 decks with 4 categories;
- worst deck < 20 ms;
- Anywhere load ≤ 3× 117 ms (also record CPU-throttled Anywhere load in E2E Verification).

**Simulation with all content changes** (1A′, IDN → Melanesia, 3P-A drops, `notPresent`; old `pickSuspectSet`):
- 104 sets; birth in 6 decks; life-cycle 49 slots; region 69; 7 decks with >1 region (2:3, 3:2, 4:2, all forced); 72 decks with 4 categories; every deck tells all five apart.
- Speed: 226–271 ms total; worst deck 13–24 ms across runs (addressed by the lossless branch-and-bound fallback above).

#### Docs to update

- **`docs/CONTENT_SOURCES.md`:** `:56` size edges; `:59` diet decision order and carve-out; `:24` `redList.notPresent` field, rule (confirmed extant range; excludes IUCN extinct, possibly extinct, and presence-uncertain countries), `HAVING count(*) >= 2` independence, and validation.
- **`docs/CLUE_MATCH.md`:** `:61` confirmed extant range (countries minus `redList.notPresent`); `:67` places view splits Indonesia along Lydekker's Line (`> 133.2°E` or `> 130°E` north of `3.5°S`, `IDP → Oceania`) and uses presence 1–2; `:51` "notes up to 053-1" → "055-1".
- **`docs/ANIMAL_BOARD_PAPER.md:38`** (frozen): append one dated note to item 2: "(055-1: any question with the same split may stand in, so life-cycle questions are dealt; at most one Range question unless the group needs more.)"
- **`docs/SHAPEFILE_BEST_PRACTICES.md:35`:** presence 1–2.
- **`CONTEXT.md`:** no change (terms still hold).

### Rejected alternatives

- **1B ("mostly" for every bin):** needs proportion data the sources lack, contradicts the 8 existing `mixed` notes, and breaks single-sign deduction in `signs.ts`.
- **Strict 1A (devil and wild dog → mixed):** treats swallowed grass as diet; Opus rated both rows low. Remains the cheap fallback if a review rejects the carve-out.
- **Goliath frog → insects:** only proportion figure comes from an uncited paper.
- **2A (`[a, b)` edges):** moves 300 kg into huge and needs awkward `30–<300 kg` labels.
- **Named size labels (`Medium >2–30 kg` / `Large >30–300 kg` / `>30–300kg`):** all get cut off at 54–56 px (F6).
- **3A (split IDN by realm in code):** misfiles Wallacea, and globe stays wrong without a view change.
- **3A+G (globe continents computed from code):** `/api/places` would load the whole pool, and every continent's list changes rules.
- **Changing the `IDN` row to Melanesia:** breaks seven Asian animals.
- **Splitting IDN with an envelope like Russia's:** cuts through Seram; part centroids are cleaner.
- **3P-B (`presence = 1`):** drops probably-extant range and fixes no flagged row.
- **3P-A alone:** flips no region answer (F4).
- **Hand-editing `range.countries`:** `content -- ranges` overwrites it.
- **4A (region cap only):** birth stays at 0.
- **4B (every question in one flat table):** 17× slower (pruned: 4×).
- **Rejecting multi-region sets in `pickSuspectSet`:** shrinks pools, and the brief allows forced cases.
- **Dropping the +4/+4 split bonuses:** no measurable effect, and the 2-vs-3 split is the paper's teaching point (`ANIMAL_BOARD_PAPER.md:153-155`).
- **A random representative per split:** harder to debug, and adds nothing over the category score.

### Compatibility, invariants, and open risks

**Live database after deploy, before the owner acts.**
- **At deploy:** new question and column text, new dealer, rules `055-1`. Saved games are dropped once. `?seed=` rounds stay deterministic. `roundStillFits` and `content -- check` stay valid.
- **Until the build:** diet values, guide sentences, `IDP` and `notPresent` stay as they are. Diet errors stay until the build (spiny softshell, Suriname toad and hellbender still answer yes to "meat-eater (… not mostly bugs)" until the build). `IDP` in `regions.ts` sits unused.

**Owner's steps** (one handoff item, added only after deploy smoke tests pass; from WSL on fresh `main`):
1. **Fresh dump:** `ssh play.critterconnect.org /opt/critter-connect/deploy/backup/pg-backup.sh`.
2. **`npm run content -- ranges`.** Read-only (~15 min). Expect `git status --porcelain db/content/animals` empty (proves live map data equals dev's); if non-empty, stop before view SQL and build.
3. **Paste the zero-downtime view-swap SQL** (exact SQL tested on dev): builds `clue_match_ranges_new` and `clue_match_places_new` + unique indexes with zero lock on live reads (~1 min), then swaps names and re-grants `SELECT` to `critter_app` in a millisecond transaction. Players see: zero downtime; W echidna moves Asia → Oceania on the globe; E echidna and pig-nosed turtle show only under Oceania; Asia lists 19; range maps lose presence-3 patches.
4. **`npm run content -- build`.** Players see: rounds follow the globe (Asia pool 17); 12 diet changes + Goliath frog unrecorded; 4 region answers flip; new guide sentences.
5. **Optional:** `npm run content -- check`.

Running read-only `ranges` before the view SQL shrinks the DB-level globe-vs-rounds mismatch window (F3 table) from ~15 minutes to ~1 minute (the `content -- build` run) and gates the live view swap on map parity. Because `/api/places` (`Cache-Control: public, max-age=300, stale-while-revalidate=3600`) and `/api/clue-game/pool` (`max-age=60, stale-while-revalidate=600`) cache independently, individual returning browsers may see mixed globe/pool revisions for up to ~5 minutes (or one SWR refresh) until both caches revalidate; `roundStillFits` drops any stale saved Asia round once fresh pool data loads.

**Unit tests, written first and seen failing:**

| Test (file) | Must catch |
|---|---|
| `questionGroups` / `dealClues` / `roundStillFits` (`tests/clueGame/animalBoard.test.ts`, hand-built pool) | birth shadowed by covering is still never dealt; a deck with 2 regions where a 1-region deck exists; a forced 2-region set returns `null`; two questions with one split in a deck; colliding region faces; the deck changes with id order or with the mystery; `fullTable` output differs from `questionGroups().map(g => g[0])`; `count` > groups doesn't return `null`; `roundStillFits` accepts a saved continent round after a suspect leaves that continent |
| IDP & SQL drift (`tests/clueGame/content.test.ts`) | `regionOfCountry('IDP') !== 'melanesia'`; `countryName('IDP') !== 'Indonesian New Guinea'`; `continentOf('country:idp') !== 'oceania'`; `scripts/content.ts` and `db/schema.sql` disagree with each other or with `regions.ts` on `'IDP'`, `'Indonesian New Guinea'`, or the Lydekker's Line boundary expression |
| `presentCountries` / `checkProfile` (`content.test.ts`) | a listed code survives into the country clue or into `animalsFromProfiles` regions; the two doors disagree; a lowercase code, an unknown code, a bad status, a duplicate, or removing every country passes `checkProfile`; a valid sourced `notPresent` code absent from `range.countries` wrongly fails `checkProfile` |
| Glossary (`glossary.test.ts`) | "invertebrates" in `DIET_TEXT` has no definition |

Existing tests (`animalBoard.test.ts:38-58`, `:153-155`, `savedGame.test.ts`) keep passing (`fullTable`'s contract is unchanged; no test pins rules version).

**E2E** (`e2e:fresh` on dev, after dev-copy steps):
- header check (Goal 2 (a) and (b)), existing invariants;
- globe-vs-rounds agreement check on dev copy: `/api/places` Oceania lists ids 17, 27, 67 and Asia omits them, matching `animalsFromPool` continents for all 10 IDN animals, and id 27 answers yes to `region:melanesia` in the pool;
- record CPU-throttled Anywhere load timing alongside the unthrottled `--deals` timing.

**Open risks:**
- **Worst deck 13–24 ms** against < 20 ms target on 2-CPU VPS; measure first (KISS), and add the lossless branch-and-bound cut-off if measured worst deck `>= 20 ms`.
- **The 1A′ carve-out is uneven:** a beetle makes a tortoise mixed, while incidental grass doesn't make a dog mixed. Written down explicitly; strict 1A (14 edits) is the fallback if reviews reject it.
- **Balance bot may move > 3 points in some places** because every deck changes; record the reasons per place.
- **CI for other PRs runs old code on updated dev rows/views:** unknown `IDP` only warns.
- **Big-headed turtle's note** must name only foods IUCN names.

**Out of scope, for the Summary:**
- `HAVING >= 2` country rule and latent Russia → Eastern Europe mapping (F5);
- `Austra­lia & NZ` label (cut off in every form tested);
- missing records forcing multi-region decks: tomato frog `trees`, purple frog `size`, Suriname toad `size`/`activity`/`social`, Goodfellow's `activity`/`social`, sloths' `lifespan`;
- five newly-`mixed` animals whose plant signs (`bamboo_eater`, `fruit_eater`, `eats_lichen`) now sit beside a "no" on "Only plants": `35` red panda, `60` giant panda, `40` Sumatran orangutan, `71` Andean bear, `34` golden snub-nosed monkey (for playtest and witness-note mission);
- `birth:live` remaining at 0 dealt slots because its exact complement `birth:eggs` sorts first within the `life` category;
- Astra's objection on `presence uncertain` region answers (`24` Sunda pangolin East Asia, `57` aardvark North Africa);
- range maps still drawing `notPresent` countries;
- refreshing IUCN polygons older than their pages (wild dog 2008, giant anteater 2014, W echidna 2010, Goodfellow's 2008);
- Carnivora gloss "meat-eating";
- tapir's fur, tiger's activity, giant otter's social life, savanna vs grassland, `covering:skin` and `social:pairs` wording, give-away witness notes;
- visible guide line repeating a dealt question's split (covering vs birth).

### Decision (lead)

1. **Goal 1 (Diet): Option 1A′** — keep *"only"* for `plants` and `meat`, *"mostly"* for `insects`, with the explicit 4-step partition order in `docs/CONTENT_SOURCES.md:59` (`plants` → `insects` → `meat` → `mixed`) and the incidental-plant carve-out for obligate meat-eaters (`48`, `65`).
   - *Why over 1B:* inspecting the 8 existing `mixed` profiles (`56-chimpanzee`, `17-pig-nosed-turtle`) shows their notes already say *"mostly"* fruit/plants; shifting to *"mostly"* would contradict existing omnivores, require proportion data sources lack, and break single-sign deduction in `signs.ts`.
   - *Why 1A′ over strict 1A:* Tasmanian devil (`48`) and African wild dog (`65`) are obligate carnivores whose ADW trace grass/vegetation is incidental (Opus rated both low, neither guide mentions plants); keep them `meat` and document why in Summary. Giant panda (`60`) moves to `mixed` with its ADW note updated to mention occasional insects/fish/small mammals, because its guide already says *"almost all"* and Opus rated it medium. Goliath frog (`11`) stays `meat` (cited ADW gives no proportions). Total: 12 value edits + 3 source/note cleanups. Keep `Mostly bugs` in the 54 px column, clarify full/short questions and `DIET_TEXT`, add `Invertebrate` to `glossary.ts`, and keep `signs.ts` intact.
2. **Goal 2 (Edges & labels): Option 2B with weight-only size column labels** — mirror lifespan and young (`tiny < 100 g`, `small 100 g to 2 kg`, `medium over 2 kg to 30 kg`, `large over 30 kg to 300 kg`, `huge over 300 kg`; 0 profile moves), fix `Over 10 young`, `Over 20 years`, `Mainly` on activity labels/short texts/`ACTIVITY_TEXT`, and add soft hyphen to `South\u00adern Africa`. Accept architect's Chrome-measured refinement to weight-only size column headers (`<100 g`, `0.1–2 kg`, `>2–30 kg`, `>30–300 kg`, `>300 kg`) since the gem face already shows `XS`/`S`/`M`/`L`/`XL` and any `Medium`/`Large` + range string clips at 54 px; enforce with the E2E header-clamp check and probe.
3. **Goal 3 (Regions & presence): Option 3B + Option 3P-A + Option 3P-C combined.**
   - Split `IDN` parts with `ST_X(ST_Centroid(d.geom)) > 130` into `IDP` ("Indonesian New Guinea", Oceania) in both `scripts/content.ts` and `db/schema.sql`, and map `IDP → melanesia` in `regions.ts`. Avoids Wallacea misfiling for future birds and keeps globe and rounds aligned on one geographic rule.
   - Tighten `presence IN (1, 2, 3)` → `presence IN (1, 2)` in `scripts/content.ts` (`RANGES_SQL`) and `db/schema.sql` (`clue_match_ranges`, `clue_match_places`) **and** add `redList.notPresent` filtered via one shared pure helper `presentCountries(profile)` called by both `profileClues` (`profiles.ts`) and `animalsFromProfiles` (`questionMatchContent.ts`), with fail-loud validation in `checkProfile`.
   - **Dev copy (`phaser_june_dev`):** the lead will run golden-diff + new `content -- ranges`, recreate `clue_match_ranges` and `clue_match_places` (preserving `GRANT SELECT ... TO critter_app`), and run `content -- build` on `phaser_june_dev` ONLY (guarded) so E2E verifies globe + rounds together.
   - **Owner handoff order:** accept architect's refinement to run read-only `content -- ranges` before the view SQL and `content -- build`, cutting the globe-vs-rounds mismatch window from ~15 min to ~1 min and gating live SQL on map parity.
4. **Goal 4 (Dealer): Option 4C** — two-stage `questionGroups` + `dealClues` with lexicographic scoring `[-Math.max(0, regions - 1), splitMix + categories, -regions, -hash]` (plus the lossless branch-and-bound cut-off so worst deck stays `< 20 ms`), preserving `fullTable`'s contract and output; bump `ANIMAL_RULES.version` to `'055-1'`; add `--deals` to `scripts/balance-044.ts`.
   - **Confirmed targets (set before implementation):** birth ≥ 5 decks; life-cycle ≥ 35 slots; region ≤ 75 slots; >1 region only where forced; 100% 5-suspect separation; ≥ 60 4-category decks; worst single `dealClues` < 20 ms; Anywhere load ≤ 3× baseline (~350 ms).
5. **Revisions after Fable & Astra reviews (2026-11-20; see Revision notes):**
   - Goal 1: leave `11-goliath-frog` diet unrecorded (remove `traits.diet`, per `profiles.ts:44`), and align `SHORT_TEXT` and `DIET_TEXT` with `QUESTION_TEXT` on `(not mostly bugs)` / `small invertebrates`.
   - Goal 2: use `order.short.replace(/\?$/, '')` for hidden-cell `aria-label` in `EvidenceGrid.tsx:414`.
   - Goal 3: tighten Indonesia split to Lydekker's Line (`> 133.2°E` or `> 130°E` north of `3.5°S`) so Maluku/Wallacea (Tanimbar, Kai, Gorong/Watubela) stay in Asia; use zero-downtime `*_new` build + millisecond swap-and-grant SQL; decouple `checkProfile`'s `notPresent` check from `HAVING >= 2` (validate `/^[A-Z]{3}$/` + `regionOfCountry`); add continent eligibility check to `roundStillFits` and `useAnimalSession`; add E2E globe-vs-rounds check and SQL drift unit test; keep `notPresent` dropping `uncertain` countries per the brief (rejecting Astra MUST-FIX #3).
   - Goal 4: measure `dealClues` without branch-and-bound first (KISS), adding the lossless cut-off only if measured worst deck `>= 20 ms` or Anywhere load misses target; report `birth:eggs` and `birth:live` separately in `--deals`; record birth=4 fallback and CPU-throttled Anywhere load timing.

## Architecture review (Fable)

*Reviewed 2026-11-20 by `architecture-reviewer` (Fable 5.2 · high); full transcript: `/srv/critter-ai/agent-state/missions/clue-data-dealer/tasks/20261120-080744-architecture-reviewer.md`.*

```
VERDICT: APPROVE_WITH_CHANGES
MUST-FIX:
1. Owner step 3 (live view change) stalls the live game's entry screen. The plan's form (DROP both materialized views, CREATE both, indexes, GRANT, in one transaction) holds an exclusive lock for about a minute. `/api/places` (the globe, the first screen), `/api/places/outline`, `/api/clue-game/range` and `/api/clue-game/ranges` read only these views (`src/lib/places.ts:15,36`, `src/app/api/clue-game/range*/route.ts`), so they hang for that minute. The plan's "players see" text gives only the after-state. Fix the handoff SQL: build both views under new names first (no lock on the old ones), then in one short transaction drop the old views, rename the new views and their unique indexes to the `schema.sql` names, and run the GRANT block. Use the same form on the dev copy so the SQL the owner pastes is the SQL that was tested. If the lead keeps the single transaction, the handoff item must state the stall and tell the owner to run it at a quiet hour.
MISSED:
1. F3's island list is wrong, and so is part of the Decision's reason for 3B. On the dev copy, the Natural Earth part at 131.41°E, 7.59°S (3,254 km²) is Yamdena in the Tanimbar Islands, not Waigeo; Waigeo is the 130.84°E, 0.21°S part. The `> 130` rule also takes the rest of Tanimbar (130.9–131.9°E, 7–8°S), Gorong/Watubela (about 131.3°E, 4°S) and Kai. These are Maluku (Wallacea), yet they become "Indonesian New Guinea" / Oceania. No current animal is affected, and the dev-copy step 2 diff gate would catch one. But "avoids Wallacea misfiling for future birds" is only partly true. Either add a latitude bound for the parts between 130°E and 132°E south of 6°S, or record the known misfiling in the SQL comment, `docs/CLUE_MATCH.md` and the Summary.
2. Country lists depend on the whole pool through `HAVING count(*) >= 2` (`content.ts:94`). Adding or removing any animal can add or drop a country in another animal's `range.countries`. A `notPresent` code then fails `checkProfile`, and `assertProfilesReady` blocks the next `build` and `ranges` for all profiles. That is loud, as intended, but the error text and `docs/CONTENT_SOURCES.md` must say what to do: remove the entry, and re-add it if the country returns. Part 3 (birds) will hit this.
3. Weight-only size labels also change the hidden cells' accessible names: `EvidenceGrid.tsx:414` builds them from `columnLabel`, so a screen reader would hear "Tiger, >2–30 kg: not scouted". Use `shortQuestionText` (or the question) for that aria-label, so only the visible header loses the size word.
4. The Architecture and the Decision disagree on the branch-and-bound cut-off: the Architecture includes it only if `--deals` reports a worst deck of 20 ms or more; the Decision includes it always. Settle it before Steps. KISS says measure first and add it only if the target fails.
SHOULD-CONSIDER:
1. Make the globe-versus-rounds agreement an E2E assertion, not only the dev-copy step 6 query: on the dev copy, the globe's Oceania card lists ids 17, 27 and 67 and Asia's doesn't, and an Anywhere round answers yes for id 27 on New Guinea. That leaves an artifact that can be re-checked.
2. Plant signs on animals that become `mixed` now point at a "no" answer: `bamboo_eater` on the giant panda and red panda, `fruit_eater` on the orangutan and Andean bear, `eats_lichen` on the snub-nosed monkey. `signs.ts` only denies meat and insects, so `signProblems` stays at 0, but a child reading "bamboo eater" will pencil "Only plants: yes" and lose pencil points. List these five in the Summary for the playtest and the witness-note mission.
3. Add the load time on a slow phone to the targets: the Anywhere load deals 76 sets on the main thread, and the plan allows 3× today's time on the VPS. The E2E already has a CPU throttle; record the throttled load before and after.
4. In the `IDP` test and the SQL comment, pin that the name literal `'Indonesian New Guinea'` is the same string in three places (`RANGES_SQL`, `schema.sql`, `regions.ts`). A check in `content.test.ts` that reads the literal from `scripts/content.ts` would catch drift; the plan's test only checks `regions.ts`.
5. Birth is dealt in 6 simulated decks against a target of 5 or more. One content change could miss it, so say in the plan what the lead does if the final table shows 4.
```

## Architecture review (Astra)

*Reviewed 2026-11-20 by Astra (Codex GPT-6.2-Astra · xhigh); saved output: `/srv/critter-ai/agent-state/missions/clue-data-dealer/tasks/astra-arch-review.md`.*

```
VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. **Keep the globe available during the view change.** Dropping both materialized views before rebuilding them holds exclusive locks for about a minute. The app role times out after 15 seconds, so globe and range requests can return 500s. Build and index replacements first, then swap them and apply grants in one short transaction.
2. **Check continent eligibility when restoring a round.** An Asia round with suspects `5, 16, 27, 62, 67` can pass `roundStillFits` after both echidnas move to Oceania. Its clue rows and witness notes still match. Require every saved suspect to belong to the current effective pool before restoring.
3. **Preserve uncertainty in region answers.** Removing China from the Sunda pangolin’s country list turns “presence uncertain” into a scored **No** for East Asia. Either ask about documented range or skip that question when the evidence cannot establish an answer.
4. **Require evidence for both sides of the diet split.** The plan keeps the Goliath frog in `meat` because its source gives no proportions, yet that bin now asserts it does **not** eat mostly invertebrates. Leave diet unrecorded when the source cannot distinguish the bins. Make the full question, short question, and guide express the same distinction.
5. **Correct the Indonesian island boundary.** The `>130°E` rule assigns Tanimbar and parts of Maluku to “Indonesian New Guinea.” That changes the globe outline even with today’s animal set. Use the same verified island boundary in both SQL paths.

SHOULD-CONSIDER:

1. Keep sourced country exclusions when a range refresh temporarily drops a country. The `HAVING count(*) >= 2` threshold depends on other animals and can otherwise invalidate an unrelated profile.
2. Account for the independent `/places` and `/pool` caches in the rollout. Players can see mismatched revisions beyond the estimated one-minute database window.
3. Count both birth questions in the dealer report. With one representative per category and split, `birth:eggs` always precedes its complement, so the birth target can pass while `birth:live` is never dealt.
```

## Revision notes

*Lead rulings on all Fable (1 MUST-FIX, 4 MISSED, 5 SHOULD-CONSIDER) and Astra (5 MUST-FIX, 3 SHOULD-CONSIDER) items, 2026-11-20. Accepted design changes applied directly to Architecture above.*

### Fable review
- **MUST-FIX 1 (zero-downtime view swap):** **Accepted** — `critter_app` has a 15 s `statement_timeout` (`deploy/db/app-role.sql:29`), so dropping and rebuilding in one transaction stalls live globe/range endpoints; build `*_new` views + unique indexes first, then drop/rename/grant in one millisecond transaction (tested verbatim on `phaser_june_dev` and copied into owner handoff).
- **MISSED 1 (Indonesia island list & Wallacea misfiling):** **Accepted** — verified all 97 eastern `IDN` polygons on `phaser_june_dev`; fixed F3's island list (Waigeo vs Yamdena/Tanimbar) and tightened both SQL copies to Lydekker's Line (`> 133.2°E` or `> 130°E` north of `3.5°S`), keeping Seram, Halmahera, Gorong/Watubela, Kai, and Tanimbar in Asia and Sahul/Papua/Raja Ampat/Aru in Oceania.
- **MISSED 2 (`HAVING >= 2` breaking `notPresent` in `checkProfile`):** **Accepted (via Astra SC 1)** — decoupled `checkProfile` from pool-dependent `range.countries` (validate `/^[A-Z]{3}$/` + `regionOfCountry(code) !== null`, valid status, no duplicates, non-empty `presentCountries` when `range?.countries.length > 0`) and documented the `HAVING >= 2` interaction in `docs/CONTENT_SOURCES.md`.
- **MISSED 3 (`EvidenceGrid.tsx:414` hidden-cell `aria-label` loses size word):** **Accepted** — switch `columnLabel(order.tag)` to `order.short.replace(/\?$/, '')` in `EvidenceGrid.tsx:414` so screen readers keep size/diet qualifiers while visible 54 px headers stay compact.
- **MISSED 4 (branch-and-bound discrepancy):** **Accepted** — settled in favor of KISS: measure `dealClues` without branch-and-bound first via `--deals`, and add the lossless cut-off only if worst deck `>= 20 ms` or Anywhere load misses target.
- **SHOULD-CONSIDER 1 (globe-vs-rounds E2E assertion):** **Accepted** — added an E2E check asserting `/api/places` and `/api/clue-game/pool` agree for all 10 IDN animals (Oceania lists 17, 27, 67; Asia omits them; id 27 has `region:melanesia`).
- **SHOULD-CONSIDER 2 (5 newly-`mixed` animals with plant signs):** **Accepted** — listed all five (`35`, `60`, `40`, `71`, `34`) for the Summary / playtest / witness-note mission; `signProblems` stays 0 and sign changes are out of scope.
- **SHOULD-CONSIDER 3 (CPU-throttled Anywhere load time):** **Accepted** — record CPU-throttled Anywhere load time during E2E Verification alongside unthrottled `--deals` timing.
- **SHOULD-CONSIDER 4 (pin `'Indonesian New Guinea'` across SQL and `regions.ts`):** **Accepted** — added a unit test in `tests/clueGame/content.test.ts` verifying `scripts/content.ts`, `db/schema.sql`, and `regions.ts` share the exact `'IDP'` code, `'Indonesian New Guinea'` literal, and boundary predicate.
- **SHOULD-CONSIDER 5 (fallback if final birth decks = 4):** **Accepted** — documented in Goal 4 targets: if final table hits 4 birth decks while all other targets pass, accept 4 and explain why rather than adding an ad-hoc birth bias; if `< 4`, investigate.

### Astra review
- **MUST-FIX 1 (zero-downtime view swap):** **Accepted** — same fix as Fable MUST-FIX 1.
- **MUST-FIX 2 (continent eligibility in `roundStillFits`):** **Accepted** — update `roundStillFits(book, round)` in `animalBoard.ts` to verify every suspect exists in `book` and belongs to `round.place` (when non-null), check `saved.session.round.place === data.continent` in `useAnimalSession.ts:119`, and write the failing unit test first.
- **MUST-FIX 3 (preserve uncertainty on `presence uncertain` region answers):** **Rejected** — the brief explicitly specifies that region answers must not rest on IUCN `presence uncertain`, `possibly extinct`, or `extinct` countries (citing aardvark's Sudan and wild dog's North Africa), matching how `presence IN (1, 2)` and the 5 % / 5,000 km² threshold already define `"Does it live in …?"` as confirmed extant range; adding uncertain-region skip tags across `deduction.ts`/pool doors would add cross-cutting complexity for two border cases while leaving threshold-omitted borders unchanged. Document "confirmed extant range" in `docs/CLUE_MATCH.md` and `docs/CONTENT_SOURCES.md`, and note Astra's objection in Summary.
- **MUST-FIX 4 (Goliath frog diet evidence + full/short/guide diet wording alignment):** **Accepted** — omit `traits.diet` from `11-goliath-frog.json` (unrecorded per `profiles.ts:44`, since ADW lists invertebrates and vertebrates with no proportions and cannot establish `insects` vs `meat`), and align `QUESTION_TEXT`, `SHORT_TEXT`, and `DIET_TEXT` to express `(not mostly bugs)` / `small invertebrates` consistently.
- **MUST-FIX 5 (Indonesian island boundary excluding Tanimbar/Maluku):** **Accepted** — same verified Lydekker's Line predicate as Fable MISSED 1; fixes both `RANGES_SQL` and the globe's `clue_match_places` outline.
- **SHOULD-CONSIDER 1 (keep sourced `notPresent` exclusions across `HAVING >= 2` shifts):** **Accepted** — resolves Fable MISSED 2 cleanly by validating `notPresent` codes against `/^[A-Z]{3}$/` + `regionOfCountry` instead of `range.countries`.
- **SHOULD-CONSIDER 2 (independent `/places` and `/pool` HTTP cache windows):** **Accepted** — documented cache headers (`places` 5 min / 60 min SWR; `pool` 1 min / 10 min SWR) and brief browser-side mismatch window in rollout/handoff notes, mitigated by `roundStillFits`'s new continent check.
- **SHOULD-CONSIDER 3 (count both `birth:eggs` and `birth:live` in `--deals`):** **Accepted** — `--deals` prints separate `birth:eggs` and `birth:live` counts; keep 1-per-category-per-split (KISS) and note `birth:live = 0` transparently in the report and Summary.

## Steps

## Verification

## Code review (Astra)

## Code review (Fable)

## Release

## Decisions

- (lead) Goal 1 diet wording = Option 1A′: keep "only" for plants/meat and "mostly" for insects (4-step partition order); 12 value edits + 3 source/note cleanups; keep Tasmanian devil (48), African wild dog (65), and Goliath frog (11) as `meat`. Avoids breaking existing `mixed` profiles (Chimpanzee, Pig-nosed Turtle) and preserves single-sign deduction.
- (lead) Goal 2 bin edges = Option 2B with weight-only size column labels (`<100 g`, `0.1–2 kg`, `>2–30 kg`, `>30–300 kg`, `>300 kg`) + soft-hyphenated `South\u00adern Africa`: headless Chrome measured named Medium/Large headers clipping at 54–56 px (while gem faces already show XS/S/M/L/XL); 0 profile moves; fix young/lifespan/activity labels and enforce in E2E.
- (lead) Goal 3 regions & presence = Option 3B (`IDP` centroid `> 130°E` in both SQL copies + `regions.ts`) + Option 3P-A (`presence IN (1, 2)` in `RANGES_SQL` and both views) + Option 3P-C (`redList.notPresent` filtered via shared `presentCountries(profile)` in both `profiles.ts` and `questionMatchContent.ts`). Lead will update `phaser_june_dev` views/ranges/rows (guarded) for E2E verification; live DB untouched. Owner handoff runs read-only `content -- ranges` before view SQL and `content -- build` (shrinks globe/rounds mismatch window to ~1 min and verifies map parity first).
- (lead) Goal 4 dealer = Option 4C (two-stage `questionGroups` + `dealClues` region cap & category diversity, preserving `fullTable`), `ANIMAL_RULES.version = '055-1'`, `--deals` flag in `balance-044.ts`, with pre-set numeric targets (birth ≥ 5, life ≥ 35, region ≤ 75, >1 region forced-only, 4-cat ≥ 60, worst < 20 ms).
- (lead) Revision rulings (2026-11-20): accepted 17 of 18 Fable/Astra items (zero-downtime `*_new` view swap; Lydekker's Line IDN split `>133.2°E` or `>130°E & lat>-3.5°`; Goliath frog diet unrecorded + aligned `SHORT_TEXT`/`DIET_TEXT`; `EvidenceGrid.tsx:414` hidden-cell `aria-label` via `order.short`; `roundStillFits` continent check; `notPresent` validated via `regionOfCountry` independent of `HAVING >= 2`; measure `dealClues` without branch-and-bound first; E2E globe-vs-rounds assertion + SQL drift test + separate `birth:eggs`/`birth:live` counts). Rejected Astra MUST-FIX #3 (`presence uncertain` region answers): brief explicitly requires dropping IUCN `presence uncertain` countries (aardvark SDN, Sunda pangolin CHN) as part of confirmed extant range; adding uncertain-region skip tags across `deduction.ts` violates KISS and leaves threshold-omitted borders unchanged.

## Log

- 2026-11-20 07:10 UTC: Baseline done (lead). typecheck/lint PASS, unit tests 76/76 PASS, content preview/check PASS (76 playable, 2478 clues, 491 facts, 0 errors/warnings), E2E against `phaser_june_dev` 1588/1588 PASS (`e2e-baseline/`), balance bot baseline recorded across 5 places (`balance-before.txt`).
- 2026-11-20 08:06 UTC: Architecture done (`architect` pass 1 → lead Decision → `architect` pass 2). Chosen design: 1A′ diet, 2B size/label edges (weight-only 54 px headers), 3B `IDP` (>130°E) + 3P-A (`presence IN (1,2)`) + 3P-C (`redList.notPresent`), 4C two-stage dealer (`055-1`). Plan-only edit; no code or DB writes.
- 2026-11-20 08:13 UTC: Fable review done (`architecture-reviewer`, Fable 5.2 · high). VERDICT: APPROVE_WITH_CHANGES (1 MUST-FIX: swap live materialized views without a ~1 min lock stall; 4 MISSED: Tanimbar/Yamdena >130°E misfiling, `HAVING >= 2` vs `notPresent` recovery message, `EvidenceGrid.tsx:414` hidden-cell aria-label, branch-and-bound discrepancy; 5 SHOULD-CONSIDER). Plan-only edit; no code or DB writes.
- 2026-11-20 08:18 UTC: Astra review done (Codex GPT-6.2-Astra · xhigh). VERDICT: APPROVE_WITH_CHANGES (5 MUST-FIX: zero-downtime materialized view swap, continent pool check in `roundStillFits`, uncertain region presence vs scored No, Goliath frog diet evidence + text consistency, Indonesian island boundary excluding Tanimbar/Maluku; 3 SHOULD-CONSIDER). Plan-only edit; no code or DB writes.
- 2026-11-20 08:26 UTC: Revision done (lead). Ruled on all 18 Fable/Astra items under Revision notes (17 accepted, 1 rejected: Astra MUST-FIX #3 on `presence uncertain` region answers per brief & KISS); verified all 97 eastern Natural Earth IDN polygons + 10 IDN species ranges on `phaser_june_dev` for exact Lydekker's Line predicate; revised Architecture, Compatibility, Decision, and Decisions in place. Plan-only edit; no code or DB writes.

## Summary
