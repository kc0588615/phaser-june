---
mission: ft-cleanup
project: critter-connect
branch: agent/ft-cleanup
status: active
started: 2026-11-08 21:26 UTC
---

# Mission: Farms & towns constants removed (Critter Connect)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

The code no longer knows the `artificial` habitat class: removed from `HABITAT_CLASSES` (`src/clueGame/traits.ts`, which drops it from `COMPLETE_PREFIXES`), its entries in `src/clueGame/questionMatch.ts` (question, short and column texts), its 🏡 face in `src/clueGame/clueFaces.ts` (free again), and its `profiles.ts` guide-line texts (the class line and the 7 `artificial:` kind lines). `isHandWrittenClue` and the reserved-tag check stay as they are: they read `COMPLETE_PREFIXES`, so they follow the shorter class list by themselves. No content change; `rg -n "artificial" src db/content` finds nothing.

### Why

Plan 055 removed Farms & towns from content but kept these constants so the live game wouldn't misread the old rows between its deploy and the owner's production content build (clue audit's `isHandWrittenClue` trap). Once prod holds no `artificial` rows, they're dead code.

### Scope

In:
- `src/clueGame/traits.ts`, `questionMatch.ts`, `clueFaces.ts`, `profiles.ts`; `docs/CLUE_MATCH.md` / `CONTEXT.md` if they still mention it; plan `plans/056-ft-cleanup.md` (new; or the next free number).

Out:
- Content files, the database, any other rule. No `ANIMAL_RULES.version` bump (nothing a round deals changes: no row holds the class).

### Definition of done

- Before any code: confirm the live rows hold no Farms & towns, one light read-only query through `.env.local`: `select count(*) from species_deduction_clues c, unnest(c.compare_tags) t where t = 'habitat:artificial' or t like 'artificial:%'` (`src/db/schema/species.ts:20-25`) = 0. If not 0, stop and add a handoff item: the owner's content build hasn't reached prod.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run content -- preview` exit 0.
- `npm run e2e:fresh` passes **against the dev copy `phaser_june_dev`, never `.env.local`**, with the same guarded block plan 055 used (`plans/2026-11-08-moves-and-signs-build.md`, V3: export `/srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy`, check `current_database()` is `phaser_june_dev`, then run it; `CHROME_PATH` = the no-sandbox wrapper from `/srv/critter-ai/agent-state/missions/moves-and-signs-build/`). The dev copy already holds 055's content, so no content build is needed. Never print `DATABASE_URL` or any connection string, and never `cat` that file.
- Release `deploy`; smoke `/explore` 200 and `version.txt` = the merge commit.

### Decision rules

- Delete only what names `artificial`; anything else that looks dead is a note in the plan, not an edit.

### Notes

- The owner ran the production content build for 055 on 2026-11-08 (handoff H10, `done`): 2478 clues, 491 facts, 0 citation warnings, on main `36dc1a5d` (PR #66). The 11-minute pool cache (`src/app/api/clue-game/pool/route.ts:13`) has long passed; the live-rows query above is still the gate.
- The sites, as of `36dc1a5d` (checked by the control room): `traits.ts:31`, `questionMatch.ts:158,178,214`, `clueFaces.ts:15`, `profiles.ts:98` and `:144-150`. Re-read them on `origin/main`.
- Plan numbers on main go to `055`, so this is `056`.
- One session.

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
