#!/usr/bin/env bash
# Point the single cross-tenant technical account at a new e-mail. Password stays.
set -euo pipefail

APP_ROOT="${APP_ROOT:-/home/marcin/apps/eventcater}"
OLD="${1:-ec.admin@gmail.com}"
NEW="${2:-marcin.jaroszynski.gdansk@gmail.com}"

cd "${APP_ROOT}"
MYSQL_ROOT_PASSWORD="$(grep -E '^MYSQL_ROOT_PASSWORD=' .env | tail -n1 | cut -d= -f2- | tr -d '"')"
raw="$(grep -E '^DATABASE_URL=' .env | tail -n1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
control="${raw##*/}"
control="${control%%\?*}"

sql_escape() { printf '%s' "$1" | sed "s/'/''/g"; }
OLD="$(sql_escape "${OLD}")"
NEW="$(sql_escape "${NEW}")"

mysql_exec() {
  docker compose --env-file .env exec -T service-company-db mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" -N -e "$1"
}

mysql_exec "UPDATE \`${control}\`.saas_administrator SET email='${NEW}' WHERE email='${OLD}'; SELECT ROW_COUNT();"
echo "saas_administrator: ${OLD} -> ${NEW}"

mysql_exec "SELECT database_name FROM \`${control}\`.saas_tenant WHERE database_name LIKE 'ec_tenant_%'" | while read -r database; do
  [[ "${database}" =~ ^ec_tenant_[a-f0-9]{32}$ ]] || continue
  mysql_exec "UPDATE \`${database}\`.user SET email='${NEW}' WHERE email='${OLD}' AND saas_administrator_uuid IS NOT NULL; SELECT ROW_COUNT();" \
    && echo "tenant ${database}: zaktualizowano konto techniczne" \
    || echo "tenant ${database}: pominięto"
done

echo "Logowanie operatora: ${NEW} (hasło bez zmian) na https://eventcater.pl/saas"
