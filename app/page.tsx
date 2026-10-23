"use client";

import { useMemo } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import Items from "./components/dashboard/Items";
import { useUser } from "./context/userContext";

const Home: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, loading, employee } = useUser();

  const queryClient = useMemo(() => new QueryClient(), []);

  const fullName = employee?.uuid
    ? `${employee.firstName} ${employee.lastName}`
    : "pracowniku techniczny systemu";

  if (loading) {
    return (
      <Box
        minHeight="100vh"
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {isAuthenticated ? (
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
          <Box width="100%" maxWidth="900px">
            <Typography variant="h6" mb={3}>
              {t("common.welcome")}, {fullName}.
            </Typography>

            <Items />
          </Box>
        </Box>
      ) : (
        <Box
          minHeight="80vh"
          display="flex"
          justifyContent="center"
          alignItems="center"
          textAlign="center"
          px={2}
        >
          <Typography variant="h6">{t("common.pleaseLogin")}</Typography>
        </Box>
      )}
    </QueryClientProvider>
  );
};

export default Home;
