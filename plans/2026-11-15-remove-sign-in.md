---
mission: remove-sign-in
project: critter-connect
branch: agent/remove-sign-in
status: active
started: 2026-11-15 15:51 UTC
---

# Mission: Remove sign-in: Clerk, /login, the journal route and the server merge (Critter Connect, audit M11)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

Mission M11 of the codebase audit (vault `research/critter-connect/codebase-audit.md`). Read finding D3, the M11 entry and "What every mission shares" under "## Proposed follow-up missions" in full, and S14, S6, Q13, Q16 and Q17 for context. The owner's answers (Notes) override the audit where they differ. Quote text when you find a site: the line numbers below are from `origin/main` at `af4b0453`, and M4, M7, M8, M10, M5 and M9 merge before this mission and shift them. When it's done:

1. **The game has no Clerk.**
   - Deleted: `src/proxy.ts`, `src/pages/login.tsx`, `src/app/api/clue-game/journal/route.ts` (with its folder), and `.claude/skills/playtest/scripts/create-test-player.mjs` (with its folder, which holds nothing else).
   - `npm uninstall @clerk/nextjs`. No `@clerk/*` package is left in `package-lock.json`.
   - `src/pages/_app.tsx`: the `import { ClerkProvider } from '@clerk/nextjs';` line goes, and `<ClerkProvider>…</ClerkProvider>` becomes a fragment around the same `<Head>` and `<MotionConfig>`. Nothing else in the file changes.
   - `src/components/globe/GlobeScreen.tsx`: the `import { SignInButton, Show, UserButton } from '@clerk/nextjs';` line and both `<Show when="signed-out">…</Show>` and `<Show when="signed-in">…</Show>` blocks go. The header keeps the wordmark, the "N of M animals found" line and the **Anywhere** link as they are.
   - After the deploy, no page on `play.critterconnect.org` makes a request to a Clerk host, its HTML names none, and no response carries an `x-clerk-` header.
2. **The journal route and the server merge are gone; the merge rule stays, as `mergeJournals`.**
   - `src/components/clueGame/useJournal.ts` loses `useAuth`, the `saved` state, the effect that GETs `'/api/clue-game/journal/'`, the effect that calls `mergeServerJournal`, and every import only they used (`getJson`, `ServerJournalEntry`, `mergeServerJournal`). Its doc comment loses the sentence about a signed-in player's saved solves. How it reads, records and saves the journal and the records (including anything M9 added for A17, such as a re-read before each save or a `storage` listener) doesn't change.
   - `src/clueGame/journal.ts`: `ServerJournalEntry` is deleted. `mergeServerJournal` becomes **`mergeJournals(local: Journal, other: Journal): Journal`**, a pure function with the rule M7 left: for each entry of `other`, the larger `timesSolved`, the lower `bestMoves`, the earlier `firstSolvedAt`, the later `lastSolvedAt`, and the local `commonName`, `className` and `sharpEyes` when local has them (an entry only in `other` is taken as `other` has it, except that `sharpEyes` comes from local only, as today). Entries only in `local` are unchanged. Its doc comment says it merges two journals, for the planned transfer of a journal by QR code or link, and that it is safe to repeat. The file's header says the journal is kept on the device only and names `mergeJournals`. In `JournalEntry`'s `sharpEyes` comment, "On this device only (the server keeps no badges)." becomes "On this device only.".
   - **If M9 already added a function that merges two `Journal`s** (for A17's save-time merge), that one function is kept and named `mergeJournals`, its callers and tests follow the name, and `mergeServerJournal` is deleted. If M9's rule differs from the rule above on any field, keep M9's rule and record the difference in the plan and the Summary.
   - `tests/clueGame/journal.test.ts`: M7's unit case for `mergeServerJournal` becomes a `mergeJournals` case with the same expected values, its server entries rewritten as a `Journal`. Two cases are added: an animal only in `other` is added, and `mergeJournals(mergeJournals(a, b), b)` deep-equals `mergeJournals(a, b)`. All three are written first and seen failing on the missing export (the repo's tests-first rule).
   - After the deploy, `/api/clue-game/journal/` answers 404.
3. **`/login` redirects to the globe.** In `next.config.mjs`'s `redirects()`, beside the `/clue-match` entry, add `{ source: '/login', destination: '/', permanent: true }` with a one-line comment: Clerk's settings still name `/login` as the sign-in page until the owner deletes the instance. With `trailingSlash: true`, `/login/` answers 308 with `Location: /`, as `/clue-match/` answers 308 `Location: /explore` today. `deploy/Caddyfile` doesn't change: its `@game` matcher already forwards `/login /login/*` from `critterconnect.org` to `play.`, as it does `/clue-match`.
4. **Every player's Field Journal keeps working.** Its storage (`clue-match:journal:v1`), `parseJournal`, `recordSolve` and the records don't change, and two checks prove a journal stored before the change survives it:
   - **E2E** (Definition of done): a journal set in storage before the page loads is counted on the globe and left byte-for-byte as stored.
   - **Live, before and after the deploy** (Release): the same journal, written into a kept Chrome profile on the live site before the merge, is still there and counted after the deploy.
5. **No Clerk name or sign-in step is left in config, CI, docs or agent files.** Each site and its new text:
   - `.github/workflows/ci.yml`: the two `env` lines `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.E2E_CLERK_PUBLISHABLE_KEY }}` and `CLERK_SECRET_KEY: ${{ secrets.E2E_CLERK_SECRET_KEY }}` go; the comment "Typecheck + production build. The build loads route modules but never queries, and needs no Clerk keys." ends at "never queries."; the sentence "Next dev needs both keys of Clerk's dev instance." goes. Nothing else in the file changes.
   - `Dockerfile`: every `ARG NEXT_PUBLIC_CLERK_*` line goes (M4 already removed `…_AFTER_SIGN_IN_URL`); the header sentence "NEXT_PUBLIC_* values are baked into the browser bundle at build time, so they are build args; server secrets come in at run time." becomes "Settings come in at run time (deploy/app.env)."; "No Clerk key or database needed." becomes "No database needed.".
   - `deploy/docker-compose.app.yml`: the build arg `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}` goes (`GIT_COMMIT` stays); the header's "in .env, APP_DOMAIN, the build-time NEXT_PUBLIC_* values and DB_NETWORK if not postgis_backend" becomes "in .env, APP_DOMAIN and DB_NETWORK if not postgis_backend".
   - `deploy/app.env.example`: the "Clerk production instance" block goes with the blank line before it, and so does "Build-time NEXT_PUBLIC_* values go in the stack's .env.". It keeps its header and the `DATABASE_URL` block.
   - `.env.example` (from a shell): the "Clerk Auth (Required)" heading block and its lines go. It keeps the Database heading and `DATABASE_URL`.
   - `eslint.config.mjs`: the site guard's comment says "stays free of Next.", its pattern group is `["next", "next/*"]` and its message "The website (src/site) is static HTML: no Next.".
   - `AGENTS.md`: "- Auth: Clerk" (Project Stack) and the line starting "- Auth: Clerk (`src/pages/_app.tsx`, `src/proxy.ts`)" go; "Env (`.env.local`): `DATABASE_URL`, Clerk keys." becomes "Env (`.env.local`): `DATABASE_URL`."; the Data line drops "`GET /api/clue-game/journal` (signed-in journal sync)"; the Website line's "No Next or Clerk there (ESLint guard)" becomes "No Next there (ESLint guard)"; the Where Things Live intro's "`/clue-match` redirects" becomes "`/clue-match` and `/login` redirect".
   - `CODING_STANDARDS.md`: "(Postgres, fetch, Clerk)" becomes "(Postgres, fetch)".
   - `README.md`: the stack line drops ", Clerk (sign-in)"; "`.env.local` needs `DATABASE_URL` and Clerk keys." becomes "`.env.local` needs `DATABASE_URL`."; the routes line drops `clue-game/journal`.
   - `CONTEXT.md`: the Journal line (M7 rewrote "(and synced when signed in)") reads "The player's record of the animals they've found or named, kept on the device only."
   - `docs/CLUE_MATCH.md`: the opening "No sign-in needed, and no round is saved … when signed in, it also pulls the player's solves saved before 2026-10-01." becomes "There are no accounts and no round is saved: the game only reads from the server. The Field Journal lives on the device." (keep any later sentence of that paragraph that M7 or M9 left, unless it names sign-in); the Data row drops "`GET /api/clue-game/journal` (a signed-in player's solves)".
   - `docs/DRIZZLE_ORM_GUIDE.md`: the journal route's bullet goes, "There are 9" says the new count (the `db.execute` calls in `src/` outside `src/db/index.ts`), and "(`count(*)::int`, journal route)" becomes "(`count(*)::int`)".
   - `docs/DATABASE_ACCESS.md`: "(GitHub secret `E2E_DATABASE_URL`, plus Clerk's dev instance keys `E2E_CLERK_PUBLISHABLE_KEY` and `E2E_CLERK_SECRET_KEY`)" becomes "(GitHub secret `E2E_DATABASE_URL`)"; the settings block keeps only the `DATABASE_URL=` line.
   - `docs/DEPLOY.md`: "a password or the Clerk dashboard" becomes "or a password"; the One-time setup step "**Owner. Clerk production instance:** …" goes and the list is renumbered; step "Settings on the VPS" asks for `APP_DOMAIN` only in `.env` and `DATABASE_URL` (the `critter_app` password) only in `deploy/app.env`; "(no Next, Clerk or other framework script)" becomes "(no Next or other framework script)"; the Remaining owner task "Sign up on play.critterconnect.org to test Clerk production sign-in." goes and the list is renumbered. Any Clerk step M5 added (a "rebuild from nothing" section, say) goes too. **The dated "## First deploy (2026-09-26)" section stays as it is**: it is a record.
   - `.claude/skills/playtest/SKILL.md`: the Preflight bullet "Signing in is optional and saves nothing …", with its code block and the "If the account is gone" line, goes. Nothing else in the skill changes.
   - `db/schema.sql`, comments only: "(the journal route reads them)" becomes "(nothing reads them now)", and "(db/analysis/clue-match/07_solve_stats.sql) and the journal route." ends at "07_solve_stats.sql).".
6. **The owner's part is one handoff item**, added after the smoke tests pass (Release), in `/srv/critter-ai/handoff/critter-connect.md`, titled "Delete Clerk: sign-in is gone from the game", `Blocks: nothing`. Its steps:
   1. Clerk dashboard: delete the Critter Connect application (its production and development instances, their keys and its users, the owner's three test accounts). Their rows in the game's database stay for mission M13.
   2. Namecheap → Domain List → critterconnect.org → Manage → Advanced DNS: delete Clerk's CNAME records, after step 1. List each name and target that `dig +short CNAME <name>.critterconnect.org` still answers when the item is written; on 2026-11-14 that was `clerk` (`frontend-api.clerk.services.`), `accounts` (`accounts.clerk.services.`), `clkmail`, `clk._domainkey` and `clk2._domainkey` (`…clerk.services.`).
   3. Hetzner, `/opt/critter-connect/deploy/app.env`: delete every line starting `CLERK_` or `NEXT_PUBLIC_CLERK_`; `/opt/critter-connect/.env`: delete `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`. Nothing reads them since the deploy; no restart is needed.
   4. Google Cloud console → Google Auth Platform → Clients: delete the OAuth client that Clerk's "Sign in with Google" used. The Branding page then serves nothing; keeping or deleting it is his choice.
   5. Optional: the Clerk lines in his WSL and Windows `.env.local` files, the Oracle VPS's `/srv/critter-ai/critter-connect/.env.local` and the dev-copy file can go (the control room can do the VPS ones).

   Never put a key or value in the item.
7. **CI's two Clerk secrets are deleted**, after the smoke tests pass: `gh secret delete E2E_CLERK_PUBLISHABLE_KEY` and `gh secret delete E2E_CLERK_SECRET_KEY` (the token has the `repo` scope). Then `gh secret list` names neither. If the release was reverted, they stay, because the reverted `ci.yml` reads them.
8. **Nothing a saved game holds changes**, so `ANIMAL_RULES.version` stays as it is: `git diff origin/main -- src/clueGame/animalBoard.ts src/components/animalBoard/savedGame.ts` is empty. No database change: no table, row, grant or view, live or dev copy.

### Why

Since 2026-10-01 nothing is saved under an account, so signing in gives a player nothing, and the owner decided to remove it (Q16). Meanwhile every player's browser downloads Clerk's script from `clerk.critterconnect.org`, Clerk's middleware runs on every request, the server needs a Clerk secret and CI two more, and the Privacy page has to describe an account that keeps nothing. Removing it takes away a service, a dependency, three secrets and a hook on every request. The Field Journal in the browser is the one thing players keep, so it gets the strictest proof.

### Scope

In:
- Deleted: `src/proxy.ts`, `src/pages/login.tsx`, `src/app/api/clue-game/journal/`, `.claude/skills/playtest/scripts/`
- `src/pages/_app.tsx`, `src/components/globe/GlobeScreen.tsx`, `src/components/clueGame/useJournal.ts`, `src/clueGame/journal.ts`
- `tests/clueGame/journal.test.ts`, and the fixture file Definition of done names if M7's is missing
- `scripts/e2e.mjs` (the new checks and the request listener they need)
- `next.config.mjs` (the one redirect), `eslint.config.mjs` (the site guard)
- `package.json` and `package-lock.json` (what `npm uninstall @clerk/nextjs` changes)
- `.github/workflows/ci.yml`, `Dockerfile`, `deploy/docker-compose.app.yml`, `deploy/app.env.example`, `.env.example` (from a shell)
- `AGENTS.md`, `CODING_STANDARDS.md`, `README.md`, `CONTEXT.md`, `docs/CLUE_MATCH.md`, `docs/DRIZZLE_ORM_GUIDE.md`, `docs/DATABASE_ACCESS.md`, `docs/DEPLOY.md`, `.claude/skills/playtest/SKILL.md`
- `db/schema.sql` (the two comments only)
- After a good release only: the two GitHub secrets (Goal 7) and the handoff item (Goal 6)
- Outside the repo, never committed: the live-check script and its Chrome profile under `/srv/critter-ai/agent-state/missions/remove-sign-in/`

Out:
- **The website, `src/site/`.** Mission M12 rewrites the Privacy, Terms and Teachers pages next, Clerk lines included (`config.ts`'s comment too). Change a file there only if the build fails because of this mission; it shouldn't, since the ESLint guard keeps Clerk out of it.
- **The database.** No table, row, grant or view changes, live or dev copy; `profiles` (with `clerk_user_id`), `clue_match_solves` and their rows stay for M13. No file under `db/` changes except the two comments in `db/schema.sql`. No content build.
- **The journal's storage**: `parseJournal`, `recordSolve`, `JOURNAL_STORAGE_KEY`, the records and their key, and whatever M9 made `useJournal` do at save time.
- `deploy/Caddyfile`, `deploy/check.sh`, `deploy/deploy.sh`; the dated "First deploy (2026-09-26)" section of `docs/DEPLOY.md`.
- `.gitignore`: its `clerk-live.env` line stays, because it keeps a file of live keys out of git on any machine that still has one.
- `public/branding/critterconnect-oauth-logo.png` and its note (D23, mission M9's). If they're still there, the Summary says nothing in the game can use them now.
- Hetzner's `/opt/critter-connect/.env` and `deploy/app.env` (the owner's), every `.env.local` and the dev-copy secrets file (never read, print or edit them), the Clerk and Google consoles and DNS (the owner's). GitHub settings other than the two secrets.
- The site screenshots (`npm run site:shots`), even if they show the Sign in button: the owner set retaking them aside.
- `plans/`, `docs/research`, `docs/playtests` (records), and every other audit finding, S2 included.

### Definition of done

- **Baseline, before any change:**
  - **What merged first.** On a fresh `origin/main`, M6's save route is gone (`src/app/api/clue-game/solves/` doesn't exist), and `src/clueGame/journal.ts` has no `Sighting` (M7). If either fails, stop and add a handoff item.
  - **Fresh greps.** Re-run D3's "Roots checked" greps and the final grep below, and record their output in the plan. Compare the file list with the inventory in Notes. A new reader of Clerk or of the journal route that exists only for sign-in goes too; any other new reader stops that part (note it).
  - **Packages.** Record `npm audit --omit=dev` and `npm ls --omit=dev --package-lock-only @clerk/nextjs @clerk/backend @clerk/shared @clerk/react`.
  - **Old accounts, for M13.** Two read-only queries against the live database, outside any dev-copy subshell: `./scripts/db "SELECT count(*), min(created_at), max(created_at) FROM profiles"` and `./scripts/db "SELECT (player_id IS NOT NULL) AS has_player, count(*), max(solved_at) FROM clue_match_solves GROUP BY 1"`. Record them; change nothing. A row newer than 2026-10-07 is a note for M13 in the Summary, not a stop.
  - **Tests.** Record `npm test`'s pass count.
  - **Baseline E2E** in the dev-copy block below: copy its artifact to `/srv/critter-ai/agent-state/missions/remove-sign-in/baseline-e2e/` and record its check count.
- **The new E2E checks**, in `scripts/e2e.mjs`, are written before the code changes and run once on the unchanged code; record each result and how many `check()` calls they add.
  - `check('no request goes to Clerk', …)`: a CDP `Network.requestWillBeSent` listener on the E2E's page records every request over the whole run; none has a hostname containing `clerk`. Placed beside "no failed requests". Under `next dev` with the dev copy's Clerk dev key, ClerkProvider loads its script from a `*.clerk.accounts.dev` host, so it must fail on the unchanged code. If it passes there, the run's env has no Clerk key: record that, and keep the check.
  - `check('/login/ redirects to the globe', …)`: from Node, `fetch(BASE + '/login/', { redirect: 'manual' })` answers 308 with `location` `/`. Fails first (200).
  - `check('the journal route is gone', …)`: from Node, `fetch(BASE + '/api/clue-game/journal/')` answers 404. Fails first (200). Both fetches run from Node, so they don't reach the page's failed-request list.
  - `check('a journal stored before this change is counted on the globe and kept as stored', …)`: on its own page load after every existing check (so their counts stay as they are), set `clue-match:journal:v1` with `evaluate` to M7's fixture `tests/clueGame/old-journal.json`, then navigate to `/`, the way the existing journal checks set storage and navigate (not `addScriptToEvaluateOnNewDocument`, which would reset storage on every load). The header reads `` `${n} of` `` where `n` is the number of fixture entries `parseJournal` keeps (all of them since M7), and after the places have loaded and 3 s have passed, the stored string equals the one set. Signed out, the unchanged code writes nothing on the globe either, so this check passes before and after: it guards the change. Record that. If M7's fixture is missing, first write `tests/clueGame/pre-sign-in-journal.json` with today's `recordSolve` on the fresh `origin/main`: at least three real animals from `db/content/animals/`, one with a `className` and a Sharp eye.
- **After the deletions,** run `rm -rf .next .next-e2e .test-dist` before the typecheck: `tsconfig.json` includes the generated `.next-e2e` types, which name the deleted page and route.
- **On the final commit:**
  - `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` (with `DATABASE_URL=postgres://build@127.0.0.1:1/build`, as CI runs it), `npm run site:build` and `npm run e2e:site` exit 0. `npm test` passes the baseline's count plus the two new `mergeJournals` cases.
  - `npm ls --omit=dev --package-lock-only @clerk/nextjs @clerk/backend @clerk/shared @clerk/react` lists none (npm exits 1 when nothing matches; that exit is the pass), and `grep -c '"node_modules/@clerk/' package-lock.json` prints 0. `npm audit --omit=dev` is recorded again.
  - `grep -c "source: '/login', destination: '/', permanent: true" next.config.mjs` prints 1.
  - `db/schema.sql` changes comments only: `git diff -U0 origin/main -- db/schema.sql | grep -E '^[+-]' | grep -v -E '^(\+\+\+|---)' | grep -v -E '^[+-]\s*--'` prints nothing.
  - This prints nothing:
    ```
    git grep -n -i -E 'clerk|SignInButton|UserButton|useAuth|isSignedIn|mergeServerJournal|ServerJournalEntry|clue-game/journal|journal route|create-test-player|\bsigned[- ]in\b|\bsign[- ]?in\b|\bsign[- ]?up\b' -- . ':!plans' ':!docs/research' ':!docs/playtests' ':!package-lock.json' ':!src/site' ':!db' ':!.agents' ':!.gitignore' ':!docs/DEPLOY.md' ':!scripts/e2e.mjs' ':!next.config.mjs'
    ```
    The exclusions: `plans/`, `docs/research` and `docs/playtests` are records; `src/site` is M12's; `db/` holds the `profiles` table and its `clerk_user_id` column (M13) and practice SQL; `.agents/` holds a vendored skill template whose "sign in" is generic; `.gitignore` keeps `clerk-live.env`. The last three are checked on their own:
    - `docs/DEPLOY.md`: `awk '/^## /{s=$0} tolower($0) ~ /clerk|sign-in|signed in|sign up|clue-game\/journal/ && s !~ /^## First deploy/' docs/DEPLOY.md` prints nothing (only the dated record may name Clerk).
    - `scripts/e2e.mjs` and `next.config.mjs`: the same `git grep` on each lists only the new checks (with their listener) and the `/login` redirect with its comment.
  - `git diff origin/main -- src/site deploy/Caddyfile deploy/check.sh .gitignore` is empty unless a `src/site` build failure forced a change (then the plan says which and why).
- **`npm run e2e:fresh` passes** with the baseline's check count plus the new checks' count, **against the dev copy `phaser_june_dev`, never `.env.local`, with no content build**:
  ```
  ( set -a; . /srv/critter-ai/agent-state/secrets/critter-connect.env.local.dev-copy; set +a
    [ "$(psql "$DATABASE_URL" -tAc 'select current_database()')" = phaser_june_dev ] || exit 1
    CHROME_PATH=$HOME/.local/bin/chrome-nosandbox npm run e2e:fresh )
  ```
  Never print a connection string or `cat` that file. If the guard fails, stop and add a handoff item. Save the final run's artifact as `/srv/critter-ai/agent-state/missions/remove-sign-in/final-e2e/`. Compare `01-globe.png` with the baseline's by eye (the globe spins): only the Sign in button is gone from the header, and nothing else moved. The PR's CI `e2e` job, which no longer gets the Clerk secrets, is the proof that the game needs no Clerk key.
- **Release** (critter-connect's release rules: CI's `check` job must pass, a failed `e2e` job is rerun once and then reported, and a failed deploy or smoke test is reverted and redeployed).
  - **The live-check script.** Write `/srv/critter-ai/agent-state/missions/remove-sign-in/live-check.mjs` (never committed). It imports `launchChrome`, `connect` and `openPage` from the worktree's `scripts/cdp.mjs` by absolute path, runs with `CHROME_PATH=$HOME/.local/bin/chrome-nosandbox` and the kept profile `…/remove-sign-in/live-profile/`, and ends Chrome with `Browser.close` so the profile is written. Mode `seed` stores the journal fixture (Goal 4's) in `clue-match:journal:v1` on `https://play.critterconnect.org/`. Every run then loads `https://play.critterconnect.org/` and `https://play.critterconnect.org/explore/`, each until its load event plus 15 s, and saves a JSON report: every request URL (`Network.requestWillBeSent`), the globe header's "N of M animals found" text, and the raw `clue-match:journal:v1` value.
  - **Baseline, just before the merge**, in the plan:
    - The live-check script, once with `seed` and once more without it (a fresh launch, which proves the profile keeps storage): save the second report as `live-before.json`. It must show requests to `clerk.critterconnect.org` (proof the listener sees them) and the header counting the fixture; if not, fix the script before merging.
    - `curl -s https://play.critterconnect.org/ | grep -c -i clerk` and the same for `/explore/` (both above 0 on 2026-11-14), and `curl -sI https://play.critterconnect.org/version.txt | grep -c -i '^x-clerk-'` (2 on 2026-11-14).
    - The status codes of `/`, `/explore/`, `/login/` (200) and `/api/clue-game/journal/` (200) on `play.`, and `curl -sL -o /dev/null -w '%{http_code} %{url_effective}' https://critterconnect.org/login/`.
    - The `key` list of `/api/places/` and the lengths of `species`, `clues` and `facts` in `/api/clue-game/pool/`.
  - **Smoke tests after the deploy**, each compared with that record. Retry a check up to three times, 30 s apart, before it counts as failed (network blips):
    - `bash deploy/check.sh` passes, and `version.txt` shows the merge commit.
    - The live-check script, without `seed`: no request URL has a hostname containing `clerk`; the header text equals `live-before.json`'s; the stored journal is byte-for-byte `live-before.json`'s. Save it as `live-after.json`.
    - Both `grep -c -i clerk` counts are 0, and `version.txt`'s response has no `x-clerk-` header.
    - `curl -s -o /dev/null -w '%{http_code} %{redirect_url}' https://play.critterconnect.org/login/` prints `308 https://play.critterconnect.org/`, and `https://critterconnect.org/login/` followed with `-L` ends `200 https://play.critterconnect.org/`.
    - `/api/clue-game/journal/` answers 404; `/` and `/explore/` 200.
    - `/api/places/` has the same keys and `/api/clue-game/pool/` the same three lengths.
  - **Then**, only if no revert was needed: delete the two secrets (Goal 7) and add the handoff item (Goal 6), and record both under `## Release`.
- **The Summary** lists the deleted files and names; both `npm audit` results; the test counts; the E2E runs, with each new check's result on the unchanged code; the CI attempts; `live-before.json` against `live-after.json` and the other smoke results; the secrets deleted; the handoff item's number; the two account queries (for M13); the lines `git grep -n -i -E 'clerk|sign' -- src/site` still prints (for M12); the OAuth logo note if it applies; and any rule difference from Goal 2's M9 clause. It says that `ANIMAL_RULES.version` didn't change and why, and that no production content build is needed.

### Decision rules

- Delete only what Goal names. Anything else that looks dead is a note in the plan, not an edit.
- **The journal is player data.** A change that makes `parseJournal` keep, drop or alter any stored entry differently is a bug; stop and fix it, never adjust a check to fit.
- If removing `ClerkProvider` changes anything on screen besides the header's Sign in button (E2E screenshots, a new console error, a layout shift), find out why before going on.
- A test that pinned only deleted code goes with it. Any other failing test is a bug in the change, not a test to update.
- **Flaky E2E steps:** audit A10 records timing checks that fail by themselves (M8 works on them). If a local E2E fails only outside this mission's checks, rerun it once. Never waive a new check.
- If the release rebase changes `useJournal.ts`, `journal.ts`, `GlobeScreen.tsx`, `_app.tsx`, `next.config.mjs` or `scripts/e2e.mjs`, retake the final E2E on the new base.
- A smoke test that fails after its retries is a failed smoke test: revert, redeploy, and don't touch the secrets or add the handoff item. Write what failed in the plan and the Summary.

### Notes

- **Owner answers (Danby, 2026-11-13 and 2026-11-14), which override the audit.**
  - Q16: remove sign-in. Keep the merge rule as a pure function for a later mission's no-account journal transfer by QR code or link, which merges two journals.
  - The local Field Journal stays in the browser after sign-out (handoff H14: 12 of 76 finds kept after he signed out on 2026-11-14).
  - `/login` redirects to `/` permanently, since Clerk's production instance still names `https://play.critterconnect.org/login` as its sign-in path until he deletes it.
  - Q13: no Clerk webhooks, an empty redirect allowlist, sign-up through Clerk's Account Portal (`https://accounts.critterconnect.org/sign-up`), subdomain allowlist `play.critterconnect.org`. Nothing in the app depends on Clerk beyond what Goal lists. He deletes the instance, and its DNS records, after the deploy.
  - The three old accounts are his test accounts; their rows stay for M13.
  - The Privacy and Terms pages are M12's, the next mission.
  - The game isn't released to the public yet.
- **What merged first:** M2, M6 (server cleanup: deleted the save route and `player.ts`), M1, M3 (agent files: rewrote parts of `AGENTS.md` and the playtest skill), M4 (toolchain: removed `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` from four files, cut `.env.example` down, deleted the `clean` script), M7 (rules cleanup: removed sightings; `mergeServerJournal` lost `placeFor`; it added a unit case pinning the merge rule and the fixture `tests/clueGame/old-journal.json`; it rewrote `CONTEXT.md`'s Journal line and `journal.ts`'s header), M8, M10, M5 (deploy and CI: may have changed `ci.yml`, `deploy/check.sh` and `docs/DEPLOY.md`) and M9 (screens cleanup: A17 may have changed how `useJournal` saves; D23 the OAuth logo; S11 `docs/CLUE_MATCH.md`). Re-read every site on a fresh `origin/main`, and skip what an earlier mission already did.
- **Checked at `af4b0453` (2026-11-14):**
  - `@clerk/nextjs` is imported by 6 files in `src/`: the journal route, `useJournal.ts`, `GlobeScreen.tsx`, `_app.tsx`, `login.tsx` and `proxy.ts`. Outside `src/site`, `db/`, `plans/` and the records, the final grep's pattern hits 23 files, each a Goal site.
  - The journal route has one caller (`useJournal.ts`), and no code links to `/login`. No CSP, Caddy rule or `deploy/check.sh` line names Clerk. Only the `x-clerk-*` headers and the HTML's two scripts (`clerk-js` and `ui` from `clerk.critterconnect.org`) show Clerk on the live site.
  - Live: `/login/` and `/api/clue-game/journal/` answer 200 with `X-Clerk-Auth-Status: signed-out`; `/clue-match/` answers 308 `Location: /explore`; `https://critterconnect.org/login/` answers 308 to `https://play.critterconnect.org/login/`.
  - `gh secret list` shows `E2E_CLERK_PUBLISHABLE_KEY` and `E2E_CLERK_SECRET_KEY` beside `E2E_DATABASE_URL`. The token's scopes include `repo` and `workflow`, so it can delete the secrets and push `ci.yml`.
  - The domain's DNS is at Namecheap (`dns1.registrar-servers.com`).
- **Why the redirect lives in `next.config.mjs`:** that's where `/clue-match` → `/explore` is, and Caddy only forwards the website host's old game paths to `play.`, so both old addresses take the same route.
- **The deploy needs nothing from the owner first.** The image stops passing the Clerk build arg, and the extra lines left in Hetzner's `.env` and `deploy/app.env` are read by nothing, so the deploy works before he removes them.
- **Why the merge has no caller after this.** It's kept on purpose for the planned transfer (owner); its tests are its only users until then, unless M9's save-time merge already calls it.
- **Clerk's script never blocked play** (D3's evidence): with Clerk's host down a player still played, without the Sign in button. So the visible change is only the button.
- **`.env*` files:** Claude Code's edit hook blocks every file named `.env`, `.env.*` or `*.env`, so edit `.env.example` from a shell. `deploy/app.env.example` isn't blocked.
- **Chrome:** the shared wrapper `~/.local/bin/chrome-nosandbox` (named in `~/AGENTS.md`). Don't write a copy.
- **The pre-push hook** runs typecheck and lint.
- **Size:** about 14 sessions (the audit's estimate).

### Review corrections (2026-11-14): these override any text above that conflicts

- **The merge rule is M9's, in every case.** `mergeJournals(local, other)` keeps every animal from either journal, the larger count, the lower best, the earliest and latest dates, and the **larger `sharpEyes`**. It doesn't take `sharpEyes` from local only: M9's save-time merge uses this function, and taking local only would erase a second tab's badges.
  - **Baseline:** check whether `export function mergeJournals` exists in `src/clueGame/journal.ts`, and record which branch applies.
  - **If it exists (M9 merged):** don't change it. Delete `mergeServerJournal` and `ServerJournalEntry`, port M7's merge case to `mergeJournals`, and add only an idempotence case (merging a journal with itself changes nothing). That case is recorded as passing at once. Expected `npm test` count: the baseline's, minus the server-journal cases deleted, plus 1.
  - **If it doesn't exist:** create it with the rule above, with three cases written first, all seen failing on the missing export. Expected count: the baseline's, minus the deleted cases, plus 3.
- **`docs/CLUE_MATCH.md`:** delete the sentence "The journal counts only `solved` rows." M9 leaves it to this mission.
- **`docs/DEPLOY.md`:** if M5 deleted the "First deploy (2026-09-26)" record or reworded the Clerk sign-up owner task, skip those edits. The final check still holds.
- **Secrets:** first confirm `git grep -n E2E_CLERK origin/main` prints nothing after the merge. Then use `gh secret delete <name> -R kc0588615/phaser-june` for each.
- **The no-Clerk-request check** covers every page the E2E run opens, M9's second page included. Load the old-journal page before the end-of-run checks, so they cover its requests.
- **Live headers:** record both `x-clerk-*` and `x-middleware-rewrite` (and whether `Cache-Control` is present) on `/` before and after the deploy. After: no `x-clerk-*` and no `x-middleware-rewrite`.
- **Cut the two live-database count queries.** M12 and M13 take their own.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: consult the advisor (Fable 5.2) on the Architecture section
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

From `agent/remove-sign-in` at `45cf474f` (= `origin/main` `f1826f56`, fetched 2026-11-15 16:00 UTC).

- **What merged first:** `src/app/api/clue-game/solves/` gone (M6; `src/app/api/clue-game/` holds `journal pool range ranges`); `src/clueGame/journal.ts` has no `Sighting` (M7). Both pass.
- **Merge branch (Review corrections):** `export function mergeJournals(local: Journal, other: Journal): Journal` exists (`src/clueGame/journal.ts:67`, M9), and `saveSolve` calls it (`:107`). So the **M9 branch applies**: keep `mergeJournals` as is; delete `mergeServerJournal`, `toJournalEntry` (its only helper, `:88`) and `ServerJournalEntry`; port M7's case; add one idempotence case.
  - M7's case today: `tests/clueGame/journal.test.ts` "saved solves merge in: the larger count, the lower best, the earliest and latest dates, the local names, class and badges" (calls `mergeServerJournal` twice: once against `expected`, once more for "Safe to repeat"). Server entries carry `speciesId` and `placeKeys`, which `toJournalEntry` drops.
  - Existing `mergeJournals` cases (3): one-side-only, both-sides field rule, two empty.
- **OAuth logo (D23):** `public/branding/` holds only `critterconnect-logo.svg` and `critterconnect-logo-light.svg`; `critterconnect-oauth-logo.png` is gone (M9). No Summary note needed.
- **Fixture:** `tests/clueGame/old-journal.json` exists (M7), so no new fixture.
- **Packages:** `npm audit --omit=dev`: `found 0 vulnerabilities`. `npm ls --omit=dev --package-lock-only @clerk/nextjs @clerk/backend @clerk/shared @clerk/react`: `@clerk/nextjs@7.7.8` → `@clerk/backend@3.16.8`, `@clerk/react@6.14.4`, `@clerk/shared@4.29.2`. `grep -c '"node_modules/@clerk/' package-lock.json`: 5.
- **Account queries:** cut (Review corrections).
- **Checks:** `npm ci` ok; `npm run typecheck` exit 0; `npm run lint` exit 0; `npm test` **75/75** pass (6 journal cases, 1 of them the server merge).
- **Baseline E2E** (dev copy `phaser_june_dev`, guard passed): first run 1583/1584, the one failure the timing check "field guide: signs in pages turn on their own, a tap pauses them, another resumes and moves on" (`"turned":false`; audit A10 kind, outside this mission's checks); rerun once per the decision rules: **1584/1584**. Artifact `/srv/critter-ai/agent-state/missions/remove-sign-in/baseline-e2e/` (seed 7). The dev-copy env file names four Clerk vars (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`; names only read), so the no-Clerk-request check should fail on the unchanged code.

### Fresh greps (D3 roots)

- R1 `git grep -l "@clerk/nextjs" -- src`: 6 files, as Notes: journal route, `useJournal.ts`, `GlobeScreen.tsx`, `_app.tsx`, `login.tsx`, `proxy.ts`.
- R1 `git grep -l -i clerk -- . ':!plans' ':!package-lock.json' ':!docs/research' ':!docs/playtests'`: 30 files: `.claude/skills/playtest/SKILL.md`, `.claude/skills/playtest/scripts/create-test-player.mjs`, `.env.example`, `.github/workflows/ci.yml`, `.gitignore`, `AGENTS.md`, `CODING_STANDARDS.md`, `Dockerfile`, `README.md`, `db/schema.sql`, `deploy/app.env.example`, `deploy/docker-compose.app.yml`, `docs/DATABASE_ACCESS.md`, `docs/DEPLOY.md`, `eslint.config.mjs`, `package.json`, **`scripts/check-live-board.mjs`**, the 6 `src/` files, `src/site/config.ts`, `src/site/pages/Privacy.tsx`, `src/site/pages/Teachers.tsx`.
- R22 journal route: one caller, `src/components/clueGame/useJournal.ts:52` (`getJson<{ entries: ServerJournalEntry[] }>('/api/clue-game/journal/')`); other hits are docs (`AGENTS.md:56`, `README.md:25`, `docs/CLUE_MATCH.md:24`, `docs/DRIZZLE_ORM_GUIDE.md:20`) and comments (`journal.ts:48`, `proxy.ts:3`).
- R22 `/login` links: `git grep -n -E "['\"\`(]/login" -- src` gives 0 hits.
- `git grep -c -i clerk -- scripts/e2e.mjs`: no hit.
- **Final grep** (Definition of done, on the unchanged tree): 97 lines in 24 files (saved: `/srv/critter-ai/agent-state/missions/remove-sign-in/baseline-final-grep.txt`): `.claude/skills/playtest/SKILL.md` 4, `create-test-player.mjs` 9, `.env.example` 4, `ci.yml` 4, `AGENTS.md` 5, `CODING_STANDARDS.md` 1, `Dockerfile` 3, `README.md` 3, `deploy/app.env.example` 4, `deploy/docker-compose.app.yml` 1, `docs/CLUE_MATCH.md` 2, `docs/DATABASE_ACCESS.md` 5, `docs/DRIZZLE_ORM_GUIDE.md` 2, `eslint.config.mjs` 2, `package.json` 1, `scripts/check-live-board.mjs` 1, journal route 9, `journal.ts` 6, `useJournal.ts` 10, `GlobeScreen.tsx` 6, `_app.tsx` 3, `login.tsx` 2, `proxy.ts` 3, `tests/clueGame/journal.test.ts` 7.
- **Against the inventory:** one new file, `scripts/check-live-board.mjs` (M5, `cb92bcf3`), and it isn't a reader: its comment at `:10` says "page's own host (other hosts, such as Clerk's, are ignored)". It's outside Goal, but the final grep doesn't exclude it, so the comment needs " such as Clerk's," dropped for that check to pass (architect to decide). `CONTEXT.md`'s Journal line ("Signing in only merges in the finds an account saved before October 2026; nothing new is saved there.") doesn't match the final grep's pattern but is a Goal site. `docs/CLUE_MATCH.md:67` still has "The journal counts only `solved` rows." (Review corrections: delete). No new reader of Clerk or of the journal route.

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

- 2026-11-15 16:25 UTC: Baseline. Prereqs (M6, M7) pass; M9 branch (`mergeJournals` exists). typecheck/lint ok, `npm test` 75/75, E2E 1584/1584 (2nd run; 1st failed one A10 timing check). Greps recorded; one new hit, a comment in `scripts/check-live-board.mjs`.

## Summary
