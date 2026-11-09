import type { Metadata } from "next";
import TrialPage from "../components/landing/TrialPage";

export const metadata: Metadata = {
  title: "30-dniowy trial - EventCater",
  description:
    "Załóż 30-dniowy trial EventCater dla firmy cateringowej. Po zakończeniu trialu dane pozostają zachowane.",
};

export default function TrialRoute() {
  return <TrialPage />;
}
