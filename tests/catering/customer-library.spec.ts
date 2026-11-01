import { expect, test } from '@playwright/test';

for (const writable of [true, false]) {
    test('customer library supports browsing' + (writable ? ' and adding' : ' without write controls'), async ({ page }) => {
        const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'default', modules: ['events'], accesses: ['events'], permissions: writable ? ['events.*'] : ['events.view'] };
        const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
        await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
        const customers = [{ uuid: '11111111-1111-4111-8111-111111111111', name: 'Firma testowa', nip: '1234567890', email: 'biuro@example.test', country: 'Polska' }];
        await page.route('**/api/**', route => {
            const url = new URL(route.request().url());
            if (url.pathname === '/api/event-customers') {
                if (route.request().method() === 'POST') {
                    const body = route.request().postDataJSON();
                    expect(body.country).toBe('Polska');
                    const customer = { ...body, uuid: '22222222-2222-4222-8222-222222222222' };
                    customers.push(customer);
                    return route.fulfill({ status: 201, json: customer });
                }
                const items = customers.filter(customer => customer.name.includes(url.searchParams.get('q') || ''));
                return route.fulfill({ json: { items, total: items.length, page: 1, limit: 20 } });
            }
            return route.fulfill({ json: { items: [], total: 0, data: { pageSizes: {} } } });
        });
        await page.goto('/catering/events');
        await page.getByRole('link', { name: 'Kontrahenci', exact: true }).click();
        await expect(page).toHaveURL(/\/catering\/customers$/);
        await expect(page.getByRole('table', { name: 'Lista kontrahentów', exact: true })).toContainText('Firma testowa');
        await page.getByRole('button', { name: 'Podgląd: Firma testowa', exact: true }).click();
        await expect(page.getByRole('dialog')).toContainText('biuro@example.test');
        await page.getByRole('button', { name: 'Zamknij', exact: true }).click();
        if (writable) {
            await page.getByRole('button', { name: 'Dodaj kontrahenta', exact: true }).click();
            await page.getByRole('dialog').getByRole('textbox', { name: /^Nazwa/ }).fill('Nowy klient');
            await page.getByRole('button', { name: 'Dodaj i wybierz', exact: true }).click();
            await expect(page.getByRole('dialog')).toHaveCount(0);
            await expect(page.getByRole('table', { name: 'Lista kontrahentów', exact: true })).toContainText('Nowy klient');
            await page.getByRole('textbox', { name: 'Szukaj kontrahenta', exact: true }).fill('Nowy klient');
            await expect(page.getByRole('table', { name: 'Lista kontrahentów', exact: true }).getByRole('row')).toHaveCount(2);
        } else {
            await expect(page.getByRole('button', { name: 'Dodaj kontrahenta', exact: true })).toHaveCount(0);
        }
    });
}
