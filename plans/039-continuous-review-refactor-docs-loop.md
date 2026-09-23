# 039 — Continuous Review → Refactor → Docs Loop

September 22, 2026. P2 health. Effort: several hours unattended. Depends on: clean tree (see Phase 0).

## Goal

Agents run many short iterations for hours without supervision. Each iteration picks one improvement, makes it with no behavior change, reviews it, updates the docs, and commits it on its own branch. The owner reviews the branch afterwards. Nothing lands on `main` unattended.

## Skills used

| Step | Skill / agent | Note |
|---|---|---|
| Scan for candidates | `codebase-design` vocab + `Explore` subagent | `/improve-codebase-architecture` needs a person to pick and answer questions, so it can't run in the loop. Use its step 1 (Explore) only. It writes candidates to the backlog instead of an HTML report. |
| Refactor | `/tdd` | Add a characterization test at the module's interface first, then refactor while it stays green. |
| Review diff | `/code-review` (fixed point = iteration start SHA) | Checks Standards against AGENTS.md; Spec against the backlog entry. |
| Invariant check | `expedition-reviewer` agent | Required when the diff touches run/case pipeline files (see agent description). |
| Seed check | `seed-validator` agent | Only if `db/seeds/**` is touched. That should never happen (out of scope). |
| Docs | `/writing-for-agents` (AGENTS.md, skills), `/domain-modeling` (`CONTEXT.md` / ADRs) | Plain `docs/*.md` edits need no skill. |
| Driver | shell loop over `claude -p` (below) | Each iteration starts with fresh context. Better than `/loop`, whose context keeps growing. |

## Phase 0 — Preconditions (owner, once)

1. Land or stash the current 117-file working tree (plans 034–038). The loop must not refactor code that hasn't been committed.
2. `git worktree add ../phaser-june-039 -b refactor/039-loop main` and run everything from there.
3. `npm install` in the worktree (offline cache ok). Confirm the baseline is green: `npm run typecheck && npm test` (no `verify:case-compiler`: it reads the live DB). Record the SHA as `BASE` in `.scratch/039/state.md`.

## State files (`.scratch/039/`, gitignored)

- `backlog.md` — ranked candidates: `id | files | smell | proposed deepening | risk | status(todo/doing/done/rejected)`.
- `log.md` — one line per iteration: `iter | candidate | commit SHA | result | notes`.
- `state.md` — `BASE`, iteration count, consecutive-failure count, `STOP` flag.

## One iteration (what each `claude -p` run does)

1. **Read** `state.md`. If `STOP` is set, exit immediately. Read AGENTS.md and this plan.
2. **Refill** — if the backlog has fewer than 3 `todo` items, run a scan. Hot spots come first: `git log --since=30.days --name-only`. Current hot spots: `Game.ts`, `ExpeditionContext.tsx`, `caseCompilerV3.ts`, `runProjection.ts`, `evidence-progress/route.ts`. Also scan for leftover Supabase/Prisma references, dead exports, and duplicated helpers. Add up to 5 candidates, each small enough for one iteration (≤ ~300 changed lines).
3. **Pick** the top `todo` item and mark it `doing`. Save the iteration start SHA as `START`.
4. **Refactor** with `/tdd`: characterization test first, then the change. No behavior change and no public API change for routes or EventBus events.
5. **Gate**: `npm run typecheck && npm test` (no `verify:case-compiler`: it reads the live DB). On red, retry the fix once. If it's still red, `git reset --hard START` (allowed only inside this worktree, only back to `START`). Mark the item `rejected` with the reason, add 1 to the failure count, and end the iteration.
6. **Review**: `/code-review` since `START`, plus `expedition-reviewer` when relevant. Fix findings rated high or above, then re-run the gate. If they can't be fixed, revert as in step 5.
7. **Docs**: update every doc that names the changed files or functions: the "Where Things Live" section in AGENTS.md, the relevant `docs/*.md` from the Docs Map, and `docs/GAME_SYSTEM_ARCHITECTURE.md`. Find them with `rg <old symbol> docs AGENTS.md`. If no doc references the change, add nothing.
8. **Commit** a single commit: `refactor(039): <what>`, with the candidate id in the body. Mark the item `done`, append a line to `log.md`, and reset the failure count to 0.

## Stop conditions (set `STOP` in `state.md`)

- 3 failed iterations in a row.
- Backlog empty after a scan.
- More than 25 commits since `BASE`.
- Any change would need a DB migration, a seed edit, a new dependency, or a change to route/EventBus contracts. Log it as `rejected (needs owner)` and continue. Stop only if the whole backlog is in that state.

## Hard rules

- Never touch `main`, never push, and never run `git reset` except to `START` in this worktree.
- No DB writes, no `postgres-tunnel`, no `seed:evidence-family --write`, no migrations.
- No network installs.
- Don't edit `plans/0*.md` (historical records). Update `plans/README.md` only for plan 039's own row.
- Keep answer, seed, and chain data server-side (see `expedition-reviewer`). Keep React/Phaser components mounted.
- Don't redesign features, even ones that look wrong. Behavior-preserving changes only.

## Driver

Run from the worktree in tmux:

```bash
mkdir -p .scratch/039
end=$(( $(date +%s) + 6*3600 ))   # 6 hours
while [ $(date +%s) -lt $end ] && ! grep -q '^STOP' .scratch/039/state.md 2>/dev/null; do
  claude -p "Run exactly one iteration of plans/039-continuous-review-refactor-docs-loop.md. Follow its hard rules." \
    --permission-mode acceptEdits >> .scratch/039/run.log 2>&1
done
```

Tool permissions must allow `npm`, `git add/commit/reset`, and `rg` without prompts in the worktree. Set them up with `/fewer-permission-prompts` or `.claude/settings.local.json` before starting.

## Done / owner review

1. `cat .scratch/039/log.md`, then `git log --oneline BASE..refactor/039-loop`.
2. Run `/code-review` once over `BASE..HEAD` for a whole-branch pass.
3. Playtest in the browser (agents can't), then merge or cherry-pick the commits you want.
