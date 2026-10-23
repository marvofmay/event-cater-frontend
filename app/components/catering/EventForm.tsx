"use client";
import { useState } from "react";
import Link from "next/link";
import { Button, Stack, TextField, Alert, Typography } from "@mui/material";
import { useUser } from "@/app/context/userContext";
import { useApi, useAction, eventDateTime, localDateTime, today } from "./api";
import { EventDetails, Venue } from "./types";
import { LocationEditor, emptyLocation } from "./LocationEditor";
import { Lookup, LookupItem } from "./Lookup";
import { Feedback, Panel } from "./ui";
export function EventForm({
  initial,
  onSaved,
  onDirty,
}: {
  initial?: EventDetails;
  onSaved: (event: EventDetails) => void;
  onDirty?: (dirty: boolean) => void;
}) {
  const api = useApi();
  const action = useAction();
  const { hasPermission } = useUser();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? today());
  const [timezone, setTimezone] = useState(
    initial?.timezone ?? "Europe/Warsaw",
  );
  const [guestCount, setGuests] = useState(
    initial?.guestCount?.toString() ?? "",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [customerName, setCustomer] = useState(initial?.customerName ?? "");
  const [location, setLocation] = useState(
    initial?.location ?? { ...emptyLocation },
  );
  const [coordinator, setCoordinator] = useState<LookupItem | null>(
    initial?.coordinatorUuid
      ? { uuid: initial.coordinatorUuid, name: "Zapisany koordynator" }
      : null,
  );
  const [ready, setReady] = useState(localDateTime(initial?.readyAt, timezone));
  const [start, setStart] = useState(
    localDateTime(initial?.startsAt, timezone),
  );
  const [end, setEnd] = useState(localDateTime(initial?.endsAt, timezone));
  const [venue, setVenue] = useState<Venue | null>(null);
  const [selected, setSelected] = useState<LookupItem | null>(null);
  const [created, setCreated] = useState<EventDetails | null>(null);
  const canSave =
    hasPermission(initial ? "events.update" : "events.create") &&
    !["cancelled", "completed"].includes(initial?.status ?? "");
  return (
    <Panel title={initial ? "Dane wydarzenia" : "Nowe wydarzenie"}>
      {!initial &&
        hasPermission("venues.list") &&
        hasPermission("venues.view") && (
          <Stack gap={1} mb={2}>
            <Lookup
              label="Wczytaj zapisane miejsce"
              path="/event-venues/options"
              value={selected}
              onChange={(item) => {
                setSelected(item);
                if (!item) {
                  setVenue(null);
                  return;
                }
                action.run(async () => {
                  const v = await api<Venue>("/event-venues/" + item.uuid);
                  setVenue(v);
                  setLocation(v.location);
                }, "Wczytano adres. Kontakty miejsca zostaną zapisane razem z wydarzeniem.");
              }}
            />
            {venue && (
              <Typography variant="body2">
                {venue.name} ·{" "}
                {venue.serviceMode === "on_site" ? "W bazie firmy" : "Wyjazd"} ·{" "}
                {venue.contacts?.length ?? 0} kontaktów. Wczytany adres możesz
                zmienić.
              </Typography>
            )}
          </Stack>
        )}
      <form
        onChange={() => onDirty?.(true)}
        onSubmit={(e) => {
          e.preventDefault();
          action.run(async () => {
            const body = {
              title,
              date,
              timezone,
              guestCount: guestCount === "" ? null : Number(guestCount),
              description,
              customerName,
              location,
              coordinatorUuid: coordinator?.uuid ?? null,
              readyAt: eventDateTime(ready, timezone),
              startsAt: eventDateTime(start, timezone),
              endsAt: eventDateTime(end, timezone),
              ...(initial ? { version: initial.version } : {}),
            };
            let result = await api<EventDetails>(
              "/events" + (initial ? "/" + initial.uuid : ""),
              initial ? "PUT" : "POST",
              body,
            );
            if (!initial) {
              setCreated(result);
              if (venue?.contacts?.length)
                result = await api<EventDetails>(
                  "/events/" + result.uuid + "/contacts",
                  "PUT",
                  { version: result.version, contacts: venue.contacts },
                );
            }
            onDirty?.(false);
            onSaved(result);
          });
        }}
      >
        <fieldset
          disabled={!canSave || action.busy || !!created}
          style={{ border: 0, padding: 0 }}
        >
          <Stack gap={2}>
            <Stack direction={{ xs: "column", md: "row" }} gap={2}>
              <TextField
                required
                label="Tytuł wydarzenia"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
              />
              <TextField
                required
                label="Data wydarzenia"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Liczba gości"
                type="number"
                value={guestCount}
                onChange={(e) => setGuests(e.target.value)}
                slotProps={{ htmlInput: { min: 1, max: 1000000, step: 1 } }}
              />
            </Stack>
            <Stack direction={{ xs: "column", md: "row" }} gap={2}>
              <TextField
                label="Klient / organizator"
                value={customerName}
                onChange={(e) => setCustomer(e.target.value)}
                fullWidth
              />
              {hasPermission("events.assign_event_staff") && (
                <Lookup
                  label="Koordynator"
                  path="/events/staff-options"
                  value={coordinator}
                  onChange={(v) => {
                    setCoordinator(v);
                    onDirty?.(true);
                  }}
                />
              )}
              <TextField
                label="Strefa czasowa"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                required
              />
            </Stack>
            <Typography variant="subtitle2">
              Harmonogram — godziny w strefie {timezone}
            </Typography>
            <Stack direction={{ xs: "column", md: "row" }} gap={2}>
              {[
                ["Gotowość cateringu", ready, setReady],
                ["Początek wydawania", start, setStart],
                ["Koniec obsługi", end, setEnd],
              ].map(([label, value, setter]) => (
                <TextField
                  key={label as string}
                  label={label as string}
                  type="datetime-local"
                  value={value as string}
                  onChange={(e) =>
                    (setter as (v: string) => void)(e.target.value)
                  }
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              ))}
            </Stack>
            <LocationEditor value={location} onChange={setLocation} />
            <TextField
              label="Opis wydarzenia"
              multiline
              minRows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {canSave && (
              <Button
                variant="contained"
                type="submit"
                sx={{ alignSelf: "start" }}
              >
                {initial ? "Zapisz dane wydarzenia" : "Utwórz wydarzenie"}
              </Button>
            )}
          </Stack>
        </fieldset>
      </form>
      <Feedback error={action.error} success={action.success} />
      {created && action.error && (
        <Alert severity="warning">
          Wydarzenie zostało utworzone, ale nie udało się zapisać kontaktów.{" "}
          <Link href={"/catering/events/" + created.uuid}>
            Otwórz wydarzenie i uzupełnij kontakty
          </Link>
          . Nie twórz drugiego wydarzenia.
        </Alert>
      )}
    </Panel>
  );
}
