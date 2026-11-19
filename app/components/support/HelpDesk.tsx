"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useUser } from "@/app/context/userContext";
import { useAction, useApi } from "@/app/components/catering/api";

type Option = { value: string; label: string };
type Attachment = { uuid: string; name: string; mime: string; size: number };
type Message = { uuid: string; role: string; author: string; body: string; createdAt: string; attachments: Attachment[] };
type Ticket = {
    uuid: string;
    category: string;
    categoryLabel: string;
    subject: string;
    status: string;
    statusLabel: string;
    createdAt: string;
    updatedAt: string;
    preview?: string;
    attachmentCount?: number;
    messages?: Message[];
};

const fallbackCategories: Option[] = [
    { value: "system_error", label: "Błąd systemu" },
    { value: "billing", label: "Opłaty" },
    { value: "account", label: "Konto i dostęp" },
    { value: "data", label: "Dane i import" },
    { value: "feature", label: "Propozycja funkcji" },
    { value: "question", label: "Pytanie" },
    { value: "other", label: "Inne" },
];

const fallbackStatuses: Option[] = [
    { value: "open", label: "Nowe" },
    { value: "in_progress", label: "W trakcie" },
    { value: "waiting", label: "Oczekuje na użytkownika" },
    { value: "resolved", label: "Rozwiązane" },
    { value: "closed", label: "Zamknięte" },
];

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

function PrivateImage({ path, token, name }: { path: string; token: string; name: string }) {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        let current = true;
        let objectUrl = "";
        fetch("/api" + path, { headers: { Authorization: "Bearer " + token }, cache: "no-store" })
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
    }, [path, token]);
    if (!url) return <Typography variant="caption">{name}</Typography>;
    return <Box component="a" href={url} target="_blank" rel="noreferrer"><Box component="img" alt={name} src={url} sx={{ display: "block", maxWidth: "100%", maxHeight: 240, borderRadius: 1, border: "1px solid", borderColor: "divider" }} /></Box>;
}

export default function HelpDesk() {
    const api = useApi();
    const { token } = useUser();
    const { busy, error, run } = useAction();
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
    const [categories, setCategories] = useState<Option[]>(fallbackCategories);
    const [statuses, setStatuses] = useState<Option[]>(fallbackStatuses);
    const [items, setItems] = useState<Ticket[]>([]);
    const [loadError, setLoadError] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [creating, setCreating] = useState(false);
    const [category, setCategory] = useState("system_error");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [formError, setFormError] = useState("");
    const [sentSubject, setSentSubject] = useState("");
    const [selected, setSelected] = useState<Ticket | null>(null);
    const [reply, setReply] = useState("");

    const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
    useEffect(() => () => { previews.forEach((item) => URL.revokeObjectURL(item.url)); }, [previews]);

    async function load() {
        const [meta, list] = await Promise.all([
            api<{ categories: Option[]; statuses?: Option[] }>("/support/meta"),
            api<{ items: Ticket[] }>("/support/tickets"),
        ]);
        if (meta.categories?.length) setCategories(meta.categories);
        if (meta.statuses?.length) setStatuses(meta.statuses);
        setItems(list.items ?? []);
    }

    useEffect(() => {
        if (!token) return;
        let current = true;
        load()
            .catch((reason) => { if (current) setLoadError(reason instanceof Error ? reason.message : "Nie udało się wczytać zgłoszeń."); })
            .finally(() => undefined);
        return () => { current = false; };
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    function addFiles(list: FileList | null) {
        if (!list) return;
        const next = [...files];
        for (const file of Array.from(list)) {
            if (next.length >= 5) break;
            const extension = file.name.split(".").pop()?.toLowerCase();
            if (!extension || !["png", "jpg", "jpeg", "webp"].includes(extension)) {
                setFormError("Dozwolone załączniki: PNG, JPG, JPEG i WebP.");
                continue;
            }
            next.push(file);
        }
        if (next.length > 5) setFormError("Można dodać najwyżej 5 załączników.");
        setFiles(next.slice(0, 5));
    }

    async function submit(event: FormEvent) {
        event.preventDefault();
        setFormError("");
        if (subject.trim().length < 3) {
            setFormError("Temat jest wymagany i może mieć od 3 do 160 znaków.");
            return;
        }
        if (!message.trim() && files.length === 0) {
            setFormError("Wpisz wiadomość albo dodaj zrzut ekranu.");
            return;
        }
        const body = new FormData();
        body.set("category", category);
        body.set("subject", subject.trim());
        body.set("message", message.trim());
        files.forEach((file) => body.append("attachments[]", file));
        const sent = subject.trim();
        const ok = await run(async () => {
            await api<{ uuid: string }>("/support/tickets", "POST", body);
            setSubject("");
            setMessage("");
            setFiles([]);
            setSentSubject(sent);
            setCreating(false);
            setPage(0);
            await load();
        }, "Zgłoszenie zostało wysłane.");
        if (!ok) setFormError("");
    }

    async function sendReply() {
        if (!selected || !reply.trim()) return;
        const ok = await run(async () => {
            const updated = await api<Ticket>("/support/tickets/" + selected.uuid + "/replies", "POST", { message: reply.trim() });
            setSelected(updated);
            setReply("");
            await load();
        }, "Wiadomość została dodana.");
        if (!ok) return;
    }

    const needle = query.trim().toLowerCase();
    const filtered = items.filter((item) => {
        if (statusFilter && item.status !== statusFilter) return false;
        if (!needle) return true;
        return [item.subject, item.categoryLabel, item.statusLabel, item.preview]
            .some((value) => (value ?? "").toLowerCase().includes(needle));
    });
    const pageStart = page * rowsPerPage;
    const visible = filtered.slice(pageStart, pageStart + rowsPerPage);
    const columns = ["Temat", "Kategoria", "Status", "Aktualizacja"];

    return <Stack spacing={3} sx={{ maxWidth: 1100 }}>
        <Box>
            <Typography variant="h4" component="h1">Pomoc</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>Opisz problem. Zgłoszenie trafi do zespołu EventCater, a odpowiedź zobaczysz w tym samym wątku.</Typography>
        </Box>
        {loadError && <Alert severity="error">{loadError}</Alert>}
        {sentSubject && <Alert severity="success" onClose={() => setSentSubject("")}>Zgłoszenie „{sentSubject}” jest na liście poniżej. Odpowiedź zespołu pojawi się w tym wątku.</Alert>}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
            <Typography variant="h6" component="h2">Moje zgłoszenia</Typography>
            <Button variant="contained" sx={{ alignSelf: { xs: "flex-end", sm: "center" } }} onClick={() => { setFormError(""); setCreating(true); }}>Utwórz zgłoszenie</Button>
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField select size="small" label="Status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(0); }} sx={{ minWidth: 240 }}>
                <MenuItem value="">Wszystkie</MenuItem>
                {statuses.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Szukaj" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Temat, kategoria lub status" inputProps={{ maxLength: 80 }} sx={{ minWidth: 260, flex: 1 }} />
        </Stack>
        <TableContainer sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
            <Table size="medium">
                <TableHead>
                    <TableRow>
                        {columns.map((label) => <TableCell key={label} sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>{label}</TableCell>)}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {visible.length === 0 && <TableRow><TableCell colSpan={columns.length}><Typography color="text.secondary" sx={{ py: 2 }}>{items.length === 0 ? "Nie masz jeszcze zgłoszeń." : "Brak zgłoszeń dla tego filtra."}</Typography></TableCell></TableRow>}
                    {visible.map((item) => <TableRow
                        key={item.uuid}
                        hover
                        role="button"
                        tabIndex={0}
                        aria-label={`Otwórz zgłoszenie ${item.subject}`}
                        onClick={async () => { setReply(""); setSelected(await api<Ticket>("/support/tickets/" + item.uuid).catch(() => item)); }}
                        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setReply(""); void api<Ticket>("/support/tickets/" + item.uuid).then(setSelected).catch(() => setSelected(item)); } }}
                        sx={{ cursor: "pointer" }}
                    >
                        <TableCell>
                            <Typography fontWeight={650}>{item.subject}</Typography>
                            {item.attachmentCount ? <Typography variant="caption" color="text.secondary">{item.attachmentCount} zał.</Typography> : null}
                        </TableCell>
                        <TableCell>{item.categoryLabel}</TableCell>
                        <TableCell><Chip size="small" label={item.statusLabel} color={statusColor[item.status] ?? "default"} /></TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{warsaw(item.updatedAt)}</TableCell>
                    </TableRow>)}
                </TableBody>
            </Table>
        </TableContainer>
        <TablePagination
            component="div"
            count={filtered.length}
            page={filtered.length === 0 ? 0 : Math.min(page, Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1))}
            onPageChange={(_, next) => setPage(next)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(0); }}
            rowsPerPageOptions={[10, 20, 50]}
            labelRowsPerPage="Na stronie:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} z ${count}`}
            getItemAriaLabel={(type) => type === "next" ? "Następna strona" : type === "previous" ? "Poprzednia strona" : "Pierwsza strona"}
        />
        <Dialog open={creating} onClose={() => { if (!busy) setCreating(false); }} fullScreen={fullScreen} fullWidth maxWidth="sm">
            <Box component="form" onSubmit={submit}>
                <DialogTitle sx={{ backgroundColor: "#10261f", color: "#fff" }}>Nowe zgłoszenie</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 2 }}>
                        {(formError || error) && <Alert severity="error">{formError || error}</Alert>}
                        <TextField select required label="Kategoria" value={category} onChange={(event) => setCategory(event.target.value)}>
                            {categories.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
                        </TextField>
                        <TextField required label="Temat" value={subject} onChange={(event) => setSubject(event.target.value)} inputProps={{ maxLength: 160, minLength: 3 }} />
                        <TextField label="Wiadomość" value={message} onChange={(event) => setMessage(event.target.value)} multiline minRows={4} inputProps={{ maxLength: 8000 }} placeholder="Co się stało i kiedy? Jeśli masz zrzut ekranu, możesz go dodać poniżej." />
                        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
                            <Button component="label" variant="outlined" disabled={busy || files.length >= 5}>Dodaj zrzut ekranu
                                <input hidden type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" multiple onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} />
                            </Button>
                            <Typography variant="caption" color="text.secondary">PNG, JPG lub WebP, najwyżej 5 plików po 8 MB.</Typography>
                        </Stack>
                        {previews.length > 0 && <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                            {previews.map((item) => <Box key={item.url} sx={{ width: 96 }}>
                                <Box component="img" alt={item.file.name} src={item.url} sx={{ width: 96, height: 72, objectFit: "cover", borderRadius: 1, border: "1px solid", borderColor: "divider" }} />
                                <Button size="small" onClick={() => setFiles(files.filter((file) => file !== item.file))}>Usuń</Button>
                            </Box>)}
                        </Stack>}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ justifyContent: "flex-end", px: 3, pb: 2 }}>
                    <Button type="submit" variant="contained" disabled={busy}>Wyślij zgłoszenie</Button>
                </DialogActions>
            </Box>
        </Dialog>
        <Dialog open={!!selected} onClose={() => setSelected(null)} fullScreen={fullScreen} fullWidth maxWidth="md">
            <DialogTitle sx={{ backgroundColor: "#10261f", color: "#fff" }}>{selected?.subject}</DialogTitle>
            <DialogContent>
                {selected && <Stack spacing={2} sx={{ pt: 2 }}>
                    <Stack direction="row" spacing={1}><Chip size="small" label={selected.categoryLabel} /><Chip size="small" label={selected.statusLabel} color={statusColor[selected.status] ?? "default"} /></Stack>
                    {(selected.messages ?? []).map((entry) => <Box key={entry.uuid} sx={{ p: 1.5, borderRadius: 1, backgroundColor: entry.role === "operator" ? "rgba(16, 38, 31, 0.06)" : "transparent", border: "1px solid", borderColor: "divider" }}>
                        <Typography variant="caption" color="text.secondary">{entry.author} · {warsaw(entry.createdAt)}</Typography>
                        {entry.body && <Typography sx={{ whiteSpace: "pre-wrap", mt: 0.5 }}>{entry.body}</Typography>}
                        {token && (entry.attachments ?? []).length > 0 && <Stack spacing={1} sx={{ mt: 1 }}>{(entry.attachments ?? []).map((file) => <PrivateImage key={file.uuid} token={token} name={file.name} path={`/support/tickets/${selected.uuid}/attachments/${file.uuid}`} />)}</Stack>}
                    </Box>)}
                    <TextField label="Twoja wiadomość" value={reply} onChange={(event) => setReply(event.target.value)} multiline minRows={3} inputProps={{ maxLength: 8000 }} placeholder="Dopisz coś, jeśli chcesz uzupełnić zgłoszenie albo odpowiedzieć zespołowi." />
                </Stack>}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setSelected(null)}>Zamknij</Button>
                <Button variant="contained" disabled={busy || !reply.trim()} onClick={() => void sendReply()}>Wyślij wiadomość</Button>
            </DialogActions>
        </Dialog>
    </Stack>;
}
