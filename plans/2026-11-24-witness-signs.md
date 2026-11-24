---
mission: witness-signs
project: critter-connect
branch: agent/witness-signs
status: active
started: 2026-11-24 00:49 UTC
---

# Mission: Witness notes in standard sentences, and a witness gem on the starting board (Critter Connect, Neon-led)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Neon-led. Starts from main after mission sign-audit (2a) has released, with --harness agy (not queue-chain.sh, which drops it):
     mission start critter-connect /srv/critter-ai/agent-state/missions/briefs/2026-11-23-witness-signs.md --harness agy
     Part 2b of Neon's roadmap. Reviewed by Gemini 4 Neon (2026-11-23). -->

### Goal

Witness notes stop giving the animal away, and every round with an eligible note starts with a witness gem. The owner chose (2026-11-23): **a standard sentence for each sign during the round, and the animal's own vivid sentence in the reveal after it**, plus **a witness gem on the starting board**. Mission sign-audit (just before this one) defined every sign and made every animal's signs complete; read its Summary, its sign definitions and its ledger (`/srv/critter-ai/agent-state/missions/sign-audit/`).

Today a witness gem shows one of the mystery's own hand-written sentences, dealt only if its signs fit 2 or more of the 5 suspects but not all (`witnessNotes`, `src/clueGame/animalBoard.ts:231-237`). The sign is shared, but the words often aren't: the verification counted 77 of 263 dealt notes that fit only the mystery by their wording ("Its long snout curves down like a beak" can only be the echidna; `research/critter-connect/clue-verification.md` and `clue-design.md` in the vault, at `/srv/critter-ai/vault`). When it's done:

1. **In a round, a witness note is the sign's standard sentence.** Each sign that can be dealt has one sentence that every holder shares, true of every holder under sign-audit's definition, readable for the game's players (grades 6–12, read solo), and naming no animal, place or group. It describes the trait in other words than the sign's short label, so a kid thinks about the animal rather than matching words, **but the note also shows the sign's label** (or links it through the glossary, `GlossaryText`), so a kid can connect the sentence to the "false thumb" in a field guide (`AnimalSheets.tsx:217,266,455`). How a note with several signs works, and whether notes are dealt per sign rather than per hand-written note, **the lead decides** (dealing per sign would avoid two notes with the same sentence, and the tagged notes now held back for the reveal because they had too many blanks, `questionMatchContent.ts:121-128`).
2. **The reveal keeps the animal's own sentences.** After a round, the reveal card's Field notes still show the mystery's hand-written notes in full, as today (`AnimalSheets.tsx:716-720` renders `animal.notes` and `animal.revealNotes`, each as `note.full ?? note.text`), including the one behind each witness note the player collected.
3. **The starting board has a witness gem whenever the mystery has an eligible note.** Today `freshGrid` (`src/game/BoardModel.ts:476-489`) already turns each of the 44 unpinned starting cells into a witness gem with chance `witnessChance` (0.03), so about 74% of starting boards have at least one, even when the mystery has no eligible note. **The lead decides**, and records:
   - "at least one" (place one only when the random roll gave none) or "exactly one" (no random witness gems on the starting board, then one placed);
   - what happens to witness gems when the mystery has no eligible note (today they appear anyway);
   - whether the board may now depend on the mystery: today it doesn't (`useAnimalSession.ts:72,82`), and the balance bot relies on that (`scripts/balance-044.ts:363-364`).
   The placed gem is on an unpinned cell, the board still has a valid move afterwards (including after any `shuffle()`), and a given seed gives the same board.
4. **No dealt note gives the animal away by its words.** The plan shows, before and after, on the current 105 dealable sets (525 set-and-mystery combinations, recomputed after sign-audit): dealt notes that fit only the mystery by their words (target 0), combinations with at least one eligible note, and the share of rounds that start with a witness gem.

### Why

The owner's players are solo kids discovering the game on the web (owner, 2026-11-20). A witness note is the round's biology puzzle ("two of these frogs have dads that carry tadpoles: which two?"), and today it either gives the answer away or never matters. A standard sentence makes each note a fair puzzle and scales to every new animal for free; the animal's own line becomes the payoff after the round.

### Scope

In:
- `src/clueGame/` (`signs.ts` or a table beside it for the sentences, if the lead keeps them in code; `animalBoard.ts` for dealing and the starting gem; `questionMatchContent.ts` and `glossary.ts`), `src/game/` (`BoardModel.ts` and what builds the starting board), `src/components/animalBoard/` (`useAnimalSession.ts`, `AnimalSheets.tsx` and what shows notes), and their tests
- `scripts/balance-044.ts`: it builds boards itself (`board.newBoard(...)`, lines 385-387), so it must follow the new starting-board rule, or the "after" run doesn't measure it
- `scripts/e2e.mjs`: new checks for the starting gem, a standard sentence in a round and the hand-written sentence on the reveal card. Today it checks notes only when a round happens to have one (`e2e.mjs:1992-2010`). `e2e:fresh` already takes about 14 minutes against CI's 15-minute job: add the checks to rounds the E2E already plays, not new rounds.
- `docs/CLUE_MATCH.md`, `docs/ANIMAL_BOARD_PAPER.md`, `CONTEXT.md`, as far as they describe what changes
- Animal profiles only if the lead puts sentences in content rather than code; then the owner's content build is needed (Notes)

Out:
- Any write to the live database. Never run `npm run content -- build`, `ranges` or `npm run iucn` with the mission's `.env.local`.
- Tag changes: sign-audit did them. Fix only a tag the new sentences prove wrong, and record it.
- Auto rule-out, the round-end screen's wrong-pick line, spaced review (part 4), birds (part 3).

### Definition of done

- `npm run typecheck`, `npm run lint` and `npm test` pass. `npm run content -- preview` reports no problems.
- `npm run e2e:fresh` passes against the dev copy `phaser_june_dev`, never `.env.local`, after a dev content build:
  ```
  ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a
    [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1
    npm run content -- build && CHROME_PATH=$HOME/.local/bin/chrome-nosandbox npm run e2e:fresh )
  ```
  Never print a connection string or `cat` that file. If the guard fails, stop and add a handoff item. The E2E shows a round starting with a witness gem, a collected note's standard sentence in the round, and the hand-written sentence on the reveal card. Save the final run's artifact as `/srv/critter-ai/agent-state/missions/witness-signs/e2e-final/`.
- `npm run content -- check` (read-only) still passes on the live database.
- `ANIMAL_RULES.version` changes (the starting board does), saved games of the old version are handled as the repo's rules say, and a seeded round stays reproducible.
- The balance bot (updated for the new starting board), run before and after on the same seeds, in the plan. The bot judges notes by their signs, not their words (`stillPossible`, `animalBoard.ts:575`), so it measures the starting gem, not the sentences. An early witness note should make rounds easier for players who use it; the lead sets the acceptable change for each player type before the run, and records why any move outside it is right, or adjusts.
- **Every standard sentence is reviewed before it ships.** The plan lists each sentence with its sign and a check that it's true of every current holder. Fable reviews the list for truth and reading level (a `claude-task --model claude-fable-5-2 --effort high` job), and the lead rules on each item. **If Fable is out of usage, the sentences don't ship unreviewed:** wait for Fable (end the session with `MISSION_WAIT_CLAUDE` if Opus is also out; otherwise try again in a later session), or have Astra review the list instead (`astra-review --task`). This overrides `mission-lead.md`'s "skip a Fable review" for this one review.
- The final reviews are recorded: `## Code review (Astra)` and `## Code review (Fable)`, with the lead's ruling on each item.
- The Summary says whether the owner's content build is needed.

### Decision rules

- **Neon decides** (`~/.gemini/mission-lead.md`): where the sentences live (code is simpler and needs no content build), how multi-sign notes work, per-note or per-sign dealing, the starting-gem rule, and the balance limits.
- **True for every holder, or not dealt.** If no sentence is true of all a sign's holders, the sign isn't dealt as a witness note (and that goes in the Summary for a later fix), rather than a sentence that's wrong for some.
- **The deployed code must work with the live rows as they are when it deploys,** which may still be from before sign-audit's content build if the owner hasn't run it yet: a tag with no standard sentence (a retired or old sign) is skipped as a witness note or falls back safely, never throws.

### Notes

- **If any content changes** (sentences in profiles, or a tag fix), add one handoff item after the deploy's smoke tests pass: from WSL, update `main`, take a fresh dump, `npm run content -- build`, then `npm run content -- check`, with the expected summary line.
- The research's scripts are in `/srv/critter-ai/agent-state/missions/cc-clue-design/scripts/`, pinned to `0837540a`; recompute anything that depends on the dealer or the tags.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

- Branch / base: `agent/witness-signs` at `a1a33d3d`, cut from `origin/main` `8d246c70` (PR #86 `sign-audit`). Clean working tree; `/srv/critter-ai/handoff/critter-connect.md` has one open item `H22` (`Status: waiting on you`, `sign-audit` production content build; no `Status: done` items).
- Runtime: Node `v24.21.0`, npm `11.19.0`; `node_modules` installed; no DB migrations (baseline `db/schema.sql` already live and on `phaser_june_dev`).
- `npm run typecheck`: pass (exit 0).
- `npm run lint` (`eslint` + `check-theme.mjs`): pass (exit 0, 0 warnings).
- `npm test`: pass (147/147 tests, 3 suites, 0 failed, 5.5 s).
- `npm run content -- preview`: pass (exit 0, 0 problems across 76 profiles).
- `npm run content -- check` (live `phaser_june`, read-only): pass — `Pool: 76 playable of 76 species, 2475 clues (2083 deductive), 491 facts. 0 errors, 0 warnings.` (live DB still holds `7bce511a` rows pending H22).
- Guarded `phaser_june_dev` `npm run content -- build && npm run content -- check`: pass — `content_sources: 16 rows`, `species: 76 rows`, `species_deduction_clues: 3653 rows`, `species_facts: 491 rows`; `Pool: 76 playable of 76 species, 3653 clues (3041 deductive), 491 facts. 0 errors, 0 warnings.`
- Guarded `phaser_june_dev` `CHROME_PATH=$HOME/.local/bin/chrome-nosandbox npm run e2e:fresh`: pass — `1554/1554 checks passed` (Anywhere load median 2374 ms at 1x, 4800 ms at 4x). Artifact: `/srv/critter-ai/agent-state/missions/witness-signs/e2e-baseline/`.
- Balance bot before (`node scripts/run-typescript.mjs scripts/balance-044.ts --rounds 200 --seed 44 --places world,africa,asia`, rules `055-1`, `witnessChance 0.03`, full table at `/srv/critter-ai/agent-state/missions/witness-signs/balance-before.txt`):

| Place | Player | Found | ★★★ | Escaped | Ran out | Identified | Moves left | Orders | Notes | Points |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| world (76, 49 sets) | careful | 99% ±1 | 82% | 0% | 2% | 98% | 19.4 | 1.6 | 3.2 | 330.6 |
| world | novice | 99% ±1 | 84% | 0% | 2% | 99% | 19.4 | 1.5 | 3.2 | 331.8 |
| world | expert | 100% ±0 | 91% | 0% | 0% | 100% | 20.4 | 1.3 | 3.0 | 348.3 |
| world | reader | 97% ±2 | 60% | 0% | 6% | 96% | 15.6 | 1.7 | 3.5 | 270.6 |
| world | guesser | 20% ±6 | 20% | 80% | 0% | - | 27.7 | 0.0 | 0.8 | 85.5 |
| world | random | 22% ±6 | 0% | 0% | 100% | - | 0.0 | 3.9 | 5.1 | 10.8 |
| world | oracle | 100% ±0 | 100% | 0% | 0% | - | 27.8 | 0.0 | 0.9 | 428.3 |
| africa (26, 23 sets) | careful | 100% ±0 | 87% | 0% | 3% | 97% | 19.3 | 1.8 | 3.2 | 333.8 |
| africa | novice | 98% ±2 | 85% | 0% | 3% | 98% | 19.6 | 1.8 | 3.3 | 331.9 |
| africa | expert | 100% ±0 | 91% | 0% | 0% | 100% | 20.0 | 1.5 | 3.0 | 345.9 |
| africa | reader | 97% ±2 | 62% | 0% | 9% | 94% | 15.2 | 1.9 | 3.6 | 268.7 |
| africa | guesser | 20% ±6 | 20% | 80% | 0% | - | 27.9 | 0.0 | 0.7 | 85.8 |
| africa | random | 22% ±6 | 0% | 0% | 100% | - | 0.0 | 3.9 | 5.3 | 10.8 |
| africa | oracle | 100% ±0 | 100% | 0% | 0% | - | 27.8 | 0.0 | 1.0 | 428.3 |
| asia (17, 15 sets) | careful | 99% ±1 | 81% | 0% | 3% | 98% | 18.2 | 1.8 | 3.1 | 316.2 |
| asia | novice | 100% ±1 | 81% | 0% | 1% | 99% | 18.2 | 2.0 | 3.2 | 317.6 |
| asia | expert | 100% ±0 | 89% | 0% | 0% | 100% | 19.4 | 1.6 | 2.9 | 336.8 |
| asia | reader | 98% ±2 | 58% | 0% | 4% | 96% | 14.8 | 2.0 | 3.2 | 265.6 |
| asia | guesser | 20% ±6 | 20% | 80% | 0% | - | 27.9 | 0.0 | 0.6 | 85.8 |
| asia | random | 22% ±6 | 0% | 0% | 100% | - | 0.0 | 3.9 | 4.8 | 10.8 |
| asia | oracle | 100% ±0 | 100% | 0% | 0% | - | 27.8 | 0.0 | 0.8 | 428.2 |

Careful moves left at find (20th/40th/60th pct): world `14/19/22`, africa `15/19/21`, asia `14/17/21`.

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

- 2026-11-24 01:08 UTC — Baseline stage: verified typecheck, lint (0 warnings), unit tests (147/147), `content -- preview` (0 problems), live `content -- check` (2475 clues, 0 errors/warnings), guarded `phaser_june_dev` `content -- build && check` (3653 clues, 0 errors/warnings) + `e2e:fresh` (1554/1554 pass; saved at `$STATE/e2e-baseline/`), and baseline `balance-044.ts` (`--rounds 200 --seed 44 --places world,africa,asia`).

## Summary
