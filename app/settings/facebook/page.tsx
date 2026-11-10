"use client";

import { useEffect } from "react";
import { Box } from "@mui/material";
import CenteredSpinner from "@/app/components/common/BrandSpinner";
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
      <CenteredSpinner minHeight={160} />
    );
  }
  if (!isAuthenticated || !allowed) return null;

  return (
    <Box component="main" sx={{ maxWidth: 850, mx: "auto", p: { xs: 2, sm: 3 } }}>
      <FacebookConnectionCard />
    </Box>
  );
}
