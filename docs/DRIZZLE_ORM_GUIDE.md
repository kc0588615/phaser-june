# Drizzle ORM Integration Guide

This guide explains how Drizzle ORM is integrated into the Species Discovery Game.

## Why Drizzle

- SQL-first ergonomics (fits PostGIS + shapefile workflows)
- Lightweight runtime (postgres.js, no query engine)
- Type-safe query builder with raw SQL escape hatch

## Schema Locations

- App tables: `src/db/schema/player.ts`, `src/db/schema/game.ts`
- Spatial tables: `src/db/schema/species.ts` (`iucn`, `speciesTable`, `oneearthBioregion`)
- Types: `src/db/types.ts`

> `icaa_view`, `taxa.ts`, and `ensureIcaaViewReady` have been removed. The raw range table
> is now `iucn` (raw IUCN field names). The curated game table is `species`. See
> `docs/SPECIES_TABLE_SIMPLIFICATION_PLAN.md` for current architecture.

## Conventions

Follow the database conventions for app-owned tables and raw SQL:
- Lowercase snake_case; tables plural, columns singular
- `id` bigint identity primary keys (UUID only for externally sourced IDs)
- `timestamptz`, `text`, `jsonb`; avoid `timestamp` without time zone, `varchar(n)`, `money`, `json`
- Avoid `varchar(255)` or other arbitrary limits; use `text` unless a strict business rule requires a length check
Rationale: Postgres stores `text`/`varchar` the same (varlena + TOAST), so length limits only add checks and schema debt.
- Name constraints and indexes with prefixes: ix_/uq_/fk_/ck_
- Always alias tables in raw SQL; in the query builder, alias when joining or self-joining

See `docs/DATABASE_USER_GUIDE.md` for full details and examples.

## Client Usage

```typescript
import { db } from '@/db';
import { speciesTable } from '@/db/schema';
import { eq } from 'drizzle-orm';

const species = await db
  .select()
  .from(speciesTable)
  .where(eq(speciesTable.family, 'FELIDAE'));
```

## PostGIS Queries

Spatial queries join `species` (curated) with `iucn` (raw geometry) via `iucn.id_no = species.iucn_id`:

```typescript
import { sql } from 'drizzle-orm';
import { db } from '@/db';

const results = await db.execute(sql`
  SELECT DISTINCT ON (s.id) s.*, ST_AsGeoJSON(i.wkb_geometry)::text as wkb_geometry
  FROM species s
  JOIN iucn i ON i.id_no = s.iucn_id::numeric
  WHERE i.wkb_geometry IS NOT NULL
    AND ST_DWithin(
      i.wkb_geometry::geography,
      ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
      ${radiusMeters}
    )
`);
```

## Schema Changes

- Spatial tables are created by shapefile imports/QGIS edits (treat as read-only).
- App tables are created via SQL DDL (Drizzle migrations are not used here).
- Follow the naming/type conventions and explicitly name constraints/indexes.
- Use the schema change checklist in `docs/DATABASE_USER_GUIDE.md`.
- After schema changes, refresh types:

```bash
npm run db:introspect
```
