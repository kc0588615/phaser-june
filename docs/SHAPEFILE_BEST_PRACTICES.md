# IUCN range shapefiles

How an animal's range gets from the IUCN Red List shapefiles into the `iucn` table, and what the game builds from it. Learned importing plan 040 batches 1 and 2 (26 animals). Connection routes: `docs/DATABASE_ACCESS.md`. Writing the profile: `docs/CONTENT_SOURCES.md`.

## The files

The owner's Red List group downloads (Dec 2024, non-commercial terms, need a logged-in IUCN account) are unzipped to `~/data/iucn/shp/<GROUP>/` (42 GB, outside the repo; originals on `D:\ArcGIS\data\iucn`). Agents can read them but can't download new ones.

- One file per taxonomic group: `MAMMALS_TERRESTRIAL_ONLY`, `MAMMALS_FRESHWATER`, `ANURA` (split into `_PART1`/`_PART2`), `CAUDATA`, `TURTLES`, `SCALED_REPTILES`, and so on.
- A species can sit in two files: its group file and a habitat file like `FW_OTHER_PART3`. Import from the group file, as every existing row does.
- Water-loving mammals are in `MAMMALS_FRESHWATER`, not `TERRESTRIAL_ONLY`: tapirs, rhinos, hippos, otters.
- Files are big (`MAMMALS_TERRESTRIAL_ONLY.shp` is 1.2 GB). Import only the species being added, never a whole group file; the `iucn` table holds only game animals and measured candidates.

## Import: `npm run iucn`

```sh
npm run iucn -- find ~/data/iucn/shp "Lycaon pictus" "Tapirus bairdii"      # file, id_no, category, polygons, presence codes
npm run iucn -- import ~/data/iucn/shp/MAMMALS_TERRESTRIAL_ONLY/MAMMALS_TERRESTRIAL_ONLY.shp "Lycaon pictus"
```

`scripts/iucn.ts` reads the `.dbf` table, then only the matching shapes through the `.shx` offsets, and appends them with every IUCN attribute in one transaction (about a second per file). A species already in `iucn` (same `id_no`) is skipped; to replace a range, delete its rows first. It connects through `DATABASE_URL`; `CLUE_USE_TUNNEL=1` goes through the agent tunnel instead.

Why not the standard tools: `shp2pgsql` and `ogr2ogr` aren't installed in WSL, and `shp2pgsql` can't filter rows, so it would push a whole group file through the connection. If the owner installs GDAL (`sudo apt install gdal-bin`), `ogr2ogr` can do the same filtered append:

```sh
ogr2ogr -append -f PostgreSQL "PG:..." FILE.shp -nln iucn -nlt PROMOTE_TO_MULTI \
  -lco GEOMETRY_NAME=wkb_geometry -where "sci_name IN ('Lycaon pictus')"
```

## The `iucn` table

- Source-owned: raw IUCN columns, lowercased (`id_no, sci_name, presence, origin, seasonal, category, citation, ...`; `order_` and `terrestria` are shapefile truncations; quote `"class"` in SQL). Never add app columns; game data lives on `species`.
- `wkb_geometry` is `MULTIPOLYGON`, SRID 4326. Check before any other kind of load: `SELECT Find_SRID('public','iucn','wkb_geometry'), GeometryType(wkb_geometry), count(*) FROM iucn GROUP BY 1,2`.
- Many rows per species (disjoint areas, presence and origin codes). Join on `species.iucn_id = iucn.id_no`, never on `ogc_fid`.
- `presence`: 1 extant, 2 probably extant, 3 possibly extant, 4 possibly extinct, 5 extinct, 6 uncertain. The views use 1 to 3 and fall back to all polygons only for extinct species, so a hellbender's possibly-extinct rows or a tapir's extinct ones stay off its map.
- Some polygons are invalid (self-intersections). The views wrap them in `ST_MakeValid`; leave the raw rows as imported. Imported areas match the shapefile's `shape_area`.

## `id_no` and names

`id_no` is the IUCN taxon id and becomes the profile's `iucnId`. Check the shapefile's `sci_name` matches the profile: taxonomy moves on (*Andrias davidianus* is taxon 179010104 since *A. sligoi* was split off), and one old label pointed at a different tortoise. Other sources may use older names: ADW files Temminck's pangolin under `Manis_temminckii`, not *Smutsia*.

## After an import

Order matters, because `clue_match_places` only counts animals that have clues and `npm run content -- ranges` reads that view:

1. Write the profile, then `npm run content -- build`.
2. `REFRESH MATERIALIZED VIEW CONCURRENTLY clue_match_ranges;` then `... clue_match_places;` (places took 90 to 150 s, fine through PgBouncer).
3. `npm run content -- ranges` writes realms and countries into every profile. Older animals can gain countries too: a new animal can turn a country into a globe place (batch 2 added eSwatini, Malawi, Rwanda and Algeria to the aardvark and cheetah).
4. `npm run content -- photos`, `build` again, `check` (0 errors, 0 warnings).

A range row with no `species` row is invisible to the game. When measuring candidates (import several, compare the places they fill, keep the best), delete the unpicked ones from `iucn` afterwards.

## Checks

```sql
-- every species has a range; no leftover ranges
SELECT s.id, s.common_name FROM species s LEFT JOIN iucn i ON i.id_no = s.iucn_id::numeric WHERE i.ogc_fid IS NULL;
SELECT DISTINCT i.id_no, i.sci_name FROM iucn i LEFT JOIN species s ON s.iucn_id::numeric = i.id_no WHERE s.id IS NULL;

-- places per kind, and thin ones (a continent opens at 12 animals, MIN_PLACE_ANIMALS)
SELECT kind, count(*) AS places, count(*) FILTER (WHERE cardinality(species_ids) <= 2) AS two_or_less,
       round(avg(cardinality(species_ids)), 1) AS avg_animals
FROM clue_match_places GROUP BY kind;
```
