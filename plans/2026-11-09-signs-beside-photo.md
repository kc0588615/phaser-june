---
mission: signs-beside-photo
project: critter-connect
branch: agent/signs-beside-photo
status: active
started: 2026-11-09 00:40 UTC
---

# Mission: Signs back beside the photo, grouped by category (Critter Connect)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

On the species sheet, the sign chips go back in the box beside the species photo, as they were before plan 055 (`GuideSigns`, removed in PR #66; the last version is `src/components/animalBoard/AnimalSheets.tsx` at `447e9317`, `function GuideSigns`). This time they're **grouped by category**: each group starts with **one** category icon (`CategoryMark`, the same icon set as the guide headings: Body, Habits, Habitat, Range, Life cycle), followed by that category's chips. No icon on each chip. Done looks like this:

- Beside the photo: a "Signs" label, then the groups in the guide's category order, each as `[icon] chip chip chip`. Groups with no signs don't show.
- **Auto-paging, as before:** when the chips don't fit the box beside the photo, they split into pages that turn by themselves (`SIGN_PAGE_MS`), with the page count `1/2` beside the label, tap to pause, the pause mark, and a screen-reader list of all signs. Measure-and-split as the old `GuideSigns` did (`ResizeObserver`, the photo alone sets the row height).
- **A group split across pages repeats its icon** at the top of the next page, so every chip on screen sits after its category's icon. Prefer page breaks between groups when a group fits whole on the next page; don't leave a lone icon at the bottom of a page.
- **The guide rows lose their chips:** each category row in the field guide shows its guide lines only, as before 055. A row with no lines (for example, all hidden by plan 045 while its question is dealt) doesn't show.
- Everything else from 055 stays: signs are never hidden, the reworded signs, the category marks on guide headings, "Its answers" rows, question tiles and witness notes, 045's hiding of the asked guide lines, `signProblems`.
- The icon carries its category word as its accessible name (`CategoryMark` already does); colour is never the only cue.

### Why

The owner wants the signs back where players first look, beside the photo, with the auto-paging that let long lists fit. Plan 055 moved them into the guide rows; the owner prefers the old place, keeping the category link but with one icon per category instead of per chip, so the box stays readable.

### Scope

In:
- `src/components/animalBoard/AnimalSheets.tsx` (bring back `GuideSigns`, grouped; remove the signs from the guide rows), `CategoryMark.tsx` only if it needs a size or caption tweak.
- `scripts/e2e.mjs`: the sign checks from 055 (they read `data-signs` / `data-sign` inside the guide rows) now read the box beside the photo: groups in category order, one icon per group, every chip after its category's icon on every page, paging turns when there are more chips than fit (pick a suspect with many signs), pause works.
- `plans/058-signs-beside-photo.md` (or the next free number) and the docs that say where signs show (`CONTEXT.md`, `docs/CLUE_MATCH.md`, plan 055's notes are history and stay).

Out:
- Content, signs table, rules and deal logic. No `ANIMAL_RULES.version` bump (nothing a round deals changes).
- The witness notes, the question tiles and "Its answers" rows.

### Definition of done

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run content -- preview` exit 0.
- `npm run e2e:fresh` passes on the dev copy `phaser_june_dev` only, with the guarded block from plan 055 (`plans/2026-11-08-moves-and-signs-build.md`, V3). Never against `.env.local`; never print `DATABASE_URL` or `cat` the dev-copy file.
- Screenshots at 390×844, light and dark, of a sheet with one page of signs and one that pages (both pages), plus a desktop width, in `/srv/critter-ai/agent-state/missions/signs-beside-photo/`; one `graphical-audit` pass against `GUI.md` on them.
- Release `deploy`: merge, `deploy critter-connect`, smoke `/explore` 200 and `version.txt` = the merge commit. No production content build needed.

### Decision rules

- Start from the old `GuideSigns` code rather than writing a new pager; change only what grouping needs.
- Icon size and spacing may be tuned to fit the box beside the photo at 390 px; keep chips at least 24 px tall as tap targets only if they're tappable (they aren't today).
- If grouping can't fit sensibly at phone width, say why in the plan and show the best option in the screenshots; don't drop the paging.

### Notes

- Start from a fresh `origin/main` (after ft-cleanup and frog-fact-fixes merge).
- Signs data: `animal.signs` (`{ tag, text, category }`) and `CATEGORY_LABELS`, as the guide rows use them on main now.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

From `agent/signs-beside-photo` @ `80de5c36` (= `origin/main` `fd7ecea1` + mission start). `node_modules` present; no migrations in this repo. Old pager: `src/components/animalBoard/AnimalSheets.tsx` at `447e9317` (`GuideSigns` line 270, `SIGN_PAGE_MS = 5000` line 41).
- `npm run typecheck` 0, `npm run lint` 0, `npm test` 66/66 pass, `npm run content -- preview` 0 (no PROBLEM lines; output `/srv/critter-ai/agent-state/missions/signs-beside-photo/preview-before.txt`).
- `npm run e2e:fresh` on dev copy (`current_database()` guard = `phaser_june_dev`, no-sandbox Chrome wrapper `/srv/critter-ai/agent-state/missions/moves-and-signs-build/chrome-nosandbox.sh`), seed 7, `continent:africa`: **1565/1565 checks** (rounds: Hairy Frog found, Hirola lost, Golden-rumped Sengi found, African Forest Elephant found). Artifact `/srv/critter-ai/agent-state/missions/signs-beside-photo/baseline-e2e/`.

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

- 2026-11-09 00:50 UTC: Baseline. typecheck/lint/test (66/66)/preview 0; dev-copy E2E 1565/1565, artifact `M/baseline-e2e/`.

## Summary
