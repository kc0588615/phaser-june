import { readFile } from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';
import { config as loadEnv } from 'dotenv';
import { POOL_SIZE } from '../src/lib/caseTraits';

async function main() {
  const args = process.argv.slice(2);
  const modes = args.filter(arg => !arg.startsWith('--pool='));
  if (modes.length !== 1 || !['--check', '--write'].includes(modes[0])) throw new Error('Choose --check or --write, optionally --pool=<slug>.');
  const slug = args.find(arg => arg.startsWith('--pool='))?.slice(7) ?? 'prototype-six';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new Error('Invalid pool slug.');
  const seed = JSON.parse(await readFile(path.join(process.cwd(), 'db/seeds/pools', slug, 'pool.json'), 'utf8'));
  if (seed.slug !== slug || typeof seed.title !== 'string' || !seed.title.trim()
    || !['draft', 'reviewed'].includes(seed.review_status)
    || !Array.isArray(seed.species_iucn_ids) || seed.species_iucn_ids.length !== POOL_SIZE
    || new Set(seed.species_iucn_ids).size !== POOL_SIZE
    || !seed.species_iucn_ids.every((id: unknown) => Number.isSafeInteger(id) && Number(id) > 0)) throw new Error('Pool requires a title, review status, and six distinct IUCN IDs.');
  loadEnv({ path: '.env.local', quiet: true });
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const url = new URL(process.env.DATABASE_URL); url.searchParams.delete('pgbouncer');
  const sql = postgres(url.toString(), { max: 1, connect_timeout: 10 });
  try {
    await sql.begin(async transaction => {
      const tx = transaction as unknown as typeof sql;
      const species = await tx<{ id: number }[]>`SELECT id FROM public.species WHERE iucn_id = ANY(${tx.array(seed.species_iucn_ids)}::bigint[])`;
      if (species.length !== POOL_SIZE) throw new Error('Seed species first: pool must resolve to six species rows.');
      if (modes[0] === '--check') return;
      const [pool] = await tx<{ id: number }[]>`INSERT INTO public.case_pools (slug,title,review_status)
        VALUES (${slug},${seed.title},${seed.review_status})
        ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, review_status=EXCLUDED.review_status RETURNING id`;
      const ids = species.map(row => row.id);
      const [dependent] = await tx<{ n: number }[]>`SELECT count(*)::integer AS n FROM (
        SELECT species_id FROM public.evidence_family_cards WHERE pool_id=${pool.id}
        UNION SELECT species_id FROM public.evidence_family_hints WHERE pool_id=${pool.id}
        UNION SELECT species_id FROM public.mystery_cases WHERE pool_id=${pool.id}
      ) content WHERE NOT (species_id = ANY(${tx.array(ids)}::integer[]))`;
      if (dependent.n) throw new Error('Remove or reauthor existing pool content before removing its species.');
      await tx`DELETE FROM public.case_pool_members WHERE pool_id=${pool.id} AND NOT (species_id = ANY(${tx.array(ids)}::integer[]))`;
      for (const id of ids) await tx`INSERT INTO public.case_pool_members (pool_id,species_id) VALUES (${pool.id},${id}) ON CONFLICT DO NOTHING`;
    });
    console.log(`${slug}: six members validated${modes[0] === '--write' ? ' and upserted' : '; no writes performed'}.`);
  } finally { await sql.end(); }
}
main().catch(error => { console.error('Pool seed failed:', error); process.exitCode = 1; });
