# Drizzle ORM

## What it is

`src/db/index.ts` exports `db`: one postgres.js client per server process (one connection, kept across dev hot reloads), wrapped by Drizzle with no models. `db/schema.sql` is the one description of the tables and views.

Routes to the database (`docs/DATABASE_ACCESS.md`):
- The live app connects as `critter_app` straight to the db container (`db:5432`, `deploy/app.env.example`).
- Dev servers, e2e, scripts and agents use `DATABASE_URL`: PgBouncer on port 6432, transaction mode. So no session `SET`, `LISTEN`, advisory locks or temp tables; `SET LOCAL` only inside a transaction.

The app only reads. No code in `src/` writes to the database.

## Queries

Every query is raw SQL: `db.execute<Row>(sql\`…\`)`, with `sql` from `drizzle-orm`. There are 9:
- `src/lib/places.ts`: the places, their animals, one place's outline.
- `src/lib/cluePool.ts`: species, clues, facts (the round pool).
- `src/app/api/clue-game/range/route.ts`: one animal's range.
- `src/app/api/clue-game/ranges/route.ts`: several animals' ranges (globe).
- `src/app/api/clue-game/journal/route.ts`: the signed-in player's past solves.

```typescript
import { sql } from 'drizzle-orm';
import { db } from '@/db';

const [row] = await db.execute<{ geojson: string }>(sql`
  SELECT ST_AsGeoJSON(outline, 3) AS geojson FROM clue_match_places WHERE key = ${key}`);
```

- `${value}` is sent as a bind parameter. A list: `sql.join(ids.map(id => sql\`${id}\`), sql\`, \`)`. Never put input into `sql.raw`.
- postgres.js's own `sql` tag binds values the same way. Drizzle stays because the code already uses it and it keeps typed inserts available (owner, 2026-11-13), not because it is safer.
- `Row` is a cast, not a check: keep it in step with `db/schema.sql`. postgres.js returns `count`, `bigint` and `numeric` as strings: cast in SQL (`count(*)::int`, journal route) or type them `string | number` and convert (range route).
- Routes wrap queries in `try/catch`, log `[API /path] Error:` and answer 500 JSON.
- Scripts get their own client from `scripts/connect.ts`. `scripts/content.ts` wraps it with `drizzle(sql)` to reuse `buildCluePool`.

## Schema changes

There are no migrations.
1. On live, take a fresh dump first (`deploy/backup/pg-backup.sh` on the server), then apply with `./scripts/db -1 -f change.sql`.
2. Edit `db/schema.sql` to match, then update the query and its `Row` type.
3. If the app reads the change, apply it to `phaser_june_dev` too (CI's e2e runs against it).

## Adding a model

Only for a future table the code writes (for example a device-sync table); reads stay raw SQL.
- Declare it in `src/db/tables.ts` with `pgTable('name', {…})` (`drizzle-orm/pg-core`), every column exactly as `db/schema.sql` has it: type, `NOT NULL`, default, foreign key. A model that leaves out or mistypes columns is the bug the old, deleted models had.
- Write with `db.insert(table).values(row)` (`.returning()` if needed). Don't pass `{ schema }` to `drizzle(client, …)`: that is only for the `db.query` API.
- Grant the write in `deploy/db/app-role.sql`. Change `db/schema.sql`, the model and the grant in one commit.
- Drizzle's CLI isn't installed (removed 2026-11-14 with its security advisory), so check a model by hand against `./scripts/db '\d name'`.

## Conventions

Conventions for new objects: snake_case names, `timestamptz`, `text` over `varchar(n)`, `jsonb` over `json`, and named indexes with `ix_`/`uq_` prefixes.
