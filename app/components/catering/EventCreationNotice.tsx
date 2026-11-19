"use client";

import { useState } from "react";
import { Alert, Button, Chip, FormControlLabel, Stack, Switch, Typography } from "@mui/material";
import { toast } from "react-toastify";
import { useUser } from "@/app/context/userContext";
import { useAction, useApi } from "./api";
import { Lookup, LookupItem } from "./Lookup";

interface CreationNoticeResult {
  sent: boolean;
  alreadySent: boolean;
  sentAt: string | null;
  recipientCount: number;
  version: number;
}

export function EventCreationNotice({
  eventUuid,
  sentAt,
  closed,
  onSent,
}: {
  eventUuid: string;
  sentAt?: string | null;
  closed?: boolean;
  onSent: (sentAt: string, version: number) => void;
}) {
  const { hasPermission } = useUser();
  const canSend = hasPermission("events.update") && !closed;
  const canSearchStaff = hasPermission("events.assign_event_staff");
  const api = useApi();
  const action = useAction();
  const [enabled, setEnabled] = useState(false);
  const [pick, setPick] = useState<LookupItem | null>(null);
  const [extras, setExtras] = useState<LookupItem[]>([]);

  if (sentAt) {
    return (
      <Alert severity="success" sx={{ mb: 2 }}>
        Powiadomienie o utworzeniu wydarzenia zostało wysłane. Nie pójdzie drugi raz. Nowo dopisane osoby dostaną osobne powiadomienie przy przypisaniu.
      </Alert>
    );
  }

  const addExtra = (item: LookupItem | null) => {
    setPick(null);
    if (!item || extras.some((row) => row.uuid === item.uuid)) return;
    setExtras((current) => [...current, item]);
  };

  return (
    <Stack gap={1.5} sx={{ mb: 2, p: 2, border: 1, borderColor: "divider", borderRadius: 2 }}>
      <Typography variant="subtitle2">Powiadomienie o utworzeniu</Typography>
      <Typography variant="body2" color="text.secondary">
        Samo utworzenie wydarzenia nikogo nie powiadamia. Zapisz najpierw, kto obsługuje wydarzenie i kto kompletuje sprzęt. Potem włącz przełącznik. Powiadomienie pójdzie raz: do koordynatora, obsady, osoby kompletującej, kuchni i do osób wskazanych poniżej.
      </Typography>
      <FormControlLabel
        control={
          <Switch
            checked={enabled}
            disabled={!canSend || action.busy}
            onChange={(_, checked) => setEnabled(checked)}
          />
        }
        label="Wyślij powiadomienia"
      />
      {enabled && canSend && (
        <Stack gap={1.5}>
          {canSearchStaff && (
            <Lookup
              label="Dodatkowy odbiorca"
              path="/events/staff-options"
              value={pick}
              onChange={addExtra}
              disabled={action.busy}
            />
          )}
          {extras.length > 0 && (
            <Stack direction="row" gap={1} flexWrap="wrap">
              {extras.map((person) => (
                <Chip
                  key={person.uuid}
                  label={person.name}
                  onDelete={action.busy ? undefined : () => setExtras((current) => current.filter((row) => row.uuid !== person.uuid))}
                />
              ))}
            </Stack>
          )}
          <Button
            variant="contained"
            disabled={action.busy}
            sx={{ alignSelf: "start", backgroundColor: "#34495e", color: "white", fontWeight: "bold" }}
            onClick={() =>
              action.run(async () => {
                const response = await api<CreationNoticeResult>(
                  "/events/" + eventUuid + "/creation-notice",
                  "POST",
                  { extraEmployeeUuids: extras.map((person) => person.uuid) },
                );
                if (response.sentAt) onSent(response.sentAt, response.version);
                if (response.alreadySent) {
                  toast.info("To powiadomienie zostało już wysłane i nie pójdzie drugi raz.");
                  return;
                }
                toast.success("Wysłano powiadomienie o utworzeniu wydarzenia.");
              }, "")
            }
          >
            Wyślij powiadomienie
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
