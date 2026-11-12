"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import localFont from "next/font/local";
import SiteFooter from "./SiteFooter";
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

type PayConfig = {
  enabled: boolean;
  sandbox: boolean;
  amount: string;
};

type PayStatus = {
  status: string;
  paidUntil: string | null;
  sandbox: boolean;
};

const PayPage = () => {
  const year = new Date().getFullYear();
  const params = useSearchParams();
  const paymentId = params.get("platnosc");
  const result = params.get("wynik");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [blik, setBlik] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [config, setConfig] = useState<PayConfig | null>(null);
  const [payment, setPayment] = useState<PayStatus | null>(null);
  const [activeId, setActiveId] = useState<string | null>(paymentId);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/saas/payments/config")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: PayConfig | null) => {
        if (!cancelled && data) setConfig(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setActiveId(paymentId);
  }, [paymentId]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    let timer = 0;
    const load = async () => {
      try {
        const response = await fetch(`/api/saas/payments/${activeId}`);
        if (!response.ok) return;
        const data = (await response.json()) as PayStatus;
        if (cancelled) return;
        setPayment(data);
        if (data.status === "pending") timer = window.setTimeout(load, 3000);
      } catch {
        if (!cancelled) timer = window.setTimeout(load, 4000);
      }
    };
    void load();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeId]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(blik)) {
      setError("Wpisz 6-cyfrowy kod BLIK z aplikacji banku.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/saas/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          slug: slug.trim().toLowerCase(),
          email: email.trim(),
          blikCode: blik,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Nie udało się rozpocząć płatności.");
      }
      if (typeof data.uuid !== "string" || data.uuid === "") {
        throw new Error("Tpay nie przyjął kodu BLIK.");
      }
      setBlik("");
      setActiveId(data.uuid);
      setPayment({ status: "pending", paidUntil: null, sandbox: Boolean(data.sandbox) });
      window.history.replaceState(null, "", `/oplata?platnosc=${data.uuid}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Nie udało się rozpocząć płatności.");
    } finally {
      setBusy(false);
    }
  };

  const paidLabel = payment?.paidUntil
    ? new Date(payment.paidUntil).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" })
    : "";
  const sandbox = config?.sandbox !== false;

  return (
    <div className={`ec-landing ${display.variable} ${sans.variable}`}>
      <main className="ec-legal-wrap ec-trial-wrap">
        <Link className="ec-legal-back" href="/">
          ← EventCater
        </Link>
        <h1>Abonament 99 zł brutto</h1>
        <p className="ec-legal-meta">
          Jeden miesiąc dla jednej firmy. Kod BLIK wpisujesz tutaj, a potem
          potwierdzasz go w aplikacji banku.
          {sandbox ? " Na razie jest to środowisko testowe (sandbox), nie prawdziwe obciążenie." : ""}{" "}
          Rezygnacja oznacza, że nie opłacasz kolejnego miesiąca.
        </p>

        {payment?.status === "paid" && (
          <p className="ec-pay-ok" role="status">
            Płatność zaksięgowana. Abonament jest aktywny do {paidLabel} (Europe/Warsaw).
          </p>
        )}
        {payment?.status === "pending" && (
          <p className="ec-field-hint" role="status">
            Kod przyjęty. Potwierdź płatność w aplikacji banku. Ta strona sama pokaże zaksięgowanie, gdy Tpay je przyjmie.
          </p>
        )}
        {payment?.status === "refunded" && (
          <p className="ec-trial-error" role="alert">
            Ta płatność została zwrócona. Dostęp nie jest przedłużony.
          </p>
        )}
        {result === "blad" && payment?.status !== "paid" && (
          <p className="ec-trial-error" role="alert">
            Tpay nie dokończył tej płatności. Możesz spróbować ponownie.
          </p>
        )}

        {payment?.status !== "paid" && payment?.status !== "pending" && (
        <form className="ec-trial-form" onSubmit={onSubmit} noValidate>
          {error && (
            <p className="ec-trial-error" role="alert">
              {error}
            </p>
          )}
          {config && !config.enabled && (
            <p className="ec-trial-error" role="alert">
              Płatność BLIK jest chwilowo niedostępna. Napisz na kontakt@eventcater.pl.
            </p>
          )}
          <label>
            Kod firmy
            <input
              name="slug"
              required
              autoComplete="off"
              maxLength={63}
              pattern="[a-z0-9][a-z0-9-]{1,62}"
              value={slug}
              onChange={(event) => setSlug(event.target.value.toLowerCase())}
            />
          </label>
          <label>
            E-mail właściciela konta
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              maxLength={100}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <span className="ec-field-hint">Ten sam adres, który podano przy zakładaniu firmy.</span>
          </label>
          <label>
            Kod BLIK
            <input
              name="blikCode"
              className="ec-blik-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              minLength={6}
              maxLength={6}
              pattern="[0-9]{6}"
              value={blik}
              onChange={(event) => setBlik(event.target.value.replace(/\D/g, "").slice(0, 6))}
            />
            <span className="ec-field-hint">
              Sześć cyfr z aplikacji banku. Po wysłaniu potwierdź płatność w banku.
            </span>
          </label>
          <button className="ec-btn ec-btn-pine" type="submit" disabled={busy || config?.enabled === false || blik.length !== 6}>
            {busy ? "Wysyłam kod BLIK..." : "Zapłać 99 zł BLIK-iem"}
          </button>
          {sandbox && (
            <p className="ec-field-hint">
              W sandboxie Tpay kod BLIK do testu to zwykle 777777. Płatność testowa nie pobiera pieniędzy z banku.
            </p>
          )}
        </form>
        )}
      </main>
      <SiteFooter
        year={year}
        links={[
          { href: "/polityka-prywatnosci", label: "Polityka prywatności" },
          { href: "/trial", label: "Trial" },
          { href: "/login", label: "Logowanie" },
        ]}
      />
    </div>
  );
};

export default PayPage;
