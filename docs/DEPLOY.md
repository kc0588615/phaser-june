# Deploying Critter Connect on the VPS

Today the app runs as `npm run dev` in WSL against the Hetzner database. This is the path to serving it from the VPS, next to the database, over HTTPS. Steps marked **owner** need the server, a password or the Clerk dashboard.

## What runs where

| Service | From | Reachable |
|---|---|---|
| `db` (PostGIS 17) | `docker-compose.yml` | internal network only |
| `pgbouncer` (TLS, port 6432) | `docker-compose.yml` | public, for dev machines and QGIS |
| `app` (Next.js, `Dockerfile`) | `deploy/docker-compose.app.yml` | internal, port 8080 |
| `caddy` (HTTPS for `APP_DOMAIN`) | `deploy/docker-compose.app.yml` | public, ports 80 and 443 |

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
   - `.env` (stack): the existing `POSTGRES_*`, `PGDATA_PATH` and `DB_DOMAIN`, plus `APP_DOMAIN` and the build-time `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_TITILER_BASE_URL` and `NEXT_PUBLIC_COG_URL`.
   - `deploy/app.env` (runtime): copy `deploy/app.env.example` and fill in `DATABASE_URL` (the `critter_app` password), `CLERK_SECRET_KEY` and the public values. `chmod 600 deploy/app.env`.
5. **Ports 80 and 443.** Caddy needs them to get and renew its certificate. If certbot renews the PgBouncer certificate in standalone mode on port 80, add hooks so it doesn't collide with Caddy: `--pre-hook "docker stop caddy" --post-hook "docker start caddy"` in `/etc/letsencrypt/renewal/<DB_DOMAIN>.conf`.

## Start and update

```sh
cd /opt/critter-connect
git pull
docker compose -f docker-compose.yml -f deploy/docker-compose.app.yml up -d --build
docker compose -f docker-compose.yml -f deploy/docker-compose.app.yml ps     # app healthy
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

## Harden the server (owner)

- SSH keys only: in `/etc/ssh/sshd_config` set `PasswordAuthentication no` and `PermitRootLogin prohibit-password` (better: a sudo user and `PermitRootLogin no`), then `systemctl reload ssh`. Keep a second session open while testing.
- Firewall: `ufw default deny incoming`, then allow 22, 80, 443 and 6432, and `ufw enable`.
- `apt install unattended-upgrades fail2ban`.
- Rotate the `postgres` password if it was ever shared outside the server. After the app uses `critter_app`, only admin tools need the superuser.
