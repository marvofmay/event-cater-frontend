"use client";

import { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, FormControlLabel, MenuItem, Paper, Stack, Switch, TextField, Typography } from '@mui/material';
import { useUser } from '@/app/context/userContext';
import { useAction, useApi, useRemote } from '@/app/components/catering/api';

interface Template {
    uuid: string;
    eventName: string;
    channelCode: string;
    title: string;
    content: string;
    isDefault: boolean;
    isActive: boolean;
}
interface TemplatesPage { data: { items: Template[]; total: number } }
const eventLabels: Record<string, string> = { CompanyImportedEvent: 'Import firm', DepartmentImportedEvent: 'Import oddziałów / departamentów', EmployeeImportedEvent: 'Import pracowników' };
const channelLabels: Record<string, string> = { internal: 'Systemowe', email: 'E-mail', sms: 'SMS' };
const sampleKinds: Record<string, string> = { CompanyImportedEvent: 'firm', DepartmentImportedEvent: 'oddziałów', EmployeeImportedEvent: 'pracowników' };

export default function NotificationTemplatesSettings() {
    const { hasPermission } = useUser();
    const canRead = hasPermission('notification_templates.list');
    const canEdit = hasPermission('notification_templates.settings');
    const api = useApi();
    const action = useAction();
    const remote = useRemote<TemplatesPage>(canRead ? '/settings/notification-templates?page=1&pageSize=100' : null);
    const templates = remote.data?.data.items ?? [];
    const [eventName, setEventName] = useState('');
    const [channelCode, setChannelCode] = useState('internal');
    const [isDefault, setDefault] = useState(true);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [active, setActive] = useState(false);
    const selected = templates.find(template => template.eventName === eventName && template.channelCode === channelCode && template.isDefault === isDefault);
    const dirty = Boolean(selected && (title !== selected.title || content !== selected.content || active !== selected.isActive));
    const events = [...new Set(templates.map(template => template.eventName))].sort((left, right) => (eventLabels[left] ?? left).localeCompare(eventLabels[right] ?? right, 'pl'));
    const channels = [...new Set(templates.filter(template => template.eventName === eventName).map(template => template.channelCode))];
    useEffect(() => {
        if (!eventName && templates.length) {
            const initial = templates.find(template => template.channelCode === 'internal' && template.isActive) ?? templates[0];
            setEventName(initial.eventName);
            setChannelCode(initial.channelCode);
            setDefault(initial.isDefault);
        }
    }, [eventName, templates]);
    useEffect(() => {
        setTitle(selected?.title ?? '');
        setContent(selected?.content ?? '');
        setActive(selected?.isActive ?? false);
    }, [selected]);
    useEffect(() => {
        if (!dirty) return;
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);
    const changeSelection = (change: () => void) => { if (!dirty || window.confirm('Odrzucić niezapisane zmiany szablonu?')) change(); };
    const preview = (text: string) => text.replaceAll('{{importKind}}', sampleKinds[eventName] ?? 'pracowników').replaceAll('{{importStatus}}', 'zakończony poprawnie');
    const variables = eventName in eventLabels ? ['importKind', 'importStatus'] : [];
    const unknownVariables = [...new Set([...`${title} ${content}`.matchAll(/\{\{([^{}]+)\}\}/g)].map(match => match[1]).filter(variable => !variables.includes(variable)))];

    if (!canRead) return <Alert severity="info">Brak uprawnienia do przeglądania szablonów powiadomień.</Alert>;
    return <Stack gap={2}>
        <Box><Typography variant="h6" gutterBottom>Tytuły i treści powiadomień</Typography><Typography variant="body2" color="text.secondary">Szablony obowiązują całą firmę. Wybierz zdarzenie i kanał, a następnie zmień tekst wiadomości. Dostępne są zdarzenia obsługiwane przez system, obecnie wyniki importów.</Typography></Box>
        {remote.error && <Alert severity="error" action={<Button color="inherit" onClick={remote.reload}>Ponów</Button>}>{remote.error}</Alert>}
        {remote.loading && <Typography role="status">Wczytywanie szablonów…</Typography>}
        {!remote.loading && remote.data && !templates.length && <Alert severity="info">Brak szablonów powiadomień w tej firmie.</Alert>}
        {!!templates.length && eventName && <>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
                <TextField select fullWidth label="Zdarzenie" value={eventName} disabled={action.busy} onChange={event => changeSelection(() => {
                    const next = templates.find(template => template.eventName === event.target.value && template.channelCode === channelCode && template.isActive) ?? templates.find(template => template.eventName === event.target.value && template.isActive) ?? templates.find(template => template.eventName === event.target.value)!;
                    setEventName(next.eventName); setChannelCode(next.channelCode); setDefault(next.isDefault);
                })}>{events.map(event => <MenuItem key={event} value={event}>{eventLabels[event] ?? event}</MenuItem>)}</TextField>
                <TextField select fullWidth label="Kanał" value={channelCode} disabled={action.busy} onChange={event => changeSelection(() => {
                    const next = templates.find(template => template.eventName === eventName && template.channelCode === event.target.value && template.isActive) ?? templates.find(template => template.eventName === eventName && template.channelCode === event.target.value)!;
                    setChannelCode(next.channelCode); setDefault(next.isDefault);
                })}>{channels.map(channel => <MenuItem key={channel} value={channel}>{channelLabels[channel] ?? channel}</MenuItem>)}</TextField>
            </Stack>
            <TextField select label="Wariant szablonu" value={isDefault ? 'default' : 'custom'} disabled={action.busy} onChange={event => changeSelection(() => setDefault(event.target.value === 'default'))}>
                <MenuItem value="default">Podstawowy</MenuItem><MenuItem value="custom">Własny</MenuItem>
            </TextField>
            {!selected ? <Alert severity="info">Ten wariant szablonu nie jest dostępny dla wybranego zdarzenia i kanału.</Alert> : <>
                {!canEdit && <Alert severity="info">Masz dostęp tylko do podglądu szablonów.</Alert>}
                <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap"><FormControlLabel control={<Switch checked={active} disabled={!canEdit || action.busy} onChange={(_, checked) => setActive(checked)} />} label="Używaj tego szablonu" /><Chip size="small" color={selected.isActive ? 'success' : 'default'} label={selected.isActive ? 'Obecnie aktywny' : 'Obecnie nieaktywny'} /></Stack>
                <Typography variant="caption" color="text.secondary">Włączenie tego wariantu wyłączy drugi wariant dla tego samego zdarzenia i kanału. Wyłączenie wszystkich wariantów oznacza brak wiadomości dla tej pary.</Typography>
                <TextField label="Tytuł powiadomienia" required fullWidth value={title} disabled={!canEdit || action.busy} onChange={event => setTitle(event.target.value)} slotProps={{ htmlInput: { maxLength: 255 } }} helperText={channelCode === 'sms' ? 'Tytuł jest zapisywany w systemie, ale nie jest wysyłany w SMS.' : `${title.length}/255 znaków`} />
                <TextField label="Treść powiadomienia" required fullWidth multiline minRows={4} value={content} disabled={!canEdit || action.busy} onChange={event => setContent(event.target.value)} slotProps={{ htmlInput: { maxLength: 500 } }} helperText={`${content.length}/500 znaków`} />
                {!!variables.length && <Box><Typography variant="body2" fontWeight={600} mb={1}>Dostępne zmienne</Typography><Stack direction="row" gap={1} flexWrap="wrap" sx={{ '& .MuiChip-root': { maxWidth: '100%', height: 'auto' }, '& .MuiChip-label': { whiteSpace: 'normal', py: .75 } }}><Chip label="{{importKind}} — rodzaj importu" /><Chip label="{{importStatus}} — wynik importu" /></Stack><Typography variant="caption" color="text.secondary">Wpisz zmienną dokładnie w tej postaci. System zastąpi ją danymi przy wysyłce.</Typography></Box>}
                {!!unknownVariables.length && <Alert severity="warning">Nieznane zmienne: {unknownVariables.map(variable => `{{${variable}}}`).join(', ')}. Nie zostaną zastąpione danymi.</Alert>}
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, overflowWrap: 'anywhere' }}><Typography variant="subtitle2" color="text.secondary" mb={1}>Podgląd na przykładowych danych — nic nie zostanie wysłane</Typography>{channelCode !== 'sms' && <Typography fontWeight={600} mb={1} sx={{ whiteSpace: 'pre-wrap' }}>{preview(title)}</Typography>}<Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{preview(content)}</Typography></Paper>
                {canEdit && <Button variant="contained" disabled={action.busy || !dirty || !title.trim() || !content.trim()} sx={{ alignSelf: 'flex-start' }} onClick={() => action.run(async () => {
                    await api('/settings/notification-templates', 'PUT', { eventName, channelCode, title, content, searchDefault: isDefault, markAsActive: active });
                    remote.setData(current => current ? { ...current, data: { ...current.data, items: current.data.items.map(template => template.eventName === eventName && template.channelCode === channelCode ? template.isDefault === isDefault ? { ...template, title, content, isActive: active } : active ? { ...template, isActive: false } : template : template) } } : current);
                }, 'Zapisano szablon powiadomienia.')}>{action.busy ? 'Zapisywanie…' : 'Zapisz szablon'}</Button>}
            </>}
        </>}
    </Stack>;
}
