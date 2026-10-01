# Implementation Plans

Plans 006–039 covered the expedition game and were deleted with it on 2026-09-24. They are in git history (`git log --all -- plans/`). New plans continue at 040.

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|---|---|---|---|---|---|
| 040 | More animals per place (+ habitat legend) | High | M per animal | IUCN shapefiles (`~/data/iucn/shp`) | Batches 1 and 2 done (76 animals); legend blocked |
| 041 | Make Critter Connect tactical (charges, questions, toys, family tree, field notes) | High | L | IUCN countries of occurrence (owner download); plan 042 for more continents | Built 2026-09-28: charges loop with toys and 12 look-alikes (rules 041-5, part 13); one-question-a-move versions tried and removed (parts 8–12); not committed or deployed. Later: a family tree challenge side mode (041, Later) |
| 043 | Literal gems, 7×7 board, obstacles (variant on branch `variant/043-literal-gems`) | High | L | 041 built; owner picks family tree + icon source | Part 0 built 2026-09-30 (rules 043-0: gem legend, 2 charges a question, 7×7, 5 moves, new gem art); Part 1 next; `main` keeps 041-5 |
| 044 | The animal board: 5 suspects on the board, clue orders, mark and release the look-alikes, trail with hearts | High | L | 043 art and board (branch `variant/043-literal-gems`) | Planned 2026-09-30; revised after Codex and Fable reviews and owner decisions (5 suspects, mark to release, witness notes, long rounds with clue orders, no net); Part 1 built 2026-09-30 on `variant/044-animal-board` (careful 95-97%, guesser 20%, random 0%; reader gap 15-27 points); Part 2 graybox built 2026-10-01 (`/explore` on the branch; e2e 427/427); owner playtest next |

## Dependency notes
