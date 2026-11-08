# 055: Lives in trees, signs inside the field guide, Farms & towns not asked

Owner, 2026-11-07: a movement question, signs that teach deduction openly, one mark per question category. Design: `docs/research/2026-11-07-moves-and-signs.md` (§2, §4, §5); brief: `plans/2026-11-07-moves-and-signs-build-brief.md` (brief A) as overridden by the owner's picks; mission plan (full architecture, reviews, log): `plans/2026-11-08-moves-and-signs-build.md`.

## Owner picks used
- Movement clue C, **Lives in trees**, in Habits (pencil weight 3). Only `trees:yes` is asked; `trees:no` records the answer. Swims dropped. `travelOf` unchanged.
- **Farms & towns removed** from content (no `artificial` habitats left); its constants stay until brief B (`ft-cleanup`), after the owner's production content build.
- **No leak rules**: no sign or witness note is ever hidden for a dealt question. Plan 045's hiding of the guide's own lines for the 4 dealt questions stays.
- **Restating signs reworded into evidence**, from each note's own words; **misleading signs fixed** (retagged to what the note says).
- **Signs inside the field guide** under their category (options 1 + 2 merged), one mark per category on guide headings, "Its answers" rows, question tiles and witness notes.
- Website shots: later.

## What changed
- **Rules** (`055-0`, drops saved games): `trees` exclusive yes/no trait (`traits.ts`, `neverAsked`), Habits, "Does it live in trees?" / "Lives in trees?" / column "Lives in trees", guide lines "It lives in trees." / "It doesn't live in trees.", face 🌲. `fullTable` and `questionsFor` skip `:no` values. A saved round resumes only if its clue rows and then its witness notes still match the content (`roundStillFits`, Astra's MUST-FIX), so a round saved on old rows can't resume with a note no sheet shows.
- **Signs** (`src/clueGame/signs.ts`, new): `SIGNS`, the authoritative vocabulary (216 tags, each with one category and what its plain reading `implies`/`denies`/`restates`); `signsOf` (moved from `clueFaces.ts`) builds `Animal.signs` at load and throws on an unknown tag; `noteCategories` for witness notes; `signProblems`, run by `checkProfile` (unknown tag, sign contradicting its holder's traits, sign restating an asked answer). Retired tags stay in `SIGNS` so new code loads the old prod rows until the content build.
- **Field guide** (`AnimalSheets.tsx`): each category row holds its lines then its signs, shown when it has either; the sign chips and their paging beside the photo are gone. `CategoryMark.tsx` (new): Body `Eye`, Habits `PawPrint`, Habitat `Mountain`, Range `MapPin`, Life cycle `Baby`, word printed or read out, no new colour. `categoryOf(tag)` in `questionMatch.ts`. Grid tiles carry the mark (`aria-label` "Category: question").
- **Content** (all 76): `trees` on 71 (10 yes: 5, 6, 23, 30, 34, 35, 40, 43, 54, 61; 61 no; no record: 13, 24, 45, 56, 71), notes in `docs/research/2026-11-07-moves-and-signs/trees-notes.csv`; `artificial` off the 20 holders; 54 note-tag edits (`tag-edits.csv`, table below); `sign-map.csv` recomputed (216 rows = `SIGNS`).
- **Docs**: `CONTENT_SOURCES.md` (trees rule, yes/no evidence rule, artificial skipped, sign rule), `CLUE_MATCH.md`, `CONTEXT.md` (Category mark), `DATABASE_ACCESS.md` (dev-copy settings), `AGENTS.md`.

## Decisions
- **Moved since the briefs** (architecture finding 13): `profiles.ts:93`/`:139-145` → `:95`/`:141-147`; `isHandWrittenClue` `:292-297`, reserved check `:338`; `AnimalSheets.tsx` `asked` `:87`; `e2e.mjs` grid column check `:755`; the design's deal/bot baselines were stale (fact-sources changed amphibian traits), so both were measured again on `447e9317`; the design's probe and runner were copied and adapted, not run in place.
- **Files outside the brief's list**: `useAnimalSession.ts` (resume check), `questionMatchContent.ts` (`Animal.signs`), `deduction.ts` (`tagOutcome` exported for `signProblems`).
- **`travelOf` now walks 8 animals**: fixing `fully_aquatic` (10, 17) and `swimmer` on land animals (25, 28, 30, 44, 51, 54) turns them from swimmers (step off the bottom) into walkers (off a side). Function unchanged (owner); more truthful.
- **Paraphrase rule**: a new tag uses only words its note holds; if none fits, the tag is dropped (list below). `builds_nests` → `sleeping_nests` (birth-neutral, still shared). Swim words on land animals dropped, not reworded (Swims isn't asked and any swim/river word reads as fresh water).
- **Found by `signProblems`**: 62 `forest_streams` (no forest habitat) beyond the design's list; dropped.
- **Step order**: the architecture's 8 steps became 12 (sign table, guide, marks and content split; dev content build and seed probe before the audit and docs, since the audit needs a trees-dealt sheet).
- **Audit** (`graphical-audit`): Habitat's mark `Trees` → `Mountain` (the 🌲 Habits tile pointed at a tree-marked Habitat heading); column label "Lives in trees" kept (two lines fit at 320/390 px); one shared caption class. Photo stays `w-36` with nothing beside it.
- **Inseparable pair guard** (`animalBoard.test.ts`): Saola + Sumatran Orangutan are split by `trees`; the guard moved to North America's two sloths (30, 54), the only pair left.
- Out of scope, noted: 20's note says "dry savanna" (no savanna habitat); 54's town note says it "lives in trees" (tag `town_dweller`); trait notes that leak other answers (01's young note states eggs).

## Signs: old → new, per animal
From `docs/research/2026-11-07-moves-and-signs/tag-edits.csv` (one row per changed note; the CSV has each note and reason).

| # | Animal | Old tags | New tags | Kind |
|---|---|---|---|---|
| 1 | Blanding's Turtle | `yellow_scales` | `yellow_legs` | misleading |
| 2 | Spiny Softshell Turtle | `winter_rest` | `winter_rest` `buries_itself` `rests_on_bottom` | note-tag |
| 4 | Big-headed Turtle | `climber` | (none) | retag |
| 5 | Wallace's Flying Frog | `tree_dweller` | `climber` | restating |
| 6 | Red-eyed Tree Frog | `tree_dweller` | (none) | restating |
| 7 | Hairy Frog | `hair_like_frills` | `side_frills` | misleading |
| 8 | Coastal Tailed Frog | `internal_fertilization` | (none) | misleading |
| 10 | Suriname Toad | `fully_aquatic` | `rests_on_bottom` | misleading |
| 10 | Suriname Toad | `mother_carries_young` `no_tadpoles` | `mother_carries_young` | misleading |
| 11 | Goliath Frog | `giant_frog` | (none) | misleading |
| 11 | Goliath Frog | `rock_basker` | `rests_by_waterfalls` | misleading |
| 12 | Spiny Hill Turtle | `leaf_litter` `camouflage` | `leaf_litter` `camouflage` `buries_itself` | note-tag |
| 14 | Desert Rain Frog | `coastal_dunes` | `sand_dunes` | misleading |
| 15 | Pancake Tortoise | `climber` | `climbs_boulders` | retag |
| 17 | Pig-nosed Turtle | `fully_aquatic` | (none) | misleading |
| 20 | African Spurred Tortoise | `seasonal_streams` | (none) | misleading |
| 23 | Aye-aye | `builds_nests` `tree_dweller` | `sleeping_nests` `sleeps_high_in_trees` | misleading+restating |
| 25 | Tiger | `swimmer` | (none) | misleading |
| 28 | Asian Elephant | `swimmer` `snorkel_nose` | `trunk` | misleading |
| 30 | Pygmy Three-toed Sloth | `tree_dweller` `slow_mover` | `slow_mover` | restating |
| 30 | Pygmy Three-toed Sloth | `swimmer` | `slow_mover` | misleading |
| 31 | Northern Hairy-nosed Wombat | `grazer` | `grazer` `burrower` | note-tag |
| 31 | Northern Hairy-nosed Wombat | (none) | `burrower` | note-tag |
| 32 | De Winton's Golden Mole | `burrower` `sand_swimmer` | `burrower` | misleading |
| 32 | De Winton's Golden Mole | `coastal_dunes` | (none) | misleading |
| 33 | Ethiopian Wolf | `nectar_drinker` | (none) | misleading |
| 33 | Ethiopian Wolf | `high_mountains` | `high_mountains` `above_tree_line` | note-tag |
| 35 | Red Panda | `tree_dweller` `climber` | `sleeps_high_in_trees` `climber` | restating |
| 37 | Greater Bilby | `pouch` `backward_pouch` | `pouch` `backward_pouch` `burrower` | note-tag |
| 40 | Sumatran Orangutan | `builds_nests` | `sleeping_nests` `climber` | misleading+note-tag |
| 40 | Sumatran Orangutan | `tree_dweller` `climber` | `climber` `seldom_on_ground` | restating |
| 42 | Vancouver Island Marmot | (none) | `burrower` | note-tag |
| 43 | Goodfellow's Tree-kangaroo | `long_tail` | `long_tail` `climber` | note-tag |
| 43 | Goodfellow's Tree-kangaroo | `tree_dweller` `climber` | `climber` | restating |
| 44 | Javan Rhinoceros | `swimmer` | (none) | misleading |
| 45 | Livingstone's Flying Fox | `tree_dweller` | `roosts_in_trees` | retag |
| 46 | Golden-rumped Sengi | `builds_nests` | `sleeping_nests` `forest_floor` | misleading+note-tag |
| 46 | Golden-rumped Sengi | `leaf_litter` | `leaf_litter` `forest_floor` | note-tag |
| 51 | Jaguar | `swimmer` | (none) | misleading |
| 51 | Jaguar | `climber` | (none) | misleading |
| 53 | Lowland Tapir | `mane` | `neck_hump` | misleading |
| 54 | Brown-throated Sloth | `tree_dweller` `slow_mover` | `slow_mover` | restating |
| 54 | Brown-throated Sloth | `swimmer` | `seldom_on_ground` | misleading |
| 55 | Giant Pangolin | (none) | `never_climbs` | note-tag |
| 56 | Chimpanzee | `builds_nests` | `sleeping_nests` `climber` | misleading+note-tag |
| 57 | Aardvark | `stands_on_hind_legs` | `stands_on_hind_legs` `burrower` | note-tag |
| 58 | Cheetah | `coalitions` | (none) | misleading |
| 59 | Indian Pangolin | `long_tail` `climber` | `long_tail` | retag |
| 60 | Giant Panda | `climber` | `feeds_on_ground` | misleading |
| 61 | Indri | `tree_dweller` `big_leaper` | `big_leaper` | restating |
| 62 | Chinese Giant Salamander | `cold_streams` `forest_streams` | `cold_streams` | misleading |
| 71 | Andean Bear | `climber` `tree_dweller` | `climber` `often_in_trees` | retag |
| 71 | Andean Bear | `builds_nests` | `sleeping_nests` `climber` | misleading+note-tag |
| 75 | Hellbender | `crevice_hider` `territorial` | `territorial` | misleading |

Dropped with no evidence tag to replace them (22): 4 `climber`, 6 `tree_dweller`, 8 `internal_fertilization`, 10 `no_tadpoles`, 11 `giant_frog`, 17 `fully_aquatic`, 20 `seasonal_streams`, 25 `swimmer`, 30 `tree_dweller`, 32 `sand_swimmer`, 32 `coastal_dunes`, 33 `nectar_drinker`, 43 `tree_dweller`, 44 `swimmer`, 51 `swimmer`, 51 `climber`, 54 `tree_dweller`, 58 `coalitions`, 59 `climber`, 61 `tree_dweller`, 62 `forest_streams`, 75 `crevice_hider`.

New shared tags: `sleeping_nests` (23, 40, 46, 56, 71), `sleeps_high_in_trees` (23, 35), `seldom_on_ground` (40, 54), `rests_on_bottom` (2, 10). `tree_dweller` has no holder left (11 → 0).

## Balance and witness notes
Before = `origin/main` 447e9317 (054-1), after = this branch (055-0). Tools and raw output: mission state `metrics/` (`summary.md`, `bot-tables.md`).

Witness notes a round (a seed's suspect set × each suspect as mystery):

| Place | before | after | design no-ft | design move-c |
|---|---|---|---|---|
| world | 2.34 (63 of 370 rounds with none) | 2.24 (61 of 380) | 2.25 | 2.28 |
| Africa | 1.95 (23 of 130) | 2.12 (19 of 130) | 1.86 | 2.02 |
| Asia | 2.13 (39 of 100) | 1.84 (42 of 100) | 2.13 | 2.02 |
| North America | 1.78 (4 of 65) | 1.00 (16 of 65) | 1.11 | 1.09 |
| South America | 2.24 (7 of 70) | 2.01 (5 of 70) | 2.01 | 2.00 |

Bot (`scripts/balance-044.ts`, 400 rounds a place, seed 44), after (Δ vs before): found / moves left at the find.

| Place | careful | novice | expert | reader |
|---|---|---|---|---|
| Africa | 98% (−1) / 16.8 (−0.2) | 98% (+1) / 16.5 (−0.1) | 100% / 18.0 (−0.2) | 94% (−1) / 12.2 (+0.1) |
| Asia | 96% (−1) / 13.8 (−0.5) | 94% (−1) / 13.6 (+0.2) | 100% / 15.4 (−0.3) | 89% (−1) / 8.9 (−0.7) |
| North America | 97% (−1) / 15.9 (−1.6) | 97% (−2) / 15.9 (−1.3) | 100% / 17.0 (−1.6) | 95% (+0) / 11.1 (−1.6) |
| South America | 97% (−1) / 17.2 (−0.2) | 99% (+1) / 16.6 (−0.4) | 100% / 18.1 (−0.4) | 94% (−1) / 11.9 (−0.8) |

**How much easier: not easier.** Find rates move ±2 pts or less (noise); moves left drop slightly, most in North America (−1.6, tracking its witness notes: Farms & towns gone plus the sloths' sign edits). The design's move-c measured −3.9 there because of leak rule 2, not built. The bot reads no signs; and on 054-1 every sign already showed (paged beside the photo), so nothing visible became hidden or the reverse. Retiring `tree_dweller` removes the one sign that gave a dealt answer outright. No rule changes.

## Proof the trees question is dealt
Seed **1**, place **`continent:asia`**: round 1 deals size:huge, trees:yes, region:east-asia, region:southeast-asia. Found by the mission's probe over Asia and South America seeds 1–30 (trees:yes in many Asia seeds). Commands (dev copy only, in the guarded subshell that exports `/srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy` and checks `current_database()` = `phaser_june_dev`):
```
npm run content -- build && npm run content -- check
E2E_SEED=1 E2E_PLACE=continent:asia CHROME_PATH=<no-sandbox wrapper> npm run e2e:fresh
```
E2E checks added: E1 signs under their category row, none beside the photo, none hidden; E2 a dealt question's guide lines hidden while its category's signs show; E3 tile ↔ answer row ↔ heading carry the same icon; E4 witness-note marks; E5 no `:no` column; E6 a round saved on old content isn't resumed.

Shots (390 px, during play, light and dark), mission state `/srv/critter-ai/agent-state/missions/moves-and-signs-build/shots/`: `02d-field-guide-{light,dark}.png`, `02e-field-guide-rows-{light,dark}.png`.

## Rollout
Code first, content after: the deploy ships 055 code on the old prod rows (every retired tag still in `SIGNS`; a release guard checks prod's pool tags against it), then the owner runs the production content build from WSL (handoff H10). Brief B (`ft-cleanup`) deletes the Farms & towns constants after that.

## Summary
Draft; the diff stat and the final artifact are filled at Verification.
- What changed, picks, seed, bot and witness tables, sign edits: above.
- `git diff --stat origin/main...HEAD`: (at Verification)
- Final E2E artifact: `/srv/critter-ai/agent-state/missions/moves-and-signs-build/final-e2e/` (at Verification)
- Production content build waits on the owner (H10).
