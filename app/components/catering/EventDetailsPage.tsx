"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
  Chip,
} from "@mui/material";
import { useUser } from "@/app/context/userContext";
import {
  useApi,
  useAction,
  useRemote,
  downloadPrivate,
  eventDateTime,
  localDateTime,
} from "./api";
import { EventDetails, Venue, KitchenOrder, MenuItem } from "./types";
import {
  Feedback,
  FieldSelect,
  Loading,
  Panel,
  Permission,
  Status,
  stateLabels,
} from "./ui";
import { Lookup, LookupItem } from "./Lookup";
import { EventForm } from "./EventForm";
import { ContactEditor } from "./ContactEditor";
import { MenuEditor } from "./MenuEditor";
import { PreparationPanel } from "./PreparationPanel";
import { KitchenCard } from "./KitchenCard";
import { HistoryPanel } from "./HistoryPanel";
export function EventDetailsPage({ uuid }: { uuid: string }) {
  const { hasPermission } = useUser();
  const api = useApi();
  const action = useAction();
  const remote = useRemote<EventDetails>(
    hasPermission("events.view") ? "/events/" + uuid : null,
  );
  const [tab, setTab] = useState("details");
  const [dirty, setDirty] = useState(false);
  const [nextStatus, setNextStatus] = useState("");
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const save = (event: EventDetails) => {
    remote.setData(event);
    setDirty(false);
  };
  const event = remote.data;
  const closed = ["completed", "cancelled"].includes(event?.status ?? "");
  const states: Record<string, string[]> = {
    draft: ["planned", "cancelled"],
    planned: ["draft", "confirmed", "cancelled"],
    confirmed: ["in_progress", "cancelled"],
    in_progress: ["completed", "cancelled"],
  };
  const tabs = [
    ["details", "Dane i miejsce"],
    ["contacts", "Kontakty"],
    ["menu", "Menu"],
    ["staff", "Zespół"],
    ["preparation", "Kompletacja"],
    ...(hasPermission("orders.view") ? [["kitchen", "Kuchnia"]] : []),
    ["media", "Zdjęcia i filmy"],
    ["history", "Historia"],
  ];
  return (
    <Permission name="events.view">
      <Button component={Link} href="/catering/events">
        ← Lista wydarzeń
      </Button>
      <Feedback error={remote.error || action.error} success={action.success} />
      {remote.loading && <Loading />}
      {event && (
        <>
          <Stack
            direction="row"
            gap={2}
            alignItems="center"
            flexWrap="wrap"
            my={2}
          >
            <Typography variant="h5">{event.title}</Typography>
            <Status value={event.status} />
            <Typography>
              {event.date} · {event.guestCount ?? "Nie ustalono liczby"} gości
            </Typography>
            <Button
              onClick={() => {
                if (
                  !dirty ||
                  window.confirm("Odrzucić niezapisane zmiany i odświeżyć?")
                ) {
                  setDirty(false);
                  remote.reload();
                }
              }}
            >
              Odśwież wydarzenie
            </Button>
          </Stack>
          <Stack
            component="nav"
            aria-label="Zakładki wydarzenia"
            direction="row"
            gap={1}
            flexWrap="wrap"
            mb={2}
          >
            {tabs.map(([key, label]) => (
              <Button
                key={key}
                variant={tab === key ? "contained" : "outlined"}
                onClick={() => {
                  if (tab === key) return;
                  if (
                    dirty &&
                    !window.confirm("Odrzucić niezapisane zmiany formularza?")
                  )
                    return;
                  setDirty(false);
                  setTab(key);
                }}
              >
                {label}
              </Button>
            ))}
          </Stack>
          {closed && (
            <Alert severity="info">
              Wydarzenie jest{" "}
              {event.status === "cancelled" ? "anulowane" : "zakończone"}. Dane
              operacyjne pozostają w historii.
            </Alert>
          )}
          {tab === "details" && (
            <>
              <VenueSelection
                event={event}
                onChange={save}
                disabled={dirty || closed}
              />
              <EventForm
                key={event.version}
                initial={event}
                onSaved={save}
                onDirty={setDirty}
              />
              {hasPermission("events.update") && !closed && (
                <Panel title="Etap wydarzenia">
                  <Typography mb={1}>
                    Potwierdzenie wymaga harmonogramu, adresu, liczby gości,
                    koordynatora i kontaktu. Rozpoczęcie wymaga potwierdzonego
                    załadunku, jeśli lista kompletacji nie jest pusta.
                  </Typography>
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    {(states[event.status] ?? [])
                      .filter(
                        (s) =>
                          (s !== "confirmed" ||
                            hasPermission("events.confirm_event")) &&
                          (s !== "cancelled" || hasPermission("events.delete")),
                      )
                      .map((s) => (
                        <Button
                          key={s}
                          color={s === "cancelled" ? "error" : "primary"}
                          disabled={dirty || action.busy}
                          onClick={() => setNextStatus(s)}
                        >
                          {stateLabels[s]}
                        </Button>
                      ))}
                  </Stack>
                </Panel>
              )}
            </>
          )}
          {tab === "contacts" && (
            <ContactsSection
              key={event.version}
              event={event}
              onChange={save}
              onDirty={setDirty}
              closed={closed}
            />
          )}
          {tab === "menu" && (
            <MenuSection
              key={event.version}
              event={event}
              onChange={save}
              onDirty={setDirty}
              closed={closed}
            />
          )}
          {tab === "staff" && (
            <StaffSection
              key={event.version}
              event={event}
              onChange={save}
              closed={closed}
            />
          )}
          {tab === "preparation" && (
            <PreparationPanel
              event={event}
              onChanged={(version) => {
                remote.setData((previous) =>
                  previous ? { ...previous, version } : previous,
                );
              }}
            />
          )}
          {tab === "kitchen" && (
            <KitchenSection event={event} onDirty={setDirty} />
          )}
          {tab === "media" && (
            <MediaSection key={event.version} event={event} onChange={save} />
          )}
          {tab === "history" && (
            <HistoryPanel path={"/events/" + uuid + "/history"} />
          )}
          <Dialog open={!!nextStatus} onClose={() => setNextStatus("")}>
            <DialogTitle>Zmienić etap wydarzenia?</DialogTitle>
            <DialogContent>
              {stateLabels[nextStatus]}.{" "}
              {nextStatus === "cancelled"
                ? "Anulowanie zablokuje dalszą obsługę i produkcję kuchni. Historia zostanie zachowana."
                : ""}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setNextStatus("")}>Wróć</Button>
              <Button
                disabled={action.busy}
                onClick={() =>
                  action.run(async () => {
                    save(
                      await api<EventDetails>(
                        "/events/" + uuid + "/status",
                        "POST",
                        { version: event.version, status: nextStatus },
                      ),
                    );
                    setNextStatus("");
                  })
                }
              >
                Potwierdź zmianę etapu
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Permission>
  );
}
function VenueSelection({
  event,
  onChange,
  disabled,
}: {
  event: EventDetails;
  onChange: (e: EventDetails) => void;
  disabled: boolean;
}) {
  const { hasPermission } = useUser();
  const api = useApi();
  const action = useAction();
  const [pick, setPick] = useState<LookupItem | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [contacts, setContacts] = useState(false);
  const [name, setName] = useState(event.location.venue ?? "");
  return (
    <Panel title="Miejsce z bazy adresów">
      <Typography mb={2}>
        Wczytaj dane przy kolejnym wyjeździe do tego samego obiektu. Możesz
        następnie dostosować adres i instrukcje do konkretnego wydarzenia.
      </Typography>
      {hasPermission("venues.list") &&
        hasPermission("venues.view") &&
        hasPermission("events.update") && (
          <Stack gap={1}>
            <Lookup
              label="Znajdź zapisane miejsce"
              path="/event-venues/options"
              value={pick}
              disabled={disabled}
              onChange={(v) => {
                setPick(v);
                setVenue(null);
                if (v)
                  action.run(
                    async () =>
                      setVenue(await api<Venue>("/event-venues/" + v.uuid)),
                    "Wczytano podgląd miejsca.",
                  );
              }}
            />
            {venue && (
              <Typography>
                {venue.location.street}, {venue.location.postalCode}{" "}
                {venue.location.city}. {venue.location.instructions}{" "}
                {venue.notes} · {venue.contacts?.length ?? 0} kontaktów
              </Typography>
            )}
            <FormControlLabel
              control={
                <Checkbox
                  checked={contacts}
                  onChange={(e) => setContacts(e.target.checked)}
                  disabled={disabled}
                />
              }
              label="Zastąp kontakty wydarzenia kontaktami miejsca"
            />
            <Button
              disabled={disabled || action.busy || !venue}
              sx={{ alignSelf: "start" }}
              onClick={() =>
                action.run(async () => {
                  if (!venue) return;
                  onChange(
                    await api<EventDetails>(
                      "/events/" + event.uuid + "/venue",
                      "PUT",
                      {
                        version: event.version,
                        venueUuid: venue.uuid,
                        venueVersion: venue.version,
                        replaceContacts: contacts,
                      },
                    ),
                  );
                })
              }
            >
              Wczytaj miejsce do wydarzenia
            </Button>
            {disabled && (
              <Typography variant="caption">
                Zapisz zmiany formularza przed wczytaniem miejsca.
              </Typography>
            )}
          </Stack>
        )}
      {hasPermission("venues.create") && (
        <Stack direction="row" gap={1} mt={2} flexWrap="wrap">
          <TextField
            size="small"
            label="Nazwa miejsca do zapisania"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            disabled={
              action.busy ||
              !name.trim() ||
              !event.location.street ||
              !event.location.city ||
              !event.location.postalCode
            }
            onClick={() =>
              action.run(async () => {
                await api("/events/" + event.uuid + "/save-venue", "POST", {
                  version: event.version,
                  name,
                  notes: event.location.instructions,
                  serviceMode: "off_site",
                });
              }, "Zapisano miejsce i aktualne kontakty w bazie.")
            }
          >
            Zapisz aktualne miejsce w bazie
          </Button>
        </Stack>
      )}
      <Feedback error={action.error} success={action.success} />
    </Panel>
  );
}
function ContactsSection({
  event,
  onChange,
  onDirty,
  closed,
}: {
  event: EventDetails;
  onChange: (e: EventDetails) => void;
  onDirty: (d: boolean) => void;
  closed: boolean;
}) {
  const { hasPermission } = useUser();
  const api = useApi();
  const action = useAction();
  const [contacts, setContacts] = useState(event.contacts);
  const allowed = hasPermission("events.update") && !closed;
  return (
    <Panel title="Kontakty do obsługi wydarzenia">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          action.run(async () =>
            onChange(
              await api<EventDetails>(
                "/events/" + event.uuid + "/contacts",
                "PUT",
                { version: event.version, contacts },
              ),
            ),
          );
        }}
      >
        <ContactEditor
          value={contacts}
          disabled={!allowed || action.busy}
          onChange={(v) => {
            setContacts(v);
            onDirty(true);
          }}
        />
        {allowed && (
          <Button type="submit" disabled={action.busy}>
            Zapisz kontakty
          </Button>
        )}
      </form>
      <Feedback error={action.error} />
    </Panel>
  );
}
function MenuSection({
  event,
  onChange,
  onDirty,
  closed,
}: {
  event: EventDetails;
  onChange: (e: EventDetails) => void;
  onDirty: (d: boolean) => void;
  closed: boolean;
}) {
  const { hasPermission } = useUser();
  const api = useApi();
  const action = useAction();
  const [items, setItems] = useState<MenuItem[]>(() =>
    event.menu.map((item) => ({ ...item, clientId: crypto.randomUUID() })),
  );
  const allowed = hasPermission("events.plan_event_menu") && !closed;
  return (
    <Panel title="Menu wydarzenia">
      <Typography mb={2}>
        Wpisz osobno potrawy i warianty dietetyczne z rzeczywistą liczbą porcji.
        Zmiana menu wymaga później uzgodnienia rewizji już wydanej karty kuchni.
      </Typography>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          action.run(async () =>
            onChange(
              await api<EventDetails>(
                "/events/" + event.uuid + "/menu",
                "PUT",
                {
                  version: event.version,
                  items: items.map(({ clientId, ...dish }) => dish),
                },
              ),
            ),
          );
        }}
      >
        <MenuEditor
          items={items}
          disabled={!allowed || action.busy}
          onChange={(v) => {
            setItems(v);
            onDirty(true);
          }}
        />
        {allowed && (
          <Button
            type="submit"
            variant="contained"
            disabled={action.busy}
            sx={{ mt: 2 }}
          >
            Zapisz menu wydarzenia
          </Button>
        )}
      </form>
      <Feedback error={action.error} />
    </Panel>
  );
}
function StaffSection({
  event,
  onChange,
  closed,
}: {
  event: EventDetails;
  onChange: (e: EventDetails) => void;
  closed: boolean;
}) {
  const { hasPermission } = useUser();
  const api = useApi();
  const action = useAction();
  const allowed = hasPermission("events.assign_event_staff") && !closed;
  const [employee, setEmployee] = useState<LookupItem | null>(null);
  const [functions, setFunctions] = useState<string[]>(["waiter"]);
  const [start, setStart] = useState(
    localDateTime(event.readyAt, event.timezone),
  );
  const [end, setEnd] = useState(localDateTime(event.endsAt, event.timezone));
  const [notes, setNotes] = useState("");
  const [remove, setRemove] = useState<string | null>(null);
  const labels: Record<string, string> = {
    driver: "Kierowca",
    waiter: "Kelner / kelnerka",
    logistics: "Logistyka",
    chef: "Kucharz",
    coordinator: "Koordynator",
  };
  return (
    <Panel title="Zespół wydarzenia">
      {event.staff.map((person) => (
        <Stack key={person.uuid} direction="row" gap={2} my={1} flexWrap="wrap">
          <Typography>
            {person.employeeName} ·{" "}
            {person.functions.map((f) => labels[f] ?? f).join(", ")} ·{" "}
            {localDateTime(person.startsAt, event.timezone).replace("T", " ")} –{" "}
            {localDateTime(person.endsAt, event.timezone).replace("T", " ")}
          </Typography>
          {allowed && (
            <>
              <Button
                onClick={() => {
                  setEmployee({
                    uuid: person.employeeUuid,
                    name: person.employeeName,
                  });
                  setFunctions(person.functions);
                  setStart(localDateTime(person.startsAt, event.timezone));
                  setEnd(localDateTime(person.endsAt, event.timezone));
                  setNotes(person.notes ?? "");
                }}
              >
                Zmień przydział
              </Button>
              <Button onClick={() => setRemove(person.employeeUuid)}>
                Usuń przydział
              </Button>
            </>
          )}
        </Stack>
      ))}
      {allowed && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            action.run(async () => {
              if (!employee) throw new Error("Wybierz pracownika.");
              onChange(
                await api<EventDetails>(
                  "/events/" + event.uuid + "/staff/" + employee.uuid,
                  "PUT",
                  {
                    version: event.version,
                    functions,
                    startsAt: eventDateTime(start, event.timezone),
                    endsAt: eventDateTime(end, event.timezone),
                    notes,
                  },
                ),
              );
            });
          }}
        >
          <Stack gap={2} mt={3}>
            <Lookup
              label="Pracownik"
              path="/events/staff-options"
              value={employee}
              onChange={setEmployee}
            />
            <Stack direction="row" flexWrap="wrap">
              {Object.entries(labels).map(([code, label]) => (
                <FormControlLabel
                  key={code}
                  label={label}
                  control={
                    <Checkbox
                      checked={functions.includes(code)}
                      onChange={(e) =>
                        setFunctions(
                          e.target.checked
                            ? [...functions, code]
                            : functions.filter((v) => v !== code),
                        )
                      }
                    />
                  }
                />
              ))}
            </Stack>
            <Stack direction="row" gap={2} flexWrap="wrap">
              <TextField
                required
                type="datetime-local"
                label="Praca od"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                required
                type="datetime-local"
                label="Praca do"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
            <TextField
              label="Uwagi do przydziału"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Button
              type="submit"
              disabled={action.busy || !employee || !functions.length}
            >
              Zapisz przydział pracownika
            </Button>
          </Stack>
        </form>
      )}
      <Feedback error={action.error} />
      <Dialog open={!!remove} onClose={() => setRemove(null)}>
        <DialogTitle>Usunąć przydział pracownika?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setRemove(null)}>Anuluj</Button>
          <Button
            disabled={action.busy}
            onClick={() =>
              action.run(async () => {
                onChange(
                  await api<EventDetails>(
                    "/events/" + event.uuid + "/staff/" + remove,
                    "DELETE",
                    { version: event.version },
                  ),
                );
                setRemove(null);
              })
            }
          >
            Potwierdź usunięcie
          </Button>
        </DialogActions>
      </Dialog>
    </Panel>
  );
}
function KitchenSection({
  event,
  onDirty,
}: {
  event: EventDetails;
  onDirty: (d: boolean) => void;
}) {
  const { hasPermission } = useUser();
  const api = useApi();
  const action = useAction();
  const remote = useRemote<KitchenOrder>(
    "/events/" + event.uuid + "/kitchen-orders",
  );
  const [mode, setMode] = useState("off_site");
  const [owner, setOwner] = useState<LookupItem | null>(null);
  const [date, setDate] = useState(event.date);
  const [due, setDue] = useState(localDateTime(event.readyAt, event.timezone));
  if (remote.loading) return <Loading />;
  return (
    <>
      <Feedback
        error={remote.status === 404 ? "" : remote.error || action.error}
      />
      {remote.data ? (
        <KitchenCard
          key={remote.data.uuid + "-" + remote.data.version}
          order={remote.data}
          onChange={remote.setData}
          onDirty={onDirty}
        />
      ) : (
        remote.status === 404 && (
          <Panel title="Karta produkcyjna kuchni">
            <Typography mb={2}>
              Nie utworzono jeszcze karty dla tego wydarzenia. Karta pobierze
              potrawy i warianty z zapisanego menu.
            </Typography>
            {hasPermission("orders.plan_kitchen_production") &&
              !["completed", "cancelled"].includes(event.status) && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    action.run(async () =>
                      remote.setData(
                        await api<KitchenOrder>(
                          "/events/" + event.uuid + "/kitchen-orders",
                          "POST",
                          {
                            eventVersion: event.version,
                            serviceMode: mode,
                            productionDate: date,
                            dueAt: eventDateTime(due, event.timezone),
                            responsibleUuid: owner?.uuid ?? null,
                          },
                        ),
                      ),
                    );
                  }}
                >
                  <Stack gap={2}>
                    <FieldSelect
                      label="Rodzaj obsługi"
                      value={mode}
                      onChange={setMode}
                      options={{ off_site: "Wyjazd", on_site: "W bazie firmy" }}
                    />
                    <Lookup
                      label="Odpowiedzialny za kuchnię"
                      path="/kitchen-orders/staff-options"
                      value={owner}
                      onChange={setOwner}
                    />
                    <TextField
                      required
                      label="Dzień produkcji"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <TextField
                      label={"Gotowe na (" + event.timezone + ")"}
                      type="datetime-local"
                      value={due}
                      onChange={(e) => setDue(e.target.value)}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={action.busy}
                    >
                      Utwórz kartę z menu wydarzenia
                    </Button>
                  </Stack>
                </form>
              )}
            <Feedback error={action.error} />
          </Panel>
        )
      )}
    </>
  );
}
function MediaSection({
  event,
  onChange,
}: {
  event: EventDetails;
  onChange: (e: EventDetails) => void;
}) {
  const { hasPermission, token } = useUser();
  const api = useApi();
  const action = useAction();
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [remove, setRemove] = useState<string | null>(null);
  const allowed =
    hasPermission("events.manage_event_media") && event.status !== "cancelled";
  return (
    <Panel title="Zdjęcia i filmy z wydarzenia">
      {event.attachments.map((attachment) => (
        <Stack
          direction="row"
          gap={1}
          flexWrap="wrap"
          key={attachment.uuid}
          my={1}
        >
          <Typography>
            {attachment.name} · {(attachment.size / 1024 / 1024).toFixed(1)} MB
            · {attachment.description}
          </Typography>
          <Button
            onClick={() =>
              action.run(
                () =>
                  downloadPrivate(
                    "/events/" + event.uuid + "/attachments/" + attachment.uuid,
                    token,
                    attachment.name,
                  ),
                "Pobrano plik.",
              )
            }
          >
            Pobierz
          </Button>
          {allowed && (
            <Button onClick={() => setRemove(attachment.uuid)}>
              Usuń załącznik
            </Button>
          )}
        </Stack>
      ))}
      {allowed && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            action.run(async () => {
              if (!file) throw new Error("Wybierz zdjęcie lub film.");
              if (file.size > 100 * 1024 * 1024)
                throw new Error("Maksymalny rozmiar pliku to 100 MB.");
              const body = new FormData();
              body.append("version", String(event.version));
              body.append("file", file);
              body.append("description", description);
              onChange(
                await api<EventDetails>(
                  "/events/" + event.uuid + "/attachments",
                  "POST",
                  body,
                ),
              );
            });
          }}
        >
          <Stack gap={2} mt={2}>
            <TextField
              type="file"
              label="Zdjęcie lub film"
              onChange={(e) =>
                setFile((e.target as HTMLInputElement).files?.[0] ?? null)
              }
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: {
                  accept:
                    "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime",
                },
              }}
            />
            <TextField
              label="Opis materiału"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Button type="submit" disabled={action.busy || !file}>
              Dodaj materiał
            </Button>
          </Stack>
        </form>
      )}
      <Feedback error={action.error} success={action.success} />
      <Dialog open={!!remove} onClose={() => setRemove(null)}>
        <DialogTitle>Usunąć załącznik z wydarzenia?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setRemove(null)}>Anuluj</Button>
          <Button
            disabled={action.busy}
            onClick={() =>
              action.run(async () => {
                onChange(
                  await api<EventDetails>(
                    "/events/" + event.uuid + "/attachments/" + remove,
                    "DELETE",
                    { version: event.version },
                  ),
                );
                setRemove(null);
              })
            }
          >
            Potwierdź usunięcie
          </Button>
        </DialogActions>
      </Dialog>
    </Panel>
  );
}
