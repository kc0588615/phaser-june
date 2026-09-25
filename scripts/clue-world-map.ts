// Draws the world basemaps from natural_earth.countries (merged land, small
// islands dropped, simplified to half a degree). Rerun only if that table changes.
//   public/assets/clue-match/world-land.svg      under Clue Match range maps
//   public/assets/clue-match/world-land.geojson  land on the home globe
//   npm run clue:world-map
// CLUE_USE_TUNNEL=1 connects through the agent SSH tunnel (127.0.0.1:55432).
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { WORLD_LAND_GEOJSON_URL, WORLD_LAND_URL, WORLD_VIEWBOX } from '../src/clueGame/worldMap';
import { connect, run } from './connect';

const OUT = path.join(process.cwd(), 'public', WORLD_LAND_URL);
const OUT_GEOJSON = path.join(process.cwd(), 'public', WORLD_LAND_GEOJSON_URL);
const LAND_FILL = '#1a3f49';

run(async () => {
  const sql = connect();
  try {
    const [row] = await sql<{ path: string }[]>`
      WITH land AS (SELECT (ST_Dump(ST_Union(geom))).geom AS part FROM natural_earth.countries)
      SELECT ST_AsSVG(ST_SimplifyPreserveTopology(ST_Collect(part), 0.5), 0, 1) AS path
      FROM land
      WHERE ST_Area(part) > 0.5 AND ST_YMax(part) > ${-(WORLD_VIEWBOX.y + WORLD_VIEWBOX.height)}`;
    if (!row?.path) throw new Error('natural_earth.countries returned no land.');
    const { x, y, width, height } = WORLD_VIEWBOX;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${width} ${height}"><path fill="${LAND_FILL}" fill-rule="evenodd" d="${row.path}"/></svg>\n`;
    await mkdir(path.dirname(OUT), { recursive: true });
    await writeFile(OUT, svg);
    console.log(`Wrote ${path.relative(process.cwd(), OUT)} (${Math.round(svg.length / 1024)} KB).`);

    const [land] = await sql<{ geojson: string }[]>`
      WITH land AS (SELECT (ST_Dump(ST_Union(geom))).geom AS part FROM natural_earth.countries)
      SELECT ST_AsGeoJSON(ST_SimplifyPreserveTopology(ST_Collect(part), 0.3), 2) AS geojson
      FROM land
      WHERE ST_Area(part) > 0.5`;
    const feature = { type: 'Feature', properties: {}, geometry: JSON.parse(land.geojson) };
    const json = `${JSON.stringify(feature)}\n`;
    await writeFile(OUT_GEOJSON, json);
    console.log(`Wrote ${path.relative(process.cwd(), OUT_GEOJSON)} (${Math.round(json.length / 1024)} KB).`);
  } finally {
    await sql.end({ timeout: 5 });
  }
});
