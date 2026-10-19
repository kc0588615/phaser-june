# 048: The lineup (swipe the field guide; order that means something)

On `main`, over 044–047. Written 2026-10-18. Not started; owner go needed before step 2.

## Problem

The field guide (`SuspectSheet` in `src/components/animalBoard/AnimalSheets.tsx`) flips between the 5 animals with arrows beside the name, or a swipe on the 144px photo only. The swipe is a trigger (fires on pointer up), not a drag, and nothing shows that it exists. The dots under the name show position but can't be tapped.

The order itself means nothing: `round.suspects` is sorted ids (`animalBoard.ts`, deal), so 1–5 is a label, not information. A lineup ordered by a real fact (whose range is biggest, who lives farthest north) could become a new way to deduce.

## Rules

1. **Number = identity.** The card number (board tag, grid, pencil keys, saves) never changes. Only the order of the lineup strip and of the swipes changes. A strip reading `3 1 5 2 4` shows the order is meaningful.
2. **Sort only by public facts.** Facts the field guide already shows, never a round question's answers. Grouping by yes/no would mark who still fits (point, don't conclude).
3. **Rank notes are witness notes.** Same rule as `witnessNotes`: a note must fit 2 or more suspects, not all. So: "Its range is bigger than animal 3's", never "It has the biggest range" (fits one).
4. **The board doesn't move.** Sorting reorders the sheet only; pinned cards stay put.

## Sort keys (data we already have)

- **Range size:** `clue_match_ranges.area_km2` (today fetched per animal by `/api/clue-game/range`).
- **How far north:** `clue_match_ranges.lat` (point on the main range part).
- **Board:** today's order (1–5), the default.

Not yet: Red List status (most animals LC, ties everywhere), family (groups, not a rank), body size/weight/lifespan (prose only in profiles; needs a sourced numeric field, see Later).

## Steps

0. **Swipe the top of the sheet (UI only, no rules change).** Swipe area = header + photo/Signs row; not the answers list (vertical scroll, pencil buttons). Content follows the finger (`motion` `drag="x"`, elastic, axis lock after ~10px, `touch-pan-y`); flip on release past ~25% of the width or a flick over ~400 px/s, else spring back. Neighbour photos peek 12–16px at both sides. Dots become 5 number tiles you can tap to jump. Arrows stay beside the title (44px) and show the neighbour's number (`‹ 2`, `4 ›`); ←/→ flip while the sheet is open. One-time nudge on the first open (content slides ~16px and back, on-device flag, try/catch). Reduced motion: no drag-follow animation, instant flip. E2E: a drag past the threshold flips, a short drag and a vertical scroll don't, a pencil tap never flips, tile tap jumps.
1. **Lineup sort.** Pool (`src/lib/cluePool.ts`) carries `areaKm2` and `lat` per species, so sorting needs no extra fetches. A "Line up by: board · range size · north" control in the sheet; the strip and swipes follow it; each tile shows its fact in kid words (a bar for range size, "farther north" arrow), never raw km². Choice kept per round. Pure helper `lineupOf(suspects, key, pool)` in `src/clueGame/`, ties by number.
2. **Rank notes, pure, behind a flag.** `AnimalRules.rankNotes` (off in 047-0). `witnessNotes` also offers comparisons to a named other suspect ("bigger range than animal 3's", "lives farther north than animal 2"), kept only when 2 ≤ fits < 5 and the referent isn't the mystery. Skip pairs whose values are within ~10% (too close to call fairly). Notes sources: IUCN range data (tier already in `sources.json`).
3. **Bot.** `scripts/balance-044.ts` with `--rank on` against 047-0, same deals and seeds. Report win rate for each player type, Reader/Careful gap, guesser, how often a rank note shows a round, and moves from identified to found. Careful reads rank notes like any note. Owner go/no-go.
4. **Wiring and view.** A rank note offers its sort ("Line up by range size") in the notes sheet and the field guide; tapping it switches the lineup. Saves keep the sort key. E2E: rank note fits 2–4 suspects, lineup order matches pool facts, sort survives reload, same seed = same run; report + screenshots. Then a playtest: do players find the swipe without being told, and do they use the lineup to read a rank note?
5. **Docs.** `ANIMAL_BOARD_PAPER.md` (notes section and bot table), `CLUE_MATCH.md`, "Lineup" and "Rank note" in `CONTEXT.md`, how-to copy.

## Open (owner)

- **Free sort or unlocked by a note?** Default: free control (simpler, teaches the facts). Alternative: the sort appears only once a rank note does (tighter link, less clutter).
- **Does sorting give too much away?** Sorting by range size while holding "bigger range than animal 3's" lets the player read the answer off the strip. That's the player's reasoning, not the UI concluding, but it makes rank notes easy. Default: accept; bot and playtest decide.
- **Peek vs. space.** Peek costs ~30px of photo width on small phones. Default: peek; drop it if the playtest finds the swipe without it.

## Later

- **Body size.** A sourced numeric `size` field in profiles (mass, length; `npm run content -- check` validates), then "bigger than animal 3" notes. Content work for 76 animals.
