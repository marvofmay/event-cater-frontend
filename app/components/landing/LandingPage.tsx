"use client";

import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";
import "./landing.css";

// Local fonts only — Google Fonts break offline / restricted Docker builds.
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
      <header className="ec-top">
        <Link href="/login">Logowanie</Link>
      </header>

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
          <h1 className="ec-reveal ec-reveal-delay">
            System dla cateringu wydarzeń — na miejscu i w terenie
          </h1>
          <p className="ec-lede ec-reveal ec-reveal-delay-2">
            SaaS dla firm, które obsługują przyjęcia, eventy i serwis wyjazdowy:
            od planu przez kuchnię i kompletację aż po ekipę na obiekcie.
          </p>
          <div className="ec-cta ec-reveal ec-reveal-delay-2">
            <a className="ec-btn ec-btn-primary" href="#system">
              Poznaj system
            </a>
            <Link className="ec-btn ec-btn-ghost" href="/login">
              Przejdź do logowania
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
          Jedna firma — osobna przestrzeń w systemie, własne dane i uprawnienia.
        </p>
      </section>

      <section className="ec-section" id="system">
        <p className="ec-kicker">W systemie</p>
        <h2>Porządek od zapytania do wyjazdu</h2>
        <p>
          Zamiast arkuszy i rozmów rozsianych po komunikatorach masz wspólny
          przebieg pracy dla biura, kuchni i ekipy terenowej.
        </p>
        <ul className="ec-points">
          <li>
            <strong>Wydarzenia i miejsca</strong>
            <span>
              Terminy, adresy, baza lokalizacji i historia obsługiwanych
              przyjęć — czy serwis jest na miejscu, czy w terenie.
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
              Role, uprawnienia, powiadomienia i wiadomości wewnątrz firmy —
              żeby zmiana na evencie nie ginęła w czacie.
            </span>
          </li>
        </ul>
      </section>

      <section className="ec-close" id="dostep">
        <div className="ec-section">
          <p className="ec-kicker" style={{ color: "rgba(238, 245, 241, 0.7)" }}>
            Dostęp
          </p>
          <h2>Masz już konto firmy?</h2>
          <p>
            Klienci EventCater logują się kodem firmy na stronie logowania.
            Panel SaaS służy do zarządzania tenantami — nie zastępuje logowania
            pracowników.
          </p>
          <Link className="ec-btn ec-btn-primary" href="/login">
            Zaloguj się
          </Link>
        </div>
      </section>

      <footer className="ec-foot">
        <span>EventCater © {year}</span>
        <Link href="/login">Logowanie</Link>
      </footer>
    </div>
  );
};

export default LandingPage;
