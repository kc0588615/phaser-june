// Clue Match content lives in db/content/: sources.json (the tiered source
// registry) and animals/*.json (one profile per animal). Postgres gets it from
// here, so git holds the history and the backup.
//   npm run content -- build    profiles -> database (one transaction)
//   npm run content -- check    validate the live pool (exit 1 on errors)
//   npm run content -- ranges   realms and countries from the range maps -> profiles
//   npm run content -- photos   a Wikimedia Commons photo for profiles without one
//   npm run content -- preview [name]   the clues and facts profiles make, and their problems
// CLUE_USE_TUNNEL=1 connects through the agent SSH tunnel (127.0.0.1:55432).
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/postgres-js';
import type postgres from 'postgres';
import { buildCluePool } from '../src/lib/cluePool';
import { validatePool } from '../src/clueGame/validatePool';
import { checkCitations, checkProfile, contentRowsFromProfiles, type AnimalProfile } from '../src/clueGame/profiles';
import { citedPages, contentSources as sources } from '../src/lib/contentCitations';
import { ANIMALS_DIR, readProfiles } from '../src/lib/contentProfiles';
import { connect, run } from './connect';
import { findPhoto } from './photos';

async function writeProfile(file: string, profile: AnimalProfile): Promise<void> {
  await writeFile(path.join(ANIMALS_DIR, file), `${JSON.stringify(profile, null, 2)}\n`);
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

// Each profile's realms (at least 10% of its range; the nearest realm for a range
// too small to touch one) and countries, from the IUCN range maps (iucn), the One
// Earth bioregions and the Natural Earth countries. The animals are the profiles
// themselves, passed as one JSON parameter of [{ id, iucn_id }], so a new animal
// gets its realms and countries before any build.
// The country rules repeat the places view's in db/schema.sql: change both together.
// The view splits Russia at 60°E for its continents; here the halves rejoin, so the
// split changes nothing (kept so the two copies read alike).
const RANGES_SQL = `
WITH ranges AS (
  SELECT p.id AS species_id, i.wkb_geometry AS geom, i.presence
  FROM json_to_recordset($1::json) AS p(id integer, iucn_id bigint)
  JOIN iucn i ON i.id_no = p.iucn_id
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
), country_parts AS (
  SELECT c.adm0_a3, c.name, c.continent AS home, d.geom,
         CASE
           WHEN c.adm0_a3 = 'FRA' AND ST_X(ST_Centroid(d.geom)) < -30 THEN 'South America'
           WHEN c.adm0_a3 = 'FRA' AND ST_X(ST_Centroid(d.geom)) > 40 THEN 'Africa'
           ELSE c.continent
         END AS continent
  FROM natural_earth.countries c
  CROSS JOIN LATERAL ST_Dump(ST_MakeValid(c.geom)) d
  WHERE c.continent NOT IN ('Seven seas (open ocean)', 'Antarctica') AND c.adm0_a3 <> 'RUS'
  UNION ALL
  SELECT c.adm0_a3, c.name, 'Asia', ST_Intersection(ST_MakeValid(c.geom), ST_MakeEnvelope(60, -90, 180, 90, 4326)), 'Asia'
  FROM natural_earth.countries c WHERE c.adm0_a3 = 'RUS'
  UNION ALL
  SELECT c.adm0_a3, c.name, 'Asia', ST_Intersection(ST_MakeValid(c.geom), ST_MakeEnvelope(-180, -90, 60, 90, 4326)), 'Europe'
  FROM natural_earth.countries c WHERE c.adm0_a3 = 'RUS'
), country_shapes AS MATERIALIZED (
  SELECT adm0_a3, name, ST_Union(geom) AS geom
  FROM country_parts
  WHERE continent = home OR adm0_a3 = 'RUS'
  GROUP BY adm0_a3, name, home
), country_animals AS MATERIALIZED (
  SELECT c.adm0_a3, c.name, array_agg(k.species_id) AS species_ids
  FROM country_shapes c
  JOIN kept k ON ST_Intersects(c.geom, k.geom)
  WHERE ST_Area(ST_Intersection(c.geom, k.geom)::geography) >= LEAST(0.05 * ST_Area(k.geom::geography), 5e9)
  GROUP BY c.adm0_a3, c.name
  HAVING count(*) >= 2
)
SELECT species_id,
       array_agg(realm ORDER BY share DESC) FILTER (WHERE share >= 0.10) AS realms,
       (SELECT coalesce(json_agg(json_build_object('code', c.adm0_a3, 'name', c.name) ORDER BY c.name), '[]'::json)
          FROM country_animals c WHERE a.species_id = ANY (c.species_ids)) AS countries
FROM (SELECT * FROM shares UNION ALL SELECT * FROM nearest) a
GROUP BY species_id`;

type RangeRow = { species_id: number; realms: string[] | null; countries: Array<{ code: string; name: string }> };

const REALM_TAG: Record<string, string> = {
  Nearctic: 'realm:nearctic', Neotropics: 'realm:neotropical', Palearctic: 'realm:palearctic', Afrotropics: 'realm:afrotropical',
  IndoMalay: 'realm:indomalayan', Australasia: 'realm:australasian', Oceania: 'realm:oceanian', Antarctic: 'realm:antarctic',
};

/** Refuses unless every profile passes checkProfile and checkCitations and no two share an id or an iucnId
 *  (species' keys, and the range query's). One line: `run` prints only the first. */
function assertProfilesReady(profiles: readonly AnimalProfile[]): void {
  const problems = profiles.flatMap(profile => [...checkProfile(profile, sources), ...checkCitations(profile, sources, citedPages).errors].map(problem => `${profile.commonName}: ${problem}`));
  for (const key of ['id', 'iucnId'] as const) {
    const first = new Map<number, string>();
    for (const profile of profiles) {
      if (first.has(profile[key])) problems.push(`${profile.commonName}: ${key} ${profile[key]} is ${first.get(profile[key])}'s too`);
      else first.set(profile[key], profile.commonName);
    }
  }
  if (problems.length) throw new Error(`Fix the profiles first: ${problems.join('; ')}`);
}

run(async () => {
  const [mode, filter] = process.argv.slice(2);
  if (!['build', 'check', 'ranges', 'photos', 'preview'].includes(mode)) throw new Error('Choose build, check, ranges, photos or preview.');

  if (mode === 'preview') {
    const profiles = (await readProfiles()).map(entry => entry.profile).filter(profile => !filter || profile.commonName.toLowerCase().includes(filter.toLowerCase()));
    const rows = contentRowsFromProfiles(profiles);
    for (const profile of profiles) {
      console.log(`\n## ${profile.id} ${profile.commonName}`);
      for (const problem of checkProfile(profile, sources)) console.log(`  PROBLEM ${problem}`);
      const { errors, warnings } = checkCitations(profile, sources, citedPages);
      for (const problem of errors) console.log(`  PROBLEM ${problem}`);
      for (const warning of warnings) console.log(`  cite warn ${warning}`);
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
      const entries = await readProfiles();
      assertProfilesReady(entries.map(({ profile }) => profile)); // before the query: it keys ranges on id and iucnId
      const animals = entries.map(({ profile }) => ({ id: profile.id, iucn_id: profile.iucnId }));
      // Read only and bounded: critter_dev stops statements at 60 s, and its Postgres serves the live game.
      const rows = await sql.begin('read only', async tx => {
        await tx.unsafe("SET LOCAL statement_timeout = '15min'");
        return tx.unsafe<RangeRow[]>(RANGES_SQL, [tx.json(animals)]);
      });
      const bySpecies = new Map(rows.map(row => [row.species_id, row]));
      for (const { file, profile } of entries) {
        const row = bySpecies.get(profile.id);
        if (!row) { console.log(`  no range map: ${profile.commonName}`); continue; }
        const range = { realms: (row.realms ?? []).map(realm => REALM_TAG[realm] ?? `realm:${realm.toLowerCase()}`), countries: row.countries };
        await writeProfile(file, { ...profile, range });
        console.log(`${profile.commonName}: ${range.realms.join(', ')}; ${range.countries.length} countries`);
      }
      return;
    }

    const profiles = (await readProfiles()).map(entry => entry.profile);
    assertProfilesReady(profiles);
    console.log(`${profiles.reduce((sum, profile) => sum + checkCitations(profile, sources, citedPages).warnings.length, 0)} citation warnings (see preview).`);
    const rows = contentRowsFromProfiles(profiles);
    await sql.begin(async tx => {
      await tx.unsafe('DELETE FROM species_facts');
      await tx.unsafe('DELETE FROM species_deduction_clues');
      // Only the table's columns: sources.json also holds citation fields (citeAs, license).
      await load(tx, 'content_sources', sources.map(({ id, key, tier, name, url, notes }) => ({ id, key, tier, name, url, notes })));
      await load(tx, 'species', rows.species);
      await load(tx, 'species_deduction_clues', rows.clues);
      await load(tx, 'species_facts', rows.facts);
    });
    console.log('Built. Refresh the views if ranges or the set of animals changed (docs/SHAPEFILE_BEST_PRACTICES.md#adding-or-changing-an-animal).');
  } finally {
    await sql.end({ timeout: 5 });
  }
});
