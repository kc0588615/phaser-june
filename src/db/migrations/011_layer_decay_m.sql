-- =============================================================================
-- Migration 011: Add per-layer decay constant to eco_gis_layers
-- =============================================================================
BEGIN;

ALTER TABLE eco_gis_layers ADD COLUMN IF NOT EXISTS decay_m INTEGER NOT NULL DEFAULT 500;

-- Major rivers need wider decay (ORD7+ data = sparse coverage)
UPDATE eco_gis_layers SET decay_m = 2000 WHERE layer_key = 'hydrorivers';

COMMIT;
