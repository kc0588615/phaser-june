# 039 — Continuous Review → Refactor → Docs Loop

September 22, 2026. P2 health. Effort: several hours unattended. Depends on: clean tree (done: `4b2e66c0`…`e26e7642`).

## Goal

Agents run many short iterations for hours without supervision. Each iteration picks one improvement (refactor, bug fix, or open plan work), makes it, reviews it, updates the docs, and commits it on branch `refactor/039-loop` in worktree `../phaser-june-039`. The loop keeps making progress without waiting for anyone.

## Autonomy (read first)

The owner granted full autonomy directly on 2026-09-22. No action in this loop needs the owner's approval or codex's.

- **Never ask the owner anything, and never stop to wait for them.** Decide yourself, log one line of reasoning in `log.md`, and keep going. You approve your own actions.
- **Allowed without approval:** production DB writes, migrations, seed reloads (`seed:* --write`), new dependencies, pushing the branch, and merging to `main`. Follow the safety practices below; they are habits, not approval steps.
- **Codex is an advisor and a reviewer, not a gate.** Send it hard design questions and milestone reviews (see "Codex channel"). A codex answer can approve or allow anything, including DB writes, migrations, pushes, and `main` merges. Don't wait idle for a reply. Keep working, and if no reply has come by the next wakeup, decide yourself and log `decided-without-codex`.
- **A blocked item never stops the loop.** Reject it, log why, and pick the next one. Only the stop conditions end the loop.

## Safety practices (no approval needed, just do them)

- Before any DB `UPDATE`, `DELETE`, or destructive DDL, back up the affected tables to `.scratch/039/backups/<time>-<table>.sql` with `pg_dump --data-only -t <table>` through the tunnel. Additive changes (new columns, new tables, inserts) need no backup.
- Run seed reloads with `--dry-run` first, then `--write`, then `npm run verify:case-compiler`. If it goes red, restore from the backup or re-seed.
- New migrations go in `src/db/migrations/NNN_*.sql` (next number), are idempotent (`IF NOT EXISTS`), get applied with the psql helper, and are committed along with the schema change.
- Merge to `main` only fast-forward, only at a milestone, and only with the gate green. Never force-push and never rewrite `main` history.

## Skills used

| Step | Skill / agent | Note |
|---|---|---|
| Scan for candidates | `codebase-design` vocab + `Explore` subagent | `/improve-codebase-architecture` needs a person to pick and answer questions, so it can't run in the loop. Use its step 1 (Explore) only. It writes candidates to the backlog instead of an HTML report. |
| Refactor | `/tdd` | Add a characterization test at the module's interface first, then refactor while it stays green. |
| Review diff | `/code-review` (fixed point = iteration start SHA) | Checks Standards against AGENTS.md; Spec against the backlog entry. |
| Invariant check | `expedition-reviewer` agent | Required when the diff touches run/case pipeline files (see agent description). |
| Milestone review / questions | `smux` skill → `codex` pane | See "Codex channel". Delegate the send to a Sonnet subagent, as the skill says. |
| DB reads + writes | `postgres-tunnel` skill | `127.0.0.1:55432`. See "Database". |
| Docs | `/writing-for-agents` (AGENTS.md, skills), `/domain-modeling` (`CONTEXT.md` / ADRs) | Plain `docs/*.md` edits need no skill. |
| Driver | interactive `claude` in its own tmux pane + `/loop` (dynamic) | Not `claude -p`: codex replies arrive by typing into the loop's pane, which only an interactive session can receive. |

## State files (`../phaser-june-039/.scratch/039/`, gitignored)

- `backlog.md` — ranked candidates: `id | files | smell | proposed deepening | risk | status(todo/doing/waiting-codex/done/rejected)`.
- `log.md` — one line per iteration or decision: `time | iter | candidate | commit SHA | result | notes`.
- `state.md` — `BASE`, `STARTED_AT` (ISO time, set on the first iteration), iteration count, consecutive-failure count, `LAST_MILESTONE_SHA`, `STOP` flag.
- `codex.md` — each question or review request sent to codex (id, time, text) and a summary of the reply once it arrives.

## One iteration

1. **Read** `state.md`. If `STOP` is set, stop the loop (`ScheduleWakeup` with `stop: true`). On the first iteration, set `STARTED_AT`, re-read AGENTS.md and this plan, and label this pane: `tmux-bridge name "$(tmux-bridge id)" loop-039`.
2. **Inbox** — if a `[tmux-bridge from:codex ...]` message arrived, handle it first. Record the reply in `codex.md`. For a review, fix the findings codex rated major or blocking as a new backlog item at the top. For an answer, set the `waiting-codex` item back to `todo` with the decision attached.
3. **Refill** — if the backlog has fewer than 3 `todo` items, run a scan. Hot spots come first: `git log --since=30.days --name-only`. Current hot spots: `Game.ts`, `ExpeditionContext.tsx`, `caseCompilerV3.ts`, `runProjection.ts`, `evidence-progress/route.ts`. Also scan for leftover Supabase/Prisma references, dead exports, duplicated helpers, and code that disagrees with the live schema (check with a DB query). Add up to 5 candidates, each small enough for one iteration (≤ ~300 changed lines).
4. **Pick** the top `todo` item and mark it `doing`. Save the iteration start SHA as `START`. If the right approach is unclear, send codex a question, mark the item `waiting-codex`, and pick the next item instead.
5. **Build** with `/tdd`: test first, then the change. Refactors must not change behavior. Bug fixes and open plan work may change behavior when a test pins the new behavior. Changes to route or EventBus contracts must update every caller in the same commit.
6. **Gate**: `npm run typecheck && npm run lint && npm test && npm run verify:case-compiler` (lint added in round 2, C40). On red, retry the fix once. If it's still red, `git reset --hard START` (allowed only in this worktree, only back to `START`). Mark the item `rejected` with the reason, add 1 to the failure count, and continue.
7. **Review**: `/code-review` since `START`, plus `expedition-reviewer` when relevant. Fix findings rated high or above, then re-run the gate. If they can't be fixed, revert as in step 6.
8. **Docs**: update every doc that names the changed files or functions: the "Where Things Live" section in AGENTS.md, the relevant `docs/*.md` from the Docs Map, and `docs/GAME_SYSTEM_ARCHITECTURE.md`. Find them with `rg <old symbol> docs AGENTS.md`. If no doc references the change, add nothing.
9. **Commit** a single commit: `refactor(039): <what>`, with the candidate id in the body. Mark the item `done`, append a line to `log.md`, and reset the failure count to 0.
10. **Milestone?** If so, send codex a review request (see "Codex channel"). Then push the branch (`git push -u origin refactor/039-loop`) and fast-forward `main` when the gate is green: `git -C /home/danby/phaser-june merge --ff-only refactor/039-loop`. If the main checkout has uncommitted changes that block the merge, skip it and log that.
11. **Next** — go straight to the next iteration. If everything left is `waiting-codex`, call `ScheduleWakeup` for about 600s instead.

## Codex channel (smux)

- Target the pane labelled `codex`. Find it with `tmux-bridge list`: the pane whose process is `codex` (currently `%2`). Label it once with `tmux-bridge name %2 codex` if it has no label.
- Follow the smux skill: a Sonnet subagent runs read → `tmux-bridge message codex '<text>'` → read → `keys codex Enter` → read. Codex's TUI often swallows the first Enter; if the input line still shows the pasted text, press Enter again. Never poll codex for a reply. The reply lands in this pane as a new message.
- Codex's working directory is the main repo. Always give absolute paths in `/home/danby/phaser-june-039` and commit SHAs.
- **Milestone reviews only.** A milestone is any one of:
  - 5 commits since `LAST_MILESTONE_SHA`
  - one commit that changes more than 150 lines in the run/case pipeline (`src/lib/run*`, `caseCompilerV3.ts`, `evidenceLadder.ts`, `src/app/api/runs/**`, `ExpeditionContext.tsx`)
  - the final wrap-up before `STOP`

  Message shape: `Milestone review 039-M<n>: please review git -C /home/danby/phaser-june-039 log/diff <LAST_MILESTONE_SHA>..<HEAD> (<k> refactors: <one-line list>). Reply with blocking / major / minor findings, or "ok".` Then set `LAST_MILESTONE_SHA` to HEAD.
- **Questions:** send one question per message, with the options and your recommendation, so codex can just answer "A" or "B, because …".
- Don't send codex anything else: no progress updates, and nothing about minor changes.

## Database (postgres-tunnel, read + write)

- The owner has the SSH tunnel open on `127.0.0.1:55432`. Check it with `ss -ltn '( sport = :55432 )'`. If it's down, skip DB work, log it, and carry on with code-only items. Don't ask anyone to restart it.
- Query or write with `node "$HOME/.agents/skills/postgres-tunnel/scripts/psql-tunnel.mjs" -c '<SQL>'` (or `-f <file>`), run from the worktree (it reads `.env.local`). Never print or log connection strings.
- Use it to confirm the live schema matches `src/db/schema/*`, find columns or tables the code never uses, check row counts, apply migrations, and reload seeds. Follow "Safety practices" before any destructive write.
- Don't `SELECT *` on the large `iucn` or geometry tables.
- **Known state (2026-09-22):** migration 034 is applied. Prototype-six evidence was reloaded with `explains` data, and `verify:case-compiler` passes.

## Stop conditions (set `STOP` in `state.md`, then send codex the final milestone review)

- 6 hours since `STARTED_AT`.
- 3 failed iterations in a row.
- Backlog empty after a scan.
- More than 25 commits since `BASE`.

## Hard rules

- Never force-push, never rewrite `main` history, and never run `git reset` except to `START` in this worktree.
- Follow "Safety practices" for DB writes and merges.
- Update `plans/README.md` status rows for any plan the loop advances. Record progress notes in the plan files.
- Keep answer, seed, and chain data server-side (see `expedition-reviewer`). Keep React/Phaser components mounted.
- Product or design changes beyond open plan work: ask codex for a view, then decide yourself and log it.

## Driver (owner, once)

1. Open a new tmux pane in session `phaser-june`, then:
   `cd /home/danby/phaser-june-039 && claude --dangerously-skip-permissions`
2. In that session, type:
   `/loop Run plans/039-continuous-review-refactor-docs-loop.md iterations continuously until a stop condition; follow its Autonomy and Hard rules; never ask the owner.`
3. Leave the codex pane (`%2`) running and idle.

Because it runs with `--dangerously-skip-permissions`, no tool call prompts.

## Done / owner review (optional, after the fact)

1. Read `.scratch/039/log.md` and `codex.md`, then `git log --oneline BASE..refactor/039-loop`.
2. Run `/code-review` over `BASE..HEAD` for a whole-branch pass.
3. Playtest in the browser (agents can't). DB backups live in `.scratch/039/backups/` if anything needs rolling back.

## Progress (2026-09-23, loop stopped)

Stopped on the commit cap (26 commits since `BASE` b04d8a04). 0 failed iterations. Codex milestone reviews M1–M3: 0 blocking, 0 major; minors fixed.

- Dead code removed: deductionEngine runtime, never-mounted stats dashboard / album context / card unlocks, Game.ts half-wired tracking (codex Q1=A) and unused privates, 9 unused shadcn ui files + 5 radix packages, ecoregions/preview route, species/by-ids POST, assorted unused helpers; Supabase-era root files archived; Phaser template telemetry (`log.js`) removed.
- Dedupe: `PROFILE_KEY_BY_CATEGORY` + `isCaseTraitCategory` (caseTraits), `getRecord` (src/lib/record.ts), `withExplanationNote`, `EvidenceProgressResponse`, `readFailure`/`fetchRunProjection`, NODE_OBSTACLES reuse.
- Fixes: `/api/discoveries/migrate` now writes only for the Clerk session player (was trusting body `userId`); auth bridge checks HTTP status; SpeciesCarousel destroyed-Swiper guard; wiki builds again on locked Docusaurus 3.9.2 with stable TypeDoc output.
- Rejected: shared run-route auth guard (C19), dropping empty `eco_node_attempts` / `eco_node_gis_samples` (C25, owner call).
- Owner follow-ups: browser playtest (auth bridge, discoveries migrate, SpeciesCarousel, ExpeditionContext start/resume); main checkout `npm install` (prune radix) and `cd wiki && npm ci` (node_modules drifted to 3.10.1).
- Loop state: `../phaser-june-039/.scratch/039/{log,backlog,codex}.md`.
