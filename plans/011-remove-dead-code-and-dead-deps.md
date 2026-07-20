# Plan 011: Remove dead components and dead dependencies

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: re-run every "zero importers" grep in
> "Current state" before deleting anything. A file is only deletable if its
> grep still returns zero importers TODAY. Any new importer = drop that file
> from scope and note it.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (run before or after 007; if 007 already ran, re-run `npm audit` after this)
- **Category**: tech-debt
- **Planned at**: commit `c798752`, 2026-06-11

## Why this matters

Verified dead code: three parallel variants of an abandoned picker component
(plus the shadcn `command` wrapper and the `cmdk` package that exist only to
serve them), an orphaned test component, a template backup file, and two
manifest entries with zero imports (`react-icons`, `@openai/codex` — the
latter a CLI agent tool sitting in **production** dependencies). Dead variants
invite "fixing" the wrong file; dead deps inflate install and audit surface.

## Current state

Verified 2026-06-11 (working tree):

- `src/components/CategoryGenusPicker.tsx`, `CategoryGenusPickerFixed.tsx`,
  `CategoryGenusPickerSimple.tsx` — zero importers:
  `rg -n "import.*CategoryGenusPicker" src` → no matches.
- These three are the ONLY importers of `@/components/ui/command`:
  `rg -n "ui/command" src | grep -v "ui/command.tsx"` → only the three pickers.
  `src/components/ui/command.tsx` is the shadcn wrapper around `cmdk`, and is
  the only importer of `cmdk` in src.
- `src/components/TestPopover.tsx` — zero importers
  (`rg -n "TestPopover" src` → only its own file).
- `src/App.tsx.template-backup` — leftover from the Phaser template; not
  imported (not even a valid TS module name).
- `package.json`: `"react-icons": "^5.5.0"` (0 imports in src;
  `lucide-react` is the icon lib actually used), `"@openai/codex": "^0.77.0"`
  in dependencies (0 imports; the Codex CLI used by the team is a global
  install at v0.139+, NOT this package), `"@types/swiper": "^5.4.3"` in
  devDependencies (swiper 11 ships its own types; the v5 stub is stale).
- NOT dead, do not touch: `src/components/SimpleLayout.tsx` (imported by
  `src/pages/highscores.tsx:4`).

## Commands you will need

| Purpose   | Command                            | Expected on success |
|-----------|------------------------------------|---------------------|
| Importer check | `rg -n "<name>" src`          | zero matches outside the file itself |
| Typecheck | `npm run typecheck`                | exit 0              |
| Uninstall | `npm uninstall react-icons @openai/codex cmdk && npm uninstall -D @types/swiper` | exit 0 |

## Scope

**In scope** (deletions/edits only — create nothing):
- Delete: `src/components/CategoryGenusPicker.tsx`,
  `src/components/CategoryGenusPickerFixed.tsx`,
  `src/components/CategoryGenusPickerSimple.tsx`,
  `src/components/TestPopover.tsx`,
  `src/components/ui/command.tsx`,
  `src/App.tsx.template-backup`
- Edit: `package.json` / `package-lock.json` (remove `react-icons`,
  `@openai/codex`, `cmdk`, `@types/swiper`)

**Out of scope**:
- `src/components/SimpleLayout.tsx` (live).
- Every other `src/components/ui/*` file (other shadcn wrappers are used).
- `swiper` itself and all its importers.
- `src/services/discoveryMigrationService.ts` — looks like one-off migration
  code but is live (called from `useAuthBridge`); leave it.
- Any refactoring of surviving code.

## Git workflow

- Short lowercase commit message if asked (e.g. "removed dead pickers and deps"). Do not push.

## Steps

### Step 1: Re-verify and delete the four dead components + backup file

For each file in scope, re-run the importer grep, then delete:

```bash
rg -n "CategoryGenusPicker|TestPopover" src --no-heading   # expect: matches only inside the files being deleted
rm src/components/CategoryGenusPicker.tsx src/components/CategoryGenusPickerFixed.tsx src/components/CategoryGenusPickerSimple.tsx src/components/TestPopover.tsx src/App.tsx.template-backup
```

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Delete the now-orphaned command wrapper

```bash
rg -n "ui/command" src --no-heading   # expect: only src/components/ui/command.tsx itself
rm src/components/ui/command.tsx
```

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Remove dead packages

```bash
rg -n "react-icons|@openai/codex|cmdk" src scripts --no-heading   # expect: zero matches
npm uninstall react-icons @openai/codex cmdk
npm uninstall -D @types/swiper
```

If `npm uninstall` fails on network restrictions, edit `package.json` by hand,
delete the entries, and note that `npm install` must be run later to sync the
lockfile.

**Verify**: `npm run typecheck` → exit 0 (in particular: swiper imports in
`DeductionCamp.tsx`, `SpeciesCarousel.tsx`, `FamilyCardStack.tsx`,
`album/AlbumHeroSwiper.tsx` must still typecheck against swiper's own types
after `@types/swiper` removal).

## Test plan

`npm run typecheck` is the gate. If plan 008 has landed, also `npm test` →
all pass. If plan 010 has landed, `npm run lint` → no new errors versus the
count recorded in 010's status row.

## Done criteria

- [ ] The six files are gone; `git status` shows only deletions + package.json/lockfile edits
- [ ] `rg -n "CategoryGenusPicker|TestPopover|ui/command|react-icons|@openai/codex|cmdk" src` → zero matches
- [ ] `grep -c "@types/swiper" package.json` → 0
- [ ] `npm run typecheck` exits 0
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- Any importer grep returns a match outside the deletion set (drift — someone
  started using a "dead" file).
- Typecheck fails after `@types/swiper` removal with swiper type errors in the
  four carousel components — restore the devDep, note the conflict, finish the
  rest of the plan.
- `@openai/codex` appears in any script, CI config, or `.claude/`/`.agents/`
  config (check: `rg -l "openai/codex" . --hidden -g '!node_modules' -g '!package*.json'`)
  — it may be intentionally vendored; report before removing.

## Maintenance notes

- If a category/genus picker is needed later, build it fresh on the current
  shadcn stack; re-add the `command` wrapper via shadcn CLI at that point.
- Reviewer: the package-lock diff should ONLY remove packages.
- Deferred (recorded in plans/README.md): hybrid pages/app router
  consolidation; god-file splits (blocked on plan 008's tests).
