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
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: consult the advisor (Fable 5.2) on the Architecture section
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

## Architecture review (Fable)

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

## Summary
