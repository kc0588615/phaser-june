-- Allow currently generated expedition node types in persisted run nodes.
-- The run generator now emits "crisis" nodes for high-pressure expeditions.

BEGIN;

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
      'crisis',
      'analysis',
      'custom'
    )
  );

UPDATE eco_run_nodes
SET objective_type = 'match_count'
WHERE objective_type = 'any';

COMMIT;
