---
sidebar_position: 4
title: Drizzle Vercel Deployment
description: Deploying Drizzle to Vercel
tags: [guide, drizzle, vercel, deployment]
---

# Drizzle Vercel Deployment

Guidance for running Drizzle on Vercel serverless functions with PgBouncer.

## Build Command

Drizzle does not require codegen at build time.

```json
{
  "build": "npm run typecheck && next build --webpack"
}
```

## Connection Pooling

Use postgres.js with PgBouncer and a single connection per function.

```typescript
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL!, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});
```

## PgBouncer Connection String

Use the PgBouncer host/port with TLS, but do not add `pgbouncer=true`.

```env
DATABASE_URL=postgresql://user:password@host:6432/database?sslmode=require
```

Older local URLs may contain `pgbouncer=true`; postgres.js does not accept that startup parameter. The repo strips it defensively in both:

- `src/db/index.ts`
- `drizzle.config.ts`

## Drizzle CLI

When you need updated types from the database:

```bash
npx drizzle-kit introspect
```
