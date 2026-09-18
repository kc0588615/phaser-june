# Archived Database Access Notes

> Superseded by [DATABASE_ACCESS.md](../DATABASE_ACCESS.md). Do not use old
> commands from this file's Git history.

The historical setup forwarded WSL port 55432 to PgBouncer and referenced an
older SSH key. The current `postgres-tunnel` skill exists and instead forwards:

```text
127.0.0.1:55432 → SSH → 172.18.0.2:5432 (raw PostgreSQL)
```

The historical password was rotated and removed from the working tree. Current
credentials must come from `DATABASE_URL`; never recover or reuse the old value.
