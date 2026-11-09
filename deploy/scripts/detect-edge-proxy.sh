#!/usr/bin/env bash
# Show which container owns :80/:443 and suggest how to attach EventCater.
set -euo pipefail

echo "==> Porty 80/443/8088 na hoście:"
ss -tlnp | grep -E ':80 |:443 |:8088 |:81 ' || true
echo

echo "==> Kontenery publikujące 80/443:"
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}' | awk 'NR==1 || /:80->|:443->|:80\/|:443\//'
echo

echo "==> Wszystkie kontenery (skrót):"
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
echo

GW="$(docker network inspect bridge --format '{{(index .IPAM.Config 0).Gateway}}' 2>/dev/null || echo '172.17.0.1')"
echo "==> Z kontenera proxy celuj w EventCater przez bramę Dockera: ${GW}:3010 (frontend), ${GW}:3011 (mercure)"
echo "    Nie używaj 127.0.0.1 z wnętrza kontenera proxy."
echo
echo "Szczegóły: frontend/deploy/PROXY.md"
echo "Hostowego nginx NIE uruchamiaj, jeśli Docker już trzyma :80/:443:"
echo "  sudo systemctl disable --now nginx"
