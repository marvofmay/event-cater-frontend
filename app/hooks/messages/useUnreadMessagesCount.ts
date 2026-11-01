"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@/app/context/userContext';

export const MESSAGES_CHANGED = 'event-cater:messages-changed';
const STORAGE_KEY = 'event-cater:messages-refresh';

export function notifyMessagesChanged() {
    window.dispatchEvent(new Event(MESSAGES_CHANGED));
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch {}
}

export function useUnreadMessagesCount() {
    const { token, isAuthenticated, hasAccess, hasPermission } = useUser();
    const enabled = isAuthenticated && hasAccess('messages') && hasPermission('messages.list');
    const [snapshot, setSnapshot] = useState<{ token: string | null; count: number }>({ token: null, count: 0 });
    useEffect(() => {
        setSnapshot({ token, count: 0 });
        if (!enabled || !token) return;
        let current = true;
        let controller: AbortController | null = null;
        const refresh = async () => {
            if (document.visibilityState === 'hidden') return;
            controller?.abort();
            controller = new AbortController();
            const signal = controller.signal;
            try {
                const response = await fetch('/api/messages/unread-count', { signal, cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
                if (!response.ok) return;
                const body = await response.json();
                if (current && !signal.aborted && Number.isInteger(body.unreadCount)) setSnapshot({ token, count: Math.max(0, body.unreadCount) });
            } catch {}
        };
        const storage = (event: StorageEvent) => { if (event.key === STORAGE_KEY) void refresh(); };
        void refresh();
        const timer = window.setInterval(refresh, 15000);
        window.addEventListener(MESSAGES_CHANGED, refresh);
        window.addEventListener('storage', storage);
        window.addEventListener('focus', refresh);
        document.addEventListener('visibilitychange', refresh);
        return () => {
            current = false; controller?.abort(); window.clearInterval(timer);
            window.removeEventListener(MESSAGES_CHANGED, refresh);
            window.removeEventListener('storage', storage);
            window.removeEventListener('focus', refresh);
            document.removeEventListener('visibilitychange', refresh);
        };
    }, [token, enabled]);
    return enabled && snapshot.token === token ? snapshot.count : 0;
}
