-- Migration 021: make newly imported raw IUCN ranges visible to app spatial queries.
-- Raw IUCN does not carry common names, so use sci_name as the initial placeholder.

INSERT INTO public.species (
  iucn_id,
  scientific_name,
  common_name,
  kingdom,
  phylum,
  class,
  taxon_order,
  family,
  genus,
  conservation_code,
  taxonomic_comment,
  distribution_comment,
  marine,
  terrestrial,
  freshwater
)
SELECT
  i.id_no::bigint,
  MAX(i.sci_name),
  MAX(i.sci_name),
  MAX(i.kingdom),
  MAX(i.phylum),
  MAX(i.class),
  MAX(i.order_),
  MAX(i.family),
  MAX(i.genus),
  MAX(i.category),
  MAX(i.tax_comm),
  MAX(i.dist_comm),
  COALESCE(BOOL_OR(i.marine), false),
  COALESCE(BOOL_OR(i.terrestria), false),
  COALESCE(BOOL_OR(i.freshwater), false)
FROM public.iucn i
WHERE i.id_no IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.species s
    WHERE s.iucn_id = i.id_no::bigint
  )
GROUP BY i.id_no
ON CONFLICT (iucn_id) DO NOTHING;
