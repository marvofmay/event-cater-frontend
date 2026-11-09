"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import localFont from "next/font/local";
import { passwordPolicyErrors } from "@/app/lib/passwordPolicy";
import "./landing.css";

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

type TrialResult = {
  name: string;
  slug: string;
  email: string;
  password: string;
  trialEndsAt: string;
  loginUrl: string;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);

const TrialPage = () => {
  const year = new Date().getFullYear();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TrialResult | null>(null);

  const livePasswordErrors = useMemo(
    () =>
      password || confirmation
        ? passwordPolicyErrors(password, confirmation)
        : [],
    [password, confirmation],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const policy = passwordPolicyErrors(password, confirmation);
    if (policy.length) {
      setError(policy.join(" "));
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(slug)) {
      setError(
        "Kod firmy: 2–63 znaki, małe litery, cyfry i myślniki (bez spacji).",
      );
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/saas/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug,
          ownerEmail: email.trim(),
          ownerPassword: password,
          ownerPasswordConfirmation: confirmation,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.detail ||
            "Nie udało się utworzyć triala. Spróbuj ponownie.",
        );
      }
      setResult({
        name: data.name,
        slug: data.slug,
        email: data.email,
        password: data.password,
        trialEndsAt: data.trialEndsAt,
        loginUrl: data.loginUrl || `/login?tenant=${encodeURIComponent(data.slug)}`,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`ec-landing ${display.variable} ${sans.variable}`}>
      <main className="ec-legal-wrap ec-trial-wrap">
        <Link className="ec-legal-back" href="/">
          ← EventCater
        </Link>
        <h1>30-dniowy trial</h1>
        <p className="ec-legal-meta">
          Pełny dostęp do systemu dla Twojej firmy cateringowej. Po 30 dniach
          konto zostaje zawieszone, a dane pozostają zachowane — po opłaceniu
          abonamentu przywracamy dostęp.
        </p>

        {!result ? (
          <>
            <ul className="ec-trial-points">
              <li>Osobna przestrzeń firmy (kod firmy do logowania)</li>
              <li>Konto administratora z hasłem zgodnym z polityką hasła</li>
              <li>
                Przypomnienia e-mail 5 dni, 3 dni i 24 h przed końcem triala
              </li>
              <li>
                Po wygaśnięciu: zawieszenie bez usuwania danych; kontakt:{" "}
                <a href="mailto:kontakt@eventcater.pl">kontakt@eventcater.pl</a>
              </li>
            </ul>

            <form className="ec-trial-form" onSubmit={onSubmit} noValidate>
              {error && (
                <p className="ec-trial-error" role="alert">
                  {error}
                </p>
              )}
              <label>
                Nazwa firmy
                <input
                  name="name"
                  required
                  maxLength={200}
                  value={name}
                  onChange={(e) => {
                    const next = e.target.value;
                    setName(next);
                    if (!slugTouched) setSlug(slugify(next));
                  }}
                  autoComplete="organization"
                />
              </label>
              <label>
                Kod firmy (do logowania)
                <input
                  name="slug"
                  required
                  maxLength={63}
                  pattern="[a-z0-9][a-z0-9-]{1,62}"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value.toLowerCase());
                  }}
                  autoComplete="off"
                />
                <span className="ec-field-hint">
                  2–63 znaki: a–z, cyfry, myślnik. Przykład: mapa-smakow
                </span>
              </label>
              <label>
                E-mail administratora
                <input
                  name="ownerEmail"
                  type="email"
                  required
                  maxLength={100}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <span className="ec-field-hint">
                  Na ten adres wyślemy login, hasło i przypomnienia o końcu
                  triala.
                </span>
              </label>
              <label>
                Hasło
                <input
                  name="ownerPassword"
                  type="password"
                  required
                  minLength={8}
                  maxLength={64}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
              <label>
                Powtórz hasło
                <input
                  name="ownerPasswordConfirmation"
                  type="password"
                  required
                  minLength={8}
                  maxLength={64}
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  autoComplete="new-password"
                />
                <span className="ec-field-hint">
                  8–64 znaków, duża i mała litera, cyfra oraz znak specjalny.
                </span>
              </label>
              {livePasswordErrors.length > 0 && (
                <ul className="ec-trial-policy">
                  {livePasswordErrors.map((msg) => (
                    <li key={msg}>{msg}</li>
                  ))}
                </ul>
              )}
              <button
                className="ec-btn ec-btn-pine"
                type="submit"
                disabled={busy || livePasswordErrors.length > 0}
              >
                {busy ? "Zakładam konto…" : "Załóż 30-dniowy trial"}
              </button>
              <p className="ec-trial-legal">
                Zakładając trial akceptujesz{" "}
                <Link href="/polityka-prywatnosci">politykę prywatności</Link>.
                O nowym trialu powiadomimy też{" "}
                <a href="mailto:kontakt@eventcater.pl">kontakt@eventcater.pl</a>.
              </p>
            </form>
          </>
        ) : (
          <div className="ec-trial-success" role="status">
            <h2>Konto gotowe</h2>
            <p>
              Trial dla <strong>{result.name}</strong> jest aktywny. Te same
              dane wysłaliśmy na <strong>{result.email}</strong>.
            </p>
            <dl className="ec-creds">
              <div>
                <dt>Kod firmy</dt>
                <dd>{result.slug}</dd>
              </div>
              <div>
                <dt>Login (e-mail)</dt>
                <dd>{result.email}</dd>
              </div>
              <div>
                <dt>Hasło</dt>
                <dd>
                  <code>{result.password}</code>
                </dd>
              </div>
              <div>
                <dt>Koniec triala</dt>
                <dd>
                  {new Date(result.trialEndsAt).toLocaleString("pl-PL", {
                    timeZone: "Europe/Warsaw",
                  })}{" "}
                  (Europe/Warsaw)
                </dd>
              </div>
            </dl>
            <p className="ec-field-hint">
              Zachowaj te dane. Hasło nie będzie ponownie pokazane w tej formie
              w panelu.
            </p>
            <div className="ec-cta" style={{ marginTop: "1.5rem" }}>
              <Link className="ec-btn ec-btn-pine" href={result.loginUrl}>
                Przejdź do logowania
              </Link>
              <Link className="ec-btn ec-btn-outline" href="/">
                Strona główna
              </Link>
            </div>
          </div>
        )}
      </main>

      <footer className="ec-foot">
        <span>EventCater © {year}</span>
        <span className="ec-foot-links">
          <Link href="/polityka-prywatnosci">Polityka prywatności</Link>
          <Link href="/login">Logowanie</Link>
        </span>
      </footer>
    </div>
  );
};

export default TrialPage;
