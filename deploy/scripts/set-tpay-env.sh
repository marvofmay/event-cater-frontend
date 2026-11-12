#!/usr/bin/env bash
# Copy the five TPAY_* lines from a local file into the EventCater .env.
# Values are not printed. The source file is removed after a successful write.
set -euo pipefail

APP_ROOT="${APP_ROOT:-/home/marcin/apps/eventcater}"
ENV_FILE="${APP_ROOT}/.env"
SOURCE="${1:-${APP_ROOT}/tpay.env}"

keys=(TPAY_ENV TPAY_CLIENT_ID TPAY_CLIENT_SECRET TPAY_MERCHANT_ID TPAY_SECURITY_CODE)

if [[ ! -f "${SOURCE}" ]]; then
  echo "Brak pliku ${SOURCE}" >&2
  echo "Utwórz go na serwerze (pięć linii KEY=wartość) i uruchom skrypt ponownie." >&2
  exit 1
fi
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Brak ${ENV_FILE}" >&2
  exit 1
fi

declare -A values=()
while IFS= read -r line || [[ -n "${line}" ]]; do
  line="${line%$'\r'}"
  [[ -z "${line}" || "${line}" =~ ^[[:space:]]*# ]] && continue
  if [[ ! "${line}" =~ ^([A-Za-z0-9_]+)=(.*)$ ]]; then
    echo "W pliku jest linia bez postaci KLUCZ=wartość. Popraw plik i uruchom ponownie." >&2
    exit 1
  fi
  key="${BASH_REMATCH[1]}"
  val="${BASH_REMATCH[2]}"
  if [[ "${val}" =~ ^\"(.*)\"$ || "${val}" =~ ^\'(.*)\'$ ]]; then
    val="${BASH_REMATCH[1]}"
  fi
  allowed=0
  for known in "${keys[@]}"; do
    if [[ "${known}" == "${key}" ]]; then
      allowed=1
    fi
  done
  if [[ "${allowed}" -ne 1 ]]; then
    echo "Niedozwolony klucz: ${key}. Dozwolone są tylko TPAY_ENV, TPAY_CLIENT_ID, TPAY_CLIENT_SECRET, TPAY_MERCHANT_ID, TPAY_SECURITY_CODE." >&2
    exit 1
  fi
  if [[ -z "${val}" || "${val}" =~ ^[[:space:]]+$ ]]; then
    echo "Pusta wartość: ${key}" >&2
    exit 1
  fi
  values["${key}"]="${val}"
done < "${SOURCE}"

for key in "${keys[@]}"; do
  if [[ -z "${values[${key}]:-}" ]]; then
    echo "Brak ${key} w ${SOURCE}" >&2
    exit 1
  fi
done

if [[ "${values[TPAY_ENV]}" != "sandbox" && "${values[TPAY_ENV]}" != "production" ]]; then
  echo "TPAY_ENV musi być sandbox albo production." >&2
  exit 1
fi

quote_env() {
  local val="$1"
  if [[ "${val}" =~ ^[A-Za-z0-9_./:+-]+$ ]]; then
    printf '%s' "${val}"
    return
  fi
  val="${val//\\/\\\\}"
  val="${val//\"/\\\"}"
  val="${val//\$/\\\$}"
  printf '"%s"' "${val}"
}

tmp="$(mktemp)"
cleanup() { rm -f "${tmp}"; }
trap cleanup EXIT

declare -A seen=()
while IFS= read -r line || [[ -n "${line}" ]]; do
  replaced=0
  for key in "${keys[@]}"; do
    if [[ "${line}" == "${key}="* ]]; then
      printf '%s=%s\n' "${key}" "$(quote_env "${values[${key}]}")" >> "${tmp}"
      seen["${key}"]=1
      replaced=1
      break
    fi
  done
  if [[ "${replaced}" -eq 0 ]]; then
    printf '%s\n' "${line}" >> "${tmp}"
  fi
done < "${ENV_FILE}"

for key in "${keys[@]}"; do
  if [[ -z "${seen[${key}]:-}" ]]; then
    printf '%s=%s\n' "${key}" "$(quote_env "${values[${key}]}")" >> "${tmp}"
  fi
done

cat "${tmp}" > "${ENV_FILE}"
# The API runs as www-data and reads this mounted file. 600 root-only breaks boot.
chmod 644 "${ENV_FILE}"
if [[ -d "${APP_ROOT}/backend" ]]; then
  cat "${ENV_FILE}" > "${APP_ROOT}/backend/.env"
  chmod 644 "${APP_ROOT}/backend/.env"
fi
rm -f "${SOURCE}"

echo "Zapisane w ${ENV_FILE}: TPAY_ENV, TPAY_CLIENT_ID, TPAY_CLIENT_SECRET, TPAY_MERCHANT_ID, TPAY_SECURITY_CODE."
echo "Plik źródłowy usunięty. Wartości nie zostały wypisane."
