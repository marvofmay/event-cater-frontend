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
fi

# Drop default site if it steals :80
if [[ -L /etc/nginx/sites-enabled/default ]]; then
  sudo rm -f /etc/nginx/sites-enabled/default
fi
if [[ -f /etc/nginx/conf.d/default.conf ]]; then
  sudo mv /etc/nginx/conf.d/default.conf "/etc/nginx/conf.d/default.conf.bak.$(date +%Y%m%d%H%M%S)" || true
fi

echo "==> Co zajmuje porty 80/443:"
sudo ss -tlnp | grep -E ':80 |:443 ' || echo "(nic nie nasłuchuje — OK)"

if ! sudo nginx -t; then
  echo "!! nginx -t failed" >&2
  exit 1
fi

sudo systemctl enable nginx

if sudo systemctl restart nginx; then
  echo "==> nginx OK — vhost eventcater.pl aktywny"
  sudo systemctl --no-pager --full status nginx | head -20
  exit 0
fi

echo "!! Nie udało się uruchomić nginx — log:" >&2
sudo journalctl -xeu nginx.service --no-pager -n 40 || true
echo >&2
echo "Częsta przyczyna: port 80 zajęty przez apache2 / inny reverse proxy / kontener." >&2
echo "Sprawdź: sudo ss -tlnp | grep -E ':80|:443'" >&2
echo "Jeśli apache2: sudo systemctl stop apache2 && sudo systemctl disable apache2 && sudo systemctl restart nginx" >&2
exit 1
