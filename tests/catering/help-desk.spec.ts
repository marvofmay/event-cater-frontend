import { expect, test } from '@playwright/test';

function token() {
    const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'mapa-smakow', tenantName: 'Mapa Smaków', user: { uuid: '00000000-0000-4000-8000-000000000001' }, modules: [], accesses: [], permissions: [] };
    return [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
}

test('avatar menu opens help and sends a ticket with a screenshot', async ({ page }) => {
    const auth = token();
    await page.addInitScript(value => localStorage.setItem('auth_token', value), auth);
    const tickets: { uuid: string; subject: string; status: string; statusLabel: string; categoryLabel: string; updatedAt: string; messages: unknown[] }[] = [];
    await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/support/meta') {
            return route.fulfill({ json: { categories: [{ value: 'system_error', label: 'Błąd systemu' }, { value: 'billing', label: 'Opłaty' }, { value: 'other', label: 'Inne' }], statuses: [{ value: 'open', label: 'Nowe' }] } });
        }
        if (path === '/api/support/tickets' && route.request().method() === 'POST') {
            expect(route.request().headers().authorization).toBe(`Bearer ${auth}`);
            const body = route.request().postDataBuffer()?.toString() ?? '';
            expect(body).toContain('name="category"');
            expect(body).toContain('system_error');
            expect(body).toContain('Pusty ekran');
            expect(body).toContain('filename="zrzut.png"');
            const created = { uuid: '00000000-0000-4000-8000-000000000123', subject: 'Pusty ekran', status: 'open', statusLabel: 'Nowe', categoryLabel: 'Błąd systemu', updatedAt: '2026-11-17T09:00:00Z', messages: [{ uuid: 'm1', role: 'user', author: 'Anna', body: 'Biała strona.', createdAt: '2026-11-17T09:00:00Z', attachments: [] }] };
            tickets.push(created);
            return route.fulfill({ status: 201, json: { uuid: created.uuid, message: 'Zgłoszenie zostało wysłane.' } });
        }
        if (path === '/api/support/tickets') return route.fulfill({ json: { items: tickets } });
        if (path.startsWith('/api/support/tickets/')) return route.fulfill({ json: tickets[0] });
        return route.fulfill({ json: { data: { pageSizes: {} }, items: [] } });
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Menu użytkownika' }).click();
    await page.getByRole('menuitem', { name: 'pomoc', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Pomoc' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Moje zgłoszenia' })).toBeVisible();
    const create = page.getByRole('button', { name: 'Utwórz zgłoszenie' });
    const status = page.getByLabel('Status');
    const createBox = await create.boundingBox();
    const statusBox = await status.boundingBox();
    expect(createBox!.y).toBeLessThan(statusBox!.y);
    expect(createBox!.x).toBeGreaterThan(statusBox!.x);
    await create.click();
    const form = page.getByRole('dialog');
    await expect(form.getByRole('button', { name: 'Anuluj' })).toBeVisible();
    await form.getByRole('button', { name: 'Anuluj' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await create.click();
    await form.getByLabel('Kategoria').click();
    await page.getByRole('option', { name: 'Błąd systemu' }).click();
    await form.getByLabel('Temat').fill('Pusty ekran');
    await form.getByLabel('Wiadomość').fill('Biała strona.');
    await form.locator('input[type="file"]').setInputFiles({ name: 'zrzut.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=', 'base64') });
    const send = form.getByRole('button', { name: 'Wyślij zgłoszenie' });
    const formBox = await form.boundingBox();
    const sendBox = await send.boundingBox();
    expect(sendBox!.x + sendBox!.width).toBeGreaterThan(formBox!.x + formBox!.width * 0.7);
    await send.click();
    await expect(page.getByText('Zgłoszenie zostało wysłane.')).toBeVisible();
    await expect(page.getByText('jest na liście poniżej')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Pusty ekran/ })).toBeVisible();
});

test('my tickets can be filtered by status, searched and paged', async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem('auth_token', value), token());
    const tickets = [
        ...Array.from({ length: 11 }, (_, index) => ({
            uuid: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
            subject: `Otwarte ${index + 1}`,
            status: 'open',
            statusLabel: 'Nowe',
            categoryLabel: 'Błąd systemu',
            updatedAt: '2026-11-17T09:00:00Z',
        })),
        {
            uuid: '00000000-0000-4000-8000-000000000099',
            subject: 'Rozwiązane rozliczenie',
            status: 'resolved',
            statusLabel: 'Rozwiązane',
            categoryLabel: 'Opłaty',
            updatedAt: '2026-11-16T09:00:00Z',
        },
    ];
    await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/support/meta') {
            return route.fulfill({ json: { categories: [{ value: 'system_error', label: 'Błąd systemu' }], statuses: [{ value: 'open', label: 'Nowe' }, { value: 'resolved', label: 'Rozwiązane' }] } });
        }
        if (path === '/api/support/tickets') return route.fulfill({ json: { items: tickets } });
        return route.fulfill({ json: { items: [] } });
    });

    await page.goto('/me/help');
    await expect(page.getByRole('columnheader', { name: 'Temat' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Otwarte 1', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Otwarte 11', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Następna strona' }).click();
    await expect(page.getByRole('cell', { name: 'Otwarte 11', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Rozwiązane rozliczenie' })).toBeVisible();
    await page.getByRole('combobox', { name: /^Status/ }).click();
    await page.getByRole('option', { name: 'Rozwiązane' }).click();
    await expect(page.getByRole('cell', { name: 'Rozwiązane rozliczenie' })).toBeVisible();
    await expect(page.getByRole('cell', { name: /Otwarte/ })).toHaveCount(0);
    await page.getByRole('combobox', { name: /^Status/ }).click();
    await page.getByRole('option', { name: 'Wszystkie' }).click();
    await page.getByLabel('Szukaj').fill('rozliczenie');
    await expect(page.getByRole('cell', { name: 'Rozwiązane rozliczenie' })).toBeVisible();
    await expect(page.getByRole('cell', { name: /Otwarte/ })).toHaveCount(0);
});

test('saas desk tile opens the ticket inbox', async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem('saas_token', 'a'.repeat(64)));
    await page.route('**/api/saas/**', route => {
        const url = new URL(route.request().url());
        const path = url.pathname;
        if (path === '/api/saas/tenants') return route.fulfill({ json: { items: [{ uuid: '00000000-0000-4000-8000-000000000010', slug: 'mapa-smakow', name: 'Mapa Smaków', status: 'active', provisioning: 'ready', version: 1 }] } });
        if (path === '/api/saas/support/summary') return route.fulfill({ json: { attention: 2, open: 2, inProgress: 0, waiting: 0, resolved: 0, closed: 0 } });
        if (path === '/api/saas/support/meta') return route.fulfill({ json: { categories: [{ value: 'billing', label: 'Opłaty' }], statuses: [{ value: 'open', label: 'Nowe' }] } });
        const ticket = { uuid: '00000000-0000-4000-8000-000000000124', subject: 'Faktura', status: 'open', statusLabel: 'Nowe', categoryLabel: 'Opłaty', tenantName: 'Mapa Smaków', tenantSlug: 'mapa-smakow', authorName: 'Anna', authorEmail: 'anna@example.test', updatedAt: '2026-11-17T09:00:00Z', preview: 'Nie widzę płatności', messages: [{ uuid: 'm1', role: 'user', author: 'Anna', body: 'Nie widzę płatności', createdAt: '2026-11-17T09:00:00Z', attachments: [] }] };
        if (path === '/api/saas/support/tickets') {
            const tenant = url.searchParams.get('tenant');
            return route.fulfill({ json: { items: tenant && tenant !== 'mapa-smakow' ? [] : [ticket] } });
        }
        if (path === '/api/saas/support/tickets/' + ticket.uuid) return route.fulfill({ json: ticket });
        return route.fulfill({ json: {} });
    });
    await page.goto('/saas');
    await expect(page.getByRole('button', { name: 'Zgłoszenia', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zgłoszenia', exact: true })).toContainText('2');
    await page.getByRole('button', { name: 'Zgłoszenia', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Zgłoszenia' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Firma' })).toBeVisible();
    await expect(page.getByText('Faktura')).toBeVisible();
    await page.getByLabel('Firma').click();
    await page.getByRole('option', { name: 'Mapa Smaków' }).click();
    await expect(page.getByText('Faktura')).toBeVisible();
    await page.getByRole('button', { name: 'Otwórz zgłoszenie Faktura' }).click();
    await expect(page.getByRole('dialog')).toContainText('Mapa Smaków');
});
