import { useEffect, useState } from 'react';
import { useUser } from '@/app/context/userContext';
import { AVATAR_UPDATED, userAvatarUrl } from '@/app/utils/userAvatar';

export function useNavigationAvatar() {
    const { token, mustChangePassword } = useUser();
    const [avatar, setAvatar] = useState<{ token: string; url?: string } | null>(null);

    useEffect(() => {
        if (!token || mustChangePassword) return;
        let controller: AbortController | undefined;
        const refresh = async () => {
            controller?.abort();
            controller = new AbortController();
            const signal = controller.signal;
            try {
                const response = await fetch('/api/me/avatar', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal });
                if (!response.ok) return;
                const body = await response.json();
                if (!signal.aborted) setAvatar({ token, url: userAvatarUrl(body.data) });
            } catch {
                if (!signal.aborted) setAvatar(null);
            }
        };
        void refresh();
        window.addEventListener(AVATAR_UPDATED, refresh);
        return () => {
            controller?.abort();
            window.removeEventListener(AVATAR_UPDATED, refresh);
        };
    }, [token, mustChangePassword]);

    return !mustChangePassword && avatar?.token === token ? avatar?.url : undefined;
}
