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

`scripts/iucn.ts` reads the `.dbf` table, then only the matching shapes through the `.shx` offsets, and appends them with every IUCN attribute in one transaction (about a second per file). A species already in `iucn` (same `id_no`) is skipped; to replace a range, delete its rows first. It connects through `DATABASE_URL`; `CLUE_USE_TUNNEL=1` takes the WSL agent tunnel to the same database instead (docs/DATABASE_ACCESS.md#wsl-agentraw-tunnel).

Why not the standard tools: `shp2pgsql` and `ogr2ogr` aren't installed in WSL, and `shp2pgsql` can't filter rows, so it would push a whole group file through the connection. If the owner installs GDAL (`sudo apt install gdal-bin`), `ogr2ogr` can do the same filtered append:

```sh
ogr2ogr -append -f PostgreSQL "PG:..." FILE.shp -nln iucn -nlt PROMOTE_TO_MULTI \
  -lco GEOMETRY_NAME=wkb_geometry -where "sci_name IN ('Lycaon pictus')"
```

## The `iucn` table

- Source-owned: raw IUCN columns, lowercased (`id_no, sci_name, presence, origin, seasonal, category, citation, ...`; `order_` and `terrestria` are shapefile truncations; quote `"class"` in SQL). Never add app columns; game data lives on `species`.
- `wkb_geometry` is `MULTIPOLYGON`, SRID 4326. Check before any other kind of load: `SELECT Find_SRID('public','iucn','wkb_geometry'), GeometryType(wkb_geometry), count(*) FROM iucn GROUP BY 1,2`.
- Many rows per species (disjoint areas, presence and origin codes). Join on `species.iucn_id = iucn.id_no`, never on `ogc_fid`.
- `presence`: 1 extant, 2 probably extant, 3 possibly extant, 4 possibly extinct, 5 extinct, 6 uncertain. The views and `content -- ranges` use 1 to 3 and fall back to all polygons for any animal with no polygon of presence 1 to 3, so a hellbender's possibly-extinct rows or a tapir's extinct ones stay off its map.
- Some polygons are invalid (self-intersections). The views wrap them in `ST_MakeValid`; leave the raw rows as imported. Imported areas match the shapefile's `shape_area`.

## `id_no` and names

`id_no` is the IUCN taxon id and becomes the profile's `iucnId`. Check the shapefile's `sci_name` matches the profile: taxonomy moves on (*Andrias davidianus* is taxon 179010104 since *A. sligoi* was split off), and one old label pointed at a different tortoise. Other sources may use older names: ADW files Temminck's pangolin under `Manis_temminckii`, not *Smutsia*.

## Adding or changing an animal

One content build per change, after the app deploy. Each step says who runs it: the owner runs what needs his machine or writes content to the live database; agents can run the rest.

A new animal:

1. **Owner, WSL:** a fresh dump, `ssh play.critterconnect.org /opt/critter-connect/deploy/backup/pg-backup.sh` (`AGENTS.md` asks for one before a bulk write).
2. **Owner, WSL:** `npm run iucn -- find|import` (above; the shapefiles are on his machine only). Check `id_no` and the names first (above).
3. **Agent or owner:** the profile, `db/content/animals/<id>-<slug>.json`: a new animal takes the next id, ids never change, and `iucnId` is the import's `id_no`. A clue or fact on a page not yet in `citations.json` gets its entry in the same commit (`docs/CONTENT_SOURCES.md#citations`). Then `npm run content -- preview [name]` until it prints no `PROBLEM` line (a `checkProfile` problem or a `checkCitations` error); aim for no `cite warn` line either (a page showing the fallback citation).
4. **Agent or owner:** `npm run content -- ranges`, once, off-peak, against the database that holds the import (the live one). It reads each profile's `id` and `iucnId` and the `iucn`, One Earth and Natural Earth tables, never `species`, so it needs no build first. It rewrites every profile's realms and countries in one read-only query: about 2 min on the dev copy (2026-11-15), stopped at 15 min. It refuses and writes nothing while a profile has a `PROBLEM` or two profiles share an `id` or `iucnId`. "no range map" for the new animal means that database has no `iucn` rows for its `iucnId`: stop. Older animals can gain countries too, because a country needs two animals (batch 2 added eSwatini, Malawi, Rwanda and Algeria to the aardvark and cheetah). Commit every profile it rewrote.
5. **Agent or owner:** `npm run content -- photos` (fills each missing `photo`), and look at every photo.
6. **Agent or owner:** `npm test` (validates every profile), the balance bot (`node scripts/run-typescript.mjs scripts/balance-044.ts`, seeded rounds from the profiles), the PR, its merge and the app deploy. The deploy goes out before the content build: the app bundles `citations.json` (`docs/CONTENT_SOURCES.md#citations`, Release order).
7. **Owner, WSL:** a fresh dump (step 1), then `npm run content -- build`, once, on `main` with the merge pulled (`git pull --ff-only`), never a branch, so the profiles it loads match the `citations.json` the deploy bundled. One transaction; it refuses before touching the database on any `checkProfile` problem or `checkCitations` error, or an `id` or `iucnId` two profiles share, and prints the citation warning count.
8. **Owner, WSL, straight after the build:** refresh both views (`./scripts/db "<statement>"`; places took {{T}} on the dev copy ({{T_DATE}}), fine through PgBouncer), then `npm run content -- check` (0 errors, 0 warnings; it errors on a fact or hand-written clue whose page has no citation) and play `/explore/?seed=1`.
   ```sql
   REFRESH MATERIALIZED VIEW CONCURRENTLY clue_match_ranges;
   REFRESH MATERIALIZED VIEW CONCURRENTLY clue_match_places;
   ```

Changing an existing animal:

- Its text, traits, clues, facts, sources or photo: steps 3, 6, 7 and 8, without the refresh.
- The set of animals or a range: a removed profile, a changed `iucnId`, or a new map for the same `iucnId` (`iucn -- import` skips an id already in `iucn`, so the owner deletes its rows after step 1's dump, then imports). That's the new-animal order, with steps 1 and 2 only for a map not yet in `iucn`: `ranges` over every profile, every profile it rewrote committed in the same PR (others' countries can change too), and both refreshes. A refresh alone leaves the committed realm and country clues stale beside the new map. No code checks this: a range changes only through these steps or an `iucnId` edit in a reviewed PR.

A range row with no profile is ignored by `ranges`; one with no `species` row is invisible to the game. When measuring candidates (import several, compare the places they fill, keep the best), delete the unpicked ones from `iucn` afterwards.

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
