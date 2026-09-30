# Critter Connect

An educational animal game for grades 6–12. Pick a continent on a globe, then find the mystery animal among 12 look-alikes: match gems on a small board to earn charges (body, habits, habitat, range, life cycle), set off the toys big matches leave, spend charges on yes/no questions that cross animals out, climb its family tree, and collect rare note gems for a last chance. Every animal you find glows on the globe and goes in your Field Journal.

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
- `src/pages/explore.tsx` → `src/components/clueGame/`: the game screen (rules in `src/clueGame/questionMatch.ts`).
- `src/clueGame/`: the game's rules as pure, tested TypeScript.
- `src/game/`: the Phaser board (model, view, input), talking to React only through `EventBus.ts`.
- `src/app/api/`: `places`, `clue-game/pool`, `clue-game/range`, `clue-game/solves`.
- `src/db/`: Drizzle client and schema.
- `db/schema.sql`: the database schema (tables and views); `db/content/`: the animal profiles and their sources (`npm run content`); `db/analysis/clue-match/`: read-only SQL exercises.

## Docs

- [`docs/CLUE_MATCH.md`](docs/CLUE_MATCH.md): how the game and globe work, the rules, the content workflow, the database, practice SQL.
- [`docs/CONTENT_SOURCES.md`](docs/CONTENT_SOURCES.md): where animal facts come from (tiered sources), the clue tag vocabulary, adding an animal.
- [`docs/DEPLOY.md`](docs/DEPLOY.md): running it on the VPS over HTTPS, the app's database role, nightly backups.
- [`docs/DATABASE_ACCESS.md`](docs/DATABASE_ACCESS.md), [`docs/SHAPEFILE_BEST_PRACTICES.md`](docs/SHAPEFILE_BEST_PRACTICES.md), [`docs/DRIZZLE_ORM_GUIDE.md`](docs/DRIZZLE_ORM_GUIDE.md): the data layer.
- [`AGENTS.md`](AGENTS.md): notes for coding agents.
