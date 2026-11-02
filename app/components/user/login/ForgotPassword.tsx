import { useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import { toast } from 'react-toastify';

interface ForgotPasswordProps {
    open: boolean;
    handleClose: () => void;
    tenantSlug: string;
    initialLogin: string;
}

export default function ForgotPassword({ open, handleClose, tenantSlug, initialLogin }: ForgotPasswordProps) {
    const [login, setLogin] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const validTenant = /^[a-z0-9][a-z0-9-]{1,62}$/.test(tenantSlug);
    useEffect(() => {
        if (open) {
            setLogin(initialLogin);
            setError('');
            setMessage('');
        }
    }, [open, initialLogin]);
    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (saving || !validTenant || !login.trim()) return;
        setSaving(true);
        setError('');
        try {
            const response = await axios.post('/api/auth/password-reset/request', { login: login.trim() }, { headers: { 'X-Tenant': tenantSlug } });
            setMessage(response.data.message);
            toast.info(response.data.message);
        } catch (failure) {
            setError(axios.isAxiosError(failure) ? failure.response?.data?.message ?? 'Nie udało się wysłać prośby. Spróbuj ponownie.' : 'Nie udało się wysłać prośby.');
            toast.error('Nie udało się wysłać prośby o zmianę hasła.');
        } finally { setSaving(false); }
    };
    return <Dialog open={open} onClose={saving ? undefined : handleClose} fullWidth maxWidth="xs" aria-labelledby="forgot-password-title">
        <form onSubmit={submit}>
            <DialogTitle id="forgot-password-title" sx={{ backgroundColor: '#34495e', color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>Odzyskaj dostęp do konta</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ mb: 2 }}>Podaj login lub przypisany do konta e-mail. Wyślemy link do ustawienia nowego hasła. Działa to również dla hasła startowego.</DialogContentText>
                {!validTenant && <Alert severity="warning" sx={{ mb: 2 }}>Najpierw wybierz firmę w formularzu logowania.</Alert>}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {message ? <Alert severity="info">{message} Sprawdź też folder spam. Jeśli konto nie ma e-maila, skontaktuj się z administratorem firmy.</Alert>
                    : <TextField label="Login lub e-mail" value={login} onChange={event => setLogin(event.target.value)} fullWidth required autoFocus autoComplete="username" disabled={saving} inputProps={{ maxLength: 254 }} />}
            </DialogContent>
            <DialogActions>
                <Button color="primary" variant="contained" onClick={handleClose} disabled={saving}>{message ? 'Zamknij' : 'Anuluj'}</Button>
                {!message && <Button variant="contained" type="submit" disabled={saving || !validTenant || !login.trim()}>{saving ? 'Wysyłanie…' : 'Wyślij link'}</Button>}
            </DialogActions>
        </form>
    </Dialog>;
}
