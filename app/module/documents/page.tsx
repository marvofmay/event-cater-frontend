"use client";

import { useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useUser } from "@/app/context/userContext";
import CenteredMessage from "@/app/components/shared/CenterdeMessage";
import CompanyDocumentsPage from "@/app/components/documents/CompanyDocumentsPage";

export default function DocumentsModulePage() {
  const { t } = useTranslation();
  const { isAuthenticated, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/me/logout");
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress aria-label="Ładowanie" />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <CenteredMessage message={t("common.message.youAreNotLogged")} />;
  }

  return <CompanyDocumentsPage />;
}
