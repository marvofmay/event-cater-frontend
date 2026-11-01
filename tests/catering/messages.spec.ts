import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
    test(`messages support reading, badge updates and multi-recipient sending at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1100 });
        const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'mapa-smakow', modules: ['system'], accesses: ['messages'], permissions: ['messages.list', 'messages.view', 'messages.create'] };
        const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
        await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
        const incoming = { uuid: '00000000-0000-4000-8000-000000000001', title: 'Plan pracy', preview: 'Jutro o 10', content: 'Jutro o 10.\nSala główna.', senderName: 'Kierownik', createdAt: '2026-11-01T10:00:00+00:00', readAt: null as string | null, recipientCount: 1, isSender: false, isRecipient: true, recipients: [] };
        const recipients = [{ uuid: '00000000-0000-4000-8000-000000000002', name: 'Anna Kowalska' }, { uuid: '00000000-0000-4000-8000-000000000003', name: 'Jan Nowak' }];
        let posted: { requestUuid: string; title: string; content: string; recipientUuids: string[] } | null = null;
        let sent = false, fail = true, reads = 0, attempts = 0;
        const outgoing = () => ({ uuid: posted!.requestUuid, title: posted!.title, content: posted!.content, preview: posted!.content, senderName: 'Nadawca', createdAt: '2026-11-01T11:00:00+00:00', readAt: null, recipientCount: 2, isSender: true, isRecipient: false, recipients: recipients.map(recipient => ({ ...recipient, readAt: null })) });
        await page.route('**/api/**', route => {
            const url = new URL(route.request().url());
            if (url.pathname === '/api/messages/unread-count') return route.fulfill({ json: { unreadCount: incoming.readAt ? 0 : 1 } });
            if (url.pathname === '/api/messages/recipients') return route.fulfill({ json: { items: recipients } });
            if (url.pathname === `/api/messages/${incoming.uuid}/read`) { reads++; incoming.readAt = '2026-11-01T11:00:00+00:00'; return route.fulfill({ json: incoming }); }
            if (url.pathname === `/api/messages/${incoming.uuid}`) return route.fulfill({ json: incoming });
            if (posted && url.pathname === `/api/messages/${posted.requestUuid}`) return route.fulfill({ json: outgoing() });
            if (url.pathname === '/api/messages') {
                if (route.request().method() === 'POST') {
                    attempts++;
                    const body = route.request().postDataJSON();
                    expect(body.recipientUuids).toEqual(recipients.map(recipient => recipient.uuid));
                    if (posted) expect(body.requestUuid).toBe(posted.requestUuid);
                    posted = body;
                    if (fail) return route.fulfill({ status: 503, json: { message: 'Chwilowy błąd wysyłki.' } });
                    sent = true;
                    return route.fulfill({ status: 201, json: { uuid: body.requestUuid } });
                }
                const items = url.searchParams.get('folder') === 'sent' ? sent ? [outgoing()] : [] : [incoming];
                return route.fulfill({ json: { items, total: items.length, page: 1, limit: 20 } });
            }
            return route.fulfill({ json: { data: { pageSizes: {}, items: [] } } });
        });
        await page.goto('/messages');
        await expect(page.getByRole('button', { name: 'Wiadomości: 1 nieprzeczytanych', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Podgląd: Plan pracy', exact: true }).click();
        await expect(page.getByRole('dialog').getByText('Jutro o 10. Sala główna.', { exact: true })).toBeVisible();
        await expect.poll(() => reads).toBeGreaterThan(0);
        await page.getByRole('button', { name: 'Zamknij', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Wiadomości', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Nowa wiadomość', exact: true }).click();
        const dialog = page.getByRole('dialog');
        const send = dialog.getByRole('button', { name: 'Wyślij wiadomość', exact: true });
        await expect(send).toBeDisabled();
        const recipient = dialog.getByRole('combobox', { name: 'Odbiorcy' });
        await recipient.fill('Anna');
        await page.getByRole('option', { name: 'Anna Kowalska', exact: true }).click();
        await recipient.fill('Jan');
        await page.getByRole('option', { name: 'Jan Nowak', exact: true }).click();
        await dialog.getByRole('textbox', { name: /^Tytuł/ }).fill('Zmiana godziny');
        await dialog.getByRole('textbox', { name: /^Treść/ }).fill('Spotkanie o 12:00.');
        await send.click();
        await expect(page.getByText('Chwilowy błąd wysyłki.')).toBeVisible();
        await expect(dialog).toBeVisible();
        fail = false;
        await send.click();
        await expect(dialog).toHaveCount(0);
        await expect(page.getByRole('tab', { name: 'Wysłane', exact: true })).toHaveAttribute('aria-selected', 'true');
        await page.getByRole('button', { name: 'Podgląd: Zmiana godziny', exact: true }).click();
        await expect(page.getByRole('dialog').getByText('Odbiorcy i odczyty', { exact: true })).toBeVisible();
        await expect(page.getByRole('dialog').getByText('Anna Kowalska', { exact: true })).toBeVisible();
        expect(attempts).toBe(2);
        await page.getByRole('button', { name: 'Zamknij', exact: true }).click();
        expect(await page.getByRole('tablist', { name: 'Skrzynka wiadomości' }).evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
    });
}

test('receivers without sending permission cannot compose or browse recipients', async ({ page }) => {
    const claims = { exp: Math.floor(Date.now() / 1000) + 3600, modules: ['system'], accesses: ['messages'], permissions: ['messages.list', 'messages.view'] };
    const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
    await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
    let recipients = 0;
    await page.route('**/api/**', route => {
        if (new URL(route.request().url()).pathname === '/api/messages/recipients') recipients++;
        return route.fulfill({ json: { items: [], total: 0, unreadCount: 0, data: { pageSizes: {} } } });
    });
    await page.goto('/messages');
    await expect(page.getByText('Brak wiadomości w tej skrzynce.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nowa wiadomość', exact: true })).toHaveCount(0);
    expect(recipients).toBe(0);
});
