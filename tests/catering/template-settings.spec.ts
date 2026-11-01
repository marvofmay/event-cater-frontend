import { expect, test, type Page } from '@playwright/test';
import { templateQuantity } from '../../app/utils/templateQuantity';

const templateUUID = '00000000-0000-4000-8000-000000000001';
const fixture = {
    uuid: templateUUID, name: 'Przerwa kawowa', description: '', active: true, version: 7,
    lines: [{ kind: 'equipment', itemUuid: '00000000-0000-4000-8000-000000000002', name: 'Filiżanka', unit: 'piece', rule: { mode: 'per_guest', quantity: '1.000', perGuests: 1, reservePercent: 0, reserveQuantity: '0.000' } }],
};

async function authenticate(page: Page, canDelete = true, extraPermissions: string[] = []) {
    const permissions = ['preparation_templates.list', 'preparation_templates.view', 'preparation_templates.update', ...(canDelete ? ['preparation_templates.delete'] : []), ...extraPermissions];
    const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'default', modules: ['events'], accesses: ['preparation_templates'], permissions };
    const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
    await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
}

test('quantity examples use exact rounding and preserve legacy percent calculations', () => {
    const rule = { mode: 'per_guest', quantity: '1.000', perGuests: 1, reservePercent: 0, reserveQuantity: '5' };
    expect(templateQuantity(rule, 'piece', 50)).toBe(55);
    expect(templateQuantity(rule, 'piece', 100)).toBe(105);
    expect(templateQuantity({ ...rule, perGuests: 50, reserveQuantity: '1' }, 'piece', 51)).toBe(3);
    expect(templateQuantity({ ...rule, quantity: '0.125', perGuests: 2, reserveQuantity: '0.005' }, 'kg', 3)).toBe(0.193);
    expect(templateQuantity({ ...rule, reservePercent: 10, reserveQuantity: '0' }, 'piece', 50)).toBe(55);
    expect(templateQuantity({ ...rule, perGuests: 0 }, 'piece', 50)).toBeNull();
    expect(templateQuantity({ ...rule, reserveQuantity: '0.5' }, 'piece', 50)).toBeNull();
    expect(templateQuantity({ ...rule, quantity: '1000000' }, 'piece', 1000000)).toBeNull();
});

for (const canSearch of [false, true]) {
    test(`template source location supports library suggestions and custom locations: ${canSearch}`, async ({ page }) => {
        await authenticate(page, false, ['preparation_templates.create', ...(canSearch ? ['equipment.list'] : [])]);
        let locationRequests = 0;
        let savedLocation = '';
        await page.route('**/api/**', route => {
            const url = new URL(route.request().url());
            if (url.pathname === '/api/equipment-locations') {
                expect(canSearch).toBe(true);
                locationRequests++;
                const locations = [{ uuid: 'location-1', name: 'Za barem', version: 1 }, { uuid: 'location-2', name: 'Na zmywaku', version: 1 }].filter(location => location.name.toLowerCase().includes((url.searchParams.get('q') ?? '').toLowerCase()));
                return route.fulfill({ json: { items: locations, total: locations.length } });
            }
            if (url.pathname === `/api/preparation-templates/${templateUUID}`) {
                if (route.request().method() === 'PUT') savedLocation = route.request().postDataJSON().lines[0].sourceLocation;
                return route.fulfill({ json: fixture });
            }
            return route.fulfill({ json: url.pathname === '/api/preparation-templates' ? { items: [fixture], total: 1 } : { data: {}, items: [] } });
        });
        await page.goto('/catering/templates');
        await page.getByRole('button', { name: 'Edytuj szablon', exact: true }).click();
        const dialog = page.getByRole('dialog');
        const source = dialog.getByRole('combobox', { name: 'Miejsce pobrania', exact: true });
        await expect(source).toBeVisible();
        expect(locationRequests).toBe(0);
        if (canSearch) {
            await source.fill('zmy');
            await page.getByRole('option', { name: 'Na zmywaku', exact: true }).click();
            await expect(source).toHaveValue('Na zmywaku');
            await dialog.getByRole('button', { name: 'Zapisz szablon', exact: true }).click();
            await expect.poll(() => savedLocation).toBe('Na zmywaku');
            await page.getByRole('button', { name: 'Edytuj szablon', exact: true }).click();
        }
        await source.fill('Magazyn napojów, regał 3');
        await dialog.getByLabel('Instrukcje', { exact: true }).click();
        await dialog.getByRole('button', { name: 'Zapisz szablon', exact: true }).click();
        await expect.poll(() => savedLocation).toBe('Magazyn napojów, regał 3');
        if (!canSearch) expect(locationRequests).toBe(0);
    });
}

for (const width of [390, 1440]) {
    test(`template quantities show concrete reserve amounts and a live example at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await authenticate(page);
        let saved = false;
        await page.route('**/api/**', route => {
            const path = new URL(route.request().url()).pathname;
            if (path === `/api/preparation-templates/${templateUUID}`) {
                if (route.request().method() === 'PUT') {
                    const body = route.request().postDataJSON();
                    expect(body).not.toHaveProperty('exampleGuests');
                    expect(body.lines[0].rule).toMatchObject({ quantity: '1', perGuests: 1, reserveQuantity: '5', reservePercent: 0 });
                    saved = true;
                }
                return route.fulfill({ json: fixture });
            }
            return route.fulfill({ json: path === '/api/preparation-templates' ? { items: [fixture], total: 1 } : { data: {}, items: [] } });
        });
        await page.goto('/catering/templates');
        await page.getByRole('button', { name: 'Edytuj szablon', exact: true }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog.getByLabel('Ilość do zabrania')).toHaveValue('1');
        await expect(dialog.getByText('Dla 50 gości zabierz: 50 szt.', { exact: true })).toBeVisible();
        await dialog.getByLabel('Dodatkowy zapas', { exact: true }).fill('5');
        await expect(dialog.getByText('50 szt. dla gości + 5 szt. zapasu = 55 szt.', { exact: true })).toBeVisible();
        await dialog.getByLabel('Przykładowa liczba gości').fill('100');
        await expect(dialog.getByText('Dla 100 gości zabierz: 105 szt.', { exact: true })).toBeVisible();
        await expect(dialog.getByLabel('Dodatkowy zapas', { exact: true })).toHaveValue('5');
        await dialog.getByRole('combobox', { name: 'Ile zabrać?' }).click();
        await page.getByRole('option', { name: 'Zawsze tyle samo', exact: true }).click();
        await expect(dialog.getByText('Na każde wydarzenie zabierz: 1 szt.', { exact: true })).toBeVisible();
        await expect(dialog.getByLabel('Dodatkowy zapas', { exact: true })).toHaveCount(0);
        await dialog.getByRole('combobox', { name: 'Ile zabrać?' }).click();
        await page.getByRole('option', { name: 'Według liczby gości', exact: true }).click();
        await dialog.getByLabel('Dodatkowy zapas', { exact: true }).fill('5');
        await page.screenshot({ path: `/tmp/template-quantities-${width}.png`, fullPage: true });
        await dialog.getByRole('button', { name: 'Zapisz szablon', exact: true }).click();
        await expect.poll(() => saved).toBe(true);
    });
}

for (const canDelete of [false, true]) {
    test(`permanent template deletion requires permission and confirmation: ${canDelete}`, async ({ page }) => {
        await authenticate(page, canDelete);
        let deleted = false;
        let attempts = 0;
        await page.route('**/api/**', route => {
            const path = new URL(route.request().url()).pathname;
            if (path === `/api/preparation-templates/${templateUUID}` && route.request().method() === 'DELETE') {
                expect(route.request().postDataJSON()).toEqual({ version: 7 });
                attempts++;
                if (attempts === 1) return route.fulfill({ status: 409, json: { message: 'Odśwież szablon.' } });
                deleted = true;
                return route.fulfill({ json: { message: 'Trwale usunięto szablon.' } });
            }
            return route.fulfill({ json: path === '/api/preparation-templates' ? { items: deleted ? [] : [fixture], total: deleted ? 0 : 1 } : { data: {} } });
        });
        await page.goto('/catering/templates');
        const remove = page.getByRole('button', { name: 'Usuń trwale szablon: Przerwa kawowa', exact: true });
        if (!canDelete) { await expect(remove).toHaveCount(0); return; }
        await remove.click();
        const dialog = page.getByRole('dialog', { name: 'Usunąć trwale szablon?' });
        await expect(dialog).toContainText('Tej operacji nie można cofnąć.');
        await dialog.getByRole('button', { name: 'Anuluj', exact: true }).click();
        expect(attempts).toBe(0);
        await remove.click();
        await dialog.getByRole('button', { name: 'Usuń trwale', exact: true }).click();
        await expect(page.locator('.Toastify__toast--error')).toBeVisible();
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: 'Usuń trwale', exact: true }).click();
        await expect(dialog).toBeHidden();
        await expect(remove).toHaveCount(0);
        await expect(page.locator('.Toastify__toast--success')).toContainText('Trwale usunięto szablon.');
    });
}
