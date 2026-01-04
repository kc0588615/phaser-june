---
sidebar_position: 1
title: Database User Guide
description: Working with Postgres tables and Prisma queries
tags: [guide, database, postgres, prisma]
---

# Database User Guide

Practical guide for querying species data and recording player progress.

## Prisma Client Setup

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

## Querying Species

### By Location (Raw SQL for PostGIS)

```typescript
// src/lib/speciesQueries.ts
const species = await prisma.$queryRaw`
  SELECT * FROM "icaa_species"
  WHERE ST_DWithin(
    geom,
    ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326),
    ${radius}
  )
`;
```

### By ID

```typescript
const species = await prisma.icaa_species.findUnique({
  where: { id: speciesId }
});
```

### Search by Name

```typescript
const { data } = await supabase
  .from('icaa_species')
  .select('id, common_name, sci_name')
  .ilike('common_name', `%${searchTerm}%`)
  .limit(10);
```

## Recording Game Data

### Start Session

```typescript
const { data: session } = await supabase
  .from('game_sessions')
  .insert({
    player_id: userId,
    location_lon: lon,
    location_lat: lat,
    total_species: speciesCount
  })
  .select()
  .single();
```

### Record Discovery

```typescript
await supabase.rpc('record_species_discovery', {
  p_session_id: sessionId,
  p_species_id: speciesId,
  p_guess_count: attempts
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
