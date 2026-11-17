"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography, useMediaQuery } from "@mui/material";
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
    const [items, setItems] = useState<Ticket[]>([]);
    const [loadError, setLoadError] = useState("");
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
            api<{ categories: Option[] }>("/support/meta"),
            api<{ items: Ticket[] }>("/support/tickets"),
        ]);
        if (meta.categories?.length) setCategories(meta.categories);
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

    return <Stack spacing={3} sx={{ maxWidth: 980 }}>
        <Box>
            <Typography variant="h4" component="h1">Pomoc</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>Opisz problem. Zgłoszenie trafi do zespołu EventCater, a odpowiedź zobaczysz w tym samym wątku.</Typography>
        </Box>
        {loadError && <Alert severity="error">{loadError}</Alert>}
        <Box component="form" onSubmit={submit} sx={{ p: { xs: 2, sm: 3 }, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
            <Stack spacing={2}>
                <Typography variant="h6" component="h2">Nowe zgłoszenie</Typography>
                {(formError || error) && <Alert severity="error">{formError || error}</Alert>}
                {sentSubject && <Alert severity="success" onClose={() => setSentSubject("")}>Zgłoszenie „{sentSubject}” jest na liście poniżej. Odpowiedź zespołu pojawi się w tym wątku.</Alert>}
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
                <Box><Button type="submit" variant="contained" disabled={busy}>Wyślij zgłoszenie</Button></Box>
            </Stack>
        </Box>
        <Box>
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>Moje zgłoszenia</Typography>
            {items.length === 0 && <Typography color="text.secondary">Nie masz jeszcze zgłoszeń.</Typography>}
            <Stack spacing={1}>
                {items.map((item) => <Box key={item.uuid} component="button" type="button" onClick={async () => { setReply(""); setSelected(await api<Ticket>("/support/tickets/" + item.uuid).catch(() => item)); }} sx={{ textAlign: "left", p: 1.5, borderRadius: 1, border: "1px solid", borderColor: "divider", background: "transparent", cursor: "pointer" }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                        <Typography fontWeight={650}>{item.subject}</Typography>
                        <Chip size="small" label={item.statusLabel} color={statusColor[item.status] ?? "default"} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">{item.categoryLabel} · {warsaw(item.updatedAt)}{item.attachmentCount ? ` · ${item.attachmentCount} zał.` : ""}</Typography>
                </Box>)}
            </Stack>
        </Box>
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
