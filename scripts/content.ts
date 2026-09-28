// Clue Match content lives in db/content/: sources.json (the tiered source
// registry) and animals/*.json (one profile per animal). Postgres gets it from
// here, so git holds the history and the backup.
//   npm run content -- build    profiles -> database (one transaction)
//   npm run content -- check    validate the live pool (exit 1 on errors)
//   npm run content -- ranges   realms and countries from the range maps -> profiles
//   npm run content -- photos   a Wikimedia Commons photo for profiles without one
//   npm run content -- preview [name]   the clues and facts profiles make, and their problems
// CLUE_USE_TUNNEL=1 connects through the agent SSH tunnel (127.0.0.1:55432).
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/postgres-js';
import type postgres from 'postgres';
import { buildCluePool } from '../src/lib/cluePool';
import { validatePool } from '../src/clueGame/validatePool';
import { checkProfile, contentRowsFromProfiles, type AnimalProfile, type ContentSource } from '../src/clueGame/profiles';
import { connect, run } from './connect';
import { findPhoto } from './photos';

const DIR = path.join(process.cwd(), 'db/content');
const ANIMALS = path.join(DIR, 'animals');

async function readProfiles(): Promise<Array<{ file: string; profile: AnimalProfile }>> {
  const files = (await readdir(ANIMALS)).filter(file => file.endsWith('.json')).sort();
  return Promise.all(files.map(async file => ({ file, profile: JSON.parse(await readFile(path.join(ANIMALS, file), 'utf8')) as AnimalProfile })));
}

async function writeProfile(file: string, profile: AnimalProfile): Promise<void> {
  await writeFile(path.join(ANIMALS, file), `${JSON.stringify(profile, null, 2)}\n`);
}

/** Insert or update rows by id. */
async function load(tx: postgres.TransactionSql, table: string, rows: ReadonlyArray<object>): Promise<void> {
  if (rows.length === 0) return;
  const columns = Object.keys(rows[0]);
  const update = columns.filter(column => column !== 'id').map(column => `${column} = EXCLUDED.${column}`).join(', ');
  await tx.unsafe(
    `INSERT INTO ${table} (${columns.join(', ')}) SELECT ${columns.join(', ')} FROM json_populate_recordset(NULL::${table}, $1::json) ON CONFLICT (id) DO UPDATE SET ${update}`,
    [tx.json(rows as postgres.JSONValue)],
  );
  await tx.unsafe(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), (SELECT max(id) FROM ${table}))`);
  console.log(`${table}: ${rows.length} rows`);
}

// Realms holding at least 10% of each playable species' range (the nearest
// realm for a range too small to touch one), and the globe's countries.
const RANGES_SQL = `
WITH ranges AS (
  SELECT s.id AS species_id, i.wkb_geometry AS geom, i.presence
  FROM species s JOIN iucn i ON i.id_no = s.iucn_id
), kept AS (
  SELECT r.species_id, ST_Union(ST_MakeValid(r.geom)) AS geom
  FROM ranges r
  WHERE r.presence IN (1, 2, 3)
     OR NOT EXISTS (SELECT 1 FROM ranges x WHERE x.species_id = r.species_id AND x.presence IN (1, 2, 3))
  GROUP BY r.species_id
), realm_area AS (
  SELECT k.species_id, b.realm, sum(ST_Area(ST_Intersection(ST_MakeValid(b.wkb_geometry), k.geom)::geography)) AS area
  FROM kept k JOIN oneearth.oneearth_bioregion b ON ST_Intersects(b.wkb_geometry, k.geom)
  GROUP BY k.species_id, b.realm
), shares AS (
  SELECT species_id, realm, area / sum(area) OVER (PARTITION BY species_id) AS share FROM realm_area
), nearest AS (
  SELECT k.species_id, (SELECT b.realm FROM oneearth.oneearth_bioregion b ORDER BY b.wkb_geometry <-> k.geom LIMIT 1) AS realm, 1.0 AS share
  FROM kept k WHERE NOT EXISTS (SELECT 1 FROM shares s WHERE s.species_id = k.species_id)
)
SELECT species_id,
       array_agg(realm ORDER BY share DESC) FILTER (WHERE share >= 0.10) AS realms,
       (SELECT coalesce(json_agg(json_build_object('code', substr(p.key, 9), 'name', p.name) ORDER BY p.name), '[]'::json)
          FROM clue_match_places p WHERE p.kind = 'country' AND a.species_id = ANY (p.species_ids)) AS countries
FROM (SELECT * FROM shares UNION ALL SELECT * FROM nearest) a
GROUP BY species_id`;

const REALM_TAG: Record<string, string> = {
  Nearctic: 'realm:nearctic', Neotropics: 'realm:neotropical', Palearctic: 'realm:palearctic', Afrotropics: 'realm:afrotropical',
  IndoMalay: 'realm:indomalayan', Australasia: 'realm:australasian', Oceania: 'realm:oceanian', Antarctic: 'realm:antarctic',
};

run(async () => {
  const [mode, filter] = process.argv.slice(2);
  if (!['build', 'check', 'ranges', 'photos', 'preview'].includes(mode)) throw new Error('Choose build, check, ranges, photos or preview.');

  if (mode === 'preview') {
    const sources = JSON.parse(await readFile(path.join(DIR, 'sources.json'), 'utf8')) as ContentSource[];
    const profiles = (await readProfiles()).map(entry => entry.profile).filter(profile => !filter || profile.commonName.toLowerCase().includes(filter.toLowerCase()));
    const rows = contentRowsFromProfiles(profiles);
    for (const profile of profiles) {
      console.log(`\n## ${profile.id} ${profile.commonName}`);
      for (const problem of checkProfile(profile, sources)) console.log(`  PROBLEM ${problem}`);
      for (const clue of rows.clues.filter(row => row.species_id === profile.id)) console.log(`  ${clue.category}/${clue.reveal_order} [${clue.compare_tags.join(', ')}] ${clue.label}`);
      for (const fact of rows.facts.filter(row => row.species_id === profile.id)) console.log(`  fact ${fact.category}: ${fact.fact_text}`);
    }
    return;
  }

  if (mode === 'photos') {
    for (const { file, profile } of await readProfiles()) {
      if (profile.photo !== undefined) continue;
      const photo = await findPhoto(profile.scientificName, profile.commonName);
      if (!photo) { console.log(`  no photo: ${profile.commonName}`); continue; }
      await writeProfile(file, { ...profile, photo });
      console.log(`${profile.commonName}: ${photo.license}, ${photo.credit}`);
    }
    return;
  }

  const sql = connect();
  try {
    if (mode === 'check') {
      const report = validatePool(await buildCluePool(drizzle(sql)));
      const { summary } = report;
      console.log(`Pool: ${summary.playable} playable of ${summary.species} species, ${summary.clues} clues (${summary.deductiveClues} deductive), ${summary.facts} facts.`);
      for (const warning of report.warnings) console.log(`  warn  ${warning}`);
      for (const error of report.errors) console.log(`  ERROR ${error}`);
      console.log(`${report.errors.length} errors, ${report.warnings.length} warnings.`);
      if (report.errors.length) process.exitCode = 1;
      return;
    }

    if (mode === 'ranges') {
      const rows = await sql.unsafe<Array<{ species_id: number; realms: string[] | null; countries: Array<{ code: string; name: string }> }>>(RANGES_SQL);
      const bySpecies = new Map(rows.map(row => [row.species_id, row]));
      for (const { file, profile } of await readProfiles()) {
        const row = bySpecies.get(profile.id);
        if (!row) { console.log(`  no range map: ${profile.commonName}`); continue; }
        const range = { realms: (row.realms ?? []).map(realm => REALM_TAG[realm] ?? `realm:${realm.toLowerCase()}`), countries: row.countries };
        await writeProfile(file, { ...profile, range });
        console.log(`${profile.commonName}: ${range.realms.join(', ')}; ${range.countries.length} countries`);
      }
      return;
    }

    const sources = JSON.parse(await readFile(path.join(DIR, 'sources.json'), 'utf8')) as ContentSource[];
    const profiles = (await readProfiles()).map(entry => entry.profile);
    const problems = profiles.flatMap(profile => checkProfile(profile, sources).map(problem => `${profile.commonName}: ${problem}`));
    if (problems.length) throw new Error(`Fix the profiles first:\n${problems.join('\n')}`);
    const rows = contentRowsFromProfiles(profiles);
    await sql.begin(async tx => {
      await tx.unsafe('DELETE FROM species_facts');
      await tx.unsafe('DELETE FROM species_deduction_clues');
      await load(tx, 'content_sources', sources);
      await load(tx, 'species', rows.species);
      await load(tx, 'species_deduction_clues', rows.clues);
      await load(tx, 'species_facts', rows.facts);
    });
    console.log('Built. Refresh the views if ranges or the set of animals changed (docs/CLUE_MATCH.md).');
  } finally {
    await sql.end({ timeout: 5 });
  }
});
