"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Alert, Box, Button, Checkbox, CircularProgress, FormControlLabel, MenuItem, Paper, Stack, Switch, Tab, Tabs, TextField, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { useUser } from '@/app/context/userContext';
import { usePreferences, type PreferenceResource } from '@/app/context/preferencesContext';
import NotificationTemplatesSettings from './NotificationTemplatesSettings';
import { canConfigureListPreference } from '@/app/utils/preferenceAccess';

type Channel = 'sms' | 'email' | 'internal';
const labels: Record<PreferenceResource, string> = { companies: 'Firmy', departments: 'Oddziały / departamenty', employees: 'Pracownicy', positions: 'Stanowiska', roles: 'Role', contractTypes: 'Formy zatrudnienia', industries: 'Branże', notifications: 'Powiadomienia' };
const channelLabels: Record<Channel, string> = { sms: 'SMS', email: 'E-mail', internal: 'Systemowe' };
interface Values { pageSize: number | null; channels?: Record<Channel, boolean | null>; sms?: { hasApiKey: boolean; sender: string; quotaMode: 'monthly' | 'pool'; limit: number; used: number; remaining: number; period: string } }
interface Snapshot { tenant: Values; user: Values; effective: Values; canManageTenant: boolean; tenantVersion: number; userVersion: number }

export default function SettingsPanel({ resource, personalOnly = false }: { resource: PreferenceResource; personalOnly?: boolean }) {
    const { token, tenant, user, roles, loading, hasAccess, hasPermission } = useUser();
    const canConfigureList = !personalOnly || canConfigureListPreference(resource, hasAccess, hasPermission);
    const canOpen = !personalOnly || resource === 'notifications' || canConfigureList;
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
    const [notificationTab, setNotificationTab] = useState('channels');
    const [templatesVisited, setTemplatesVisited] = useState(false);
    const notificationSettings = resource === 'notifications' && scope === 'tenant';
    const smsReady = !clearApiKey
        && Boolean(apiKey.trim() || data?.tenant.sms?.hasApiKey)
        && Boolean(sender.trim())
        && limit > 0;
    useEffect(() => {
        if (!loading && !personalOnly && !technical) router.replace(`/me/settings?section=${resource}`);
    }, [loading, personalOnly, technical, resource, router]);
    useEffect(() => {
        if (!token || !canOpen || (!personalOnly && !technical)) return;
        const controller = new AbortController();
        setData(null);
        setError('');
        axios.get(`/api/preferences/${resource}`, { signal: controller.signal, headers: { Authorization: `Bearer ${token}` } })
            .then(response => setData(response.data.data))
            .catch(failure => { if (!controller.signal.aborted) setError(failure.response?.data?.message ?? 'Nie udało się pobrać ustawień.'); });
        return () => controller.abort();
    }, [token, resource, reload, personalOnly, technical, canOpen]);
    useEffect(() => {
        if (!data) return;
        const values = data[scope];
        setPageSize(values.pageSize);
        const selectedChannels = values.channels ?? { sms: null, email: null, internal: null };
        setChannels(scope === 'tenant' ? selectedChannels : Object.fromEntries((Object.keys(channelLabels) as Channel[]).map(channel => [channel, selectedChannels[channel] === true && !data.tenant.channels?.[channel] ? null : selectedChannels[channel]])) as Record<Channel, boolean | null>);
        setSender(data.tenant.sms?.sender ?? '');
        setLimit(data.tenant.sms?.limit ?? 0);
        setQuotaMode(data.tenant.sms?.quotaMode ?? 'monthly');
        setApiKey('');
        setClearApiKey(false);
    }, [data, scope]);
    const disableSmsIfBrevoIncomplete = (nextReady: boolean) => {
        if (scope === 'tenant' && !nextReady) {
            setChannels(current => current.sms ? { ...current, sms: false } : current);
        }
    };
    const save = async () => {
        if (!data || saving) return;
        setSaving(true);
        setError('');
        try {
            const tenantChannels = smsReady ? channels : { ...channels, sms: false };
            const response = await axios.put(`/api/preferences/${resource}`, {
                scope, version: scope === 'tenant' ? data.tenantVersion : data.userVersion, pageSize: canConfigureList ? pageSize : null,
                ...(resource === 'notifications' ? { channels: scope === 'user' ? { ...channels, internal: null } : tenantChannels } : {}),
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
    if (!canOpen) return <Alert severity="warning">Nie masz uprawnienia do ustawień tej listy.</Alert>;
    return <Box component={personalOnly ? 'div' : 'main'} sx={personalOnly ? { minWidth: 0 } : { maxWidth: 850, mx: 'auto', p: { xs: 2, sm: 3 } }}>
        {!personalOnly && <Typography variant="h5" gutterBottom>Ustawienia - {labels[resource]}</Typography>}
        {personalOnly ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {labels[resource]} · {tenant?.name} · tylko Twoje ustawienia w tej firmie
            </Typography>
        ) : (
            <Typography color="text.secondary" sx={{ mb: 2 }}>{tenant?.name} - Ustawienia globalne dla tej firmy.</Typography>
        )}
        {error && <Alert severity="error" action={<Button onClick={() => setReload(value => value + 1)} color="inherit">Odśwież</Button>} sx={{ mb: 2 }}>{error}</Alert>}
        {!data ? !error && <CircularProgress aria-label="Ładowanie ustawień" /> : <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
            {notificationSettings && <Tabs value={notificationTab} onChange={(_, value) => { setNotificationTab(value); if (value === 'templates') setTemplatesVisited(true); }} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile aria-label="Ustawienia powiadomień" sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Tab value="channels" label="Kanały" id="notification-tab-channels" aria-controls="notification-panel-channels" />
                <Tab value="templates" label="Tytuły i treści" id="notification-tab-templates" aria-controls="notification-panel-templates" />
                <Tab value="sms" label="SMS / Brevo" id="notification-tab-sms" aria-controls="notification-panel-sms" />
                <Tab value="list" label="Lista" id="notification-tab-list" aria-controls="notification-panel-list" />
            </Tabs>}
            <Box hidden={notificationSettings && notificationTab !== 'channels'}>
            <Alert severity="info" sx={{ mb: 3 }}>{scope === 'tenant' ? 'Ustawienia nadrzędne obowiązują wszystkich użytkowników, którzy nie wybrali własnych wartości. Wyłączonego kanału nie może włączyć użytkownik. SMS wymaga uzupełnionego Brevo (klucz API, nadawca i dodatnia pula).' : 'Możesz nadpisać SMS i e-mail dla siebie. Kanał systemowy jest zawsze włączony, gdy firma go udostępnia.'}</Alert>
            </Box>
            <Box hidden={!canConfigureList || (notificationSettings && notificationTab !== 'list')} role={notificationSettings ? 'tabpanel' : undefined} id={notificationSettings ? 'notification-panel-list' : undefined} aria-labelledby={notificationSettings ? 'notification-tab-list' : undefined}>
            {notificationSettings && <Typography variant="h6" gutterBottom>Lista powiadomień</Typography>}
            <TextField select fullWidth label="Rekordów na stronę" value={pageSize ?? 'inherit'} onChange={event => setPageSize(event.target.value === 'inherit' ? null : Number(event.target.value))} disabled={saving} helperText={`Obecnie obowiązuje: ${scope === 'tenant' ? data.tenant.pageSize : data.effective.pageSize} rekordów na stronę.`}>
                {scope === 'user' && <MenuItem value="inherit">Ustawienie firmy ({data.tenant.pageSize})</MenuItem>}
                {[5, 10, 25, 50, 100].map(size => <MenuItem key={size} value={size}>{size}</MenuItem>)}
            </TextField>
            </Box>
            {resource === 'notifications' && <>
                <Box hidden={notificationSettings && notificationTab !== 'channels'} role={notificationSettings ? 'tabpanel' : undefined} id={notificationSettings ? 'notification-panel-channels' : undefined} aria-labelledby={notificationSettings ? 'notification-tab-channels' : undefined}>
                <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Kanały powiadomień</Typography>
                <Stack spacing={2}>
                    {(Object.keys(channelLabels) as Channel[]).map(channel => {
                        const companyOff = scope === 'user' && !data.tenant.channels?.[channel];
                        const mandatory = scope === 'user' && channel === 'internal' && Boolean(data.tenant.channels?.internal);
                        const smsNeedsBrevo = scope === 'tenant' && channel === 'sms' && !smsReady;
                        const blocked = companyOff || mandatory || smsNeedsBrevo;
                        const checked = scope === 'tenant'
                            ? Boolean(channels[channel]) && !(channel === 'sms' && !smsReady)
                            : !companyOff && (mandatory || Boolean(channels[channel] ?? data.tenant.channels?.[channel]));
                        return <Box key={channel}>
                            <FormControlLabel control={<Switch checked={checked} disabled={saving || blocked} onChange={(_, enabled) => setChannels(current => ({ ...current, [channel]: channel === 'internal' && scope === 'user' ? null : enabled }))} />} label={channelLabels[channel]} />
                            {companyOff && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Kanał wyłączony przez firmę.</Typography>}
                            {mandatory && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Kanał systemowy jest zawsze włączony.</Typography>}
                            {smsNeedsBrevo && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Najpierw uzupełnij klucz Brevo, nadawcę i dodatnią pulę w zakładce SMS / Brevo.</Typography>}
                        </Box>;
                    })}
                </Stack>
                </Box>
                {scope === 'tenant' && <Box hidden={notificationSettings && notificationTab !== 'sms'} role="tabpanel" id="notification-panel-sms" aria-labelledby="notification-tab-sms">
                    <Typography variant="h6" gutterBottom>Brevo - SMS</Typography>
                    <Alert severity="warning" sx={{ mb: 2 }}>To lokalny limit aplikacji, nie saldo konta Brevo. Bez klucza API, nadawcy i dodatniej puli nie da się włączyć kanału SMS. Długie wiadomości mogą zużywać kilka segmentów.</Alert>
                    <Stack spacing={2}>
                        <TextField type="password" label="Klucz API Brevo" autoComplete="new-password" value={apiKey} disabled={saving || clearApiKey} onChange={event => {
                            const value = event.target.value;
                            setApiKey(value);
                            disableSmsIfBrevoIncomplete(!clearApiKey && Boolean(value.trim() || data.tenant.sms?.hasApiKey) && Boolean(sender.trim()) && limit > 0);
                        }} helperText={data.tenant.sms?.hasApiKey ? 'Klucz zapisany. Zostaw pole puste, aby go zachować.' : 'Klucz nie został jeszcze zapisany.'} />
                        <FormControlLabel control={<Checkbox checked={clearApiKey} disabled={saving} onChange={(_, checked) => {
                            setClearApiKey(checked);
                            disableSmsIfBrevoIncomplete(!checked && Boolean(apiKey.trim() || data.tenant.sms?.hasApiKey) && Boolean(sender.trim()) && limit > 0);
                        }} />} label="Usuń zapisany klucz API" />
                        <TextField label="Nadawca SMS" value={sender} onChange={event => {
                            const value = event.target.value;
                            setSender(value);
                            disableSmsIfBrevoIncomplete(!clearApiKey && Boolean(apiKey.trim() || data.tenant.sms?.hasApiKey) && Boolean(value.trim()) && limit > 0);
                        }} inputProps={{ maxLength: 11 }} helperText="Do 11 liter lub cyfr. Nadawca musi być akceptowany przez Brevo." disabled={saving} />
                        <TextField select label="Rodzaj puli" value={quotaMode} onChange={event => setQuotaMode(event.target.value as 'monthly' | 'pool')} disabled={saving}><MenuItem value="monthly">Limit miesięczny</MenuItem><MenuItem value="pool">Jednorazowa pula (łącznie)</MenuItem></TextField>
                        <TextField type="number" label="Limit segmentów SMS" value={limit} onChange={event => {
                            const value = Number(event.target.value);
                            setLimit(value);
                            disableSmsIfBrevoIncomplete(!clearApiKey && Boolean(apiKey.trim() || data.tenant.sms?.hasApiKey) && Boolean(sender.trim()) && value > 0);
                        }} inputProps={{ min: 0, max: 10000000, step: 1 }} disabled={saving} />
                        <Typography variant="body2">Zużyte / zarezerwowane: {data.tenant.sms?.used ?? 0} - Pozostało: {data.tenant.sms?.remaining ?? 0}{quotaMode === 'monthly' ? ` - Okres: ${data.tenant.sms?.period ?? ''}` : ''}</Typography>
                        {!smsReady && <Alert severity="info">Po uzupełnieniu klucza, nadawcy i limitu będzie można włączyć kanał SMS w zakładce Kanały.</Alert>}
                    </Stack>
                </Box>}
            </>}
            {(!notificationSettings || notificationTab !== 'templates') && <Button variant="contained" onClick={save} disabled={saving} sx={{ mt: 3 }}>{saving ? 'Zapisywanie…' : 'Zapisz ustawienia'}</Button>}
            {notificationSettings && templatesVisited && <Box hidden={notificationTab !== 'templates'} role="tabpanel" id="notification-panel-templates" aria-labelledby="notification-tab-templates"><NotificationTemplatesSettings /></Box>}
        </Paper>}
    </Box>;
}
