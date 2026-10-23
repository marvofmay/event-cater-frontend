"use client";
import { Typography, Stack } from "@mui/material";
import { useState } from "react";
import { useRemote } from "./api";
import { AuditEntry, Page } from "./types";
import { Panel, Feedback, Loading, Pager, stateLabels } from "./ui";
const actions: Record<string, string> = {
  created: "Utworzenie",
  draft_updated: "Zmiana szkicu",
  revision_proposed: "Zgłoszenie zmiany",
  revision_accepted: "Akceptacja zmiany przez kuchnię",
  revision_rejected: "Odrzucenie zmiany",
  progress_recorded: "Zapis wykonania",
  release: "Wydanie karty",
  start: "Rozpoczęcie przygotowania",
  ready: "Potwierdzenie gotowości",
  "hand-over": "Potwierdzenie przekazania",
  cancel: "Anulowanie",
  venue_applied: "Wczytanie miejsca z bazy",
  menu_replaced: "Zmiana menu",
  details_updated: "Zmiana danych wydarzenia",
  status_changed: "Zmiana statusu",
  contacts_replaced: "Zmiana kontaktów",
};
export function HistoryPanel({ path }: { path: string }) {
  const [page, setPage] = useState(1);
  const remote = useRemote<Page<AuditEntry>>(path + "?page=" + page);
  return (
    <Panel title="Historia zmian">
      <Feedback error={remote.error} />
      {remote.loading && <Loading />}
      <Stack gap={2}>
        {remote.data?.items.map((entry) => {
          const d =
            entry.details && typeof entry.details === "object"
              ? (entry.details as Record<string, unknown>)
              : {};
          return (
            <Stack key={entry.uuid}>
              <Typography fontWeight={600}>
                {actions[entry.action] ?? "Aktualizacja danych"} ·{" "}
                {new Date(entry.createdAt).toLocaleString("pl-PL")}
              </Typography>
              {typeof d.reason === "string" && (
                <Typography>{d.reason}</Typography>
              )}
              {typeof d.correctionReason === "string" && (
                <Typography>Korekta: {d.correctionReason}</Typography>
              )}
              {typeof d.to === "string" && (
                <Typography>Status: {stateLabels[d.to] ?? d.to}</Typography>
              )}
            </Stack>
          );
        })}
      </Stack>
      {remote.data && (
        <Pager page={page} total={remote.data.total} onChange={setPage} />
      )}
    </Panel>
  );
}
