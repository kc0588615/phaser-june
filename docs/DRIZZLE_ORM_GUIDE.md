# Drizzle ORM Integration Guide

This guide explains how Drizzle ORM is integrated into the Species Discovery Game.

## Why Drizzle

- SQL-first ergonomics (fits PostGIS + shapefile workflows)
- Lightweight runtime (postgres.js, no query engine)
- Type-safe query builder with raw SQL escape hatch

## Schema Locations

- App tables: `src/db/schema/player.ts`, `src/db/schema/game.ts`
- Spatial tables + compatibility view: `src/db/schema/species.ts` (`icaa`, `oneearth_bioregion`, `icaa_view`)
- Normalized biodiversity tables: `src/db/schema/taxa.ts`
- Types: `src/db/types.ts`

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
import { db, icaaView, ensureIcaaViewReady } from '@/db';
import { eq } from 'drizzle-orm';

await ensureIcaaViewReady();

const species = await db
  .select()
  .from(icaaView)
  .where(eq(icaaView.family, 'FELIDAE'));
```

## PostGIS Queries

```typescript
import { sql } from 'drizzle-orm';
import { db, ensureIcaaViewReady } from '@/db';

await ensureIcaaViewReady();

const results = await db.execute(sql`
  SELECT ogc_fid, common_name
  FROM icaa_view
  WHERE wkb_geometry IS NOT NULL
    AND ST_DWithin(
      wkb_geometry::geography,
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
