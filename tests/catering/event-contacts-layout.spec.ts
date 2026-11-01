import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
    test(`event contact fields and action buttons have consistent spacing at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'default', modules: ['events'], accesses: ['events'], permissions: ['events.view', 'events.update'] };
        const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
        await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
        let event = {
            uuid: '00000000-0000-4000-8000-000000000001', title: 'Wystawa', date: '2026-11-04', timezone: 'Europe/Warsaw', status: 'draft', version: 1, guestCount: 50,
            readyAt: '2026-11-04T16:00:00+01:00', startsAt: '2026-11-04T16:00:00+01:00', endsAt: '2026-11-04T20:00:00+01:00',
            location: { venue: '', street: '', city: '', postalCode: '', instructions: '' }, menu: [], attachments: [], equipment: [], staff: [],
            contacts: [{ name: 'Mariola Nowa', phone: '111111111', email: '', function: '' }, { name: 'Adam Czerwiński', phone: '222111333', email: '', function: '' }],
        };
        let saved = false;
        await page.route('**/api/**', route => {
            const path = new URL(route.request().url()).pathname;
            if (path === `/api/events/${event.uuid}/contacts` && route.request().method() === 'PUT') {
                const body = route.request().postDataJSON();
                expect(body.contacts.map((contact: { name: string }) => contact.name)).toEqual(['Mariola Nowa', 'Anna Nowak']);
                event = { ...event, contacts: body.contacts, version: event.version + 1 };
                saved = true;
                return route.fulfill({ json: event });
            }
            return route.fulfill({ json: path === `/api/events/${event.uuid}` ? event : { data: {}, items: [] } });
        });
        await page.goto(`/catering/events/${event.uuid}`);
        await page.getByRole('navigation', { name: 'Zakładki wydarzenia' }).getByRole('button', { name: 'Kontakty', exact: true }).click();
        const add = page.getByRole('button', { name: 'Dodaj kontakt', exact: true });
        const save = page.getByRole('button', { name: 'Zapisz kontakty', exact: true });
        const addBounds = await add.boundingBox();
        const saveBounds = await save.boundingBox();
        if (width >= 600) {
            expect(Math.abs(addBounds!.y - saveBounds!.y)).toBeLessThanOrEqual(1);
            expect(saveBounds!.x - (addBounds!.x + addBounds!.width)).toBeGreaterThanOrEqual(8);
        } else {
            expect(saveBounds!.y - (addBounds!.y + addBounds!.height)).toBeGreaterThanOrEqual(8);
        }
        await expect(page.getByRole('textbox', { name: 'Osoba do kontaktu' })).toHaveCount(2);
        await page.screenshot({ path: `/tmp/event-contacts-layout-${width}.png`, fullPage: true });
        await page.getByRole('button', { name: 'Usuń kontakt', exact: true }).last().click();
        await add.click();
        expect(saved).toBe(false);
        await page.getByRole('textbox', { name: 'Osoba do kontaktu' }).last().fill('Anna Nowak');
        await page.getByRole('textbox', { name: 'Telefon' }).last().fill('333222111');
        await save.click();
        await expect.poll(() => saved).toBe(true);
    });
}
