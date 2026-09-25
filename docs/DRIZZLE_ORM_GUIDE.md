# Drizzle ORM

Drizzle over postgres.js talks to Postgres through `DATABASE_URL` (PgBouncer, transaction mode; see `docs/DATABASE_ACCESS.md`).

## Where it lives

- `src/db/index.ts`: the `db` client, one per server process.
- `src/db/schema/`: `species.ts` (species, clues, facts), `player.ts` (profiles), `game.ts` (clue_match_solves). Only the columns the app reads are modelled; `db/schema.sql` has the full tables and the two materialized views.
- Imported GIS tables (`iucn`, `oneearth.oneearth_bioregion`, `natural_earth.countries`) are not modelled. Raw SQL reads them, as do the views.

## Queries

The query builder for plain table reads and writes:

```typescript
import { asc, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { speciesFacts } from '@/db/schema';

const facts = await db.select().from(speciesFacts)
  .where(inArray(speciesFacts.speciesId, ids))
  .orderBy(asc(speciesFacts.sortOrder));
```

Raw SQL (`sql` template, parameters are bound) for views and PostGIS:

```typescript
import { sql } from 'drizzle-orm';
import { db } from '@/db';

const [row] = await db.execute<{ geojson: string }>(sql`
  SELECT ST_AsGeoJSON(outline, 3) AS geojson FROM clue_match_places WHERE key = ${key}`);
```

Wrap every query in `try/catch` in routes (see `src/app/api/`).

## Schema changes

Drizzle migrations are not used. Change the database with SQL (`./scripts/db -1 -f change.sql`), update `db/schema.sql` to match, then update `src/db/schema/` if the app reads the new columns. `npm run db:introspect` writes Drizzle's view of the app tables to `./drizzle/` for comparison.

Conventions for new objects: snake_case names, `timestamptz`, `text` over `varchar(n)`, `jsonb` over `json`, and named indexes with `ix_`/`uq_` prefixes.
