#!/usr/bin/env bash
# Patch backend doctrine.yaml for Doctrine Bundle 3, then rebuild API image.
set -euo pipefail

APP_ROOT="${APP_ROOT:-/home/marcin/apps/eventcater}"
FILE="${APP_ROOT}/backend/config/packages/doctrine.yaml"

[[ -f "${FILE}" ]] || { echo "!! Brak ${FILE}" >&2; exit 1; }

cp -f "${FILE}" "${FILE}.bak.$(date +%Y%m%d%H%M%S)"

python3 - <<PY
from pathlib import Path
import re
p = Path("${FILE}")
text = p.read_text()
text2, n = re.subn(
    r"(when@prod:\n  doctrine:\n    orm:\n)(?:      auto_generate_proxy_classes:.*\n)?(?:      enable_lazy_ghost_objects:.*\n)?",
    r"\1",
    text,
    count=1,
)
if n == 0:
    # already patched or different layout
    if "auto_generate_proxy_classes" not in text and "enable_lazy_ghost_objects" not in text:
        print("already clean")
    else:
        raise SystemExit("could not patch doctrine.yaml — unexpected format")
else:
    p.write_text(text2)
    print("removed obsolete doctrine prod options")
PY

cd "${APP_ROOT}"
cp -f frontend/deploy/docker-compose.prod.yml docker-compose.yml
docker compose --env-file .env build service-company
docker compose --env-file .env up -d service-company worker worker-deadlines
echo "==> OK — ponów: bash frontend/deploy/scripts/init-saas.sh"
