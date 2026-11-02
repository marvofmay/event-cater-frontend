"use client";

import { useMemo, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { Add, Refresh } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@/app/context/userContext";
import { useRemote } from "@/app/components/catering/api";
import { Panel } from "@/app/components/catering/ui";
import ReportHoursDialog from "./ReportHoursDialog";
import { formatMinutes, monthBounds } from "./formatMinutes";
import type { MyHoursResponse, WorkHoursDay } from "./types";

export default function MyHoursPage() {
  const { loading, isAuthenticated, hasAccess, hasPermission, token, employee } = useUser();
  const router = useRouter();
  const allowed = hasAccess("my_hours") && hasPermission("my_hours.list");
  const canCreate = hasPermission("my_hours.create");
  const bounds = useMemo(() => monthBounds(), []);
  const [from, setFrom] = useState(bounds.from);
  const [to, setTo] = useState(bounds.to);
  const [dialog, setDialog] = useState<{ date: string; plannedMinutes: number } | null>(null);
  const remote = useRemote<MyHoursResponse>(allowed && employee ? `/my-hours?from=${from}&to=${to}` : null);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/login");
    else if (!loading && !allowed) router.replace("/forbidden");
  }, [loading, isAuthenticated, allowed, router]);

  if (loading || !isAuthenticated || !allowed) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress aria-label="Ładowanie" /></Box>;
  }

  if (!employee) {
    return (
      <Panel title="Moje godziny">
        <Alert severity="info">
          To konto nie jest powiązane z kartoteką pracownika. „Moje godziny” są dostępne tylko dla kont pracowników.
          Do podglądu godzin zespołu użyj modułu „Godziny pracowników”.
        </Alert>
      </Panel>
    );
  }

  return (
    <Panel title="Moje godziny">
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={2} alignItems={{ sm: "center" }} flexWrap="wrap">
        <TextField label="Od" type="date" size="small" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField label="Do" type="date" size="small" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        <Button startIcon={<Refresh />} onClick={remote.reload} disabled={remote.loading}>Odśwież</Button>
        {canCreate && <Button startIcon={<Add />} variant="contained" onClick={() => setDialog({ date: "", plannedMinutes: 0 })}>Dodaj godziny</Button>}
      </Stack>
      {remote.error && <Alert severity="error" sx={{ mb: 2 }}>{remote.error}</Alert>}
      {remote.loading && !remote.data ? <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box> : (
        <>
          <Stack direction="row" gap={1} flexWrap="wrap" mb={2}>
            <Chip label={`Zaplanowane: ${formatMinutes(remote.data?.totals.plannedMinutes ?? 0)}`} />
            <Chip color="primary" label={`Zgłoszone: ${formatMinutes(remote.data?.totals.reportedMinutes ?? 0)}`} />
            <Chip color="success" label={`Do rozliczenia: ${formatMinutes(remote.data?.totals.effectiveMinutes ?? 0)}`} />
          </Stack>
          <HoursTable
            key={token ?? "hours"}
            days={remote.data?.days ?? []}
            canCreate={canCreate}
            onReport={(day) => setDialog({ date: day.date, plannedMinutes: day.plannedMinutes })}
          />
        </>
      )}
      {dialog && (
        <ReportHoursDialog
          open
          date={dialog.date}
          plannedMinutes={dialog.plannedMinutes}
          onClose={() => setDialog(null)}
          onSaved={remote.reload}
        />
      )}
    </Panel>
  );
}

function HoursTable({ days, canCreate, onReport }: { days: WorkHoursDay[]; canCreate: boolean; onReport: (day: WorkHoursDay) => void }) {
  if (!days.length) {
    return <Alert severity="info">Brak godzin w wybranym okresie. Możesz dodać wpis ręczny, jeśli pracowałeś poza wydarzeniem.</Alert>;
  }
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Data</TableCell>
            <TableCell>Wydarzenia</TableCell>
            <TableCell align="right">Zaplanowane</TableCell>
            <TableCell align="right">Zgłoszone</TableCell>
            <TableCell>Komentarze</TableCell>
            <TableCell align="right">Akcje</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {days.map((day) => (
            <TableRow key={day.date} hover>
              <TableCell>{new Date(day.date + "T12:00:00").toLocaleDateString("pl-PL")}</TableCell>
              <TableCell>
                {day.events.length === 0 ? <Typography variant="body2" color="text.secondary">Brak wydarzenia</Typography> : (
                  <Stack spacing={0.5}>
                    {day.events.map((event) => (
                      <Typography key={event.assignmentUuid} variant="body2">
                        {event.eventTitle} - {formatMinutes(event.minutes)}
                      </Typography>
                    ))}
                  </Stack>
                )}
              </TableCell>
              <TableCell align="right">{formatMinutes(day.plannedMinutes)}</TableCell>
              <TableCell align="right">
                <Typography component="span" fontWeight={day.reportedMinutes ? 700 : 400}>
                  {formatMinutes(day.effectiveMinutes)}
                </Typography>
                {day.differenceMinutes !== 0 && day.reportedMinutes > 0 && (
                  <Typography variant="caption" display="block" color={day.differenceMinutes > 0 ? "warning.main" : "info.main"}>
                    {day.differenceMinutes > 0 ? "+" : ""}{formatMinutes(day.differenceMinutes)}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                {day.entries.length === 0 ? "-" : day.entries.map((entry) => (
                  <Typography key={entry.uuid} variant="body2" sx={{ mb: 0.5 }}>
                    {formatMinutes(entry.minutes)}: {entry.comment}
                  </Typography>
                ))}
              </TableCell>
              <TableCell align="right">
                {canCreate && (
                  <Button size="small" onClick={() => onReport(day)}>
                    {day.plannedMinutes > 0 ? "Zgłoś czas" : "Dodaj"}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
