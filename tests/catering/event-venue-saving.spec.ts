import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
    test(`saving a venue clearly creates a separate entry at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'default', modules: ['events'], accesses: ['events', 'venues'], permissions: ['events.view', 'events.update', 'venues.create'] };
        const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
        await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
        const uuid = '00000000-0000-4000-8000-000000000001';
        const event = { uuid, title: 'Bankiet', date: '2026-11-04', timezone: 'Europe/Warsaw', status: 'draft', version: 1, location: { venue: 'Sala z bazy', street: 'Długa 1', city: 'Warszawa', postalCode: '00-001', instructions: '' }, menu: [], contacts: [], equipment: [], staff: [], attachments: [] };
        let saves = 0;
        await page.route('**/api/**', route => {
            const path = new URL(route.request().url()).pathname;
            if (path === `/api/events/${uuid}/save-venue`) {
                expect(route.request().method()).toBe('POST');
                expect(route.request().postDataJSON().name).toBe('Kopia sali');
                saves++;
                return route.fulfill({ status: 201, json: { uuid: 'new-venue' } });
            }
            return route.fulfill({ json: path === `/api/events/${uuid}` ? event : { data: {}, items: [] } });
        });
        await page.goto(`/catering/events/${uuid}`);
        const name = page.getByRole('textbox', { name: 'Nazwa nowego miejsca', exact: true });
        await expect(name).not.toBeVisible();
        await page.getByText('Dodaj aktualne miejsce jako nowe w bazie', { exact: true }).click();
        await expect(page.getByText(/Nie nadpisuje wcześniej wczytanego miejsca/)).toBeVisible();
        await name.fill('Kopia sali');
        const add = page.getByRole('button', { name: 'Dodaj nowe miejsce do bazy', exact: true });
        await expect(add).toBeEnabled();
        await page.getByRole('textbox', { name: 'Tytuł wydarzenia', exact: true }).fill('Niezapisana zmiana');
        await expect(add).toBeDisabled();
        expect(saves).toBe(0);
        await page.reload();
        await page.getByText('Dodaj aktualne miejsce jako nowe w bazie', { exact: true }).click();
        await name.fill('Kopia sali');
        await add.click();
        await expect.poll(() => saves).toBe(1);
        await expect(page.getByText('Dodano nowe miejsce do bazy. Dotychczasowe wpisy pozostały bez zmian.')).toBeVisible();
        await expect(name).toHaveValue('');
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    });
}
