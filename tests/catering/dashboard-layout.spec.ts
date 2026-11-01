import { expect, test } from '@playwright/test';

test('personal dashboard order supports drag and drop, reload, arrows and restoring defaults', async ({ page }) => {
    const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'mapa-smakow', tenantName: 'Mapa Smaków', modules: ['company', 'notes', 'events'], accesses: ['company_structure', 'notes'], permissions: ['company_structure.view', 'notes.list'] };
    const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
    await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
    let layout = { order: [] as string[], version: 0 };
    let rejectSave = false;
    await page.route('**/api/**', route => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path === '/api/preferences/dashboard') {
            if (request.method() === 'PUT') {
                if (rejectSave) return route.fulfill({ status: 409, json: { message: 'Układ zmieniono w innej karcie. Odśwież ustawienia.' } });
                const body = request.postDataJSON();
                expect(body.version).toBe(layout.version);
                expect(Object.keys(body).sort()).toEqual(['order', 'version']);
                layout = { order: body.order, version: layout.version + 1 };
            }
            return route.fulfill({ json: { data: layout } });
        }
        if (path === '/api/preferences') return route.fulfill({ json: { data: { pageSizes: {}, dashboardOrder: layout.order } } });
        return route.fulfill({ json: {} });
    });
    await page.goto('/me/settings');
    const list = page.getByRole('list', { name: 'Kolejność kafelków' });
    await expect(list.getByRole('listitem')).toHaveText(['Firma', 'Notatki']);
    await expect(list.getByText('Wydarzenia')).toHaveCount(0);
    await list.getByRole('listitem', { name: 'Kafelek: Notatki' }).dragTo(list.getByRole('listitem', { name: 'Kafelek: Firma' }));
    await expect(list.getByRole('listitem')).toHaveText(['Notatki', 'Firma']);
    await page.getByRole('button', { name: 'Zapisz układ pulpitu', exact: true }).click();
    await expect(page.locator('.Toastify__toast--success')).toContainText('Zapisano układ pulpitu.');
    expect(layout.order).toEqual(['notes', 'company']);
    await page.reload();
    await expect(list.getByRole('listitem')).toHaveText(['Notatki', 'Firma']);
    await page.getByRole('button', { name: 'Przesuń w górę: Firma' }).click();
    await expect(list.getByRole('listitem')).toHaveText(['Firma', 'Notatki']);
    rejectSave = true;
    await page.getByRole('button', { name: 'Zapisz układ pulpitu', exact: true }).click();
    await expect(page.locator('.Toastify__toast--error')).toContainText('Układ zmieniono w innej karcie.');
    await expect(list.getByRole('listitem')).toHaveText(['Firma', 'Notatki']);
    rejectSave = false;
    await page.goto('/');
    const tileLinks = page.getByRole('main').last().locator('a[href^="/module/"]');
    await expect(tileLinks).toHaveText(['Notatki', 'Firma']);
    await page.goto('/me/settings');
    await page.getByRole('button', { name: 'Przywróć domyślną kolejność' }).click();
    await expect(list.getByRole('listitem')).toHaveText(['Firma', 'Notatki']);
    await page.getByRole('button', { name: 'Zapisz układ pulpitu', exact: true }).click();
    await expect.poll(() => layout.order).toEqual([]);
    await page.goto('/');
    await expect(tileLinks).toHaveText(['Firma', 'Notatki']);
});
