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
- [ ] Steps: `planner` writes Steps and Verification

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

## Verification

## Code review (Astra)

## Release

## Decisions

- 2026-10-29 (Revision): Astra SC1 (rendered game style check) and SC3 (keep old hashed site assets) rejected; reasons under Revision notes.
- 2026-10-29 (Architecture): both theme additions (site-only darker primary fill, `--space-xxxl`) live in `src/site/site.css`, not `src/styles/globals.css`. Brief's scope listed `globals.css`; addendum item 1 (game theme stays exactly as is, byte-for-byte proof) wins. Proof: new `scripts/check-game-css.mjs` compiles game CSS on origin/main vs HEAD, must match.

## Log

- 2026-10-29 11:14 UTC: Baseline. typecheck, lint, 47/47 unit, build pass; game e2e 524/574 and 523/574 (known VPS timing failure, matches prior baseline).
- 2026-10-29 11:30 UTC: Architecture. architect wrote findings (051 matches repo; no game links to legal pages; Tailwind scans whole repo) and target design incl. addendum (site-only tokens, check-game-css proof, host split, check.sh 3 hosts, no Vercel rollback). No code changed.
- 2026-10-29 11:34 UTC: Fable review. APPROVE, 0 MUST-FIX; 3 missed items + 5 SHOULD-CONSIDER for revision. No code changed.
- 2026-10-29 11:35 UTC: Astra review. APPROVE, 0 MUST-FIX; 3 SHOULD-CONSIDER (rendered game style check, strict post-DNS check.sh, keep old hashed assets). No code changed.
- 2026-10-29 11:36 UTC: Revision. No MUST-FIX, no architect round; 9 small review items accepted (R1-R9) and 2 Astra SC rejected, under Revision notes. No code changed.

## Summary
