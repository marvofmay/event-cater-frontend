import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
    test(`event history explains changes at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'default', modules: ['events'], accesses: ['events'], permissions: ['events.view'] };
        const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
        await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
        const uuid = '00000000-0000-4000-8000-000000000001';
        await page.route('**/api/**', route => {
            const path = new URL(route.request().url()).pathname;
            if (path.endsWith('/history')) return route.fulfill({ json: { total: 3, items: [
                { uuid: 'change', action: 'details_replaced', actorName: 'Anna Kowalska', createdAt: '2026-10-31T12:30:00+00:00', revision: 3, details: { changes: { guestCount: { before: 50, after: 60 }, title: { before: 'Przyjęcie', after: 'Bankiet' } } } },
                { uuid: 'staff', action: 'staff_assigned', actorName: 'Jan Nowak', createdAt: '2026-10-31T12:00:00+00:00', revision: 2, details: { employeeName: 'Maria Testowa', notes: 'Obsługa sali' } },
                { uuid: 'created', action: 'created', createdAt: '2026-10-31T11:00:00+00:00', revision: 1, details: { title: 'Przyjęcie', guestCount: 50 } },
            ] } });
            if (path === `/api/events/${uuid}`) return route.fulfill({ json: { uuid, title: 'Bankiet', date: '2026-11-04', timezone: 'Europe/Warsaw', status: 'draft', version: 3, location: {}, menu: [], contacts: [], equipment: [], staff: [], attachments: [] } });
            return route.fulfill({ json: { data: {}, items: [] } });
        });
        await page.goto(`/catering/events/${uuid}`);
        await page.getByRole('button', { name: 'Historia', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Zmieniono dane wydarzenia' })).toBeVisible();
        await expect(page.getByText('Anna Kowalska')).toBeVisible();
        await expect(page.getByText('Liczba gości', { exact: true })).toBeVisible();
        await expect(page.getByText('Przed zmianą').first()).toBeVisible();
        await expect(page.getByText('Po zmianie').first()).toBeVisible();
        await expect(page.getByText('50', { exact: true })).toBeVisible();
        await expect(page.getByText('60', { exact: true })).toBeVisible();
        await expect(page.getByText('Pracownik:').first()).toBeVisible();
        await expect(page.getByText('Maria Testowa', { exact: false }).first()).toBeVisible();
        await expect(page.getByText('Użytkownik niedostępny')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    });
}
