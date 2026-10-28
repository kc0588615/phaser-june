---
mission: cc-landing-plan
project: critter-connect
branch: agent/cc-landing-plan
status: active
started: 2026-10-28 05:06 UTC
---

# Mission: Critter Connect landing page, the plan

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

A reviewed plan for Critter Connect's new website at critterconnect.org, and a ready brief for the mission that builds it. It's more than one landing page: a small site with a front page and the pages each audience needs. Done means:

1. `plans/051-landing-page.md` in phaser-june says what the site includes and why: who it's for, the page list, each page's sections in order with their jobs, a copy outline (headlines, key lines, calls to action), the screenshots and other assets each section needs, and what the site must never claim.
2. It serves **two audiences**, and says how the front page routes each one:
   - **Teachers and educators** (grades 6–12) who might use the game as a teaching tool: what students practice, how a class would use it, student privacy, and what's coming for teachers.
   - **Students** who play: what the game is, why it's fun, and one obvious way to start playing (play.critterconnect.org).
3. **The visual system is fixed:** `GUI.md` + `gui/themes/cc.md` + `gui/themes/cc-components.md`. The build uses the graphical-ui skill (`.agents/skills/graphical-ui`) and checks its work at the end with graphical-audit. It uses the cc tokens, the fonts in `public/fonts` (Nunito, Open Runde, Patrick Hand) and the logo in `docs/brand/logo/`. Nothing else.
   - **Taste Skill 2.0** (`design-taste-frontend`, v2, github.com/Leonxlnx/taste-skill) helps with composition only: section order and layout, real screenshots instead of placeholders, realistic copy, and its browser check at three widths. Skip its art-direction step. It adds no colors, fonts, text sizes, spacing, radii, shadows or motion.
   - **elaya's `landing-page-design`** (github.com/elayadesign/ai-design-skills, `skills/landing-page-design/SKILL.md`): use only Part A, where it fits a two-audience site (intake questions, above the fold, how it works, FAQ, copy rules, SEO). Part B does not apply.
   - Where the theme has no fitting value, record it as a gap question for the owner, as GUI.md says. Don't invent a value.
4. It settles where the site lives and how it ships. The owner's decision: **served from Hetzner** by the same Caddy as the game, replacing the old Vercel app at critterconnect.org. The plan compares the two ways to build it (see Hosting and shipping).
5. `plans/051-build-brief.md` is a brief in the ops template's form (Goal, Why, Scope, Definition of done, Decision rules, Notes) that a build mission can start from as-is.
6. The owner reviews it as a PR on phaser-june, with `plans/README.md` showing plan 051.

### Why

Critter Connect has no real front door. critterconnect.org still shows an old Vercel app that says "Explore biodiversity through map-based expeditions", a game that no longer exists. Teachers need a reason to bring the game into a classroom, and students need a way in. The owner wants to see and approve what the page says before anyone builds it.

### Scope

In:
- New files: `plans/051-landing-page.md` and `plans/051-build-brief.md`. Add a row for 051 to `plans/README.md`.
- Screenshots, research notes and copies of both skills' `SKILL.md`, in `/srv/critter-ai/agent-state/missions/cc-landing-plan/`. Put only the screenshots the plan needs in the repo, under `plans/051-landing-page/`.
- Running the game locally (`npm run dev`, or the e2e harness) against the dev database to take real screenshots.
- Reading the live sites (critterconnect.org, play.critterconnect.org) and comparable sites on the web.

Out:
- Any code, styles, routes or config in the app (`src/`, `public/`, `deploy/`, `GUI.md`, `gui/`, `.agents/skills/`). This mission builds nothing.
- Installing either skill into the repo. Read them from GitHub; the build mission installs them.
- Deploying, DNS or Vercel changes. Agents have no Hetzner access. The owner does these from WSL.
- Writing to the database, even the dev copy.
- Legal advice. Flag privacy and compliance questions for the owner. Don't answer them.

### Definition of done

- The diff on `agent/cc-landing-plan` touches only `plans/` (051 files, its image folder, and the README row). `npm run lint` and `npm run typecheck` still pass.
- `plans/051-landing-page.md` covers:
  - **Audiences and their jobs:** what a teacher needs to decide "I'll try this with my class", and what a student needs to start playing within one click.
  - **Site map:** the pages (for example a front page, `/teachers`, a page on how the game works or where the facts come from, links to `/privacy` and `/terms`), with each one's audience, job and one main action. Then each page's sections in order with their copy outlines. Keep it as small as the two audiences allow, and say why each page earns its place.
  - **Claims and evidence:** each claim the page makes, with where in the repo it's true. Take learning claims from `docs/ANIMAL_BOARD_PAPER.md` §5 (it maps play to NGSS practices and MS-LS4-2 and says the game "does not claim to teach these on its own"; keep that honesty). Take facts from the content (count of animals and continents, sourced from IUCN, ADW and others) and privacy facts from `src/pages/privacy.tsx` (plays fully without an account; the under-13 section).
  - **Coming soon:** the owner allows "coming soon" for teacher features. List each candidate (for example a teacher guide or lesson plans, a standards map, class codes or rosters, seeing students' rounds) with what it would take in the game and what it would mean for student privacy. The plan recommends which, if any, the page should show. Every one shown must be clearly labelled as not available yet.
  - **Skill intake:** the inputs Taste reads from a brief (what only Critter Connect has), and elaya's intake questions answered once per audience (purpose, audience and objections, proof and assets, constraints). Give each answer with its evidence, or mark it as the owner's.
  - **How the skills and the cc theme fit together:**
    - How the build applies `GUI.md` and graphical-ui to each page: which cc components and roles each section uses (cards, buttons, headings, surfaces), and in which color modes.
    - What Taste does (composition, screenshots, the browser check) and which of its steps are skipped.
    - Which of elaya's Part A rules the plan takes.
    - Any theme gaps found, as questions for the owner.
  - **Assets:** a screenshot list, each one named (globe, board, field guide, round-end card, journal), saying which already exist in the plan's folder and which the build takes. Also the logo files to use, and any photo credits that apply (Commons photos used in the game carry their own licences).
  - **Hosting and shipping:** where the source lives (a folder in phaser-june or its own repo), the build output, the Caddy block for critterconnect.org (and www) next to the game's in `deploy/`, the DNS move from Vercel, and the owner's deploy steps. Also what happens to the Vercel project. Check against `docs/DEPLOY.md` and `deploy/`. Compare two options:
    - (a) pages inside the existing Next app, which already serves `/privacy` and `/terms` in the cc theme, with Caddy pointing critterconnect.org and www at it;
    - (b) a separate static build that imports the same `src/styles/globals.css` and `public/fonts` from phaser-june.

    A static site with its own copy of the theme is out, because it would drift from the theme. Recommend one option and put the choice in Questions for the owner.
  - **Basics:** accessibility, speed and SEO targets, which the build checks in a browser at phone and desktop widths. Also what the old site's links and title should become.
  - **Questions for the owner:** short and numbered. Put each one that blocks the build in the handoff file too.
- `plans/051-build-brief.md` names the real files and routes, the checks to pass (including Taste's browser check at three widths), where its artifacts go, and that it ends as a PR (the project never merges or deploys).
- The plan's Summary says: the recommended site map in five lines or fewer, the coming-soon items, how the skills fit the cc theme, and the open questions.
- A PR on kc0588615/phaser-june from `agent/cc-landing-plan`, linked to a GitHub issue for plan 051 (the repo's one-issue-per-branch rule).

### Decision rules

- Never claim something the game doesn't do. "Coming soon" is the only exception, it must be labelled, and it can't contradict the privacy page.
- Write for teachers in plain, specific language. Name what students do in a round. Avoid general claims like "boosts engagement".
- `GUI.md` is binding for visuals. Taste and elaya shape only layout and copy. Any clash with `GUI.md` goes to the owner as a recommendation. Never settle one silently.
- Player-facing copy says "the one the camera saw", never "mystery". The README's wording is out of date.
- Student copy is for grades 6–12: short and plain, using outdoor and tech words. No academic, violent or medical words.
- Look at three to five comparable sites (educational games with a teacher audience) for patterns only, and record them in the artifacts folder. Copy no text or layout.
- If a skill's repo has changed since this brief (renamed files, a new version), use the current version and note what changed.
- Keep it small. This is a plan of a few pages, not a design system.

### Notes

- The game: README.md (grades 6–12; pick a continent on the globe, find the one the camera saw among look-alikes by matching gems for clues; finds glow on the globe and go in the Field Journal). Rules are in `docs/CLUE_MATCH.md` and `docs/ANIMAL_BOARD_PAPER.md`. The terms are in `CONTEXT.md`.
- The educational case is `docs/ANIMAL_BOARD_PAPER.md` §5: the skills table in 5.1, strengths in 5.2, and weaknesses in 5.3. 5.3 item 11 says teachers can't yet see students' reasoning, which is a candidate for coming soon.
- Legal pages exist at `/privacy` and `/terms` in the app (`src/pages/privacy.tsx`, `terms.tsx`). Read terms.tsx for the operator's name.
- The current critterconnect.org page is client-rendered. Take a screenshot with headless Chrome to record what it shows before it's replaced.
- Taste Skill v2 needs Node 22+ and Chrome. The VPS has Node 24, and headless Chrome is already used by `npm run e2e`. A Taste build takes about 30–45 minutes and a few hundred thousand tokens. Size the build brief with that in mind.
- elaya's `landing-page-design` credits Taste for its realism and motion ideas, so the two overlap. elaya's Part B fonts (Geist, Manrope, Poppins) and its other visual rules don't apply. The cc fonts in `public/fonts` are final.
- The owner develops in WSL and merges and deploys there. This VPS clone's `origin/main` is the base.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Owner answers (H2): `architect` redesigns for option (b) static build and folds in answers 2–9 (no new review round; owner's decision)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

2026-10-28, worktree at `ddc609a3` (origin/main `acffc179`), Node 24.21.
- Install: `node_modules` present, `npm ls` clean. Migrate: n/a (no migration history; DB is the shared dev copy and this mission never writes to it).
- `npm run typecheck`: pass. `npm run lint`: pass (exit 0). `npm test`: 47/47 pass.
- `npm run e2e` (dev server on :3100, Playwright Chromium 1208 via a `--no-sandbox` wrapper in /tmp since Ubuntu 24.04's AppArmor blocks Chrome's sandbox; `/usr/bin/google-chrome` doesn't exist here): **523/574, run twice, same result**. Not caused by this mission (no code changed). First failure is the time-based "holding an answer cell" check (`scripts/e2e.mjs` ~l.315, 1150 ms hold, `during:false`); after it, the field guide's photo (`AnimalSheets.tsx:178`) covers the board, so every move is refused (`nothing on screen covers the board` x45) and round 1 never ends ("Timed out waiting for the Camera row landing"). Likely slow 2-CPU ARM + swiftshader in dev mode; owner's WSL run on the same commit reports 738/738. Artifact: `/srv/critter-ai/agent-state/missions/cc-landing-plan/baseline-e2e/` (report.json, screenshots, e2e.log). Reproduce: `npx next dev -p 3100` then `E2E_BASE_URL=http://localhost:3100 CHROME_PATH=<chrome --no-sandbox wrapper> npm run e2e`.
- For this mission (plans only), the bar is typecheck + lint; the globe and board render correctly for screenshots (see `02a-picked.png`).

## Architecture

Written 2026-10-28 by the architect. Redesigned the same day for the owner's choice of (b), a separate static build (H2; see Decisions). It settles what `plans/051-landing-page.md` and `plans/051-build-brief.md` will say. Research is in `/srv/critter-ai/agent-state/missions/cc-landing-plan/`:
- `skills/`: both SKILL.md copies, Taste's references and inspector source, and `SOURCES.txt` with commits;
- `research/old-site/`: the old HTML and headers;
- `research/live-play/`: the live `/privacy/` HTML, the scroll check script and a screenshot;
- `research/comparables/`: raw HTML only; the comparables study is still a Step.

The proofs for (b) (section 8) ran in `/tmp` against this worktree's `node_modules` and wrote nothing to the repo.

### Findings (ranked by impact)

1. **`/privacy` and `/terms` can't be scrolled.**
   - `src/styles/globals.css:371-376` sets `html, body, #__next { height: 100%; overflow: hidden }` for the full-screen game, and `LegalPage` (`src/components/LegalPage.tsx:9`) has no scroll container of its own.
   - Checked on live `play.critterconnect.org/privacy/` at 390×844 (`research/live-play/scrollcheck.mjs`): the content ends at 1516px, the document is 844px tall, and a wheel or a touch swipe leaves `scrollY` at 0. On a phone, readers never reach "Players under 13", "Deleting your data" or "Changes", and the site will send teachers there.
   - Taste's inspector also measures window scroll (`inspect.mjs:140`).
   - **Fix (b):** both pages move out of the Next app into the static site. Caddy serves them on both hosts at the same URLs (sections 2 and 8). The site's entry CSS imports `globals.css` and then sets `html, body { height: auto; overflow: visible }`. The game's lock is untouched, and no `:has()` opt-out is needed.
2. **Retired for (b): Clerk on every page.**
   - The evidence stands: `ClerkProvider` at `src/pages/_app.tsx:11`, the middleware at `src/proxy.ts:8`. Live `/privacy/` loads about 200 KB gz of first-party code plus 130 KB gz of Clerk scripts.
   - The static site has no Next and no Clerk, so there is nothing to opt out of. A lint rule keeps it that way (section 8).
   - The legal pages leave Next, so their readers stop loading Clerk too. The game keeps Clerk.
   - The `maplibre-gl.css` import in `_app` is now outside this plan's scope.
3. **cc's light-mode accent fails WCAG AA contrast.**
   - These are theme values:
     - `#ffffff` on `color-1 #00906c` (the `.btn-primary` label): 4.03:1;
     - `color-1` as text on white: 4.03:1;
     - `--cte-text-muted #837e72` on white: 4.04:1;
     - the globe's "coming soon" chip (`src/components/globe/PlaceList.tsx:34`, neutral-7 on neutral-3, 12px): 3.68:1.
   - AA needs 4.5:1. Dark mode passes (4.67:1).
   - **Fix, owner-approved exception (H2 answer 3):** in light mode only, the primary button's fill darkens to **`#008663`, which gives the white label 4.58:1**.
     - Same OKLCH hue (about 167°) and chroma; lightness goes from 0.580 to 0.550.
     - It's the lightest hex step with a margin over 4.5 (`#008764` is 4.52:1).
     - Dark mode keeps `#00906c`. Its label there is dark `neutral-1 #051411` at 4.67:1, which `#008663` would cut to 4.12:1.
   - **Where it's declared:** `src/styles/globals.css`, as `--button-primary-background`: light `#008663` in `:root`, dark `#00906c` under `[data-theme="dark"]`. That's the pattern `--option-badge-background` already uses. A comment cites plan 051 and H2, and `.btn-primary` reads the variable.
   - **Scope:** every light-mode `.btn-primary`, the game's too: Sign in, the place card's Play, Next animal, Yes/No and Let's play. It's one recipe, so the site and the game don't drift. `color-1` and its other roles (focus ring, option badge, navigation) stay unchanged.
   - The site avoids the other gaps with existing roles: links in neutral-10 with an underline, secondary text in neutral-8 (7.5:1), and no "coming soon" chip. That includes the legal pages, which today colour links `color-1` (`LegalPage.tsx:13`) and "Last updated" `neutral-7` (`:16`).
4. **Taste v2 fails a cc page on rules the brief and GUI.md settle.**
   - The current skill is `skills/taste-skill/SKILL.md`, named `design-taste-frontend`, v2.1.5, commit `12af471f62`.
   - The inspector **fails** a page with fewer than 8 moving elements (`still-page`, `inspect.mjs:231-234`), but the brief says Taste adds no motion.
   - Taste's laws want display type around 8vw and sections 120–240px apart on desktop and 72–112px on a phone (`references/layout.md:115`, `lib/rules.mjs:167`). cc tops out at text `xxl` 48px and space `xxl` 48px.
   - Its `draw.mjs` is the art-direction step. Even with `--keep palette,type` it still deals type sizes, motion and scenes, so the build skips it.
   - **Fix (owner, H2 answer 4):**
     - The inspector runs with `--allow still-page` only.
     - The h1 stays at `xxl` 48px, led by a large real screenshot. That satisfies `focal-point`, a picture holding at least 30% of the first screen (`rules.mjs:131`).
     - One new spacing step, **`--space-xxxl: 64px`**, as an owner-approved exception. It goes in `globals.css` `:root` next to `--space-xxl`, with `--spacing-xxxl` in `@theme inline`. It's the next step on cc's scale (32, 48, 64, on its 4px grid), not a parallel `--space-section`.
     - It's used only for section padding, `py-xxl md:py-xxxl`. The gap from one section's text to the next is then 96px on a phone and 128px from 48rem, inside Taste's ranges.
     - The inspector has no FAIL for small gaps, so the step serves the composition, not a gate.
   - The elaya path is as the brief says: `skills/landing-page-design/SKILL.md`, last changed `a2735a3eaf` on 2026-10-26, which credits Taste.
5. **`deploy.sh` never applies Caddyfile edits.**
   - The Caddyfile is a single-file bind mount (`deploy/docker-compose.app.yml:33`). `git pull` gives it a new inode, the running container keeps the old one, and `compose up -d` (`deploy/deploy.sh:33`) doesn't recreate an unchanged `caddy` service.
   - **Fix (b):** the Caddyfile and the site's files are built into a `caddy` image from the repo's Dockerfile (section 8), and the bind mount goes.
     - `compose up -d`, unchanged, then recreates `caddy` when its image changed (a new Caddyfile or new site files), and only then. BuildKit caches `COPY` by content, and the site build is deterministic.
     - No script state is kept, so the next deploy completes one that failed halfway.
     - The earlier `cmp` step is dropped.
6. **The old site is a stale Vercel build of this app.**
   - `critterconnect.org` returns 307 to `www`. Its title is "Critter Connect" and its description "Explore biodiversity through map-based expeditions." Its HTML has a single route, `/` (`research/old-site/index.html`).
   - It loads a Clerk **development** instance in public (`pk_test`, `clean-lynx-72.clerk.accounts.dev`).
   - DNS is at Namecheap (`dns1/2.registrar-servers.com`):
     - apex A `216.198.79.1` (Vercel, TTL 1799 s);
     - `www` CNAME `5ed334e8d7ea0cd8.vercel-dns-017.com`;
     - `play` A `178.156.159.183`.
   - The MX records (Namecheap email forwarding, which carries `privacy@`), the SPF TXT and the `clerk` CNAME must stay untouched.
   - `pk_live` decodes to `clerk.critterconnect.org`, so the production Clerk instance's root is `critterconnect.org`. The site needs nothing from Clerk.
7. **Stale or missing facts the copy must not repeat.**
   - `docs/ANIMAL_BOARD_PAPER.md:241` (§5.3 item 11) says "Rounds are not saved in this build". In fact every finished round is saved with its `session_seed` (`db/schema.sql`, `clue_match_solves`; `docs/CLUE_MATCH.md`; `privacy.tsx`).
   - `README.md:3` still says "the mystery animal among 12 look-alikes" and "charges".
   - `terms.tsx` names no operator; it only says "we" and gives `privacy@critterconnect.org`.
   - **Fix (owner, H2 answers 5 and 9):**
     - The terms name Haunted Pavement LLC as the "we", and the footer names it on every page.
     - The build rewrites `README.md:3` in current terms: five look-alikes, gems that fill yes/no questions, the one the camera saw.
     - It adds a note, dated the day it's written, under paper §5.3 item 11: finished rounds are now saved with their `session_seed`, but they show outcomes, not reasoning.
8. **Screenshot sources have traps.**
   - Dev-mode shots show Next's dev-tools badge (the "N" bottom-left in `baseline-e2e/01-globe.png` and `02a-picked.png`).
   - `window.__cc` exists only in dev (`src/game/debugBridge.ts:51`).
   - On the VPS, e2e never finishes round 1 (Baseline: 523/574), so it doesn't produce the round-end card or journal shots.
   - Section 7 works around all three.
9. **Two logo mismatches.**
   - The game's served wordmarks (`public/branding/critterconnect-logo{,-light}.svg`) have the same paths as `docs/brand/logo/full-color{,-dark}.svg` with a tight viewBox.
   - The light one is recoloured `#000`/`#6FA8BC`, where the master uses `#121f19`/`#47788a` (commit 24e5d64a, "light-mode wordmark").
   - **Owner (H2 answer 8):** the site uses the served pair, copied from `public/branding/` at build time, and light-mode screenshots.
10. **New: esbuild is an undeclared dependency.**
    - `scripts/run-tests.mjs:4` calls it "a devDependency", but `package.json` doesn't list it. It arrives only through `drizzle-kit` (`npm ls esbuild`: 0.19.12).
    - `npm test`, `npm run content`, `npm run iucn` and now the site build depend on it, and the site build runs in the deploy path. It's the risk the Fable review raised for axe-core.
    - **Fix:** declare the lockfile's `esbuild@0.19.12` as a devDependency (`npm install -D --prefer-offline esbuild@0.19.12`).

Fine as is:
- the cc tokens and the `.btn` recipe in `globals.css`, apart from finding 3's fill;
- `scripts/check-theme.mjs`, which gains the `src/site` root;
- the `trailingSlash` and redirect config in `next.config.mjs`;
- the HSTS and nosniff headers, which Caddy now also sets for the site.

### Target design

#### 1. Audiences and their jobs

| Audience | Arrives from | Job on the site | Decides on | Main action |
|---|---|---|---|---|
| Student (grades 6–12) | a teacher's link, search, word of mouth | Learn what the game is and why it's fun, then start | the first screen: one picture of the real board, one sentence, one button | **Play**: `https://play.critterconnect.org/` (the globe; picking a continent is the game's own first step) |
| Teacher or educator | search, the old domain, a colleague | Decide "I'll try this with my class" | what students do in a round, what they practice and how honest the claims are, time (a round takes about 5–10 minutes), student privacy, cost and setup, what's missing | **Play a round yourself**, then **Make a class link** (`/explore/?seed=N`) |

Routing on the front page:
- The hero has one primary button, Play, for students and for teachers who want to try it.
- "For teachers" sits in the header at every width and again as a mid-page band. It's never a second hero button (elaya's A4).
- Nothing on the site needs an account.

#### 2. Site map

| Route (apex) | Source → file in `out/site/` | Audience | Job | Main action | Why it earns its place |
|---|---|---|---|---|---|
| `/` | `src/site/pages/Home.tsx` → `index.html` | both | Say what it is in one screen; route students to play and teachers to `/teachers/` | Play | the front door |
| `/teachers/` | `src/site/pages/Teachers.tsx` → `teachers/index.html` | teachers | Give a teacher everything needed to decide: the round in specifics, skills, class use, privacy, sources and limits, coming soon, FAQ | Play a round yourself (plus the class link) | teacher content would bury the student path on `/` |
| `/privacy/`, `/terms/` | `src/site/pages/{Privacy,Terms}.tsx`, moved from `src/pages/` → `privacy/index.html`, `terms/index.html` | both | the legal text, now scrollable | none | required, already exist |
| any other path | `src/site/pages/NotFound.tsx` → `404.html` | both | send a lost visitor on | Play | people type the old domain by hand; one line in the shared layout |

- There's no separate student page (the front page is the student page), no "how it works" page (a section on `/`), and no "sources" page (a section on `/teachers/`). None of them would have an action of its own.
- `play.` also serves `/teachers/`, `/privacy/` and `/terms/`, the same files (section 8). So the legal URLs don't change, and `/teachers/` can be checked live before DNS moves. Every page carries its apex canonical, so the copies on `play.` don't compete in search.
- Links between site pages are plain root-relative `<a>` (`/teachers/`), which work on both hosts and in the local preview. On `play.`, the wordmark's `/` is the game's globe, which suits the game host.
- Play links are absolute: `https://play.critterconnect.org/`.

#### 3. Page sections

**Shared roles (every page, both colour modes; the build checks light and dark):**

| Element | cc role |
|---|---|
| Page ground | `neutral-1` (cte-canvas). Section bands step to `neutral-3` (cte-surface-muted); the footer is `neutral-2`. Tone steps instead of lines or shadows: cc and Taste agree here. |
| Section spacing | `py-xxl md:py-xxxl` on each section (finding 4); inside a section, cc's steps up to `xxl` |
| h1 | `font-brand`, heavy, size `xl` below 48rem and `xxl` from 48rem; at most about 32 characters so it stays on two lines at 390px |
| h2, h3 | `font-brand` heavy, `l`; h3 `m` |
| Running text | `font-ui` regular `m` (16/24) in `neutral-10`; secondary text in `neutral-8`. Never cte-text-muted (finding 3). |
| Small text | `s` (14/20) for the footer, credits and the line under the button. Nothing at `xs`/`xxs` (Taste fails text under 13px). |
| Actions | `.btn .btn-primary` (one per section at most; its light fill from finding 3), `.btn-secondary`; no `.btn-outline` (Taste counts 1px boxes) |
| Links | `neutral-10` with an underline |
| Screenshots | `<img>` with `width`/`height` from `shots.ts` (no layout shift), or `<picture>` for the hero's phone and desktop crops; content-hashed files under `/site/` (immutable cache); radius `m`; the hero gets `fetchpriority="high"`, the rest `loading="lazy" decoding="async"` |
| Fonts | Nunito only. Open Runde only for tabular numerals, if any. Patrick Hand is not used (it is the cards' handwriting). |
| Motion | none added; cc's control transitions only |
| Not used | no colour-1 or colour-4 fields (only the primary button's fill was made to pass, finding 3; dark mode has no `on-color-4` role); no emoji in markup; no eyebrows or pills above headings; no numbering like 01/02 (use `<ol>`) |

`src/site/Layout.tsx` renders the whole document, without `next/head`:
- `<head>`:
  - the title, description, canonical, and og and twitter tags, from the page list in `src/site/config.ts`;
  - `favicon.svg`;
  - the theme-color pair, now exported from `src/lib/theme.ts` (`_app.tsx` imports it too, so the hexes live in one place);
  - the game's `THEME_SCRIPT`, inline: it follows the system mode, or a saved pick;
  - the hashed stylesheet.
- A skip link and `<header>`: `Wordmark` linking to `/`, the "For teachers" link, and a primary "Play" button. All three fit in one row at 390, so there's no menu. `Wordmark` (`src/components/Wordmark.tsx`, new, with no Next imports) is the light/dark `<img>` pair moved out of `GlobeScreen.tsx:55-58`, which then uses it too.
- `<main>`.
- `<footer>`: For teachers, Privacy, Terms, Play, `CONTACT_EMAIL` (moved from `LegalPage.tsx` to `config.ts`), "Made by Haunted Pavement LLC", and the photo credits for that page's screenshots.

**Front page `/`** (elaya layout A, classic hero plus sections):

| # | Section | Job | Copy outline: headline · key line · action | Picture |
|---|---|---|---|---|
| 1 | Hero (canvas) | what it is, start playing | "Find the animal the camera saw" · "A free game about real animals for grades 6–12. Match gems to answer yes-or-no questions, then rule out the look-alikes until one is left." · **Start playing** · small: "Free. No account, no ads." | `hero-board` (desktop) or `board-phone` (phone) in one `<picture>`, at least 1/3 of the first screen on desktop |
| 2 | How a round works (band) | show the loop in 3 real steps (`<ol>`) | "Pick a continent" · "Match gems to fill four questions" (20 gems each, 30 moves) · "Rule out the look-alikes" (compare with each animal's field guide; rule out the wrong one and it escapes) | `globe`, `board-phone`, `field-guide` |
| 3 | Keep what you find (canvas) | why it's fun to keep playing | "Every find goes in your journal" · finds glow on the globe; trails of 5 rounds with 3 hearts | `globe-found`, `journal` |
| 4 | Real animals (band) | proof without invented proof | "{N} real animals, every fact sourced" (N from content at build) · IUCN Red List, Animal Diversity Web and other ranked sources; photos from Wikimedia Commons, credited on every card | `round-end` |
| 5 | For teachers (canvas) | route teachers | "Teaching grades 6–12?" · what students practice in one line, plus "No student accounts. About 5–10 minutes a round." · **See how a class uses it** (secondary) → `/teachers/` | none (text and button, two columns at desktop) |
| 6 | Final call (band) | same as the top | "Ready? Pick a continent." · **Start playing** | none |

**Teachers `/teachers/`** (elaya layout B, long-form, to educate and answer doubts):

| # | Section | Job | Copy outline | Picture |
|---|---|---|---|---|
| 1 | Hero | what it is for a class | "A deduction game for life science" · "Students compare five look-alike animals, read real field data and rule out the ones the evidence excludes. Free, in a browser, no student accounts; a round takes about 5–10 minutes." · **Play a round yourself** | `grid-marked` |
| 2 | What students do in a round | specifics, not "engagement" | 5 animals, one the camera saw; 30 moves; 4 yes/no questions filled by 20 gems each; scouting an animal's own answers by clearing next to its card; comparing with field guides; ruling out and releasing; a wrong rule-out lets the animal escape and costs a heart; a trail is 5 rounds with 3 hearts; the round-end card shows the full record, family tree, range map and sources; about 5–10 minutes a round | `field-guide` |
| 3 | What they practice | the §5.1 skills, honestly | 6 lines condensed from §5.1; the NGSS sentence in "maps onto" words, never "aligned to" (SEPs: analyzing and interpreting data, argument from evidence; ideas like MS-LS4-2); then, near verbatim, "The game does not claim to teach these on its own; it gives repeated, low-stakes practice with real data." Plus: so far tested with simulated players, not yet in a classroom study (§6) | `witness-note` |
| 4 | Using it with a class | how a class uses it | the four ideas in §5.5 (think aloud in pairs, debrief losses, a shared seed, extend from the journal); sound starts off. **The live thing:** a `ClassLink` that makes `https://play.critterconnect.org/explore/?seed=<random 1…4294967295>` in the browser, with a Copy button (cc text field read-only, `.btn-secondary`, a live region saying "Copied"). Without JS it shows a fixed example link. "Everyone who opens it starts with the same animals." | `round-end` |
| 5 | Student privacy | the privacy answer, from the privacy page | plays fully without an account; no name or email asked; the journal stays in the browser; finished rounds are saved with no link to the player; no ads, tracking cookies or analytics; under 13, ask a parent before signing in; photos load from Wikimedia Commons; → `/privacy/`. No COPPA, FERPA or other legal statements. | none (two columns: without sign-in, with sign-in) |
| 6 | Where the facts come from, and their limits | trust through honesty | source tiers (`db/content/sources.json`); every source is shown on the round-end card; limits from §5.3: traits are simplified into categories (#4), "no record" doesn't mean "no" (#5), pictures simplify (#3), teachers can't see students' reasoning yet (#11, current form) | `journal` |
| 7 | Coming later for teachers (not available yet) | coming soon, labelled | the three items in section 5, each row starting "Not available yet:" | none |
| 8 | Questions teachers ask | FAQ, visible plain Q&A (good for answer engines) | Is it free? Do students need accounts? What grades? How long is a round? (About 5–10 minutes.) What devices? Can the whole class get the same animals? Can I see my students' results? (Not yet; see Coming later.) Is the information accurate? Does it work offline? (No.) | none |
| 9 | Final call | | "Try a round, then share a class link" · **Play a round yourself** | none |

**Legal pages:**
- `src/site/pages/Privacy.tsx` and `Terms.tsx` are today's `src/pages/privacy.tsx` and `terms.tsx`, moved. The old files and `src/components/LegalPage.tsx` are deleted.
- Nothing in the game links to them (`rg -i privacy src` finds only those three files). The Next build drops the routes, and the URLs keep working through Caddy. In dev, preview them with `npm run site:serve`.
- The privacy words are unchanged.
- The terms gain one sentence naming Haunted Pavement LLC as the operator, the "we". So their "Last updated" becomes the build's date. Their `next/link` becomes `<a href="/privacy/">`.
- `LegalPage` becomes `src/site/LegalArticle.tsx`, with the shared roles: the h1, "Last updated" in neutral-8, running text in neutral-10, and links in neutral-10 with an underline, inside an `<article>`. The layout owns `<main>`, the title and the ground.
- "← Back to the globe" is dropped, because the header's logo and Play button cover it.

#### 4. Claims and evidence

| Claim | Where it's true |
|---|---|
| Free; plays without an account; no ads, tracking cookies or analytics | the terms page, "The game"; the privacy page's intro and "What we don't do" |
| For grades 6–12 | `README.md:3`; paper Abstract |
| Five look-alikes, one is the one the camera saw; 30 moves; 4 questions × 20 gems; trail of 5 rounds with 3 hearts | `CONTEXT.md` (Suspect, Mystery animal, Question, Trail); `ANIMAL_RULES` in `src/clueGame/animalBoard.ts:56` |
| A round takes about 5–10 minutes | the owner's playtests (H2 answer 7; Decisions) |
| Answers never rule anyone out by themselves; the player compares and rules out; a wrong rule-out lets it escape | `CONTEXT.md` (Answer, Rule out, Escape); paper Abstract |
| Matching without reasoning finds nothing; careful play finds over 90% (simulated players) | paper Abstract and §6; `plans/047-wander.md`; the paper header for 047-1 (careful 96/92%) |
| Finds glow on the globe and go in the Field Journal; the round-end card has the family tree, range map and sources | `README.md`; `docs/CLUE_MATCH.md` (Globe); paper §5.2 #5 |
| {N} animals ({mammals}/{amphibians}/{reptiles}), today 76 (50/15/11) | `db/content/animals/*.json`, counted by `render.tsx` at build. Known drift: the game serves the DB, which lags the content until the owner runs `npm run content -- build` after a content PR. Counting from the content is still right, because it's what the repo vouches for. |
| Facts from the IUCN Red List (all 76), Animal Diversity Web (65) and others in ranked tiers | `db/content/sources.json`; each profile's `sources` |
| Photos from Wikimedia Commons, credited; maps use IUCN and other credited sources | the terms page, "Photos and content"; profile `photo` fields |
| The skills practised; the NGSS mapping ("maps onto", never "aligned to"); "does not claim to teach these on its own" | paper §5.1 |
| Classroom ideas | paper §5.5 |
| One link gives the class the same animals and boards | `docs/CLUE_MATCH.md` ("`?seed=N` replays a session exactly"); `useAnimalSession.ts:28-31` accepts integers 1…4294967295; `npm run e2e` replays by seed ("same seed = same run") |
| Privacy facts | the privacy page's sections |
| Sound starts off; the board can be played with a keyboard | `docs/CLUE_MATCH.md` ("Once a run", "How it fits together") |
| Runs in a browser, nothing to install, phones and computers | the game is a web app; `globals.css` desktop rules at 48rem; the build shows it at 1440 |
| Made by Haunted Pavement LLC | the owner (H2 answer 5); the terms after the build |

**The site never claims:**
- that it teaches on its own or raises scores;
- learning gains (there's no human study, §6);
- being "aligned to standards" (it "maps onto" practices, per §5.1);
- COPPA or FERPA compliance, or any other legal statement (the owner's call, H2 answer 6);
- dashboards, rosters or class views;
- that a teacher guide, a standards map or class results exist (they're "not available yet");
- offline play;
- any time other than "about 5–10 minutes" a round, or any time for a whole trail;
- users, schools, quotes, logos or testimonials (none exist);
- that the photos are its own;
- "mystery", "12 look-alikes" or "charges";
- that "rounds are not saved".

**Copy rules:**
- Players read "the one the camera saw", never "mystery".
- Student lines are short and plain, with outdoor and tech words and no academic, violent or medical words.
- Teacher lines name what students do.
- Headlines are 32 characters or fewer, followed by one supporting sentence.
- Buttons are a verb plus what you get, never "Learn more".
- Standards: "maps onto", never "aligned to".
- The operator is "Haunted Pavement LLC", exactly.
- No invented numbers: counts come from the content files at build time.

#### 5. Coming soon

| Candidate | What it would take | Student privacy, against the privacy page | Show? |
|---|---|---|---|
| Teacher guide (printable: a round walkthrough, §5.5 activities, a worksheet for debriefing an escape) | writing only | none | **Yes** |
| Standards map (NGSS practices and ideas per activity) | writing plus an expert's review; the wording stays "maps onto", never "aligned to" | none | **Yes** |
| Class results from a class link: per animal, how many rounds were found or escaped, with no names | its own plan first. A seed names a puzzle, not a class or a viewer: anyone holding the link could read the results, and strangers on the same seed add to them. It needs a class key separate from the seed and a rule for who may view. Data: `clue_match_solves` already stores `session_seed` | no new personal data, but rounds get a new use (today: "to see which puzzles are too easy"), so the privacy page gets one sentence when it's built (owner, H2 answer 2b) | **Yes, labelled** |
| Class codes and rosters | teacher accounts, a class table, student join codes or nicknames, Clerk organisations or our own | links play to identifiable students under 13: contradicts "We don't ask for your name or email"; COPPA, FERPA and district agreements | **No** |
| Seeing each student's reasoning (§5.3 #11, §5.4) | rosters plus recording marks with the evidence at the time | same as rosters, and more data per student | **No** |

The owner confirmed this list (H2 answer 2). Each item shown is a list row that starts with "Not available yet:", under a heading that says the same.

#### 6. How the skills and the cc theme fit

- **Binding:**
  - GUI.md, `gui/foundations.md`, `gui/interface-judgment.md` and the cc tokens in `globals.css`, applied with **graphical-ui** while building.
  - The build finishes with a **graphical-audit** change review of the diff, which reports drift and gaps.
  - `npm run lint` runs `check-theme.mjs`, now over `src/site` too.
  - The two owner-approved changes in `globals.css` (finding 3's fill and finding 4's `xxxl`) each carry a comment citing plan 051 and H2. graphical-audit reports them as intentional local changes, not drift.
- **What Taste does:**
  - Used: step 1 (inventory), step 2 (the argument: claims become sections, as in the tables above), step 4 (the idea, composition only), step 5 (the copy deck rules in `references/copy.md`), and steps 6.2–6.9 (the hero, sections, imagery, fullness, frame and semantics, mapped onto cc roles).
  - The gate: `lint.mjs` on `src/site/`, and `inspect.mjs` on the **built site** served by `npm run site:serve`, at 1440, 768 and 390, on `/` and `/teachers/`, with `--allow still-page`. Then step 8 (look, plus the critique in `references/critique.md`, three rounds at most) and step 10 (the report).
  - Skipped: step 3 (`draw.mjs`, the art direction), 6.1 (tokens: cc's), `assets.mjs` (found pictures: the game's own screenshots exist), scroll scenes, step 9 (the motion layer) and `base.css`.
  - The idea: "the real round is the page's material". Every section shows the actual screen it describes, cropped large; nothing is drawn or stock.
  - The live thing: the class link maker.
  - Legal pages are not put through Taste.
- **elaya Part A taken:**
  - A1: the intake, answered per audience in 051.
  - A2: above the fold, items 1–3 and 5. Item 4's "proof signal" becomes a true fact line (free, no account, real animals), not logos. Mid page, the three steps of how it works. At the bottom, a FAQ (Q&A on `/teachers/`) and a final call like the top. Social proof is skipped because none exists.
  - A3: layout A for `/`, B for `/teachers/`.
  - A4: one primary action, specific, proof beside the claim, objections as a section.
  - A5: headline and button formulas.
  - A6: section-by-section build order.
  - A7: index both pages, title and meta, internal links, FAQ as plain Q&A.
  - A8: pitfalls as a checklist.
  - Part B (fonts, scales, radii, motion, nav, the B11 tagline reveal) is not used.
- **Theme gaps, settled by the owner (H2 answers 3 and 4):** the light primary fill `#008663` and the spacing step `xxxl` 64px; the h1 stays `xxl`. No other gap was found. Any new one goes to the handoff file with a default, as GUI.md says.
- **Taste's inputs (what only Critter Connect has), for 051:**
  - the camera trap and "the one the camera saw";
  - polaroid cards on red pins with handwritten numbers;
  - five look-alikes from real families (okapi and hirola, aardvark and pangolin);
  - the evidence grid with its "Camera saw" row;
  - gems with faces;
  - witness notes with blanked words;
  - ruled-out animals wandering toward the edge their way;
  - the globe that glows with your finds;
  - the Field Journal;
  - the family tree, the IUCN range map and the sources on the round-end card;
  - 76 animals with sourced facts.
- **elaya's intake answers:**
  - Purpose: play / try a round and make a class link.
  - Objections:
    - students: is it fun, do I need an account, does it work on my device;
    - teachers: what do they do, what do they learn, how long it takes, student data, cost and setup, accuracy, can I see results.
  - Proof: real screenshots, counts and sources. There are no testimonials, and none will be invented.
  - Constraints: the cc theme, plain voice, phone first for students, desktop for teachers.
  - Traffic sources: the owner's. There are no analytics, by policy.

#### 7. Assets

| Name | Screen | Size | How the build takes it | Used on |
|---|---|---|---|---|
| `hero-board` | `/explore/?seed=S&place=continent:africa`, round start, light mode | 1440×900 | game production build (`npm run build && npx next start -p 3100`), headless Chrome screenshot (no `__cc` needed) | `/` hero; cropped to 1200×630 for `src/site/og.png` |
| `board-phone`, `globe` | round start; the globe with its continent list | 390×844 @2x | game production build, headless | `/` |
| `field-guide`, `grid-marked`, `witness-note`, `round-end`, `journal`, `globe-found` | a guide open; answers plus a rule-out; a note; the round-end card; the journal; finds glowing | 390×844 @2x | `npm run e2e` on dev :3100 with `E2E_SEED`/`E2E_PLACE`, after two small `scripts/e2e.mjs` edits: `screenshot()` removes `nextjs-portal` first, and a `02d-field-guide.png` shot is taken while the guide is open (~l.345). If the VPS run stops before the round ends (Baseline), finish the seeded round in the dev browser with `window.__cc` (the playtest skill), with the same badge removal. | `/`, `/teachers/` |
| `old-site` | critterconnect.org before the switch | 390, 1440 | **this mission**, headless Chrome | plan folder only |

- **Shot list:** `src/site/shots.ts` records each shot's file, width, height, alt text, seed, place and the animal ids visible.
  - The ids are copied from the `report.json` of the e2e run that took the shot, or from the `__cc` session. They're checked by eye whenever a shot is retaken, so the credits stay right.
  - The shots are committed as WebP in `src/site/shots/`, converted once with the installed `sharp` when they're taken. So the deploy build needs no image tools.
- **Plan folder** (`plans/051-landing-page/`, this mission, at most 5 images): `old-site-390.png` and `old-site-1440.png`, plus `globe.png`, `board-phone.png` and `board-1440.png` from the **live** play site (production, so no dev badge and no DB writes). They illustrate the plan; the build retakes all of them from the game as it is then.
- **Logos:**
  - The served `public/branding/critterconnect-logo{,-light}.svg` and `public/favicon.svg`, copied by the build to the same paths, so the site and the game share one source.
  - `og.png` stays a PNG, because some link scrapers reject WebP. It lives at `src/site/og.png`, which isn't root-level, so `.dockerignore`'s `*.png` keeps it: Docker patterns don't cross `/` without `**`. Proof: live `/branding/critterconnect-oauth-logo.png` returns 200 `image/png`, and that file was added (404b15f8) after `.dockerignore` (47433479).
  - No app icon is needed.
- **Photo credits:**
  - Commons photos keep their own licences: today 24 CC BY-SA 4.0, 18 CC BY-SA 3.0, 9 CC BY 2.0, 8 public domain, and others; 2 animals have none.
  - `src/site/render.tsx` reads the visible animals' `photo.credit/license/page` with `readProfiles`, moved from `scripts/content.ts:23` to `src/lib/contentProfiles.ts` so both share it. It prints one line per photo in that page's footer.
  - The build fails if a shot lists an animal with no profile.
  - Where seeds allow, prefer shots whose animals are CC0, public domain or CC BY.
  - The site credits every photo and makes no other licence statement (H2 answer 6).

#### 8. Hosting and shipping

**Chosen: (b), a separate static build (owner, H2 answer 1).** Its source is in phaser-june, under `src/site/`. The Hetzner Caddy serves it for `critterconnect.org` and `www`.

**The build is React rendered to HTML by the repo's own tools.**
- The pages are React components like the game's, rendered once with `react-dom/server`.
- The CSS is `globals.css` itself, compiled by the installed `@tailwindcss/postcss`.
- Nothing new is installed.

| | React to HTML with esbuild, postcss and Tailwind (chosen) | Next static export, as a second Next project | Tailwind CLI with HTML partials, or Astro or Eleventy |
|---|---|---|---|
| Theme | `globals.css`, imported at build | same | same CSS, compiled by a new CLI or framework |
| Header, footer, legal text | one `Layout`, the moved legal components, and `Wordmark` shared with the game | same | hand-copied partials, or a templating tool |
| New tooling | none | export can't share the game's project: API routes, redirects, headers and proxy are unsupported (`node_modules/next/dist/docs/01-app/02-guides/static-exports.md`). So it needs a second config, pages folder and Turbopack root. | a new dependency |
| JS shipped | two small inline scripts | React and Next's runtime, to hydrate | none |

Proven on 2026-10-28:
1. An entry CSS that `@import`s `src/styles/globals.css` compiles with `@tailwindcss/postcss` `{ base: <site folder>, optimize: { minify: true } }`.
   - The fonts, tokens and `.btn` recipe come in.
   - The game's utility classes stay out, because `base` limits the scan.
   - A later `html, body` rule overrides the lock.
   - The result is 20 KB, 5.4 KB gz.
2. esbuild bundles a TSX page that imports `@/lib/theme` (the tsconfig paths), and `renderToStaticMarkup` renders it.
3. `scripts/run-typescript.mjs` can't run this build. It bundles every package, and Tailwind's native `@tailwindcss/oxide` and `lightningcss` can't be bundled ("No loader is configured for .node files"). So the build is a plain `.mjs` that calls esbuild, postcss and Tailwind directly, as `scripts/run-tests.mjs` does.

- **Source** (`src/site/`):
  - `config.ts`: `SITE_URL`, `PLAY_URL`, `CONTACT_EMAIL`, `OPERATOR`, and the page list (route, title, description).
  - `Layout.tsx` and `LegalArticle.tsx`.
  - `ClassLink.tsx` (its markup, with a fixed example link) and `classLink.client.ts` (the random seed, Copy, the live region).
  - `pages/{Home,Teachers,Privacy,Terms,NotFound}.tsx`.
  - `render.tsx`: reads the profiles and renders every page to an HTML string, given the asset URLs.
  - `shots.ts`, `shots/*.webp` and `og.png`.
  - `site.css`: `@import "../styles/globals.css"`, `@source "../components/Wordmark.tsx"`, and the scroll override (finding 1).
- **Build** (`scripts/site.mjs`, run as `npm run site:build`), into `out/site/`, which is already in `.gitignore` and in ESLint's ignores:
  1. Empty `out/site/`.
  2. Compile `site.css` with postcss and Tailwind (base `src/site`, minified), to `/site/` under a content-hash name.
  3. Bundle `classLink.client.ts` with esbuild (iife, minified), to inline.
  4. Copy the shots and `og.png` to `/site/` under content-hash names.
  5. Bundle and run `render.tsx` with esbuild (as `run-tests.mjs` does). Write `index.html`, `teachers/index.html`, `privacy/index.html`, `terms/index.html` and `404.html`.
  6. Copy `public/fonts/`, the two wordmarks and `favicon.svg` to the paths the game uses.
  7. Write `robots.txt` and `sitemap.xml` from the page list.

  The output is deterministic: no dates and no random values. The class link's seed is made in the browser.
- **Preview:** `npm run site:serve`, which runs `python3 -m http.server 3101 -b 127.0.0.1 -d out/site` (like `npm run docs`). The preview, e2e and Taste all use it.
- **Guards:**
  - `eslint.config.mjs`: `no-restricted-imports` for `src/site/**` (`next`, `next/*`, `@clerk/*`).
  - `scripts/check-theme.mjs`: `src/site` joins `ROOTS`. `_app.tsx` leaves `HEX_ALLOWED` once its hexes move to `theme.ts`.
  - CI (`.github/workflows/ci.yml`): `npm run site:build`, then `docker build --target caddy`, then inside that image `caddy validate` (with `APP_DOMAIN` set) and a check that `/srv/site/index.html` exists. Docker isn't on the agents' VPS, so CI is the only place the stage is proven before a deploy.
  - `tsc` already covers `src/site` (`tsconfig.json` includes `**/*.tsx`).
- **How the files reach Caddy: they're built into its image.**
  - `Dockerfile`:
    - The first stage's `npm ci` and `COPY . .` become a `deps` stage.
    - `build` (unchanged from `ARG` on) and a new `site` stage both start `FROM deps`. `site` runs `npm run site:build`.
    - A new `caddy` stage starts `FROM caddy:2`, copies `deploy/Caddyfile` to `/etc/caddy/Caddyfile` and copies `/app/out/site` to `/srv/site`.
    - `run` stays the last stage, unchanged.
  - `site` starts from `deps`, not `build`: it needs no Clerk key, and it neither waits for nor repeats the Next build.
  - `deploy/docker-compose.app.yml`: `app.build` gains `target: run`. `caddy` swaps `image: caddy:2` for `build: { context: ., target: caddy }` and drops the Caddyfile mount; `caddy_data` and `caddy_config` stay.
  - `deploy.sh`'s `build -q` and `up -d` then cover both images (finding 5).
- **Caddy** (`deploy/Caddyfile`). The apex is hardcoded, like the domain in `deploy.sh`, so a missing variable can't break the game's block:
  ```
  (common) {
  	encode zstd gzip
  	header {
  		Strict-Transport-Security "max-age=31536000"
  		X-Content-Type-Options nosniff
  		Referrer-Policy strict-origin-when-cross-origin
  		-Server
  	}
  }

  # The website (plan 051): static files built into the caddy image (Dockerfile, stage caddy).
  (site) {
  	root * /srv/site
  	header /site/* Cache-Control "public, max-age=31536000, immutable"
  	file_server
  }

  {$APP_DOMAIN} {
  	import common
  	@site path /teachers /teachers/* /privacy /privacy/* /terms /terms/* /site/*
  	handle @site {
  		import site
  	}
  	handle {
  		reverse_proxy app:8080
  	}
  }

  critterconnect.org {
  	import common
  	@game path /explore /explore/* /login /login/* /clue-match /clue-match/* /api/*
  	redir @game https://{$APP_DOMAIN}{uri} 308
  	import site
  	handle_errors 404 {
  		rewrite * /404.html
  		file_server
  	}
  }

  www.critterconnect.org {
  	redir https://critterconnect.org{uri} 308
  }
  ```
  Checked on 2026-10-28 (Caddy 2.11.7, `APP_DOMAIN=play.critterconnect.org`):
  - `caddy validate` passes.
  - A local run of the same file, with the hosts swapped for `http://*.test:3102`, a stub upstream and a scratch site folder:
    - on the apex, `/`, `/teachers/` and `/privacy/` returned 200, and `/teachers` returned 308 to `/teachers/`;
    - `/nope/` returned 404 with `404.html`;
    - `/explore/?seed=5` and `/api/places/` returned 308 to `https://play.critterconnect.org/…`, with the query kept;
    - on `play.`, `/` and `/explore/` reached the upstream, while `/teachers/`, `/privacy/`, `/terms/` and `/site/*` came from the files;
    - `www` returned 308 to the same path on the apex;
    - `/site/*` carried the immutable cache header.
  - HSTS, nosniff and Referrer-Policy came back once each, even from an upstream that sets its own. `-Server` defers the header block, so Caddy's values replace Next's on `play.`.
  - `handle_errors` can't sit inside `handle`, so the 404 page is apex-only.

  The build re-runs both checks on its final file.
- **`deploy.sh`:** the remote part is unchanged (pull, `build -q`, `up -d`, the health wait). Its inline curl loop becomes `bash deploy/check.sh`, and the script exits non-zero if that fails.
- **`deploy/check.sh`** (new; run by `deploy.sh` and by the owner after the DNS move). Each line prints `OK` or `BAD` with the route and what was expected, and the script exits 1 on any `BAD`.
  - On `play.`:
    - today's four routes return 200;
    - `/teachers/`, `/privacy/` and `/terms/` return 200 and link `/site/site.` (the static pages, served by Caddy);
    - every `/site/…` URL in `/teachers/` (the CSS, the shots, `og.png`) returns 200 with its type. That proves the images are in the caddy image before DNS moves.
  - On the apex, only once `getent hosts critterconnect.org` resolves to `play.`'s IP (otherwise one line, `critterconnect.org: DNS not moved yet, skipped`):
    - `/`, `/teachers/`, `/privacy/` and `/terms/` return 200, with the apex canonical and no `<script src` (no Clerk, no framework);
    - every `/site/…` URL in `/` returns 200;
    - `/robots.txt` and `/sitemap.xml` return 200, and `/nope/` returns 404;
    - `/explore/?seed=1` and `/api/places/` return 308 to `https://play.critterconnect.org/…`;
    - `www.critterconnect.org/teachers/` returns 308 to `https://critterconnect.org/teachers/`.
- **Owner's steps after merging the build PR:**
  1. Optionally, a day before: lower the TTL of `@` and `www` to 300 at Namecheap.
  2. `npm run deploy` from WSL.
     - `play.` serves `/teachers/`, `/privacy/` and `/terms/` from the site at once; the front page shows only on the apex. `check.sh` skips the apex.
     - Until step 4, `docker logs caddy` shows ACME errors for `critterconnect.org` and `www`. That's expected, not a reason to roll back.
     - Do step 3 the same day.
  3. Namecheap → critterconnect.org → Advanced DNS: set `@` A from `216.198.79.1` to `178.156.159.183`, and `www` CNAME to `critterconnect.org.`. Leave MX, TXT and `clerk` alone.
  4. On the VPS, `docker restart caddy` to request the certificates now.
  5. From WSL, `bash deploy/check.sh`: every line `OK`, the apex included.
  6. In Vercel, remove both domains from the old project now. **Delete the project one week after step 3** (H2 answer 2c; its environment holds a Clerk dev key).
  - Rollback: restore the two DNS records (possible during that week). For a bad site build: `git revert`, then `npm run deploy`.
- **Old links:**
  - `www.*` gets a 308 to the apex.
  - `/` gets the new front page (the old site had no other page).
  - `/explore*`, `/login*`, `/clue-match*` and `/api/*` get a 308 to `play.`, with the path and query kept.
  - Any other path gets the 404 page, with Play.
  - The old title "Critter Connect" and description "Explore biodiversity through map-based expeditions." become the new per-page titles and descriptions (section 9).

#### 9. Basics: targets and checks

- **Accessibility:**
  - Targets: WCAG 2.1 AA; one h1; landmarks and a skip link; visible focus (the existing `:focus-visible` outline); keyboard reach in reading order; alt text on every screenshot; no text under 14px.
  - Checks: `scripts/e2e-site.mjs` (`npm run e2e:site`), run against `npm run site:serve`. Its env is `E2E_SITE_URL`, default `http://localhost:3101`.
    - It reuses the CDP client and Chrome launcher, moved from `scripts/e2e.mjs:45-90` into `scripts/cdp.mjs`, which both scripts import.
    - It runs at 390×844 and 1440×900, in light and dark (`Emulation.setEmulatedMedia`), on `/`, `/teachers/`, `/privacy/`, `/terms/` and `/404.html`.
    - It runs axe-core for tags wcag2a, wcag2aa, wcag21a and wcag21aa, and expects **0 violations, with no exceptions**. Finding 3 fixed the last one.
  - axe-core stays a declared devDependency, pinned to the `4.11.0` already in the lockfile. `e2e-site.mjs` loads it with `createRequire(import.meta.url).resolve('axe-core/axe.min.js')` and injects it over CDP. It never ships.
  - The same script also checks:
    - the document scrolls to the footer (finding 1);
    - there's one h1;
    - the title, description, apex canonical and og tags are present;
    - the Play links point at `https://play.critterconnect.org/`;
    - there's no `<script src`, every request goes to the site's own origin, and there are no console errors or failed requests;
    - the class link: two loads give two different links, each `https://play.critterconnect.org/explore/?seed=N` with N an integer from 1 to 4294967295; Copy puts it on the clipboard (permission granted over CDP), and the live region says "Copied"; with JS off, the fixed example shows.
  - It writes `e2e-artifacts/<run>-site/report.json` and `site-<page>-<width>-<mode>.png`, and records the command to reproduce the run.
  - That a seed replays the same round is the game's promise, already covered by `npm run e2e` (same seed, same run).
- **Speed:**
  - Targets, on the built site at 390 with 4× CPU slowdown and Slow 4G (1.6 Mbps, 150 ms), on `/` and `/teachers/`:
    - LCP ≤ 2.5 s and CLS ≤ 0.1;
    - at most 300 KB transferred on first load (about 6 KB gz of CSS, 49 KB of Nunito in three weights, the wordmarks and the hero WebP);
    - no JS beyond the two inline scripts (under 2 KB);
    - no requests to other hosts.
  - Check: the build measures once with a short CDP script kept in its artifacts folder, with the command recorded.
- **SEO:**
  - Targets:
    - a title and description for each page. Proposed: "Critter Connect: a free animal deduction game for grades 6–12", and "Critter Connect for teachers: free, no student accounts";
    - a canonical `https://critterconnect.org/…` on both hosts;
    - og and twitter tags, with `og.png` as an absolute apex URL;
    - `lang="en"`;
    - `robots.txt` with a `Sitemap:` line, and `sitemap.xml` listing the 4 apex URLs;
    - the 404 page answers with status 404.
  - Checks: `e2e:site`, then `deploy/check.sh` through Caddy after the deploy (section 8).

#### 10. The two deliverables

- **`plans/051-landing-page.md` sections, in order:**
  1. Summary: the site map in 5 lines or fewer, the coming-soon items, how the skills fit cc, and the open questions.
  2. Audiences and jobs.
  3. Site map and routing.
  4. Pages: the section tables with full copy outlines.
  5. Claims and evidence, plus never-claim.
  6. Coming soon.
  7. Skill intake.
  8. Skills and the cc theme, including the inspector allow-list and the two owner-approved theme changes.
  9. Assets.
  10. Hosting and shipping: the chosen static build with its alternatives table, Caddy, the deploy and the owner's steps.
  11. Basics.
  12. Questions for the owner: answered (H2), plus the defaults the redesign set (section 11).
  - Each section is the corresponding part of this design, written out. The images go in `plans/051-landing-page/`.
- **`plans/051-build-brief.md`**, in the form of `/srv/critter-ai/ops/templates/mission-brief.md`:
  - **Goal:** the website at critterconnect.org, delivered as a PR: 4 pages and a 404 from `src/site/`, built into the caddy image; the Caddy blocks for the apex and www; `deploy/check.sh`; screenshots and credits; the two owner-approved theme additions; and the checks.
  - **Why.**
  - **Scope In:**
    - New: `src/site/**`, `src/components/Wordmark.tsx`, `src/lib/contentProfiles.ts`, `scripts/site.mjs`, `scripts/cdp.mjs`, `scripts/e2e-site.mjs` and `deploy/check.sh`.
    - Changed:
      - `src/styles/globals.css`: the two owner-approved additions only, `--button-primary-background`, and `--space-xxxl` with `--spacing-xxxl`;
      - `src/components/globe/GlobeScreen.tsx`: uses `Wordmark`;
      - `src/lib/theme.ts`: exports the theme-color pair, which `src/pages/_app.tsx` imports;
      - `scripts/content.ts`: imports `readProfiles`;
      - `scripts/e2e.mjs`: imports `cdp.mjs`, and gets the two shot edits from section 7;
      - `scripts/check-theme.mjs` and `eslint.config.mjs`: the guards;
      - `package.json` and `package-lock.json`: the scripts `site:build`, `site:serve` and `e2e:site`, and the devDependencies `esbuild@0.19.12` and `axe-core@4.11.0`;
      - `.github/workflows/ci.yml`, `Dockerfile`, `deploy/docker-compose.app.yml`, `deploy/Caddyfile` and `deploy/deploy.sh`;
      - `docs/DEPLOY.md`: a website section, and Caddy's row in "What runs where";
      - `AGENTS.md`: a "Website" line in "Where Things Live";
      - `README.md:3`, and the dated note in `docs/ANIMAL_BOARD_PAPER.md` §5.3 item 11.
    - Deleted, because they move into `src/site/`: `src/pages/privacy.tsx`, `src/pages/terms.tsx` and `src/components/LegalPage.tsx`.
    - `.dockerignore` is unchanged.
  - **Scope Out:**
    - game rules and UI beyond the `Wordmark` move and the light primary fill;
    - any theme value beyond the two approved;
    - `gui/` and GUI.md;
    - new npm packages (declaring the installed esbuild and axe-core is allowed);
    - Clerk settings;
    - deploying, DNS and Vercel;
    - DB writes beyond e2e's normal round saves to the dev copy.
  - **Definition of done:**
    - typecheck, lint and `npm test` pass;
    - `npm run build` passes;
    - `npm run site:build` runs twice and `diff -r` finds no difference (the build is deterministic);
    - `npm run e2e:site` passes in full;
    - the game's `npm run e2e` shows no new failures against the VPS baseline (the fill and the `Wordmark` move change pixels only), and the owner confirms the full run on WSL;
    - Taste: `lint.mjs` clean, and `inspect.mjs` with 0 FAIL at 1440, 768 and 390 on the served site, every screenshot opened, and the critique written;
    - the graphical-audit report, which lists the two owner-approved changes as intentional;
    - the speed numbers;
    - `caddy validate` and the local `*.test` run (section 8) pass on the final `deploy/Caddyfile`, and `bash -n` passes on `deploy/deploy.sh` and `deploy/check.sh`;
    - CI is green, including the caddy image step;
    - artifacts are in `/srv/critter-ai/agent-state/missions/<build-slug>/`;
    - a PR linked to the 051 issue; it never merges or deploys;
    - a Summary with the owner's steps from section 8.
  - **Decision rules:**
    - GUI.md wins.
    - Taste and elaya shape only layout and copy.
    - A clash becomes a handoff item, and the build goes on with this plan's default.
    - Claims come only from 051's table.
    - Only the approved coming-soon items are shown.
    - The two approved additions are the only theme changes.
  - **Notes:**
    - The skills are installed pinned, outside the repo, in the build's artifacts folder: Taste `12af471f62` (2.4 MB) and elaya `ded7efc9d5`.
    - `CHROME_PATH` points to a `--no-sandbox` wrapper around `~/.cache/ms-playwright/chromium-1208/chrome-linux/chrome`, because AppArmor blocks Chrome's sandbox and Taste's launcher doesn't pass `--no-sandbox`.
    - Run `inspect.mjs --out <artifacts>/taste-inspect`.
    - Docker isn't on the Oracle VPS, so the image is proven in CI, and finally by the owner's deploy.
    - Site images live under `src/site/`, never at the repo root, because of `.dockerignore`'s `*.png`.
    - A Taste run takes about 30–45 minutes and a few hundred thousand tokens per page. So the build planner splits the work into about 6 units:
      1. infrastructure: the site build, `Layout`, Docker, compose, Caddy, `check.sh`, CI and the guards, plus the README and paper fixes;
      2. shots and credits;
      3. `/`;
      4. `/teachers/`;
      5. the legal pages' move, the 404 page and `e2e:site`;
      6. the checks and the audit.
- **`plans/README.md` row:** `| 051 | Website at critterconnect.org: front page + /teachers in the cc theme, a static build (src/site) served by the Hetzner Caddy | High | M | owner answers (H2, done) | Planned 2026-10-28 (agent/cc-landing-plan): plan + build brief, PR for review |`

#### 11. Questions for the owner

Answered (H2, 2026-10-28): see Decisions. The redesign raises no blocking question. It sets four defaults, which the owner can overturn in the PR:
1. The darker primary fill applies to every light-mode `.btn-primary`, the game's included (finding 3).
2. `play.` also serves `/teachers/`, `/privacy/` and `/terms/`: the same files, with the apex canonical (section 2).
3. A deploy that changes the Caddyfile or the site recreates the `caddy` container. That's a few seconds' blip for the game, and it happens only then (finding 5).
4. The terms' "Last updated" moves to the build's date, because the operator sentence changes them.

### Judgement calls

- The site is a front page plus `/teachers/`. How the game works and where the facts come from are sections, not pages; each page has one job.
- Play goes to the globe, as the brief says, not straight to `/explore`: the globe is the game's front door, and finds glow there.
- The class link only makes whole-world ("Anywhere") links. Continent links would need the live places list, and a static build has no database. Make it a follow-up if teachers ask.
- Animal counts come from the content files at build time. Continent counts come only from the database, so the copy names no number of continents.
- The FAQ is plain visible Q&A, not an accordion, for answer engines and no-JS readers.
- The skills run from a pinned copy outside the repo instead of being vendored (Taste is 2.4 MB).
- Plan screenshots come from the live play site, so the plan mission writes nothing to any database.
- The build is React rendered to HTML with the repo's own esbuild, postcss and Tailwind. It uses the same components and theme file as the game, adds no framework and ships no framework JS.
- The legal pages move into the site, and Caddy serves them on both hosts. That gives one copy and one renderer, fixes the scroll bug, and keeps the URLs unchanged for anything that links to them.
- The Caddyfile and the site are built into the caddy image, so compose's own change detection applies them.

### Rejected alternatives

- (a) pages inside the game's Next app: the owner chose (b) (H2, 2026-10-28).
- A static site with its own copy of the theme: the brief rules it out (drift).
- Next static export as a second Next project: export can't share the game's project (no API routes, redirects, headers or proxy), so it needs its own config, pages folder and Turbopack root, and it still ships React and Next's runtime.
- Astro, Eleventy, or the Tailwind CLI with HTML partials: a new toolchain, or a hand-copied header and footer, when the repo already has React, esbuild, postcss and Tailwind.
- Running the build through `scripts/run-typescript.mjs`: it bundles every package, and Tailwind's native modules can't be bundled (section 8).
- Splitting `globals.css` into theme and game files for the site: a cleaner import, but it churns the game's stylesheet to save about 2 KB gz. Tailwind's `base` already keeps the game's utilities out.
- Committing the built site to git: it can drift from its source.
- Building on the Hetzner host: everything there runs in Docker.
- Site files in a named volume or a mounted folder with `caddy reload`: no restart, but it needs a copy step and host state on every deploy, for rare changes.
- The `cmp` and force-recreate step in `deploy.sh` (the earlier design): baking the files into the image lets compose detect the change itself.
- A separate Dockerfile for the caddy image: it repeats the `npm ci` stage the Dockerfile already has.
- Serving the site from the app container: it couples the site to the game's process and brings Next back.
- 308s from `play.`'s `/privacy` and `/terms` to the apex: until DNS moves they'd land on the old Vercel app, and outside links to the `play.` URLs would take an extra hop.
- Keeping the Next legal pages and sharing their text: two renderers for the same pages, plus a scroll fix inside the game.
- A darker button for the site only: the site's and the game's primary buttons would differ (drift).
- `--space-section` as the new step's name: a parallel scale, where `xxxl` extends cc's.
- Front page at `critterconnect.org/welcome/`: the apex root must be the front door, and an extra redirect hurts.
- A `/students` page: the front page already does that job in one click.
- Taste's `draw.mjs --keep palette,type`: it still deals type sizes, motion and scenes that cc doesn't have.
- `assets.mjs` found pictures or a video loop: the game's own screens are the honest pictures, and video adds weight on school networks.
- An on-page mini round as Taste's "live thing": it duplicates the game's rules when the real game is one click away.
- Reusing the globe's "coming soon" chip: it is 3.68:1 at 12px.
- Vendoring Taste into `.agents/skills/`: 2.4 MB for two scripts.
- A `.dockerignore` negation or `og.jpg`: not needed, since `*.png` matches root-level files only (section 7).
- Hand-written checks instead of axe: they would re-implement WCAG rules that axe already has.

## Architecture review (Fable)

Checked 2026-10-28 against the worktree. Findings 1–9 verified: `globals.css:371-376` lock + `LegalPage` with no scroll container; `ClerkProvider` at `_app.tsx:11`, matcher at `proxy.ts:8`; `#00906c` on white = 4.03:1 (recomputed); `inspect.mjs:231` honours `--allow still-page`; `docker-compose.app.yml:33` single-file bind mount + `deploy.sh:33` plain `up -d` (inode claim correct); paper §5.3 #11 "Rounds are not saved" vs `CLUE_MATCH.md:10`; `README.md:3` "12 look-alikes"/"charges"; `terms.tsx` names no operator; logo hexes (`#000`/`#6FA8BC` served vs `#121f19`/`#47788a` master). Counts: 76 profiles = Mammalia 50 / Amphibia 15 / Reptilia 11; IUCN 76, ADW 65; licences 24 BY-SA 4.0, 18 BY-SA 3.0, 9 BY 2.0, 8 PD, 2 none. `ANIMAL_RULES` = 5/4/30/20/3 hearts/5 rounds. Next 16: `matchHas` anchors the host regex (`^…$`) and strips the port, so `has`/`missing` host rules won't catch `play.`; proxy matcher goes through the same path. `Dockerfile` `COPY . .` includes `db/content`, so build-time `getStaticProps` reads work. Design covers every item in the Brief's definition of done; comparables remain a Step as noted.

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. **`.dockerignore` excludes `*.png` (and `plans`).** `public/site/og.png` and any copied `docs/brand/logo/app-icon-512.png` never reach the image: `og:image` 404s in production and the build's own check wouldn't see it (it runs outside Docker). Fix in section 8: either add `!public/site/*.png` to `.dockerignore` (and list `.dockerignore` under Changed) or ship `og.jpg`. Don't make it WebP: several scrapers reject WebP og images. Screenshot WebPs under `src/components/site/shots/` are unaffected.
2. **Legal pages will fail the design's own axe gate.** `LegalPage.tsx:13` sets `[&_a]:text-color-1` (4.03:1 on white) and `text-neutral-7` for "Last updated" (12px-class contrast, same family as the chip in finding 3). Section 3 says "the text is unchanged" and section 9 expects 0 violations except the primary-button gap. Either apply the shared link/secondary-text roles (neutral-10 underlined, neutral-8) to `LegalPage` when it moves into `SiteLayout`, or list these as exceptions. Pick one in the plan.
3. **axe-core is an undeclared, transitive dependency** (`eslint-config-next → eslint-plugin-jsx-a11y → axe-core@4.11`), while the build brief says "no new npm dependencies". A future `eslint-config-next` bump can remove it silently and the e2e stage breaks for an unrelated reason. Either declare `axe-core` as a devDependency and allow that one exception in the brief's Scope, or drop axe and keep the hand-written checks. Don't import from a hoisted path you don't own.

MISSED:
- Finding 2's fix as stated ("`_app` renders them without `ClerkProvider`") doesn't remove `@clerk/nextjs` from the shared `_app` chunk; the static import still ships ~80 KB gz of Clerk React to site pages (section 8's table admits this, finding 2 doesn't). Only the `clerk.critterconnect.org` scripts go away. Say so in 051, or load `ClerkProvider` via `next/dynamic` only when the page isn't a site page.
- First `npm run deploy` after merge (before DNS moves): the new apex curls in `deploy.sh` will print 000. The script doesn't fail on them, but the owner's steps should say that's expected until step 3, or the apex curls should be added only in the owner's post-DNS check.

SHOULD-CONSIDER:
- `maplibre-gl.css` move to the globe component: fine, but it's game code; keep it in the build's Scope "In" list explicitly or drop it (the brief's Out says "game rules and UI except LegalPage").
- Section 4 "{N} real animals" from content files vs the DB the game serves: they can diverge until `npm run content -- build` runs. Note it as a known drift source; counting from content is still the right call.
- `shots.ts` recording "animal ids visible" per shot is manual bookkeeping; acceptable, but say the build verifies it once by eye, otherwise credits silently go stale when a shot is retaken.
- Caddy: the apex block will log ACME failures until DNS moves; mention `docker logs caddy` noise is expected in the owner's steps so they don't roll back on it.
- Questions 3/4/6/7/8/9 have defaults; keep only 1–2 in the handoff file as planned, so the owner's phone isn't paged for defaults.

## Architecture review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. Production packaging excludes the proposed PNG assets: `.dockerignore` excludes `*.png`, so `public/site/og.png` and the optional app icon will not ship. Include these assets in the deployment contract and verify their availability from the packaged application.

SHOULD-CONSIDER:
1. Test both hostnames through Caddy, including redirects and Clerk exclusion. Direct `/home/` checks bypass the central routing boundary.
2. Make Caddy configuration application retry-safe. Detecting only changes in the latest pull can miss an unapplied configuration after a failed deployment.
3. Declare axe-core as a direct development dependency if it becomes a required verification tool.
4. Treat future class results as a separate architectural decision. A replay seed identifies a puzzle, not a class or an authorized results viewer.

## Revision notes

2026-10-28, architect. One round. Sections refer to the Architecture above.

MUST-FIX:
- **Fable 1 / Astra 1 (`.dockerignore` drops PNGs): wrong as stated, but its verification part is taken.** Docker patterns don't cross `/`, so `*.png` matches root-level files only. Proof: live `/branding/critterconnect-oauth-logo.png` returns 200 `image/png`, and it was added (404b15f8) after `.dockerignore` (47433479). `.dockerignore` stays as it is. Taken: `deploy/check.sh` requests `/site/og.png` from the packaged app on both hosts and expects 200 `image/png`. `og.png` stays a PNG, not WebP. The brief's Notes keep site PNGs under `public/site/`. (Section 7 Logos; section 8 Source, check.sh; section 10 Notes; Rejected.)
- **Fable 2 (LegalPage contrast): fixed, not excepted.** Verified at `LegalPage.tsx:13` (`[&_a]:text-color-1`, 4.03:1) and `:16` (`text-neutral-7`, 4.04:1). `LegalPage` takes the shared roles (neutral-10 underlined links, neutral-8 "Last updated", neutral-10 text), `<main>` becomes `<article>`, and Head and the ground move to `SiteLayout`. The axe exceptions are only the primary label. (Finding 3; section 3, Legal pages; section 9.)
- **Fable 3 (axe-core transitive): declared as a devDependency**, pinned to the lockfile's `4.11.0` and loaded via `createRequire().resolve`. The run image leaves it out. The brief's Scope Out allows this one exception. (Section 8 Changed; section 9; section 10 Scope; Rejected: hand-written checks.)

Other items:
- Fable MISSED, Clerk React in `_app`: stated honestly. About 80 KB gz stays and the speed budget counts it; `next/dynamic` is rejected. (Finding 2; section 9 Speed; Rejected.)
- Fable MISSED, apex curls print 000 before DNS: `check.sh` skips the apex until it resolves to the VPS, and the owner runs it after DNS moves (step 5). (Section 8.)
- Astra SC1, both hosts through Caddy: accepted. `check.sh` covers play. and the apex, the redirects, and Clerk exclusion (no `clerk.browser.js`, no `x-clerk-auth-status`). The build also runs `caddy validate`; the proposed block already passes on Caddy 2.11.7. (Section 8; section 10 DoD.)
- Astra SC2, retry-safe Caddy apply: accepted. The `cmp` of the container's file against the checkout replaces "changed in this pull". (Finding 5; section 8.)
- Astra SC3, axe as a devDependency: accepted (Fable 3).
- Astra SC4, class results need their own design: accepted. The coming-soon row and question 2b say a seed is not a class or a viewer. (Section 5; section 11.)
- Fable SC, maplibre CSS is game code: kept, listed in Scope In; Next documents importing a third-party component's CSS in the component. (Finding 2; section 10.)
- Fable SC, content-vs-DB count drift: noted in the claims table. (Section 4.)
- Fable SC, `shots.ts` animal ids: copied from the run's `report.json` and checked by eye on retake. (Section 7.)
- Fable SC, ACME log noise: added to owner step 2. (Section 8.)
- Fable SC, only blocking questions in the handoff: already the design (section 11 heading); no change.

## Revision notes (owner answers, H2)

2026-10-28, architect. Redesigned for (b) and folded in answers 2–9. There's no new review round (Decisions). The review points accepted earlier carry over where they still apply: PNGs under `src/site/` ship, check.sh covers both hosts, the Caddy apply is retry-safe, and axe-core and now esbuild are declared devDependencies.

By section:
- **Findings:**
  - 1: the legal pages move into the static site, whose CSS overrides the lock.
  - 2: retired (a static site has no Clerk).
  - 3: light `--button-primary-background: #008663` (4.58:1), while dark keeps `#00906c`.
  - 4: `--space-xxxl: 64px`, used as `py-xxl md:py-xxxl`.
  - 5: the Caddyfile and the site are baked into a caddy image, and `cmp` is dropped.
  - 6: the old site had only `/`.
  - 7: the operator, `README.md:3` and the paper note.
  - 9: the owner's pick.
  - 10, new: esbuild is undeclared.
- **1:** the round length added to what a teacher decides on.
- **2:** sources in `src/site/`; `play.` serves `/teachers/`, `/privacy/` and `/terms/`; a 404 page; root-relative links.
- **3:**
  - `Layout` renders the whole document (no `next/head`), with `Wordmark` shared with `GlobeScreen`.
  - A section-spacing row, and screenshots as plain `<img>`/`<picture>`.
  - The operator in the footer, and the round length and "maps onto" in the copy.
  - The legal pages moved, with the operator sentence in the terms.
- **4:** claims for the round length and the operator; never-claims updated ("aligned to", legal statements, coming-soon items, times).
- **5:** all three items shown and labelled; class results need their own plan, plus a privacy sentence when built (2b).
- **6:** the Taste gate runs on the served static site; the gaps were settled by the owner.
- **7:** shots committed as WebP in `src/site/shots/`, `og.png` at `src/site/og.png`, credits read in `render.tsx`, no app icon.
- **8:** rewritten for (b):
  - the build approach against two alternatives, with three proofs;
  - the source and build steps;
  - the Docker `deps`/`site`/`caddy` stages and compose;
  - the Caddy blocks, validated and behaviour-tested locally;
  - `deploy.sh` calling `check.sh`, and `check.sh` covering both hosts;
  - the owner's steps, ending with deleting the Vercel project a week after DNS moves.
- **9:** `e2e-site.mjs` on `cdp.mjs`; axe expects 0 violations, light and dark; a 300 KB budget with no framework JS and no third-party requests; the Host-header curl dropped.
- **10:** the brief's Goal, Scope, Definition of done and Notes for (b), including a CI caddy image step; the README row.
- **11:** answered; four non-blocking defaults.
- **Judgement calls and Rejected:** (a) rejected with "the owner chose (b)"; items that only applied to (a) dropped; the (b) variants not picked added.

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

Owner's answers to questions 1–9 (handoff H2, 2026-10-28; picked up 2026-10-28):
1. **Hosting: (b) separate static build**, owner's choice over the plan's (a). Own small static build in phaser-june, served by Hetzner Caddy for critterconnect.org + www. Uses repo's cc theme files directly at build time (import/copy from same source, never a hand-kept copy); same for header/footer as far as static allows. No Clerk on the site. (a) moves to Rejected with "owner chose (b)" as reason.
2. **Coming soon:** show teacher guide, standards map ("maps onto", never "aligned to"), class results by class link (no names), each labelled "not available yet". No rosters, no student accounts. (b) yes: privacy page gets one sentence when class results are built. (c) owner deletes Vercel project one week after DNS move; in deploy steps.
3. **Contrast:** build darkens green for primary button label only, to pass AA 4.5:1. Owner-approved exception to "theme is binding"; record exact value + ratio.
4. **Spacing:** build adds one larger section-spacing step to the theme in the repo, owner-approved exception ("just add it as an exception. do not overcomplicate."). h1 stays cc `xxl` 48px + large real screenshot; no motion (`--allow still-page`).
5. **Operator:** Haunted Pavement LLC, named in footer and terms where "we" is used.
6. **Legal** (Clerk script, photo credits, COPPA/FERPA): noted; site makes none of these claims, no legal statements added.
7. **Round length:** about 5–10 minutes (owner playtests); site may say so.
8. **Brand:** light-mode screenshots; served light wordmark `#000`/`#6FA8BC`.
9. **Stale docs:** build fixes `README.md:3` and adds a dated note to paper §5.3 item 11 (rounds now saved with `session_seed`).
- No second architecture review round for the (b) redesign: the owner made the decision and asked to keep it simple; the reviews' accepted points carry over where they still apply.

## Log

- 05:12 UTC: Baseline. typecheck, lint pass; unit 47/47; e2e 523/574 on VPS (pre-existing timing failure, see Baseline).
- 05:36 UTC: Architecture. architect wrote findings (9) + target design: option (a) Next app w/ host rewrite, site = `/`, `/teachers/`, `/privacy`, `/terms` in SiteLayout; 9 owner questions (1, 2 block). Research in artifacts folder. typecheck, lint pass.
- 05:41 UTC: Fable review. APPROVE_WITH_CHANGES, 3 MUST-FIX (.dockerignore drops og.png; LegalPage contrast vs axe gate; axe-core undeclared dep). Plan-only change.
- 05:43 UTC: Astra review. APPROVE_WITH_CHANGES, 1 MUST-FIX (.dockerignore drops PNGs, same as Fable #1); 4 SHOULD-CONSIDER. Plan-only change.
- 05:48 UTC: Revision. architect resolved MUST-FIX: .dockerignore `*.png` root-only (live /branding png 200), kept + check.sh verifies og.png on both hosts; LegalPage takes shared link/text roles; axe-core declared devDep 4.11.0. SC items accepted (check.sh both hosts, retry-safe Caddy apply, Clerk bundle stated). Plan-only change.
- 06:15 UTC: Owner answers (H2) picked up into Decisions, H2 closed. architect redesigned for (b): `src/site/` React pages rendered to static HTML by `scripts/site.mjs` (esbuild+postcss+Tailwind, CSS imports globals.css), served by a Caddy image built with the Caddyfile + site; primary button bg `#008663` (4.58:1, light only); `--space-xxxl: 64px`; no new blocking questions. typecheck, lint pass.

## Summary
