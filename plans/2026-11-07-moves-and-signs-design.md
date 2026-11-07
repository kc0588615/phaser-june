---
mission: moves-and-signs-design
project: critter-connect
branch: agent/moves-and-signs-design
status: active
started: 2026-11-07 07:33 UTC
---

# Mission: A movement clue, and signs linked to clue categories, design only (Critter Connect)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

A design the owner can pick from, plus a build brief for the mission that follows. No game code or content changes on this branch. Three parts:

**1. A movement clue ("how it gets around").** The owner wants a new question about how an animal travels: swimming, climbing, digging, hopping, walking, galloping or the like. The mission proposes which form works with the deduction engine and is fair to a player. It compares at least these options and recommends one:
- **Several yes/no moves** (a complete prefix, like `habitat`: an animal can hold more than one). Example: Swims, Climbs trees, Digs burrows, Hops, Glides or flies.
- **One main way per animal** (an exclusive prefix, like `diet`). Say where the one-value rule breaks (a jaguar both swims and climbs).
- **Just "Lives in trees"**, the clue-audit's best single candidate (report section 2, option B).
- Anything better that the research turns up.

For each option, give:
- The values, each with a written rule a content writer can apply. For example: what counts as "swims", whether swimming across a river counts, whether "climbs" includes rocks. "Walks" tells players almost nothing, since nearly every land animal walks, and "gallops" or "crawls" are hard to define, so say whether each is kept, merged or dropped, and why.
- **Each of the 76 animals' value under the recommended option, researched,** with a quote and a source link (ADW, IUCN text and the others in `db/content/sources.json`). Don't carry over `travelOf` or the open tags (`swimmer`, `climber`, `burrower`, `tree_dweller`, `glider`, `fully_aquatic`). The audit found them written only where a note needed them, so a missing tag isn't a "no". Leave a value out where the sources can't settle it ("no record", never ruled out), as `docs/CONTENT_SOURCES.md` already does.
- **How a player deduces it** from what the game shows: the photo, the field guide line, the signs and the witness notes. List the animals a careful reader would still get wrong.
- **How it fits the engine:** prefix kind and `traits.ts` lists; which category asks it (`PREFIX_CATEGORY`, `questionMatch.ts`), or whether it needs a new one; `QUESTION_TEXT`, `SHORT_TEXT`, `COLUMN_LABEL`; the clue faces (`clueFaces.ts`); the guide lines (`profiles.ts`); overlap with existing questions (Fresh water against Swims); and whether `travelOf` (`animalBoard.ts`) should then read the new trait.
- **Balance:** deal rounds as the clue-audit did (world and every continent with 12+ animals, each animal as a seed; `pickSuspectSet`, then `dealClues`), with Farms & towns removed and the new clue added. Report how often it's dealt, rounds gained or lost, and pairs told apart only by it. Rerun the balance bot (`scripts/balance-044.ts`) on the same change.

**2. Farms & towns removal, folded in** (owner, 2026-11-07: clue-audit option A). Design it together with part 1, so the movement clue can take its place. The audit's section 2 has the full trace, including the `COMPLETE_PREFIXES` and `isHandWrittenClue` trap. Measure part 1 against the deal without Farms & towns. Re-check nothing; just carry its list into the build brief. The audit's parts 2 and 3 (label wording, the 53 content files) are out of scope.

**3. Signs, field notes and clue categories, visibly connected.** The owner wants players to *see* that each sign chip comes from a field note, and that both point to a kind of clue. The game should teach deduction: this sign → that note → this category of question. Today:
- **The signs** are the open tags on an animal's hand-written notes (`clues[].tags` in `db/content/animals/*.json`): 198 different tags, 519 uses. `signsOf` (`clueFaces.ts`) turns them into phrases, and `GuideSigns` (`src/components/animalBoard/AnimalSheets.tsx`) shows them as grey chips beside the photo, all alike.
- **The field guide's lines** are already grouped by the five categories (Body, Habits, Habitat, Range, Life cycle; `GUIDE` in `AnimalSheets.tsx`).
- **Each note has a `category`:** morphology 180, behavior 215, diet 56, diet_prey 13, diet_flora 5, habitat 49, geography 20, reproduction 35, life_description 70, key_fact 211, conservation 97, threat 76.
- **Gem colours belong to the round's four clue slots** (`CLUE_GEMS` in `animalBoard.ts`, plan 044), not to categories. So "matching the gems" needs a category mark of its own, or a rule change.

The mission:
- Maps every note category, and every sign tag, to one of the five question categories, or to none (`conservation` and `threat` probably say nothing a question asks). Where a tag's notes fall in different categories, say how that's settled.
- Draws **2 or 3 options** for the visual link, as mockups at phone width, light and dark, in the cc theme (`GUI.md`, `gui/`). Each option shows the signs, the field guide and the question tiles ("Its answers") on one suspect, plus one scouted question. Ideas to start from, none required:
  - a category colour and icon on chips, guide headings and question tiles;
  - tap a sign to highlight the note it came from;
  - signs grouped under their category's heading;
  - gems coloured by category again (say what it costs plan 044's board and balance).
- Gives each option's trade-offs:
  - readability for grades 6–12;
  - colour never the only cue;
  - fit in the sheet beside the photo (`GuideSigns` already pages long lists);
  - **no leaks:** during play the guide hides lines on asked prefixes (plan 045), and a sign like "climber" must not answer the movement question it would duplicate. Say which tags the build must hide or drop.
- Recommends one option.

### Why

Players rule animals out on what they read, so a clue they can't check from the guide or photo makes a round unfair (the clue-audit's finding on Farms & towns). The owner wants a movement clue players can work out, and wants the signs, notes and questions to show how deduction works, so the game teaches it rather than leaving it to guesswork.

### Scope

In:
- Reading the code, content, docs, plans (`plans/041`–`054`), git history, the clue-audit report (`docs/research/2026-11-06-clue-audit.md`) and its evidence (`/srv/critter-ai/agent-state/missions/clue-audit/`: `findings.csv`, `audit/`, `out/`, including `audit/deals.ts` and the tree photos `out/s8-tree-photos.png`).
- Reading the cited sources and IUCN Red List pages. IUCN data is allowed for Critter Connect (owner, 2026-11-06); quote and link it like any other source.
- Throwaway scripts, prototypes and patched copies for deals, the balance bot and mockups, in `/srv/critter-ai/agent-state/missions/moves-and-signs-design/`, never in the repo. A mockup may be a throwaway local build of the game with the change applied (screenshot it with Playwright), or a static HTML page using the theme's tokens.
- Read-only use of the live database, if a fact is only there.

Out:
- **No changes to the game:** nothing under `src/`, `db/`, `scripts/`, `public/` or the site. The branch adds only the plan, the design doc, its mockup images and the build brief.
- The clue-audit's parts 2 and 3 (labels, bin edges and content fixes). Note where they touch this design; don't do them.
- No issues or board cards.

### Definition of done

- **The design doc** at `docs/research/2026-11-07-moves-and-signs.md`, in plain language for the owner, with its images in `docs/research/2026-11-07-moves-and-signs/` (PNG, readable on GitHub):
  1. Summary: the recommended movement clue, the recommended link option, and the owner's choices, each with the mission's pick.
  2. Movement clue: the options compared (part 1), the recommendation, the written rules, and the balance numbers.
  3. The 76 animals: one row each, with the value under the recommended option, quote, source link, and how a player can tell (photo, guide, signs), marking the hard ones.
  4. Signs and categories: the note-category and tag mapping (the full tag table may go in a CSV beside the doc), the 2–3 mockups and their trade-offs, the leak rules, and the recommendation.
  5. What the build changes: files and size, Farms & towns removal included.
- **A build brief** at `plans/2026-11-07-moves-and-signs-build-brief.md`, ready for the control room to start as the next mission once the owner picks. It follows the ops template's sections (Goal, Why, Scope, Definition of done, Decision rules, Notes). It names the files, the content changes for all 76 animals, the rules version bump (`ANIMAL_RULES.version`, `animalBoard.ts`), the checks, and that the production content build is the owner's from WSL. If the build won't fit one mission (60 sessions), split it into briefs that build on each other, in order.
- **Evidence** in `/srv/critter-ai/agent-state/missions/moves-and-signs-design/`: the per-animal research (one row per animal and value, with quote and link), the deal and balance-bot output, and the mockup sources.
- **Coverage:** all 76 animals for the recommended movement option, every note category and every sign tag in the mapping. The doc says what couldn't be checked and why.
- **Release:** the project merges and deploys at the end. The merge adds only docs, so the deploy ships the same game. Confirm it with `git diff --stat origin/main...HEAD` in the Summary.

### Decision rules

- Design only. Never change the game. Where the owner has to choose, recommend and give the trade-offs; don't stop to ask, and don't add handoff items for those choices (the doc's Summary holds them).
- A value needs a quoted source. Two open sources that disagree: report both, and leave the value out (no record) in the recommendation.
- Prefer an option a player can check from the photo or the guide over one that's only in the sources.
- Keep the engine as it is unless the doc shows the change pays: a new prefix kind, a new category or a gem rule change each need their cost stated.
- No code-review stages; skip Astra (there's no code). The mockups get one `graphical-audit` pass against `GUI.md`.

### Notes

- **Work from the newest game** (owner, 2026-11-07). Before anything else, `git fetch origin --prune` and check that the branch sits on the latest `origin/main`; if `origin/main` has moved on, rebase onto it. Read the newest plans (`053-name-it.md`, `054-lock-in.md` and any later ones) and play a round in a local build, so the design fits the game as it is now, not as the clue-audit saw it (`094da493`). Re-fetch before the final PR.
- How answers work: `ask` in `questionMatch.ts`. A suspect whose set differs from the mystery's on the asked tag is ruled out; one with no value for the prefix is "no record" and never ruled out. Complete prefixes list every value, so a missing value means no (`COMPLETE_PREFIXES`, `traits.ts`).
- The witness gem (`WITNESS_GEM`, purple) shows a hand-written note only when two suspects share its tag (plan 044).
- The clue-audit on `travelOf`: "walk" is the default for 43 animals, "swim" (14) groups the tiger, Asian elephant and jaguar with the axolotl, and 8 of the 14 also answer yes to Fresh water. `tree_dweller` is on 11 animals (5, 6, 23, 30, 35, 40, 43, 45, 54, 61, 71), and 9 of their photos show a tree. `climber` also covers rock-climbing turtles (4, 15).
- Next plan number: plans go to `054` on `origin/main` (`69f45fa6`, PR #60, checked by the control room 2026-11-07). The build plan may take `055`.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

From `87e6689b` on `origin/main` `69f45fa6` (fetched 07:34 UTC; branch already on it, no rebase).
- Install: `node_modules` present, `npm ls --depth=0` clean. Migrate: n/a (no migration history; DB is live `phaser_june`, design-only mission, nothing to apply).
- `npm run typecheck` 0, `npm run lint` 0, `npm test` 48/48.
- `npm run e2e:fresh` (CHROME_PATH = no-sandbox wrapper, see Decisions): run 1 1509/1512, 3 timing checks (row-slide press, waiting re-order click, round 1 move 5 sparkle; known VPS flake, cf. plan 2026-11-06-auto-rule-out-default S1); run 2 1512/1512, same 4 rounds (Hairy Frog +310, Hirola escaped, Golden-rumped Sengi +50, African Forest Elephant +110).
- Artifact: `/srv/critter-ai/agent-state/missions/moves-and-signs-design/baseline-e2e/` (report.json, screenshots, both logs). Repro: `CHROME_PATH=<that folder>/../chrome-nosandbox.sh npm run e2e:fresh` (seed 7).

## Architecture

Architect, 2026-11-07, read on `origin/main` `69f45fa6` (rules `054-1`). Design only: every "build" item below goes into the build brief, not this branch.

### Findings (ranked by impact on the design)

**F1. "No record" is per prefix, and in the 044 game it means "not dealt", not "never ruled out".** The book holds prefix → set of tags (`questionMatch.ts:222-227`). `fullTable` skips a tag when any suspect has no set for its prefix (`animalBoard.ts:96-97`), else the answer is `has(tag)` (`:98`), so every other value of that prefix is "no". `ask` (`questionMatch.ts:480-505`) is the 041 game's: nothing outside `questionMatch.ts` calls it, `questionsFor` or `autoAsk`. The brief's "How answers work" note describes 041, not the board. Consequences:
- A multi-value movement prefix is complete whether or not it sits in `COMPLETE_PREFIXES`. Every value must be settled for every holder, and one unsettled value can only be expressed by dropping the whole prefix for that animal.
- A "no record" per value needs one prefix per move.
- Each no-record shrinks coverage: a question is dealt only to sets where all 5 suspects hold a record. Unfairness turns into rarity.

**F2. A yes/no trait needs its "no" stored but never asked. No mechanism exists for that today.** Every tag of an askable prefix becomes a question (`animalBoard.ts:89`). When two tags split a set the same way, the first one is kept, sorted by prefix and then `localeCompare` (`:90-92`, `:100-101`). With `climbs:yes`/`climbs:no`, the `no` tag sorts first. It would be dealt with its raw tag as the text (`questionMatch.ts:176-179`) and the ❓ face (`clueFaces.ts:30`). `birth:eggs/live` avoids this only because both values are real questions. **Fix (build):** one exported predicate in `questionMatch.ts`: a tag whose value is `no` records an answer and is never asked. `fullTable` uses it, and so does `questionsFor` for consistency. That is about 3 lines. The same rule covers the "none" sentinel that option A would need.

**F3. Farms & towns: the code goes live before its content does.** The trap is exactly as the audit traced it. Every site is still at its line on `69f45fa6`:
- `traits.ts:27` (`HABITAT_CLASSES`, spread into `COMPLETE_PREFIXES` at `:30`)
- `questionMatch.ts:152,171,200`
- `clueFaces.ts:15` (🏡)
- `profiles.ts:93` and `:139-145`
- `isHandWrittenClue` at `profiles.ts:290-295` and the reserved check at `:331`

The audit's fix ("same change") isn't the same moment, though. The release deploys `origin/main`. The prod content build comes later, by the owner from WSL (`AGENTS.md:38`). In between, the live game reads the old rows with the new code:
- If `artificial` has left `HABITAT_CLASSES`, the pool door (`questionMatchContent.ts:160`) calls the 45 `artificial:<kind>` rows hand-written. They become witness notes, for example "It also lives in plantations…", which 11 animals share.
- The 20 `habitat:artificial` rows stay askable under the `habitat` prefix, showing the raw tag and ❓.

**Fix:** the build mission removes the class from the 20 content files but keeps the constants, which are harmless once no row holds them. A one-session cleanup brief deletes the constants after the owner confirms the prod content build.

The reverse gap matters too. If new rows meet old code (the owner builds before a deploy that failed), the old code doesn't reserve the new prefix, so the generated movement lines become witness notes. So the handoff says: content build only after a successful deploy.

**F4. Signs are never hidden; plan 045 hides only guide lines.** Today's code:
- `asked` is set from the dealt prefixes (`AnimalSheets.tsx:86`), and only guide lines are filtered by it (`:98-101`).
- Signs (`:89`, `:208`) aren't filtered (plan 045:17: "photo, signs and other lines stay").

Some signs already restate an answer: `fully_aquatic` on 62, 74 and 75 says "no" to "Lives on land?". A movement question would be restated by `climber` (11), `tree_dweller` (11), `burrower` (18), `swimmer` (9) and `glider` (1).

Witness notes are affected too. A note's "fits N of 5" counts open tags (`animalBoard.ts:167-173`), and the audit found those tags written only where a note needed one. So a `climber` note that "fits 2" can sit beside 3 yeses in the movement column.

**Fix (build):**
- One map: open tag → the question tag it restates.
- `GuideSigns` hides those signs while that question is dealt (045's rule, extended to signs).
- `witnessNotes` skips a note that carries a hidden tag.
- Signs that only hint (digging claws, webbed feet, hangs upside down) stay. They are the teaching link.

**F5. A question's category is never shown during play.** Categories appear only as the field guide's headings (`AnimalSheets.tsx:33`). Order tiles, "Its answers" and the grid show a face and the question (`:211-250`). `CATEGORY_LABELS` is read only by the 041 log (`LogEntryText.tsx:58,76`). Sign chips are all one grey style (`CHIP`, `:41`). Plan 054 also weights pencils by category (`animalBoard.ts:433`), though a player can't see which category a question is in. Part 3 must add a category mark to signs, question tiles and witness notes. Only the guide headings exist to build on.

**F6. "Sign → note" can't mean showing a suspect's own note.** Suspects' hand-written sentences are never shown in play, by design: a witness note would match one word for word (plan 044:25). Guide lines come only from generated clues (`questionMatchContent.ts:82,91`). The only notes on screen are the mystery's witness notes.

Facts (`key_fact`, `life_description`, `diet_prey`, `diet_flora`, `threat` and behavior facts) carry no tags and never show in a round. So only 6 of the 12 note categories feed signs: morphology, behavior, diet, habitat, reproduction and geography. The 97 conservation clues are all untagged.

How tags fall (checked against the content):
- No tag appears in notes of two different guide sections on the same animal.
- 19 tags do across animals.
- Signs per animal: 2 to 13, median 7.

`GUIDE_CATEGORY` (`questionMatchContent.ts:15-17`) already maps note categories to guide sections, except `geography` (Range lines are built at `:98-102`).

**F7. Gem colours belong to slots, and the theme has one accent colour.**
- `CLUE_GEMS` are positional (`animalBoard.ts:64`). The 043 category colours survive only in `GEM_OF`, for old log entries (`gems.ts:6`).
- `dealClues` lets a deck hold two clues of one category: its score adds 1 per distinct category but doesn't require four (`:133`).
- cc gives `color-1`, plus game-data colours such as `--color-notes` (`globals.css:352`). GUI.md forbids adding colours to finish a screen without naming the gap.
- A category colour taken from the gem palette would clash with the slot colours on the same screen.

So the category mark must be an icon plus a word. Colour by category is a rules change, and the build brief must state what it costs.

**F8. Prefix order breaks ties.** The key order of `PREFIX_CATEGORY` (`questionMatch.ts:22-28`) sets `QUESTION_PREFIXES` (`animalBoard.ts:69`), and `fullTable` keeps the first question per split. A movement prefix keyed before `system` wins ties against Fresh water and On land. The deal runs must use the key position the build will use: in the habits group, after `social`.

**F9. A missing face fails silently.** `clueFace` returns ❓ for an unknown tag, and `dealClues` drops any deck with two equal faces (`animalBoard.ts:131`). Two new tags without faces would never share a deck, and nothing would say so. Each new askable tag needs its own face. 🏡 stays taken until the cleanup.

**F10. Movement sources don't cover the 76 evenly.** Habitats come from IUCN tables that cover all 76 (`CONTENT_SOURCES.md:24`); movement has no such source.
- ADW has accounts for 65 animals (cached by clue-audit, `sources/adw/`), and its "Key Behaviors" keywords are incomplete.
- Example: the tiger is tagged `cursorial` but not `natatorial`, while its text says "Tigers are excellent swimmers".
- Across the 65 accounts: arboreal 11, fossorial 9, natatorial 7, scansorial 6.
- IUCN text is cached for all 76 (`sources/iucn/*.pdf.txt`).

So values come from reading the text, and a "no" must quote how the animal lives, never rest on a missing keyword. One rule conflict: `CONTENT_SOURCES.md:21` lets the higher tier win when sources disagree, but the brief says no record. The build must write the movement rule into `CONTENT_SOURCES.md`.

**F11. `travelOf` is a guess built from incomplete tags.** It returns fly for bats and the glider, swim for `fully_aquatic`/`swimmer`, dig for `burrower`, and walk otherwise (`animalBoard.ts:199-205`). It sets the wander heading (`useAnimalSession.ts:199,269`), and the bot uses it the same way (`balance-044.ts:84`), so changing what it reads moves balance a little.

**F12. Pencil weights are fixed by category.** Body is 1 ("seen in the photo"), Habitat 2, Habits 3 (`animalBoard.ts:433`, owner's pick in 054). A movement question in Habits that a player can check from the photo pays 3 per pencil. That's a cost to note, not something to change.

**Fine as is:**
- `checkProfile` fails loudly on a removed habitat class (`profiles.ts:318`).
- The resume check restarts saved games whose rows changed (`useAnimalSession.ts:120-123`).
- No schema change: tags live in `compare_tags`, and `clue_match_solves` stores no tags.
- The e2e names no tag.

One stale item: the site's field-guide shot shows the signs (`src/site/shots.ts:40`), so a part-3 change makes it out of date. A shots refresh is an option for the build.

### Target design

**1. The design doc** follows the five sections of the Definition of done. Evidence lives in `/srv/critter-ai/agent-state/missions/moves-and-signs-design/` as `research/`, `deals/`, `bot/`, `mockups/`, `patched/` (the throwaway copy) and `out/`.

**2. Movement clue: the options and how each fits the engine.**

| Option | Engine form | Research load | Where it breaks |
|---|---|---|---|
| A. Several moves as one prefix | Profile array `moves` (like `habitats`); `move` in `COMPLETE_PREFIXES`; a `move:none` sentinel for animals with no listed move (needs F2's rule) | Every value settled for all 76 (F1) | One unsettled value removes the animal from every move question |
| B. One main way | `move` in `EXCLUSIVE_PREFIXES` | 76 judgments, rarely stated by sources | Multi-movers. Even the incomplete tags give two moves to 24, 30, 51, 54, 59 and 73 (jaguar climbs and swims, sloths climb and swim, giant otter swims and digs). This is `travelOf`'s model, which the audit showed failing |
| C. Lives in trees only | One yes/no prefix | 76 judgments | "Lives in" needs a rule (sleeps? feeds?); the orangutan's and Andean bear's photos show the ground |
| **D. One yes/no prefix per move** (better) | `climbs:yes\|no`, `digs:yes\|no` (and `swims:` if kept). Each is a `Sourced` trait in `profile.traits`, the existing interface: one value, a note, a source, left out when unknown (`profiles.ts:41-51,266-276`). Prefixes go in `EXCLUSIVE_PREFIXES`. `PREFIX_CATEGORY` → habits; the generated line's category `behavior` puts it in the guide's Habits section | 76 judgments per value; no record allowed per value | Needs F2's rule. C is D with one value |

Values, each with a written rule in the doc:
- **Kept as candidates:**
  - **Climbs trees:** climbs trees to feed, rest, hunt or escape. Rocks don't count, so the pancake tortoise and big-headed turtle are judged separately.
  - **Lives in trees:** the stricter variant, for D-with-one-value and for C. It is a subset of Climbs.
  - **Digs burrows:** digs its own burrow or tunnel to live, sleep or hide in. Digging for food or using another animal's burrow (`borrowed_burrows`) doesn't count.
  - **Swims:** strict: swims as part of daily life, to feed or travel. Crossing a river now and then doesn't count.
- **Dropped:**
  - Hops: about the same as "is it a frog". With 12 frogs and suspects picked relatives first (`pickSuspectSet`, `:145-157`), it rarely splits a set.
  - Glides or flies: 2 holders (45, 5).
  - Walks: nearly every land animal.
  - Gallops, crawls: no rule a writer can apply.

**Lean: D with Climbs trees and Digs burrows, in Habits.**
- Both are natural questions for grades 6–12.
- Both split sets of frogs, turtles and mammals.
- Climbs can often be checked in the photo. Digs has hint signs (digging claws) and body cues.
- Drop Swims unless the deal runs show it splitting sets that Fresh water and Sea don't: strict, it repeats the system questions; loose, it is near-universal and rarely stated.
- Fall back to Lives in trees if Climbs has many yes-animals whose photos show the ground.
- The research records all four values (one pass over the same sources), so the final choice rests on numbers.

What D touches in the build:
- `traits.ts`: `EXCLUSIVE_PREFIXES`.
- `questionMatch.ts`:
  - `PREFIX_CATEGORY` (key after `social`; F8)
  - `QUESTION_TEXT`, `SHORT_TEXT`, `COLUMN_LABEL` for the `:yes` tags only (8 letters a line)
  - F2's predicate
- `clueFaces.ts`: one face per new tag, unique and no animal emoji.
- `profiles.ts`:
  - the `traits` type
  - a yes line and a no line per trait ("It climbs trees." / "It doesn't climb trees."), because a no must be readable, unlike a missing habitat line
  - the `trait()` calls
  - `TRAIT_VALUES`
- `CONTENT_SOURCES.md`: the traits table, the rules, the disagreement rule (F10).

**`travelOf`:** lean yes, for dig only: `digs:yes` replaces `burrower`, and the rest stays. Required if the build drops `burrower` from content. Measured in the bot, since headings change.

**Overlap:** for Swims, the share of sets where its row equals `system:freshwater`'s.

**3. Farms & towns removal (folded in).** The touch points are the F3 list. Content: `artificial` and its 45 kinds leave the 20 holders' `habitats` (2, 6, 7, 11, 13, 23, 24, 25, 28, 32, 48, 49, 51, 52, 54, 58, 59, 72, 73, 74). `CONTENT_SOURCES.md:24,47` then says the class is skipped. The constants are deleted only in the cleanup brief (F3). Every movement measurement is taken against the deal without Farms & towns.

**4. Research method (76 animals).**
- **Rules first.** The written rule for each value is fixed before any batch starts, so all batches judge alike. Yes needs a quote that says so. No needs a quote describing how it lives in a way that rules the value out ("ground-dwelling", "fully aquatic", "shelters under rocks"). Silence is no record. Two sources that disagree: report both, leave the value out.
- **Source order:**
  1. Cached IUCN text (all 76) and ADW (65), both read-only from `clue-audit/sources/`.
  2. The profile's own cited pages (`profile.sources`) and the other tier-2/3 sources in `sources.json`.
  3. Wikipedia last (tier 4, checking its own cited source).
  AmphibiaWeb wasn't reachable last time; frogs fall back to IUCN and ADW, otherwise no record.
- **Photos:** one contact sheet of all 76 photos. Reuse clue-audit's cache (`sources/photos*`) and fetch the rest from `profile.photo.url`.
- **CSV** (`research/moves.csv`): one row per animal and value, 304 rows. Columns:
  - `animal_id`, `animal`, `value` (climbs_trees, lives_in_trees, digs_burrows, swims)
  - `verdict` (yes, no, no-record)
  - `quote`, `url`, `source_key`, `tier`
  - `quote2`, `url2`, `tier2`, `disagree` (y/n)
  - `photo_cue` (shows-yes, shows-no, neutral)
  - `guide_cue` (shown lines that still show while the question is dealt, verbatim)
  - `sign_cue` (hint tags, not restating ones)
  - `hard` (y/n, with why), `checked_at`
- **Batches:** 8, grouped by taxon so one researcher judges like animals alike: frogs and salamanders (15, as 2 batches), turtles and tortoises (11), primates, sloths, tree-kangaroo and bat (arboreal), carnivores (11), the diggers (pangolins, echidnas, armadillo, aardvark, golden mole, solenodon, bilby, marmot, pika, wombat, sengi), and the hoofed animals and elephants. Run at most 2–3 subagents at once, because of search rate limits (`CONTENT_SOURCES.md:78`).
- **Coverage script:** prints 76 × 4 rows, no yes or no without a quote and link, and a reason on every no-record.
- **"Hard" animals:** the ones a careful player would get wrong from what still shows while the question is dealt (photo, hint signs, other guide lines, witness notes). The question's own line is hidden then (045).

**5. Balance method.**
- **The patched copy:** `git archive HEAD src scripts db tests package.json tsconfig.json` into `patched/<variant>/`, with `node_modules` symlinked. Each variant = a patch file in `patches/` plus a content overlay. A script writes the researched values (leaving out no-records) into the copy's `db/content/animals/*.json`, never into the repo. The F2 predicate is in the patch.
- **Variants:**
  - base (today)
  - −F&T
  - −F&T + C (Lives in trees)
  - −F&T + D (Climbs + Digs)
  - −F&T + D + Swims
- **Deal runs:** an adaptation of `clue-audit/audit/deals.ts` (copied, not imported). For the world and each continent with 12 or more animals (`MIN_PLACE_ANIMALS`), every seed goes through `pickSuspectSet` and then `dealClues`. Metrics per place and variant:
  - seeds with a set (rounds gained or lost against −F&T)
  - share of decks dealing each new tag
  - sets and decks changed
  - pairs in a dealt deck that only the new clue separates, and pairs only it separates in the whole table
  - sets where a new question isn't dealt because a suspect has no record
  - Swims rows equal to Fresh water's
  - decks with two clues of one category (the cost of category gems, F7)
- **Bot:** `scripts/balance-044.ts` runs in the copy: `--rounds 400 --seed 44 --places africa,asia,north-america,south-america`, default players. Then once more with `--knows size,covering,climbs`, the photo stand-in for Climbs.
- **Outputs:** in `deals/` and `bot/`, each with its exact command.

**6. Signs mapping.**

Note categories → question categories, provisional:

| Note categories | Question category |
|---|---|
| morphology | Body |
| behavior, diet, diet_prey, diet_flora | Habits |
| habitat | Habitat |
| geography | Range |
| reproduction, life_description | Life cycle |
| key_fact, conservation, threat | none (untagged facts or threats, seen on the reveal card only) |

The tag table (198 tags, `out/sign-map.csv`) has these columns:
- `tag`, `uses`, `note_categories` (counts)
- `category`, and the `rule` that set it
- `restates` (the question tag it answers outright, or empty)
- `hints` (the question prefix it is evidence for)
- `action` (hide while dealt, drop, keep)

How a tag's category is set:
1. The majority of its notes' categories, via the table above.
2. If tied, what the sign names: a body part → Body; an act or food → Habits; surroundings → Habitat; a named place → Range; eggs or young → Life cycle.

The result is **one fixed category per tag**, so the same chip looks the same on every suspect. Witness notes take their mark from their tags. The build keeps the table as a code constant, and `checkProfile` fails on an open tag that isn't in it (fail fast for new animals).

**Leak rules:**
- "Restates" means the sign's words alone give a suspect's answer to the question.
- Those signs are hidden while their question is dealt, and witness notes carrying them are skipped (F4).
- The rule covers today's questions as well as the new ones. It changes plan 045's "signs stay", so the doc lists the affected tags as an owner choice.
- Drop a tag from content only where it duplicates the new trait and serves no witness note. Otherwise hide it, which keeps the witness notes' tags.

**7. Mockups.** Three options. Each shows one suspect's signs, field guide and "Its answers", with one cell scouted.
- **Option 1, category marks:** one lucide icon plus the category word on sign chips, guide headings, answer rows, order tiles and witness notes. No new colour.
- **Option 2, signs inside the guide:** chips move into the field guide's category rows, and "Its answers" is grouped under the same headings. The structure itself is the cue: no paging, but a longer sheet.
- **Option 3, gems coloured by category again:** 043's `GEM_OF`. A rules change: decks would need four distinct categories (cost measured in §5), five data colours in both modes would have to pass the contrast check in `npm run lint`, and icons are still needed so colour isn't the only cue.

"Tap a sign to see its note" becomes "tap a sign to scroll to its category in the guide", because of F6. Highlighting which suspects fit a witness note is rejected: plan 044 makes that the player's job.

**Lean: option 1.** Smallest layout change, works with `GuideSigns` paging, no theme gap.

**How they're made:** a throwaway copy of the app (like §5, with `.env.local` symlinked, not copied). The option is picked by a query parameter in the copy. The researched trait is injected at `animalsFromPool` in the copy, so a movement question can be dealt. The dev server runs on a free port in 3100–3102 (`ss -ltn` first). The copy must not finish a round, which would make `POST /solves` write to the live DB, so it blocks that POST.

**Screenshots:**
- 390×844, light and dark, saved as PNG.
- Taken with Playwright's Chromium through `chrome-nosandbox.sh`, driven by the repo's CDP helper (`scripts/cdp.mjs`). The Playwright library isn't installed here.
- Fallback: static HTML using `globals.css` tokens.

One `graphical-audit` pass against GUI.md. Photo credits stay visible in the PNGs.

**8. Build brief.** Sections from `/srv/critter-ai/ops/templates/mission-brief.md`: Goal, Why, Scope, Definition of done, Decision rules, Notes. It holds two briefs, in order:
- **(a) Build, plan `055`, about 25 sessions, well under 60:**
  - code from §2 (D) and F2
  - the sign-category table, the leak hiding and the chosen link UI
  - `travelOf` per the decision
  - movement values for all 76 animals, from `research/moves.csv`
  - F&T content removed (constants kept)
  - the `CONTENT_SOURCES.md` rules
  - `ANIMAL_RULES.version` `054-1` → `055-0`
  - the bot rerun, with numbers recorded in plan 055
  - optionally, a site shots refresh

  Checks: `typecheck`, `lint`, `npm test` (the content test), `content -- preview`, `e2e:fresh`. The E2E plays `phaser_june_dev`, with content built there at final verification just before the PR runs. In that short window, other branches' CI sees movement rows their code doesn't know; that's stated as an accepted risk. The prod content build stays the owner's from WSL, after a successful deploy, as a handoff item (F3).
- **(b) F&T cleanup, 1 session, started once the owner confirms the prod content build:** delete the F3 constants, and 🏡 is free again.

**9. Risks and failure modes.**
- Silence taken as no gives unfair nos. Mitigation: the evidence rule plus the coverage script.
- Sources disagree: no record, with both reported.
- Many no-records: the question is rarely dealt (F1), and §5 measures it.
- Leaks through restating signs or witness notes (F4).
- The deploy-before-content gap, both ways (F3).
- Silent ❓ face collisions (F9).
- Pencil weight 3 on a question a player can check in the photo (F12).
- Old open tags kept or dropped: witness notes lose their tags, and `travelOf` changes (F11).
- The mockup build writing solves to the live DB (blocked, §7).
- Mockups drifting from the theme (a real-app copy, plus one audit pass).
- Scope creep into the clue-audit's parts 2 and 3: noted where they touch (the Wetlands wording against Swims), not done.

### Rejected alternatives
- **A, one complete `move:` prefix:** every value must be settled for every holder (F1), and it needs a sentinel anyway.
- **B, one main way:** breaks on multi-movers, "main" is unsourced, and it repeats `travelOf`'s failure.
- **`habitat:trees` in the complete IUCN habitat prefix:** puts non-IUCN data in a one-source prefix, and all 76 animals would default to no.
- **Value names chosen so yes sorts first** (`climbs:trees`/`climbs:never`): hidden coupling to `localeCompare`; F2's explicit rule instead.
- **`travelOf` or the open tags as the trait:** a missing tag isn't a no (the audit).
- **A new sixth category for movement:** `CHARGE_CATEGORIES`, `PENCIL_WEIGHT` and the guide sections would all grow, for 2 questions.
- **Deleting the F&T constants in the build mission:** breaks the live game between the deploy and the content build (F3).
- **A "generated" column on clue rows to defuse the trap:** a schema change for a one-time transition.
- **Showing a suspect's own note on a sign tap:** plan 044 rules it out (word-for-word matching).
- **Lighting up the suspects a witness note fits:** does the player's reasoning (044, "point, don't conclude").
- **Each sign's category taken from its own note at runtime:** 19 tags would get different marks on different suspects.
- **Category colours from the gem palette:** clash with the slot colours (F7).

## Architecture review (Fable)

Fable, 2026-11-07, checked on `69f45fa6` / `c3ec885f`.

VERDICT: APPROVE_WITH_CHANGES

Findings verified against the code and content. F1 (`animalBoard.ts:96-98`; `ask`/`questionsFor`/`autoAsk` have no callers outside `questionMatch.ts`), F2 (`:89-92`, `questionMatch.ts:176-179`, `clueFaces.ts:30`; `'climbs:no'.localeCompare('climbs:yes') < 0`), F3 (all 9 sites at their lines; `questionMatchContent.ts:160` calls `isHandWrittenClue` on live rows), F4 (`AnimalSheets.tsx:86,89,98-101,208`), F5–F9, F11 (`travelOf` `:199-205`, `balance-044.ts:84`), F12 (`PENCIL_WEIGHT` `:433`) are all correct. Content counts match: 76 animals, 198 tags / 519 uses, signs 2–13 (median 7), no tag in two guide sections on one animal, 19 across animals, 20 F&T holders as listed, two-move animals as listed, facts carry no tags (437 facts, 0 tagged). Clue-audit evidence exists where cited (`audit/deals.ts`, `sources/adw` 65, `sources/iucn` 76 `.pdf.txt`). Playwright is not in `node_modules`; `scripts/cdp.mjs` is. Every Definition-of-done item has a home in the target design (§1–§8). Leak rules are sound for suspects: guide lines come only from generated clues (`questionMatchContent.ts:82,91`), so suspects never show hand-written text, and signs are tag-derived. Deal and bot method mirrors `useAnimalSession` and the audit's `deals.ts`.

MUST-FIX:
1. **§8(a) checks: "The E2E plays `phaser_june_dev`" is true only in CI** (`.github/workflows/ci.yml:56`, `E2E_DATABASE_URL`). On this VPS `scripts/e2e-fresh.mjs:38` passes `process.env` through, so `npm run e2e:fresh` and `npm run content -- build` (`scripts/connect.ts:9-10`) read `.env.local`'s `DATABASE_URL`, which is the live `phaser_june` (its first-line comment is stale). As written, the build mission's local E2E would play old rows (movement never dealt, F&T still dealt), so the new question is never exercised before the PR, and a careless `content -- build` would write the prod rows that are the owner's. The build brief must say: on the VPS, run `content -- build` and `e2e:fresh` with `DATABASE_URL` overridden to `phaser_june_dev` (credentials per `docs/DATABASE_ACCESS.md:182-195`), never against `.env.local`'s URL; and name that as the check that proves the movement question is dealt.

MISSED:
- `fully_aquatic` is on 5 animals (10, 17, 62, 74, 75), not 3. On 10 (Suriname Toad, systems terrestrial+freshwater) and 17 (Pig-nosed Turtle, terrestrial+freshwater+marine) the sign contradicts the `system` answer rather than restating it, so a reader is misled, not leaked to. Hiding `fully_aquatic` while `system` is dealt (§6 rule) fixes both cases; the doc should list 10 and 17 as a content note for the audit's part 3, not fix them.
- §5 patched copy: `git archive HEAD src scripts db tests package.json tsconfig.json` is enough for the bot and deals (`scripts/run-typescript.mjs` + `tsconfig.json` paths resolve `@/`); fine. But §7's app copy also needs `next.config.*`, `public/`, `postcss`/`eslint` configs and `src/styles`; say so, or copy the whole tree minus `node_modules`.

SHOULD-CONSIDER:
1. §6/F4 "witnessNotes skips a note that carries a hidden tag" throws away the teaching link the brief asks for (sign → note → question). Alternative with the same cost: when a note's tag restates a dealt trait, compute `fits` from the trait (`book.traits`) instead of `animal.tags`, so the note stays and its count agrees with the column. Give the owner both.
2. F2's predicate: name the sentinel once (`:no`) and have `checkProfile` reject any hand-written tag ending in `:no`, so the never-ask rule can't be hit by accident later.
3. §4 research CSV: add a column for hand-written notes whose *text* answers the new question but carry no restating tag (the audit found tags written only where needed). Those notes can appear as witness notes about the mystery; that's by design, but the hide/skip list in §6 is tag-based and will miss them, so the doc should say so.
4. §2 D in Habits costs pencil weight 3 for a photo-checkable question (F12). Offer the owner the one-line alternative (`PENCIL_WEIGHT` per prefix override, or Climbs in Body) with its 054 trade-off, rather than only noting the cost.
5. §8(a) "other branches' CI sees movement rows their code doesn't know": with old code, `climbs:yes` rows become witness notes ("It climbs trees.") and are not signs (`signsOf` drops colon tags), so the risk is cosmetic; say that, so the next mission doesn't re-investigate it.

## Architecture review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. **§8(a): make database isolation explicit.** Local content builds and E2E inherit production `DATABASE_URL`; only CI selects `phaser_june_dev`. Require an explicit dev-database override for both operations. Otherwise verification misses movement content or the build overwrites production content reserved for the owner.
2. **F4/§6: one question tag cannot describe every answer a sign reveals.** `reddish_fur` answers `covering:fur` positively and other covering questions negatively. Exact-tag hiding leaves those answers exposed. Define suppression across affected prefixes/questions and share it between signs and witness-note selection.

SHOULD-CONSIDER:

1. Keep sign metadata and visibility rules in one pure domain module, shared by validation, gameplay and UI.
2. Define how witness notes with differently categorized tags are marked; `long_tail` plus `climber` spans Body and Habits.
3. Include witness-note filtering and the selected `travelOf` change in balance simulations; both affect gameplay.
4. Before removing Farms & towns compatibility, account for cached pools: the endpoint permits 60 seconds fresh plus 600 seconds stale.

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

- 2026-11-07 Baseline: `/usr/bin/google-chrome` absent and Playwright Chromium dies sandboxed (Ubuntu 24.04 userns); E2E uses `agent-state/missions/moves-and-signs-design/chrome-nosandbox.sh` (adds `--no-sandbox`) via `CHROME_PATH`. No repo change.

## Log

- 2026-11-07 07:55 UTC · Baseline: on latest origin/main; typecheck/lint ok, unit 48/48, e2e 1512/1512 (2nd run; 1st 3 timing flakes). Artifact `baseline-e2e/`.
- 2026-11-07 08:25 UTC · Architecture: architect wrote 12 findings + target design (lean: per-move yes/no traits Climbs trees + Digs burrows in Habits, F2 never-ask-`no` rule, F&T content removed w/ constants kept till cleanup brief, sign leak hiding, mockup option 1 category marks). Docs only; no code touched.
- 2026-11-07 08:40 UTC · Fable review: APPROVE_WITH_CHANGES, 1 MUST-FIX (build brief must run content build + e2e on VPS against `phaser_june_dev`, not `.env.local` prod), 2 missed, 5 should-consider. Docs only.
- 2026-11-07 08:18 UTC · Astra review: APPROVE_WITH_CHANGES, 2 MUST-FIX (explicit dev-DB override for content build + e2e; sign suppression must cover all answers a sign reveals across prefixes, shared with witness notes), 4 should-consider. Docs only.

## Summary
