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

export * from './schema';
export * from './types';
