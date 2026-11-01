import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
    test(`message table supports reply, single deletion and atomic selection at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1100 });
        const senderUuid = '00000000-0000-4000-8000-000000000099';
        const claims = { exp: Math.floor(Date.now() / 1000) + 3600, user: { uuid: '00000000-0000-4000-8000-000000000098' }, modules: ['system'], accesses: ['messages'], permissions: ['messages.list', 'messages.view', 'messages.create', 'messages.delete'] };
        const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
        await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
        let inbox = ['Plan pracy', 'Spotkanie', 'Grafik'].map((title, index) => ({ uuid: `00000000-0000-4000-8000-00000000000${index + 1}`, title, senderUuid, senderName: 'Kierownik', content: 'Treść oryginalna', preview: 'Treść oryginalna', createdAt: '2026-11-01T11:00:00+00:00', readAt: null, recipientCount: 2, isSender: false, isRecipient: true, recipients: [] }));
        const sent: object[] = [];
        let replyRequests = 0, deletes = 0, recipientLookups = 0, failBatch = true;
        await page.route('**/api/**', route => {
            const url = new URL(route.request().url());
            if (url.pathname === '/api/messages/unread-count') return route.fulfill({ json: { unreadCount: inbox.length } });
            if (url.pathname === '/api/messages/recipients') { recipientLookups++; return route.fulfill({ json: { items: [] } }); }
            if (url.pathname === '/api/messages/delete') {
                const body = route.request().postDataJSON();
                expect(body.folder).toBe('inbox');
                expect(body.uuids).toEqual(inbox.map(row => row.uuid));
                if (failBatch) return route.fulfill({ status: 503, json: { message: 'Błąd usuwania.' } });
                deletes += body.uuids.length;
                inbox = [];
                return route.fulfill({ json: { message: 'Usunięto' } });
            }
            if (url.pathname.startsWith('/api/messages/') && route.request().method() === 'DELETE') {
                expect(url.searchParams.get('folder')).toBe('inbox');
                inbox = inbox.filter(row => !url.pathname.endsWith(row.uuid));
                deletes++;
                return route.fulfill({ json: { message: 'Usunięto' } });
            }
            if (url.pathname === '/api/messages') {
                if (route.request().method() === 'POST') {
                    const body = route.request().postDataJSON();
                    expect(body.replyToUuid).toBe(inbox[0].uuid);
                    expect(body.recipientUuids).toEqual([senderUuid]);
                    expect(body.title).toBe('Re: Plan pracy');
                    replyRequests++;
                    sent.push({ ...inbox[0], uuid: body.requestUuid, title: body.title, content: body.content, preview: body.content, replyToUuid: body.replyToUuid, isSender: true, isRecipient: false, recipientCount: 1 });
                    return route.fulfill({ status: 201, json: { uuid: body.requestUuid } });
                }
                const rows = url.searchParams.get('folder') === 'sent' ? sent : inbox;
                return route.fulfill({ json: { items: rows, total: rows.length } });
            }
            return route.fulfill({ json: { data: { pageSizes: {}, items: [] } } });
        });
        await page.goto('/messages');
        const table = page.getByRole('table', { name: 'Lista wiadomości', exact: true });
        await expect(table.getByRole('row')).toHaveCount(4);
        await page.getByRole('button', { name: 'Odpowiedz: Plan pracy', exact: true }).click();
        let dialog = page.getByRole('dialog');
        await expect(dialog.getByRole('textbox', { name: 'Odbiorca odpowiedzi', exact: true })).toHaveValue('Kierownik');
        await expect(dialog.getByRole('textbox', { name: /^Tytuł/ })).toHaveValue('Re: Plan pracy');
        await dialog.getByRole('textbox', { name: /^Treść/ }).fill('Potwierdzam odbiór.');
        await dialog.getByRole('button', { name: 'Wyślij wiadomość', exact: true }).click();
        await expect(dialog).toHaveCount(0);
        expect(replyRequests).toBe(1);
        expect(recipientLookups).toBe(0);
        await page.getByRole('tab', { name: 'Odebrane', exact: true }).click();
        await page.getByRole('button', { name: 'Usuń: Plan pracy', exact: true }).click();
        dialog = page.getByRole('dialog');
        await expect(dialog.getByText(/Kopie u pozostałych osób/)).toBeVisible();
        await dialog.getByRole('button', { name: 'Anuluj', exact: true }).click();
        expect(deletes).toBe(0);
        await page.getByRole('button', { name: 'Usuń: Plan pracy', exact: true }).click();
        await dialog.getByRole('button', { name: 'Usuń', exact: true }).click();
        await expect(table.getByRole('row')).toHaveCount(3);
        expect(deletes).toBe(1);
        await page.getByRole('checkbox', { name: 'Zaznacz wszystkie wiadomości na stronie', exact: true }).check();
        await page.getByRole('button', { name: 'Usuń zaznaczone (2)', exact: true }).click();
        await dialog.getByRole('button', { name: 'Usuń', exact: true }).click();
        await expect(page.getByText('Błąd usuwania.', { exact: true })).toBeVisible();
        await expect(dialog).toBeVisible();
        failBatch = false;
        await dialog.getByRole('button', { name: 'Usuń', exact: true }).click();
        await expect(dialog).toHaveCount(0);
        await expect(page.getByText('Brak wiadomości w tej skrzynce.', { exact: true })).toBeVisible();
        expect(deletes).toBe(3);
        expect(await table.locator('..').evaluate(container => container.scrollWidth >= container.clientWidth)).toBeTruthy();
    });
}
