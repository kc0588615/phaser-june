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
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: consult the advisor (Fable 5.2) on the Architecture section
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none): none needed
- [x] Steps: `planner` writes Steps and Verification

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

From `agent/remove-sign-in` at `4c4c0f46` (= `origin/main` `f1826f56` + plan commits). Line numbers are this tree's. Review corrections win over the Goal text.

### Findings (ranked)

1. **The six `src/` sites are one change.** `useAuth()` (`useJournal.ts:37`) and `<Show>`/`<SignInButton>`/`<UserButton>` (`GlobeScreen.tsx:62-69`) throw outside `<ClerkProvider>` (`_app.tsx:12`); the route's `auth()` (`route.ts:19`) throws without `clerkMiddleware()` (`proxy.ts:4`, D3 R3); `npm uninstall` before the last import is gone breaks the typecheck. So deleting and editing all six, adding the `/login` redirect (so `/login/` never 404s at a commit), the uninstall, `rm -rf .next .next-e2e .test-dist` and the typecheck are **one step and one commit**.
2. **E2E wiring.** One `browser.on` listener (`e2e.mjs:118-133`) serves every page in `watched` (`:117`; the two-tab check adds its second page at `:2573`, and `setUpPage` enables Network on both). Its network branch returns early for every page except the first (`:125`), and `requests` keeps only `BASE` URLs (`:131`). So a Clerk check placed after `:125`, or one built on `requests`, would miss M9's second tab and every off-origin host. The fixture string `oldJournalRaw` is scoped to the D14 block (`:2507`).
3. **Merge rule: the M9 branch applies, with no rule difference to record.** `mergeJournals` (`journal.ts:62-86`) is exactly the Review corrections' rule: every animal from either side, the larger count, the lower best, the earliest and latest dates, local's names, local's class or else other's, and the larger `sharpEyes`. An animal on one side only is taken whole. It stays byte-for-byte, doc comment included (its comment already says "Every animal in either journal … safe to repeat"). It has a caller (`saveSolve`, `:107`), so the Notes' "no caller after this" doesn't apply.
   - M7's case (`journal.test.ts:38-88`) ports with **the same expected values**, because `toJournalEntry` (`journal.ts:88-91`) drops only `speciesId` and `placeKeys`. Worked through `mergeJournals(local, other)`: frog 5 / 9 / 09-01 / 09-20 / `AMPHIBIA` / 1; tortoise 7 / 4 / 08-01 / 10-01 / `REPTILIA` (local has no class); tiger unchanged; okapi as `other` has it.
   - Its "Safe to repeat" line (`:87`) already has Goal 2's form, `mergeJournals(mergeJournals(a, b), b)`, and Goal 2's "an animal only in other is added" case already exists (`:100-106`). So the one new case is the Review corrections' self-merge. **`npm test`: 75 − 0 (the case is ported, not deleted) + 1 = 76.**
4. **`useJournal.ts`: the brief's import list misses `mergeJournals`.** `:4` imports it only for the deleted merge effect (`:60`); `record` goes through `saveSolve` (`:71`). It goes with `getJson`, `ServerJournalEntry` and `mergeServerJournal`. `useEffect` and `useRef` stay in use.
   - What doesn't change: the hook's API `{ journal, records, record }` (`:79`; callers `AnimalGame.tsx:197` and `GlobeScreen.tsx:22`), its read path (`:44-47`) and its save path (`:65-77`).
   - Signed out, both deleted effects already return at once (`:50`, `:59`), so nothing changes for a player without an account. Removing a hook changes the hook order only between builds, which is harmless.
5. **`docs/DEPLOY.md`.**
   - Renumbering One-time setup breaks three links the brief doesn't list: `[setup step 5]` (`:97`), `[setup step 3]` (`:101`) and `[setup step 4]` (`:107`) become 4, 2 and 3.
   - M5 deleted "First deploy (2026-09-26)", so the awk check covers the whole file.
   - M5 reworded the owner task (`:128`: "Sign up on play.critterconnect.org to test Clerk production sign-in; moot once mission M11 (remove-sign-in) removes sign-in."). The Review corrections' "skip" can't apply here, because "the final check still holds" and this line fails it. So it is deleted. It is the last item, so nothing is renumbered.
6. **The DoD's screenshot expectation is wrong.** It says "only the Sign in button is gone … nothing else moved", but the header is `flex … gap-xs` (`GlobeScreen.tsx:52`) and the baseline `01-globe.png` shows `[wordmark + count] [Anywhere] [Sign in]`. Without the button, **Anywhere moves right to the edge** and the count line gets more width. That comes from the flex layout, not a regression, and it answers the "layout shift → find out why" rule in advance. No E2E check reads the right side of the header (the off-globe drag releases at x=40, `e2e.mjs:644`).
7. **`scripts/check-live-board.mjs:10`: decision: edit it.** `// page's own host (other hosts, such as Clerk's, are ignored). Up to 3 attempts, …` becomes `// page's own host (other hosts are ignored). Up to 3 attempts, …`.
   - Why: the DoD grep is the acceptance test and doesn't exclude this file.
   - After this mission the example names a host the game no longer contacts, so the comment is false, not dead code. "Delete only what Goal names" is about removing code.
   - Adding the file to the grep's exclusions would weaken the grep for any future Clerk name in `scripts/`.
   - Behaviour doesn't change (`deploy/check.sh` runs this script). Record the decision under Decisions.
8. **Generated types.**
   - `tsconfig.json:37-38` includes `.next-e2e/**/types`, and `.next-e2e/dev/types/{routes.d.ts,validator.ts}` name `/login` and the journal route (checked), so the brief's `rm -rf` is needed.
   - The untracked, gitignored `next-env.d.ts` imports `.next-e2e/dev/types/routes.d.ts` for its side effects. TypeScript 5.8.3 doesn't report a missing side-effect import (`noUncheckedSideEffectImports` is off), so the typecheck passes after the `rm`. CI has neither file.
9. **Coupling checked, nothing to change:**
   - `getJson` stays: four other files import it (`GlobeScreen.tsx:12`, `useAnimalSession.ts:22`, `RangeMap.tsx:4`, `Globe.tsx:10`).
   - `ServerJournalEntry` is used only by the route, `useJournal.ts` and the test.
   - Nothing reads `window.Clerk` outside the skill.
   - `deploy/check.sh`, `deploy/deploy.sh`, `scripts/e2e-fresh.mjs` and `scripts/e2e-site.mjs` name nothing from Clerk.
   - `src/pages` has no custom 404 page, so Next's default answers the deleted route with 404.
   - Redirects run before pages (`node_modules/next/dist/docs/…/redirects.md:39`) and pass the query through (`:43`), so `/login/?x=…` goes to `/?x=…`, which is harmless. The live `/clue-match/` → `Location: /explore` shows that a source without a trailing slash matches the slashed URL under `trailingSlash: true`, and that `Location` is relative.
10. **Smaller differences from the brief:**
    - The Dockerfile has two Clerk ARGs (`:14-15`).
    - DRIZZLE's "There are 9" becomes 8 (`db.execute` in `src/` outside `src/db/index.ts`: places 3, cluePool 3, range 1, ranges 1).
    - Once the route is gone, no `count(*)::int` is left in `src/`. The doc's advice still holds as general advice (a note only).
    - `CONTEXT.md:140` doesn't match the final grep, but it is a Goal site.
    - The OAuth logo is already gone (Baseline).

### Goal sites: current text → new text

Text that Goal 5 gives word for word is marked "as Goal".

- **Deleted:** `src/proxy.ts`, `src/pages/login.tsx`, `src/app/api/clue-game/journal/route.ts` (the folder holds nothing else), `.claude/skills/playtest/scripts/create-test-player.mjs` (the same).
- **`src/pages/_app.tsx`:** `:5` goes. `:12` `<ClerkProvider>` becomes `<>`, and `:22` becomes `</>`.
- **`GlobeScreen.tsx`:** `:8` and `:62-69` go.
- **`useJournal.ts`:**
  - `:2`, `:7`, `:31` (the doc-comment sentence), `:36-37` (`saved`, `useAuth`) and `:49-64` (both effects and their blank lines) go.
  - `:3-6` becomes:
    ```ts
    import {
      JOURNAL_STORAGE_KEY, NO_RECORDS, RECORDS_STORAGE_KEY, parseJournal, parseRecords, saveRecords, saveSolve,
      type Journal, type Records,
    } from '@/clueGame/journal';
    ```
- **`journal.ts`:**
  - `:48-61` (`ServerJournalEntry`) and `:88-97` (`toJournalEntry`, `mergeServerJournal`) go.
  - `:18`: "On this device only (the server keeps no badges)." becomes "On this device only."
  - The header `:1-4` becomes:
    ```
    // The Field Journal: animals this player has identified, kept on their device only.
    // Keyed by scientific name so it survives database id changes.
    // mergeJournals is the one merge rule: for another tab's saves (saveSolve), and later for a journal
    // moved from another device by QR code or link.
    ```
    The planned transfer is named here, not in `mergeJournals`' frozen doc comment.
- **`next.config.mjs:16-18`:** each redirect gets its own comment:
  ```js
      async redirects() {
          return [
              // The game moved from /clue-match to /explore (plan 041); old links keep their ?place= and ?seed=.
              { source: '/clue-match', destination: '/explore', permanent: true },
              // Clerk's settings still name /login as the sign-in page until the owner deletes the instance.
              { source: '/login', destination: '/', permanent: true },
          ];
      },
  ```
  The existing comment `:15` moves into the array.
- **`eslint.config.mjs`:** `:19` and `:22` as Goal.
- **`package.json:50` and the lock:** changed only by `npm uninstall @clerk/nextjs`.
- **`ci.yml`:** `:54` ends at "never queries."; `:61` becomes `# credentials (docs/DATABASE_ACCESS.md).`; `:75-76` go.
- **`Dockerfile`:** `:3-4` become the single line `# (docs/DEPLOY.md). Settings come in at run time (deploy/app.env).`; `:14-15` go; `:19` "No Clerk key or database needed." becomes "No database needed."
- **`deploy/docker-compose.app.yml`:** `:4-5` become `# Needs deploy/app.env (from deploy/app.env.example) and, in .env, APP_DOMAIN` / `# and DB_NETWORK if not postgis_backend.`; `:13` goes.
- **`deploy/app.env.example`:** `:2` becomes `# (never commit it).`; `:7-11` go, so the file ends after `:6`.
- **`.env.example`:** `:5-11` go. Edit it from a shell with `sed -i '5,11d' .env.example`; the file then ends at the `DATABASE_URL` line and its newline.
- **`AGENTS.md`:**
  - `:10` and `:58` go.
  - `:48` becomes "- Env (`.env.local`): `DATABASE_URL`."
  - `:51` "`/clue-match` redirects" becomes "`/clue-match` and `/login` redirect".
  - `:56` drops ", `GET /api/clue-game/journal` (signed-in journal sync)", the leading comma included.
  - `:57` "No Next or Clerk there" becomes "No Next there".
- **`CODING_STANDARDS.md:5`:** as Goal.
- **`README.md`:** `:5` drops ", Clerk (sign-in)"; `:17` becomes "`.env.local` needs `DATABASE_URL`."; `:25` drops ", `clue-game/journal`".
- **`CONTEXT.md:140`:** Goal's sentence.
- **`docs/CLUE_MATCH.md`:**
  - `:10` becomes "There are no accounts and no round is saved: the game only reads from the server. The Field Journal lives on the device. `?seed=N` replays a session exactly (same mysteries, same boards)."
  - `:24` drops ", `GET /api/clue-game/journal` (a signed-in player's solves)".
  - `:67` drops " The journal counts only `solved` rows."
- **`docs/DRIZZLE_ORM_GUIDE.md`:** `:15` "There are 9:" becomes "There are 8:"; `:20` goes; `:32` "(`count(*)::int`, journal route)" becomes "(`count(*)::int`)".
- **`docs/DATABASE_ACCESS.md`:**
  - `:190-193` become "CI's e2e job connects to the copy below as `critter_dev` (GitHub secret" / "`E2E_DATABASE_URL`), so a schema change the app reads must reach `phaser_june_dev`" / "too, or that job goes red. The refresh steps are below."
  - `:205-207` go; the block keeps `:204`.
- **`docs/DEPLOY.md`:**
  - `:3` becomes "… need the server or a password."
  - `:19` goes; `:20`, `:28` and `:31` are renumbered 2, 3 and 4.
  - `:29` becomes "- `.env` (app stack, `/opt/critter-connect/.env`): `APP_DOMAIN`."
  - `:30` becomes "… fill in `DATABASE_URL` (the `critter_app` password). `chmod 600 deploy/app.env`."
  - `:49` becomes "(no Next or other framework script)".
  - The links at `:97`, `:101` and `:107` change to steps 4, 2 and 3; `:128` goes (Finding 5).
- **`.claude/skills/playtest/SKILL.md`:** `:16-30` go; `:15` is then followed by the blank line before "## 2. Globe".
- **`db/schema.sql`:** `:91` "(the journal route reads them)" becomes "(nothing reads them now)"; `:101` "07_solve_stats.sql) and the journal route." becomes "07_solve_stats.sql).".
- **`scripts/check-live-board.mjs:10`:** see Finding 7.

### Target design

After the change, the game has no auth layer and no request hook:
- `_app.tsx` holds only `Head` and `MotionConfig`.
- The API is read-only: `places`, `places/outline` and `clue-game/{pool,range,ranges}`.
- `/login` → `/` is config in `next.config.mjs`, beside `/clue-match`.
- The journal lives only in localStorage. `useJournal` handles React state and storage I/O on top of the pure `journal.ts` (`parseJournal`, `recordSolve`, `saveSolve` → `mergeJournals`, the records).
- `mergeJournals` is the single merge rule: the save-time merge now, the QR or link transfer later.
- Layers are unchanged: pure rules in `src/clueGame`, storage in the hook, UI in `GlobeScreen`.

#### `scripts/e2e.mjs`: four checks, 1584 → 1588 (each is a single `check()`)

1. **Listener.** Beside `const requests = [];` (`:115`), add `const clerkRequests = [];`. In the handler, between the console branch and `if (message.sessionId !== sessionId) return;` (`:125`), add:
   ```js
      // Sign-in is gone: no page the run opens asks a Clerk host for anything.
      if (method === 'Network.requestWillBeSent' && URL.parse(params.request.url)?.hostname.includes('clerk')) clerkRequests.push(params.request.url);
   ```
   This covers every session in `watched`: the first page, the old-journal load on it, and the two-tab second page. `URL.parse` (Node 22+) returns null where `new URL` would throw. `:116`'s comment gains "(Clerk requests from every page)".
2. **Hoist** `oldJournalRaw` (`:2507`) to just above the D14 block's comment (`:2494`). Its comment avoids the grep's words, for example "The pre-2026-11 journal fixture: the D14 checks and the stored-journal check at the end load it." The D14 block uses it unchanged.
3. **Stored-journal check.** A new block after the two-tab block (`:2610`) and before `check('no console errors'` (`:2612`), so the run-wide checks cover its requests:
   ```js
    // A journal stored before this change is counted on the globe and left as stored (nothing on the globe writes it).
    {
      const n = Object.keys(JSON.parse(oldJournalRaw)).length;
      await evaluate(raw => localStorage.setItem('clue-match:journal:v1', raw), oldJournalRaw);
      await goto(`${BASE}/`);
      await waitFor(() => /^\d+ of \d+ animals found$/.test(document.querySelector('header p')?.textContent ?? ''), 'the globe\'s count', 30_000);
      await sleep(3000);
      const { header, stored } = await evaluate(() => ({ header: document.querySelector('header p').textContent, stored: localStorage.getItem('clue-match:journal:v1') }));
      check('a journal stored before this change is counted on the globe and kept as stored', header.startsWith(`${n} of `) && stored === oldJournalRaw, JSON.stringify({ header, n, kept: stored === oldJournalRaw }));
    }
   ```
   - It sets storage and then navigates, as D14 does (`:2512`); it doesn't use `addScriptToEvaluateOnNewDocument`.
   - `n` is the fixture's raw key count (4), not `parseJournal`'s output. The unit test (`journal.test.ts:26-36`) already pins that `parseJournal` keeps every entry, and counting raw keys makes a parser that drops an entry fail here instead of moving `n` with it.
   - The header counts `Object.keys(journal).length` (`GlobeScreen.tsx:46`), so the count doesn't depend on which animals the places list holds. `header p` is that line; the globe has a single `<header>`.
4. **Run-wide checks**, after `check('no failed requests', …)` (`:2613`):
   ```js
    check('no request goes to Clerk', clerkRequests.length === 0, `${clerkRequests.length}: ${clerkRequests.slice(0, 3).join(' | ')}`);
    // From Node, so neither reaches the page's request lists.
    const login = await fetch(`${BASE}/login/`, { redirect: 'manual' });
    check('/login/ redirects to the globe', login.status === 308 && login.headers.get('location') === '/', `${login.status} ${login.headers.get('location')}`);
    const journalRoute = await fetch(`${BASE}/api/clue-game/journal/`);
    check('the journal route is gone', journalRoute.status === 404, String(journalRoute.status));
   ```
   Node's `fetch` with `redirect: 'manual'` returns the 308 itself, headers included.
- **Expected on the unchanged code (record them):**
  - Clerk check: FAIL (the dev key loads from `*.clerk.accounts.dev`). If it passes, the env has no key: record that and keep the check.
  - `/login/` check: FAIL (`200 null`).
  - Journal-route check: FAIL (`200`).
  - Stored-journal check: PASS, by design (signed out, nothing writes on the globe).
  - Result: 1588 checks, exit 1. After the change: 1588/1588.
- **The separate DoD grep on `e2e.mjs`** then lists only the listener's comment and condition, the `:116` comment, and the Clerk and journal-route checks with their comment.

#### `tests/clueGame/journal.test.ts`

- `:8-9`: drop `mergeServerJournal` and `type ServerJournalEntry`.
- `:38-40`: new comment and title:
  ```ts
  // M7's case for the old server merge, its solves rewritten as a journal: the rule a journal moved by QR code or link will use.
  test('mergeJournals: another journal merges in: the larger count, the lower best, the earliest and latest dates, the local names, local class or else theirs, the larger badge count', () => {
  ```
- `:55-68`: `const server: ServerJournalEntry[]` becomes `const other: Journal`, keyed by scientific name, with the same fields except `speciesId` and `placeKeys`.
- `:84` and `:87` become `mergeJournals(local, other)` and `mergeJournals(merged, other)`; `expected` (`:69-83`) doesn't change.
- New, after `:131`:
  ```ts
  test('mergeJournals: a journal merged with itself is unchanged', () => {
    const journal: Journal = {
      'Rhinoderma darwinii': entry('Rhinoderma darwinii', { timesSolved: 3, bestMoves: 7, lastSolvedAt: '2026-11-03T10:00:00.000Z', className: 'AMPHIBIA', sharpEyes: 2 }),
      'Okapia johnstoni': entry('Okapia johnstoni'),
    };
    assert.deepEqual(mergeJournals(journal, journal), journal);
  });
  ```
- Both cases pass at once on the unchanged `src/` (record that). `npm test` is 76/76 then, and again after the deletions.

#### Order (tests first), for the Steps

1. Write the E2E checks and run them once on the unchanged code (dev-copy block). Record each result and the +4.
2. Port the unit case and add the self-merge case. `npm test` gives 76/76 on the unchanged `src/`.
3. Finding 1's single step: the six `src/` sites, the redirect, `npm uninstall @clerk/nextjs`, the `rm -rf`, then typecheck, lint, test and E2E.
4. CI, deploy and env files, and the ESLint guard.
5. Docs, agent files, the schema comments and `check-live-board.mjs:10`. Then the final grep, the awk check and the schema-diff check.
6. The final Verification.

### Rejected alternatives

- Importing `parseJournal` from `../src/clueGame/journal.ts` into `e2e.mjs` (Node type stripping) to get `n`: a new pattern in a plain-Node script, and laxer, since `n` would follow a parser bug.
- A second listener, or one listener per page, for Clerk: the existing listener already sees every watched session.
- Finding Clerk requests through `requests`: it keeps `BASE` URLs only.
- Excluding `scripts/check-live-board.mjs` from the final grep: it weakens the acceptance check and leaves a false example.
- Keeping `mergeServerJournal` as a wrapper, or editing `mergeJournals`' doc comment: the wrapper has no caller, and the Review corrections freeze the function.
- Redirecting `/login` from a page or in Caddy: the config redirect sits with `/clue-match`, runs before pages, and Caddy's existing forward already brings the website host's `/login` to it.

### Risks

- **The dev-copy env keeps its four Clerk variables.** After the change nothing reads them: no `@clerk` package is installed, and Next inlines a `NEXT_PUBLIC_*` value only where code names it. The Clerk check proves this on the VPS, and the PR's CI (which gets no secrets) proves it there.
- **Lockfile.** `npm uninstall` should only delete: the five `node_modules/@clerk/*` entries and dependencies nothing else needs. Check that `git diff --numstat package-lock.json` adds no lines, or only npm's own normalisation. Check that `node_modules/@clerk` is gone, so a leftover install can't let the typecheck pass. CI's `npm ci` proves the lock is consistent.
- **Stale generated types:** see Finding 8. **Screenshot shift:** see Finding 6.
- **Live headers.** Without the proxy, `/` and `/explore/` lose `x-clerk-*` and `x-middleware-rewrite`, and their `Cache-Control` may change to Next's static-page header. Record both (Review corrections). Caddy caches nothing and sets `Cache-Control` only on `/site/*`.
- **Flaky checks.** Removing the provider also removes a whole-tree re-render when Clerk's script loads mid-round, so E2E timings may shift slightly. A10 flakes get the rerun-once rule, which never applies to the four new checks.

## Architecture review (Fable)

VERDICT: APPROVE

Checked against the code at `4c4c0f46` (= `origin/main` `f1826f56`, fetched this session): `journal.ts` (the `mergeJournals` rule, `toJournalEntry` dropping only `speciesId`/`placeKeys`), `useJournal.ts` (both effects return early signed out; `mergeJournals` imported only for the deleted effect), `journal.test.ts` (the ported values hold; "only in other" and the repeat line exist), `_app.tsx`, `GlobeScreen.tsx` header, `proxy.ts` (only attaches the session; the one `auth()` reader is the deleted route), `e2e.mjs` listener (`:118-133`, network events first page only, `requests` BASE-only), D14 and two-tab blocks, fixture (4 keys), `next-env.d.ts` (side-effect `import`s, so a missing `.next-e2e` doesn't fail tsc), `.next-e2e/dev/types/{routes.d.ts,validator.ts}` name the deleted routes, `db.execute` count 8, DEPLOY.md anchors `:97/:101/:107` and `:128`, every Goal 5 site quoted. The full DoD grep on `scripts/e2e.mjs` and `next.config.mjs` prints nothing today; `grep -i 'clerk\|sign' docs/DEPLOY.md` shows only `:3`, `:19`, `:29`, `:30`, `:49`, `:128` (plus "design" at `:120`, which the awk pattern doesn't match).

No data loss (journal read/save paths untouched), no access control weakened, nothing over-engineered.

MUST-FIX: none

MISSED: none

SHOULD-CONSIDER:
1. Steps: the tests-first E2E step leaves the run red by design across a session boundary. Its Verification should name the three expected failures (Clerk request, `/login/` 200, journal route 200) and say 1585/1588 with exit 1 is that step's pass, so a later session doesn't treat them as regressions or rerun them.
2. Steps: anchor each edit on quoted text, not line numbers (deleting `DEPLOY.md:19` shifts later lines; the `sessionId` return in `e2e.mjs` is `:126`, not `:125`).
3. Record the Architecture's deviations from the brief under Decisions (done this session): `DEPLOY.md:128` deleted despite the "skip" correction; the QR/link purpose in `journal.ts`'s header since `mergeJournals`' doc comment is frozen; Finding 6's Anywhere shift (also for the Summary).

## Architecture review (Astra)

VERDICT: APPROVE

MUST-FIX: none

SHOULD-CONSIDER: none

## Revision notes

None needed: Fable and Astra both APPROVE with MUST-FIX none. Fable's SHOULD-CONSIDER 1–2 go to the Steps stage (planner); 3 is already under Decisions.

## Steps

Every step:
- `STATE=/srv/critter-ai/agent-state/missions/remove-sign-in`. Start with `git fetch origin --prune`. If `origin/main` moved past `f1826f56`, note it in the step's record and go on; the Release rebases, so don't bring it in mid-mission.
- Anchor every edit on the quoted text. The Architecture's line numbers shift once earlier edits land (Fable SC 2).
- "E2E" means the Definition of done's dev-copy block, verbatim, guard included. Never use `.env.local`, never print the URL, never `cat` the file. A run takes about 13 min (baseline: 16:07 to 16:20). One heavy job at a time, at most 3 E2E runs per session.
- After an E2E: `mv "$(ls -1d e2e-artifacts/*-seed7 | tail -1)" $STATE/<name>`. Intermediate runs go to `$STATE/e2e-s<n>/`; delete the older `e2e-s*` when you write a new one. Never delete `baseline-e2e/` or `final-e2e/`.
- Report check: it prints the total and the failing counts, then every failing check and the four new checks:
  ```
  node -e 'const r=require(process.argv[1]);const f=r.checks.filter(c=>!c.ok);console.log(r.checks.length,f.length);const n=/^(no request goes to Clerk|\/login\/ redirects to the globe|the journal route is gone|a journal stored before this change is counted on the globe and kept as stored)$/;for(const c of r.checks)if(!c.ok||n.test(c.name))console.log(c.ok,c.name,"::",(c.detail??"").slice(0,240))' <dir>/report.json
  ```
- Flakes (Decision rules): if a run fails only on an A10 timing check outside the four new checks (for example "field guide: signs in pages turn on their own…"), rerun once and keep the failed run's `report.json` as `$STATE/s<n>-flake-report.json`. Never waive one of the four.
- Pre-push runs typecheck and lint (lint covers `src`, `tests` and `scripts`).
- Record results as indented bullets under the step, check it off, add one Log line, then commit the code and the plan together and push.

- [x] S1 · Tests first: the four E2E checks and the ported merge cases, on unchanged `src/`
  - Files: `scripts/e2e.mjs` and `tests/clueGame/journal.test.ts` only. No `src/` change.
  - `scripts/e2e.mjs`, per Architecture "`scripts/e2e.mjs`: four checks":
    1. Under `const requests = [];`, add `const clerkRequests = [];`.
       - The comment above `const watched` ("…; network events from the first only.") ends "…; network events from the first only (Clerk requests from every page)."
    2. In `browser.on(message => {`: after the `Runtime.exceptionThrown` branch's closing `}` and before `if (message.sessionId !== sessionId) return;`, add the Architecture's comment line and the `URL.parse(…)?.hostname.includes('clerk')` line, verbatim.
    3. Hoist `const oldJournalRaw = readFileSync(path.join(process.cwd(), 'tests/clueGame/old-journal.json'), 'utf8');` out of the D14 block.
       - It goes just above `// Plan 2026-11-14-rules-cleanup (D14). Last, on their own loads, …`, with the comment `// The pre-2026-11 journal fixture: the D14 checks and the stored-journal check at the end load it.`
       - The D14 comment "// A journal saved before 2026-11 (…) keeps every find." stays above `const oldJournal = JSON.parse(oldJournalRaw);`.
    4. Add the stored-journal block, verbatim. It goes after the two-tab block's last line `names.forEach((name, i) => check(name, results[i].ok, results[i].detail));` and that block's closing `}`, and before `check('no console errors', …)`.
    5. After `check('no failed requests', …);`, add the three run-wide checks verbatim: Clerk, `/login/` and the journal route.
  - `tests/clueGame/journal.test.ts`, per Architecture "`tests/clueGame/journal.test.ts`":
    - The import drops `mergeServerJournal, ` and `, type ServerJournalEntry`.
    - The comment "// A signed-in player's saved solves fold into the device's journal. The E2E can't / sign in, so this is the merge's only test." and the title `'saved solves merge in: …'` become the Architecture's comment and title.
    - `const server: ServerJournalEntry[] = [ … ]` becomes `const other: Journal = { … }`.
      - It is keyed by scientific name, with the same three animals and the same field values minus `speciesId` and `placeKeys`. Their classes stay: `'Amphibia'`, `'REPTILIA'`, `'MAMMALIA'`.
      - `expected` doesn't change.
    - `mergeServerJournal(local, server)` becomes `mergeJournals(local, other)`, and `mergeServerJournal(merged, server)` becomes `mergeJournals(merged, other)`.
    - The self-merge case, verbatim, goes after `test('mergeJournals: two empty journals merge to an empty one', …)`.
  - Checks:
    - `npm run typecheck` and `npm run lint` exit 0.
    - `npm test` gives **76/76** (75 − 0 + 1). The ported case and the self-merge case pass at once on the unchanged `src/`; record that (Review corrections).
    - One E2E to `$STATE/e2e-s1/`, then `cp $STATE/e2e-s1/report.json $STATE/s1-fail-first-report.json`. The JSON is the fail-first evidence and stays; the folder goes in S2.
  - **This step's pass is a red run (Fable SC 1).** It must print `1585/1588 checks passed` with exit 1, and the report check prints `1588 3`:
    - `false no request goes to Clerk`, with `*.clerk.accounts.dev` URLs in the detail.
    - `false /login/ redirects to the globe`, detail `200 null`.
    - `false the journal route is gone`, detail `200`.
    - `true a journal stored before this change …`, with `"n":4`, `"kept":true` and a header starting `4 of`.
    - The run has no `run completed` failure, and all 1584 old checks pass, which proves the hoist and the listener changed nothing.
    - Later sessions: these three failures are expected and S2 turns them green. Don't treat them as regressions or rerun them.
  - If the Clerk check passes, the env has no Clerk key. Record that and keep the check; the run then shows `1586/1588` and `1588 2`.
  - Any other outcome means a check is wrong: fix the check, never the expectation, and rerun.
  - Record: each new check's result and detail; checks added, 4 (1584 → 1588); `npm test` 76/76; that both unit cases passed at once.
  - **Done 2026-11-15 17:10 UTC** (`origin/main` still `f1826f56`):
    - `npm run typecheck`, `npm run lint` exit 0. `npm test` **76/76**; the ported `mergeJournals` case and the self-merge case passed at once on the unchanged `src/`, as expected (M9 branch). The DoD grep on `tests/clueGame/journal.test.ts` prints nothing (baseline 7).
    - E2E (dev copy, guard passed): **1585/1588**, exit 1, report check `1588 3`; all 1584 old checks pass, no `run completed` failure, no flake. Checks added: 4 (1584 → 1588).
      - `false no request goes to Clerk`: 377 requests, first `https://clean-lynx-72.clerk.accounts.dev/v1/client/handshake?…`, then `…/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, `…/npm/@clerk/ui@1/dist/ui.browser.js`.
      - `false /login/ redirects to the globe`: `200 null`.
      - `false the journal route is gone`: `200`.
      - `true a journal stored before this change …`: `{"header":"4 of 76 animals found","n":4,"kept":true}` (passes before the change by design).
    - Artifact `$STATE/e2e-s1/`; fail-first evidence `$STATE/s1-fail-first-report.json` (kept).

- [ ] S2 · Sign-in out of the game: the six `src/` sites, the `/login` redirect and the uninstall, in one commit (Finding 1)
  - `git rm src/proxy.ts src/pages/login.tsx src/app/api/clue-game/journal/route.ts`. The `journal/` folder holds nothing else.
  - `src/pages/_app.tsx`: delete `import { ClerkProvider } from '@clerk/nextjs';`. `<ClerkProvider>` becomes `<>` and `</ClerkProvider>` becomes `</>`. Nothing else changes.
  - `src/components/globe/GlobeScreen.tsx`: delete `import { SignInButton, Show, UserButton } from '@clerk/nextjs';`, and everything from `<Show when="signed-out">` through the second `</Show>`. The rest of the header doesn't change.
  - `src/components/clueGame/useJournal.ts`, per Architecture:
    - Delete:
      - `import { useAuth } from '@clerk/nextjs';` and `import { getJson } from '@/lib/getJson';`
      - the doc sentence ` * A signed-in player's solves saved before 2026-10-01 are merged in.`
      - `const [saved, setSaved] = useState<ServerJournalEntry[]>([]);` and `const { isSignedIn } = useAuth();`
      - the effect starting `if (!isSignedIn) return;` and the one starting `if (saved.length === 0) return;`, each with the blank line before it.
    - The `@/clueGame/journal` import becomes the Architecture's block. It drops `mergeJournals`, `mergeServerJournal` and `type ServerJournalEntry`.
    - `stored`, `save`, the refs, the mount effect, `record` and the return don't change.
  - `src/clueGame/journal.ts`:
    - The header's 4 lines become the Architecture's 4 lines.
    - In the `sharpEyes` comment, "On this device only (the server keeps no badges)." becomes "On this device only."
    - Delete `ServerJournalEntry` (its doc comment "/** One animal the signed-in player solved, …" and the interface), `function toJournalEntry(…)`, and `mergeServerJournal` (its doc comment "/** The device's journal plus what the player solved while signed in elsewhere …" and the function).
    - `mergeJournals`, doc comment included, and everything else stay byte-for-byte.
  - `next.config.mjs`: `redirects()` becomes the Architecture's block. The "// The game moved from /clue-match to /explore (plan 041); …" comment moves into the array, above its entry, and the `/login` entry gets its Clerk comment.
  - Then, in this order: `npm uninstall @clerk/nextjs` (the only change to `package.json` and `package-lock.json`), then `rm -rf .next .next-e2e .test-dist`.
  - Checks:
    - `npm run typecheck` and `npm run lint` exit 0; `npm test` gives 76/76.
    - `DATABASE_URL=postgres://build@127.0.0.1:1/build NEXT_TELEMETRY_DISABLED=1 npm run build` exits 0. Its route list has no `/login`, no journal route and no Proxy/Middleware line; record it. Then `rm -rf .next`.
    - Packages:
      - `npm ls --omit=dev --package-lock-only @clerk/nextjs @clerk/backend @clerk/shared @clerk/react` lists none (exit 1 is the pass).
      - `grep -c '"node_modules/@clerk/' package-lock.json` prints 0, and `test ! -e node_modules/@clerk && echo gone` prints `gone`.
      - `git diff --numstat -- package.json package-lock.json` shows package.json `0 1` and the lock adding 0 lines. If the lock adds any, record them and why (npm's own normalisation only).
      - Record `npm audit --omit=dev`.
    - `grep -c "source: '/login', destination: '/', permanent: true" next.config.mjs` prints 1.
    - These print nothing:
      - `git grep -n -i -E 'clerk|useAuth|isSignedIn|mergeServerJournal|ServerJournalEntry|toJournalEntry|clue-game/journal' -- src tests ':!src/site'`
      - `git ls-files src/proxy.ts src/pages/login.tsx src/app/api/clue-game/journal`
      - `git diff origin/main -- src/clueGame/animalBoard.ts src/components/animalBoard/savedGame.ts` (Goal 8)
    - The journal's storage is untouched. This prints nothing:
      ```
      for f in recordSolve mergeJournals saveSolve toEntry parseJournal parseWords updateRecords saveRecords parseRecords; do diff <(git show origin/main:src/clueGame/journal.ts | awk "/^(export )?function $f\\(/,/^}/") <(awk "/^(export )?function $f\\(/,/^}/" src/clueGame/journal.ts) >/dev/null || echo "CHANGED $f"; done
      diff <(git show origin/main:src/clueGame/journal.ts | grep -E '^export const [A-Z_]+') <(grep -E '^export const [A-Z_]+' src/clueGame/journal.ts)
      ```
    - Added lines only: `git diff -U0 origin/main -- src/pages/_app.tsx src/components/globe/GlobeScreen.tsx src/components/clueGame/useJournal.ts | grep '^+[^+]'` prints exactly `+    <>`, `+    </>` and the two changed lines of the import block.
    - One E2E to `$STATE/e2e-s2/` (delete `e2e-s1/`). It must show `1588/1588` and the report check `1588 0`, with the four new checks `true`:
      - the Clerk check: `0: `
      - `/login/`: `308 /`
      - the journal route: `404`
      - the stored journal: `4 of`, kept.
    - Screens against `baseline-e2e/` (Decision rule "anything else on screen"):
      - `01-globe.png` and `07-globe-found.png`: the Sign in button is gone, **Anywhere** sits at the header's right edge and the count line is wider (Finding 6, expected). Nothing else in the header or the panel moves; the globe itself spins.
      - `02-board.png`, `04-round-1-end.png`, `05-journal.png` and `09-journal-sharp-eye.png` look the same as the baseline's. If the eye can't tell, diff the pixels with the worktree's `sharp`.
      - Anything else that differs: find out why before checking this step off.
  - Record: the files deleted; the numstat; `npm audit`; the build's route list; the E2E result; each screen pair.

- [ ] S3 · CI, deploy and env files, the ESLint guard, and `check-live-board.mjs`'s comment
  - `.github/workflows/ci.yml`:
    - "# Typecheck + production build. The build loads route modules but never queries, and needs no Clerk keys." becomes "# Typecheck + production build. The build loads route modules but never queries."
    - "# credentials (docs/DATABASE_ACCESS.md). Next dev needs both keys of Clerk's dev instance." becomes "# credentials (docs/DATABASE_ACCESS.md)."
    - Delete `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.E2E_CLERK_PUBLISHABLE_KEY }}` and `CLERK_SECRET_KEY: ${{ secrets.E2E_CLERK_SECRET_KEY }}`. Nothing else changes.
  - `Dockerfile`:
    - The two header lines "# (docs/DEPLOY.md). NEXT_PUBLIC_* values are baked into the browser bundle at" and "# build time, so they are build args; server secrets come in at run time." become one: "# (docs/DEPLOY.md). Settings come in at run time (deploy/app.env)."
    - Delete `ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login`.
    - "No Clerk key or database needed." becomes "No database needed."
  - `deploy/docker-compose.app.yml`:
    - "# Needs deploy/app.env (from deploy/app.env.example) and, in .env, APP_DOMAIN," and "# the build-time NEXT_PUBLIC_* values and DB_NETWORK if not postgis_backend." become "# Needs deploy/app.env (from deploy/app.env.example) and, in .env, APP_DOMAIN" and "# and DB_NETWORK if not postgis_backend."
    - Delete `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}`. `args:` and `GIT_COMMIT` stay.
  - `deploy/app.env.example`:
    - "# (never commit it). Build-time NEXT_PUBLIC_* values go in the stack's .env." becomes "# (never commit it)."
    - Delete the blank line before "# Clerk production instance (…)" and that block's 4 lines. The file ends with the `DATABASE_URL=…` line and its newline.
  - `.env.example`, from a shell (the edit hook blocks it). `sed -n '5,11p' .env.example` must show the blank line, the three "Clerk Auth (Required)" heading lines and three `…CLERK…` lines. Then run `sed -i '5,11d' .env.example`; `tail -n 2 .env.example` shows the Database heading's last line and `DATABASE_URL=…`.
  - `eslint.config.mjs`:
    - "// Everything the website bundles stays free of Next and Clerk." becomes "// Everything the website bundles stays free of Next."
    - `group: ["next", "next/*", "@clerk/*"]` becomes `group: ["next", "next/*"]`.
    - `"The website (src/site) is static HTML: no Next or Clerk."` becomes `"The website (src/site) is static HTML: no Next."`
  - `scripts/check-live-board.mjs` (Finding 7, Decisions): "// page's own host (other hosts, such as Clerk's, are ignored). Up to 3 attempts, …" becomes "// page's own host (other hosts are ignored). Up to 3 attempts, …". The comment only.
  - Checks:
    - `npm run typecheck` and `npm run lint` exit 0 (the guard still loads).
    - `python3 -I -c 'import sys,yaml;yaml.safe_load(open(sys.argv[1]))' .github/workflows/ci.yml` exits 0.
    - `npm run site:build` exits 0.
    - `git grep -n -i clerk -- .github Dockerfile deploy .env.example eslint.config.mjs scripts ':!scripts/e2e.mjs'` prints nothing (S1's checks in `scripts/e2e.mjs` name Clerk on purpose).
    - `git diff origin/main -- deploy/Caddyfile deploy/check.sh deploy/deploy.sh` is empty.
    - No E2E: nothing the local game runs changed.
    - Docker isn't on this VPS. CI's `docker build --target caddy` proves the `deps`, `site` and `caddy` stages at the PR, and only the Release deploy proves the `build` stage.

- [ ] S4 · Docs, agent files, the playtest skill and the schema comments; then the DoD greps
  - `git rm .claude/skills/playtest/scripts/create-test-player.mjs`. The folder holds nothing else.
  - `.claude/skills/playtest/SKILL.md`: delete the Preflight bullet from "- Signing in is optional and saves nothing (…)" through "  If the account is gone (`form_identifier_not_found`), run `node .claude/skills/playtest/scripts/create-test-player.mjs` from the repo root.", including its code block. The `npm run e2e:fresh` bullet is then followed by one blank line and `## 2. Globe (`/`)`. Nothing else in the skill changes.
  - `AGENTS.md`:
    - Delete the Project Stack line "- Auth: Clerk", exactly that.
    - Delete "- Auth: Clerk (`src/pages/_app.tsx`, `src/proxy.ts`). Nothing creates `profiles` rows now; the journal route reads the ones saved before 2026-10-01."
    - "- Env (`.env.local`): `DATABASE_URL`, Clerk keys." becomes "- Env (`.env.local`): `DATABASE_URL`."
    - "; `/clue-match` redirects)" becomes "; `/clue-match` and `/login` redirect)".
    - The Data line drops ", `GET /api/clue-game/journal` (signed-in journal sync)".
    - "No Next or Clerk there (ESLint guard)." becomes "No Next there (ESLint guard)."
  - `CODING_STANDARDS.md`: "(Postgres, fetch, Clerk)" becomes "(Postgres, fetch)".
  - `README.md`:
    - The stack line "…(content, ranges, places), Clerk (sign-in)." becomes "…(content, ranges, places)."
    - "`.env.local` needs `DATABASE_URL` and Clerk keys." becomes "`.env.local` needs `DATABASE_URL`."
    - The routes line drops ", `clue-game/journal`".
  - `CONTEXT.md`: "The player's record of the animals they've found or named, kept on the device. Signing in only merges in the finds an account saved before October 2026; nothing new is saved there." becomes "The player's record of the animals they've found or named, kept on the device only."
  - `docs/CLUE_MATCH.md`:
    - The opening "No sign-in needed, … saved before 2026-10-01." becomes the Architecture's sentence; the `?seed=N` sentence stays.
    - The Data row drops ", `GET /api/clue-game/journal` (a signed-in player's solves)".
    - Delete " The journal counts only `solved` rows."
  - `docs/DRIZZLE_ORM_GUIDE.md`:
    - First, `git grep -c 'db\.execute' -- src ':!src/db/index.ts' | awk -F: '{s+=$2} END {print s}'` must print 8. Then "There are 9:" becomes "There are 8:".
    - Delete "- `src/app/api/clue-game/journal/route.ts`: the signed-in player's past solves."
    - "(`count(*)::int`, journal route)" becomes "(`count(*)::int`)".
  - `docs/DATABASE_ACCESS.md`:
    - The 4 lines from "CI's e2e job connects to the copy below as `critter_dev` (GitHub secret" through "too, or that job goes red. The refresh steps are below." become the Architecture's 3 lines.
    - The settings block loses its three `…CLERK…` lines and keeps `DATABASE_URL=postgres://critter_dev:<password>@…`.
  - `docs/DEPLOY.md`:
    - "Steps marked **owner** need the server, a password or the Clerk dashboard." becomes "Steps marked **owner** need the server or a password."
    - Delete "2. **Owner. Clerk production instance:** …". Then renumber "3. **Database role.**" to 2, "4. **Owner. Settings on the VPS**" to 3 and "5. **Ports 80 and 443.**" to 4.
    - The Settings bullets become the Architecture's two lines: `APP_DOMAIN` only, and `DATABASE_URL` (the `critter_app` password) only.
    - "(no Next, Clerk or other framework script)" becomes "(no Next or other framework script)".
    - The links change **in this order**, so that none changes twice: `[setup step 3](#one-time-setup)` becomes `[setup step 2]`, then `[setup step 4]` becomes `[setup step 3]`, then `[setup step 5]` becomes `[setup step 4]`.
    - Delete Remaining owner task "3. Sign up on play.critterconnect.org to test Clerk production sign-in; moot once mission M11 …". It is the last item, so nothing is renumbered.
  - `db/schema.sql`, comments only:
    - "(the journal route reads them)" becomes "(nothing reads them now)".
    - "07_solve_stats.sql) and the journal route." becomes "07_solve_stats.sql)."; the line's "Anonymous play has no player_id." stays.
  - Checks:
    - `npm run typecheck` and `npm run lint` exit 0.
    - Verification 6–8: the final grep, the DEPLOY awk check, the per-file greps, the schema-diff check, and the files the mission doesn't touch.
    - `git grep -n 'setup step' -- docs` shows 4, 2 and 3. Step 4 is Ports 80 and 443 (the hooks), step 2 the Database role (the password), step 3 the Settings on the VPS.
    - `git ls-files .claude/skills/playtest/scripts` prints nothing.
    - No E2E: Markdown, comments and a script nothing runs.

- [ ] S5 · The live-check script (outside the repo, never committed), tried on today's live site
  - Write `$STATE/live-check.mjs`, per DoD Release "The live-check script":
    - It imports `launchChrome`, `connect` and `openPage` from `/srv/critter-ai/worktrees/remove-sign-in/scripts/cdp.mjs` by absolute path.
    - It runs with `CHROME_PATH=$HOME/.local/bin/chrome-nosandbox` and the profile `$STATE/live-profile/`.
    - On the page: `Page.enable`, `Runtime.enable`, `Network.enable`, and a `Network.requestWillBeSent` listener that records every URL.
    - Arg `seed`: load `https://play.critterconnect.org/` and set `clue-match:journal:v1` to the raw text of the worktree's `tests/clueGame/old-journal.json`.
    - Every run then loads `https://play.critterconnect.org/` and `https://play.critterconnect.org/explore/`, each until its load event plus 15 s.
    - It writes JSON to the path given as `--out`: `{ at, mode, requests, header, journal }`.
      - `header` is the globe's `header p` text.
      - `journal` is the raw stored value, read at the end of the run.
    - It ends with `Browser.close` and waits for Chrome to exit, so the profile is written.
    - It reads no secret and prints no env.
  - Try it: one run with `seed`, then a fresh run without it: `--out $STATE/live-try.json`. It must show:
    - requests to `clerk.critterconnect.org` (proof the listener sees them);
    - a header starting `4 of`;
    - a `journal` equal to the fixture file's text. The second launch keeping it proves the profile keeps storage.
    - If any of these fails, fix the script now.
  - Then `rm -rf $STATE/live-profile`, so the Release's seed and before runs start from nothing. Keep `live-try.json`.
  - Checks: `node --check $STATE/live-check.mjs`. `git status` shows only the plan changed. Live load: about 4 page loads, and the game writes nothing to the database.

## Verification

Run on the final commit, after the Astra code review's fixes. Use `STATE` as in Steps, and `BASE=$(git merge-base HEAD origin/main)` (`f1826f56` until the release rebase). At most 3 E2E runs; one heavy job at a time.

1. **Final E2E first.** Run the dev-copy block verbatim, then `mv "$(ls -1d e2e-artifacts/*-seed7 | tail -1)" $STATE/final-e2e` and delete the last `e2e-s*`.
   - It must print `1588/1588 checks passed` (1584 + the 4 S1 added).
   - The report check prints `1588 0` and the four new checks `true`.
   - Repro: the same block; seed 7 gives the same run.
2. **Screens.** Compare `final-e2e/01-globe.png` with `baseline-e2e/01-globe.png` by eye:
   - Expected: the Sign in button is gone, **Anywhere** sits at the right edge and the count line is wider (Finding 6, Decisions). Nothing else moved.
   - `02-board.png`, `04-round-1-end.png` and `05-journal.png` are as in the baseline.
   - Record each pair.
3. **Website.** `npm run site:build`; `npm run site:serve` in the background; `CHROME_PATH=$HOME/.local/bin/chrome-nosandbox npm run e2e:site` exits 0 (record its count); stop the server.
4. **Gates.**
   - `npm run typecheck`, `npm run lint` and `npm test` exit 0, and `npm test` gives **76/76**.
   - `DATABASE_URL=postgres://build@127.0.0.1:1/build NEXT_TELEMETRY_DISABLED=1 npm run build` exits 0.
5. **Packages and redirect.**
   - `npm ls --omit=dev --package-lock-only @clerk/nextjs @clerk/backend @clerk/shared @clerk/react` lists none (exit 1).
   - `grep -c '"node_modules/@clerk/' package-lock.json` prints 0.
   - Record `npm audit --omit=dev` (baseline: 0 vulnerabilities).
   - `grep -c "source: '/login', destination: '/', permanent: true" next.config.mjs` prints 1.
6. **The final grep** prints nothing:
   ```
   git grep -n -i -E 'clerk|SignInButton|UserButton|useAuth|isSignedIn|mergeServerJournal|ServerJournalEntry|clue-game/journal|journal route|create-test-player|\bsigned[- ]in\b|\bsign[- ]?in\b|\bsign[- ]?up\b' -- . ':!plans' ':!docs/research' ':!docs/playtests' ':!package-lock.json' ':!src/site' ':!db' ':!.agents' ':!.gitignore' ':!docs/DEPLOY.md' ':!scripts/e2e.mjs' ':!next.config.mjs'
   ```
   - `awk '/^## /{s=$0} tolower($0) ~ /clerk|sign-in|signed in|sign up|clue-game\/journal/ && s !~ /^## First deploy/' docs/DEPLOY.md` prints nothing.
   - The same `git grep` on `-- scripts/e2e.mjs` prints exactly 7 lines:
     - `const clerkRequests = [];`
     - the `watched` comment
     - the listener's comment and its condition
     - `check('no request goes to Clerk', …)`
     - the journal-route `fetch`
     - `check('the journal route is gone', …)`
   - On `-- next.config.mjs` it prints exactly 1 line: the `/login` redirect's comment.
7. **Schema comments only.** `git diff -U0 $BASE -- db/schema.sql | grep -E '^[+-]' | grep -v -E '^(\+\+\+|---)' | grep -v -E '^[+-]\s*--'` prints nothing, and `git diff --stat $BASE -- db` lists only `db/schema.sql`.
8. **Left alone.** These are empty:
   - `git diff $BASE -- src/site deploy/Caddyfile deploy/check.sh .gitignore` (otherwise the plan says which file a `src/site` build failure forced, and why).
   - `git diff $BASE -- src/clueGame/animalBoard.ts src/components/animalBoard/savedGame.ts` (Goal 8: `ANIMAL_RULES.version` holds).
   - S2's storage check, with `$BASE` for `origin/main`.
9. **Acceptance (Brief Goals).** Tick each with its evidence in the Summary:
   - [ ] G1: files deleted, no `@clerk/*` package, `_app.tsx` a fragment, header without sign-in (V1, V2, V5, V6). Live: no Clerk request, no Clerk name in the HTML, no `x-clerk-` header (Release smoke).
   - [ ] G2: no journal route and no server merge; `mergeJournals` unchanged, with M9's rule and no difference to record; `npm test` 76 (V4, V6, V8). Live 404 (Release smoke).
   - [ ] G3: `/login/` answers 308 to `/` (V1's check, V5). Live, both hosts (Release smoke).
   - [ ] G4: the stored journal is counted and kept byte-for-byte (V1's check). Live: `live-before.json` and `live-after.json` (Release smoke).
   - [ ] G5: every config, CI, doc and agent site (V6, S3, S4).
   - [ ] G6: the handoff item (Release, after smoke).
   - [ ] G7: both CI secrets deleted (Release, after smoke).
   - [ ] G8: no saved-game change (V8), no database change, no content build.

**Release** (the Release unit, not a Step; critter-connect `deploy` rules in `~/.claude/CLAUDE.md`). Record everything under `## Release`.
1. Rebase on `origin/main` and re-run Verification 1–8. If the rebase changes `useJournal.ts`, `journal.ts`, `GlobeScreen.tsx`, `_app.tsx`, `next.config.mjs` or `scripts/e2e.mjs`, retake the final E2E on the new base. Push (`--force-with-lease` after a rebase) and open the PR.
2. CI:
   - `gh pr checks <n> --watch`. `check` must pass.
   - `e2e` gets no Clerk secret now, so a pass proves the game needs no Clerk key. If it fails, rerun once (`gh run rerun <id> --failed`); if it fails again, merge anyway and report the failing step and the run's link.
3. **Just before the merge**, the live baseline:
   - The live-check script with `seed`, then without it, `--out $STATE/live-before.json`. It must show `clerk.critterconnect.org` requests and the header counting the fixture; if it doesn't, fix the script before merging.
   - Record:
     - `curl -s https://play.critterconnect.org/ | grep -c -i clerk`, and the same for `/explore/`.
     - `curl -sI https://play.critterconnect.org/version.txt | grep -c -i '^x-clerk-'`.
     - `curl -sI https://play.critterconnect.org/ | grep -i -E '^(x-clerk-|x-middleware-rewrite|cache-control)'`.
     - The codes of `/`, `/explore/`, `/login/` and `/api/clue-game/journal/` on `play.` (`curl -s -o /dev/null -w '%{http_code}\n' <url>`).
     - `curl -sL -o /dev/null -w '%{http_code} %{url_effective}\n' https://critterconnect.org/login/`.
     - `curl -s https://play.critterconnect.org/api/places/ | jq -c '[.places[].key]'` and `curl -s https://play.critterconnect.org/api/clue-game/pool/ | jq -c '[(.species|length),(.clues|length),(.facts|length)]'`.
4. `gh pr merge <n> --merge`, then `deploy critter-connect`.
5. **Smoke**: each check against step 3's record, retried up to 3 times 30 s apart before it counts as failed.
   - `bash deploy/check.sh` passes, and `version.txt` shows the merge commit.
   - The live-check script without `seed`, `--out $STATE/live-after.json`:
     - no request URL has a hostname containing `clerk`;
     - its `header` equals `live-before.json`'s;
     - its `journal` is byte-for-byte `live-before.json`'s.
   - Both `grep -c -i clerk` counts print 0. `version.txt` and `/` answer with no `x-clerk-` header and no `x-middleware-rewrite`; record `Cache-Control`.
   - `curl -s -o /dev/null -w '%{http_code} %{redirect_url}' https://play.critterconnect.org/login/` prints `308 https://play.critterconnect.org/`, and `https://critterconnect.org/login/` with `-L` ends `200 https://play.critterconnect.org/`.
   - `/api/clue-game/journal/` answers 404, and `/` and `/explore/` answer 200.
   - Same `/api/places/` keys, same pool lengths.
6. A smoke check still failing after its retries is a failed release:
   - On a fresh `origin/main`, `git revert -m 1 <merge>`, push to `main`, run `deploy critter-connect` again, and check that `version.txt` shows the revert and the smoke passes.
   - The secrets stay and the "Delete Clerk" item is not added. Write `Result: failed: <what>`, add a handoff item saying what failed, and end with `MISSION_BLOCKED`.
7. Only after a good smoke:
   - `git fetch origin --prune && git grep -n E2E_CLERK origin/main` prints nothing.
   - `gh secret delete E2E_CLERK_PUBLISHABLE_KEY -R kc0588615/phaser-june` and `gh secret delete E2E_CLERK_SECRET_KEY -R kc0588615/phaser-june`. `gh secret list -R kc0588615/phaser-june` then names neither, and `E2E_DATABASE_URL` stays.
   - The handoff item in `/srv/critter-ai/handoff/critter-connect.md`:
     - Use the next free `H<n>`, titled "Delete Clerk: sign-in is gone from the game", with `Blocks: nothing` and `From: remove-sign-in · <date>`.
     - Its steps are Goal 6's 1–5. Step 2 lists `dig +short CNAME <name>.critterconnect.org` for `clerk`, `accounts`, `clkmail`, `clk._domainkey` and `clk2._domainkey` as answered at writing time.
     - Its reply line: `done` when steps 1–4 are done.
     - No key or value in it.
8. The Summary covers the Brief's list, plus:
   - Finding 6's Anywhere shift;
   - the `check-live-board.mjs` decision;
   - `ANIMAL_RULES.version` unchanged, because no saved-game field changed;
   - no production content build needed;
   - the `git grep -n -i -E 'clerk|sign' -- src/site` lines, for M12.

## Failure modes

The one isolated test is the merge (`tests/clueGame/journal.test.ts`). These are the ways it could fail that S1's ported case and its self-merge case must catch, written before S2 deletes the server merge. M9's existing cases already cover one side only, each field's winner and two empty journals.
1. The port moves a value: once the server entries are a `Journal`, a field (count, best, first or last date, names, class or badge) comes out different from M7's `expected`, which doesn't change.
2. An animal only in `other` (the okapi) is dropped, or loses its class.
3. Merging again with the same journal changes a count, a date or a badge, or adds a field, so the merge isn't safe to repeat. Both the "Safe to repeat" assert and the self-merge case catch this.
4. A self-merge adds `sharpEyes: 0`, or a `className` neither side had, or drops an animal.

Build and release failures, and what catches each:
- `npm uninstall` changes more than Clerk's packages in the lock (S2's numstat), or needs the network. Baseline `npm ci` and `npm audit` reached the registry. If it fails, record the error and rerun once with `--no-audit --no-fund`.
- A leftover `node_modules/@clerk` lets the typecheck pass (S2's `test ! -e`). CI's `npm ci` proves the lock.
- Stale `.next-e2e` types name the deleted page and route (S2's `rm -rf` before the typecheck).
- The Next build still expects `proxy.ts`: S2's `npm run build`. The proxy is optional in Next, and the build proves it.
- CI's `e2e` job still reads the deleted secrets: S3 removes the env lines, and the secrets go only after a good release. A reverted release keeps them.
- The Dockerfile's `build` stage at deploy: only the Release deploy builds it. `deploy.sh` fails the deploy and keeps the live images if the build fails, and the revert rule applies.
- The Clerk lines left in Hetzner's `.env` and `deploy/app.env` are read by nothing (Notes); the owner removes them through the handoff item.
- The DEPLOY.md links get renumbered twice (S4's replacement order).

## Code review (Astra)

## Release

## Decisions

- 2026-11-15 (Architecture): `scripts/check-live-board.mjs:10` comment drops " such as Clerk's," rather than excluding the file from the final grep: the grep doesn't exclude it, the example names a host the game no longer contacts, and an exclusion would weaken the grep for `scripts/`. Comment-only edit.
- 2026-11-15 (Fable review): `docs/DEPLOY.md`'s owner task "Sign up on play.critterconnect.org to test Clerk production sign-in; moot once mission M11 …" is deleted, although the Review corrections say to skip a reworded task: they also say the final check still holds, and the awk check fails on this line.
- 2026-11-15 (Fable review): `mergeJournals`' doc comment stays as it is (Review corrections freeze the function); the planned QR/link transfer is named in `journal.ts`'s header instead.
- 2026-11-15 (Fable review): the DoD's "only the Sign in button is gone … nothing else moved" can't hold. In the header's flex row, **Anywhere** moves right into the button's place and the count line gets wider. That is expected, not a regression, and goes in the Summary.

## Log

- 2026-11-15 16:25 UTC: Baseline. Prereqs (M6, M7) pass; M9 branch (`mergeJournals` exists). typecheck/lint ok, `npm test` 75/75, E2E 1584/1584 (2nd run; 1st failed one A10 timing check). Greps recorded; one new hit, a comment in `scripts/check-live-board.mjs`.
- 2026-11-15 UTC: Architecture (architect). M9 branch confirmed (`mergeJournals` rule = Review corrections); one atomic `src/` step (ClerkProvider/useAuth/auth() coupling); 4 new E2E checks (1584→1588), `npm test` 75→76; DEPLOY.md renumber breaks 3 anchors; Anywhere link shifts into Sign in slot (expected). Plan-only change; verified merge rule and fixture count (4) against code.
- 2026-11-15 UTC: Fable review: APPROVE, MUST-FIX none, MISSED none; 3 SHOULD-CONSIDER (Steps: name the red tests-first E2E state, anchor on quoted text; 3 deviations recorded under Decisions). Verified cited sites against code; DoD grep on e2e.mjs/next.config.mjs clean. Plan-only change.
- 2026-11-15 UTC: Astra review: APPROVE, MUST-FIX none, SHOULD-CONSIDER none. Plan-only change.
- 2026-11-15 UTC: Revision: none needed (both reviews APPROVE, no MUST-FIX). Plan-only change.
- 2026-11-15 UTC: Steps (planner): S1 tests-first red E2E (1585/1588 named fails), S2 atomic src/ + uninstall, S3 CI/deploy/env/ESLint, S4 docs/skill/schema + DoD greps, S5 live-check script; Verification 1588/1588, test 76/76, Release smoke. Plan-only change.
- 2026-11-15 17:10 UTC: S1 tests first: 4 E2E checks + ported/self-merge unit cases. typecheck/lint ok, `npm test` 76/76 (both cases pass at once), E2E 1585/1588 red as designed (Clerk request, /login 200, journal route 200; stored-journal check passes).

## Summary
