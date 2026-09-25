# Critter Connect

An educational animal game for grades 6–12. Pick a place on a globe, then play **Clue Match**: a match-3 where each gem color reveals a clue about a mystery animal (family tree, body, habits, habitat, range, life cycle, status, key facts). Use the clues to rule out look-alikes and name the animal. Every animal you find glows on the globe and goes in your Field Journal.

Next.js 16 (pages + API routes), Phaser 3 (the board), MapLibre GL (the globe), Drizzle + PostgreSQL/PostGIS (content, ranges, places), Clerk (sign-in).

## Run it

```bash
npm install
npm run dev          # http://localhost:8080
npm test             # rules, content checks, board model
npm run e2e          # headless Chrome plays the dev build; artifact in e2e-artifacts/
npm run typecheck && npm run lint
```

`.env.local` needs `DATABASE_URL` and Clerk keys. Habitat pictures on the globe also need `NEXT_PUBLIC_TITILER_BASE_URL` and `NEXT_PUBLIC_COG_URL`.

## Where things are

- `src/pages/index.tsx` → `src/components/globe/`: the globe and place picker.
- `src/pages/clue-match.tsx` → `src/components/clueGame/`: the Clue Match screen.
- `src/clueGame/`: the game's rules as pure, tested TypeScript.
- `src/game/`: the Phaser board (model, view, input), talking to React only through `EventBus.ts`.
- `src/app/api/`: `places`, `clue-game/pool`, `clue-game/range`, `clue-game/solves`.
- `src/db/`: Drizzle client and schema.
- `db/schema.sql`: the database schema (tables and views); `db/content/`: the animal profiles and their sources (`npm run content`); `db/analysis/clue-match/`: read-only SQL exercises.

## Docs

- [`docs/CLUE_MATCH.md`](docs/CLUE_MATCH.md): how the game and globe work, the rules, the content workflow, the database, practice SQL.
- [`docs/CONTENT_SOURCES.md`](docs/CONTENT_SOURCES.md): where animal facts come from (tiered sources), the clue tag vocabulary, adding an animal.
- [`docs/DATABASE_ACCESS.md`](docs/DATABASE_ACCESS.md), [`docs/SHAPEFILE_BEST_PRACTICES.md`](docs/SHAPEFILE_BEST_PRACTICES.md), [`docs/DRIZZLE_ORM_GUIDE.md`](docs/DRIZZLE_ORM_GUIDE.md): the data layer.
- [`AGENTS.md`](AGENTS.md): notes for coding agents.
