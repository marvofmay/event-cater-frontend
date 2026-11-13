import type { Metadata } from "next";
import { Suspense } from "react";
import PayPage from "../components/landing/PayPage";

export const metadata: Metadata = {
  title: "Abonament 99 zł - EventCater",
  description: "Opłać miesiąc EventCater BLIK-iem przez Tpay albo przelewem tradycyjnym. 99 zł brutto.",
};

export default function PayRoute() {
  return (
    <Suspense fallback={null}>
      <PayPage />
    </Suspense>
  );
}
