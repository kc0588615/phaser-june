---
sidebar_position: 3
title: Drizzle ORM Guide
description: Using Drizzle with the database
tags: [guide, drizzle, orm]
---

# Drizzle ORM Guide

Drizzle provides type-safe access to Postgres and PostGIS in this codebase.

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

const results = await db.execute(sql`
  SELECT ogc_fid, comm_name
  FROM icaa
  WHERE ST_Contains(
    wkb_geometry,
    ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)
  )
`);
```

## Schema Changes

- Spatial tables are created/modified by shapefile imports and QGIS edits.
- App tables are managed via SQL DDL; update `src/db/schema/*` to match.
- After any schema change, refresh types with:

```bash
npx drizzle-kit introspect
```

## Notes

- Drizzle migrations are not used in this repo.
- Use explicit column aliases to keep API responses in snake_case.
