import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';

loadEnv({ path: '.env.local', quiet: true });

type ReasoningEvent = { obsRef?: string; correct?: boolean; latencyMs?: number; actualEliminatedIds?: number[] };
type Issuance = { ref?: string; cardId?: number; qualityTier?: number };
type FamilyApplication = { ref?: string; family?: string; actualEliminatedIds?: number[] };
type RunRow = { id: string; metadata: Record<string, unknown> };
type NodeRow = { run_id: string; objective_target: number; objective_progress: number; moves_used: number; board_context: Record<string, unknown> };
type CardRow = { id: number; primary_predicate: string };

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

function stripPgBouncer(value: string): string {
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
  const databaseUrl = process.env.REPORT_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Set REPORT_DATABASE_URL or DATABASE_URL.');
  const sql = postgres(stripPgBouncer(databaseUrl), { max: 1, idle_timeout: 20, connect_timeout: 10 });

  try {
    const runs = await sql<RunRow[]>`
      SELECT id::text, metadata
      FROM eco_run_sessions
      WHERE metadata ? 'casePublic'
        AND (
          jsonb_array_length(COALESCE(metadata->'reasoningEvents', '[]'::jsonb)) > 0
          OR jsonb_array_length(COALESCE(metadata->'evidenceApplications', '[]'::jsonb)) > 0
        )
      ORDER BY started_at DESC
      LIMIT 500
    `;
    const nodes = runs.length ? await sql<NodeRow[]>`
      SELECT run_id::text, objective_target, objective_progress, moves_used, board_context
      FROM eco_run_nodes
      WHERE run_id = ANY(${sql.array(runs.map(run => run.id))}::uuid[])
    ` : [];
    const cardIds = [...new Set(runs.flatMap(run => {
      const issued = record(run.metadata).observationsIssued;
      return Array.isArray(issued) ? issued.flatMap(value => {
        const cardId = record(value).cardId;
        return Number.isInteger(cardId) ? [cardId as number] : [];
      }) : [];
    }))];
    const cards = cardIds.length ? await sql<CardRow[]>`
      SELECT id, primary_predicate
      FROM evidence_cards
      WHERE id = ANY(${sql.array(cardIds)}::bigint[])
    ` : [];
    const predicateFamilyByCard = new Map(cards.map(card => [card.id, card.primary_predicate.split(':', 1)[0]]));

    const allEvents: ReasoningEvent[] = [];
    const firstEvents: ReasoningEvent[] = [];
    const lastEvents: ReasoningEvent[] = [];
    const firstGuessResults: boolean[] = [];
    let repeatedPredicateRuns = 0;
    let improvedPredicateRuns = 0;
    let citedRunCount = 0;
    let citedRefCount = 0;
    const familySelections = new Map<string, number>();
    let familyApplications = 0;
    let familyCorroborations = 0;
    for (const run of runs) {
      const metadata = record(run.metadata);
      const events = Array.isArray(metadata.reasoningEvents) ? metadata.reasoningEvents.map(value => record(value) as ReasoningEvent) : [];
      allEvents.push(...events);
      if (events[0]) firstEvents.push(events[0]);
      if (events.at(-1)) lastEvents.push(events.at(-1)!);
      if (typeof metadata.firstGuessCorrect === 'boolean') firstGuessResults.push(metadata.firstGuessCorrect);
      const citedRefs = Array.isArray(metadata.citedEvidenceRefs)
        ? metadata.citedEvidenceRefs.filter((value): value is string => typeof value === 'string')
        : [];
      if (citedRefs.length > 0) citedRunCount += 1;
      citedRefCount += citedRefs.length;
      const applications = Array.isArray(metadata.evidenceApplications)
        ? metadata.evidenceApplications.map(value => record(value) as FamilyApplication)
        : [];
      for (const application of applications) {
        if (typeof application.family === 'string') familySelections.set(application.family, (familySelections.get(application.family) ?? 0) + 1);
        familyApplications += 1;
        if (Array.isArray(application.actualEliminatedIds) && application.actualEliminatedIds.length === 0) familyCorroborations += 1;
      }

      // Keep the issuance parse exercised: malformed historical rows should be visible in the report.
      const issued = Array.isArray(metadata.observationsIssued) ? metadata.observationsIssued.map(value => record(value) as Issuance) : [];
      if (issued.some(value => typeof value.ref !== 'string' || !Number.isInteger(value.cardId))) {
        console.warn(`Run ${run.id} has malformed observation issuance metadata.`);
      }
      const familyByRef = new Map(issued.flatMap(value => {
        const family = typeof value.cardId === 'number' ? predicateFamilyByCard.get(value.cardId) : undefined;
        return typeof value.ref === 'string' && family ? [[value.ref, family] as const] : [];
      }));
      const eventsByFamily = new Map<string, ReasoningEvent[]>();
      for (const event of events) {
        const family = event.obsRef ? familyByRef.get(event.obsRef) : undefined;
        if (family) eventsByFamily.set(family, [...(eventsByFamily.get(family) ?? []), event]);
      }
      for (const familyEvents of eventsByFamily.values()) {
        if (familyEvents.length < 2) continue;
        repeatedPredicateRuns += 1;
        if (familyEvents[0].correct !== true && familyEvents.at(-1)?.correct === true) improvedPredicateRuns += 1;
      }
    }

    const correct = (events: ReasoningEvent[]) => events.filter(event => event.correct === true).length;
    const latencySeconds = allEvents.flatMap(event => typeof event.latencyMs === 'number' && event.latencyMs >= 0 ? [event.latencyMs / 1000] : []);
    const failedNodes = nodes.filter(node => node.objective_progress < node.objective_target).length;
    const methodSelections = new Map<string, number>();
    const qualityTiers = new Map<number, number>();
    const choiceLatencies: number[] = [];
    for (const node of nodes) {
      const context = record(node.board_context);
      if (typeof context.method === 'string') methodSelections.set(context.method, (methodSelections.get(context.method) ?? 0) + 1);
      const latency = context.choiceLatencyMs;
      if (typeof latency === 'number' && latency >= 0) choiceLatencies.push(latency / 1000);
      const best = context.bestTargetMatchLength;
      const tier = best === 3 ? 1 : best === 4 ? 2 : typeof best === 'number' && best >= 5 ? 3 : 0;
      qualityTiers.set(tier, (qualityTiers.get(tier) ?? 0) + 1);
    }
    const corroborations = allEvents.filter(event => Array.isArray(event.actualEliminatedIds) && event.actualEliminatedIds.length === 0).length;
    const movesByRun = new Map<string, number>();
    for (const node of nodes) movesByRun.set(node.run_id, (movesByRun.get(node.run_id) ?? 0) + node.moves_used);

    console.log(`Runs with reasoning or applied family evidence: ${runs.length}`);
    console.log(`Interpretation accuracy: ${percent(correct(allEvents), allEvents.length)} (${correct(allEvents)}/${allEvents.length})`);
    console.log(`Within-run slope: first ${percent(correct(firstEvents), firstEvents.length)} -> last ${percent(correct(lastEvents), lastEvents.length)}`);
    console.log(`Revision improvement after repeated predicate families: ${percent(improvedPredicateRuns, repeatedPredicateRuns)} (${improvedPredicateRuns}/${repeatedPredicateRuns})`);
    console.log(`Median time to commit: ${median(latencySeconds)?.toFixed(1) ?? 'n/a'}s`);
    console.log(`First-guess accuracy: ${percent(firstGuessResults.filter(Boolean).length, firstGuessResults.length)}`);
    console.log(`Failed nodes: ${percent(failedNodes, nodes.length)} (${failedNodes}/${nodes.length})`);
    console.log(`Median moves per case: ${median([...movesByRun.values()])?.toFixed(1) ?? 'n/a'}`);
    console.log(`Method selections: ${JSON.stringify(Object.fromEntries(methodSelections))}`);
    console.log(`Evidence tiers (0 = none): ${JSON.stringify(Object.fromEntries(qualityTiers))}`);
    console.log(`Median method-choice latency: ${median(choiceLatencies)?.toFixed(1) ?? 'n/a'}s`);
    console.log(`Corroborating interpretations: ${percent(corroborations, allEvents.length)} (${corroborations}/${allEvents.length})`);
    console.log(`Citation use: ${percent(citedRunCount, runs.length)} (${citedRunCount}/${runs.length}), ${citedRefCount} refs`);
    console.log(`V3 family selections: ${JSON.stringify(Object.fromEntries(familySelections))}`);
    console.log(`V3 corroborating clues: ${percent(familyCorroborations, familyApplications)} (${familyCorroborations}/${familyApplications})`);
  } finally {
    await sql.end();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
