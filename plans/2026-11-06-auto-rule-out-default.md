---
mission: auto-rule-out-default
project: critter-connect
branch: agent/auto-rule-out-default
status: active
started: 2026-11-06 06:27 UTC
---

# Mission: Auto rule-out on by default (Critter Connect)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

A player who opens the game for the first time, on a device with no saved choice, has **Auto rule-out** on: the menu's switch shows on, and from the first move the game rules out every suspect whose shown answer differs from a shown camera answer.

- A player who already turned the switch **off** keeps it off. A stored `'off'` is a choice and must win.
- A player who turned it on keeps it on.
- The switch still turns it off and on, and the choice is still kept on the device.
- If storage is blocked (private mode, `localStorage` throws), the game uses the new default: on.

### Why

The owner wants new players to get the easier, guided game from the start; the ones who want to do all the ruling out themselves can turn it off in the menu. Auto rule-out changes no scoring, so this is only a default.

### Scope

In:
- `src/components/animalBoard/autoRuleOut.ts`: the default (today `getItem(KEY) === 'on'`, so "no value" means off). Keep the key `critter-connect:auto-rule-out:v1` so existing choices survive.
- `src/components/animalBoard/useAnimalSession.ts:77-78`: the initial state (`useState(false)`, then corrected in an effect). Make sure a first-time player never plays a move with it off. Don't introduce a hydration mismatch.
- Comments that call it opt-in or "off until the player turns it on": `autoRuleOut.ts:1`, `AnimalSheets.tsx:410`, `useAnimalSession.ts:273`.
- `scripts/e2e.mjs`: round 4 asserts "Auto rule-out starts off" (`:846-864`, `:1149`), and the "off" rounds rely on that. Make the suite set the switch per round on purpose rather than rely on the default, and add a check that a fresh profile (no stored value) starts **on** and a stored `'off'` starts **off**.
- Copy that becomes false:
  - `src/site/pages/Teachers.tsx:64` ("The answers never rule anyone out by themselves").
  - `docs/CLUE_MATCH.md:54` ("off by default") and `:96` (the round-4 test description).
  - The how-to-play text in `AnimalSheets.tsx:712`, if it reads wrong with the switch on by default.
  - `CONTEXT.md:73` ("answers never rule anything out by themselves"), if the glossary means the default game.
  - Scan the site pages (`src/site/pages/`) and the game's help for other copy that assumes it's off. Keep the edits small and true.

Out:
- How Auto rule-out decides what to mark, scoring, the board, the grid's sort. This changes the default only.
- The site's screenshots (`npm run site:shots`). The owner has set their retake aside. Say in the Summary whether the current shots now show a non-default setting, but don't retake them.
- Privacy and Terms (critter-connect handoff H7 is the owner's).
- The live database: e2e runs against it are allowed (owner, 2026-11-01), but write nothing else to it.

### Definition of done

- Typecheck, lint, `npm run build` and the full E2E suite pass on the final commit. The repo's pre-push hook runs typecheck and lint, so the push itself proves them.
- The new E2E checks: a fresh profile starts on, a stored `'off'` starts off, a stored `'on'` starts on, and the switch toggles and is remembered across a reload.
- E2E output and screenshots of the menu on a fresh profile go in `/srv/critter-ai/agent-state/missions/auto-rule-out-default/`. Keep these small: no Playwright traces or HTML report there.
- The plan's Summary lists every copy and doc line changed, with the before and after, and says whether the production content build is needed (it shouldn't be).
- Released per the project's setting: merge, `deploy critter-connect`, and check that `https://play.critterconnect.org/version.txt` reports the merge commit. Then load the live game in a fresh browser profile and confirm the switch shows on.

### Decision rules

- A stored choice always beats the default. Never migrate, reset or rewrite existing values.
- If a copy line is unclear, prefer the smallest edit that's true for a new player with the default settings.
- The size of this change should match the request: one default, its tests and its copy. Don't refactor around it.

### Notes

- `autoRuleOut.ts` today: `isAutoRuleOutOn()` returns `localStorage.getItem(KEY) === 'on'`, falling back to `false` if storage throws; `setAutoRuleOutOn` writes `'on'` or `'off'`.
- `useAnimalSession.ts:273-278` runs the marking between moves when the setting is on, and `AnimalGame.tsx:406` says why an animal can't be ruled back in.
- The control room checked these facts on `origin/main` at `094da493` (PR #53 merged).
- Work board: none. There's no issue for this, so don't create a card.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

From `7370579c` (= `origin/main` `094da493` + mission start), 2026-11-06 06:30 UTC.
- `npm install`: ok. Migrate: n/a (no migration history; `db/schema.sql` baseline, live `phaser_june`, no schema change in scope).
- `npm run typecheck`: exit 0. `npm run lint`: exit 0. `npm test`: 48/48 pass.
- `npm run e2e:fresh`: **1473/1473** checks, 4 rounds (seed 7), 6m57s. Artifact: `/srv/critter-ai/agent-state/missions/auto-rule-out-default/baseline-e2e/` (report.json, screenshots, e2e.log, COMMAND.txt).
- E2E needs Chrome without its sandbox here (AppArmor): `CHROME_PATH=/srv/critter-ai/agent-state/missions/auto-rule-out-default/bin/chrome` (wrapper: Playwright chromium-1208 `--no-sandbox`). Plain `npm run e2e:fresh` fails (`/usr/bin/google-chrome ENOENT`).

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

- 2026-11-06 06:38 UTC · Baseline: typecheck, lint, 48/48 unit, E2E 1473/1473 pass.

## Summary
