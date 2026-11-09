#!/usr/bin/env bash
# Apply EventCater trial backend patch onto /home/marcin/apps/eventcater/backend and rebuild API.
set -euo pipefail

APP_ROOT="${APP_ROOT:-/home/marcin/apps/eventcater}"
BACKEND="${APP_ROOT}/backend"
PATCH_ROOT="${APP_ROOT}/frontend/deploy/backend-trial"

[[ -d "${BACKEND}/.git" ]] || { echo "!! Brak ${BACKEND}" >&2; exit 1; }
[[ -d "${PATCH_ROOT}" ]] || { echo "!! Brak ${PATCH_ROOT} — git pull frontend" >&2; exit 1; }

echo "==> Kopiuję pliki triala do backendu"
cp -f "${PATCH_ROOT}/migrations/Version20261109150000.php" "${BACKEND}/migrations/"
cp -f "${PATCH_ROOT}/src/Module/Saas/Application/SaasService.php" "${BACKEND}/src/Module/Saas/Application/"
cp -f "${PATCH_ROOT}/src/Module/Saas/Application/TrialMailer.php" "${BACKEND}/src/Module/Saas/Application/"
cp -f "${PATCH_ROOT}/src/Module/Saas/Infrastructure/TenantProvisioner.php" "${BACKEND}/src/Module/Saas/Infrastructure/"
cp -f "${PATCH_ROOT}/src/Module/Saas/Presentation/API/Controller/SaasController.php" "${BACKEND}/src/Module/Saas/Presentation/API/Controller/"
mkdir -p "${BACKEND}/src/Module/Saas/Presentation/Console"
cp -f "${PATCH_ROOT}/src/Module/Saas/Presentation/Console/ProcessTrialsCommand.php" "${BACKEND}/src/Module/Saas/Presentation/Console/"
cp -f "${PATCH_ROOT}/config/packages/saas.yaml" "${BACKEND}/config/packages/saas.yaml"
cp -f "${PATCH_ROOT}/config/services/main.yaml" "${BACKEND}/config/services/main.yaml"

# Ensure .env has trial notify defaults
cd "${APP_ROOT}"
grep -q '^TRIAL_NOTIFY_EMAIL=' .env || echo 'TRIAL_NOTIFY_EMAIL=kontakt@eventcater.pl' >> .env
grep -q '^PASSWORD_RESET_SENDER=' .env || echo 'PASSWORD_RESET_SENDER=noreply@eventcater.pl' >> .env
# Prefer public site URL for mails
if grep -q '^APP_URL=' .env; then
  sed -i 's|^APP_URL=.*|APP_URL=https://eventcater.pl|' .env
else
  echo 'APP_URL=https://eventcater.pl' >> .env
fi
cp -f .env backend/.env
chmod 644 .env backend/.env

cp -f frontend/deploy/docker-compose.prod.yml docker-compose.yml

echo "==> Rebuild API + workers"
docker compose --env-file .env build service-company
docker compose --env-file .env up -d service-company worker worker-deadlines worker-trials

echo "==> Migracja centralnej bazy"
docker compose exec -u www-data -T service-company php bin/console doctrine:migrations:migrate --no-interaction

echo "==> Uprawnienia var/ + granty tenant DB"
docker compose exec -u root -T service-company \
  bash -c 'chown -R www-data:www-data /var/www/html/var && chmod -R 2775 /var/www/html/var' || true
MYSQL_ROOT_PASSWORD="$(grep -E '^MYSQL_ROOT_PASSWORD=' .env | tail -n1 | cut -d= -f2- | tr -d \"\')"
MYSQL_USER="$(grep -E '^MYSQL_USER=' .env | tail -n1 | cut -d= -f2- | tr -d \"\')"
docker compose exec -T service-company-db mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" -e \
  "GRANT ALL PRIVILEGES ON \`ec\\_tenant\\_%\`.* TO '${MYSQL_USER}'@'%'; GRANT CREATE, DROP ON *.* TO '${MYSQL_USER}'@'%'; FLUSH PRIVILEGES;"

echo "==> Test komendy triali"
docker compose exec -u www-data -T service-company php bin/console app:saas:process-trials

echo "==> OK. Publiczny endpoint: POST /api/saas/trial"
