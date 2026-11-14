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

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

Branch `agent/toolchain-cleanup` at `1c40db06` = `origin/main` `af4b0453` (PR #74) + plan. Live `version.txt` `af4b0453`. Files: `S=/srv/critter-ai/agent-state/missions/toolchain-cleanup/` (full grep output `S/greps-before.txt`).

**Packages.** `node -v` v24.21.0. `npm ci` exit 0, one `EBADENGINE` (`critter-connect@1.2.0` requires `node: '22.x'`, current v24.21.0). `npm ls @types/node` → `@types/node@20.17.57`. `git ls-files --eol | awk '{print $1" "$2}' | sort | uniq -c`: `3 i/ w/` (3 skill symlinks/dirs), `37 i/-text w/-text`, `3 i/crlf w/crlf`, `369 i/lf w/lf`, `9 i/none w/none` (`S/eol-before.txt`). Note (not this mission's): npm 11.19 skips install scripts of `@tailwindcss/oxide`, `esbuild`, `unrs-resolver` ("not yet covered by allowScripts"); every check below still passes.

**Fresh greps (all as the audit predicted; nothing kept):**
- D5: each of `CASE_COMPILER_SECRET`, `CRON_SECRET`, `ANALYZE` → `.env.example` only (+ this plan). TiTiler names and `NEXT_PUBLIC_MAP_STYLE_URL` → `.env.example`, `.env.local.example` (+ `plans/040…:85` for the base URL). `NODE_ENV` readers outside the example: `Dockerfile:31`, `next.config.mjs:22` (goes with D24), `src/components/globe/Globe.tsx:114,130`, `src/db/index.ts:25`, `src/game/debugBridge.ts:51` (all stay). `node_modules`: 0 files for the five long names; `process.env.ANALYZE` only in `next/dist/docs/…/package-bundling.md`. Example-file mentions outside plans: only `deploy/app.env.example` (4 places) and the vendored audit-playbook skill; `.dockerignore:10` `.env.*`.
- D10: `check-game-css` outside plans → `docs/DEPLOY.md:63` + the script; 0 in `package.json`, `.github`, `.githooks`, `.claude`.
- D11: `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` → `.env.example:23`, `Dockerfile:16`, `deploy/app.env.example:12`, `docs/DATABASE_ACCESS.md:209` (M6 kept the block). `grep -rl AFTER_SIGN node_modules | wc -l` → **0**. Redirect props in `src`: 0. `.github`: 0. Compose build args: only `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `GIT_COMMIT`.
- D18: `npm (run )?start` 0; `typecheck:watch` only `package.json:41`; `npm run clean` only in `plans/` (next-advisory, server-cleanup), so **no line outside `plans/` to rewrite**; `npm run docs` only 2 plans; 0 in CI/hooks/Dockerfile/deploy.
- D19: `-d docs` only `package.json:33`; `docs/index.html`, `_sidebar` 0 outside this plan; `docsify` only `docs/index.html`.
- D24: header names → `deploy/Caddyfile:4-6`, `next.config.mjs:21,27,28`, `docs/DEPLOY.md:138` (record). Config keys: `distDir outputFileTracingRoot trailingSlash poweredByHeader allowedDevOrigins redirects headers`.
- S15: no `.npmrc/.nvmrc/.node-version/.tool-versions`; Node versions: `ci.yml:17,55` (24), esbuild `node20` in `run-tests.mjs:40`, `run-typescript.mjs:33`, `site.mjs:67` (out of scope).

**Live headers** (`S/headers-before/`, one file per URL): play. `/` 200, `/explore/` 200, `/api/places/` 200, `/no-such-page/` 404, apex `/` 200, apex `/explore/` 308; each has exactly 3: `strict-transport-security: max-age=31536000`, `x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin`. `/login/` → 200. `/explore/`, `/api/places/`, `/api/clue-game/pool/` → 200 (`codes.txt`).

**Checks:** `npm run typecheck` 0, `npm run lint` 0, `npm test` 61/61.

**E2E** (dev copy, guard ok): run 3 `npm run e2e:fresh` exit 0, **1575/1575**, seed 7, 4 rounds (Hairy Frog +310, Hirola lost, Golden-rumped Sengi +50, African Forest Elephant +110); artifact `S/baseline-e2e/` (`report.json`, screenshots, `run.log`, `COMMAND.txt`). Runs 1 and 2, started at load ≈2 on 2 cores right after lint/test, each failed one different timing check, 1574/1575 ("the sort: … rows held paused", then "field guide: signs in pages turn on their own"); reports + logs in `S/baseline-flaky/`. So: start every E2E here at load < 0.6 (`until awk '{exit !($1<0.6)}' /proc/loadavg; do sleep 15; done`).

## Architecture

Read at `7f91ecd1` (= `origin/main` `af4b0453` + plan; `git fetch` 2026-11-14, no code diff vs `origin/main`). Every quoted text is where the brief says; nothing has moved or gone. Dry run in a throwaway copy (`/tmp`, no `.git`, no `.env.local`; deleted after, worktree untouched, `git status` clean): all deletions + headers block removed + S15 `package.json` edits + `npm install` → `npm ci` 0 `EBADENGINE`, `npm ls @types/node` 24.19.2, `tsc --noEmit` 0, `npm run lint` 0, `npm test` 61/61, config keys `distDir outputFileTracingRoot trailingSlash poweredByHeader allowedDevOrigins redirects`. No `next build` in that dry run: group 0 gives the build a before-run. Revised at `80a7e76d` for Fable's items (see Revision notes); the `.env.example` check and lock rule below were re-tried on the unedited worktree.

### Findings (verified sites, ranked by impact)

1. **D24 · `next.config.mjs:19-32`** (deploy path). Lines 19 (blank) to 32: `async headers() {` (20), the comment `// Dev only: Turbopack serves /_next/static/development/_clientMiddlewareManifest.js as JSON, which nosniff blocks.` (21), `if (process.env.NODE_ENV !== 'production') return [];` (22, the file's only `NODE_ENV`), the `/:path*` rule with `X-Content-Type-Options: nosniff` and `Referrer-Policy: strict-origin-when-cross-origin` (23-31), `},` (32). Breaks DRY: Caddy sets the same two values. **Fix:** delete lines 19-32 (14 lines; line 18 `},` of `redirects()` then meets `};`). Nothing else changes: `path`, `fileURLToPath` (lines 1-2) stay used by `outputFileTracingRoot`, `process.env` stays used by `distDir`; no import goes unused. `npm run lint` covers only `src tests scripts`, so the config-keys `import()` is the check that counts, plus `npm run build`. Dev is unchanged (the block returned `[]` there already). **Caddy covers every host:** `deploy/Caddyfile:1-9` `(common)` sets `Strict-Transport-Security "max-age=31536000"`, `X-Content-Type-Options nosniff`, `Referrer-Policy strict-origin-when-cross-origin`, `-Server`; imported by play. (`:12`, before `reverse_proxy app:8080`), apex (`:17`, and again in `handle_errors 404` `:25`), www (`:31`). Baseline confirms 3 headers once each on all six URLs, including Next's own 404 and the apex 308.
2. **D11 · four lines** (two on the deploy path). Breaks "fail fast/established interfaces": a setting that looks live but nothing reads (0 hits under `node_modules`). **Fix:** delete exactly these, each the line right under the kept `NEXT_PUBLIC_CLERK_SIGN_IN_URL`:
   - `.env.example:23` `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/` (shell only, see 4)
   - `deploy/app.env.example:12` `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/` (the file's last line, 12 lines, final newline; the hook doesn't block it, basename `app.env.example` matches none of `.env|.env.*|*.env`). Delete the line with its newline so `:11` keeps its own: `[ "$(sed -n 12p deploy/app.env.example)" = 'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/' ] && sed -i 12d deploy/app.env.example`; then `tail -c1 deploy/app.env.example | od -An -c` prints `\n` (numstat `0 1` catches a slip too).
   - `Dockerfile:16` `ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/` (build stage; line 15 `ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login` and line 17's comment stay)
   - `docs/DATABASE_ACCESS.md:209` `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=...`, inside the ` ```text ` block of the dev-copy settings (M6 kept the block; the fence stays well formed).
3. **S15 · `package.json`** (copied into the image, drives `npm ci`). `:26` `"node": "22.x"` → `"24.x"`; `:66` `"@types/node": "^20"` → `"^24"`. Then plain `npm install`. **Predicted lock diff today, 9 lines in 4 hunks** (the stop rule in group 5 goes by entry, not by these versions): root `devDependencies["@types/node"]` `^24`, root `engines.node` `24.x`, `node_modules/@types/node` 20.17.57 → 24.19.2 (resolved, integrity, `undici-types` range `>=7.24.0 <7.24.7`), `node_modules/undici-types` 6.19.8 → 7.24.6. Both are `dev: true`, so the `run` stage's `npm ci --omit=dev` installs the same packages. npm keeps `package.json`'s 4-space indent. **Typecheck passes with 24.19.2 unchanged: no type-only fixes needed, 0 files** (`skipLibCheck: true`; 66 `@types/node` files load). The decision rule's `^20` fallback is not expected.
4. **D5 · `.env.example`** (29 lines, LF, final newline). Breaks KISS/fail fast: asks for seven names nothing reads, one block "(Required)". Delete lines 5-6 (`CASE_COMPILER_SECRET=…`, `CRON_SECRET=…`), 8-16 (the `# ===` / `# TiTiler Configuration (Required)` / `# ===` heading, `NEXT_PUBLIC_TITILER_BASE_URL=…`, `NEXT_PUBLIC_COG_URL=…`, blank, `# Optional MapLibre style URL. App GeoJSON provides the offline fallback.`, `NEXT_PUBLIC_MAP_STYLE_URL=`, blank) and 23-29 (D11's line, blank, the `# Development Only` heading's three lines, `NODE_ENV=development`, `ANALYZE=false`). **Target, 11 lines, = original lines 1-4, 7, 17-22 verbatim:**
   1. `# =================================`
   2. `# Database (Hetzner VPS PostgreSQL)`
   3. `# =================================`
   4. `DATABASE_URL=…` (original value, untouched; it is the PgBouncer `:6432` TLS route)
   5. (blank)
   6. `# =================================`
   7. `# Clerk Auth (Required)`
   8. `# =================================`
   9. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...`
   10. `CLERK_SECRET_KEY=sk_test_...`
   11. `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login` (then the final newline; no trailing blank line)

   **From a shell only** (the edit hook blocks `.env.*`): one pass, guarded, e.g. check `sed -n '5p;6p;9p;15p;23p;26p;28p;29p' .env.example | cut -d= -f1` gives the expected names/headings, then `sed -i -e '5,6d;8,16d;23,29d' .env.example` (sed numbers input lines, so one call is correct). **Check (the only one that pins which headings stay):**
   ```
   git show origin/main:.env.example | sed -n '1,4p;7p;17,22p' | cmp -s - .env.example && echo same || { echo DIFFERENT; exit 1; }
   ```
   Pass = prints `same`, exit 0; anything else is a failure. It reads `origin/main`, not `HEAD`, so it still holds after group 3's commit and after a rebase, and the final Verification reuses it verbatim. Tried at `80a7e76d`: the unedited file gives `DIFFERENT`/1, the simulated edit `same`/0. If a rebase brings an `origin/main` whose `.env.example` changed, re-derive the line numbers by the quoted texts (Decision rule "Shifted lines") before using it. Never `cat`/`diff`/print the file into a log: line 4 is a connection string. `.env.local.example` (9 lines: `DATABASE_URL`, the two TiTiler names, `NEXT_PUBLIC_MAP_STYLE_URL`) goes with `git rm .env.local.example`. Nothing else names either example (`.gitignore` `.env*.local` doesn't match it; `.dockerignore:10` `.env.*` already kept both out of the image). `.env.vps.example` holds only `POSTGRES_*`, `PGDATA_PATH`, `DB_DOMAIN`, so the final grep doesn't hit it.
5. **D10 · `scripts/check-game-css.mjs`** (89 lines, fails on every branch) and **`docs/DEPLOY.md:63`**. Cut from ` `node scripts/check-game-css.mjs [base] [outDir]` (commit first)` through `Not in CI: it fails by design on a PR that changes the game's styles.`, including the space before it. The line then ends: `…darkened `--color-1`, 2026-11-01).` (the bullet's first two sentences, unchanged). No other reader (`package.json`, `.github`, `.githooks`, `.claude`: 0). Its imports `postcss`, `@tailwindcss/postcss` stay used by `scripts/site.mjs`.
6. **D18 + D19 · `package.json:33,41,42`** `"docs": "python3 -m http.server 3000 -d docs",`, `"typecheck:watch": "tsc --noEmit --watch",`, `"clean": "rm -rf .next .next-e2e .test-dist",`; and `docs/index.html` (82 lines, the only `docsify` hits), `docs/_sidebar.md` (8). All three lines end in commas and none is last, so JSON stays valid. No lock change (scripts aren't in the lock). `serve` (32), `start` (37), `site:shots` (36), `clue:world-map` (50) stay. **No `npm run clean` line outside `plans/`** (re-grepped), so the "say `rm -rf .next .next-e2e .test-dist` instead" item has nothing to edit.
7. **S15 · text only.** `scripts/run-tests.mjs:3-4` now: `// This repo can't install test frameworks (network-restricted), so we lean on` / `// two things that are already here:`. Replace those two lines with:
   ```
   // The network limit is the agent's, not the repo's: an agent's sandbox may
   // have no network, so this runner adds no test framework and leans on two
   // things that are already installed:
   ```
   (75/74/37 chars.) Line 1 `// Offline test runner.`, 2, and 5-10 (1. esbuild, a devDependency, bundles `tests/**/*.test.ts`; 2. Node's built-in `node --test`; Usage) stay. `.editorconfig` (12 lines, LF, **no final newline**): `:8` `indent_size = 4` → `indent_size = 2`, `:9` `end_of_line = crlf` → `end_of_line = lf`; lines 1-7 and 10-12 (`charset = utf-8`, `trim_trailing_whitespace = false`, `insert_final_newline = false`, no trailing newline) stay. Nothing in the repo reads either file.

Fine as is (checked, nothing to do): Caddy coverage; `NODE_ENV` readers outside the config (`Dockerfile:31`, `Globe.tsx`, `src/db/index.ts`, `debugBridge.ts`); `.gitignore`; `deploy/check.sh` (reads no security header); `docs/DEPLOY.md:138` (dated record, still true via Caddy); no `.npmrc` or `engine-strict`, so `engines` stays a warning.

### Target design

After the change: env examples = one file, `.env.example`, holding exactly the four names the app reads; deploy files differ by one deleted line each; security headers live only in Caddy's `(common)` snippet beside HSTS, and `next.config.mjs` has no environment branch (dev and prod configs equal); `package.json` states the Node that runs everywhere (image, CI, VPS: 24) and types to match; scripts list = today's minus `docs`, `typecheck:watch`, `clean`. No runtime code changes; the only bundle-affecting inputs are `next.config.mjs` (headers manifest) and the lock (dev-only packages).

**Change groups, in order** (each a step, its own commit, app working after each; verify typecheck + lint + test each time, plus what is listed). **Build** below always means CI's and the Dockerfile's form, never on `.env.local` (the live DB): `DATABASE_URL=postgres://build@127.0.0.1:1/build NEXT_TELEMETRY_DISABLED=1 npm run build` (`ci.yml:41-44`, `Dockerfile:18`; process env beats `.env.local` in Next, and no page has `getStaticProps`, so nothing queries). **Site E2E** means `npm run site:build`, then `npm run site:serve` in the background (`:3101`), `CHROME_PATH=$HOME/.local/bin/chrome-nosandbox npm run e2e:site`, then stop the server; artifact `e2e-artifacts/<run>-site/report.json`. Heavy runs one at a time, each started at load < 0.6.
0. **Before-run, no edits** (record under Baseline): Build, `npm run site:build`, Site E2E on the unedited branch. Record exit codes and the site report's check/fail counts; copy `report.json` + log to `S/baseline-site/` (no screenshots; disk). A failure here is pre-existing: record it under Decisions and resolve it before group 1, since the final DoD needs all three at 0.
1. **D18 + D19**: three script lines; `git rm docs/index.html docs/_sidebar.md`. Verify: scripts `node -p` check, `git ls-files`, the D18/D19 greps.
2. **D10**: `git rm scripts/check-game-css.mjs`; DEPLOY.md:63 cut. Verify: Site E2E (counts = group 0's), `check-game-css` grep.
3. **D5 + D11**: `.env.example` in the one guarded shell pass above (covers D11's line too, so the file is edited once, not twice by shifting line numbers); `git rm .env.local.example`; then the three other D11 lines (`deploy/app.env.example` by the guarded `sed -i 12d`). Verify: the `origin/main` `cmp` check prints `same`, `grep -c` = 4, `git grep -n NEXT_PUBLIC_CLERK_SIGN_IN_URL` one per file, `git diff --numstat` `0 1` for `Dockerfile` and `deploy/app.env.example`, `0 18` for `.env.example`, `0 1` for `docs/DATABASE_ACCESS.md`.
4. **D24**: delete `next.config.mjs:19-32`. Verify: config-keys `import()`, Build, `git grep -n -E 'async headers|NODE_ENV' -- next.config.mjs` empty. No local `npm run serve` + curl: it would run prod Next on `.env.local` (live DB, Clerk keys) to show only the absence the config keys already show.
5. **S15**: `package.json` two values by hand, `npm install`. **Lock stop rule, by entry:** only root `devDependencies["@types/node"]`, root `engines.node`, `node_modules/@types/node` and `node_modules/undici-types` may change (a newer 24.x / matching `undici-types` patch is fine). Check entries with
   ```
   node -e 'const r=f=>JSON.parse(require("fs").readFileSync(f)).packages,a=r(process.argv[1]),b=r("package-lock.json");console.log("changed: ["+[...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k])).map(k=>k||"(root)").join(" ")+"]")' <(git show origin/main:package-lock.json)
   ```
   pass = `changed: [(root) node_modules/@types/node node_modules/undici-types]` (prints `changed: []` today), and `git diff package-lock.json`'s root hunks touch only those two fields. Anything else = stop and investigate, don't commit drift. Then `rm -rf node_modules && npm ci` 0 `EBADENGINE`; `npm ls @types/node` 24.x; Build. Then the `run-tests.mjs` comment and `.editorconfig` lines (text only; `npm test`).
6. Final Verification per the brief: full DoD list (Build in the dummy-URL form; the `origin/main` `.env.example` `cmp` check from finding 4 prints `same`; the lock entry check; Site E2E), `e2e:fresh` against the dev copy at load < 0.6, eol counts = baseline minus 4 LF files: expect `365 i/lf w/lf`, others unchanged. **`e2e:fresh` can't see D24:** it runs a dev server, where the block already returned `[]`. D24's proof is the config keys + Build before the deploy and the live header smoke (3 per URL, values = `headers-before/`) after it.

**Risks**
- **Deploy path (D11, D24, S15).** CI's `docker build --target caddy` builds `deps` (so it does run `npm ci` on the new lock in `node:24`) and `site`, never `build` or `run`; Hetzner's deploy is the first Docker build of those two. Their diff is one deleted `ARG` (no `ENV` copies it, compose never passed it, no code or SDK reads it) plus the changed lock/config, which CI's native `npm ci` + `npm run build` on Node 24 cover. A build failure stops `deploy.sh` before the container is replaced; a bad deploy is reverted per the release rules. The header smoke (3 per URL, values equal to `headers-before/`) is the live check for D24; `/login/` code for D11.
- **Lock.** Only `npm install` writes it. On a rebase conflict take `origin/main`'s lock, re-apply the two `package.json` values, rerun `npm install`, re-run the group 5 entry check (it diffs against the fresh `origin/main`, so what `origin/main` moved doesn't show). npm 11.19's `allowScripts` warnings (`@tailwindcss/oxide`, `esbuild`, `unrs-resolver`) appear before and after; not this mission's.
- **CRLF/indent.** New `.editorconfig` values change no file. `[*] indent_size = 2` will tell editors 2 spaces in the 4-space files (`package.json`, `next.config.mjs`, …); this mission only deletes lines or changes values there, so no new indented line is written. Don't touch the 3 CRLF files; the eol count check catches any conversion.
- **`.env*` handling.** Hook blocks Edit/Write on `.env.example`; shell only, never `cat`/print it, never open `.env.local`.

**Looks dead, out of scope (notes, not edits):** the dev-copy secrets file may still hold an `AFTER_SIGN` line (harmless; the doc no longer lists it); Hetzner's `deploy/app.env` line (Summary, owner); `.editorconfig` has no per-file override for the 4-space files and its `insert_final_newline = false` doesn't match most files; esbuild `node20` targets (3 scripts) and `package.json` description; `npm install` reports 9 audit advisories (8 moderate, 1 high) left after M1; `AGENTS.md:72` and the `start`/`serve` quick-start line stay.

### Rejected alternatives
- Repair `check-game-css.mjs` (`tree(base, [...deleted, 'src/site'])`): owner chose delete (Q5).
- `npm install -D @types/node@^24`: saves `^24.19.2`, not `^24` (brief).
- Keep `headers()` and drop Caddy's copies: Caddy also covers the static apex and adds HSTS, which Next can't; one place is Caddy.
- Delete `.editorconfig` instead of fixing it: Goal says fix two lines; `indent_style`/`charset` are right.
- Edit `.env.example` in two passes (D5 then D11): line numbers shift between them; one guarded pass with a `cmp` against the original's kept lines is simpler and checkable.
- Separate commits for the lock and `engines`: one `npm install` writes both; splitting adds a second lock refresh for nothing.
- `.env.example` check against `HEAD:` or by `cmp -s` alone: `HEAD` is the new file after group 3, and `cmp -s` is silent on a mismatch.
- Local `npm run serve` + curl for D24: live DB and Clerk keys for a check the config keys already make; Caddy's headers are proven only live.

## Architecture review (Fable)

Read at `d61b40bd` (= `origin/main` `af4b0453` + plan). Every cited site re-opened; lock diff and the `.env.example` pass re-run in `/tmp` copies (deleted).

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. **The `.env.example` check can't fail as written** (finding 4, this plan `:176`; group 3, `:196`). `git show HEAD:.env.example | sed -n '1,4p;7p;17,22p' | cmp -s - .env.example` "(prints nothing)": `cmp -s` prints nothing on a mismatch too (tried on a wrong file: exit 1, no output), and `HEAD:` is the new file once group 3 is committed, so the check can't be re-run at the final Verification or after a rebase. It is the only check that pins which headings stay (`.env.example:1-3,17-19` kept; `:8-10,25-27` gone): numstat `0 18`, `grep -c` = 4 and the final greps all pass if "TiTiler Configuration (Required)" is kept in place of "Clerk Auth (Required)", and the file may not be printed to look. Fix: compare with `origin/main:` and test the exit code, e.g. `git show origin/main:.env.example | sed -n '1,4p;7p;17,22p' | cmp -s - .env.example && echo same || { echo DIFFERENT; exit 1; }`; pass = `same`. Use it in group 3 and in the final Verification.

MISSED:
1. **No before-run of three of the six final commands.** Baseline (`:146`) has typecheck, lint, test and E2E only; the dry run (`:152`) has no `next build`. `npm run build`, `npm run site:build` and `npm run e2e:site` first run after edits (groups 2 and 4), so a failure there can't be told from one that was already present, and `next build` with `@types/node` 24 and no `headers()` is unproven. Run all three once before the first edit and record them under Baseline.

SHOULD-CONSIDER:
1. Lock stop rule (`:198`): state it by entry, not by version. Only root `devDependencies["@types/node"]`, root `engines.node`, `node_modules/@types/node` and `node_modules/undici-types` may change; a newer 24.x patch is fine. Reproduced today with `npm install --package-lock-only`: exactly those 9 lines, 24.19.2 / 7.24.6.
2. Local `npm run build` (groups 4, 5, final): run it as CI and the Dockerfile do, with the dummy `DATABASE_URL` (`.github/workflows/ci.yml:41-44`, `Dockerfile:18`). The worktree's `.env.local` is the live database; no page has `getStaticProps`, so the build needs none.
3. Drop the optional `npm run serve` + curl (`:197`): a production server on `.env.local` (live DB, Clerk keys) that shows only an absence the config-keys check already shows. Say in Verification that `e2e:fresh` can't see D24 (dev server, the block returned `[]`), so its proof is config keys + build + the live header smoke.
4. `deploy/app.env.example:12` is the file's last line: delete it with its newline so `:11` keeps its own (the `0 1` numstat catches a slip).

Confirmed, no change needed: all hits of the brief's two final greps are in files this plan edits or deletes; Clerk 7.7.8 has 0 `AFTER_SIGN` hits and `src` passes no redirect prop; compose forwards only two build args (`deploy/docker-compose.app.yml:13-14`); `deploy/deploy.sh:34-35` builds before `up -d`; nothing (`deploy/check.sh`, the three E2E scripts, CI) reads the two headers or any deleted file; HSTS on play. in `headers-before/` shows Caddy's block applies to proxied answers; the four deleted files are all `i/lf w/lf`, so 365 is right; scope matches the brief, nothing over-engineered.

## Architecture review (Astra)

VERDICT: APPROVE

MUST-FIX: none

SHOULD-CONSIDER: none

## Revision notes

One round, Fable's items (Astra had none). All adopted, none rejected.
- **MUST-FIX 1** (silent, `HEAD`-pinned `.env.example` check): adopted. Finding 4 now has `git show origin/main:… | sed … | cmp -s - .env.example && echo same || { echo DIFFERENT; exit 1; }`, pass = `same`; group 3 and group 6 (final Verification) reuse it. Tried both ways on the unedited worktree without printing the file. Also in Rejected alternatives.
- **MISSED 1** (no before-run of `build`, `site:build`, `e2e:site`): adopted as group 0, before any edit, recorded under Baseline, with CI's dummy `DATABASE_URL`. Not run in this stage.
- **SHOULD-CONSIDER 1** (lock rule by entry): adopted, group 5 (allowed entries + a `node -e` check against `origin/main`, re-used on rebase in Risks); finding 3's versions marked as today's prediction.
- **SHOULD-CONSIDER 2** (build with the dummy `DATABASE_URL`): adopted, defined once as "Build" in the change-group header; used in groups 0, 4, 5, 6.
- **SHOULD-CONSIDER 3** (drop local `serve` + curl; say `e2e:fresh` can't see D24): adopted, groups 4 and 6, and Rejected alternatives.
- **SHOULD-CONSIDER 4** (delete `deploy/app.env.example:12` with its newline): adopted, finding 2 (guarded `sed -i 12d`, `tail -c1` check) and group 3.

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-11-14 16:46 UTC · Baseline: fresh greps as audit (nothing kept, no `npm run clean` outside plans), packages (EBADENGINE 22.x, @types/node 20.17.57), eol counts, live headers 3×6 + codes, typecheck/lint/test 61/61, E2E 1575/1575 → `baseline-e2e/` (2 earlier runs at load 2: 1574/1575, different timing checks).
- 2026-11-14 16:55 UTC · Architecture: architect verified every site at 7f91ecd1 (nothing moved), dry run in /tmp: @types/node 24.19.2 typechecks with 0 fixes, npm ci 0 EBADENGINE, lint 0, test 61/61, lock diff 9 lines; 5 change groups + final Verification.
- 2026-11-14 17:10 UTC · Fable review: APPROVE WITH CHANGES, 1 MUST-FIX (.env.example `cmp -s` check silent on mismatch and pinned to HEAD), 1 missed (no before-run of build/site:build/e2e:site), 4 should-consider. Closed handoff H14 (owner verified).
- 2026-11-14 17:25 UTC · Astra review: APPROVE, no MUST-FIX, no SHOULD-CONSIDER. Fable's MUST-FIX goes to Revision.
- 2026-11-14 17:35 UTC · Revision: architect adopted all Fable items (origin/main `cmp` check fails loud, group 0 before-run of build/site:build/e2e:site, lock rule by entry, dummy-DATABASE_URL build, no local serve+curl, app.env.example last-line delete); none rejected. Plan-only change.

## Summary
