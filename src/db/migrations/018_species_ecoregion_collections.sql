-- Migration 018: Species collection goals by ecoregion.
-- Builds many-to-many species/ecoregion matches from IUCN range overlap.

CREATE TABLE IF NOT EXISTS public.species_ecoregions (
  species_id INTEGER NOT NULL REFERENCES public.species(id) ON DELETE CASCADE,
  ecoregion_id INTEGER NOT NULL REFERENCES oneearth.oneearth_bioregion(ogc_fid) ON DELETE CASCADE,
  overlap_km2 DOUBLE PRECISION NOT NULL DEFAULT 0,
  species_overlap_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  ecoregion_overlap_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (species_id, ecoregion_id)
);

CREATE INDEX IF NOT EXISTS ix_species_ecoregions_ecoregion
  ON public.species_ecoregions (ecoregion_id);

CREATE INDEX IF NOT EXISTS ix_species_ecoregions_species
  ON public.species_ecoregions (species_id);

CREATE INDEX IF NOT EXISTS ix_species_ecoregions_primary
  ON public.species_ecoregions (species_id)
  WHERE is_primary;

ALTER TABLE public.player_species_discoveries
  ADD COLUMN IF NOT EXISTS found_lon DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS found_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS found_ecoregion_id INTEGER REFERENCES oneearth.oneearth_bioregion(ogc_fid) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_player_species_discoveries_found_ecoregion
  ON public.player_species_discoveries (found_ecoregion_id);

CREATE INDEX IF NOT EXISTS ix_player_species_discoveries_found_location
  ON public.player_species_discoveries (found_lon, found_lat)
  WHERE found_lon IS NOT NULL AND found_lat IS NOT NULL;

WITH species_ranges AS (
  SELECT
    s.id AS species_id,
    ST_UnaryUnion(ST_Collect(ST_MakeValid(i.wkb_geometry))) AS geom_4326
  FROM public.species s
  JOIN public.iucn i ON i.id_no = s.iucn_id::numeric
  WHERE i.wkb_geometry IS NOT NULL
  GROUP BY s.id
),
measured_species AS (
  SELECT
    species_id,
    geom_4326,
    NULLIF(ST_Area(ST_Transform(geom_4326, 6933)), 0) AS species_area_m2
  FROM species_ranges
  WHERE NOT ST_IsEmpty(geom_4326)
),
overlap_rows AS (
  SELECT
    ms.species_id,
    b.ogc_fid AS ecoregion_id,
    ST_Area(ST_Intersection(
      ST_Transform(ms.geom_4326, 6933),
      ST_Transform(ST_MakeValid(b.wkb_geometry), 6933)
    )) AS overlap_m2,
    ms.species_area_m2,
    NULLIF(ST_Area(ST_Transform(ST_MakeValid(b.wkb_geometry), 6933)), 0) AS ecoregion_area_m2
  FROM measured_species ms
  JOIN oneearth.oneearth_bioregion b
    ON ms.geom_4326 && b.wkb_geometry
   AND ST_Intersects(ms.geom_4326, b.wkb_geometry)
  WHERE b.wkb_geometry IS NOT NULL
),
ranked AS (
  SELECT
    species_id,
    ecoregion_id,
    overlap_m2 / 1000000.0 AS overlap_km2,
    overlap_m2 / species_area_m2 AS species_overlap_pct,
    overlap_m2 / ecoregion_area_m2 AS ecoregion_overlap_pct,
    row_number() OVER (PARTITION BY species_id ORDER BY overlap_m2 DESC) = 1 AS is_primary
  FROM overlap_rows
  WHERE overlap_m2 > 0
    AND (
      overlap_m2 / species_area_m2 >= 0.05
      OR overlap_m2 / 1000000.0 >= 500
    )
)
INSERT INTO public.species_ecoregions (
  species_id,
  ecoregion_id,
  overlap_km2,
  species_overlap_pct,
  ecoregion_overlap_pct,
  is_primary,
  updated_at
)
SELECT
  species_id,
  ecoregion_id,
  overlap_km2,
  species_overlap_pct,
  ecoregion_overlap_pct,
  is_primary,
  now()
FROM ranked
ON CONFLICT (species_id, ecoregion_id) DO UPDATE SET
  overlap_km2 = EXCLUDED.overlap_km2,
  species_overlap_pct = EXCLUDED.species_overlap_pct,
  ecoregion_overlap_pct = EXCLUDED.ecoregion_overlap_pct,
  is_primary = EXCLUDED.is_primary,
  updated_at = now();
