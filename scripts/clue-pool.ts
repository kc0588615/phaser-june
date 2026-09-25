// Clue Match content check.
//   npm run clue:pool -- --check      validate the live pool (exit 1 on errors)
//   npm run clue:pool -- --snapshot   validate, then write tests/fixtures/clueGame/pool.json
// CLUE_USE_TUNNEL=1 connects through the agent SSH tunnel (127.0.0.1:55432).
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { buildCluePool } from '../src/lib/cluePool';
import { validatePool } from '../src/clueGame/validatePool';
import { connect, run } from './connect';

const SNAPSHOT = path.join(process.cwd(), 'tests/fixtures/clueGame/pool.json');

run(async () => {
  const mode = process.argv[2];
  if (process.argv.length !== 3 || !['--check', '--snapshot'].includes(mode)) throw new Error('Choose --check or --snapshot.');
  const client = connect();
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
});
