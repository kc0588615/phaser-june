#!/usr/bin/env bash
# Deploy origin/main to the VPS: pull, rebuild the app container, wait for healthy, check the live routes.
# Usage: npm run deploy   (push first; env DEPLOY_HOST, default root@play.critterconnect.org)
set -euo pipefail
DOMAIN=play.critterconnect.org
HOST=${DEPLOY_HOST:-root@$DOMAIN}
export SSH_AUTH_SOCK=${SSH_AUTH_SOCK:-$HOME/.ssh/agent.sock}

if ! ssh-add -l >/dev/null 2>&1; then
  echo "No SSH key loaded (agent $SSH_AUTH_SOCK). The VPS key has a passphrase; the owner loads it in their own terminal:" >&2
  echo "  rm -f ~/.ssh/agent.sock; eval \"\$(ssh-agent -a ~/.ssh/agent.sock)\"; ssh-add ~/.ssh/hetzner-vps" >&2
  exit 1
fi

git fetch -q origin main
if [ "$(git rev-parse main)" != "$(git rev-parse origin/main)" ]; then
  echo "Local main differs from origin/main; push (or pull) first. The VPS deploys origin/main." >&2
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
REMOTE

for route in / /explore/ /api/places/ /api/clue-game/pool/; do
  echo "$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "https://$DOMAIN$route") $route"
done
