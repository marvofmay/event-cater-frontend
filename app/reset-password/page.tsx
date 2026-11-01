"use client";

import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Checkbox, FormControlLabel, Paper, Stack, TextField, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-toastify';
import { passwordRules } from '@/app/utils/passwordRules';
import { useUser } from '@/app/context/userContext';

export default function Page() {
    const router = useRouter();
    const { isAuthenticated, logout } = useUser();
    const parsed = useRef(false);
    const [link, setLink] = useState<{ token: string; tenant: string } | null>(null);
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        const readLink = () => {
            if (parsed.current && !window.location.hash) return;
            parsed.current = true;
            const parameters = new URLSearchParams(window.location.hash.slice(1));
            const token = parameters.get('token') ?? '';
            const tenant = parameters.get('tenant') ?? '';
            window.history.replaceState(null, '', window.location.pathname);
            setPassword('');
            setConfirmation('');
            setLink(null);
            setError('');
            if (/^[0-9a-f]{64}$/.test(token) && /^[a-z0-9][a-z0-9-]{1,62}$/.test(tenant)) setLink({ token, tenant });
            else setError('Link jest nieprawidłowy lub niekompletny. Otwórz pełny link z wiadomości e-mail albo poproś o nowy.');
        };
        readLink();
        window.addEventListener('hashchange', readLink);
        return () => window.removeEventListener('hashchange', readLink);
    }, []);
    const rules = passwordRules(password, confirmation);
    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (saving || !link || !rules.every(rule => rule.valid)) return;
        setSaving(true);
        setError('');
        try {
            const response = await axios.post('/api/auth/password-reset/confirm', { token: link.token, newPassword: password, confirmation }, { headers: { 'X-Tenant': link.tenant } });
            setPassword('');
            setConfirmation('');
            setLink(null);
            localStorage.setItem('selected_tenant', link.tenant);
            if (isAuthenticated) void logout();
            toast.success(response.data.message);
            router.replace('/login');
        } catch (failure) {
            setError(axios.isAxiosError(failure) ? failure.response?.data?.message ?? 'Nie udało się zmienić hasła. Spróbuj ponownie.' : 'Nie udało się zmienić hasła.');
            toast.error('Nie udało się zmienić hasła.');
        } finally { setSaving(false); }
    };
    return <Box sx={{ maxWidth: 520, mx: 'auto', p: 3 }}><Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>Ustaw nowe hasło</Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>Link jest jednorazowy i ważny 15 minut. Po zmianie zaloguj się swoim loginem i nowym hasłem.</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {link && <form onSubmit={submit}>
            <Stack spacing={2}>
                <TextField label="Nowe hasło" type="password" required autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} disabled={saving} inputProps={{ maxLength: 128 }} />
                <TextField label="Powtórz nowe hasło" type="password" required autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={saving} inputProps={{ maxLength: 128 }} />
            </Stack>
            <Typography variant="subtitle2" sx={{ mt: 2 }}>Reguły hasła</Typography>
            <Stack aria-live="polite">{rules.map(rule => <FormControlLabel key={rule.label} control={<Checkbox checked={rule.valid} color="success" slotProps={{ input: { readOnly: true, tabIndex: -1 } }} sx={{ pointerEvents: 'none', py: 0.5 }} />} label={<Typography variant="body2">{rule.label}</Typography>} />)}</Stack>
            <Button type="submit" variant="contained" disabled={saving || !rules.every(rule => rule.valid)} sx={{ mt: 2 }}>{saving ? 'Zapisywanie…' : 'Zapisz nowe hasło'}</Button>
        </form>}
        <Button onClick={() => router.replace('/login')} disabled={saving} sx={{ mt: 2 }}>Wróć do logowania</Button>
    </Paper></Box>;
}
