---
mission: next-advisory
project: critter-connect
branch: agent/next-advisory
status: active
started: 2026-11-14 08:48 UTC
---

# Mission: Next.js upgrade past the locked advisories (Critter Connect, audit M1)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

Mission M1 of the codebase audit (vault `research/critter-connect/codebase-audit.md`: read finding A3 and the M1 entry in full). It runs after mission M6 (`server-cleanup`), which removes `drizzle-kit` and with it, most likely, `gel` and `shell-quote`. When it's done:

1. `next` and `eslint-config-next` are at **16.4.6** (the newest 16.x on 2026-11-14; 16.4.1 is the first patched release), with `package.json` raised to `^16.4.6` for both. The lock is refreshed, so `sharp` is at 0.35.5 or later.
2. `source-map-js` is at 1.2.2 or later, and `shell-quote` is at 1.11.0 or later, or gone. Use `npm update <name>`, inside their parents' ranges.
3. `npm audit --omit=dev` reports no high or critical advisory. If one is left that no update within the current ranges can fix, the plan records it with its path (`npm explain`), and the mission goes on without it.
4. Nothing else changes in `package.json`, and `next.config.mjs` is unchanged.

### Why

The locked Next.js 16.3.6 is inside a critical advisory in the image optimizer (GHSA-2464-fhr4-w9xw). Only the default `dangerouslyAllowSVG: false` keeps this app out of its path; nobody checked that, and one config line would remove it. An upgrade within the range `package.json` already allows closes it, and three lesser advisories with it.

### Scope

In:
- `package.json` (the two version ranges only) and `package-lock.json`.
- Code changes the new Next version requires to pass typecheck, lint, tests and the build. Keep them minimal and list each in the plan.

Out:
- Any other dependency upgrade. No major version change of anything.
- `next.config.mjs`. Turning the image optimizer off (`images.unoptimized`) is a separate decision for the owner.
- The database, content and every other audit finding.

### Definition of done

- **Baseline:**
  - Record `npm audit --omit=dev` and `npm ls next sharp shell-quote source-map-js`.
  - Record one GET on the live site: `curl -s -o /dev/null -w '%{http_code}\n' 'https://play.critterconnect.org/_next/image/?url=%2Ffavicon.svg&w=64&q=75'`. Expect 400. If it prints 200, the server is in the advisory's path: say so first thing in the plan, and carry on, because the upgrade is the fix.
  - Run `npm run e2e:fresh` (dev-copy block below) and copy its artifact to `/srv/critter-ai/agent-state/missions/next-advisory/baseline-e2e/`.
- **On the final commit:**
  - `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run site:build` and `npm run e2e:site` exit 0.
  - `npm audit --omit=dev` and `npm ls next sharp shell-quote source-map-js` are recorded again.
- **`npm run e2e:fresh` passes** against the dev copy `phaser_june_dev`, never `.env.local`, with no content build:
  ```
  ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a
    [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1
    CHROME_PATH=$HOME/.local/bin/chrome-nosandbox npm run e2e:fresh )
  ```
  - Never print a connection string or `cat` that file. If the guard fails, stop and add a handoff item.
  - Compare its screenshots with the baseline's by eye; the globe spins. The board, the sheets and the round-end card must look the same.
  - Save the report under `/srv/critter-ai/agent-state/missions/next-advisory/`.
- **Release** (critter-connect's rules: CI's `check` job must pass, a failed `e2e` job is rerun once and then reported, and a failed deploy is reverted). Smoke tests after the deploy:
  - `bash deploy/check.sh` passes, and `version.txt` shows the merge commit.
  - `/explore/`, `/api/clue-game/pool/` and `/api/places/` answer 200.
  - The `/_next/image/` curl above prints 400 again.
- **The Summary** gives both audit and `npm ls` results, every code change the upgrade needed, the E2E result, and the smoke results. It says that no production content build is needed.

### Decision rules

- If 16.4.6 breaks something you can't fix in a small change, try the newest 16.4.x that works (at least 16.4.1). Record why.
- Don't add `overrides` or `resolutions`. A leftover advisory goes in the plan.
- Never change `next.config.mjs` to make a check pass. If a check needs it, stop and add a handoff item.

### Notes

- **Baseline on 2026-11-10 (`4fa92a8e`):** `next` 16.3.6, `sharp` 0.35.4, `shell-quote` 1.10.0 (via `gel`, from `drizzle-kit`) and `source-map-js` 1.2.1 (from `postcss` and `@tailwindcss/node`). M6 changes the lock before this mission, so re-read it on `origin/main`.
- **The app doesn't use `next/image`:** `git grep -n -E "next/image|<Image\b" -- src` finds nothing. With `trailingSlash: true` the optimizer's endpoint is `/_next/image/`.
- **Rolling back:** redeploy the previous commit (`docs/DEPLOY.md:45`). The release rules already revert a failed deploy.
- **Chrome for the E2E:** the shared wrapper `~/.local/bin/chrome-nosandbox` (named in `~/AGENTS.md`). Don't write a copy.
- **Generated types:** `tsconfig.json` includes the generated `.next-e2e` types. If typecheck fails on a stale generated file after the upgrade, run `npm run clean`.
- **Size:** about 11 sessions (audit estimate).

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
