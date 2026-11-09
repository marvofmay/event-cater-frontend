#!/usr/bin/env bash
# Ensure Lexik JWT keys exist on the host and are readable by www-data in the API container.
set -euo pipefail

APP_ROOT="${APP_ROOT:-/home/marcin/apps/eventcater}"
JWT_DIR="${APP_ROOT}/backend/config/jwt"
cd "${APP_ROOT}"

mkdir -p "${JWT_DIR}"

# shellcheck disable=SC1091
JWT_PASSPHRASE="$(grep -E '^JWT_PASSPHRASE=' .env | tail -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
if [[ -z "${JWT_PASSPHRASE}" ]]; then
  echo "!! Brak JWT_PASSPHRASE w .env" >&2
  exit 1
fi

if [[ ! -f "${JWT_DIR}/private.pem" || ! -f "${JWT_DIR}/public.pem" ]]; then
  echo "==> Generuję brakujące klucze JWT"
  openssl genpkey -out "${JWT_DIR}/private.pem" -aes256 -algorithm rsa \
    -pkeyopt rsa_keygen_bits:4096 -pass "pass:${JWT_PASSPHRASE}"
  openssl pkey -in "${JWT_DIR}/private.pem" -passin "pass:${JWT_PASSPHRASE}" \
    -out "${JWT_DIR}/public.pem" -pubout
fi

# Apache (www-data) must read the bind-mounted keys
chmod 644 "${JWT_DIR}/private.pem" "${JWT_DIR}/public.pem"

echo "==> Host:"
ls -la "${JWT_DIR}"

docker compose up -d service-company
echo "==> W kontenerze (www-data):"
docker compose exec -T -u www-data service-company ls -la /var/www/html/config/jwt/
docker compose exec -T -u www-data service-company php -r \
  'echo is_readable("/var/www/html/config/jwt/private.pem") ? "private readable\n" : "private NOT readable\n";'

echo "==> Test login (oczekiwane 401 przy złym haśle, NIE 500 o JWT):"
curl -sS -o /tmp/login-out.json -w '%{http_code}\n' https://eventcater.pl/api/login \
  -H 'Content-Type: application/json' \
  -H 'X-Tenant: default' \
  -d '{"email":"nobody@example.com","password":"x"}' || true
cat /tmp/login-out.json; echo
