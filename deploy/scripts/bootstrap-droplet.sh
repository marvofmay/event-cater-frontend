#!/usr/bin/env bash
# First-time setup on the DigitalOcean droplet.
# Run as user marcin (with docker + sudo for nginx):
#
#   curl -fsSL https://raw.githubusercontent.com/marvofmay/event-cater-frontend/main/deploy/scripts/bootstrap-droplet.sh | bash
# or after cloning frontend:
#   bash /home/marcin/apps/eventcater/frontend/deploy/scripts/bootstrap-droplet.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# bootstrap lives in <frontend-repo>/deploy/scripts — use that checkout's branch when FRONTEND_REF is unset
SOURCE_FRONTEND="$(cd "${SCRIPT_DIR}/../.." && pwd)"

APP_ROOT="${APP_ROOT:-/home/marcin/apps/eventcater}"
FRONTEND_REPO="${FRONTEND_REPO:-https://github.com/marvofmay/event-cater-frontend.git}"
BACKEND_REPO="${BACKEND_REPO:-https://github.com/marvofmay/event-cater-backend.git}"
BACKEND_REF="${BACKEND_REF:-master}"

if [[ -z "${FRONTEND_REF:-}" ]]; then
  if [[ -d "${SOURCE_FRONTEND}/.git" ]] && [[ -f "${SOURCE_FRONTEND}/deploy/docker-compose.prod.yml" ]]; then
    FRONTEND_REF="$(git -C "${SOURCE_FRONTEND}" rev-parse --abbrev-ref HEAD)"
    if [[ "${FRONTEND_REF}" == "HEAD" ]]; then
      FRONTEND_REF="$(git -C "${SOURCE_FRONTEND}" rev-parse HEAD)"
    fi
  else
    FRONTEND_REF="main"
  fi
fi

# Read KEY=value from .env without bash-evaluating the file (regexes/URLs break `source`).
env_get() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" .env | tail -n1 || true)"
  [[ -n "${line}" ]] || return 1
  line="${line#*=}"
  if [[ "${line}" =~ ^\".*\"$ ]]; then
    line="${line:1:${#line}-2}"
  elif [[ "${line}" =~ ^\'.*\'$ ]]; then
    line="${line:1:${#line}-2}"
  fi
  printf '%s' "${line}"
}

echo "==> EventCater bootstrap → ${APP_ROOT}"
echo "==> Frontend ref: ${FRONTEND_REF}"

mkdir -p "${APP_ROOT}"
cd "${APP_ROOT}"

if [[ ! -d frontend/.git ]]; then
  git clone --branch "${FRONTEND_REF}" "${FRONTEND_REPO}" frontend
else
  git -C frontend fetch --all --prune
  git -C frontend checkout "${FRONTEND_REF}"
  git -C frontend pull --ff-only origin "${FRONTEND_REF}" || \
    git -C frontend reset --hard "origin/${FRONTEND_REF}"
fi

if [[ ! -f frontend/deploy/docker-compose.prod.yml ]]; then
  echo "!! Brak frontend/deploy/ — zła gałąź (${FRONTEND_REF})." >&2
  echo "   Uruchom ponownie z: FRONTEND_REF=cursor/deploy-eventcater-pl-bea3 bash ..." >&2
  exit 1
fi

if [[ ! -d backend/.git ]]; then
  git clone --branch "${BACKEND_REF}" "${BACKEND_REPO}" backend
else
  git -C backend fetch --all --prune
  git -C backend checkout "${BACKEND_REF}"
  git -C backend pull --ff-only origin "${BACKEND_REF}"
fi

# Overlay trial SaaS patch (kept in frontend deploy package until merged upstream).
if [[ -d frontend/deploy/backend-trial ]]; then
  echo "==> Applying trial backend patch"
  PATCH_ROOT="${APP_ROOT}/frontend/deploy/backend-trial"
  cp -f "${PATCH_ROOT}/migrations/Version20261109150000.php" backend/migrations/
  cp -f "${PATCH_ROOT}/src/Module/Saas/Application/SaasService.php" backend/src/Module/Saas/Application/
  cp -f "${PATCH_ROOT}/src/Module/Saas/Application/TrialMailer.php" backend/src/Module/Saas/Application/
  cp -f "${PATCH_ROOT}/src/Module/Saas/Infrastructure/TenantProvisioner.php" backend/src/Module/Saas/Infrastructure/
  cp -f "${PATCH_ROOT}/src/Module/Saas/Presentation/API/Controller/SaasController.php" backend/src/Module/Saas/Presentation/API/Controller/
  mkdir -p backend/src/Module/Saas/Presentation/Console
  cp -f "${PATCH_ROOT}/src/Module/Saas/Presentation/Console/ProcessTrialsCommand.php" backend/src/Module/Saas/Presentation/Console/
  mkdir -p backend/src/Module/Facebook/Infrastructure/Persistence
  cp -f "${PATCH_ROOT}/src/Module/Facebook/Infrastructure/Persistence/DoctrineFacebookPageConnectionRepository.php" \
    backend/src/Module/Facebook/Infrastructure/Persistence/
  cp -f "${PATCH_ROOT}/config/packages/saas.yaml" backend/config/packages/saas.yaml
  cp -f "${PATCH_ROOT}/config/services/main.yaml" backend/config/services/main.yaml
  sed -i 's/Pracownik techniczny systemu HRApp/Pracownik techniczny systemu EventCater/g' \
    backend/src/Module/Company/Domain/Entity/User.php || true
  sed -i "s/noreply@hrapp.com/noreply@eventcater.pl/g; s/System HRApp/EventCater/g" \
    backend/src/Module/System/Infrastructure/Email/SymfonyEmailSender.php 2>/dev/null || true
fi

cp -f frontend/deploy/docker-compose.prod.yml "${APP_ROOT}/docker-compose.yml"

if [[ ! -f .env ]]; then
  cp frontend/deploy/.env.prod.example .env
  APP_SECRET="$(openssl rand -hex 32)"
  MYSQL_ROOT_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"
  MYSQL_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"
  RABBIT_PASS="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-24)"
  JWT_PASSPHRASE="$(openssl rand -hex 16)"
  MERCURE_JWT_SECRET="$(openssl rand -hex 32)"

  sed -i \
    -e "s|CHANGE_ME_APP_SECRET|${APP_SECRET}|g" \
    -e "s|CHANGE_ME_ROOT|${MYSQL_ROOT_PASSWORD}|g" \
    -e "s|CHANGE_ME_DB_USER|${MYSQL_PASSWORD}|g" \
    -e "s|CHANGE_ME_RABBIT|${RABBIT_PASS}|g" \
    -e "s|CHANGE_ME_JWT_PASSPHRASE|${JWT_PASSPHRASE}|g" \
    -e "s|CHANGE_ME_MERCURE|${MERCURE_JWT_SECRET}|g" \
    .env

  # Keep DATABASE_URL / MESSENGER DSN in sync with generated passwords
  sed -i \
    -e "s|MYSQL_PASSWORD=.*|MYSQL_PASSWORD=${MYSQL_PASSWORD}|" \
    -e "s|DATABASE_URL=.*|DATABASE_URL=\"mysql://eventcater:${MYSQL_PASSWORD}@service-company-db:3306/service_company?serverVersion=9.3.0\&charset=utf8mb4\"|" \
    -e "s|RABBITMQ_DEFAULT_PASS=.*|RABBITMQ_DEFAULT_PASS=${RABBIT_PASS}|" \
    -e "s|MESSENGER_TRANSPORT_DSN=.*|MESSENGER_TRANSPORT_DSN=\"amqp://eventcater:${RABBIT_PASS}@rabbitmq:5672/%2f\"|" \
    .env

  # 644: Apache in the API container runs as www-data and must read the bind-mounted .env
  chmod 644 .env
  echo "==> Generated ${APP_ROOT}/.env (secrets filled). Review MAILER_DSN before go-live."
else
  echo "==> Keeping existing ${APP_ROOT}/.env"
  chmod 644 .env || true
  grep -q '^TRIAL_NOTIFY_EMAIL=' .env || echo 'TRIAL_NOTIFY_EMAIL=kontakt@eventcater.pl' >> .env
  grep -q '^PASSWORD_RESET_SENDER=' .env || echo 'PASSWORD_RESET_SENDER=noreply@eventcater.pl' >> .env
  # Repair unquoted CORS regex from earlier bootstrap runs (breaks bash `source`, harmless for Compose when quoted)
  if grep -qE "^CORS_ALLOW_ORIGIN=\^" .env; then
    sed -i "s|^CORS_ALLOW_ORIGIN=.*|CORS_ALLOW_ORIGIN='^https://(www\\.)?eventcater\\.pl\$'|" .env
    echo "==> Quoted CORS_ALLOW_ORIGIN in existing .env"
  fi
fi

mkdir -p backend/config/jwt
if [[ ! -f backend/config/jwt/private.pem ]]; then
  echo "==> Generating JWT key pair"
  JWT_PASSPHRASE="$(env_get JWT_PASSPHRASE)"
  if [[ -z "${JWT_PASSPHRASE}" ]]; then
    echo "!! Brak JWT_PASSPHRASE w .env" >&2
    exit 1
  fi
  # Lexik JWT: encrypted private key + matching passphrase from .env
  openssl genpkey -out backend/config/jwt/private.pem -aes256 -algorithm rsa \
    -pkeyopt rsa_keygen_bits:4096 -pass "pass:${JWT_PASSPHRASE}"
  openssl pkey -in backend/config/jwt/private.pem -passin "pass:${JWT_PASSPHRASE}" \
    -out backend/config/jwt/public.pem -pubout
  chmod 600 backend/config/jwt/private.pem
  chmod 644 backend/config/jwt/public.pem
fi

# Keep a backend/.env for image builds; runtime mounts APP_ROOT/.env into the container.
if [[ -f backend/.env ]] && [[ ! -f backend/.env.dev-backup ]]; then
  cp backend/.env "backend/.env.dev-backup-$(date +%Y%m%d%H%M%S)" || true
fi
cp -f .env backend/.env
chmod 644 backend/.env

echo "==> Building and starting containers (this may take several minutes)"
# Build API image first so workers (same image, pull_policy: never) do not hit Docker Hub.
docker compose --env-file .env build service-company frontend
docker compose --env-file .env up -d --build

echo "==> Waiting for API container"
for i in $(seq 1 60); do
  if docker compose exec -T service-company php -v >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "==> Running database migrations + default data"
docker compose exec -T service-company php bin/console doctrine:migrations:migrate --no-interaction
docker compose exec -T service-company php bin/console app:initialize-system-default-data --no-interaction || true

echo "==> Applying SaaS provisioning grants for tenant databases"
MYSQL_ROOT_PASSWORD="$(env_get MYSQL_ROOT_PASSWORD)"
MYSQL_USER="$(env_get MYSQL_USER)"
docker compose exec -T service-company-db mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" -e \
  "GRANT ALL PRIVILEGES ON \`ec\\_tenant\\_%\`.* TO '${MYSQL_USER}'@'%'; FLUSH PRIVILEGES;"

echo "==> Installing nginx site (requires sudo)"
if [[ -x frontend/deploy/scripts/install-nginx-site.sh ]]; then
  bash frontend/deploy/scripts/install-nginx-site.sh || \
    echo "!! nginx site install failed — run: bash ${APP_ROOT}/frontend/deploy/scripts/install-nginx-site.sh"
else
  echo "!! Brak install-nginx-site.sh — zaktualizuj frontend i uruchom skrypt ręcznie"
fi

cat <<EOF

========================================================================
EventCater is running locally on the droplet.

Next steps:
  1) DNS w home.pl (strefa eventcater.pl):
       A     @     →  IP_DROPLETA
       A     www   →  IP_DROPLETA
  2) Po propagacji DNS:
       sudo certbot --nginx -d eventcater.pl -d www.eventcater.pl
  3) Uzupełnij MAILER_DSN w ${APP_ROOT}/.env i zrestartuj:
       cd ${APP_ROOT} && docker compose up -d
  4) Utwórz administratora SaaS:
       bash ${APP_ROOT}/frontend/deploy/scripts/init-saas.sh
  5) Panel: https://eventcater.pl/saas
     Logowanie firm: https://eventcater.pl/login

Aktualizacje później:
  bash ${APP_ROOT}/frontend/deploy/scripts/deploy.sh
========================================================================
EOF
