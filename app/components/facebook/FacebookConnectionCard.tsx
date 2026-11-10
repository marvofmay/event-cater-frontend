"use client";

import { Alert, Button, Stack, Typography } from "@mui/material";
import { Facebook } from "@mui/icons-material";
import { useAction, useApi, useRemote } from "@/app/components/catering/api";
import { Panel } from "@/app/components/catering/ui";
import { useUser } from "@/app/context/userContext";

type Connection = {
  connected: boolean;
  pageId: string | null;
  pageName: string | null;
  connectedAt: string | null;
};

function facebookErrorMessage(raw: string, status: number): string {
  if (
    status >= 500 ||
    /unexpected server error/i.test(raw) ||
    /facebook_page_connection/i.test(raw)
  ) {
    return "Integracja Facebook nie jest jeszcze gotowa w tej firmie (brak migracji albo konfiguracji). Uruchom migracje tenantów albo skontaktuj się z administratorem systemu.";
  }
  return raw;
}

export default function FacebookConnectionCard() {
  const { hasPermission } = useUser();
  const canManage = hasPermission("events.publish_facebook");
  const api = useApi();
  const action = useAction();
  const remote = useRemote<Connection>(canManage ? "/facebook/connection" : null);

  if (!canManage) return null;

  const errorText = remote.error
    ? facebookErrorMessage(remote.error, remote.status)
    : "";

  return (
    <Panel title="Strona firmowa Facebook">
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Połącz raz stronę firmową Facebook. Potem z wydarzenia możesz
          opublikować post ze zdjęciami. Nie musisz zakładać aplikacji Meta -
          wystarczy konto administratora strony FB.
        </Typography>
        {errorText && <Alert severity="error">{errorText}</Alert>}
        {!errorText && remote.data?.connected ? (
          <Alert severity="success">
            Połączono ze stroną: <strong>{remote.data.pageName}</strong>
          </Alert>
        ) : null}
        {!errorText && remote.data && !remote.data.connected ? (
          <Alert severity="info">Brak połączonej strony Facebook.</Alert>
        ) : null}
        <Stack direction="row" gap={1} flexWrap="wrap">
          {!remote.data?.connected && !errorText && (
            <Button
              variant="contained"
              startIcon={<Facebook />}
              disabled={action.busy || remote.loading}
              onClick={() =>
                action.run(async () => {
                  const data = await api<{ url: string; configured: boolean }>(
                    "/facebook/connect-url",
                  );
                  if (!data.configured || !data.url) {
                    throw new Error(
                      "Integracja Facebook nie jest jeszcze skonfigurowana przez administratora systemu.",
                    );
                  }
                  window.location.href = data.url;
                }, "")
              }
            >
              Połącz stronę Facebook
            </Button>
          )}
          {remote.data?.connected && (
            <Button
              color="error"
              variant="contained"
              disabled={action.busy}
              onClick={() =>
                action.run(async () => {
                  await api("/facebook/connection", "DELETE");
                  remote.reload();
                }, "Odłączono stronę Facebook.")
              }
            >
              Odłącz stronę
            </Button>
          )}
          <Button
            variant="text"
            disabled={remote.loading}
            onClick={remote.reload}
          >
            Odśwież status
          </Button>
        </Stack>
      </Stack>
    </Panel>
  );
}
