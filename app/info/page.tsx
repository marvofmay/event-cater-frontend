"use client";

import { Box } from "@mui/material";
import CenteredSpinner from "@/app/components/common/BrandSpinner";
import { useTranslation } from "react-i18next";
import { useUser } from "@/app/context/userContext";
import CenteredMessage from "@/app/components/shared/CenterdeMessage";
import CompanyNoticesBoard from "@/app/components/info/CompanyNoticesBoard";

export default function InfoPage() {
  const { t } = useTranslation();
  const { isAuthenticated, loading } = useUser();

  if (loading) {
    return (
      <CenteredSpinner minHeight="60vh" />
    );
  }

  if (!isAuthenticated) {
    return <CenteredMessage message={t("common.message.youAreNotLogged")} />;
  }

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
