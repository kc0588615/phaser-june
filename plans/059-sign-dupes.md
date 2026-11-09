# 059: One sign per fact

Mission `sign-dupes` (state: `plans/2026-11-09-sign-dupes.md`). Follows 058 (`plans/058-signs-beside-photo.md`): the owner saw the chimpanzee's box beside the photo show *carries young on back* and *mother carries young* side by side.

## What changed
- Content only: 12 notes in 11 files drop a broader tag that their narrower tag on the same note already says. No note text, trait, `SIGNS` entry or code changes.

| Kept (narrower) | Dropped there (broader) | Notes on | Broader's holders after | The notes say |
|---|---|---|---|---|
| `carries_young_on_back` (Life) | `mother_carries_young` | 52 56 61 63 | 10 24 54 59 | the baby rides on her back (61: belly, then back; 63: back or tail) |
| `backward_pouch` (Life) | `pouch` | 31 37 48 | 27 43 67 | the pouch opens backward |
| `shoulder_stripe` (Body) | `stripes` | 52 | 25 29 39 43 | one stripe across the shoulders |
| `spectacles` (Body) | `face_markings` | 68 71 | 33 38 42 50 | markings around the eyes like glasses |
| `spiral_horns` (Body) | `horns` | 50 | 29 38 44 66 68 | horns twist in spirals |
| `s_shaped_horns` (Body) | `horns` | 69 | (same) | horns shaped like an S |

- Counts: open tags 201 → 201; tag uses 518 → 506; `SIGNS` 216 entries, 15 retired, both unchanged; cross-animal merges 0; 6 pairs deduped on 12 notes in 11 files. Pairs compared 95 = 6 deduped + 80 that differ in meaning + 9 for the owner. Each pair is in one category, so no category choice arose.
- Chimpanzee: 9 signs → 8. It still pages at 390 px (Body 1 line + Habits 4 + Life 1 = 6 lines in 058's 5-line box); page 2 is now "carries young on back" alone. That is 058's layout, not a leftover duplicate.
- Research record: `docs/research/2026-11-07-moves-and-signs/sign-dupes.csv` (every `SIGNS` tag: phrase, holders before, verdict, reason) and `sign-map.csv` (recomputed: the 5 broader rows' uses/holders, `059:` marks on all 11 rows).
- Docs: `CONTENT_SOURCES.md` sign rule, "One sign per fact".

## Why narrower over broader, not a merge
One tag set drives both the signs and witness fits: a suspect fits a note when its guide holds every tag of the note (`witnessNotes`). The first draft merged each narrower tag into the broader one; a witness-pair diff over the 76 animals showed that adds 50 (note, animal) pairs, at most 4 true (the wombat's "Its pouch opens backward" would fit the tree-kangaroo, whose pouch opens forward; the addax's spiral horns would fit the okapi, saola, rhinos, hirola and dama gazelle). Astra's architecture review flagged it (MUST-FIX). Dropping the broader tag from the note that also holds the narrower one only removes pairs: the narrow notes fit exactly as before.

`shell_spines` (2) ~ `spiky_shell` (12), the one cross-animal merge in the draft, fails the same test: 12's note ("Its other name is the sunburst turtle, for the spikes around the edge of its shell") would fit 2, whose small spines are only on its front edge. Kept both (owner pair 7).

## For the owner
Pairs a player might read as one fact, kept both (brief: when in doubt, keep both). Merging any of them needs a judgment on degree or vocabulary, or note words:
1. `roosts_in_trees` (45) ~ `sleeps_high_in_trees` (23 35). A bat roosts where it sleeps by day; merging needs sleep words in 45's note. Would link 45 and 23 in Africa.
2. `walks_upright` (63) ~ `stands_on_hind_legs` (24 36 52 57 61 69). 63 walks on its back legs as 24 runs on them, but 36 52 57 69 only rear up.
3. `never_climbs` (55) ~ `forest_floor` (9 46 76). 55 "never climbs" is close to 76's "hardly ever climbs", but 9 and 46 say nothing about climbing.
4. `climber` ~ `often_in_trees` (71's one note) ~ `seldom_on_ground` (40 54; 40's note also holds `climber`): 3 pairs, each ability vs time spent, or degree.
5. `dung_piles` ~ `scent_marks` (66's one note). Dung marking is scent marking (72 73's droppings are tagged `scent_marks`), but a player may not read dung as scent.
6. `leaf_litter` ~ `forest_floor` (46's one note; 76 holds both). Same ground, but one is a Habitat sign, the other a Habits sign (stays down); 3 and 12 hold only `leaf_litter`.
7. `shell_spines` (2) ~ `spiky_shell` (12) (above).

Also for the owner, all out of scope (retags or new tags):
- 4 true or close links the dedupe drops (below): 24 59 63 all carry young on the tail (a shared tail-carrying tag would keep the link); 54 61 on the belly; 68 69 ringed horns.
- Notes with a broad tag and narrower words already fit animals their words aren't true of, before and after: 66's "two horns, one behind the other" fits the okapi and saola; 10's back pockets fit 24 54 59; 43's forward pouch fits the echidnas.
- 055's 15 retired tags aren't marked in `SIGNS`, so a later note can reuse one (`coastal_dunes` beside `sand_dunes`) and pass `checkProfile`. A `retired` field plus a `signProblems` check would catch it.
- Seen, not done: 5's note also says "over a pool" (`eggs_over_water`); 4's and 75's notes also say fast (`fast_streams`); 38's face-gland note is tagged `scent_marks`; 19 spreads seeds by eating fruit (no `fruit_eater`).

## Removed witness pairs
`witness-pairs.ts` over 76 animals: 1473 → 1430 pairs, 0 added, 43 removed; 4 true or close, 39 false. Each is a broad-only note that stopped fitting an animal now holding only the narrower tag:
- 10 Suriname Toad, "eggs sink into pockets in the mother's back …" (`mother_carries_young`): 52 56 61 63 false.
- 24 Sunda Pangolin, "A baby rides around on the base of its mother's tail": 52 56 61 false; **63 true** (tail).
- 25 Tiger, stripes like fingerprints: 52 false.
- 27 W. Long-beaked Echidna, egg hatches in a pouch: 31 37 48 false.
- 29 Okapi, striped legs: 52 false. Two short skin-covered horns: 50 69 false.
- 38 Saola, long straight horns: 50 69 false. White face patches: 68 false.
- 42 Vancouver Island Marmot, white face patches: 68 71 false.
- 43 Goodfellow's Tree-kangaroo, two golden back stripes: 52 false. Pouch opens forward: 31 37 48 false.
- 44 Javan Rhinoceros, single short horn: 50 69 false.
- 50 Addax, dark forehead tuft and white face markings: 68 71 false.
- 54 Brown-throated Sloth, baby clings to her belly: 52 56 63 false; **61 true** (belly).
- 59 Indian Pangolin, baby on her tail: 52 56 61 false; **63 true** (tail).
- 66 Black Rhinoceros, two horns one behind the other: 50 69 false.
- 67 E. Long-beaked Echidna, baby in the pouch 6-7 weeks: 31 37 48 false.
- 68 Hirola, ringed lyre horns: 50 false; **69 close** (ringed horns, lyre vs S).

Full texts: `/srv/critter-ai/agent-state/missions/sign-dupes/metrics/pairs-removed.md`.

## Balance
Witness notes (`witness.ts`, all deals per place; before = `5c37fc04`, after = content edits; tools read `db/content` only):

| Place | Rounds | Notes/round before | after | 0-note rounds before | after |
|---|---|---|---|---|---|
| world | 380 | 2.24 | 2.23 | 61 | 61 |
| africa | 130 | 2.12 | 2.04 | 19 | 19 |
| asia | 100 | 1.84 | 1.84 | 42 | 42 |
| north-america | 65 | 1 | 0.98 | 16 | 17 |
| south-america | 70 | 2.01 | 1.94 | 5 | 10 |

Tagged notes 433 → 433; shareable 307 → 307. Slightly fewer notes, not more as the brief guessed: nothing merged, and the 43 removed pairs were mostly false fits.

Bot (`scripts/balance-044.ts --rounds 400 --seed 44 --places africa,asia,north-america,south-america`): found Δ −1…0 points on every row, moves left at find Δ −0.5…+0.1 (South America −0.4/−0.5 on all players, matching its fewer witness notes). All within noise; no rule change. Tables: `…/sign-dupes/metrics/bot-tables.md`.

## No version bump
`ANIMAL_RULES.version` stays `055-0` (as 057). No edit touches a prefixed trait or a `travelOf` tag (`burrower`, `swimmer`, `fully_aquatic`, `glider`), so every deal, deck, answer, travel and score is the same for the same seed. Only witness notes change, and only when the production content build lands, not at deploy, so a code bump would label old-content rounds as new. `roundStillFits` already re-deals a save whose notes changed.

## DB
No schema change. Prod needs `npm run content -- build` (handoff H12), after a fresh production dump. Counts unchanged: 76 playable, 2478 clues (2086 deductive), 491 facts. Code and `SIGNS` are unchanged, so building before or after the deploy is safe. Spot check `/srv/critter-ai/agent-state/missions/sign-dupes/tools/spot.sql` (clues holding both tags of a pair): 12 before the build, 0 after.

## Verification
Static: typecheck, lint, `npm test` 66/66; `content -- preview` 0 PROBLEMs, diff vs before = the 12 clue tag lists minus their broader tag; `dedupe-check.py` 0 notes with both, 12 notes in 11 files changed (tags only), open tags 201, uses 506; `sign-map-update.ts` 216 rows, idempotent, categories match `SIGNS`.
E2E (dev copy `phaser_june_dev`): `content -- build` 0 citation warnings; `content -- check` `Pool: 76 playable of 76 species, 2478 clues (2086 deductive), 491 facts.`, 0 errors, 0 warnings; spot check 12 → 0; `e2e:fresh` seed 7 Africa 1575 checks (baseline 1575), 0 failed, 0 console errors, 0 failed requests; rounds as baseline (Hairy Frog found, Hirola lost, Golden-rumped Sengi found, African Forest Elephant found); 390 px paging found the chimpanzee. Artifact `/srv/critter-ai/agent-state/missions/sign-dupes/e2e-s5/report.json`.

Shots (390×844 light, round 2 chimpanzee), `/srv/critter-ai/agent-state/missions/sign-dupes/`: `chimp-before-p{1,2}.png` (page 2: both carry signs), `chimp-after-p{1,2}.png` (page 2: "carries young on back" alone).
