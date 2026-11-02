"use client";

import { useEffect, useId, useRef, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Typography } from '@mui/material';
import TimerOutlined from '@mui/icons-material/TimerOutlined';
import { useUser } from '@/app/context/userContext';
import { IDLE_ACTIVITY_KEY, IDLE_LOGOUT_MS, IDLE_WARNING_MS, readLastActivity, writeLastActivity } from '@/app/utils/idleSession';

export default function SessionInactivity() {
    const { token, isAuthenticated, loading, logout } = useUser();
    const [remaining, setRemaining] = useState<number | null>(null);
    const logoutRef = useRef(logout);
    const extendRef = useRef(() => {});
    const expireRef = useRef(() => {});
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => { logoutRef.current = logout; }, [logout]);

    useEffect(() => {
        setRemaining(null);
        if (loading || !isAuthenticated || !token) return;
        let lastActivity = readLastActivity(token) ?? Date.now();
        let lastWritten = lastActivity;
        let warning = false;
        let ended = false;
        let timer: ReturnType<typeof setTimeout>;

        const expire = () => {
            if (ended) return;
            ended = true;
            clearTimeout(timer);
            setRemaining(null);
            void logoutRef.current('inactivity');
        };
        const check = () => {
            if (ended) return;
            clearTimeout(timer);
            lastActivity = Math.max(lastActivity, readLastActivity(token) ?? 0);
            const idle = Date.now() - lastActivity;
            if (idle >= IDLE_LOGOUT_MS) return expire();
            warning = idle >= IDLE_WARNING_MS;
            setRemaining(warning ? Math.ceil((IDLE_LOGOUT_MS - idle) / 1000) : null);
            timer = setTimeout(check, warning ? Math.min(1000, IDLE_LOGOUT_MS - idle) : IDLE_WARNING_MS - idle);
        };
        const activity = () => {
            if (ended || document.visibilityState === 'hidden') return;
            lastActivity = Math.max(lastActivity, readLastActivity(token) ?? 0);
            if (Date.now() - lastActivity >= IDLE_WARNING_MS) {
                check();
                return;
            }
            if (warning) return;
            lastActivity = Date.now();
            if (lastActivity - lastWritten >= 1000) {
                writeLastActivity(token, lastActivity);
                lastWritten = lastActivity;
            }
        };
        extendRef.current = () => {
            lastActivity = Math.max(lastActivity, readLastActivity(token) ?? 0);
            if (Date.now() - lastActivity >= IDLE_LOGOUT_MS) return expire();
            lastActivity = Date.now();
            lastWritten = lastActivity;
            writeLastActivity(token, lastActivity);
            warning = false;
            check();
        };
        expireRef.current = expire;
        const sync = (event: StorageEvent) => { if (event.key === IDLE_ACTIVITY_KEY) check(); };
        const events = ['pointerdown', 'pointermove', 'keydown', 'input', 'scroll', 'touchstart', 'wheel'] as const;
        for (const event of events) window.addEventListener(event, activity, { passive: true, capture: true });
        window.addEventListener('storage', sync);
        window.addEventListener('focus', check);
        window.addEventListener('pageshow', check);
        document.addEventListener('visibilitychange', check);
        check();
        return () => {
            ended = true;
            clearTimeout(timer);
            for (const event of events) window.removeEventListener(event, activity, true);
            window.removeEventListener('storage', sync);
            window.removeEventListener('focus', check);
            window.removeEventListener('pageshow', check);
            document.removeEventListener('visibilitychange', check);
        };
    }, [loading, isAuthenticated, token]);

    return <Dialog open={remaining !== null && isAuthenticated} disableEscapeKeyDown aria-labelledby={titleId} aria-describedby={descriptionId} fullWidth maxWidth="xs">
        <DialogTitle id={titleId} sx={{ backgroundColor: '#34495e', color: 'white', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}><TimerOutlined color="warning" />Twoja sesja wkrótce wygaśnie</DialogTitle>
        <DialogContent>
            <Typography id={descriptionId} variant="body2">Od 9 minut nie wykryto aktywności. Przedłuż sesję, aby kontynuować pracę. Bez odpowiedzi nastąpi automatyczne wylogowanie po 10 minutach bezczynności.</Typography>
            <Box sx={{ mt: 2, mb: 1, textAlign: 'center' }}>
                <Typography variant="h4" component="div" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{Math.floor((remaining ?? 60) / 60)}:{String((remaining ?? 60) % 60).padStart(2, '0')}</Typography>
                <Typography variant="caption" color="text.secondary">do automatycznego wylogowania</Typography>
            </Box>
            <LinearProgress variant="determinate" value={((remaining ?? 60) / 60) * 100} color="warning" aria-label="Czas do wylogowania" aria-valuetext={`${remaining ?? 60} sekund`} sx={{ height: 8, borderRadius: 4 }} />
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button color="inherit" onClick={() => expireRef.current()}>Wyloguj teraz</Button>
            <Button variant="contained" onClick={() => extendRef.current()}>Przedłuż sesję</Button>
        </DialogActions>
    </Dialog>;
}
