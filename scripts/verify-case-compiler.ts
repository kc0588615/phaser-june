import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq, inArray } from 'drizzle-orm';
import * as schema from '../src/db/schema';
import { POOL_SIZE, type CompilerSpeciesProfile } from '../src/lib/caseTraits';
import { compileCaseV4, verifyCaseCorpusV3, type CompilerEvidenceFamilyCard, type CompilerEvidenceFamilyHint } from '../src/lib/caseCompilerV3';
import { getMysteryCaseForIucnId } from '../src/lib/mysteryCaseCatalog.server';

const reportOnly = process.argv.includes('--report');

async function main() {
  loadEnv({ path: path.join(process.cwd(), '.env.local') });
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error('DATABASE_URL is required: verification reads database content.');
  const url = new URL(value);
  url.searchParams.delete('pgbouncer');
  if (process.env.CASE_COMPILER_USE_TUNNEL === '1') {
    url.hostname = '127.0.0.1'; url.port = '55432'; url.searchParams.set('sslmode', 'disable');
  }
  const client = postgres(url.toString(), { max: 1, connect_timeout: 10 });
  try {
    const db = drizzle(client, { schema });
    const poolSlug = process.argv.find(arg => arg.startsWith('--pool='))?.slice(7);
    const pools = await db.select().from(schema.casePools).where(poolSlug
      ? eq(schema.casePools.slug, poolSlug) : eq(schema.casePools.reviewStatus, 'reviewed')).orderBy(schema.casePools.id);
    if (pools.length === 0) throw new Error('No case pools selected.');
    for (const pool of pools) {
      console.log(`Pool: ${pool.slug}`);
      const members = await db.select({ species: schema.speciesTable }).from(schema.casePoolMembers)
        .innerJoin(schema.speciesTable, eq(schema.speciesTable.id, schema.casePoolMembers.speciesId))
        .where(eq(schema.casePoolMembers.poolId, pool.id)).orderBy(schema.speciesTable.id);
      const speciesRows = members.map(row => row.species);
      if (speciesRows.length !== POOL_SIZE || new Set(speciesRows.map(row => row.iucnId)).size !== POOL_SIZE) throw new Error(`${pool.slug}: expected six distinct species.`);
      const speciesIds = speciesRows.map(row => row.id);
      const profiles: CompilerSpeciesProfile[] = await db.select().from(schema.speciesDeductionProfiles)
        .where(inArray(schema.speciesDeductionProfiles.speciesId, speciesIds));
      const cards = await db.select().from(schema.evidenceFamilyCards).where(and(eq(schema.evidenceFamilyCards.poolId, pool.id), eq(schema.evidenceFamilyCards.reviewStatus, 'reviewed')));
      const hints = await db.select().from(schema.evidenceFamilyHints).where(and(eq(schema.evidenceFamilyHints.poolId, pool.id), eq(schema.evidenceFamilyHints.reviewStatus, 'reviewed')));
      const cascadeHints = await db.select().from(schema.cascadeHints).where(eq(schema.cascadeHints.reviewStatus, 'reviewed'));
      const familyCards = new Map<number, CompilerEvidenceFamilyCard[]>(speciesIds.map(id => [id, cards.filter(row => row.speciesId === id)]));
      const familyHints = new Map<number, CompilerEvidenceFamilyHint[]>(speciesIds.map(id => [id, hints.filter(row => row.speciesId === id)]));
      const verification = verifyCaseCorpusV3(profiles, familyCards, familyHints);
      const errors = [
        ...verification.errors,
      ];
      const mysteryCasesBySpeciesId = new Map(speciesRows.flatMap(row => {
        const mystery = getMysteryCaseForIucnId(Number(row.iucnId));
        return mystery ? [[row.id, mystery] as const] : [];
      }));
      const answerTermsBySpeciesId = new Map(speciesRows.map(row => [row.id, [
        row.commonName ?? '', row.scientificName ?? '',
        row.scientificName?.split(/\s+/u)[0] ?? '', ...(row.commonName?.split(/\s+/u) ?? []),
      ]]));
      const forcedCases = profiles.map(profile => compileCaseV4({
        caseSeed: 'c'.repeat(64),
        prototypeSpeciesIds: profiles.map(item => item.speciesId),
        speciesPool: profiles,
        cardsBySpecies: familyCards,
        hintsBySpecies: familyHints,
        cascadeHints,
        gisPrior: new Map(),
        boardSeeds: [11, 22, 33],
        mapView: {
          bounds: [-1, -1, 3, 3],
          route: [0, 1, 2].map(nodeIndex => ({
            nodeIndex,
            lon: nodeIndex,
            lat: nodeIndex,
            biome: 'Test biome',
            nearestFeature: `Site ${nodeIndex + 1}`,
          })) as import('../src/expedition/mapView').ExpeditionMapView['route'],
        },
        mysteryCasesBySpeciesId,
        answerTermsBySpeciesId,
        forcedAnswerId: profile.speciesId,
      }));
      if (forcedCases.some(compiled => 'error' in compiled)) errors.push('Forced-answer v4 compilation failed.');
      const publicVariants = new Set(forcedCases.flatMap(compiled => 'error' in compiled ? [] : [JSON.stringify(compiled.public)]));
      if (publicVariants.size !== profiles.length) errors.push('Every forced answer must produce its authored public incident.');
      if (verification.pathCount !== 360) errors.push(`Expected 360 v3 paths, got ${verification.pathCount}.`);

      console.log(`Enumerated ${verification.pathCount.toLocaleString()} v3 family paths.`);
      console.log(`V3 residual distribution: ${JSON.stringify(verification.residualCounts)}.`);
      for (const warning of verification.warnings) console.warn(`Warning: ${warning}`);
      if (errors.length > 0) {
        for (const error of errors.slice(0, 30)) console.log(`- ${error}`);
        if (!reportOnly) process.exitCode = 1;
      } else {
        console.log('V4 authored cases plus v3 evidence survival, monotone candidates, residual, and hint safety passed.');
      }
    }
  } finally {
    await client.end();
  }
}
main().catch(error => { console.error('Case compiler verification failed:', error); process.exitCode = 1; });
