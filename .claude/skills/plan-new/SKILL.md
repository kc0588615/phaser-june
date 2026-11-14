---
name: plan-new
description: Scaffold the next numbered plan file in plans/. Use when the user asks to start, draft, or create a new plan.
disable-model-invocation: true
argument-hint: <short-slug> [one-line goal]
---

# New plan

Repo convention: `plans/NNN-<slug>.md`, three-digit zero-padded, sequential. Dated files (`YYYY-MM-DD-<slug>.md`) are mission records, not numbered plans. There is no index table: each plan's first lines say its state.

## Steps

1. Next number: `ls plans | grep -E '^[0-9]{3}-' | cut -c1-3 | sort -n | tail -1`, add 1 (040 if there are none yet; 006–039 are in git history).
2. Slug from `$ARGUMENTS` (lowercase, hyphens). If no goal given, ask one line.
3. Write `plans/NNN-<slug>.md` using the template below. Today's date in the title. Read the two most recent plans first, if any, to match tone and depth.
4. Do not commit. Report the path.

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
