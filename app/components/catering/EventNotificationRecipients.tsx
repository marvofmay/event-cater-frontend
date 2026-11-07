"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { useUser } from "@/app/context/userContext";
import { useAction, useApi, useRemote } from "./api";
import { Lookup, LookupItem } from "./Lookup";
import { Feedback, Loading, Panel } from "./ui";

interface RecipientRow {
  employeeUuid: string;
  name: string;
  sources?: string[];
  excluded?: boolean;
}

type ChannelMap = { internal: boolean; email: boolean; sms: boolean };

interface RecipientsPayload {
  defaults: RecipientRow[];
  extra: RecipientRow[];
  effective: RecipientRow[];
  channels: ChannelMap | null;
  channelsInherited: boolean;
}

interface PreferencesSnapshot {
  data: { tenant: { channels: Partial<ChannelMap> } };
}

const sourceLabels: Record<string, string> = {
  staff: "obsada",
  coordinator: "koordynator",
  packer: "kompletacja",
  kitchen: "kuchnia",
};
const channelLabels: Record<keyof ChannelMap, string> = {
  internal: "Systemowe",
  email: "E-mail",
  sms: "SMS",
};
const defaultChannels: ChannelMap = { internal: true, email: true, sms: true };

export function EventNotificationRecipients({
  eventUuid,
  closed,
}: {
  eventUuid: string;
  closed?: boolean;
}) {
  const { hasPermission } = useUser();
  const canEdit = hasPermission("events.update") && !closed;
  const canSearchStaff = hasPermission("events.assign_event_staff");
  const api = useApi();
  const action = useAction();
  const remote = useRemote<RecipientsPayload>(
    hasPermission("events.view")
      ? `/events/${eventUuid}/notification-recipients`
      : null,
  );
  const prefs = useRemote<PreferencesSnapshot>(
    hasPermission("events.view") ? "/preferences/notifications" : null,
  );
  const [excluded, setExcluded] = useState<string[]>([]);
  const [extra, setExtra] = useState<RecipientRow[]>([]);
  const [pick, setPick] = useState<LookupItem | null>(null);
  const [inheritChannels, setInheritChannels] = useState(true);
  const [channels, setChannels] = useState<ChannelMap>(defaultChannels);

  const payload = remote.data;
  const globalChannels = prefs.data?.data.tenant.channels ?? {};

  useEffect(() => {
    if (!payload) return;
    setExcluded(
      payload.defaults.filter((row) => row.excluded).map((row) => row.employeeUuid),
    );
    setExtra(payload.extra);
    setInheritChannels(payload.channelsInherited);
    setChannels(payload.channels ?? { ...defaultChannels, ...globalChannels } as ChannelMap);
  }, [payload, globalChannels.internal, globalChannels.email, globalChannels.sms]);

  const dirty =
    !!payload &&
    (JSON.stringify([...excluded].sort()) !==
      JSON.stringify(
        payload.defaults
          .filter((row) => row.excluded)
          .map((row) => row.employeeUuid)
          .sort(),
      ) ||
      JSON.stringify(extra.map((row) => row.employeeUuid).sort()) !==
        JSON.stringify(payload.extra.map((row) => row.employeeUuid).sort()) ||
      inheritChannels !== payload.channelsInherited ||
      (!inheritChannels &&
        JSON.stringify(channels) !== JSON.stringify(payload.channels ?? defaultChannels)));

  const toggleDefault = (employeeUuid: string, checked: boolean) => {
    setExcluded((current) =>
      checked
        ? current.filter((uuid) => uuid !== employeeUuid)
        : [...new Set([...current, employeeUuid])],
    );
  };

  const addExtra = (item: LookupItem | null) => {
    setPick(item);
    if (!item) return;
    if (
      payload?.defaults.some((row) => row.employeeUuid === item.uuid) ||
      extra.some((row) => row.employeeUuid === item.uuid)
    ) {
      setPick(null);
      return;
    }
    setExtra((current) => [...current, { employeeUuid: item.uuid, name: item.name }]);
    setExcluded((current) => current.filter((uuid) => uuid !== item.uuid));
    setPick(null);
  };

  const save = () => {
    action.run(async () => {
      const response = await api<RecipientsPayload>(
        `/events/${eventUuid}/notification-recipients`,
        "PUT",
        {
          excludedEmployeeUuids: excluded,
          extraEmployeeUuids: extra.map((row) => row.employeeUuid),
          channelsInherited: inheritChannels,
          ...(inheritChannels ? {} : { channels }),
        },
      );
      remote.setData(response);
    }, "Zapisano ustawienia powiadomień wydarzenia.");
  };

  return (
    <Panel title="Powiadomienia wydarzenia">
      <Typography variant="body2" color="text.secondary" mb={2}>
        Ustal odbiorców i kanały dla tego wydarzenia — m.in. kto dostanie info, że lista
        kompletacji została złożona. Odznacz wszystkich albo wyłącz kanały, jeśli powiadomienie
        ma nie iść. Osobiste powiadomienia o przypisaniu zawsze trafiają do wskazanej osoby.
      </Typography>
      <Feedback error={remote.error || prefs.error} />
      {(remote.loading || prefs.loading) && <Loading />}
      {payload && (
        <Stack gap={2}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Kanały dla tego wydarzenia
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={inheritChannels}
                  disabled={!canEdit || action.busy}
                  onChange={(_, checked) => setInheritChannels(checked)}
                />
              }
              label="Dziedzicz kanały z ustawień firmowych typu zdarzenia"
            />
            {!inheritChannels && (
              <Stack direction="row" gap={2} flexWrap="wrap" mt={1}>
                {(Object.keys(channelLabels) as (keyof ChannelMap)[]).map((code) => (
                  <FormControlLabel
                    key={code}
                    control={
                      <Switch
                        checked={channels[code]}
                        disabled={
                          !canEdit || action.busy || globalChannels[code] === false
                        }
                        onChange={(_, checked) =>
                          setChannels((current) => ({ ...current, [code]: checked }))
                        }
                      />
                    }
                    label={
                      channelLabels[code] +
                      (globalChannels[code] === false ? " (wyłączone globalnie)" : "")
                    }
                  />
                ))}
              </Stack>
            )}
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              Nadpisanie dotyczy wysyłek tego wydarzenia. Kanał wyłączony globalnie w firmie
              i tak nie wyśle wiadomości.
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Lista domyślna odbiorców
            </Typography>
            <Stack gap={0.5}>
              {payload.defaults.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Brak osób w obsadzie / koordynacji — dodaj odbiorców poniżej.
                </Typography>
              )}
              {payload.defaults.map((row) => {
                const checked = !excluded.includes(row.employeeUuid);
                return (
                  <Stack
                    key={row.employeeUuid}
                    direction="row"
                    alignItems="center"
                    gap={1}
                    flexWrap="wrap"
                    sx={{ opacity: checked ? 1 : 0.55 }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={checked}
                          disabled={!canEdit || action.busy}
                          onChange={(_, value) => toggleDefault(row.employeeUuid, value)}
                        />
                      }
                      label={row.name}
                    />
                    {(row.sources ?? []).map((source) => (
                      <Chip
                        key={source}
                        size="small"
                        label={sourceLabels[source] ?? source}
                      />
                    ))}
                  </Stack>
                );
              })}
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Dodatkowi odbiorcy
            </Typography>
            {canEdit && canSearchStaff && (
              <Lookup
                label="Dodaj odbiorcę"
                path="/events/staff-options"
                value={pick}
                onChange={addExtra}
                disabled={action.busy}
              />
            )}
            {canEdit && !canSearchStaff && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Aby dodawać osoby spoza obsady, potrzebne jest uprawnienie do
                przypisywania obsady.
              </Alert>
            )}
            <Stack gap={0.5} mt={1}>
              {extra.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Brak dodatkowych osób.
                </Typography>
              )}
              {extra.map((row) => (
                <Stack
                  key={row.employeeUuid}
                  direction="row"
                  alignItems="center"
                  gap={1}
                >
                  <Typography>{row.name}</Typography>
                  {canEdit && (
                    <Button
                      size="small"
                      color="error"
                      onClick={() =>
                        setExtra((current) =>
                          current.filter((item) => item.employeeUuid !== row.employeeUuid),
                        )
                      }
                    >
                      Usuń
                    </Button>
                  )}
                </Stack>
              ))}
            </Stack>
          </Box>

          <Alert severity="info">
            Efektywnie powiadomimy {payload.effective.length} osób
            {dirty ? " (po zapisie lista może się zmienić)" : ""}.
          </Alert>

          {canEdit && (
            <Button
              variant="contained"
              disabled={!dirty || action.busy}
              onClick={save}
              sx={{ alignSelf: "flex-start", backgroundColor: "#34495e", fontWeight: "bold" }}
            >
              {action.busy ? "Zapisywanie…" : "Zapisz ustawienia powiadomień"}
            </Button>
          )}
        </Stack>
      )}
    </Panel>
  );
}
