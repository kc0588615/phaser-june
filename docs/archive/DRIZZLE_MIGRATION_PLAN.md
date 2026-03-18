# Prisma → Drizzle Migration Plan (Completed)

Migration record for switching from Prisma ORM to Drizzle ORM.

## Status

- Code migration is complete; Prisma is no longer imported in application code.
- Drizzle is the active query layer for all reads/writes.
- Spatial tables remain import-owned (shapefiles/QGIS), Drizzle is schema-mapped for types.
- Drizzle migrations are not used in this repo; introspection output is temporary.
- Prisma packages/scripts removed; Drizzle is the only ORM dependency.

## Final Architecture

**Runtime environment**
- Vercel serverless functions + PgBouncer on Hetzner VPS.
- Driver: `postgres` (postgres.js) with `max: 1` and PgBouncer-safe startup.

**Client and config**
- `src/db/index.ts` uses postgres.js + Drizzle and strips `pgbouncer=true` from `DATABASE_URL`.
- `drizzle.config.ts` loads `.env` + `.env.local`, strips `pgbouncer=true`, and defines `tablesFilter` for app tables.

**Schema layout**
```
src/db/
├── index.ts
├── types.ts
└── schema/
    ├── index.ts
    ├── game.ts      # high_scores, habitat_colormap
    ├── player.ts    # profiles, player_* tables
    └── species.ts   # icaa, oneearth_bioregion (introspected)
```

**Schema authority**
- Import-owned tables: `icaa`, `oneearth_bioregion` (CLI/QGIS own structure)
- App tables: `profiles`, `player_*`, `high_scores`, `habitat_colormap`
- Drizzle schema files mirror the DB for type safety; DDL changes happen outside Drizzle.

## Applied Changes (Code)

**Drizzle scaffolding**
- `drizzle.config.ts` (dotenv loading + `pgbouncer` stripping)
- `src/db/index.ts` (postgres.js client, singleton, `pgbouncer` stripping)
- `src/db/schema/*` (app + spatial tables)
- `src/db/types.ts` (InferSelect/InferInsert exports)

**Route and service migrations**
- `src/app/api/habitat/colormap/route.ts`
- `src/app/api/highscores/route.ts`
- `src/app/api/species/catalog/route.ts`
- `src/app/api/species/random-names/route.ts`
- `src/app/api/species/bioregions/route.ts`
- `src/app/api/species/by-ids/route.ts`
- `src/app/api/species/in-radius/route.ts` (PostGIS)
- `src/app/api/species/at-point/route.ts` (PostGIS)
- `src/app/api/species/closest/route.ts` (PostGIS)
- `src/app/api/discoveries/migrate/route.ts`
- `src/lib/speciesQueries.ts` (query patterns + PostGIS)
- `src/lib/playerStatsService.ts`
- `src/lib/playerTracking.ts` (transactions + upserts)

**Behavior changes**
- Non-spatial endpoints now explicitly select columns and exclude `wkb_geometry` payloads.
- Snake-case API shapes are preserved via explicit alias maps (no auto-casing).
- PostGIS queries use `db.execute(sql\`...\`)` and handle postgres.js RowList.
- `trackClueUnlock` uses conflict-aware insert logic without empty `set` clauses.

## Introspection Workflow (Spatial Tables)

When shapefile schema changes:

1. Re-import the shapefile into Postgres.
2. Temporarily disable `tablesFilter` in `drizzle.config.ts` (to include spatial tables).
3. Run:
   ```bash
   npx drizzle-kit introspect
   ```
4. Copy the `icaa` / `oneearth_bioregion` definitions into `src/db/schema/species.ts`.
5. Delete the generated `drizzle/` output (we do not keep it in-repo).
6. Re-enable `tablesFilter`.

Note: `drizzle.config.ts` already strips `pgbouncer=true` for compatibility.

## Query Pattern Mapping (Reference)

| Prisma | Drizzle |
|--------|---------|
| `findMany()` | `db.select().from(table)` |
| `findUnique()` | `db.select().from(table).where(eq(...)).limit(1)` |
| `create()` | `db.insert(table).values(...).returning()` |
| `createMany()` | `db.insert(table).values([...]).onConflictDoNothing()` |
| `update()` | `db.update(table).set(...).where(...)` |
| `upsert()` | `db.insert(...).onConflictDoUpdate(...)` |
| `$queryRaw` | `db.execute(sql\`...\`)` |
| `$transaction` | `db.transaction(async (tx) => { ... })` |

## Cleanup (Completed)

- Removed Prisma packages and scripts from `package.json`.
- Deleted `src/lib/prisma.ts`.
- Deleted `prisma/` directory.
- Updated wiki docs to Drizzle references.

## Related Docs

- `docs/DATABASE_USER_GUIDE.md`
- `docs/SPECIES_DATABASE_IMPLEMENTATION.md`
- `database_redesign_analysis.md`
