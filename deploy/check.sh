#!/usr/bin/env bash
# Checks the live hosts (plan 051 §10): play. serves the game only, the apex serves the website, www
# redirects to the apex. Prints OK|BAD|SKIP per line and exits 1 on any BAD. Run by deploy/deploy.sh;
# the apex and www are skipped until their DNS points at play.'s server.
# Usage: bash deploy/check.sh [--strict]   (--strict: a SKIP is BAD; run it once DNS has moved)
# Env: PLAY, APEX, WWW override the host names. CHECK_CONNECT=<ip:port> is for a local Caddy test only:
# every request goes there, its local certificate is accepted and the DNS guard is skipped.
set -uo pipefail

PLAY=${PLAY:-play.critterconnect.org}
APEX=${APEX:-critterconnect.org}
WWW=${WWW:-www.critterconnect.org}
# The canonical URLs the site build writes (src/site/config.ts SITE_URL), whatever host serves them.
SITE_URL=https://critterconnect.org
CERT_HINT='certificate not issued yet: wait a few minutes or run docker restart caddy on the VPS, then rerun'

strict=0
case "${1:-}" in
  '') ;;
  --strict) strict=1 ;;
  *) echo "usage: bash deploy/check.sh [--strict]" >&2; exit 2 ;;
esac

curl_opts=(-sS --max-time 30)
[ -n "${CHECK_CONNECT:-}" ] && curl_opts+=(-k --connect-to "::$CHECK_CONNECT")

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
body=$tmp/body
failed=0

ok()   { echo "OK   $1 $2"; }
bad()  { echo "BAD  $1 $2: $3"; failed=1; }
skip() {
  if [ "$strict" = 1 ]; then echo "BAD  $1: $2"; failed=1; else echo "SKIP $1: $2"; fi
}

# fetch <url>: never follows redirects. Sets code (000 on no connection), type, location; the body goes to $body.
fetch() {
  local out
  out=$(curl "${curl_opts[@]}" -o "$body" -w '%{http_code}\n%{content_type}\n%{redirect_url}' "$1" 2>/dev/null)
  curl_exit=$?
  { read -r code; read -r type; read -r location; } <<<"$out"
}

# fetched <url> <expected>: true if the last fetch got an HTTP answer; otherwise reports BAD.
fetched() {
  [ "$code" != 000 ] && return 0
  case $curl_exit in
    35|60) bad "$1" "$2" "$CERT_HINT" ;;
    *) bad "$1" "$2" "no answer (curl exit $curl_exit)" ;;
  esac
  return 1
}

# expect <url> <status> [<text the body must contain>]
expect() {
  local url=$1 want=$2 text=${3:-}
  fetch "$url"
  fetched "$url" "$want" || return 1
  if [ "$code" != "$want" ]; then bad "$url" "$want" "got $code"; return 1; fi
  if [ -n "$text" ] && ! grep -qF -- "$text" "$body"; then bad "$url" "$want" "body lacks $text"; return 1; fi
  ok "$url" "$want${text:+ with $text}"
}

# expect_redirect <url> <exact Location>: a 308, not followed.
expect_redirect() {
  fetch "$1"
  fetched "$1" "308 $2" || return
  if [ "$code" = 308 ] && [ "$location" = "$2" ]; then ok "$1" "308 $2"; else bad "$1" "308 $2" "got $code $location"; fi
}

# expect_page <path>: a site page on the apex, with its canonical, no external scripts, and every /site/ file it uses.
expect_page() {
  local url="https://$APEX$1" assets asset want
  expect "$url" 200 "<link rel=\"canonical\" href=\"$SITE_URL$1\"/>" || return
  if grep -qF '<script src' "$body"; then bad "$url" "no <script src" "found one"; fi
  assets=$(grep -oE '/site/[A-Za-z0-9._-]+' "$body" | sort -u)
  if [ -z "$assets" ]; then bad "$url" "links /site/ files" "none found"; return; fi
  for asset in $assets; do
    case $asset in
      *.css) want=text/css ;;
      *.webp) want=image/webp ;;
      *.png) want=image/png ;;
      *) bad "https://$APEX$asset" "a known type" "unexpected file"; continue ;;
    esac
    fetch "https://$APEX$asset"
    fetched "https://$APEX$asset" "200 $want" || continue
    if [ "$code" = 200 ] && [[ $type == "$want"* ]]; then ok "https://$APEX$asset" "200 $want"
    else bad "https://$APEX$asset" "200 $want" "got $code $type"; fi
  done
}

# moved <host>: true if <host> resolves to play.'s IPv4 (DNS has moved); otherwise prints a SKIP line.
moved() {
  [ -n "${CHECK_CONNECT:-}" ] && return 0
  local ip play_ip
  ip=$(getent ahostsv4 "$1" | awk 'NR == 1 { print $1 }')
  play_ip=$(getent ahostsv4 "$PLAY" | awk 'NR == 1 { print $1 }')
  [ -n "$ip" ] && [ "$ip" = "$play_ip" ] && return 0
  skip "$1" "DNS not moved yet (${ip:-unresolved}, play. is ${play_ip:-unresolved}); check: dig +short $1 @1.1.1.1; a cached answer needs a few minutes or ipconfig /flushdns"
  return 1
}

# play.: the game, and no website pages.
for path in / /explore/ /api/places/ /api/clue-game/pool/; do expect "https://$PLAY$path" 200; done
for path in /privacy/ /terms/ /teachers/; do expect "https://$PLAY$path" 404; done

# The apex: the website, the 404 page, and the game's old paths sent to play.
if moved "$APEX"; then
  for path in / /teachers/ /privacy/ /terms/; do expect_page "$path"; done
  expect "https://$APEX/robots.txt" 200 "Sitemap: $SITE_URL/sitemap.xml"
  expect "https://$APEX/sitemap.xml" 200 "<loc>$SITE_URL/</loc>"
  expect "https://$APEX/nope/" 404 ">This page isn"
  expect_redirect "https://$APEX/explore/?seed=1" "https://$PLAY/explore/?seed=1"
  expect_redirect "https://$APEX/api/places/" "https://$PLAY/api/places/"
fi

if moved "$WWW"; then
  expect_redirect "https://$WWW/teachers/" "https://$APEX/teachers/"
fi

exit "$failed"
