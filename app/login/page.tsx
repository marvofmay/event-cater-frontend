"use client";

import { Alert, Box } from "@mui/material";
import Link from "next/link";
import { useEffect, useState } from "react";
import SignIn from "../components/user/login/SignIn";

const Login: React.FC = () => {
  const [inactiveLogout, setInactiveLogout] = useState(false);
  useEffect(() => {
    setInactiveLogout(
      new URLSearchParams(window.location.search).get("reason") === "inactivity",
    );
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        px: { xs: 2, sm: 3 },
        py: { xs: 4, sm: 6 },
        background: `
          radial-gradient(120% 80% at 10% 0%, rgba(28, 61, 50, 0.18), transparent 55%),
          linear-gradient(165deg, #eef3f0 0%, #f7faf8 42%, #e7efea 100%)
        `,
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 440 }}>
        <Box sx={{ mb: 3, textAlign: "center" }}>
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-geist-sans), Geist, sans-serif",
              fontSize: "1.85rem",
              fontWeight: 600,
              letterSpacing: "-0.03em",
              color: "#10261f",
              textDecoration: "none",
            }}
          >
            EventCater
          </Link>
          <Box
            component="p"
            sx={{
              m: "0.45rem 0 0",
              color: "#4d5c55",
              fontSize: "0.95rem",
              lineHeight: 1.45,
            }}
          >
            Zaloguj się kodem firmy, aby wejść do systemu.
          </Box>
        </Box>

        {inactiveLogout && (
          <Alert
            severity="info"
            sx={{
              mb: 2,
              borderRadius: "0.45rem",
              bgcolor: "rgba(28, 61, 50, 0.08)",
              color: "#10261f",
            }}
          >
            Sesja została zakończona z powodu bezczynności. Zaloguj się
            ponownie, aby kontynuować.
          </Alert>
        )}

        <Box
          sx={{
            bgcolor: "#fff",
            borderRadius: "0.65rem",
            border: "1px solid rgba(21, 32, 27, 0.08)",
            boxShadow: "0 18px 40px rgba(16, 38, 31, 0.08)",
            p: { xs: 2.5, sm: 3.25 },
          }}
        >
          <SignIn />
        </Box>

        <Box
          sx={{
            mt: 2.5,
            textAlign: "center",
            fontSize: "0.88rem",
            color: "#4d5c55",
          }}
        >
          <Link href="/" style={{ color: "#1c3d32", textDecoration: "none" }}>
            ← Strona główna
          </Link>
          {" · "}
          <Link
            href="/trial"
            style={{ color: "#1c3d32", textDecoration: "none" }}
          >
            30-dniowy trial
          </Link>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;
