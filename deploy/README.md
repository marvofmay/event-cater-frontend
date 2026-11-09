# Wdrożenie EventCater na DigitalOcean (`eventcater.pl`)

Cel: katalog `/home/marcin/apps/eventcater` na droplecie, domena `eventcater.pl` (home.pl), stack Docker + nginx.

## Architektura

```
Internet → istniejący edge proxy na droplecie (:80/:443 w Dockerze)
        → Next.js 127.0.0.1:3010  →  Symfony API (sieć Dockera)
        ↘ Mercure 127.0.0.1:3011
```

Na wspólnym droplecie (obok `aestio` itd.) **80/443 zwykle już zajmuje kontener** (Nginx Proxy Manager / Traefik). Nie uruchamiaj hostowego `nginx.service` — podepnij domenę pod ten edge proxy. Instrukcja: [PROXY.md](PROXY.md).

Porty hosta `3010`/`3011` są celowo inne niż typowe `3000`/`3001`.

Przeglądarka woła `/api` na tym samym originie; Next.js proxy’uje do kontenera `service-company`. Mercure jest pod `https://eventcater.pl/.well-known/mercure`.

## Wymagania na droplecie

- Docker + Docker Compose plugin
- nginx
- certbot (`python3-certbot-nginx`)
- konto `marcin` w grupie `docker`
- otwarte porty 80/443 w firewalu DigitalOcean (i ufw, jeśli włączony)
- **uwaga RAM:** droplet 2 GB — stack jest okrojony (jeden worker zamiast wielu). Po starcie warto mieć ~300–500 MB wolnej pamięci; przy OOM zwiększ droplet albo wyłącz RabbitMQ management.

## 1. DNS w home.pl

W panelu home.pl → domena `eventcater.pl` → DNS:

| Typ | Nazwa hosta | Wartość |
|-----|-------------|---------|
| A   | `@` (lub puste) | publiczne IPv4 dropleta |
| A   | `www` | to samo IPv4 |

NS już wskazują na `dns.home.pl` / `dns2` / `dns3`. Po zapisie poczekaj na propagację (`dig +short eventcater.pl A`).

## 2. Bootstrap na droplecie

Zaloguj się po SSH i uruchom:

Dopóki `deploy/` nie jest na `main`, klonuj gałąź z pakietem wdrożeniowym:

```bash
git clone -b cursor/deploy-eventcater-pl-bea3 \
  https://github.com/marvofmay/event-cater-frontend.git /tmp/ec-front
bash /tmp/ec-front/deploy/scripts/bootstrap-droplet.sh
```

Skrypt sam bierze ref z katalogu, z którego go uruchamiasz (nie z `main`).
Jeśli wcześniej sklonował `main` bez `deploy/`, po prostu uruchom ponownie powyższe — przestawi `frontend` na właściwą gałąź.

Po merge na `main`:

```bash
git clone https://github.com/marvofmay/event-cater-frontend.git /tmp/ec-front
bash /tmp/ec-front/deploy/scripts/bootstrap-droplet.sh
```

Skrypt:

1. tworzy `/home/marcin/apps/eventcater/{frontend,backend}`
2. generuje `.env` z sekretami
3. generuje klucze JWT
4. buduje i startuje Compose
5. odpala migracje + granty SaaS
6. instaluje vhost nginx

## 3. TLS

Po poprawnym DNS:

```bash
sudo certbot --nginx -d eventcater.pl -d www.eventcater.pl
```

## 4. Poczta i SaaS

1. Uzupełnij `MAILER_DSN` w `/home/marcin/apps/eventcater/.env` (SMTP home.pl lub innego dostawcy).
2. `cd /home/marcin/apps/eventcater && docker compose up -d`
3. `bash frontend/deploy/scripts/init-saas.sh twoj@email.pl`
4. Wejdź na `https://eventcater.pl/saas`, dodaj klienta, po `ready` ustaw `active`.

## 5. Aktualizacje

```bash
bash /home/marcin/apps/eventcater/frontend/deploy/scripts/deploy.sh
```

## Pliki w tym katalogu

| Plik | Opis |
|------|------|
| `docker-compose.prod.yml` | Stack produkcyjny |
| `.env.prod.example` | Szablon zmiennych |
| `Dockerfile.frontend` / `Dockerfile.backend` | Obrazy bez Xdebug / `next start` |
| `nginx/eventcater.pl.conf` | Reverse proxy |
| `scripts/bootstrap-droplet.sh` | Pierwsze uruchomienie |
| `scripts/deploy.sh` | Update |
| `scripts/init-saas.sh` | Pierwszy admin SaaS |

## Bezpieczeństwo

- Porty MySQL, Redis, RabbitMQ, API Apache **nie** są wystawione na świat — tylko `127.0.0.1:3000` i `127.0.0.1:3001`.
- Nie commituj `.env` ani `backend/config/jwt/*.pem`.
- Hasła w przykładach deweloperskich backendu nie nadają się na produkcję; bootstrap generuje nowe.
