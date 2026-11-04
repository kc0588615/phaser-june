#!/usr/bin/env bash
# Deploy origin/main to the VPS: pull, rebuild the app and caddy containers, wait for healthy, check the live hosts.
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
REMOTE

# What the server just built: check.sh fails unless the live game reports this commit.
EXPECT_COMMIT=$(ssh -o BatchMode=yes "$HOST" git -C /opt/critter-connect rev-parse HEAD)
export EXPECT_COMMIT
# play. now, the apex and www once DNS points here (they SKIP until then).
bash "$(dirname "$0")/check.sh"
