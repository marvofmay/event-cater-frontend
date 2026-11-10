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
      <Box sx={{ width: "100%", maxWidth: 960, mx: "auto" }}>
        <Typography
          component="h1"
          sx={{
            m: 0,
            mb: 0.75,
            fontSize: { xs: "1.35rem", sm: "1.6rem" },
            fontWeight: 620,
            letterSpacing: "-0.025em",
            color: "#10261f",
          }}
        >
          {t("common.welcome")}, {fullName}
        </Typography>
        {tenant && (
          <Typography sx={{ mb: 2, color: "#4d5c55", lineHeight: 1.5 }}>
            Firma: <strong style={{ color: "#1c3d32" }}>{tenant.name}</strong>{" "}
            ({tenant.slug})
          </Typography>
        )}
        {roles.length > 0 && (
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            sx={{ mb: 2.5 }}
            aria-label="Twoje role"
          >
            {roles.map((role) => (
              <Chip
                key={role}
                label={role.replace(/\bHRApp\b/g, "EventCater")}
                size="small"
                sx={{
                  bgcolor: "rgba(28, 61, 50, 0.08)",
                  color: "#1c3d32",
                  fontWeight: 520,
                  borderRadius: "0.35rem",
                }}
              />
            ))}
          </Stack>
        )}
        <Items />
      </Box>
    </QueryClientProvider>
  );
};

export default Home;
