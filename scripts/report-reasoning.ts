import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';

loadEnv({ path: '.env.local', quiet: true });

type FamilyApplication = { family?: string; actualEliminatedIds?: number[] };
type RunRow = { id: string; metadata: Record<string, unknown> };
type NodeRow = { run_id: string; moves_used: number };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function percent(numerator: number, denominator: number): string {
  return denominator ? `${(numerator / denominator * 100).toFixed(1)}%` : 'n/a';
}

function databaseUrl(value: string): string {
  const url = new URL(value);
  url.searchParams.delete('pgbouncer');
  if (process.env.REPORT_USE_TUNNEL === '1') {
    url.hostname = '127.0.0.1';
    url.port = '55432';
    url.searchParams.set('sslmode', 'disable');
  }
  return url.toString();
}

async function main() {
  const configuredUrl = process.env.REPORT_DATABASE_URL || process.env.DATABASE_URL;
  if (!configuredUrl) throw new Error('Set REPORT_DATABASE_URL or DATABASE_URL.');
  const sql = postgres(databaseUrl(configuredUrl), { max: 1, idle_timeout: 20, connect_timeout: 10 });

  try {
    const runs = await sql<RunRow[]>`
      SELECT id::text, metadata
      FROM eco_run_sessions
      WHERE metadata->'casePublic'->>'version' = '3'
        AND jsonb_array_length(COALESCE(metadata->'evidenceApplications', '[]'::jsonb)) > 0
      ORDER BY started_at DESC
      LIMIT 500
    `;
    const nodes = runs.length ? await sql<NodeRow[]>`
      SELECT run_id::text, moves_used
      FROM eco_run_nodes
      WHERE run_id = ANY(${sql.array(runs.map(run => run.id))}::uuid[])
    ` : [];

    const familySelections = new Map<string, number>();
    const firstGuessResults: boolean[] = [];
    let applications = 0;
    let corroborations = 0;
    for (const run of runs) {
      const metadata = record(run.metadata);
      if (typeof metadata.firstGuessCorrect === 'boolean') firstGuessResults.push(metadata.firstGuessCorrect);
      const applied = Array.isArray(metadata.evidenceApplications)
        ? metadata.evidenceApplications.map(value => record(value) as FamilyApplication)
        : [];
      for (const application of applied) {
        if (typeof application.family === 'string') {
          familySelections.set(application.family, (familySelections.get(application.family) ?? 0) + 1);
        }
        applications += 1;
        if (Array.isArray(application.actualEliminatedIds) && application.actualEliminatedIds.length === 0) corroborations += 1;
      }
    }

    const movesByRun = new Map<string, number>();
    for (const node of nodes) movesByRun.set(node.run_id, (movesByRun.get(node.run_id) ?? 0) + node.moves_used);

    console.log(`V3 runs with applied evidence: ${runs.length}`);
    console.log(`Family selections: ${JSON.stringify(Object.fromEntries(familySelections))}`);
    console.log(`Corroborating clues: ${percent(corroborations, applications)} (${corroborations}/${applications})`);
    console.log(`First-guess accuracy: ${percent(firstGuessResults.filter(Boolean).length, firstGuessResults.length)}`);
    console.log(`Median moves per case: ${median([...movesByRun.values()])?.toFixed(1) ?? 'n/a'}`);
  } finally {
    await sql.end();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
