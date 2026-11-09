#!/usr/bin/env bash
# Replace any previous eventcater fragments in aestio Caddyfile and reload.
set -euo pipefail

CADDYFILE="${CADDYFILE:-/home/marcin/apps/aestio/docker/caddy/Caddyfile}"
APP_ROOT="${APP_ROOT:-/home/marcin/apps/eventcater}"
SNIPPET="${APP_ROOT}/frontend/deploy/caddy/eventcater.pl.caddy"
GW="$(docker network inspect bridge --format '{{(index .IPAM.Config 0).Gateway}}' 2>/dev/null || echo '172.17.0.1')"

if [[ ! -f "${CADDYFILE}" ]]; then
  echo "!! Brak ${CADDYFILE}" >&2
  exit 1
fi
if [[ ! -f "${SNIPPET}" ]]; then
  echo "!! Brak ${SNIPPET} — git pull frontend" >&2
  exit 1
fi

sudo cp "${CADDYFILE}" "${CADDYFILE}.bak.$(date +%Y%m%d%H%M%S)"

sudo python3 - <<PY
from pathlib import Path
import re
p = Path("${CADDYFILE}")
text = p.read_text()
# Drop anything from the first eventcater marker to EOF (previous appends).
patterns = [
    r"\n# Dopisz do.*[Ee]vent[Cc]ater[\s\S]*\Z",
    r"\n# EventCater[\s\S]*\Z",
    r"\n# Fragment do dopisania[\s\S]*\Z",
    r"\nhttp://eventcater\.pl[\s\S]*\Z",
    r"\neventcater\.pl[\s\S]*\Z",
]
cut = len(text)
for pat in patterns:
    m = re.search(pat, text)
    if m:
        cut = min(cut, m.start())
cleaned = text[:cut].rstrip() + "\n\n"
p.write_text(cleaned)
print(f"cleaned Caddyfile -> {len(cleaned)} bytes (was {len(text)})")
PY

# Substitute gateway IP into snippet and append
tmp="$(mktemp)"
sed "s/172\\.17\\.0\\.1/${GW}/g" "${SNIPPET}" > "${tmp}"
sudo tee -a "${CADDYFILE}" < "${tmp}" >/dev/null
rm -f "${tmp}"

echo "==> Ogon Caddyfile:"
sudo tail -30 "${CADDYFILE}"

echo "==> DNS:"
echo -n "eventcater.pl → "; dig +short eventcater.pl A | tr '\n' ' '; echo
echo -n "www.eventcater.pl → "; dig +short www.eventcater.pl A | tr '\n' ' '; echo

docker exec caddy_symfony caddy validate --config /etc/caddy/Caddyfile
docker exec caddy_symfony caddy reload --config /etc/caddy/Caddyfile

echo "==> Czekam na cert / handshake..."
sleep 5
set +e
curl -sS -o /dev/null -w "HTTPS eventcater.pl → %{http_code}\n" --max-time 30 https://eventcater.pl/
curl_rc=$?
set -e

echo "==> Logi Caddy po próbie (eventcater/acme/error):"
docker logs caddy_symfony --since 2m 2>&1 | grep -iE 'eventcater|acme|certificate|challenge|error|tls' | tail -40 || true

if [[ "${curl_rc}" -ne 0 ]]; then
  echo "!! HTTPS jeszcze nie działa (curl exit ${curl_rc})."
  echo "   Upewnij się, że w Caddyfile NIE ma http://eventcater.pl z samym redir,"
  echo "   oraz że request nie wpada w blok :443 on_demand (ask tylko dla aestio)."
  exit 1
fi

echo "==> OK"
