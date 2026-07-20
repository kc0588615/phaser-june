import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import {
  EVIDENCE_PROTOTYPE_IUCN_IDS,
  parseEvidenceProfileDossier,
  parseEvidenceSeed,
  validateEvidenceCorpus,
  type EvidenceProfileDossier,
  type EvidenceSeed,
} from '../src/lib/evidenceSeedValidation';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const evidenceDir = path.join(repoRoot, 'db/seeds/evidence');
const deductionDir = path.join(repoRoot, 'db/seeds/deduction');

type SpeciesRow = {
  id: number;
  iucn_id: number;
  scientific_name: string;
};

type ExistingCardRow = {
  id: number;
  method: string;
  specificity: number;
  is_signature: boolean;
  primary_predicate: string;
  observation_text: string;
  inference_text: string;
  trait_category: string;
  compare_tags: string[];
  source: string | null;
  review_status: string | null;
};

function stripPgBouncer(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.delete('pgbouncer');
  if (process.env.EVIDENCE_USE_TUNNEL === '1') {
    parsed.hostname = '127.0.0.1';
    parsed.port = '55432';
    parsed.searchParams.set('sslmode', 'disable');
  }
  return parsed.toString();
}

async function loadJsonFiles<T>(
  directory: string,
  parse: (raw: unknown, fileName: string) => T,
): Promise<T[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => entry.name)
    .sort();

  const result: T[] = [];
  for (const fileName of files) {
    const raw = JSON.parse(await readFile(path.join(directory, fileName), 'utf8')) as unknown;
    result.push(parse(raw, fileName));
  }
  return result;
}

async function loadLocalCorpus(): Promise<{
  seeds: EvidenceSeed[];
  dossiers: EvidenceProfileDossier[];
}> {
  const seeds = await loadJsonFiles(evidenceDir, parseEvidenceSeed);
  const allDossiers = await loadJsonFiles(deductionDir, parseEvidenceProfileDossier);
  const selectedIds = new Set<number>(EVIDENCE_PROTOTYPE_IUCN_IDS);
  return {
    seeds,
    dossiers: allDossiers.filter(dossier => selectedIds.has(dossier.iucnId)),
  };
}

function printReport(
  seeds: readonly EvidenceSeed[],
  validation: ReturnType<typeof validateEvidenceCorpus>,
): void {
  const cardCount = seeds.reduce((total, seed) => total + seed.cards.length, 0);
  console.log(`Validated ${cardCount} evidence cards across ${seeds.length} species.`);
  console.log('\nOrdinary tag frequency across the six-species corpus');
  for (const entry of validation.ordinaryTagFrequencies) {
    console.log(`- ${entry.traitCategory} | ${entry.compareTag} = ${entry.count}`);
  }

  console.log('\nDeterministic positive-reduction chains');
  for (const report of validation.reports) {
    console.log(`- ${report.scientificName} (${report.iucnId})`);
    for (const [index, step] of report.steps.entries()) {
      console.log(
        `  ${index + 1}. ${step.method} | ${step.traitCategory} | ${step.compareTag}`
        + ` | eliminate [${step.eliminatedIucnIds.join(', ')}]`
        + ` | remain [${step.remainingIucnIds.join(', ')}]`,
      );
    }
    console.log(
      `  result: [${report.finalCandidateIds.join(', ')}]`
      + ` | signature ${report.signatureNeeded ? 'available as fallback' : 'not needed'}`,
    );
  }
}

function sameCard(existing: ExistingCardRow, card: EvidenceSeed['cards'][number]): boolean {
  return existing.method === card.method
    && existing.specificity === card.specificity
    && existing.is_signature === card.is_signature
    && existing.primary_predicate === card.primary_predicate;
}

async function syncEvidence(seeds: readonly EvidenceSeed[], dryRun: boolean): Promise<void> {
  loadEnv({ path: '.env.local', quiet: true });
  const databaseUrl = process.env.EVIDENCE_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Set EVIDENCE_DATABASE_URL or DATABASE_URL before using --write.');
  }

  const sql = postgres(stripPgBouncer(databaseUrl), {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    const tableCheck = await sql<{ table_name: string | null }[]>`
      SELECT to_regclass('public.evidence_cards')::text AS table_name
    `;
    if (!tableCheck[0]?.table_name) {
      throw new Error('public.evidence_cards is absent; apply migration 024 before using --write.');
    }

    const speciesRows = await sql<SpeciesRow[]>`
      SELECT id, iucn_id::integer AS iucn_id, scientific_name
      FROM public.species
      WHERE iucn_id = ANY(${sql.array([...EVIDENCE_PROTOTYPE_IUCN_IDS])}::bigint[])
      ORDER BY iucn_id
    `;
    const speciesByIucnId = new Map(speciesRows.map(row => [row.iucn_id, row]));
    for (const seed of seeds) {
      const species = speciesByIucnId.get(seed.iucn_id);
      if (!species || species.scientific_name !== seed.scientific_name) {
        throw new Error(`No exact species row match for ${seed.scientific_name} (${seed.iucn_id}).`);
      }
    }

    await sql.begin(async transaction => {
      const tx = transaction as unknown as typeof sql;
      for (const seed of seeds) {
        const species = speciesByIucnId.get(seed.iucn_id)!;
        const existing = await tx<ExistingCardRow[]>`
          SELECT id::integer, method, specificity, is_signature, primary_predicate,
                 observation_text, inference_text, trait_category, compare_tags, source, review_status
          FROM public.evidence_cards
          WHERE species_id = ${species.id}
          ORDER BY id
        `;
        const usedIds = new Set<number>();
        let reused = 0;
        let inserted = 0;

        for (const card of seed.cards) {
          const match = existing.find(row => !usedIds.has(row.id) && sameCard(row, card));
          if (match) {
            usedIds.add(match.id);
            reused += 1;
            if (!dryRun) await tx`
              UPDATE public.evidence_cards SET
                observation_text = ${card.observation_text},
                inference_text = ${card.inference_text},
                trait_category = ${card.trait_category},
                compare_tags = ${tx.array(card.compare_tags)},
                source = ${card.source},
                review_status = ${card.review_status}
              WHERE id = ${match.id}
            `;
          } else {
            inserted += 1;
            if (!dryRun) await tx`
              INSERT INTO public.evidence_cards (
                species_id, method, observation_text, inference_text, trait_category,
                primary_predicate, compare_tags, is_signature, specificity, source, review_status
              ) VALUES (
                ${species.id}, ${card.method}, ${card.observation_text}, ${card.inference_text},
                ${card.trait_category}, ${card.primary_predicate}, ${tx.array(card.compare_tags)},
                ${card.is_signature}, ${card.specificity}, ${card.source}, ${card.review_status}
              )
            `;
          }
        }
        const archiveIds = existing.filter(row => row.review_status === 'reviewed' && !usedIds.has(row.id)).map(row => row.id);
        if (!dryRun && archiveIds.length > 0) await tx`
          UPDATE public.evidence_cards SET review_status = 'legacy'
          WHERE id = ANY(${tx.array(archiveIds)}::bigint[])
        `;
        console.log(`${seed.scientific_name}: reuse/update ${reused}, insert ${inserted}, archive ${archiveIds.length}, preserve legacy ${existing.length - archiveIds.length - reused}.`);
      }
      if (dryRun) throw new DryRunRollback();
    });
  } catch (error) {
    if (!(error instanceof DryRunRollback)) throw error;
  } finally {
    await sql.end();
  }
}

class DryRunRollback extends Error {}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const checkMode = args.length === 1 && args[0] === '--check';
  const dryRunMode = args.length === 1 && args[0] === '--dry-run';
  const writeMode = args.length === 1 && args[0] === '--write';
  if (!checkMode && !dryRunMode && !writeMode) {
    throw new Error('Choose exactly one mode: --check, --dry-run, or --write.');
  }

  const { seeds, dossiers } = await loadLocalCorpus();
  const validation = validateEvidenceCorpus(seeds, dossiers);
  if (validation.errors.length > 0) {
    console.error('Evidence seed validation failed:');
    for (const error of validation.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  printReport(seeds, validation);
  if (checkMode) {
    console.log('\nCheck complete. No database connection opened; no writes performed.');
    return;
  }

  await syncEvidence(seeds, dryRunMode);
  console.log(dryRunMode
    ? '\nDry run complete. Transaction rolled back; no writes performed.'
    : '\nEvidence write complete. Legacy rows were retained for in-progress v1 runs.');
}

main().catch((error: unknown) => {
  console.error('Evidence seed failed:', error);
  process.exitCode = 1;
});
