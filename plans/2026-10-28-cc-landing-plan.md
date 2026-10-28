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
