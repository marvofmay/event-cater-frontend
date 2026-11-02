"use client";

import { useEffect, useMemo, useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, CircularProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { ExpandMore, Refresh } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/context/userContext";
import { useRemote } from "@/app/components/catering/api";
import { Panel } from "@/app/components/catering/ui";
import { formatMinutes, monthBounds } from "./formatMinutes";
import type { EmployeeHoursResponse } from "./types";

export default function EmployeeHoursPage() {
  const { loading, isAuthenticated, hasAccess, hasPermission } = useUser();
  const router = useRouter();
  const allowed = hasAccess("employee_hours") && hasPermission("employee_hours.list");
  const bounds = useMemo(() => monthBounds(), []);
  const [from, setFrom] = useState(bounds.from);
  const [to, setTo] = useState(bounds.to);
  const [search, setSearch] = useState("");
  const remote = useRemote<EmployeeHoursResponse>(
    allowed ? `/employee-hours?from=${from}&to=${to}&q=${encodeURIComponent(search.trim())}` : null,
  );

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/login");
    else if (!loading && !allowed) router.replace("/forbidden");
  }, [loading, isAuthenticated, allowed, router]);

  if (loading || !isAuthenticated || !allowed) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress aria-label="Ładowanie" /></Box>;
  }

  return (
    <Panel title="Godziny pracowników">
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={2} alignItems={{ sm: "center" }} flexWrap="wrap">
        <TextField label="Od" type="date" size="small" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField label="Do" type="date" size="small" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField label="Szukaj pracownika" size="small" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button startIcon={<Refresh />} onClick={remote.reload} disabled={remote.loading}>Odśwież</Button>
      </Stack>
      {remote.error && <Alert severity="error" sx={{ mb: 2 }}>{remote.error}</Alert>}
      <Stack direction="row" gap={1} flexWrap="wrap" mb={2}>
        <Chip label={`Zaplanowane: ${formatMinutes(remote.data?.totals.plannedMinutes ?? 0)}`} />
        <Chip color="primary" label={`Zgłoszone: ${formatMinutes(remote.data?.totals.reportedMinutes ?? 0)}`} />
        <Chip color="success" label={`Do rozliczenia: ${formatMinutes(remote.data?.totals.effectiveMinutes ?? 0)}`} />
      </Stack>
      {remote.loading && !remote.data ? <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box> : (
        !(remote.data?.items.length) ? <Alert severity="info">Brak godzin pracowników w wybranym okresie.</Alert> : (
          <Stack spacing={1}>
            {remote.data?.items.map((item) => (
              <Accordion key={item.employeeUuid} disableGutters>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} justifyContent="space-between" width="100%" pr={2}>
                    <Typography fontWeight={600}>{item.employeeName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      zaplanowane {formatMinutes(item.totals.plannedMinutes)} - zgłoszone {formatMinutes(item.totals.reportedMinutes)} - rozliczenie {formatMinutes(item.totals.effectiveMinutes)}
                    </Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Data</TableCell>
                          <TableCell>Wydarzenia</TableCell>
                          <TableCell align="right">Zaplanowane</TableCell>
                          <TableCell align="right">Zgłoszone</TableCell>
                          <TableCell>Komentarze</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {item.days.map((day) => (
                          <TableRow key={day.date}>
                            <TableCell>{new Date(day.date + "T12:00:00").toLocaleDateString("pl-PL")}</TableCell>
                            <TableCell>
                              {day.events.length === 0 ? "-" : day.events.map((event) => (
                                <Typography key={event.assignmentUuid} variant="body2">{event.eventTitle} - {formatMinutes(event.minutes)}</Typography>
                              ))}
                            </TableCell>
                            <TableCell align="right">{formatMinutes(day.plannedMinutes)}</TableCell>
                            <TableCell align="right">{formatMinutes(day.effectiveMinutes)}</TableCell>
                            <TableCell>
                              {day.entries.length === 0 ? "-" : day.entries.map((entry) => (
                                <Typography key={entry.uuid} variant="body2">{formatMinutes(entry.minutes)}: {entry.comment}</Typography>
                              ))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        )
      )}
    </Panel>
  );
}
