import { expect, test } from '@playwright/test';

for (const width of [390, 1280]) {
test(`employee table displays avatars and aligned headings at viewport width ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'default', modules: ['company'], accesses: ['manage', 'employees'], permissions: ['employees.*'] };
    const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
    await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
    const employees = [
        { uuid: '00000000-0000-4000-8000-000000000001', firstName: 'Anna', lastName: 'Kowalska', avatar: { avatarType: 'custom', avatarPath: 'avatars/table.png', defaultAvatar: null } },
        { uuid: '00000000-0000-4000-8000-000000000002', firstName: 'Jan', lastName: 'Nowak', avatar: { avatarType: 'default', avatarPath: null, defaultAvatar: 'man' } },
        { uuid: '00000000-0000-4000-8000-000000000003', firstName: 'Ewa', lastName: 'Lis', avatar: null },
    ].map(employee => ({ ...employee, active: true, createdAt: '2026-10-31 10:00:00', updatedAt: null }));
    await page.route('**/upload/avatars/table.png', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=', 'base64') }));
    await page.route('**/api/**', route => route.fulfill({ json: { data: new URL(route.request().url()).pathname === '/api/employees' ? { items: employees, total: employees.length } : {} } }));
    await page.goto('/manage/employees/list');
    await expect(page.getByRole('columnheader', { name: 'avatar', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'nazwisko imię', exact: true })).toBeVisible();
    const headingCenters = await page.locator('thead').evaluate(header => {
        return ['avatar', 'nazwisko'].map(label => {
            const walker = document.createTreeWalker(header, NodeFilter.SHOW_TEXT);
            let node = walker.nextNode();
            while (node && node.textContent?.trim() !== label) node = walker.nextNode();
            if (!node) throw new Error(`Missing column heading: ${label}`);
            const range = document.createRange();
            range.selectNodeContents(node);
            const bounds = range.getBoundingClientRect();
            return bounds.top + bounds.height / 2;
        });
    });
    expect(Math.abs(headingCenters[0] - headingCenters[1])).toBeLessThanOrEqual(1);
    await expect(page.getByRole('img', { name: 'Avatar: Anna Kowalska' })).toHaveAttribute('src', /\/upload\/avatars\/table.png$/);
    await expect(page.getByRole('img', { name: 'Avatar: Jan Nowak' })).toHaveAttribute('src', '/icons/man.png');
    await expect(page.getByRole('row').filter({ hasText: 'Lis Ewa' }).getByTestId('Person2Icon')).toBeVisible();
});
}
