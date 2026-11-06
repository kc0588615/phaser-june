---
mission: clue-audit
project: critter-connect
branch: agent/clue-audit
status: active
started: 2026-11-06 08:03 UTC
---

# Mission: Clue audit, research only (Critter Connect)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

A research report the owner can decide from. No game code or content changes. Two questions:

**1. Should the "Farms & towns" clue go?** (`habitat:artificial`: column label "Farms & towns", question "Lives on farms or in towns?", `src/clueGame/questionMatch.ts:189-200`.) The owner thinks it's neither specific nor intuitive: a player can't tell from an animal's field guide or photo whether it "lives on farms or in towns". The report answers:
- Which animals hold it (about 20 of 76 in `db/content/animals/`) and where each one's value comes from. Does it mean the animal really lives on farms or in towns, or only that IUCN lists some artificial habitat for it, such as plantations, pastures or a canal?
- How a player is meant to answer it. Can it be read from anything the game shows: the field guide, witness notes or the photo? Cases where a player who reads everything would still guess wrong.
- What removing it touches. Every place the tag is read: `traits.ts` (`HABITAT_CLASSES`, `COMPLETE_PREFIXES`), `questionMatch.ts`, `clueFaces.ts`, `profiles.ts`, content, tests, docs and site copy. How rounds change: how often it's dealt as one of a round's four questions, and whether any pair of look-alikes the game deals is told apart only by it.
- Options, with a recommendation: remove it; replace it with something a player can check (say what, and whether the data supports it); or keep it, reworded. Give the owner the trade-offs, not only a verdict.

**2. Are the clues logically consistent?** Every animal's answer to every question must follow from its own record, and no two answers may contradict each other. The owner's example: an animal recorded as medium (2–30 kg) must answer **no** to "Large 30–300 kg", and that's only fair if it really weighs 2–30 kg. Check at least:
- **Value against its own note.** Size against the weights in its `note` and source (e.g. a note saying "25 to 40 kg" with value `medium` is a finding). Lifespan against its years, young against litter or clutch size. Do this for every exclusive trait in every animal.
- **Animals that straddle a bin** (males and females, or a range across a boundary such as 20–50 kg). Since each animal holds one value per exclusive prefix (`EXCLUSIVE_PREFIXES`, `traits.ts`), it answers **no** to the neighbouring bin. List each straddler, the value it holds and what a fair answer would be.
- **Exclusive values that read as overlapping to a player.** For example, an `activity:any` animal ("Day & night") answers no to "Day" and "Night". The same goes for `diet:mixed` against "Only plants" or "Only meat". Say for each prefix whether the labels make the one-value rule clear, and where they don't.
- **Answers against what the game tells the player.** Field guide lines, witness notes (`clues[]`, with their `tags`) and the reveal notes must never contradict the trait values or habitats. Example: a note saying it hunts at night on an animal tagged `activity:day`.
- **Cross-trait sense.** For example, `birth:eggs` with litter-style `young` notes, `system:marine` without a marine habitat, or habitat classes that disagree with `systems`.
- **Every column label against its question text and the bin edges** used to assign values. Are 2 kg and 30 kg each in exactly one bin? Do the labels and the assignment rule in `docs/CONTENT_SOURCES.md` agree?

### Why

Players rule animals out on these answers, and Auto rule-out (on by default from mission `auto-rule-out-default`) does it for them. So one wrong or unclear answer makes a fair round unwinnable, and players stop trusting the grid. The owner wants to know what's wrong before deciding what to change.

### Scope

In:
- Reading the game's code, content (`db/content/animals/*.json`, `db/content/sources.json`), docs, plans and git history.
- Reading the cited sources (ADW and others in `sources.json`) to check a value.
- **IUCN data is allowed for Critter Connect** (owner, 2026-11-06). The game already uses IUCN habitat and range data, non-commercially and without redistributing it, under IUCN's terms. Read each animal's IUCN Red List page, especially its Habitats and Ecology classification, which shows what "Artificial" covers for that animal (e.g. plantations, pastures, urban areas), and its range data. Quote and link it like any other source. This rule is Critter Connect's only: critwire's ban on IUCN data stays.
- Throwaway audit scripts in `/srv/critter-ai/agent-state/missions/clue-audit/`, never in the repo.
- Read-only use of the live database, if a fact is only there (e.g. what content is loaded). No writes.

Out:
- **No changes to the game:** nothing under `src/`, `db/`, `scripts/`, `public/` or the site, and no content or copy edits, even for an obvious typo (list it as a finding). The only files the branch adds are the mission's plan and the report.
- No issues or board cards. The owner decides what becomes work.

### Definition of done

- **The report** is at `docs/research/2026-11-06-clue-audit.md` on the branch, in plain language for the owner:
  1. Summary: the Farms & towns recommendation, plus the count of findings by severity.
  2. Farms & towns: the answers to question 1, then the options.
  3. Findings: a table with one row each: animal (id, name), prefix, what it holds, what the evidence says (with the quote and a source link), severity, and suggested fix.
     - **wrong:** the answer is false.
     - **unfair:** true by the rule, but a careful player would answer it the other way.
     - **unclear:** the label or rule needs wording.
  4. Rules: the one-value rule and the bin edges, and where labels or docs need changing.
  5. What a fix mission would change: the files and the size of the work. No code.
- **The same findings as `findings.csv`** in `/srv/critter-ai/agent-state/missions/clue-audit/`, along with the audit scripts and their output. One row per check on each animal, including the passes, so it's clear what was checked.
- **Coverage:** all 76 animals and every exclusive prefix, plus `system` and `habitat`. The report says what was checked and what couldn't be (e.g. a source that wouldn't load).
- **Release:** the project merges and deploys at the end. The merge adds only the plan and the report, so the deploy ships the same game. Confirm with `git diff --stat origin/main...HEAD` in the Summary, which must list only those files.

### Decision rules

- Research only. If something looks like it needs a fix, record it with the evidence and the suggested fix; never apply it.
- A value is "wrong" only with a quoted source or note. Uncertain cases are "unfair" or "unclear", with the reason.
- Prefer the record's own cited source. If two open sources disagree, report both, and don't choose.
- No architecture or code review stages are needed; skip Astra (there's no code).

### Notes

- How answers work (`questionMatch.ts:480-500`, `ask`): the mystery's tags for that prefix are looked up. Yes if it holds the tag; every standing suspect whose set differs on that tag is ruled out; a suspect with no value for the prefix is "no record" and never ruled out.
- Exclusive prefixes (one value each): taxonomy ranks, `size`, `lifespan`, `diet`, `activity`, `birth`, `young`, `social`, `covering`. Complete prefixes (every value listed): `realm`, `country`, `system`, `habitat` and the habitat classes (`traits.ts`).
- Size bins, from the column labels: tiny <100 g, small 0.1–2 kg, medium 2–30 kg, large 30–300 kg, huge 300+ kg. Lifespan: under 5, 5–20, 20+ years. Young: 1–2, 3–10, 10+.
- Each animal JSON holds `traits.<prefix>` (`value`, `note`, `source`), `habitats`, `systems` and `clues[]` (`category`, `text`, `tags`, `source`). Example: `db/content/animals/26-black-footed-ferret.json`.
- Checked by the control room on `origin/main` at `094da493`. The mission builds on `main` after `auto-rule-out-default` merges.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: skipped, research only (brief's decision rules)
- [x] Fable review: skipped, research only
- [x] Astra review: skipped, research only
- [x] Revision: none needed
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

On `9f764162` (origin/main `26b66aa4` + plan). `node_modules` already installed; no migrations (no migration history, live DB untouched).
- `npm run typecheck`: exit 0. `npm run lint`: exit 0. `npm test`: 48/48 pass.
- `npm run e2e:fresh`: 1479/1479 checks, 4 rounds (seed 7). Artifact `/srv/critter-ai/agent-state/missions/clue-audit/baseline-e2e/` (report.json, screenshots, logs, `COMMAND.txt`). Needs `CHROME_PATH=/srv/critter-ai/agent-state/missions/clue-audit/bin/chrome` (wrapper adding `--no-sandbox`; `/usr/bin/google-chrome` absent).

## Architecture

Skipped: research only, no code (brief, Decision rules).

## Architecture review (Fable)

Skipped: research only.

## Architecture review (Astra)

Skipped: research only, brief says skip Astra.

## Revision notes

None needed.

## Steps

## Verification

## Code review (Astra)

Skipped: research mission, no code.

## Release

## Decisions

- Architecture, Fable, Astra (plan and code) and Revision stages skipped: brief says no architecture/code review stages, skip Astra.

## Log

- 2026-11-06 08:10 UTC: Baseline. typecheck, lint, 48 unit, e2e 1479/1479 pass. Review stages marked skipped per brief.

## Summary
