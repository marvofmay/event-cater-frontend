import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
    test(`planner edits a simple list with one assignee and location autocomplete at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'default', modules: ['events', 'equipment'], accesses: ['events', 'equipment'], permissions: ['events.*', 'equipment.list'] };
        const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
        await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
        const eventUUID = '00000000-0000-4000-8000-000000000001';
        const event = { uuid: eventUUID, title: 'Wystawa', date: '2026-11-04', timezone: 'Europe/Warsaw', status: 'draft', version: 1, guestCount: 50, location: { venue: '', street: '', city: '', postalCode: '', instructions: '' }, contacts: [], menu: [], staff: [], equipment: [], attachments: [] };
        const lineUUID = '00000000-0000-4000-8000-000000000002';
        const assignee = { uuid: '00000000-0000-4000-8000-000000000003', name: 'Anna Kowalska' };
        let list = {
            uuid: 'list-1', eventUuid: eventUUID, version: 1, status: 'approved', responsibleUuid: assignee.uuid, responsibleName: assignee.name,
            deadlineAt: null, notes: null, summary: { hasShortages: true, hasSurplus: false }, acceptedShortagesReason: null,
            lines: [{ uuid: lineUUID, kind: 'equipment', itemUuid: 'equipment-1', name: 'Bulionówka', code: 'BUL', unit: 'piece', requiredQuantity: '60.000', preparedQuantity: '0.000', loadedQuantity: '0.000', missingToPrepare: '60.000', missingToLoad: '60.000', sourceLocation: 'Za barem', instructions: '', responsibleUuid: null, responsibleName: null }],
        };
        let edits = 0;
        let progressUpdates = 0;
        await page.route('**/api/**', route => {
            const request = route.request();
            const url = new URL(request.url());
            const path = `/api/events/${eventUUID}/preparation`;
            if (url.pathname === `/api/events/${eventUUID}`) return route.fulfill({ json: event });
            if (url.pathname === `${path}/staff-options`) return route.fulfill({ json: { items: [assignee] } });
            if (url.pathname === '/api/equipment-locations') return route.fulfill({ json: { items: [{ uuid: 'location-1', name: 'Na zmywaku', version: 1 }], total: 1 } });
            if (url.pathname === `${path}/lines/${lineUUID}` && request.method() === 'PUT') {
                const body = request.postDataJSON();
                expect(body).toEqual({ version: 1, requiredQuantity: '61', sourceLocation: 'Na zmywaku', instructions: 'Górna półka' });
                edits++;
                list = { ...list, version: 2, status: 'draft', lines: [{ ...list.lines[0], requiredQuantity: body.requiredQuantity, sourceLocation: body.sourceLocation, instructions: body.instructions }] };
                return route.fulfill({ json: list });
            }
            if (url.pathname === `${path}/lines/${lineUUID}/progress` && request.method() === 'PUT') {
                const body = request.postDataJSON();
                expect(body).toEqual({ version: 2, preparedQuantity: '61', loadedQuantity: '0', correctionReason: null });
                progressUpdates++;
                list = { ...list, version: 3, status: 'in_preparation', lines: [{ ...list.lines[0], preparedQuantity: body.preparedQuantity }] };
                return route.fulfill({ json: list });
            }
            if (url.pathname === path) return route.fulfill({ json: list });
            return route.fulfill({ json: { data: {}, items: [] } });
        });
        await page.goto(`/catering/events/${eventUUID}`);
        await page.getByRole('navigation', { name: 'Zakładki wydarzenia' }).getByRole('button', { name: 'Kompletacja', exact: true }).click();
        await expect(page.getByRole('tab', { name: 'Planowanie', exact: true })).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByLabel('Przygotowano')).toHaveCount(0);
        await expect(page.getByLabel('Załadowano')).toHaveCount(0);
        await expect(page.getByText(/Lista ma braki w załadunku/)).toHaveCount(0);
        await expect(page.getByRole('combobox', { name: 'Osoba kompletująca całą listę' })).toHaveValue(assignee.name);
        await expect(page.getByRole('combobox', { name: 'Odpowiedzialny za pozycję' })).toHaveCount(0);
        const row = page.getByRole('row').filter({ hasText: 'Bulionówka' });
        await expect(row.getByRole('cell', { name: '60 szt.', exact: true })).toBeVisible();
        await expect(row).toContainText('Za barem');
        await expect(row.getByRole('button')).toHaveCount(1);
        await page.screenshot({ path: `/tmp/preparation-plan-${width}.png`, fullPage: true });
        await row.getByRole('button', { name: 'Edytuj pozycję: Bulionówka' }).click();
        const dialog = page.getByRole('dialog', { name: 'Edycja planu — Bulionówka' });
        const source = dialog.getByRole('combobox', { name: 'Skąd pobrać', exact: true });
        await expect(source).toHaveValue('Za barem');
        await dialog.getByLabel('Ilość do zabrania').fill('61');
        await source.fill('zmy');
        await page.getByRole('option', { name: 'Na zmywaku', exact: true }).click();
        await dialog.getByLabel('Instrukcje', { exact: true }).fill('Górna półka');
        await dialog.getByRole('button', { name: 'Zapisz pozycję w planie', exact: true }).click();
        await expect.poll(() => edits).toBe(1);
        await expect(dialog).toBeHidden();
        await expect(row).toContainText('Na zmywaku');
        await expect(row.getByRole('cell', { name: '61 szt.', exact: true })).toBeVisible();
        await expect(page.getByLabel('Przygotowano')).toHaveCount(0);
        await page.getByRole('tab', { name: 'Kompletowanie', exact: true }).click();
        await expect(page.getByText('Lista jest jeszcze planowana. Organizator musi ją zatwierdzić przed rozpoczęciem kompletowania.')).toBeVisible();
        await expect(page.getByRole('combobox', { name: 'Osoba kompletująca całą listę' })).toHaveCount(0);
        await expect(page.getByText(`Całą listę kompletuje: ${assignee.name}`)).toBeVisible();
        list = { ...list, status: 'approved' };
        await page.reload();
        await page.getByRole('navigation', { name: 'Zakładki wydarzenia' }).getByRole('button', { name: 'Kompletacja', exact: true }).click();
        await page.getByRole('tab', { name: 'Kompletowanie', exact: true }).click();
        await page.getByLabel('Przygotowano').fill('61');
        await page.getByRole('button', { name: 'Zapisz ilości', exact: true }).click();
        await expect.poll(() => progressUpdates).toBe(1);
        await expect(page.getByRole('tab', { name: 'Kompletowanie', exact: true })).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByLabel('Przygotowano')).toHaveValue('61');
    });
}
