import { expect, test } from '@playwright/test';

test('file manager persists folders, uploads and downloads through authorized API', async ({ page }) => {
    const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'mapa-smakow', tenantName: 'Mapa Smaków', modules: ['documents'], accesses: ['file_manager'], permissions: ['file_manager.*'] };
    const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
    await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
    let version = 1;
    let folders = 0;
    let uploads = 0;
    let downloads = 0;
    const items: { uuid: string; parentUuid: string | null; name: string; type: string; size: number; date: string }[] = [];
    await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path.startsWith('/api/file-manager')) expect(route.request().headers().authorization).toBe('Bearer ' + token);
        if (path === '/api/file-manager/folders') {
            const body = route.request().postDataJSON();
            expect(body.version).toBe(version);
            const uuid = '11111111-1111-4111-8111-111111111111';
            items.push({ uuid, parentUuid: body.parentUuid, name: body.name, type: 'folder', size: 0, date: '2026-11-01T12:00:00Z' });
            version++; folders++;
            return route.fulfill({ status: 201, json: { uuid } });
        }
        if (path === '/api/file-manager/upload') {
            expect(route.request().postDataBuffer()?.toString()).toContain('plan.txt');
            const uuid = '22222222-2222-4222-8222-222222222222';
            items.push({ uuid, parentUuid: null, name: 'plan.txt', type: 'file', size: 12, date: '2026-11-01T12:00:00Z' });
            version++; uploads++;
            return route.fulfill({ status: 201, json: { uuid } });
        }
        if (path.endsWith('/download')) {
            downloads++;
            return route.fulfill({ body: 'Plan testowy', contentType: 'text/plain' });
        }
        if (path === '/api/file-manager') return route.fulfill({ json: { items, version, usedBytes: 12 * uploads, maxBytes: 2147483648, maxEntries: 5000 } });
        return route.fulfill({ json: { data: { items: [], pageSizes: {} } } });
    });
    await page.goto('/module/file_manager');
    await expect(page.getByText('Widok demonstracyjny.', { exact: false })).toHaveCount(0);
    await page.getByText('Dodaj', { exact: true }).click();
    await page.getByText('Dodaj folder', { exact: true }).click();
    await page.locator('input').last().fill('Dokumenty');
    await page.getByText('OK', { exact: true }).click();
    await expect.poll(() => folders).toBe(1);
    await expect(page.locator('.wx-filemanager').getByText('Dokumenty', { exact: true }).first()).toBeVisible();
    await page.reload();
    await expect(page.locator('.wx-filemanager').getByText('Dokumenty', { exact: true }).first()).toBeVisible();
    await page.locator('input[type="file"]').first().setInputFiles({ name: 'plan.txt', mimeType: 'text/plain', buffer: Buffer.from('Plan testowy') });
    await expect.poll(() => uploads).toBe(1);
    const file = page.locator('.wx-filemanager').getByText('plan.txt', { exact: true }).first();
    await expect(file).toBeVisible();
    const pending = page.waitForEvent('download');
    await file.dblclick();
    const download = await pending;
    expect(download.suggestedFilename()).toBe('plan.txt');
    expect(downloads).toBe(1);
});

test('listing permission is required before the file API is requested', async ({ page }) => {
    const claims = { exp: Math.floor(Date.now() / 1000) + 3600, modules: ['documents'], accesses: ['file_manager'], permissions: [] };
    const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
    await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
    let requests = 0;
    await page.route('**/api/**', route => {
        if (new URL(route.request().url()).pathname.startsWith('/api/file-manager')) requests++;
        return route.fulfill({ json: { data: { items: [], pageSizes: {} } } });
    });
    await page.goto('/module/file_manager');
    await expect(page).toHaveURL(/\/forbidden$/);
    expect(requests).toBe(0);
});
