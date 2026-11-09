#!/usr/bin/env bash
# Show where caddy_symfony keeps its Caddyfile and how to add eventcater.pl.
set -euo pipefail

APP_ROOT="${APP_ROOT:-/home/marcin/apps/eventcater}"
SNIPPET="${APP_ROOT}/frontend/deploy/caddy/eventcater.pl.caddy"
CADDY_NAME="${CADDY_CONTAINER:-caddy_symfony}"
GW="$(docker network inspect bridge --format '{{(index .IPAM.Config 0).Gateway}}' 2>/dev/null || echo '172.17.0.1')"

if ! docker ps --format '{{.Names}}' | grep -qx "${CADDY_NAME}"; then
  echo "!! Kontener ${CADDY_NAME} nie działa." >&2
  docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
  exit 1
fi

echo "==> Mounts kontenera ${CADDY_NAME}:"
docker inspect "${CADDY_NAME}" --format '{{range .Mounts}}{{.Type}} {{.Source}} -> {{.Destination}}{{println}}{{end}}'

echo "==> Szukam Caddyfile w kontenerze:"
for p in /etc/caddy/Caddyfile /Caddyfile /config/Caddyfile /data/Caddyfile; do
  if docker exec "${CADDY_NAME}" test -f "${p}" 2>/dev/null; then
    echo "--- ${p} ---"
    docker exec "${CADDY_NAME}" cat "${p}"
    echo "--- koniec ${p} ---"
  fi
done

echo
echo "==> Bramka Dockera (użyj w reverse_proxy): ${GW}"
echo "==> Fragment EventCater: ${SNIPPET}"
if [[ -f "${SNIPPET}" ]]; then
  sed "s/172\\.17\\.0\\.1/${GW}/g" "${SNIPPET}"
fi

cat <<EOF

Jak dodać:
  1) Znajdź plik źródłowy Caddyfile na hoście (kolumna Source powyżej).
  2) Dopisz blok eventcater.pl (podstaw ${GW} jeśli inna niż 172.17.0.1).
  3) Przeładuj Caddy:
       docker exec ${CADDY_NAME} caddy reload --config /etc/caddy/Caddyfile
     albo:
       docker restart ${CADDY_NAME}
  4) DNS A @ i www → IP dropleta w home.pl
  5) Test:
       curl -sS -o /dev/null -w '%{http_code}\\n' -H 'Host: eventcater.pl' http://127.0.0.1/
       curl -sS -o /dev/null -w '%{http_code}\\n' http://127.0.0.1:3010/
EOF
