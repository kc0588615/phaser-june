-- Migration 023: retire the 'crisis' node type (removed with the old
-- encounter system). Forward migration — do NOT edit 007/015, which are
-- already applied; this one retypes legacy rows first so the tightened
-- CHECK can validate them.

BEGIN;

-- Legacy crisis nodes become 'custom' so historical runs stay loadable
-- (client lookups fall back to the custom template for unknown types).
UPDATE eco_run_nodes
SET node_type = 'custom'
WHERE node_type = 'crisis';

ALTER TABLE eco_run_nodes
  DROP CONSTRAINT IF EXISTS ck_eco_run_nodes_type;

ALTER TABLE eco_run_nodes
  ADD CONSTRAINT ck_eco_run_nodes_type CHECK (
    node_type IN (
      'riverbank_sweep',
      'dense_canopy',
      'urban_fringe',
      'elevation_ridge',
      'storm_window',
      'analysis',
      'custom'
    )
  );

COMMIT;
