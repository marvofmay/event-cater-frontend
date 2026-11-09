"use client";

import { useMemo } from "react";
import { Box, Chip, CircularProgress, Stack, Typography } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import Items from "./components/dashboard/Items";
import LandingPage from "./components/landing/LandingPage";
import { useUser } from "./context/userContext";

const Home: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, loading, employee, tenant, roles } = useUser();

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
        sx={{ background: "#f3f6f4" }}
      >
        <CircularProgress sx={{ color: "#1c3d32" }} />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <QueryClientProvider client={queryClient}>
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
          {tenant && (
            <Typography variant="body1" mb={3}>
              Zalogowano do firmy: <strong>{tenant.name}</strong> ({tenant.slug}).
            </Typography>
          )}
          {roles.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mb: 3 }} aria-label="Twoje role">
              {roles.map((role) => (
                <Chip key={role} label={role} size="small" />
              ))}
            </Stack>
          )}

          <Items />
        </Box>
      </Box>
    </QueryClientProvider>
  );
};

export default Home;
