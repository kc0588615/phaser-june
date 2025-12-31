# Prisma ORM Integration Guide

This guide explains how Prisma ORM is integrated into the Species Discovery Game and how to use it effectively.

## Why Prisma?

| Benefit | Description |
|---------|-------------|
| **Type Safety** | Auto-generated TypeScript types from your schema |
| **Autocompletion** | IDE suggests fields, relations, and query options |
| **Single Client** | Hot-reload safe singleton prevents connection leaks |
| **Schema as Docs** | `prisma/schema.prisma` is the source of truth |
| **Easy Migrations** | Version-controlled database changes |
| **Visual Studio** | `npx prisma studio` for GUI database browsing |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Add DATABASE_URL to .env.local
# Get from Supabase: Project Settings > Database > Connection string > URI
DATABASE_URL=postgresql://postgres.[ref]:[pass]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# 3. Generate Prisma client
npm run prisma:generate

# 4. Open visual database browser (optional)
npm run prisma:studio
```

## File Structure

```
prisma/
  schema.prisma       # Database schema definition
src/lib/
  prisma.ts           # Singleton client (import this!)
  speciesQueries.ts   # Hybrid Prisma + Supabase queries
  playerTrackingPrisma.ts  # Player tracking with transactions
```

## Architecture: Hybrid Approach

We use **both** Prisma and Supabase because:

- **Prisma** excels at: type-safe CRUD, relations, transactions
- **Supabase RPCs** required for: PostGIS spatial queries (geometry)

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Code                        │
├─────────────────────────────────────────────────────────────┤
│  Species List/Details  │  Map Click (Spatial)  │  Player   │
│  → Prisma findMany     │  → Supabase RPC       │  Tracking │
│  → Prisma findUnique   │  get_species_in_radius│  → Prisma │
├─────────────────────────┼─────────────────────────┼──────────┤
│       Prisma Client     │    Supabase Client     │  Prisma  │
│  (Type-safe queries)    │  (PostGIS geometry)    │  (Trans) │
└─────────────────────────┴─────────────────────────┴──────────┘
                              │
                    PostgreSQL + PostGIS
```

## Usage Examples

### Import the Client

```typescript
// Always import from @/lib/prisma (singleton)
import { prisma } from '@/lib/prisma';
```

### Query Species (Non-Spatial)

```typescript
import { getSpeciesCatalog, getSpeciesById } from '@/lib/speciesQueries';

// Get all species for list display
const allSpecies = await getSpeciesCatalog();

// Get single species by ID
const turtle = await getSpeciesById(1);
```

### Query Species (Spatial - Use Supabase RPC)

```typescript
import { getSpeciesInRadius, getSpeciesAtPoint } from '@/lib/speciesQueries';

// Find species within 10km of a point (map click)
const species = await getSpeciesInRadius(-122.4194, 37.7749, 10000);

// Find species exactly at a point
const speciesAtPoint = await getSpeciesAtPoint(-122.4194, 37.7749);
```

### Track Player Progress

```typescript
import {
  startSession,
  recordClueUnlock,
  recordDiscovery,
} from '@/lib/playerTrackingPrisma';

// Start game session
const sessionId = await startSession(userId);

// Record clue unlocks (returns ID for linking)
const clueId = await recordClueUnlock({
  playerId: userId,
  speciesId: 1,
  clueCategory: 'classification',
  clueField: 'order_',
  clueValue: 'Testudines',
});

// Record discovery with pending clues
await recordDiscovery({
  playerId: userId,
  speciesId: 1,
  sessionId,
  cluesUnlockedBeforeGuess: 3,
  incorrectGuessesCount: 1,
  scoreEarned: 150,
  pendingClueIds: [clueId],
});
```

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run prisma:generate` | Regenerate TypeScript client after schema changes |
| `npm run prisma:push` | Push schema changes to DB (no migration file) |
| `npm run prisma:studio` | Open visual database browser |
| `npm run prisma:migrate` | Create migration file + apply changes |
| `npm run prisma:introspect` | Pull schema from existing DB |

## Schema Overview

The `prisma/schema.prisma` file defines these models:

| Model | Maps To | Purpose |
|-------|---------|---------|
| `ICAA` | `icaa` | Species data (taxonomy, habitat, conservation) |
| `Profile` | `profiles` | User profiles (linked to Supabase auth) |
| `PlayerGameSession` | `player_game_sessions` | Game session tracking |
| `PlayerSpeciesDiscovery` | `player_species_discoveries` | Species discovered |
| `PlayerClueUnlock` | `player_clue_unlocks` | Clue reveal events |
| `PlayerStats` | `player_stats` | Aggregated statistics (JSONB) |
| `HabitatColormap` | `habitat_colormap` | Habitat code labels |
| `OneEarthBioregion` | `oneearth_bioregion` | Bioregion reference data |

### Key Schema Features

```prisma
// Example: mapping to existing column names
model ICAA {
  ogc_fid   Int     @id            // Primary key
  comm_name String? @map("comm_name")  // Maps to DB column
  order_    String? @map("order_")     // Avoids reserved word

  @@map("icaa")  // Maps to existing table name
}

// Example: relations
model PlayerSpeciesDiscovery {
  species ICAA? @relation(fields: [species_id], references: [ogc_fid])

  @@unique([player_id, species_id], name: "player_species_unique")
}
```

## Transactions

Use transactions for atomic operations:

```typescript
// All operations succeed or fail together
const result = await prisma.$transaction(async (tx) => {
  const discovery = await tx.playerSpeciesDiscovery.create({ ... });
  await tx.playerClueUnlock.updateMany({ ... });
  return discovery;
});
```

## Raw SQL (Escape Hatch)

For complex queries Prisma can't express:

```typescript
// Safe: uses tagged template (parameterized)
const realm = 'Nearctic';
const results = await prisma.$queryRaw`
  SELECT ogc_fid, comm_name
  FROM icaa
  WHERE realm = ${realm}
`;

// NEVER do this (SQL injection risk):
// prisma.$queryRawUnsafe(`SELECT * FROM icaa WHERE realm = '${userInput}'`)
```

## Troubleshooting

### "Cannot find module '@prisma/client'"

```bash
npm run prisma:generate
```

### "Too many clients already" (connection pool exhausted)

Ensure you're importing from `@/lib/prisma`, not creating new `PrismaClient()` instances.

### Schema doesn't match database

```bash
# Pull current DB schema
npm run prisma:introspect

# Or push your schema to DB
npm run prisma:push
```

### Need to see generated types

```bash
# Types are in node_modules/.prisma/client/index.d.ts
# Or import directly:
import type { ICAA, PlayerStats } from '@prisma/client';
```

## When to Use Which

| Scenario | Tool | Reason |
|----------|------|--------|
| List all species | Prisma | Simple SELECT |
| Filter by realm/category | Prisma | WHERE clause |
| Species in map radius | Supabase RPC | PostGIS ST_DWithin |
| Species at click point | Supabase RPC | PostGIS ST_Contains |
| Player discoveries with species | Prisma | Relations/includes |
| Update stats atomically | Prisma | Transactions |
| Complex spatial joins | Supabase RPC | PostGIS functions |

## Learning Resources

- [Prisma Docs](https://www.prisma.io/docs)
- [Prisma + Next.js Guide](https://www.prisma.io/docs/guides/frameworks/nextjs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Raw SQL Queries](https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access)
