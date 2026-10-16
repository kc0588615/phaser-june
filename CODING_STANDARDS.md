# Coding standards

Read during review. Each rule is a judgement call; fixed patterns belong in a check instead (`npm run lint`: eslint + `scripts/check-theme.mjs`; `.github/workflows/ci.yml`; `.claude/hooks/`).

- Database lookups and external calls (Postgres, fetch, Clerk, TiTiler) are wrapped in try/catch.
- A new board input path (swipe, tap, key, hold in `src/game/BoardController.ts`) passes the same guards as its siblings (`canMove`, lock, hold timer). A tween that can fire again mid-play starts and returns to the sprite's home position, not its current one.
- UI follows `GUI.md`: each pattern uses the cc component assignment it maps to (Button, Drawer, Dialog, Popover...). `check-theme.mjs` only catches token drift.
