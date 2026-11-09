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

# Trial patch lives in the frontend deploy package until it lands in the backend repo.
if [[ -x frontend/deploy/scripts/apply-trial-backend.sh ]]; then
  echo "==> Applying trial backend patch (files only; rebuild below)"
  # Copy patch files without rebuild — deploy continues with full compose rebuild.
  PATCH_ROOT="${APP_ROOT}/frontend/deploy/backend-trial"
  BACKEND="${APP_ROOT}/backend"
  cp -f "${PATCH_ROOT}/migrations/Version20261109150000.php" "${BACKEND}/migrations/"
  cp -f "${PATCH_ROOT}/src/Module/Saas/Application/SaasService.php" "${BACKEND}/src/Module/Saas/Application/"
  cp -f "${PATCH_ROOT}/src/Module/Saas/Application/TrialMailer.php" "${BACKEND}/src/Module/Saas/Application/"
  cp -f "${PATCH_ROOT}/src/Module/Saas/Infrastructure/TenantProvisioner.php" "${BACKEND}/src/Module/Saas/Infrastructure/"
  cp -f "${PATCH_ROOT}/src/Module/Saas/Presentation/API/Controller/SaasController.php" "${BACKEND}/src/Module/Saas/Presentation/API/Controller/"
  mkdir -p "${BACKEND}/src/Module/Saas/Presentation/Console"
  cp -f "${PATCH_ROOT}/src/Module/Saas/Presentation/Console/ProcessTrialsCommand.php" "${BACKEND}/src/Module/Saas/Presentation/Console/"
  cp -f "${PATCH_ROOT}/config/packages/saas.yaml" "${BACKEND}/config/packages/saas.yaml"
  cp -f "${PATCH_ROOT}/config/services/main.yaml" "${BACKEND}/config/services/main.yaml"
  grep -q '^TRIAL_NOTIFY_EMAIL=' .env || echo 'TRIAL_NOTIFY_EMAIL=kontakt@eventcater.pl' >> .env
  grep -q '^PASSWORD_RESET_SENDER=' .env || echo 'PASSWORD_RESET_SENDER=noreply@eventcater.pl' >> .env
  if grep -q '^APP_URL=' .env; then
    sed -i 's|^APP_URL=.*|APP_URL=https://eventcater.pl|' .env
  else
    echo 'APP_URL=https://eventcater.pl' >> .env
  fi
  cp -f .env backend/.env
fi

cp -f frontend/deploy/docker-compose.prod.yml "${APP_ROOT}/docker-compose.yml"

echo "==> Rebuilding and restarting"
docker compose --env-file .env up -d --build --force-recreate

# Safety net if external network was missing from an older compose file
docker network connect aestio_default eventcater-frontend 2>/dev/null || true
docker network connect aestio_default eventcater-mercure 2>/dev/null || true

echo "==> Migrating central DB"
docker compose exec -u www-data -T service-company php bin/console doctrine:migrations:migrate --no-interaction

echo "==> Migrating tenant DBs (dry-run list, then execute)"
docker compose exec -u www-data -T service-company php bin/console app:saas:migrate-tenants || true
docker compose exec -u www-data -T service-company php bin/console app:saas:migrate-tenants --execute || true

echo "==> Clearing Symfony cache"
docker compose exec -u www-data -T service-company php bin/console cache:clear
docker compose exec -u root -T service-company \
  bash -c 'chown -R www-data:www-data /var/www/html/var && chmod -R 2775 /var/www/html/var' || true

echo "==> Done. Check: docker compose ps && curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3010/"
