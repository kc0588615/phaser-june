# Normalization Review SQL Results

Generated: 2026-01-21

---

## 1) Column Inventory (all public tables)

```sql
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

### habitat_colormap
| column_name | data_type | is_nullable | column_default |
|-------------|-----------|-------------|----------------|
| value | integer | NO | NULL |
| label | text | NO | NULL |

### high_scores
| column_name | data_type | is_nullable | column_default |
|-------------|-----------|-------------|----------------|
| id | uuid | NO | gen_random_uuid() |
| username | text | NO | NULL |
| score | integer | NO | NULL |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
| player_id | uuid | YES | NULL |

### icaa
| column_name | data_type | is_nullable | column_default |
|-------------|-----------|-------------|----------------|
| ogc_fid | integer | NO | nextval('icaa_ogc_fid_seq'::regclass) |
| species_id | numeric | YES | NULL |
| common_name | text | YES | NULL |
| scientific_name | text | YES | NULL |
| taxonomic_comment | text | YES | NULL |
| iucn_url | text | YES | NULL |
| kingdom | text | YES | NULL |
| phylum | text | YES | NULL |
| class | text | YES | NULL |
| taxon_order | text | YES | NULL |
| family | text | YES | NULL |
| genus | text | YES | NULL |
| category | text | YES | NULL |
| conservation_code | text | YES | NULL |
| conservation_text | text | YES | NULL |
| threats | text | YES | NULL |
| habitat_description | text | YES | NULL |
| habitat_tags | text | YES | NULL |
| marine | boolean | YES | NULL |
| terrestrial | boolean | YES | NULL |
| freshwater | boolean | YES | NULL |
| aquatic | boolean | YES | NULL |
| geographic_description | text | YES | NULL |
| distribution_comment | text | YES | NULL |
| island | boolean | YES | NULL |
| origin | numeric | YES | NULL |
| presence | numeric | YES | NULL |
| seasonal | numeric | YES | NULL |
| bioregion | text | YES | NULL |
| realm | text | YES | NULL |
| subrealm | text | YES | NULL |
| biome | text | YES | NULL |
| color_primary | text | YES | NULL |
| color_secondary | text | YES | NULL |
| pattern | text | YES | NULL |
| shape_description | text | YES | NULL |
| size_min_cm | numeric | YES | NULL |
| size_max_cm | numeric | YES | NULL |
| weight_kg | numeric | YES | NULL |
| diet_type | text | YES | NULL |
| diet_prey | text | YES | NULL |
| diet_flora | text | YES | NULL |
| behavior_1 | text | YES | NULL |
| behavior_2 | text | YES | NULL |
| lifespan | numeric | YES | NULL |
| maturity | text | YES | NULL |
| reproduction_type | text | YES | NULL |
| clutch_size | text | YES | NULL |
| life_description_1 | text | YES | NULL |
| life_description_2 | text | YES | NULL |
| key_fact_1 | text | YES | NULL |
| key_fact_2 | text | YES | NULL |
| key_fact_3 | text | YES | NULL |
| compiler | text | YES | NULL |
| year_compiled | numeric | YES | NULL |
| citation | text | YES | NULL |
| source | text | YES | NULL |
| subspecies | text | YES | NULL |
| subpop | text | YES | NULL |
| legend | text | YES | NULL |
| generalised | numeric | YES | NULL |
| shape_length | numeric | YES | NULL |
| shape_length_alt | numeric | YES | NULL |
| shape_area | numeric | YES | NULL |
| wkb_geometry | USER-DEFINED | YES | NULL |

### oneearth_bioregion
| column_name | data_type | is_nullable | column_default |
|-------------|-----------|-------------|----------------|
| ogc_fid | integer | NO | nextval('oneearth_bioregion_ogc_fid_seq'::regclass) |
| objectid_1 | numeric | YES | NULL |
| objectid_2 | numeric | YES | NULL |
| bioregions | character varying | YES | NULL |
| bioregion | character varying | YES | NULL |
| realm | character varying | YES | NULL |
| sub_realm | character varying | YES | NULL |
| biome | character varying | YES | NULL |
| shape_length | double precision | YES | NULL |
| shape_length_alt | numeric | YES | NULL |
| shape_area | double precision | YES | NULL |
| wkb_geometry | USER-DEFINED | YES | NULL |

### player_clue_unlocks
| column_name | data_type | is_nullable | column_default |
|-------------|-----------|-------------|----------------|
| id | uuid | NO | gen_random_uuid() |
| player_id | uuid | NO | NULL |
| species_id | integer | NO | NULL |
| discovery_id | uuid | YES | NULL |
| clue_category | text | NO | NULL |
| clue_field | text | NO | NULL |
| clue_value | text | YES | NULL |
| unlocked_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |

### player_game_sessions
| column_name | data_type | is_nullable | column_default |
|-------------|-----------|-------------|----------------|
| id | uuid | NO | gen_random_uuid() |
| player_id | uuid | NO | NULL |
| started_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
| ended_at | timestamp with time zone | YES | NULL |
| total_moves | integer | NO | 0 |
| total_score | integer | NO | 0 |
| species_discovered_in_session | integer | NO | 0 |
| clues_unlocked_in_session | integer | NO | 0 |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |

### player_species_discoveries
| column_name | data_type | is_nullable | column_default |
|-------------|-----------|-------------|----------------|
| id | uuid | NO | gen_random_uuid() |
| player_id | uuid | NO | NULL |
| species_id | integer | NO | NULL |
| session_id | uuid | YES | NULL |
| discovered_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
| time_to_discover_seconds | integer | YES | NULL |
| clues_unlocked_before_guess | integer | NO | 0 |
| incorrect_guesses_count | integer | NO | 0 |
| score_earned | integer | NO | 0 |

### player_stats
| column_name | data_type | is_nullable | column_default |
|-------------|-----------|-------------|----------------|
| player_id | uuid | NO | NULL |
| total_species_discovered | integer | NO | 0 |
| total_clues_unlocked | integer | NO | 0 |
| total_score | integer | NO | 0 |
| total_moves_made | integer | NO | 0 |
| total_games_played | integer | NO | 0 |
| total_play_time_seconds | integer | NO | 0 |
| average_clues_per_discovery | numeric | YES | NULL |
| fastest_discovery_clues | integer | YES | NULL |
| slowest_discovery_clues | integer | YES | NULL |
| average_time_per_discovery_seconds | integer | YES | NULL |
| species_by_order | jsonb | NO | '{}'::jsonb |
| species_by_family | jsonb | NO | '{}'::jsonb |
| species_by_genus | jsonb | NO | '{}'::jsonb |
| species_by_realm | jsonb | NO | '{}'::jsonb |
| species_by_biome | jsonb | NO | '{}'::jsonb |
| species_by_bioregion | jsonb | NO | '{}'::jsonb |
| marine_species_count | integer | NO | 0 |
| terrestrial_species_count | integer | NO | 0 |
| freshwater_species_count | integer | NO | 0 |
| aquatic_species_count | integer | NO | 0 |
| species_by_iucn_status | jsonb | NO | '{}'::jsonb |
| clues_by_category | jsonb | NO | '{}'::jsonb |
| favorite_clue_category | text | YES | NULL |
| first_discovery_at | timestamp with time zone | YES | NULL |
| last_discovery_at | timestamp with time zone | YES | NULL |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |

### profiles
| column_name | data_type | is_nullable | column_default |
|-------------|-----------|-------------|----------------|
| user_id | uuid | NO | NULL |
| username | text | YES | NULL |
| full_name | text | YES | NULL |
| avatar_url | text | YES | NULL |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

### spatial_ref_sys (PostGIS system table)
| column_name | data_type | is_nullable | column_default |
|-------------|-----------|-------------|----------------|
| srid | integer | NO | NULL |
| auth_name | character varying | YES | NULL |
| auth_srid | integer | YES | NULL |
| srtext | character varying | YES | NULL |
| proj4text | character varying | YES | NULL |

---

## 2) Constraints (PK/UK/FK/CHECK)

```sql
SELECT conrelid::regclass AS table_name,
       conname,
       contype,
       pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY table_name, contype, conname;
```

| table_name | conname | contype | definition |
|------------|---------|---------|------------|
| spatial_ref_sys | spatial_ref_sys_srid_check | c | CHECK (((srid > 0) AND (srid <= 998999))) |
| spatial_ref_sys | spatial_ref_sys_pkey | p | PRIMARY KEY (srid) |
| icaa | icaa_pkey | p | PRIMARY KEY (ogc_fid) |
| profiles | profiles_pkey | p | PRIMARY KEY (user_id) |
| player_game_sessions | fk_player_game_sessions_player_id | f | FOREIGN KEY (player_id) REFERENCES profiles(user_id) ON UPDATE CASCADE ON DELETE SET NULL |
| player_game_sessions | player_game_sessions_pkey | p | PRIMARY KEY (id) |
| player_species_discoveries | fk_player_species_discoveries_player_id | f | FOREIGN KEY (player_id) REFERENCES profiles(user_id) ON UPDATE CASCADE ON DELETE SET NULL |
| player_species_discoveries | fk_player_species_discoveries_session_id | f | FOREIGN KEY (session_id) REFERENCES player_game_sessions(id) ON UPDATE CASCADE ON DELETE SET NULL |
| player_species_discoveries | fk_player_species_discoveries_species_id | f | FOREIGN KEY (species_id) REFERENCES icaa(ogc_fid) ON UPDATE CASCADE ON DELETE SET NULL |
| player_species_discoveries | player_species_discoveries_pkey | p | PRIMARY KEY (id) |
| player_clue_unlocks | fk_player_clue_unlocks_discovery_id | f | FOREIGN KEY (discovery_id) REFERENCES player_species_discoveries(id) ON UPDATE CASCADE ON DELETE SET NULL |
| player_clue_unlocks | fk_player_clue_unlocks_player_id | f | FOREIGN KEY (player_id) REFERENCES profiles(user_id) ON UPDATE CASCADE ON DELETE SET NULL |
| player_clue_unlocks | fk_player_clue_unlocks_species_id | f | FOREIGN KEY (species_id) REFERENCES icaa(ogc_fid) ON UPDATE CASCADE ON DELETE SET NULL |
| player_clue_unlocks | player_clue_unlocks_pkey | p | PRIMARY KEY (id) |
| player_stats | fk_player_stats_player_id | f | FOREIGN KEY (player_id) REFERENCES profiles(user_id) ON UPDATE CASCADE ON DELETE RESTRICT |
| player_stats | player_stats_pkey | p | PRIMARY KEY (player_id) |
| habitat_colormap | habitat_colormap_pkey | p | PRIMARY KEY (value) |
| oneearth_bioregion | oneearth_bioregion_pkey | p | PRIMARY KEY (ogc_fid) |
| high_scores | high_scores_player_id_fkey | f | FOREIGN KEY (player_id) REFERENCES profiles(user_id) |
| high_scores | high_scores_pkey | p | PRIMARY KEY (id) |

**Legend:** c=CHECK, f=FOREIGN KEY, p=PRIMARY KEY, u=UNIQUE

---

## 3) Indexes

```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

| tablename | indexname | indexdef |
|-----------|-----------|----------|
| habitat_colormap | habitat_colormap_pkey | CREATE UNIQUE INDEX habitat_colormap_pkey ON public.habitat_colormap USING btree (value) |
| high_scores | high_scores_pkey | CREATE UNIQUE INDEX high_scores_pkey ON public.high_scores USING btree (id) |
| high_scores | ix_high_scores_player_id | CREATE INDEX ix_high_scores_player_id ON public.high_scores USING btree (player_id) WHERE (player_id IS NOT NULL) |
| high_scores | ix_high_scores_score | CREATE INDEX ix_high_scores_score ON public.high_scores USING btree (score DESC) |
| icaa | icaa_pkey | CREATE UNIQUE INDEX icaa_pkey ON public.icaa USING btree (ogc_fid) |
| icaa | ix_icaa_wkb_geometry | CREATE INDEX ix_icaa_wkb_geometry ON public.icaa USING gist (wkb_geometry) |
| oneearth_bioregion | ix_oneearth_bioregion_wkb_geometry | CREATE INDEX ix_oneearth_bioregion_wkb_geometry ON public.oneearth_bioregion USING gist (wkb_geometry) |
| oneearth_bioregion | oneearth_bioregion_pkey | CREATE UNIQUE INDEX oneearth_bioregion_pkey ON public.oneearth_bioregion USING btree (ogc_fid) |
| player_clue_unlocks | ix_player_clue_unlocks_discovery_id | CREATE INDEX ix_player_clue_unlocks_discovery_id ON public.player_clue_unlocks USING btree (discovery_id) |
| player_clue_unlocks | player_clue_unlocks_pkey | CREATE UNIQUE INDEX player_clue_unlocks_pkey ON public.player_clue_unlocks USING btree (id) |
| player_clue_unlocks | uq_player_clue_unlocks_player_species_category_field | CREATE UNIQUE INDEX uq_player_clue_unlocks_player_species_category_field ON public.player_clue_unlocks USING btree (player_id, species_id, clue_category, clue_field) |
| player_game_sessions | ix_player_game_sessions_player_id | CREATE INDEX ix_player_game_sessions_player_id ON public.player_game_sessions USING btree (player_id) |
| player_game_sessions | player_game_sessions_pkey | CREATE UNIQUE INDEX player_game_sessions_pkey ON public.player_game_sessions USING btree (id) |
| player_species_discoveries | ix_player_species_discoveries_session_id | CREATE INDEX ix_player_species_discoveries_session_id ON public.player_species_discoveries USING btree (session_id) |
| player_species_discoveries | player_species_discoveries_pkey | CREATE UNIQUE INDEX player_species_discoveries_pkey ON public.player_species_discoveries USING btree (id) |
| player_species_discoveries | uq_player_species_discoveries_player_species | CREATE UNIQUE INDEX uq_player_species_discoveries_player_species ON public.player_species_discoveries USING btree (player_id, species_id) |
| player_stats | player_stats_pkey | CREATE UNIQUE INDEX player_stats_pkey ON public.player_stats USING btree (player_id) |
| profiles | profiles_pkey | CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (user_id) |
| profiles | uq_profiles_username | CREATE UNIQUE INDEX uq_profiles_username ON public.profiles USING btree (username) |
| spatial_ref_sys | spatial_ref_sys_pkey | CREATE UNIQUE INDEX spatial_ref_sys_pkey ON public.spatial_ref_sys USING btree (srid) |

---

## 4) Views

```sql
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public';
```

| table_name |
|------------|
| geography_columns |
| geometry_columns |
| pg_stat_statements_info |
| pg_stat_statements |

*Note: These are PostGIS/pg_stat_statements system views.*

---

## 5) Row Counts (estimates)

```sql
SELECT relname AS table_name, reltuples::bigint AS est_rows
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND relkind = 'r'
ORDER BY relname;
```

| table_name | est_rows |
|------------|----------|
| habitat_colormap | 82 |
| high_scores | 5 |
| icaa | 22 |
| oneearth_bioregion | 185 |
| player_clue_unlocks | 55 |
| player_game_sessions | 5 |
| player_species_discoveries | 20 |
| player_stats | 3 |
| profiles | 3 |
| spatial_ref_sys | 8500 |

---

## 6) Multi-value Field Patterns in icaa (delimiters)

```sql
SELECT
  COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE habitat_tags LIKE '%,%') AS habitat_tags_commas,
  COUNT(*) FILTER (WHERE habitat_tags LIKE '%;%' ) AS habitat_tags_semicolons,
  COUNT(*) FILTER (WHERE threats LIKE '%,%') AS threats_commas,
  COUNT(*) FILTER (WHERE threats LIKE '%;%' ) AS threats_semicolons,
  COUNT(*) FILTER (WHERE diet_prey LIKE '%,%') AS diet_prey_commas,
  COUNT(*) FILTER (WHERE diet_flora LIKE '%,%') AS diet_flora_commas
FROM icaa;
```

| total_rows | habitat_tags_commas | habitat_tags_semicolons | threats_commas | threats_semicolons | diet_prey_commas | diet_flora_commas |
|------------|---------------------|-------------------------|----------------|--------------------|------------------|-------------------|
| 22 | 11 | 11 | 11 | 12 | 6 | 10 |

**Analysis:** Multi-value fields use mixed delimiters (both commas and semicolons). ~50% of rows have comma-delimited values in habitat_tags/threats; 27-45% in diet fields.

---

## 7) Candidate Key Sanity Checks

### icaa
```sql
SELECT COUNT(*) AS total_rows, COUNT(DISTINCT species_id) AS distinct_species_id
FROM icaa;
```

| total_rows | distinct_species_id |
|------------|---------------------|
| 22 | 22 |

**Result:** `species_id` is unique across all rows - valid candidate key.

### oneearth_bioregion
```sql
SELECT COUNT(*) AS total_rows, COUNT(DISTINCT bioregion) AS distinct_bioregion_codes
FROM oneearth_bioregion;
```

| total_rows | distinct_bioregion_codes |
|------------|--------------------------|
| 185 | 185 |

**Result:** `bioregion` is unique across all rows - valid candidate key.

---

---

## 8) Species ID Nulls / Duplicates

```sql
SELECT
  COUNT(*) FILTER (WHERE species_id IS NULL) AS species_id_nulls,
  COUNT(DISTINCT species_id) AS distinct_species_id
FROM icaa;
```

| species_id_nulls | distinct_species_id |
|------------------|---------------------|
| 0 | 22 |

**Result:** No nulls, all 22 species_id values are distinct.

```sql
SELECT species_id, COUNT(*) AS dupes
FROM icaa
GROUP BY species_id
HAVING COUNT(*) > 1;
```

| species_id | dupes |
|------------|-------|
| *(empty)* | |

**Result:** No duplicate species_id values.

---

## 9) Conservation Mappings (code/text/category)

### Code → Text Variants
```sql
SELECT conservation_code, COUNT(DISTINCT conservation_text) AS text_variants, COUNT(*) AS rows
FROM icaa
GROUP BY conservation_code
ORDER BY text_variants DESC, conservation_code;
```

| conservation_code | text_variants | rows |
|-------------------|---------------|------|
| EN | 7 | 7 |
| LC | 7 | 7 |
| CR | 4 | 4 |
| VU | 2 | 2 |
| EX | 1 | 1 |
| NT | 1 | 1 |

**Analysis:** `conservation_text` is NOT a lookup of `conservation_code` — each row has unique descriptive text. Only `category` maps 1:1 to `conservation_code`.

### Full Category/Code/Text Breakdown
```sql
SELECT category, conservation_code, conservation_text, COUNT(*) AS rows
FROM icaa
GROUP BY 1,2,3
ORDER BY rows DESC;
```

| category | conservation_code | conservation_text | rows |
|----------|-------------------|-------------------|------|
| LC | LC | Least Concern | 1 |
| CR | CR | Critically Endangered | 1 |
| CR | CR | Over-collection for pet trade & habitat clearing have cut numbers >80 % in 30 yrs. | 1 |
| LC | LC | Widespread and adaptable but vulnerable to habitat loss and illegal pet trade in blue morphs | 1 |
| EN | EN | Populations declining due to illegal egg and adult harvest for pet and meat trade, habitat alteration, and water-regulation projects. | 1 |
| EN | EN | Fossorial habits hide shrinking numbers threatened by forest clearing agriculture and check dams | 1 |
| LC | LC | Populations stable but sensitive to logging that warms streams and adds silt | 1 |
| LC | LC | Widespread and common but suffers locally from polluted water and habitat loss | 1 |
| EN | EN | Endangered | 1 |
| LC | LC | Locally common but hunted for meat and impacted by river pollution | 1 |
| EX | EX | Classified as Extinct (EX) by IUCN. Efforts are underway to 'resurrect' the lineage using recently found first-generation hybrids. | 1 |
| EN | EN | Populations falling due to forest loss disease and climate warming | 1 |
| VU | VU | Wild numbers shrinking as overgrazing, desertification and trade harvest erode remaining strongholds. | 1 |
| LC | LC | Stable overall but suffers where forest is cleared or water bodies are polluted | 1 |
| VU | VU | Head-starting and predator eradication have raised wild numbers from ~3 000 in the 1970s to > 15 000 today | 1 |
| CR | CR | Intense demand for the pet, food and traditional-medicine trades has decimated populations across its range. | 1 |
| NT | NT | Small range makes it vulnerable to mining and coastal development | 1 |
| LC | LC | Still widespread but disappearing from logged and palm-oil landscapes; needs intact canopy. | 1 |
| EN | EN | Hunted for meat and export and harmed by logging dams and polluted water | 1 |
| EN | EN | Numbers falling because of pet trade demand and loss of swamp forest | 1 |
| CR | CR | With only one confirmed male in China and  3 turtles in Vietnam, species is functionally extinct; intensive search, habitat protection & assisted reproduction are ongoing. | 1 |
| EN | EN | Illegal pet trade and habitat loss have cut wild numbers by >50 % in three generations | 1 |

**Conclusion:** `category` = `conservation_code` (redundant). `conservation_text` is species-specific prose, not a lookup value.

---

## 10) Bioregion Mapping Checks (1:1?)

### icaa bioregion → realm/subrealm/biome consistency
```sql
SELECT bioregion,
       COUNT(DISTINCT realm) AS realm_variants,
       COUNT(DISTINCT subrealm) AS subrealm_variants,
       COUNT(DISTINCT biome) AS biome_variants
FROM icaa
GROUP BY bioregion
HAVING COUNT(DISTINCT realm) > 1
    OR COUNT(DISTINCT subrealm) > 1
    OR COUNT(DISTINCT biome) > 1;
```

| bioregion | realm_variants | subrealm_variants | biome_variants |
|-----------|----------------|-------------------|----------------|
| *(empty)* | | | |

**Result:** Each bioregion in icaa maps to exactly one realm/subrealm/biome combination. ✓

### oneearth_bioregion consistency
```sql
SELECT bioregion,
       COUNT(DISTINCT realm) AS realm_variants,
       COUNT(DISTINCT sub_realm) AS subrealm_variants,
       COUNT(DISTINCT biome) AS biome_variants
FROM oneearth_bioregion
GROUP BY bioregion
HAVING COUNT(DISTINCT realm) > 1
    OR COUNT(DISTINCT sub_realm) > 1
    OR COUNT(DISTINCT biome) > 1;
```

| bioregion | realm_variants | subrealm_variants | biome_variants |
|-----------|----------------|-------------------|----------------|
| *(empty)* | | | |

**Result:** Each bioregion in oneearth_bioregion maps to exactly one realm/sub_realm/biome. ✓

### Cross-table icaa ↔ oneearth_bioregion mismatches
```sql
SELECT i.bioregion,
       i.realm AS icaa_realm, b.realm AS oneearth_realm,
       i.subrealm AS icaa_subrealm, b.sub_realm AS oneearth_sub_realm,
       i.biome AS icaa_biome, b.biome AS oneearth_biome
FROM icaa i
JOIN oneearth_bioregion b ON i.bioregion = b.bioregion
WHERE i.realm IS DISTINCT FROM b.realm
   OR i.subrealm IS DISTINCT FROM b.sub_realm
   OR i.biome IS DISTINCT FROM b.biome
LIMIT 50;
```

| bioregion | icaa_realm | oneearth_realm | icaa_subrealm | oneearth_sub_realm | icaa_biome | oneearth_biome |
|-----------|------------|----------------|---------------|--------------------| -----------|----------------|
| *(empty)* | | | | | | |

**Result:** No mismatches between icaa and oneearth_bioregion for realm/subrealm/biome. ✓

---

## 11) Taxonomy Dependency Checks

### genus → family (should be 1:1)
```sql
SELECT genus, COUNT(DISTINCT family) AS family_variants
FROM icaa
GROUP BY genus
HAVING COUNT(DISTINCT family) > 1;
```

| genus | family_variants |
|-------|-----------------|
| *(empty)* | |

**Result:** Each genus maps to exactly one family. ✓

### family → taxon_order (should be 1:1)
```sql
SELECT family, COUNT(DISTINCT taxon_order) AS order_variants
FROM icaa
GROUP BY family
HAVING COUNT(DISTINCT taxon_order) > 1;
```

| family | order_variants |
|--------|----------------|
| *(empty)* | |

**Result:** Each family maps to exactly one order. ✓

### taxon_order → class (should be 1:1)
```sql
SELECT taxon_order, COUNT(DISTINCT class) AS class_variants
FROM icaa
GROUP BY taxon_order
HAVING COUNT(DISTINCT class) > 1;
```

| taxon_order | class_variants |
|-------------|----------------|
| *(empty)* | |

**Result:** Each order maps to exactly one class. ✓

**Conclusion:** Taxonomy hierarchy is consistent — no violations. Could be normalized into lookup tables if desired.

---

## 12) Delimiter Edge Cases (both delimiters present)

```sql
SELECT
  COUNT(*) FILTER (WHERE habitat_tags LIKE '%,%' AND habitat_tags LIKE '%;%') AS habitat_tags_both,
  COUNT(*) FILTER (WHERE threats LIKE '%,%' AND threats LIKE '%;%') AS threats_both,
  COUNT(*) FILTER (WHERE diet_prey LIKE '%,%' AND diet_prey LIKE '%;%') AS diet_prey_both,
  COUNT(*) FILTER (WHERE diet_flora LIKE '%,%' AND diet_flora LIKE '%;%') AS diet_flora_both
FROM icaa;
```

| habitat_tags_both | threats_both | diet_prey_both | diet_flora_both |
|-------------------|--------------|----------------|-----------------|
| 0 | 1 | 0 | 3 |

**Analysis:** Most fields use one delimiter consistently per row, but:
- 1 row has both `,` and `;` in `threats`
- 3 rows have both `,` and `;` in `diet_flora`

Split logic should handle both delimiters (e.g., `regexp_split_to_table(field, '[,;]\s*')`).

---

## 13) Sample Data: Multi-value Fields

### habitat_tags samples
```sql
SELECT habitat_tags FROM icaa WHERE habitat_tags LIKE '%,%' OR habitat_tags LIKE '%;%' LIMIT 20;
```

| habitat_tags |
|--------------|
| wetland, grassland, shrubland, standing-water, temporary-wetland |
| river, stream, lake, pond, marsh, soft-bottom, sandbar, mudbank |
| deciduous forest, evergreen montane forest, humid grassland, volcanic island |
| temperate rain forest; moss carpet; slow stream; swamp margin |
| cold forest streams, granite boulders, montane ravines |
| tropical rainforest canopy; tree-hole pool; temporary pond; overhanging leaf |
| tropical rainforest canopy; riparian leaf; temporary pool; stream edge |
| fast river; rainforest stream; tea plantation ditch; mist forest floor |
| tropical river, floodplain lagoon, oxbow lake, sandbank |
| cold mountain stream; fast riffle; cobble bottom; old growth forest |
| tropical rainforest gap; tree fall pool; leaf litter; bromeliad axil |
| swamp forest pool; slow river backwater; floodplain lagoon; leaf litter bottom |
| fast river cascade; rock pool; waterfall edge |
| humid rainforest leaf-litter, hill streams, primary forest |
| humid forest; swamp; marsh; seasonal pool |
| large river, floodplain lake, muddy bottom, slow current |
| fog desert dune; succulent scrub; coastal sand |
| arid thorn-scrub, seasonally humid highlands, volcanic island |
| dry brush, thorn forest, woodlands |
| arid thorn-scrub savanna, kopje crevices, Acacia-Commiphora bush |

**Pattern:** Some rows use `, ` (comma-space), others use `; ` (semicolon-space). No rows mix both.

### threats samples
```sql
SELECT threats FROM icaa WHERE threats LIKE '%,%' OR threats LIKE '%;%' LIMIT 20;
```

| threats |
|---------|
| habitat loss, road mortality, nest predation, illegal collection for the pet trade |
| nest predation (raccoons), human harvest (for food/pets), boat strikes, habitat modification from dams |
| Over-harvesting by whalers in the 19th century and severe habitat destruction caused by invasive, introduced goats. |
| Deforestation; plantation forestry; chytrid fungus; drought; wildfire |
| Over-collection, hydropower dams, sedimentation, deforestation, by-catch in eel traps. |
| Deforestation; peat-swamp drainage; local pet collection; pesticide drift |
| deforestation; agrochemical runoff; chytrid fungus; pet trade |
| habitat loss; stream siltation; bushmeat harvest; water pollution |
| Unregulated international pet trade, over-harvest for food, sand-bar mining, river dams, increased nest predation by feral pigs and dogs. |
| logging; road building; sedimentation; water warming; small dams |
| deforestation; mining run-off; selective collection of colourful morphs; climate warming |
| water pollution; dam construction; wetland drainage; aquarium trade |
| over harvest; habitat loss; siltation; dam construction; pet trade |
| Unsustainable trade, logging, oil-palm expansion, forest fires, road mortality |
| Deforestation; polluted runoff; over collection for pets; predatory fish and mosquitoes |
| Historical over-harvest, wetland loss, dam construction, pollution, bycatch; now extreme Allee effect. |
| habitat loss; diamond mining; off road vehicles; climate change |
| Historic over-harvest, egg predation by rats, browsing by feral goats, emerging drought risk from climate change |
| Habitat loss, poaching for food, and over-exploitation in the international pet trade. Numbers are declining rapidly. |
| Illegal trade, bush-clearing, charcoal burning, goat over-grazing, fires. |

**Pattern:** Mixed — some use `, ` others use `; `. Commas also appear inside parenthetical phrases.

### diet_prey / diet_flora samples
```sql
SELECT diet_prey, diet_flora FROM icaa WHERE diet_prey IS NOT NULL OR diet_flora IS NOT NULL LIMIT 20;
```

| diet_prey | diet_flora |
|-----------|------------|
| crayfish, small animals, carrion | plant material, seeds |
| crayfish, fish, insects, snails, carrion | algae, leaves, acorns, pecans |
| N/A | Fed primarily on greens, grasses, native fruit, and low-hanging cactus pads. |
| Ants; springtails; small beetles; spiders | None |
| Snails, crabs, freshwater shrimp, small fish, carrion | Occasional fruit or fallen figs |
| Moths; crickets; beetles; arboreal spiders | None |
| moths; crickets; flies; small grasshoppers | none |
| beetles; crickets; millipedes; small spiders | none |
| Aquatic insects, freshwater prawns, snails, carrion | Figs, fallen fruit, riverine vegetation |
| aquatic insect larvae; small snails; spiders | none |
| ants; termites; fruit flies; tiny beetles; mites | none |
| small fish; aquatic insects; worms; crustaceans | none |
| crabs; insects; fish; other frogs; small snakes | none |
| Snails, earthworms, carrion | Fallen figs, palm fruit, mushrooms, young leaves |
| Ants; termites; small beetles; worms | None |
| Fish, crabs, snails, frogs | Aquatic vegetation (e.g., water hyacinth) |
| moths; termites; woodlice; small beetles | none |
| N/A | Grasses, forbs, cactus pads, fallen fruit; can survive > 12 months without fresh food or water by slowing metabolism |
| N/A | Grazes on grasses, fruit, and succulent plants. A favorite food is the Opuntia cactus. Prefers new growth over mature growth. |
| *(null)* | Dry grasses, succulents, leaves; seldom drinks free water |

**Pattern:**
- `diet_prey`: uses `, ` or `; ` as delimiter; "N/A" or null for herbivores
- `diet_flora`: uses `, ` or `; ` as delimiter; "None"/"none" or null for carnivores

---

## Summary Observations

1. **Primary tables:** `icaa` (species), `oneearth_bioregion` (geography), `profiles` (users), player tracking tables
2. **Denormalized fields in icaa:** `habitat_tags`, `threats`, `diet_prey`, `diet_flora` contain comma/semicolon-separated lists
3. **Well-structured player tracking:** Proper FK relationships from player tables → profiles → icaa
4. **Geometry indexed:** Both `icaa` and `oneearth_bioregion` have GiST indexes on `wkb_geometry`
5. **JSONB aggregates in player_stats:** `species_by_*` fields store aggregated counts as JSON
6. **species_id is clean:** No nulls, no duplicates — valid natural key
7. **category = conservation_code:** Redundant column; conservation_text is prose, not lookup
8. **Bioregion mappings consistent:** Both tables have 1:1 bioregion→realm/subrealm/biome
9. **Taxonomy hierarchy clean:** genus→family→order→class all 1:1 (normalizable)
10. **Delimiter strategy:** Use `regexp_split_to_table(field, '[,;]\s*')` to handle mixed delimiters
