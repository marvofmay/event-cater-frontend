import { expect, test, type Route } from '@playwright/test';

test('manual logout shows an info toast and redirects before a slow logout API responds', async ({ page }) => {
    const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'mapa-smakow', tenantName: 'Mapa Smaków', modules: [], accesses: [], permissions: [] };
    const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
    await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
    let pendingLogout: Route | undefined;
    let logoutRequests = 0;
    await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/logout') {
            logoutRequests++;
            expect(route.request().headers().authorization).toBe(`Bearer ${token}`);
            expect(route.request().headers()['x-tenant']).toBe('mapa-smakow');
            pendingLogout = route;
            return;
        }
        if (path === '/api/saas/tenant-options') return route.fulfill({ json: { items: [{ slug: 'mapa-smakow', name: 'Mapa Smaków' }] } });
        return route.fulfill({ json: { data: {} } });
    });
    await page.goto('/me/logout');
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('alert').filter({ hasText: 'Wylogowano pomyślnie.' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('auth_token'))).toBeNull();
    await expect.poll(() => logoutRequests).toBe(1);
    await pendingLogout!.fulfill({ status: 503, json: { message: 'Niedostępne' } });
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('alert').filter({ hasText: 'Wylogowano pomyślnie.' })).toHaveCount(1);
});
