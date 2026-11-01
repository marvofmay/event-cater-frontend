"use client";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import { useState } from "react";
import { useRemote } from "./api";
import { AuditEntry, Page } from "./types";
import { Panel, Feedback, Loading, Pager, stateLabels } from "./ui";

const actions: Record<string, string> = {
  created: "Utworzono", details_replaced: "Zmieniono dane wydarzenia", details_updated: "Zmieniono dane wydarzenia",
  menu_replaced: "Zmieniono menu", contacts_replaced: "Zmieniono kontakty", status_changed: "Zmieniono status wydarzenia",
  venue_applied: "Wczytano miejsce z bazy", staff_assigned: "Przypisano lub zmieniono pracownika", staff_removed: "Usunięto pracownika z obsługi",
  equipment_set: "Dodano lub zmieniono sprzęt", equipment_removed: "Usunięto sprzęt", media_attached: "Dodano załącznik", media_removed: "Usunięto załącznik",
  preparation_configured: "Zmieniono osobę kompletującą lub termin", preparation_line_configured: "Zmieniono pozycję listy kompletacji",
  preparation_consumable_set: "Dodano lub zmieniono materiał", preparation_consumable_removed: "Usunięto materiał",
  preparation_template_applied: "Dodano pozycje z szablonu", preparation_approved: "Zatwierdzono listę kompletacji",
  preparation_started: "Rozpoczęto kompletowanie", preparation_ready: "Potwierdzono gotowość listy", preparation_load_confirmed: "Potwierdzono załadunek",
  preparation_progress_recorded: "Zapisano postęp kompletowania", draft_updated: "Zmieniono szkic karty kuchennej",
  revision_proposed: "Zgłoszono zmianę dla kuchni", revision_accepted: "Kuchnia zaakceptowała zmianę", revision_rejected: "Kuchnia odrzuciła zmianę",
  progress_recorded: "Zapisano wykonanie w kuchni", release: "Wydano kartę do kuchni", start: "Rozpoczęto przygotowanie w kuchni",
  ready: "Potwierdzono gotowość w kuchni", "hand-over": "Potwierdzono przekazanie", cancel: "Anulowano kartę",
};
const labels: Record<string, string> = {
  title: "Nazwa", description: "Opis", date: "Data wydarzenia", timezone: "Strefa czasowa", readyAt: "Gotowość na", startsAt: "Rozpoczęcie", endsAt: "Zakończenie",
  location: "Miejsce", venue: "Obiekt", street: "Ulica", city: "Miasto", postalCode: "Kod pocztowy", instructions: "Instrukcje",
  guestCount: "Liczba gości", coordinatorUuid: "Koordynator", customerName: "Klient", contacts: "Kontakty", menu: "Menu",
  name: "Nazwa", employeeName: "Pracownik", functions: "Funkcje", notes: "Uwagi", quantity: "Ilość", unit: "Jednostka", code: "Kod",
  responsibleName: "Osoba kompletująca", deadlineAt: "Termin kompletacji", sourceLocation: "Skąd pobrać", requiredQuantity: "Do zabrania",
  preparedQuantity: "Przygotowano", loadedQuantity: "Załadowano", preparedPortions: "Przygotowane porcje", handedOverPortions: "Przekazane porcje",
  phone: "Telefon", email: "E-mail", role: "Rola", portions: "Porcje", dishName: "Potrawa", label: "Nazwa", fullName: "Imię i nazwisko",
  function: "Funkcja", section: "Sekcja menu", portionSize: "Wielkość porcji", servingStyle: "Sposób podania", diets: "Diety", allergens: "Alergeny", planningNotes: "Uwagi do planowania",
};
type Data = Record<string, unknown>;
const record = (value: unknown): Data => value && typeof value === "object" && !Array.isArray(value) ? value as Data : {};
function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pl-PL", { timeZone: "Europe/Warsaw", dateStyle: "medium", timeStyle: "short" });
}
function valueText(value: unknown, field?: string): string {
  if (value === null || value === undefined || value === "") return "Nie ustawiono";
  if (Array.isArray(value)) return value.length ? value.map(item => valueText(item)).join("\n") : "Brak pozycji";
  if (typeof value === "object") {
    const parts = Object.entries(record(value)).filter(([key, item]) => labels[key] && item !== null && item !== "");
    return parts.length ? parts.map(([key, item]) => `${labels[key]}: ${valueText(item, key)}`).join(" · ") : "Zapisano dane";
  }
  if (typeof value === "boolean") return value ? "Tak" : "Nie";
  if (typeof value === "string" && /At$/.test(field ?? "")) return formatDate(value);
  return stateLabels[String(value)] ?? String(value);
}
function changesFor(data: Data): [string, Data][] {
  if (Object.keys(record(data.changes)).length) return Object.entries(record(data.changes)).map(([field, change]) => [field, record(change)]);
  const before = record(data.before), after = record(data.after);
  return Object.keys(after).filter(field => labels[field] && JSON.stringify(before[field]) !== JSON.stringify(after[field])).map(field => [field, { before: before[field], after: after[field] }]);
}
function EntryDetails({ entry }: { entry: AuditEntry }) {
  const data = record(entry.details);
  const changes = changesFor(data);
  const snapshot = { ...data, ...record(data.line) };
  const fields = changes.length ? [] : Object.keys(labels).filter(field => field !== "coordinatorUuid" && snapshot[field] !== undefined && snapshot[field] !== null && snapshot[field] !== "");
  return <Stack gap={1.25}>
    {changes.length > 0 && typeof record(data.line).name === "string" && <Typography variant="body2" fontWeight={600}>{String(record(data.line).name)}</Typography>}
    {Array.isArray(data.appliedLines) && <Typography variant="body2">Liczba dodanych pozycji: {data.appliedLines.length}</Typography>}
    {!changes.length && ["employeeName", "name", "title", "responsibleName", "quantity", "requiredQuantity", "sourceLocation"].filter(field => snapshot[field] !== undefined && snapshot[field] !== null && snapshot[field] !== "").map(field => <Typography key={field} variant="body2" sx={{ overflowWrap: "anywhere" }}><Box component="span" color="text.secondary">{labels[field]}: </Box>{valueText(snapshot[field], field)}</Typography>)}
    {typeof data.to === "string" && <Typography variant="body2">Status: {valueText(data.from)} → <strong>{valueText(data.to)}</strong></Typography>}
    {changes.map(([field, change]) => <Box key={field} sx={{ bgcolor: "action.hover", p: 1.25, borderRadius: 1.5 }}>
      <Typography variant="body2" fontWeight={600}>{labels[field] ?? "Dane"}</Typography>
      {field === "coordinatorUuid" ? <Typography variant="body2">Zmieniono przypisanie koordynatora.</Typography> : <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1, mt: .5 }}>
        <Box><Typography variant="caption" color="text.secondary">Przed zmianą</Typography><Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{valueText(change.before, field)}</Typography></Box>
        <Box><Typography variant="caption" color="text.secondary">Po zmianie</Typography><Typography variant="body2" fontWeight={500} sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{valueText(change.after, field)}</Typography></Box>
      </Box>}
    </Box>)}
    {fields.length > 0 && <Box component="details" sx={{ "& summary": { cursor: "pointer", color: "primary.main", fontSize: ".875rem" } }}><summary>Pokaż zapisane dane</summary><Stack gap={.75} mt={1}>{fields.map(field => <Typography key={field} variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}><Box component="span" color="text.secondary">{labels[field]}: </Box>{valueText(snapshot[field], field)}</Typography>)}</Stack></Box>}
    {data.beforeLocation !== undefined && <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>Miejsce: {valueText(data.beforeLocation)} → {valueText(data.afterLocation)}</Typography>}
    {["reason", "correctionReason", "acceptedShortagesReason"].map(field => typeof data[field] === "string" && data[field] ? <Typography key={field} variant="body2" sx={{ borderLeft: 3, borderColor: "warning.main", pl: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{field === "correctionReason" ? "Powód korekty" : "Uzasadnienie"}: {String(data[field])}</Typography> : null)}
  </Stack>;
}
export function HistoryPanel({ path }: { path: string }) {
  const [page, setPage] = useState(1);
  const remote = useRemote<Page<AuditEntry>>(path + "?page=" + page);
  return <Panel title="Historia zmian">
    <Typography variant="body2" color="text.secondary" mb={2}>Najnowsze zmiany są na górze. Daty i godziny podano w czasie polskim.</Typography>
    <Feedback error={remote.error} />
    {remote.loading && <Loading />}
    {!remote.loading && remote.data?.items.length === 0 && <Typography color="text.secondary">Brak wpisów w historii.</Typography>}
    <Stack component="ol" gap={2} sx={{ listStyle: "none", p: 0, m: 0 }}>
      {remote.data?.items.map(entry => <Box component="li" key={entry.uuid} sx={{ display: "flex", gap: { xs: 1, sm: 2 }, minWidth: 0 }}>
        <Box sx={{ display: { xs: "none", sm: "flex" }, flexDirection: "column", alignItems: "center", color: "primary.main", pt: 2 }}><HistoryIcon fontSize="small" /><Box sx={{ width: 2, flex: 1, mt: 1, bgcolor: "divider" }} /></Box>
        <Paper variant="outlined" sx={{ flex: 1, minWidth: 0, p: { xs: 1.5, sm: 2 }, borderRadius: 2 }}>
          <Stack direction="row" gap={1} alignItems="flex-start" justifyContent="space-between" mb={.5}>
            <Typography component="h3" variant="subtitle2" fontWeight={700}>{actions[entry.action] ?? "Zaktualizowano dane"}</Typography>
            {(entry.revision ?? entry.orderVersion) !== undefined && <Chip size="small" label={`Wersja ${entry.revision ?? entry.orderVersion}`} sx={{ flexShrink: 0 }} />}
          </Stack>
          <Typography variant="caption" color="text.secondary" component="p" mb={1.5}><Box component="time" dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</Box>{" · "}{entry.actorName ?? "Użytkownik niedostępny"}</Typography>
          <EntryDetails entry={entry} />
        </Paper>
      </Box>)}
    </Stack>
    {remote.data && <Pager page={page} total={remote.data.total} onChange={setPage} />}
  </Panel>;
}
