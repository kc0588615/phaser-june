---
mission: frog-fact-fixes
project: critter-connect
branch: agent/frog-fact-fixes
status: active
started: 2026-11-08 23:09 UTC
---

# Mission: Two frog content fixes (Critter Connect)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

Two hand-written clues that the fact-sources mission flagged (plan `plans/2026-11-07-fact-sources.md`, Decisions, steps 8 and 9) say what their sources now show is wrong. The owner checked both and wants them fixed (2026-11-08):

1. **Red-eyed tree frog, CITES year** (`db/content/animals/06-red-eyed-tree-frog.json`, the `conservation` clue "Its international trade has been controlled since 2008 (CITES Appendix II)", source `iucn`). The owner checked the CITES Checklist (https://checklist.cites.org, *Agalychnis callidryas*): Appendix II listing starts in **2010**. AmphibiaWeb says Appendix II from 21 March 2010. Make it "since 2010", re-sourced to a page that states 2010 (AmphibiaWeb's page for 06, which the profile already cites, or the CITES Checklist with its own `citations.json` entry).
2. **Goliath frog, "can't croak"** (`db/content/animals/11-goliath-frog.json`, `behavior` clue "It has no vocal sac, so it can't croak. Males whistle with their mouths open instead.", tag `voiceless`, source `adw`). AmphibiaWeb says the old no-call claims were wrong, and the same profile already has the AmphibiaWeb fact about its long mating call, so the game contradicts itself. Owner's wording: **"It has no vocal sac, but it still calls: whistles, chirps, even a deep roar, made with its mouth open."** Source `amphibiaweb`, with the quotes in `docs/research/2026-11-07-amphibiaweb-wayback.md` (section "11 Goliath Frog", Disagreements). **Drop the `voiceless` tag from 11**; it stays on 08, which truly has no call.

### Why

A clue players read must be true and agree with the facts shown after the round. `voiceless` also grouped 11 with 08 as a shared sign, which taught a false link.

### Scope

In:
- The two animal files; `db/content/citations.json` only if a new page is cited; the two research notes (mark the disagreements resolved); `docs/research/2026-11-07-moves-and-signs/sign-map.csv` if a tag's holders are listed there; a short plan `plans/057-frog-fact-fixes.md` (or the next free number).
- Small wording polish of the Goliath line is fine if the quote check needs it; keep its meaning.

Out:
- Any other content, code or rule. The 11 IUCN citation lines flagged in fact-sources are not part of this.

### Definition of done

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run content -- preview` exit 0, with 0 content PROBLEMs, 0 sign problems and 0 citation warnings; the fact-sources quote check (if it's in the repo or `/srv/critter-ai/agent-state/missions/fact-sources/tools/`) finds the new quotes.
- `rg -n voiceless db/content/animals` lists only 08.
- Dev copy only for anything that touches a database, with the guarded block from plan 055 (`plans/2026-11-08-moves-and-signs-build.md`, V3): export `/srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy`, check `current_database()` is `phaser_june_dev`, then `npm run content -- build && npm run content -- check && npm run e2e:fresh` (no-sandbox Chrome wrapper as in 055). Never run them against `.env.local`; never print `DATABASE_URL` or `cat` that file.
- Whether `ANIMAL_RULES.version` needs a bump: follow the repo's own rule (AGENTS.md / `animalBoard.ts` comment) and say why in the plan. Saved rounds with stale witness notes already deal fresh (`roundStillFits`, plan 055).
- **Handoff item** for the owner: "Production content build for the frog fixes", to run `npm run content -- build` from WSL after the deploy, with the expected counts.
- Release `deploy`: merge, `deploy critter-connect`, smoke `/explore` 200 and `version.txt` = the merge commit.

### Decision rules

- One session's worth of work; no architecture reviews beyond what the runner does by default for a small content change.
- If a source can't be quoted for either line, keep the old line, record why in the plan, and add a handoff note rather than guessing.

### Notes

- Start from a fresh `origin/main` (after ft-cleanup, plan 056, merges).
- Evidence: `docs/research/2026-11-07-amphibiaweb-wayback.md` on main; Wayback snapshot of the Goliath page https://web.archive.org/web/20241208045710/https://amphibiaweb.org/species/4691.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

From `agent/frog-fact-fixes` @ `e4c59782` (= `origin/main` `7edc1a5a` + mission start). `node_modules` present; no migrations in this repo.
- `npm run typecheck` 0, `npm run lint` 0, `npm test` 66/66 pass, `npm run content -- preview` 0 (no PROBLEM lines; output `/srv/critter-ai/agent-state/missions/frog-fact-fixes/preview-before.txt`).
- `npm run e2e:fresh` on dev copy (`current_database()` guard = `phaser_june_dev`, no-sandbox Chrome wrapper from moves-and-signs-build), seed 7, `continent:africa`: **1565/1565 checks**. Artifact `/srv/critter-ai/agent-state/missions/frog-fact-fixes/baseline-e2e/`.
- `rg -n voiceless db/content/animals`: 08:109 and 11:106. Target lines: `06-red-eyed-tree-frog.json:140` ("since 2008"), `11-goliath-frog.json:104` ("can't croak").
- Quote check tool: `/srv/critter-ai/agent-state/missions/fact-sources/tools/check_quotes.py`.

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

- 2026-11-08 23:20 UTC · Baseline: typecheck/lint/66 tests/preview 0; dev-copy e2e:fresh seed 7 Africa 1565/1565 (`baseline-e2e/`).

## Summary
