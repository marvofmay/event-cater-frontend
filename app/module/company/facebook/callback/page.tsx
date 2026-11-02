"use client";

import { useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useRouter } from "next/navigation";

/** Legacy OAuth redirect - keeps old Meta App redirect URI working. */
export default function LegacyFacebookCallbackRedirect() {
  const router = useRouter();

  useEffect(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    router.replace(`/settings/facebook/callback${search}`);
  }, [router]);

  return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
      <CircularProgress aria-label="Przekierowanie" />
    </Box>
  );
}
