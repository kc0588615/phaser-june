---
mission: website-claims
project: critter-connect
branch: agent/website-claims
status: active
started: 2026-11-15 18:22 UTC
---

# Mission: Website claims: the Privacy and teachers' pages describe a game with no accounts (Critter Connect, audit M12)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

Mission M12 of the codebase audit (vault `research/critter-connect/codebase-audit.md`: read findings D21 and S6 and the M12 entry in full, and D3 for what M11 removed). Quote text to find a site: the audit's line numbers are from the pinned commit `4fa92a8e`, and M7, M8, M10, M5, M9 and M11 merge before this mission and shift them. The owner pre-approved the wording on 2026-11-14: the mission merges and deploys itself like any other (see "Owner pre-approval" at the end). When it's done:

1. **D21:** `src/site/Screenshot.tsx` has no `lead` prop and no branch for it: the component's signature is `{ shot, crop = '' }: { shot: ShotImage; crop?: string }`, the `<img>` always gets `loading: 'lazy'` and `decoding: 'async'`, and its doc comment says "lazy" without "unless it leads". `LEAD_IMAGE` and its comment stay (Home and Teachers spread it on their own lead `<img>`). The site build is byte-identical before and after this change.
2. **The Privacy page (`src/site/pages/Privacy.tsx`) describes a game with no accounts.** Its sections, in this order, say:
   - **Intro:** Critter Connect is a free game about real animals. It has no accounts, and we never ask who you are. The page explains what stays on your device and what other services see.
   - **What stays on your device** (replaces "If you play without signing in", same three points): we don't ask for your name or email; the Field Journal and a few settings are saved in your browser only, and clearing browser data removes them; the rounds you play aren't sent to us, and nothing about how you play is kept in our database.
   - **Results saved before October 2026** (replaces "If you sign in"): the game used to have optional accounts; before October 2026, the results of rounds played with an account were saved in our database; those results are being deleted, and no new ones are kept. (The month follows the baseline's `max(solved_at)`: Decision rules.)
   - **What we don't do:** unchanged.
   - **Other services:** animal photos load from Wikimedia Commons, which sees your IP address like any website you visit; everything else, maps included, comes from Critter Connect itself. It names exactly the outside hosts the baseline finds (Definition of done), grouped by service, and nothing else. No Clerk, and no link to Clerk.
   - **Players under 13:** the game never asks anyone for a name, an email or anything else about themselves, so no one gives any to play; a parent with questions can email the contact address.
   - **Deleting your data:** the Field Journal is in your browser, and clearing your browser's data for play.critterconnect.org deletes it; we hold nothing else about you; if you had an account before October 2026 and want its results deleted now, email the contact address from the address you used for it.
   - **Changes:** unchanged.

   The contact stays `CONTACT_EMAIL` (`privacy@critterconnect.org`), as a `mailto:` link wherever the page names it. The `updated` date becomes the merge day.
3. **The teachers' page (`src/site/pages/Teachers.tsx`) says the same.**
   - The "Student privacy" section (keep its `h2` and `id="privacy"`) becomes one list, with no "Without signing in" / "With signing in" columns and no `h3`: there are no accounts, students open the game and play; no name or email is asked for; the Field Journal stays in the browser, and rounds aren't sent to us. Its closing paragraph loses "Either way:" and says: no ads, no tracking cookies, no analytics; animal photos load from Wikimedia Commons, and everything else comes from Critter Connect itself; the privacy policy (same link) has the details.
   - The FAQ answer to "Do students need accounts?" becomes `No. There are no accounts: students open the game and play.`
   - **The find rate (S6 item 4).** The sentence "So far tested with simulated players, not yet in a classroom study: one who matches without reasoning finds about one round in five, and a careful one finds the animal in over 90% of rounds." is rewritten from a new bot run on today's rules and content (Definition of done), in this form: `So far tested with simulated players, not yet in a classroom study. With Auto rule-out on, as the game starts, one who moves at random and then guesses finds about one round in {A} (one in {R} with it off), and a careful one finds the animal in over {P}% of rounds.` The rounding is in the Decision rules.
4. **The Terms page (`src/site/pages/Terms.tsx`) has no account left.** If it still has the "Your account" section ("An account is optional. If you are under 13, ask a parent or guardian first." and "We may close accounts that do."), that section becomes `Playing fair`, with one item: `Please don't try to break, overload, or cheat the game's servers.` Its `updated` date becomes the merge day. Everything M10 wrote stays: the map-data sentence with One Earth's citation, and the rest of the page. If M11 already removed the account lines, check that what it left says nothing about accounts, and leave the page and its date alone.
5. **The site config (`src/site/config.ts`).** The Privacy page's `description` becomes `No accounts. What stays on your device, what other services see, and how to delete it. No ads, no tracking.` The header comment "No Next or Clerk here (eslint.config.mjs)" becomes "No Next here (eslint.config.mjs)". Nothing else in the file changes.
6. **The deletion steps are written down.** `docs/DATABASE_ACCESS.md` gets one new section, `## Deletion requests`, just above `## Related`, of about 15 to 25 lines. It says:
   - Requests arrive at `privacy@critterconnect.org`, a Namecheap mail forward that reaches the owner (owner, 2026-11-14). Agents can't read that mailbox; the owner answers and runs the steps.
   - **What the game keeps about a player now: nothing on the server.** No accounts, names or emails; the game's code sends only GET requests (`src/lib/getJson.ts`); `deploy/Caddyfile` has no `log` directive, so Caddy writes no access log; the app's own logs are the API routes' `console.error` lines, which hold an error and no IP or player. A player's Field Journal is in their browser: they delete it by clearing the browser's data for play.critterconnect.org. So for anyone who never had an account, the answer is plainly that there is nothing to delete. (Re-check each of these on a fresh `origin/main` before writing it; Decision rules.)
   - **The old rows, until M13 retires them:** `profiles` (one row per account that saved a round, keyed by `clerk_user_id`) and that account's rows in `clue_match_solves` (`player_id`), all from before October 2026, all from the owner's own test accounts (owner, 2026-11-14). Steps for a request about one: find the account's Clerk user id from the requester's email in Clerk's dashboard, while the owner hasn't deleted the production instance (once it's gone, an email can't be matched to a row: the database holds no email, so say so and point to M13's deletion of all of them); delete the user in Clerk's dashboard too, while it exists; take a fresh dump (`ssh play.critterconnect.org /opt/critter-connect/deploy/backup/pg-backup.sh`); then in one transaction delete that account's `clue_match_solves` rows first and its `profiles` row second, because `player_id` is `ON DELETE SET NULL` and deleting the profile alone keeps every result. Give the two `DELETE` statements and the `SELECT` that shows a parent what is held, by `user_id`.
   - **If M13 has renamed them** (`retired_*`, or whatever names its plan and `db/schema.sql` give), the same statements on those names; **once M13 has dropped them**, nothing about any player is left in the live database.
   - **Copies age out:** the game server keeps 14 days of daily and 56 days of weekly dumps (`deploy/backup/pg-backup.sh`), the Oracle VPS the newest 3 (`/srv/critter-ai/ops/bin/game-backup-pull`), and an `OFFSITE` mirror, if set, follows with `rsync --delete`. So a deleted row is gone from every copy 56 days later. The steps never restore or edit a dump.

### Why

The Privacy and teachers' pages are the game's public promises to players, parents and teachers. After M11 removed sign-in, they still describe an optional account, Clerk, an account ID in our database and "map servers" that went in October, and the teachers' page gives a find rate measured with Auto rule-out off, while the game ships with it on. The pages should say what the game does now, the one promise left (deleting old results) should have written steps, and the owner reads the wording before it ships. D21 rides along: one prop of the website's `Screenshot` component reads as real and can't run.

### Scope

In:
- `src/site/Screenshot.tsx` (D21)
- `src/site/pages/Privacy.tsx`, `src/site/pages/Teachers.tsx` (the privacy section, the one FAQ answer and the find-rate sentence)
- `src/site/pages/Terms.tsx` (the account section and the date only, Goal 4)
- `src/site/config.ts` (the Privacy description and the header comment)
- `docs/DATABASE_ACCESS.md` (the new section only)
- the plan file, and one handoff item per wording review (Definition of done, Release)

Out:
- **The database.** No write, live or dev copy. The deletion steps are written and read against `db/schema.sql`, never run. The live reads are the baseline's two counts (`./scripts/db`, read-only).
- **Every file outside the In list**, notably: the game (`src/` outside `src/site/`), `eslint.config.mjs` (its `@clerk/*` pattern is M11's or a later mission's), `src/site/pages/Home.tsx`, `Layout.tsx` and `NotFound.tsx`, the site's screenshots (`npm run site:shots`, which the owner set aside), `scripts/` (the balance bot is run, not edited), `deploy/`, `db/`, the other docs and `AGENTS.md`.
- The rest of the Terms page: M10's map-data sentence and every line Goal 4 doesn't name.
- Clerk's dashboard, Google's branding page and the Namecheap forward: the owner's.
- `clue_match_solves` and `profiles` themselves: mission M13 retires and drops them.
- Every other audit finding, and `plans/` other than this mission's plan.

### Definition of done

- **Baseline, before any change** (record each result in the plan):
  - **M11 merged.** On a fresh `origin/main`, `git grep -n "@clerk/" -- src package.json` prints nothing, and the live `https://play.critterconnect.org/explore/` HTML names no `clerk.critterconnect.org`. If either fails, M11 hasn't shipped: add a handoff item and end `MISSION_BLOCKED`, because the pages can't yet describe a game with no accounts.
  - **What earlier missions left.** Re-read every sentence Goal 2 to 5 names on `origin/main`, and record which M10 and M11 already changed. Re-run D21's two greps (`git grep -n '<Screenshot' -- .`: no line holds `lead`; `git grep -n -w lead -- src/site`: only `Screenshot.tsx`'s two lines) and S6's greps under "Roots checked".
  - **Outside hosts.** List every host the game and the site load from, by reading the code that loads anything at runtime (`<img src`, Phaser's `load.image`, `fetch`, MapLibre's style sources and worker, CSS `url(` and `@import`, `<script` and `<link` in `src/pages/_document.tsx` and `src/site/Layout.tsx`) and the live data: the host of every `species[].photo.url` in one GET of `/api/clue-game/pool/`, and every `src=`/`href=` host in the live HTML of play.'s `/` and `/explore/` and the apex's `/`, `/teachers/`, `/privacy/` and `/terms/` (links a visitor clicks are not loads). Checked at `af4b0453`: photos come from `thumb.wikimedia.org` (72 animals) and `upload.wikimedia.org` (2), both Wikimedia Commons; the globe's land, the range maps, fonts and scripts come from the game itself; the only other host was Clerk's, which M11 removes.
  - **The old rows** (two read-only queries against the live database, outside any dev-copy block): `./scripts/db "SELECT count(*), min(created_at), max(created_at) FROM profiles"` and `./scripts/db "SELECT (player_id IS NOT NULL) AS has_player, count(*), max(solved_at) FROM clue_match_solves GROUP BY 1"`. The owner's count is 3 profiles and 177 solves, none from October 2026 on. If there are more rows than that, or any row is newer than 2026-10-08, something still writes: stop the Privacy part and add a handoff item.
  - **Live pages.** Build `origin/main` with `npm run site:build` and `cmp` each of `out/site/index.html`, `teachers/index.html`, `privacy/index.html` and `terms/index.html` with the live apex page (`curl -s --retry 3`). Record whether they are identical: it decides the release's smoke check.
  - **Baseline site E2E.** `npm run site:serve` in the background (port 3101), then `CHROME_PATH=$HOME/.local/bin/chrome-nosandbox npm run e2e:site`; copy its artifact to `/srv/critter-ai/agent-state/missions/website-claims/baseline-e2e-site/` and record its check count. Also record `npm test`'s pass count.
- **D21's proof:** copy `out/site` from the baseline build to `…/website-claims/site-before/`, make the D21 change alone, rebuild, and `diff -r` the two: it must print nothing. Commit D21 by itself, before any text change.
- **The bot run, on the final base:** `node scripts/run-typescript.mjs scripts/balance-044.ts --rounds 400 --seed 44 --places africa,asia,north-america,south-america --players careful,random,autoguess`, saved to `…/website-claims/bot.txt`, with its wall time. It reads `db/content/` only. The plan records each place's found rate (±95%) per player and the three figures the sentence uses.
- **On the final commit:**
  - `npm run typecheck`, `npm run lint`, `npm test` (the baseline's pass count) and `npm run site:build` exit 0.
  - `npm run e2e:site` passes with the baseline's check count. Look at `site-teachers-*` and `site-privacy-*` at both widths and in both modes: the privacy section is one list, nothing overflows, and the rest of each page looks as in the baseline's. Save the run as `/srv/critter-ai/agent-state/missions/website-claims/final-e2e-site/`.
  - `git diff --stat origin/main` lists only the In files and the plan.
  - `git grep -n -i -E "clerk|sign[ -]?in([^a-z]|$)|signing in|map servers|account id|your account|matches without reasoning|unless it leads|lead\?: boolean|lead = false" -- src/site` prints nothing. (No exclusions: every hit is a sentence or a prop this mission removes. The words "account" and "accounts" stay where the pages say there are none.)
  - `git grep -n "## Deletion requests" -- docs/DATABASE_ACCESS.md` gives one line, and every table and column the section names is in `db/schema.sql` on the final base (or in M13's plan, for names it gives).
  - No game E2E is needed: nothing the game bundles changes (`git diff --stat` above). CI's `e2e` job still runs on the PR.
- **Release** (critter-connect's release rules: CI's `check` job must pass, a failed `e2e` job is rerun once and then reported, and a failed deploy or smoke test is reverted and redeployed; the plan's release line is `Result: done`). **The owner set one more check for this mission on 2026-11-14: he reads the new wording before it ships.** It is a check before the merge, as CI is, not a "no merge": once he approves, the mission merges and deploys as usual. It fits the release rules' failed-check path:
  - **First release session** (no approval recorded): rebase, re-run the full Verification, push, open the PR (its body lists every changed sentence, old and new) and wait for CI as the rules say. Then add one handoff item in `~/AGENTS.md`'s format, titled `Read the new Privacy and teachers' page wording (website-claims)`, `Blocks: the merge and deploy of website-claims`. Its body holds: the PR's link and its files tab; the full new text of the Privacy page and each changed sentence of the teachers' and Terms pages, old and new, as visitors read them (from `out/site`, tags stripped); the bot figures behind the find rate; and that the dates will become the merge day. **Steps:** read it; write `approve`, or the changes you want, under **Your reply**; set `Status: done`; run `mission resume website-claims` (or ask the control room to). Under `## Release`, write `Result: failed: waiting for the owner's approval of the wording (H<n>)`, with the PR number and CI's result. Commit, push, and end with `MISSION_BLOCKED: waiting for the owner to read the Privacy and teachers' wording (H<n>)`.
  - **After the owner answers and resumes:**
    - `approve`: set each changed page's `updated` date to the session's UTC day (`November 20, 2026` form), commit, rebase, re-run the full Verification, push, wait for CI, record the pre-merge baseline below, merge, deploy and smoke-test, then replace the `Result:` line with `Result: done`. If the merge lands on a later UTC day than the date written, fix the date first.
    - Changes: make the ones inside the In files and the Decision rules (wording; never a new claim the code doesn't support, which goes back to him as a question in the next item), re-run the full Verification, push, add a new handoff item with the new text, and block again as above. Repeat until he approves.
    - A reply that isn't clear, or `Status: later`: handle it as `~/AGENTS.md` says, and leave the mission blocked.
  - **Pre-merge baseline:** the status codes of `/`, `/teachers/`, `/privacy/`, `/terms/` and `/nope/` on `critterconnect.org` and of `/` and `/explore/` on `play.critterconnect.org`, and the HTML of the apex's `/` (it doesn't change).
  - **Smoke tests after the deploy** (each `curl` with `--retry 3`; one retry of a whole check after 30 seconds for a network blip):
    - `bash deploy/check.sh` passes (as it stands after M5), and `version.txt` shows the merge commit.
    - Every status code matches the pre-merge record.
    - If the baseline's live pages matched the local build: `/teachers/`, `/privacy/` and `/terms/` are byte-identical to `out/site` built from the merge commit, and `/` to its pre-merge record. If they didn't match at baseline: each changed page's text (tags stripped) holds the new sentences and none of the removed ones.
    - `/privacy/` (and `/terms/`, if it changed) shows `Last updated` with the merge day.
- **The Summary** lists the changed files; D21's identical-build proof; the baseline's M11 check, old-row counts and outside hosts; the bot figures and the sentence they gave; the deletion section's outline; the site E2E runs; the owner's review rounds; the CI and smoke results. It says that no production content build is needed, and leaves two notes for mission M13: when it drops `profiles` and `clue_match_solves`, the Privacy sentence "are being deleted" stays true until the last weekly dump that holds them ages out (56 days after the drop), after which it should read "were deleted"; and the new section of `docs/DATABASE_ACCESS.md` needs its table names updated (or the old-rows part removed) when M13 renames and drops them.

### Decision rules

- **The pages say what the code does, and nothing more.** No claim of compliance (COPPA, FERPA, GDPR or another), no promise the code doesn't keep, and nothing about what Wikimedia does beyond seeing the IP address: the owner chose to make no legal claims (`plans/051-landing-page.md`, his answer of 2026-10-28). Keep each page's plain voice, short sentences and existing JSX conventions (`&apos;`, the `LegalArticle` wrapper, the roles in `src/site/roles.ts`).
- **What earlier missions changed:** if M11 or M10 already reworded a sentence this Goal names, check it against the Goal. Leave it as it is if it already says the same; otherwise rewrite it to the Goal. Never undo M10's Terms sentence or M11's removals.
- **The month in "before October 2026":** if the baseline's `max(solved_at)` is before 2026-10-01, keep "before October 2026" everywhere the Privacy page and the deletion section say it (the heading, that section and "Deleting your data"); if it's from 2026-10-01 to 2026-10-08, write "until early October 2026" in each of those places instead; anything later stops the Privacy part (Baseline).
- **Outside hosts:** if the baseline finds a host other than Wikimedia's two and the game's own (other than Clerk, which means M11 hasn't shipped), name it in "Other services" by its service, with what it loads, and say in the plan where the code loads it. Don't remove it: that's a code change, out of scope.
- **The find-rate figures:** `A` and `R` are `100 ÷` the mean found rate of `autoguess` and `random` over the four places, rounded to the nearest whole number and written as a word ("three", "five"). `P` is the largest multiple of 5 below the lowest place's `careful` found rate minus its ±95% margin (96% ±2 gives 90). If `A` equals `R`, drop the bracket. If the bot fails on today's code, keep the sentence's claims to what holds (drop the careless figure, keep "over 90%" only if the plan 059 figures still apply to today's `ANIMAL_RULES.version`), and say so in the plan and the handoff item.
- **The deletion section** describes a check before writing it: the `log` directive, the `console.error` lines, the GET-only client, the backup retention, the column names and the foreign key are each re-read on the final base. If one has changed, write what is true then.
- **If the release rebase brings changes** to `src/site/`, `db/content/` or the game's rules (`src/clueGame/animalBoard.ts`, `ANIMAL_RULES`), redo the parts they touch (the bot run when the rules or content changed; the outside-hosts check when anything that loads from a host changed), and if a sentence changes, the owner reads it again before the merge.
- Change only what the Goal names. Anything else that looks wrong on the site is a note in the plan, not an edit.

### Notes

- **Owner answers (Danby, 2026-11-14), which override the audit.**
  - Q16: sign-in is removed by M11 (`agent/remove-sign-in`), which runs just before this mission. So the pages describe a game with no accounts at all: no Clerk, no sign-in, nothing about a player stored on the server; the Field Journal lives in the browser. S6's items 1, 2 and 5 are settled by that.
  - The old data: until M13 (`agent/db-retire`, after this mission) retires them, the live database holds 177 rows in `clue_match_solves` and 3 in `profiles`, from before October 2026, all from the owner's own test accounts. The Privacy wording must be true before and after M13: "are being deleted, and no new ones are kept". The page doesn't say they were test accounts; the deletion doc does.
  - Q17: mail to `privacy@critterconnect.org` reaches the owner through Namecheap's forwarding. It stays the contact.
  - S6's "map servers": say what the game loads from other hosts now (Wikimedia Commons' photos, and anything else the baseline finds), nothing more.
  - He reads the new Privacy and teachers' wording before the release (Definition of done, Release). Each changed page's `updated` date is the merge day.
- **How the wait fits the release rules.** `~/.claude/CLAUDE.md` (Release) says that when a check before the merge fails, the session doesn't merge, writes `Result: failed: <what>`, adds a handoff item and ends `MISSION_BLOCKED`, and that after the owner answers and resumes, the next session tries again and replaces the line. The owner's review is that check. The runner keeps the mission alive while `## Release` has no `Result: done`, and the queue chain doesn't start M13 until this mission has released.
- **What merged first.** M6 (server cleanup), M1, M3 (agent files, `af4b0453`, live on 2026-11-14), M4 (toolchain), M7, M8, M10 (content pipeline: the Terms page's map-data sentence and date, and the journal's credit line), M5 (deploy-ci: it may have changed `deploy/check.sh`), M9 (screens), M11 (remove sign-in: Clerk, `/login`, the journal's server merge, its variables and docs, possibly some site lines). This brief was checked at `af4b0453`; re-read every site on a fresh `origin/main`.
- **Checked at `af4b0453`:**
  - `src/site/` has `Privacy.tsx` and `Terms.tsx` with `updated="November 6, 2026"` (only these two pages have a date, through `LegalArticle`); `git grep -n -i clerk -- src/site` gives `config.ts:2`, `Privacy.tsx:25` and `Teachers.tsx:126`; `Terms.tsx` has the "Your account" section quoted in Goal 4.
  - `git grep -n '<Screenshot' -- .` gives 10 lines in `Home.tsx` and `Teachers.tsx`, none with `lead`.
  - The site loads nothing from another host: `deploy/check.sh` fails a page with a `<script src`, and `scripts/e2e-site.mjs` checks "same-origin requests only". `scripts/e2e-site.mjs` checks each page's title and description against `src/site/config.ts`, so the new description passes as long as config and page agree.
  - The game: MapLibre's style has no glyphs or sprite URL and its land is the game's own GeoJSON (`src/clueGame/worldMap.ts`); fonts are under `public/fonts/`; the board's pins and cards load each animal's photo URL; the pool's 76 animals have photos on `thumb.wikimedia.org` (72) and `upload.wikimedia.org` (2), and 2 have none.
  - `deploy/Caddyfile` has no `log` line. The API routes log with `console.error` only. `deploy/backup/pg-backup.sh` deletes daily dumps after 14 days and weekly after 56; `game-backup-pull` keeps 3.
  - `db/schema.sql`: `profiles (user_id uuid PRIMARY KEY, clerk_user_id text, …)` and `clue_match_solves.player_id uuid REFERENCES profiles(user_id) ON DELETE SET NULL`, with `solved_at`.
  - The bot (`scripts/balance-044.ts`) takes `--places` (default `africa,asia`) and `--players`; `autoguess` is "random moves; Auto rule-out marks for it (shown mismatches); once one is marked, names one still in at random: the blind baseline with the switch on". Plan 054 had it at 34 / 36% (Africa / Asia) and `random` at 20 / 20%; plan 059 had `careful` at 96 to 98% on four continents. Those runs predate today's rules and content, hence the new run.
- **The site E2E** needs the build served: `npm run site:build`, then `npm run site:serve` in the background (port 3101), then `npm run e2e:site` with `CHROME_PATH=$HOME/.local/bin/chrome-nosandbox` (the shared wrapper; don't write your own). It uses no database. Its artifact lands in `e2e-artifacts/<run>-site/`; copy it to the state folder.
- **The edit hook** (`.claude/hooks/guard-edits.sh`) blocks env and Prisma files; nothing in this scope hits it.
- **The pre-push hook** runs typecheck and lint. The PR changes `.tsx` and `.ts`, so CI runs both jobs.
- **Size:** about 12 sessions (the audit's 11, plus the release run after the owner's reply).

### Owner pre-approval (2026-11-14): overrides every text above about waiting for the owner

The owner pre-approved the new wording on 2026-11-14 ("have it commit automatically"). So there is **no wording-review wait**, no handoff item for the wording, and no `Result: failed` waiting state. The release runs in one session under the normal release rules:
- Rebase, run the full Verification, and push.
- Open the PR. Its body still lists every changed sentence, old and new.
- Wait for CI, record the pre-merge baseline, then merge, deploy and smoke-test.
- Write `Result: done`.

Each changed page's `updated` date is the merge day (UTC, in the `November 20, 2026` form). Fix the date first if the merge lands on a later day. The Summary carries what the handoff item would have held: the full new Privacy text, each changed sentence of the teachers' and Terms pages old and new, and the bot figures behind the find rate. The owner reads it after the release. The Decision rules still bound the wording: never a claim the code doesn't support.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: consult the advisor (Fable 5.2) on the Architecture section
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

Run 2026-11-15 ~18:25 UTC on `origin/main` = `83eef270` (Merge #81, remove-sign-in); live `version.txt` = `83eef270`. Branch = origin/main + plan only. No install/migrate needed (node_modules current; mission touches no DB).

- **M11 merged:** `git grep -n "@clerk/" origin/main -- src package.json`: nothing. Live `/explore/` HTML: 0 `clerk.critterconnect.org`. Pass.
- **Checks:** typecheck 0, lint 0, `npm test` **76/76**. Site build 0.
- **Baseline site E2E:** **444/444 checks**, 20 screenshots, artifact `/srv/critter-ai/agent-state/missions/website-claims/baseline-e2e-site/`. Game E2E not run (brief: nothing the game bundles changes; CI runs it).
- **Live pages vs local build:** `/`, `/teachers/`, `/privacy/`, `/terms/` all **byte-identical** to `out/site` of `83eef270`. So release smoke = byte-identical compare. Baseline build saved as `…/website-claims/site-before/` (D21 proof).
- **D21 greps:** `<Screenshot` = 10 lines (Home 6, Teachers 4), none with `lead`. `git grep -w lead -- src/site` = only `Screenshot.tsx:10,16`. As audit says.
- **S6 grep (DoD regex) hits on origin/main:** `Screenshot.tsx:8,10`; `config.ts:2` ("No Next or Clerk here"), `config.ts:45` (description "keeps if you sign in"); `Privacy.tsx:9,12,22,25,26,29,35,47,53,60` (intro, both sign-in headings, Clerk item + link `https://clerk.com/legal/privacy`, account ID, "map servers", under-13, delete); `Teachers.tsx:24` (FAQ "Signing in is optional"), `:87` (find-rate "matches without reasoning"), `:115,123,125,126` (two `h3` columns, Clerk); `Terms.tsx:16` ("Your account").
- **What M10/M11 left:** M11 changed none of the Goal 2–5 sentences: Privacy (`updated="November 6, 2026"`), Teachers privacy section/FAQ/find rate, config description + header comment all as the brief quotes. Terms: M10's date `updated="November 15, 2026"` and One Earth sentence present; "Your account" section still has both account lines verbatim → Goal 4 applies (section → "Playing fair", date → merge day).
- **Outside hosts (loads):** code: every fetch is same-origin `getJson` (`/api/places/`, `/api/places/outline/`, `/api/clue-game/pool|range|ranges/`); MapLibre style sources are local GeoJSON (`/assets/clue-match/world-land.geojson`), worker via `import.meta.url`, no glyphs/sprite; fonts `@font-face` `/fonts/…`; Phaser `load.svg` `/assets/evidence/`, `load.image(pin.photo)` = DB photo URL (`BoardView.ts:198`, CORS note `ClueBoardScene.ts:69`); `<img>` photo via `photoAt(species.photo.url)` (`AnimalCard.tsx:18`, `SpeciesPortrait.tsx:17`); `_document.tsx`/`Layout.tsx` scripts inline, links local. Live pool GET: 76 species, `thumb.wikimedia.org` 72, `upload.wikimedia.org` 2, 2 no photo. Live HTML `src=`/`href=` external: play `/`, `/explore/` none; apex pages only `href` links (commons.wikimedia.org file pages, play., canonical, Privacy's `clerk.com/legal/privacy` link) — links, not loads. **Only outside load host: Wikimedia Commons (thumb./upload.).**
- **Old rows (live, read-only):** `profiles`: **7** rows, created 2025-10-21 → 2026-09-26. `clue_match_solves`: **188** rows: 23 with `player_id` (max 2026-09-30 05:56 UTC), 165 without (max **2026-10-01 04:24 UTC**). Per profile: 3 profiles hold the 23 player rows (15, 7, 1); 4 profiles (2025-10-21/22/24, 2026-07-18) hold none. By month: Sep 2026 161 anon + 23 player; Oct 2026 4 anon. No row after 2026-10-01 → nothing writes. Brief expected 3 / 177: see Decisions.

## Architecture

Read on `agent/website-claims` = `origin/main` `83eef270` + plan (fetched 2026-11-15). Line numbers are that tree's.

### Findings (ranked by impact)

1. **Privacy page describes accounts that M11 removed** (`src/site/pages/Privacy.tsx`). Intro `:8-9` ("keep if you do sign in"); heading `:12`; the whole "If you sign in" block `:22-37`: Clerk keeps your email and a link to `clerk.com` (`:25-26`), "an account ID from Clerk" (`:29`), and "They are added to your Field Journal when you sign in" (`:35`), which has been false since M11 deleted the journal merge; "maps from our map servers" (`:47`): no map server since 2026-10-13 (land is `/assets/clue-match/world-land.geojson`, ranges come from the game's own `/api/clue-game/range*`); under-13 "before signing in" plus "delete a child's account" (`:53-54`); "the address you signed in with ... delete your account" (`:59-60`). These are false public statements, and the Decision rules say the pages say what the code does. Fix: the Privacy text below.
2. **Teachers page: the same, plus a stale find rate** (`src/site/pages/Teachers.tsx`). FAQ `:24` "Signing in is optional". Privacy section `:111-132`: two columns with `h3` "Without/With signing in", Clerk (`:126`), "Either way:" (`:131`). Find rate `:87` was measured with Auto rule-out off, but the game starts with it on (`src/components/animalBoard/autoRuleOut.ts:5`, `!== 'off'`). Fix below. The bot preview (below) gives "one in three (one in five with it off) ... over 90%".
3. **Caddy logs failed requests with the client's IP, even with no `log` directive** (new; verified). `deploy/Caddyfile` has no `log` line (true), so there is no access log. But when Caddy can't reach the app (a 502, e.g. while a deploy recreates `critter-app`), it writes an `http.log.error` line holding `remote_ip`, `client_ip`, `uri` and `User-Agent` to its stderr, i.e. `docker logs caddy`. I reproduced this on 2026-11-15 with Caddy v2.11.7 (same `caddy:2` line as `Dockerfile:21`): no `log` directive, `reverse_proxy` to a closed port, one curl, and the line showed up. So two of the brief's phrases claim more than the code keeps: the doc's "What the game keeps about a player now: nothing on the server" and the page's "we hold nothing else about you". Fix: the doc says it in one clause, and the page drops that one clause (Target design). Changing Caddy's logging would be a `deploy/` change, out of scope; it's a note for the owner (Notes).
4. **Terms still has "Your account"** (`src/site/pages/Terms.tsx:16-20`): "An account is optional ..." and "We may close accounts that do." Goal 4 applies (M11 left both lines). Fix: the section becomes "Playing fair", and the date becomes the merge day. M10's date (`:6`, "November 15, 2026") and the One Earth sentence (`:24-26`) stay.
5. **Site config** (`src/site/config.ts`): the description at `:45` says "keeps if you sign in". The comment at `:2` says "No Next or Clerk here", but `eslint.config.mjs:19-23` now guards only `next`/`next/*` (M11 removed the Clerk pattern), so the comment is stale. Fix: the brief's exact strings.
6. **No written deletion steps** (S6 item 5). `docs/DATABASE_ACCESS.md` has no such section; `## Related` is at `:278`. I re-read every fact the section needs on this tree:
   - `getJson.ts:8` is the only `fetch` in `src/`, and every route exports `GET` only.
   - The five `console.error` lines are in `src/app/api/**/route.ts`, each an error object.
   - `db/schema.sql:92-98`: `profiles(user_id uuid PK, clerk_user_id text, created_at, updated_at)`. No email.
   - `db/schema.sql:104`: `clue_match_solves.player_id ... REFERENCES profiles(user_id) ON DELETE SET NULL`. It is the only FK to `profiles`. Its columns (`:102-131`) hold no IP, name, email or device id.
   - `pg-backup.sh:25-26,28`: daily dumps deleted at `-mtime +14`, weekly at `-mtime +56`, then `rsync --delete` to `OFFSITE`.
   - `game-backup-pull:9,38`: `KEEP=3`.
   - `deploy/db/dev-role.sql:29-31`: the dev copy has no player ids.
   - M13's names are `retired_clue_match_solves` and `retired_profiles` (its brief, `agent-state/missions/briefs/2026-11-13-db-retire.md` Goal 4; M13 has no plan yet).
7. **Dead `lead` prop (D21)** (`src/site/Screenshot.tsx:8,10,16`): all 10 `<Screenshot` calls pass `shot` and `crop` only. Leave Home's and Teachers' own `{...LEAD_IMAGE}` (`Teachers.tsx:51`) alone. Low impact.
8. **Data facts that bound the wording** (Baseline). There are 7 profiles, and 4 of them hold no results. So `profiles` is not "one row per account that saved a round", and the schema comment `db/schema.sql:91` is slightly off too (note only: `db/` is out of scope, and M13 drops the table). The 165 rows with no `player_id` are 161 from September and 4 from October 2026, the newest 2026-10-01 04:24 UTC. They are rounds played without an account (`db/schema.sql:101,119`), saved with nothing that says who played. The brief's "results of rounds played with an account were saved" is true, but it implies that rounds played without one weren't.

**Fine as is (verified):**
- Privacy's "What we don't do". The analytics/cookie grep over `src public next.config.mjs deploy Dockerfile package.json` finds only the two page sentences.
- Privacy's three device points: storage is only `localStorage` and `sessionStorage`, and the client sends only GETs.
- The outside hosts. `photoAt` (`speciesInfo.ts:65`) keeps each photo's own host, so only Wikimedia Commons serves anything from outside.
- The rest of Terms. "See the Privacy Policy for what we keep and how to delete it" is still fair.
- Home, Layout and NotFound: they say only "No account", which is true.
- The site E2E: `scripts/e2e-site.mjs:139` checks title and description against `PAGES`, and both page and meta come from config, so they agree. Its 444 checks are per page, mode and width, not per sentence, so the count stays 444.

### Target design

All changes are text and markup in the existing JSX conventions: `&apos;`, `LegalArticle` with plain `h2`/`p`/`ul`, the `roles.ts` classes, and the `mailto:` written inline as in Terms. There is no new component, constant or check. Order: D21 first and alone (byte-identical proof), then the pages and config, then the doc. `{MERGE_DAY}` means `updated="November NN, 2026"`, set in the implementing session and fixed at release if the merge lands on a later day.

**`src/site/Screenshot.tsx` (D21).** Keep `LEAD_IMAGE` and its comment. The doc comment becomes `... radius m, lazy.` (no "unless it leads"). The signature becomes `export default function Screenshot({ shot, crop = '' }: { shot: ShotImage; crop?: string }) {`. Replace the spread (`:16`) with the plain attributes `loading="lazy" decoding="async"`, after `className`. React emits attributes in prop order, so the HTML stays the same bytes and `diff -r site-before out/site` prints nothing.

**`src/site/config.ts`.** `:2` becomes `// No Next here (eslint.config.mjs): every page is plain HTML and CSS.` and `:45` becomes `description: 'No accounts. What stays on your device, what other services see, and how to delete it. No ads, no tracking.',`. Nothing else changes.

**`src/site/pages/Privacy.tsx`.** Full body, in this order (the brief's sections; "What we don't do" and "Changes" unchanged):

```tsx
<LegalArticle title="Privacy Policy" updated="{MERGE_DAY}">
  <p>
    Critter Connect is a free game about real animals. It has no accounts, and we never ask who you are. This page
    explains what stays on your device and what other services see.
  </p>

  <h2>What stays on your device</h2>
  <ul>  {/* the three <li> of today's :14-19, verbatim */}
    <li>We don&apos;t ask for your name or email.</li>
    <li>
      Your Field Journal and a few settings (like whether you&apos;ve seen the how-to-play screen) are saved in your
      browser only. Clearing your browser data removes them.
    </li>
    <li>The rounds you play aren&apos;t sent to us. Nothing about how you play is kept in our database.</li>
  </ul>

  <h2>Results saved until early October 2026</h2>
  <p>
    The game used to have optional accounts. Until early October 2026, the results of rounds played with an account
    were saved in our database. Rounds played without one were saved too, with nothing that says who played them.
    Those results are being deleted, and no new ones are kept.
  </p>

  {/* What we don't do: unchanged (:39-43) */}

  <h2>Other services</h2>
  <p>
    Animal photos load from Wikimedia Commons, which sees your IP address, like any website you visit. Everything
    else, maps included, comes from Critter Connect itself.
  </p>

  <h2>Players under 13</h2>
  <p>
    The game never asks anyone for a name, an email or anything else about themselves, so no one gives any to play.
    A parent with questions can email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
  </p>

  <h2>Deleting your data</h2>
  <p>
    Your Field Journal is in your browser: clearing your browser&apos;s data for play.critterconnect.org deletes it.
    If you played with an account while results were saved, until early October 2026, and want them deleted now,
    email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address you used for it.
  </p>

  {/* Changes: unchanged (:63-64) */}
</LegalArticle>
```

Where this differs from the brief's wording (each one stays within the Decision rules; the Summary lists them for the owner):
- (a) The month: "until early October 2026" (rule, see Answers).
- (b) The added sentence about rounds played without an account (finding 8).
- (c) "we hold nothing else about you" is dropped (finding 3). The sentence that remains keeps the brief's point and its address rule.
- (d) "had an account before October" becomes "played with an account while results were saved, until early October 2026". With "until", the plain swap would read as if the account itself ended in October.
- (e) "Results saved ..." is a paragraph, not a list. It is one narrative, like "Other services".

**`src/site/pages/Teachers.tsx`.**
- `:24`: `{ q: 'Do students need accounts?', a: 'No. There are no accounts: students open the game and play.' },`
- `:87` (from the bot run on the final base; the preview values are filled in): `<p className={MEASURE}>So far tested with simulated players, not yet in a classroom study. With Auto rule-out on, as the game starts, one who moves at random and then guesses finds about one round in three (one in five with it off), and a careful one finds the animal in over 90% of rounds.</p>`
- `:111-132`: keep the `Section`'s props and the `h2`. Replace the two-column `div` and the paragraph with:

```tsx
<ul className={`${LIST} ${MEASURE}`}>
  <li>There are no accounts: students open the game and play.</li>
  <li>No name or email is asked for.</li>
  <li>The Field Journal stays in the browser, and rounds aren&apos;t sent to us.</li>
</ul>
<p className={MEASURE}>No ads, no tracking cookies, no analytics. Animal photos load from Wikimedia Commons, and everything else comes from Critter Connect itself. The <a href="/privacy/" className={LINK}>privacy policy</a> has the details.</p>
```

`H3` and `LIST` stay imported, because they are still used at `:103,138,161`. `${LIST} ${MEASURE}` matches the page's other full-width lists.

**`src/site/pages/Terms.tsx`.** `:6` becomes `updated="{MERGE_DAY}"`. `:16-20` becomes:

```tsx
<h2>Playing fair</h2>
<ul>
  <li>Please don&apos;t try to break, overload, or cheat the game&apos;s servers.</li>
</ul>
```

**`docs/DATABASE_ACCESS.md`.** Insert just above `## Related` (`:278`). The brief's content needs about 30 lines at this width, the SQL block included; that is its 15–25 target plus the statements it asks for.

````markdown
## Deletion requests

Requests arrive at `privacy@critterconnect.org`, a Namecheap mail forward that reaches the owner (owner, 2026-11-14).
Agents can't read that mailbox; the owner answers and runs these steps.

**What the game keeps about a player now: nothing that names them.** No accounts, names or emails. The game's code
sends only GET requests (`src/lib/getJson.ts`). `deploy/Caddyfile` has no `log` directive, so Caddy writes no access
log; it still logs a request it can't pass to the app (a 502 while a deploy restarts it, say) with the client's IP
address and user agent, in `docker logs caddy`. The app's own logs are the API routes' `console.error` lines: an
error, no IP or player. The Field Journal is in the player's browser; clearing its data for play.critterconnect.org
deletes it. So for anyone who never had an account, nothing we hold can be found from their email: say so.

**The old rows, until M13 (`agent/db-retire`) retires them:** `profiles` (accounts, keyed by `clerk_user_id`; no
email) and each account's rows in `clue_match_solves` (`player_id`), all saved until early October 2026 (the newest
2026-10-01), all from the owner's own test accounts (owner, 2026-11-14). Rows with no `player_id`, rounds played
without an account, match no one. For a request about an account:

1. In Clerk's dashboard, find the user id for the requester's email, then delete that user there too. Once the owner
   has deleted the production instance, an email can't be matched to a row (the database holds no email): say so,
   and that M13 deletes them all.
2. Take a fresh dump: `ssh play.critterconnect.org /opt/critter-connect/deploy/backup/pg-backup.sh`.
3. In `./scripts/db`, find the row and show what is held, then delete in one transaction, solves first:
   `player_id` is `ON DELETE SET NULL`, so deleting the profile alone keeps every result.

```sql
SELECT user_id FROM profiles WHERE clerk_user_id = '<clerk user id>';
SELECT p.created_at, s.* FROM profiles p LEFT JOIN clue_match_solves s ON s.player_id = p.user_id
 WHERE p.user_id = '<user_id>' ORDER BY s.solved_at;
BEGIN;
DELETE FROM clue_match_solves WHERE player_id = '<user_id>';
DELETE FROM profiles WHERE user_id = '<user_id>';
COMMIT;
```

If M13 has renamed them (`retired_clue_match_solves`, `retired_profiles`), run the same statements on those names;
once it has dropped them, nothing about any player is left in the live database.

**Copies age out.** The game server deletes daily dumps after 14 days and weekly ones after 56
(`deploy/backup/pg-backup.sh`), the Oracle VPS keeps the newest 3 (`/srv/critter-ai/ops/bin/game-backup-pull`), and
an `OFFSITE` mirror, if set, follows with `rsync --delete`; the scrubbed dev copy `phaser_june_dev` holds no player
ids (`deploy/db/dev-role.sql`). So a deleted row is gone from every copy about 8 weeks later. These steps never
restore or edit a dump.
````

The section gives no row counts (Decisions). Two of its wordings differ from the brief, because the code says otherwise:
- "About 8 weeks" instead of "56 days": `-mtime +56` deletes a weekly dump only once it is 57 days old.
- The Caddy clause and "nothing that names them" (finding 3).

M13 adds its W4/W5 dates to the "If M13 has renamed them" paragraph (its brief, Decision rules).

**No e2e change.** The brief fixes the site E2E at the baseline's count (444), so no new checks. The DoD grep and the release smoke check the text.

### Answers to the questions put to the architect

- **Month: confirm "until early October 2026".** The Decision rule keys on the baseline's `max(solved_at)`, and the newest saved round is 2026-10-01 04:24 UTC: 4 rows on 2026-10-01, all saved without an account. That falls in the rule's 10-01 to 10-08 band. The heading names every result saved, so "before October" would be untrue for those 4 rows. "Until" is also true for account rows (newest 2026-09-30), because the save path ran until 2026-10-01. The phrase goes in all four places: the heading, the section, "Deleting your data" and the doc.
- **The 165 anonymous rows: one sentence on the page, one in the doc.** "Rounds played without one were saved too, with nothing that says who played them." The schema supports it (`:101,119`; no identifying column). "Those results are being deleted" then covers every row M13 drops, and M13 keeps that sentence verbatim (its brief). The doc says these rows can't be matched to a requester.
- **DoD greps.**
  - The grep is case-insensitive over all of `src/site`, so no comment may hold "Clerk" either (`config.ts:2` goes).
  - No new text may hold "sign in/sign-in/signin", "signing in", "your account" or "account id". The text above holds none.
  - `## Deletion requests` appears once.
  - The tables and columns the doc names (`profiles`, `user_id`, `clerk_user_id`, `created_at`, `clue_match_solves`, `player_id`, `solved_at`) are in `db/schema.sql`. The `retired_*` names come from M13's brief; read the DoD's "M13's plan" as that brief.
  - `git diff --stat` lists only the In files and the plan: don't touch `db/schema.sql:91` or `deploy/`.
- **Bot preview (not the DoD artifact).** Run on this tree (rules `055-0`) with the DoD's exact command, 4 m 10 s, output `/tmp/wc-arch/bot.txt`.

  | Player | africa | asia | north-america | south-america |
  |---|---|---|---|---|
  | careful | 98 ±1 | 96 ±2 | 96 ±2 | 96 ±2 |
  | random | 20 ±4 | 20 ±4 | 20 ±4 | 20 ±4 |
  | autoguess | 28 ±4 | 37 ±5 | 31 ±5 | 33 ±5 |

  - A = round(100 / 32.25) = 3, "three".
  - R = 100 / 20 = 5, "five".
  - P: the lowest careful place is 96 − 2 = 94, so 90.
  - A ≠ R, so the bracket stays. Use the printed (rounded) percentages, which can't move A across a boundary here.
  - The step still re-runs on the final base and saves to the state folder's `bot.txt`.

### Rejected alternatives

- Keeping "we hold nothing else about you" and "nothing on the server" verbatim: rejected. Caddy's 5xx log lines hold the IP and user agent (finding 3), so these would be claims the code doesn't support.
- Turning off Caddy's error log so the brief's phrases become true: rejected here, because it is a `deploy/` change and out of scope. It's a note for the owner.
- "Before October 2026", because the account rows end on 2026-09-30: rejected. The rule keys on the overall max (2026-10-01), and the heading covers every saved result.
- The brief's verbatim "Results" sentence with no word on the anonymous rows: rejected. It implies rounds played without an account were never saved, and 165 were.
- A shared mailto component or constant: rejected. There are two inline uses, and Terms already writes it inline.
- A `LAZY_IMAGE` constant spread in place of the attributes: rejected. Plain JSX attributes are simpler and render the same bytes.
- New e2e-site checks pinning the sentences: rejected. The brief fixes the count at 444, and the DoD grep plus the release smoke cover the text.

### Notes (not edits)

- **For the owner.** Caddy (`caddy:2`, default logger) writes a request's IP, URI and user agent to `docker logs caddy` whenever it can't reach the app. That log lasts until the `caddy` container is recreated (only when the Caddyfile or the site changes), or as Hetzner's Docker log settings allow (not checked). Changing it is a `deploy/Caddyfile` change for a later mission. If it changes, the doc's clause goes, and "we hold nothing else about you" could return to the page.
- **For M13.** `db/schema.sql:91` says each profile saved a round; 4 of the 7 hold none.

## Architecture review (Fable)

2026-11-15. I checked the advisor's points against the code on `83eef270`.

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX: none. Both of its conditional checks came back clean:
1. **`./scripts/db` transaction.** With no args, `./scripts/db` opens an interactive psql (`scripts/db:2-3`), so `BEGIN; DELETE; DELETE; COMMIT;` runs on one connection. No pool mode is set anywhere in the repo, so PgBouncer uses its default, session mode. In either session or transaction mode, an explicit transaction stays on one server connection. `./scripts/db -1 -f file.sql` also works.
2. **Pinned strings outside `src/site`.** A grep of `deploy/check.sh`, `scripts/` (including `e2e-site.mjs` and `site.mjs`), `.github/` and `src/` outside the site found none of the removed strings ("your account", "sign in", "signing in", "clerk.com", the old description, "matches without reasoning"). Nothing fails after the text changes.

MISSED (for the planner's Steps and Verification; none needs an architect revision):
1. **The home page and assets stay the same bytes after the text edits.** The release smoke wants `/` byte-identical to its pre-merge record, and `/site/*` is served immutable. Add a Verification line: after all edits, `diff -rq site-before out/site` lists only `teachers/`, `privacy/`, `terms/`, plus any file that carries the Privacy description. If `index.html` or a CSS or JS asset differs, explain it before release.
2. **`{MERGE_DAY}` is a placeholder.** The implementing commit writes a real date (that session's UTC day) on Privacy and Terms. The release step resets both to the merge's UTC day before the final Verification.

SHOULD-CONSIDER:
1. **"All from the owner's own test accounts".** The owner said that about 3 profiles and 177 solves; the baseline found 7 and 188, and H20 is still open. Word the doc so it attributes only what he said, e.g. "the owner's own test accounts (owner, 2026-11-14; 4 result-less profiles unconfirmed, H20)", or update it when H20 is answered.
2. **Privacy bullet 3 against deviation (b).** "Nothing about how you play is kept in our database" now sits just above "Rounds played without one were saved too … are being deleted". It reads as now versus then, but list the pair in the Summary's deviations for the owner.
3. **Clerk's production instance still holds former users' emails** until the owner deletes it. The page drops Clerk, as the brief says. Put this in the Summary as a note for the owner, not as a page edit.
4. **Doc length.** About 40 lines against the brief's 15 to 25. Record the overrun in Decisions (the SQL block and the Caddy clause the brief asks for), or trim the dev-copy clause.
5. **The doc's step 3.** Say "the interactive shell (`./scripts/db`)", so the owner knows where to paste the block and can read the `SELECT` output before running the `DELETE`s. Keep deviation (d)'s wording unless a simpler one satisfies the month rule in all four places.

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

- **Baseline row counts (7 profiles / 188 solves vs the brief's 3 / 177): continue, don't stop the Privacy part.** The stop rule exists to catch something still writing; no row is newer than 2026-10-01 04:24 UTC (profiles 2026-09-26), so nothing writes. The owner's "3" matches the 3 profiles that hold results; the other 4 hold only a Clerk id. The extra rows don't change any page sentence. Deletion doc must not say "3 profiles"/"177"; it gives no counts (or today's) and attributes "owner's test accounts" to the owner. Non-blocking FYI handoff item H20 asks him to confirm the 4 result-less profiles are his.
- **Month wording:** overall `max(solved_at)` = 2026-10-01 → Decision rule gives **"until early October 2026"** (heading, section, "Deleting your data", deletion doc). Account-linked rows end 2026-09-30. Architect to confirm wording.
- **Note for architect:** 165 of the old rows have no `player_id` (anonymous rounds, saved plan 041 → 2026-10-01, `db/schema.sql:100-101`); they hold no identifier (no IP/name column). Brief's "results of rounds played with an account were saved" is true but leaves those out; any added sentence is a wording change bounded by the Decision rules.

## Log

- 2026-11-15 18:27 UTC · Baseline on `83eef270`: M11 live, typecheck/lint 0, test 76/76, site E2E 444/444, live pages = build, hosts = Wikimedia only, old rows 7/188 (max 2026-10-01; nothing writes; H20 FYI).
- 2026-11-15 18:45 UTC · Architecture: architect wrote findings + exact text for Screenshot/config/Privacy/Teachers/Terms + deletion doc; "until early October 2026" confirmed; new risk: Caddy logs IP on 502 (wording avoids "nothing else"); trial bot careful 96–98%, random 20%, autoguess 28–37%. Plan only, no code.
- 2026-11-15 19:05 UTC · Fable review: APPROVE_WITH_CHANGES, MUST-FIX none (scripts/db txn ok; no pinned strings outside src/site); 2 MISSED for Steps (asset diff, real date); 5 SHOULD-CONSIDER. Plan only.

## Summary
