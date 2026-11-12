"use client";

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";
import { useEffect, useMemo, useState } from "react";
import {
  alpha,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/context/userContext";
import { localDateTime, useApi } from "./api";
import { EventDetails, EventItem, Page } from "./types";
import { EventForm } from "./EventForm";
import { Feedback, Loading, stateLabels } from "./ui";

const WEEKDAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const BRAND = "#34495e";

function markColor(status: string, info: string, success: string, muted: string) {
  if (["ready", "loaded", "handed_over", "completed"].includes(status)) return success;
  if (status === "cancelled") return muted;
  return info;
}

function iso(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function monthGrid(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function polishDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const formatted = new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(year, month - 1, day));
  return formatted.charAt(0).toLocaleUpperCase("pl") + formatted.slice(1);
}

function countLabel(count: number) {
  if (count === 1) return "1 wydarzenie";
  const last = count % 10;
  const lastTwo = count % 100;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${count} wydarzenia`;
  return `${count} wydarzeń`;
}

function eventTime(event: EventItem) {
  const value = localDateTime(event.startsAt, event.timezone);
  return value ? value.slice(11, 16) : "";
}

export function EventCalendar({
  q,
  status,
  involvement,
  revision,
}: {
  q: string;
  status: string;
  involvement: string;
  revision: number;
}) {
  const api = useApi();
  const router = useRouter();
  const theme = useTheme();
  const { hasPermission } = useUser();
  const info = theme.palette.info.main;
  const success = theme.palette.success.main;
  const muted = theme.palette.text.secondary;
  const compact = useMediaQuery("(max-width:700px)");
  const today = iso(new Date());
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const [items, setItems] = useState<EventItem[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [createDate, setCreateDate] = useState<string | null>(null);
  const [editing, setEditing] = useState<EventDetails | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  const days = useMemo(() => monthGrid(cursor), [cursor]);
  const from = iso(days[0]);
  const to = iso(days[days.length - 1]);
  const rawMonth = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(cursor);
  const monthName = rawMonth.charAt(0).toLocaleUpperCase("pl") + rawMonth.slice(1);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    (async () => {
      const collected: EventItem[] = [];
      let page = 1;
      let total = 0;
      do {
        const params = new URLSearchParams({
          q,
          page: String(page),
          from,
          to,
          ...(status ? { status } : {}),
          ...(involvement === "staff" ? { mine: "1" } : {}),
          ...(involvement === "packing" ? { packing: "1" } : {}),
        });
        const data = await api<Page<EventItem>>("/events?" + params);
        collected.push(...data.items);
        total = data.total;
        page += 1;
        if (data.items.length === 0) break;
      } while (collected.length < total && page <= 20);
      if (!current) return;
      setItems(collected);
      setTruncated(collected.length < total);
    })()
      .catch((reason) => {
        if (current) setError(reason instanceof Error ? reason.message : "Nie udało się wczytać kalendarza.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [api, q, status, involvement, from, to, revision, tick]);

  const byDate = useMemo(() => {
    const grouped = new Map<string, EventItem[]>();
    for (const event of items) {
      const key = event.date.slice(0, 10);
      grouped.set(key, [...(grouped.get(key) ?? []), event]);
    }
    for (const list of grouped.values()) {
      list.sort((left, right) => eventTime(left).localeCompare(eventTime(right)) || left.title.localeCompare(right.title, "pl"));
    }
    return grouped;
  }, [items]);

  const selectedEvents = selected ? byDate.get(selected) ?? [] : [];
  const canCreate = hasPermission("events.create");
  const canUpdate = hasPermission("events.update");

  async function openEdit(uuid: string) {
    setEditLoading(true);
    setEditing(null);
    try {
      setEditing(await api<EventDetails>("/events/" + uuid));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Nie udało się otworzyć wydarzenia.");
    } finally {
      setEditLoading(false);
    }
  }

  return (
    <Stack gap={1.5} sx={{ mb: 8 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Stack direction="row" alignItems="center" gap={0.5}>
          <IconButton aria-label="Poprzedni miesiąc" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography sx={{ minWidth: { xs: 150, sm: 190 }, textAlign: "center", fontWeight: 650, color: "text.primary" }}>
            {monthName}
          </Typography>
          <IconButton aria-label="Następny miesiąc" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRightIcon />
          </IconButton>
        </Stack>
        <Stack direction="row" alignItems="center" gap={1}>
          {loading && <CircularProgress size={16} aria-label="Wczytywanie kalendarza" sx={{ color: BRAND }} />}
          <Button size="small" color="primary" onClick={() => { const now = new Date(); setCursor(now); setSelected(iso(now)); }}>
            Dziś
          </Button>
        </Stack>
      </Stack>
      <Feedback error={error} />
      {truncated && <Typography variant="caption" color="text.secondary">W tym zakresie jest więcej wydarzeń, niż kalendarz może pokazać naraz. Zawęź status albo wyszukiwanie.</Typography>}
      <Box aria-label="Kalendarz wydarzeń" sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden", bgcolor: "background.paper" }}>
        {WEEKDAYS.map((name, index) => (
          <Typography key={name} sx={{ py: 1, textAlign: "center", fontSize: 12, fontWeight: 650, color: index >= 5 ? "text.disabled" : "text.secondary", bgcolor: "grey.50", borderBottom: 1, borderColor: "divider" }}>
            {name}
          </Typography>
        ))}
        {days.map((day, index) => {
          const key = iso(day);
          const events = byDate.get(key) ?? [];
          const inMonth = day.getMonth() === cursor.getMonth();
          const visible = compact ? [] : events.slice(0, 3);
          return (
            <Box
              key={key}
              component="button"
              type="button"
              aria-label={`${polishDate(key)}${events.length ? `, ${countLabel(events.length)}` : ""}`}
              onClick={() => setSelected(key)}
              sx={{
                minHeight: { xs: 64, md: 104 },
                p: { xs: 0.5, md: 0.75 },
                m: 0,
                width: "100%",
                font: "inherit",
                color: "inherit",
                textAlign: "left",
                appearance: "none",
                border: 0,
                borderTop: index >= 7 ? 1 : 0,
                borderRight: index % 7 === 6 ? 0 : 1,
                borderColor: "divider",
                bgcolor: selected === key ? alpha(theme.palette.primary.main, 0.08) : inMonth ? "background.paper" : "grey.50",
                cursor: "pointer",
                "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.06) },
              }}
            >
              <Box sx={{ width: 26, height: 26, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 650, color: key === today ? "#fff" : inMonth ? "text.primary" : "text.disabled", bgcolor: key === today ? BRAND : "transparent" }}>
                {day.getDate()}
              </Box>
              <Stack gap={0.4} mt={0.4}>
                {visible.map((event) => {
                  const color = markColor(event.status, info, success, muted);
                  return (
                    <Box key={event.uuid} sx={{ px: 0.6, py: 0.15, borderRadius: 0.75, bgcolor: alpha(color, 0.12), color, fontSize: 11, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {eventTime(event) ? `${eventTime(event)} ` : ""}{event.title}
                    </Box>
                  );
                })}
                {!compact && events.length > 3 && <Typography sx={{ fontSize: 11, color: "text.secondary" }}>jeszcze {events.length - 3}</Typography>}
                {compact && events.length > 0 && (
                  <Stack direction="row" gap={0.4} justifyContent="center">
                    {events.slice(0, 4).map((event) => <Box key={event.uuid} sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: markColor(event.status, info, success, muted) }} />)}
                  </Stack>
                )}
              </Stack>
            </Box>
          );
        })}
      </Box>

      <Dialog open={Boolean(selected) && !createDate && !editing && !editLoading} onClose={() => setSelected(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>{selected ? polishDate(selected) : ""}</DialogTitle>
        <DialogContent>
          <Stack gap={1} sx={{ pt: 0.5 }}>
            {selectedEvents.length === 0 && <Typography color="text.secondary">Brak wydarzeń tego dnia.</Typography>}
            {selectedEvents.map((event) => (
              <Stack key={event.uuid} direction={{ xs: "column", sm: "row" }} gap={1} alignItems={{ sm: "center" }} justifyContent="space-between" sx={{ p: 1.25, border: 1, borderColor: "divider", borderRadius: 1.5 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography fontWeight={650}>{eventTime(event) ? `${eventTime(event)} · ` : ""}{event.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{stateLabels[event.status] ?? event.status}{event.guestCount ? ` · ${event.guestCount} gości` : ""}</Typography>
                </Box>
                <Stack direction="row" gap={1}>
                  <Button size="small" color="primary" onClick={() => router.push("/catering/events/" + event.uuid)}>Otwórz</Button>
                  {canUpdate && <Button size="small" color="primary" onClick={() => void openEdit(event.uuid)}>Edytuj</Button>}
                </Stack>
              </Stack>
            ))}
            {canCreate && selected && (
              <Button startIcon={<AddIcon />} variant="contained" color="success" onClick={() => setCreateDate(selected)} sx={{ alignSelf: "flex-start", mt: 1 }}>
                Dodaj wydarzenie
              </Button>
            )}
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createDate || !!editing || editLoading} onClose={() => { setCreateDate(null); setEditing(null); setEditLoading(false); }} fullWidth maxWidth="lg">
        <DialogTitle sx={{ backgroundColor: BRAND, color: "white", fontSize: "1.2rem", fontWeight: "bold" }}>{editing ? "Edycja wydarzenia" : "Planowanie wydarzenia"}</DialogTitle>
        <DialogContent>
          {editLoading && <Loading />}
          {createDate && (
            <EventForm
              key={createDate}
              defaultDate={createDate}
              onSaved={() => { setCreateDate(null); setTick((value) => value + 1); }}
            />
          )}
          {editing && (
            <EventForm
              key={editing.uuid + ":" + editing.version}
              initial={editing}
              onSaved={() => { setEditing(null); setTick((value) => value + 1); }}
            />
          )}
          <Button variant="contained" color="primary" onClick={() => { setCreateDate(null); setEditing(null); }}>Zamknij formularz</Button>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
