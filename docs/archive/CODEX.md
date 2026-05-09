## Postgres Database Access

Use the `postgres-tunnel` skill for database access. Do not use `pg-claude`.

## Connection

Database: `phaser_june`
Local forwarded port: `55432`
Remote target: `127.0.0.1:6432`

Start the SSH tunnel in a long-lived terminal:

```bash
ssh -i ~/.ssh/hetzner_id_ed25519 -L 55432:127.0.0.1:6432 root@178.156.159.183
```

Connect with `psql` from another terminal:

```bash
PGPASSWORD='N?+kxWMf7&8i@sq' psql -h localhost -p 55432 -U postgres -d phaser_june
```

For scripts/migrations:

```bash
PGPASSWORD='N?+kxWMf7&8i@sq' psql -h localhost -p 55432 -U postgres -d phaser_june -v ON_ERROR_STOP=1 -f path/to/migration.sql
```

Prefer read-only checks first. Use explicit transactions for writes unless a migration already handles them.
