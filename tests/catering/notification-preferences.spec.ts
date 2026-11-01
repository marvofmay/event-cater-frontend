import { expect, test } from '@playwright/test';

for (const ownSettings of [false, true]) {
    test(ownSettings ? 'notification switches preserve personal choices in personal settings' : 'notification switches start with company defaults and save personal choices', async ({ page }) => {
        const claims = { exp: Math.floor(Date.now() / 1000) + 3600, user: { technicalAdministrator: true }, tenantSlug: 'mapa-smakow', tenantName: 'Mapa Smaków', modules: ['system'], accesses: ['settings', 'notifications'], permissions: ['notifications.list'] };
        const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
        await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
        const tenant = { pageSize: 25, channels: { sms: false, email: true, internal: true } };
        const user = { pageSize: null, channels: { sms: null, email: ownSettings ? false : null, internal: null } as Record<string, boolean | null> };
        let saves = 0;
        const snapshot = () => ({ tenant, user, effective: { pageSize: 25, channels: { sms: false, email: user.channels.email ?? true, internal: user.channels.internal ?? true } }, canManageTenant: true, tenantVersion: 0, userVersion: saves });
        await page.route('**/api/**', route => {
            const path = new URL(route.request().url()).pathname;
            if (path === '/api/preferences/notifications') {
                if (route.request().method() === 'PUT') {
                    const body = route.request().postDataJSON();
                    expect(body.scope).toBe('user');
                    expect(body.channels).toEqual({ sms: null, email: ownSettings, internal: null });
                    user.channels = body.channels;
                    saves++;
                }
                return route.fulfill({ json: { data: snapshot() } });
            }
            return route.fulfill({ json: { data: { pageSizes: { notifications: 25 }, items: [], total: 0 } } });
        });
        await page.goto('/me/settings?section=notifications');
        const panel = page.getByRole('main').last();
        const sms = panel.getByRole('switch', { name: 'SMS', exact: true });
        const email = panel.getByRole('switch', { name: 'E-mail', exact: true });
        const internal = panel.getByRole('switch', { name: 'Systemowe', exact: true });
        await expect(panel.getByRole('switch')).toHaveCount(3);
        await expect(panel.getByRole('combobox')).toHaveCount(1);
        await expect(sms).not.toBeChecked();
        await expect(sms).toBeDisabled();
        await expect(internal).toBeChecked();
        if (ownSettings) {
            await expect(email).not.toBeChecked();
        } else {
            await expect(email).toBeChecked();
        }
        await email.click();
        await panel.getByRole('button', { name: 'Zapisz ustawienia', exact: true }).click();
        await expect.poll(() => saves).toBe(1);
        await expect(panel.getByRole('button', { name: 'Zapisz ustawienia', exact: true })).toBeEnabled();
        await page.reload();
        if (ownSettings) await expect(email).toBeChecked();
        else await expect(email).not.toBeChecked();
        await expect(internal).toBeChecked();
        await expect(sms).not.toBeChecked();
        await expect(panel).not.toContainText('dzwoneczek');
    });
}
