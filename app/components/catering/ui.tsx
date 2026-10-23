"use client";
import { ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
  Chip,
  TextField,
  MenuItem,
} from "@mui/material";
import { useUser } from "@/app/context/userContext";
export const stateLabels: Record<string, string> = {
  draft: "Szkic",
  planned: "Zaplanowane",
  confirmed: "Potwierdzone",
  in_progress: "W trakcie wydarzenia",
  completed: "Zakończone",
  cancelled: "Anulowane",
  approved: "Zatwierdzona",
  in_preparation: "Kompletowanie",
  ready_for_loading: "Gotowe do załadunku",
  loaded: "Załadowane",
  released: "Wydane do kuchni",
  in_production: "W przygotowaniu",
  ready: "Gotowe",
  handed_over: "Przekazane",
};
export const unitLabels: Record<string, string> = {
  piece: "szt.",
  set: "zestaw",
  kit: "komplet",
  carton: "karton",
  pack: "opak.",
  bottle: "butelka",
  kg: "kg",
  l: "l",
};
export function Status({ value }: { value: string }) {
  return (
    <Chip
      size="small"
      label={stateLabels[value] ?? value}
      color={
        ["ready", "loaded", "handed_over", "completed"].includes(value)
          ? "success"
          : value === "cancelled"
            ? "default"
            : "info"
      }
    />
  );
}
export function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2, my: 2 }}>
      <Typography variant="h6" mb={2}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}
export function Feedback({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  return (
    <>
      {error && (
        <Alert severity="error" sx={{ my: 1 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ my: 1 }}>
          {success}
        </Alert>
      )}
    </>
  );
}
export function Loading() {
  return (
    <Box sx={{ p: 3 }} role="status">
      <CircularProgress size={24} /> Wczytywanie…
    </Box>
  );
}
export function Permission({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  const { loading, isAuthenticated, hasPermission } = useUser();
  if (loading) return <Loading />;
  if (!isAuthenticated)
    return (
      <Alert severity="info">
        Zaloguj się, aby korzystać z cateringu.{" "}
        <a href="/login">Przejdź do logowania</a>
      </Alert>
    );
  if (!hasPermission(name))
    return (
      <Alert severity="warning">Brak dostępu do tej części aplikacji.</Alert>
    );
  return <>{children}</>;
}
export function Pager({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (n: number) => void;
}) {
  return (
    <Stack direction="row" gap={2} alignItems="center" mt={2}>
      <Button disabled={page === 1} onClick={() => onChange(page - 1)}>
        Poprzednia
      </Button>
      <Typography>
        Strona {page} · {total} pozycji
      </Typography>
      <Button disabled={page * 20 >= total} onClick={() => onChange(page + 1)}>
        Następna
      </Button>
    </Stack>
  );
}
export function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Record<string, string>;
}) {
  return (
    <TextField
      select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size="small"
      sx={{ minWidth: 180 }}
    >
      {Object.entries(options).map(([key, text]) => (
        <MenuItem key={key} value={key}>
          {text}
        </MenuItem>
      ))}
    </TextField>
  );
}
