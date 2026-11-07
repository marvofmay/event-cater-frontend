import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
    test(`notification tabs separate settings and preserve template drafts at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1100 });
        const claims = { exp: Math.floor(Date.now() / 1000) + 3600, user: { technicalAdministrator: true }, tenantSlug: 'mapa-smakow', tenantName: 'Mapa Smaków', modules: ['system'], accesses: ['settings', 'notifications', 'notification_templates'], permissions: ['notification_templates.list', 'notification_templates.settings'] };
        const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
        await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
        const rows = ['EmployeeImportedEvent', 'CompanyImportedEvent'].flatMap(eventName => ['internal', 'email', 'sms'].flatMap(channelCode => [true, false].map(isDefault => ({ uuid: `${eventName}-${channelCode}-${isDefault}`, eventName, channelCode, isDefault, isActive: isDefault, title: isDefault ? 'Import {{importKind}}' : 'Własny tytuł', content: isDefault ? 'Wynik: {{importStatus}}' : 'Własna treść' }))));
        const eventRows = [
            { eventName: 'EmployeeImportedEvent', label: 'Import pracowników', enabled: true, channels: [{ channelCode: 'internal', active: true, globallyEnabled: true }, { channelCode: 'email', active: true, globallyEnabled: true }], variables: ['importKind', 'importStatus'] },
            { eventName: 'CompanyImportedEvent', label: 'Import firm', enabled: true, channels: [{ channelCode: 'internal', active: true, globallyEnabled: true }, { channelCode: 'email', active: true, globallyEnabled: true }], variables: ['importKind', 'importStatus'] },
        ];
        let requests = 0, saves = 0, failSave = true;
        await page.route('**/api/**', route => {
            const path = new URL(route.request().url()).pathname;
            if (path === '/api/preferences/notifications') return route.fulfill({ json: { data: { tenant: { pageSize: 25, channels: { sms: false, email: true, internal: true }, sms: { sender: 'Firma', quotaMode: 'monthly', limit: 100, used: 5, remaining: 95, period: '2026-11', hasApiKey: true } }, user: { pageSize: null }, effective: { pageSize: 25 }, tenantVersion: 1, userVersion: 0 } } });
            if (path === '/api/settings/notification-events') return route.fulfill({ json: { data: { items: eventRows, total: eventRows.length } } });
            if (path.startsWith('/api/settings/notification-events/') && path.endsWith('/channels') && route.request().method() === 'PUT') {
                return route.fulfill({ status: 200, json: { message: 'Zapisano kanały' } });
            }
            if (path === '/api/settings/notification-templates') {
                if (route.request().method() === 'PUT') {
                    const body = route.request().postDataJSON();
                    expect(body).toMatchObject({ eventName: 'EmployeeImportedEvent', channelCode: 'internal', searchDefault: false, markAsActive: true, title: 'Raport {{importKind}}', content: 'Status: {{importStatus}}\nDziękujemy.' });
                    if (failSave) return route.fulfill({ status: 500, json: { message: 'Nie udało się zapisać szablonu.' } });
                    for (const row of rows.filter(row => row.eventName === body.eventName && row.channelCode === body.channelCode)) {
                        row.isActive = row.isDefault === body.searchDefault;
                        if (row.isDefault === body.searchDefault) { row.title = body.title; row.content = body.content; }
                    }
                    saves++;
                    return route.fulfill({ status: 201, json: { message: 'Zapisano' } });
                }
                requests++;
                return route.fulfill({ json: { data: { items: rows, total: rows.length, page: 1, limit: 100 } } });
            }
            return route.fulfill({ json: { data: { pageSizes: {}, items: [], total: 0 } } });
        });
        await page.goto('/settings/notifications');
        const tabs = page.getByRole('tablist', { name: 'Ustawienia powiadomień', exact: true });
        await expect(tabs.getByRole('tab')).toHaveCount(4);
        await expect(page.getByRole('switch')).toHaveCount(3);
        await expect(page.getByRole('textbox', { name: 'Klucz API Brevo' })).not.toBeVisible();
        expect(requests).toBe(0);
        await tabs.getByRole('tab', { name: 'Lista', exact: true }).click();
        await expect(page.getByRole('combobox', { name: /^Rekordów na stronę/ })).toBeVisible();
        await expect(page.getByRole('switch', { name: 'Systemowe' })).not.toBeVisible();
        await tabs.getByRole('tab', { name: 'Tytuły i treści', exact: true }).click();
        const title = page.getByRole('textbox', { name: /^Tytuł powiadomienia/ });
        await expect(title).toHaveValue('Import {{importKind}}');
        const loadedRequests = requests;
        expect(loadedRequests).toBeGreaterThan(0);
        await expect(page.getByText('Aktywne kanały dla zdarzenia')).toBeVisible();
        await page.getByRole('combobox', { name: /^Wariant szablonu/ }).click();
        await page.getByRole('option', { name: 'Własny', exact: true }).click();
        await expect(title).toHaveValue('Własny tytuł');
        await page.getByRole('switch', { name: 'Używaj tego wariantu szablonu', exact: true }).click();
        await title.fill('Raport {{importKind}}');
        await page.getByRole('textbox', { name: /^Treść powiadomienia/ }).fill('Status: {{importStatus}}\nDziękujemy.');
        await expect(page.getByText('Raport pracowników', { exact: true })).toBeVisible();
        await expect(page.getByText('Podgląd na przykładowych danych - nic nie zostanie wysłane')).toBeVisible();
        await tabs.getByRole('tab', { name: 'SMS / Brevo', exact: true }).click();
        await expect(page.getByLabel('Klucz API Brevo', { exact: true })).toBeVisible();
        await tabs.getByRole('tab', { name: 'Tytuły i treści', exact: true }).click();
        await expect(title).toHaveValue('Raport {{importKind}}');
        expect(requests).toBe(loadedRequests);
        const save = page.getByRole('button', { name: 'Zapisz szablon', exact: true });
        await save.click();
        await expect(page.getByText('Nie udało się zapisać szablonu.')).toBeVisible();
        await expect(title).toHaveValue('Raport {{importKind}}');
        failSave = false;
        await save.click();
        await expect.poll(() => saves).toBe(1);
        await expect(save).toBeDisabled();
        await page.reload();
        await tabs.getByRole('tab', { name: 'Tytuły i treści', exact: true }).click();
        await expect(title).toHaveValue('Raport {{importKind}}');
        await expect(page.getByText('Obecnie aktywny', { exact: true })).toBeVisible();
        expect(await page.getByRole('main').last().evaluate(panel => panel.scrollWidth <= panel.clientWidth)).toBeTruthy();
    });
}

test('template read permission allows preview but not edits', async ({ page }) => {
    const claims = { exp: Math.floor(Date.now() / 1000) + 3600, user: { technicalAdministrator: true }, tenantSlug: 'default', modules: ['system'], permissions: ['notification_templates.list'] };
    const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
    await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
    await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/settings/notification-templates') {
            return route.fulfill({ json: { data: { items: [{ uuid: 'one', eventName: 'EmployeeImportedEvent', channelCode: 'internal', title: 'Tytuł', content: 'Treść', isActive: true, isDefault: true }], total: 1 } } });
        }
        if (path === '/api/settings/notification-events') {
            return route.fulfill({ json: { data: { items: [{ eventName: 'EmployeeImportedEvent', label: 'Import pracowników', enabled: true, channels: [{ channelCode: 'internal', active: true, globallyEnabled: true }], variables: ['importKind', 'importStatus'] }] } } });
        }
        return route.fulfill({ json: { data: { tenant: { pageSize: 25, channels: { internal: true, email: false, sms: false } }, user: { pageSize: null }, effective: { pageSize: 25 }, tenantVersion: 0, userVersion: 0 } } });
    });
    await page.goto('/settings/notifications');
    await page.getByRole('tab', { name: 'Tytuły i treści', exact: true }).click();
    await expect(page.getByRole('textbox', { name: /^Tytuł powiadomienia/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Zapisz szablon', exact: true })).toHaveCount(0);
});
