# Mission brief: Critter Connect website (plan 051 build)

To start: copy this file to `/srv/critter-ai/agent-state/missions/briefs/YYYY-MM-DD-cc-website.md` (today's date), then run `mission start critter-connect <that file>`. Start only after the owner merges the plan PR and relabels issue #34 `ready-for-agent`.

## Goal

The website at critterconnect.org, built as [plan 051](051-landing-page.md) designs it, delivered as one PR on kc0588615/phaser-june from `agent/cc-website`:

- 4 pages and a 404 from `src/site/`, rendered to static HTML by `npm run site:build` into `out/site/`: `/` (students), `/teachers/`, `/privacy/`, `/terms/`, `404.html`. Copy, sections and claims as 051 §4–§6.
- Served by the Hetzner Caddy: the site files built into the `caddy` image; Caddy blocks for `critterconnect.org` (site, 404, old game paths 308 to `play.`) and `www` (308 to the apex); `play.critterconnect.org` keeps the game and also serves `/teachers/`, `/privacy/`, `/terms/`, `/site/*` (051 §10).
- `deploy/check.sh`, run by `deploy/deploy.sh` and by the owner after the DNS move.
- Real screenshots of the game with their photo credits (051 §9).
- The two owner-approved theme additions, and no other theme change (051 §8).
- `npm run e2e:site` and the other checks below, all passing, with artifacts.

## Why

critterconnect.org still shows an old Vercel app for a game that no longer exists. Teachers need a plain, honest reason to bring the game into a class, and students need one click to start playing. The owner approved what the site says and how it ships in plan 051.

## Scope

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

## Definition of done

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

## Decision rules

- 051 is the design. The build's architect checks it against the repo at the start and records only the deltas; it doesn't redesign.
- `GUI.md` and the cc tokens win. Taste and elaya shape only layout and copy. A clash becomes a handoff item with 051's default, and the build goes on with the default.
- Claims come only from 051 §5's table; never-claim items stay out. Player copy says "the one the camera saw", never "mystery".
- Only 051 §6's three coming-soon items are shown, on `/teachers/`, each starting "Not available yet:".
- The two approved additions are the only theme changes. A new gap goes to the handoff file with a default.
- If a skill's repo has moved past its pin, use the pin and note the newer version.
- Keep it small: the four pages and the 404, nothing more.

## Notes

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
