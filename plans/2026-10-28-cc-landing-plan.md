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
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

2026-10-28, worktree at `ddc609a3` (origin/main `acffc179`), Node 24.21.
- Install: `node_modules` present, `npm ls` clean. Migrate: n/a (no migration history; DB is the shared dev copy and this mission never writes to it).
- `npm run typecheck`: pass. `npm run lint`: pass (exit 0). `npm test`: 47/47 pass.
- `npm run e2e` (dev server on :3100, Playwright Chromium 1208 via a `--no-sandbox` wrapper in /tmp since Ubuntu 24.04's AppArmor blocks Chrome's sandbox; `/usr/bin/google-chrome` doesn't exist here): **523/574, run twice, same result**. Not caused by this mission (no code changed). First failure is the time-based "holding an answer cell" check (`scripts/e2e.mjs` ~l.315, 1150 ms hold, `during:false`); after it, the field guide's photo (`AnimalSheets.tsx:178`) covers the board, so every move is refused (`nothing on screen covers the board` x45) and round 1 never ends ("Timed out waiting for the Camera row landing"). Likely slow 2-CPU ARM + swiftshader in dev mode; owner's WSL run on the same commit reports 738/738. Artifact: `/srv/critter-ai/agent-state/missions/cc-landing-plan/baseline-e2e/` (report.json, screenshots, e2e.log). Reproduce: `npx next dev -p 3100` then `E2E_BASE_URL=http://localhost:3100 CHROME_PATH=<chrome --no-sandbox wrapper> npm run e2e`.
- For this mission (plans only), the bar is typecheck + lint; the globe and board render correctly for screenshots (see `02a-picked.png`).

## Architecture

Written 2026-10-28 by the architect. It settles what `plans/051-landing-page.md` and `plans/051-build-brief.md` will say. Research is in `/srv/critter-ai/agent-state/missions/cc-landing-plan/`: `skills/` (both SKILL.md copies, Taste's references and inspector source, `SOURCES.txt` with commits), `research/old-site/` (old HTML and headers), `research/live-play/` (live `/privacy/` HTML, the scroll check script, and a screenshot), `research/comparables/` (raw HTML only; the comparables study is still a Step).

### Findings (ranked by impact)

1. **`/privacy` and `/terms` can't be scrolled.** `src/styles/globals.css:371-376` sets `html, body, #__next { height: 100%; overflow: hidden }` for the full-screen game. `LegalPage` (`src/components/LegalPage.tsx:9`) has no scroll container of its own. Checked on live `play.critterconnect.org/privacy/` at 390×844 (`research/live-play/scrollcheck.mjs`): the content ends at 1516px, the document is only 844px tall, and both a wheel and a touch swipe leave `scrollY` at 0. On a phone, readers never reach "Players under 13", "Deleting your data" or "Changes". This is a bug, and the site will send teachers to that page. Taste's inspector also measures window scroll (`inspect.mjs:140`), so it would see a single screen. **Fix (build):** document pages opt out of the lock. They share one layout (`SiteLayout`) whose root carries `data-doc-page`. One globals.css rule, `html:has([data-doc-page])` (plus its `body` and `#__next`), sets `height: auto; overflow: visible`. `LegalPage` renders inside `SiteLayout`. The game's screens are untouched.
2. **Every page loads Clerk, even pages with no sign-in.** `ClerkProvider` wraps every page (`src/pages/_app.tsx:11`), and Clerk middleware runs on every route (`src/proxy.ts:8`). Live `/privacy/` loads about 200 KB gz of first-party JS and CSS, about 80 KB of which is Clerk React. On top of that it loads `clerk.browser.js` (84 KB gz) and `ui.browser.js` (46 KB gz) from `clerk.critterconnect.org`. That breaks separation of concerns, and it would cost the site's speed target. The privacy page also doesn't say that signed-out visitors load Clerk (owner question 6). **Fix:** site pages declare a static `site` flag. `_app` renders them without `ClerkProvider`; site code uses no Clerk hooks. The `proxy.ts` matcher gains `missing: [{ type: 'host', value: 'critterconnect\\.org' }]`, which Next 16 supports (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`, "has/missing"). Minor, same area: `_app.tsx:1` imports `maplibre-gl.css` for every page (about 10 KB gz). Move it to the globe component.
3. **cc's light-mode accent fails WCAG AA contrast.** These are theme values. `#ffffff` on `color-1 #00906c` (the `.btn-primary` label) is 4.03:1. `color-1` as text on white is 4.03:1. `--cte-text-muted #837e72` on white is 4.04:1. The globe's "coming soon" chip (`src/components/globe/PlaceList.tsx:34`, neutral-7 on neutral-3, 12px) is 3.68:1. AA needs 4.5:1 for text this size. Dark mode passes (4.67:1). Per GUI.md this is a gap, not something to patch, so it goes to the owner (question 3). The site avoids it where existing tokens allow: links in neutral-10 with an underline, secondary text in neutral-8 (7.5:1), and no "coming soon" chip. The primary button label is the one exception left.
4. **Taste v2 fails a cc page on rules the brief and GUI.md settle.** The current skill is `skills/taste-skill/SKILL.md`, named `design-taste-frontend`, v2.1.5, commit `12af471f62`. The brief's "design-taste-frontend" is the skill's name, not its folder. The inspector **fails** a page with fewer than 8 moving elements (`still-page`, `inspect.mjs:231-234`), but the brief says Taste adds no motion. Taste's laws also want display type around 8vw and section gaps of 120–240px, while cc tops out at text `xxl` 48px and space `xxl` 48px. Its `draw.mjs` is the art-direction step (directions, type, palette, motion, scenes); even with `--keep palette,type` it still deals type sizes, motion and scenes, so the build skips it. **Fix:** the build passes `--allow still-page` only. A large real screenshot satisfies `focal-point` (a picture holding at least 30% of the first screen, `rules.mjs:131`). The spacing and size gaps go to the owner (question 4). The elaya path is as the brief says (`skills/landing-page-design/SKILL.md`, last changed `a2735a3eaf`, 2026-10-26, which credits Taste).
5. **`deploy.sh` never applies Caddyfile edits.** The Caddyfile is a single-file bind mount (`deploy/docker-compose.app.yml:33`). `git pull` gives it a new inode, the running container keeps the old one, and `compose up -d` (`deploy/deploy.sh:33`) doesn't recreate an unchanged `caddy` service. So the site block would ship but never be applied. **Fix:** when `deploy/Caddyfile` changed in the pull, `deploy.sh` runs `$compose up -d --force-recreate --no-deps caddy`. It also curls the site routes.
6. **The old site is a stale Vercel build of this app.** `critterconnect.org` returns 307 to `www`. Its title is "Critter Connect" and its description is "Explore biodiversity through map-based expeditions." It loads a Clerk **development** instance (`pk_test`, `clean-lynx-72.clerk.accounts.dev`) in public. DNS is at Namecheap (`dns1/2.registrar-servers.com`): apex A `216.198.79.1` (Vercel, TTL 1799 s), `www` CNAME `5ed334e8d7ea0cd8.vercel-dns-017.com`, `play` A `178.156.159.183`. MX (Namecheap email forwarding, which carries `privacy@`), the SPF TXT and the `clerk` CNAME must stay untouched. `pk_live` decodes to `clerk.critterconnect.org`, so the production Clerk instance's root is `critterconnect.org`. Clerk needs nothing new for the site.
7. **Stale or missing facts the copy must not repeat.** `docs/ANIMAL_BOARD_PAPER.md:241` (§5.3 item 11) says "Rounds are not saved in this build". In fact every finished round is saved with its `session_seed` (`db/schema.sql`, `clue_match_solves`; `docs/CLUE_MATCH.md`; `privacy.tsx`). `README.md:3` still says "12 look-alikes" and "charges". `terms.tsx` names no operator: it only says "we" and `privacy@critterconnect.org`. Owner questions 5 and 9.
8. **Screenshot sources have traps.** Dev-mode shots show Next's dev-tools badge (the "N" bottom-left in `baseline-e2e/01-globe.png` and `02a-picked.png`). `window.__cc` exists only in dev (`src/game/debugBridge.ts:51`). On the VPS, e2e never finishes round 1 (Baseline: 523/574), so it doesn't produce the round-end card or journal shots. The design below works around both.
9. **Two logo mismatches.** The game's served wordmarks (`public/branding/critterconnect-logo{,-light}.svg`) have the same paths as `docs/brand/logo/full-color{,-dark}.svg` with a tight viewBox. But the light one is recoloured `#000`/`#6FA8BC`, where the master uses `#121f19`/`#47788a` (commit 24e5d64a, "light-mode wordmark"). The site uses the served pair so it matches the game. Owner question 8.

Fine as is: the cc tokens and `.btn` recipe in `globals.css`, `scripts/check-theme.mjs` (which covers `src/pages` and `src/components`), the `trailingSlash` and redirect config in `next.config.mjs`, and the HSTS and nosniff headers.

### Target design

#### 1. Audiences and their jobs

| Audience | Arrives from | Job on the site | Decides on | Main action |
|---|---|---|---|---|
| Student (grades 6–12) | a teacher's link, search, word of mouth | Learn what the game is and why it's fun, then start | the first screen: one picture of the real board, one sentence, one button | **Play**: `https://play.critterconnect.org/` (the globe; picking a continent is the game's own first step) |
| Teacher or educator | search, the old domain, a colleague | Decide "I'll try this with my class" | what students do in a round, what they practice and how honest the claims are, student privacy, cost and setup, what's missing | **Play a round yourself**, then **Make a class link** (`/explore/?seed=N`) |

Routing on the front page: the hero has one primary button, Play, for students and for teachers who want to try it. "For teachers" sits in the header on every width (never a second hero button, per elaya's A4) and again as a mid-page band. Nothing on the site needs an account.

#### 2. Site map

| Route (apex) | Source | Audience | Job | Main action | Why it earns its place |
|---|---|---|---|---|---|
| `/` | `src/pages/home.tsx`, rewritten from `/` on host `critterconnect.org` | both | Say what it is in one screen; route students to play and teachers to `/teachers/` | Play | the front door |
| `/teachers/` | `src/pages/teachers.tsx` | teachers | Give a teacher everything needed to decide: the round in specifics, skills, class use, privacy, sources and limits, coming soon, FAQ | Play a round yourself (plus the class link) | teacher content would bury the student path on `/` |
| `/privacy/`, `/terms/` | existing, now inside `SiteLayout` | both | the legal text, now scrollable | none | required, already exist |

No separate student page (the front page is the student page), no "how it works" page (a section on `/`), and no "sources" page (a section on `/teachers/`): none of them would have an action of its own. All four routes also resolve on `play.` and carry an apex canonical. Links between site pages are plain `<a>`, not client-side routing, so nothing depends on Next resolving the host rewrite in the browser.

#### 3. Page sections

**Shared roles (every page, both colour modes; the build checks light and dark):**

| Element | cc role |
|---|---|
| Page ground | `neutral-1` (cte-canvas). Section bands step to `neutral-3` (cte-surface-muted); the footer is `neutral-2`. Tone steps instead of lines or shadows: cc and Taste agree here. |
| h1 | `font-brand`, heavy, size `xl` below 48rem and `xxl` from 48rem; at most about 32 characters so it stays on two lines at 390px |
| h2, h3 | `font-brand` heavy, `l`; h3 `m` |
| Running text | `font-ui` regular `m` (16/24) in `neutral-10`; secondary text in `neutral-8`. Never cte-text-muted (finding 3). |
| Small text | `s` (14/20) for footer, credits and the line under the button. Nothing at `xs`/`xxs` (Taste fails text under 13px). |
| Actions | `.btn .btn-primary` (one per section at most), `.btn-secondary`; no `.btn-outline` (Taste counts 1px boxes) |
| Links | `neutral-10` with an underline |
| Screenshots | `next/image` with static imports (hashed, immutable cache, known size, so no layout shift); radius `m`; the hero gets `priority` |
| Fonts | Nunito only. Open Runde only for tabular numerals, if any. Patrick Hand is not used (it is the cards' handwriting). |
| Motion | none added; cc's control transitions only |
| Not used | no colour-1 or colour-4 fields (the foreground gap in finding 3, and no `on-color-4` role in dark mode), no emoji in markup, no eyebrows or pills above headings, no numbering like 01/02 (use `<ol>`) |

`SiteLayout` (`src/components/site/SiteLayout.tsx`) provides:
- a skip link and `<header>`: the wordmark (the light/dark pair, as in `GlobeScreen.tsx:55-58`) linking to `/`, the "For teachers" link, and a primary "Play" button. All three fit in one row at 390px, so there is no menu.
- `<main>` and `<footer>`: For teachers, Privacy, Terms, Play, `CONTACT_EMAIL` (reused from `LegalPage`), and the photo credits for the screenshots on that page.
- `<Head>`: title, description, canonical, og and twitter tags, from props.

**Front page `/`** (elaya layout A, classic hero plus sections):

| # | Section | Job | Copy outline: headline · key line · action | Picture |
|---|---|---|---|---|
| 1 | Hero (canvas) | what it is, start playing | "Find the animal the camera saw" · "A free game about real animals for grades 6–12. Match gems to answer yes-or-no questions, then rule out the look-alikes until one is left." · **Start playing** · small: "Free. No account, no ads." | `hero-board` (1440) or `board-phone` (390), at least 1/3 of the first screen on desktop |
| 2 | How a round works (band) | show the loop in 3 real steps (`<ol>`) | "Pick a continent" · "Match gems to fill four questions" (20 gems each, 30 moves) · "Rule out the look-alikes" (compare with each animal's field guide; rule out the wrong one and it escapes) | `globe`, `board-phone`, `field-guide` |
| 3 | Keep what you find (canvas) | why it's fun to keep playing | "Every find goes in your journal" · finds glow on the globe; trails of 5 rounds with 3 hearts | `globe-found`, `journal` |
| 4 | Real animals (band) | proof without invented proof | "{N} real animals, every fact sourced" (N from content at build) · IUCN Red List, Animal Diversity Web and other ranked sources; photos from Wikimedia Commons, credited on every card | `round-end` |
| 5 | For teachers (canvas) | route teachers | "Teaching grades 6–12?" · what students practice in one line, plus "No student accounts." · **See how a class uses it** (secondary) → `/teachers/` | none (text and button, two columns at desktop) |
| 6 | Final call (band) | same as the top | "Ready? Pick a continent." · **Start playing** | none |

**Teachers `/teachers/`** (elaya layout B, long-form, to educate and answer doubts):

| # | Section | Job | Copy outline | Picture |
|---|---|---|---|---|
| 1 | Hero | what it is for a class | "A deduction game for life science" · "Students compare five look-alike animals, read real field data and rule out the ones the evidence excludes. Free, in a browser, no student accounts." · **Play a round yourself** | `grid-marked` |
| 2 | What students do in a round | specifics, not "engagement" | 5 animals, one the camera saw; 30 moves; 4 yes/no questions filled by 20 gems each; scouting an animal's own answers by clearing next to its card; comparing with field guides; ruling out and releasing; a wrong rule-out lets the animal escape and costs a heart; a trail is 5 rounds with 3 hearts; the round-end card shows the full record, family tree, range map and sources | `field-guide` |
| 3 | What they practice | the §5.1 skills, honestly | 6 lines condensed from §5.1; the NGSS sentence (SEPs: analyzing and interpreting data, argument from evidence; ideas like MS-LS4-2); then, near verbatim, "The game does not claim to teach these on its own; it gives repeated, low-stakes practice with real data." Plus: so far tested with simulated players, not yet in a classroom study (§6) | `witness-note` |
| 4 | Using it with a class | how a class uses it | the four ideas in §5.5 (think aloud in pairs, debrief losses, a shared seed, extend from the journal); sound starts off. **The live thing:** a `ClassLink` that makes `https://play.critterconnect.org/explore/?seed=<random 1…4294967295>` with a Copy button (cc text field read-only, `.btn-secondary`, a live region saying "Copied"). Without JS it shows a fixed example link. "Everyone who opens it starts with the same animals." | `round-end` |
| 5 | Student privacy | the privacy answer, from `privacy.tsx` | plays fully without an account; no name or email asked; the journal stays in the browser; finished rounds are saved with no link to the player; no ads, tracking cookies or analytics; under 13, ask a parent before signing in; photos load from Wikimedia Commons; → `/privacy/`. No COPPA or FERPA claims. | none (two columns: without sign-in, with sign-in) |
| 6 | Where the facts come from, and their limits | trust through honesty | source tiers (`db/content/sources.json`); every source is shown on the round-end card; limits from §5.3: traits are simplified into categories (#4), "no record" doesn't mean "no" (#5), pictures simplify (#3), teachers can't see students' reasoning yet (#11, current form) | `journal` |
| 7 | Coming later for teachers (not available yet) | coming soon, labelled | each item starts "Not available yet:" (section 5 below) | none |
| 8 | Questions teachers ask | FAQ, visible plain Q&A (good for answer engines) | Is it free? Do students need accounts? What grades? What devices? Can the whole class get the same animals? Can I see my students' results? Is the information accurate? Does it work offline? (No.) | none |
| 9 | Final call | | "Try a round, then share a class link" · **Play a round yourself** | none |

Legal pages: `LegalPage` inside `SiteLayout`. The text is unchanged. "← Back to the globe" is dropped, because the header's logo and Play button cover it on both hosts.

#### 4. Claims and evidence

| Claim | Where it's true |
|---|---|
| Free; plays without an account; no ads, tracking cookies or analytics | `src/pages/terms.tsx` "The game"; `privacy.tsx` intro, "What we don't do" |
| For grades 6–12 | `README.md:3`; paper Abstract |
| Five look-alikes, one is the one the camera saw; 30 moves; 4 questions × 20 gems; trail of 5 rounds with 3 hearts | `CONTEXT.md` (Suspect, Mystery animal, Question, Trail); `ANIMAL_RULES` in `src/clueGame/animalBoard.ts:56` |
| Answers never rule anyone out by themselves; the player compares and rules out; a wrong rule-out lets it escape | `CONTEXT.md` (Answer, Rule out, Escape); paper Abstract |
| Matching without reasoning finds nothing; careful play finds over 90% (simulated players) | paper Abstract and §6; `plans/047-wander.md`; the paper header for 047-1 (careful 96/92%) |
| Finds glow on the globe and go in the Field Journal; the round-end card has the family tree, range map and sources | `README.md`; `docs/CLUE_MATCH.md` (Globe); paper §5.2 #5 |
| {N} animals ({mammals}/{amphibians}/{reptiles}), today 76 (50/15/11) | `db/content/animals/*.json`, counted at build |
| Facts from the IUCN Red List (all 76), Animal Diversity Web (65) and others in ranked tiers | `db/content/sources.json`; each profile's `sources` |
| Photos from Wikimedia Commons, credited; maps use IUCN and other credited sources | `terms.tsx` "Photos and content"; profile `photo` fields |
| The skills practised; the NGSS mapping; "does not claim to teach these on its own" | paper §5.1 |
| Classroom ideas | paper §5.5 |
| One link gives the class the same animals and boards | `docs/CLUE_MATCH.md` ("`?seed=N` replays a session exactly"); the build checks it (two fresh loads, same round-1 animals) |
| Privacy facts | `privacy.tsx` sections |
| Sound starts off; the board can be played with a keyboard | `docs/CLUE_MATCH.md` ("Once a run", "How it fits together") |
| Runs in a browser, nothing to install, phones and computers | the game is a web app; `globals.css` desktop rules at 48rem; the build shows it at 1440 |

**The site never claims:** that it teaches on its own or raises scores; learning gains (no human study, §6); being "aligned to standards" (it "maps onto" practices, per §5.1); COPPA or FERPA compliance (that's legal and the owner's call); dashboards, rosters or class views; offline play; a round length (unless the owner gives one, question 7); users, schools, quotes, logos or testimonials (none exist); that the photos are its own; "mystery"; "12 look-alikes" or "charges"; that "rounds are not saved".

**Copy rules:** players read "the one the camera saw", never "mystery". Student lines are short and plain, with outdoor and tech words and no academic, violent or medical words. Teacher lines name what students do. Headlines are 32 characters or fewer, followed by one supporting sentence. Buttons are a verb plus what you get (never "Learn more"). No invented numbers: counts come from the content files at build time.

#### 5. Coming soon

| Candidate | What it would take | Student privacy, against `privacy.tsx` | Show? |
|---|---|---|---|
| Teacher guide (printable: a round walkthrough, §5.5 activities, a worksheet for debriefing an escape) | writing only | none | **Yes** |
| Standards map (NGSS practices and ideas per activity) | writing plus an expert's review; wording must stay "maps onto" | none | **Yes** |
| Class results from a class link: per animal, how many rounds were found or escaped, with no names | a read-only view over `clue_match_solves` by `session_seed`, which is already stored; large random seeds so classes don't collide | no new personal data, but rounds get a new use (now "to see which puzzles are too easy"), so the privacy page needs a sentence; flag for the owner | **Yes, labelled**, if the owner agrees |
| Class codes and rosters | teacher accounts, a class table, student join codes or nicknames, Clerk organisations or our own | links play to identifiable students under 13: contradicts "We don't ask for your name or email"; COPPA, FERPA and district agreements | **No** |
| Seeing each student's reasoning (§5.3 #11, §5.4) | rosters plus recording marks with the evidence at the time | same as rosters, and more data per student | **No** |

Each item shown is a list row that starts with "Not available yet:", under a heading that says the same.

#### 6. How the skills and the cc theme fit

- **Binding:** GUI.md, `gui/foundations.md`, `gui/interface-judgment.md` and the cc tokens in `globals.css`, applied with **graphical-ui** while building. The build finishes with a **graphical-audit** change review of the diff, which reports drift and gaps. `npm run lint` runs `check-theme.mjs`.
- **What Taste does:**
  - Used: step 1 (inventory), step 2 (the argument: claims become sections, as in the tables above), step 4 (the idea, composition only), step 5 (the copy deck rules in `references/copy.md`), and steps 6.2–6.9 (the hero, sections, imagery, fullness, frame and semantics, mapped onto cc roles).
  - The gate: `lint.mjs` on the site files, and `inspect.mjs` on the **production build** at 1440, 768 and 390, run on `/home/` and `/teachers/` with `--allow still-page`. Then step 8 (look, plus the critique in `references/critique.md`, three rounds at most) and step 10 (the report).
  - Skipped: step 3 (`draw.mjs`, the art direction), 6.1 (tokens: cc's), `assets.mjs` (found pictures: the game's own screenshots exist), scroll scenes, step 9 (the motion layer) and `base.css`.
  - The idea: "the real round is the page's material". Every section shows the actual screen it describes, cropped large; nothing is drawn or stock.
  - The live thing: the class link maker.
  - Legal pages are not put through Taste.
- **elaya Part A taken:**
  - A1, the intake, answered per audience in 051.
  - A2: above the fold, items 1–3 and 5. Item 4's "proof signal" becomes a true fact line (free, no account, real animals), not logos. Mid page, the three steps of how it works. At the bottom, a FAQ (8 Q&A on `/teachers/`) and a final call like the top. Social proof is skipped because none exists.
  - A3: layout A for `/`, B for `/teachers/`. A4: one primary action, specific, proof beside the claim, objections as a section. A5: headline and button formulas. A6: section-by-section build order. A7: index both pages, title and meta, internal links, FAQ as plain Q&A. A8: pitfalls as a checklist.
  - Part B (fonts, scales, radii, motion, nav, the B11 tagline reveal) is not used.
- **Theme gaps (owner questions; no values invented):** primary label contrast (3), no display size above `xxl` 48px, and no section-scale spacing above `xxl` 48px (4).
- **Taste's inputs (what only Critter Connect has), for 051:** the camera trap and "the one the camera saw"; polaroid cards on red pins with handwritten numbers; five look-alikes from real families (okapi and hirola, aardvark and pangolin); the evidence grid with its "Camera saw" row; gems with faces; witness notes with blanked words; ruled-out animals wandering toward the edge their way; the globe that glows with your finds; the Field Journal; the family tree, the IUCN range map and the sources on the round-end card; 76 animals with sourced facts.
- **elaya's intake answers:**
  - Purpose: play / try a round and make a class link.
  - Objections:
    - students: is it fun, do I need an account, does it work on my device;
    - teachers: what do they do, what do they learn, student data, cost and setup, accuracy, can I see results.
  - Proof: real screenshots, counts and sources. There are no testimonials, and none will be invented.
  - Constraints: the cc theme, plain voice, phone first for students, desktop for teachers.
  - Traffic sources: the owner's. There are no analytics, by policy.

#### 7. Assets

| Name | Screen | Size | How the build takes it | Used on |
|---|---|---|---|---|
| `hero-board` | `/explore/?seed=S&place=continent:africa`, round start, light mode | 1440×900 | production build (`npm run build && npx next start -p 3100`), headless Chrome screenshot (no `__cc` needed) | `/` hero; `og.png` crop 1200×630 |
| `board-phone`, `globe` | round start; the globe with its continent list | 390×844 @2x | production build, headless | `/` |
| `field-guide`, `grid-marked`, `witness-note`, `round-end`, `journal`, `globe-found` | a guide open; answers plus a rule-out; a note; the round-end card; the journal; finds glowing | 390×844 @2x | `npm run e2e` on dev :3100 with `E2E_SEED`/`E2E_PLACE`, after two small `scripts/e2e.mjs` edits: `screenshot()` removes `nextjs-portal` first, and a `02d-field-guide.png` shot while the guide is open (~l.345). If the VPS run stops before the round ends (Baseline), finish the seeded round in the dev browser with `window.__cc` (the playtest skill) and the same badge removal. | `/`, `/teachers/` |
| `old-site` | critterconnect.org before the switch | 390, 1440 | **this mission**, headless Chrome | plan folder only |

- **Shot list:** `src/components/site/shots.ts` records each shot's file, alt text, seed, place and the animal ids visible. The build stores the shots in `src/components/site/shots/`, as WebP converted with the `sharp` already installed.
- **Plan folder** (`plans/051-landing-page/`, this mission, at most 5 images): `old-site-390.png` and `old-site-1440.png`, plus `globe.png`, `board-phone.png` and `board-1440.png` taken from the **live** play site (production, so no dev badge and no DB writes). They illustrate the plan; the build retakes all of them from the game as it is then.
- **Logos:** the served `public/branding/critterconnect-logo{,-light}.svg` and `public/favicon.svg`. `docs/brand/logo/app-icon-512.png` is copied to public only if an icon is needed.
- **Photo credits:** Commons photos keep their own licences (today 24 CC BY-SA 4.0, 18 CC BY-SA 3.0, 9 CC BY 2.0, 8 public domain, and others; 2 animals have none). `getStaticProps` reads the visible animals' `photo.credit/license/page` from the content and prints one line per photo in the page footer. To read the content, it uses `readProfiles`, moved from `scripts/content.ts:23` to `src/lib/contentProfiles.ts` so both share it. Where seeds allow, prefer shots whose animals are CC0, public domain or CC BY. Whether BY-SA photos inside screenshots are fine is the owner's question (6).

#### 8. Hosting and shipping

| | (a) Pages in the game's Next app | (b) Separate static build importing `globals.css` and the fonts |
|---|---|---|
| Theme drift | none: same tokens, `.btn`, theme script, fonts, `LegalPage` | none for tokens, but the header and footer are hand-copied across HTML files, or a templating tool is added |
| Tooling and deploy | none new; the same `npm run deploy` | a second build (Tailwind CLI plus templating), a build stage or a host build, a Caddy `file_server` with a volume, a second deploy path |
| Legal pages | shared | link to `play.` or duplicate |
| Host routing | a `next.config.mjs` `rewrites.beforeFiles` rule: `/` with `has: [{ type: 'host', value: 'critterconnect\\.org' }]` goes to `/home` (Next strips the port when matching hosts); Caddy redirects game paths; canonicals | natural |
| Clerk | opted out on site pages (finding 2) | none |
| Speed | prerendered HTML; about 200 KB gz of shared JS remains (React and Clerk React in `_app`) | about 0 JS |
| Scroll lock | fix needed (finding 1) | an override needed too |
| Coupling | the site ships with the game | independent, but the same repo |

**Recommendation: (a).** One app, one deploy, and reuse instead of copies. With Clerk opted out, the JS that remains is fine for prerendered pages. This is owner question 1.

- **Source:** in phaser-june. New: `src/pages/home.tsx`, `src/pages/teachers.tsx`, `src/components/site/{SiteLayout,ClassLink,Credits}.tsx`, `shots.ts`, `shots/`, `src/lib/contentProfiles.ts`, `public/robots.txt`, `public/sitemap.xml`, `public/site/og.png`. Changed: `_app.tsx` (the site flag), `proxy.ts` (`missing` host), `next.config.mjs` (the rewrite), `globals.css` (the `data-doc-page` rule only), `LegalPage.tsx`, `scripts/content.ts`, `scripts/e2e.mjs`, `deploy/Caddyfile`, `deploy/deploy.sh`, `docs/DEPLOY.md` (a site section) and the `AGENTS.md` "Where things live" line.
- **Output:** part of `next build`; `/home` and `/teachers` are listed as static.
- **Caddy, next to the game's block** (the domain is hardcoded like `deploy.sh`'s, so a missing variable can't break the game's block):
  ```
  (common) {
  	encode zstd gzip
  	header {
  		Strict-Transport-Security "max-age=31536000"
  		-Server
  	}
  }
  {$APP_DOMAIN} {
  	import common
  	reverse_proxy app:8080
  }
  critterconnect.org {
  	import common
  	@game path /explore /explore/* /login /login/* /clue-match /clue-match/* /api/*
  	redir @game https://{$APP_DOMAIN}{uri} 308
  	reverse_proxy app:8080
  }
  www.critterconnect.org {
  	redir https://critterconnect.org{uri} 308
  }
  ```
- **`deploy.sh`:** recreate caddy when the Caddyfile changed (finding 5), and add `https://play.critterconnect.org/home/`, `https://critterconnect.org/` and `/teachers/` to the curl loop.
- **Owner's steps after merging the build PR:**
  1. Optionally, a day before: lower the TTL of `@` and `www` to 300 at Namecheap.
  2. `npm run deploy` from WSL. The site serves on `play.critterconnect.org/home/` at once; Caddy's certificate request for the apex fails until DNS moves, which is harmless.
  3. Namecheap → critterconnect.org → Advanced DNS: set `@` A from `216.198.79.1` to `178.156.159.183`, and `www` CNAME to `critterconnect.org.`. Leave MX, TXT and `clerk` alone.
  4. On the VPS, `docker restart caddy` to request the certificates now.
  5. Check the apex, `www` (it should redirect to the apex) and `/explore/` (it should redirect to play).
  6. In Vercel, remove both domains from the old project. Delete the project after a one-week rollback window (its environment holds a Clerk dev key; question 2c).
  - Rollback: restore the two DNS records.
- **Old links:** `www.*` → 308 to the apex. `/` gets the new front page; `/privacy/` and `/terms/` are served; `/explore/` and `/login/` → 308 to `play.`. The title "Critter Connect" and the description "Explore biodiversity through map-based expeditions." become the new per-page titles and descriptions (section 9).

#### 9. Basics: targets and checks

- **Accessibility:**
  - Targets: WCAG 2.1 AA; one h1; landmarks and a skip link; visible focus (the existing `:focus-visible` outline); keyboard reach in reading order; alt text on every screenshot; no text under 14px.
  - Checks: a new **site stage at the start of `scripts/e2e.mjs`**, at 390×844 and 1440×900, for each of `/home/`, `/teachers/`, `/privacy/` and `/terms/`. It runs axe-core from `node_modules/axe-core/axe.min.js` (4.11, already installed through `eslint-config-next`, so nothing new to install) for tags wcag2a, wcag2aa, wcag21a and wcag21aa, expecting 0 violations except the listed cc gap (question 3).
  - The same stage also checks: the document scrolls to the footer (finding 1), there's one h1, the title, description and canonical are present, the Play links point at `play.`, there's no Clerk script, the page has no console errors, and the class link gives the same round-1 animals on two fresh loads. It saves `00-site-*.png`.
- **Speed:**
  - Targets, on the production build at 390 with 4× CPU slowdown and Slow 4G (1.6 Mbps, 150 ms): LCP ≤ 2.5 s and CLS ≤ 0.1 on `/home/` and `/teachers/`; at most 500 KB transferred on first load at 390; no requests to Clerk, Phaser or MapLibre.
  - Check: the build measures once with a short CDP script kept in its artifacts folder, with the command recorded.
- **SEO:**
  - Targets: a title and description for each page (proposed: "Critter Connect: a free animal deduction game for grades 6–12", and "Critter Connect for teachers: free, no student accounts"); a canonical `https://critterconnect.org/…`; og and twitter tags with `og.png`; `lang="en"` (already there); `robots.txt` with a `Sitemap:` line; `sitemap.xml` listing the 4 apex URLs.
  - Checks: the e2e site stage, plus `curl -H 'Host: critterconnect.org' http://127.0.0.1:3100/` on the production build, which must return the front page with its canonical.

#### 10. The two deliverables

- **`plans/051-landing-page.md` sections, in order:**
  1. Summary: the site map in 5 lines or fewer, the coming-soon items, how the skills fit cc, and the open questions.
  2. Audiences and jobs.
  3. Site map and routing.
  4. Pages: the section tables with full copy outlines.
  5. Claims and evidence, plus never-claim.
  6. Coming soon.
  7. Skill intake.
  8. Skills and the cc theme, including the inspector allow-list and the gaps.
  9. Assets.
  10. Hosting and shipping, with the options table.
  11. Basics.
  12. Questions for the owner.
  - Each section is the corresponding part of this design, written out. The images go in `plans/051-landing-page/`.
- **`plans/051-build-brief.md`**, in the form of `/srv/critter-ai/ops/templates/mission-brief.md`:
  - **Goal:** the website pages, routing, Caddy and deploy changes, screenshots, credits and checks, delivered as a PR.
  - **Why.**
  - **Scope.** In: the files in section 8. Out: game rules and UI except `LegalPage`, `gui/` and GUI.md and any theme values, new npm dependencies, Clerk settings, deploying, DNS, Vercel, and DB writes beyond e2e's normal round saves to the dev copy.
  - **Definition of done:**
    - typecheck, lint and `npm test` pass;
    - `npm run build`, with both pages static;
    - e2e: the site stage passes in full; the game checks show no new failures against the VPS baseline, and the owner confirms the full run on WSL;
    - Taste: `lint.mjs` clean, and `inspect.mjs` with 0 FAIL at 1440, 768 and 390 on the production build, every screenshot opened, and the critique written;
    - the graphical-audit report;
    - axe, the speed numbers and the Host-header curl;
    - artifacts in `/srv/critter-ai/agent-state/missions/<build-slug>/`;
    - a PR linked to the 051 issue; it never merges or deploys;
    - a Summary with the owner's steps from section 8.
  - **Decision rules:** GUI.md wins; Taste and elaya shape only layout and copy; a clash becomes a handoff item and the build goes on with this plan's default; claims only from 051's table; only the approved coming-soon items.
  - **Notes:**
    - the skills are installed pinned, outside the repo, in the build's artifacts folder: Taste `12af471f62` (2.4 MB) and elaya `ded7efc9d5`;
    - `CHROME_PATH` points to a `--no-sandbox` wrapper around `~/.cache/ms-playwright/chromium-1208/chrome-linux/chrome`, because AppArmor blocks Chrome's sandbox and Taste's launcher doesn't pass `--no-sandbox`;
    - `inspect.mjs --out <artifacts>/taste-inspect`;
    - a Taste run takes about 30–45 minutes and a few hundred thousand tokens per page, so the build planner splits the work into about 6 units: infrastructure, shots and credits, `/`, `/teachers/`, legal pages and the e2e site stage, then checks and the audit.
- **`plans/README.md` row:** `| 051 | Website at critterconnect.org: front page + /teachers in the cc theme, served by the game's Next app | High | M | owner: hosting option, coming-soon list | Planned 2026-10-28 (agent/cc-landing-plan): plan + build brief, PR for review |`

#### 11. Questions for the owner (questions 1 and 2 block the build and go in the handoff file; the rest have defaults)

1. **[Blocks]** Hosting: (a) pages in the game's Next app (recommended), or (b) a separate static build?
2. **[Blocks]** Coming soon: show the teacher guide, the standards map and class results by class link (no names), each labelled "not available yet", and leave out rosters and student accounts? (b) Showing class results would need one sentence added to the privacy page later; agree? (c) Delete the Vercel project after a one-week rollback window?
3. cc's light-mode accent is 4.0:1 (AA needs 4.5:1) on the primary button label. Will you adjust the theme on graphicalui.com, or should the build ship it as a listed exception? Default: a listed exception.
4. Taste against cc: no motion layer (`--allow still-page`); h1 stays at cc `xxl` (48px) with a large screenshot leading; section gaps use cc's largest step (48px) unless you add a larger spacing step. Default: as written.
5. Who is the operator ("we") for the footer and the terms? `terms.tsx` names none, and schools usually ask.
6. Legal, for you to decide; the site answers none of these:
   - the game loads Clerk's script for every visitor, and `privacy.tsx` doesn't mention it;
   - Commons photos (CC BY and BY-SA) appear inside screenshots; the site credits each one;
   - the site makes no COPPA or FERPA statement.
7. A typical round length from your playtests, so teachers can plan time? Default: the site gives no time.
8. Screenshots in light mode only, and the served light wordmark (`#000`/`#6FA8BC`) instead of the master (`#121f19`/`#47788a`)? Default: yes to both.
9. Should the build also fix `README.md:3` and add a note to paper §5.3 item 11 (stale)? Default: README only.

### Judgement calls

- The site is front page plus `/teachers/`. Explaining how the game works and where the facts come from are sections, not pages; each page has one job.
- Play goes to the globe, as the brief says, not straight to `/explore`: the globe is the game's front door, and finds glow there.
- The class link only makes whole-world ("Anywhere") links. Continent links would need the live places list, but the apex sends `/api` to `play.` and the Docker build has no database. Make it a follow-up if teachers ask.
- Animal counts come from the content files at build time. Continent counts come only from the database, so the copy names no number of continents.
- The FAQ is plain visible Q&A, not an accordion, for answer engines and no-JS readers.
- The skills run from a pinned copy outside the repo instead of being vendored (Taste is 2.4 MB).
- Plan screenshots come from the live play site, so the plan mission writes nothing to any database.

### Rejected alternatives

- (b) a static build: a second toolchain and deploy path, and a hand-copied header and footer, all to save JS on two pages.
- A static site with its own copy of the theme: the brief rules it out (drift).
- Front page at `critterconnect.org/welcome/`: the apex root must be the front door, and an extra redirect hurts.
- Caddy `rewrite / /home/`: Next's client doesn't know about it, so the URL it hydrates won't match the page. The `has: host` rewrite in next.config is Next's documented way.
- Host logic inside `clerkMiddleware`: imperative code where declarative config works.
- Keeping Clerk on site pages: about 130 KB gz plus Clerk API calls on pages without sign-in.
- A `/students` page: the front page already does that job in one click.
- Taste's `draw.mjs --keep palette,type`: it still deals type sizes, motion and scenes that cc doesn't have.
- `assets.mjs` found pictures or a video loop: the game's own screens are the honest pictures, and video adds weight on school networks.
- An on-page mini round as Taste's "live thing": it duplicates the game's rules when the real game is one click away.
- Reusing the globe's "coming soon" chip: it is 3.68:1 at 12px.
- Removing the global scroll lock: it would risk the game's full-screen behaviour; an opt-out is contained.
- Vendoring Taste into `.agents/skills/`: 2.4 MB for two scripts.

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

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 05:12 UTC: Baseline. typecheck, lint pass; unit 47/47; e2e 523/574 on VPS (pre-existing timing failure, see Baseline).
- 05:36 UTC: Architecture. architect wrote findings (9) + target design: option (a) Next app w/ host rewrite, site = `/`, `/teachers/`, `/privacy`, `/terms` in SiteLayout; 9 owner questions (1, 2 block). Research in artifacts folder. typecheck, lint pass.
- 05:41 UTC: Fable review. APPROVE_WITH_CHANGES, 3 MUST-FIX (.dockerignore drops og.png; LegalPage contrast vs axe gate; axe-core undeclared dep). Plan-only change.

## Summary
