# 051: Website at critterconnect.org

Status: planned. The owner reviews it as a PR; the build starts from [`051-build-brief.md`](051-build-brief.md) once the issue is relabelled `ready-for-agent`.
Written by mission [`2026-10-28-cc-landing-plan.md`](2026-10-28-cc-landing-plan.md) (findings, reviews, owner answers H2, decisions). Line refs as of origin/main `acffc179`.

critterconnect.org still serves an old Vercel build of this app ("Explore biodiversity through map-based expeditions", a game that no longer exists). This plan replaces it with a small static site for two audiences, students and teachers, built from this repo's cc theme and served by the Hetzner Caddy next to the game.

| Old site today, 390 | Old site today, 1440 |
|---|---|
| ![old site, phone](051-landing-page/old-site-390.png) | ![old site, desktop](051-landing-page/old-site-1440.png) |

## 1. Summary

Written last, once sections 7–12 are in.

## 2. Audiences and their jobs

| Audience | Arrives from | Job on the site | Decides on | Main action |
|---|---|---|---|---|
| Student (grades 6–12) | a teacher's link, search, word of mouth | learn what the game is and why it's fun, then start | the first screen: one picture of the real board, one sentence, one button | **Play**: `https://play.critterconnect.org/` (the globe; picking a continent is the game's own first step) |
| Teacher or educator | search, the old domain, a colleague | decide "I'll try this with my class" | what students do in a round, what they practice and how honest the claims are, time (about 5–10 minutes a round), student privacy, cost and setup, what's missing | **Play a round yourself**, then **make a class link** (`/explore/?seed=N`) |

- **A student starts in one click:** the hero's only primary button goes to the globe. Nothing on the site needs an account.
- **A teacher needs**, in order: what a round asks students to do (specific moves, not "engagement"), which skills that practises and what the game doesn't claim, how long it takes, what student data exists, that it's free with no setup, and what's not built yet. All of it is on `/teachers/`, one link from every page.
- **Routing on `/`:** one primary button, Play, for students and for teachers who want to try it. "For teachers" sits in the header at every width and again as a mid-page band; it's never a second hero button (elaya A4; also how PhET, Zooniverse and iCivics route).

## 3. Site map and routing

| Route (apex) | Source → file in `out/site/` | Audience | Job | Main action | Why it earns its place |
|---|---|---|---|---|---|
| `/` | `src/site/pages/Home.tsx` → `index.html` | both | say what it is in one screen; route students to play and teachers to `/teachers/` | Play | the front door |
| `/teachers/` | `src/site/pages/Teachers.tsx` → `teachers/index.html` | teachers | everything a teacher needs to decide: the round in specifics, skills, class use, privacy, sources and limits, coming later, FAQ | Play a round yourself (plus the class link) | teacher content would bury the student path on `/` |
| `/privacy/`, `/terms/` | `src/site/pages/{Privacy,Terms}.tsx`, moved from `src/pages/` → `privacy/index.html`, `terms/index.html` | both | the legal text, now scrollable (today it can't be scrolled on a phone: `globals.css:371-376`) | none | required; already exist |
| any other path | `src/site/pages/NotFound.tsx` → `404.html` | both | send a lost visitor on | Play | people type the old domain's paths by hand |

- **Not pages:** no student page (`/` is it), no "how it works" page (a section on `/`), no "sources" page (a section on `/teachers/`). None would have an action of its own.
- **Both hosts:** `play.` also serves `/teachers/`, `/privacy/` and `/terms/`, the same files (section 10). The legal URLs don't change, and `/teachers/` can be checked live before DNS moves. Every page carries its apex canonical, so the `play.` copies don't compete in search.
- **Links:** between site pages, plain root-relative `<a>` (`/teachers/`), which work on both hosts and in the local preview. On `play.` the wordmark's `/` is the game's globe, which suits that host. Play links are absolute: `https://play.critterconnect.org/`.

## 4. Pages

### Shared roles (every page, light and dark; the build checks both)

| Element | cc role |
|---|---|
| Page ground | `neutral-1` (cte-canvas). Section bands step to `neutral-3` (cte-surface-muted); footer `neutral-2`. Tone steps, not lines or shadows. |
| Section spacing | `py-xxl md:py-xxxl` per section (`xxxl` 64px is new, owner-approved, section 8); inside a section, cc's steps up to `xxl` |
| h1 | `font-brand` heavy, `xl` below 48rem, `xxl` from 48rem; ≤ 32 characters so it stays on two lines at 390 |
| h2, h3 | `font-brand` heavy, `l`; h3 `m` |
| Running text | `font-ui` regular `m` (16/24) in `neutral-10`; secondary text `neutral-8`. Never cte-text-muted (4.04:1). |
| Small text | `s` (14/20): footer, credits, the line under a button. Nothing at `xs`/`xxs`. |
| Actions | `.btn .btn-primary` (at most one per section; light fill `#008663`, section 8), `.btn-secondary`; no `.btn-outline` |
| Links | `neutral-10`, underlined |
| Screenshots | `<img>` with `width`/`height` from `shots.ts` (no layout shift), or `<picture>` for the hero's phone and desktop crops; content-hashed files under `/site/`; radius `m`; hero `fetchpriority="high"`, the rest `loading="lazy" decoding="async"` |
| Fonts | Nunito. Open Runde only for tabular numerals, if any. Patrick Hand not used (it's the cards' handwriting). |
| Motion | none added; cc's control transitions only |
| Not used | colour-1 or colour-4 fields; emoji in markup; eyebrows or pills above headings; 01/02 numbering (use `<ol>`); the globe's "coming soon" chip (3.68:1 at 12px) |

**`src/site/Layout.tsx`** renders the whole document (no `next/head`):
- `<head>`: title, description, canonical, og and twitter tags from the page list in `src/site/config.ts`; `favicon.svg`; the theme-color pair, now exported from `src/lib/theme.ts` (which `_app.tsx` imports too); the game's `THEME_SCRIPT` inline (system mode or a saved pick); the hashed stylesheet.
- A skip link and `<header>`: `Wordmark` → `/`, "For teachers", and a primary "Play" button, in one row at 390 (no menu). `Wordmark` (`src/components/Wordmark.tsx`, new, no Next imports) is the light/dark `<img>` pair moved out of `GlobeScreen.tsx:55-58`, which then uses it too.
- `<main>`.
- `<footer>`: For teachers, Privacy, Terms, Play, `CONTACT_EMAIL` (moved from `LegalPage.tsx` to `config.ts`), "Made by Haunted Pavement LLC", and the photo credits for that page's screenshots.

### Front page `/` (elaya layout A: hero plus sections)

| # | Section (ground) | Job | Headline · key line · action | Picture |
|---|---|---|---|---|
| 1 | Hero (canvas) | what it is; start playing | "Find the animal the camera saw" · "A free game about real animals for grades 6–12. Match gems to answer yes-or-no questions, then rule out the look-alikes until one is left." · **Start playing** · small: "Free. No account, no ads." | `hero-board` (desktop) / `board-phone` (phone) in one `<picture>`, ≥ 1/3 of the first screen on desktop |
| 2 | How a round works (band) | the loop in 3 real steps (`<ol>`) | "How a round works" · 1 "Pick a continent" · 2 "Match gems to answer questions" (20 gems fill a question; 30 moves a round) · 3 "Rule out the look-alikes" (check each animal's field guide; rule out the wrong one and it escapes) | `globe`, `board-phone`, `field-guide` |
| 3 | Keep what you find (canvas) | why keep playing | "Every find goes in your journal" · "Finds glow on the globe. A trail is 5 rounds and 3 hearts." | `globe-found`, `journal` |
| 4 | Real animals (band) | proof, none invented | "{N} real animals, all sourced" (N counted from content at build; 76 today) · "Facts from the IUCN Red List, Animal Diversity Web and other ranked sources. Photos from Wikimedia Commons, credited on every card." | `round-end` |
| 5 | For teachers (canvas) | route teachers | "Teaching grades 6–12?" · "Students compare look-alikes, read real field data and rule out what the evidence excludes. No student accounts. About 5–10 minutes a round." · **See how a class uses it** (secondary) → `/teachers/` | none (text and button, two columns from 48rem) |
| 6 | Final call (band) | repeat the top | "Ready? Pick a continent." · **Start playing** | none |

What the hero and steps show today (live play site, 2026-10-28, reference only; the build retakes every shot, section 9):

| `globe` (390) | `board-phone` (390, seed 1, Africa) | `board-1440` (basis for `hero-board`) |
|---|---|---|
| ![globe](051-landing-page/globe.png) | ![board, phone](051-landing-page/board-phone.png) | ![board, desktop](051-landing-page/board-1440.png) |

### Teachers `/teachers/` (elaya layout B: long-form, answer doubts)

| # | Section | Job | Headline · copy outline | Picture |
|---|---|---|---|---|
| 1 | Hero | what it is for a class | "A deduction game for science" · "Students compare five look-alike animals, read real field data and rule out the ones the evidence excludes. Free, in a browser, no student accounts; about 5–10 minutes a round." · **Play a round yourself** | `grid-marked` |
| 2 | What students do in a round | specifics, not "engagement" | "What students do in a round" · 5 animals, one the camera saw; 30 moves; 4 yes/no questions, each filled by 20 gems; scouting an animal's own answers by clearing gems next to its card; comparing with field guides; ruling out and releasing; a wrong rule-out lets the animal escape and costs a heart; a trail is 5 rounds with 3 hearts; the round-end card shows the full record, family tree, range map and sources | `field-guide` |
| 3 | What they practice | paper §5.1, honestly | "What they practice" · 6 lines condensed from §5.1 (elimination, reading a data table, precise wording like "mostly" and "no record", evidence from text, comparing close relatives, geography and taxonomy); "These map onto NGSS practices (analyzing and interpreting data, argument from evidence) and ideas like MS-LS4-2." Then near verbatim: "The game does not claim to teach these on its own; it gives repeated, low-stakes practice with real data." Plus: "So far tested with simulated players, not yet in a classroom study." | `witness-note` |
| 4 | Using it with a class | how a class uses it | "Using it with a class" · the four §5.5 ideas as four separate short items (think aloud in pairs, debrief losses, a shared seed, extend from the journal); sound starts off. **The live thing:** `ClassLink` makes `https://play.critterconnect.org/explore/?seed=<random 1…4294967295>` in the browser, with a read-only cc text field, a Copy `.btn-secondary` and a live region saying "Copied". Without JS it shows a fixed example link. "Everyone who opens it starts with the same animals." | `round-end` |
| 5 | Student privacy | the privacy page's answer | "Student privacy" · plays fully without an account; no name or email asked; the journal stays in the browser; finished rounds are saved with no link to the player; no ads, tracking cookies or analytics; under 13, ask a parent before signing in; photos load from Wikimedia Commons; → `/privacy/`. No COPPA, FERPA or other legal statements. | none (two columns: without sign-in, with sign-in) |
| 6 | Where the facts come from | trust through honesty | "Where the facts come from" · source tiers (`db/content/sources.json`); every source shown on the round-end card; limits from §5.3: traits are simplified into categories (#4), "no record" doesn't mean "no" (#5), pictures simplify (#3), teachers can't see students' reasoning yet (#11) | `journal` |
| 7 | Coming later (not available yet) | coming soon, labelled | "Coming later: not available yet" · the three rows in section 6, each starting "Not available yet:" | none |
| 8 | Questions teachers ask | FAQ as visible plain Q&A (answer engines, no-JS readers; not collapsed) | "Questions teachers ask" · Is it free? Do students need accounts? What grades? How long is a round? (About 5–10 minutes.) What devices? (Phones and computers, in a browser.) Can the whole class get the same animals? Can I see my students' results? (Not yet; see Coming later.) Is the information accurate? Does it work offline? (No.) | none |
| 9 | Final call | repeat the top | "Try a round, then share a link" · **Play a round yourself** | none |

### Legal pages

- `src/site/pages/Privacy.tsx` and `Terms.tsx` are today's `src/pages/privacy.tsx` and `terms.tsx`, moved; the old files and `src/components/LegalPage.tsx` are deleted. Nothing in the game links to them (`rg -i privacy src` finds only those three files); the URLs keep working through Caddy. Dev preview: `npm run site:serve`.
- Privacy words unchanged. Terms gain one sentence naming Haunted Pavement LLC as the operator, the "we", so their "Last updated" becomes the build's date; their `next/link` becomes `<a href="/privacy/">`.
- `LegalPage` becomes `src/site/LegalArticle.tsx` with the shared roles (h1; "Last updated" in neutral-8; text and underlined links in neutral-10, replacing `LegalPage.tsx:13` colour-1 links and `:16` neutral-7, both 4.03–4.04:1), inside an `<article>`. The layout owns `<main>`, the title and the ground. "← Back to the globe" goes: the header's wordmark and Play cover it.

### 404

`NotFound.tsx` → `404.html`: "This page isn't here" · "The game is one click away." · **Start playing**, in the shared layout.

## 5. Claims and evidence

| Claim | Where it's true |
|---|---|
| Free; plays without an account; no ads, tracking cookies or analytics | `src/pages/terms.tsx` "The game"; `src/pages/privacy.tsx` intro and "What we don't do" |
| For grades 6–12 | `README.md:3`; `docs/ANIMAL_BOARD_PAPER.md` Abstract |
| Five look-alikes, one the camera saw; 30 moves; 4 questions × 20 gems; trail of 5 rounds with 3 hearts | `CONTEXT.md` (Suspect, Mystery animal, Question, Trail); `ANIMAL_RULES` in `src/clueGame/animalBoard.ts:56` |
| About 5–10 minutes a round | the owner's playtests (H2 answer 7; `plans/2026-10-28-cc-landing-plan.md` Decisions) |
| Answers never rule anyone out by themselves; the player compares and rules out; a wrong rule-out lets it escape | `CONTEXT.md` (Answer, Rule out, Escape); paper Abstract |
| Matching without reasoning finds nothing; careful play finds over 90% (simulated players) | paper Abstract and §6; `src/clueGame/animalBoard.ts:50-53` (careful 91–95%); `plans/047-wander.md` |
| Finds glow on the globe and go in the Field Journal; the round-end card has the family tree, range map and sources | `README.md:3`; `docs/CLUE_MATCH.md`; paper §5.2 #5 |
| {N} animals, today 76 (50 mammals, 15 amphibians, 11 reptiles) | `db/content/animals/*.json`, counted by `src/site/render.tsx` at build. Known drift: the game serves the DB, which lags content until the owner runs `npm run content -- build`; the repo's content is still what we vouch for. |
| No continent count | continents come only from the DB (`clue_match_places` view), which a static build can't read, so the copy names no number |
| Facts from the IUCN Red List (all 76), Animal Diversity Web (65) and others in ranked tiers | `db/content/sources.json`; each profile's `sources` |
| Photos from Wikimedia Commons, credited; maps use IUCN and other credited sources | `src/pages/terms.tsx` "Photos and content"; profile `photo` fields |
| The skills practised; "maps onto" NGSS practices and MS-LS4-2; "does not claim to teach these on its own" | paper §5.1 |
| Limits (categories, "no record", pictures, teachers can't see reasoning) | paper §5.3 #3, #4, #5, #11 |
| Classroom ideas | paper §5.5 |
| One link gives the class the same animals and boards | `docs/CLUE_MATCH.md:10` ("`?seed=N` replays a session exactly"); `src/components/animalBoard/useAnimalSession.ts:28-31` (integers 1…4294967295) |
| Privacy facts (no name or email, journal in the browser, rounds saved without a link to the player, under 13) | `src/pages/privacy.tsx` sections |
| Sound starts off; the board plays with a keyboard | `docs/CLUE_MATCH.md:98` ("Once a run"), `:23` (`BoardController.ts` keyboard) |
| Runs in a browser, nothing to install, phones and computers | a web app; desktop rules at 48rem in `src/styles/globals.css`; the build shows it at 390 and 1440 |
| Made by Haunted Pavement LLC | the owner (H2 answer 5; `plans/2026-10-28-cc-landing-plan.md` Decisions); the terms after the build |

**The site never claims:**
- that it teaches on its own or raises scores;
- learning gains (no human study yet, paper §6);
- being "aligned to" standards (it "maps onto" practices, §5.1);
- COPPA or FERPA compliance, or any other legal statement (owner, H2 answer 6);
- dashboards, rosters or class views;
- that a teacher guide, a standards map or class results exist (they're "not available yet");
- offline play;
- any time but "about 5–10 minutes" a round, or any time for a whole trail;
- users, schools, quotes, logos or testimonials (none exist);
- that the photos are its own;
- "mystery", "12 look-alikes" or "charges" (stale `README.md:3`);
- that "rounds are not saved" (stale paper §5.3 #11: every finished round is saved with its `session_seed`, `db/schema.sql` `clue_match_solves`).

**Copy rules:**
- Players read "the one the camera saw", never "mystery".
- Student lines: short and plain, outdoor and tech words; no academic, violent or medical words.
- Teacher lines name what students do.
- Headlines ≤ 32 characters, then one supporting sentence.
- Buttons: a verb plus what you get, never "Learn more".
- Standards: "maps onto", never "aligned to".
- Operator: "Haunted Pavement LLC", exactly.
- No invented numbers: counts come from the content files at build time.

## 6. Coming soon

| Candidate | What it would take | Student privacy, against the privacy page | Show? |
|---|---|---|---|
| Teacher guide (printable: a round walkthrough, §5.5 activities, a debrief sheet for an escape) | writing only | none | **Yes** |
| Standards map (NGSS practices and ideas per activity) | writing plus an expert's review; wording stays "maps onto" | none | **Yes** |
| Class results from a class link: per animal, rounds found or escaped, no names | its own plan first. A seed names a puzzle, not a class or a viewer: anyone with the link could read the results, and strangers on the same seed add to them. Needs a class key separate from the seed and a rule for who may view. Data exists: `clue_match_solves.session_seed` | no new personal data, but rounds get a new use (today: "to see which puzzles are too easy"), so the privacy page gains one sentence when it's built (owner, H2 answer 2b) | **Yes** |
| Class codes and rosters | teacher accounts, a class table, student join codes or nicknames, Clerk organisations or our own | ties play to identifiable students under 13: contradicts "We don't ask for your name or email"; COPPA, FERPA, district agreements | **No** |
| Seeing each student's reasoning (paper §5.3 #11, §5.4) | rosters plus recording marks with the evidence at the time | as rosters, and more data per student | **No** |

The owner confirmed this list (H2 answer 2). On `/teachers/` §7, under the heading "Coming later: not available yet", each shown item is a list row:
- "Not available yet: a printable teacher guide with a round walkthrough and debrief activities."
- "Not available yet: a standards map showing which NGSS practices each activity maps onto."
- "Not available yet: class results from a class link, per animal, with no student names."

`/` shows none of them; the FAQ's "Can I see my students' results?" answers "Not yet" and points to §7.
