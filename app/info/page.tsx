"use client";

import { Box, CircularProgress } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useUser } from "@/app/context/userContext";
import CenteredMessage from "@/app/components/shared/CenterdeMessage";
import CompanyNoticesBoard from "@/app/components/info/CompanyNoticesBoard";
import "@/app/components/info/notices-board.css";

export default function InfoPage() {
  const { t } = useTranslation();
  const { isAuthenticated, loading, hasPermission } = useUser();
  const canManage =
    hasPermission("company_notices.create") ||
    hasPermission("company_notices.update") ||
    hasPermission("company_notices.delete");

  if (loading) {
    return (
      <Box minHeight="60vh" display="flex" justifyContent="center" alignItems="center">
        <CircularProgress aria-label="Ładowanie" />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <CenteredMessage message={t("common.message.youAreNotLogged")} />;
  }

  if (canManage) {
    return (
      <Box
        component="main"
        sx={{
          minHeight: "80vh",
          px: 2,
          py: 4,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <CompanyNoticesBoard />
      </Box>
    );
  }

  return (
    <Box component="main" className="ec-notices-page">
      <CompanyNoticesBoard />
    </Box>
  );
}
