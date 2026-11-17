"use client";

import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";

type Option = { value: string; label: string };
type Tenant = { slug: string; name: string };
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
type Filters = { status: string; category: string; tenant: string; query: string };

const statusColor: Record<string, "default" | "info" | "warning" | "success"> = {
    open: "info",
    in_progress: "warning",
    waiting: "warning",
    resolved: "success",
    closed: "default",
};

const headerCellSx = { fontWeight: 700, color: "#10261f", whiteSpace: "nowrap" };

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
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [items, setItems] = useState<Ticket[]>([]);
    const [status, setStatus] = useState("");
    const [category, setCategory] = useState("");
    const [tenant, setTenant] = useState("");
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

    async function refresh(next: Filters) {
        const params = new URLSearchParams();
        if (next.status) params.set("status", next.status);
        if (next.category) params.set("category", next.category);
        if (next.tenant) params.set("tenant", next.tenant);
        if (next.query.trim()) params.set("q", next.query.trim());
        const data = await api<{ items: Ticket[] }>("/tickets" + (params.size ? "?" + params.toString() : ""));
        setItems(data.items ?? []);
    }

    function filters(): Filters {
        return { status, category, tenant, query };
    }

    async function apply(next: Filters) {
        setError("");
        try {
            await refresh(next);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Błąd filtrowania.");
        }
    }

    useEffect(() => {
        let current = true;
        (async () => {
            try {
                const [meta, companyPage] = await Promise.all([
                    api<{ categories: Option[]; statuses: Option[] }>("/meta"),
                    fetch("/api/saas/tenants", { headers: { Authorization: "Bearer " + token }, cache: "no-store" }).then(async (response) => response.ok ? response.json() : { items: [] }),
                ]);
                if (!current) return;
                setCategories(meta.categories ?? []);
                setStatuses(meta.statuses ?? []);
                setTenants((companyPage.items ?? []).filter((item: Tenant) => item.slug && item.name));
                await refresh({ status: "", category: "", tenant: "", query: "" });
            } catch (reason) {
                if (current) setError(reason instanceof Error ? reason.message : "Nie udało się wczytać zgłoszeń.");
            }
        })();
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
            await refresh(filters());
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
            await refresh(filters());
            onChanged();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Nie udało się wysłać odpowiedzi.");
        } finally {
            setBusy(false);
        }
    }

    const columns = ["Firma", "Zgłoszenie", "Autor", "Kategoria", "Status", "Aktualizacja"];
    const countLabel = items.length === 1 ? "1 zgłoszenie" : (items.length % 10 >= 2 && items.length % 10 <= 4 && (items.length % 100 < 12 || items.length % 100 > 14) ? `${items.length} zgłoszenia` : `${items.length} zgłoszeń`);

    return <Stack spacing={2}>
        <Box>
            <Typography variant="h5" component="h2">Zgłoszenia</Typography>
            <Typography color="text.secondary">Wiadomości pomocy ze wszystkich firm. Kliknij wiersz, aby przeczytać wątek, zmienić status i odpowiedzieć.</Typography>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(180px, 1.1fr) minmax(160px, 0.8fr) minmax(180px, 0.9fr) minmax(180px, 1fr) auto" }, gap: 1, alignItems: "start" }}>
            <TextField select label="Firma" value={tenant} onChange={(event) => { const value = event.target.value; setTenant(value); void apply({ ...filters(), tenant: value }); }}>
                <MenuItem value="">Wszystkie firmy</MenuItem>
                {tenants.map((item) => <MenuItem key={item.slug} value={item.slug}>{item.name}</MenuItem>)}
            </TextField>
            <TextField select label="Status" value={status} onChange={(event) => { const value = event.target.value; setStatus(value); void apply({ ...filters(), status: value }); }}>
                <MenuItem value="">Wszystkie</MenuItem>
                {statuses.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
            </TextField>
            <TextField select label="Kategoria" value={category} onChange={(event) => { const value = event.target.value; setCategory(value); void apply({ ...filters(), category: value }); }}>
                <MenuItem value="">Wszystkie</MenuItem>
                {categories.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
            </TextField>
            <TextField label="Szukaj" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void apply(filters()); }} placeholder="Temat, autor, e-mail" inputProps={{ maxLength: 80 }} />
            <Button variant="contained" sx={{ backgroundColor: "#34495e", height: 56 }} onClick={() => void apply(filters())}>Szukaj</Button>
        </Box>
        <Typography variant="body2" color="text.secondary">{items.length === 0 ? "Brak zgłoszeń dla tego filtra." : countLabel}</Typography>
        <Box sx={{ overflowX: "auto", border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
            <Table size="medium">
                <TableHead>
                    <TableRow sx={{ backgroundColor: "rgba(16, 38, 31, 0.04)" }}>
                        {columns.map((label) => <TableCell key={label} sx={headerCellSx}>{label}</TableCell>)}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {items.length === 0 && <TableRow><TableCell colSpan={columns.length}><Typography color="text.secondary" sx={{ py: 2 }}>Żadna firma nie ma zgłoszenia pasującego do filtra.</Typography></TableCell></TableRow>}
                    {items.map((item) => <TableRow
                        key={item.uuid}
                        hover
                        role="button"
                        tabIndex={0}
                        aria-label={`Otwórz zgłoszenie ${item.subject}`}
                        onClick={() => void open(item)}
                        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void open(item); } }}
                        sx={{ cursor: "pointer" }}
                    >
                        <TableCell>
                            <Typography fontWeight={650}>{item.tenantName}</Typography>
                            <Typography variant="caption" color="text.secondary">{item.tenantSlug}</Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 220 }}>
                            <Typography fontWeight={650}>{item.subject}</Typography>
                            {item.preview && <Typography variant="body2" color="text.secondary" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.preview}</Typography>}
                        </TableCell>
                        <TableCell>
                            <Typography>{item.authorName}</Typography>
                            {item.authorEmail && <Typography variant="caption" color="text.secondary">{item.authorEmail}</Typography>}
                        </TableCell>
                        <TableCell>{item.categoryLabel}</TableCell>
                        <TableCell><Chip size="small" label={item.statusLabel} color={statusColor[item.status] ?? "default"} /></TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{warsaw(item.updatedAt)}</TableCell>
                    </TableRow>)}
                </TableBody>
            </Table>
        </Box>
        <Dialog open={!!selected} onClose={() => { if (!busy) setSelected(null); }} fullWidth maxWidth="md">
            <DialogTitle sx={{ backgroundColor: "#10261f", color: "#fff" }}>{selected?.subject}</DialogTitle>
            <DialogContent>
                {selected && <Stack spacing={2} sx={{ pt: 2 }}>
                    <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
                        <Chip size="small" label={selected.tenantName} />
                        <Chip size="small" label={selected.categoryLabel} variant="outlined" />
                        <Typography color="text.secondary">{selected.authorName}{selected.authorEmail ? ` · ${selected.authorEmail}` : ""}</Typography>
                    </Stack>
                    {(selected.messages ?? []).map((entry) => <Box key={entry.uuid} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1, backgroundColor: entry.role === "operator" ? "rgba(16, 38, 31, 0.06)" : "transparent" }}>
                        <Typography variant="caption" color="text.secondary">{entry.role === "operator" ? "Zespół" : "Autor"} · {entry.author} · {warsaw(entry.createdAt)}</Typography>
                        {entry.body && <Typography sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}>{entry.body}</Typography>}
                        <Stack spacing={1} sx={{ mt: entry.attachments?.length ? 1 : 0 }}>{entry.attachments?.map((file) => <Shot key={file.uuid} token={token} ticket={selected.uuid} file={file} />)}</Stack>
                    </Box>)}
                    <TextField select label="Status" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
                        {statuses.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
                    </TextField>
                    <Button variant="outlined" disabled={busy || nextStatus === selected.status} onClick={() => void saveStatus()}>Zapisz status</Button>
                    <TextField label="Odpowiedź dla autora" value={reply} onChange={(event) => setReply(event.target.value)} multiline minRows={3} inputProps={{ maxLength: 8000 }} placeholder="Autor zobaczy tę wiadomość w Pomocy." />
                </Stack>}
            </DialogContent>
            <DialogActions>
                <Button disabled={busy} onClick={() => setSelected(null)}>Zamknij</Button>
                <Button variant="contained" disabled={busy || !reply.trim()} onClick={() => void sendReply()}>Odpowiedz</Button>
            </DialogActions>
        </Dialog>
    </Stack>;
}
