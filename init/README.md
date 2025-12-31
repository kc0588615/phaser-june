# Database Init Scripts

Scripts in this directory run **once** on first container start (when data dir is empty).

| File | Purpose |
|------|---------|
| `01-extensions.sql` | Enable postgis, pgcrypto, uuid-ossp, pg_stat_statements |

## Adding more

- Use numeric prefixes for ordering: `02-schemas.sql`, `03-seed.sql`
- `.sh` scripts must be executable (`chmod +x`)
- Scripts run alphabetically by filename
