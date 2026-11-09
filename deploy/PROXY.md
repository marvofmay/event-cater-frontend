# Reverse proxy na wspólnym droplecie

Na tym serwerze **porty 80/443 są już zajęte przez kontener Dockera** (często Nginx Proxy Manager, Traefik albo nginx-proxy z `aestio` / innej apki). Hostowy `nginx.service` nie może ich przejąć — nie uruchamiaj go.

EventCater nasłuchuje lokalnie:

| Usługa   | Adres hosta        |
|----------|--------------------|
| Frontend | `127.0.0.1:3010`   |
| Mercure  | `127.0.0.1:3011`   |

## 1. Co trzyma 80/443?

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
```

### Nginx Proxy Manager (obraz `jc21/nginx-proxy-manager` lub podobny)

Panel zwykle na `http://IP_DROPLETA:81` albo `:8088`.

1. **Hosts → Proxy Hosts → Add Proxy Host**
2. Domain Names: `eventcater.pl`, `www.eventcater.pl`
3. Scheme: `http`
4. Forward Hostname / IP: **IP bramy Dockera** (nie `127.0.0.1` z wnętrza kontenera):

   ```bash
   ip -4 route show default | awk '{print $3}'
   # albo typowo:
   # 172.17.0.1
   ```

   Forward Port: `3010`
5. Włącz **Block Common Exploits**, **Websocket Support**
6. Zakładka **SSL** → Request new certificate (Let's Encrypt) dla obu nazw
7. Zakładka **Custom locations** (albo Advanced):

   Location: `/.well-known/mercure`  
   Forward to: ta sama brama, port `3011`  
   Albo w Advanced:

   ```nginx
   location /.well-known/mercure {
       proxy_pass http://172.17.0.1:3011;
       proxy_http_version 1.1;
       proxy_set_header Connection "";
       proxy_set_header Host $host;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_buffering off;
       proxy_read_timeout 24h;
   }
   ```

### Traefik

Dodaj labels do `frontend` / `mercure` w Compose (sieć Traefika musi być `external`) — patrz `docker-compose.prod.yml` komentarze albo podepnij ręcznie router na `Host(\`eventcater.pl\`)` → `http://172.17.0.1:3010`.

### Klasyczny nginx w kontenerze

Doklej vhost z `nginx/eventcater.pl.conf`, zmień `upstream` na IP hosta widoczne z kontenera (`172.17.0.1`) i przeładuj ten kontener — **nie** `systemctl start nginx` na hoście.

## 2. DNS

W home.pl: rekordy **A** `@` i `www` → publiczne IPv4 dropleta.

## 3. Hostowy nginx wyłącz

```bash
sudo systemctl disable --now nginx || true
```

## 4. Szybki test bez domeny

```bash
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3010/
docker compose -f /home/marcin/apps/eventcater/docker-compose.yml ps
```
