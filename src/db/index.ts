import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  client: ReturnType<typeof postgres> | undefined;
};

// Strip pgbouncer param (not supported by postgres.js startup)
function stripPgBouncer(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.delete('pgbouncer');
  return parsed.toString();
}

const dbUrl = stripPgBouncer(process.env.DATABASE_URL!);

const client =
  globalForDb.client ??
  postgres(dbUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.client = client;
}

export const db = drizzle(client, { schema });

let icaaViewReadyPromise: Promise<void> | null = null;

export async function ensureIcaaViewReady(): Promise<void> {
  if (!icaaViewReadyPromise) {
    icaaViewReadyPromise = (async () => {
      const result = await db.execute<{ view_name: string | null }>(sql`
        SELECT to_regclass('public.icaa_view') AS view_name
      `);
      const viewName = result[0]?.view_name ?? null;
      if (!viewName) {
        const message =
          'Missing required database view "icaa_view". Run migrations 004_normalized_biodiversity_schema.sql, ' +
          '005_normalized_biodiversity_backfill.sql, and 006_normalized_biodiversity_views.sql before starting the app.';
        console.error(message);
        throw new Error(message);
      }
    })().catch((err) => {
      icaaViewReadyPromise = null;
      throw err;
    });
  }

  return icaaViewReadyPromise;
}

const shouldRunStartupCheck =
  typeof window === 'undefined' &&
  process.env.NEXT_RUNTIME !== 'edge' &&
  process.env.NEXT_PHASE !== 'phase-production-build' &&
  process.env.NODE_ENV !== 'test';

if (shouldRunStartupCheck) {
  ensureIcaaViewReady().catch((err) => {
    console.error('Database startup check failed:', err);
    setTimeout(() => {
      throw err;
    });
  });
}

export * from './schema';
export * from './types';
