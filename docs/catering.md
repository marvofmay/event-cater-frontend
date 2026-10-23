# Obsługa cateringu

Nowe widoki dla przyjęć i wydarzeń obsługiwanych wyjazdowo lub w bazie firmy:

- `/catering/events` — lista, filtry i tworzenie wydarzenia;
- `/catering/events/{uuid}` — dane, zapisane miejsce, kontakty, menu, zespół, kompletacja, kuchnia, prywatne zdjęcia/filmy i historia;
- `/catering/venues` — baza powtarzających się miejsc obsługi, adresy, kontakty i instrukcje logistyczne;
- `/catering/equipment` — katalog sprzętu;
- `/catering/supplies` — produkty i materiały zużywalne;
- `/catering/templates` — szablony kompletacji: ilości stałe lub na liczbę gości z zapasem;
- `/catering/kitchen` — dzienny plan produkcji z oddzielnymi kartami wydarzeń.

Kafelki istniejącego pulpitu Wydarzenia, Sprzęt, Produkty i Kuchnia prowadzą do tych ekranów. Nawigacja i działania korzystają z uprawnień obecnego `UserProvider`; backend niezależnie sprawdza każde żądanie. Po dodaniu modułów lub uprawnień należy ponownie się zalogować, żeby odświeżyć uprawnienia zapisane w JWT.

## Typowy przebieg

Zapisz obsłużone miejsce w bazie (również ze starego wydarzenia), a przy nowym wydarzeniu wybierz je z podpowiedzi. Adres zostaje wczytany do edytowalnego formularza. Wczytanie miejsca w istniejącym wydarzeniu pozwala jawnie zastąpić kontakty. Zmiana katalogu nie zmienia historii przyjęć.

W menu podaj liczbę porcji każdej potrawy i wariantu dietetycznego. W zakładce Kompletacja dodaj sprzęt/produkty z katalogów albo zastosuj szablon. Ustal odpowiedzialnego i termin, zatwierdź listę, następnie zapisuj faktycznie przygotowane i załadowane ilości. Zmniejszenie ilości wymaga powodu korekty, a wyjazd z brakami dodatkowego uprawnienia i uzasadnienia.

W zakładce Kuchnia utwórz kartę z menu, wybierz wyjazd lub obsługę w bazie, odpowiedzialnego, dzień produkcji i termin gotowości. Wydaj kartę kucharzom i pobierz PDF. Dzienny plan używa dnia produkcji, który może być wcześniejszy niż dzień wydarzenia.

Późniejsza zmiana menu nie nadpisuje karty. Edytor pokazuje bieżące menu i pozwala zgłosić propozycję zmiany. Kuchnia widzi różnice i osobno je akceptuje lub odrzuca. Wykonanie pozostaje zapisane, również po zmniejszeniu zamówienia. Wczytanie aktualnego menu jako nowych pozycji zachowuje wcześniej produkowane potrawy jako wycofane z planu (wymagana ilość 0); nie dopasowuje dań automatycznie po nazwie.

## API i uruchomienie

Przeglądarka wysyła żądania do `/api` w tym samym originie. Next.js przekazuje je do backendu przez `rewrites`; adresów Dockera i klucza JWT nie przekazuje się w URL. Nagłówek Authorization jest przekazywany również przy pobieraniu prywatnych materiałów i PDF.

Adres backendu określa `API_INTERNAL_URL` (zalecane, po stronie serwera), ewentualnie dotychczasowe `NEXT_PUBLIC_API_URL_DOCKER`/`NEXT_PUBLIC_API_URL_HOST`. Dla lokalnego środowiska domyślnie `http://localhost:81`; w kontenerze należy podać nazwę osiągalnej usługi. Zmienną należy ustawić przy budowaniu i uruchamianiu. Limit proxy 110 MB odpowiada maksymalnym plikom 100 MB i narzutowi multipart po stronie backendu.

```bash
API_INTERNAL_URL=http://localhost:81 npm run build -- --webpack
API_INTERNAL_URL=http://localhost:81 npm start
```

Wymagane są migracje backendu do `Version20261023120000` oraz uruchomienie `app:initialize-system-default-data`. Role otrzymują nowe uprawnienia świadomie; sam frontend ich nie nadaje.

Konflikt wersji pokazuje komunikat i wymaga odświeżenia/porównania danych zamiast automatycznego ponowienia zapisu. Formularze menu, kontaktów i danych ostrzegają przy porzucaniu niezapisanych zmian. Daty i godziny wydarzenia są w jego strefie czasowej; API otrzymuje czas z offsetem. Brak uprawnień, wygasła sesja i błędy połączenia są sygnalizowane w interfejsie.

## Weryfikacja

```bash
npx tsc --noEmit
npm run build -- --webpack
```

Test przeglądarkowy uruchamia się oddzielnie od starych testów logowania, których konfiguracja zakłada inne adresy i konto:

```bash
CATERING_TEST_EMAIL=... CATERING_TEST_PASSWORD=... CATERING_TEST_OWNER=... \
  npx playwright test --config=playwright.catering.config.ts
```

`CATERING_TEST_OWNER` to nazwa aktywnego pracownika w wydzielonej bazie developerskiej. Opcjonalnie `PLAYWRIGHT_CHROMIUM_EXECUTABLE` wskazuje zainstalowane Chromium. Konfiguracja uruchamia zbudowany frontend na porcie 3002 (można zmienić przez `CATERING_PORT`). Brak danych testowego konta powoduje pominięcie testu. Nie uruchamiać go na produkcji: tworzy własne techniczne wydarzenie, karty i katalogi, a po teście anuluje/archiwizuje te rekordy, zachowując historię. Hasła i JWT nie są zapisywane w śladach Playwrighta.

Receptury, wspólne partie, lista zakupów, stany magazynowe oraz osobny wydruk listy kompletacji pozostają kolejnymi etapami.

## SaaS

Panel operatora: `/saas` (osobne konto i sesja). Tworzenie klientów, przygotowanie bazy, statusy i historia zmian. Logowanie pracowników `/login` zawiera kod firmy; dotychczasowe dane są pod kodem `default`. Kontekst przekazuje proxy w nagłówku `X-Tenant`; API wiąże go z JWT. Dokumentacja instalacji: `event-cater-backend/docs/saas.md`.

Testy panelu: `npx playwright test --config playwright.saas.config.ts`, zmienne `SAAS_TEST_EMAIL`, `SAAS_TEST_PASSWORD`, opcjonalnie `SAAS_TEST_URL` i `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Używać środowiska testowego/deweloperskiego; test tworzy klienta i na końcu usuwa go logicznie.
