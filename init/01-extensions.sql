-- Required extensions for phaser-june
-- Runs on first container init only (empty data dir)

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Optional: monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
