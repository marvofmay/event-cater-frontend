import { expect, test } from '@playwright/test';

test('technical administrator settings edit tenant defaults only', async ({ page }) => {
    const claims = { exp: Math.floor(Date.now() / 1000) + 3600, user: { technicalAdministrator: true }, tenantSlug: 'mapa-smakow', tenantName: 'Mapa Smaków', modules: ['company', 'system'], accesses: ['settings', 'companies'], permissions: ['companies.*'] };
    const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
    await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
    let saves = 0;
    await page.route('**/api/**', route => {
        if (new URL(route.request().url()).pathname === '/api/preferences/companies') {
            if (route.request().method() === 'PUT') {
                expect(route.request().postDataJSON()).toEqual({ scope: 'tenant', version: 3, pageSize: 50 });
                saves++;
            }
            return route.fulfill({ json: { data: { tenant: { pageSize: 25 }, user: { pageSize: 5 }, effective: { pageSize: 5 }, canManageTenant: true, tenantVersion: 3, userVersion: 2 } } });
        }
        return route.fulfill({ json: { data: { pageSizes: {} } } });
    });
    await page.goto('/settings/companies');
    await expect(page.getByText('Mapa Smaków · Ustawienia globalne dla tej firmy.')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Moje ustawienia' })).toHaveCount(0);
    const size = page.getByRole('combobox', { name: 'Rekordów na stronę' });
    await expect(size).toHaveText('25');
    await size.click();
    await expect(page.getByRole('option', { name: /^Ustawienie firmy/ })).toHaveCount(0);
    await page.getByRole('option', { name: '50', exact: true }).click();
    await page.getByRole('button', { name: 'Zapisz ustawienia', exact: true }).click();
    await expect.poll(() => saves).toBe(1);
});

test('nontechnical users manage personal preferences without catalog access', async ({ page }) => {
    const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'mapa-smakow', tenantName: 'Mapa Smaków', modules: ['company'], accesses: ['company_structure'], permissions: ['company_structure.view'] };
    const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
    await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
    const saves: unknown[] = [];
    await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        if (path.startsWith('/api/preferences/')) {
            if (route.request().method() === 'PUT') saves.push(route.request().postDataJSON());
            return route.fulfill({ json: { data: { tenant: { pageSize: 25, channels: { sms: false, email: true, internal: true } }, user: { pageSize: null, channels: { sms: null, email: null, internal: null } }, effective: { pageSize: 25, channels: { sms: false, email: true, internal: true } }, canManageTenant: true, tenantVersion: 0, userVersion: 0 } } });
        }
        return route.fulfill({ json: { data: { pageSizes: {}, items: [], total: 0 } } });
    });
    await page.goto('/settings/companies');
    await expect(page).toHaveURL(/\/me\/settings\?section=companies$/);
    await expect(page.getByRole('tab', { name: 'Firmy', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Domyślne firmy' })).toHaveCount(0);
    await page.getByRole('tab', { name: 'Powiadomienia', exact: true }).click();
    const panel = page.getByRole('main').last();
    await expect(panel.getByRole('switch')).toHaveCount(3);
    await panel.getByRole('switch', { name: 'E-mail', exact: true }).click();
    await panel.getByRole('button', { name: 'Zapisz ustawienia', exact: true }).click();
    await expect.poll(() => saves.length).toBe(1);
    expect(saves[0]).toMatchObject({ scope: 'user', channels: { email: false } });
});
