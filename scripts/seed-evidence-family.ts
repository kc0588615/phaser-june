import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import { EVIDENCE_PROTOTYPE_IUCN_IDS, parseEvidenceProfileDossier } from '../src/lib/evidenceSeedValidation';
import { parseCascadeHintSeed, parseEvidenceFamilySeed, validateEvidenceFamilyCorpus, type CascadeHintSeed, type EvidenceFamilySeed } from '../src/lib/evidenceFamilySeedValidation';

loadEnv({ path: path.join(process.cwd(), '.env.local') });
loadEnv();

async function loadFiles<T>(directory: string, parse: (value: unknown, file: string) => T): Promise<T[]> {
  const files = (await readdir(directory)).filter(file => file.endsWith('.json')).sort();
  return Promise.all(files.map(async file => parse(JSON.parse(await readFile(path.join(directory, file), 'utf8')) as unknown, file)));
}

async function loadCorpus() {
  const root = process.cwd();
  const seedRoot = path.join(root, 'db/seeds/evidence-family');
  const files = (await readdir(seedRoot)).filter(file => file.endsWith('.json') && file !== 'cascade_hints.json').sort();
  const seeds = await Promise.all(files.map(async file => parseEvidenceFamilySeed(JSON.parse(await readFile(path.join(seedRoot, file), 'utf8')) as unknown, file)));
  const cascadeHints = parseCascadeHintSeed(JSON.parse(await readFile(path.join(seedRoot, 'cascade_hints.json'), 'utf8')) as unknown);
  const selected = new Set<number>(EVIDENCE_PROTOTYPE_IUCN_IDS);
  const dossiers = (await loadFiles(path.join(root, 'db/seeds/deduction'), parseEvidenceProfileDossier))
    .filter(dossier => selected.has(dossier.iucnId));
  return { seeds, dossiers, cascadeHints };
}

function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error('DATABASE_URL is required for --dry-run or --write.');
  const url = new URL(value);
  url.searchParams.delete('pgbouncer');
  if (process.env.EVIDENCE_FAMILY_USE_TUNNEL === '1') {
    url.hostname = '127.0.0.1';
    url.port = '55432';
    url.searchParams.set('sslmode', 'disable');
  }
  return url.toString();
}

type ExistingRow = {
  id: number; family: string; observation_text: string; inference_text: string; trait_category: string; compare_tag: string;
  trait_phrase: string; bonus_fact_text: string; source: string; review_status: string;
};
type ExistingHintRow = { family: string; sequence_index: number; hint_text: string; weak_tag: string };

function same(row: ExistingRow, card: EvidenceFamilySeed['cards'][number]): boolean {
  return row.family === card.family && row.observation_text === card.observation_text
    && row.inference_text === card.inference_text
    && row.trait_category === card.trait_category && row.compare_tag === card.compare_tag
    && row.trait_phrase === card.trait_phrase
    && row.bonus_fact_text === card.bonus_fact_text && row.source === card.source
    && row.review_status === card.review_status;
}

async function sync(seeds: readonly EvidenceFamilySeed[], cascadeHints: readonly CascadeHintSeed[], dryRun: boolean): Promise<void> {
  const sql = postgres(databaseUrl(), { max: 1, connect_timeout: 10, idle_timeout: 20 });
  try {
    const tables = await sql<{ cards: string | null; hints: string | null; cascades: string | null }[]>`
      SELECT to_regclass('public.evidence_family_cards')::text AS cards,
        to_regclass('public.evidence_family_hints')::text AS hints,
        to_regclass('public.cascade_hints')::text AS cascades
    `;
    if (!tables[0]?.cards || !tables[0]?.hints || !tables[0]?.cascades) throw new Error('Plan 018 evidence tables are absent; apply migration 026 first.');
    const speciesRows = await sql<{ id: number; iucn_id: number; scientific_name: string }[]>`
      SELECT id, iucn_id::integer AS iucn_id, scientific_name FROM species
      WHERE iucn_id = ANY(${sql.array([...EVIDENCE_PROTOTYPE_IUCN_IDS])}::bigint[])
    `;
    const speciesByIucn = new Map(speciesRows.map(row => [row.iucn_id, row]));
    for (const seed of seeds) {
      const species = speciesByIucn.get(seed.iucn_id);
      if (!species || species.scientific_name !== seed.scientific_name) throw new Error(`No exact species row for ${seed.scientific_name}.`);
    }
    await sql.begin(async txValue => {
      const tx = txValue as unknown as typeof sql;
      for (const seed of seeds) {
        const speciesId = speciesByIucn.get(seed.iucn_id)!.id;
        const existing = await tx<ExistingRow[]>`
          SELECT id::integer, family, observation_text, inference_text, trait_category, compare_tag, trait_phrase, bonus_fact_text, source, review_status
          FROM evidence_family_cards WHERE species_id = ${speciesId} ORDER BY family
        `;
        const existingHints = await tx<ExistingHintRow[]>`
          SELECT family, sequence_index::integer, hint_text, weak_tag
          FROM evidence_family_hints WHERE species_id = ${speciesId} ORDER BY family, sequence_index
        `;
        let unchanged = 0;
        let upserted = 0;
        let hintUpserted = 0;
        for (const card of seed.cards) {
          const row = existing.find(candidate => candidate.family === card.family);
          if (row && same(row, card)) unchanged += 1;
          else {
            upserted += 1;
            if (!dryRun) await tx`
            INSERT INTO evidence_family_cards
              (species_id, family, observation_text, inference_text, trait_category, compare_tag, trait_phrase, bonus_fact_text, source, review_status)
            VALUES (${speciesId}, ${card.family}, ${card.observation_text}, ${card.inference_text}, ${card.trait_category}, ${card.compare_tag},
                    ${card.trait_phrase}, ${card.bonus_fact_text}, ${card.source}, ${card.review_status})
            ON CONFLICT (species_id, family) DO UPDATE SET
              observation_text = EXCLUDED.observation_text, inference_text = EXCLUDED.inference_text,
              trait_category = EXCLUDED.trait_category,
              compare_tag = EXCLUDED.compare_tag, bonus_fact_text = EXCLUDED.bonus_fact_text,
              trait_phrase = EXCLUDED.trait_phrase,
              source = EXCLUDED.source, review_status = EXCLUDED.review_status
            `;
          }
          for (const [sequenceIndex, hintText] of card.hints.entries()) {
            const existingHint = existingHints.find(hint => hint.family === card.family && hint.sequence_index === sequenceIndex);
            if (!existingHint || existingHint.hint_text !== hintText || existingHint.weak_tag !== card.compare_tag) {
              hintUpserted += 1;
              if (!dryRun) await tx`
              INSERT INTO evidence_family_hints
                (species_id, family, sequence_index, hint_text, weak_tag, review_status)
              VALUES (${speciesId}, ${card.family}, ${sequenceIndex}, ${hintText}, ${card.compare_tag}, 'reviewed')
              ON CONFLICT (species_id, family, sequence_index) DO UPDATE SET
                hint_text = EXCLUDED.hint_text, weak_tag = EXCLUDED.weak_tag, review_status = EXCLUDED.review_status
              `;
            }
          }
        }
        const staleCards = existing.filter(row => !seed.cards.some(card => card.family === row.family));
        const staleHints = existingHints.filter(row => !seed.cards.some(card => card.family === row.family && row.sequence_index < card.hints.length));
        if (!dryRun) {
          for (const row of staleCards) await tx`DELETE FROM evidence_family_cards WHERE id = ${row.id}`;
          for (const row of staleHints) await tx`
            DELETE FROM evidence_family_hints
            WHERE species_id = ${speciesId} AND family = ${row.family} AND sequence_index = ${row.sequence_index}
          `;
        }
        console.log(`${seed.scientific_name}: ${unchanged} cards unchanged, ${upserted} card insert/update, ${staleCards.length} stale cards; ${hintUpserted} hint insert/update, ${staleHints.length} stale hints.`);
      }
      const existingCascade = await tx<{ sequence_index: number; hint_text: string }[]>`
        SELECT sequence_index::integer, hint_text FROM cascade_hints ORDER BY sequence_index
      `;
      let cascadeUpserted = 0;
      for (const hint of cascadeHints) {
        const existing = existingCascade.find(row => row.sequence_index === hint.sequence_index);
        if (!existing || existing.hint_text !== hint.hint_text) {
          cascadeUpserted += 1;
          if (!dryRun) await tx`
          INSERT INTO cascade_hints (sequence_index, hint_text, review_status)
          VALUES (${hint.sequence_index}, ${hint.hint_text}, 'reviewed')
          ON CONFLICT (sequence_index) DO UPDATE SET hint_text = EXCLUDED.hint_text, review_status = EXCLUDED.review_status
          `;
        }
      }
      const currentCascadeIndexes = new Set(cascadeHints.map(hint => hint.sequence_index));
      const staleCascade = existingCascade.filter(row => !currentCascadeIndexes.has(row.sequence_index));
      if (!dryRun) for (const row of staleCascade) await tx`DELETE FROM cascade_hints WHERE sequence_index = ${row.sequence_index}`;
      console.log(`Cascade hints: ${cascadeHints.length - cascadeUpserted} unchanged, ${cascadeUpserted} insert/update, ${staleCascade.length} stale.`);
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
  const [mode] = process.argv.slice(2);
  if (!['--check', '--dry-run', '--write'].includes(mode) || process.argv.slice(2).length !== 1) {
    throw new Error('Choose exactly one mode: --check, --dry-run, or --write.');
  }
  const { seeds, dossiers, cascadeHints } = await loadCorpus();
  const errors = validateEvidenceFamilyCorpus(seeds, dossiers);
  if (errors.length > 0) throw new Error(`Family evidence corpus invalid:\n- ${errors.join('\n- ')}`);
  const hintCount = seeds.reduce((total, seed) => total + seed.cards.reduce((sum, card) => sum + card.hints.length, 0), 0);
  console.log(`Validated ${seeds.reduce((total, seed) => total + seed.cards.length, 0)} family cards, ${hintCount} family hints, and ${cascadeHints.length} cascade hints across ${seeds.length} species.`);
  if (mode === '--check') {
    console.log('Check complete. No database connection opened; no writes performed.');
    return;
  }
  await sync(seeds, cascadeHints, mode === '--dry-run');
  console.log(mode === '--dry-run' ? 'Dry run rolled back; no writes performed.' : 'Evidence-family write complete.');
}

main().catch((error: unknown) => {
  console.error('Evidence-family seed failed:', error);
  process.exitCode = 1;
});
