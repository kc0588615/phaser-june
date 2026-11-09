---
mission: sign-dupes
project: critter-connect
branch: agent/sign-dupes
status: active
started: 2026-11-09 04:18 UTC
---

# Mission: Near-duplicate signs merged (Critter Connect)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

No animal shows two signs that say the same thing. The owner spotted it on the chimpanzee: *carries young on back* and *mother carries young* sit side by side and fill a whole page of the signs box beside the photo (plan 058). Across all 76 animals (`db/content/animals/*.json`, the open tags on `clues[].tags`, phrased by `SIGNS` in `src/clueGame/signs.ts`):

1. **Find** every pair (or group) of signs that a player would read as the same fact: on one animal, and across the table (two tags with the same meaning, used on different animals, which also breaks witness notes: two animals that share a trait don't share a tag, so the note never links them). Write them to a table with the tag, its phrase, its holders, and the verdict: merge, keep both (and why they differ), or reword one.
2. **Merge** each true duplicate into one tag: keep the clearer phrase, move every holder's note onto it, drop the other from `SIGNS`. A tag that's a narrower case of another (for example *carries young on back* vs *mother carries young*) is a duplicate on any animal that holds both; across animals, merge only if a player couldn't tell them apart from the notes.
3. Signs stay never hidden; categories stay as `SIGNS` gives them (a merged tag keeps one category; say which when its two parts differed).

### Why

Repeated signs waste the box beside the photo and teach nothing new. Tags with the same meaning split witness notes that should link two animals, which is the deduction the signs are there to teach.

### Scope

In:
- `db/content/animals/*.json` (tags only; note text changes only where the merged tag needs it), `src/clueGame/signs.ts` (`SIGNS` entries), `docs/research/2026-11-07-moves-and-signs/sign-map.csv` (recomputed), a findings table beside it (`sign-dupes.csv`), plan `plans/059-sign-dupes.md` (or the next free number).
- Tests or E2E checks only where an existing one names a dropped tag.

Out:
- New research or new facts; trait values; the question set; layout (plan 058's signs box stays as it is).
- Signs that are only similar in wording but differ in meaning: list them, don't merge them.

### Definition of done

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run content -- preview` exit 0, with 0 content PROBLEMs and 0 sign problems.
- The findings table covers every tag; the plan's Summary gives the counts (tags before and after, merges, kept pairs) and the chimpanzee before/after.
- Balance and witness notes: rerun the balance bot as plan 055 did (`scripts/balance-044.ts`, 400 rounds per continent, seed 44) and report witness notes per round before and after; more linking notes is expected and fine.
- `ANIMAL_RULES.version`: follow the repo's rule (AGENTS.md / `animalBoard.ts` comment); merged tags change witness notes, so a bump is likely. Say why in the plan.
- Dev copy only for anything that touches a database, with the guarded block from plan 055 (`plans/2026-11-08-moves-and-signs-build.md`, V3): `npm run content -- build && npm run content -- check && npm run e2e:fresh`. Never against `.env.local`; never print `DATABASE_URL` or `cat` the dev-copy file.
- One screenshot of the chimpanzee's signs box before and after, in `/srv/critter-ai/agent-state/missions/sign-dupes/`.
- **Handoff item** for the owner: production content build after the deploy, with the backup step first, as H11 did (`pg-backup.sh`, then `npm run content -- build` and `check`, with the expected counts).
- Release `deploy`: merge, `deploy critter-connect`, smoke `/explore` 200 and `version.txt` = the merge commit.

### Decision rules

- When in doubt, keep both and list the pair for the owner in the Summary; a wrong merge teaches a false link.
- Keep the engine as it is.

### Notes

- Start from a fresh `origin/main` (after signs-beside-photo, plan 058, merges).
- 055's `tag-edits.csv` (same folder) records the last round of sign edits; read it so this one doesn't undo them.

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
