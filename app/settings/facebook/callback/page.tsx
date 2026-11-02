"use client";

import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAction, useApi } from "@/app/components/catering/api";
import { Panel } from "@/app/components/catering/ui";
import { useUser } from "@/app/context/userContext";

type PageOption = { id: string; name: string };

export default function FacebookCallbackPage() {
  const { loading, isAuthenticated, hasPermission } = useUser();
  const router = useRouter();
  const api = useApi();
  const action = useAction();
  const [pages, setPages] = useState<PageOption[] | null>(null);
  const [pendingToken, setPendingToken] = useState("");
  const [pageId, setPageId] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const allowed = hasPermission("events.publish_facebook");

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!allowed) {
      router.replace("/forbidden");
      return;
    }
    if (started) return;
    setStarted(true);
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error_description") || params.get("error");
    if (oauthError) {
      setError(String(oauthError));
      return;
    }
    if (!code || !state) {
      setError("Brak danych powrotu z Facebooka. Spróbuj połączyć stronę ponownie.");
      return;
    }
    action.run(async () => {
      const result = await api<{
        connected?: boolean;
        pageName?: string;
        pages?: PageOption[];
        pendingToken?: string;
      }>("/facebook/callback", "POST", { code, state });
      if (result.connected) {
        setDone(result.pageName ?? "Strona Facebook");
        return;
      }
      if (result.pages?.length && result.pendingToken) {
        setPages(result.pages);
        setPendingToken(result.pendingToken);
        setPageId(result.pages[0]?.id ?? "");
        return;
      }
      throw new Error("Nie udało się połączyć strony Facebook.");
    }, "Połączono stronę Facebook.").catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Nie udało się połączyć Facebooka.");
    });
  }, [loading, isAuthenticated, allowed, started, action, api, router]);

  if (loading || !isAuthenticated || !allowed) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box component="main" sx={{ maxWidth: 720, mx: "auto", p: 2 }}>
      <Panel title="Połączenie Facebook">
        <Stack spacing={2}>
          {action.busy && !done && !pages && !error && (
            <Stack alignItems="center" gap={1} py={3}>
              <CircularProgress />
              <Typography>Kończenie połączenia ze stroną Facebook…</Typography>
            </Stack>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          {done && (
            <Alert severity="success">
              Połączono stronę: <strong>{done}</strong>. Możesz teraz publikować posty z wydarzeń.
            </Alert>
          )}
          {pages && (
            <>
              <Typography>Wybierz stronę firmową dla tego tenanta:</Typography>
              <TextField select label="Strona Facebook" value={pageId} onChange={(e) => setPageId(e.target.value)} fullWidth>
                {pages.map((page) => <MenuItem key={page.id} value={page.id}>{page.name}</MenuItem>)}
              </TextField>
              <Button
                variant="contained"
                disabled={!pageId || action.busy}
                onClick={() => action.run(async () => {
                  const result = await api<{ pageName?: string }>("/facebook/select-page", "POST", { pendingToken, pageId });
                  setPages(null);
                  setDone(result.pageName ?? "Strona Facebook");
                }, "Połączono stronę Facebook.")}
              >
                Połącz wybraną stronę
              </Button>
            </>
          )}
          <Button component={Link} href="/settings/facebook" variant="contained" color="primary">
            Wróć do ustawień Facebook
          </Button>
        </Stack>
      </Panel>
    </Box>
  );
}
