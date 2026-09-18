import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq, getTableColumns } from 'drizzle-orm';
import { speciesTable, speciesNotes, speciesDeductionProfiles } from '../src/db/schema';
import { parseEvidenceProfileDossier } from '../src/lib/evidenceSeedValidation';

const NOTE_FIELDS = {
  behavior_1: ['behavior', 1], behavior_2: ['behavior', 2],
  life_description_1: ['life_cycle', 1], life_description_2: ['life_cycle', 2],
  lifespan: ['life_cycle', 3], maturity: ['life_cycle', 4],
  key_fact_1: ['key_fact', 1], key_fact_2: ['key_fact', 2], key_fact_3: ['key_fact', 3],
  taxonomic_comment: ['taxonomy', 1], distribution_comment: ['distribution', 1],
  reproduction_type: ['reproduction', 1], clutch_size: ['reproduction', 2], threats: ['threats', 1],
} as const;

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['--check', '--write'].includes(args[0])) throw new Error('Choose --check or --write.');
  const write = args[0] === '--write';
  const directory = path.join(process.cwd(), 'db/seeds/species');
  const seeds = await Promise.all((await readdir(directory)).filter(file => file.endsWith('.json')).sort().map(async file => {
    const raw = JSON.parse(await readFile(path.join(directory, file), 'utf8'));
    const dossier = parseEvidenceProfileDossier(raw, file);
    if (!dossier.sources.length || dossier.sources.some(source => !source.startsWith('https://'))) throw new Error(`${file}: HTTPS sources required.`);
    return { raw, dossier };
  }));
  if (new Set(seeds.map(({ dossier }) => dossier.iucnId)).size !== seeds.length) throw new Error('Duplicate species IUCN IDs.');
  loadEnv({ path: '.env.local', quiet: true });
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.delete('pgbouncer');
  if (process.env.SPECIES_USE_TUNNEL === '1') {
    url.hostname = '127.0.0.1'; url.port = '55432'; url.searchParams.set('sslmode', 'disable');
  }
  const client = postgres(url.toString(), { max: 1, connect_timeout: 10 });
  try {
    const db = drizzle(client);
    await db.transaction(async tx => {
      for (const { raw, dossier } of seeds) {
        const data: Record<string, unknown> = {};
        for (const [key, column] of Object.entries(getTableColumns(speciesTable))) {
          if (['id', 'createdAt', 'updatedAt', 'iucnId', 'scientificName', 'commonName'].includes(key)) continue;
          const value = raw.species[column.name];
          if (value !== undefined) data[key] = ['sizeMinCm', 'sizeMaxCm', 'weightKg'].includes(key) && value !== null ? String(value) : value;
        }
        if (Array.isArray(raw.species.colors)) {
          data.colorPrimary = raw.species.colors[0] ?? null;
          data.colorSecondary = raw.species.colors[1] ?? null;
        }
        const values = { ...data, iucnId: dossier.iucnId, commonName: dossier.commonName, scientificName: dossier.scientificName };
        const notes = Object.entries(NOTE_FIELDS).flatMap(([field, [topic, sortOrder]]) => {
          const value = raw.species[field];
          if (value === undefined || value === null) return [];
          if (!['string', 'number'].includes(typeof value) || !String(value).trim()) throw new Error(`${dossier.scientificName}: invalid note ${field}.`);
          return [{ topic, sortOrder, noteText: String(value), sourceUrl: dossier.sources[0] }];
        });
        if (!write) continue;
        const [species] = await tx.insert(speciesTable).values(values)
          .onConflictDoUpdate({ target: speciesTable.iucnId, set: { ...values, updatedAt: new Date() } }).returning({ id: speciesTable.id });
        const profile = {
          speciesId: species.id,
          habitatTags: [...dossier.profile.habitat], morphologyTags: [...dossier.profile.morphology],
          dietTags: [...dossier.profile.diet], behaviorTags: [...dossier.profile.behavior],
          reproductionTags: [...dossier.profile.reproduction], taxonomyTags: [...dossier.profile.taxonomy],
          geographyTags: [...dossier.profile.geography], conservationTags: [...dossier.profile.conservation],
          keyFactTags: [...dossier.profile.key_fact], signatureTag: dossier.profile.signatureTag,
          habitatNote: raw.profile.habitat_note ?? null, morphologyNote: raw.profile.morphology_note ?? null,
          dietNote: raw.profile.diet_note ?? null, behaviorNote: raw.profile.behavior_note ?? null,
          reproductionNote: raw.profile.reproduction_note ?? null, referenceSummary: raw.profile.reference_summary ?? null,
        };
        await tx.insert(speciesDeductionProfiles).values(profile)
          .onConflictDoUpdate({ target: speciesDeductionProfiles.speciesId, set: { ...profile, updatedAt: new Date() } });
        // Only fields owned by this dossier are replaced; SQL-authored extra notes survive.
        for (const [field, [topic, sortOrder]] of Object.entries(NOTE_FIELDS)) {
          if (Object.hasOwn(raw.species, field)) {
            await tx.delete(speciesNotes).where(and(eq(speciesNotes.speciesId, species.id), eq(speciesNotes.topic, topic), eq(speciesNotes.sortOrder, sortOrder)));
          }
        }
        if (notes.length) await tx.insert(speciesNotes).values(notes.map(note => ({ speciesId: species.id, ...note })));
      }
    });
    console.log(`${seeds.length} species validated${write ? ' and upserted with profiles and notes' : '; no writes performed'}.`);
  } finally { await client.end(); }
}
main().catch(error => { console.error('Species seed failed:', error); process.exitCode = 1; });
