"use client";

import { useState } from 'react';
import { Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { useUser } from '@/app/context/userContext';
import { passwordRules } from '@/app/utils/passwordRules';

export default function ChangePasswordDialog({ required = false, onClose }: { required?: boolean; onClose?: () => void }) {
    const { changePassword, logout } = useUser();
    const [current, setCurrent] = useState('');
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const rules = passwordRules(password, confirmation, current);
    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (saving || !rules.every(rule => rule.valid)) return;
        setSaving(true);
        setError('');
        try {
            await changePassword(current, password, confirmation);
            setCurrent('');
            setPassword('');
            setConfirmation('');
            toast.success('Hasło zostało zmienione.');
            onClose?.();
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'Nie udało się zmienić hasła.');
            toast.error('Nie udało się zmienić hasła.');
        } finally {
            setSaving(false);
        }
    };
    return <Dialog open fullWidth maxWidth="sm" disableEscapeKeyDown={required || saving} onClose={required || saving ? undefined : onClose} aria-labelledby="change-password-title">
        <form onSubmit={submit}>
            <DialogTitle id="change-password-title">{required ? 'Ustaw własne hasło' : 'Zmień hasło'}</DialogTitle>
            <DialogContent>
                {required && <Alert severity="info" sx={{ mb: 2 }}>Przy pierwszym logowaniu musisz zmienić hasło startowe (PESEL). Dopiero wtedy uzyskasz dostęp do aplikacji.</Alert>}
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField label="Obecne hasło" type="password" autoComplete="current-password" value={current} onChange={event => setCurrent(event.target.value)} required disabled={saving} autoFocus inputProps={{ maxLength: 1024 }} />
                    <TextField label="Nowe hasło" type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} required disabled={saving} inputProps={{ maxLength: 128 }} />
                    <TextField label="Powtórz nowe hasło" type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} required disabled={saving} inputProps={{ maxLength: 128 }} />
                </Stack>
                <Typography variant="subtitle2" sx={{ mt: 2 }}>Reguły hasła</Typography>
                <Stack aria-live="polite">
                    {rules.map(rule => <FormControlLabel key={rule.label} control={<Checkbox checked={rule.valid} color="success" slotProps={{ input: { readOnly: true, tabIndex: -1 } }} sx={{ pointerEvents: 'none', py: 0.5 }} />} label={<Typography variant="body2">{rule.label}</Typography>} />)}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button disabled={saving} onClick={required ? () => void logout() : onClose}>{required ? 'Wyloguj się' : 'Anuluj'}</Button>
                <Button type="submit" variant="contained" disabled={saving || !rules.every(rule => rule.valid)}>{saving ? 'Zapisywanie…' : 'Zapisz nowe hasło'}</Button>
            </DialogActions>
        </form>
    </Dialog>;
}
