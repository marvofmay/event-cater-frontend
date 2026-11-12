"use client";

import Link from "next/link";
import localFont from "next/font/local";
import SiteFooter from "../components/landing/SiteFooter";
import "../components/landing/landing.css";

const display = localFont({
  src: "../../public/fonts/GeistVF.woff",
  variable: "--font-ec-display",
  weight: "100 900",
});

const sans = localFont({
  src: "../../public/fonts/GeistVF.woff",
  variable: "--font-ec-sans",
  weight: "100 900",
});

const PrivacyPolicyPage = () => {
  const year = new Date().getFullYear();

  return (
    <div className={`ec-landing ${display.variable} ${sans.variable}`}>
      <main className="ec-legal-wrap">
        <Link className="ec-legal-back" href="/">
          ← EventCater
        </Link>
        <h1>Polityka prywatności</h1>
        <p className="ec-legal-meta">
          Obowiązuje od 9 listopada 2026 r. · RODO / ochrona danych osobowych
        </p>

        <h2>1. Administrator danych</h2>
        <p>
          Administratorem danych osobowych przetwarzanych w związku z korzystaniem
          z systemu EventCater (strona internetowa, panel webowy oraz aplikacja
          mobilna) jest:
        </p>
        <p>
          <strong>Marcin Jaroszyński</strong>
          <br />
          ul. Starogardzka 113/44
          <br />
          83-010 Straszyn
          <br />
          tel.{" "}
          <a href="tel:+48880940545">880-940-545</a>
          <br />
          e-mail:{" "}
          <a href="mailto:kontakt@eventcater.pl">kontakt@eventcater.pl</a>
        </p>

        <h2>2. Zakres i cele przetwarzania</h2>
        <p>Przetwarzamy dane w szczególności w celu:</p>
        <ul>
          <li>świadczenia usługi EventCater (konta firm, logowanie, obsługa wydarzeń),</li>
          <li>kontaktu z klientami i użytkownikami systemu,</li>
          <li>zapewnienia bezpieczeństwa, rozliczeń i wsparcia technicznego,</li>
          <li>wypełnienia obowiązków prawnych (np. podatkowych, rachunkowych).</li>
        </ul>
        <p>
          W systemie mogą być przetwarzane m.in. dane identyfikacyjne i kontaktowe
          użytkowników (np. imię, nazwisko, e-mail, telefon), dane firmowe klientów
          EventCater oraz dane operacyjne związane z obsługą wydarzeń cateringowych,
          wprowadzane przez daną firmę.
        </p>

        <h2>3. Podstawy prawne (RODO)</h2>
        <ul>
          <li>art. 6 ust. 1 lit. b RODO - wykonanie umowy / świadczenie usługi,</li>
          <li>art. 6 ust. 1 lit. c RODO - obowiązek prawny,</li>
          <li>art. 6 ust. 1 lit. f RODO - prawnie uzasadniony interes administratora
            (bezpieczeństwo systemu, kontakt, dochodzenie roszczeń),</li>
          <li>art. 6 ust. 1 lit. a RODO - zgoda, gdy jest wymagana.</li>
        </ul>

        <h2>4. Odbiorcy danych</h2>
        <p>
          Dane mogą być powierzane sprawdzonym dostawcom usług IT (hosting,
          infrastruktura serwerowa, poczta) wyłącznie w zakresie niezbędnym do
          działania EventCater. Nie sprzedajemy danych osobowych.
        </p>
        <p>
          Firmy korzystające z EventCater (tenanty) samodzielnie odpowiadają za dane,
          które wprowadzają do swojej przestrzeni w systemie, w zakresie własnej
          działalności.
        </p>

        <h2>5. Okres przechowywania</h2>
        <p>
          Dane przechowujemy przez czas korzystania z usługi oraz przez okres
          wymagany przepisami prawa lub do czasu przedawnienia ewentualnych roszczeń.
          Dane przetwarzane na podstawie zgody - do jej wycofania.
        </p>

        <h2>6. Prawa osób, których dane dotyczą</h2>
        <p>Przysługuje Państwu prawo do:</p>
        <ul>
          <li>dostępu do danych,</li>
          <li>sprostowania danych,</li>
          <li>usunięcia danych („prawo do bycia zapomnianym”),</li>
          <li>ograniczenia przetwarzania,</li>
          <li>przenoszenia danych,</li>
          <li>sprzeciwu wobec przetwarzania,</li>
          <li>wycofania zgody (jeśli przetwarzanie na niej opiera się),</li>
          <li>
            wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (UODO).
          </li>
        </ul>
        <p>
          W sprawach ochrony danych prosimy o kontakt:{" "}
          <a href="mailto:kontakt@eventcater.pl">kontakt@eventcater.pl</a>.
        </p>

        <h2>7. Pliki cookies i dane techniczne</h2>
        <p>
          Strona i aplikacja mogą wykorzystywać niezbędne pliki cookies oraz lokalne
          dane sesji (np. token logowania, wybór firmy) w celu działania systemu.
          Dane techniczne (np. adres IP, logi serwera) mogą być przetwarzane w celach
          bezpieczeństwa i diagnostyki.
        </p>

        <h2>8. Bezpieczeństwo</h2>
        <p>
          Stosujemy środki organizacyjne i techniczne adekwatne do ryzyka, w tym
          szyfrowanie połączeń (HTTPS) oraz kontrolę dostępu do kont i danych firm.
        </p>

        <h2>9. Kontakt</h2>
        <p>
          Marcin Jaroszyński
          <br />
          ul. Starogardzka 113/44, 83-010 Straszyn
          <br />
          tel. 880-940-545
          <br />
          e-mail: kontakt@eventcater.pl
        </p>
      </main>

      <SiteFooter
        year={year}
        links={[
          { href: "/", label: "Strona główna" },
          { href: "/login", label: "Logowanie" },
        ]}
      />
    </div>
  );
};

export default PrivacyPolicyPage;
