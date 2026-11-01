"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Alert, Box, Button, Checkbox, CircularProgress, FormControlLabel, MenuItem, Paper, Stack, Switch, TextField, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { useUser } from '@/app/context/userContext';
import { usePreferences, type PreferenceResource } from '@/app/context/preferencesContext';

type Channel = 'sms' | 'email' | 'internal';
const labels: Record<PreferenceResource, string> = { companies: 'Firmy', departments: 'Oddziały / departamenty', employees: 'Pracownicy', positions: 'Stanowiska', roles: 'Role', contractTypes: 'Formy zatrudnienia', industries: 'Branże', notifications: 'Powiadomienia' };
const channelLabels: Record<Channel, string> = { sms: 'SMS', email: 'E-mail', internal: 'Systemowe' };
interface Values { pageSize: number | null; channels?: Record<Channel, boolean | null>; sms?: { hasApiKey: boolean; sender: string; quotaMode: 'monthly' | 'pool'; limit: number; used: number; remaining: number; period: string } }
interface Snapshot { tenant: Values; user: Values; effective: Values; canManageTenant: boolean; tenantVersion: number; userVersion: number }

export default function SettingsPanel({ resource, personalOnly = false }: { resource: PreferenceResource; personalOnly?: boolean }) {
    const { token, tenant, user, roles, loading } = useUser();
    const router = useRouter();
    const technical = user?.technicalAdministrator || roles.includes('Administrator techniczny SaaS');
    const { refresh } = usePreferences();
    const [data, setData] = useState<Snapshot | null>(null);
    const scope = personalOnly ? 'user' : 'tenant';
    const [pageSize, setPageSize] = useState<number | null>(null);
    const [channels, setChannels] = useState<Record<Channel, boolean | null>>({ sms: null, email: null, internal: null });
    const [sender, setSender] = useState('');
    const [limit, setLimit] = useState(0);
    const [quotaMode, setQuotaMode] = useState<'monthly' | 'pool'>('monthly');
    const [apiKey, setApiKey] = useState('');
    const [clearApiKey, setClearApiKey] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [reload, setReload] = useState(0);
    useEffect(() => {
        if (!loading && !personalOnly && !technical) router.replace(`/me/settings?section=${resource}`);
    }, [loading, personalOnly, technical, resource, router]);
    useEffect(() => {
        if (!token || (!personalOnly && !technical)) return;
        const controller = new AbortController();
        setData(null);
        setError('');
        axios.get(`/api/preferences/${resource}`, { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } })
            .then(response => setData(response.data.data))
            .catch(failure => { if (!controller.signal.aborted) setError(failure.response?.data?.message ?? 'Nie udało się pobrać ustawień.'); });
        return () => controller.abort();
    }, [token, resource, reload, personalOnly, technical]);
    useEffect(() => {
        if (!data) return;
        const values = data[scope];
        setPageSize(values.pageSize);
        setChannels(values.channels ?? { sms: null, email: null, internal: null });
        setSender(data.tenant.sms?.sender ?? '');
        setLimit(data.tenant.sms?.limit ?? 0);
        setQuotaMode(data.tenant.sms?.quotaMode ?? 'monthly');
        setApiKey('');
        setClearApiKey(false);
    }, [data, scope]);
    const save = async () => {
        if (!data || saving) return;
        setSaving(true);
        setError('');
        try {
            const response = await axios.put(`/api/preferences/${resource}`, {
                scope, version: scope === 'tenant' ? data.tenantVersion : data.userVersion, pageSize,
                ...(resource === 'notifications' ? { channels } : {}),
                ...(resource === 'notifications' && scope === 'tenant' ? { sms: { sender, limit, quotaMode, apiKey, clearApiKey } } : {}),
            }, { headers: { Authorization: `Bearer ${token}` } });
            setData(response.data.data);
            toast.success('Zapisano ustawienia.');
            await refresh();
        } catch (failure) {
            const message = axios.isAxiosError(failure) ? failure.response?.data?.message : null;
            setError(message ?? 'Nie udało się zapisać ustawień.');
            toast.error('Nie udało się zapisać ustawień.');
        } finally { setSaving(false); }
    };
    return <Box component="main" sx={{ maxWidth: 850, mx: 'auto', p: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" gutterBottom>Ustawienia — {labels[resource]}</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>{tenant?.name} · {personalOnly ? 'Twoje ustawienia dotyczą wyłącznie tej firmy.' : 'Ustawienia globalne dla tej firmy.'}</Typography>
        {error && <Alert severity="error" action={<Button onClick={() => setReload(value => value + 1)} color="inherit">Odśwież</Button>} sx={{ mb: 2 }}>{error}</Alert>}
        {!data ? !error && <CircularProgress aria-label="Ładowanie ustawień" /> : <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>{scope === 'tenant' ? 'Ustawienia nadrzędne obowiązują wszystkich użytkowników, którzy nie wybrali własnych wartości. Wyłączonego kanału nie może włączyć użytkownik.' : 'Możesz nadpisać ustawienia dla siebie lub pozostawić dziedziczenie ustawień firmy.'}</Alert>
            <TextField select fullWidth label="Rekordów na stronę" value={pageSize ?? 'inherit'} onChange={event => setPageSize(event.target.value === 'inherit' ? null : Number(event.target.value))} disabled={saving} helperText={`Obecnie obowiązuje: ${scope === 'tenant' ? data.tenant.pageSize : data.effective.pageSize} rekordów na stronę.`}>
                {scope === 'user' && <MenuItem value="inherit">Ustawienie firmy ({data.tenant.pageSize})</MenuItem>}
                {[5, 10, 25, 50, 100].map(size => <MenuItem key={size} value={size}>{size}</MenuItem>)}
            </TextField>
            {resource === 'notifications' && <>
                <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Kanały powiadomień</Typography>
                <Stack spacing={2}>
                    {(Object.keys(channelLabels) as Channel[]).map(channel => {
                        const blocked = scope === 'user' && !data.tenant.channels?.[channel];
                        const checked = scope === 'tenant'
                            ? Boolean(channels[channel])
                            : !blocked && Boolean(channels[channel] ?? data.tenant.channels?.[channel]);
                        return <Box key={channel}>
                            <FormControlLabel control={<Switch checked={checked} disabled={saving || blocked} onChange={(_, enabled) => setChannels(current => ({ ...current, [channel]: enabled }))} />} label={channelLabels[channel]} />
                            {blocked && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Kanał wyłączony przez firmę.</Typography>}
                        </Box>;
                    })}
                </Stack>
                {scope === 'tenant' && <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" gutterBottom>Brevo — SMS</Typography>
                    <Alert severity="warning" sx={{ mb: 2 }}>To lokalny limit aplikacji, nie saldo konta Brevo. Włączenie SMS umożliwia płatne wysyłki. Długie wiadomości mogą zużywać kilka segmentów.</Alert>
                    <Stack spacing={2}>
                        <TextField type="password" label="Klucz API Brevo" autoComplete="new-password" value={apiKey} disabled={saving || clearApiKey} onChange={event => setApiKey(event.target.value)} helperText={data.tenant.sms?.hasApiKey ? 'Klucz zapisany. Zostaw pole puste, aby go zachować.' : 'Klucz nie został jeszcze zapisany.'} />
                        <FormControlLabel control={<Checkbox checked={clearApiKey} disabled={saving} onChange={(_, checked) => setClearApiKey(checked)} />} label="Usuń zapisany klucz API" />
                        <TextField label="Nadawca SMS" value={sender} onChange={event => setSender(event.target.value)} inputProps={{ maxLength: 11 }} helperText="Do 11 liter lub cyfr. Nadawca musi być akceptowany przez Brevo." disabled={saving} />
                        <TextField select label="Rodzaj puli" value={quotaMode} onChange={event => setQuotaMode(event.target.value as 'monthly' | 'pool')} disabled={saving}><MenuItem value="monthly">Limit miesięczny</MenuItem><MenuItem value="pool">Jednorazowa pula (łącznie)</MenuItem></TextField>
                        <TextField type="number" label="Limit segmentów SMS" value={limit} onChange={event => setLimit(Number(event.target.value))} inputProps={{ min: 0, max: 10000000, step: 1 }} disabled={saving} />
                        <Typography variant="body2">Zużyte / zarezerwowane: {data.tenant.sms?.used ?? 0} · Pozostało: {data.tenant.sms?.remaining ?? 0}{quotaMode === 'monthly' ? ` · Okres: ${data.tenant.sms?.period ?? ''}` : ''}</Typography>
                    </Stack>
                </Box>}
            </>}
            <Button variant="contained" onClick={save} disabled={saving} sx={{ mt: 3 }}>{saving ? 'Zapisywanie…' : 'Zapisz ustawienia'}</Button>
        </Paper>}
    </Box>;
}
