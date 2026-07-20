# Plan 010: Make ESLint run again and add a lint script

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat c798752..HEAD -- eslint.config.mjs package.json`

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `c798752`, 2026-06-11

## Why this matters

ESLint is installed (`eslint@^9.33.0`, `eslint-config-next@^16.1.0`) but
completely broken: `npx eslint <file>` crashes inside the `@eslint/eslintrc`
FlatCompat layer before linting anything, and `package.json` has no `lint`
script. The repo currently has zero static analysis beyond `tsc`. Fixing the
config gives unused-import/undeclared-variable/hooks-rule coverage back for
~35K LOC.

## Current state

- `eslint.config.mjs` (entire file):

  ```js
  import { dirname } from "path";
  import { fileURLToPath } from "url";
  import { FlatCompat } from "@eslint/eslintrc";

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const compat = new FlatCompat({
      baseDirectory: __dirname,
  });

  const eslintConfig = [
      ...compat.extends("next/core-web-vitals"),
  ];

  export default eslintConfig;
  ```

- `npx eslint src/lib/utils.ts` crashes with a stack trace in
  `node_modules/@eslint/eslintrc/lib/config-array-factory.js`
  (`_loadExtendedShareableConfig`) — the legacy-compat path cannot load
  `next/core-web-vitals` under this version combo.
- `package.json` scripts: `dev`, `dev-local`, `build`, `build-local`,
  `vercel-build`, `serve`, `start`, `typecheck`, `typecheck:watch`,
  `verify:*`, `postinstall`, `clean`, `db:introspect`. No `lint`.
- `eslint-config-next` v16 ships a **native flat config** export — modern
  Next.js docs configure it as `import next from 'eslint-config-next'` (an
  array) or via `@next/eslint-plugin-next`'s `flatConfig`. Verify which export
  exists in the installed version (step 1) rather than trusting memory.
- Directories that must NOT be linted: `node_modules/`, `.next/`, `dist/`,
  `public/` (incl. copied cesium assets), `wiki/` (own project),
  `.understand-anything/`, `plans/`, `docs/`.

## Commands you will need

| Purpose      | Command                                   | Expected on success |
|--------------|-------------------------------------------|---------------------|
| Inspect pkg  | `node -e "console.log(Object.keys(require('eslint-config-next')))"` | prints exports (or errors → try `ls node_modules/eslint-config-next`) |
| Lint a file  | `npx eslint src/lib/utils.ts`             | exit 0 (or rule findings; NOT a crash/exit 2) |
| Lint repo    | `npm run lint`                            | completes with a findings report |
| Typecheck    | `npm run typecheck`                       | exit 0              |

## Scope

**In scope**:
- `eslint.config.mjs`
- `package.json` (add `lint` script only)

**Out of scope**:
- Fixing the lint findings the working config reveals (report counts only).
- Installing new packages (use what's in node_modules; if the flat export is
  missing, see STOP conditions).
- Pre-commit hooks, CI, formatter config.

## Git workflow

- Short lowercase commit message if asked. Do not push.

## Steps

### Step 1: Determine the flat-config entry point

Inspect the installed package: `cat node_modules/eslint-config-next/package.json | head -40`
(look at `exports`/`main`) and `ls node_modules/eslint-config-next/`.
Identify whether it exposes a flat config (ESLint 9 style: exports an array
or object with `flat` in the name). Also check
`ls node_modules/@next/eslint-plugin-next/dist/` for a `flat` export.

### Step 2: Rewrite eslint.config.mjs without FlatCompat

Target shape (adapt the import to what step 1 found):

```js
// if eslint-config-next exports a flat array directly:
import next from 'eslint-config-next';

export default [
  {
    ignores: ['node_modules/**', '.next/**', 'dist/**', 'public/**', 'wiki/**', '.understand-anything/**', 'plans/**', 'docs/**'],
  },
  ...next,
];
```

or, if only the plugin exposes flat configs:

```js
import nextPlugin from '@next/eslint-plugin-next';

export default [
  { ignores: [/* same list */] },
  nextPlugin.flatConfig.coreWebVitals,
];
```

**Verify**: `npx eslint src/lib/utils.ts` → exits without a crash (exit code 0
or 1-with-findings; a stack trace is a failure).

### Step 3: Add the lint script

In `package.json` scripts: `"lint": "eslint src"`.

**Verify**: `npm run lint` → runs to completion across `src/`, printing a
findings summary (any number of findings is fine). Record the
error/warning counts in your report.
**Verify**: `npm run typecheck` → still exit 0.

## Test plan

The verification commands are the test. Additionally confirm lint catches a
real signal: `npx eslint src/components/CategoryGenusPicker.tsx` should
produce at least no crash (this file is known-dead code; findings likely).

## Done criteria

- [ ] `npx eslint src/lib/utils.ts` exits without crashing
- [ ] `npm run lint` exists and completes with a report
- [ ] `eslint.config.mjs` no longer imports `FlatCompat`
- [ ] Ignore list covers node_modules, .next, dist, public, wiki
- [ ] `npm run typecheck` exits 0
- [ ] `plans/README.md` status row updated (include the lint findings count)

## STOP conditions

Stop and report back if:

- Neither `eslint-config-next` nor `@next/eslint-plugin-next` exposes a flat
  config in the installed versions AND fixing it would require installing a
  package (network may be restricted) — report the exact exports you found.
- The new config makes `npm run lint` take >5 minutes (mis-scoped ignore list).

## Maintenance notes

- Follow-up (not in this plan): triage the revealed findings; consider
  `lint` in the `build` script or a pre-commit hook once the count is near zero.
- Plan 011 deletes dead components — run `npm run lint` after both land; the
  counts should drop.
- Reviewer: confirm `docs/`/`plans/` are ignored so prose never blocks lint.
