# Automatyczne wylogowanie

Sesja aplikacji zalogowanego pracownika lub administratora ma limit 10 minut bezczynności. Po 9 minutach pojawia się blokujące okno z odliczaniem ostatnich 60 sekund i malejącym paskiem postępu.

- „Przedłuż sesję” rozpoczyna nowy okres 10 minut bezczynności.
- „Wyloguj teraz” kończy sesję od razu.
- Brak odpowiedzi kończy sesję po upływie minuty. Escape, kliknięcie tła i przypadkowy ruch myszy nie przedłużają ostrzeżenia.
- Przed ostrzeżeniem aktywnością są interakcje użytkownika: klawiatura, wpisywanie, wskaźnik, dotyk i przewijanie. Żądania API, automatyczne odświeżanie oraz samo przełączenie karty nie są aktywnością.

Termin jest liczony ze znaczników czasu, a nie z liczby wykonanych tyknięć timera. Powrót z uśpienia, ponowne wyświetlenie karty i odświeżenie strony sprawdzają dotychczasowy termin. Stan ostatniej aktywności jest powiązany z `tokenUUID` i synchronizowany przez `localStorage`; aktywność, przedłużenie i wylogowanie dotyczą wszystkich kart tej samej sesji. Zapisy aktywności są ograniczone do jednego na sekundę, a timer poza ostrzeżeniem nie renderuje interfejsu co sekundę.

Wylogowanie od razu usuwa lokalny token i uprawnienia, pokazuje toast informacyjny i kieruje do `/login` bez przeładowania całej strony. Ręczne wylogowanie pokazuje „Wylogowano pomyślnie.”, a zakończenie sesji po bezczynności informuje o jej przyczynie. Toast pozostaje widoczny po przekierowaniu. Równocześnie wysyła `POST /api/logout` z tokenem oraz właściwym tenantem, aby istniejący backend unieważnił JWT. Powolny lub niedostępny backend nie blokuje lokalnego wylogowania. Ostatnio wybrana firma pozostaje zapamiętana.

To mechanizm bezczynności interfejsu biznesowego; nie zmienia czasu ważności JWT ani niezależnych sesji panelu SaaS. Przedłużenie okresu bezczynności nie odnawia wygasłego JWT. Po stronie API nadal obowiązują istniejące mechanizmy ważności i unieważniania tokenów. Wyłączony JavaScript lub niedostępna sieć nie zapewniają serwerowego unieważnienia; osobna polityka bezczynności wymuszana wyłącznie przez API wymagałaby stanu sesji i sygnałów aktywności po stronie serwera.
