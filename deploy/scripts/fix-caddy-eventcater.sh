#!/usr/bin/env bash
# Attach EventCater containers to Caddy's network, insert site above :443, restart Caddy.
set -euo pipefail

CADDYFILE="${CADDYFILE:-/home/marcin/apps/aestio/docker/caddy/Caddyfile}"
APP_ROOT="${APP_ROOT:-/home/marcin/apps/eventcater}"
SNIPPET="${APP_ROOT}/frontend/deploy/caddy/eventcater.pl.caddy"
CADDY_NAME="${CADDY_CONTAINER:-caddy_symfony}"

[[ -f "${CADDYFILE}" ]] || { echo "!! Brak ${CADDYFILE}" >&2; exit 1; }
[[ -f "${SNIPPET}" ]] || { echo "!! Brak ${SNIPPET} — git pull" >&2; exit 1; }

# --- 1) Join Caddy docker network (same pattern as lightcms_demo_edge) ---
CADDY_NET="$(docker inspect "${CADDY_NAME}" --format '{{range $k, $v := .NetworkSettings.Networks}}{{println $k}}{{end}}' | head -n1)"
if [[ -z "${CADDY_NET}" ]]; then
  echo "!! Nie znaleziono sieci kontenera ${CADDY_NAME}" >&2
  exit 1
fi
echo "==> Sieć Caddy: ${CADDY_NET}"

for c in eventcater-frontend eventcater-mercure; do
  if docker inspect "${c}" --format '{{range $k, $v := .NetworkSettings.Networks}}{{println $k}}{{end}}' | grep -qx "${CADDY_NET}"; then
    echo "==> ${c} już w ${CADDY_NET}"
  else
    echo "==> docker network connect ${CADDY_NET} ${c}"
    docker network connect "${CADDY_NET}" "${c}"
  fi
done

echo "==> Ping z Caddy do frontend/mercure:"
docker exec "${CADDY_NAME}" wget -qO- --timeout=3 http://eventcater-frontend:3000/ >/dev/null && echo "  frontend:3000 OK" || echo "  frontend:3000 FAIL"
docker exec "${CADDY_NAME}" wget -qO- --timeout=3 http://eventcater-mercure:80/ >/dev/null && echo "  mercure:80 OK (lub 4xx — host osiągalny)" || echo "  mercure:80 FAIL"

# --- 2) Rewrite Caddyfile: remove old eventcater, insert above :443 ---
sudo cp "${CADDYFILE}" "${CADDYFILE}.bak.$(date +%Y%m%d%H%M%S)"
snippet_body="$(cat "${SNIPPET}")"

sudo python3 - <<PY
from pathlib import Path
import re
p = Path("${CADDYFILE}")
text = p.read_text()

# Strip previous eventcater-related chunks
text = re.sub(r"\n#\s*(Dopisz do|EventCater|Fragment do dopisania|Wzorzec jak demolightcms|Wstawić POWYŻEJ)[\s\S]*?(?=\n# Nowe subdomeny|\n:443\s*\{|\Z)", "\n", text, flags=re.I)
text = re.sub(r"\nhttp://eventcater\.pl[\s\S]*?\n\}\n\neventcater\.pl[\s\S]*?\n\}\n", "\n", text)
text = re.sub(r"\nhttp://eventcater\.pl[\s\S]*?\n\}\n", "\n", text)
text = re.sub(r"\neventcater\.pl(?:, www\.eventcater\.pl)?\s*\{[\s\S]*?\n\}\n", "\n", text)

snippet = '''${snippet_body}'''

m = re.search(r"\n# Nowe subdomeny tenantów[\s\S]*?\n:443\s*\{", text) or re.search(r"\n:443\s*\{", text)
if m:
    text = text[:m.start()].rstrip() + "\n\n" + snippet.strip() + "\n\n" + text[m.start():].lstrip()
else:
    text = text.rstrip() + "\n\n" + snippet.strip() + "\n"

p.write_text(text if text.endswith("\n") else text + "\n")
print("Caddyfile patched")
PY

echo "==> Pozycje eventcater / :443:"
sudo grep -n -E 'eventcater|^:443' "${CADDYFILE}" | head -30

echo "==> Czy adapt widzi eventcater?"
set +e
docker exec "${CADDY_NAME}" caddy adapt --config /etc/caddy/Caddyfile 2>/tmp/caddy-adapt.err | tee /tmp/caddy-adapt.json | grep -o 'eventcater[^"]*' | sort -u | head
adapt_rc=${PIPESTATUS[0]}
set -e
if [[ "${adapt_rc}" -ne 0 ]]; then
  echo "!! caddy adapt failed:" >&2
  cat /tmp/caddy-adapt.err >&2 || true
  exit 1
fi
if ! grep -q eventcater /tmp/caddy-adapt.json 2>/dev/null; then
  echo "!! Brak 'eventcater' w adapted JSON — sprawdź Caddyfile" >&2
  sudo sed -n '1,80p' "${CADDYFILE}" >&2
  exit 1
fi

docker exec "${CADDY_NAME}" caddy validate --config /etc/caddy/Caddyfile

echo "==> Restart Caddy (reload bywa za słaby przy TLS)"
docker restart "${CADDY_NAME}"
# wait until caddy accepts connections again
for i in $(seq 1 30); do
  if docker exec "${CADDY_NAME}" wget -qO- --timeout=2 http://127.0.0.1:80/ >/dev/null 2>&1 \
    || curl -sS --max-time 2 -o /dev/null http://127.0.0.1/; then
    break
  fi
  sleep 1
done
sleep 2

echo "==> openssl SNI:"
openssl s_client -connect 127.0.0.1:443 -servername eventcater.pl </dev/null 2>&1 | head -35 || true

echo "==> curl HTTPS (max 90s):"
set +e
curl -sS -o /dev/null -w '%{http_code}\n' --max-time 90 https://eventcater.pl/
rc=$?
set -e

echo "==> Logi z eventcater/challenge/obtain/deny/ask:"
docker logs "${CADDY_NAME}" --since 3m 2>&1 | grep -iE 'eventcater|challenge|obtain|deny|ask|allow|certificate|error' | tail -60 || true

exit "${rc}"
