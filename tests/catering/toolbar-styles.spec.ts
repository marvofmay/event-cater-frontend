import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'default', modules: ['equipment', 'supplies', 'kitchen'], accesses: ['equipment', 'consumables', 'orders'], permissions: ['equipment.*', 'consumables.*', 'orders.*'] };
    const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
    await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
    await page.route('**/api/**', route => route.fulfill({ json: { items: [], total: 0, page: 1, limit: 20, data: { pageSizes: {} } } }));
});

for (const kind of ['equipment', 'supplies']) {
    test(kind + ' uses subtle catalog links and equally sized filters', async ({ page }) => {
        await page.goto('/catering/' + kind);
        const categories = page.getByRole('link', { name: kind === 'equipment' ? 'Kategorie sprzętu' : 'Kategorie produktów', exact: true });
        await expect(categories).toHaveCSS('text-transform', 'none');
        await expect(categories).toHaveCSS('border-top-width', '1px');
        await expect(categories.locator('svg')).toBeVisible();
        if (kind === 'equipment') await expect(page.getByRole('link', { name: 'Miejsca sprzętu', exact: true })).toHaveCSS('text-transform', 'none');
        const filter = page.getByRole('combobox', { name: kind === 'equipment' ? 'Filtruj kategorię sprzętu' : 'Filtruj kategorię produktu', exact: true });
        const input = filter.locator('..');
        const select = page.getByRole('combobox', { name: /^Widoczność/ }).locator('..');
        await expect(input).toHaveCSS('height', '40px');
        await expect(select).toHaveCSS('height', '40px');
        expect((await categories.boundingBox())?.height).toBe(40);
    });
}

test('kitchen production date, stage and refresh have matching heights', async ({ page }) => {
    await page.goto('/catering/kitchen');
    const date = page.getByLabel('Dzień produkcji', { exact: true }).locator('..');
    const stage = page.getByRole('combobox', { name: 'Etap produkcji', exact: true }).locator('..');
    const refresh = page.getByRole('button', { name: 'Odśwież plan', exact: true });
    await expect(date).toHaveCSS('height', '40px');
    await expect(stage).toHaveCSS('height', '40px');
    expect((await refresh.boundingBox())?.height).toBe(40);
    const boxes = await Promise.all([date, stage, refresh].map(locator => locator.boundingBox()));
    expect(new Set(boxes.map(box => box?.y)).size).toBe(1);
});
