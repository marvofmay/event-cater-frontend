import { expect, test } from '@playwright/test';

function token(mustChangePassword: boolean, permissions = ['notes.list']) {
    const payload = {
        exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'mapa-smakow', tenantName: 'Mapa Smaków',
        user: { uuid: '00000000-0000-4000-8000-000000000001', email: null },
        employee: { uuid: '00000000-0000-4000-8000-000000000002', firstName: 'Diana', lastName: 'Nowak' },
        roles: ['Pracownik'], modules: ['notes', 'company', 'events'], accesses: ['notes', 'companies', 'employees', 'events', 'manage'],
        permissions, mustChangePassword,
    };
    return [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(payload)).toString('base64url'), 'test'].join('.');
}

test('phone login requires password dialog, checks rules live and unlocks only permitted dashboard links', async ({ page }) => {
    const initial = token(true);
    const renewed = token(false);
    let attempts = 0;
    await page.route('**/api/**', route => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path === '/api/saas/tenant-options') return route.fulfill({ json: { items: [{ slug: 'mapa-smakow', name: 'Mapa Smaków' }] } });
        if (path === '/api/login') {
            expect(request.postDataJSON()).toEqual({ email: '123456789', password: '11111111111' });
            expect(request.headers()['x-tenant']).toBe('mapa-smakow');
            return route.fulfill({ json: { token: initial } });
        }
        if (path === '/api/auth/change-password') {
            expect(request.headers().authorization).toBe(`Bearer ${initial}`);
            expect(request.postDataJSON()).toEqual({ currentPassword: '11111111111', newPassword: 'WlasneHaslo2026!Nowe', confirmation: 'WlasneHaslo2026!Nowe' });
            attempts++;
            if (attempts === 1) return route.fulfill({ status: 422, json: { message: 'Obecne hasło jest nieprawidłowe.' } });
            return route.fulfill({ json: { token: renewed } });
        }
        return route.fulfill({ json: { data: { pageSizes: {} } } });
    });
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Login', exact: true }).fill('123456789');
    await page.locator('#password').fill('11111111111');
    await page.locator('button[type="submit"]').click();
    const dialog = page.getByRole('dialog', { name: 'Ustaw własne hasło' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('link', { name: 'notatki', exact: true })).toHaveCount(0);
    const save = dialog.getByRole('button', { name: 'Zapisz nowe hasło' });
    await expect(save).toBeDisabled();
    await dialog.getByLabel(/^Obecne hasło/).fill('11111111111');
    await dialog.getByLabel(/^Nowe hasło/).fill('WlasneHaslo2026!Nowe');
    await expect(dialog.getByRole('checkbox', { name: 'Co najmniej jedna duża litera' })).toBeChecked();
    await expect(dialog.getByRole('checkbox', { name: 'Potwierdzenie hasła jest zgodne' })).not.toBeChecked();
    await expect(save).toBeDisabled();
    await dialog.getByLabel(/^Powtórz nowe hasło/).fill('WlasneHaslo2026!Nowe');
    await expect(dialog.locator('input[type="checkbox"]:checked')).toHaveCount(8);
    await save.click();
    await expect(dialog.getByText('Obecne hasło jest nieprawidłowe.', { exact: true })).toBeVisible();
    await save.click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Notatki', exact: true })).toBeVisible();
    await expect(page.locator('a[href="/module/events"]')).toHaveCount(0);
    await expect(page.locator('a[href="/module/company"]')).toHaveCount(0);
    await expect(page.getByLabel('Twoje role')).toContainText('Pracownik');
    expect(await page.evaluate(() => localStorage.getItem('auth_token'))).toBe(renewed);
    await page.reload();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Notatki', exact: true })).toBeVisible();
});

test('first-login requirement also blocks direct page access and survives reload', async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem('auth_token', value), token(true));
    let employeeRequests = 0;
    await page.route('**/api/**', route => {
        if (new URL(route.request().url()).pathname === '/api/employees') employeeRequests++;
        return route.fulfill({ json: { data: {} } });
    });
    await page.goto('/manage/employees/list');
    await expect(page.getByRole('dialog', { name: 'Ustaw własne hasło' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('dialog', { name: 'Ustaw własne hasło' })).toBeVisible();
    expect(employeeRequests).toBe(0);
    await page.getByRole('button', { name: 'Wyloguj się', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('auth_token'))).toBeNull();
});

test('employee list access stays in management and does not replace the structure tile', async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem('auth_token', value), token(false, ['employees.list']));
    await page.route('**/api/**', route => route.fulfill({ json: { data: {} } }));
    await page.goto('/');
    await expect(page.locator('a[href="/module/company"]')).toHaveCount(0);
    await expect(page.locator('a[href="/manage/employees/list"]')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Zarządzanie firmą' })).toHaveCount(0);
    await expect(page.locator('a[href="/module/notes"]')).toHaveCount(0);
    await page.getByRole('button', { name: 'zarządzanie', exact: true }).click();
    await expect(page.getByRole('menuitem', { name: 'pracownicy', exact: true })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'firmy', exact: true })).toHaveCount(0);
});
