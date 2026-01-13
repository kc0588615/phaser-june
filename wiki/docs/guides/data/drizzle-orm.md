---
sidebar_position: 3
title: Drizzle ORM Guide
description: Using Drizzle with the database
tags: [guide, drizzle, orm]
---

# Drizzle ORM Guide

Drizzle provides type-safe access to Postgres and PostGIS in this codebase.

## Conventions

Follow these for app-owned tables and raw SQL:

- Lowercase snake_case; tables plural, columns singular
- `id` bigint identity PKs (UUID only for external IDs like auth)
- `timestamptz`, `text`, `jsonb`; avoid `timestamp`, `varchar(n)`, `json`
- Name constraints/indexes: `ix_`/`uq_`/`fk_`/`ck_` prefixes
- Always alias tables in raw SQL

See [DATABASE_USER_GUIDE.md](/docs/guides/data/database-guide) for full conventions.

## Schema Locations

- `src/db/schema/*` - table definitions (app tables + spatial mappings)
- `src/db/types.ts` - inferred TypeScript types

## Client Usage

```typescript
import { db, icaa } from '@/db';
import { eq } from 'drizzle-orm';

const species = await db
  .select()
  .from(icaa)
  .where(eq(icaa.family, 'FELIDAE'));
```

## PostGIS Raw SQL

```typescript
import { sql } from 'drizzle-orm';
import { db } from '@/db';

// Use radius function with table alias (best practice)
const results = await db.execute(sql`
  SELECT r.ogc_fid, r.comm_name
  FROM public.get_species_in_radius(${lon}, ${lat}, ${radiusMeters}) r
`);
```

## Schema Changes

- Spatial tables are created/modified by shapefile imports and QGIS edits (treat as read-only).
- App tables are managed via SQL DDL; update `src/db/schema/*` to match.
- Follow naming/type conventions; explicitly name constraints/indexes.
- After any schema change, refresh types with:

```bash
npm run db:introspect
```

### Checklist

Before shipping a schema change:

- [ ] Table/column names: snake_case, tables plural, columns singular
- [ ] Types: `timestamptz`, `text`, `jsonb`, `numeric` for money
- [ ] Named constraints: `ix_`/`uq_`/`fk_`/`ck_` prefixes
- [ ] Indexes for FKs and hot query paths

## Notes

- Drizzle migrations are not used in this repo.
- Use explicit column aliases to keep API responses in snake_case.
