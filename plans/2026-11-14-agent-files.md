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
