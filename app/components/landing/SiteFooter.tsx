"use client";

import Link from "next/link";
import { ReactNode, useEffect, useId, useRef, useState } from "react";

const TermsBody = () => (
  <>
    <p className="ec-legal-meta">
      Obowiązuje od 12 listopada 2026 r. · usługa dla firm (B2B)
    </p>
    <h2>1. Usługodawca</h2>
    <p>
      Usługę EventCater świadczy Marcin Jaroszyński, ul. Starogardzka 113/44,
      83-010 Straszyn, tel. 880-940-545, e-mail kontakt@eventcater.pl.
    </p>
    <h2>2. Usługa</h2>
    <p>
      EventCater to oprogramowanie w modelu SaaS dla firm cateringowych
      obsługujących wydarzenia: panel w przeglądarce oraz aplikacja mobilna
      dla ekipy. Usługa obejmuje osobną przestrzeń firmy, konta użytkowników,
      wydarzenia, kuchnię, kompletację i komunikację wewnętrzną w zakresie
      udostępnionym w danym momencie.
    </p>
    <h2>3. Trial</h2>
    <p>
      Nowa firma może uruchomić 30-dniowy trial. Po jego końcu konto zostaje
      zawieszone. Dane pozostają jeszcze 7 dni. Jeśli w tym czasie abonament
      nie zostanie opłacony, dane trialowe są usuwane.
    </p>
    <h2>4. Cena</h2>
    <p>
      Po trialu abonament wynosi 99 zł brutto za każdy miesiąc korzystania z
      usługi dla jednej firmy. Cena jest kwotą brutto. Rezygnacja jest możliwa
      w dowolnym momencie, bez okresu wypowiedzenia. Opłacony miesiąc trwa do
      jego końca.
    </p>
    <h2>5. Płatności</h2>
    <p>
      Płatność za miesiąc odbywa się na stronie opłaty: BLIK-iem przez Tpay
      albo przelewem tradycyjnym na konto Banku Millennium. Obecnie Tpay działa
      w środowisku testowym (sandbox). Dostęp przy BLIK przedłuża wyłącznie
      potwierdzenie płatności po stronie Tpay, nie samo otwarcie strony
      powrotu. Przelew tradycyjny przedłuża dostęp po zaksięgowaniu wpłaty.
    </p>
    <h2>6. Konto i obowiązki</h2>
    <p>
      Klient podaje prawdziwe dane firmy i dba o poufność haseł oraz kodu
      firmy. Za treści wprowadzone do systemu (wydarzenia, kontakty, pliki)
      odpowiada klient. Nie wolno używać usługi w sposób naruszający prawo ani
      zakłócający działanie systemu.
    </p>
    <h2>7. Dostępność i odpowiedzialność</h2>
    <p>
      Usługa jest świadczona w stanie, w jakim jest udostępniana. Przerwy
      techniczne i aktualizacje mogą się zdarzyć. Odpowiedzialność usługodawcy
      wobec klienta będącego przedsiębiorcą ogranicza się do wysokości
      abonamentu zapłaconego za ostatnie 3 miesiące, z wyłączeniem szkód
      wyrządzonych umyślnie.
    </p>
    <h2>8. Reklamacje</h2>
    <p>
      Reklamacje dotyczące działania usługi można zgłaszać na
      kontakt@eventcater.pl. Odpowiedź następuje w ciągu 14 dni.
    </p>
    <h2>9. Zmiany regulaminu</h2>
    <p>
      Regulamin może zostać zmieniony z ważnej przyczyny, w szczególności
      zmiany ceny, prawa lub funkcji usługi. O zmianie informujemy na adres
      e-mail administratora firmy z wyprzedzeniem co najmniej 14 dni. Dalsze
      korzystanie po tej dacie oznacza akceptację, a przed nią można
      zrezygnować.
    </p>
    <h2>10. Prawo</h2>
    <p>
      Prawem właściwym jest prawo polskie. Spory z klientami będącymi
      przedsiębiorcami rozstrzyga sąd właściwy dla siedziby usługodawcy.
    </p>
  </>
);

export function TermsModal({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="ec-modal-back"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="ec-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ec-modal-top">
          <h2 id={titleId}>Regulamin</h2>
          <button
            ref={closeRef}
            type="button"
            className="ec-modal-close"
            onClick={onClose}
          >
            Zamknij
          </button>
        </div>
        <TermsBody />
      </div>
    </div>
  );
}

export function TermsButton({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={className ?? "ec-text-btn"}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      {open ? <TermsModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

const SiteFooter = ({
  year,
  links,
}: {
  year: number;
  links: { href: string; label: string }[];
}) => (
  <footer className="ec-foot">
    <span>EventCater © {year}</span>
    <span className="ec-foot-links">
      <TermsButton>Regulamin</TermsButton>
      {links.map((link) => (
        <Link key={link.href + link.label} href={link.href}>
          {link.label}
        </Link>
      ))}
    </span>
  </footer>
);

export default SiteFooter;
