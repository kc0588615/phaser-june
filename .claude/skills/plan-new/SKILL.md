---
name: plan-new
description: Scaffold the next numbered plan file in plans/ and add its row to plans/README.md. Use when the user asks to start, draft, or create a new plan.
disable-model-invocation: true
argument-hint: <short-slug> [one-line goal]
---

# New plan

Repo convention: `plans/NNN-<slug>.md`, three-digit zero-padded, sequential. Index row in `plans/README.md` table under "Execution order & status".

## Steps

1. Next number: `ls plans | grep -oE '^[0-9]{3}' | sort -n | tail -1`, add 1.
2. Slug from `$ARGUMENTS` (lowercase, hyphens). If no goal given, ask one line.
3. Write `plans/NNN-<slug>.md` using the template below. Today's date in the title. Read the two most recent plans first to match tone and depth.
4. Append a row to the README table: `| NNN | <Month D, YYYY> — <Title> | <P0-P3> <kind> | <XS-XL> | <depends on> | PLAN — [NNN](NNN-<slug>.md); <one clause> |`.
5. Add a dependency note bullet under "Dependency notes" only if the plan constrains or is constrained by another plan.
6. Do not commit. Report the path and row.

## Template

```markdown
# NNN — <Title>

Owner decision, <YYYY-MM-DD>. Builds on [<prior>](<prior>.md). Preserve unrelated tree changes; no commit until the owner asks.

## Problem

## Design locks

1.

## Content model / Data

## Server

## Client

## Phases

| Phase | Scope | Gate |
|---|---|---|
| A | | `npm run typecheck && npm test` |

## Out of scope

## Verification
```
