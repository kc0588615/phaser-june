---
mission: toolchain-cleanup
project: critter-connect
branch: agent/toolchain-cleanup
status: active
started: 2026-11-14 16:05 UTC
---

# Mission: Toolchain cleanup: dead env lines, unused scripts, the docs viewer, a duplicated headers block (Critter Connect, audit M4)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

Mission M4 of the codebase audit (vault `research/critter-connect/codebase-audit.md`: read findings D5, D11, D18, D19, D10, D24 and S15, the M4 entry, and "What every mission shares" in full). The owner's answers in Notes override the audit where they differ. When it's done:

1. **D5:** `.env.example` keeps only the names the app reads, with their headings: `DATABASE_URL`, and the Clerk block (with D11's line gone). The lines for `CASE_COMPILER_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_TITILER_BASE_URL`, `NEXT_PUBLIC_COG_URL`, `NEXT_PUBLIC_MAP_STYLE_URL` (with its comment), `NODE_ENV` and `ANALYZE` are gone, and so are the "TiTiler Configuration (Required)" and "Development Only" headings. `.env.local.example` is deleted (`git rm`).
2. **D11:** `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` is gone from its four files: `.env.example`, `deploy/app.env.example`, the `Dockerfile` (`ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/`) and `docs/DATABASE_ACCESS.md` (the line `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=...`, the only hit in that file; find it by that text, since M6 rewords the sentence around it. If M6 already removed that block, there is nothing to do there, and the one-line `NEXT_PUBLIC_CLERK_SIGN_IN_URL` check skips that file). `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, on the line just above it in each file, stays.
3. **D18, as the owner decided (Q5):** the `docs`, `typecheck:watch` and `clean` scripts are gone from `package.json`. `serve`, `start`, `clue:world-map`, `site:shots` and every other script stay. Any line outside `plans/` that tells someone to run `npm run clean` says `rm -rf .next .next-e2e .test-dist` instead. There was none on `origin/main` at `2aa3bd2c`; M6, M1 or M3 may have added one.
4. **D19:** `docs/index.html` and `docs/_sidebar.md` are deleted.
5. **D10:** `scripts/check-game-css.mjs` is deleted, with its two sentences in `docs/DEPLOY.md`, in the "**The game's styles stay the game's.**" bullet: from "`node scripts/check-game-css.mjs [base] [outDir]` (commit first)" to "it fails by design on a PR that changes the game's styles." The bullet's first two sentences stay.
6. **D24:** the `async headers()` block in `next.config.mjs` is gone, with its "Dev only: Turbopack serves …" comment. The config has no `NODE_ENV` branch left. Caddy keeps setting both headers.
7. **S15:**
   - `package.json` has `"node": "24.x"` under `engines` and `"@types/node": "^24"`: edit both values in `package.json` by hand, then run plain `npm install`, which refreshes `package-lock.json` for both. (`npm install -D @types/node@^24` would save `^24.19.2`, not `^24`.)
   - The opening comment of `scripts/run-tests.mjs` says that the limit is the agent's, not the repo's: an agent's sandbox may have no network, so the runner adds no test framework and uses two things already installed. The rest of the comment stays.
   - `.editorconfig` says `indent_size = 2` and `end_of_line = lf`. Its other lines stay.

### Why

Each of these says something that isn't true: setup files that ask for seven settings nothing reads, one of them marked "(Required)"; a sign-in setting the Clerk SDK never reads; scripts and a docs viewer nothing uses; a check that fails on every branch; a second copy of headers Caddy already sets; a Node version the image doesn't run. Agents and new machines follow these files, so each wrong line costs a wrong step. D11 and D24 sit on the deploy path, which is why every check after the deploy compares with a baseline.

### Scope

In:
- `.env.example` (edited from a shell), `.env.local.example` (deleted), `deploy/app.env.example`, the `Dockerfile` (the one `ARG` line), `docs/DATABASE_ACCESS.md` (the one line)
- `package.json` (the three scripts, `engines.node`, `@types/node`) and what `npm install` then changes in `package-lock.json`
- Type-only fixes that `@types/node` 24 needs to pass typecheck, within the decision rule below
- `docs/index.html` and `docs/_sidebar.md` (deleted)
- `scripts/check-game-css.mjs` (deleted) and `docs/DEPLOY.md` (its two sentences)
- `next.config.mjs` (the `headers()` block)
- `scripts/run-tests.mjs` (the opening comment) and `.editorconfig` (two lines)
- Any file outside `plans/` with a line that says to run `npm run clean` (that line only)

Out:
- Every other `package.json` script, `scripts/import-natural-earth.mjs`, and every dependency other than `@types/node`. The `esbuild` targets (`node20`) in three scripts and the `package.json` description stay.
- **Sign-in.** `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, the Clerk keys, `/login`, `src/pages/_app.tsx` and `src/proxy.ts` stay. Mission M11 removes sign-in.
- `deploy/Caddyfile`, `deploy/docker-compose.app.yml`, `deploy/check.sh` and `deploy/deploy.sh`.
- The `gh-pages` branch, the GitHub Pages setting, any other GitHub setting and any other branch.
- The database (live or dev copy) and the content build.
- Everything off this repo: Hetzner's `deploy/app.env` and the stack's `.env`, the owner's `.env.local` files, and the AWS TiTiler API and S3 file (the owner shuts those down himself).
- `plans/` (records) and `docs/research/`.
- `.env.vps.example`.
- The TiTiler mentions in `.claude/skills/playtest/SKILL.md` and `CODING_STANDARDS.md`: mission M3 handles agent text, so leave whatever it left. Also `AGENTS.md:72` ("Avoid network installs (restricted)"), and every other audit finding.

### Definition of done

- **Baseline, before any change.** Save everything under `/srv/critter-ai/agent-state/missions/toolchain-cleanup/`.
  - **Fresh greps.** On a fresh `origin/main`, after `npm ci`, re-run the greps under "Roots checked" and "Prove it's safe first" in all seven findings, including D11's `grep -rl "AFTER_SIGN" node_modules | wc -l` (expect 0), and record their output in the plan. If one finds a new reader of a name or a new user of a file this mission deletes, keep that name or file, and note it. The final greps and `git ls-files` checks then exclude what was kept, and the plan says so.
  - **Packages.** Record `node -v`, the `npm ci` output's `EBADENGINE` lines, `npm ls @types/node`, and `git ls-files --eol | awk '{print $1" "$2}' | sort | uniq -c`.
  - **Live headers.** `curl -sI` each of these and save the output to `headers-before/`: `https://play.critterconnect.org/`, `/explore/`, `/api/places/` and `/no-such-page/` on play., and `https://critterconnect.org/` and `https://critterconnect.org/explore/` (a 308; don't follow it). When this brief was written (live at `4fa92a8e`), every one of them had `Strict-Transport-Security`, `X-Content-Type-Options` and `Referrer-Policy` once each. Record `curl -s -o /dev/null -w '%{http_code}' https://play.critterconnect.org/login/` too.
  - **Baseline E2E.** Run `npm run e2e:fresh` once with the dev-copy block below, and copy its artifact to `…/toolchain-cleanup/baseline-e2e/`.
- **On the final commit:**
  - `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run site:build` and `npm run e2e:site` exit 0.
  - `node -e "import('./next.config.mjs').then(m => console.log(Object.keys(m.default).join(' ')))"` lists the baseline's keys minus `headers` (at `2aa3bd2c`: `distDir outputFileTracingRoot trailingSlash poweredByHeader allowedDevOrigins redirects`).
  - The deploy-file edits are one deleted line each: `git diff --numstat origin/main -- Dockerfile deploy/app.env.example` shows `0	1` for both. CI builds only the `caddy` target, so Hetzner's deploy is the first build of the `build` stage. `.env.example` still holds the four kept names: `grep -c -E '^(DATABASE_URL|NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY|CLERK_SECRET_KEY|NEXT_PUBLIC_CLERK_SIGN_IN_URL)=' .env.example` prints 4.
  - `rm -rf node_modules && npm ci` prints no `EBADENGINE`, and `npm ls @types/node` shows a 24.x version, unless the decision rule kept `^20`.
  - The `git ls-files --eol` counts match the baseline's, minus the deleted files.
  - `node -p "Object.keys(require('./package.json').scripts).join(' ')"` has `serve`, `start`, `clue:world-map` and `site:shots`, and not `docs`, `typecheck:watch` or `clean`.
  - `git grep -n NEXT_PUBLIC_CLERK_SIGN_IN_URL -- .env.example deploy/app.env.example Dockerfile docs/DATABASE_ACCESS.md` finds one line in each file.
  - `git ls-files .env.local.example docs/index.html docs/_sidebar.md scripts/check-game-css.mjs` prints nothing.
  - These print nothing. `plans/` and `package-lock.json` are the only exclusions:
    ```
    git grep -n -E 'CASE_COMPILER_SECRET|CRON_SECRET|NEXT_PUBLIC_TITILER_BASE_URL|NEXT_PUBLIC_COG_URL|NEXT_PUBLIC_MAP_STYLE_URL|NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL|ANALYZE=|\.env\.local\.example|typecheck:watch|npm run (clean|docs)\b|-d docs\b|check-game-css|docsify|_sidebar' -- . ':!plans' ':!package-lock.json'
    git grep -n -E 'async headers|NODE_ENV' -- next.config.mjs .env.example
    ```
- **`npm run e2e:fresh` passes** with the same number of checks as the baseline. It runs **against the dev copy `phaser_june_dev`, never `.env.local`, with no content build**:
  ```
  ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a
    [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1
    CHROME_PATH=$HOME/.local/bin/chrome-nosandbox npm run e2e:fresh )
  ```
  Never print a connection string or `cat` that file. If the guard fails, stop and add a handoff item. Save the report under `/srv/critter-ai/agent-state/missions/toolchain-cleanup/`.
- **Release** (critter-connect's release rules: CI's `check` job must pass, a failed `e2e` job is rerun once and then reported, and a failed deploy is reverted). Smoke tests after the deploy, each against the baseline:
  - `bash deploy/check.sh` passes, and `version.txt` shows the merge commit.
  - For each of the six header URLs, `curl -sI <url> | grep -ci -E '^(x-content-type-options|referrer-policy|strict-transport-security):'` prints 3, and the three values equal the ones in `headers-before/`. Save the output to `headers-after/`. Compare header names case-insensitively. A URL whose curl fails or times out is retried up to three times, 10 seconds apart, before it counts. A header that is missing, doubled or changed after that is a failed smoke test.
  - `/login/` answers the same code as the baseline, and `/explore/`, `/api/places/` and `/api/clue-game/pool/` answer 200.
- **The Summary** lists the deleted files and lines, the scripts kept, the `npm ci` and `@types/node` results before and after, both header records, the E2E runs and the smoke results. It says that no production content build is needed. It asks the owner to sign in once on the live site when he next plays, and says the `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` line in Hetzner's `deploy/app.env` can go the next time he edits that file. It names his WSL Node as worth moving to 24 if it isn't already.

### Decision rules

- Delete only what Goal names. Anything else that looks dead or stale is a note in the plan, not an edit.
- **`.env*` files:** Claude Code's edit hook blocks every file named `.env` or `.env.*`, these examples too (`.claude/hooks/guard-edits.sh`, the `case` on the basename). Edit `.env.example` from a shell and delete `.env.local.example` with `git rm`. Never read, print or edit `.env.local`.
- **`@types/node` 24:** if typecheck fails, fix it with type-only changes (no change in what the code does) in at most three files, and list each in the plan. If it needs more, keep `@types/node` at `^20`, still set `engines.node` to `24.x`, and record the errors in the plan.
- **`start` and `serve` stay** (owner, Q5), even though `AGENTS.md`'s quick start spells out `start` as `npm run build && npm run serve`. Don't change that line.
- **Indentation:** `.editorconfig`'s new values describe new edits only. Don't reindent or convert the line endings of any file, including the three CRLF files.
- **Lock conflicts on rebase:** never hand-merge `package-lock.json`. Take `origin/main`'s copy, re-apply this mission's `package.json` edits, and rerun `npm install`.
- **Shifted lines:** re-read every site on a fresh `origin/main` and find it by the text this brief quotes. If a quoted text is gone, record where it went, and don't edit a near match.

### Notes

- **Owner answers (Danby, 2026-11-14), which override the audit.**
  - Q4: the AWS TiTiler API and S3 file still run, but no code has read their names since `d24d95a1` (2026-10-13), so D5 deletes the lines. Git history keeps the two addresses.
  - Q5: keep `serve`, `start`, `clue:world-map`, `site:shots` and `scripts/import-natural-earth.mjs`. Delete `docs`, `typecheck:watch`, `clean` and `scripts/check-game-css.mjs`. The audit's D18 deleted `start` too; the owner kept it.
  - Q6: GitHub Pages is on, but it serves the `gh-pages` branch (an old docs site from 2026-05-22), not `docs/` on `main` (the Pages API says `source: gh-pages /`). Deleting the viewer is safe.
  - The game isn't released to the public yet. Mission M11 removes sign-in; D11 removes only the unused name.
- **Missions that merge first.** The audit pinned `4fa92a8e`; this brief was checked at `2aa3bd2c` (PR #71). Before this mission starts, M6 (`server-cleanup`: removes `drizzle-kit`, `drizzle.config.ts` and `db:introspect`, and edits `docs/DATABASE_ACCESS.md` and `AGENTS.md`), M1 (`next-advisory`: `next` and `eslint-config-next` in `package.json` and the lock; `next.config.mjs` unchanged) and M3 (agent instruction files, `AGENTS.md`) merge. So `package.json`, the lock, `docs/DATABASE_ACCESS.md` and `AGENTS.md` will have moved.
- **Why D11 is safe.** `deploy/docker-compose.app.yml` passes only `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `GIT_COMMIT` as build args, so the Dockerfile's `ARG` always had its default, and nothing reads it. The locked `@clerk/nextjs` reads `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` and `…_FORCE_REDIRECT_URL` instead. An unattended mission can't sign in, so `/login/`'s answer is its live check, and the owner signs in himself.
- **Why D24 is safe.** Caddy's `(common)` snippet sets all three headers on every host, and its `-Server` deletion defers the header block, so Caddy's values replace Next's. The app's port is only exposed to the Docker networks. The apex is static files served by Caddy and doesn't pass through Next; it's in the baseline as a control.
- **`deploy/app.env.example`** isn't blocked by the hook (its basename doesn't start with `.env`), so it can be edited normally.
- **Line endings at `2aa3bd2c`:** 3 tracked files contain CRLF (`LICENSE` and two CSVs in `docs/research/2026-11-07-moves-and-signs/`); every other text file is LF. Most of `src`, `scripts` and `tests` indent by 2; `package.json`, `next.config.mjs` and a few others by 4.
- **Node:** the image (`FROM node:24-bookworm-slim`, twice), CI (`node-version: 24`) and this VPS (v24.21.0) all run 24. The newest `@types/node` 24.x when this was written was 24.19.2. The lock's root entry records `engines`, so `npm install` updates the lock for that change too.
- **Chrome for the E2E:** the shared wrapper `~/.local/bin/chrome-nosandbox` (named in `~/AGENTS.md`). Don't write a copy.
- **Generated types:** `tsconfig.json` includes the generated `.next-e2e` types. If typecheck fails on a stale generated file, run `rm -rf .next .next-e2e .test-dist` (the `clean` script is gone).
- **The pre-push hook** runs typecheck and lint.
- **Size:** about 13 sessions (audit estimate).

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
