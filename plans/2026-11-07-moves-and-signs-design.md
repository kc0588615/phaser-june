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
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

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

**F2. A yes/no trait needs its "no" stored but never asked. No mechanism exists for that today.** Every tag of an askable prefix becomes a question (`animalBoard.ts:89`). When two tags split a set the same way, the first one is kept, sorted by prefix and then `localeCompare` (`:90-92`, `:100-101`). With `climbs:yes`/`climbs:no`, the `no` tag sorts first. It would be dealt with its raw tag as the text (`questionMatch.ts:176-179`) and the ❓ face (`clueFaces.ts:30`). `birth:eggs/live` avoids this only because both values are real questions. **Fix (build):** one exported predicate in `questionMatch.ts`: a tag whose value is `no` records an answer and is never asked. `fullTable` uses it, and so does `questionsFor` for consistency. That is about 3 lines. The same rule covers the "none" sentinel that option A would need. The value `no` is named once (a constant beside `EXCLUSIVE_PREFIXES` in `traits.ts`), used by the predicate and the traits' value lists. A hand-written `climbs:no` needs no new check: the movement prefixes are exclusive, so the reserved-tag check rejects it (`profiles.ts:331-332`).

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

Cached pools stretch the first gap: `/api/clue-game/pool` allows 60 s fresh plus 600 s stale (`src/app/api/clue-game/pool/route.ts:13`). That is the same old-rows/new-code state, which the kept constants make safe. The cleanup starts only after the owner confirms the prod content build, so no cached pool still holds `artificial` rows by then.

**F4. Signs and witness notes are never hidden; plan 045 hides only guide lines.** Today's code:
- `asked` is the set of dealt *prefixes* (`AnimalSheets.tsx:86`), and only guide lines are filtered by it (`:98-101`).
- Signs (`:89`, `:208`) aren't filtered (plan 045:17: "photo, signs and other lines stay"). Neither are witness notes: `newAnimalRound` calls `witnessNotes` without the deck (`animalBoard.ts:282`).

One sign often answers several questions, so matching one question tag per sign can't catch it:
- Inside an exclusive prefix: `reddish_fur` says yes to `covering:fur`, so it also says no to Scales, Shell, Bare skin and the rest.
- Across prefixes: `fully_aquatic` says no to "Lives on land?" and to Climbs trees; `cold_streams` speaks to Fresh water and Wetlands; `giant_tortoise` to covering and size.
- Some mislead: read plainly, they contradict the holder's own answer. `fully_aquatic` sits on 5 animals (10, 17, 62, 74, 75), and on 10 and 17 the systems include `terrestrial`. Others: `yellow_scales` on 1 (shell), `mane` on 53 (bare skin), `nectar_drinker` on 33 (only meat), `rock_basker` on 11 (night), `coalitions` on 58 (alone), `coastal_dunes` on 14 and 32 (no coast habitat), and `swimmer` on six land-only animals (25, 28, 30, 44, 51, 54).

Counted against the content: 76 of the 198 tags (185 of the 519 uses) answer at least one askable prefix, movement included. 170 of the 437 tagged notes carry one.

Witness notes add two problems:
- A note carrying such a tag hands over the mystery's answer to a dealt question, which only a full order should give. Example: 51's `climber` note, "It can climb trees to stay safe or to hunt."
- "Fits N of 5" counts open tags (`animalBoard.ts:170`), and the audit found those written only where a note needed one. Once the guide shows a movement line from the trait, a `climber` note that "fits 2" could sit beside more guides saying "It climbs trees."

**Fix (build):** one pure module holds each sign's answers. Sign display, witness notes and the content check all use it (§6). Signs that only hint (digging claws, webbed feet, pouch) stay: they are the teaching link.

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

**F12. Pencil weights are fixed by category.** Body is 1 ("seen in the photo"), Habitat 2, Habits 3 (`animalBoard.ts:433`, owner's pick in 054). A movement question in Habits that a player can check from the photo pays 3 per pencil. That's a cost to note, not something to change (§2 gives the owner the alternative).

**F13. On this VPS, local content builds and E2E use the live database** (added in revision).
- `.env.local` points `DATABASE_URL` at `phaser_june` as `postgres`. Its first-line comment ("dev DB copy") is stale.
- `content -- build` and `check` load it (`scripts/connect.ts:8-10`).
- `e2e:fresh` hands `process.env` to `next dev` (`scripts/e2e-fresh.mjs:38`), which reads it too.
- Only CI plays `phaser_june_dev` (`.github/workflows/ci.yml:54-56`, secret `E2E_DATABASE_URL`).

A build mission running the plain commands would hit one of two problems. Either its local E2E plays the old rows (movement never dealt, Farms & towns still dealt), so the new question is never exercised before the PR. Or its content build writes the prod rows, which are the owner's to build. Fix: §8(a).

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

**`travelOf`:** lean yes, for dig only: `digs:yes` replaces `burrower`, and the rest stays. `burrower` stays in content (§6, rule 4), so this is for accuracy, not forced. Measured in the bot, since headings change.

**Pencil weight (owner choice, F12):**
- (a) Climbs in Habits at weight 3. This is the mission's pick, unless the research's `photo_cue` shows most yes-photos showing a tree.
- (b) Climbs in Body at weight 1, which fits 054's "seen in the photo". Its line then moves to the Body section.
- (c) A per-prefix weight override in `PENCIL_WEIGHT`, a one-line change, but it breaks 054's one-weight-per-category rule.

Digs stays in Habits either way.

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
  - `sign_cue` (hint tags, not answering ones)
  - `note_text_cues`: the animal's hand-written notes whose *text* answers the value but carry no answering tag. The build tags them (§6, rule 5).
  - `hard` (y/n, with why), `checked_at`
- **Batches:** 8, grouped by taxon so one researcher judges like animals alike: frogs and salamanders (15, as 2 batches), turtles and tortoises (11), primates, sloths, tree-kangaroo and bat (arboreal), carnivores (11), the diggers (pangolins, echidnas, armadillo, aardvark, golden mole, solenodon, bilby, marmot, pika, wombat, sengi), and the hoofed animals and elephants. Run at most 2–3 subagents at once, because of search rate limits (`CONTENT_SOURCES.md:78`).
- **Coverage script:** prints 76 × 4 rows, no yes or no without a quote and link, and a reason on every no-record.
- **"Hard" animals:** the ones a careful player would get wrong from what still shows while the question is dealt (photo, hint signs, other guide lines, witness notes). The question's own line is hidden then (045).

**5. Balance method.**
- **The patched copy:** `git archive HEAD src scripts db tests package.json tsconfig.json` into `patched/<variant>/`, with `node_modules` symlinked. Each variant = a patch file in `patches/` plus a content overlay. A script writes the researched values (leaving out no-records) into the copy's `db/content/animals/*.json`, never into the repo. The F2 predicate is in the patch. The D variants' patch also carries §6's witness-note rules 2–3 and the `travelOf` change, because both reach the bot through `newAnimalRound`.
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
  - witness notes per round before and after rule 2, and signs shown per suspect while their prefix is dealt (median; §6 rule 1)
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
- `tag`, `uses`, `holders`, `note_categories` (counts)
- `category`, and the `rule` that set it
- `answers`: the askable prefixes its words settle, each with why
- `restates`: the one question tag it means exactly, or empty
- `misleads`: holders whose own answer the plain reading contradicts. These are content notes for the audit's part 3, not fixed here.

How a tag's category is set:
1. The majority of its notes' categories, via the table above.
2. If tied, what the sign names: a body part → Body; an act or food → Habits; surroundings → Habitat; a named place → Range; eggs or young → Life cycle.

The result is **one fixed category per tag**, so the same chip looks the same on every suspect. Today's draft: Body 87, Habits 70, Habitat 23, Life cycle 18; 2 ties (`leaf_litter`, `one_island`). **Witness-note marks:** a note shows one mark per distinct category of its tags, in guide order. About 424 of the 437 tagged notes get one mark and 13 get two (e.g. `long_tail` + `climber`, Body and Habits, on 24 and 59); none gets three.

**What a sign answers.** A sign answers a prefix when a careful grade 6–12 reader would take an answer to *any* question of that prefix from the sign's words alone: a yes, a no by exclusion, or a wrong answer (a misleading sign).
- The data is per prefix, the same granularity 045 already uses for guide lines (`asked`).
- One entry `covering` on `reddish_fur` covers its yes to Fur and its no to Scales, Shell and the rest.
- A cross-prefix sign lists several prefixes.
- When in doubt, it answers: hiding a chip for one round costs little, while a leak costs the round's fairness.

The draft below comes from the content; the CSV confirms each row with its reason.

| Prefix | Tags whose words answer it |
|---|---|
| covering | algae_fur, black_coat, cub_mane, flat_shell, furry_feet, giant_frog, giant_tortoise, giant_turtle, hair_like_frills, hinged_shell, mane, patchy_coat, reddish_fur, saddleback_shell, shell_spines, skin_folds, spiky_shell, sticky_skin, yellow_scales |
| size | giant_frog, giant_tortoise, giant_turtle |
| diet | ambush_hunter, bamboo_eater, bromeliad_eater, cecropia_leaves, eats_lichen, fish_eater, fruit_eater, grazer, leaf_eater, nectar_drinker, pack_hunter, raids_termite_mounds, rodent_hunter, scavenger, seed_spreader |
| activity | basker, rock_basker |
| social | coalitions, pack_hunter, shares_food |
| system | big_rivers, brackish_water, cold_streams, eggs_on_land, eggs_over_water, fast_streams, feathery_gills, flippers, forest_streams, fully_aquatic, sandy_bottoms, seasonal_streams, shallow_wetlands, snorkel_nose, swimmer, underwater_breathing |
| habitat | bamboo_forest, big_rivers, brackish_water, coastal_dunes, cold_streams, crevice_hider, fast_streams, forest_floor, forest_streams, kopjes, leaf_litter, mountain_meadows, prairie_dog_towns, sandy_bottoms, seasonal_streams, shallow_wetlands, spiny_forest |
| birth | egg_guarding, eggs_on_land, eggs_over_water, foam_nest, internal_fertilization, no_tadpoles, sucker_mouth_tadpoles |
| climbs (new) | climber (restates `climbs:yes`), forest_floor, fully_aquatic, glider, hangs_upside_down, tree_dweller |
| digs (new) | burrower (restates `digs:yes`), borrowed_burrows, buries_itself, sand_swimmer |
| swims (only if shipped) | swimmer (restates `swims:yes`), flippers, fully_aquatic, sand_swimmer, snorkel_nose, underwater_breathing |
| region, young, lifespan | none |

Totals: 76 of 198 tags, 185 of 519 uses.
- `town_dweller` answered only Farms & towns, so it answers nothing once that question is gone.
- If "Lives in trees" ships instead, `tree_dweller` restates it and `climber` answers it.
- The other 122 tags only hint, and they always show. Examples: `digging_claws`, `webbed_feet`, `long_arms`, and `pouch`, which the echidnas (27, 67) share with the marsupials.

**Leak rules (build):**
1. A sign is hidden while any dealt question's prefix is in its `answers`. This extends 045's rule to signs at the same granularity. It covers today's questions as well as the new ones, and it changes 045's "signs stay", so the doc lists the hidden tags as an owner choice.
2. A witness note is skipped when any of its tags is hidden by rule 1, because it would hand over the mystery's answer to a dealt question.
3. For a tag with `restates`, a suspect fits when its guide records that trait tag (`book.traits`), not when it holds the open tag. That way "fits N" agrees with the movement lines the guide shows while the question isn't dealt. Other tags count as today.
4. A holder of a restating tag must hold the trait it restates (`climber` ⇒ `climbs:yes`). Where the research says otherwise (likely 4 and 15, which climb rocks), the build retags that note to what it says, e.g. `rock_climber`, which answers `climbs`. No tag is dropped from content, so no witness note loses its tags. That matters: 37 notes carry only movement tags (`climber`, `burrower`, `tree_dweller`, `swimmer`, `glider`, `fully_aquatic`).
5. Notes whose text answers a movement value without an answering tag (`note_text_cues`, §4) get one in the build, so rules 1–2 catch them. Today's prefixes have the same text-only gap; the doc lists it as a content note for the audit's part 3.
6. Misleading signs (F4) are hidden exactly when they could mislead (rule 1). The build doesn't fix them; the doc lists them for the audit's part 3.

**Where it lives:** one pure module, `src/clueGame/signs.ts`, holding:
- `SIGNS: Record<string, { category: ChargeCategory; answers?: readonly string[]; restates?: string }>`, one entry per open tag. A `restates` tag's prefix is also in `answers`.
- `signPhrase` and `signsOf(tags, asked)`, moved from `clueFaces.ts:33-37` and filtered by rule 1. `clueFaces.ts` keeps faces only.
- `answersAsked(tag, asked)`: the query behind rule 1, which rule 2 reuses.
- `signProblems(...)`: flags an open tag missing from `SIGNS`, an `answers` entry that isn't an askable prefix (`PREFIX_CATEGORY`), and a rule-4 break.

Its callers:
- `checkProfile` (`profiles.ts`) adds `signProblems`, so a new animal's new tag fails fast.
- `GuideSigns` gets `signsOf(animal.tags, asked)`, reusing `asked` (`AnimalSheets.tsx:86`).
- `witnessNotes` takes the dealt prefixes and applies rules 2–3. `newAnimalRound` already holds the deck (`animalBoard.ts:277,282`).
- The link UI reads `category` for its marks.
- The existing witness-fits unit test (`tests/clueGame/animalBoard.test.ts:72-81`) follows rule 3.

**7. Mockups.** Three options. Each shows one suspect's signs, field guide and "Its answers", with one cell scouted.
- **Option 1, category marks:** one lucide icon plus the category word on sign chips, guide headings, answer rows, order tiles and witness notes. No new colour.
- **Option 2, signs inside the guide:** chips move into the field guide's category rows, and "Its answers" is grouped under the same headings. The structure itself is the cue: no paging, but a longer sheet.
- **Option 3, gems coloured by category again:** 043's `GEM_OF`. A rules change: decks would need four distinct categories (cost measured in §5), five data colours in both modes would have to pass the contrast check in `npm run lint`, and icons are still needed so colour isn't the only cue.

"Tap a sign to see its note" becomes "tap a sign to scroll to its category in the guide", because of F6. Highlighting which suspects fit a witness note is rejected: plan 044 makes that the player's job.

**Lean: option 1.** Smallest layout change, works with `GuideSigns` paging, no theme gap.

**How they're made:** a throwaway copy of the whole tree minus `node_modules`. §5's subset isn't enough: `next dev` also needs `next.config.*`, `public/`, the PostCSS and ESLint configs, and `src/styles`. The copy is made with `git archive HEAD`, with `node_modules` and `.env.local` symlinked, not copied. The option is picked by a query parameter in the copy. The researched trait is injected at `animalsFromPool` in the copy, so a movement question can be dealt. The dev server runs on a free port in 3100–3102 (`ss -ltn` first). The copy must not finish a round, which would make `POST /solves` write to the live DB, so it blocks that POST.

**Screenshots:**
- 390×844, light and dark, saved as PNG.
- Taken with Playwright's Chromium through `chrome-nosandbox.sh`, driven by the repo's CDP helper (`scripts/cdp.mjs`). The Playwright library isn't installed here.
- Fallback: static HTML using `globals.css` tokens.

One `graphical-audit` pass against GUI.md. Photo credits stay visible in the PNGs.

**8. Build brief.** Sections from `/srv/critter-ai/ops/templates/mission-brief.md`: Goal, Why, Scope, Definition of done, Decision rules, Notes. It holds two briefs, in order:
- **(a) Build, plan `055`, about 25 sessions, well under 60:**
  - code from §2 (D) and F2
  - `src/clueGame/signs.ts` with the tag table and leak rules 1–4 (§6), the note retags (rules 4–5), and the chosen link UI
  - `travelOf` per the decision
  - movement values for all 76 animals, from `research/moves.csv`
  - F&T content removed (constants kept)
  - the `CONTENT_SOURCES.md` rules
  - `ANIMAL_RULES.version` `054-1` → `055-0`
  - the bot rerun, with numbers recorded in plan 055
  - optionally, a site shots refresh

  Checks: `typecheck`, `lint`, `npm test` (the content test), `content -- preview` (none of these touch the database), then the database checks below, at final verification, just before the PR.

  **Dev database only, never `.env.local` (F13).** Both loaders keep a variable that's already in the environment: dotenv without `override` (`scripts/connect.ts:8`), and `@next/env`, which skips keys already set. So the brief has the build export the dev copy's settings for these commands instead of editing `.env.local`:
  ```
  ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a
    [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1
    npm run content -- build && npm run content -- check \
      && E2E_SEED=<n> E2E_PLACE=<key> CHROME_PATH=<no-sandbox wrapper> npm run e2e:fresh )
  ```
  - The file (mode 600, outside git) holds `DATABASE_URL` for `critter_dev` on `phaser_june_dev`, plus Clerk's dev-instance keys, the same set as CI (`docs/DATABASE_ACCESS.md:181-200`).
  - The brief names the path only, never a value.
  - The build never runs `content -- build`, `content -- check` or `e2e:fresh` without this override. The guard line stops the step on any other database.
  - The build also fixes `DATABASE_ACCESS.md:202-203`, which still says the dev password lives only in the VPS `.env.local`.

  **Proof the movement question is dealt.**
  - In `report.json`, the check "round N: the evidence grid has a row per suspect and a column per clue" stores the grid's column tags in its detail (`scripts/e2e.mjs:378-383`).
  - The build passes when, in this dev-copy run, that check passes on a round whose columns include `climbs:yes` or `digs:yes`, and every other check passes too.
  - The seed comes from a short probe: the dev server on the dev copy, `?seed=N&place=<key>`, reading `window.__cc.clue().orders` through `scripts/cdp.mjs`. Plan 055 records the seed with the exact command.
  - CI then plays seed 7 on the same rows.

  **Prod:** the build never builds content against `phaser_june`. The prod content build stays the owner's, from WSL, after a successful deploy, as a handoff item (F3).

  **Accepted risk, cosmetic:** from the dev build until merge, other branches' CI plays the new rows with old code. Old code doesn't reserve `climbs` or `digs`, so the generated lines become witness notes ("It climbs trees."). `signsOf` drops colon tags, so no new sign shows. The dev copy losing its F&T rows is harmless to old code.
- **(b) F&T cleanup, 1 session, started once the owner confirms the prod content build** (so at least 11 minutes after it, past the pool cache, F3): delete the F3 constants, and 🏡 is free again.

**9. Risks and failure modes.**
- Silence taken as no gives unfair nos. Mitigation: the evidence rule plus the coverage script.
- Sources disagree: no record, with both reported.
- Many no-records: the question is rarely dealt (F1), and §5 measures it.
- Leaks through signs or witness notes that answer a dealt prefix, including by exclusion and across prefixes (F4; §6 rules 1–2). Text-only leaks in notes without an answering tag: closed for movement (rule 5), listed for the rest.
- The deploy-before-content gap, both ways, including cached pools (F3).
- Local checks reading or writing the live DB (F13; §8(a) override and guard).
- Silent ❓ face collisions (F9).
- Pencil weight 3 on a question a player can check in the photo (F12; owner choice in §2).
- Restating tags against the new traits: kept and checked (rules 3–4), retagged where the research disagrees; `travelOf` changes (F11).
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
- **Exact-tag sign hiding (one question tag per sign):** misses answers by exclusion and across prefixes (F4, Astra).
- **Per-question answers with exclusive-prefix expansion:** finer than 045's per-prefix rule for guide lines, with more data and logic, to save a chip for one round.
- **Keeping a witness note whose tag answers a dealt prefix, with fits taken from the trait** (Fable SC1, for that case): it hands over the mystery's answer to a dealt question. Fits from the trait is kept for questions that aren't dealt (rule 3).
- **Dropping restating tags from content:** 37 notes carry only movement tags and would stop being witness notes.
- **`checkProfile` failing on misleading signs:** it would pull the audit's part-3 content edits into the build, and rule 1 already makes those signs harmless in play.
- **Pointing `.env.local` at the dev copy for the build:** it overrides the owner's 2026-11-01 setup for every later session in the worktree, and a forgotten revert sends later work to the wrong DB. A per-command export plus a guard does the job.

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

Architect, 2026-11-07, on `b5cfbe38`. Every cited line was re-checked.

MUST-FIX:
- **Fable 1 = Astra 1 (dev DB isolation):**
  - New F13 checks the facts: `.env.local` holds `phaser_june` as `postgres`, with a stale comment; `connect.ts:8-10`; `e2e-fresh.mjs:38`; `ci.yml:54-56`.
  - §8(a) now requires an exported override from the dev-copy secrets file (path only), with a `current_database()` guard, for `content -- build`, `check` and `e2e:fresh`. This works because dotenv and `@next/env` both keep pre-set variables.
  - The proof that the movement question is dealt is the e2e grid check's stored columns (`e2e.mjs:378-383`), showing `climbs:yes` or `digs:yes` on a probed seed.
  - The prod content build stays the owner's.
- **Astra 2 (cross-prefix sign suppression):**
  - F4 is rewritten with real cases: exclusion, cross-prefix and misleading signs. Counts: 76 of 198 tags answer something; 170 of 437 notes carry one.
  - §6 defines `answers` per prefix, at 045's granularity, with the concrete prefix → tags table from the content.
  - Rules 1–6 cover signs, witness-note skipping, fits from the trait for restating tags, the restates check, text-only cues, and misleading signs.
  - One pure module, `src/clueGame/signs.ts`, is shared by `checkProfile`, `GuideSigns` and `witnessNotes`.

MISSED (Fable):
- `fully_aquatic` on 5 animals, with 10 and 17 as content notes: F4 and §6 `misleads`.
- §7's app copy is now the whole tree minus `node_modules`, with the configs named.

SHOULD-CONSIDER:
- Fable 1 (keep notes, fits from the trait): partly adopted. Fits come from the trait for questions that aren't dealt (rule 3). Rejected for dealt prefixes, because it would give away the mystery's answer.
- Fable 2 (name the `:no` sentinel): adopted in F2. The reject is already covered by the reserved-tag check.
- Fable 3 (note text answers without a tag): adopted. `note_text_cues` in §4; rule 5 for movement; listed for the rest.
- Fable 4 (pencil weight alternative): offered to the owner in §2, options (a)–(c).
- Fable 5 (CI risk is cosmetic): adopted in §8(a).
- Astra 1 (one pure sign module): adopted (§6).
- Astra 2 (marks on mixed-category notes): adopted. One mark per category; 13 notes get two (§6).
- Astra 3 (witness filter and `travelOf` in the sims): adopted (§5 patch and metrics).
- Astra 4 (cached pools): adopted. F3 notes the 60 s + 600 s window, and §8(b) starts after it.

## Steps

Shared for every step:
- `REPO=/srv/critter-ai/worktrees/moves-and-signs-design`, `STATE=/srv/critter-ai/agent-state/missions/moves-and-signs-design`, `AUDIT=/srv/critter-ai/agent-state/missions/clue-audit` (read-only, never write there). `DOC=docs/research/2026-11-07-moves-and-signs.md`, `IMG=docs/research/2026-11-07-moves-and-signs/`, `BRIEF=plans/2026-11-07-moves-and-signs-build-brief.md`.
- State layout (§1): `STATE/tools/` our scripts; `research/`, `out/`, `deals/`, `bot/`, `patches/`, `patched/`, `mockups/`. New downloads go to `STATE/sources/<key>/<id>.*`: untrusted, never executed, Python with `-I`.
- Repo changes only: this plan, `BRIEF`, `DOC`, `IMG/*.png`, `IMG/sign-map.csv`. Nothing under `src/ db/ scripts/ public/` or the site. Copies never write back.
- No step writes to any database. Read the live DB only when a fact is only there, lightly. Never print `DATABASE_URL` or any connection string (H9). Never run `content -- build|check` here.
- Heavy jobs (bot, deals, `next dev`, Chrome) run one at a time. Research subagents: at most 3 at once (`CONTENT_SOURCES.md:78`).
- Disk: at most two E2E/screenshot folders in `STATE`: `baseline-e2e/` (or S1's re-run, which replaces it) and `mockups/shots/` (overwritten each shoot). The final `final-e2e/`, if Verification 6 runs one, replaces `mockups/shots/`. Delete `patched/*` after S12 and `mockups/app/.next*` after S15. Patches and overlays stay, so any copy can be rebuilt.
- Every session ends with:
  1. the step's **Check**;
  2. `npm run typecheck && npm run lint` (~16 s; no code changes, so both must exit 0);
  3. `STATE/tools/paths.sh` (written in S1), which prints nothing:
     ```
     git -C $REPO diff --name-only origin/main...HEAD | grep -vE '^(plans/2026-11-07-moves-and-signs-(design|build-brief)\.md|docs/research/2026-11-07-moves-and-signs(\.md|/[a-z0-9-]+\.png|/sign-map\.csv))$'
     rg -n "postgres(ql)?://" $REPO/plans $REPO/docs/research
     ```
  4. check the step off, add one Log line (UTC, counts, check result), commit, push. `git status --porcelain` is empty afterwards; if `next dev` touched `AGENTS.md` or `next-env.d.ts`, `git restore` them.
- Write each tool only after reading its group under Failure modes; it must catch every case listed there.

- [x] S1 · Freshness and research setup.
  - `git fetch origin --prune`.
    - If `origin/main` has moved past `69f45fa6`: rebase, then `git push --force-with-lease` (the brief asks for the rebase). Read the new plans (`055`+). Run `git diff --stat 69f45fa6 origin/main -- src db scripts tests` and re-check the F1–F13 line refs in the touched files. Record what moved under Decisions. If game code moved, run `CHROME_PATH=$STATE/chrome-nosandbox.sh npm run e2e:fresh` once into `STATE/s1-e2e/`, which replaces `baseline-e2e/`.
    - If it hasn't moved, Baseline's 4 rounds on `69f45fa6` count as the played round.
  - `research/rules.md` (§4 "rules first"):
    - the written rule for `climbs_trees`, `lives_in_trees` (a subset of Climbs), `digs_burrows` and `swims` (strict), from §2;
    - the evidence rule (yes: a quote says so; no: a quote of how it lives rules it out; silence: no record; disagreement: both quotes, no record);
    - §4's source order;
    - 2 worked edge cases per value: rocks (4, 15), digging for food (52), `borrowed_burrows`, river crossings (25), multi-movers (51, 73).
    - Frozen once S4 starts. A later change means re-judging the batches already done, recorded under Decisions.
  - `research/moves.csv` header: §4's columns plus `reason` (needed on every no-record, per §4's coverage rule): `animal_id,animal,value,verdict,quote,url,source_key,tier,quote2,url2,tier2,disagree,reason,photo_cue,guide_cue,sign_cue,note_text_cues,hard,checked_at`. `url` is the public page (`redList.url`, the ADW account), even when read from a cache.
  - `tools/moves.py`:
    - `upsert <batch.csv>`, keyed on `animal_id,value`, writing with the `csv` module;
    - `coverage [ids]`: rows per id × 4 values; fails on a yes/no without a quote and an http `url`, a no-record without `reason`, `disagree=y` without both quotes or with a verdict other than no-record, unknown enum values, and `lives_in_trees=yes` with `climbs_trees` not yes.
  - `tools/quotes.py [ids]`: finds every `quote`/`quote2` verbatim in a cached page for that animal (`AUDIT/sources/<key>/<id>.*` or `STATE/sources/<key>/<id>.*`), with HTML stripped and whitespace and quote marks normalised. Lists the misses.
  - `research/inventory.md`: one block per animal from HEAD, adapted from a copy of `AUDIT/audit/inventory.ts`. Each block holds:
    - guide lines by section;
    - signs (tag → phrase);
    - hand-written notes with category and tags;
    - today's `travelOf`;
    - the photo url and credit.
  - Photo sheets:
    - reuse `AUDIT/sources/photos*` and fetch the rest from `profile.photo.url` into `STATE/sources/photos/<id>.jpg`;
    - one HTML grid per batch (S4–S8 ids; id and name under each photo, tiles ≥300 px) → `research/photos/sheet-s<n>.png`, via `chrome-nosandbox.sh --headless --screenshot`;
    - 19 and 47 have no photo (`photo_cue=neutral`, said in the row).
  - `tools/paths.sh` (the shared check above).
  - **Check:**
    - `moves.py coverage` on the empty CSV reports 304 missing and exits non-zero;
    - `inventory.md` has 76 blocks;
    - the 5 sheets open (view each) and show 74 photos, with 19 and 47 marked "none";
    - the S4–S8 id lists join to exactly 1–76.

- [x] S2 · Patched-copy harness, with deals and the bot for `base` and `no-ft`.
  - `tools/copy.sh <variant>`:
    - `git archive HEAD src scripts db tests package.json tsconfig.json` into `patched/<variant>/`, with `node_modules` symlinked;
    - applies `patches/<variant>.patch`, then `tools/overlay.mjs <variant>` (content edits to the copy's `db/content/animals/*.json` only);
    - writes `patched/<variant>/STAMP` (HEAD sha, patch sha256);
    - refuses any target inside `REPO`.
  - `base`: an empty patch. `no-ft` overlay: drop `artificial` and its kinds from the 20 holders (2, 6, 7, 11, 13, 23, 24, 25, 28, 32, 48, 49, 51, 52, 54, 58, 59, 72, 73, 74). The constants stay (§3).
  - `tools/deals.ts`: an adapted copy of `AUDIT/audit/deals.ts`, not an import. It covers the world and every continent with ≥ `MIN_PLACE_ANIMALS` (12), every seed, `pickSuspectSet` then `dealClues`, with this tree's `ANIMAL_RULES`. Output `deals/<variant>.json|md`, with the command and STAMP at the top. Metrics now:
    - seeds with a set;
    - each tag's deal share;
    - sets and decks changed against `base`;
    - pairs only F&T separates;
    - decks with two clues of one category.

    S11 adds the sign-map metrics.
  - Bot in each copy: `node scripts/run-typescript.mjs scripts/balance-044.ts --rounds 400 --seed 44 --places africa,asia,north-america,south-america` → `bot/<variant>.txt`, with the command and STAMP on line 1. About 8 min per run.
  - **Check:**
    - both copies: `tsc --noEmit` exits 0 and `node scripts/run-tests.mjs` passes;
    - `diff -r` of the `no-ft` copy's content against `REPO/db/content` shows exactly the 20 files, `habitats` only, and no `artificial` left;
    - `base`'s F&T deal share and lost seeds match `AUDIT/out/s2-deals.json`, or `git log 094da493..HEAD -- src/clueGame db/content` explains each difference;
    - `git -C $REPO status --porcelain` is empty.

- [x] S3 · Sign map: note categories, all 198 tags, answers (§6).
  - `out/note-categories.csv`: the 12 categories with their counts, the question category from §6's table, and whether the category can feed signs (F6: tagged clues, never facts).
  - `out/sign-map.csv`, one row per open tag, with §6's columns `tag,uses,holders,note_categories,category,rule,answers,restates,misleads`:
    - `answers` is a list of `prefix: why`. It is judged against the prefixes askable after −F&T, plus `climbs`, `digs`, `swims` and C's `trees`;
    - `tools/signmap.py build` fills `uses`, `holders`, `note_categories` and the rule-1 category from content;
    - the judgment columns (`answers`, `restates`, `misleads`, the 2 ties) come from reading each tag's notes in `inventory.md`. Start from §6's draft table and record every change from it, with the reason;
    - when in doubt, a tag answers (§6).
  - `out/witness-marks.csv`: each tagged note's distinct categories, in guide order.
  - **Check:** `tools/signmap.py check` exits 0:
    - every content tag exactly once (198), and `uses` over them summing to 519. The only other rows allowed are new tags named in `out/retags.csv` (S9 on; `rule` = `new (retag)`);
    - every `category` one of Body/Habits/Habitat/Range/Life cycle;
    - every `answers` prefix askable, and each `restates` tag's prefix in its own `answers`;
    - `town_dweller` answers nothing;
    - 12 note categories summing to 1027;
    - the answering-tag counts printed beside §6's 76 tags / 185 uses, and the mark counts beside about 424 / 13 / 0, with every difference listed.

Research batches S4–S8, shared:
- Each step runs 2–3 parallel subagents, one per taxon group. Each gets:
  - `rules.md`;
  - its ids' `inventory.md` blocks and photo sheet;
  - `out/sign-map.csv`, to tell hint tags (`sign_cue`) from answering ones;
  - §4's source order: `AUDIT/sources/iucn/<id>.pdf.txt` and `.details.txt` and `AUDIT/sources/adw/<id>.html` first; then the profile's cited pages and the other tier-2/3 keys in `db/content/sources.json`; Wikipedia last, checking its cited source. Routes: `CONTENT_SOURCES.md` "Research access".
- Every new fetch is saved under `STATE/sources/<key>/<id>.*`, so `quotes.py` can check it.
- Output `research/batch-s<n>-<group>.csv`: 4 rows per animal, every §4 column filled, `checked_at` in UTC.
- The session reviews it, then runs `moves.py upsert`. If search limits stop a group, upsert what's done and split the rest into a new step before S9.
- **Check (each):**
  - `moves.py coverage <ids>` exits 0, and `quotes.py <ids>` has 0 misses;
  - the session re-reads 3 random yes/no quotes per group against the page, and every `hard=y` reason;
  - the Log line gives yes/no/no-record counts per value.

- [x] S4 · Research, amphibians (15): frogs 3, 5, 6, 7, 8, 9, 10, 11 | frogs 13, 14, 16, 76 and salamanders 62, 74, 75. Two groups. AmphibiaWeb blocks bots, so use IUCN and ADW, and no record where they can't settle it.
- [x] S5 · Research, turtles and tortoises (11): 1, 2, 4, 12, 15, 17, 18, 19, 20, 21, 22 | tree animals (9): primates 23, 34, 40, 56, 61; sloths 30, 54; tree-kangaroo 43; flying fox 45. Two groups. Rock climbing (4, 15) follows the Climbs rule.
- [x] S6 · Research, carnivores (12): 25, 26, 33, 35, 48 (Tasmanian devil, judged here), 51, 58, 60, 65, 71, 72, 73. Two groups (cats and dogs | the rest). ADW keywords miss swimming (the tiger, F10): read the text.
- [x] S7 · Research, diggers (16): pangolins 24, 55, 59, 63; echidnas 27, 67; 31, 32, 36, 37, 42, 46, 47, 49, 52, 57. Two or three groups. The giant anteater (52) and `borrowed_burrows` sit on the Digs rule's edge.
- [x] S8 · Research, hoofed animals and elephants (13): 28, 29, 38, 39, 41, 44, 50, 53, 64, 66, 68, 69, 70. Two groups. Swims is strict here (elephants, tapirs, rhinos).

- [x] S9 · Research consolidation (all 76).
  - Run `moves.py coverage` and `quotes.py` over 1–76.
  - Consistency pass: per value, read all yes and no rows side by side; like animals judged unlike get fixed or explained (4 against 15 on rocks; 28/41/64 on Swims).
  - `research/summary.md`:
    - counts per value;
    - the disagreements, with both quotes;
    - the `hard` list, with why;
    - the `photo_cue` tally on Climbs-yes and Lives-in-trees-yes animals (it decides the Lives-in-trees fallback and pencil option (a) or (b), §2);
    - the text-only cues found on today's prefixes, as content notes for the audit's part 3.
  - `out/retags.csv` (rule 4): every holder of `climber`, `burrower`, `tree_dweller`, `swimmer`, `glider` or `fully_aquatic` checked against its researched value. A conflict gets a row: animal, note, old tag, new tag (e.g. `rock_climber`), why. A new tag also gets a `sign-map.csv` row.
  - `out/note-tags.csv` (rule 5): the `note_text_cues` notes, with the answering tag the build adds.
  - Decisions: Climbs or Lives in trees; the pencil option; which values S10 patches.
  - **Check:**
    - coverage exits 0 on 304 rows, and quotes has 0 misses;
    - every restating-tag holder is listed as consistent or has a `retags.csv` row;
    - `signmap.py check` still exits 0.

- [x] S10 · Movement patches and overlays.
  - `patches/move-d.patch`, the §2 D build in miniature:
    - `climbs` and `digs` in `EXCLUSIVE_PREFIXES`, the `no` constant, and F2's never-ask predicate in `fullTable` and `questionsFor`;
    - `PREFIX_CATEGORY` keys after `social` (F8);
    - `QUESTION_TEXT`, `SHORT_TEXT` and `COLUMN_LABEL` for the `:yes` tags only;
    - one unique, non-animal face per new tag (F9);
    - in `profiles.ts`: the `traits` type, the yes and no lines, the `trait()` calls, `TRAIT_VALUES`;
    - a throwaway `src/clueGame/signs.ts`, generated from `out/sign-map.csv`, with `answersAsked`;
    - witness rules 2–3 in `witnessNotes`, with the dealt prefixes passed from `newAnimalRound`;
    - `travelOf` reading dig from `digs:yes`.
  - The other patches:
    - `move-d-swims.patch` adds `swims`;
    - `move-d-notravel.patch` is D without the `travelOf` change;
    - `move-c.patch` adds one `trees:yes|no` prefix with the same wiring.
  - Overlays:
    - `no-ft`, plus the researched values from `moves.csv` as `Sourced` traits (value, note = quote, source, url), with no-records left out;
    - for D variants, also `retags.csv` and `note-tags.csv`.
  - `tools/probe.ts`: over every place and seed it asserts that no dealt tag ends `:no`, that `clueFace` is never ❓ on an askable tag, and that `QUESTION_PREFIXES` puts the new keys after `social`.
  - **Check:**
    - every copy: `tsc --noEmit` exits 0, and `run-tests.mjs` passes, except the witness-fits test that rule 3 changes (`tests/clueGame/animalBoard.test.ts:72-81`), explained;
    - the D copy's `npm run content -- preview Jaguar` (no DB) shows the Climbs line in Habits;
    - `probe.ts` exits 0 on every variant;
    - the overlay's trait count equals the yes+no count in `moves.csv`;
    - `REPO` is clean.

- [x] S11 · Deal runs, all variants (§5).
  - `tools/deals.ts` gains the rest of §5's metrics:
    - witness notes per round with and without rule 2;
    - median signs shown per suspect while their prefix is dealt (rule 1);
    - Swims rows equal to `system:freshwater`'s (share of sets);
    - sets where a new question isn't dealt because a suspect has no record;
    - pairs in a dealt deck that only the new clue separates, and pairs only it separates in the whole table.
  - Run `base`, `no-ft`, `move-c`, `move-d` and `move-d-swims` → `deals/*.json|md`. `deals/metrics.md` has one table per metric, with variants as columns and rounds gained or lost against `no-ft`.
  - Decisions: keep or drop Swims, with the numbers (§2 lean: drop unless it splits sets Fresh water and Sea don't).
  - **Check:**
    - every place × variant has every metric;
    - `base` and `no-ft` match S2;
    - a place whose seeds-with-a-set count falls is flagged in `metrics.md`.

- [x] S12 · Bot runs and `travelOf`.
  - S2's command in `move-c`, `move-d`, `move-d-notravel` and `move-d-swims` (the last only if S11 keeps Swims).
  - Then with `--knows size,covering,climbs` on `move-d`, and `--knows size,covering,trees` on `move-c`.
  - One Climbs-in-Body run, only if S9 picked pencil option (b).
  - Each → `bot/<variant>[-knows].txt`, with the command and STAMP on line 1.
  - `bot/summary.md`: the careful, novice, expert and reader rows (find rate, moves left) per variant against `no-ft`; `move-d` against `move-d-notravel` for `travelOf`, with the decision under Decisions.
  - Then delete `patched/*`.
  - **Check:** every planned run is present, exited 0, and covers all 4 places.

- [x] S13 · Mockup harness, today's sheet and option 1.
  - `mockups/app/`:
    - `git archive HEAD` of the whole tree, with `node_modules` and `.env.local` symlinked;
    - apply the picked D (or C) patch;
    - inject the researched traits at `animalsFromPool` (§7; the pool comes from the live DB);
    - make `POST /api/clue-game/solves` return early before any DB call;
    - pick the option with `?mock=0|1|2|3`, where 0 is today's UI.
  - Pick the suspect: signs in ≥3 categories, a Climbs or Digs value, and a photo with a credit. Probe a `?seed=&place=` where it's a suspect and a movement question is dealt, reading `window.__cc.clue().orders` through `scripts/cdp.mjs`. Record it in `mockups/README.md`, with every command.
  - `tools/shoot.mjs` (CDP, `CHROME_PATH=$STATE/chrome-nosandbox.sh`): 390 px wide at DPR 2, light and dark (`data-theme`), the suspect sheet open with one cell scouted, at full sheet height → `mockups/shots/<name>-<mode>.png`. It never finishes a round.
  - Option 1 (§7):
    - an icon and the category word on sign chips, guide headings, answer rows, order tiles and witness notes;
    - tapping a sign scrolls to its category in the guide;
    - no new colour.
  - The dev server runs on a free port in 3100–3102 (`ss -ltn` first) and stops at session end.
  - **Check:**
    - `today-*` and `option-1-*` (light and dark) open (view each): signs, guide, "Its answers" and a scouted question, at 390 px, dark really dark, credit visible;
    - the server log shows the solves block answering, never a DB write;
    - `REPO` is clean.

- [x] S14 · Mockups, options 2 and 3.
  - Option 2: the chips sit inside the guide's category rows, and "Its answers" is grouped under the same headings.
  - Option 3:
    - gems coloured by category (043's `GEM_OF`), with icons kept;
    - a deck rule of four distinct categories, in the copy;
    - five data colours in both modes from existing tokens, with any gap named per `GUI.md`;
    - run the copy's `node scripts/check-theme.mjs` and record the contrast result, with S11's two-clues-one-category share, as the option's cost.
  - **Check:** the `option-2-*` and `option-3-*` PNGs open and show the same suspect and scouted cell as option 1; the cost numbers are in `mockups/README.md`.

- [x] S15 · One `graphical-audit` pass, and its fixes.
  - Run `.agents/skills/graphical-audit/` once over the copy's mockup diff, against `GUI.md`, `gui/theme-contract.md` and `gui/foundations.md`, in audit-and-fix scope. The report, in the skill's format, goes to `mockups/audit.md`.
  - Fix confirmed drift in the copy, then reshoot all 8.
  - Copy them to `IMG` as `{today,option-1,option-2,option-3}-{light,dark}.png`.
  - Delete `mockups/app/.next*`.
  - **Check:**
    - 8 valid PNGs in `IMG`, 780 px wide (IHDR via `python3 -I`), each under 1 MB;
    - every finding in `audit.md` is fixed or listed as a gap or an intentional exception, with the reason;
    - no second pass.

- [x] S16 · Design doc, sections 2 and 3.
  - Headings: `## 1. Summary`, `## 2. Movement clue`, `## 3. The 76 animals`, `## 4. Signs and categories`, `## 5. What the build changes`, `## Method and coverage`.
  - §2:
    - options A–D, each with its values, written rules (`rules.md`), and kept/merged/dropped with why (walks, gallops, crawls, hops, glides);
    - how a player deduces each;
    - engine fit: prefix kind, `traits.ts`, `PREFIX_CATEGORY`, texts, faces, guide lines, `travelOf`, overlap of Swims with Fresh water, pencil weight (a)–(c);
    - balance numbers from `deals/metrics.md` and `bot/summary.md`, naming the files;
    - the recommendation.
  - §3: `tools/table.py` writes it from `moves.csv`. One row per animal:
    - the values under the recommended option;
    - the quote and link;
    - how a player can tell (photo, guide, signs);
    - hard ones marked; no-records with their reason.

    Then a short list of the hard ones.
  - Plain language for the owner.
  - **Check:**
    - §3 has 76 rows, ids 1–76 once each;
    - every http link in §3 is a `url`/`url2` in `moves.csv`;
    - 5 numbers in §2, spot-checked, trace to their file.

- [x] S17 · Design doc: sections 4, 5, method and coverage, and the summary.
  - §4:
    - the note-category table, and a summary of the tag mapping. Copy `out/sign-map.csv` to `IMG/sign-map.csv` and link it;
    - the retag and note-tag tables (`out/retags.csv`, `out/note-tags.csv`), in full, so the build has them in git;
    - the three mockups, light and dark side by side, each with its trade-offs: readability for grades 6–12, colour never the only cue, fit beside the photo and paging, leaks;
    - leak rules 1–6, with the tags hidden per prefix (an owner choice against 045's "signs stay");
    - misleading signs and text-only cues, as content notes for the audit's part 3;
    - the recommendation.
  - §5: the build's files and size, from §8, F&T removal included (content in 20 files, constants kept until the cleanup brief).
  - Method and coverage:
    - the routes used;
    - no-record counts and why;
    - what couldn't be checked, and why;
    - the evidence paths in `STATE`.
  - §1 Summary: the recommended movement clue and link option, then each owner choice with the mission's pick: option, Swims, Climbs or Lives in trees, pencil weight, hiding signs during play, link option, `travelOf`, shots refresh.
  - **Check:**
    - the 6 headings are present;
    - `tools/links.py $DOC`: every relative link and image resolves;
    - `IMG/sign-map.csv` parses with the same row count as `out/sign-map.csv` (198, plus any new retag tags);
    - every Summary choice has a pick.

- [x] S18 · Build brief(s), in `BRIEF`.
  - Two briefs in order (§8), each with the template's headings (`/srv/critter-ai/ops/templates/mission-brief.md`): Goal, Why, Scope, Definition of done, Decision rules, Notes.
    - **A. Build**: slug `moves-and-signs-build`, plan `055` or the next free number on `origin/main`.
    - **B. F&T cleanup**: slug `ft-cleanup`, 1 session. It starts once the owner confirms the prod content build, and at least 11 min after it.
  - The top of the file says:
    - the control room saves each brief as its own file under `agent-state/missions/briefs/`;
    - an "Owner's picks" block, defaulting to the doc's picks, which brief A reads.
  - Brief A names:
    - the files (doc §5);
    - the content changes for all 76: values from doc §3, quotes in `STATE/research/moves.csv`, retags and note tags from doc §4;
    - F&T content leaving the 20 files, constants kept;
    - `ANIMAL_RULES.version` `054-1` → `055-0`, re-read on `origin/main`;
    - the checks: `typecheck`, `lint`, `npm test`, `content -- preview`, then §8(a)'s dev-DB block word for word, with its guard (the path only);
    - the proof the movement question is dealt (grid columns with `climbs:yes`/`digs:yes` on a probed seed, recorded in plan 055);
    - the bot rerun, with numbers in plan 055;
    - the fixes to `CONTENT_SOURCES.md` and `DATABASE_ACCESS.md:202-203`;
    - the accepted CI risk;
    - the prod content build, the owner's from WSL after a successful deploy, as a handoff item;
    - Release `deploy`.
  - A size estimate in sessions. Above 60, split A into ordered briefs.
  - **Check:**
    - each of the 6 headings appears once per brief;
    - `rg -n "postgres(ql)?://|sk_(live|test)|pk_(live|test)" $BRIEF` finds nothing;
    - every existing file the brief names exists on `origin/main`, and new ones are marked new;
    - the version string matches `origin/main`.

- [x] S19 · Final freshness and consistency.
  - `git fetch origin --prune`. If `origin/main` has moved:
    - rebase and `git push --force-with-lease`;
    - run `git diff --stat <old> origin/main -- src db scripts tests docs/CONTENT_SOURCES.md docs/DATABASE_ACCESS.md`;
    - re-check, in the touched files, every file:line the doc and brief cite, plus the next plan number and `ANIMAL_RULES.version`;
    - a new animal or tag on main means a research or sign-map addition: add a step before this one.
  - Read `DOC` and `BRIEF` end to end: the numbers agree across §1, §2, §5 and the brief.
  - **Check:** `git merge-base --is-ancestor origin/main HEAD` exits 0, and `paths.sh` prints nothing. If main moved, the Log says what changed.

After S19, the code-review unit writes `Skipped: design mission, no code` under `## Code review (Astra)`, per the brief's Decision rules, with no Astra run. The next session runs Verification; then comes Release (`deploy`: docs only, same game).

## Verification

From `REPO`, one heavy job at a time. Each command's output goes to `STATE/final/verify.txt`. Done when every item holds.

1. **Fresh base:** `git fetch origin --prune && git merge-base --is-ancestor origin/main HEAD` exits 0. If not, rebase and redo S19's re-checks first.
2. **Only docs (allowed paths):**
   - `git diff --stat origin/main...HEAD` lists only this plan, `BRIEF`, `DOC`, `IMG/*.png` and `IMG/sign-map.csv`; `STATE/tools/paths.sh` prints nothing.
   - `git status --porcelain` is empty.
   - The `--stat` output goes in the Summary (DoD, Release).
3. **Doc structure:** the 6 headings (S16) are in `DOC`, and §1 gives every owner choice with a pick. `BRIEF` has the 6 template headings per brief.
4. **Coverage:**
   - `python3 -I $STATE/tools/moves.py coverage` exits 0: 76 ids × 4 values = 304 rows; no yes/no without a quote and link; no no-record without a reason. `quotes.py` has 0 misses.
   - `DOC` §3 has 76 rows, ids 1–76 once each.
   - `signmap.py check` exits 0 against the current content: all 198 content tags present once, uses summing to 519, extra rows only for `retags.csv` and `note-tags.csv` tags (S9), all 12 note categories mapped. `IMG/sign-map.csv` equals `out/sign-map.csv`.
   - The 8 mockup PNGs (`today` and `option-1..3`, × `light|dark`) are valid, 780 px wide, and each is referenced from `DOC` (`rg -c "2026-11-07-moves-and-signs/<name>.png"`).
5. **Links:** `tools/links.py $DOC $BRIEF`: every relative link and image resolves, and every http link in §3 is a `url` in `moves.csv`. These pages were fetched and cached during research, so no network is needed.
6. **Game unchanged:**
   - `npm run typecheck`, `npm run lint` and `npm test` exit 0 (baseline 48/48).
   - **E2E only if the game moved under us:** check `git diff --quiet 69f45fa6 origin/main -- src db scripts tests public package.json package-lock.json next.config.mjs tsconfig.json`.
     - When it exits 0, Baseline's run stands as the E2E evidence (1512/1512, `baseline-e2e/`, or S1's re-run). The branch adds only docs, and the game tree is byte-identical to the one played, so a rerun would only add load and live-DB solve rows (F13), plus the known VPS timing flakes.
     - Otherwise, delete `mockups/shots/` and run `CHROME_PATH=$STATE/chrome-nosandbox.sh npm run e2e:fresh` (seed 7, 4 rounds). Every check must pass; after a timing flake, run once more, as Baseline did. Copy `e2e-artifacts/<run>/` and the log to `STATE/final-e2e/`, then delete the repo copy. Keep two folders: the baseline or S1 run, and `final-e2e/`.
7. **Evidence in `STATE`:**
   - `research/` (`moves.csv`, `rules.md`, `summary.md`, the batch CSVs, `photos/`);
   - `out/` (`sign-map.csv`, `note-categories.csv`, `witness-marks.csv`, `retags.csv`, `note-tags.csv`);
   - `deals/` (with `metrics.md`) and `bot/` (with `summary.md`), each file headed by its command;
   - `patches/` and `mockups/` (sources, README, `audit.md`);
   - `du -sh $STATE` recorded in `verify.txt`.
8. **Release smoke** (the `deploy` unit, after `deploy critter-connect`):
   - `curl -s https://play.critterconnect.org/version.txt` names the merge commit;
   - `https://play.critterconnect.org/` and `https://critterconnect.org/` return 200;
   - no game page changed, so nothing else needs a check.

## Failure modes

Written before the tools. Each tool must catch, or loudly flag, every case in its group.

- **Research (S1 tools, S4–S9):**
  - Silence read as no, e.g. a missing ADW keyword (F10). Coverage rejects a no without a quote, and review checks that the quote rules the value out.
  - A quote paraphrased, invented, or taken from an uncached page. `quotes.py` finds it verbatim or lists it.
  - A quote about the wrong species: a genus page, a shared account, old ADW spellings (`Zaglossus_bruijni`). The species name must be on the page.
  - Captive behaviour, or a one-off anecdote, read as daily life (strict Swims); rocks read as Climbs (4, 15); digging for food or borrowed burrows read as Digs (52).
  - Lives in trees yes while Climbs isn't yes. Coverage fails it.
  - A disagreement recorded with one side only, or settled by tier (`CONTENT_SOURCES.md:21` vs the brief). `disagree=y` needs both quotes and a verdict of no-record.
  - Wikipedia used without checking its own cited source.
  - Commas, quote marks or newlines in quotes breaking the CSV. Write and read through the `csv` module only.
  - Search limits hit mid-batch. Partial upsert, and the rest becomes its own step.
- **Patched copies (S2, S10–S12):**
  - The overlay or patch writes into `REPO`. `copy.sh` refuses, and `git status` is checked.
  - A stale copy (old HEAD or patch). Every output carries the STAMP.
  - New prefix keys ahead of `system`, so they win ties (F8). `probe.ts`.
  - A `:no` tag dealt with raw text and ❓ (F2), or a new tag without a face silently killing decks (F9). `probe.ts`.
  - A no-record written as `:no` by the overlay. The trait count equals the yes+no count.
  - An `artificial` kind left behind by `no-ft`. The `diff -r` check.
  - `deals.ts` drifting from `useAnimalSession`. `base` reproduces the audit, or the difference is explained.
- **Sign map (S3):**
  - A tag missed, duplicated or renamed. Checked against content.
  - A category varying by holder. One fixed category per tag.
  - `answers` holding only exact restatements, missing exclusion and cross-prefix answers (Astra MUST-FIX 2). §6's draft and F4's cases are reviewed row by row.
  - A typo in an answer prefix. It must be askable.
- **Mockups (S13–S15):**
  - A finished round or a stray click writing a solve to the live DB. The POST is blocked, `shoot.mjs` never ends a round, and the server log is checked.
  - `.env.local` copied rather than symlinked (a secret duplicated). S13's setup fails unless `test -L mockups/app/.env.local` passes.
  - A port clash with another run. `ss -ltn` first.
  - Dark mode not applied, the credit cropped, or the sheet cut off. View every PNG.
  - Colour as the only cue (option 3). Icons stay.

## Code review (Astra)

## Release

## Decisions

- 2026-11-07 Baseline: `/usr/bin/google-chrome` absent and Playwright Chromium dies sandboxed (Ubuntu 24.04 userns); E2E uses `agent-state/missions/moves-and-signs-design/chrome-nosandbox.sh` (adds `--no-sandbox`) via `CHROME_PATH`. No repo change.
- 2026-11-07 S1: `origin/main` still `69f45fa6` (fetched 08:45 UTC), no rebase; Baseline's 4 rounds count as the played round. `paths.sh` uses `grep -rnE` (no `rg` in non-interactive bash) and scans only this mission's files (`plans/2026-11-07-moves-and-signs-*`, `docs/research/2026-11-07-moves-and-signs*`): main's `plans/2026-10-29-cc-website.md` holds a dummy CI URL, not ours. Photos: no `photo.url` changed since `094da493`, so clue-audit's cached photos were reused (33), rest fetched (41). TS tools run via `STATE/tools/run.sh` (esbuild bundle; `ROOT=<copy>` targets a patched copy).
- 2026-11-07 S2: harness = `tools/copy.sh` (git archive + `patch -p1`, refuses REPO targets, STAMP = HEAD + patch sha + overlay sha), `tools/overlay.mjs` (per-variant steps; `no-ft` asserts the 20 holders), `tools/deals.ts` (adapted copy; `--focus` tags, `--against` variant; refuses a copy whose STAMP isn't its variant), `tools/bot.sh`. `base` reproduces clue-audit S2 exactly (every place's sets and decks identical, F&T dealt 18/1/2/13/2, onlyBy 5, deckOnly 28), so 054's rule changes since `094da493` don't touch dealing. 3 content warnings (Darwin Frog, Livingstone's Flying Fox, Hispaniolan Solenodon: no countries) are on HEAD too, not the copy's.
- 2026-11-07 S3: sign-map rule made explicit: a tag answers when its words name a value (or opposite/synonym) or an animal kind whose value is common knowledge (frog, tortoise, giant, cub, nest); body parts/acts some holders use otherwise are evidence and stay hints (`digging_claws`, `webbed_feet`, `pouch`, `trunk`, `large_eyes`, `rarely_drinks`). vs §6 draft: +3 answering tags (`builds_nests` → birth, misleads all 5; `paddle_tail` → system/habitat/swims; `surfaces_to_breed` → digs), water words also answer `habitat`, giant_* answer birth/system/lifespan, `cub_mane` birth; nothing dropped. Tie `one_island` → Range (draft had Habitat), `leaf_litter` → Habitat. `tree_dweller` restates `trees:yes` (C); under D it only answers `climbs`. Judgments live in `STATE/tools/sign_judgments.py`; full list `out/sign-map-changes.md`.
- 2026-11-07 S4: `moves.py`/`quotes.py` take `MOVES_CSV=<batch>` so workers self-check before upsert. Session review changed 2 rows: 8 swims yes → no-record (adults crawl stream bottoms, forage on banks; only courtship swims), 75 digs no → no-record (ADW says both "burrow under" and "hide under" rocks). Applied rules as written, no rules.md change: arboreal quote = swims/digs no (5, 6); "aquatic" vs a source saying it rarely swims = disagreement (75 swims); "terrestrial"/"terricolous" ≠ "strictly terrestrial" (3, 7, 9 swims no-record); lives_in_trees no on a ground/stream quote even when climbs is no-record (3, 7, 8, 9, 11). S9 consistency: 8 vs 11 (stream frogs, swims), 62 vs 75 (giant salamanders, swims/digs).
- 2026-11-07 S5: session review changed 2 rows: 30 swims yes → no-record (EDGE "surprisingly good at swimming" is ability, not routine; same as 54 "capable swimmers", S4's 8); 20 digs re-sourced Wikipedia → SDZWA ("digs dens up to 10 feet"), after `quotes.py` gained a `SYNONYMS` list (Centrochelys sulcata = Geochelone sulcata, per IUCN's synonym list). Kept: 4 climbs yes on Kirkpatrick 1995 "reported to climb trees and bushes" (weak, hard=y; S9 recheck vs 15); 4 swims no-record without disagree (ADW "not a good swimmer" doesn't rule swimming out, unlike 75's ADW-vs-Wikipedia); 45 climbs/lives no-record (flies and roosts, no climbing quote); 56 lives no-record (ADW: travels on ground, much time in trees). S9 consistency: 30 vs 54 (sloth swims), 19/21/22 vs 20 (tortoise climbs/digs).
- 2026-11-07 S6: session review changed 1 row: 48 climbs yes → no-record (Australian Museum "can climb trees" is ability; juvenile tree feeding only in Wikipedia citing an unfetched book; adults climb poorly; same as S4 8, S5 30/54). Kept, noted for S9: 25 climbs no-record ("excellent climbers" names no trees); 33 climbs no on "above the tree line" (no trees to climb); 58 climbs yes on SDZWA tree lookout + ADW "climb trees on occasion" (hard=y); 65 lives no on ADW keyword "terricolous" (a present keyword is a statement, unlike F10's missing one); 71 lives no-record (Smithsonian "arboreal" but "forage on the ground", worked example asks for most of life in trees); 73 digs yes (ADW builds burrows, Wikipedia "holes dug into riverbanks"). S9 consistency: `sign_cue` across batches (S5 listed answering tags `climber`/`tree_dweller`; S6 lists hint tags only, as rules.md says); 35 vs 71 (lives); 48 vs 26/65 (borrowed burrows).
- 2026-11-07 S7: session review changed 1 row: 46 digs no → no-record (ADW nest made by "excavating a hollow in the soil" = rules.md's sleeping-hollow worked example, no-record not no). `quotes.py` `SYNONYMS` += Smutsia gigantea/temminckii = Manis (IUCN 55/63 synonym lists; ADW uses Manis). Kept, noted for S9: 42 climbs/swims no on ADW "semi-fossorial" + Key Behaviors "fossorial" (present keyword = statement, S6's 65; hard=y on climbs), as 37; 36 swims no on IUCN fossorial (ADW "said to be a good swimmer" = hearsay ability); 52 digs no on ADW "do not construct burrows" (hard=y: digging signs still show); 32 digs yes on collapsing sand tunnels (tier 4, The Conversation by the rediscovery co-author) vs profile note "instead of digging lasting tunnels"; 63 digs yes on Wikipedia (borrows aardvark/warthog burrows, can dig own); 59 climbs and 24 lives disagreements (Wikipedia vs IUCN/ADW). S9 consistency: 31/37/42/36/32 fossorial → climbs/swims no vs 57 "terrestrial" burrower → no-record; 55/63 borrowed burrows vs 26/48/65.
- 2026-11-07 S8: session review changed 2 rows: 53 swims yes → no-record (ADW "comfortable swimmers" = ability, "flee to water" = escape; Wikipedia's daily-life lines uncited; same as 70, S5 30/54); 70 digs no → no-record (sleeps in few-inch wallowing holes = rules.md sleeping-hollow example, as 50 sand hollows, S7 46). Kept: 13/13 climbs no on heavy grazer/browser + ground quotes ("climb hills"/"mountain climbers" = terrain); 44 digs no (sleeps in wallows it doesn't dig, Wikipedia + ADW); 28/66 digs no (rest standing / lying in shade, as 58); 39 digs no (births in brush, foals stand in open; weaker than 58, S9 recheck); 50/69 swims no (desert, no free water). Swims strict leaves all 7 pachyderms no-record. For S9 retags: 28, 44, 70 carry `swimmer` (44's note "good swimmer" rests only on ADW keyword "natatorial") and `travelOf = swim`, all now swims no-record. S9 consistency: 53 vs 70 (tapir swims), 44 vs 70 (wallow digs), 39 vs 29/38/68/69 (digs).
- 2026-11-07 S9: Climbs trees stays D's tree value, not Lives in trees: 5 of 18 Climbs-yes photos show the ground (not "many"), though Climbs has 26 no-records vs Lives' 5 (S11's no-record metric decides the cost; C stays a variant). Pencil option (a), Climbs in Habits weight 3 (8 of 18 yes photos show a tree, not most). S10 patches all four values as planned; Swims' 44 no-records already lean drop. Consistency pass: no verdict changed; 62 swims reason rewritten (vs 75/4), 6 `hard` re-judged with rule 1 + rule 5 applied (2, 55, 71 → y; 12, 65 → n; 34 reason), 21 `sign_cue` cells (24 tags) lost answering tags (S5 listed them; they hide under rule 1). Giant tortoises 19/22 stay climbs no-record (no cached mass quote), unlike 20. 24 lives disagreement kept, but its Wikipedia sentence is uncited: ADW's own mixed keywords give no-record anyway. Rule 4: 11 retags (`rock_climber` 4, 15; `climbing_tail` 59; `roosts_in_trees` 45, `often_in_trees` 71; `can_swim` ×6, Swims variant only). Rule 5: 23 note tags (19 all variants, 4 Swims only; new `above_tree_line`, `never_climbs`, `stays_underground`); body parts/diets stay hints (S3 rule). `signmap.py` now takes new tags' holders and category from `retags.csv`/`note-tags.csv` (rules `new (retag)` / `new (note tag)`); `climber` misleads += 4, 15, 51, 59, 60 under C. Tool `tools/s9.py` (fix/tags/check). Full write-up `research/summary.md`.
- 2026-11-07 S10: patches made by `tools/mkpatch.py <variant>|all` (string edits on a fresh `git archive HEAD`, each anchor must match once; `signs.ts` generated from `out/sign-map.csv`, 206 tags), so all 4 rebuild the same way. Constant `MOVE_PREFIXES` + `NEVER_ASKED_VALUE` in `traits.ts`, `neverAsked` in `questionMatch.ts`. Draft texts/faces: Climbs trees 🧗, Digs burrows ⛏️, Swims (to feed or get around) 🏊, Lives in trees 🌲. `GuideSigns` also wired to rule 1 (`signsOf(tags, asked)`), for S13. Deviations: overlay traits carry no `note` (the quote is source English and would print after the guide line; the build writes plain notes; quotes stay in `moves.csv`); retags/note tags follow the CSVs' `variants` column, so `move-c` gets them too (S9 marked them `c`). `signProblems` not in the throwaway: `probe.ts` checks sign coverage, answer prefixes and rule 4. Tests: the witness-fits test passes in every copy (no note in its Aardvark set has a restating tag that disagrees with the trait); instead the D copies fail "no inseparable pair": Climbs splits the poison frogs (9 yes, 76 no), so they may now share a set (an S11 effect, not a bug). `probe.ts` runs on the 4 movement copies only (base/no-ft have no `signs.ts`; S2 covered them).
- 2026-11-07 S11: **drop Swims.** It's never askable: 0 sets in any place have all 5 suspects holding a Swims record (44 of 76 animals are no-record; 70 of 76 world sets hold one), so it's dealt 0 times; where recorded it repeats Fresh water for 26 of 32 animals (81%). `move-d-notravel` not dealt (travelOf reaches only the bot, S12). Movement no-records cost more than S9 hoped: D's Climbs is askable in 4/1/5/0/3 sets (world/af/as/na/sa), 53/18/15/13/11 hold a no-record; C's trees 13/2/12/10/1 askable, 21/10/5/0/10 no-record. Dealt: C trees 7/0/8/2/1 decks (any 9.2/0/40/15.4/7.1%), D climbs+digs 5/1/6/0/3 (6.6/3.8/30/0/21.4%). No place loses a round in any variant (0 flags). Both clues mostly add new sets rather than split old ones: the deck-only pairs are look-alikes no-ft can't put together (Saola/Sumatran Orangutan, Asia, C and D; poison frogs 9/76, D, S10's test). Rule 2 costs ~0.35 notes/round (world 2.27 → 1.92 under D); rule 1 hides ~1 sign (median 7 → 6), 1 Asian suspect left with none under D. The C-vs-D pick is S16's, with S12's bot numbers. Tool changes: `deals.ts` `isFocus` counts `climbs:no` with `climbs:yes` (an exclusive prefix's other value separates too; base unaffected); sign answers parsed from `out/sign-map.csv` as `mkpatch.py` does, asserted equal to the copies' own `witnessNotes(…, dealt)`; `tools/metrics.py` builds `deals/metrics.md` and fails on a missing metric or a base/no-ft drift from S2 (`--s2`).
- 2026-11-07 S12: **`travelOf` reads `digs:yes`** (the D build keeps it). The bot can't tell the two apart (`move-d` vs `move-d-notravel` within ±1 pt find, ±0.2 moves left, everywhere; noise floor base vs no-ft ±1 careful / ±4 reader). It changes only 4 animals (2, 4, 18, 33: walk → dig, so they leave downward), drops no burrower, and makes the walk-off agree with the Digs answer from one source. Bot vs `no-ft`: find rates within noise in all variants. Moves left Africa −0.6, South America −1 to −1.5, Asia C −0.6 / D +0.4, **North America C −3.9 / D −2.7**. North America's drop is rule 2, not the movement clue: D deals climbs/digs 0 times there and its decks equal no-ft's but for 1 seed; rule 2 cuts its notes 1.1 → 0.5 a round. S16 must weigh that cost of the leak rule. `--knows` climbs/trees ≤ +0.6 moves (rarely dealt). D ≥ C on moves (Asia +1.0, North America +1.2). Climbs-in-Body run skipped (S9 picked pencil (a)). Tools `tools/botsum.py` (fails on a missing run, a non-zero exit or a missing place/player row), `tools/travel.ts`.
- 2026-11-07 S13: mockup copy `tools/mockapp.sh` (whole tree, move-d patch + overlay, own git repo so `git diff` = `mockups/mock.patch`). Deviations: `node_modules` hardlinked (`cp -al`, no disk), not symlinked: Turbopack refuses a symlink out of the project root and `--webpack` can't build the globe's maplibre worker; pool route builds from the copy's content files (`contentRowsFromProfiles` + `poolFromRows`) instead of injecting at `animalsFromPool`: same data, no live-DB read. Suspect: Brown-throated Sloth (54), `?seed=7&place=continent:south-america` (Climbs dealt; signs in 4 categories; rule 1 hides `algae_fur`, `cecropia_leaves`, `hangs_upside_down`, `tree_dweller`). Option 1 icons Eye/PawPrint/Trees/MapPin/Baby (Footprints and Egg unreadable at 12 px); chips and grid tiles carry the icon only, word in the accessible name (a word per chip doubles chip width → paging); sheet shot at full height by pinning the drawer's px height and growing the viewport (1238/1266 px). Details `mockups/README.md`.
- 2026-11-07 S14: option 3 shot **display-only on the same round** (deviation: the deck rule lives in its own copy, not the shot's): its deck (Fur, Bare skin, Mostly bugs, Climbs) has two Body and two Habits clues, so the shot shows the clash (2 orange, 2 yellow gems). Rule measured in copy `move-d-cats` (`mkpatch.py`/`overlay.mjs` variant, one `dealClues` line skipping decks with <4 categories): seeds 149 → 51, **South America 14 → 0**, so the sloth's round can't exist under it. Life cycle takes the `red` gem (043's `black` is now the pebble). Contrast (copy's `check-theme.mjs` + option 3 pairs at 3:1): 12 failures, all light (habits yellow 1.26:1 worst; life passes); dark all pass. Theme gap: only color-1 and error pass in both modes, no orange/blue: ≥3 new game-data colours. Option 2: chips in guide rows, answers grouped, words only, photo 240 px; sheet +204 px vs today, no paging. Option 3's swatch chips page the sloth's signs (1/2). Details `mockups/README.md`.
- 2026-11-07 S15: audit (`mockups/audit.md`) found 5 drift items in the mockup diff, all fixed in the copy, plus option 3's `--cat-*` theme gap left open (owner's choice). The one that changes a number: tappable sign chips were 16 px, failing WCAG 2.2 2.5.8, so they're now 24 px and **option 1 pages the sloth's signs (1/2)** where S13 said they fit; S17 must use this. Option 2 sheet 1446 px (+208). Option 3's swatch + theme `xxs` space clamps the grid label to "Climbs…". Kept as intentional: `xxs` kickers in answer rows and witness notes.
- 2026-11-07 S16: **pick C (Lives in trees), not D**, against the architect's lean; D (Climbs + Digs) is the doc's second pick. Why: the brief's rule "prefer what a player can check from the photo or guide" — C has 2 hard animals (34, 40) vs D's 16, 5 no-records vs 47, 8/10 yes-photos show a tree; it's dealt as often (18 vs 15 of 149 rounds); and D's deck-only splits hinge on hard calls (poison frogs 9/76 ×5 on climbs, giant otter 73 ×3 on digs), C's on saola/orangutan ×7 (40 hard by cues, but common knowledge). Bot within noise between them. Pencil (a) Habits weight 3 kept for C although 8/10 yes-photos show a tree (§2's rule would say (b)/(c)): "Body" would mislabel the tile once categories show; extra points on an easy question aren't unfair. `travelOf` unchanged under C (reads `digs:yes` only if D). S17/S18 follow: Summary picks C with D as the owner's alternative; brief A's "Owner's picks" block defaults to C, and its dealt-proof is a grid column `trees:yes` (or `climbs:yes`/`digs:yes` under D). §3 table holds all three values (C + D) so either pick needs no new research. Tool `tools/table.py` (write/check; fake link, duplicate and missing row each caught).
- 2026-11-07 S17: Summary picks: C, drop Swims, Lives in trees, pencil (a), rules 1 and 2 on (045's "signs stay" changes; rule 2's North America cost stated), link option 1, `travelOf` unchanged under C, site shots refresh **left out of the build** (only icons change; keeps the build small). Under C the 7 digging-only note tags (`buries_itself`, `burrower`, `stays_underground`) stay in the build's content: the measured C copy had them, and they're true of their note. Build size estimate 20–25 sessions for C (the plan's ~25 was for D). `tools/links.py` gets `--later <path>` so the 3 links to `BRIEF` (written in S18) show as pending, not passing; Verification 5 runs it without the flag. Mockups were shot under D (Climbs tile); the doc says so, the UI is the same under C.
- 2026-11-07 S18: brief A written for pick C with D in brackets (one brief, not two), so the owner's picks block switches it without a rewrite. Under C `SIGNS.answers` keeps only asked prefixes (drop `climbs`/`digs`/`swims`) and `climber` restates nothing, so `signProblems` can fail fast on unaskable answers (the throwaway `signs.ts` kept them). Trait notes are plain English, not quotes (S10); `url` from moves.csv where the profile lacks that source's page (`checkProfile` `profiles.ts:310`). Brief B: no rules bump (no dealt change), a read-only prod check on `species_deduction_clues.compare_tags` before deleting, and `isHandWrittenClue` left alone (it reads `COMPLETE_PREFIXES`). Size 20–25 sessions, no split.

## Log

- 2026-11-07 07:55 UTC · Baseline: on latest origin/main; typecheck/lint ok, unit 48/48, e2e 1512/1512 (2nd run; 1st 3 timing flakes). Artifact `baseline-e2e/`.
- 2026-11-07 08:25 UTC · Architecture: architect wrote 12 findings + target design (lean: per-move yes/no traits Climbs trees + Digs burrows in Habits, F2 never-ask-`no` rule, F&T content removed w/ constants kept till cleanup brief, sign leak hiding, mockup option 1 category marks). Docs only; no code touched.
- 2026-11-07 08:40 UTC · Fable review: APPROVE_WITH_CHANGES, 1 MUST-FIX (build brief must run content build + e2e on VPS against `phaser_june_dev`, not `.env.local` prod), 2 missed, 5 should-consider. Docs only.
- 2026-11-07 08:18 UTC · Astra review: APPROVE_WITH_CHANGES, 2 MUST-FIX (explicit dev-DB override for content build + e2e; sign suppression must cover all answers a sign reveals across prefixes, shared with witness notes), 4 should-consider. Docs only.
- 2026-11-07 09:00 UTC · Revision: architect resolved 2 distinct MUST-FIX (F13 + §8(a) dev-DB override w/ `current_database()` guard for content build/check/e2e; F4/§6 per-prefix `answers` map in pure `src/clueGame/signs.ts` shared by checkProfile/GuideSigns/witnessNotes), Fable missed items, should-considers dispositioned. Docs only. Architect's masking `sed` leaked DB URLs into its transcript: handoff H9.
- 2026-11-07 08:44 UTC · Steps: planner wrote S1–S19 (setup, deals/bot harness, sign map, 5 research batches by taxon covering ids 1–76, consolidation, movement patches, deals/bot runs, mockups ×3 light/dark, one graphical-audit, doc ×2, build brief(s), final freshness), Verification (8 checks; e2e only if game code moved since 69f45fa6) and Failure modes. Docs only; typecheck+lint 0.
- 2026-11-07 08:50 UTC · S1: no rebase (origin/main 69f45fa6). STATE: rules.md (4 values, evidence rule, source order, 8 edge cases), moves.csv header, tools moves.py (init/upsert/coverage), quotes.py, inventory.ts+run.sh, photos.py, paths.sh. Check: coverage 304 missing rc=1; scratch rows caught all listed faults, ellipsis quote matched; inventory 76 blocks; 5 sheets viewed, 74 photos + 19/47 none; S4–S8 ids = 1–76. typecheck/lint 0, paths.sh empty.
- 2026-11-07 09:35 UTC · S2: copies `base`, `no-ft` (tsc 0, tests 48/48 each; no-ft diff = 20 files, `habitats` only, 0 `artificial` left). Deals → `deals/{base,no-ft}.json|md`: seeds world/af/as/na/sa 68/26/20/13/14 → 76/26/20/13/14 (8 world frogs gained, 0 lost); base = audit exactly. Bot (400 rounds, seed 44) → `bot/{base,no-ft}.txt`, exit 0, careful find rate ±1 pt. typecheck/lint 0, paths.sh empty.
- 2026-11-07 09:17 UTC · S3: `out/sign-map.csv` 198 tags/519 uses (Body 87, Habits 70, Habitat 22, Range 1, Life 18; ties leaf_litter, one_island), answering 79 tags/192 uses (draft 76/185), 17 with misleads; `note-categories.csv` 12 = 1027, 6 feed signs; `witness-marks.csv` 424/13/0 (= draft). `signmap.py check` 0; 9 injected faults each caught. typecheck/lint 0, paths.sh empty.
- 2026-11-07 10:40 UTC · S4: 15 amphibians, 2 subagent groups → `research/batch-s4-{frogs-a,frogs-b-salamanders}.csv`, upserted (moves.csv 60 rows). climbs y3/n7/nr5, lives y2/n12/nr1, digs y3/n6/nr6, swims y4/n5/nr6; 1 disagreement (75 swims); 6 hard. Check: coverage 0 problems, quotes 83/0 misses, 6 random quotes re-read in page context ok. typecheck/lint 0, paths.sh empty.
- 2026-11-07 09:43 UTC · S5: 20 animals (turtles 11, tree animals 9), 2 subagent groups → `research/batch-s5-{turtles,trees}.csv`, 2 rows fixed in review, upserted (moves.csv 140 rows, 35 ids). climbs y9/n3/nr8, lives y7/n11/nr2, digs y4/n12/nr4, swims y4/n7/nr9; 0 disagreements; 7 hard. Check: coverage 0 problems, quotes 221/0 misses, 7 random quotes re-read in page context ok. typecheck/lint 0, paths.sh empty.
- 2026-11-07 10:22 UTC · S6: 12 carnivores, 2 subagent groups → `research/batch-s6-{cats-dogs,other-carnivores}.csv`, 1 row fixed in review, upserted (moves.csv 188 rows, 47 ids). climbs y5/n2/nr5, lives y1/n10/nr1, digs y2/n8/nr2, swims y3/n2/nr7; 0 disagreements; 6 hard. Check: coverage 0 problems, quotes 77/0 misses, 6 random quotes re-read in page context ok. typecheck/lint 0, paths.sh empty.
- 2026-11-07 10:03 UTC · S7: 16 diggers, 3 subagent groups → `research/batch-s7-{pangolins-echidnas,burrowers,insect-diggers}.csv`, 1 row fixed in review, upserted (moves.csv 252 rows, 63 ids). climbs y1/n7/nr8, lives y0/n15/nr1, digs y13/n2/nr1, swims y0/n5/nr11; 2 disagreements (24 lives, 59 climbs); 2 hard. Check: coverage 0 problems, quotes 106/0 misses, 9 random quotes re-read in page context ok. typecheck/lint 0, paths.sh empty.
- 2026-11-07 10:15 UTC · S8: 13 hoofed + elephants, 2 subagent groups → `research/batch-s8-{pachyderms,hoofed}.csv`, 2 rows fixed in review, upserted (moves.csv 304 rows, 76 ids). climbs y0/n13/nr0, lives y0/n13/nr0, digs y0/n5/nr8, swims y0/n2/nr11; 0 disagreements; 0 hard. Check: coverage 13 ids 0 problems (all 76: 304/304, 0 problems), quotes 87/0 misses, 7 random quotes re-read in page context ok. typecheck/lint 0, paths.sh empty.
- 2026-11-07 10:30 UTC · S9: consolidation of all 76 → `research/summary.md` (counts climbs y18/n32/nr26, lives y10/n61/nr5, digs y22/n33/nr21, swims y11/n21/nr44; 3 disagreements; 22 hard), `out/retags.csv` 11, `out/note-tags.csv` 23, `out/restating-holders.csv` 102 rows (0 conflicts), sign-map 206 rows (198 content + 8 new). No verdict changed; 28 cell edits via `tools/s9.py fix`. Check: coverage 304/304 0 problems, quotes 491/0 misses, `s9.py check` ok (dropped retag, bad added tag, missing note each caught), `signmap.py check` 0. typecheck/lint 0, paths.sh empty.
- 2026-11-07 10:37 UTC · S10: patches `move-d`, `move-d-notravel`, `move-d-swims`, `move-c` (7 files each, via `tools/mkpatch.py`); overlay = no-ft + researched traits (D 105, D+Swims 137, C 71 = moves.csv yes+no) + note tags 19/23 + retags 5/11; `tools/probe.ts`. Check: tsc 0 in all 4; tests 48/48 move-c, 47/48 D copies (frogs-inseparable test, explained in Decisions); preview Jaguar shows "It climbs trees." under behavior (Habits), 0 PROBLEMs all copies; probe ok ×4 (keys after social, 149 sets, 0 `:no` dealt, 0 ❓), 7 injected faults each caught; 0 `artificial` left. typecheck/lint 0, paths.sh empty, REPO clean.
- 2026-11-07 10:43 UTC · S11: `deals.ts` + §5 metrics (notes ±rule 2, signs ±rule 1, movement no-records, Swims vs Fresh water); runs base, no-ft, move-c, move-d, move-d-swims → `deals/*.json|md` + `deals/metrics.md` (`tools/metrics.py`). Swims dealt 0 (never askable) → dropped. Check: all 5 × 5 metrics present, base/no-ft identical to S2 (`--s2`), 0 places fall; injected seed drop flagged, missing metric fails. typecheck/lint 0, paths.sh empty.
- 2026-11-07 11:28 UTC · S12: bot runs move-c, move-d, move-d-notravel, move-d-knows (`--knows size,covering,climbs`), move-c-knows (`trees`), 400 rounds × 4 places, seed 44 → `bot/*.txt`, all exit 0, 4 places each; `bot/summary.md` (`tools/botsum.py`; a missing run caught). travelOf → `digs:yes` (bot-neutral, 4 animals change). North America −2.7/−3.9 moves left comes from rule 2. Swims run skipped (dropped S11). `patched/*` deleted. typecheck/lint 0, paths.sh empty.
- 2026-11-07 11:52 UTC · S13: mockup copy (move-d, pool from content files: 76 species, 105 movement rows, 0 F&T; solves POST → 204 blocked), probe 30 rounds (Climbs dealt 6), suspect 54 sloth seed 7 South America; `tools/shoot.mjs` → `mockups/shots/{today,option-1}-{light,dark}.png` (780 px wide, full sheet, 9 scouting moves, Climbs cell scouted, credit shown, 0 API writes; option 1 sign tap lights its guide row). Viewed all 4: signs, guide, Its answers, scouted cell, dark dark. Server log: 1 POST solves (probe) blocked, no other write. Copy rebuild reproduces `mock.patch`, tsc 0. typecheck/lint 0, paths.sh empty, REPO clean.
- 2026-11-07 12:05 UTC · S14: options 2 (signs in guide rows, answers grouped, words only) and 3 (category gem colours + swatch marks) in the mockup copy; `mockups/shots/option-{2,3}-{light,dark}.png` (780 px, same sloth/seed/Climbs cell, credit shown, 0 writes, option 3 tap ok). Option 3 cost: deck rule copy `move-d-cats` loses 98/149 seeds (S. America all 14), S11 2+-one-category share 38–100%; contrast 12 light fails, dark ok (`mockups/theme-option-3.txt`). Viewed all 4. Server log 0 POST. typecheck/lint 0, paths.sh empty, REPO clean.
- 2026-11-07 12:21 UTC · S15: one graphical-audit pass → `mockups/audit.md` (5 fixed: tap targets 24 px, lit-heading edge, option 2 heading size, `mr-[2px]`, icon stroke; 1 gap: option 3 `--cat-*`, 12 light contrast fails). All 8 reshot (0 writes, tap ok, overflow 0), viewed; copied to IMG: 8 PNGs 780 px, 0.54–0.76 MB. `.next*` deleted. Copy tsc/eslint 0. typecheck/lint 0, paths.sh empty.
- 2026-11-07 12:29 UTC · S16: DOC §2 (options A–D, rules, research counts, engine fit, balance table from deals/metrics.md + bot/summary.md, pick C) and §3 (76 rows × Lives/Climbs/Digs, quotes + 180 links, tell column, 19 hard cells listed) via `tools/table.py`; §1/§4/§5/Method headed, S17 fills. Check: table.py check ok (76 ids once, 180 links all in moves.csv), 5 §2 numbers traced (metrics.md ×3, bot/summary.md, research/summary.md). typecheck/lint 0, paths.sh empty.
- 2026-11-07 12:36 UTC · S17: DOC §4 (note-category table, tag mapping summary + `IMG/sign-map.csv` 206 rows, hidden tags per prefix, leak rules 1–6 with costs, retags 11 + note tags 23 in full, part-3 content notes, 3 mockups light/dark with trade-offs, pick option 1), §5 (files, content 76 files, F&T constants kept, checks, size 20–25 sessions), Method and coverage, §1 Summary (9 owner choices, each with a pick). Check: 6 headings once each, 0 placeholders, `links.py` 14 relative links 0 problems (3 to BRIEF pending S18), §3 180 links in moves.csv, `table.py check` ok, sign-map.csv = out/ (206 rows), 8 PNGs referenced once each. typecheck/lint 0, paths.sh empty.
- 2026-11-07 12:41 UTC · S18: `BRIEF` = owner's picks block + brief A `moves-and-signs-build` (plan 055, C default / D bracketed, files, 76-animal content from moves.csv, F&T content out + constants kept, `054-1` → `055-0`, guarded dev-DB block verbatim, dealt-proof `trees:yes`, bot rerun, docs fixes, CI risk, prod content handoff, Release deploy) + brief B `ft-cleanup` (1 session, after owner's prod build + 11 min). Check: 6 headings once per brief, no secret patterns, every named file on origin/main or marked new (signs.ts, CategoryMark.tsx, 055, 056), version `054-1` = main, 19 STATE paths exist, links.py DOC 14/0 (BRIEF now resolves) + BRIEF 2/0. typecheck/lint 0, paths.sh empty.
- 2026-11-07 12:44 UTC · S19: origin/main still 69f45fa6 (merge-base ok, no rebase, no cited line moved; next plan 055, rules 054-1). Read DOC + BRIEF end to end; §1/§2/§5/brief numbers agree (18/149, 2 vs 16 hard, 5 vs 47 no-records, 71 = 10+61, D 105, 208 answers = source sum, 5 retags/19 note tags/19 animals, 20 F&T holders = 20 class + 45 kind tags, 206 sign rows, bot deltas). 1 fix: §2 NA notes "1.1 to 0.5" now gives C 1.09→0.45 / D 1.18→0.51 (matches §4, metrics.md). Spot-checked 24 file:line cites ok. typecheck/lint 0, paths.sh empty.

## Summary
