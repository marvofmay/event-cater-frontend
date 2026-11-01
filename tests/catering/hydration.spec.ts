import { expect, test } from '@playwright/test';

test('root layout hydrates without Emotion or toast mismatches on direct visits and reloads', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
        if (message.type() === 'error' && /hydrat|server rendered|didn't match|did not match/i.test(message.text())) errors.push(message.text());
    });
    const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'default', tenantName: 'Test', modules: ['company', 'notes'], accesses: ['companies', 'employees', 'notes', 'company_structure', 'manage'], permissions: ['companies.*', 'employees.*', 'notes.*', 'company_structure.view'] };
    const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
    await page.addInitScript(token => localStorage.setItem('auth_token', token), token);
    await page.route('**/api/**', route => route.fulfill({ json: { data: { items: [], total: 0 }, items: [] } }));
    for (const path of ['/manage/companies/list', '/manage/employees/list', '/module/notes', '/login']) {
        for (const visit of ['direct', 'reload']) {
            if (visit === 'direct') await page.goto(path);
            else await page.reload();
            await expect(page.locator('section.Toastify')).toHaveCount(1);
            await expect(page.getByRole('navigation')).toBeVisible();
            await expect(page.locator('body style[data-emotion]')).toHaveCount(0);
            expect(errors, `${path}: ${visit}`).toEqual([]);
        }
    }
});
