"use client";
import { useState } from "react";
import Link from "next/link";
import { Button, Stack, TextField, Alert, Typography } from "@mui/material";
import { useUser } from "@/app/context/userContext";
import { useApi, useAction, eventDateTime, localDateTime } from "./api";
import { EventDetails, Venue } from "./types";
import { LocationEditor, emptyLocation } from "./LocationEditor";
import { Lookup, LookupItem } from "./Lookup";
import { Panel } from "./ui";
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
  const [date, setDate] = useState(initial?.date ?? "");
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
  const [readyDate, setReadyDate] = useState(
    localDateTime(initial?.readyAt, timezone).slice(0, 10) || date,
  );
  const [startDate, setStartDate] = useState(
    localDateTime(initial?.startsAt, timezone).slice(0, 10) || date,
  );
  const [endDate, setEndDate] = useState(
    localDateTime(initial?.endsAt, timezone).slice(0, 10) || date,
  );
  const [ready, setReady] = useState(
    localDateTime(initial?.readyAt, timezone).slice(11, 16),
  );
  const [start, setStart] = useState(
    localDateTime(initial?.startsAt, timezone).slice(11, 16),
  );
  const [end, setEnd] = useState(
    localDateTime(initial?.endsAt, timezone).slice(11, 16),
  );
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
              readyAt: eventDateTime(ready && readyDate ? readyDate + "T" + ready : "", timezone),
              startsAt: eventDateTime(start && startDate ? startDate + "T" + start : "", timezone),
              endsAt: eventDateTime(end && endDate ? endDate + "T" + end : "", timezone),
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
          }, initial ? "Zapisano dane wydarzenia." : "Utworzono wydarzenie.");
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
                onChange={(e) => {
                  const nextDate = e.target.value;
                  const shiftDate = (value: string) => {
                    if (!nextDate || !date || !value) return nextDate;
                    const offset = Date.parse(value) - Date.parse(date);
                    return new Date(Date.parse(nextDate) + offset).toISOString().slice(0, 10);
                  };
                  setReadyDate(shiftDate(readyDate));
                  setStartDate(shiftDate(startDate));
                  setEndDate(shiftDate(endDate));
                  setDate(nextDate);
                }}
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
            {date && (
              <>
                <Typography variant="subtitle2">
                  Harmonogram — godziny w strefie {timezone}
                </Typography>
                <Stack direction={{ xs: "column", md: "row" }} gap={2}>
                  {[
                    {
                      label: "Gotowość cateringu", dateLabel: "Data gotowości cateringu",
                      value: ready, setter: setReady, scheduleDate: readyDate, dateSetter: setReadyDate,
                    },
                    {
                      label: "Początek wydawania", dateLabel: "Data początku wydawania",
                      value: start, setter: setStart, scheduleDate: startDate, dateSetter: setStartDate,
                    },
                    {
                      label: "Koniec obsługi", dateLabel: "Data końca obsługi",
                      value: end, setter: setEnd, scheduleDate: endDate, dateSetter: setEndDate,
                    },
                  ].map(({ label, dateLabel, value, setter, scheduleDate, dateSetter }) => (
                    <Stack key={label} gap={1} sx={{ flex: 1 }}>
                      <TextField
                        label={dateLabel}
                        type="date"
                        value={scheduleDate}
                        onChange={(event) => dateSetter(event.target.value)}
                        required={!!value}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                      <TextField
                        label={label}
                        type="time"
                        value={value}
                        onChange={(event) => setter(event.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </Stack>
                  ))}
                </Stack>
              </>
            )}
            <LocationEditor value={location} onChange={setLocation} />
            <TextField
              label="Opis wydarzenia"
              multiline
              minRows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {canSave && (
              <Button color="primary"
                variant="contained"
                type="submit"
                sx={[{ alignSelf: "start" }, { backgroundColor: '#34495e', color: 'white', fontWeight: 'bold' }]}
              >
                {initial ? "Zapisz dane wydarzenia" : "Utwórz wydarzenie"}
              </Button>
            )}
          </Stack>
        </fieldset>
      </form>
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
