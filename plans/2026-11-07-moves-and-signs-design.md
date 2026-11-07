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

- [ ] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

## Architecture

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

## Summary
