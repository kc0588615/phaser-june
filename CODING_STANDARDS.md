# Coding standards

Read during review. Each rule is a judgement call; fixed patterns belong in a check instead (`npm run lint`: eslint + `scripts/check-theme.mjs`; `.github/workflows/ci.yml`; `.claude/hooks/`).

- Database lookups and external calls (Postgres, fetch, Clerk, TiTiler) are wrapped in try/catch.
- UI follows `GUI.md`: each pattern uses the cc component assignment it maps to (Button, Drawer, Dialog, Popover...). `check-theme.mjs` only catches token drift.
