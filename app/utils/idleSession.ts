import { jwtDecode } from 'jwt-decode';

export const IDLE_WARNING_MS = 9 * 60 * 1000;
export const IDLE_LOGOUT_MS = 10 * 60 * 1000;
export const IDLE_ACTIVITY_KEY = 'auth:last-activity';

function sessionId(token: string): string {
    try {
        return jwtDecode<{ tokenUUID?: string }>(token).tokenUUID ?? token;
    } catch {
        return token;
    }
}

export function readLastActivity(token: string): number | null {
    try {
        const record = JSON.parse(localStorage.getItem(IDLE_ACTIVITY_KEY) ?? 'null');
        if (record?.session === sessionId(token) && typeof record.at === 'number' && Number.isFinite(record.at) && record.at > 0 && record.at <= Date.now()) return record.at;
    } catch {}
    return null;
}

export function writeLastActivity(token: string, at = Date.now()): void {
    try {
        localStorage.setItem(IDLE_ACTIVITY_KEY, JSON.stringify({ session: sessionId(token), at }));
    } catch {}
}
