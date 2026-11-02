"use client";

import { useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useRouter } from "next/navigation";
import FacebookConnectionCard from "@/app/components/facebook/FacebookConnectionCard";
import { useUser } from "@/app/context/userContext";

export default function FacebookSettingsPage() {
  const { hasPermission, isAuthenticated, loading } = useUser();
  const router = useRouter();
  const allowed = hasPermission("events.publish_facebook");

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) router.replace("/me/logout");
    else if (!allowed) router.replace("/forbidden");
  }, [loading, isAuthenticated, allowed, router]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress aria-label="Ładowanie" />
      </Box>
    );
  }
  if (!isAuthenticated || !allowed) return null;

  return (
    <Box component="main" sx={{ maxWidth: 850, mx: "auto", p: { xs: 2, sm: 3 } }}>
      <FacebookConnectionCard />
    </Box>
  );
}
