# Drizzle + Vercel Server Runtime Migration

Server runtime is required for API routes and Drizzle database access. This document records the production setup for Vercel + PgBouncer.

## Build Command

```json
{
  "vercel-build": "npm run typecheck && next build --webpack"
}
```

## postgres.js Client

```typescript
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL!, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});
```

## PgBouncer Compatibility

If your `DATABASE_URL` contains `pgbouncer=true`, postgres.js does not accept the
startup parameter. The app strips it in:

- `src/db/index.ts`
- `drizzle.config.ts`

## Notes

- Drizzle CLI is used for introspection only (`npm run db:introspect`).
- PostGIS queries stay in raw SQL via `db.execute(sql\`...\`)`.
