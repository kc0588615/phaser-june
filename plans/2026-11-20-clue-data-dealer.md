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
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
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

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Code review (Fable)

## Release

## Decisions

## Log

- 2026-11-20 07:10 UTC: Baseline done (lead). typecheck/lint PASS, unit tests 76/76 PASS, content preview/check PASS (76 playable, 2478 clues, 491 facts, 0 errors/warnings), E2E against `phaser_june_dev` 1588/1588 PASS (`e2e-baseline/`), balance bot baseline recorded across 5 places (`balance-before.txt`).

## Summary
