#!/usr/bin/env bash
# Deploy origin/main to the VPS: pull, rebuild the app and caddy images, keep the last good ones as :previous, restart, wait for healthy, clean up old images and cache, check the live hosts and the board, then mark the live images :verified.
# Usage: npm run deploy   (push first; env DEPLOY_HOST, default root@play.critterconnect.org)
# SSH uses ~/.ssh/critter-deploy (no passphrase, set in ~/.ssh/config), so no one has to unlock anything.
set -euo pipefail
DOMAIN=play.critterconnect.org
HOST=${DEPLOY_HOST:-root@$DOMAIN}
export SSH_AUTH_SOCK=${SSH_AUTH_SOCK:-$HOME/.ssh/agent.sock}

if ! ssh -o BatchMode=yes -o ConnectTimeout=15 "$HOST" true; then
  echo "Can't reach $HOST over SSH. Agents need ~/.ssh/critter-deploy and a Host entry in ~/.ssh/config (docs/DEPLOY.md)." >&2
  exit 1
fi

git fetch -q origin main
# The VPS deploys origin/main, so a local main that is behind (or a dirty tree) doesn't matter. Only unpushed commits would be left out.
if [ -n "$(git rev-list origin/main..main 2>/dev/null)" ]; then
  echo "Local main has commits that aren't on origin/main; push them first. The VPS deploys origin/main." >&2
  exit 1
fi

ssh -o BatchMode=yes -o ServerAliveInterval=30 "$HOST" bash -s <<'REMOTE'
set -euo pipefail
cd /opt/critter-connect
branch=$(git branch --show-current)
if [ "$branch" != main ]; then
  echo "VPS checkout is on '$branch', not main. Check why, then: git -C /opt/critter-connect checkout main" >&2
  exit 1
fi
git pull -q --ff-only origin main
echo "deploying $(git log --oneline -1)"
export GIT_COMMIT=$(git rev-parse HEAD)
compose="docker compose -f deploy/docker-compose.app.yml --project-directory ."
$compose build -q
# keep_previous <container>: before up replaces the image <container> runs, keep that image as <image>:previous (the
# hand rollback, docs/DEPLOY.md) if it is the last one that passed every check (<image>:verified, tagged at the end of
# deploy.sh) and it is up (healthy, or running if it has no health check). Otherwise the old :previous stays, so failed
# deploys can't push the last good image out. No container (a first deploy) or a same-commit redeploy changes nothing;
# a failed build never gets here (set -e). No :verified yet (only a passing check.sh tags one): the old :previous stays.
keep_previous() {
  local state old name
  state=$(docker inspect "$1" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null) || return 0
  case $state in healthy|running) ;; *) echo "$1 is $state: its :previous stays"; return 0 ;; esac
  old=$(docker inspect "$1" --format '{{.Image}}')
  name=$(docker inspect "$1" --format '{{.Config.Image}}'); name=${name%:*}
  [ "$old" != "$(docker image inspect "$name" --format '{{.Id}}')" ] || return 0
  if [ "$old" != "$(docker image inspect "$name:verified" --format '{{.Id}}' 2>/dev/null)" ]; then
    echo "$1 runs ${old:7:12}, which never passed deploy/check.sh: $name:previous stays"; return 0
  fi
  docker tag "$old" "$name:previous"
  echo "$name:previous is ${old:7:12}"
}
keep_previous critter-app
keep_previous caddy
$compose up -d
for _ in $(seq 1 30); do
  status=$(docker inspect critter-app --format '{{.State.Health.Status}}')
  [ "$status" = healthy ] && break
  sleep 5
done
echo "critter-app: $status"
[ "$status" = healthy ]
# The website's files live in the caddy image (plan 051 §10): fail if the running caddy predates them.
docker exec caddy test -f /srv/site/index.html || { echo "caddy has no /srv/site/index.html: is the caddy image built from this checkout?" >&2; exit 1; }
# Housekeeping, now that the new version is live, so a failure only warns. Untagged images only: never -a, which would
# take the :previous and :verified images and the base images. Build cache unused for 7 days: recent npm ci layers stay.
tidy() { "$@" || echo "warning: $* failed (ignored)" >&2 || true; }
tidy docker image prune -f
tidy docker builder prune -af --filter until=168h
tidy df -h /
tidy docker system df
REMOTE

# What the server just built and the images it runs, read in one call before the checks: check.sh fails unless the
# live game reports this commit, and only these two images can be tagged :verified after it passes.
live=$(ssh -o BatchMode=yes "$HOST" 'git -C /opt/critter-connect rev-parse HEAD && docker inspect critter-app caddy --format "{{.Image}}"')
mapfile -t ids <<<"$live"
# ssh re-parses the ids as shell words on the server below, so only these exact shapes may pass.
if [ "${#ids[@]}" -ne 3 ] || ! [[ ${ids[0]} =~ ^[0-9a-f]{40}$ && ${ids[1]} =~ ^sha256:[0-9a-f]{64}$ && ${ids[2]} =~ ^sha256:[0-9a-f]{64}$ ]]; then
  echo "Expected the server's commit and the critter-app and caddy image ids, one per line; got:" >&2
  echo "$live" >&2
  exit 1
fi
EXPECT_COMMIT=${ids[0]}
export EXPECT_COMMIT
# All three hosts, then the board check: a browser opens the live game (needs node and Chrome, docs/DEPLOY.md).
bash "$(dirname "$0")/check.sh"
# Every check passed (set -e ends the deploy at check.sh otherwise): tag the images read before the check
# <image>:verified, the mark keep_previous reads on the next deploy, if their containers still run them (an
# overlapping deploy may have replaced one; deploys take no lock). The deploy is live and checked by now, so a failure
# here only warns.
ssh -o BatchMode=yes "$HOST" bash -s -- "${ids[1]}" "${ids[2]}" <<'VERIFIED' || echo "warning: the live images weren't tagged :verified; the next deploy keeps today's :previous" >&2
set -euo pipefail
app_id=$1 caddy_id=$2
tag_verified() {  # <container> <the image id it ran before check.sh>
  local name
  if [ "$(docker inspect "$1" --format '{{.Image}}')" != "$2" ]; then
    echo "warning: $1 changed during the check (another deploy?): not tagged" >&2; return 0
  fi
  name=$(docker inspect "$1" --format '{{.Config.Image}}'); name=${name%:*}
  docker tag "$2" "$name:verified"
  echo "$name:verified is ${2:7:12}"
}
tag_verified critter-app "$app_id"
tag_verified caddy "$caddy_id"
VERIFIED
