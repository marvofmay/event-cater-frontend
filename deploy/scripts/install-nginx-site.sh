#!/usr/bin/env bash
# Install EventCater nginx vhost. Handles sites-available OR conf.d layouts.
set -euo pipefail

APP_ROOT="${APP_ROOT:-/home/marcin/apps/eventcater}"
SRC="${APP_ROOT}/frontend/deploy/nginx/eventcater.pl.conf"

if [[ ! -f "${SRC}" ]]; then
  echo "!! Brak ${SRC} — najpierw zaktualizuj frontend (gałąź z deploy/)." >&2
  exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "==> nginx nie zainstalowany — instaluję"
  sudo apt-get update
  sudo apt-get install -y nginx
fi

sudo mkdir -p /var/www/certbot

if [[ -d /etc/nginx/sites-available ]]; then
  echo "==> Layout Debian: sites-available / sites-enabled"
  sudo cp "${SRC}" /etc/nginx/sites-available/eventcater.pl
  sudo ln -sf /etc/nginx/sites-available/eventcater.pl /etc/nginx/sites-enabled/eventcater.pl
elif [[ -d /etc/nginx/conf.d ]]; then
  echo "==> Layout conf.d"
  sudo cp "${SRC}" /etc/nginx/conf.d/eventcater.pl.conf
else
  echo "==> Tworzę /etc/nginx/conf.d"
  sudo mkdir -p /etc/nginx/conf.d
  sudo cp "${SRC}" /etc/nginx/conf.d/eventcater.pl.conf
  if [[ -f /etc/nginx/nginx.conf ]] && ! grep -q 'conf.d/\*\.conf' /etc/nginx/nginx.conf; then
    echo "!! Dopisz w http { }: include /etc/nginx/conf.d/*.conf;" >&2
  fi
fi

# Drop default site if it steals server_name _ on :80
if [[ -L /etc/nginx/sites-enabled/default ]]; then
  sudo rm -f /etc/nginx/sites-enabled/default
fi
if [[ -f /etc/nginx/conf.d/default.conf ]]; then
  sudo mv /etc/nginx/conf.d/default.conf "/etc/nginx/conf.d/default.conf.bak.$(date +%Y%m%d%H%M%S)" || true
fi

if sudo nginx -t; then
  sudo systemctl enable nginx
  sudo systemctl reload nginx || sudo systemctl restart nginx
  echo "==> nginx OK — vhost eventcater.pl aktywny"
else
  echo "!! nginx -t failed — sprawdź map \$connection_upgrade (może być już w nginx.conf)." >&2
  exit 1
fi
