"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useUser } from "@/app/context/userContext";
import { useAction, useApi, useRemote } from "@/app/components/catering/api";

interface Template {
  uuid: string;
  eventName: string;
  channelCode: string;
  title: string;
  content: string;
  isDefault: boolean;
  isActive: boolean;
}
interface TemplatesPage {
  data: { items: Template[]; total: number };
}
interface NotificationEventRow {
  eventName: string;
  label: string;
  enabled: boolean;
  channels: { channelCode: string; active: boolean; globallyEnabled: boolean }[];
  variables: string[];
}
interface EventsPage {
  data: { items: NotificationEventRow[] };
}
interface PreferencesSnapshot {
  data: {
    tenant: { channels: Record<string, boolean> };
  };
}

const channelLabels: Record<string, string> = {
  internal: "Systemowe",
  email: "E-mail",
  sms: "SMS",
};
const sampleValues: Record<string, string> = {
  importKind: "pracowników",
  importStatus: "zakończony poprawnie",
  eventTitle: "Wesele Kowalskich",
  eventDate: "2026-12-01",
  location: "Kraków",
  functions: " Twoje funkcje: Kelner.",
  staffNote: " Jesteś też w obsadzie tego wydarzenia.",
  changedFields: "data, miejsce",
  status: "potwierdzone",
  preparationStatus: "w kompletacji",
  kitchenStatus: "released",
  dueAt: "2026-12-01 14:00",
};

export default function NotificationTemplatesSettings() {
  const { hasPermission } = useUser();
  const canRead = hasPermission("notification_templates.list");
  const canEdit = hasPermission("notification_templates.settings");
  const api = useApi();
  const action = useAction();
  const remote = useRemote<TemplatesPage>(
    canRead ? "/settings/notification-templates?page=1&pageSize=500&sortBy=eventName&sortDirection=asc" : null,
  );
  const eventsRemote = useRemote<EventsPage>(
    canRead ? "/settings/notification-events?page=1&pageSize=100&sortBy=eventName&sortDirection=asc" : null,
  );
  const prefsRemote = useRemote<PreferencesSnapshot>(
    canRead ? "/preferences/notifications" : null,
  );
  const templates = remote.data?.data.items ?? [];
  const eventRows = eventsRemote.data?.data.items ?? [];
  const globalChannels = prefsRemote.data?.data.tenant.channels ?? {};
  const [eventName, setEventName] = useState("");
  const [channelCode, setChannelCode] = useState("internal");
  const [isDefault, setDefault] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [active, setActive] = useState(false);
  const selected = templates.find(
    (template) =>
      template.eventName === eventName &&
      template.channelCode === channelCode &&
      template.isDefault === isDefault,
  );
  const dirty = Boolean(
    selected &&
      (title !== selected.title ||
        content !== selected.content ||
        active !== selected.isActive),
  );
  const eventMeta = eventRows.find((row) => row.eventName === eventName);
  const eventLabel = (name: string) =>
    eventRows.find((row) => row.eventName === name)?.label ?? name;
  const events = useMemo(() => {
    const names = [
      ...new Set([
        ...eventRows.map((row) => row.eventName),
        ...templates.map((template) => template.eventName),
      ]),
    ];
    return names.sort((left, right) =>
      eventLabel(left).localeCompare(eventLabel(right), "pl"),
    );
  }, [eventRows, templates]);
  const enabledGlobalChannels = (
    ["internal", "email", "sms"] as const
  ).filter((code) => globalChannels[code]);
  const channelActive = (code: string) =>
    eventMeta?.channels.find((channel) => channel.channelCode === code)?.active ??
    templates.some(
      (template) =>
        template.eventName === eventName &&
        template.channelCode === code &&
        template.isActive,
    );

  useEffect(() => {
    if (!eventName && events.length) {
      const initial =
        templates.find(
          (template) => template.channelCode === "internal" && template.isActive,
        ) ?? templates[0];
      setEventName(initial?.eventName ?? events[0]);
      setChannelCode(initial?.channelCode ?? enabledGlobalChannels[0] ?? "internal");
      setDefault(initial?.isDefault ?? true);
    }
  }, [eventName, events, templates, enabledGlobalChannels]);

  useEffect(() => {
    setTitle(selected?.title ?? "");
    setContent(selected?.content ?? "");
    setActive(selected?.isActive ?? false);
  }, [selected]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const changeSelection = (change: () => void) => {
    if (!dirty || window.confirm("Odrzucić niezapisane zmiany szablonu?")) change();
  };

  const preview = (text: string) =>
    Object.entries(sampleValues).reduce(
      (current, [key, value]) => current.replaceAll(`{{${key}}}`, value),
      text,
    );
  const variables = eventMeta?.variables ?? [];
  const unknownVariables = [
    ...new Set(
      [...`${title} ${content}`.matchAll(/\{\{([^{}]+)\}\}/g)].map(
        (match) => match[1],
      ),
    ),
  ].filter((variable) => !variables.includes(variable));

  const toggleChannel = (code: string, checked: boolean) => {
    if (!canEdit || !eventName) return;
    action.run(async () => {
      await api(`/settings/notification-events/${eventName}/channels`, "PUT", {
        channels: { [code]: checked },
      });
      eventsRemote.reload();
      remote.reload();
      if (checked) {
        setChannelCode(code);
      }
    }, "Zapisano kanały zdarzenia.");
  };

  if (!canRead) {
    return (
      <Alert severity="info">
        Brak uprawnienia do przeglądania szablonów powiadomień.
      </Alert>
    );
  }

  return (
    <Stack gap={2}>
      <Box>
        <Typography variant="h6" gutterBottom>
          Tytuły i treści powiadomień
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Wybierz zdarzenie, włącz kanały dostępne globalnie w firmie, a następnie
          edytuj treść wiadomości dla wybranego kanału.
        </Typography>
      </Box>
      {(remote.error || eventsRemote.error || prefsRemote.error) && (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              onClick={() => {
                remote.reload();
                eventsRemote.reload();
                prefsRemote.reload();
              }}
            >
              Ponów
            </Button>
          }
        >
          {remote.error || eventsRemote.error || prefsRemote.error}
        </Alert>
      )}
      {(remote.loading || eventsRemote.loading || prefsRemote.loading) && (
        <Typography role="status">Wczytywanie szablonów…</Typography>
      )}
      {!remote.loading && remote.data && !templates.length && (
        <Alert severity="info">Brak szablonów powiadomień w tej firmie.</Alert>
      )}
      {!!templates.length && eventName && (
        <>
          <TextField
            select
            fullWidth
            label="Zdarzenie"
            value={eventName}
            disabled={action.busy}
            onChange={(event) =>
              changeSelection(() => {
                const nextEvent = event.target.value;
                const next =
                  templates.find(
                    (template) =>
                      template.eventName === nextEvent && template.isActive,
                  ) ??
                  templates.find((template) => template.eventName === nextEvent)!;
                setEventName(nextEvent);
                setChannelCode(next.channelCode);
                setDefault(next.isDefault);
              })
            }
          >
            {events.map((event) => (
              <MenuItem key={event} value={event}>
                {eventLabel(event)}
              </MenuItem>
            ))}
          </TextField>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Aktywne kanały dla zdarzenia
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Widoczne są tylko kanały włączone globalnie w firmie. Wyłączenie wszystkich
              oznacza brak wysyłki dla tego zdarzenia.
            </Typography>
            {enabledGlobalChannels.length === 0 ? (
              <Alert severity="warning">
                Brak globalnie włączonych kanałów. Włącz je w zakładce „Kanały”.
              </Alert>
            ) : (
              <Stack direction="row" gap={2} flexWrap="wrap">
                {enabledGlobalChannels.map((code) => (
                  <FormControlLabel
                    key={code}
                    control={
                      <Switch
                        checked={channelActive(code)}
                        disabled={!canEdit || action.busy}
                        onChange={(_, checked) => toggleChannel(code, checked)}
                      />
                    }
                    label={channelLabels[code] ?? code}
                  />
                ))}
              </Stack>
            )}
          </Paper>

          <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
            <TextField
              select
              fullWidth
              label="Kanał do edycji treści"
              value={channelCode}
              disabled={action.busy}
              onChange={(event) =>
                changeSelection(() => {
                  const next =
                    templates.find(
                      (template) =>
                        template.eventName === eventName &&
                        template.channelCode === event.target.value &&
                        template.isActive,
                    ) ??
                    templates.find(
                      (template) =>
                        template.eventName === eventName &&
                        template.channelCode === event.target.value,
                    )!;
                  setChannelCode(next.channelCode);
                  setDefault(next.isDefault);
                })
              }
            >
              {enabledGlobalChannels.map((channel) => (
                <MenuItem key={channel} value={channel}>
                  {channelLabels[channel] ?? channel}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              label="Wariant szablonu"
              value={isDefault ? "default" : "custom"}
              disabled={action.busy}
              onChange={(event) =>
                changeSelection(() => setDefault(event.target.value === "default"))
              }
            >
              <MenuItem value="default">Podstawowy</MenuItem>
              <MenuItem value="custom">Własny</MenuItem>
            </TextField>
          </Stack>

          {!selected ? (
            <Alert severity="info">
              Ten wariant szablonu nie jest dostępny dla wybranego zdarzenia i kanału.
            </Alert>
          ) : (
            <>
              {!canEdit && (
                <Alert severity="info">Masz dostęp tylko do podglądu szablonów.</Alert>
              )}
              <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                <FormControlLabel
                  control={
                    <Switch
                      checked={active}
                      disabled={!canEdit || action.busy}
                      onChange={(_, checked) => setActive(checked)}
                    />
                  }
                  label="Używaj tego wariantu szablonu"
                />
                <Chip
                  size="small"
                  color={selected.isActive ? "success" : "default"}
                  label={selected.isActive ? "Obecnie aktywny" : "Obecnie nieaktywny"}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Włączenie tego wariantu wyłączy drugi wariant dla tego samego zdarzenia i
                kanału.
              </Typography>
              <TextField
                label="Tytuł powiadomienia"
                required
                fullWidth
                value={title}
                disabled={!canEdit || action.busy}
                onChange={(event) => setTitle(event.target.value)}
                slotProps={{ htmlInput: { maxLength: 255 } }}
                helperText={
                  channelCode === "sms"
                    ? "Tytuł jest zapisywany w systemie, ale nie jest wysyłany w SMS."
                    : `${title.length}/255 znaków`
                }
              />
              <TextField
                label="Treść powiadomienia"
                required
                fullWidth
                multiline
                minRows={4}
                value={content}
                disabled={!canEdit || action.busy}
                onChange={(event) => setContent(event.target.value)}
                slotProps={{ htmlInput: { maxLength: 500 } }}
                helperText={`${content.length}/500 znaków`}
              />
              {!!variables.length && (
                <Box>
                  <Typography variant="body2" fontWeight={600} mb={1}>
                    Dostępne zmienne
                  </Typography>
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    {variables.map((variable) => (
                      <Chip key={variable} label={`{{${variable}}}`} />
                    ))}
                  </Stack>
                </Box>
              )}
              {!!unknownVariables.length && (
                <Alert severity="warning">
                  Nieznane zmienne:{" "}
                  {unknownVariables.map((variable) => `{{${variable}}}`).join(", ")}.
                </Alert>
              )}
              <Paper
                variant="outlined"
                sx={{ p: 2, bgcolor: "action.hover", borderRadius: 2, overflowWrap: "anywhere" }}
              >
                <Typography variant="subtitle2" color="text.secondary" mb={1}>
                  Podgląd na przykładowych danych - nic nie zostanie wysłane
                </Typography>
                {channelCode !== "sms" && (
                  <Typography fontWeight={600} mb={1} sx={{ whiteSpace: "pre-wrap" }}>
                    {preview(title)}
                  </Typography>
                )}
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {preview(content)}
                </Typography>
              </Paper>
              {canEdit && (
                <Button
                  variant="contained"
                  disabled={action.busy || !dirty || !title.trim() || !content.trim()}
                  sx={{ alignSelf: "flex-start" }}
                  onClick={() =>
                    action.run(async () => {
                      await api("/settings/notification-templates", "PUT", {
                        eventName,
                        channelCode,
                        title,
                        content,
                        searchDefault: isDefault,
                        markAsActive: active,
                      });
                      remote.setData((current) =>
                        current
                          ? {
                              ...current,
                              data: {
                                ...current.data,
                                items: current.data.items.map((template) =>
                                  template.eventName === eventName &&
                                  template.channelCode === channelCode
                                    ? template.isDefault === isDefault
                                      ? { ...template, title, content, isActive: active }
                                      : active
                                        ? { ...template, isActive: false }
                                        : template
                                    : template,
                                ),
                              },
                            }
                          : current,
                      );
                      eventsRemote.reload();
                    }, "Zapisano szablon powiadomienia.")
                  }
                >
                  {action.busy ? "Zapisywanie…" : "Zapisz szablon"}
                </Button>
              )}
            </>
          )}
        </>
      )}
    </Stack>
  );
}
