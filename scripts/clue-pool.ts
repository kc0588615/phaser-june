// Clue Match content check.
//   npm run clue:pool -- --check      validate the live pool (exit 1 on errors)
//   npm run clue:pool -- --snapshot   validate, then write tests/fixtures/clueGame/pool.json
// CLUE_USE_TUNNEL=1 connects through the agent SSH tunnel (127.0.0.1:55432).
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { buildCluePool } from '../src/lib/cluePool';
import { validatePool } from '../src/clueGame/validatePool';

const SNAPSHOT = path.join(process.cwd(), 'tests/fixtures/clueGame/pool.json');

async function main() {
  const mode = process.argv[2];
  if (process.argv.length !== 3 || !['--check', '--snapshot'].includes(mode)) throw new Error('Choose --check or --snapshot.');
  loadEnv({ path: '.env.local', quiet: true });
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.delete('pgbouncer');
  if (process.env.CLUE_USE_TUNNEL === '1') {
    url.hostname = '127.0.0.1'; url.port = '55432'; url.searchParams.set('sslmode', 'disable');
  }
  const client = postgres(url.toString(), { max: 1, connect_timeout: 10 });
  try {
    const pool = await buildCluePool(drizzle(client));
    const report = validatePool(pool);
    const { summary } = report;
    console.log(`Pool: ${summary.playable} playable of ${summary.species} species, ${summary.clues} clues (${summary.deductiveClues} deductive), ${summary.facts} facts.`);
    for (const warning of report.warnings) console.log(`  warn  ${warning}`);
    for (const error of report.errors) console.log(`  ERROR ${error}`);
    console.log(`${report.errors.length} errors, ${report.warnings.length} warnings.`);
    if (report.errors.length) process.exitCode = 1;
    else if (mode === '--snapshot') {
      await mkdir(path.dirname(SNAPSHOT), { recursive: true });
      await writeFile(SNAPSHOT, `${JSON.stringify(pool, null, 1)}\n`);
      console.log(`Wrote ${path.relative(process.cwd(), SNAPSHOT)}.`);
    }
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch(error => {
  const cause = error instanceof Error && error.cause instanceof Error ? ` (${error.cause.message})` : '';
  console.error(`${error instanceof Error ? error.message.split('\n')[0] : error}${cause}`);
  process.exit(1);
});
