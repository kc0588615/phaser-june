-- Allow active expeditions to pause in deduction camp before final completion.

BEGIN;

ALTER TABLE eco_run_sessions
  DROP CONSTRAINT IF EXISTS ck_eco_run_sessions_status;

ALTER TABLE eco_run_sessions
  ADD CONSTRAINT ck_eco_run_sessions_status CHECK (
    run_status IN ('active', 'deduction', 'completed', 'failed', 'abandoned')
  );

COMMIT;
