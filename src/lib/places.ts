// Loads the globe's places from the clue_match_places view (db/schema.sql).
import { sql } from 'drizzle-orm';
import { db } from '@/db';
import type { Place, PlaceAnimal, PlaceKind, PlacesResponse } from '@/clueGame/places';

type PlaceRow = {
  kind: PlaceKind; key: string; name: string; grp: string; species_ids: number[];
  west: number; south: number; east: number; north: number; lon: number; lat: number;
};
type AnimalRow = { id: number; common_name: string; scientific_name: string; class: string | null; taxon_order: string | null; family: string | null };

export async function loadPlaces(): Promise<PlacesResponse> {
  const rows = await db.execute<PlaceRow>(sql`
    SELECT kind, key, name, grp, species_ids, west, south, east, north, lon, lat
    FROM clue_match_places ORDER BY kind, name`);
  const places: Place[] = [...rows].map(row => ({
    kind: row.kind, key: row.key, name: row.name, group: row.grp, speciesIds: row.species_ids,
    bbox: [row.west, row.south, row.east, row.north], center: [row.lon, row.lat],
  }));
  const ids = [...new Set(places.flatMap(place => place.speciesIds))];
  const animals = ids.length === 0 ? [] : await db.execute<AnimalRow>(sql`
    SELECT id, common_name, scientific_name, class, taxon_order, family FROM species
    WHERE id IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)}) ORDER BY id`);
  return {
    places,
    animals: [...animals].map((row): PlaceAnimal => ({
      id: row.id, commonName: row.common_name, scientificName: row.scientific_name,
      className: row.class, taxonOrder: row.taxon_order, family: row.family,
    })),
  };
}

/** A place's simplified outline as GeoJSON, or null for an unknown key. */
export async function loadPlaceOutline(key: string): Promise<GeoJSON.Feature | null> {
  const [row] = await db.execute<{ geojson: string }>(sql`
    SELECT ST_AsGeoJSON(outline, 3) AS geojson FROM clue_match_places WHERE key = ${key}`);
  return row ? { type: 'Feature', properties: { key }, geometry: JSON.parse(row.geojson) } : null;
}
