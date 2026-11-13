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

1. Uzupełnij `MAILER_DSN` w `/home/marcin/apps/eventcater/.env`. Poczta domeny jest na home.pl (`MX` → `poczta….home.pl`). `smtp://127.0.0.1:25` nic nie dostarcza: na Droplecie nie ma lokalnego serwera poczty, a DigitalOcean blokuje wyjście na port 25. Brevo w tej aplikacji służy tylko do SMS, nie do tych maili.
   ```bash
   MAILER_DSN=smtp://kontakt%40eventcater.pl:HASLO_SKRZYNKI@smtp.home.pl:587
   PASSWORD_RESET_SENDER=kontakt@eventcater.pl
   ```
   Nadawca musi być istniejącą skrzynką home.pl. Znak `@` w loginie koduj jako `%40`. Hasła nie wklejaj do czatu.
2. Upewnij się, że w `.env` są też: `TRIAL_NOTIFY_EMAIL=kontakt@eventcater.pl`, `APP_URL=https://eventcater.pl`.
3. `cd /home/marcin/apps/eventcater && docker compose up -d`
4. `bash frontend/deploy/scripts/init-saas.sh twoj@email.pl`
5. Wejdź na `https://eventcater.pl/saas`, dodaj klienta, po `ready` ustaw `active`.

### Trial (30 dni)

Publiczny formularz: `https://eventcater.pl/trial` → `POST /api/saas/trial`.

Osoba z e-maila w formularzu jest pracownikiem technicznym tej firmy i ma pełny dostęp w tym tenancie. Karty pracownika przy starcie nie ma. Na `/me/data` widać tekst „Pracownik techniczny tej firmy” i ten e-mail. Brevo zapisuje w **Ustawienia → Powiadomienia → SMS / Brevo**.

Jedno konto techniczne całego EventCater loguje się na `https://eventcater.pl/saas` adresem `marcin.jaroszynski.gdansk@gmail.com`. Hasło zostaje z poprzedniego konta. Przeniesienie: `bash frontend/deploy/scripts/set-saas-admin-email.sh`.

Maile idą ze skrzynki `PASSWORD_RESET_SENDER` (smtp.home.pl), nie z Brevo. Worker `worker-trials` odpala `app:saas:process-trials` co godzinę. Odbiorcą maili do firmy jest `contact_email` z trialu.

| Kiedy | Do kogo | Temat |
|-------|---------|--------|
| Trial gotowy | właściciel | EventCater - dane logowania do triala (30 dni) |
| Trial gotowy | `TRIAL_NOTIFY_EMAIL` | EventCater - nowy trial: nazwa firmy |
| 5 dni, 3 dni i 24 h przed końcem triala | właściciel | EventCater - koniec triala za 5 dni / 3 dni / 24 godziny |
| Koniec triala | właściciel | EventCater - koniec triala, konto zawieszone |
| Wpłata 99 zł brutto zaksięgowana | właściciel | EventCater - abonament opłacony |
| 3 dni po terminie opłaconego miesiąca, raz | właściciel | EventCater - prośba o opłacenie abonamentu |
| 14 dni po terminie, brak wpłaty | właściciel | EventCater - minęło 14 dni, konto zawieszone |

- Po założeniu trialu właściciel dostaje login, hasło i datę końca. To samo hasło widać na ekranie. Kopia informacji o nowym trialu idzie na `kontakt@eventcater.pl`.
- Przypomnienia trialu: 5 dni, 3 dni i 24 h przed końcem. Po terminie konto jest zawieszane. Dane zostają 7 dni, potem baza triala jest usuwana, jeśli abonament nie został opłacony.
- Opłata 99 zł brutto: `https://eventcater.pl/oplata`. BLIK przez Tpay. Dopóki `TPAY_ENV=sandbox`, to środowisko testowe. Dostęp przedłuża dopiero powiadomienie Tpay (albo odczyt statusu transakcji), nie samo wrócenie na stronę. Klucze wpisz do pliku `tpay.env` i uruchom `bash frontend/deploy/scripts/set-tpay-env.sh`. W panelu Tpay włącz nadpisywanie adresu powiadomień.
- Opłacony abonament: 3 dni po `paid_until` wychodzi jedno przypomnienie („prośba o opłacenie abonamentu”), konto zostaje aktywne. 14 dni po terminie, bez nowej wpłaty, konto jest zawieszane, dane zostają. Wpłata w tym czasie przedłuża miesiąc i kasuje znacznik przypomnienia.
- Ręczne wznowienie bez płatności: w panelu SaaS ustaw status zawieszonego tenanta na `active`.
- Patch backendu leży w `deploy/backend-trial/` i jest nakładany przy `deploy.sh` (oraz ręcznie: `bash frontend/deploy/scripts/apply-trial-backend.sh`).

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
