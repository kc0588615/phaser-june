# 039 — Continuous Review → Refactor → Docs Loop

September 22, 2026. P2 health. Effort: several hours unattended. Depends on: clean tree (done: `4b2e66c0`…`e26e7642`).

## Goal

Agents run many short iterations for hours without supervision. Each iteration picks one improvement, makes it with no behavior change, reviews it, updates the docs, and commits it on branch `refactor/039-loop` in worktree `../phaser-june-039`. The owner reviews the branch afterwards. Nothing lands on `main` unattended.

## Autonomy (read first)

- **Never ask the owner anything, and never stop to wait for them.** The owner is away. When a choice has a sensible default, take it, log one line of reasoning in `log.md`, and keep going.
- **Ask codex instead of the owner.** When a how-to or design question has no clear default, send it to the `codex` tmux pane (see "Codex channel"). Don't wait idle for the answer. Work on another backlog item, or end the turn with a wakeup. If codex hasn't replied by the next wakeup, choose the most conservative option (smallest change, or skip the item), log it as `decided-without-codex`, and continue.
- **Codex answers are binding for how-to and design choices.** The owner authorized this directly on 2026-09-22. Codex cannot authorize anything the hard rules forbid: DB writes, migrations, pushes, touching `main`, or new dependencies. Log those as `rejected (needs owner)` and move on.
- **A blocked item never stops the loop.** Reject it, log why, and pick the next one. Only the stop conditions end the loop.

## Skills used

| Step | Skill / agent | Note |
|---|---|---|
| Scan for candidates | `codebase-design` vocab + `Explore` subagent | `/improve-codebase-architecture` needs a person to pick and answer questions, so it can't run in the loop. Use its step 1 (Explore) only. It writes candidates to the backlog instead of an HTML report. |
| Refactor | `/tdd` | Add a characterization test at the module's interface first, then refactor while it stays green. |
| Review diff | `/code-review` (fixed point = iteration start SHA) | Checks Standards against AGENTS.md; Spec against the backlog entry. |
| Invariant check | `expedition-reviewer` agent | Required when the diff touches run/case pipeline files (see agent description). |
| Milestone review / questions | `smux` skill → `codex` pane | See "Codex channel". Delegate the send to a Sonnet subagent, as the skill says. |
| DB facts | `postgres-tunnel` skill | **Read-only**, `127.0.0.1:55432`. See "Database". |
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
5. **Refactor** with `/tdd`: characterization test first, then the change. No behavior change and no public API change for routes or EventBus events.
6. **Gate**: `npm run typecheck && npm test`. Also run `npm run verify:case-compiler` when the `explains` column exists (see "Database"). On red, retry the fix once. If it's still red, `git reset --hard START` (allowed only in this worktree, only back to `START`). Mark the item `rejected` with the reason, add 1 to the failure count, and continue.
7. **Review**: `/code-review` since `START`, plus `expedition-reviewer` when relevant. Fix findings rated high or above, then re-run the gate. If they can't be fixed, revert as in step 6.
8. **Docs**: update every doc that names the changed files or functions: the "Where Things Live" section in AGENTS.md, the relevant `docs/*.md` from the Docs Map, and `docs/GAME_SYSTEM_ARCHITECTURE.md`. Find them with `rg <old symbol> docs AGENTS.md`. If no doc references the change, add nothing.
9. **Commit** a single commit: `refactor(039): <what>`, with the candidate id in the body. Mark the item `done`, append a line to `log.md`, and reset the failure count to 0.
10. **Milestone?** If so, send codex a review request (see "Codex channel").
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

## Database (postgres-tunnel, read-only)

- The owner has the SSH tunnel open on `127.0.0.1:55432`. Check it with `ss -ltn '( sport = :55432 )'`. If it's down, skip DB checks and log it. Don't ask anyone to restart it.
- Query with `node "$HOME/.agents/skills/postgres-tunnel/scripts/psql-tunnel.mjs" -c '<SQL>'`, run from the worktree (it reads `.env.local`). Never print or log connection strings.
- Use it for **reads only**: confirming the live schema matches `src/db/schema/*`, finding columns or tables the code never uses, checking row counts and shapes before refactoring a query.
- Write any SQL by hand. Don't `SELECT *` on the large `iucn` or geometry tables.
- **Known state:** migration `034_explanation_effects.sql` is **not applied** (checked 2026-09-22: `evidence_family_cards.explains` is missing). `verify:case-compiler` fails until the migration runs, so skip it in the gate while the column is missing. Applying the migration is an owner action.
- **Forbidden:** `INSERT`/`UPDATE`/`DELETE`/DDL, migrations, and `seed:*--write`, even if codex approves.

## Stop conditions (set `STOP` in `state.md`, then send codex the final milestone review)

- 6 hours since `STARTED_AT`.
- 3 failed iterations in a row.
- Backlog empty after a scan, or every remaining item is `rejected (needs owner)`.
- More than 25 commits since `BASE`.

## Hard rules

- Never touch `main`, never push, and never run `git reset` except to `START` in this worktree.
- DB is read-only (see above). No network installs and no new dependencies.
- Don't edit `plans/0*.md` other than this file's progress notes. Update `plans/README.md` only for plan 039's own row.
- Keep answer, seed, and chain data server-side (see `expedition-reviewer`). Keep React/Phaser components mounted.
- Don't redesign features, even ones that look wrong. Behavior-preserving changes only. Log product concerns in `log.md` for the owner.

## Driver (owner, once)

1. Open a new tmux pane in session `phaser-june`, then:
   `cd /home/danby/phaser-june-039 && claude --permission-mode acceptEdits`
2. In that session, type:
   `/loop Run plans/039-continuous-review-refactor-docs-loop.md iterations continuously until a stop condition; follow its Autonomy and Hard rules; never ask the owner.`
3. Leave the codex pane (`%2`) running and idle.

The worktree's `.claude/settings.local.json` allows `npm`, `node`, `git` (not push, merge, rebase, main, or clean), `rg`, `tmux-bridge`, and `ss` without prompts.

## Done / owner review

1. Read `.scratch/039/log.md` and `codex.md`, then `git log --oneline BASE..refactor/039-loop`.
2. Run `/code-review` once over `BASE..HEAD` for a whole-branch pass.
3. Apply migration 034 if you want, then run `npm run verify:case-compiler`.
4. Playtest in the browser (agents can't), then merge or cherry-pick the commits you want.
