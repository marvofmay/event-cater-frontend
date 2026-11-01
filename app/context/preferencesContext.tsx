"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useUser } from '@/app/context/userContext';

export type PreferenceResource = 'companies' | 'departments' | 'employees' | 'positions' | 'roles' | 'contractTypes' | 'industries' | 'notifications';
const PreferencesContext = createContext({ pageSizes: {} as Partial<Record<PreferenceResource, number>>, dashboardOrder: [] as string[], ready: false, refresh: async () => {} });

export function PreferencesProvider({ children }: { children: ReactNode }) {
    const { token, loading } = useUser();
    const [pageSizes, setPageSizes] = useState<Partial<Record<PreferenceResource, number>>>({});
    const [dashboardOrder, setDashboardOrder] = useState<string[]>([]);
    const [loadedToken, setLoadedToken] = useState<string | null>(null);
    const currentToken = useRef(token);
    currentToken.current = token;
    const refresh = useCallback(async (signal?: AbortSignal) => {
        if (!token) return;
        try {
            const response = await fetch('/api/preferences', { signal, headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
            if (response.ok) {
                const data = (await response.json()).data;
                if (signal?.aborted || currentToken.current !== token) return;
                setPageSizes(data?.pageSizes ?? {});
                setDashboardOrder(data?.dashboardOrder ?? []);
            }
        } catch {} finally {
            if (!signal?.aborted && currentToken.current === token) setLoadedToken(token);
        }
    }, [token]);
    useEffect(() => {
        const controller = new AbortController();
        setPageSizes({});
        setDashboardOrder([]);
        void refresh(controller.signal);
        return () => controller.abort();
    }, [refresh]);
    return <PreferencesContext.Provider value={{ pageSizes: loadedToken === token ? pageSizes : {}, dashboardOrder: loadedToken === token ? dashboardOrder : [], ready: !loading && (!token || loadedToken === token), refresh }}>{children}</PreferencesContext.Provider>;
}

export const usePreferences = () => useContext(PreferencesContext);

export function useTablePageSize(resource: PreferenceResource): [number, Dispatch<SetStateAction<number>>] {
    const { pageSizes } = usePreferences();
    const base = pageSizes[resource] ?? 5;
    const [override, setOverride] = useState<{ base: number; value: number } | null>(null);
    const size = override?.base === base ? override.value : base;
    const setSize: Dispatch<SetStateAction<number>> = value => setOverride({ base, value: typeof value === 'function' ? value(size) : value });
    return [size, setSize];
}
