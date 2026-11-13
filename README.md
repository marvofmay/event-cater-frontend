This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


Obsługa cateringu, baza miejsc i ekrany Kuchni: [dokumentacja](docs/catering.md).

## Produkcja (`eventcater.pl`)

Wdrożenie na droplecie DigitalOcean w `/home/marcin/apps/eventcater`: [deploy/README.md](deploy/README.md).

## Konta przy trialu

Osoba, która zakłada trial i podaje e-mail, staje się **pracownikiem technicznym tej firmy**. Ma pełny dostęp w tym tenancie (ustawienia, Brevo, pracownicy, pozostałe moduły). Przy starcie nie powstaje karta pracownika. Na `/me/data` widać: „Pracownik techniczny tej firmy. To konto ma pełny dostęp w tej firmie.” oraz e-mail z formularza.

Brevo (SMS) zapisuje się w **Ustawienia → Powiadomienia**, zakładka **SMS / Brevo** (`/settings/notifications`).

Jedno konto techniczne całego EventCater wchodzi do każdej firmy i loguje się na `https://eventcater.pl/saas`. Adres: `marcin.jaroszynski.gdansk@gmail.com`. Hasło zostaje takie, jakie było przy poprzednim adresie. Przeniesienie ze starego adresu: `bash frontend/deploy/scripts/set-saas-admin-email.sh`.

## Maile trialu i abonamentu

Wychodzą ze skrzynki `PASSWORD_RESET_SENDER` przez `MAILER_DSN` (smtp.home.pl). Brevo służy tylko do SMS. Worker `worker-trials` sprawdza terminy co godzinę (`app:saas:process-trials`). Adresatem maili do firmy jest e-mail z formularza trialu (`contact_email`).

| Kiedy | Do kogo | Temat |
|-------|---------|--------|
| Trial gotowy | właściciel | EventCater - dane logowania do triala (30 dni) |
| Trial gotowy | `TRIAL_NOTIFY_EMAIL` (kontakt@eventcater.pl) | EventCater - nowy trial: nazwa firmy |
| 5 dni, 3 dni i 24 h przed końcem triala | właściciel | EventCater - koniec triala za 5 dni / 3 dni / 24 godziny |
| Koniec triala | właściciel | EventCater - koniec triala, konto zawieszone |
| Wpłata 99 zł brutto zaksięgowana | właściciel | EventCater - abonament opłacony |
| 3 dni po terminie opłaconego miesiąca, raz | właściciel | EventCater - prośba o opłacenie abonamentu |
| 14 dni po terminie opłaconego miesiąca, brak wpłaty | właściciel | EventCater - minęło 14 dni, konto zawieszone |

Trial: po terminie konto jest zawieszane. Dane zostają 7 dni, potem baza triala jest usuwana, jeśli abonament nie został opłacony. Link do opłaty: `https://eventcater.pl/oplata`.

Opłacony abonament: 3 dni po `paid_until` idzie jedno przypomnienie, konto zostaje aktywne. 14 dni po terminie, bez nowej wpłaty BLIK, konto jest zawieszane. Dane zostają. Wpłata w tym czasie przedłuża miesiąc i kasuje znacznik przypomnienia.

## Logowanie nowego pracownika

Po utworzeniu konta pracownika (formularz lub import):

- **Login:** pierwszy numer telefonu pracownika (znormalizowany) — nie e-mail.
- **Hasło startowe:** PESEL (także fikcyjny, jeśli tak oznaczono).
- Przy pierwszym logowaniu system wymaga **zmiany hasła**.

Szczegóły po stronie API: [event-cater-backend/README.md](../event-cater-backend/README.md).
