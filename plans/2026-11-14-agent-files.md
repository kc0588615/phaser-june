---
mission: agent-files
project: critter-connect
branch: agent/agent-files
status: active
started: 2026-11-14 10:39 UTC
---

# Mission: Agent files: the unused skills and tool folders, the edit hook, the agent instructions (Critter Connect, audit M3)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

Mission M3 of the codebase audit (vault `research/critter-connect/codebase-audit.md`, read findings D17, D1, A15 and S1 and the M3 entry in full). The owner's answers below override the audit where they differ. When it's done:

1. **D1, as the owner decided (wider than the audit's table):** `.agents/skills/` holds exactly these 11 folders, untouched: `graphical-ui`, `graphical-convert`, `graphical-audit`, `smux`, `react-doctor`, `improve`, `frontend-design`, `code-review`, `diagnosing-bugs`, `writing-for-agents`, `retro`.
   - The other 34 are deleted: `ask-matt`, `claude-handoff`, `codebase-design`, `domain-modeling`, `git-guardrails-claude-code`, `grill-me`, `grill-with-docs`, `grilling`, `handoff`, `implement`, `implement-spec`, `improve-codebase-architecture`, `loop-me`, `migrate-to-shoehorn`, `pr`, `prototype`, `research`, `resolving-merge-conflicts`, `scaffold-exercises`, `setup-matt-pocock-skills`, `setup-pre-commit`, `setup-ts-deep-modules`, `tdd`, `teach`, `to-questionnaire`, `to-spec`, `to-tickets`, `triage`, `wait-what`, `wayfinder`, `wizard`, `writing-beats`, `writing-fragments`, `writing-shape`.
   - `skills-lock.json` keeps `"version": 1` and exactly 6 entries: `code-review`, `diagnosing-bugs`, `frontend-design`, `retro`, `smux`, `writing-for-agents`. All 34 deleted skills are locked today (40 entries), so 34 entries go. The other 5 kept folders have never been in the lock, and stay out of it.
   - Every repo file outside `plans/` that names a deleted skill is corrected. On `origin/main` (2aa3bd2c) these are all of them:
     - `docs/agents/issue-tracker.md`: delete the "Pull requests as a triage surface" section (it exists for `/triage`) and the "Wayfinding operations" section (for `/wayfinder`, with the `research`/`prototype`/`grilling` ticket types). Move its sentence that a bare `#42` may be an issue or a PR into Conventions. The file stays: the kept `code-review` reads it.
     - `docs/agents/domain.md`: the sentence naming `/domain-modeling`, `/grill-with-docs` and `/improve-codebase-architecture` goes, and "proceed silently" stays. The glossary-gap line ends with "note it in your output" in place of "note it for `/domain-modeling`". Its "This repo:" line is S1's (item 4).
     - `.agents/skills/code-review/SKILL.md:13` tells the user to run `/setup-matt-pocock-skills`. It's a kept vendored skill, reinstalled from the lock, so it isn't edited. The plan and the Summary note it.
   - Checked and naming no deleted skill: `AGENTS.md`, `CODING_STANDARDS.md`, `GUI.md`, `CONTEXT.md`, `README.md`, `docs/agents/triage-labels.md`, `.claude/` and the other 10 kept skills. `retro` calls only `writing-for-agents`, which stays.
   - **Add the link `.claude/skills/writing-for-agents` → `../../.agents/skills/writing-for-agents`** (owner, 2026-11-14), made the same way as the existing `.claude/skills/retro` link (`../../.agents/skills/retro`). Without it, Claude Code can't load the skill `retro` calls first, and the owner uses `retro`.
2. **D17:** `.codex` (empty), `.kiro/` (one file, a copy of `react-doctor`) and `.understand-anything/` (one tracked file) are deleted, with `.gitignore`'s two lines for the last one (`/.understand-anything/*` and `!/.understand-anything/.understandignore`). The `# Generated tool output` comment and `/.playwright-mcp/` stay.
3. **A15:** the edit hook and CI's guard check paths as well as content:
   - `.claude/hooks/guard-edits.sh` blocks a Write or Edit of any file whose base name is `.env`, `.env.*` or `*.env` (so `deploy/app.env` and a root `app.env`), and of any `*.prisma` file by its path.
   - Its content pattern has `schema\.prisma`, where it has the typo `prisma\.schema` today, matching CI's.
   - Its header comments say what it blocks.
   - `.github/workflows/ci.yml` gets a new step of its own in the `check` job, "No Prisma schema files", whose `run:` is the single command `! git ls-files '*.prisma' | grep .`. It is a separate step because GitHub runs `run:` with `bash -e`, which doesn't stop on a `!` command, so a second line in the existing step would silence the first one's check. The existing "No Supabase/Prisma" step stays as it is.
4. **S1:** the instruction lines the audit shows false say what is true. M6 has already fixed the ones about the save route, the Drizzle models and profiles. Re-read each line on a fresh `origin/main`. On the final commit:
   - **`AGENTS.md`** (quoted, because M6 shifts its line numbers):
     - "App/runtime traffic uses `DATABASE_URL` through TLS PgBouncer on port 6432" says the deployed app connects as `critter_app` straight to the db container (`deploy/app.env.example`), and that agents and scripts go through PgBouncer with TLS on port 6432.
     - "React <-> Phaser only via typed `EventBus.ts` (`gems-matched`, …, `current-scene-ready`)" says React and Phaser talk through the typed `EventBus.ts` (its event map lists the events), and that the screens also import `sfx.ts` and `debugBridge.ts` directly. The 8-event list goes.
     - The Data line names no expedition tables ("the old expedition tables still exist in Postgres" goes; M13 inventories the live database). "Scripts connect via `scripts/connect.ts`" names the two that don't: `scripts/db` (psql) and `scripts/import-natural-earth.mjs`.
     - "Single-context: root `CONTEXT.md` + `docs/adr/`" says root `CONTEXT.md` and no ADRs (`docs/adr/` has never existed).
   - **`docs/agents/domain.md`**'s "This repo:" line says the same as `AGENTS.md`: single-context, root `CONTEXT.md`, no `docs/adr/`.
   - **`CODING_STANDARDS.md`**: the try/catch rule's list drops TiTiler and keeps the rest, Clerk included.
   - **`.claude/skills/playtest/SKILL.md`:**
     - The intro says the chrome-devtools MCP is set up per machine: the repo's `.mcp.json` starts only `context7` and `playwright`.
     - The globe card drops "and a habitat picture (TiTiler, 1–5 s; hidden if it fails)".
     - Found animals come from the journal's entries (`GlobeScreen.tsx`: `journal[animal.scientificName]`), not its sightings. M6 corrects this line; it ends up true either way.
     - The how-to key is `critter-connect:animal-board-how-to:v5` (`ANIMAL_HOW_TO_KEY`, `src/components/animalBoard/AnimalSheets.tsx:27`).
     - "Invariants to check each move (`npm run e2e` checks these too)" says that the E2E doesn't check the no-page-scroll and 44 px parts of the last bullet.
     - The out-of-moves invariant says that a right name is a find and that a wrong name or a skip loses the round (`nameIt` in `src/clueGame/animalBoard.ts`).
     - The bridge table gains `touchedBy(move)` and `nearColorsBy(move)` (`src/game/debugBridge.ts:214`, `:216`).
   - S1's `plan-new` item is already done: PR #71 anchored its numbering on the dash.

### Why

These are the files every agent reads before it works in the repo, on machines where agents merge and deploy by themselves. The deleted skills are ones no tool loads for this repo except Codex, and the owner doesn't use them. Several of them told agents to break the repo's rules, and the docs that pointed at them sent agents to commands that won't exist. The hook and CI's guard are the repo's gates against editing secrets and bringing Prisma back, and today both miss a file by its name.

### Scope

In:
- `.agents/skills/` (deleting the 34 folders only) and `skills-lock.json`
- `.codex`, `.kiro/`, `.understand-anything/`, `.gitignore` (the two lines)
- `.claude/hooks/guard-edits.sh`; the new link `.claude/skills/writing-for-agents`; `.github/workflows/ci.yml` (the new step)
- `AGENTS.md`, `CODING_STANDARDS.md`, `docs/agents/issue-tracker.md`, `docs/agents/domain.md`, `.claude/skills/playtest/SKILL.md`

Out:
- **The 11 kept skill folders**, even where one names a deleted skill (`code-review`) or conflicts with a repo rule (`react-doctor`, `frontend-design`): the owner keeps them, as vendored copies.
- **`.claude/`** beyond the hook and the playtest skill: `settings.json`, `session-start.sh`, `plan-new`, and the `retro` and `postgres-tunnel` links (K15). Add no other link than `writing-for-agents`.
- **Sign-in.** Every line about Clerk stays as it is: `AGENTS.md`'s Auth and Env lines, the playtest skill's sign-in steps, and "Clerk" in `CODING_STANDARDS.md`. Mission M11 removes sign-in.
- **Lines other missions own:**
  - `AGENTS.md`'s rules-module list (`gems`, D8; "rule experiments", S18: M7) and the lines the audit assigns to S7, A2, D18, S10, S11, A10 and A14.
  - The playtest skill's sightings invariant ("a find adds a sighting", D14: M7) and its "in full `docs/ANIMAL_BOARD_PAPER.md` §2" pointer (S10: M7).
  - The lines M6 corrected.
- **The safeguards:** the owner-only content build line, the dump-first line, and "No destructive git commands unless explicitly asked". They stay word for word.
- `docs/agents/triage-labels.md`, `GUI.md`, `gui/`, `CONTEXT.md`, and `plans/` (records).
- No database, no content build, no GitHub setting, and no branch other than `agent/agent-files` (no scratch branch for the CI test).

### Definition of done

- **Baseline, before any change.** Record each item in the plan, or in `/srv/critter-ai/agent-state/missions/agent-files/`:
  - **Fresh greps.** On a fresh `origin/main` (M6 and M1 have merged by then), re-run the final greps below. Record each hit: those are the sites to fix. A hit this brief doesn't list is fixed in the same way: a doc is reworded, and a kept vendored skill gets a note only.
  - **The lock.** Save the output of `python3 -I /srv/critter-ai/agent-state/missions/critter-connect-audit/audit/area-8/tools/lock-hash.py <worktree>` to `lock-before.txt`. Expect `folders 45 | locked 40 | v1 matches 40`.
  - **The hook.** Run a control run of the current hook to `guard-before.txt`: the same cases as `/srv/critter-ai/agent-state/missions/critter-connect-audit/audit/area-8/guard-control.txt`, plus "Write `app.env` at the root". Feed it the JSON a `PreToolUse` hook gets on stdin, and record the exit codes. Expect them to match the audit's file.
  - **Checks.** `npm run typecheck`, `npm run lint` and `npm test` exit 0. Record the test count.
  - **Live baseline** in `live-before.txt`:
    - `version.txt`;
    - the HTTP status of `https://play.critterconnect.org/`, `/explore/`, `/api/places/`, `/api/clue-game/pool/` and `https://critterconnect.org/`;
    - the `sha256sum` of the `/api/places/` body.
- **On the final commit:**
  - `npm run typecheck`, `npm run lint` and `npm test` exit 0, with the baseline's test count. Nothing they cover changes.
  - `ls .agents/skills` lists exactly the 11 kept folders. `test -f .claude/skills/retro/SKILL.md` passes.
  - `lock-hash.py` prints `folders 11 | locked 6 | v1 matches 6` and `lock entries with no folder: []`. The 5 "not in lock" lines are the three `graphical-*` skills, `react-doctor` and `improve`. Save the output as `lock-after.txt`.
  - This prints nothing (the plan is excluded as a record, and `code-review` as the kept vendored skill noted under Goal):
    ```
    N='ask-matt|claude-handoff|codebase-design|domain-modeling|git-guardrails-claude-code|grill-me|grill-with-docs|grilling|handoff|implement-spec|implement|improve-codebase-architecture|loop-me|migrate-to-shoehorn|pr|prototype|research|resolving-merge-conflicts|scaffold-exercises|setup-matt-pocock-skills|setup-pre-commit|setup-ts-deep-modules|tdd|teach|to-questionnaire|to-spec|to-tickets|triage|wait-what|wayfinder|wizard|writing-beats|writing-fragments|writing-shape'
    git grep -n -I -P "(?<![\w./-])/($N)(?![\w/.-])|\`/?($N)\`|skills/($N)\b|\b($N) skills?\b|\bwayfinder\b|matt-pocock" -- . ':!plans' ':!.agents/skills/code-review/SKILL.md'
    ```
    On `origin/main` today it prints the six `docs/agents/` lines under Goal 1, plus lines inside the 34 folders. It is shaped to skip the common words (`docs/research/`, "triage labels"), so a `pr` or `research` in prose is no hit.
  - `git grep -n -I -E '\.kiro|understand-anything|understandignore|(^|[^/~])\.codex\b' -- . ':!plans'` prints nothing. `docs/DEPLOY.md`'s `~/.codex/` is a home-folder path and doesn't match.
  - `git grep -n -i titiler -- AGENTS.md CODING_STANDARDS.md .claude` and `git grep -n 'how-to:v4' -- .claude` print nothing.
  - **The hook's control run** (`guard-after.txt`), on the same cases as the baseline:
    - These now give exit 2: Write `deploy/app.env`; Write `app.env` at the root; content that names the Prisma schema file (`prisma/` + `schema.prisma`); Write of a minimal Prisma schema file at `prisma/` (a generator, a datasource and one model, naming no Prisma package).
    - Every other case keeps its baseline exit code. That includes `.env.local` and `.env.example` (2), a Prisma client import (2), `deploy/app.env.example` (0), prose naming Supabase (0) and a normal Edit of a `src/` file (0).
    - `bash -n .claude/hooks/guard-edits.sh` passes.
  - **CI's new step, tried locally** (`ci-guard.txt`):
    - In a throwaway `git worktree` of the final commit under `/tmp`, with a minimal `prisma/schema.prisma` added with `git add` (never committed or pushed), the step's command exits non-zero and prints the file.
    - On the final commit as it is, it exits 0.
    - The existing "No Supabase/Prisma" command still exits 0.
    - Remove the worktree afterwards.
  - `git diff --stat origin/main...HEAD` touches only the paths under Scope "In" and the plan.
- **No E2E in this mission.** No file the game builds, serves or runs changes. CI's `e2e` job still runs on the PR.
- **Release** (critter-connect's release rules: CI's `check` job must pass, and it runs the new step; a failed `e2e` job is rerun once, then reported; a failed deploy or smoke test is reverted). Nothing that ships changes, so the deploy rebuilds the same game with a new stamp.
  - In the release session, right before the merge, record the live baseline again, as `live-release-before.txt`.
  - Smoke after the deploy: `bash deploy/check.sh` passes and `version.txt` shows the merge commit. The five URLs answer with the same status codes as `live-release-before.txt`, and the `/api/places/` body has the same `sha256sum`.
- **The Summary** lists:
  - the deleted folders and files, the kept skills and the lock's 6 entries;
  - every reference corrected, and the vendored-skill notes (`code-review:13`);
  - the hook's before and after exit codes, the local CI test and the smoke results;
  - the new `.claude/skills/writing-for-agents` link, and `readlink` of it resolving to an existing folder;
  - that no production content build is needed.

### Decision rules

- Delete only what Goal names. Anything else that looks dead or false is a note in the plan, not an edit.
- Don't run `npx skills`: it is a network install (`AGENTS.md`: "Avoid network installs"). Remove the folders with `git rm`, and the lock entries as JSON, keeping the file's formatting.
- An S1 line another mission has already made true stays as that mission left it. An S1 line about something a later mission deletes stays out of scope (see Out), even if it reads oddly.
- Each reworded instruction line stays as short as the original, and says only what the code or a file in the repo shows.

### Notes

- **Owner's answers (Danby, 2026-11-14):**
  - He keeps the 11 skills listed under Goal. The three `graphical-*` skills are required by `AGENTS.md`. Codex has used `smux`, `react-doctor`, `improve`, `frontend-design`, `code-review`, `diagnosing-bugs` and `writing-for-agents`. `retro` is linked for Claude Code, and he ran it on 2026-11-02.
  - He doesn't use Kiro or Understand Anything.
  - A15 and S1 go ahead as the audit says. The game isn't released to the public yet. Clerk is removed later (M11).
- **Order.** M6 (server-cleanup) and M1 (next-advisory) merge before this mission. M6 edits the `AGENTS.md` lines about the route, the Drizzle models and profiles, and the playtest skill's save and sightings lines. The audit pinned `4fa92a8e`. PR #71 (`2aa3bd2c`) then changed `README.md`, `plans/README.md` and `plan-new`. Re-read every site on a fresh `origin/main`.
- **The hook guards its own edits.** It blocks an Edit or Write whose text holds a Supabase or Prisma package name, and that includes its own pattern line and CI's guard line. So change those two lines from the shell (a heredoc, or `sed` on a copy that then replaces the file), not with the Edit tool. The hook sees only Claude Code's Edit and Write tools.
- **Once the new hook is in the worktree,** it applies to this mission's own sessions, so it blocks any later Edit or Write of the plan whose text holds the Prisma schema file's full name. In the plan, write it as `*.prisma`.
- **How `bash -e` treats `!`:** Bash's `set -e` doesn't stop on a command negated with `!`. A `run:` block's exit status is that of its last command, which is why each guard keeps its own step.
- **Already true (checked against `origin/main`):**
  - `deploy/app.env.example:4-6` routes the app as `critter_app` to `@db:5432` "(no TLS needed inside it)". Which host the live `deploy/app.env` names can't be read from git (Q29). The new `AGENTS.md` line describes the example, not the server. Don't SSH to Hetzner to check.
  - `AnimalGame.tsx:19` imports `@/game/sfx`, and `useAnimalSession.ts:21` imports `@/game/debugBridge`.
  - `EventBus.ts` holds 17 events.
  - `scripts/import-natural-earth.mjs` opens its own `postgres(` connection. M10 (D7) deletes it, and drops it from that `AGENTS.md` line then.
  - `scripts/e2e.mjs` has no page-scroll or 44 px check (its two `scrollHeight` hits are element scrolls).
  - `nameIt` returns `status: 'found'` for a right name out of moves.
  - `CONTEXT.md` exists, and `docs/adr/` doesn't.
- **The pre-push hook** runs typecheck and lint. The `gh` token has the `workflow` scope, so the `ci.yml` change can be pushed. CI ignores a PR that changes only `**.md`, but this one changes `.json`, `.sh`, `.yml` and the deleted skills' other files, so CI runs.
- **Size:** about 12 sessions (the audit estimates 13).

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

Taken 2026-11-14 10:40-10:41 UTC on `origin/main` `e91ad1fa` (M6 and M1 merged; branch = origin/main + mission start commit). Files in `/srv/critter-ai/agent-state/missions/agent-files/` (`$ST`).

- **Checks:** `npm run typecheck` 0, `npm run lint` 0, `npm test` 0: **61 tests, 61 pass** (`$ST/*-before.log`). No install or migration needed (node_modules present; repo has no migrations). **No E2E**: the brief says "No E2E in this mission" (no file the game builds, serves or runs changes); CI's `e2e` job runs on the PR.
- **Lock** (`$ST/lock-before.txt`): `folders 45 | locked 40 | v1 matches 40 | v2 matches 0`, `lock entries with no folder: []`. As expected.
- **Hook** (`$ST/guard-before.txt`, runner `$ST/tools/guard-run.sh <hook>`): all 19 audit cases give the audit's exit codes. Added: Write `app.env` at root 0, normal Edit of a `src/` file 0. So today: `deploy/app.env` 0, root `app.env` 0, content naming the schema file 0, a `*.prisma` file with a plain schema body 0.
- **Live** (`$ST/live-before.txt`): `version.txt` `e91ad1fa…`; `/`, `/explore/`, `/api/places/`, `/api/clue-game/pool/`, `critterconnect.org/` all 200; `/api/places/` sha256 `1472dfe4…bd10` (stable across two fetches).
- **Fresh greps** (`$ST/greps-before.txt`). Sites outside the 34 folders, all already listed in the brief, nothing new:
  - grep 1 (deleted skill names): `docs/agents/domain.md:13` (`/domain-modeling`, `/grill-with-docs`, `/improve-codebase-architecture`), `:47` ("note it for `/domain-modeling`"); `docs/agents/issue-tracker.md:18` (`/triage` flag, PR section), `:38-41` (Wayfinding section); `skills-lock.json:142,145,207,210` (entries that go with the lock edit). The rest: 76 hits inside deleted folders (`ask-matt` 33, `setup-matt-pocock-skills` 22, `wayfinder` 6, others ≤4).
  - grep 2 (tool folders): `.gitignore:49-50`, `.understand-anything/.understandignore:1`.
  - grep 3 (TiTiler): `.claude/skills/playtest/SKILL.md:34`, `CODING_STANDARDS.md:5`.
  - grep 4 (`how-to:v4`): `.claude/skills/playtest/SKILL.md:40`.

## Architecture

Read on `origin/main` `e91ad1fa` (fetched 2026-11-14; the branch is it plus this plan). Each site re-read there. The hook, CI step and lock edit below were dry-run outside the repo: a `/tmp` copy of the hook through `$ST/tools/guard-run.sh`, a detached throwaway worktree for CI's command, and the lock filtered into a temp file. All of them were removed afterwards.

### Findings (ranked by impact)

1. **A15: the hook misses files by name** (fail fast; the gate breaks its own header).
   - `.claude/hooks/guard-edits.sh:7-9`: the env arm matches base name `.env|.env.*` only, so `deploy/app.env` and a root `app.env` pass (baseline 0). Nothing checks a `*.prisma` path, so a plain Prisma schema file passes (0).
   - `:11`: the content alternative `prisma\.schema` is a typo for CI's `schema\.prisma` (`ci.yml:24`), so content that names the schema file passes (0).
   - `:4` cites "(AGENTS.md: zero references)": `AGENTS.md` has no such line, only `:8` "migrated from Prisma". `:12`'s "Drizzle-only (AGENTS.md)" is the true form.
   - The file is mode 100755, and `.claude/settings.json:7` runs it directly.
   - Not in scope: an `edits[]` payload passes (0). The baseline keeps it.
2. **A15: CI's guard checks content only.** `.github/workflows/ci.yml:22-24` greps 5 paths for package names and checks no file name. Verified in `/tmp`: `bash -e -c "! git ls-files '*.prisma' | grep ."` exits 0 on a clean tree. It exits 1 with a staged `prisma/x.prisma` and prints the file, so the git pathspec `*` crosses `/`. The same line followed by a second command exits 0, which is the silencing the brief describes.
3. **D1: 34 unused skill folders and their 34 lock entries.**
   - The 45 folders hold 119 tracked files, none of them `.ts`, so typecheck, lint and test are unaffected. No untracked or ignored file sits in them, so `git rm -r` empties them.
   - `skills-lock.json` is `{"version": 1, "skills": {<name>: {source, sourceType, skillPath, computedHash}}}`: 2-space indent, keys sorted, ASCII, trailing LF. `json.dumps(d, indent=2) + "\n"` reproduces it byte for byte today. Filtered to the 6 entries, it gives a pure-deletion diff: 0 added, 204 deleted (34 × 6 lines).
   - Dry run of grep 1 with the 34 folders excluded: the only hits are the six `docs/agents/` lines (finding 4) and the lock's `:142,145,207,210`, which go with the lock edit. No kept folder other than `code-review` has a hit.
4. **D1: docs that point at deleted skills** (they send agents to commands that won't exist).
   - `docs/agents/issue-tracker.md:16-26`: the PR-triage section with the `/triage` flag. Its `:26` is the bare `#42` sentence, which is kept.
   - `docs/agents/issue-tracker.md:36-45`: the Wayfinding section, to the end of the file.
   - `docs/agents/domain.md:13`: its third sentence. `:47`: its parenthetical.
   - `.agents/skills/code-review/SKILL.md:13` names `/setup-matt-pocock-skills`. It's a vendored skill, so this is a note only.
5. **D1: `retro` can't reach `writing-for-agents` in Claude Code.** `.agents/skills/retro/SKILL.md:11` calls the Skill tool with `writing-for-agents`. `.claude/skills/` has only `retro -> ../../.agents/skills/retro` (mode 120000, 26 bytes) and `postgres-tunnel`.
6. **S1: `AGENTS.md`** (line numbers on `e91ad1fa`).
   - `:19` is **already true**: M6 (`ea110ad5`) rewrote it as agents and scripts through PgBouncer TLS on 6432, and the live app as `critter_app` straight to the db container (`deploy/app.env.example`). No edit, per the decision rule.
   - `:55` "React <-> Phaser only via typed `EventBus.ts` (8 events)":
     - `EventPayloads` has 17 keys.
     - `AnimalGame.tsx:19` imports `@/game/sfx`, and `useAnimalSession.ts:21` imports `@/game/debugBridge`.
     - The screens also import pure helpers (`constants`, `motion`, `faceGlyphs`, `BoardModel` types) and `main` (the `PhaserGame` host). The new line drops "only" and lists no complete set, so it stays true.
     - `src/game/EventBus.ts:2`'s "Neither side imports the other" is false in the same way. That's a note only: it's a src file, out of scope.
   - `:56`: "the old expedition tables still exist in Postgres" can't be confirmed from git. "Scripts connect via `scripts/connect.ts`" isn't true of `scripts/db` (psql) or of `scripts/import-natural-earth.mjs:17` (its own `postgres(`). The other four database scripts use it: `clue-world-map.ts`, `content.ts`, `iucn.ts` and `shots/run.mjs`.
   - `:92` names `docs/adr/`, which has never existed. `CONTEXT.md` exists.
7. **S1: the other files.**
   - `docs/agents/domain.md:5` makes the same `docs/adr/` claim.
   - `CODING_STANDARDS.md:5` still lists TiTiler.
   - The playtest skill:
     - `:8`: the chrome-devtools MCP isn't in the repo. `.mcp.json` starts only `context7` and `playwright`.
     - `:34`: the habitat picture is gone. `PlaceCard.tsx` has no image.
     - `:36` is **already true**: M6 made it "journal's finds", matching `GlobeScreen.tsx:40`.
     - `:40`: the how-to key is `v4`, and `AnimalSheets.tsx:27` has `v5`.
     - `:42`: `scripts/e2e.mjs:757` checks the 210 px board floor, but nothing checks page scroll or 44 px.
     - `:48`: `nameIt` (`animalBoard.ts:436-447`) gives right → `found`, wrong → `lost`, and `null` → `lost`. `null` is the Skip button at `AnimalSheets.tsx:561`.
     - `:61-72`: the bridge table lacks `touchedBy` and `nearColorsBy` (`debugBridge.ts:214,216`). They return `number[]` and `Array<[id, colors]>` (`BoardModel.ts:57,328-333`).
8. **D17.** `.codex` is 0 bytes, `.kiro/skills/react-doctor/SKILL.md` is the only file in `.kiro/`, and `.understand-anything/.understandignore` is the only file in its folder. `.gitignore:49-50` exist for the last one. `:47` (the comment) and `:48` (`/.playwright-mcp/`) stay.

**Fine as is:** `.claude/settings.json`, `session-start.sh`, `plan-new` and the other 10 kept skills name no deleted skill. Outside `plans/`, nothing names the Prisma schema file. No tracked file has a base name matching `*.env` or `*.prisma`. The tracked env files are `.env.example`, `.env.local.example`, `.env.vps.example` and `deploy/app.env.example`. `domain.md:11` and its tree diagrams are template text, covered by `:13`'s "proceed silently", so they stay. The `triage-labels.md` file and section are out of scope.

### Target design

**Deletions (D1, D17).**
- Remove the 34 folders and the 3 D17 files with one `git rm -r -q --` command.
- Delete `.gitignore:49-50` only.
- Edit the lock as JSON (no Edit tool, no `npx skills`):
  ```
  python3 -I -c "import json;p='skills-lock.json';d=json.load(open(p));k={'code-review','diagnosing-bugs','frontend-design','retro','smux','writing-for-agents'};d['skills']={n:e for n,e in d['skills'].items() if n in k};open(p,'w').write(json.dumps(d,indent=2)+'\n')"
  ```
  Then check: `git diff --numstat -- skills-lock.json` gives `0 204`, and `lock-hash.py` gives `folders 11 | locked 6 | v1 matches 6` and `lock entries with no folder: []`.
- Add the link: `ln -s ../../.agents/skills/writing-for-agents .claude/skills/writing-for-agents`, then `git add` it. `git ls-files -s` shows 120000, as for `retro`, and `test -f .claude/skills/writing-for-agents/SKILL.md` passes.

**Docs (D1).**
- `issue-tracker.md`: delete `:16-27` and `:35-45`. After `:14`, add a blank line and `:26` word for word. The file ends with the "fetch" section and one LF.
- `domain.md:13` becomes: `If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront.`
- `domain.md:47`: its parenthetical becomes `(note it in your output)`.

**S1 wording.** Only the quoted fragment changes. The rest of each line stays byte-identical, and each new fragment is no longer than the old one, except where the brief asks for added facts.
- `AGENTS.md:55`: `React <-> Phaser only via typed \`EventBus.ts\` (…8 events…).` becomes `React <-> Phaser via typed \`EventBus.ts\` (its \`EventPayloads\` map lists the events); the screens also import \`sfx.ts\` and \`debugBridge.ts\` directly.`
- `AGENTS.md:56`:
  - Drop `; the old expedition tables still exist in Postgres`, so the sentence ends `…raw SQL (\`docs/DRIZZLE_ORM_GUIDE.md\`).`
  - `Scripts connect via \`scripts/connect.ts\`.` becomes `Scripts connect via \`scripts/connect.ts\`, except \`scripts/db\` (psql) and \`scripts/import-natural-earth.mjs\`.`
- `AGENTS.md:92` becomes: `Single-context: root \`CONTEXT.md\`; no ADRs (no \`docs/adr/\`). See \`docs/agents/domain.md\`.`
- `domain.md:5` becomes: `This repo: single-context (root \`CONTEXT.md\`; no ADRs, no \`docs/adr/\`).`
- `CODING_STANDARDS.md:5`: `(Postgres, fetch, Clerk, TiTiler)` becomes `(Postgres, fetch, Clerk)`.
- The playtest skill:
  - `:8`: `Drive the dev build through the chrome-devtools MCP like a player.` becomes `Drive the dev build like a player through the chrome-devtools MCP (set up per machine: the repo's \`.mcp.json\` starts only \`context7\` and \`playwright\`).`
  - `:34`: `found animals by name, \`?\` for the rest, and a habitat picture (TiTiler, 1–5 s; hidden if it fails).` becomes `found animals by name and \`?\` for the rest.`
  - `:40`: `how-to:v4` becomes `how-to:v5`. Nothing else in the line changes; its §2 pointer belongs to M7.
  - `:42`: `(\`npm run e2e\` checks these too):` becomes `(\`npm run e2e\` checks these too, except the last one's no page scroll and 44 px buttons):`
  - `:48` becomes: `- Out of moves: the name sheet shows; a right name is a find, a wrong name or Skip loses the round (\`nameIt\`).`
  - New table rows after `validMoves()`:
    `| \`touchedBy(move)\` | ids of the pinned animals the move's first clear would touch (the release preview) |`
    `| \`nearColorsBy(move)\` | the same as \`[id, colors]\`: the gem colors cleared next to each tile (what the move would scout) |`
- Untouched: `AGENTS.md:19` and playtest `:36` (already true), the safeguard lines (`AGENTS.md:38`, `:39`, `:71`), the Clerk lines, and the lines other missions own.

**A15: the hook.** Here is the target. The regex line is shown as `<PATTERN>` because it holds the package names that the hook itself blocks.
```bash
#!/usr/bin/env bash
# PreToolUse guard for Edit|Write. Exit 2 blocks the tool call.
# 1. Never edit an env file: base name .env, .env.* or *.env (DATABASE_URL and keys live there, e.g. deploy/app.env).
# 2. Never add a Prisma file (*.prisma, by path) or a Supabase/Prisma reference (by content): Drizzle only (AGENTS.md).
input=$(cat)
read -r file < <(…unchanged…)
case "$(basename "$file")" in
  .env|.env.*|*.env) echo "blocked: $file is an env file; edit it manually" >&2; exit 2 ;;
  *.prisma) echo "blocked: $file is a Prisma file; project is Drizzle-only (AGENTS.md)" >&2; exit 2 ;;
esac
content=$(…unchanged…)
if printf '%s' "$content" | grep -qiE '<PATTERN>'; then   # only change in it: prisma\.schema -> schema\.prisma
  …unchanged…
```
- How to make it:
  - Use the Edit tool for `:3-4` and `:8` plus the new arm. Their text names no package.
  - Fix the pattern token from the shell: `sed -i 's/prisma\\.schema/schema\\.prisma/' .claude/hooks/guard-edits.sh`. GNU sed keeps the file's mode.
  - Then check: `grep -c 'schema\\.prisma'` gives 1, `bash -n` passes, `test -x` passes, and `git diff --summary` shows no mode change.
- Dry run of exactly this on a `/tmp` copy:
  - The four target cases go from 0 to 2. `deploy/app.env` and the root `app.env` hit the env arm, content that names the file hits the content rule, and the plain-body file hits the `*.prisma` arm.
  - The other 17 cases keep their baseline codes:
    - `.env.example` and `.env.vps.example` give 2.
    - `deploy/app.env.example` gives 0: its base name `app.env.example` matches neither `.env.*` nor `*.env`.
    - `{}` gives 0, because `basename ""` is empty.

**A15: CI.** Insert this after `ci.yml:24`, before the `:25` comment. Anchor the Edit on `:25`, so its new text doesn't include `:24`. The existing step stays as it is.
```yaml
      # A Prisma schema names no package, so check file names too. Own step: `bash -e` doesn't stop on a `!` command.
      - name: No Prisma schema files
        run: |
          ! git ls-files '*.prisma' | grep .
```

### Constraints to carry into Steps
- **The new hook is live as soon as it's saved:** the script runs on every call. From then on, the hook refuses an Edit or Write if its new text names the schema file, or if the target path is an env file or a `*.prisma` file.
  - In the plan, write `*.prisma`. Brief lines 101 and 105 already hold the full name, so never Write the whole plan, and never put those lines in an Edit's new text.
  - Create test files with such names from the shell only, `/tmp` included. That covers the CI dry run's schema file and any `.env` file.
- **Never Edit or Write a whole line that holds package names** (the hook's `:11` or `ci.yml:24`). The plan doesn't quote them.
- **Keep the hook at 100755.** A hook that isn't executable exits 126, which Claude Code treats as a non-blocking error, so the gate fails open silently. `guard-run.sh` runs `bash "$hook"`, so it can't see this. A syntax error, by contrast, exits 2 and blocks every edit, so it fails closed and loudly.
- **`bash -e` and `!`:** GitHub runs a `run:` block with `bash -e {0}`, so each guard needs its own step. Reproduce it locally as `bash -e -c '<cmd>'`.
- **No `npx skills`.** Run the lock edit with `python3 -I`.
- **No E2E.** No built or served file changes, and CI's `e2e` job runs on the PR.
- **CI dry run:** use `git worktree add --detach /tmp/<dir> HEAD` (so no branch), then `git worktree remove --force`.

### Risks and how verification catches them
- **The hook blocks a legitimate file.** No tracked file matches `*.env` or `*.prisma`. The env arm checks the base name only, so `deploy/app.env.example` and docs that name `deploy/app.env` stay editable. Caught by `guard-after.txt`: `deploy/app.env.example` 0, the normal `src/` edit 0, and Supabase prose 0.
- **The hook fails open.** Caught by `test -x` and `git diff --summary`. Optional live probe: a Write tool call to `/tmp/<dir>/app.env` is refused with the hook's message, which proves the settings wiring and the exec bit.
- **The fixed content rule now blocks prose that names the schema file**, in plans too. Accepted: it matches CI's pattern and the brief chose it, and outside `plans/` no such prose exists today.
- **The lock's formatting drifts, or a wrong entry goes.** Caught by `numstat` `0 204` and by `lock-hash.py` (6 entries matching, none missing).
- **A safeguard or an out-of-scope line changes by accident.** `git diff -U0 origin/main -- AGENTS.md` must show only `:55`, `:56` and `:92`. In the playtest diff, only `:8`, `:34`, `:40`, `:42` and `:48` change, plus the 2 new rows. `git diff --stat origin/main...HEAD` covers only Scope "In".
- **CI's step is silenced or never fires.** Caught by the throwaway-worktree test: exit 1 with the file staged, 0 without. The real `check` job on the PR runs it too.

### Rejected alternatives
- `npx skills remove`: it's a network install, which the brief forbids.
- Hand-editing the lock with Edit: 34 separate deletions are easy to get wrong, and the JSON round-trip is proven byte-identical.
- Rewriting the whole hook from a heredoc: the plan would have to hold the blocked pattern line, and the hook would refuse that plan edit. One Edit plus one `sed` is smaller.
- Two `!` lines in the existing CI step: under `bash -e` the first check is silenced (verified).
- `shell: bash` (pipefail) or an `if …; then exit 1; fi` form: it changes the existing step, which the brief keeps.
- Matching Prisma schema keywords (`generator`, `datasource`) in content: false positives, where the path rule is exact.
- A second `[[ … ]]` test for the path: an arm in the existing `case` is simpler.

## Architecture review (Fable)

VERDICT: APPROVE

Checked on `7082fb64` (= `origin/main` `e91ad1fa` + plan). Every cited site opened. Re-ran in a `/tmp` folder (removed after): the target hook through `$ST/tools/guard-run.sh` (only the 4 target cases change 0 -> 2, the other 17 keep their codes, `bash -n` ok, mode kept by `sed -i`, pattern count 1); the lock filter (`0 204`, the 6 entries, round-trip byte-identical); CI's command under `bash -e -c` (0 clean, 1 and prints the file with a staged nested `*.prisma`). Final grep 1 with the 34 folders excluded gives only the six `docs/agents/` lines and the lock's `:142,145,207,210`. Grep 2 gives only `.gitignore:49-50` and the `.understandignore` file. `EventPayloads` has 17 keys. `nameIt`, `ANIMAL_HOW_TO_KEY` (`v5`), `GlobeScreen.tsx:40`, `debugBridge.ts:214,216`, `AGENTS.md:19` and playtest `:36` are as the findings say. No test, lint script, tsconfig or eslint config reads `.agents/`, the lock or the hook. The target covers every Goal item and stays inside Scope.

MUST-FIX: none

MISSED:
1. Finding 6 misreads one file: `scripts/shots/run.mjs` is not a database script. Its only "connect" is `net.connect(port, 'localhost')` at `:30-31` (a port probe). Three scripts use `scripts/connect.ts`: `clue-world-map.ts:10`, `content.ts:19`, `iucn.ts:10`. The target wording for `AGENTS.md:56` is still true (no other script under `scripts/` opens a connection). Don't carry "four" into Steps or the Summary.
2. Review text also passes through the hook. The Astra outputs (architecture now, code review after the hook change) are appended to this plan and may quote the package names (blocked today) or the schema file's full name (blocked once the pattern is fixed). Add to Constraints: if an Edit of the plan is refused, insert the text from the shell, word for word; never paraphrase a review to get past the hook.
3. Checking off a Steps item re-writes its line as an Edit's new text. The planner writes Steps while the old hook is live, so nothing stops a line with the schema file's full name then, and it can't be checked off with Edit later. Steps, Verification and Log lines must use `*.prisma` and name no package, from the start.

SHOULD-CONSIDER:
1. Make the live probe required, not optional: a Write tool call to `/tmp/<dir>/app.env` and one to `/tmp/<dir>/x.prisma`, both refused with the hook's message, recorded in `guard-after.txt`. `guard-run.sh` runs `bash "$hook"`, so it is the only check of the exec bit and the `settings.json` wiring end to end.
2. Summary notes (no edits, per the decision rule): `src/game/EventBus.ts:2` "Neither side imports the other"; `domain.md:11` and `:49-53` still describe ADRs; `.agents/skills/smux/references/tmux.md:10` links `../tmux-bridge/SKILL.md`, which doesn't exist (kept vendored skill).
3. Tell the owner in the Summary: with `.gitignore:49-50` gone, any generated `.understand-anything/` output left in his WSL clone shows as untracked after the merge.
4. Hook `:4` target comment: keep it to one line as designed; the `*.prisma` arm's message already cites `AGENTS.md`, so no further header text is needed.

## Architecture review (Astra)

VERDICT: APPROVE
MUST-FIX: none
SHOULD-CONSIDER: none

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

- Baseline: no E2E run (stage template says E2E; brief says none, as no shipped file changes).

## Log

- 2026-11-14 10:42 UTC · Baseline: typecheck/lint/test 0 (61 tests), lock 45/40/40, hook control matches audit (+ root app.env 0), live all 200, greps recorded; no E2E per brief.
- 2026-11-14 10:52 UTC · Architecture: architect wrote findings + target design (AGENTS.md:19, playtest:36 already true; hook = Edit + one sed; lock JSON filter dry-run 0 added/204 deleted; CI step dry-run exits 1 with staged *.prisma, 0 clean). Plan-only change; no checks needed.
- 2026-11-14 11:00 UTC · Fable review: APPROVE, 0 MUST-FIX; 3 MISSED items (shots/run.mjs not a DB script; review text vs hook; Steps lines use *.prisma) + 4 SHOULD-CONSIDER for planner. Plan-only; no checks needed.
- 2026-11-14 10:57 UTC · Astra review: APPROVE, MUST-FIX none, SHOULD-CONSIDER none. Plan-only; no checks needed.

## Summary
