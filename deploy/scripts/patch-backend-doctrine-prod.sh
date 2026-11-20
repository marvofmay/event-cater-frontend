#!/usr/bin/env bash
# Strip Doctrine Bundle 2 keys rejected by Bundle 3, then rebuild API image.
set -euo pipefail

APP_ROOT="${APP_ROOT:-/home/marcin/apps/eventcater}"
FILE="${APP_ROOT}/backend/config/packages/doctrine.yaml"

[[ -f "${FILE}" ]] || { echo "!! Brak ${FILE}" >&2; exit 1; }

cp -f "${FILE}" "${FILE}.bak.$(date +%Y%m%d%H%M%S)"

DOCTRINE_YAML="${FILE}" python3 - <<'PY'
from pathlib import Path
import os, re
p = Path(os.environ["DOCTRINE_YAML"])
text = p.read_text()
text2 = re.sub(r"(?m)^[ \t]*auto_generate_proxy_classes:.*\n", "", text)
text2 = re.sub(r"(?m)^[ \t]*enable_lazy_ghost_objects:.*\n", "", text2)
if text2 != text:
    p.write_text(text2)
    print("removed obsolete doctrine ORM keys")
else:
    print("already clean")
PY

cd "${APP_ROOT}"
cp -f frontend/deploy/docker-compose.prod.yml docker-compose.yml
docker compose --env-file .env build service-company
docker compose --env-file .env up -d service-company worker worker-deadlines worker-trials
echo "==> OK"
