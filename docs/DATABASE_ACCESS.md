# Database Access

> Verified 2026-08-29: the WSL tunnel reached database `phaser_june` as role
> `postgres` on PostgreSQL 17.5. Application traffic uses the public PgBouncer
> endpoint defined by `DATABASE_URL`.

> 2026-09-26 owner handoff: password rotated, SSH keys only, UFW enabled.
> See [hardening status](DEPLOY.md#hardening-status-2026-09-26) for credential
> locations, firewall caveats and remaining tasks. These changes were reported
> by the owner, not independently re-tested during the documentation update.

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
| 22 | Allowed by host UFW; provider firewall separate | Key-only SSH and tunnel transport |
| 8000 | UFW allows only the owner's home IP; host network, so UFW applies (verified 2026-09-26) | Existing server `postgres-mcp`; WSL agents use the SSH tunnel instead |

Repository deployment config sets PgBouncer to **transaction mode**. Do not
depend on connection-wide `SET`, `LISTEN`/`NOTIFY`, session advisory locks, or
session-scoped temporary objects through port 6432. Use the raw tunnel when
server-session affinity matters.

## Choose the route

| Client or task | Route | Tunnel required? |
|---|---|---|
| Next.js, Drizzle | `DATABASE_URL` → port 6432 | No |
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

## Direct PgBouncer access

Use the helper for human `psql` work that is compatible with transaction
pooling:

```bash
./scripts/db                                      # interactive shell
./scripts/db "select count(*) from species;"      # one-off query
./scripts/db -f change.sql                        # stop on first SQL error
./scripts/db -1 -f change.sql                     # one transaction
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
`127.0.0.1:55432`. The working WSL key is `~/.ssh/hetzner-vps`.

In one WSL terminal, start the tunnel and keep that terminal open:

```bash
ssh -N \
  -o ConnectTimeout=10 \
  -o IdentitiesOnly=yes \
  -o ExitOnForwardFailure=yes \
  -o PreferredAuthentications=publickey \
  -i ~/.ssh/hetzner-vps \
  -L 127.0.0.1:55432:172.18.0.2:5432 \
  root@<vps-ip>
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

Check both host UFW and the separate Hetzner Firewall. The 2026-09-26 handoff
reports port 22 allowed by UFW; it does not establish the current provider
firewall rules. If a provider TCP/22 source allowlist is still configured, a
changed public IPv4 may cause a timeout. Update that allowlist with the current
egress address as a `/32` source.

```bash
curl -4 https://ifconfig.me/ip
```

Restart the SSH command after changing the rule. A timeout can also indicate a
routing problem or unavailable host, so confirm the listener rather than
assuming silence means success.

### Stale tunnel

`ss` shows the `ssh` listener on 55432 but `psql` fails with "server closed the
connection unexpectedly" and `pg_isready` says "no response": the SSH session
behind the listener has died (sleep, network change) while its process still
holds the port. The terminal still shows the `ssh -N` command, so it looks
alive. Stop it (Ctrl-C) and start it again; the key asks for its passphrase
each time, and it's up once the prompt goes silent. `ps -o etime -p <pid>` (pid
from `ss -ltnp`) tells a fresh session from an old one.

While the tunnel is down, the repo scripts (`npm run content`, `npm run iucn`)
and `./scripts/db` still work: they use `DATABASE_URL` through PgBouncer.
Content builds, range imports and `REFRESH MATERIALIZED VIEW CONCURRENTLY`
(about 2.5 minutes for `clue_match_places`) all ran that way on 2026-09-29.

## Agents on the Oracle VPS

Agents on the Oracle box use PgBouncer (`db.critterconnect.org:6432`, TLS) with
role `critter_dev` on database `phaser_june_dev`, a copy of prod without
player identities. No tunnel, no `CLUE_USE_TUNNEL`, no `postgres` password
there. E2e and content builds write to the copy, never to prod. Port 55432 and
the `postgres-tunnel` skill are WSL-only. How the VPS itself runs lives in its
ops repo.

`.env.local` there holds only:

```text
DATABASE_URL=postgres://critter_dev:<password>@db.critterconnect.org:6432/phaser_june_dev?sslmode=require
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...   # Clerk dev instance
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=...
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=...
```

The role's login was set 2026-10-18; its password is only in the VPS
`.env.local` (rotate: `\password critter_dev`). The live app connects as
`critter_app` straight to the db container, not through PgBouncer (seen
2026-10-18 from its client address), so a PgBouncer restart doesn't touch it.

### Runbook

Steps 1 and 3 run on the Hetzner host (`pg_dump` 17 lives in the container),
step 2 from WSL through the tunnel. To refresh the copy later, repeat 1–2.

1. Copy prod:

   ```bash
   docker exec postgis dropdb -U postgres --if-exists phaser_june_dev
   docker exec postgis createdb -U postgres phaser_june_dev
   docker exec postgis sh -c 'pg_dump -U postgres phaser_june | psql -q -v ON_ERROR_STOP=1 -U postgres -d phaser_june_dev'
   ```

2. `deploy/db/dev-role.sql`: removes player identities from the copy, hands it
   to `critter_dev`, grants prod's connecting roles explicitly, then closes prod
   to PUBLIC.

   ```bash
   node "$HOME/.agents/skills/postgres-tunnel/scripts/psql-tunnel.mjs" -f deploy/db/dev-role.sql
   ```

3. Once only, PgBouncer: in `/opt/postgis/docker-compose.yml` replace the
   `pgbouncer` service's `DATABASE_URL` with `DATABASE_URLS` as in the repo
   copy (keep the server's host and password), then recreate it; `restart`
   keeps the old config:

   ```bash
   cd /opt/postgis && docker compose up -d pgbouncer
   docker exec pgbouncer grep -A3 '^\[databases\]' /etc/pgbouncer/pgbouncer.ini
   # phaser_june = host=db port=5432 auth_user=postgres
   # phaser_june_dev = host=db port=5432 auth_user=postgres
   ```

4. Checks:

   ```bash
   # live game: 200, and the round loads at https://play.critterconnect.org/explore
   curl -s -o /dev/null -w '%{http_code}\n' https://play.critterconnect.org/api/clue-game/pool/
   # on the Oracle box, from the repo: critter_dev reaches the copy...
   ./scripts/db "select current_database(), current_user, count(*) from species;"
   # ...but not prod (expect: permission denied for database "phaser_june")
   DATABASE_URL=$(sed -n 's#^DATABASE_URL=\(.*\)/phaser_june_dev#\1/phaser_june#p' .env.local) ./scripts/db "select 1;"
   ```

## Windows/QGIS

Windows/QGIS uses its own Windows-local tunnel on port 5433. WSL agents must
not use it, and Windows `127.0.0.1` listeners should not be assumed reachable
from WSL.

The saved QGIS database password still needs updating after the 2026-09-26
rotation. Obtain it privately from `.env.local`'s `DATABASE_URL`; URL-decode
the password component if percent-encoded. See the hardening status for SSH
key passphrase tasks affecting both WSL and Windows copies.

## Related

- `AGENTS.md` — authoritative agent policy
- `db/schema.sql` — the tables and views the app uses
- `docs/DRIZZLE_ORM_GUIDE.md` — Drizzle client and queries
- [PostgreSQL 17 `psql`](https://www.postgresql.org/docs/17/app-psql.html)
- [PostgreSQL 17 libpq connections](https://www.postgresql.org/docs/17/libpq-connect.html)
- [PostgreSQL SSH tunnels](https://www.postgresql.org/docs/17/ssh-tunnels.html)
- [PgBouncer configuration](https://github.com/pgbouncer/pgbouncer/blob/master/doc/config.md)
