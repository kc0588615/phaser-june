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
  SELECT *
  FROM icaa
  WHERE wkb_geometry IS NOT NULL
    AND ST_DWithin(
      wkb_geometry::geography,
      ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
      ${radius}
    )
`;
```

### By ID

```typescript
const species = await prisma.iCAA.findUnique({
  where: { ogc_fid: speciesId }
});
```

### Search by Name

```typescript
const results = await prisma.iCAA.findMany({
  where: {
    OR: [
      { comm_name: { contains: searchTerm, mode: 'insensitive' } },
      { sci_name: { contains: searchTerm, mode: 'insensitive' } }
    ]
  },
  select: { ogc_fid: true, comm_name: true, sci_name: true },
  take: 10
});
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
