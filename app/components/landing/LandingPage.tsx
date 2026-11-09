"use client";

import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";
import "./landing.css";

// Local fonts only - Google Fonts break offline / restricted Docker builds.
const display = localFont({
  src: "../../../public/fonts/GeistVF.woff",
  variable: "--font-ec-display",
  weight: "100 900",
});

const sans = localFont({
  src: "../../../public/fonts/GeistVF.woff",
  variable: "--font-ec-sans",
  weight: "100 900",
});

const LandingPage = () => {
  const year = new Date().getFullYear();

  return (
    <div className={`ec-landing ${display.variable} ${sans.variable}`}>
      <section className="ec-hero" aria-label="EventCater">
        <div className="ec-hero-media" aria-hidden="true">
          <Image
            src="/landing/hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            quality={85}
          />
        </div>
        <div className="ec-hero-inner">
          <p className="ec-brand ec-reveal">EventCater</p>
          <h1 className="ec-reveal ec-reveal-delay ec-hero-title">
            System dla cateringu wydarzeń - na miejscu i&nbsp;w&nbsp;terenie
          </h1>
          <p className="ec-lede ec-reveal ec-reveal-delay-2">
            System dla firm, które obsługują przyjęcia, eventy i serwis wyjazdowy:
            od planu przez kuchnię i kompletację aż po ekipę na obiekcie.
          </p>
          <div className="ec-cta ec-reveal ec-reveal-delay-2">
            <a className="ec-btn ec-btn-ghost" href="#system">
              Poznaj system
            </a>
            <Link className="ec-btn ec-btn-ghost" href="/login">
              Przejdź do logowania
            </Link>
            <Link className="ec-btn ec-btn-ghost" href="/trial">
              30-dniowy trial
            </Link>
          </div>
        </div>
      </section>

      <section className="ec-section" id="dla-kogo">
        <p className="ec-kicker">Dla kogo</p>
        <h2>Firmy cateringowe z obsługą wydarzeń</h2>
        <p>
          EventCater jest zbudowany pod zespoły, które gotują i serwują nie tylko
          w własnej lokalizacji, ale też na salach, plenerach i wyjazdach.
          Jedna firma - osobna przestrzeń w systemie, własne dane i uprawnienia.
        </p>
      </section>

      <section className="ec-section" id="system">
        <p className="ec-kicker">W systemie</p>
        <h2>Porządek od zapytania do wyjazdu</h2>
        <p>
          Zamiast arkuszy, wytycznych na kartkach i rozmów rozsianych po
          komunikatorach masz wspólny przebieg pracy dla biura, kuchni i ekipy
          terenowej.
        </p>
        <ul className="ec-points">
          <li>
            <strong>Wydarzenia i miejsca</strong>
            <span>
              Terminy, adresy, baza lokalizacji i historia obsługiwanych
              przyjęć - czy serwis jest na miejscu, czy w terenie.
            </span>
          </li>
          <li>
            <strong>Kuchnia i kompletacja</strong>
            <span>
              Karty dań, plany produkcji, listy sprzętu i produktów do załadunku
              z jasnym statusem przygotowania.
            </span>
          </li>
          <li>
            <strong>Zespół i komunikacja</strong>
            <span>
              Role, uprawnienia, powiadomienia i wiadomości wewnątrz firmy -
              żeby zmiana na evencie nie ginęła w czacie.
            </span>
          </li>
        </ul>
      </section>

      <section className="ec-section" id="mobilna">
        <p className="ec-kicker">Mobilnie</p>
        <h2>Aplikacja dla ekipy na evencie</h2>
        <p>
          EventCater ma dedykowaną aplikację mobilną dla ekipy w terenie.
          Pracownicy logują się kodem firmy - tak jak na stronie. Po uruchomieniu
          konta administrator firmy otrzymuje od nas link do instalacji.
        </p>
      </section>

      <section className="ec-close" id="dostep">
        <div className="ec-section">
          <p className="ec-kicker" style={{ color: "rgba(238, 245, 241, 0.7)" }}>
            Dostęp
          </p>
          <h2>Wypróbuj albo zaloguj się</h2>
          <p>
            Nowi klienci mogą uruchomić 30-dniowy trial. Po jego zakończeniu
            konto zostaje zawieszone, a dane firmy pozostają zachowane przez
            7 dni - potem są usuwane, jeśli abonament nie zostanie opłacony.
            Istniejący klienci logują się kodem firmy.
          </p>
          <div className="ec-cta">
            <Link className="ec-btn ec-btn-ghost" href="/trial">
              30-dniowy trial
            </Link>
            <Link className="ec-btn ec-btn-ghost" href="/login">
              Zaloguj się
            </Link>
          </div>
        </div>
      </section>

      <footer className="ec-foot">
        <span>EventCater © {year}</span>
        <span className="ec-foot-links">
          <Link href="/polityka-prywatnosci">Polityka prywatności</Link>
          <Link href="/trial">Trial</Link>
          <Link href="/login">Logowanie</Link>
        </span>
      </footer>
    </div>
  );
};

export default LandingPage;
