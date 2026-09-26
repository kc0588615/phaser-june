# Deploying Critter Connect on the VPS

Today the app runs as `npm run dev` in WSL against the Hetzner database. This is the path to serving it from the VPS, next to the database, over HTTPS. Steps marked **owner** need the server, a password or the Clerk dashboard.

## What runs where

| Service | From | Reachable |
|---|---|---|
| `db` (PostGIS 17) | `/opt/postgis/docker-compose.yml` (server copy of `docker-compose.yml`, plus `postgres-mcp`) | internal network only |
| `pgbouncer` (TLS, port 6432) | `/opt/postgis/docker-compose.yml` | public, for dev machines and QGIS |
| `app` (Next.js, `Dockerfile`) | `deploy/docker-compose.app.yml` | internal, port 8080 |
| `caddy` (HTTPS for `APP_DOMAIN`) | `deploy/docker-compose.app.yml` | public, ports 80 and 443 |

The app is its own Compose project (`critter`, in `/opt/critter-connect`). It joins the database stack's `postgis_backend` network and reaches Postgres as `db`, so deploying the app never restarts the database.

## One-time setup

1. **Owner. DNS:** an A record for the app domain (for example `play.critterconnect.org`) pointing to the VPS.
2. **Owner. Clerk production instance:** create it in the Clerk dashboard, add the domain and the DNS records Clerk lists, and set the sign-in URL to `/login`. Copy the `pk_live_...` and `sk_live_...` keys. The development keys in `.env.local` stop working on a real domain and have strict limits.
3. **Database role.** `deploy/db/app-role.sql` gives the app its own role, `critter_app`, with only the grants the running app needs. It was applied on 2026-09-25, without a login. **Owner:** give it a password, in psql so the password stays out of shell history:

   ```sh
   docker exec -it postgis psql -U postgres -d phaser_june
   ALTER ROLE critter_app LOGIN;
   \password critter_app
   ```

4. **Owner. Settings on the VPS** (repo checked out at `/opt/critter-connect`):
   - `.env` (app stack, `/opt/critter-connect/.env`): `APP_DOMAIN` and the build-time `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_TITILER_BASE_URL` and `NEXT_PUBLIC_COG_URL`.
   - `deploy/app.env` (runtime): copy `deploy/app.env.example` and fill in `DATABASE_URL` (the `critter_app` password), `CLERK_SECRET_KEY` and the public values. `chmod 600 deploy/app.env`.
5. **Ports 80 and 443.** Caddy needs them to get and renew its certificate. If certbot renews the PgBouncer certificate in standalone mode on port 80, add hooks so it doesn't collide with Caddy: `--pre-hook "docker stop caddy" --post-hook "docker start caddy"` in `/etc/letsencrypt/renewal/<DB_DOMAIN>.conf`.

## Start and update

```sh
cd /opt/critter-connect
git pull
docker compose -f deploy/docker-compose.app.yml --project-directory . up -d --build
docker compose -f deploy/docker-compose.app.yml --project-directory . ps     # app healthy
curl -fsS https://$APP_DOMAIN/api/places/ > /dev/null && echo ok
```

Roll back with `git checkout <previous commit>` and the same `up -d --build`. Content changes don't need a redeploy: `npm run content -- build` from a dev machine updates the database, which the app reads live.

## Backups

- Content (animal profiles and sources) lives in git, `db/content/`. `npm run content -- build` rebuilds those tables from it.
- Everything else (player profiles, solves, GIS layers, views) is covered by `deploy/backup/pg-backup.sh`. It runs `pg_dump` inside the `postgis` container (so its version matches the server), checks that the dump reads back, and keeps 14 daily and 8 weekly dumps in `/var/backups/critter-connect`. The whole database is about 120 MB.
- **Owner. Install it** (as root on the VPS):

  ```sh
  echo '15 3 * * * root /opt/critter-connect/deploy/backup/pg-backup.sh >> /var/log/critter-backup.log 2>&1' > /etc/cron.d/critter-backup
  /opt/critter-connect/deploy/backup/pg-backup.sh    # run once now
  ```

  Set `OFFSITE=u123456@u123456.your-storagebox.de:critter` (Hetzner Storage Box over SSH) in the cron line to copy each night's set off the server.
- **Restore drill** (on a scratch database first):

  ```sh
  docker exec postgis createdb -U postgres restore_check
  docker exec -i postgis pg_restore -U postgres -d restore_check < /var/backups/critter-connect/daily/<file>.dump
  docker exec postgis psql -U postgres -d restore_check -c "SELECT count(*) FROM clue_match_solves"
  docker exec postgis dropdb -U postgres restore_check
  ```

  For a real restore, add `--clean --if-exists -d phaser_june`.

## Hardening status (2026-09-26)

Owner-reported state and tests; not independently re-tested during this documentation update.

| Area | Reported state |
|---|---|
| PostgreSQL password | Rotated to a random value, never printed. Root-only server copy: `/root/postgres-password.txt`; local app copy: `DATABASE_URL` in `.env.local`. Agents continue using `DATABASE_URL`. |
| Server configuration | Updated `/opt/postgis/.env` and the hardcoded password in the server's `docker-compose.yml`. Restarted `pgbouncer` and `postgres-mcp`; did not restart `postgis`. The repository Compose file uses environment substitution and does not define `postgres-mcp`. |
| Database tests | PgBouncer accepted the new password and rejected a wrong one; the app connection read 50 species. |
| SSH | `/etc/ssh/sshd_config.d/00-hardening.conf` disables password login; root uses keys only. Fresh key login succeeded; password login was refused. |
| Host firewall | UFW enabled; ports 22, 80, 443 and 6432 allowed. Port 8000 (`postgres-mcp`, host network, no Docker DNAT) allows only the owner's home IP; verified 2026-09-26 via iptables. 6432 is Docker-published, so it bypasses UFW (public by design). Provider-firewall state was not included in the handoff. |
| Rotation backups | Server config backups: `/opt/postgis/*.bak-20260926-165109`. Old `.env.local`: prior session scratchpad. These contain old credentials; keep them private. |

### Port 8000 verification outstanding

The existing `postgres-mcp` service was reported to expose superuser SQL publicly
before hardening. **A UFW rule alone does not prove it is now restricted:**
[Docker-published container ports can bypass UFW](https://docs.docker.com/engine/network/packet-filtering-firewalls/#docker-and-ufw).
Inspect the live container's port binding/network mode and effective firewall
rules, then verify access from the allowed IP and rejection from another IP
(including IPv6 if exposed). The repository lacks this service's configuration.

If the home IP changes, replace the old source allowance with the new IP in the
effective firewall. The reported UFW addition is
`ufw allow from <new-ip> to any port 8000 proto tcp`; remove the obsolete allowance
after testing. WSL agents continue using the SSH tunnel on local port 55432;
port 8000 is not their database route.

### Remaining owner tasks

1. Update QGIS's saved database password from `.env.local` (see [database access](DATABASE_ACCESS.md#windowsqgis)).
2. Change the exposed SSH key passphrase interactively: `ssh-keygen -p -f ~/.ssh/hetzner-vps`. Also update the Windows key copy at `D:\VPS\new_hetzner_keys_ssh\id_ed25519`, then delete `hetzner ssh key passphrase.txt`. Keep passphrases out of chat and command arguments.
3. Remove obsolete password-bearing entries from `~/.codex/rules/default.rules` and old session logs/scratchpad. Preserve unrelated rules; the old database password is no longer valid.
4. Open TCP 443 in the Hetzner Cloud firewall (see first deploy below). Until then the site is unreachable over HTTPS from outside.
5. `unattended-upgrades` and `fail2ban` installation remains unconfirmed by this handoff.

## First deploy (2026-09-26)

Ran `deploy-vps.sh` (steps above) from WSL.

| Step | Result |
|---|---|
| Checkout | `/opt/critter-connect` at `e43d1264` |
| `critter_app` | LOGIN with a random password, only in `deploy/app.env` (mode 600); login from `postgis_backend` read 50 species |
| Settings | `.env` and `deploy/app.env` written from Clerk live keys (sent over stdin, temp copy deleted) |
| certbot | `pre_hook = docker stop caddy`, `post_hook = docker start caddy` added to the renewal config |
| Swap | 2 GB `/swapfile` added (in fstab) for the Next build |
| Stack | Compose project `critter`: `critter-app` healthy, `caddy` up; Let's Encrypt cert for play.critterconnect.org issued |
| Backups | `/etc/cron.d/critter-backup` installed; first dump written (90 MB) |
| HTTPS from outside | **Blocked.** Port 80 answers from outside (308 to HTTPS), 443 times out from outside, but works on the server (200 via the public name). UFW and Docker allow 443, so a Hetzner Cloud firewall is most likely missing a 443 rule. Add an inbound TCP 443 rule (IPv4 + IPv6) in Hetzner Console → Firewalls. |
