#!/usr/bin/env bash
# Nightly backup of the Critter Connect database, run on the VPS by cron
# (docs/DEPLOY.md). pg_dump runs inside the postgis container, so its version
# always matches the server. Keeps 14 daily and 8 weekly dumps, and checks
# that each new dump can be read back.
#   /opt/critter-connect/deploy/backup/pg-backup.sh
# Env: BACKUP_DIR (/var/backups/critter-connect), CONTAINER (postgis),
#      POSTGRES_DB (phaser_june), POSTGRES_USER (postgres), OFFSITE (optional rsync target).
set -euo pipefail

BACKUP_DIR=${BACKUP_DIR:-/var/backups/critter-connect}
CONTAINER=${CONTAINER:-postgis}
DB=${POSTGRES_DB:-phaser_june}
DB_USER=${POSTGRES_USER:-postgres}

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"
chmod 700 "$BACKUP_DIR"
file="$BACKUP_DIR/daily/$DB-$(date -u +%Y-%m-%dT%H%M%SZ).dump"

docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB" --format=custom --compress=6 > "$file.partial"
docker exec -i "$CONTAINER" pg_restore --list < "$file.partial" > /dev/null
mv "$file.partial" "$file"

if [ "$(date -u +%u)" = 7 ]; then cp "$file" "$BACKUP_DIR/weekly/"; fi
find "$BACKUP_DIR/daily" -name '*.dump' -mtime +14 -delete
find "$BACKUP_DIR/weekly" -name '*.dump' -mtime +56 -delete

if [ -n "${OFFSITE:-}" ]; then rsync -a --delete "$BACKUP_DIR/" "$OFFSITE/"; fi
echo "$(date -u +%FT%TZ) backup ok: $file ($(du -h "$file" | cut -f1))"
