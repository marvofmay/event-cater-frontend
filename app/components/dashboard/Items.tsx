"use client";

import React from "react";
import Link from "next/link";
import { Alert, Box, Stack, Typography } from "@mui/material";
import { useDashboardTiles } from "./useDashboardTiles";

const Items: React.FC = () => {
  const { tiles } = useDashboardTiles();

  return (
    <Stack spacing={2.5}>
      {tiles.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: "0.45rem" }}>
          Nie masz jeszcze przydzielonych dostępów do modułów. Skontaktuj się z
          administratorem firmy.
        </Alert>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(3, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
          },
          gap: { xs: 1.25, sm: 1.5 },
        }}
      >
        {tiles.map((tile) => (
          <Link
            key={tile.id}
            href={tile.href}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <Box
              sx={{
                height: "100%",
                minHeight: { xs: 108, sm: 120 },
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 1.25,
                p: 1.75,
                borderRadius: "0.55rem",
                border: "1px solid rgba(21, 32, 27, 0.1)",
                background:
                  "linear-gradient(160deg, #16352c 0%, #1c3d32 55%, #244a3d 100%)",
                color: "#f7faf8",
                transition:
                  "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 12px 24px rgba(16, 38, 31, 0.18)",
                  borderColor: "rgba(247, 250, 248, 0.22)",
                },
              }}
            >
              <Box sx={{ fontSize: { xs: "1.55rem", sm: "1.75rem" }, lineHeight: 1 }}>
                {tile.icon}
              </Box>
              <Typography
                sx={{
                  fontSize: { xs: "0.86rem", sm: "0.95rem" },
                  fontWeight: 560,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.25,
                }}
              >
                {tile.label}
              </Typography>
            </Box>
          </Link>
        ))}
      </Box>
    </Stack>
  );
};

export default Items;
