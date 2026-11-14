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

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

On `fade86be` (= `origin/main` `8b645766`, M6 server-cleanup merged), 2026-11-14 08:50 UTC, Node 24.21.0. No migrations (no schema change in scope).

- **Live `/_next/image/` probe:** `400` (not in the advisory's path). Live `version.txt` = `8b645766`.
- `npm ci`, `npm run typecheck`, `npm run lint`, `npm test` (61/61), `npm run build`: all exit 0, build has no warnings.
- **`npm run e2e:fresh`** (dev copy `phaser_june_dev`, guard passed): exit 0, `1575/1575 checks passed`, seed 7, 4 rounds. Artifact + run log: `/srv/critter-ai/agent-state/missions/next-advisory/baseline-e2e/`.
- **`npm ls next sharp shell-quote source-map-js`:** `next@16.3.6` (also via `@clerk/nextjs@7.7.8`, deduped), `sharp@0.35.4` (via next), `source-map-js@1.2.1` (via `postcss@8.5.23` and `@tailwindcss/postcss@4.1.11` → `@tailwindcss/node@4.1.11`). **`shell-quote` is gone** (M6 removed `drizzle-kit`).
- `package.json`: `next` and `eslint-config-next` both `^16.1.0`.
- **`npm audit --omit=dev`:** 3 vulnerabilities (2 high, 1 critical), all "fix available via `npm audit fix`":
  - `next` 16.0.0-16.4.0, critical: GHSA-3w37-wq28-93x7, GHSA-4jqv-mc3x-m676, GHSA-39w2-rjm5-chcv, GHSA-f87g-xv8r-7p7x, GHSA-mcj8-r9mp-w47p, GHSA-cjq9-62q9-8jv4, GHSA-2464-fhr4-w9xw (image optimizer SVG RCE), GHSA-p3m5-59mp-jv5r, GHSA-h694-7cp9-m8p3, GHSA-673q-mjm6-r5xr.
  - `sharp` <0.35.5, high: GHSA-wq5f-xc86-pv6w (librsvg).
  - `source-map-js` 1.0.0-1.2.1, high: GHSA-68fv-2mgg-jv7q.

## Architecture

Checked 2026-11-14 against the registry, the 16.4.x release notes, and the `next@16.4.6` / `eslint-config-next@16.4.6` tarballs, read in `/tmp` and not run. The lock was resolved in a temp copy with `--package-lock-only --ignore-scripts`; the worktree was not touched.

### Findings (ranked)

1. **The 400 probe no longer proves the live server is out of GHSA-2464's path.** [GHSA-7qx7-33qx-rqx2](https://github.com/vercel/next.js/security/advisories/GHSA-7qx7-33qx-rqx2) (medium, published 2026-11-03) covers next `>=16.0.0 <=16.4.4` and is fixed in 16.4.5. It says the optimizer "can be made to process an attacker-supplied SVG even when SVG support is disabled with `dangerouslyAllowSVG: false`" on self-hosted servers. The live server runs 16.3.6 with sharp 0.35.4 (the vulnerable librsvg) on glibc, so the single guard A3 relied on can be bypassed.
   - Exposure isn't shown either: the bypass needs an attacker-supplied SVG to reach the optimizer, and this app has no `images` config (no `remotePatterns`), no `next/image` and no upload route.
   - This advisory is not in npm's database yet (the GitHub global-advisory API returns 404 for it), so `npm audit` does not list it.
   - Effects: the design is unchanged, because the upgrade is the fix. Release without delay, and prefer 16.4.5 as the fallback floor (see Risks). The Summary tells the owner that A3's "out of path" conclusion is no longer proven; it does not say that the live server was exploitable. The vault edit is out of scope.
2. **Targets and paths. Every target fits the existing ranges.**
   | Package | Locked | Comes from | Target | How |
   |---|---|---|---|---|
   | `next` | 16.3.6 | direct `^16.1.0` (`package.json:58`); `@clerk/nextjs` peer, deduped | 16.4.6 | `npm install` |
   | `sharp` | 0.35.4 | next `optionalDependencies` `^0.35.4` | 0.35.5 | automatic: every next 16.4.1-16.4.6 declares `sharp ^0.35.5` |
   | `source-map-js` | 1.2.1 | `postcss@8.5.23` `^1.2.1`; `@tailwindcss/node@4.1.11` `^1.2.1` | 1.2.2 | `npm update source-map-js` (the dry run moved only this entry) |
   | `shell-quote` | gone (M6) | - | gone | record `npm ls` as empty |
   | `eslint-config-next` | 16.1.0 (not 16.3.6) | direct `^16.1.0` (`package.json:73`) | 16.4.6 | `npm install` |
   - `postcss` does not move: next pins `postcss` 8.5.23 exactly in both 16.3.6 and 16.4.6. The lock has one `postcss`, 8.5.23.
   - `eslint-config-next@16.4.6` needs `typescript-eslint ^8.56.0` (8.50.0 is locked) and `eslint-plugin-react-hooks ^7.1.0` (7.0.1 is locked), so those dev dependencies have to move. Their peers fit: typescript-eslint 8.72 needs eslint `^9`, and 9.33.0 is installed; it needs TypeScript `<6.1`, and 5.8.3 is installed.
3. **Clerk is compatible.** `@clerk/nextjs@7.7.8` declares the peer `next ^16.1.0-0`. Every `next/*` subpath it imports exists in 16.4.6, including `next/dist/server/api-utils`, `next/dist/shared/lib/app-router-context.shared-runtime` and `next/compat/router`. The React peers are unchanged.
4. **What changes from 16.3.6 to 16.4.6 for this app:**
   - **`next dev` rewrites the managed block in `AGENTS.md`:** the heading `# This is NOT the Next.js you know` (`AGENTS.md:102`) becomes `## ...` (`dist/server/lib/generate-agent-files.js`). The rewrite happens only when an AI agent is detected, so it happens in mission sessions and not in CI. The first `e2e:fresh` therefore leaves a one-line diff in `AGENTS.md`.
     - Fix: commit it with the upgrade, as the block itself says to, and list it under Decisions as the one file outside the brief's Scope.
     - If the mission's `next dev` doesn't rewrite it (no agent detected), leave it as it is. Never edit the block by hand.
     - Rejected: `agentRules: false`, because it would change `next.config.mjs`.
     - This is the only tracked file outside the lock and `package.json` that should change.
   - **New lint rule `@next/next/no-location-assign-relative-destination`:** it is a warning, and `npm run lint` uses `--max-warnings 0`. `git grep` finds no `location.assign` or `location.href =` in `src`, `tests` or `scripts`, so expect no hit.
     - `eslint.config.mjs:6-7` builds `nextRulesOff` from the plugin's rule list, so `src/site` switches the new rule off by itself.
     - The `core-web-vitals` export keeps its shape: one config with `plugins["@next/next"]`.
   - **`eslint-plugin-react-hooks` 7.1.1:** the `recommended` set has the same compiler rules (`component-hook-factories` was dropped), but the compiler behind those rules changed. New findings are possible; this is the one unverified risk (see Expected code changes).
     - typescript-eslint contributes only the parser and the plugin registration, with no rules, so its upgrade affects parsing only.
   - **Route handlers are now compressed under `next start`** (16.4.6, upstream #101220). This affects the 6 routes under `src/app/api/**`.
     - None of them sets `Content-Encoding` or `Content-Length`, so the 16.4.5 header strip from GHSA-pc58 does not affect them either.
     - Caddy's `encode zstd gzip` (`deploy/Caddyfile:2`) passes responses that are already encoded through unchanged.
     - `deploy/check.sh` runs curl without `--compressed`, so it gets an uncompressed body and never sees this path.
     - The E2E runs on `next dev`, so it doesn't see this path either.
     - No code change. Check it under `next start` before the commit (Target design step 8) and through Caddy after the deploy (release smoke).
     - Live today (16.3.6, Caddy compressing, checked 2026-11-14): `/api/places/` sent with `Accept-Encoding: gzip` returns 200 with `content-encoding: gzip`, and with `--compressed` the body parses as JSON. After the release it must still do both.
   - **Other changes, all fine:**
     - Next now refuses a `distDir` outside the app; `.next` and `.next-e2e` (`next.config.mjs:7`, `scripts/e2e-fresh.mjs:8`) are both inside it.
     - The SVG refusal still returns 400 (`dist/server/image-optimizer/transform.js:146-149`), so the smoke test's 400 still holds.
     - The code that writes `tsconfig.json` and `next-env.d.ts` is byte-identical between the two versions, so `tsconfig.json` will not be rewritten.
     - The app uses no removed experimental flag. Next 16.4.6 needs Node `>=20.9.0`.
     - 16.4.3 changes how `proxy.ts` loads ("Don't load the app-page runtime in proxy.ts"). `src/proxy.ts` (Clerk) is covered by the E2E (`next dev`) and by `deploy/check.sh`.
       - Signed out, `GET /api/clue-game/journal/` calls `auth()` through `clerkMiddleware` and returns 200 `{"entries":[]}` (live, 2026-11-14). A 500 there would mean `auth()` no longer sees the proxy. Check it under `next start` (step 8) and after the deploy.
       - The signed-in path needs a real Clerk account, and the E2E plays signed out. That check is the owner's: a handoff item after the release, with `Blocks: nothing`.
   - **Generated types:** `.next/types` and `.next-e2e/types` from 16.3.6 may be stale. CI typechecks from a clean checkout without them, so run `npm run clean` after the install as a normal step, not as a fallback.
5. **Expected lock diff: 81 entries in the dry run.**
   - **Production (not `dev`):**
     - `next`, `@next/env` and the 8 `@next/swc-*` packages go to 16.4.6.
     - `sharp` goes to 0.35.5, with 26 `@img/*` packages (0.35.5, or 1.3.4 for libvips).
     - `caniuse-lite` and `baseline-browser-mapping` move because npm resolves next's own ranges again.
     - `source-map-js` goes to 1.2.2.
   - **Dev:**
     - `eslint-config-next` and `@next/eslint-plugin-next` go to 16.4.6.
     - `typescript-eslint` and `@typescript-eslint/*` go from 8.50.0 to 8.72.x, with their nested `minimatch`, `brace-expansion`, `balanced-match`, `eslint-visitor-keys` and `ignore`.
     - `eslint-plugin-react-hooks` goes to 7.1.1, with `@babel/*` and `zod`.
     - Also moving: the browserslist chain, `@eslint-community/*`, `ts-api-utils` and `fastq`.
     - `debug` goes from 4.4.1 to 4.4.3 (typescript-eslint 8.72 needs `^4.4.3`). It and `ms` also change their flag from `devOptional` to `dev`.
     - No production package depends on `debug` or `ms` in either lock, so the image built with `npm ci --omit=dev` is unaffected.
   - Unchanged: `postcss`, `react`, `@clerk/*`, `@tailwindcss/*` and every other direct dependency.
   - `--prefer-dedupe` produced the identical diff: the dev churn comes from npm resolving the replaced packages' subtrees again, and no flag avoids it. All of it is dev-only and inside the ranges, so accept it.
6. **Audit after the change (dry-run lock):** `npm audit --omit=dev` reports 0 vulnerabilities.
   - The full audit drops from 13 to 9, all dev-only. What is left: `brace-expansion` (high), `esbuild` (moderate; a direct dev dependency pinned at `0.19.12`) and `minimatch` (moderate).
   - These are out of scope: the brief measures `--omit=dev`, and fixing `esbuild` would be another upgrade. Mention them in the Summary and take no action.
7. **Fine as is:** `next.config.mjs` (no change needed), `postcss.config.js`, the Dockerfile (`npm ci` from the lock, Node 24) and CI (`npm ci`).

### Target design

What changes: `package.json` (two ranges), `package-lock.json`, the generated block in `AGENTS.md` (only if `next dev` rewrites it), and this plan. No `src` change is expected.

Commands, in order, from the worktree root:
1. `git fetch origin --prune`
2. `npm install next@16.4.6 eslint-config-next@16.4.6`
   - Exact versions pin the lock to 16.4.6.
   - npm's default prefix is `^` (no `.npmrc`; `save-exact=false`), so `package.json` gets `^16.4.6`, which the dry run confirmed.
   - Don't use `@^16.4.6` (it would pick a later patch) or `--save-exact` (it would write `16.4.6` without the `^`).
3. `npm update source-map-js`
4. `npm run clean`
5. Record `npm ls next sharp shell-quote source-map-js` and `npm audit --omit=dev` in the plan (the Log now, the Summary at the end).
6. Guards, each of which must pass:
   - `git diff -U0 origin/main -- package.json | grep -c '^[-+] '` prints `4`. It compares with `origin/main`, so it still holds after the commit and after the release rebase.
   - `git diff --quiet origin/main -- next.config.mjs`.
   - `git diff --name-only origin/main` lists only `package.json`, `package-lock.json`, this plan, `AGENTS.md` (if rewritten), and any code fix listed under Decisions.
   - `npm ls --depth=0` exits 0.
   - The lock shape check: `git show origin/main:package-lock.json > /tmp/lock.base.json`, then run the command below. It must print `lock ok`; it passed on the dry-run lock.
     ```
     node -e 'const a=require("/tmp/lock.base.json").packages,b=require("./package-lock.json").packages;const ok=/^node_modules\/(next|@next\/(env|swc-[^/]+)|sharp|@img\/[^/]+|caniuse-lite|baseline-browser-mapping|source-map-js)$/;const bad=Object.keys({...a,...b}).filter(k=>k&&JSON.stringify(a[k])!==JSON.stringify(b[k])&&!(b[k]||a[k]).dev&&!ok.test(k));console.log(bad.length?bad.join("\n"):"lock ok");process.exit(bad.length?1:0)'
     ```
     It allows any production entry to change only if it is in Next's own tree or is `source-map-js`. Dev entries may move.
7. Run `typecheck`, `lint`, `test`, `build`, `site:build`, `e2e:site` and `e2e:fresh` (the brief's dev-copy block).
   - Compare the build log with Baseline's, which had no warnings, and record any new deprecation notice.
8. **Run a production-mode probe on the `.next` from step 7's `npm run build`.** It covers what the E2E (`next dev`) can't: route-handler compression and `proxy.ts` under `next start`.
   - Run it alone; no E2E may be running at the same time. Check `ss -ltn` first: port 3100 must be free.
   - It uses the dev copy, with the brief's guard. Variables from the shell take precedence over `.env.local`.
   - Each check must pass:
     ```
     ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a
       [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1
       setsid node_modules/.bin/next start -p 3100 >/tmp/na-start.log 2>&1 & pid=$!; trap 'kill -- -$pid' EXIT
       B=http://127.0.0.1:3100
       curl -sf --retry 30 --retry-connrefused --retry-delay 1 -o /dev/null $B/ || exit 1
       curl -s -D - -o /dev/null -H 'Accept-Encoding: gzip' $B/api/places/ | grep -qi '^content-encoding: gzip' || exit 1
       curl -s --compressed $B/api/places/ | node -e 'JSON.parse(require("fs").readFileSync(0,"utf8"))' || exit 1
       [ "$(curl -s $B/api/clue-game/journal/)" = '{"entries":[]}' ] || exit 1
       [ "$(curl -s -o /dev/null -w '%{http_code}' "$B/_next/image/?url=%2Ffavicon.svg&w=64&q=75")" = 400 ] || exit 1
       echo probe ok )
     ```
   - It must print `probe ok`. Afterwards, `ss -ltn` must show port 3100 free again.
   - On 16.3.6, `next start` sent route handlers uncompressed: `base-http/node.js` stored a single header value as an array, and the compression filter skipped it. 16.4.6 stores a single value as a string. So the `content-encoding` line is what proves the new path runs.
9. Commit the regenerated `AGENTS.md` block, if any, with `package.json`, the lock and the plan.

**Release smoke, on top of the brief's** (after `deploy critter-connect`, on `https://play.critterconnect.org`; all of these passed on live 16.3.6 on 2026-11-14):
- `curl -s -D - -o /dev/null -H 'Accept-Encoding: gzip' …/api/places/` shows `content-encoding: gzip`.
- `curl -s --compressed …/api/places/` parses as JSON. This proves Caddy passes Next's encoding through and doesn't encode the body twice.
- `curl -s …/api/clue-game/journal/` prints `{"entries":[]}`.
- Then add a handoff item with `Blocks: nothing`: the owner signs in on play., opens the Field Journal, and confirms that it loads and that signing out works. Rolling back is the release rules' revert.

**Expected code changes:** none. The likely ones and their fixes:
- A finding from the react-hooks 7.1.1 compiler: fix the code minimally. If it is a false positive, add a line-level `// eslint-disable-next-line <rule> -- <reason>`, the pattern the repo already uses (`src/components/clueGame/GemIcon.tsx:4`).
- Never turn a rule off in `eslint.config.mjs`.
- A type error from new `next` or `next/server` types: make the minimal type fix.
- List every change under Decisions.

**Risks and fallbacks**, per the brief's rules:
- **Next 16.4.6 breaks the build or the E2E in a way a small change can't fix:**
  - Reset first with `git checkout origin/main -- package.json package-lock.json && npm ci`.
  - Retry with `npm install next@16.4.5 eslint-config-next@16.4.6`, then continue from Target design step 3.
    - Name both packages. With `next` alone, `eslint-config-next` stays at 16.1.0 and `^16.1.0`.
  - 16.4.5 is the preferred floor: it closes GHSA-7qx7 and the six other 16.4.5 advisories.
  - Only if 16.4.5 fails too, try 16.4.4, then lower, down to the brief's 16.4.1. Use the same pattern each time: `npm install next@16.4.<n> eslint-config-next@16.4.6`. `sharp` reaches 0.35.5 in every case.
  - **Below 16.4.5:** `npm audit --omit=dev` still prints 0, because npm doesn't list these advisories yet.
    - Record the open 16.4.5 advisories under Decisions and in the Summary.
    - Add a handoff item (`Blocks: nothing`). It lists each advisory and whether its prerequisites hold here. GHSA-7qx7 needs an attacker-supplied SVG, and nothing here takes one. GHSA-pc58 (cross-client response injection) and GHSA-f3mh (HttpOnly cookie exposure) do apply to a self-hosted app with Clerk cookies.
    - Still release: it closes the critical GHSA-2464 and sharp's high.
  - `package.json` then reads `next ^16.4.<n>`: record that deviation from the brief.
- **Lint findings from the new lint stack** (react-hooks 7.1.1, typescript-eslint 8.72):
  - Stepping `eslint-config-next` down is no fix. Every version from 16.4.0 to 16.4.6 declares `eslint-plugin-react-hooks ^7.1.0` and `typescript-eslint ^8.56.0`, so npm resolves the same 7.1.1 and 8.72.x. The only thing that would change is `@next/eslint-plugin-next`, and its one new rule has no hit here.
  - Fix each finding in code, or add a line-level `// eslint-disable-next-line <rule> -- <reason>` for a false positive (see Expected code changes).
  - **If that isn't a small change:**
    - Reset as above, then run `npm install next@16.4.6` alone. `eslint-config-next` stays at 16.1.0 and `^16.1.0`, and the `package.json` guard prints `2`.
    - Ship the security fix this way. Every production advisory is in `next`, `sharp` or `source-map-js`, and `eslint-config-next` is dev-only. Record the deviation under Decisions.
    - Add a handoff item with the rule, the files and the finding count. For the owner only: 16.3.8 is the newest `eslint-config-next` that keeps the locked react-hooks 7.0.1 and typescript-eslint 8.50.0. It is below the brief's 16.4.1 floor, so the choice is his.
    - Don't walk the versions.
- **A new high or critical advisory appears at implementation time:** try `npm update <name>`. If no update within range fixes it, record it under Decisions as `GHSA id · package@version · npm explain <name> path · why no in-range fix`, and continue.
- **Newer dev patch versions** (typescript-eslint, @babel) published before the implementation: accept them. The lock shape check still holds.

### Rejected alternatives
- `npm audit fix`: it also tries to fix the dev advisories, and what it touches is not deterministic. The brief wants named, in-range updates.
- `overrides` or `resolutions` for `sharp` or `source-map-js`: the brief forbids them, and they aren't needed because both fit their ranges.
- `npm install sharp@0.35.5`: it would add a direct dependency to `package.json`. Next's `^0.35.5` already forces that version.
- `--prefer-dedupe` to cut the dev churn: it produced the identical diff.
- Hand-editing the lock to undo incidental dev bumps: fragile, and it breaks the lock's integrity data for `npm ci`.
- `images.unoptimized: true` or `agentRules: false`: both change `next.config.mjs`, which is out of scope and the owner's decision.
- Stepping `eslint-config-next` down within 16.4.x to avoid react-hooks findings: every 16.4.x resolves the same react-hooks 7.1.1 and typescript-eslint 8.72.
- `eslint-config-next@16.3.8` to keep the old lint dependencies: it is below the brief's 16.4.1 floor, so it's the owner's call (handoff item).
- A hard stop at 16.4.5 instead of the brief's 16.4.1 floor: 16.4.1 to 16.4.4 still close the critical and sharp's high. Releasing one, with a handoff item, beats leaving 16.3.6 live.
- A signed-in E2E with a Clerk test user: it needs a Clerk account and a secret the mission doesn't have, and adding it would be new test scope. The signed-out journal probe plus the owner's sign-in check cover it.

## Architecture review (Fable)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. **The `eslint-config-next` step-down fallback cannot fix the risk it is paired with.** Every `eslint-config-next` 16.4.0-16.4.6 declares `eslint-plugin-react-hooks ^7.1.0` and `typescript-eslint ^8.56.0`, and npm resolves them to 7.1.1 and 8.72.2 each time (lock-only dry run with `eslint-config-next@16.4.1`: react-hooks 7.1.1, typescript-eslint 8.72.2). Stepping down inside 16.4.x only changes `@next/eslint-plugin-next`, whose one new rule has no hit here. It would break Definition of done item 1 and give the same lint result. Replace it: react-hooks 7.1.1 findings are fixed in code or with line-level disables, as "Expected code changes" already says. If that is not a small change, add a handoff item; don't walk the versions. For the owner's information only: 16.3.8 is the newest version that keeps the locked react-hooks 7.0.1 and typescript-eslint 8.50.0 (dry run), and it is below the brief's 16.4.1 floor.
2. **The `next` retry command is wrong as written.** After `git checkout origin/main -- package.json package-lock.json && npm ci`, `npm install next@16.4.5` leaves `eslint-config-next` at 16.1.0 with range `^16.1.0` (dry run), so "leave `eslint-config-next` at 16.4.6" can't happen. The retry must be `npm install next@16.4.5 eslint-config-next@16.4.6`, and the same for each lower version. The `grep -c` guard would print 2 and catch it, but the command should be right.

MISSED: nothing that changes the design. Two corrections to the findings:
- Finding 1 overstates the exposure. GHSA-7qx7 is real and its range and fix are as stated (repository advisory read; seven advisories are fixed in 16.4.5). But it needs an attacker-supplied SVG to reach the optimizer, and this app has no `images` config (no `remotePatterns`), no `next/image` and no upload route. The Summary should say A3's conclusion is no longer proven, not that the live server was exploitable.
- Finding 5: `debug` also moves 4.4.1 to 4.4.3 (typescript-eslint 8.72 needs `^4.4.3`), not only its flag. No production package depends on `debug` or `ms` in either lock, so the `npm ci --omit=dev` image is unaffected.

SHOULD-CONSIDER:
1. Make the `package.json` guard `git diff -U0 origin/main -- package.json | grep -c '^[-+] '`. As written it compares with HEAD, so it prints 0 once the change is committed (final Verification, after the rebase).
2. List the `AGENTS.md` block under Decisions as the one file outside the brief's Scope. If the mission's `next dev` doesn't rewrite it (no agent detected), leave it; don't edit it by hand.
3. If the `next` fallback ends below 16.4.5, add a handoff item as well as the Summary note: `npm audit --omit=dev` will still report 0, and GHSA-pc58 (cross-client response injection) and GHSA-f3mh (HttpOnly cookie exposure) apply to a self-hosted app with Clerk cookies.

## Architecture review (Astra)

VERDICT: APPROVE

MUST-FIX: none

SHOULD-CONSIDER:

1. Verify compressed API responses through Caddy under `next start`. Existing E2E uses `next dev`; deployment probes omit compression, leaving the changed production path untested. [Release notes](https://github.com/vercel/next.js/releases/tag/v16.4.6).
2. Verify signed-in journal access and session handling. Clerk peer compatibility and anonymous gameplay tests do not establish authenticated behavior after the proxy runtime change.
3. Prefer a 16.4.5 minimum fallback. Below that, assess each remaining advisory’s prerequisites against this app; neither a clean audit nor self-hosting alone establishes exposure or safety. [Security fixes](https://github.com/vercel/next.js/releases/tag/v16.4.5).

## Revision notes

- **Fable MUST-FIX 1 (the `eslint-config-next` step-down can't fix the react-hooks risk):** removed it. I confirmed with `npm view` that every 16.4.0-16.4.6 declares react-hooks `^7.1.0` and typescript-eslint `^8.56.0`, while 16.3.8 declares `^7.0.0` and `^8.46.0`.
  - Lint findings are now fixed in code or with line-level disables.
  - If that isn't a small change: ship `next@16.4.6` alone, keep `eslint-config-next` at 16.1.0, and add a handoff item that mentions 16.3.8 for the owner only. No walking versions.
- **Fable MUST-FIX 2 (wrong retry command):** the retry is now `npm install next@16.4.5 eslint-config-next@16.4.6`, with the same pattern for each lower version, then Target design from step 3.
- **Fable corrections:**
  - Finding 1 now says A3's conclusion is no longer proven: no `images` config, no `next/image` and no upload route. It no longer implies the live server was exploitable.
  - Finding 5 now has `debug` 4.4.1 to 4.4.3, dev-only, with no production dependent.
- **Fable SC1 (guard against `origin/main`):** taken. I also added a `--name-only origin/main` file-list guard.
- **Fable SC2 (`AGENTS.md` block):** taken. It is listed under Decisions, and left alone if `next dev` doesn't rewrite it. Never edited by hand.
- **Fable SC3 and Astra SC3 (handoff item below 16.4.5; 16.4.5 as the floor):** taken. 16.4.5 is now the preferred floor. Below it, a handoff item assesses each open advisory against this app.
  - The brief's 16.4.1 floor stays. A 16.4.1-16.4.4 release still closes the critical and sharp's high (see Rejected alternatives).
- **Astra SC1 (compressed responses under `next start` and Caddy):** taken.
  - Target design step 8 adds a local `next start` probe on the dev copy, port 3100: `content-encoding: gzip`, a `--compressed` body that parses as JSON, signed-out journal, and the image 400.
  - The release smoke repeats the compression and journal checks through Caddy.
  - I confirmed in the tarballs that 16.3.6 left route handlers uncompressed: it stored a single header value as an array in `base-http/node.js`. Live passes these checks today, through Caddy's encoding.
- **Astra SC2 (signed-in Clerk/journal):** taken in part.
  - The signed-out `GET /api/clue-game/journal/` returning `{"entries":[]}` proves that `proxy.ts` and `auth()` work after the 16.4.3 proxy change. It is checked under `next start` and on live.
  - The signed-in session needs the owner's Clerk account: a handoff item after the release, with `Blocks: nothing`. A Clerk test-user E2E was rejected (no account or secret, new scope).

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-11-14 08:58 UTC · Baseline: audit 3 (1 critical, 2 high), shell-quote already gone; live image probe 400; typecheck/lint/test/build pass; e2e:fresh 1575/1575, artifact `baseline-e2e/`.
- 2026-11-14 09:17 UTC · Architecture: architect wrote findings + target design (16.4.6 in range; sharp/source-map-js reachable; dry-run lock audit --omit=dev 0; new GHSA-7qx7 bypasses dangerouslyAllowSVG on <=16.4.4, so 400 probe isn't proof; no src change expected). No code change, no checks needed.
- 2026-11-14 09:24 UTC · Fable review: APPROVE_WITH_CHANGES, 2 MUST-FIX (both fallbacks: eslint-config-next step-down can't fix react-hooks risk; next retry must also pass eslint-config-next@16.4.6). Main path reproduced (^16.4.6, lock ok, audit --omit=dev 0). No code change.
- 2026-11-14 09:27 UTC · Astra review: APPROVE, no MUST-FIX; 3 SHOULD-CONSIDER (verify compressed API via Caddy under next start, signed-in journal/Clerk after proxy change, 16.4.5 fallback floor). No code change.
- 2026-11-14 09:32 UTC · Revision: architect resolved Fable's 2 MUST-FIX (dropped eslint-config-next step-down; retry = next@16.4.x + eslint-config-next@16.4.6) and took most SHOULD-CONSIDERs (16.4.5 floor, origin/main guards, next start gzip/journal probe, Caddy smoke). No code change.

## Summary
