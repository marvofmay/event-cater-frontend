import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
    test(`saved coordinator name is visible and survives editing and reloading at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'default', modules: ['events'], accesses: ['events'], permissions: ['events.view', 'events.update', 'events.assign_event_staff'] };
        const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
        await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
        let event = {
            uuid: '00000000-0000-4000-8000-000000000001', title: 'Wystawa', date: '2026-11-04', timezone: 'Europe/Warsaw', status: 'draft', version: 1, guestCount: 50,
            readyAt: '2026-11-04T16:00:00+01:00', startsAt: '2026-11-04T17:00:00+01:00', endsAt: '2026-11-04T20:00:00+01:00',
            coordinatorUuid: '00000000-0000-4000-8000-000000000002', coordinatorName: 'Anna Katarzyna Kowalska',
            location: { venue: '', street: '', city: '', postalCode: '', instructions: '' }, menu: [], attachments: [], equipment: [], staff: [], contacts: [],
        };
        const replacement = { uuid: '00000000-0000-4000-8000-000000000003', name: 'Joanna Nowak' };
        let optionRequests = 0;
        await page.route('**/api/**', route => {
            const path = new URL(route.request().url()).pathname;
            if (path === '/api/events/staff-options') {
                optionRequests++;
                return route.fulfill({ json: { items: [replacement] } });
            }
            if (path === `/api/events/${event.uuid}`) {
                if (route.request().method() === 'PUT') {
                    const body = route.request().postDataJSON();
                    expect(body.coordinatorUuid).toBe(replacement.uuid);
                    event = { ...event, ...body, coordinatorName: replacement.name, version: event.version + 1 };
                }
                return route.fulfill({ json: event });
            }
            return route.fulfill({ json: { data: {}, items: [] } });
        });
        await page.goto(`/catering/events/${event.uuid}`);
        const coordinator = page.getByRole('combobox', { name: 'Koordynator', exact: true });
        await expect(coordinator).toHaveValue('Anna Katarzyna Kowalska');
        expect(optionRequests).toBe(0);
        if (width >= 900) expect((await coordinator.boundingBox())!.width).toBeGreaterThan(250);
        await coordinator.fill('Joanna');
        await page.getByRole('option', { name: replacement.name, exact: true }).click();
        await page.getByRole('button', { name: 'Zapisz dane wydarzenia', exact: true }).click();
        await expect.poll(() => event.version).toBe(2);
        await expect(coordinator).toHaveValue(replacement.name);
        await page.reload();
        await expect(coordinator).toHaveValue(replacement.name);
    });
}
