import postgres from 'postgres';
import { readFile } from 'node:fs/promises';

const [, , countriesPath] = process.argv;

if (!countriesPath) {
  console.error('Usage: node scripts/import-natural-earth.mjs <countries.geojson>');
  process.exit(1);
}

const databaseUrl = process.env.NATURAL_EARTH_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Set NATURAL_EARTH_DATABASE_URL or DATABASE_URL before running this script.');
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

async function readGeoJson(path) {
  const file = await readFile(path, 'utf8');
  const data = JSON.parse(file);
  if (!Array.isArray(data.features)) {
    throw new Error(`${path} is not a GeoJSON FeatureCollection`);
  }
  return data.features;
}

function value(properties, ...keys) {
  for (const key of keys) {
    const found = properties[key];
    if (found !== undefined && found !== null && found !== '') return found;
  }
  return null;
}

function textValue(properties, ...keys) {
  const found = value(properties, ...keys);
  return found === null ? null : String(found);
}

function boundedTextValue(properties, maxLength, ...keys) {
  const found = textValue(properties, ...keys);
  return found && found.length <= maxLength ? found : null;
}

function numberValue(properties, ...keys) {
  const found = value(properties, ...keys);
  const n = Number(found);
  return Number.isFinite(n) ? n : null;
}

function asGeometryJson(feature) {
  if (!feature.geometry) return null;
  return JSON.stringify(feature.geometry);
}

async function importCountries(tx, features) {
  await tx`TRUNCATE natural_earth.countries`;

  let gid = 1;
  for (const feature of features) {
    const properties = feature.properties || {};
    const geom = asGeometryJson(feature);
    if (!geom || !['Polygon', 'MultiPolygon'].includes(feature.geometry.type)) continue;

    await tx`
      INSERT INTO natural_earth.countries (
        gid, name, name_long, admin, adm0_a3, iso_a2, iso_a3,
        continent, region_un, subregion, pop_est, geom
      )
      VALUES (
        ${gid++},
        ${textValue(properties, 'name', 'NAME')},
        ${textValue(properties, 'name_long', 'NAME_LONG')},
        ${textValue(properties, 'admin', 'ADMIN')},
        ${boundedTextValue(properties, 3, 'adm0_a3', 'ADM0_A3')},
        ${boundedTextValue(properties, 2, 'iso_a2', 'ISO_A2')},
        ${boundedTextValue(properties, 3, 'iso_a3', 'ISO_A3')},
        ${textValue(properties, 'continent', 'CONTINENT')},
        ${textValue(properties, 'region_un', 'REGION_UN')},
        ${textValue(properties, 'subregion', 'SUBREGION')},
        ${numberValue(properties, 'pop_est', 'POP_EST')},
        ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${geom}), 4326))::geometry(MultiPolygon, 4326)
      )
    `;
  }

  return gid - 1;
}

try {
  const countries = await readGeoJson(countriesPath);
  const count = await sql.begin(tx => importCountries(tx, countries));
  console.log(`Imported ${count} countries.`);
} finally {
  await sql.end();
}
