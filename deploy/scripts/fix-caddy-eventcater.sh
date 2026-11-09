#!/usr/bin/env bash
# Insert EventCater site ABOVE the :443 on_demand catch-all, then reload.
set -euo pipefail

CADDYFILE="${CADDYFILE:-/home/marcin/apps/aestio/docker/caddy/Caddyfile}"
APP_ROOT="${APP_ROOT:-/home/marcin/apps/eventcater}"
SNIPPET="${APP_ROOT}/frontend/deploy/caddy/eventcater.pl.caddy"
GW="$(docker network inspect bridge --format '{{(index .IPAM.Config 0).Gateway}}' 2>/dev/null || echo '172.17.0.1')"

[[ -f "${CADDYFILE}" ]] || { echo "!! Brak ${CADDYFILE}" >&2; exit 1; }
[[ -f "${SNIPPET}" ]] || { echo "!! Brak ${SNIPPET}" >&2; exit 1; }

sudo cp "${CADDYFILE}" "${CADDYFILE}.bak.$(date +%Y%m%d%H%M%S)"

snippet_body="$(sed "s/172\\.17\\.0\\.1/${GW}/g" "${SNIPPET}")"

sudo python3 - <<PY
from pathlib import Path
import re
p = Path("${CADDYFILE}")
text = p.read_text()

# Remove any previous EventCater fragments anywhere in the file.
text = re.sub(
    r"\n?#\s*(Dopisz do|EventCater|Fragment do dopisania|Wzorzec jak demolightcms)[\s\S]*?(?=\n# Nowe subdomeny|\n:443\s*\{|\Z)",
    "\n",
    text,
    flags=re.IGNORECASE,
)
text = re.sub(
    r"\nhttp://eventcater\.pl[\s\S]*?eventcater\.pl[\s\S]*?\n\}\n",
    "\n",
    text,
)
text = re.sub(
    r"\neventcater\.pl(?:, www\.eventcater\.pl)?\s*\{[\s\S]*?\n\}\n",
    "\n",
    text,
)

snippet = '''${snippet_body}'''

# Prefer insert just before the catch-all :443 block.
m = re.search(r"\n# Nowe subdomeny tenantów[\s\S]*?\n:443\s*\{", text)
if not m:
    m = re.search(r"\n:443\s*\{", text)

if m:
    insert_at = m.start()
    text = text[:insert_at].rstrip() + "\n\n" + snippet.strip() + "\n\n" + text[insert_at:].lstrip()
else:
    text = text.rstrip() + "\n\n" + snippet.strip() + "\n"

p.write_text(text if text.endswith("\n") else text + "\n")
print("Caddyfile updated; eventcater inserted above :443 (or appended).")
PY

echo "==> Fragment eventcater w pliku:"
sudo grep -n -E 'eventcater|:443' "${CADDYFILE}" | head -40

docker exec caddy_symfony caddy validate --config /etc/caddy/Caddyfile
docker exec caddy_symfony caddy reload --config /etc/caddy/Caddyfile

echo "==> DNS:"
echo -n "  @ "; dig +short eventcater.pl A
echo -n "www "; dig +short www.eventcater.pl A

echo "==> HTTP (oczekiwane 308):"
curl -sS -o /dev/null -w '%{http_code}\n' --max-time 10 -H 'Host: eventcater.pl' http://127.0.0.1/ || true

echo "==> HTTPS (pierwszy raz może potrwać ~60s na cert LE):"
set +e
curl -sS -o /dev/null -w '%{http_code}\n' --max-time 90 https://eventcater.pl/
rc=$?
set -e

echo "==> Logi (ostatnie 2 min, filtr):"
docker logs caddy_symfony --since 2m 2>&1 | grep -iE 'eventcater|acme|certificate|challenge|obtain|error' | tail -50 || true

exit "${rc}"
