import { expect, test } from '@playwright/test';

test('forgot-password dialog uses the selected company, prefills login and shows a generic confirmation', async ({ page }) => {
    let requests = 0;
    await page.route('**/api/**', route => {
        const request = route.request();
        if (new URL(request.url()).pathname === '/api/auth/password-reset/request') {
            requests++;
            expect(request.headers()['x-tenant']).toBe('mapa-smakow');
            expect(request.postDataJSON()).toEqual({ login: '123456789' });
            return route.fulfill({ status: 202, json: { message: 'Jeśli konto ma przypisany e-mail, otrzymasz link.' } });
        }
        return route.fulfill({ json: { items: [{ slug: 'mapa-smakow', name: 'Mapa Smaków' }] } });
    });
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Login', exact: true }).fill('123456789');
    await page.getByRole('button', { name: 'Zapomniałeś hasła?' }).click();
    const dialog = page.getByRole('dialog', { name: 'Odzyskaj dostęp do konta' });
    await expect(dialog.getByLabel(/^Login lub e-mail/)).toHaveValue('123456789');
    await dialog.getByRole('button', { name: 'Wyślij link' }).click();
    await expect(dialog.getByRole('alert')).toContainText('Jeśli konto ma przypisany e-mail');
    await expect(dialog.getByRole('button', { name: 'Wyślij link' })).toHaveCount(0);
    expect(requests).toBe(1);
});

for (const loggedIn of [false, true]) {
    test(`reset link sets a password with live rules and no automatic login (initial session: ${loggedIn})`, async ({ page }) => {
        if (loggedIn) {
            const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'mapa-smakow', modules: [], accesses: [], permissions: [], mustChangePassword: true };
            const jwt = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
            await page.addInitScript(value => localStorage.setItem('auth_token', value), jwt);
        }
        const secret = 'a'.repeat(64);
        let resetRequests = 0;
        await page.route('**/api/**', route => {
            if (new URL(route.request().url()).pathname === '/api/auth/password-reset/confirm') {
                resetRequests++;
                expect(route.request().headers()['x-tenant']).toBe('mapa-smakow');
                expect(route.request().postDataJSON()).toEqual({ token: secret, newPassword: 'Haslo12!', confirmation: 'Haslo12!' });
                return route.fulfill({ json: { message: 'Hasło zostało zmienione. Zaloguj się nowym hasłem.' } });
            }
            return route.fulfill({ json: { items: [{ slug: 'mapa-smakow', name: 'Mapa Smaków' }], data: {} } });
        });
        await page.goto(`/reset-password#token=${secret}&tenant=mapa-smakow`);
        await expect(page).toHaveURL('/reset-password');
        await expect(page.getByRole('dialog', { name: 'Ustaw własne hasło' })).toHaveCount(0);
        const save = page.getByRole('button', { name: 'Zapisz nowe hasło' });
        await expect(save).toBeDisabled();
        await page.getByLabel(/^Nowe hasło/).fill('Haslo12!');
        await expect(page.getByRole('checkbox', { name: 'Co najmniej jedna duża litera' })).toBeChecked();
        await expect(save).toBeDisabled();
        await page.getByLabel(/^Powtórz nowe hasło/).fill('Haslo12!');
        await save.click();
        await expect(page).toHaveURL('/login');
        expect(resetRequests).toBe(1);
        expect(await page.evaluate(() => localStorage.getItem('auth_token'))).toBeNull();
        expect(await page.evaluate(() => localStorage.getItem('selected_tenant'))).toBe('mapa-smakow');
        await expect(page.getByRole('alert').filter({ hasText: 'Hasło zostało zmienione.' })).toBeVisible();
    });
}

test('reset page handles an expired link and rejects an incomplete link without submitting', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/**', route => {
        if (new URL(route.request().url()).pathname === '/api/auth/password-reset/confirm') {
            calls++;
            return route.fulfill({ status: 422, json: { message: 'Link jest nieprawidłowy, wygasł lub został już wykorzystany. Poproś o nowy link.' } });
        }
        return route.fulfill({ json: { items: [] } });
    });
    await page.goto(`/reset-password#token=${'b'.repeat(64)}&tenant=mapa-smakow`);
    await page.getByLabel(/^Nowe hasło/).fill('Haslo12!');
    await page.getByLabel(/^Powtórz nowe hasło/).fill('Haslo12!');
    await page.getByRole('button', { name: 'Zapisz nowe hasło' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Poproś o nowy link.' })).toBeVisible();
    await page.goto('/reset-password#token=bad&tenant=mapa-smakow');
    await expect(page.getByRole('alert').filter({ hasText: 'Link jest nieprawidłowy lub niekompletny' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zapisz nowe hasło' })).toHaveCount(0);
    expect(calls).toBe(1);
});
