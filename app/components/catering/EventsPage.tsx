"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Typography,
} from "@mui/material";
import { useUser } from "@/app/context/userContext";
import { useRemote } from "./api";
import { EventItem, Page } from "./types";
import {
  Feedback,
  FieldSelect,
  Loading,
  Pager,
  Panel,
  Permission,
  Status,
  stateLabels,
} from "./ui";
import { EventForm } from "./EventForm";
export function EventsPage() {
  const { hasPermission } = useUser();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [create, setCreate] = useState(false);
  const params = new URLSearchParams({
    q,
    page: String(page),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(status ? { status } : {}),
  });
  const remote = useRemote<Page<EventItem>>(
    hasPermission("events.list") ? "/events?" + params : null,
  );
  return (
    <Permission name="events.list">
      <Panel title="Wydarzenia">
        <Stack direction="row" gap={2} flexWrap="wrap" mb={2}>
          <TextField
            size="small"
            label="Szukaj wydarzenia"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
          <TextField
            size="small"
            label="Od dnia"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            size="small"
            label="Do dnia"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FieldSelect
            label="Status"
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={{
              "": "Wszystkie",
              ...Object.fromEntries(
                [
                  "draft",
                  "planned",
                  "confirmed",
                  "in_progress",
                  "completed",
                  "cancelled",
                ].map((key) => [key, stateLabels[key]]),
              ),
            }}
          />
          {hasPermission("events.create") && (
            <Button variant="contained" onClick={() => setCreate(true)}>
              Dodaj wydarzenie
            </Button>
          )}
          <Button onClick={remote.reload}>Odśwież</Button>
        </Stack>
        <Feedback error={remote.error} />
        {remote.loading && <Loading />}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Wydarzenie</TableCell>
                <TableCell>Goście</TableCell>
                <TableCell>Status</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {remote.data?.items.map((event) => (
                <TableRow key={event.uuid}>
                  <TableCell>{event.date}</TableCell>
                  <TableCell>
                    <Typography fontWeight={600}>{event.title}</Typography>
                    <Typography variant="caption">{event.number}</Typography>
                  </TableCell>
                  <TableCell>{event.guestCount ?? "—"}</TableCell>
                  <TableCell>
                    <Status value={event.status} />
                  </TableCell>
                  <TableCell>
                    {hasPermission("events.view") && (
                      <Button
                        component={Link}
                        href={"/catering/events/" + event.uuid}
                      >
                        Otwórz wydarzenie
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {remote.data?.total === 0 && (
          <Typography sx={{ p: 2 }}>
            Brak wydarzeń dla wybranych filtrów.
          </Typography>
        )}
        {remote.data && (
          <Pager page={page} total={remote.data.total} onChange={setPage} />
        )}
        <Dialog
          open={create}
          onClose={() => setCreate(false)}
          fullWidth
          maxWidth="lg"
        >
          <DialogTitle>Planowanie wydarzenia</DialogTitle>
          <DialogContent>
            <EventForm
              onSaved={(event) => router.push("/catering/events/" + event.uuid)}
            />
            <Button onClick={() => setCreate(false)}>Zamknij formularz</Button>
          </DialogContent>
        </Dialog>
      </Panel>
    </Permission>
  );
}
