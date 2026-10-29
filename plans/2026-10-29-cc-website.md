---
mission: cc-website
project: critter-connect
branch: agent/cc-website
status: active
started: 2026-10-29 11:06 UTC
---

# Mission: Critter Connect website (plan 051 build)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


To start: copy this file to `/srv/critter-ai/agent-state/missions/briefs/YYYY-MM-DD-cc-website.md` (today's date), then run `mission start critter-connect <that file>`. Start only after the owner merges the plan PR and relabels issue #34 `ready-for-agent`.

### Goal

The website at critterconnect.org, built as [plan 051](051-landing-page.md) designs it, delivered as one PR on kc0588615/phaser-june from `agent/cc-website`:

- 4 pages and a 404 from `src/site/`, rendered to static HTML by `npm run site:build` into `out/site/`: `/` (students), `/teachers/`, `/privacy/`, `/terms/`, `404.html`. Copy, sections and claims as 051 §4–§6.
- Served by the Hetzner Caddy: the site files built into the `caddy` image; Caddy blocks for `critterconnect.org` (site, 404, old game paths 308 to `play.`) and `www` (308 to the apex); `play.critterconnect.org` keeps the game and also serves `/teachers/`, `/privacy/`, `/terms/`, `/site/*` (051 §10).
- `deploy/check.sh`, run by `deploy/deploy.sh` and by the owner after the DNS move.
- Real screenshots of the game with their photo credits (051 §9).
- The two owner-approved theme additions, and no other theme change (051 §8).
- `npm run e2e:site` and the other checks below, all passing, with artifacts.

### Why

critterconnect.org still shows an old Vercel app for a game that no longer exists. Teachers need a plain, honest reason to bring the game into a class, and students need one click to start playing. The owner approved what the site says and how it ships in plan 051.

### Scope

In:
- **New:** `src/site/**` (`config.ts`, `Layout.tsx`, `LegalArticle.tsx`, `ClassLink.tsx`, `classLink.client.ts`, `pages/{Home,Teachers,Privacy,Terms,NotFound}.tsx`, `render.tsx`, `shots.ts`, `shots/*.webp`, `og.png`, `site.css`), `src/components/Wordmark.tsx`, `src/lib/contentProfiles.ts`, `scripts/site.mjs`, `scripts/cdp.mjs`, `scripts/e2e-site.mjs`, `deploy/check.sh`.
- **Changed:**
  - `src/styles/globals.css`: only `--button-primary-background` (light `#008663`, dark `#00906c`) and `--space-xxxl: 64px` with `--spacing-xxxl`, each with a comment citing plan 051 and H2.
  - `src/components/globe/GlobeScreen.tsx`: uses `Wordmark`.
  - `src/lib/theme.ts`: exports the theme-color pair; `src/pages/_app.tsx` imports it.
  - `scripts/content.ts`: imports `readProfiles` from `src/lib/contentProfiles.ts`.
  - `scripts/e2e.mjs`: imports `scripts/cdp.mjs`; `screenshot()` removes `nextjs-portal` first; a `02d-field-guide.png` shot while the guide is open.
  - `scripts/check-theme.mjs` (`src/site` in `ROOTS`; `_app.tsx` out of `HEX_ALLOWED`) and `eslint.config.mjs` (`no-restricted-imports` in `src/site/**`: `next`, `next/*`, `@clerk/*`).
  - `package.json`, `package-lock.json`: scripts `site:build`, `site:serve`, `e2e:site`; devDependencies `esbuild@0.19.12` and `axe-core@4.11.0` (both already in the lockfile).
  - `.github/workflows/ci.yml`, `Dockerfile`, `deploy/docker-compose.app.yml`, `deploy/Caddyfile`, `deploy/deploy.sh`.
  - `docs/DEPLOY.md`: a website section and Caddy's row in "What runs where". `AGENTS.md`: a "Website" line in "Where Things Live".
  - `README.md:3` (stale "mystery" wording) and a dated note under `docs/ANIMAL_BOARD_PAPER.md` §5.3 item 11 (rounds are now saved with `session_seed`).
- **Deleted** (moved into `src/site/`): `src/pages/privacy.tsx`, `src/pages/terms.tsx`, `src/components/LegalPage.tsx`.
- Installing Taste and elaya's skill, pinned, in the artifacts folder (not the repo).
- Running the game locally (dev and production build) against the dev database to take screenshots; e2e's normal round saves to the dev copy.

Out:
- Game rules and UI beyond the `Wordmark` move and the light primary fill.
- Any theme value beyond the two above; `gui/`, `GUI.md`, `.agents/skills/`.
- New npm packages (declaring the installed esbuild and axe-core is allowed). `.dockerignore` stays as it is.
- Clerk settings; any Clerk or framework script on the site.
- Deploying, DNS, Vercel, Hetzner. The owner does these from WSL (051 §10, owner's steps).
- DB writes beyond e2e's normal round saves; bulk queries on the shared Hetzner server.
- Merging the PR. Critter Connect missions never merge or deploy.

### Definition of done

- `npm run typecheck`, `npm run lint` and `npm test` pass; `npm run build` passes.
- `npm run site:build` twice in a row, then `diff -r` of the two outputs finds no difference (deterministic build).
- `npm run e2e:site` against `npm run site:serve` (port 3101) passes in full: `/`, `/teachers/`, `/privacy/`, `/terms/`, `/404.html` at 390×844 and 1440×900, light and dark; axe-core wcag2a/2aa/21a/21aa with 0 violations and no exceptions; plus every check in 051 §11 (one h1, scrolls to the footer, meta and canonical, Play links, no `<script src`, same-origin requests only, no console errors, the class link).
- `npm run e2e` (the game) shows no new failures against the VPS baseline; the owner confirms the full run on WSL.
- Taste: `lint.mjs` clean on `src/site/`; `inspect.mjs --allow still-page` with 0 FAIL at 1440, 768 and 390 on `/` and `/teachers/` of the served build; every screenshot opened by eye; the critique written.
- graphical-audit change review of the diff, listing the two theme additions as intentional local changes.
- Speed on `/` and `/teachers/` at 390 (4× CPU, Slow 4G): LCP ≤ 2.5 s, CLS ≤ 0.1, ≤ 300 KB first load, measured by a CDP script kept in the artifacts.
- `caddy validate` (with `APP_DOMAIN=play.critterconnect.org`) and the local `*.test` behaviour run (051 §10) pass on the final `deploy/Caddyfile`; `bash -n` passes on `deploy/deploy.sh` and `deploy/check.sh`.
- CI green on the PR, including `npm run site:build`, `docker build --target caddy`, and `caddy validate` plus the `/srv/site/index.html` check inside that image.
- Artifacts in `/srv/critter-ai/agent-state/missions/cc-website/`: the `e2e:site` report and screenshots (also in `e2e-artifacts/`), Taste's inspect output and critique, the audit report, the speed numbers, the Caddy run, each with the command to reproduce it.
- A PR to `main` that says `Refs #34`; it is never merged or deployed by the mission.
- The plan's Summary: what was built, check results and artifact paths, review verdicts, and the owner's deploy steps 1–6 plus rollback from 051 §10.

### Decision rules

- 051 is the design. The build's architect checks it against the repo at the start and records only the deltas; it doesn't redesign.
- `GUI.md` and the cc tokens win. Taste and elaya shape only layout and copy. A clash becomes a handoff item with 051's default, and the build goes on with the default.
- Claims come only from 051 §5's table; never-claim items stay out. Player copy says "the one the camera saw", never "mystery".
- Only 051 §6's three coming-soon items are shown, on `/teachers/`, each starting "Not available yet:".
- The two approved additions are the only theme changes. A new gap goes to the handoff file with a default.
- If a skill's repo has moved past its pin, use the pin and note the newer version.
- Keep it small: the four pages and the 404, nothing more.

### Notes

- Design: `plans/051-landing-page.md` (site map §3, pages and copy §4, claims §5, coming soon §6, skill intake §7, skills and cc §8, assets §9, hosting §10, basics §11, owner's answers and the 4 defaults §12). History and reviews: `plans/2026-10-28-cc-landing-plan.md`.
- The plan's PNGs in `plans/051-landing-page/` are reference only. Retake every site shot from the game as it is then, light mode: round-start shots from the production build (`npm run build && npx next start -p 3100`), the rest from seeded `npm run e2e` (`E2E_SEED`, `E2E_PLACE`). If the VPS e2e stops before a round ends (known timing failure), finish the seeded round in the dev browser with `window.__cc` (the playtest skill). Record seed, place and visible animal ids in `src/site/shots.ts`; commit WebP made once with the installed `sharp`.
- Site images live under `src/site/`, never at the repo root: `.dockerignore`'s `*.png` drops root-level PNGs.
- `scripts/run-typescript.mjs` can't run the site build (Tailwind's native modules can't be bundled); `scripts/site.mjs` calls esbuild, postcss and Tailwind directly, as `scripts/run-tests.mjs` does. Compiling `site.css` with `@tailwindcss/postcss` `base: src/site` was proven on 2026-10-28 (20 KB, 5.4 KB gz).
- Skills, pinned, installed in the artifacts folder: Taste (`design-taste-frontend`, folder `skills/taste-skill/`, v2.1.5, commit `12af471f62`, 2.4 MB) and elaya's `landing-page-design` (commit `ded7efc9d5`; Part A only). Skip Taste's art direction (`draw.mjs`), tokens, `assets.mjs`, motion and `base.css` (051 §8).
- Taste's launcher doesn't pass `--no-sandbox` and AppArmor blocks Chrome's sandbox: point `CHROME_PATH` at a wrapper script that runs `~/.cache/ms-playwright/chromium-1208/chrome-linux/chrome --no-sandbox "$@"`. Run `inspect.mjs --out /srv/critter-ai/agent-state/missions/cc-website/taste-inspect`.
- Docker isn't installed on the Oracle VPS. The `caddy` image is proven in CI, and finally by the owner's deploy. Caddy itself can run locally for `caddy validate` and the `*.test` run.
- A Taste run takes about 30–45 minutes and a few hundred thousand tokens per page. Expect about 6 units: (1) infrastructure: site build, `Layout`, Docker, compose, Caddy, `check.sh`, CI, guards, README and paper fixes; (2) shots and credits; (3) `/`; (4) `/teachers/`; (5) legal pages' move, 404, `e2e:site`; (6) checks and the audit.
- The operator is Haunted Pavement LLC (footer, and the terms where they say "we"); the terms' "Last updated" moves to the build's date. Contact is `privacy@critterconnect.org`, as today.
- The owner develops in WSL; base on a fresh `origin/main` and rebase before the PR.

### Addendum (control room, 2026-10-29): owner's decisions on PR #35's defaults

This addendum is part of the brief. Where it differs from the brief or from plan 051, it wins. Record each change under Decisions, and update 051 in the same PR.

1. **The darker button green is for the site only.** It applies to `src/site/` pages only. The game's buttons, and the theme the game uses, stay exactly as they are. 051 §8's default (the darker fill also on the game's buttons) is overturned. If the darker value has to live in the shared theme file, scope it to the site, for example as a site-only token or class. The game's own pages must render byte-for-byte the same styles as before, and a test proves it.
2. **A clean split between the two hosts.** 051 §10's default (`play.` also serves `/teachers/`, `/privacy/`, `/terms/`, `/site/*`) is overturned.

   | Host | Serves |
   |---|---|
   | `play.critterconnect.org` | the current game application only |
   | `critterconnect.org` | the standalone website: `/`, `/teachers/`, `/privacy/`, `/terms/`, and its 404 |
   | `www.critterconnect.org` | a 308 redirect to the apex |

   - **Delete the game's privacy and terms pages entirely** (owner: "duplicative and un-needed"): `src/pages/privacy.tsx`, `src/pages/terms.tsx`, `LegalPage.tsx`, and anything only they use. The game app keeps no legal page, component or text. The privacy text and the terms exist once, on the website, moved from the game's pages. Their words are unchanged except for the operator sentence (Haunted Pavement LLC), already in 051.
   - **No redirect** (owner, 2026-10-29: "it isn't needed"). `play.` keeps no legal paths and no Caddy rule for them; the old `play.critterconnect.org/privacy` and `/terms` simply return the game's normal 404.
   - Every link in the game to privacy, terms or teachers (footer, sign-in screens, anywhere) points to the absolute `https://critterconnect.org/...` URL. Grep for every one, list them in the PR, and test that none still points to `play.` paths.
   - The Clerk sign-in configuration and any other place that names the legal URLs: list them. Anything that can't be changed in the repo (the Clerk dashboard, for example) goes in the PR description as an owner step.
   - `deploy/check.sh` checks both hosts:
     - the site's pages return 200 on the apex
     - `play.` serves the game, and has no `/privacy` or `/terms` page
     - `www` returns 308 to the apex
3. **Vercel is being deleted now** (owner, 2026-10-29): no rollback window and no rollback to Vercel. Remove the rollback-week text from 051 §10 and the owner steps.
   - critterconnect.org shows an error until this site ships.
   - The DNS is at **Namecheap** (`dns1/dns2.registrar-servers.com`). Today the apex A record points to Vercel (`216.198.79.1`), and `play.` points to Hetzner (`178.156.159.183`).
   - The PR description's owner steps are:
     1. Deploy.
     2. In Namecheap, point `critterconnect.org` (A) and `www` (CNAME to the apex, or A) at Hetzner `178.156.159.183`, and leave the other records (`play`, `clerk`, mail, `db`) untouched.
     3. Run `deploy/check.sh` once DNS has propagated.
   - The PR's failing "Vercel" check came from that old project; ignore it.
4. **Defaults 3 and 4 stand:** a brief Caddy restart during the owner's deploy is fine, and the terms' "Last updated" date moves with the operator sentence.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none): none needed
- [x] Steps: `planner` writes Steps and Verification

## Baseline

2026-10-29, worktree at `e61fb53e` (origin/main `0bbbeb0e`), Node 24.21.
- Install: `npm ci` clean (npm's install-script gate skipped postinstalls; esbuild, Tailwind oxide arm64 still load). Migrate: n/a (no migration history; DB is the shared dev copy).
- `npm run typecheck`: pass. `npm run lint`: exit 0. `npm test`: 47/47. `npm run build`: pass (pages `/`, `/explore`, `/login`, `/privacy`, `/terms`).
- `npm run e2e` (dev server :3100, Playwright Chromium 1208 via `--no-sandbox` wrapper `/srv/critter-ai/agent-state/missions/cc-website/bin/chrome`), run twice: **524/574** then **523/574**. Same known VPS timing failure as cc-landing-plan's baseline (523/574): time-based hold check / tap-scout check fails, then the field guide photo covers the board (`nothing on screen covers the board` x45), round 1 never ends. Not code; owner's WSL run is the full-pass reference. This is the bar for "no new failures".
- Artifacts: `/srv/critter-ai/agent-state/missions/cc-website/baseline-e2e/` (both runs' report.json + screenshots, logs, build and test logs). Reproduce: `npx next dev -p 3100`, then `E2E_BASE_URL=http://localhost:3100 CHROME_PATH=/srv/critter-ai/agent-state/missions/cc-website/bin/chrome npm run e2e`.

## Architecture

2026-10-29, architect. I checked the repo at `78845f09`. Its code equals origin/main `0bbbeb0e`, and no code has changed since 051's line refs at `acffc179` (`git diff --stat acffc179 0bbbeb0e` shows only `plans/`). 051 is the design. This section records only the repo deltas and the addendum's changes.

### Findings

**051 still matches the repo.** Verified:
- `globals.css:371-376` scroll lock
- `_app.tsx:11` ClerkProvider; `_app.tsx:15-16` theme-color hexes, and `check-theme.mjs:11` lists `_app.tsx` in `HEX_ALLOWED`
- `GlobeScreen.tsx:55-58` wordmark pair
- `LegalPage.tsx:5`, `:13`, `:16`
- `scripts/content.ts:23` `readProfiles`
- `scripts/e2e.mjs:45-90` CDP client and launcher; the field-guide shot point is around l.343-354
- `docker-compose.app.yml:33` single-file Caddyfile mount
- `deploy.sh:43-45` curl loop
- `ci.yml`: one `check` job, no Docker step
- `ANIMAL_RULES` at `animalBoard.ts:56`; `useAnimalSession.ts:28-31`; `CLUE_MATCH.md:10`, `:23`, `:98`
- lockfile: esbuild 0.19.12 and axe-core 4.11.0, dev and transitive only (via drizzle-kit and jsx-a11y); sharp 0.35.4 optional via next
- `.dockerignore`'s `*.png` matches root-level files only

**Deltas vs 051 (repo facts):**
- **D1. The button token doesn't exist yet.** There is no `--button-primary-background` today. `.btn-primary` reads `--color-1` directly (`globals.css:415`), with a `--neutral-1` label. Under the addendum the token is new and lives only in the site (A1).
- **D2. Tailwind scans the whole repo for the game.** `globals.css:1` is a bare `@import "tailwindcss"`, and `postcss.config.js` sets no `base`. So the game's Next CSS picks up candidates from every file that isn't gitignored: `src/site/**`, and today already `plans/**`, `docs/**` and `scripts/**`. The game's built CSS will therefore gain site-only utilities. No game element uses them, but comparing the two `next build` CSS files can never come out byte-equal. Proven in `/tmp` today:
  - compiling `globals.css` over `git archive HEAD src` alone takes 0.2 s and gives the same bytes twice;
  - deleting the 3 legal files removes only LegalPage's own utilities (`max-w-2xl`, `space-y-m`, `py-xxl`, the `[&_h2]`/`[&_a]`/`[&_ul]` set), plus their `--container-2xl`, `--tw-space-y-reverse` and `@property` lines.
- **D3. Nothing in the game links to privacy, terms or teachers.** I searched with `rg -i "privacy|/terms|teachers"` across `src/`, `next.config.mjs`, `scripts/`, `tests/`, `public/`, `deploy/` and `.github/`, and checked every `href`/`<Link`/`router.push` in `src/`. The complete list:
  - `src/pages/terms.tsx:30`: `<Link href="/privacy">`. It moves to the site as `<a href="/privacy/">`, served on the apex.
  - `src/pages/privacy.tsx:53` and `terms.tsx:35`: `mailto:${CONTACT_EMAIL}`. These move too.
  - `src/pages/login.tsx:6` `<SignIn routing="hash" />` and `_app.tsx:11` `<ClerkProvider>` pass no legal URLs (no `termsPageUrl`/`privacyPageUrl`). Any Terms/Privacy link on the sign-in screen comes from the Clerk dashboard, which is the owner's.
  - `public/branding/critterconnect-oauth-logo.png` shows a Google OAuth consent screen exists. Its home, privacy and terms links are outside the repo (owner).
  - `docs/DEPLOY.md:119` is a dated record (2026-09-26) that `/privacy/` and `/terms/` returned 200. It's history; leave it.

  So "every game link → absolute apex URL" has no targets in the repo. The work is: delete the pages, add a guard, and list the owner steps.
- **D4. play. adds trailing slashes.** `next.config.mjs:8` sets `trailingSlash: true`, so play.'s `/privacy` 308s to `/privacy/` and then gets Next's 404. `check.sh` requests the slash forms.
- **D5. DNS today** (`dig`, 2026-10-29):
  - apex: A `216.198.79.1`
  - `www`: CNAME `5ed334e8d7ea0cd8.vercel-dns-017.com.`
  - `play`: A `178.156.159.183`
  - no AAAA on any of the three, no CAA, NS `registrar-servers.com`

  So the www step changes a CNAME, and there's no stale AAAA to break ACME.
- **D6. The pre-DNS proof is gone.** 051 proved the site files live through `play.` before DNS moved. With the clean split that isn't possible, and HTTPS on the apex can't work before DNS either (no certificate). A container-level check replaces it (A3).
- **D7. The terms' date is a literal.** "Last updated" is a fixed date in `Terms.tsx`: the day the operator sentence lands. It is never computed at build time, because 051 §10 requires a deterministic build with "no dates".

**Code in scope vs the owner's rules.** These are real, and 051 already fixes them:
- `deploy.sh:43-45` prints status codes but never fails, which breaks fail fast. `check.sh` exits 1 instead.
- `docker-compose.app.yml:33`'s single-file bind mount means Caddyfile edits never reach a running container. The Caddyfile gets baked into the image.
- `_app.tsx:15-16` keeps its hexes outside `theme.ts`, which is why it's in `HEX_ALLOWED`. `theme.ts` will export them.
- `scripts/content.ts:23`'s private `readProfiles` is needed by the site too (DRY). It moves to `src/lib/contentProfiles.ts`.
- `scripts/e2e.mjs:45-90`'s CDP client is needed by `e2e:site`. It moves to `scripts/cdp.mjs`.
- `LegalPage.tsx:5` keeps a constant in a component module, and `:13`/`:16` use low-contrast roles. The file is deleted.
- `run-tests.mjs:4-5` says esbuild is a devDependency, but it's only transitive. 051 declares it.

New finding:
- The site imports 3 modules from outside `src/site/`: `src/components/Wordmark.tsx`, `src/lib/theme.ts` and `src/lib/contentProfiles.ts`. 051's `no-restricted-imports` guard covers only `src/site/**`. Extend the guard's `files` to those 3, so everything the site bundles stays free of Next and Clerk.

Fine as is: `theme.ts`, `check-theme.mjs`, `.dockerignore`, 051's Dockerfile stages and compose change, and the CI shape. `check-theme.mjs` scans only `.tsx?` files, so token definitions in `site.css` don't trip it.

### Target design (deltas only; the rest is 051 as written)

**A1. Site-only green, and the spacing step with it** (addendum 1)
- `src/styles/globals.css` stays **unchanged**. Both approved additions go in `src/site/site.css`, right after `@import "../styles/globals.css"`:
  ```css
  /* Site-only cc additions (plan 051 §8, H2 answers 3-4; owner 2026-10-29: the game's theme stays as it is). */
  :root { --button-primary-background: #008663; --space-xxxl: 64px; }   /* white label 4.58:1 (AA) */
  :root[data-theme="dark"] { --button-primary-background: var(--color-1); }   /* #00906c, label 4.67:1 */
  @theme inline { --spacing-xxxl: var(--space-xxxl); }
  @layer components { .btn-primary { background: var(--button-primary-background); } }
  ```
  - The override sits inside `@layer components`, not unlayered, so `.btn:disabled` (0,2,0) and utilities still beat it, exactly as in the game.
  - With no JS there's no `data-theme`, so the light value applies.
- **Why the spacing step moves too.** The addendum says "the theme the game uses stay exactly as they are", and `xxxl` has no use in the game. Keeping `globals.css` untouched makes the game's stylesheet byte-identical, so the proof is a plain equality. It's the same scale step defined where it's used, not a parallel scale (`gui/theme-contract.md`). This is a delta from the brief's Scope line for `globals.css`.
- **Proof: new `scripts/check-game-css.mjs`** (~40 lines). Run it in Verification and keep the artifact; it stays out of CI.
  - Usage: `node scripts/check-game-css.mjs [base=origin/main] [outDir]`. It compares base against `HEAD`, so commit first.
  - For each ref, `git archive <ref> src` into a temp dir, drop `src/site/`, and symlink `node_modules`. From base, also drop the files `HEAD` deleted (the 3 legal files: pages the game no longer has).
  - Compile each tree's `src/styles/globals.css` with postcss and `@tailwindcss/postcss({ base: <tree>, optimize: { minify: true } })`. That's the plugin Next uses, minified like the production CSS, so comments don't count.
  - Write both CSS files and their sha256 to `outDir`. Exit 0 only if they're byte-identical; otherwise print the diff and exit 1.
  - Don't weaken the check. If a new comment word in a game file adds a utility, reword the comment.
  - `Wordmark` must return the same two `<img>` (same attributes and classes, a fragment with no wrapper) inside GlobeScreen's existing `<h1>`, so the game's DOM doesn't change either. `maplibre-gl.css` (`_app.tsx:1`) is unchanged.
  - Claim it exactly in the PR: "the game's stylesheet, compiled from the game's own sources, is byte-identical to origin/main's". Note D2: the real Next CSS can also carry unused utilities that `src/site/` and the plans mention, as plans already cause today.
- **`e2e:site` adds** a check that `.btn-primary`'s computed `background-color` is `rgb(0, 134, 99)` in light and `rgb(0, 144, 108)` in dark. axe's contrast rule backs this up.

**A2. Clean host split** (addendum 2)
- **Delete** `src/pages/privacy.tsx`, `src/pages/terms.tsx` and `src/components/LegalPage.tsx`; nothing else imports them. `CONTACT_EMAIL` moves to `src/site/config.ts`.
  - The legal text lives once, in `src/site/pages/{Privacy,Terms}.tsx`, with the words unchanged apart from the operator sentence and date (051 §4, D7).
  - No redirect and no Caddy rule: play.'s old paths get Next's 404.
  - The `npm run build` route list loses `/privacy` and `/terms`.
- **`deploy/Caddyfile`** replaces 051 §10's. `(common)` is unchanged. The `(site)` snippet is inlined because only the apex uses it now:
  ```
  # The game only (plan 051 §10; owner 2026-10-29: clean split, no site paths on play.).
  {$APP_DOMAIN} {
  	import common
  	reverse_proxy app:8080
  }
  # The website: static files built into the caddy image (Dockerfile, stage caddy).
  critterconnect.org {
  	import common
  	@game path /explore /explore/* /login /login/* /clue-match /clue-match/* /api/*
  	redir @game https://{$APP_DOMAIN}{uri} 308
  	root * /srv/site
  	header /site/* Cache-Control "public, max-age=31536000, immutable"
  	file_server
  	handle_errors 404 {
  		rewrite * /404.html
  		file_server
  	}
  }
  www.critterconnect.org {
  	redir https://critterconnect.org{uri} 308
  }
  ```
  - New expectations for the local `*.test` run: on play., `/`, `/explore/`, `/privacy/`, `/teachers/` and `/site/x` all reach the stub upstream, and none come from files.
  - The stub upstream sets nosniff and Referrer-Policy, to re-prove that each security header comes back once.
- **Guard for game links.** A CI step goes right after "No Supabase/Prisma" (`ci.yml:20-22`), in the same pattern. CODING_STANDARDS says fixed patterns belong in a check:
  `! git grep -nIE "(['\"\`(]|play\.critterconnect\.org)/(privacy|terms|teachers)\b" -- src ':!src/site'`
  - Verification runs it locally too.
  - It also fails on a comment, by design: reword the comment.
- **Site links** stay root-relative on the apex. Play and the class link stay absolute to `play.`. The canonical is the apex, now the only host.
- **The PR** lists D3 as "every game link to privacy, terms or teachers: none in the repo". Its owner steps outside the repo, done after `check.sh` passes:
  - **Clerk dashboard** (production instance): set any Terms/Privacy URL (legal consent, Account Portal or component links) to `https://critterconnect.org/terms/` and `https://critterconnect.org/privacy/`. If none is set, nothing to do.
  - **Google Cloud → Google Auth Platform → Branding** (Google sign-in's consent screen): set the home page to `https://critterconnect.org/`, privacy to `https://critterconnect.org/privacy/` and terms to `https://critterconnect.org/terms/`, if they name `play.`.

**A3. `deploy/check.sh` checks both hosts** (replaces 051 §10's check.sh bullet; addendum 2)
- Hosts are `PLAY`, `APEX`, `WWW`. Each line prints `OK|BAD|SKIP <url> <expected>`, and the script exits 1 on any `BAD`.
- **play.** (always):
  - `/`, `/explore/`, `/api/places/`, `/api/clue-game/pool/` return 200;
  - `/privacy/`, `/terms/`, `/teachers/` return 404.
- **apex**, only if `getent ahostsv4 critterconnect.org` equals play.'s IPv4. Otherwise one line: `SKIP critterconnect.org: DNS not moved yet`.
  - `/`, `/teachers/`, `/privacy/`, `/terms/` return 200 with `<link rel="canonical" href="https://critterconnect.org/…">` and no `<script src`;
  - every `/site/…` URL in `/` and `/teachers/` returns 200 with its type (CSS, WebP, PNG);
  - `/robots.txt` and `/sitemap.xml` return 200;
  - `/nope/` returns 404 with the 404 page's heading;
  - `/explore/?seed=1` and `/api/places/` 308 to `https://play.critterconnect.org/…`, keeping the query;
  - a TLS failure prints `BAD … certificate not issued yet: wait a few minutes or run docker restart caddy on the VPS, then rerun`.
- **www**, with the same DNS guard: `/teachers/` 308s to `https://critterconnect.org/teachers/`.
- **`deploy.sh` changes:**
  - Lines 43-45 become `bash deploy/check.sh`; `set -e` then fails the deploy on any BAD.
  - The remote part gains one line after the health wait (D6): `docker exec caddy test -f /srv/site/index.html`. It fails the deploy if the new caddy image isn't live.

**A4. Vercel is already deleted** (addendum 3). This replaces 051 §10's "Owner's steps" and "Rollback". The PR's owner steps:
1. `npm run deploy`. `check.sh` prints the play. lines OK and the apex and www lines SKIP. `docker logs caddy` shows ACME errors for the apex and www until step 2; that's expected.
2. Namecheap → critterconnect.org → Advanced DNS:
   - `@` A: from `216.198.79.1` to `178.156.159.183`;
   - `www`: from CNAME `5ed334e8d7ea0cd8.vercel-dns-017.com.` to CNAME `critterconnect.org.`, or A `178.156.159.183`;
   - leave `play`, `clerk`, mail (MX, SPF TXT) and `db` untouched.
3. Once DNS has propagated, `bash deploy/check.sh`: every line OK, none SKIP.

Then the Clerk and Google items (A2).
- Dropped from 051: the TTL pre-step, the `docker restart caddy` step (it survives only as `check.sh`'s hint), the Vercel rollback week and the DNS rollback.
- Rollback is now `git revert` plus `npm run deploy`.
- The PR's failing "Vercel" check comes from the old project; ignore it.

**A5. Defaults 3 and 4 stand** (addendum 4). `caddy` is recreated only when its image changes (051's compose `build: target caddy`). The terms' date is per D7.

**A6. What the PR changes in 051** (the addendum: update 051 in the same PR):
- **Header:** Status.
- **§1:** legal pages on the apex only; Vercel deleted; the two additions site-only; defaults 1-2 overturned on 2026-10-29, 3-4 stand.
- **§3:** the "Both hosts" bullet becomes the addendum's host table. The "Links" bullet loses "both hosts" and the wordmark-on-play note.
- **§4:** the "Actions" row (fill site-only). "Legal pages": the old play. URLs return 404, no redirect, and the game keeps no legal page.
- **§5 and §7 evidence:** `src/pages/{privacy,terms}.tsx` becomes `src/site/pages/{Privacy,Terms}.tsx`.
- **§8 theme gaps 1-2:** both now in `site.css`, the game unchanged, proven by `check-game-css`. This replaces "applies to every light-mode `.btn-primary`, the game's too".
- **§10:** the Caddyfile, local results, `check.sh`, the `deploy.sh` remote line, owner steps and rollback; Guards gains the grep step and `check-game-css`.
- **§11:** "apex canonical on both hosts" becomes "apex canonical"; add the fill check.
- **§12:** answer 2(c) is superseded (Vercel deleted 2026-10-29); update the defaults list.

**Scope deltas for the planner:**
- `globals.css` is no longer changed.
- New file: `scripts/check-game-css.mjs`.
- `ci.yml` gains the grep step.
- The ESLint site guard's `files` adds the 3 shared modules.
- `docs/DEPLOY.md`'s website section names `check.sh`'s hosts and `check-game-css`.
- `AGENTS.md:11` ("Hosting") also names the site at critterconnect.org.

**Decisions to record:** A1 to A4 and D7, under Decisions, as the addendum asks.

### Rejected alternatives
- **Green as a site-named token in `globals.css`:** it ships the value in the game's CSS, and the game's stylesheet would no longer be identical.
- **`--space-xxxl` in `globals.css`, as the brief wrote it:** it adds a variable the game never uses to the game's CSS, and the proof would need an allowance. The addendum keeps the game's theme as it is.
- **Diffing the two `next build` CSS files:** it takes two full builds, and Tailwind's repo-wide scan (D2) means the files are never byte-equal.
- **Computed-style snapshots of running game pages (main vs branch):** two servers, the database and animation timing make it flaky and slow, for the same conclusion.
- **`@source not "../site"` in `globals.css`:** `site.css` imports `globals.css`, so it would hide the site's own classes.
- **ESLint `no-restricted-syntax` for game links:** esquery regexes can't contain `/`. `git grep` in CI is the repo's existing pattern.
- **New Privacy/Terms links in the game menu:** game UI is out of scope, and nothing linked there before.
- **`curl --resolve` apex check before DNS:** no certificate exists before DNS moves. The container file check replaces it.
- **`check-game-css` in CI:** it fails by design on any PR that changes the game's styles. It's a per-PR proof for site changes.

### Risks
- **Legal pages briefly exist nowhere** between step 1 and DNS propagation: play.'s pages are gone and the apex isn't live yet. Clerk and Google links 404 in that window. The owner accepted this (no redirect, and the apex is already down). Do steps 1-3 in one sitting.
- **Certificates.** Caddy retries ACME with backoff, so the apex and www certificates usually arrive within minutes of DNS. If they don't, `check.sh` shows BAD with the restart hint.
- **Google consent screen.** If its privacy URL still points to play. (now a 404), Google can flag the app's branding. The owner should update it right after step 3.
- **Real Next CSS carries extra unused utilities** from `src/site/` (D2). That's harmless, but the PR must phrase the claim as A1 does.
- **The lockfile.** Declaring esbuild and axe-core must touch only the root `devDependencies` in `package-lock.json`. Use `npm install -D -E --offline esbuild@0.19.12 axe-core@4.11.0`, then `npm ci`, then check that `git diff package-lock.json` is that small.
- **Hetzner build memory.** BuildKit may run the `site` and `build` stages in parallel. The site build is small, so the risk is low; the existing 2 GB swap covers it.
- **The game e2e baseline** is 523-524/574 on the VPS (known timing failure). "No new failures" is judged against it; the owner runs the full pass on WSL.

## Architecture review (Fable)

2026-10-29, Fable. Checked every cited line against the worktree at `dd1e6b69` (code = origin/main `0bbbeb0e`): `globals.css` (`.btn-primary` reads `--color-1` at l.415; `--color-1: #00906c` defined once, so dark = light value; dark is `[data-theme="dark"]` only, no `prefers-color-scheme`), `postcss.config.js` (no `base`), `next.config.mjs:8` `trailingSlash`, `deploy/Caddyfile`, `docker-compose.app.yml:33` bind mount, `deploy.sh:43-45` non-failing curl loop, `Dockerfile` (one `build` stage, `run` last), `ci.yml` (one job, no Docker), `check-theme.mjs` (`.tsx?` only, `_app.tsx` in `HEX_ALLOWED`), `eslint.config.mjs`, `_app.tsx`, `_document.tsx`, `login.tsx`, `LegalPage.tsx`, `terms.tsx:30`, `scripts/e2e.mjs:45-90`, `scripts/content.ts:23`, `.dockerignore`, `@tailwindcss/postcss` 4.1.11 (`base` and `optimize.minify` options exist). `rg` over `src scripts public deploy .github tests next.config.mjs` confirms D3: the only legal-path link is `terms.tsx:30`, which is deleted. Findings D1-D7 are accurate. The design follows the addendum (site-only green, clean host split, no redirect, no Vercel rollback) and stays small.

VERDICT: APPROVE

MUST-FIX: none

MISSED:
1. `check-game-css` drops the 3 deleted legal files from the base side, so the proof is "game CSS, excluding the pages the game no longer has". Correct, but the PR claim in A1 must say so ("minus the deleted legal pages' own utilities"), and the script should print which base files it dropped, so a reader can see the allowance is only those 3.
2. `check.sh`'s apex guard uses the local resolver (`getent`). From WSL the Windows resolver can keep the old Vercel A record for its TTL after Namecheap changes, so step 3 can print SKIP although DNS has moved. The SKIP line should say how to tell (`dig +short critterconnect.org @1.1.1.1`) and that a cached answer needs a few minutes or `ipconfig /flushdns`.
3. The `www` block has no `import common`, so its 308 carries no HSTS or security headers (inherited from 051). One `import common` line fixes it; harmless to leave, but it is the only host without them.

SHOULD-CONSIDER:
1. `site.css`: the dark override `:root[data-theme="dark"] { --button-primary-background: var(--color-1) }` is correct (dark `--color-1` is `#00906c`), but comment that the dark value is deliberately the game's own, so a future dark `--color-1` change moves the site with it.
2. `check-game-css` relies on `git archive origin/main`; have the script `git fetch -q origin main` first (or fail loudly if the ref is stale) so the proof isn't against an old base.
3. The CI grep guard also matches `clerk.com/legal/privacy`-style paths only if a quote or `(` precedes `/privacy`; it doesn't today, and that's right. Add a one-line comment in `ci.yml` saying the guard is for play.-relative legal/teacher links, so nobody "fixes" it to match bare words.
4. Keep `Wordmark`'s two `eslint-disable-next-line @next/next/no-img-element` comments with the `<img>`s when they move, or the site build's lint and the game's lint diverge.
5. A3's apex `/site/…` type check: compare `Content-Type` prefixes (`text/css`, `image/webp`, `image/png`) rather than exact strings; Caddy adds `; charset=utf-8` to CSS.

## Architecture review (Astra)

VERDICT: APPROVE

MUST-FIX: none

SHOULD-CONSIDER:
1. The isolated CSS comparison proves only the filtered build matches. Add a focused check of rendered game styles; the production Tailwind scan still includes site sources.
2. Give `deploy/check.sh` a strict post-DNS mode that fails on SKIP, so an incomplete cutover cannot report success.
3. Preserve prior hashed assets briefly across deployments; otherwise an already-open page can request a lazy-loaded screenshot removed by the new Caddy image.

## Revision notes

No MUST-FIX from either review, so no architect round. The lead folds these small items into the design; the planner puts them in Steps.

**Accepted:**
- R1 (Fable missed 1): `check-game-css` prints the base files it dropped; the PR claim adds "minus the deleted legal pages' own utilities".
- R2 (Fable missed 2): `check.sh`'s SKIP line adds `check: dig +short critterconnect.org @1.1.1.1; a cached answer needs a few minutes or ipconfig /flushdns`.
- R3 (Fable missed 3): the `www` block gets `import common`.
- R4 (Fable SC1): `site.css` comment: the dark fill is deliberately the game's `--color-1`.
- R5 (Fable SC2): `check-game-css` runs `git fetch -q origin main` first when base is `origin/main`, and fails loudly if the fetch fails.
- R6 (Fable SC3): one-line comment in `ci.yml` on the grep guard (play.-relative legal/teacher links only).
- R7 (Fable SC4): `Wordmark` keeps both `eslint-disable-next-line @next/next/no-img-element` comments.
- R8 (Fable SC5): `check.sh` compares `Content-Type` prefixes (`text/css`, `image/webp`, `image/png`).
- R9 (Astra SC2): `check.sh --strict` turns every SKIP into BAD (exit 1). A4 owner step 3 runs `bash deploy/check.sh --strict`; `deploy.sh` keeps the non-strict run (DNS may not have moved yet).

**Rejected:**
- Astra SC1 (rendered game style check): already weighed under Rejected alternatives (computed-style snapshots: flaky, slow, same conclusion). The extra utilities from the site's sources are unused, so they can't change a rendered game style; the existing game e2e still runs against the real build's CSS.
- Astra SC3 (keep old hashed site assets across deploys): the site is static, small pages; an open page that misses a lazy screenshot after a deploy is fixed by reload. Keeping old assets needs a persistent volume or a merge step in the caddy image: complexity for a cosmetic edge case (KISS).

## Steps

2026-10-29, planner. Design = 051 as changed by Architecture (D1-D7, A1-A6) and Revision notes R1-R9. Steps cite it; they don't restate it.

Every step:
- One fresh session.
- Ends with `npm run typecheck` and `npm run lint` at exit 0, then commit and push, then a Log line.
- `A=/srv/critter-ai/agent-state/missions/cc-website`. Chrome: `CHROME_PATH=$A/bin/chrome`. Each artifact dir gets a `COMMAND.txt` with the command that reproduces it.
- Ports: 3100 for `next dev`/`next start`, 3101 for `site:serve` (or the Caddy https port in the Caddy run), 3102 for the Caddy run's stub. Check `ss -ltn` first. Run heavy jobs (builds, e2e, Taste) one at a time.
- "No new failure kinds" = Verification V4's compare against the baseline.
- (P) marks a planner call. Record each one under Decisions when its step lands.

Order vs the brief's 6 units:
- Infrastructure is split in two (S1 build, S5 shipping).
- `e2e:site` moves up to S2 (E2E first: pages get axe and the 051 §11 checks while they're built).
- Shipping comes after `/`, because CI's `/srv/site/index.html` check needs `index.html`.
- The CI grep guard lands with the legal deletion, because it fails on `terms.tsx:30` until then.

- [x] S1. Site build foundation, shared modules, guards; draft PR.
  - Shared modules (051 §4 Layout, §9; A1):
    - `src/lib/theme.ts` exports the theme-color pair, and `src/pages/_app.tsx` imports it.
    - `src/components/Wordmark.tsx`: the same two `<img>` in a fragment (A1), keeping both `eslint-disable-next-line @next/next/no-img-element` comments (R7). `GlobeScreen.tsx:55-58` uses it.
    - `src/lib/contentProfiles.ts` gets `readProfiles` from `scripts/content.ts:23`, which imports it from there.
  - Guards:
    - `scripts/check-theme.mjs`: `src/site` in `ROOTS`; `_app.tsx` out of `HEX_ALLOWED`.
    - `eslint.config.mjs`: `no-restricted-imports` (`next`, `next/*`, `@clerk/*`) on `src/site/**` plus `Wordmark.tsx`, `theme.ts` and `contentProfiles.ts`.
    - (P) For `src/site/**` only, turn off the `@next/next/*` rules: the site is plain HTML, not a Next app. Lint fails without this: `no-html-link-for-pages` errors on `<a href="/">`, and `no-head-element`, `no-css-tags` and `no-img-element` warn under `--max-warnings 0`.
  - `package.json`:
    - scripts `site:build` (`node scripts/site.mjs`) and `site:serve` (051 §10 Preview);
    - devDeps via Architecture Risks "lockfile": `npm install -D -E --offline esbuild@0.19.12 axe-core@4.11.0`, then `npm ci`; `git diff package-lock.json` touches only the root devDependencies.
  - `src/site/`:
    - `config.ts`: `SITE_URL`, `PLAY_URL`, `CONTACT_EMAIL`, `OPERATOR`, and the page list (only pages that exist). `LegalPage.tsx:5` keeps its own copy of the email until S7 deletes it.
    - `Layout.tsx`: 051 §4 Layout. The og/twitter image tags wait for `og.png` (S3).
    - `site.css`: 051 §10's source line, then the A1 block with R4's comment.
    - `render.tsx`, and `pages/NotFound.tsx` with 051 §4's 404 copy.
  - `scripts/site.mjs`: 051 §10 Build, minus shots/og (S3) and the inline client bundle (S6).
    - Hash = content sha256 prefix. File lists sorted. No dates, no randomness.
  - `.github/workflows/ci.yml`: `- run: npm run site:build` after `npm test`.
  - Push, then `gh pr create --draft --base main`.
    - Title "Website at critterconnect.org (plan 051)".
    - Body "Refs #34. WIP: mission cc-website, plan plans/2026-10-29-cc-website.md". No bare `@`-names.
    - Opening it now means CI runs on every push.
  - Check:
    - typecheck, lint, `npm test` 47/47, `npm run build`;
    - `npm run site:build` twice, then `diff -r` is empty;
    - `out/site/404.html` has no `<script src`;
    - game e2e (dev :3100) ≥ 523/574 with no new failure kinds, and the globe shows the wordmark in light and dark;
    - CI `check` is green on the draft PR (ignore the old Vercel check).

- [x] S2. CDP module, `e2e:site`, game e2e shot edits.
  - `scripts/cdp.mjs` gets `connect` and `launchChrome` from `scripts/e2e.mjs:45-90`; Chrome comes from `CHROME_PATH`.
  - `scripts/e2e.mjs` imports `cdp.mjs`. `screenshot()` removes `nextjs-portal` first. Add a `02d-field-guide.png` shot while the guide is open (~l.343-354; 051 §9).
  - New `scripts/e2e-site.mjs` and the `e2e:site` script (051 §11). `E2E_SITE_URL` defaults to `http://localhost:3101`.
    - Coverage:
      - `PAGES`: a constant that S4, S6 and S7 each extend, plus `/404.html`;
      - 390×844 and 1440×900;
      - light and dark. Dark = emulated `prefers-color-scheme: dark`, then assert `data-theme="dark"`.
    - Checks:
      - one h1, landmarks, and the skip link first in Tab order (focus moves to `<main>`);
      - visible `:focus-visible`; alt on every `<img>`; no text under 14px; the document scrolls to the footer;
      - title and description from config, the exact apex canonical, og/twitter tags;
      - Play links absolute to `https://play.critterconnect.org/`;
      - no `<script src`, same-origin requests only, no console errors;
      - axe-core (`createRequire(...).resolve('axe-core/axe.min.js')`), wcag2a/2aa/21a/21aa, 0 violations;
      - A1's `.btn-primary` fill: `rgb(0, 134, 99)` light, `rgb(0, 144, 108)` dark;
      - `robots.txt` has `Sitemap:`, and `sitemap.xml`'s URLs equal `PAGES` as apex URLs.
    - Output: `site-<page>-<width>-<mode>.png` and `e2e-artifacts/<run>-site/report.json`. Exit 1 on any FAIL.
    - Non-vacuity: FAIL if a page isn't 200, axe returns no `passes`, or a page ran 0 checks.
  - Check:
    - typecheck, lint;
    - `site:build`, `site:serve`, then `npm run e2e:site` passes on `/404.html` (4 shots);
    - probe once, not committed: a low-contrast token on NotFound's text makes axe FAIL; revert it;
    - game e2e (dev :3100) ≥ 523/574 with no new failure kinds; `02d-field-guide.png` is present if the run reaches the guide; no dev badge in any shot;
    - copy the runs to `$A/e2e-site/` and `$A/game-e2e/`.

- [x] S3. Shots, credits, `og.png` (051 §9; Brief Notes).
  - Tooling stays outside the repo, in `$A/shots/`:
    - `take.mjs` imports the repo's `scripts/cdp.mjs`; it takes viewport, DPR and URL and writes a PNG;
    - `convert.mjs` uses the installed `sharp` for WebP, and crops `og.png` to 1200×630 PNG.
  - Round-start shots, from the production build (`npm run build && npx next start -p 3100`): `globe`, `board-phone` (seed 1, Africa), `hero-board` (1440×900, the basis for `og.png`).
  - The other shots, from seeded dev e2e (`E2E_SEED`, `E2E_PLACE`, :3100):
    - `field-guide` (02d), `grid-marked` (02b), `witness-note` (02c);
    - `round-end`, `journal`, `globe-found` (04-round-1-end, 05-journal, 07-globe-found).
    - If the VPS run stops before a round ends, finish the same seeded round in the dev browser with `window.__cc` (`.claude/skills/playtest`).
    - Prefer seeds whose visible animals have public-domain or CC BY photos.
    - The only DB writes are e2e's normal round saves to the dev copy.
  - Repo:
    - `src/site/shots/*.webp`, `src/site/og.png`;
    - `src/site/shots.ts`: file, width, height, alt, seed, place, and visible animal ids from `report.json` or `__cc`, checked by eye;
    - `render.tsx` prints a credit line per photo in each page's footer, through `readProfiles`. It validates every shot's ids, used or not, and the build fails on an unknown id;
    - `site.mjs` copies shots and `og.png` to `/site/`, hashed;
    - `Layout.tsx` gets `og:image`/`twitter:image` as the absolute apex URL, and `e2e-site.mjs` checks both, plus the local file at 200 `image/png`.
  - Check:
    - typecheck, lint; `site:build` twice, `diff -r` empty; e2e:site passes;
    - probe: a bogus id in `shots.ts` fails the build; revert it;
    - every shot opened by eye: light mode, no dev badge, no sheet covering the board unless that's the shot;
    - record WebP sizes. The hero should be ≲ 150 KB, to fit 300 KB on first load;
    - raw PNGs and run reports go in `$A/shots/`.

- [x] S4. `/` with Taste (051 §4 front page, §5, §7, §8).
  - Install the skills pinned, in a new empty `$A/skills/`. Never run anything with cwd inside them.
    - `git clone https://github.com/Leonxlnx/taste-skill $A/skills/taste && git -C $A/skills/taste checkout 12af471f62`
    - `git clone https://github.com/elayadesign/ai-design-skills $A/skills/elaya && git -C $A/skills/elaya checkout ded7efc9d5`
    - `$A/skills/SOURCES.txt`: the pins and each repo's HEAD. If HEAD is past the pin, use the pin and note the newer version under Decisions.
    - If Taste's scripts need npm packages, install them under `$A/skills/` only. If that fails, add a handoff item and use the e2e:site screenshots as the look check.
  - `src/site/pages/Home.tsx`:
    - sections 1-6 as 051 §4's table, roles as §4's shared roles and §8's rows;
    - hero `<picture>` with `fetchpriority="high"`, the rest lazy;
    - {N} counted in `render.tsx` (76 today);
    - `config.ts` entry with §11's title and description; `e2e-site.mjs` `PAGES` gains `/`.
  - Method:
    - graphical-ui while building; GUI.md and the cc tokens bind.
    - Taste: only the steps 051 §8 lists as Used (1, 2, 4, 5, 6.2-6.9, 8 with ≤ 3 critique rounds, 10); skip what §8 skips. elaya: Part A as §8.
    - 051 §4's copy is the default. Taste may only tighten wording within §5's rules: claims from §5's table only, no never-claims. Record any changed line under Decisions.
    - A clash with GUI.md becomes a handoff item with 051's default, and the build goes on with the default.
  - Speed tooling, `$A/speed/speed.mjs` (imports the repo's `scripts/cdp.mjs`):
    - 390×844 mobile, DPR 2; CPU 4×; Slow 4G (150 ms, 1.6 Mbps down, 750 kbps up); cache off, fresh profile;
    - LCP and CLS from buffered PerformanceObservers; bytes = the sum of `Network.loadingFinished.encodedDataLength`;
    - writes `results.json`.
  - Check:
    - typecheck, lint; `site:build` + `site:serve`; e2e:site passes (`/`, 404);
    - `node $A/skills/taste/skills/taste-skill/scripts/lint.mjs src/site` is clean;
    - `CHROME_PATH=$A/bin/chrome node $A/skills/taste/skills/taste-skill/scripts/inspect.mjs http://localhost:3101/ --allow still-page --out $A/taste-inspect/home` at 1440, 768 and 390 (exact flags per the pinned SKILL.md): 0 FAIL;
    - every inspect screenshot opened by eye; critique in `$A/taste-critique-home.md`;
    - speed on `/`: LCP ≤ 2.5 s, CLS ≤ 0.1, ≤ 300 KB.

- [x] S5. Shipping: Docker, compose, Caddy, `check.sh`, `deploy.sh`, CI, docs.
  - `Dockerfile`: 051 §10 "Into Caddy's image".
    - Stages: `deps`; `build` FROM deps, unchanged from `ARG` on; `site`; `caddy` FROM `caddy:2` with `deploy/Caddyfile` and `/app/out/site` → `/srv/site`; `run` last.
    - Confirm the context keeps `db/content`, `public/`, `src/site/shots/*.webp` and `src/site/og.png` (`*.png` matches the root only). `.dockerignore` stays unchanged.
  - `deploy/docker-compose.app.yml`: `app.build.target: run`; caddy becomes `build: { context: ., target: caddy }`, and the Caddyfile bind mount goes (051 §10).
  - `deploy/Caddyfile`: 051 §10's `(common)` plus A2's blocks; `www` gets `import common` (R3).
  - `deploy/check.sh` (new): A3 with R2, R8 and R9. Write Failure modes' check.sh list into the plan before the code.
    - (P) Hosts come from env `PLAY`, `APEX` and `WWW`, defaulting to the real names; expected URLs are built from them.
    - (P) `CHECK_CONNECT=<ip:port>`, for the local run only, adds `curl -k --connect-to ::<ip:port>` and skips the DNS guard.
  - `deploy/deploy.sh`: A3's two changes (the remote `docker exec caddy test -f /srv/site/index.html` after the health wait; ll.43-45 become `bash deploy/check.sh`).
  - `ci.yml`, after `site:build`:
    - `docker build --target caddy -t cc-caddy .`
    - `docker run --rm -e APP_DOMAIN=play.critterconnect.org cc-caddy sh -c 'caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile && test -f /srv/site/index.html'`
  - Docs:
    - `docs/DEPLOY.md`: a website section (build, image, hosts, `check.sh` and `--strict`) and the caddy row in "What runs where" (apex and www too);
    - `AGENTS.md`: a "Website" line in Where Things Live; `:11` Hosting names critterconnect.org;
    - `README.md:3`: current rules, "the one the camera saw"; no mystery, 12 look-alikes or charges;
    - a dated note under paper §5.3 item 11: rounds are saved with `session_seed`.
  - Caddy harness, outside the repo in `$A/caddy-run/`:
    - `run.sh` derives `Caddyfile.test` from `deploy/Caddyfile`:
      - global options `{ admin off; http_port 3100; https_port 3101; local_certs; skip_install_trust }`;
      - hosts `play.test`, `critterconnect.test`, `www.critterconnect.test`;
      - `app:8080` → `127.0.0.1:3102`; `/srv/site` → a copy of `out/site`;
      - Caddy's XDG dirs under `$A/caddy-run/`.
    - `stub.mjs` on :3102 returns 404 for `/privacy/`, `/terms/` and `/teachers/` and 200 otherwise. It sets `X-Stub`, nosniff and Referrer-Policy.
    - It asserts:
      - A2's play. expectations: everything reaches the stub (`X-Stub`), nothing comes from files;
      - 051 §10's local results: apex files, the 404 page, 308s keeping the query, `/site/*` immutable, each security header once.
    - Then it runs `check.sh` with `PLAY=play.test APEX=critterconnect.test WWW=www.critterconnect.test CHECK_CONNECT=127.0.0.1:3101`: all OK. With the stub stopped: play. lines BAD, exit 1.
  - Check:
    - typecheck, lint;
    - `APP_DOMAIN=play.critterconnect.org caddy validate --config deploy/Caddyfile --adapter caddyfile`;
    - `bash -n deploy/deploy.sh deploy/check.sh`;
    - `bash $A/caddy-run/run.sh` → `$A/caddy-run/results.txt`;
    - live probe before any deploy, `bash deploy/check.sh`: exit 1, BAD only on play. `/privacy/` and `/terms/` (the live game still has them), apex and www SKIP with R2's hint; `--strict` also turns the SKIPs into BAD;
    - CI green on the PR, including the docker build, validate and `index.html` steps.

- [x] S6. `/teachers/` with Taste and the class link.
  - `src/site/pages/Teachers.tsx`:
    - sections 1-9 as 051 §4's table; claims only from §5; §8 roles;
    - §6's three rows verbatim under "Coming later: not available yet";
    - the FAQ as visible Q&A.
  - `ClassLink.tsx` + `classLink.client.ts` (051 §4 row 4):
    - the seed comes from `crypto.getRandomValues`, in 1…4294967295;
    - a read-only cc Text field, Copy as `.btn-secondary`, an `aria-live` "Copied";
    - a fixed example link without JS.
  - `site.mjs` bundles the client inline (esbuild, minified) into `/teachers/` only. The two inline scripts total < 2 KB.
  - `config.ts` entry with §11's title and description.
  - `e2e-site.mjs`: `PAGES` gains `/teachers/`, plus §11's class-link checks:
    - two loads give two different valid links;
    - Copy fills the clipboard (permission granted over CDP), and the live region says "Copied";
    - with JS off, the fixed example shows.
  - Method: as S4, with Taste on `/teachers/`.
  - Check:
    - typecheck, lint; `site:build` twice, `diff -r` empty; e2e:site passes (`/`, `/teachers/`, 404);
    - Taste lint clean; inspect `--allow still-page` at 1440, 768 and 390 on `/teachers/` → `$A/taste-inspect/teachers`, 0 FAIL;
    - screenshots opened by eye; critique in `$A/taste-critique-teachers.md`;
    - speed on `/teachers/` within budget.

- [x] S7. Legal pages to the site, game legal pages deleted, `check-game-css`, 051 updated.
  - `src/site/LegalArticle.tsx` (051 §4 Legal pages), `pages/Privacy.tsx`, `pages/Terms.tsx`:
    - today's text, moved, with the words unchanged except two things in the terms: the Haunted Pavement LLC operator sentence, and "Last updated" as a literal date, this session's (D7);
    - `next/link` becomes `<a href="/privacy/">`;
    - config entries; `PAGES` gains both; the sitemap has the 4 apex URLs.
  - Delete `src/pages/privacy.tsx`, `src/pages/terms.tsx` and `src/components/LegalPage.tsx` (A2). `rg` confirms nothing else uses them.
  - `ci.yml`: the grep guard after "No Supabase/Prisma" (A2), with R6's comment.
  - `scripts/check-game-css.mjs`: A1 with R1 and R5. Write Failure modes' check-game-css list into the plan first. Commit before running it.
  - `docs/DEPLOY.md`: the website section names `check-game-css`.
  - `plans/051-landing-page.md`: per A6 (header, §1, §3, §4, §5/§7 evidence, §8 gaps 1-2, §10, §11, §12). Under this plan's Decisions: A2, A3, A4, D7 and every (P).
  - Check:
    - typecheck, lint, `npm test`;
    - `npm run build`: the routes are `/`, `/explore` and `/login` only;
    - the grep guard run locally: exit 0;
    - `git diff --no-index --word-diff` of the old text (`git show origin/main:src/pages/{privacy,terms}.tsx`) against the new shows only markup, the operator sentence, the date and the link → `$A/legal-diff.txt`;
    - `node scripts/check-game-css.mjs origin/main $A/game-css`: exit 0, and the dropped files are exactly the 3;
    - the Failure modes probes behave as listed;
    - e2e:site passes on all 5 pages;
    - game e2e ≥ 523/574 with no new failure kinds, and dev `/privacy/` gives a 404.

- [x] S8. Final pass, audit, PR ready (the last step before Verification).
  - Run V1-V11 once on the final tree and fix failures. If a fix is big, add a new item before this one.
    - Rerun Taste inspect on both pages, because the footer changed in S7.
  - graphical-audit change review of `git diff origin/main...HEAD` → `$A/audit.md`. It lists the two site-only additions as intentional local changes.
  - `git fetch origin && git rebase origin/main`. If that moved commits, rerun typecheck, lint, `site:build` and e2e:site, then `git push --force-with-lease`; otherwise a plain `git push`.
  - `gh pr edit` the body, then `gh pr ready`. The body:
    - `Refs #34`; what changed.
    - D3: "every game link to privacy, terms or teachers: none in the repo"; sign-in passes no legal URLs.
    - The exact claim (A1 + R1): "the game's stylesheet, compiled from the game's own sources, is byte-identical to origin/main's, minus the deleted legal pages' own utilities". Plus D2's note on the real Next CSS.
    - Owner steps A4 1-3, with step 3 as `bash deploy/check.sh --strict`; then A2's Clerk dashboard and Google Auth Platform items. Rollback: `git revert` + `npm run deploy`.
    - The failing "Vercel" check comes from the deleted project; ignore it.
    - The owner runs the full game e2e on WSL (the VPS shows 523-524/574, a known timing failure).
    - Artifact paths, both review verdicts, the (P) decisions. No bare `@`-names.
    - Never merge or deploy.
  - Check: typecheck, lint; `gh pr view --json isDraft,body` shows not draft and `Refs #34`; `gh pr checks` is green except the old Vercel check.
- [x] S9. Astra code review MUST-FIX 1: `deploy/check.sh` passes a cut-off transfer.
  - `fetched` accepts any non-000 code, so a curl timeout (28) or partial file (18) after `HTTP 200` prints OK. Fix: `fetched` returns true only when `curl_exit` is 0; 35/60 keep the cert hint; any other nonzero exit is BAD with the exit and the code (e.g. "transfer failed (curl exit 28, HTTP 200)").
  - Probe first: a local stub that sends `200` headers then stalls or closes early, check.sh pointed at it via `CHECK_CONNECT`; expect BAD and exit 1. Revert any probe-only change.
  - Rerun the Caddy run (V9 part) and live `bash deploy/check.sh` (pre-deploy result unchanged); `bash -n`; typecheck, lint.
  - PR #36 body: add the Astra code review verdict and this fix.

## Verification

Run in order on the final, pushed tree, E2E first. `A=/srv/critter-ai/agent-state/missions/cc-website`.
- Before starting: `git status` is clean, and `ss -ltn | grep -E ':310[0-2]'` shows nothing.
- One server at a time.
- Each artifact dir gets a `COMMAND.txt`.

1. **V1 e2e:site.**
   - Run: `npm run site:build`, `npm run site:serve` (background, :3101), then `E2E_SITE_URL=http://localhost:3101 CHROME_PATH=$A/bin/chrome npm run e2e:site`.
   - Must show:
     - exit 0, and `report.json` has 0 FAIL;
     - axe 0 violations on 5 pages (`/`, `/teachers/`, `/privacy/`, `/terms/`, `/404.html`) × 390×844 and 1440×900 × light and dark = 20 screenshots;
     - every 051 §11 check, the fill `rgb(0, 134, 99)`/`rgb(0, 144, 108)`, the class-link checks, and robots plus a sitemap of 4 apex URLs.
   - Artifact: copy `e2e-artifacts/<run>-site/` to `$A/e2e-site/`. Open every screenshot by eye.
2. **V2 Taste**, on the same server:
   - `node $A/skills/taste/skills/taste-skill/scripts/lint.mjs src/site` is clean → `$A/taste-lint.txt`;
   - `inspect.mjs --allow still-page` on `/` and `/teachers/` at 1440, 768 and 390: 0 FAIL → `$A/taste-inspect/{home,teachers}/`;
   - screenshots opened by eye; `$A/taste-critique-{home,teachers}.md` present.
3. **V3 Speed.** `node $A/speed/speed.mjs http://localhost:3101/ http://localhost:3101/teachers/`.
   - Each page: LCP ≤ 2500 ms, CLS ≤ 0.1, ≤ 307200 bytes → `$A/speed/results.json`.
   - The python server doesn't compress, so the numbers are conservative. If only the bytes go over, rerun through the Caddy run (gzip/zstd) and record both.
   - Stop the server.
4. **V4 Game e2e.**
   - Run: `npx next dev -p 3100` (background), then `E2E_BASE_URL=http://localhost:3100 CHROME_PATH=$A/bin/chrome npm run e2e`.
   - Must show:
     - ≥ 523/574;
     - no failing check kind (`kind()` = name without digits, as in `e2e.mjs`) outside the union of the two baseline runs' kinds (`$A/baseline-e2e/*/report.json`), computed by a node one-liner → `$A/game-e2e/compare.txt`. On a new kind, rerun once (timing); if it persists, fix it;
     - the run is in `$A/game-e2e/<run>/`.
   - Stop the server. The owner confirms the full pass on WSL.
5. **V5 Game CSS.** `node scripts/check-game-css.mjs origin/main $A/game-css`: exit 0, equal sha256, and the dropped base files are exactly `src/pages/privacy.tsx`, `src/pages/terms.tsx` and `src/components/LegalPage.tsx`.
6. **V6 Grep guards.** Run ci.yml's legal-link guard (A2) and its Supabase/Prisma guard locally: no output, exit 0 → `$A/checks/grep.txt`.
7. **V7 Deterministic build.** `npm run site:build && rm -rf /tmp/cc-site-a && cp -r out/site /tmp/cc-site-a && npm run site:build && diff -r /tmp/cc-site-a out/site`: no output, exit 0 → `$A/checks/site-diff.txt`.
8. **V8 Static checks.** `npm run typecheck`, `npm run lint`, `npm test` (47/47, no new tests) and `npm run build` (`DATABASE_URL=postgres://build@127.0.0.1:1/build`, as CI): all exit 0. The build's routes are `/`, `/explore` and `/login`, with no `/privacy` or `/terms`. Logs → `$A/checks/`.
9. **V9 Caddy.**
   - `APP_DOMAIN=play.critterconnect.org caddy validate --config deploy/Caddyfile --adapter caddyfile` prints "Valid configuration".
   - `bash $A/caddy-run/run.sh`: every assertion OK, `check.sh` all OK under `CHECK_CONNECT`, and the stub-down probe BAD with exit 1 → `$A/caddy-run/results.txt`.
10. **V10 Shell.**
    - `bash -n deploy/deploy.sh && bash -n deploy/check.sh`: exit 0.
    - Live, pre-deploy, `bash deploy/check.sh; echo $?`: BAD only on play. `/privacy/` and `/terms/`, apex and www SKIP with R2's hint, exit 1.
    - `bash deploy/check.sh --strict`: the SKIPs become BAD.
    - → `$A/checks/check-live.txt`.
11. **V11 graphical-audit.** `$A/audit.md` lists exactly the two site-only additions (A1) as intentional local changes, and no other theme drift.
12. **V12 CI.** `gh pr checks <n>`: the `check` job is green (lint, both grep guards, test, `site:build`, build, `docker build --target caddy`, `caddy validate` + `/srv/site/index.html`). Ignore the old "Vercel" check.
13. **V13 Artifacts.**
    - `$A/` holds: `e2e-site/`, `game-e2e/`, `taste-inspect/`, the taste critiques and lint, `speed/`, `game-css/`, `checks/`, `caddy-run/`, `audit.md`, `shots/`, `skills/SOURCES.txt` and `legal-diff.txt`, each with its command.
    - The Summary lists them.

## Failure modes

Only the two check scripts are tested in isolation (the site and the game are covered by E2E). Each failure mode needs a guard in the code and, where marked, a probe run once.

**`scripts/check-game-css.mjs`** (before S7's code):
1. Stale base. Guard (R5): `git fetch -q origin main`; exit 1 if the fetch fails.
2. The script tests committed HEAD, not the disk. Guard: exit 1 if `git status --porcelain -- src` isn't empty.
3. Vacuous equality: both sides compile the same tree (wrong `base`, or Tailwind scanning the real repo through cwd or a symlink). Guard: `base` = each temp tree, with the temp dirs under `os.tmpdir()`. Probe: base = an older commit whose game styles differ (the parent of the last commit that changed a `src/` class or `globals.css`) must exit 1 and print a diff.
4. The allowance is too wide. Guard: print the dropped base files (R1); against origin/main they must be exactly the 3 legal files.
5. The script misses a game stylesheet. Probe: `rg -n "\.css['\"]" src` finds only `_app.tsx:1-2` (`maplibre-gl.css` from node_modules, unchanged, and `globals.css`).
6. Nondeterminism. Probe: two runs give the same sha256.
7. Errors pass silently. Guard: no catch-and-continue; any git or compile error exits non-zero. Probe: base `no-such-ref` exits 1.
8. Slow or leaky. Guard: remove the temp dirs in `finally`. Probe: the run takes < 10 s.

**`deploy/check.sh`** (before S5's code; probed by the Caddy run, its stub-down run and the live pre-deploy run):
1. A refused connection or TLS failure (`000`) passes. Guard: compare exact status codes. curl exit 35/60 → BAD with A3's certificate hint.
10. A cut-off or stalled transfer after `HTTP 200` passes (Astra code review). Guard: `fetched` needs curl exit 0; else BAD "transfer failed (curl exit N, HTTP code)". Probe: `$A/cutoff-probe/` (S9).
2. A followed redirect hides the 308. Guard: never `-L`; check the code and the exact `%{redirect_url}`, query included.
3. It stops at the first failure. Guard: no `set -e` around the curls; collect every line, then exit 1 at the end on any BAD.
4. The trailing slash fools the 404 check (`/privacy` 308s). Guard: request the slash forms (D4).
5. Vacuous `/site/` check. Guard: BAD if no `/site/` URL is found. Extract from `href`, `src` and every `srcset` candidate.
6. The wrong page passes. Guards: the canonical equals the exact apex URL for that path; the 404 must contain the 404 page's heading (not Caddy's empty 404); Content-Type is compared by prefix (R8).
7. The DNS guard misreads. Guard: the first `getent ahostsv4` IPv4 compared with play.'s; unresolved = SKIP with R2's text; `--strict` turns SKIP into BAD (R9).
8. The test hook leaks into production. Guard: `CHECK_CONNECT` is unset by default and `deploy.sh` never sets it; `-k` applies only under it.
9. Syntax. Probe: `bash -n`.

## Code review (Astra)

2026-10-29, `astra-review --code origin/main` on `2abdf31e`, exit 0.

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. `deploy/check.sh:48`: Accepts any non-`000` HTTP status despite a nonzero curl exit. A truncated response or timeout after HTTP 200 can report `OK`, allowing deployment checks to pass with incomplete assets. Require `curl_exit == 0` before validating status/body; test interrupted transfers.

SHOULD-CONSIDER:

1. `scripts/e2e-site.mjs:246`: Test clipboard denial too; currently only the granted-permission path exercises Copy.
2. Complete the planned WSL game E2E confirmation. Existing final artifact records 524/574 passing with the known timeout; site artifact passes 444/444.

Triage: MUST-FIX 1 accepted (real: curl reports `%{http_code}` 200 even on exit 28/18) -> S9, fixed. SHOULD-CONSIDER 1-2 -> Summary, for the owner.

## Release

## Decisions

- 2026-10-29 (Revision): Astra SC1 (rendered game style check) and SC3 (keep old hashed site assets) rejected; reasons under Revision notes.
- 2026-10-29 (Steps): 8 steps, not the brief's 6: infra split (S1 build, S5 shipping); `e2e:site` early (S2) so pages get axe as built; shipping after `/` (CI's index.html check); grep guard with legal deletion (S7); draft PR opened in S1 so CI runs per push. Other (P) calls recorded when their step lands.
- 2026-10-29 (S1, P): `@next/next/*` rules off for `src/site/**`, listed from the plugin itself in `eslint.config.mjs` (not hand-enumerated), so new Next rules stay off there too.
- 2026-10-29 (S1): the 404 has `robots noindex` and no canonical or `og:url` (`SitePage.indexed: false`); it isn't in the sitemap. S2's canonical check skips it. `twitter:card` is `summary` until S3 adds `og.png` and switches it to `summary_large_image`.
- 2026-10-29 (S1): `src/lib/contentProfiles.ts` also exports `CONTENT_DIR`/`ANIMALS_DIR`, which `scripts/content.ts` still needs for `writeProfile` and `sources.json` (one definition of the paths).
- 2026-10-29 (S1): globals.css's `body` rule is unlayered, so it beats utilities on `<body>` (ground, text color, 14px). The site keeps that rule for ground and color (cte-canvas/cte-text = neutral-1/neutral-10) and sets `text-m` on `<main>` and the header link instead. Header wordmark link is `min-w-0` (it shrinks, as on the globe) so header stays one row at 390.
- 2026-10-29 (S1): `npm install --offline` failed (ENOTCACHED); used `--prefer-offline` with the same pins. `package-lock.json` diff is the 2 root devDependency lines only.
- 2026-10-29 (S2): `e2e:site` takes its page list from `src/site/config.ts` `PAGES` (esbuild-transformed, imported), not a hand-kept constant, so S4/S6/S7 extend it by adding config entries; title/description/canonical expectations come from the same entries. `cdp.mjs` also takes `startBrowser` (profile, signal cleanup) and `openPage` (`evaluate`, `waitFor`) from `e2e.mjs`, shared by both tests.
- 2026-10-29 (S2): the dev badge is hidden by a `nextjs-portal { display: none }` style added for each shot and removed after, not by removing the element: Next re-adds a removed `<nextjs-portal>` (probed), and the badge stays during checks so behaviour is unchanged.
- 2026-10-29 (S2): `e2e:site` checks per page × size × mode: 200, data-theme, lang, title/description, canonical (or noindex for the 404), og/twitter, one h1, one header/main/footer, alt, no text < 14px, Play links, primary fill, skip link first and moving focus to `<main>`, every Tab stop in DOM order with `:focus-visible` and a ring, scroll to footer, axe, same-origin, no console errors/failed requests; once per run: no `<script src`, robots `Sitemap:`, sitemap = indexed pages. Shots are full-page.
- 2026-10-29 (S3): shots come from one driver outside the repo, `$A/shots/take.mjs` (`start`: production build, `play`: dev build through `window.__cc`), not seeded `npm run e2e`: the VPS e2e stops in round 1 (known timing failure), so the plan's `__cc` fallback took every dev shot. All shots are seed 1, `continent:africa` (051's `board-phone` seed), so the credits stay few (7 photos). The play rules out what the answers rule out and, at ≤ 6 moves left, the rest of the look-alikes, so round 1 ends as a find (the round-end shot shows a find, 25 moves).
- 2026-10-29 (S3): `witness-note` is from round 2 (Aardvark): seed 1's round-1 mystery (Aye-aye) has no witness notes. PD/CC BY preference not pursued: 051 fixes seed 1 Africa for `board-phone`; 4 of the 7 photos are CC BY-SA, credited like the rest.
- 2026-10-29 (S3): `og.png` is the game shot natively at a 1200×630 viewport (same seed and round as `hero-board`), not a crop of `hero-board`: a 1440×900 cover crop cut the board's top and bottom edges. 95 KB PNG. Every page (404 too) has `og:image` (+ type, size, alt) and `twitter:card summary_large_image` with `twitter:image`.
- 2026-10-29 (S3): `shots.ts` records `photos` (animals whose photos show in the shot), not every animal in the round: `globe`/`globe-found` show none (emoji markers). A route lists its shots, and its page gets only those (`PageProps`), so the footer credits exactly what the page can show; the build checks every shot, used or not (each id has a profile with a photo, each file exists). Footer credit: "Photos in the screenshots, from Wikimedia Commons:" then one line per photo, "<animal linked to its Commons page>: <credit>, <licence>", deduped across the page's shots.
- 2026-10-29 (S4): skills installed at their pins, both = origin HEAD (`$A/skills/SOURCES.txt`); Taste's scripts need no npm packages.
- 2026-10-29 (S4): `/` copy is 051 §4's, with three additions, all from §5's claims or the shots: step 1's line "You get five look-alike animals from there. One of them is the one the camera saw." (051 gave step 1 no line); the journal line adds "the Field Journal keeps each one's range map and facts" (journal shot; Taste critique round 1, thinnest section); section 4 adds "So far 50 mammals, 15 amphibians and 11 reptiles." counted at build (`render.tsx` `countAnimals`, §5's {N} row; an unnamed class fails the build).
- 2026-10-29 (S4): every screenshot sits in a `neutral-3` tone-step frame (`roles.ts` `FRAME`, `p-xs rounded-l`): the game's own white panels had no edge on the white canvas (Taste critique round 1). No line or shadow; on bands the frame merges with the ground. Phone shots share one crop ratio (3:4, object position per step); the phone hero is a square crop on the board.
- 2026-10-29 (S4): shared site pieces: `Section.tsx` (canvas or band, margins, `py-xxl md:py-xxxl`), `Screenshot.tsx` (framed, sized, lazy or lead), `roles.ts` (H1/H2/H3/NOTE/LINK/MEASURE/FRAME; Layout and NotFound use them). `ShotImage` moved to `shots.ts`. React 18 doesn't know `fetchPriority`, so the hero passes lowercase `fetchpriority` through a spread (`LEAD_IMAGE`).
- 2026-10-29 (S4): `e2e:site` makes every image eager and decodes it before the full-page shot, and checks "every picture loads": the shot jumped to the footer, so lazy images in between never loaded and the artifact showed blanks.
- 2026-10-29 (S4): Taste's two WARNs left: `palette-cream` (cc neutral-3/neutral-2, binding) and `no-footage` (no motion layer by brief). Critique stopped after round 2 (7.5; still-page cap). Game e2e not rerun: S4 changes only `src/site/` and `scripts/e2e-site.mjs`.
- 2026-10-29 (S5, P): `check.sh` hosts from env `PLAY`/`APEX`/`WWW` (default the real names); redirect targets built from them, but the canonical compared with the build's fixed `https://critterconnect.org` (config `SITE_URL`). `CHECK_CONNECT=<ip:port>` (local test only; `deploy.sh` never sets it) adds `-k --connect-to` and skips the DNS guard. `--strict` prints SKIP lines as BAD; any other argument exits 2. `/site/` URLs are every `/site/<file>` in the page's HTML (href, src, srcset alike).
- 2026-10-29 (S5): `deploy/Caddyfile`'s `handle_errors 404` also does `import common`. Found by the Caddy run: error routes skip the site's routes, so the 404 page had no HSTS, nosniff or Referrer-Policy and showed `Server: Caddy`; now each header once, as on every other response. Not in 051 or A2.
- 2026-10-29 (S5): `.dockerignore` unchanged, as the brief says: its patterns are root-only, so the context keeps `db/content` (the site build reads it), `deploy/Caddyfile`, `src/site/og.png` and the shots. Proven by CI's `docker build --target caddy`.
- 2026-10-29 (S5): the Caddy run's `check.sh` shows BAD on apex `/teachers/`, `/privacy/`, `/terms/` until S6/S7 add them (expected; V9 reruns it on the final tree). Game e2e not rerun: S5 changes only deploy files and docs.
- 2026-10-29 (S6): `/teachers/` grounds alternate strictly canvas/band (1 canvas, 2 band, … 9 canvas). 051 §8's rows (6 and 7 band, 8 and 9 canvas) would put two equal grounds side by side, with no tone step between them.
- 2026-10-29 (S6): hero picture: text and shot side by side from 64rem (shot column 3/5), shot under the text below that. From 48rem the crop is the evidence grid exactly (`aspect-[780/750]`), so the hero shot holds 30% of the first screen (Taste focal-point FAIL at 18% first), the h1 stays at ≤ 2 lines at 768 (it was 3 in a 768 split), and no strip of the board shows at the crop's edge. The paper's sentence is a `<blockquote>` on a neutral-3 tone step, not a left rule (051 §4: tone steps, not lines). "Coming later" is heading left, list right (Taste `lopsided`).
- 2026-10-29 (S6): copy beyond 051 §4's outline, all from §5's claims or `privacy.tsx`: the "With signing in" column (optional; under 13 ask a parent; Clerk keeps the email; results kept to sync the journal; a parent can ask for deletion); "So far tested with simulated players, not yet in a classroom study: one who matches without reasoning finds nothing, and a careful one finds the animal in over 90% of rounds"; "Sound starts off, and the board plays with a keyboard too"; the facts section names the tiers from `sources.json` (IUCN Red List and range maps; ADW, AmphibiaWeb; zoos and agencies); the FAQ answers. No never-claim.
- 2026-10-29 (S6): class link: `classLinkUrl(seed)` in `config.ts`, shared by the page, `classLink.client.ts` and `e2e:site`. Without JS the field shows seed 1 and Copy stays `hidden` (Copy needs JS). If the clipboard refuses, the field's text is selected and the live line says so (no silent failure). The two inline scripts on `/teachers/` total 843 bytes; `e2e:site` now checks every page's inline scripts at < 2048 bytes. The class link checks need `Browser.grantPermissions` for the clipboard and a scroll to Copy before the click. Each shot clears an input's selection first, so the class link isn't highlighted in the artifacts.
- 2026-10-29 (S6): game e2e not rerun: S6 changes only `src/site/`, `scripts/site.mjs` and `scripts/e2e-site.mjs`.
- 2026-10-29 (S7, A2): game's `privacy.tsx`, `terms.tsx`, `LegalPage.tsx` deleted; text lives once in `src/site/pages/{Privacy,Terms}.tsx` via `LegalArticle.tsx`; no redirect, no Caddy rule. Every game link to privacy, terms or teachers: none in the repo (D3); CI step "No game links to site pages" guards it.
- 2026-10-29 (S7, A3/A4, landed in S5): `check.sh` checks 3 hosts with DNS guard and `--strict`; owner steps = deploy, Namecheap, `check.sh --strict`, then Clerk and Google items; rollback `git revert` + deploy, no Vercel.
- 2026-10-29 (S7, D7): terms' "Last updated" is the literal "October 29, 2026"; privacy keeps "September 26, 2026" (words unchanged). Operator sentence, appended to the terms' intro: "Critter Connect is run by {OPERATOR}, the “we” in these terms." (`OPERATOR` from config, one definition).
- 2026-10-29 (S7): legal titles keep the game's old "<title> · Critter Connect"; descriptions new (051 had none): privacy "What Critter Connect keeps if you sign in, what stays on your device, and how to delete it. No ads, no tracking.", terms names the operator. `LegalArticle` styles the moved plain h2/ul/a by descendant variants (H2 role, neutral-10 underlined links), so the moved markup stays as it was; `max-w-prose` measure inside the page margins.
- 2026-10-29 (S7): `check-game-css` writes `git archive` to a file (src/ with the shots exceeds `execFileSync`'s pipe buffer) and tracks each temp dir as soon as it's made (the first crashed run leaked one). Besides the sha256 it writes a one-rule-per-line copy of each side for the diff. FM3 probe base = `c361ed02^` (parent of the last `globals.css` change): exit 1 with the `--ev-reserve` diff.
- 2026-10-29 (S7): no (P) calls in S7. 051 updated per A6; its §10 Caddyfile block replaced by a description pointing at `deploy/Caddyfile` (one copy).
- 2026-10-29 (S8): e2e:site shots also call `getSelection().removeAllRanges()`: the tab walk selected the class link field, and blur + `setSelectionRange(0,0)` left the document range, so S6/S7 teachers shots showed the link highlighted (the S6 decision claimed otherwise). No rebase needed (branch already on origin/main `0bbbeb0e`). Audit notes, not drift: theme-color hex pair in `theme.ts` (pre-existing, moved); `FRAME` merges with band grounds (by design, S4).
- 2026-10-29 (Architecture): both theme additions (site-only darker primary fill, `--space-xxxl`) live in `src/site/site.css`, not `src/styles/globals.css`. Brief's scope listed `globals.css`; addendum item 1 (game theme stays exactly as is, byte-for-byte proof) wins. Proof: new `scripts/check-game-css.mjs` compiles game CSS on origin/main vs HEAD, must match.
- 2026-10-29 (Code review): Astra MUST-FIX 1 accepted as S9. SHOULD-CONSIDER not done, left for the owner: a denied clipboard already selects the link and says so (S6 design), and the WSL game e2e is the owner's run (PR body).

## Log

- 2026-10-29 11:14 UTC: Baseline. typecheck, lint, 47/47 unit, build pass; game e2e 524/574 and 523/574 (known VPS timing failure, matches prior baseline).
- 2026-10-29 11:30 UTC: Architecture. architect wrote findings (051 matches repo; no game links to legal pages; Tailwind scans whole repo) and target design incl. addendum (site-only tokens, check-game-css proof, host split, check.sh 3 hosts, no Vercel rollback). No code changed.
- 2026-10-29 11:34 UTC: Fable review. APPROVE, 0 MUST-FIX; 3 missed items + 5 SHOULD-CONSIDER for revision. No code changed.
- 2026-10-29 11:35 UTC: Astra review. APPROVE, 0 MUST-FIX; 3 SHOULD-CONSIDER (rendered game style check, strict post-DNS check.sh, keep old hashed assets). No code changed.
- 2026-10-29 11:36 UTC: Revision. No MUST-FIX, no architect round; 9 small review items accepted (R1-R9) and 2 Astra SC rejected, under Revision notes. No code changed.
- 2026-10-29 11:50 UTC: Steps. planner wrote S1-S8, Verification V1-V13, Failure modes (check-game-css, check.sh). No code changed.
- 2026-10-29 11:58 UTC: S1. Site build (`site:build`/`site:serve`, `src/site/` config, Layout, NotFound, render, site.css with the 2 site-only additions), Wordmark/THEME_COLORS/contentProfiles shared, ESLint + check-theme guards (probed), devDeps declared, CI `site:build`. typecheck, lint, 47/47, build pass; site build deterministic (`diff -r` empty), 404 has no `<script src`; game e2e 523/574, 0 new failure kinds; globe wordmark right in light/dark. Draft PR #36, CI `check` green (old Vercel check fails, ignored). Artifacts `$A/checks/s1/`, `$A/game-e2e/s1/`.
- 2026-10-29 12:12 UTC: S2. `scripts/cdp.mjs` (CDP client, Chrome launch, startBrowser, openPage) shared by `e2e.mjs` and new `e2e-site.mjs` (`npm run e2e:site`); game shots hide the dev badge; `02d-field-guide.png` added. typecheck, lint pass; e2e:site 84/84 on /404.html (4 shots, checked by eye); probe: neutral-6 text on 404 -> axe color-contrast FAIL, exit 1, reverted; game e2e 523/574, 0 new failure kinds, 02d present, no badge in shots. Artifacts `$A/e2e-site/s2/`, `$A/game-e2e/s2/`.
- 2026-10-29 12:26 UTC: S3. 9 game shots (WebP, 31-95 KB; hero 88 KB) + `og.png` (1200×630, 95 KB) in `src/site/`, seed 1 Africa, light, checked by eye; `shots.ts`; `render.tsx` per-page photo credits via `readProfiles`, every shot validated; `site.mjs` hashes shots and og; og/twitter image tags; e2e:site checks them and og.png's served size. typecheck, lint pass; site build deterministic (`diff -r` empty); probes: bogus id and missing file fail the build, credits render deduped; e2e:site 85/85. Artifacts `$A/shots/` (raw, take/convert scripts, COMMAND.txt, sizes), `$A/checks/s3/`, `$A/e2e-site/s3/`.
- 2026-10-29 12:38 UTC: S4. `/` (`pages/Home.tsx`, 6 sections per 051 §4, 7 shots, {N}=76 and class counts at build) with shared `Section`/`Screenshot`/`roles`; e2e:site eager-loads images before shots. typecheck, lint pass; site build deterministic; e2e:site 175/175 (`/`, 404); Taste lint 0/0, inspect `--allow still-page` 0 FAIL at 1440/768/390 (2 WARN defended), critique 2 rounds; speed `/` LCP 1536 ms, CLS 0.0005, 230 KB. Artifacts `$A/taste-inspect/home/`, `$A/taste-critique-home.md`, `$A/taste-lint.txt`, `$A/speed/`, `$A/e2e-site/s4/`, `$A/checks/s4/`, `$A/skills/SOURCES.txt`.
- 2026-10-29 12:55 UTC: S5. Dockerfile stages deps/build/site/caddy/run; compose builds caddy (no Caddyfile mount); Caddyfile per A2 + R3 (+ `import common` in the 404 route); new `deploy/check.sh` (3 hosts, `--strict`, DNS guard, cert hint); `deploy.sh` checks caddy's site files and runs check.sh; CI docker build + validate + index.html; docs (DEPLOY website section, AGENTS, README:3, paper §5.3 #11). typecheck, lint, `caddy validate`, `bash -n` pass; Caddy run all assertions OK except check.sh's 3 pages pending S6/S7, app-down probe exit 1; check.sh probes (TLS fail -> cert hint, refused, bad arg) as designed; live pre-deploy: BAD only on play. /privacy/ /terms/, apex/www SKIP with hint, `--strict` BAD, exit 1. CI `check` green on `4eae7b87` incl. `docker build --target caddy`, validate and `/srv/site/index.html` (site CSS hash in the image = local build); old Vercel check fails, ignored. Artifacts `$A/caddy-run/`, `$A/checks/s5/`.
- 2026-10-29 12:58 UTC: S6. `/teachers/` (`pages/Teachers.tsx`, 9 sections per 051 §4, 5 shots, §6's three rows verbatim, FAQ as visible Q&A) with `ClassLink.tsx` + `classLink.client.ts` (random seed via `crypto.getRandomValues`, Copy, live "Copied", fixed example without JS), bundled inline by `site.mjs`; `e2e:site` gains `/teachers/`, class link checks and the inline script budget. typecheck, lint pass; site build deterministic (`diff -r` empty); e2e:site 270/270 (`/`, `/teachers/`, 404; 12 shots, checked by eye); Taste lint 0/0, inspect `--allow still-page` 0 FAIL at 1440/768/390 (2 WARN defended), critique 3 rounds; speed `/teachers/` LCP 1544 ms, CLS 0.0005, 284 KB (`/` 231 KB). Artifacts `$A/e2e-site/s6/`, `$A/taste-inspect/teachers/`, `$A/taste-critique-teachers.md`, `$A/taste-lint.txt`, `$A/speed/results.json`, `$A/checks/s6/`.
- 2026-10-29 13:30 UTC: S7. Legal pages moved to `src/site/pages/{Privacy,Terms}.tsx` + `LegalArticle.tsx` (terms: operator sentence, Oct 29 date, `<a href="/privacy/">`); game's 3 legal files deleted; CI grep guard; `scripts/check-game-css.mjs`; DEPLOY.md and 051 (A6) updated. typecheck, lint, 47/47, build (routes `/`, `/explore`, `/login`); grep guards exit 0 (probe: a `'/privacy'` caught); legal diff = markup, operator sentence, date, link; check-game-css exit 0, sha256 equal, dropped exactly the 3 files, FM1/2/3/7 exit 1, deterministic, < 1 s, no temp left; site build deterministic, sitemap 4 apex URLs; e2e:site 444/444 (5 pages, 20 shots, legal shots checked by eye); dev `/privacy/` `/terms/` 404; game e2e 524/574, 0 new failure kinds. Artifacts `$A/game-css/`, `$A/legal-diff.txt`, `$A/checks/s7/`, `$A/e2e-site/s7/`, `$A/game-e2e/s7/`.
- 2026-10-29 13:40 UTC: S8. V1-V11 on the final tree: e2e:site 444/444 (fix: shots clear the document selection; teachers shots no longer show the class link highlighted; 16/20 shots byte-equal to S7, 4 changed checked by eye); Taste lint 0/0, inspect 0 FAIL both pages (2 WARN defended); speed `/` LCP 1560 ms 232 KB, `/teachers/` 1512 ms 286 KB, CLS 0.0005; game e2e 524/574, 0 new kinds, dev `/privacy/` `/terms/` 404; check-game-css exit 0 (sha256 equal, dropped exactly 3); grep guards exit 0; site build deterministic; typecheck, lint, 47/47, build (routes `/`, `/explore`, `/login`); caddy validate + Caddy run 105 OK, app-down exit 1; `bash -n`, live check.sh as expected pre-deploy; graphical-audit 0 drift, 2 site-only additions intentional. No rebase needed. PR #36 body written, marked ready; CI `check` green. Artifacts `$A/e2e-site/final/`, `$A/game-e2e/final/`, `$A/checks/final/`, `$A/taste-inspect/`, `$A/speed/results.json`, `$A/caddy-run/results.txt`, `$A/audit.md`.
- 2026-10-29 13:24 UTC: Code review (Astra). APPROVE_WITH_CHANGES; MUST-FIX 1 (check.sh passes cut-off transfers) accepted, added as S9; 2 SHOULD-CONSIDER to Summary. No code changed.
- 2026-10-29 13:29 UTC: S9. `check.sh` `fetched` needs curl exit 0, else BAD "transfer failed (curl exit N, HTTP code)" (35/60 keep cert hint). Probe `$A/cutoff-probe/` (stub: 200 then cut/stall): before 5 cut/stalled lines OK, after all 17 BAD, exit 1. Caddy run all OK + stub-down BAD exit 1; live check unchanged (`$A/checks/check-live.txt`); bash -n, typecheck, lint pass. PR body updated.

## Summary

Astra code review SHOULD-CONSIDER, for the owner: (1) `e2e:site` tests only the granted-clipboard Copy path, not a denied clipboard; (2) run the full game e2e on WSL (VPS shows 524/574, known timing failure).
