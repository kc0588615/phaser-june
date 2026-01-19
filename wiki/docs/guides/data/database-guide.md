---
sidebar_position: 1
title: Database User Guide
description: Working with Postgres tables and Drizzle queries
tags: [guide, database, postgres, drizzle]
---

# Database User Guide

Practical guide for querying species data and recording player progress.

## Conventions

App-owned tables follow these standards (import-owned tables like `icaa` may differ):

- **Naming**: snake_case; tables plural, columns singular
- **Primary keys**: `bigint GENERATED ALWAYS AS IDENTITY` (UUID only for external IDs)
- **Timestamps**: `timestamptz` with `_at` suffix
- **Booleans**: `is_` or `has_` prefix
- **Types**: `text` (not varchar), `jsonb` (not json)
- **Indexes**: `ix_tablename_columns`
- **Unique**: `uq_tablename_columns`
- **Foreign keys**: `fk_tablename_reference`

See [full conventions in docs/DATABASE_USER_GUIDE.md](https://github.com/your-repo/docs/DATABASE_USER_GUIDE.md#conventions-and-best-practices).

## Drizzle Client Setup

```typescript
// src/db/index.ts
import { db } from '@/db';
```

## Querying Species

### By Location (Raw SQL for PostGIS)

```typescript
// src/lib/speciesQueries.ts
import { sql } from 'drizzle-orm';
import { db } from '@/db';

// Use the get_species_in_radius function with table alias
const species = await db.execute(sql`
  SELECT r.ogc_fid, r.comm_name, r.sci_name
  FROM public.get_species_in_radius(${lon}, ${lat}, ${radiusMeters}) r
`);
```

### By ID

```typescript
import { eq } from 'drizzle-orm';
import { db, icaa } from '@/db';

const [species] = await db
  .select()
  .from(icaa)
  .where(eq(icaa.ogcFid, speciesId))
  .limit(1);
```

### Search by Name

```typescript
import { ilike, or } from 'drizzle-orm';
import { db, icaa } from '@/db';

const results = await db
  .select({
    ogc_fid: icaa.ogcFid,
    comm_name: icaa.commName,
    sci_name: icaa.sciName,
  })
  .from(icaa)
  .where(
    or(
      ilike(icaa.commName, `%${searchTerm}%`),
      ilike(icaa.sciName, `%${searchTerm}%`)
    )
  )
  .limit(10);
```

## Recording Game Data

### Start Session

```typescript
import { startGameSession } from '@/lib/playerTracking';

const sessionId = await startGameSession(userId);
```

### Record Discovery

```typescript
import { trackSpeciesDiscovery } from '@/lib/playerTracking';

await trackSpeciesDiscovery(userId, speciesId, {
  sessionId,
  cluesUnlockedBeforeGuess: clueCount,
  incorrectGuessesCount: attempts,
  scoreEarned: score
});
```

## React Query Integration

```typescript
// src/hooks/useSpeciesData.ts
import { useQuery } from '@tanstack/react-query';

export function useSpeciesAtLocation(lon: number, lat: number) {
  return useQuery({
    queryKey: ['species', lon, lat],
    queryFn: () => getSpeciesAtLocation(lon, lat),
    enabled: !!lon && !!lat
  });
}
```

## Related

- [Database Schema Reference](/docs/reference/database-schema)
- [Species Database Implementation](/docs/guides/data/species-database)
