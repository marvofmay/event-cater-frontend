#!/usr/bin/env bash
# Update EventCater on the droplet after git changes.
# Run from anywhere as marcin:
#   bash /home/marcin/apps/eventcater/frontend/deploy/scripts/deploy.sh

set -euo pipefail

APP_ROOT="${APP_ROOT:-/home/marcin/apps/eventcater}"
FRONTEND_REF="${FRONTEND_REF:-main}"
BACKEND_REF="${BACKEND_REF:-master}"

cd "${APP_ROOT}"

echo "==> Pulling frontend (${FRONTEND_REF})"
git -C frontend fetch --all --prune
git -C frontend checkout "${FRONTEND_REF}"
git -C frontend pull --ff-only origin "${FRONTEND_REF}"

echo "==> Pulling backend (${BACKEND_REF})"
git -C backend fetch --all --prune
git -C backend checkout "${BACKEND_REF}"
git -C backend pull --ff-only origin "${BACKEND_REF}"

cp -f frontend/deploy/docker-compose.prod.yml "${APP_ROOT}/docker-compose.yml"

echo "==> Rebuilding and restarting"
docker compose --env-file .env up -d --build --force-recreate

echo "==> Migrating central DB"
docker compose exec -T service-company php bin/console doctrine:migrations:migrate --no-interaction

echo "==> Migrating tenant DBs (dry-run list, then execute)"
docker compose exec -T service-company php bin/console app:saas:migrate-tenants || true
docker compose exec -T service-company php bin/console app:saas:migrate-tenants --execute || true

echo "==> Clearing Symfony cache"
docker compose exec -T service-company php bin/console cache:clear

echo "==> Done. Check: docker compose ps && curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3010/"
