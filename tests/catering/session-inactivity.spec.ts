import { expect, test, type Page, type BrowserContext } from '@playwright/test';

const minute = 60000;

async function setup(context: BrowserContext, now: number, delayedLogout = false) {
    const payload = { exp: Math.floor(now / 1000) + 3600, tokenUUID: '00000000-0000-4000-8000-000000000001', tenantSlug: 'mapa-smakow', tenantName: 'Mapa Smaków', modules: ['notes'], accesses: ['notes'], permissions: ['notes.list'] };
    const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(payload)).toString('base64url'), 'test'].join('.');
    await context.addInitScript(token => {
        if (!window.location.pathname.startsWith('/login')) {
            localStorage.setItem('auth_token', token);
            localStorage.setItem('selected_tenant', 'mapa-smakow');
        }
    }, token);
    const logoutRequests: string[] = [];
    await context.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/logout') {
            logoutRequests.push(route.request().headers()['authorization']);
            expect(route.request().headers()['x-tenant']).toBe('mapa-smakow');
            if (delayedLogout) await new Promise(resolve => setTimeout(resolve, 1500));
            return route.fulfill({ json: { message: 'Wylogowano' } }).catch(() => {});
        }
        return route.fulfill({ json: { data: { items: [], total: 0 }, items: [] } });
    });
    return { token, logoutRequests };
}

async function openNotes(page: Page, now: number) {
    await page.clock.install({ time: new Date(now) });
    await page.clock.pauseAt(new Date(now + 1000));
    await page.goto('/module/notes');
    await expect(page.getByRole('heading', { name: 'Lista notatek' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('auth:last-activity'))).not.toBeNull();
}

test('warns after nine minutes, counts down and logs out without accepting incidental activity', async ({ page, context }) => {
    const now = Date.now();
    const { token, logoutRequests } = await setup(context, now);
    await openNotes(page, now);
    await page.clock.fastForward(9 * minute - 1000);
    await expect(page.getByRole('dialog', { name: 'Twoja sesja wkrótce wygaśnie' })).not.toBeVisible();
    await page.clock.fastForward(1000);
    const dialog = page.getByRole('dialog', { name: 'Twoja sesja wkrótce wygaśnie' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('1:00', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    await page.mouse.move(20, 20);
    await page.keyboard.press('Escape');
    await page.mouse.click(1, 1);
    await page.clock.fastForward(30 * 1000);
    await expect(dialog.getByText('0:30', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    await page.clock.fastForward(30 * 1000);
    await expect(page).toHaveURL('/login');
    await page.clock.runFor(400);
    await expect(page.getByRole('alert').filter({ hasText: 'Sesja została zakończona' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('auth_token'))).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('selected_tenant'))).toBe('mapa-smakow');
    expect(logoutRequests).toEqual([`Bearer ${token}`]);
});

test('normal activity resets idle time and the warning requires explicit extension', async ({ page, context }) => {
    const now = Date.now();
    await setup(context, now);
    await openNotes(page, now);
    await page.clock.fastForward(8 * minute);
    await page.getByRole('textbox', { name: 'Szukaj notatek' }).fill('Notatka');
    await page.clock.fastForward(8 * minute);
    const dialog = page.getByRole('dialog', { name: 'Twoja sesja wkrótce wygaśnie' });
    await expect(dialog).not.toBeVisible();
    await page.clock.fastForward(minute);
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Przedłuż sesję' }).click();
    await page.clock.runFor(300);
    await expect(dialog).not.toBeVisible();
    await page.clock.fastForward(9 * minute);
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Wyloguj teraz' }).click();
    await expect(page).toHaveURL('/login');
});

test('an expired persisted session is rejected after sleep or reload even if logout API is slow', async ({ page, context }) => {
    const now = Date.now();
    await setup(context, now, true);
    await openNotes(page, now);
    await page.evaluate(at => {
        const record = JSON.parse(localStorage.getItem('auth:last-activity')!);
        localStorage.setItem('auth:last-activity', JSON.stringify({ ...record, at }));
    }, now - 11 * minute);
    await page.reload();
    await expect(page).toHaveURL('/login');
    expect(await page.evaluate(() => localStorage.getItem('auth_token'))).toBeNull();
});

test('extension and logout are synchronized between tabs', async ({ page, context }) => {
    const now = Date.now();
    await setup(context, now);
    await openNotes(page, now);
    const second = await context.newPage();
    await second.goto('/module/notes');
    await expect(second.getByRole('heading', { name: 'Lista notatek' })).toBeVisible();
    await page.clock.fastForward(9 * minute);
    const firstWarning = page.getByRole('dialog', { name: 'Twoja sesja wkrótce wygaśnie' });
    const secondWarning = second.getByRole('dialog', { name: 'Twoja sesja wkrótce wygaśnie' });
    await expect(firstWarning).toBeVisible();
    await expect(secondWarning).toBeVisible();
    await secondWarning.getByRole('button', { name: 'Przedłuż sesję' }).click();
    await second.clock.runFor(300);
    await expect(firstWarning).not.toBeVisible();
    await expect(secondWarning).not.toBeVisible();
    await second.clock.fastForward(9 * minute);
    await secondWarning.getByRole('button', { name: 'Wyloguj teraz' }).click();
    await expect(second).toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
    expect(await page.evaluate(() => localStorage.getItem('auth_token'))).toBeNull();
});
