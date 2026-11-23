---
mission: sign-audit
project: critter-connect
branch: agent/sign-audit
status: active
started: 2026-11-23 02:03 UTC
---

# Mission: Sign audit: every animal tagged with every sign it has (Critter Connect, Neon-led, Astra checks)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Neon-led. Start with:
     mission start critter-connect /srv/critter-ai/agent-state/missions/briefs/2026-11-23-sign-audit.md --harness agy
     Part 2a of Neon's roadmap; mission witness-signs (2b) follows it. Reviewed by Gemini 4 Neon (2026-11-23). -->

### Goal

Every animal's profile carries the signs (open tags, the words without a colon, `src/clueGame/signs.ts`) that are true of it under one clear definition each, so a witness note's count of "N of 5 field guides say this too" is right. **Astra (GPT-6.2-Astra at high effort) does the checking. Neon leads and decides. Opus fetches sources and makes the edits.**

How a missing tag hurts today: a witness note comes from the mystery, which always fits its own note, and it is dealt only if its signs fit 2 or more of the 5 suspects but not all (`witnessNotes`, `src/clueGame/animalBoard.ts:231-237`). A suspect "fits" only if its profile records every sign of the note; an untagged sign counts as "doesn't have it". So a look-alike that has the trait but isn't tagged makes the note's count too low ("2 of 5" instead of "3 of 5"), points a knowledgeable player the wrong way, and can stop a good note from being dealt at all, or let one through that fits only the mystery. Auto rule-out isn't involved: it reads only shown camera answers, never notes (`shownMismatch`, `animalBoard.ts:579-585`). `clue-design.md` in the vault (`research/critter-connect/`, lines 199, 469 and 541) has examples: the Pancake Tortoise without `temperature_sex` and the Savanna Elephant without `salt_licks`. Mission witness-signs (next) gives each sign one standard sentence, which makes complete, well-defined signs matter more.

When it's done:

1. **Each sign has one clear meaning.** Before any checking, the lead writes a one-line definition for every sign in use (what counts and what doesn't: does `climber` include an animal that climbs only rocks?), from `signs.ts`'s category and `implies`/`denies`, the glossary, and how its current holders use it. Signs whose holders use them in different senses get a definition that fits, or are split. Known rule problems to settle here: `climber` implies `trees:yes` but the Giant Panda climbs well and is `trees:no` (`clue-design.md` lines 329 and 736), and `never_climbs` implies `habitat:forest` (`signs.ts:129`).
2. **Narrower and broader signs follow one rule.** The repo's "one sign per fact" rule (`docs/CONTENT_SOURCES.md:76`, plan `plans/059-sign-dupes.md`) keeps only the narrower tag on a note (`carries_young_on_back`, not also `mother_carries_young`; `backward_pouch`, not also `pouch`; `spiral_horns`, not also `horns`), and lists more unresolved pairs (`059-sign-dupes.md:28-36`). So a true `has it` for the broader sign must not simply be added beside the narrower one. **The lead decides** one rule for all such pairs and records it: for example, a narrower sign counts as its broader one when witness fits are computed (code), or the pair is merged or redefined so they don't overlap. Plan 059 kept `backward_pouch` separate for its note's wording ("opens backward"); mission witness-signs replaces note wording in rounds, so that reason may no longer hold.
3. **Every sign is checked against every animal it could apply to.** At `origin/main` (`7bce511a`) there are 201 signs in use on 433 tagged notes, 93 of them held by two or more animals (top: burrower 18, territorial 13, scent_marks 12, digging_claws 11, poor_eyesight 11). The 15 retired entries in `SIGNS` that no note uses are out. Every sign in use is in scope, including those held by one animal today: another animal may have it untagged.
   - **Triage first, recorded:** for each sign, the lead records which animals can't have it, with the rule: by class or body plan (a frog can't have `hooves`), by place (`floreana_island`, `pinta_island`), or because no other animal among the 76 could plausibly hold it (`star_fingers`, `tail_organ`). Those pairs get `no (triage: <rule>)`. Every other pair is checked.
   - **Each checked pair gets a verdict:** `has it` (with a source quote), `doesn't` (with a source quote, or "source silent and the trait is the kind a source would mention", said so), or `can't tell` (with the reason).
4. **The profiles are corrected.** Every `has it` a profile lacks becomes a tag on the right note, or a new short note with its source if the animal has no sentence about it, following Goal 2's rule. Every current tag a verdict says `doesn't` is removed. The ledger lists every change.
5. **Nothing breaks the signs' rules.** `signs.ts`'s `implies` and `denies` still hold for every holder (`signProblems`, which `checkProfile` and so `npm run content -- preview` run, reports nothing). Where a correct tag would break one, the lead fixes the rule or the record and says which.

### Why

The owner's players are solo kids (owner, 2026-11-20). A witness note's count teaches them which animals share a trait; a wrong count teaches wrong biology and spoils the note's puzzle. The owner wants every sign checked by a second model family (Astra) before the witness notes become standard sentences.

### Scope

In:
- `db/content/animals/*.json`: tags on notes, and new short notes where needed, each with its source
- `db/content/citations.json` and `db/content/sources.json`, for the sources new notes cite: add entries in the same commit as the notes that cite them (`checkCitations` fails otherwise), and **never delete an entry the live rows still cite** (`docs/CONTENT_SOURCES.md:142-151`)
- `src/clueGame/signs.ts` (definitions, splits, `implies`/`denies`, and Goal 2's rule if it's code), `glossary.ts` where a sign's definition reads to the player, `animalBoard.ts` only for Goal 2, and their tests
- `docs/CONTENT_SOURCES.md` and `docs/research/2026-11-07-moves-and-signs/sign-map.csv` (the research record `signs.ts` names), as far as the signs change
- The ledger, scripts, saved sources and Astra's prompts and outputs: in `/srv/critter-ai/agent-state/missions/sign-audit/`, never in the repo

Out:
- Any write to the live database. Never run `npm run content -- build`, `ranges` or `npm run iucn` with the mission's `.env.local`. Heavy or test queries go to the dev copy (block below).
- Witness-note wording, the starting witness gem, and anything else of mission witness-signs. Note give-away wording you meet for it, in the Summary.
- Trait values (diet, size, activity …) and the question columns, unless a sign's `implies`/`denies` forces one; then record it.

### How the work is split

- **Astra checks.** The lead writes each batch's prompt to `/srv/critter-ai/agent-state/missions/sign-audit/astra/<batch>.prompt.md` and runs, from that state folder, `ASTRA_EFFORT=high astra-review --task <prompt> <plan>`, giving `<plan>` as the **absolute** path to the plan in the worktree (`astra-review` checks that the file exists). That's GPT-6.2-Astra at **high**, read-only, with web search, 60 minutes at most. Save stdout as `<batch>.out.md`, and check that every pair of the batch has exactly one row. The prompt gives the sign definitions, the pairs, the animals' profile paths in a pinned export, the saved source files, and the row format: `animal id, sign, verdict, quote, source file or URL`.
- **Opus fetches sources first** (`claude-task`). A read-only Astra run has web search but no network in its shell, IUCN blocks bots, and AmphibiaWeb only answers through Wayback, 5 s apart (`docs/CONTENT_SOURCES.md`). Save each animal's cited pages once into `…/sign-audit/sources/`. Reuse what earlier missions saved: `/srv/critter-ai/agent-state/missions/cc-clue-verify/sources/` and `clue-audit/sources/`.
- **Batches of about 250–350 candidate pairs**, grouped within a sign category (not a whole category: `body` has 87 signs and `habits` 75). The earlier verification ran 200–360 rows per Astra run in 10–47 minutes (`/srv/critter-ai/agent-state/missions/cc-clue-verify/batches.csv`). A pilot batch sets the size: the largest that finishes well inside 60 minutes. On a timeout or missing rows, halve the batch and rerun it.
- **Fit it in the session budget.** After triage, the plan estimates the batches and sessions. A mission run stops at 60 sessions (`mission resume` continues), so if the estimate is well over that, the lead groups more work per session (several batches or cross-checks per session) rather than one batch each.
- **Opus cross-checks** (`claude-task`) every verdict that would change a profile (an add or a remove), every `can't tell` that matters, and a sample of 5–10 unchanged verdicts per batch, against the saved source: `agree`, `disagree` (with evidence) or `can't tell`. The ledger keeps both side by side.
- **The lead decides** every disagreement and records why. Then Opus makes the profile edits (`claude-task`), and the lead accepts or rejects them as usual.
- **Astra's limit:** this mission waits for Astra **in its audit batches only**. When an `astra-review --task` batch exits 3, commit what's done and end the session with `MISSION_WAIT_ASTRA`. Astra's architecture and final code reviews follow `mission-lead.md` as usual (skipped on exit 3).

### Definition of done

- The ledger (`…/sign-audit/ledger.csv`) has one row per sign in use × animal: triaged or checked, Astra's verdict, Opus's cross-check where made, the lead's ruling where they differ, and the change made. The plan has its counts by verdict and by sign category.
- `npm run typecheck`, `npm run lint` and `npm test` pass. `npm run content -- preview` reports no problems.
- `npm run e2e:fresh` passes against the dev copy `phaser_june_dev`, never `.env.local`, after a dev content build:
  ```
  ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a
    [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1
    npm run content -- build && CHROME_PATH=$HOME/.local/bin/chrome-nosandbox npm run e2e:fresh )
  ```
  Never print a connection string or `cat` that file. If the guard fails, stop and add a handoff item. Save the final run's artifact as `/srv/critter-ai/agent-state/missions/sign-audit/e2e-final/`.
- `npm run content -- check` (read-only) still passes on the live database.
- **Witness notes before and after,** on the current 105 dealable sets (525 set-and-mystery combinations; the `cc-clue-design` digest's 103 sets are from before the dealer change, so recompute with the current dealer, as `scripts/balance-044.ts` does without a database): the number of combinations with at least one eligible note, and every (set, mystery, note) whose fit count or eligibility changed. In the plan.
- The final reviews are recorded: `## Code review (Astra)` and `## Code review (Fable)`, with the lead's ruling on each item.
- The Summary lists the sign definitions, Goal 2's rule, the tags added and removed per animal (with sources), and the handoff item for the owner's content build.

### Decision rules

- **Neon decides** (`~/.gemini/mission-lead.md`): sign definitions, Goal 2's rule, triage rules, batch size, and every disputed verdict.
- **A tag needs a source.** No tag is added on general knowledge alone; when the cited sources are silent, look for a better source of the ranking in `docs/CONTENT_SOURCES.md`, or leave it untagged and record `can't tell`.
- **Prefer fixing the sign over many profiles** when holders disagree because the sign is vague.
- **The deployed code must load the live rows as they are** until the owner's content build: keep every sign that any live row uses in `SIGNS` (`signs.ts:3-4` keeps retired ones for exactly this; an unknown tag throws `Unknown sign`, `signs.ts:257`, and would break `/explore`). A split or renamed sign keeps its old entry, marked retired. `travelOf` (`animalBoard.ts:286-292`) reads `glider`, `fully_aquatic`, `swimmer` and `burrower` to decide how animals leave the board: change it in the same commit if any of those four changes.

### Notes

- **The owner's part, after the release:** one handoff item, added after the deploy's smoke tests pass: from WSL, update `main`, take a fresh dump (`ssh root@play.critterconnect.org /opt/critter-connect/deploy/backup/pg-backup.sh`), `npm run content -- build`, then `npm run content -- check`, with the expected summary line.
- The vault research it builds on: `research/critter-connect/clue-verification.md` (with its group notes) and `clue-design.md`, read from `/srv/critter-ai/vault`. The `cc-clue-design` state folder's `scripts/` and `digest/` are pinned to `0837540a`; reuse the scripts, but recompute anything that depends on the dealer.
- `origin/main` is at `7bce511a` (2026-11-20, rules `055-1`); the live database was brought up to it on 2026-11-23.

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

## Code review (Fable)

## Release

## Decisions

## Log

## Summary
