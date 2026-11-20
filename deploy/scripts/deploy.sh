#!/usr/bin/env bash
# Update EventCater on the droplet after git changes.
# Zero-downtime style: build while old app serves, then recreate only app services.
# Run from anywhere as marcin:
#   bash /home/marcin/apps/eventcater/frontend/deploy/scripts/deploy.sh

set -euo pipefail

APP_ROOT="${APP_ROOT:-/home/marcin/apps/eventcater}"
FRONTEND_REF="${FRONTEND_REF:-main}"
BACKEND_REF="${BACKEND_REF:-master}"

# CI/SSH always starts whatever deploy.sh is already on disk. Pull frontend first and
# re-exec so the rest of this run uses the newly pulled script (healthchecks, etc.).
if [[ "${DEPLOY_BOOTSTRAPPED:-0}" != "1" ]]; then
  echo "==> Bootstrapping deploy.sh from origin/${FRONTEND_REF}"
  cd "${APP_ROOT}"
  git -C frontend fetch --all --prune
  git -C frontend checkout -f "${FRONTEND_REF}"
  git -C frontend reset --hard "origin/${FRONTEND_REF}"
  git -C frontend clean -fd
  export DEPLOY_BOOTSTRAPPED=1
  exec bash "${APP_ROOT}/frontend/deploy/scripts/deploy.sh" "$@"
fi

# Serialize deploys when frontend and backend CI finish around the same time.
exec 9>/tmp/eventcater-deploy.lock
flock -w 1800 9 || { echo "Another deploy in progress"; exit 1; }

cd "${APP_ROOT}"

echo "==> Frontend already at origin/${FRONTEND_REF} (bootstrap)"

echo "==> Pulling backend (${BACKEND_REF})"
git -C backend fetch --all --prune
git -C backend checkout -f "${BACKEND_REF}"
# Trial patch below dirties the tree; always reset before pull or ff-only fails.
git -C backend reset --hard "origin/${BACKEND_REF}"
git -C backend clean -fd -e .env -e 'config/jwt' -e 'config/jwt/*'

# Trial patch lives in the frontend deploy package until it lands in the backend repo.
if [[ -x frontend/deploy/scripts/apply-trial-backend.sh ]]; then
  echo "==> Applying trial backend patch (files only; rebuild below)"
  # Copy patch files without rebuild — deploy continues with full compose rebuild.
  PATCH_ROOT="${APP_ROOT}/frontend/deploy/backend-trial"
  BACKEND="${APP_ROOT}/backend"
  # Migrations for trial/SaaS columns are already on backend master — still copy for older droplets.
  cp -f "${PATCH_ROOT}/migrations/Version20261109150000.php" "${BACKEND}/migrations/"
  cp -f "${PATCH_ROOT}/migrations/Version20261112170000.php" "${BACKEND}/migrations/"
  cp -f "${PATCH_ROOT}/migrations/Version20261113100000.php" "${BACKEND}/migrations/"
  cp -f "${PATCH_ROOT}/src/Module/Saas/Application/SaasService.php" "${BACKEND}/src/Module/Saas/Application/"
  cp -f "${PATCH_ROOT}/src/Module/Saas/Application/TrialMailer.php" "${BACKEND}/src/Module/Saas/Application/"
  cp -f "${PATCH_ROOT}/src/Module/Saas/Application/SubscriptionPaymentService.php" "${BACKEND}/src/Module/Saas/Application/"
  cp -f "${PATCH_ROOT}/src/Module/Saas/Infrastructure/TpayClient.php" "${BACKEND}/src/Module/Saas/Infrastructure/"
  cp -f "${PATCH_ROOT}/src/Module/Saas/Infrastructure/TpaySignature.php" "${BACKEND}/src/Module/Saas/Infrastructure/"
  cp -f "${PATCH_ROOT}/src/Module/Saas/Infrastructure/TpayRejectedException.php" "${BACKEND}/src/Module/Saas/Infrastructure/"
  cp -f "${PATCH_ROOT}/src/Module/Saas/Infrastructure/TpayTemporaryException.php" "${BACKEND}/src/Module/Saas/Infrastructure/"
  cp -f "${PATCH_ROOT}/src/Module/Saas/Infrastructure/TenantProvisioner.php" "${BACKEND}/src/Module/Saas/Infrastructure/"
  mkdir -p "${BACKEND}/src/Module/Company/Domain/Entity" "${BACKEND}/src/Module/System/Domain/Service/User"
  cp -f "${PATCH_ROOT}/src/Module/Company/Domain/Entity/User.php" "${BACKEND}/src/Module/Company/Domain/Entity/"
  cp -f "${PATCH_ROOT}/src/Module/System/Domain/Service/User/UserPersonalInfoProvider.php" "${BACKEND}/src/Module/System/Domain/Service/User/"
  cp -f "${PATCH_ROOT}/src/Module/Saas/Presentation/API/Controller/SaasController.php" "${BACKEND}/src/Module/Saas/Presentation/API/Controller/"
  mkdir -p "${BACKEND}/src/Module/Saas/Presentation/Console"
  cp -f "${PATCH_ROOT}/src/Module/Saas/Presentation/Console/ProcessTrialsCommand.php" "${BACKEND}/src/Module/Saas/Presentation/Console/"
  cp -f "${PATCH_ROOT}/src/Module/Saas/Presentation/Console/LinkTrialOwnersCommand.php" "${BACKEND}/src/Module/Saas/Presentation/Console/"
  mkdir -p "${BACKEND}/src/Module/Facebook/Infrastructure/Persistence"
  cp -f "${PATCH_ROOT}/src/Module/Facebook/Infrastructure/Persistence/DoctrineFacebookPageConnectionRepository.php" \
    "${BACKEND}/src/Module/Facebook/Infrastructure/Persistence/"
  mkdir -p "${BACKEND}/src/Module/System/Presentation/API/Controller" "${BACKEND}/src/Module/System/Infrastructure/Preference"
  cp -f "${PATCH_ROOT}/src/Module/System/Presentation/API/Controller/PreferenceController.php" "${BACKEND}/src/Module/System/Presentation/API/Controller/"
  cp -f "${PATCH_ROOT}/src/Module/System/Infrastructure/Preference/PreferenceService.php" "${BACKEND}/src/Module/System/Infrastructure/Preference/"
  cp -f "${PATCH_ROOT}/config/packages/saas.yaml" "${BACKEND}/config/packages/saas.yaml"
  cp -f "${PATCH_ROOT}/config/services/main.yaml" "${BACKEND}/config/services/main.yaml"
  chmod -R a+rX "${BACKEND}/src" "${BACKEND}/migrations" "${BACKEND}/config"
  sed -i 's/Pracownik techniczny systemu HRApp/Pracownik techniczny systemu EventCater/g' \
    "${BACKEND}/src/Module/Company/Domain/Entity/User.php" || true
  sed -i "s/noreply@hrapp.com/noreply@eventcater.pl/g; s/System HRApp/EventCater/g" \
    "${BACKEND}/src/Module/System/Infrastructure/Email/SymfonyEmailSender.php" 2>/dev/null || true
  grep -q '^TRIAL_NOTIFY_EMAIL=' .env || echo 'TRIAL_NOTIFY_EMAIL=kontakt@eventcater.pl' >> .env
  grep -q '^TPAY_ENV=' .env || echo 'TPAY_ENV=sandbox' >> .env
  grep -q '^TPAY_CLIENT_ID=' .env || echo 'TPAY_CLIENT_ID=' >> .env
  grep -q '^TPAY_CLIENT_SECRET=' .env || echo 'TPAY_CLIENT_SECRET=' >> .env
  grep -q '^TPAY_MERCHANT_ID=' .env || echo 'TPAY_MERCHANT_ID=' >> .env
  grep -q '^TPAY_SECURITY_CODE=' .env || echo 'TPAY_SECURITY_CODE=' >> .env
  grep -q '^PASSWORD_RESET_SENDER=' .env || echo 'PASSWORD_RESET_SENDER=noreply@eventcater.pl' >> .env
  if grep -q '^APP_URL=' .env; then
    sed -i 's|^APP_URL=.*|APP_URL=https://eventcater.pl|' .env
  else
    echo 'APP_URL=https://eventcater.pl' >> .env
  fi
  cp -f .env backend/.env
fi

cp -f frontend/deploy/docker-compose.prod.yml "${APP_ROOT}/docker-compose.yml"

# Doctrine Bundle 3 rejects these keys (they surface as entity_managers.default errors).
echo "==> Stripping obsolete Doctrine ORM keys from doctrine.yaml"
FILE="${APP_ROOT}/backend/config/packages/doctrine.yaml"
if [[ -f "${FILE}" ]]; then
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
    print("doctrine.yaml already clean")
PY
fi

# Recreate one compose service; on name conflict remove only that container and retry.
recreate_service() {
  local service="$1"
  local container_name="${2:-}"
  if docker compose --env-file .env up -d --no-deps --force-recreate --remove-orphans "${service}"; then
    return 0
  fi
  if [[ -n "${container_name}" ]]; then
    echo "==> Recreate ${service} failed — removing ${container_name} and retrying"
    docker rm -f "${container_name}" >/dev/null 2>&1 || true
  fi
  docker compose --env-file .env up -d --no-deps --force-recreate --remove-orphans "${service}"
}

wait_container_healthy() {
  local container_name="$1"
  local label="$2"
  local attempts="${3:-60}"
  echo "==> Waiting for ${label} healthy (${container_name})"
  for _ in $(seq 1 "${attempts}"); do
    if ! docker inspect "${container_name}" >/dev/null 2>&1; then
      sleep 2
      continue
    fi
    local health state
    health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "${container_name}" 2>/dev/null || true)"
    if [[ -n "${health}" ]]; then
      [[ "${health}" == "healthy" ]] && return 0
    else
      state="$(docker inspect -f '{{.State.Status}}' "${container_name}" 2>/dev/null || echo missing)"
      [[ "${state}" == "running" ]] && return 0
    fi
    sleep 2
  done
  echo "!! ${label} did not become healthy. Recent logs:"
  docker logs --tail=80 "${container_name}" 2>/dev/null || true
  return 1
}

echo "==> Ensuring data services are up (DB / Redis / RabbitMQ stay online across deploys)"
docker compose --env-file .env up -d service-company-db redis rabbitmq

echo "==> Waiting for MySQL"
wait_container_healthy eventcater-db "MySQL" 60

echo "==> Building images (old API/frontend keep serving traffic)"
docker compose --env-file .env build

echo "==> Rolling recreate: API (brief blip; frontend still up)"
recreate_service service-company eventcater-api
wait_container_healthy eventcater-api "API" 90

echo "==> Migrating central DB (new API image)"
docker compose exec -u www-data -T service-company php bin/console doctrine:migrations:migrate --no-interaction

echo "==> Migrating tenant DBs (dry-run list, then execute)"
docker compose exec -u www-data -T service-company php bin/console app:saas:migrate-tenants
# One broken tenant (e.g. incomplete demo DB) must not abort the whole release.
set +e
docker compose exec -u www-data -T service-company php bin/console app:saas:migrate-tenants --execute --continue-on-error
tenant_migrate_status=$?
set -e
if [[ "${tenant_migrate_status}" -ne 0 ]]; then
  echo "!! Some tenant migrations failed (exit ${tenant_migrate_status}). Stack stays up — fix broken tenants separately."
fi

echo "==> Rolling recreate: Mercure, frontend, workers"
recreate_service mercure eventcater-mercure
recreate_service frontend eventcater-frontend
recreate_service worker eventcater-worker
recreate_service worker-deadlines eventcater-deadlines
recreate_service worker-trials eventcater-trials

# Safety net if external network was missing from an older compose file
docker network connect aestio_default eventcater-frontend 2>/dev/null || true
docker network connect aestio_default eventcater-mercure 2>/dev/null || true

wait_container_healthy eventcater-frontend "frontend" 60

echo "==> HTTP healthchecks (Apache port + frontend listener)"
api_ok=0
fe_ok=0
for _ in $(seq 1 30); do
  if docker compose exec -T service-company \
    php -r '$f=@fsockopen("127.0.0.1",80,$e,$s,2);exit($f?0:1);' 2>/dev/null; then
    api_ok=1
  fi
  # Any HTTP status from Next means the process is accepting connections.
  code="$(curl -sS -o /dev/null --max-time 5 -w '%{http_code}' "http://127.0.0.1:3010/" 2>/dev/null || true)"
  if [[ "${code}" =~ ^[1-5][0-9][0-9]$ ]]; then
    fe_ok=1
  fi
  if [[ "${api_ok}" -eq 1 && "${fe_ok}" -eq 1 ]]; then
    break
  fi
  sleep 2
done
if [[ "${api_ok}" -ne 1 ]]; then
  echo "!! API healthcheck failed (port 80 closed). Recent logs:"
  docker compose --env-file .env logs --tail=80 service-company || true
  exit 1
fi
if [[ "${fe_ok}" -ne 1 ]]; then
  echo "!! Frontend healthcheck failed. Recent logs:"
  docker compose --env-file .env logs --tail=80 frontend || true
  exit 1
fi

echo "==> Clearing Symfony cache"
docker compose exec -u www-data -T service-company php bin/console cache:clear
docker compose exec -u root -T service-company \
  bash -c 'chown -R www-data:www-data /var/www/html/var && chmod -R 2775 /var/www/html/var' || true

echo "==> Done (rolling deploy). Check: docker compose ps && curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3010/"
