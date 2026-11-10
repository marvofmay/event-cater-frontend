"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormLabel from "@mui/material/FormLabel";
import FormControl from "@mui/material/FormControl";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Alert, Autocomplete, CircularProgress } from "@mui/material";
import ForgotPassword from "./ForgotPassword";
import { useUser } from "@/app/context/userContext";
import { useTranslation } from "react-i18next";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "0.45rem",
    backgroundColor: "#fbfcfb",
    "& fieldset": { borderColor: "rgba(21, 32, 27, 0.14)" },
    "&:hover fieldset": { borderColor: "rgba(28, 61, 50, 0.45)" },
    "&.Mui-focused fieldset": { borderColor: "#1c3d32" },
  },
};

export default function SignIn() {
  const { t } = useTranslation();
  const [emailError, setEmailError] = React.useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = React.useState("");
  const [passwordError, setPasswordError] = React.useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = React.useState("");
  const [backendErrorMessage, setBackendErrorMessage] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [resetLogin, setResetLogin] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const { login } = useUser();
  const [tenantSlug, setTenantSlug] = React.useState("");
  const [tenantOptions, setTenantOptions] = React.useState<
    { slug: string; name: string }[]
  >([]);

  React.useEffect(() => {
    let current = true;
    const preferred =
      new URLSearchParams(window.location.search).get("tenant") ||
      localStorage.getItem("selected_tenant") ||
      "";
    setTenantSlug(preferred === "default" ? "" : preferred);
    fetch("/api/saas/tenant-options")
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            "Nie udało się wczytać listy firm. Wpisz kod firmy.",
          );
        }
        return response.json();
      })
      .then((data) => {
        if (!current) return;
        setTenantOptions(data.items);
        if (
          (!preferred || preferred === "default") &&
          data.items.length === 1
        ) {
          setTenantSlug(data.items[0].slug);
        }
      })
      .catch((error) => {
        if (current) setBackendErrorMessage(error.message);
      });
    return () => {
      current = false;
    };
  }, []);

  const handleClickOpen = () => {
    setResetLogin(
      (document.getElementById("email") as HTMLInputElement)?.value ?? "",
    );
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const validateInputs = () => {
    const email = document.getElementById("email") as HTMLInputElement;
    const password = document.getElementById("password") as HTMLInputElement;
    let isValid = true;

    if (!email.value.trim()) {
      setEmailError(true);
      setEmailErrorMessage("Podaj login.");
      isValid = false;
    } else {
      setEmailError(false);
      setEmailErrorMessage("");
    }

    if (!password.value || password.value.length < 7) {
      setPasswordError(true);
      setPasswordErrorMessage(
        t("validation.passwordMustBeAtLeast7CharactersLong"),
      );
      isValid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage("");
    }

    return isValid;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBackendErrorMessage("");
    if (!validateInputs()) return;
    if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(tenantSlug.trim())) {
      setBackendErrorMessage("Wybierz firmę lub wpisz jej kod.");
      return;
    }

    const data = new FormData(event.currentTarget);
    const emailData = String(data.get("email") ?? "");
    const passwordData = String(data.get("password") ?? "");
    setBusy(true);
    try {
      await login(emailData, passwordData, tenantSlug.trim());
      // Keep overlay until navigation unmounts this page.
    } catch (err: unknown) {
      setBusy(false);
      if (
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as { message?: unknown }).message === "string"
      ) {
        setBackendErrorMessage((err as { message: string }).message);
      } else {
        setBackendErrorMessage(t("common.message.somethingWentWrong"));
      }
    }
  };

  const selectedName =
    tenantOptions.find((option) => option.slug === tenantSlug)?.name || "";

  return (
    <Box component="form" method="POST" onSubmit={handleSubmit} noValidate sx={{ position: "relative" }}>
      {busy ? (
        <Box
          aria-live="polite"
          aria-busy="true"
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 1400,
            display: "grid",
            placeItems: "center",
            bgcolor: "rgba(238, 243, 240, 0.78)",
            backdropFilter: "blur(3px)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.5,
              px: 3,
              py: 2.5,
              borderRadius: "0.75rem",
              bgcolor: "rgba(255,255,255,0.72)",
              border: "1px solid rgba(28, 61, 50, 0.12)",
              boxShadow: "0 12px 32px rgba(16, 38, 31, 0.08)",
            }}
          >
            <CircularProgress
              size={40}
              thickness={3.4}
              sx={{ color: "#1c3d32" }}
            />
            <Typography sx={{ color: "#1c3d32", fontWeight: 560, fontSize: "0.95rem" }}>
              Logowanie…
            </Typography>
          </Box>
        </Box>
      ) : null}

      <Typography
        component="h1"
        sx={{
          m: 0,
          mb: 2.25,
          fontSize: "1.35rem",
          fontWeight: 620,
          letterSpacing: "-0.02em",
          color: "#10261f",
        }}
      >
        Logowanie
      </Typography>

      {backendErrorMessage ? (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: "0.45rem" }}
          onClose={() => setBackendErrorMessage("")}
        >
          {backendErrorMessage}
        </Alert>
      ) : null}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <FormControl fullWidth>
          <FormLabel
            htmlFor="tenantSlug"
            sx={{ mb: 0.6, color: "#1c3d32", fontWeight: 560, fontSize: "0.9rem" }}
          >
            Kod firmy
          </FormLabel>
          <Autocomplete
            id="tenantSlug"
            freeSolo
            options={tenantOptions}
            getOptionLabel={(option) =>
              typeof option === "string" ? option : option.slug
            }
            inputValue={tenantSlug}
            onInputChange={(_, value) => setTenantSlug(value)}
            renderOption={(props, option) => {
              const { key, ...attributes } = props;
              return (
                <li key={key} {...attributes}>
                  {option.name} ({option.slug})
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                id="tenantSlug"
                name="tenantSlug"
                required
                placeholder="Kod firmy"
                helperText={
                  selectedName ||
                  "Wybierz firmę z listy lub wpisz jej kod"
                }
                inputProps={{ ...params.inputProps, maxLength: 63 }}
                sx={fieldSx}
              />
            )}
          />
        </FormControl>

        <FormControl fullWidth>
          <FormLabel
            htmlFor="email"
            sx={{ mb: 0.6, color: "#1c3d32", fontWeight: 560, fontSize: "0.9rem" }}
          >
            Login
          </FormLabel>
          <TextField
            error={emailError}
            helperText={emailErrorMessage}
            id="email"
            type="text"
            name="email"
            placeholder="Login"
            autoComplete="username"
            autoFocus
            required
            fullWidth
            variant="outlined"
            color={emailError ? "error" : "primary"}
            sx={fieldSx}
          />
        </FormControl>

        <FormControl fullWidth>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              mb: 0.6,
            }}
          >
            <FormLabel
              htmlFor="password"
              sx={{ color: "#1c3d32", fontWeight: 560, fontSize: "0.9rem" }}
            >
              {t("loginForm.label.password")}
            </FormLabel>
            <Link
              component="button"
              type="button"
              onClick={handleClickOpen}
              variant="body2"
              sx={{ color: "#1c3d32", fontWeight: 500 }}
            >
              {t("loginForm.question.forgotYourPassword")}
            </Link>
          </Box>
          <TextField
            error={passwordError}
            helperText={passwordErrorMessage}
            name="password"
            placeholder="••••••••"
            type="password"
            id="password"
            autoComplete="current-password"
            required
            fullWidth
            variant="outlined"
            color={passwordError ? "error" : "primary"}
            sx={fieldSx}
          />
        </FormControl>

        <ForgotPassword
          open={open}
          handleClose={handleClose}
          tenantSlug={tenantSlug.trim()}
          initialLogin={resetLogin}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={busy}
          sx={{
            mt: 0.5,
            minHeight: 48,
            borderRadius: "0.45rem",
            textTransform: "none",
            fontWeight: 620,
            fontSize: "1rem",
            bgcolor: "#1c3d32",
            boxShadow: "none",
            "&:hover": { bgcolor: "#10261f", boxShadow: "none" },
          }}
        >
          Zaloguj się
        </Button>
      </Box>
    </Box>
  );
}
