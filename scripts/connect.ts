// Shared by the scripts: a postgres.js client from DATABASE_URL (.env.local),
// and a runner that prints a one-line error and exits 1.
// CLUE_USE_TUNNEL=1 connects through the agent SSH tunnel (127.0.0.1:55432).
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';

export function connect(): postgres.Sql {
  loadEnv({ path: '.env.local', quiet: true });
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.delete('pgbouncer');
  if (process.env.CLUE_USE_TUNNEL === '1') {
    url.hostname = '127.0.0.1'; url.port = '55432'; url.searchParams.set('sslmode', 'disable');
  }
  return postgres(url.toString(), { max: 1, connect_timeout: 10 });
}

export function run(main: () => Promise<void>): void {
  main().catch(error => {
    const cause = error instanceof Error && error.cause instanceof Error ? ` (${error.cause.message})` : '';
    console.error(`${error instanceof Error ? error.message.split('\n')[0] : error}${cause}`);
    process.exit(1);
  });
}
