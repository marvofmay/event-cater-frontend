import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
    test(`customer search and inline creation preserve event form at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'default', modules: ['events'], accesses: ['events'], permissions: ['events.view', 'events.update'] };
        const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
        await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
        const uuid = '00000000-0000-4000-8000-000000000001';
        let event = { uuid, title: 'Bankiet', date: '2026-11-04', timezone: 'Europe/Warsaw', status: 'draft', version: 1, customerUuid: null as string | null, customerName: null as string | null, location: {}, menu: [], contacts: [], equipment: [], staff: [], attachments: [] };
        const existing = { uuid: '00000000-0000-4000-8000-000000000002', name: 'Klient z bazy', nip: '1234567890', email: 'klient@example.test' };
        const created = { uuid: '00000000-0000-4000-8000-000000000003', name: 'Nowy organizator' };
        const searches: string[] = [];
        let eventSaves = 0, customerSaves = 0, failCreate = true;
        await page.route('**/api/**', route => {
            const url = new URL(route.request().url());
            if (url.pathname === '/api/event-customers') {
                if (route.request().method() === 'POST') {
                    customerSaves++;
                    expect(route.request().postDataJSON()).toEqual({ name: created.name, nip: '', regon: '', krs: '', city: '', street: '', postalCode: '', country: 'Polska', phone: '', email: '' });
                    if (failCreate) return route.fulfill({ status: 422, json: { message: 'Nie udało się dodać kontrahenta.' } });
                    return route.fulfill({ status: 201, json: created });
                }
                searches.push(url.searchParams.get('q') ?? '');
                return route.fulfill({ json: { items: url.searchParams.get('q')?.includes('Nowy') ? [] : [existing] } });
            }
            if (url.pathname === `/api/events/${uuid}`) {
                if (route.request().method() === 'PUT') {
                    eventSaves++;
                    const body = route.request().postDataJSON();
                    expect(body.customerUuid).toBe(created.uuid);
                    expect(body.customerName).toBe(created.name);
                    event = { ...event, ...body, version: event.version + 1 };
                }
                return route.fulfill({ json: event });
            }
            return route.fulfill({ json: { data: {}, items: [] } });
        });
        await page.goto(`/catering/events/${uuid}`);
        const field = page.getByRole('combobox', { name: 'Klient / organizator' });
        await expect(field).toBeVisible();
        expect(searches).toHaveLength(0);
        await field.fill('1234567890');
        await expect.poll(() => searches.includes('1234567890')).toBeTruthy();
        await page.getByRole('option', { name: /Klient z bazy/ }).click();
        await expect(field).toHaveValue(existing.name);
        await field.fill(created.name);
        await page.getByRole('button', { name: 'Dodaj kontrahenta', exact: true }).click();
        let dialog = page.getByRole('dialog');
        await expect(dialog.getByRole('textbox', { name: 'Nazwa', exact: true })).toHaveValue(created.name);
        await expect(dialog.getByRole('textbox', { name: 'Kraj', exact: true })).toHaveValue('Polska');
        for (const name of ['Miasto', 'Ulica i numer', 'Kod pocztowy']) await expect(dialog.getByRole('textbox', { name, exact: true })).toBeVisible();
        await expect(dialog.getByRole('textbox', { name: 'Adres', exact: true })).toHaveCount(0);
        await dialog.getByRole('button', { name: 'Anuluj', exact: true }).click();
        expect(customerSaves).toBe(0);
        expect(eventSaves).toBe(0);
        await field.fill(created.name);
        await page.getByRole('button', { name: 'Dodaj kontrahenta', exact: true }).click();
        dialog = page.getByRole('dialog');
        await dialog.getByRole('textbox', { name: 'Nazwa', exact: true }).fill('');
        await expect(dialog.getByRole('button', { name: 'Dodaj i wybierz' })).toBeDisabled();
        await dialog.getByRole('textbox', { name: 'Nazwa', exact: true }).fill(created.name);
        await dialog.getByRole('button', { name: 'Dodaj i wybierz' }).click();
        await expect(page.getByText('Nie udało się dodać kontrahenta.')).toBeVisible();
        await expect(dialog).toBeVisible();
        expect(eventSaves).toBe(0);
        failCreate = false;
        await dialog.getByRole('button', { name: 'Dodaj i wybierz' }).click();
        await expect(dialog).toHaveCount(0);
        await expect(field).toHaveValue(created.name);
        expect(eventSaves).toBe(0);
        await page.getByRole('button', { name: 'Zapisz dane wydarzenia', exact: true }).click();
        await expect.poll(() => eventSaves).toBe(1);
        await page.reload();
        await expect(field).toHaveValue(created.name);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    });
}

test('read-only event hides customer creation and makes no directory queries', async ({ page }) => {
    const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'default', modules: ['events'], accesses: ['events'], permissions: ['events.view'] };
    const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
    await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
    let searches = 0;
    const uuid = '00000000-0000-4000-8000-000000000001';
    await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/event-customers') searches++;
        return route.fulfill({ json: path === `/api/events/${uuid}` ? { uuid, title: 'Bankiet', date: '2026-11-04', status: 'draft', version: 1, timezone: 'Europe/Warsaw', customerName: 'Stary klient', location: {}, menu: [], contacts: [], equipment: [], staff: [], attachments: [] } : { data: {}, items: [] } });
    });
    await page.goto(`/catering/events/${uuid}`);
    await expect(page.getByRole('combobox', { name: 'Klient / organizator' })).toBeDisabled();
    await expect(page.getByRole('combobox', { name: 'Klient / organizator' })).toHaveValue('Stary klient');
    await expect(page.getByRole('button', { name: 'Dodaj kontrahenta', exact: true })).toHaveCount(0);
    expect(searches).toBe(0);
});
