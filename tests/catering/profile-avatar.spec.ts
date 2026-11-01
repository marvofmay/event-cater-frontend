import { expect, test } from '@playwright/test';

test('avatar upload reports failures without an unhandled error and can be retried', async ({ page }) => {
    const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'mapa-smakow', tenantName: 'Mapa Smaków', user: { uuid: '00000000-0000-4000-8000-000000000001' }, modules: [], accesses: [], permissions: [] };
    const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
    await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let attempts = 0;
    let saved = false;
    await page.route('**/upload/avatars/header.png', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=', 'base64') }));
    await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/me/avatar') {
            if (route.request().method() === 'GET') return route.fulfill({ json: { data: saved ? { avatarType: 'custom', avatarPath: 'avatars/header.png', defaultAvatar: null } : null } });
            attempts++;
            expect(route.request().method()).toBe('PATCH');
            expect(route.request().headers().authorization).toBe(`Bearer ${token}`);
            expect(route.request().postDataBuffer()?.toString()).toContain('name="uploadedFile"; filename="avatar.png"');
            saved = attempts > 1;
            return route.fulfill(attempts === 1 ? { status: 500, json: { message: 'Nie udało się zapisać pliku.' } } : { json: { message: 'Zapisano zdjęcie profilowe.' } });
        }
        if (path === '/api/me/data') return route.fulfill({ json: { data: {
            userUUID: claims.user.uuid, email: 'anna@example.test', employee: {
                uuid: '00000000-0000-4000-8000-000000000002', firstName: 'Anna', lastName: 'Nowak', contacts: [],
                employment: { position: 'Kucharz', role: 'Pracownik', contractType: null, employmentFrom: null, employmentTo: null, parentEmployee: null },
                address: { city: '', postcode: '', street: '', country: '' },
                avatar: { avatarType: 'default', defaultAvatar: null, avatarPath: null },
            },
        } } });
        return route.fulfill({ json: { data: { pageSizes: {} }, items: [] } });
    });
    await page.goto('/me/data');
    await page.locator('input[type="file"]').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=', 'base64') });
    const save = page.getByRole('button', { name: 'zapisz', exact: true });
    await save.click();
    await expect(page.getByRole('alert').filter({ hasText: 'Nie udało się zaktualizować avatara' })).toBeVisible();
    await expect(save).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Menu użytkownika' }).getByTestId('Person2Icon')).toBeVisible();
    await save.click();
    await expect(page.getByRole('alert').filter({ hasText: 'Zapisano zdjęcie profilowe.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Menu użytkownika' }).getByRole('img', { name: 'Avatar użytkownika' })).toHaveAttribute('src', /\/upload\/avatars\/header.png$/);
    expect(attempts).toBe(2);
    expect(errors).toEqual([]);
});

for (const avatarType of ['custom', 'default', 'none'] as const) {
    test(`profile menu shows the saved ${avatarType} avatar after page load`, async ({ page }) => {
        const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'mapa-smakow', user: { uuid: '00000000-0000-4000-8000-000000000001' }, modules: [], accesses: [], permissions: [] };
        const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
        await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
        await page.route('**/upload/avatars/header.png', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=', 'base64') }));
        await page.route('**/api/**', route => {
            if (new URL(route.request().url()).pathname === '/api/me/avatar') {
                expect(route.request().headers().authorization).toBe(`Bearer ${token}`);
                return route.fulfill({ json: { data: avatarType === 'none' ? null : { avatarType, avatarPath: avatarType === 'custom' ? 'avatars/header.png' : null, defaultAvatar: avatarType === 'default' ? 'woman' : null } } });
            }
            return route.fulfill({ json: { data: {} } });
        });
        await page.goto('/');
        const menu = page.getByRole('button', { name: 'Menu użytkownika' });
        if (avatarType === 'none') await expect(menu.getByTestId('Person2Icon')).toBeVisible();
        else await expect(menu.getByRole('img', { name: 'Avatar użytkownika' })).toHaveAttribute('src', avatarType === 'custom' ? /\/upload\/avatars\/header.png$/ : '/icons/woman.png');
        await menu.click();
        await expect(page.getByRole('menuitem', { name: 'zmień hasło', exact: true })).toBeVisible();
    });
}
