# Critter Connect: the globe and the game

The app has two screens. (The game was called Clue Match until plan 041; code and tables still say `clue`, players never see the word.)

- **Globe (`/`).** A globe beside the list of continents. Pick one, or tap its dot: the globe flies there and outlines it, and a card shows how many animals live there (named once you've found them) and a habitat picture. **Explore** opens the game with that continent's animals. A continent opens once it has 12 animals; smaller ones show "coming soon". **Anywhere** plays animals from the whole world. Animals you've found glow on the globe where you found them: green for amphibians and reptiles, amber for mammals.
- **The game (`/explore`, optional `?place=continent:africa` and `?seed=N`).** A mystery animal hides among 12 look-alike animals. Match gems on a 5×5 board to earn **charges** (big matches leave **toys** that clear more), spend them on yes/no **questions** that cross animals out, and name it before your moves run out. Old `/clue-match` links redirect here with their query.

No sign-in needed; every finished round, solved or lost, is saved to `clue_match_solves` for analysis (with the player's profile id when signed in, and the continent when played from the globe). The Field Journal lives on the device; when signed in, it also pulls the player's saved solves, so it follows them to another device. `?seed=N` replays a session exactly (same mysteries, same boards).

## Where the code lives

| Part | Path |
|---|---|
| Globe | `src/pages/index.tsx` → `src/components/globe/` (GlobeScreen, Globe, PlaceList, PlaceCard); helpers `src/clueGame/places.ts`; data `GET /api/places`, `/api/places/outline` (`src/lib/places.ts`) |
| Game page | `src/pages/explore.tsx` → `src/components/clueGame/MatchGame.tsx` |
| Page state + board wiring | `src/components/clueGame/useMatchSession.ts` |
| UI pieces | `src/components/clueGame/` (TopBar, ChargeChips, AnimalTiles, SpendPanel, MatchSheets, LogEntryText, RevealSheet, RangeMap, JournalSheet, HowToPlay, GlossaryText, PhaserGame) |
| Rules (pure) | `src/clueGame/questionMatch.ts` (rounds, charges, questions, family tree, field notes, last chance, scoring), `matchSession.ts` (score and streak across rounds), `gems.ts` (gem color ↔ category) |
| Content → rules data | `src/clueGame/questionMatchContent.ts` (traits, regions, family tree names, field notes with blanks, sources), `regions.ts` (every country → UN region with kid names → continent) |
| Board | `src/game/`: `ClueBoardScene.ts` (seeded 5×5 board), `BoardModel.ts` (swaps, matches, toys, the rare note gem), `BoardView.ts` (sprites, toy effects), `toyTextures.ts` (toy looks), `sfx.ts` (sounds), `BoardController.ts` (swipe, tap, keyboard, cascade loop) |
| Data | `GET /api/clue-game/pool` (`src/lib/cluePool.ts`), `GET /api/clue-game/range?species=<id>`, `POST /api/clue-game/solves` (checked by `src/clueGame/solveReport.ts`), `GET /api/clue-game/journal` (a signed-in player's solves) |
| Content | `db/content/` (profiles + source registry, docs/CONTENT_SOURCES.md), `scripts/content.ts` (`npm run content`), `src/clueGame/profiles.ts` (profile → rows) |
| Balance | `scripts/balance-041.ts` (seeded bot on the real rules and board); prototype `src/clueGame/PROTOTYPE-041-question-match.html` (built by `scripts/prototype-041-question-match.ts`) |
| Tests | `tests/clueGame/*`, `tests/game/*`; `npm run e2e` |

## How it fits together

```mermaid
flowchart LR
  J[db/content profiles] -->|content build| C & F & S
  subgraph Postgres
    C[species_deduction_clues] --> P
    F[species_facts] --> P
    S[species] --> P
    I[iucn ranges] --> R[clue_match_ranges<br/>materialized view]
  end
  P[/api/clue-game/pool/] --> A[animalsFromPool<br/>rules data] --> H[useMatchSession<br/>session reducer]
  R --> M[/api/clue-game/range/] --> RM[RangeMap]
  B[ClueBoardScene] -- gems-matched --> H
  H -- clue-board-setup / clue-board-lock --> B
  H --> UI[chips, tiles, sheets, spend panel, reveal]
  H -- every round end --> SV[/api/clue-game/solves/]
```

The board only reports matches (`gems-matched`, one event per explode phase, with each group's color and size, and `blast` for gems a toy cleared). React owns everything else. Keyboard: the board is focusable; React forwards arrows, Shift+arrows and Esc (`clue-board-key`). Arrows move a cursor, Shift+arrows swap its gem with the neighbor that way, Esc drops a tapped gem. The board describes each step (`clue-board-announce`) in a screen-reader live region. Outside a playing round the board is locked (`clue-board-lock`).

## Rules

The design and every number's reasoning are in `plans/041-gameplay-tactics.md`; terms are in `CONTEXT.md`.

**Round.** 12 animals from the continent (or the whole world): closest relatives first (same family, then order, then class), then **look-alikes**, the animals that share the most traits with the mystery. An animal no question can tell apart from the mystery is left out, so every round can be narrowed to one. A mystery isn't repeated within 8 rounds. **4 moves.** A move swaps two neighboring gems and must line up 3 or more (or set a toy off); any other swap slides back for free. Cascades are free. When no swap is left, the board reshuffles (toys stay on their gems). Each animal gets a fresh board from the session seed.

**Charges.** Five colors, one per category: Body, Habits, Habitat, Range, Life cycle. A match of 3 earns 1 charge of its color, 4 earns 2, 5 or more earns 3. Tap a color to see its questions; a question costs 1 charge.
- Only questions that could cross out an animal still standing are offered, broad ones only (no countries, no genus). Range asks about UN regions inside the continent, in kid wording ("Central Africa", "the USA and Canada").
- The answer crosses out every standing animal whose record disagrees; an animal with no record for that trait stays standing ("No record for: …"). If the mystery itself has no record, the answer says so and the charge comes back.
- When a color's charges cover every one of its questions (with one to spare for the family tree while it still needs one of each), they're asked automatically.

**Toys.** A big match leaves a toy on the board, riding on one of its gems; matching the toy sets it off.
- **Line gem** (4 in a line, white bars and arrows): clears its row, or its column when the match was up and down.
- **Blast gem** (an L or T shape, a white ring): clears the 3×3 around it.
- **Color gem** (5 in a line, a disc of all five colors): swap it with any gem to clear every gem of that color. It never matches by itself.
- **Two toys swapped together** go off as one big clear: two line gems make a cross; a blast gem with a line gem or another blast gem clears the 5×5 around; two color gems clear the board. A color gem swapped with a line or blast gem clears that toy's color, and the toy goes off with them.
- **A toy caught in another toy's clear** goes off too.
- **Charges:** every 3 gems a toy clears outside a match (all colors together) earn 1 charge, of the color it cleared most (`Rules.perBlast`); the board calls it out ("+1 charge"). Note gems it clears are collected.

**Feel.** Every match pops, with a pitch that climbs through a chain ("Chain ×2!"). Big matches and toys shake the board. Animations are quick. Sounds are synthesized in the browser (`src/game/sfx.ts`); they're off until the player taps the speaker button, and the choice is kept on the device.

**Family tree.** Kingdom Animalia and phylum Chordata show from the start. Class, then order, then family are revealed one at a time, each for **one charge of each color**; the reveal crosses out every animal in another group. A step every standing animal shares fills in free (all 12 are mammals: class Mammalia shows at once). Genus and species appear on the reveal card.

**Field notes.** About 1 in 20 new gems is a glowing **note gem**. It never matches by itself; a match next to it (up, down, left or right) collects it and saves one field note, sealed. Notes are the animal's hand-written clues, then its fun facts. Any word that would name the animal (its name, its group words like frog or pangolin, its Latin names, its countries and regions) shows as a blank `____`; a note with more than 2 blanks waits for the reveal card.

**Guessing.** Tap an animal to read its field guide and guess. A wrong guess crosses it out and costs 30 points, 2 moves and the streak. At 0 moves the board is covered by the **spend panel**: spend the charges left, then guess. A wrong final guess ends the round, unless notes were saved: then they open for a **last chance**, one more guess.

**Scoring.** Solved 50, +10 per move left, +10 per other animal still standing, +25 first try, plus the streak (+10 per solve in a row, max 100). A last-chance solve scores 50 only. A lost round scores 0.

**Rules versions** (saved with every round as `rules_version`): 041-1 the charges game with 8 relatives; 041-5 (now) adds toys and 12 look-alike animals (plans/041, part 13). Tried and removed (parts 8–12): one question a move (041-2, 041-3) and pick-then-earn (041-4); the owner found them too clunky.

**Sources.** Every answer and note names its source. The link opens only after the round, because a source page names the animal; the reveal card lists every source.

## Content: the human in the loop

Content lives in git as one JSON profile per animal (`db/content/animals/`), each fact sourced from a ranked registry (`db/content/sources.json`). docs/CONTENT_SOURCES.md has the source tiers, the tag vocabulary and the workflow:

1. Edit a profile; `npm run content -- preview [name]` shows its clues and problems.
2. New animal: `npm run content -- ranges`, then `npm run content -- photos`.
3. `npm run content -- build` loads the database in one transaction; `npm run content -- check` validates the live pool.
4. If ranges or the set of animals changed: `REFRESH MATERIALIZED VIEW CONCURRENTLY clue_match_ranges;` and `REFRESH MATERIALIZED VIEW CONCURRENTLY clue_match_places;`
5. `npm test`, then play `/explore/?seed=1`.

A profile's `traits` and habitats become the questions; its `clues` and `facts` become field notes (`isHandWrittenClue` in `profiles.ts` tells them apart in the database). Write notes that don't name the animal ("It can't purr", not "Tigers can't purr"): named words become blanks. Countries come from the range maps for now; plan 041 (review fix 6) moves them to IUCN countries of occurrence.

**Plain words.** Players are in grades 6–12. Science words stay (they are part of the lesson), and `src/clueGame/glossary.ts` gives each one a tap-to-read definition in the field guide and on the reveal card. Add a glossary entry when new content brings a new term.

## Database

`db/schema.sql` is the schema the app uses: the content tables (`content_sources`, `species` with Red List link and photo credit, `species_deduction_clues` and `species_facts` with their sources), `profiles`, `clue_match_solves`, and two materialized views. `clue_match_solves` has a row per finished round: `outcome` (`solved` or `lost`; rows before plan 041 are `solved`), `last_chance` (from rules 041-2, so first-try and rescued solves can be told apart), `rules_version`, moves used and left, wrong guesses, animals standing at the guess, notes saved, family tree steps and every question with its answer. The journal counts only `solved` rows. `clue_match_ranges` holds simplified range SVG paths for the reveal card (~10 s to refresh). `clue_match_places` holds the globe's places and who lives there (≥5% or 5,000 km² of a range; the game draws a continent's animals from their countries instead, so counts can differ by one or two). It splits Russia at the Urals and moves France's overseas parts to their continent, and takes ~90 s to refresh. The file is a baseline, not a history: the old migrations 001–044 are in git history. Change the database with SQL, then update the file to match.

The world basemaps (`public/assets/clue-match/world-land.svg` under range maps, `world-land.geojson` on the globe) are drawn from `natural_earth.countries` by `npm run clue:world-map`. The habitat pictures come from TiTiler rendering the habitat GeoTIFF (`NEXT_PUBLIC_TITILER_BASE_URL`, `NEXT_PUBLIC_COG_URL`).

## Practice SQL on this data

`db/analysis/clue-match/` holds read-only queries, each with the SQL ideas it practices and a question to answer:

| File | Practice |
|---|---|
| `01_pool_overview.sql` | JOIN, GROUP BY, `count(*) FILTER (...)`: clue counts per color |
| `02_tag_vocabulary.sql` | `unnest` arrays, HAVING: every tag and who has it |
| `03_realm_clue_power.sql` | CTEs, array operators `&&` `@>`, correlated subqueries: how many species each Range clue rules out |
| `04_realm_shares.sql` | PostGIS `ST_Intersects`, `ST_Intersection`, `ST_Area(geography)`, window functions |
| `05_text_quality.sql` | UNION ALL, regex operators: the validator's text checks in SQL |
| `06_ranges_for_qgis.sql` | `ST_Union`, a geometry layer to load in QGIS over the realm map |
| `07_solve_stats.sql` | `percentile_cont`, `jsonb_array_elements`: hardest animals, most-asked questions, notes and family tree by outcome |

## Checking it as an agent

- `npm run e2e` (with `npm run dev` running): headless Chrome picks the continent with the most animals and plays three rounds at 390×844, through real swipes and buttons.
  - **Each move:** one move used; charges never below zero; the mystery never crossed out.
  - **Once a run:** the sound button starts off and turns sound on; a big match leaves a toy; matching a toy sets it off (a blast group in `gems-matched`); a toy-only move (a color gem, or two toys side by side) goes off when one shows up; naming the animal and starting the next one while gems still fall leaves every sprite matching the model (`state().view`).
  - **Every round:** once, it asks a question from a color's sheet. Out of moves, it spends everything in the spend panel and checks that no source link shows during a round. Then it guesses through the field guide.
  - **Round 2 plays carelessly** (spends nothing, guesses the mystery last) to cover wrong guesses and the last chance.
  - **At the end:** the reveal names the mystery with its photo, Red List link, family tree and source links; the journal counts the solves; no console errors or failed requests.
  - **Artifact:** `e2e-artifacts/<run>/report.json` and screenshots. `E2E_PLACE`, `E2E_SEED`, `E2E_ROUNDS` change it.
- `node scripts/run-typescript.mjs scripts/balance-041.ts`: the seeded balance table (careful, careful questions with random swaps, random, worst and family-tree-first players): solved, first try, on a last chance, narrowed to one, charges earned.
- `npm test`: only what a playtest can't see: content checks, solve-report and localStorage parsing, board invariants. Test by playing first (AGENTS.md, Testing).
- In a dev browser, `window.__cc.clue()` returns the session (rules version, status, mystery, candidates, standing, moves left, charges, notes, family tree steps, score, streak, how the round ended, log tail), `window.__cc.drag(move, { input: 'touch' })` swipes a real move and `window.__cc.tap(cell)` taps. The `playtest` skill (`.claude/skills/playtest/SKILL.md`) lists the invariants to check.
