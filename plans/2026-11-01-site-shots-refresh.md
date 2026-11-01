---
mission: site-shots-refresh
project: critter-connect
branch: agent/site-shots-refresh
status: active
started: 2026-11-01 23:22 UTC
---

# Mission: bring critterconnect.org up to date with the current game

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Saved as /srv/critter-ai/agent-state/missions/briefs/2026-11-01-site-shots-refresh.md
     Start: mission start critter-connect <this file>   (base: main at 1a781de4 or later)
     Owner, 2026-11-01: run it now, alongside the critwire missions. It replaces mission site-shots-on-camera; PR #38 is closed unmerged. -->

### Goal

critterconnect.org shows and describes the game as it is on `main`, as one PR from `agent/site-shots-refresh`, with "Closes #37". The mission merges and deploys it, as `MISSION_RELEASE=deploy` says.

- **Every screenshot in `src/site/shots.ts` is retaken**, including `src/site/og.png`, from the mission's base commit.
- **The retake is repeatable from the repo.** The game keeps changing, so these shots will be retaken again. Move `take.mjs` and `convert.mjs` from the cc-website mission's artifacts into the repo, behind one npm script, and point `shots.ts`'s header at it, with the new date and commit.
- **Alt text, photo credits and `ROUND_1` are true** of the new shots.
- **The site's words are true.** Check every statement about how the game plays in `src/site/pages/Home.tsx`, `src/site/pages/Teachers.tsx` and `src/site/config.ts` against the code, and correct what's now false with the smallest edit.

### Why

The owner changes the game often. The old shots were taken at `0bbbeb0e`, and PR #38's retake at `368be9e3` is 27 commits behind: since then the round end moved onto the board, and the game gained "name it", the double match bonus, new "On camera" note highlights, an opt-in auto rule-out and a WCAG pass. Teachers read the site to learn how the game works, so a true description matters more than a flattering one.

### Scope

In:
- `src/site/shots/*.webp`, `src/site/og.png`, `src/site/shots.ts`.
- Screenshot `crop` values and copy in `src/site/pages/Home.tsx`, `src/site/pages/Teachers.tsx` and `src/site/config.ts`, where the new game makes them wrong.
- The moved scripts and one npm script.

Out:
- Game code and game copy, including the lowercase "The camera saw" in `src/components/animalBoard/AnimalSheets.tsx`. List what you notice in the Summary.
- `src/site/pages/Privacy.tsx` and `src/site/pages/Terms.tsx`. If either now looks untrue, add a handoff item and leave it.
- The site's look, layout and page structure, and any new marketing for new features.
- Database schema, seeds and the production content build.
- The old branch `agent/site-shots-on-camera`: reference only. Don't reuse its shots.

### Definition of done

- `npm run typecheck`, `npm run lint`, `npm run site:build` and `npm run e2e:site` pass on the final commit.
- **Checks:** no "Camera saw" in `out/site/` or in any shot (a careful look or OCR). The build references the new hashes. Every shot is checked by eye against its alt text and credits.
- **Artifacts** in `/srv/critter-ai/agent-state/missions/site-shots-refresh/`: one contact sheet of old beside new, and the `e2e:site` report.
- **The PR description and the plan's Summary give:** the base commit, the shot list (before and after), every copy change as before → after with the code that proves it, how many rounds the shots played on the live database, and whether the deploy needs the owner's production content build.
- **Live after release:** `https://critterconnect.org/` and `/teachers/` return 200 and reference the new shot hashes, and `https://play.critterconnect.org/` loads.

### Decision rules

- **Show the game as a new player gets it:** light mode, default settings, opt-in features such as auto rule-out off. Judge copy by the same default.
- **Same seeds, rounds, photos and viewports as before** (seed 1, `continent:africa`), where they still work. If a seed now gives a different board, or a scripted step no longer works, adapt the script, pick the closest match, update `ROUND_1`, alt text and credits, and record why under Decisions.
- **A shot's subject may have moved.** The round end is now on the board, for example. Retake what the page's text is about, and change the `crop` to fit. Don't redesign the page around it.
- **Keep copy changes few.** Correct what's false. Mention a new feature only where leaving it out makes a sentence false. Copy says "caught on camera" or "the one the camera saw", never "mystery".
- **`main` may move during the mission,** because the owner keeps pushing. Shots stay pinned to the base commit. At the release rebase, retake only if a new commit visibly changes a shot, and only once. Otherwise record the difference in the Summary and carry on.
- **The deploy ships all of `origin/main`,** including the owner's game commits. That's expected, so don't hold the release for it.

### Notes

- **The scripts today:** `/srv/critter-ai/agent-state/missions/cc-website/shots/` (`take.mjs`, `convert.mjs`, `COMMAND.txt`; `take.mjs` imports the repo's `scripts/cdp.mjs`). Chromium on this ARM VPS uses the `--no-sandbox` wrapper at `/srv/critter-ai/agent-state/missions/cc-website/bin/chrome`. `/srv/critter-ai/agent-state/missions/site-shots-on-camera/shots/` holds the last run's `compare.mjs` and `contact.mjs`, and `pr-body.md` beside it is a good shape for the PR.
- **Ports:** critwire missions run at the same time and share the Claude usage limit. Their E2E uses 3100 and 3101, and `site:serve`'s default is also 3101. **Never use 3100 or 3101, even though `COMMAND.txt` says 3100.** Serve the built site on 3105 (`python3 -m http.server 3105 -b 127.0.0.1 -d out/site`, then `E2E_SITE_URL=http://localhost:3105 npm run e2e:site`), and run the game's servers on 3106 or higher. Check with `ss -ltn` before binding, and don't change the repo's default ports.
- **The database is live.** `.env.local` points at the real `phaser_june`, and each round played adds to `clue_match_solves`. Play only the rounds the shots need. Don't run the full game E2E: it isn't this mission's check, and it writes many rounds there. Its known result on this VPS is 524/574 with a timing failure.
- **The deploy:** `deploy critter-connect`. This is the first real run of that path, so if it fails, stop and add a handoff item with its output. Don't change the server by hand.

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
