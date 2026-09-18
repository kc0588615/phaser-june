import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../src/db/schema';
import { POOL_SIZE } from '../src/lib/caseTraits';
import { assembleMysteryCases, parseMysteryCaseSeed, validateAuthoredMysteryCase } from '../src/lib/mysteryCase';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const modes = args.filter(arg => !arg.startsWith('--pool='));
  if (modes.length !== 1 || !['--check', '--write'].includes(modes[0])) throw new Error('Choose --check or --write, optionally --pool=<slug>.');
  const write = modes[0] === '--write';
  const poolSlug = args.find(arg => arg.startsWith('--pool='))?.slice(7) ?? 'prototype-six';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(poolSlug)) throw new Error('Invalid pool slug.');
  const directory = path.join(process.cwd(), 'db/seeds/pools', poolSlug, 'cases');
  const files = (await readdir(directory)).filter(file => file.endsWith('.json')).sort();
  const seeds = await Promise.all(files.map(async file => parseMysteryCaseSeed(JSON.parse(await readFile(path.join(directory, file), 'utf8')))));
  if (seeds.length !== POOL_SIZE || new Set(seeds.map(seed => seed.species_iucn_id)).size !== POOL_SIZE
    || new Set(seeds.map(seed => seed.public.id)).size !== POOL_SIZE) throw new Error('A pool requires six distinct species and case slugs.');
  loadEnv({ path: path.join(process.cwd(), '.env.local') });
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.delete('pgbouncer');
  if (process.env.MYSTERY_CASES_USE_TUNNEL === '1') {
    url.hostname = '127.0.0.1'; url.port = '55432'; url.searchParams.set('sslmode', 'disable');
  }
  const client = postgres(url.toString(), { max: 1, connect_timeout: 10 });
  try {
    const db = drizzle(client, { schema });
    await db.transaction(async tx => {
      const [pool] = await tx.select().from(schema.casePools).where(eq(schema.casePools.slug, poolSlug));
      if (!pool) throw new Error(`Missing pool ${poolSlug}.`);
      const members = await tx.select({ species: schema.speciesTable }).from(schema.casePoolMembers)
        .innerJoin(schema.speciesTable, eq(schema.casePoolMembers.speciesId, schema.speciesTable.id))
        .where(eq(schema.casePoolMembers.poolId, pool.id));
      if (members.length !== POOL_SIZE) throw new Error('Database pool must have six members.');
      const speciesByIucn = new Map(members.map(({ species }) => [Number(species.iucnId), species]));
      for (const seed of seeds) {
        const species = speciesByIucn.get(seed.species_iucn_id);
        if (!species) throw new Error(`Species ${seed.species_iucn_id} is not in ${poolSlug}.`);
        const terms = [species.commonName ?? '', species.scientificName ?? '', species.scientificName?.split(/\s+/u)[0] ?? '', ...(species.commonName?.split(/\s+/u) ?? [])];
        const errors = validateAuthoredMysteryCase(seed, terms);
        if (errors.length) throw new Error(`${seed.public.id}: ${errors.join('; ')}`);
      }
      const cases = await tx.select().from(schema.mysteryCases).where(eq(schema.mysteryCases.poolId, pool.id));
      const caseIds = cases.map(row => row.id);
      const [explanations, resolutions, steps, alternatives, sources] = await Promise.all([
        tx.select().from(schema.mysteryExplanations).where(inArray(schema.mysteryExplanations.caseId, caseIds)),
        tx.select().from(schema.mysteryResolutions).where(inArray(schema.mysteryResolutions.caseId, caseIds)),
        tx.select().from(schema.mysteryEvidenceSteps).where(inArray(schema.mysteryEvidenceSteps.caseId, caseIds)),
        tx.select().from(schema.mysteryRejectedAlternatives).where(inArray(schema.mysteryRejectedAlternatives.caseId, caseIds)),
        tx.select().from(schema.mysterySources).where(inArray(schema.mysterySources.caseId, caseIds)),
      ]);
      // Incomplete draft cases are drift, and can be repaired by --write.
      const completeCases = cases.filter(row => explanations.some(e => e.caseId === row.id && e.isAnswer) && resolutions.some(r => r.caseId === row.id));
      const existing = assembleMysteryCases({ cases: completeCases, explanations, resolutions, steps, alternatives, sources });
      let differences = 0;
      for (const seed of seeds) {
        const speciesId = speciesByIucn.get(seed.species_iucn_id)!.id;
        const authored = { public: seed.public, private: seed.private };
        if (isDeepStrictEqual(existing.get(speciesId), authored)
          && cases.find(row => row.speciesId === speciesId)?.reviewStatus === 'reviewed') continue;
        differences++;
        console.log(`${seed.public.id}: ${write ? 'upserting' : 'differs from database'}`);
        if (!write) {
          const stored = existing.get(speciesId);
          if (stored) console.log(`Database version for ${seed.public.id}.json:\n${JSON.stringify({ species_iucn_id: seed.species_iucn_id, ...stored }, null, 2)}`);
          continue;
        }
        const values = { poolId: pool.id, speciesId, slug: seed.public.id, title: seed.public.title,
          incident: seed.public.incident, atmosphere: seed.public.atmosphere, question: seed.public.question, reviewStatus: 'reviewed' };
        const [conflict] = await tx.select().from(schema.mysteryCases).where(eq(schema.mysteryCases.slug, values.slug));
        if (conflict && (conflict.poolId !== pool.id || conflict.speciesId !== speciesId)) throw new Error(`Case slug ${values.slug} belongs to another pool or species.`);
        const [row] = await tx.insert(schema.mysteryCases).values(values)
          .onConflictDoUpdate({ target: schema.mysteryCases.slug, set: values }).returning();
        const caseId = row.id;
        await tx.delete(schema.mysteryExplanations).where(eq(schema.mysteryExplanations.caseId, caseId));
        await tx.delete(schema.mysteryResolutions).where(eq(schema.mysteryResolutions.caseId, caseId));
        await tx.delete(schema.mysteryEvidenceSteps).where(eq(schema.mysteryEvidenceSteps.caseId, caseId));
        await tx.delete(schema.mysteryRejectedAlternatives).where(eq(schema.mysteryRejectedAlternatives.caseId, caseId));
        await tx.delete(schema.mysterySources).where(eq(schema.mysterySources.caseId, caseId));
        await tx.insert(schema.mysteryExplanations).values(seed.public.explanationChoices.map((choice, sortOrder) => ({
          caseId, slug: choice.id, label: choice.label, description: choice.description, sortOrder,
          feedback: seed.private.explanationFeedback[choice.id], isAnswer: choice.id === seed.private.answerExplanationId,
        })));
        const { evidenceChain, rejectedAlternatives, sources: seedSources, ...resolution } = seed.private.resolution;
        await tx.insert(schema.mysteryResolutions).values({ caseId, ...resolution });
        await tx.insert(schema.mysteryEvidenceSteps).values(evidenceChain.map((stepText, sequenceIndex) => ({ caseId, sequenceIndex, stepText })));
        await tx.insert(schema.mysteryRejectedAlternatives).values(rejectedAlternatives.map((alternativeText, sequenceIndex) => ({ caseId, sequenceIndex, alternativeText })));
        await tx.insert(schema.mysterySources).values(seedSources.map(source => ({ caseId, ...source })));
      }
      console.log(`${seeds.length} cases validated; ${differences} ${write ? 'cases updated' : 'differences'}.`);
      if (!write && differences) process.exitCode = 1;
    });
  } finally {
    await client.end();
  }
}
main().catch(error => { console.error('Mystery case seed failed:', error); process.exitCode = 1; });
