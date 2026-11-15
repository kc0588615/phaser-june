# Deploying Critter Connect on the VPS

The game runs on the Hetzner server in Docker, next to its database, and `deploy/deploy.sh` deploys it ([Start and update](#start-and-update)). Steps marked **owner** need the server or a password.

## What runs where

| Service | From | Reachable |
|---|---|---|
| `db` (PostGIS 17) | `/opt/postgis/docker-compose.yml` (compose project `postgis`, the server's copy of the repo's `docker-compose.yml`; see the file's header) | internal network only |
| `pgbouncer` (TLS, port 6432) | `/opt/postgis/docker-compose.yml` | public, for dev machines, the Oracle VPS's agents and CI's `e2e` job. QGIS uses its own tunnel ([database access](DATABASE_ACCESS.md#windowsqgis)) |
| `app` (Next.js, `Dockerfile`) | `deploy/docker-compose.app.yml` | internal, port 8080 |
| `caddy` (HTTPS: the game at `APP_DOMAIN`, the website at `critterconnect.org`, `www` redirects to it) | `deploy/docker-compose.app.yml`, image built from `Dockerfile` stage `caddy` | public, ports 80 and 443 |

Two Compose projects run there: `critter` (`critter-app`, `caddy`) from `/opt/critter-connect/deploy/docker-compose.app.yml`, and `postgis` (`postgis`, `pgbouncer`) from `/opt/postgis/docker-compose.yml`. The app joins the database stack's `postgis_backend` network and reaches Postgres as `db`, so deploying the app never restarts the database.

## One-time setup

1. **Owner. DNS:** an A record for the app domain (for example `play.critterconnect.org`) pointing to the VPS.
2. **Database role.** `deploy/db/app-role.sql` gives the app its own role, `critter_app`, with only the grants the running app needs. It was applied on 2026-09-25, without a login. **Owner:** give it a password, in psql so the password stays out of shell history:

   ```sh
   docker exec -it postgis psql -U postgres -d phaser_june
   ALTER ROLE critter_app LOGIN;
   \password critter_app
   ```

3. **Owner. Settings on the VPS** (repo checked out at `/opt/critter-connect`):
   - `.env` (app stack, `/opt/critter-connect/.env`): `APP_DOMAIN`.
   - `deploy/app.env` (runtime): copy `deploy/app.env.example` and fill in `DATABASE_URL` (the `critter_app` password). `chmod 600 deploy/app.env`.
4. **Ports 80 and 443.** Caddy needs them to get and renew its certificate. If certbot renews the PgBouncer certificate in standalone mode on port 80, add hooks so it doesn't collide with Caddy: `--pre-hook "docker stop caddy" --post-hook "docker start caddy"` in `/etc/letsencrypt/renewal/<DB_DOMAIN>.conf`.

## Start and update

After pushing `main`: `npm run deploy` (`deploy/deploy.sh`), from WSL or from the Oracle VPS (`deploy critter-connect`, which runs this script from a clean copy of `origin/main`). SSH uses a no-passphrase deploy key, `~/.ssh/critter-deploy`, named in `~/.ssh/config`, so nobody has to unlock anything. It refuses if local `main` has unpushed commits or the VPS checkout isn't on `main`, then pulls, rebuilds, keeps the images it is about to replace as `:previous` when they had passed every check, waits for `critter-app` to be healthy, checks that `caddy` has the website's files, removes untagged images and build cache unused for 7 days (a failure there only warns), runs `deploy/check.sh` (see [The website](#the-website)) and, once that passes, tags the live images `:verified` (a failure there only warns too); any other failure fails the deploy. By hand on the VPS:

```sh
cd /opt/critter-connect
git pull
docker compose -f deploy/docker-compose.app.yml --project-directory . up -d --build
docker compose -f deploy/docker-compose.app.yml --project-directory . ps     # app healthy
curl -fsS https://$APP_DOMAIN/api/places/ > /dev/null && echo ok
```

Roll back with `git revert <commit>` on `main` (`-m 1` for a merge), push, then `npm run deploy` or `deploy critter-connect`: `git checkout <commit>` on the server would leave a detached checkout, which `deploy.sh` refuses. A mission whose deploy fails reverts the same way. When no deploy can run, put back `critter-app:previous`, the last image that passed every check before the live one (failed deploys don't replace it), in `/opt/critter-connect`: `docker tag critter-app:previous critter-app && docker compose -f deploy/docker-compose.app.yml --project-directory . up -d --no-build app` (and likewise `critter-caddy:previous` with service `caddy`, whose tag comes from the last deploy that changed the Caddyfile or the website). Only an image a passing `deploy/check.sh` tagged `:verified` can become `:previous`, so `:previous` exists only from the deploy after the first one whose check passed; until then there is no image to put back, and `git revert` plus a deploy is the only rollback. These commands were checked with `--help` only and haven't been tried. A content change goes live with the owner's content build (`npm run content -- build`), which updates the database the app reads live; a change that cites a new page also needs this deploy first (Release order in [`docs/CONTENT_SOURCES.md#citations`](CONTENT_SOURCES.md#citations)).

## The website

critterconnect.org is a static site (plan 051): `src/site/` rendered to HTML by `npm run site:build` into `out/site/` (no Next or other framework script). Preview with `npm run site:serve` (http://localhost:3101), test with `npm run e2e:site`.

- **Image.** The `Dockerfile`'s `site` stage builds it, and the `caddy` stage copies `deploy/Caddyfile` and the files (to `/srv/site`) into Caddy's image. A deploy rebuilds that image, and `up -d` recreates `caddy` only when the Caddyfile or the site changed. Nothing is bind-mounted: edit the Caddyfile in the repo and deploy.
- **Hosts** (`deploy/Caddyfile`):

  | Host | Serves |
  |---|---|
  | `APP_DOMAIN` (`play.critterconnect.org`) | the game only; no website pages, so its old `/privacy/` and `/terms/` are the game's 404 |
  | `critterconnect.org` | the site's pages, `/site/*` (hashed, cached for a year), the 404 page; the game's old paths (`/explore*`, `/login*`, `/clue-match*`, `/api/*`) 308 to `APP_DOMAIN` |
  | `www.critterconnect.org` | 308 to the apex |

- **DNS** (Namecheap): `@` A and `www` (CNAME to the apex, or A) point at this VPS, like `play`. Caddy gets each host's certificate once its DNS points here.
- **Which commit is live:** `curl https://play.critterconnect.org/version.txt`. `deploy.sh` stamps the commit into the image as it builds, and `check.sh` fails the deploy unless the live game reports it. A failed build leaves the old stamp in place, so this stays true where `git log` on the server wouldn't. An image built by hand with `docker compose` says `unknown`.
- **`deploy/check.sh`** checks all three hosts on every run and prints `OK` or `BAD` per line; it exits 1 on any `BAD`. play.: the game's routes 200, `/privacy/`, `/terms/` and `/teachers/` 404. The apex and www: the pages with their canonical and no `<script src`, every `/site/` file with its type, `robots.txt`, `sitemap.xml`, the 404 page, the 308s. Last, the board check: `scripts/check-live-board.mjs` opens `https://play.critterconnect.org/explore/?seed=1` in headless Chrome on a phone-sized screen, and passes once the board's canvas and the round's animals show, with no error alert and no failed or failing script from play. (up to 3 tries). Chrome comes from `CHROME_PATH`, default `/usr/bin/google-chrome`; on the Oracle VPS, `~/.local/bin/chrome-nosandbox` when `CHROME_PATH` is unset. A deploy from a machine with neither fails at that check, and its `BAD` line says the deploy is live. `deploy.sh` runs it after every deploy. A TLS failure means the certificate isn't issued yet: wait a few minutes or `docker restart caddy`, then rerun.
- **The game's styles stay the game's.** The site's cc addition (`--space-xxxl`) lives in `src/site/site.css`, never in `globals.css` (its primary-fill override went when the game's WCAG pass darkened `--color-1`, 2026-11-01).
- **Legal pages** (`/privacy/`, `/terms/`) exist only on the site; CI's "No game links to site pages" step fails on a play.-relative link to them or to `/teachers/` from `src/` outside `src/site/`.

## Backups

- Content (animal profiles and sources) lives in git, `db/content/`. `npm run content -- build` rebuilds those tables from it.
- Everything else (GIS layers, views) is covered by `deploy/backup/pg-backup.sh`. It runs `pg_dump` inside the `postgis` container (so its version matches the server), checks that the dump reads back, and keeps 14 daily and 8 weekly dumps in `/var/backups/critter-connect`. The whole database is about 120 MB.
- **Owner. Install it** (as root on the VPS):

  ```sh
  echo '15 3 * * * root /opt/critter-connect/deploy/backup/pg-backup.sh >> /var/log/critter-backup.log 2>&1' > /etc/cron.d/critter-backup
  /opt/critter-connect/deploy/backup/pg-backup.sh    # run once now
  ```

  Set `OFFSITE=u123456@u123456.your-storagebox.de:critter` (Hetzner Storage Box over SSH) in the cron line to copy each night's set off the server.
- **Off the server:** the Oracle VPS's `/srv/critter-ai/ops/bin/game-backup-pull` (its crontab, 04:30 UTC) copies the newest daily dump, checks its sha256 against the server's, and keeps the newest 3 in `/srv/critter-ai/agent-state/game-backups/` (mode 700: real player data). It is the one copy off the server on record; whether `OFFSITE` is set in Hetzner's cron line is not confirmed.
- **Restore drill** (on a scratch database first):

  ```sh
  docker exec postgis createdb -U postgres restore_check
  docker exec -i postgis pg_restore -U postgres -d restore_check < /var/backups/critter-connect/daily/<file>.dump
  docker exec postgis psql -U postgres -d restore_check -c "SELECT count(*) FROM species"
  docker exec postgis dropdb -U postgres restore_check
  ```

  For a real restore, add `--clean --if-exists -d phaser_june`.

## Rebuild from nothing

Written 2026-11-15 from the repo's files; not tried on a scratch server. Each step links the section with the detail.

1. **Server:** Docker and its compose plugin; a 2 GB `/swapfile` in fstab, for the Next build; SSH with keys only and `unattended-upgrades` ([Hardening status](#hardening-status-2026-09-26)); UFW allowing 22, 80, 443 and 6432; the Hetzner Cloud firewall allowing 22 (also from the Oracle VPS, `170.9.239.99`), 80, 443 over IPv4 and IPv6, and 6432.
2. **DNS:** `play`, the apex and `www` ([The website](#the-website)), and `DB_DOMAIN` (`.env.vps.example`), pointed at the new server.
3. **Deploy keys:** the public halves of `~/.ssh/critter-deploy` (WSL and the Oracle VPS) in root's `authorized_keys`, then `ssh-keygen -R play.critterconnect.org` on both machines, which would refuse the new host key.
4. **PgBouncer's certificate:** `certbot certonly --standalone -d <DB_DOMAIN>` before Caddy holds port 80, then [setup step 4](#one-time-setup)'s hooks.
   - PgBouncer must read `fullchain.pem` and `privkey.pem` as real, readable files at `/etc/pgbouncer/certs`, and be restarted after each renewal.
   - The repo's mount of `live/<DB_DOMAIN>` alone gives neither (its files are symlinks into root-only `archive/`), so do what the server's copy does (not confirmed: see the header of `docker-compose.yml`).
5. **Database stack:** a folder named `/opt/postgis` (the name makes the `postgis_backend` network `deploy/docker-compose.app.yml` joins) with the repo's `docker-compose.yml`, `init/`, and `.env.vps.example` filled in as `.env`. `PGDATA_PATH` must exist and be writable by UID 999. Then `docker compose up -d` there.
6. **Restore:** in psql as `postgres`, `CREATE ROLE critter_app NOLOGIN;` (the dump holds no roles, and `critter_app` is the only one it grants to). Then `pg_restore` the newest dump into `phaser_june` as the [restore drill](#backups) does, from `/var/backups/critter-connect` or the Oracle VPS's copy. Then `deploy/db/app-role.sql`, then the password as in [setup step 2](#one-time-setup).
7. **The scrubbed copy `phaser_june_dev`** (not in the dump), in this order:
   1. [The runbook](DATABASE_ACCESS.md#runbook)'s steps 1 and 2. `dev-role.sql` creates `critter_dev` without a login and closes `phaser_june` to PUBLIC, which the restore left open (no database-level grants without `--create`).
   2. In psql as `postgres`: `ALTER ROLE critter_dev LOGIN;` then `\password critter_dev`. Last, so the role never logs in while prod is open.
   3. The password into both copies: the Oracle VPS's dev-copy file and CI's `E2E_DATABASE_URL` ([database access](DATABASE_ACCESS.md#agents-on-the-oracle-vps)).
   4. The runbook's step 4 checks; CI's next `e2e` run proves the secret. Its step 3 is already in the repo's `docker-compose.yml`.
8. **The app:** clone the repo to `/opt/critter-connect` on `main`, write `.env` and `deploy/app.env` ([setup step 3](#one-time-setup)), then deploy ([Start and update](#start-and-update)). On a first deploy there are no containers for `:previous`, and the passing check tags the first `:verified` images.
9. **Backups:** the cron line ([Backups](#backups)).

## Hardening status (2026-09-26)

Owner reports, not re-tested by an agent; each row is from 2026-09-26 unless it gives another date.

| Area | Reported state |
|---|---|
| PostgreSQL password | Rotated to a random value, never printed. Root-only server copy: `/root/postgres-password.txt`; local app copy: `DATABASE_URL` in `.env.local`. Agents continue using `DATABASE_URL`. |
| Server configuration | Updated `/opt/postgis/.env` and the hardcoded password in the server's `docker-compose.yml`. Restarted `pgbouncer` (and a database MCP service, since removed: owner, 2026-11-14); did not restart `postgis`. The repository Compose file uses environment substitution. |
| Database tests | PgBouncer accepted the new password and rejected a wrong one; the app connection read 50 species. |
| SSH | `/etc/ssh/sshd_config.d/00-hardening.conf` disables password login; root uses keys only. Fresh key login succeeded; password login was refused. |
| Host firewall | UFW enabled; ports 22, 80, 443 and 6432 allowed. 6432 is Docker-published, so it bypasses UFW (public by design). Provider-firewall state was not included in the handoff. |
| Updates | `unattended-upgrades` is active; `fail2ban` is not installed and won't be, because SSH takes keys only (owner, 2026-11-14). |
| Rotation backups | Server config backups: `/opt/postgis/*.bak-20260926-165109`. Old `.env.local`: prior session scratchpad. These contain old credentials; keep them private. |

### Remaining owner tasks

1. Update QGIS's saved database password from `.env.local` (see [database access](DATABASE_ACCESS.md#windowsqgis)).
2. Change the exposed SSH key passphrase interactively: `ssh-keygen -p -f ~/.ssh/hetzner-vps`. Also update the Windows key copy at `D:\VPS\new_hetzner_keys_ssh\id_ed25519`, then delete `hetzner ssh key passphrase.txt`. Keep passphrases out of chat and command arguments.
