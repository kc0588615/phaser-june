// IUCN range polygons from the Red List group shapefiles (MAMMALS_TERRESTRIAL_ONLY,
// ANURA, TURTLES, ...; downloaded by the owner, unzipped outside the repo) into
// the iucn table, without ogr2ogr. Only the named species are read.
//   npm run iucn -- find <dir> "<Genus species>" ...           which .shp holds each species
//   npm run iucn -- import <file.shp> "<Genus species>" ...    append their polygons to iucn
// A species already in iucn (same id_no) is skipped, so import can be re-run.
// CLUE_USE_TUNNEL=1 connects through the agent SSH tunnel (127.0.0.1:55432).
import { open, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { connect, run } from './connect';

type Field = { name: string; type: string; offset: number; length: number };
type Row = Record<string, string | number | null>;

/** dBASE III table: every row, with the IUCN column names (lowercase, as ogr2ogr writes them). */
async function readDbf(file: string): Promise<Row[]> {
  const buf = await readFile(file);
  const count = buf.readUInt32LE(4);
  const headerLength = buf.readUInt16LE(8);
  const recordLength = buf.readUInt16LE(10);
  const fields: Field[] = [];
  for (let at = 32, offset = 1; buf[at] !== 0x0d; at += 32) {
    const name = buf.toString('latin1', at, at + 11).split('\0')[0].toLowerCase();
    const field = { name, type: String.fromCharCode(buf[at + 11]), offset, length: buf[at + 16] };
    fields.push(field);
    offset += field.length;
  }
  const rows: Row[] = [];
  for (let i = 0; i < count; i++) {
    const start = headerLength + i * recordLength;
    const row: Row = {};
    for (const field of fields) {
      const text = buf.toString('utf8', start + field.offset, start + field.offset + field.length).trim();
      row[field.name] = text === '' ? null : field.type === 'N' || field.type === 'F' ? Number(text) : text;
    }
    rows.push(row);
  }
  return rows;
}

type Ring = number[][];

/** Twice the signed area; negative = clockwise, which shapefiles use for outer rings. */
function signedArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return sum;
}

function contains(ring: Ring, [x, y]: number[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Shapefile polygon record (type 5, 15 or 25) -> GeoJSON MultiPolygon; holes go to the smallest outer ring holding them. */
function toMultiPolygon(record: Buffer): { type: 'MultiPolygon'; coordinates: Ring[][] } {
  const shapeType = record.readInt32LE(0);
  if (![5, 15, 25].includes(shapeType)) throw new Error(`Shape type ${shapeType} is not a polygon.`);
  const numParts = record.readInt32LE(36);
  const numPoints = record.readInt32LE(40);
  const partStarts = Array.from({ length: numParts }, (_, i) => record.readInt32LE(44 + i * 4));
  const pointsAt = 44 + numParts * 4;
  const rings: Ring[] = partStarts.map((start, i) => {
    const end = i + 1 < numParts ? partStarts[i + 1] : numPoints;
    const ring: Ring = [];
    for (let p = start; p < end; p++) ring.push([record.readDoubleLE(pointsAt + p * 16), record.readDoubleLE(pointsAt + p * 16 + 8)]);
    return ring;
  });
  const outers = rings.filter(ring => signedArea(ring) < 0).map(ring => ({ ring, area: -signedArea(ring), polygon: [ring] }));
  for (const hole of rings.filter(ring => signedArea(ring) >= 0)) {
    const holder = outers.filter(outer => contains(outer.ring, hole[0])).sort((a, b) => a.area - b.area)[0];
    if (holder) holder.polygon.push(hole);
    else outers.push({ ring: hole, area: signedArea(hole), polygon: [hole.slice().reverse()] }); // a stray counter-clockwise ring: keep it as land
  }
  return { type: 'MultiPolygon', coordinates: outers.map(outer => outer.polygon) };
}

/** Polygon records by 0-based index, read through the .shx offsets. */
async function readShapes(shp: string, indexes: number[]): Promise<Map<number, Buffer>> {
  const shx = await readFile(shp.replace(/\.shp$/i, '.shx'));
  const file = await open(shp, 'r');
  const shapes = new Map<number, Buffer>();
  try {
    for (const index of indexes) {
      const offset = shx.readInt32BE(100 + index * 8) * 2;
      const length = shx.readInt32BE(104 + index * 8) * 2;
      const record = Buffer.alloc(length);
      await file.read(record, 0, length, offset + 8);
      shapes.set(index, record);
    }
  } finally {
    await file.close();
  }
  return shapes;
}

async function shapefilesIn(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries.filter(entry => entry.isFile() && /\.shp$/i.test(entry.name)).map(entry => path.join(entry.parentPath, entry.name)).sort();
}

async function find(dir: string, names: string[]): Promise<void> {
  const wanted = new Set(names.map(name => name.toLowerCase()));
  const found = new Set<string>();
  for (const shp of await shapefilesIn(dir)) {
    const rows = await readDbf(shp.replace(/\.shp$/i, '.dbf'));
    for (const name of wanted) {
      const hits = rows.filter(row => String(row.sci_name).toLowerCase() === name);
      if (hits.length === 0) continue;
      found.add(name);
      const presence = [...new Set(hits.map(row => row.presence))].sort().join(',');
      console.log(`${hits[0].sci_name}\tid_no ${hits[0].id_no}\t${hits[0].category}\t${hits.length} polygons (presence ${presence})\t${shp}`);
    }
  }
  for (const name of wanted) if (!found.has(name)) console.log(`${name}\tnot found`);
}

async function importRanges(shp: string, names: string[]): Promise<void> {
  const wanted = new Set(names.map(name => name.toLowerCase()));
  const rows = (await readDbf(shp.replace(/\.shp$/i, '.dbf'))).map((row, index) => ({ row, index }))
    .filter(({ row }) => wanted.has(String(row.sci_name).toLowerCase()));
  const missing = [...wanted].filter(name => !rows.some(({ row }) => String(row.sci_name).toLowerCase() === name));
  if (missing.length > 0) throw new Error(`Not in ${path.basename(shp)}: ${missing.join(', ')}`);
  const shapes = await readShapes(shp, rows.map(({ index }) => index));
  const sql = connect();
  try {
    await sql.begin(async tx => {
      const columns = (await tx.unsafe<{ name: string }[]>(
        `SELECT column_name AS name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'iucn' AND column_name NOT IN ('ogc_fid', 'wkb_geometry')`)).map(c => c.name);
      const present = new Set((await tx.unsafe<{ id: number }[]>(
        'SELECT DISTINCT id_no::int AS id FROM iucn WHERE id_no = ANY($1::numeric[])',
        [rows.map(({ row }) => Number(row.id_no))])).map(r => r.id));
      const list = columns.join(', ');
      const added = new Map<string, number>();
      for (const { row, index } of rows) {
        if (present.has(Number(row.id_no))) continue;
        const values = Object.fromEntries(columns.map(column => [column, row[column] ?? null]));
        await tx.unsafe(
          `INSERT INTO iucn (${list}, wkb_geometry)
           SELECT ${list}, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326)) FROM json_populate_record(NULL::iucn, $1::json)`,
          [tx.json(values), JSON.stringify(toMultiPolygon(shapes.get(index)!))],
        );
        added.set(String(row.sci_name), (added.get(String(row.sci_name)) ?? 0) + 1);
      }
      for (const { row } of rows) {
        const name = String(row.sci_name);
        if (present.has(Number(row.id_no))) console.log(`${name} (${row.id_no}): already in iucn, skipped`);
        else if (added.has(name)) { console.log(`${name} (${row.id_no}): ${added.get(name)} polygons added`); added.delete(name); }
      }
    });
  } finally {
    await sql.end();
  }
}

run(async () => {
  const [command, target, ...names] = process.argv.slice(2);
  if (command === 'find' && target && names.length > 0) return find(target, names);
  if (command === 'import' && target && names.length > 0) return importRanges(target, names);
  throw new Error('Usage: npm run iucn -- find <dir> "<Genus species>" ... | import <file.shp> "<Genus species>" ...');
});
