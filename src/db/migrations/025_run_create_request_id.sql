-- Separate run identity from retry idempotency. Legacy rows remain NULL.
ALTER TABLE eco_run_sessions
  ADD COLUMN IF NOT EXISTS create_request_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS ux_eco_run_sessions_player_create_request
  ON eco_run_sessions (player_id, create_request_id)
  WHERE create_request_id IS NOT NULL;
