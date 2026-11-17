"use client";

import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";

type Option = { value: string; label: string };
type Attachment = { uuid: string; name: string };
type Message = { uuid: string; role: string; author: string; body: string; createdAt: string; attachments: Attachment[] };
type Ticket = {
    uuid: string;
    category: string;
    categoryLabel: string;
    subject: string;
    status: string;
    statusLabel: string;
    tenantName: string;
    tenantSlug: string;
    authorName: string;
    authorEmail: string;
    updatedAt: string;
    preview?: string;
    messages?: Message[];
};

const statusColor: Record<string, "default" | "info" | "warning" | "success"> = {
    open: "info",
    in_progress: "warning",
    waiting: "warning",
    resolved: "success",
    closed: "default",
};

function warsaw(value?: string) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", dateStyle: "short", timeStyle: "short" }).format(date);
}

function Shot({ token, ticket, file }: { token: string; ticket: string; file: Attachment }) {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        let current = true;
        let objectUrl = "";
        fetch(`/api/saas/support/tickets/${ticket}/attachments/${file.uuid}`, { headers: { Authorization: "Bearer " + token }, cache: "no-store" })
            .then((response) => (response.ok ? response.blob() : Promise.reject()))
            .then((blob) => {
                objectUrl = URL.createObjectURL(blob);
                if (current) setUrl(objectUrl);
            })
            .catch(() => undefined);
        return () => {
            current = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [token, ticket, file.uuid]);
    if (!url) return <Typography variant="caption">{file.name}</Typography>;
    return <Box component="a" href={url} target="_blank" rel="noreferrer"><Box component="img" alt={file.name} src={url} sx={{ maxWidth: "100%", maxHeight: 280, borderRadius: 1 }} /></Box>;
}

export default function SupportInbox({ token, onChanged }: { token: string; onChanged: () => void }) {
    const [categories, setCategories] = useState<Option[]>([]);
    const [statuses, setStatuses] = useState<Option[]>([]);
    const [items, setItems] = useState<Ticket[]>([]);
    const [status, setStatus] = useState("");
    const [category, setCategory] = useState("");
    const [query, setQuery] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [selected, setSelected] = useState<Ticket | null>(null);
    const [nextStatus, setNextStatus] = useState("open");
    const [reply, setReply] = useState("");

    async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
        const response = await fetch("/api/saas/support" + path, {
            method,
            cache: "no-store",
            headers: { Authorization: "Bearer " + token, ...(body ? { "Content-Type": "application/json" } : {}) },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.message || "Operacja nie powiodła się.");
        return data as T;
    }

    async function refresh(next = { status, category, query }) {
        const params = new URLSearchParams();
        if (next.status) params.set("status", next.status);
        if (next.category) params.set("category", next.category);
        if (next.query.trim()) params.set("q", next.query.trim());
        const data = await api<{ items: Ticket[] }>("/tickets" + (params.size ? "?" + params.toString() : ""));
        setItems(data.items ?? []);
    }

    useEffect(() => {
        let current = true;
        Promise.all([api<{ categories: Option[]; statuses: Option[] }>("/meta"), refresh()])
            .then(([meta]) => {
                if (!current) return;
                setCategories(meta.categories ?? []);
                setStatuses(meta.statuses ?? []);
            })
            .catch((reason) => { if (current) setError(reason instanceof Error ? reason.message : "Nie udało się wczytać zgłoszeń."); });
        return () => { current = false; };
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    async function open(ticket: Ticket) {
        setError("");
        try {
            const detail = await api<Ticket>("/tickets/" + ticket.uuid);
            setSelected(detail);
            setNextStatus(detail.status);
            setReply("");
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Nie udało się otworzyć zgłoszenia.");
        }
    }

    async function saveStatus() {
        if (!selected) return;
        setBusy(true);
        setError("");
        try {
            const updated = await api<Ticket>("/tickets/" + selected.uuid + "/status", "PATCH", { status: nextStatus });
            setSelected(updated);
            await refresh();
            onChanged();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Nie udało się zapisać statusu.");
        } finally {
            setBusy(false);
        }
    }

    async function sendReply() {
        if (!selected || !reply.trim()) return;
        setBusy(true);
        setError("");
        try {
            const updated = await api<Ticket>("/tickets/" + selected.uuid + "/replies", "POST", { message: reply.trim(), status: nextStatus });
            setSelected(updated);
            setReply("");
            await refresh();
            onChanged();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Nie udało się wysłać odpowiedzi.");
        } finally {
            setBusy(false);
        }
    }

    return <Stack spacing={2}>
        <Typography variant="h5" component="h2">Zgłoszenia</Typography>
        <Typography color="text.secondary">Wiadomości pomocy ze wszystkich firm. Odczyt, status i odpowiedź zostają w wątku autora.</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField select label="Status" value={status} onChange={(event) => setStatus(event.target.value)} sx={{ minWidth: 180 }}>
                <MenuItem value="">Wszystkie</MenuItem>
                {statuses.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
            </TextField>
            <TextField select label="Kategoria" value={category} onChange={(event) => setCategory(event.target.value)} sx={{ minWidth: 200 }}>
                <MenuItem value="">Wszystkie</MenuItem>
                {categories.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
            </TextField>
            <TextField label="Szukaj" value={query} onChange={(event) => setQuery(event.target.value)} inputProps={{ maxLength: 80 }} sx={{ flex: 1 }} />
            <Button variant="contained" sx={{ backgroundColor: "#34495e" }} onClick={() => void refresh().catch((reason) => setError(reason instanceof Error ? reason.message : "Błąd filtrowania."))}>Filtruj</Button>
        </Stack>
        {items.length === 0 && <Typography color="text.secondary">Brak zgłoszeń dla tego filtra.</Typography>}
        <Stack spacing={1}>
            {items.map((item) => <Box key={item.uuid} component="button" type="button" onClick={() => void open(item)} aria-label={`Otwórz zgłoszenie ${item.subject}`} sx={{ textAlign: "left", p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1, background: "transparent", cursor: "pointer" }}>
                <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center" }}>
                    <Typography fontWeight={650}>{item.subject}</Typography>
                    <Chip size="small" label={item.statusLabel} color={statusColor[item.status] ?? "default"} />
                </Stack>
                <Typography variant="body2" color="text.secondary">{item.tenantName} ({item.tenantSlug}) · {item.authorName} · {item.categoryLabel} · {warsaw(item.updatedAt)}</Typography>
                {item.preview && <Typography variant="body2" sx={{ mt: 0.5 }}>{item.preview}</Typography>}
            </Box>)}
        </Stack>
        <Dialog open={!!selected} onClose={() => { if (!busy) setSelected(null); }} fullWidth maxWidth="md">
            <DialogTitle sx={{ backgroundColor: "#10261f", color: "#fff" }}>{selected?.subject}</DialogTitle>
            <DialogContent>
                {selected && <Stack spacing={2} sx={{ pt: 2 }}>
                    <Typography color="text.secondary">{selected.tenantName} · {selected.authorName}{selected.authorEmail ? ` · ${selected.authorEmail}` : ""}</Typography>
                    {(selected.messages ?? []).map((entry) => <Box key={entry.uuid} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1, backgroundColor: entry.role === "operator" ? "rgba(16, 38, 31, 0.06)" : "transparent" }}>
                        <Typography variant="caption" color="text.secondary">{entry.author} · {warsaw(entry.createdAt)}</Typography>
                        {entry.body && <Typography sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}>{entry.body}</Typography>}
                        <Stack spacing={1} sx={{ mt: entry.attachments?.length ? 1 : 0 }}>{entry.attachments?.map((file) => <Shot key={file.uuid} token={token} ticket={selected.uuid} file={file} />)}</Stack>
                    </Box>)}
                    <TextField select label="Status" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
                        {statuses.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
                    </TextField>
                    <Button variant="outlined" disabled={busy || nextStatus === selected.status} onClick={() => void saveStatus()}>Zapisz status</Button>
                    <TextField label="Odpowiedź" value={reply} onChange={(event) => setReply(event.target.value)} multiline minRows={3} inputProps={{ maxLength: 8000 }} />
                </Stack>}
            </DialogContent>
            <DialogActions>
                <Button disabled={busy} onClick={() => setSelected(null)}>Zamknij</Button>
                <Button variant="contained" disabled={busy || !reply.trim()} onClick={() => void sendReply()}>Odpowiedz</Button>
            </DialogActions>
        </Dialog>
    </Stack>;
}
