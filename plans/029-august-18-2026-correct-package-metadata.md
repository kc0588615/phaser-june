# Plan 029 — August 18, 2026: Identify the package as Critter Connect

> **Executor instructions**: Change metadata only. Do not update dependencies,
> source, docs, or versions. Run the exact JSON assertions below and update
> this plan's row in `plans/README.md` when done.
>
> **Drift check (run first)**:
> `git diff --stat 7c64b142..HEAD -- package.json package-lock.json README.md docs/DESIGN_GUIDE.md`
> If product name or repository remote changed, STOP and confirm the new values.

## Status

- **Priority**: P3
- **Effort**: XS
- **Risk**: LOW
- **Depends on**: `plans/028-august-18-2026-remove-confirmed-dead-code.md`
- **Category**: dx
- **Planned at**: commit `7c64b142`, 2026-08-18
- **Reviewed**: Grok tmux pane, 2026-08-18; metadata-only scope approved
- **Implemented**: merged as `4257421d`

## Why this matters

The root package still claims to be Phaser Studio's `template-nextjs`, links to
their repository, and says Vite bundles the app even though this project uses
Next.js webpack. Accurate metadata prevents misleading install/build output and
accidental npm publication.

## Current state

`package.json:2-22` currently contains:

```json
{
  "name": "template-nextjs",
  "description": "A Phaser 3 Next.js project template that demonstrates Next.js with React communication and uses Vite for bundling.",
  "repository": { "type": "git", "url": "git+https://github.com/phaserjs/template-nextjs.git" },
  "author": "Phaser Studio <support@phaser.io> (https://phaser.io/)",
  "bugs": { "url": "https://github.com/phaserjs/template-nextjs/issues" },
  "homepage": "https://github.com/phaserjs/template-nextjs#readme"
}
```

Evidence for replacements:

- Product name: `docs/DESIGN_GUIDE.md:1` — `Critter Connect`.
- Git remote: `https://github.com/kc0588615/phaser-june.git`.
- Build scripts: `package.json:29-33` use `next ... --webpack`.
- The project is an application, not a published package.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Parse | `node -e 'JSON.parse(require("fs").readFileSync("package.json","utf8")); JSON.parse(require("fs").readFileSync("package-lock.json","utf8"))'` | exit 0 |
| Assert | command in Step 2 | prints `metadata ok` |

## Scope

**In scope**:

- `package.json`
- `package-lock.json` — root package name fields only

**Out of scope**:

- Dependency/version changes, installs, lockfile graph refresh.
- README/docs edits, source edits, renaming the repository, or deployment URLs.
- Inventing a personal author name or changing the MIT license.

## Git workflow

- Branch: `advisor/029-package-metadata`
- One logical commit if asked: `chore correct package metadata`
- Do not push or open a PR unless instructed.

## Steps

### Step 1: Replace template metadata

In `package.json`:

1. Set `"name": "critter-connect"`.
2. Add `"private": true` after `version`.
3. Set description to:
   `"A biodiversity exploration and match-3 deduction game built with Phaser, Next.js, MapLibre, and Drizzle."`
4. Set repository URL to
   `git+https://github.com/kc0588615/phaser-june.git`.
5. Remove the Phaser Studio `author` field; do not invent a replacement.
6. Keep `"license": "MIT"`; remove nonstandard `licenseUrl`.
7. Set bugs URL to `https://github.com/kc0588615/phaser-june/issues`.
8. Set homepage to `https://github.com/kc0588615/phaser-june#readme`.
9. Remove `vite` from keywords; retain Phaser/Next/TypeScript and add
   `maplibre`, `biodiversity`, and `game`.
10. Do not change scripts, versions, engines, or dependencies.

In `package-lock.json`, change only the top-level `name` and
`packages[""].name` from `template-nextjs` to `critter-connect`. Do not run
`npm install`; no dependency graph change is needed.

### Step 2: Verify exact metadata

Run:

```bash
node -e 'const p=require("./package.json"),l=require("./package-lock.json"),d="A biodiversity exploration and match-3 deduction game built with Phaser, Next.js, MapLibre, and Drizzle.",r="git+https://github.com/kc0588615/phaser-june.git",b="https://github.com/kc0588615/phaser-june/issues",h="https://github.com/kc0588615/phaser-june#readme",k=["maplibre","biodiversity","game"]; if(p.name!=="critter-connect"||p.private!==true||p.description!==d||p.repository?.url!==r||p.bugs?.url!==b||p.homepage!==h||p.license!=="MIT"||l.name!==p.name||l.packages[""].name!==p.name||p.keywords.includes("vite")||!k.every(x=>p.keywords.includes(x))||p.author||p.licenseUrl) process.exit(1); console.log("metadata ok")'
```

Expected: `metadata ok`.

Then run:

```bash
git diff -- package.json package-lock.json
```

Expected: metadata-only changes; no dependency, version, integrity, or resolved
URL changes.

## Test plan

- No tests or build needed; runtime code and dependency graph are unchanged.
- JSON parse plus exact metadata assertion are the complete gate.

## Done criteria

- [ ] Package identifies as private `critter-connect`.
- [ ] Description and links describe this repository, not Phaser's template.
- [ ] Vite keyword and template author/licenseUrl residue removed.
- [ ] MIT license retained.
- [ ] Lockfile root names match; dependency graph untouched.
- [ ] `plans/README.md` row updated.

## STOP conditions

Stop and report if:

- Remote is no longer `kc0588615/phaser-june`.
- Maintainer wants a different npm-safe package name or public npm publishing.
- Metadata edits cause dependency/version lockfile churn.

## Maintenance notes

- If the repository or deployed homepage changes, update both package links.
- Reviewer should reject dependency changes in this metadata-only task.
