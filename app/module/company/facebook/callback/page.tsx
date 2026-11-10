"use client";

import { useEffect } from "react";
import CenteredSpinner from "@/app/components/common/BrandSpinner";
import { useRouter } from "next/navigation";

/** Legacy OAuth redirect - keeps old Meta App redirect URI working. */
export default function LegacyFacebookCallbackRedirect() {
  const router = useRouter();

  useEffect(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    router.replace(`/settings/facebook/callback${search}`);
  }, [router]);

  return (
    <CenteredSpinner minHeight={160} label="Przekierowanie" />
  );
}
