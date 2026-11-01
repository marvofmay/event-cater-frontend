import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
    test(`event team has aligned actions, readable roles and responsive rows at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'default', modules: ['events'], accesses: ['events'], permissions: ['events.view', 'events.assign_event_staff'] };
        const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
        await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
        const event = {
            uuid: '00000000-0000-4000-8000-000000000001', title: 'Wystawa', date: '2026-11-04', timezone: 'Europe/Warsaw', status: 'draft', version: 1, guestCount: 50,
            readyAt: '2026-11-04T16:00:00+01:00', startsAt: '2026-11-04T16:00:00+01:00', endsAt: '2026-11-04T20:00:00+01:00',
            location: { venue: '', street: '', city: '', postalCode: '', instructions: '' }, contacts: [], menu: [], attachments: [], equipment: [],
            staff: [
                { uuid: 'staff-1', employeeUuid: 'employee-1', employeeName: 'Dariusz Kowalski', functions: ['driver', 'logistics'], startsAt: '2026-11-04T16:00:00+01:00', endsAt: '2026-11-04T20:00:00+01:00', notes: null },
                { uuid: 'staff-2', employeeUuid: 'employee-2', employeeName: 'Diana', functions: ['waiter'], startsAt: '2026-11-04T16:00:00+01:00', endsAt: '2026-11-05T01:00:00+01:00', notes: 'Wejście od zaplecza' },
            ],
        };
        await page.route('**/api/**', route => route.fulfill({ json: new URL(route.request().url()).pathname === `/api/events/${event.uuid}` ? event : { data: {}, items: [] } }));
        await page.goto(`/catering/events/${event.uuid}`);
        await page.getByRole('navigation', { name: 'Zakładki wydarzenia' }).getByRole('button', { name: 'Zespół', exact: true }).click();
        const team = page.getByRole('list', { name: 'Zespół wydarzenia' });
        const dariusz = team.getByRole('listitem', { name: 'Dariusz Kowalski', exact: true });
        const diana = team.getByRole('listitem', { name: 'Diana', exact: true });
        await expect(dariusz.getByText('Kierowca', { exact: true })).toBeVisible();
        await expect(dariusz.getByText('Logistyka', { exact: true })).toBeVisible();
        await expect(diana.getByText('Kelner / kelnerka', { exact: true })).toBeVisible();
        await expect(diana).toContainText('2026-11-05 01:00');
        const firstAction = await dariusz.getByRole('button', { name: 'Zmień przydział', exact: true }).boundingBox();
        const secondAction = await diana.getByRole('button', { name: 'Zmień przydział', exact: true }).boundingBox();
        expect(Math.abs(firstAction!.x - secondAction!.x)).toBeLessThanOrEqual(1);
        expect(await team.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
        await page.screenshot({ path: `/tmp/event-team-layout-${width}.png`, fullPage: true });
        await diana.getByRole('button', { name: 'Zmień przydział', exact: true }).click();
        await expect(page.getByRole('combobox', { name: 'Pracownik' })).toHaveValue('Diana');
        await expect(page.getByLabel('Uwagi do przydziału')).toHaveValue('Wejście od zaplecza');
        await diana.getByRole('button', { name: 'Usuń przydział', exact: true }).click();
        await expect(page.getByRole('dialog', { name: 'Usunąć przydział pracownika?' })).toBeVisible();
    });
}
