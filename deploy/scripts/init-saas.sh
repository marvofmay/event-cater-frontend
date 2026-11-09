#!/usr/bin/env bash
# Create the first SaaS super-administrator (interactive password prompt).
set -euo pipefail

APP_ROOT="${APP_ROOT:-/home/marcin/apps/eventcater}"
EMAIL="${1:-}"

cd "${APP_ROOT}"

if [[ -z "${EMAIL}" ]]; then
  read -r -p "E-mail administratora SaaS: " EMAIL
fi

if [[ -z "${EMAIL}" ]]; then
  echo "Podaj e-mail." >&2
  exit 1
fi

echo "Hasło zostanie wczytane ukrycie (nie pojawia się w historii procesów jako argument)."
docker compose exec -it service-company php bin/console app:saas:create-administrator "${EMAIL}"

echo
echo "Zaloguj się na https://eventcater.pl/saas"
echo "Następnie dodaj pierwszego klienta (tenant) i po statusie ready ustaw active."
