# Database Access

> Verified 2026-08-29: the WSL tunnel reached database `phaser_june` as role
> `postgres` on PostgreSQL 17.5. Application traffic uses the public PgBouncer
> endpoint defined by `DATABASE_URL`.

## Connection map

There is one PostgreSQL server. `db.critterconnect.org` resolves to the Hetzner
host; PostgreSQL itself remains inside its Docker network.

```text
App / compatible psql
  └─ TLS ─► db.critterconnect.org:6432 ─► PgBouncer (transaction mode)
                                             └─► 172.18.0.2:5432 PostgreSQL

WSL agents / raw PostgreSQL
  └─ 127.0.0.1:55432 ─► SSH to Hetzner:22 ─► 172.18.0.2:5432 PostgreSQL

Windows / QGIS
  └─ 127.0.0.1:5433 ─► separate Windows SSH tunnel ─► PostgreSQL
```

| Port | Scope | Purpose |
|---|---|---|
| 6432 | Public | PgBouncer with TLS; app runtime and compatible clients |
| 5432 | Docker-internal | Raw PostgreSQL; not internet-accessible |
| 55432 | WSL loopback | Agent/raw PostgreSQL SSH tunnel |
| 5433 | Windows loopback | Separate QGIS/Windows tunnel |
| 22 | Public, IP-allowlisted | SSH and tunnel transport |

Repository deployment config sets PgBouncer to **transaction mode**. Do not
depend on connection-wide `SET`, `LISTEN`/`NOTIFY`, session advisory locks, or
session-scoped temporary objects through port 6432. Use the raw tunnel when
server-session affinity matters.

## Choose the route

| Client or task | Route | Tunnel required? |
|---|---|---|
| Next.js, Drizzle, Vercel | `DATABASE_URL` → port 6432 | No |
| Human `psql`, PgBouncer-compatible SQL | `./scripts/db` → port 6432 | No |
| Codex/other WSL agents | `127.0.0.1:55432` → raw PostgreSQL | Yes |
| Session-bound SQL, raw imports, recovery | `127.0.0.1:55432` → raw PostgreSQL | Yes |
| Windows/QGIS | Windows-local port 5433 | Separate tunnel |
| Docker/log/config operations | SSH shell | SSH, no SQL forward required |

## Credentials and safety

Always obtain credentials from `DATABASE_URL`; never paste a connection URL,
password, token, or private key into commands, documentation, or logs.
`.env.local` is gitignored.

The current `DATABASE_URL` role is `postgres`, a production superuser. This is
current reality, not the desired least-privilege end state. Default to read-only
queries. Run writes only when explicitly authorized, name the affected tables,
and use an explicit transaction.

The old password formerly present in `docs/archive/CODEX.md` was rotated and
removed from the working tree. Current credentials live only in local and
deployment environments.

## Direct PgBouncer access

Use the helper for human `psql` work that is compatible with transaction
pooling:

```bash
./scripts/db                                      # interactive shell
./scripts/db "select count(*) from species;"      # one-off query
./scripts/db -f src/db/migrations/example.sql     # stop on first SQL error
./scripts/db -1 -f src/db/migrations/example.sql  # one transaction
```

The helper loads `DATABASE_URL` from the environment or `.env.local`, parses it
in memory, and passes discrete `PG*` variables to `psql`. The password is not
placed in process arguments. Non-interactive calls use `-X` and
`ON_ERROR_STOP=1`.

### `pgbouncer=true`

Do not add `pgbouncer=true` to new URLs. It is not a libpq/`psql` connection
parameter and can break introspection or client startup. The app removes it for
backward compatibility; `scripts/db` ignores it while parsing the URL. Tracked
environment examples intentionally omit it.

The public endpoint currently uses `sslmode=require`. That encrypts traffic but
does not provide the same server-identity guarantee as `verify-full` with a
trusted root certificate.

WSL currently has `psql` 14.23 while the server is PostgreSQL 17.5. Basic SQL
was verified, but use PostgreSQL 17 client tools for `pg_dump`, `pg_restore`,
and other version-sensitive administration.

## WSL agent/raw tunnel

Agents follow the `postgres-tunnel` skill and connect only through
`127.0.0.1:55432`. The working WSL key is `~/.ssh/hetzner-vps`; its Windows
source is `D:\VPS\new_hetzner_keys_ssh\id_ed25519`.

In one WSL terminal, start the tunnel and keep that terminal open:

```bash
ssh -N \
  -o ConnectTimeout=10 \
  -o IdentitiesOnly=yes \
  -o ExitOnForwardFailure=yes \
  -o PreferredAuthentications=publickey \
  -i ~/.ssh/hetzner-vps \
  -L 127.0.0.1:55432:172.18.0.2:5432 \
  root@178.156.159.183
```

A successful `ssh -N` session stays silent and occupies the terminal. In a
second WSL terminal, verify the listener:

```bash
ss -ltn '( sport = :55432 )'
pg_isready -h 127.0.0.1 -p 55432 -U postgres -d phaser_june
```

Agents then use the credential-safe helper shipped with the skill:

```bash
node "$HOME/.agents/skills/postgres-tunnel/scripts/psql-tunnel.mjs" \
  -c 'SELECT current_database(), current_user;'
```

The helper preserves the database/user from `DATABASE_URL`, overrides the host
and port to `127.0.0.1:55432`, and disables database TLS only for this local
forward. The SSH channel encrypts traffic to the server. Never apply
`sslmode=disable` to public port 6432.

### Port 22 timeout

If SSH remains silent but `ss` shows no listener, check whether the connection
is still `SYN-SENT`:

```bash
ss -tnp
```

A common cause is a changed public IPv4 no longer matching the Hetzner
Firewall's TCP/22 allowlist. Find the current egress address, then add only that
address as a `/32` source. Never open SSH to all IPv4/IPv6.

```bash
curl -4 https://ifconfig.me/ip
```

Restart the SSH command after changing the rule. A timeout can also indicate a
routing problem or unavailable host, so confirm the listener rather than
assuming silence means success.

## Windows/QGIS

Windows/QGIS uses its own Windows-local tunnel on port 5433. WSL agents must
not use it, and Windows `127.0.0.1` listeners should not be assumed reachable
from WSL.

## Related

- `AGENTS.md` — authoritative agent policy
- `docs/DATABASE_USER_GUIDE.md` — tables, Drizzle queries, TiTiler
- `docs/DATABASE_ER_PLAY_PATH.md` — ER diagram and play-path fields
- `docs/DRIZZLE_VERCEL_MIGRATION.md` — Vercel and PgBouncer runtime
- [PostgreSQL 17 `psql`](https://www.postgresql.org/docs/17/app-psql.html)
- [PostgreSQL 17 libpq connections](https://www.postgresql.org/docs/17/libpq-connect.html)
- [PostgreSQL SSH tunnels](https://www.postgresql.org/docs/17/ssh-tunnels.html)
- [PgBouncer configuration](https://github.com/pgbouncer/pgbouncer/blob/master/doc/config.md)
