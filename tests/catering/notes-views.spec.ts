import { expect, test, type Page } from '@playwright/test';

const notes = [
    { uuid: '00000000-0000-4000-8000-000000000001', title: 'Pilne zamówienie', content: 'Potwierdzić menu.\nZadzwonić do klienta.', priority: 'high', createdAt: '2026-10-28 10:00:00' },
    { uuid: '00000000-0000-4000-8000-000000000002', title: 'Transport', content: 'Sprawdzić godzinę dostawy.', priority: 'medium', createdAt: '2026-10-28 09:00:00' },
    { uuid: '00000000-0000-4000-8000-000000000003', title: 'Pomysły', content: '<script>window.unsafeNote = true</script>\nNowe dekoracje.', priority: 'low', createdAt: '2026-10-28 08:00:00' },
];

async function authenticate(page: Page, editable = true, board = false) {
    const payload = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'default', tenantName: 'Test', user: { uuid: '00000000-0000-4000-8000-000000000010' }, modules: ['notes'], accesses: ['notes'], permissions: editable ? ['notes.*'] : ['notes.list'] };
    const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(payload)).toString('base64url'), 'test'].join('.');
    await page.addInitScript(({ token, board }) => {
        localStorage.setItem('auth_token', token);
        if (board && !localStorage.getItem('notes:view')) localStorage.setItem('notes:view', 'board');
    }, { token, board });
}

test('switches between table and sticky notes with the same data, colors and actions', async ({ page }, testInfo) => {
    await authenticate(page);
    let listCalls = 0;
    const requests: URL[] = [];
    await page.route('**/api/**', route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/api/users/notes') {
            listCalls++;
            requests.push(url);
            const items = url.searchParams.get('phrase') ? notes.filter(note => note.title.includes(url.searchParams.get('phrase')!)) : notes;
            return route.fulfill({ json: { data: { items, total: items.length } } });
        }
        if (url.pathname.startsWith('/api/users/notes/')) return route.fulfill({ json: { data: notes.find(note => url.pathname.endsWith(note.uuid)) } });
        return route.fulfill({ json: {} });
    });
    await page.goto('/module/notes');
    await expect(page.getByRole('list', { name: 'Karteczki' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Karteczki', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Tabela', exact: true }).click();
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: '#', exact: true }).getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('cell', { name: 'Pilne zamówienie', exact: true })).toBeVisible();
    const initialCalls = listCalls;
    await page.getByRole('button', { name: 'Karteczki', exact: true }).click();
    const board = page.getByRole('list', { name: 'Karteczki' });
    await expect(board).toBeVisible();
    await expect(page.getByRole('table')).not.toBeVisible();
    for (const priority of ['wysoki', 'średni', 'niski']) {
        await expect(board.getByText(priority, { exact: true })).toHaveCount(0);
    }
    for (const [index, color] of ['rgb(229, 57, 53)', 'rgb(251, 140, 0)', 'rgb(253, 216, 53)'].entries()) {
        await expect(board.getByRole('listitem', { name: notes[index].title, exact: true })).toHaveCSS('border-top-color', color);
        expect(await board.getByRole('listitem', { name: notes[index].title, exact: true }).evaluate(element => getComputedStyle(element, '::before').content)).toBe('none');
        await expect(board.getByRole('heading', { name: notes[index].title, exact: true })).toBeVisible();
    }
    await expect(board.getByText('Zadzwonić do klienta.', { exact: false })).toBeVisible();
    await expect(board.getByText('<script>window.unsafeNote = true</script>', { exact: false })).toBeVisible();
    expect(await page.evaluate(() => 'unsafeNote' in window)).toBe(false);
    expect(listCalls).toBe(initialCalls);
    await page.screenshot({ path: testInfo.outputPath('sticky-notes.png'), fullPage: true });
    await page.getByRole('checkbox', { name: 'Zaznacz notatkę: Pilne zamówienie' }).check();
    await expect(page.getByRole('button', { name: /Usuń zaznaczone notatki.*1/ })).toBeVisible();
    await page.getByRole('button', { name: 'Tabela', exact: true }).click();
    await expect(page.getByRole('table').getByRole('checkbox').nth(1)).toBeChecked();
    await page.getByRole('button', { name: 'Karteczki', exact: true }).click();
    await page.getByRole('button', { name: 'edycja: Pilne zamówienie' }).click();
    await expect(page.getByRole('dialog')).toContainText('Edycja notatki');
    await expect(page.getByRole('dialog').getByRole('textbox', { name: 'tytuł', exact: true })).toHaveValue('Pilne zamówienie');
    await page.getByRole('dialog').getByRole('button', { name: /anuluj/i }).click();
    await page.getByRole('button', { name: 'podgląd: Pilne zamówienie' }).click();
    await expect(page.getByRole('dialog')).toContainText('Podgląd notatki');
    await expect(page.getByRole('dialog')).toHaveCSS('border-top-color', 'rgb(229, 57, 53)');
    expect(await page.getByRole('dialog').evaluate(element => getComputedStyle(element, '::before').content)).toBe('none');
    await expect(page.getByRole('dialog')).toContainText('Zadzwonić do klienta.');
    await expect(page.getByRole('dialog')).not.toContainText(notes[0].uuid);
    await expect(page.getByRole('dialog').getByText('wysoki', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('sticky-note-preview.png'), fullPage: true });
    await page.getByRole('dialog').getByRole('button', { name: /zamknij/i }).click();
    await page.getByRole('button', { name: 'Tabela', exact: true }).click();
    await page.getByRole('button', { name: 'podgląd: Pilne zamówienie' }).click();
    await expect(page.getByRole('dialog')).toContainText(notes[0].uuid);
    await expect(page.getByRole('dialog').getByText('wysoki', { exact: true })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: /zamknij/i }).click();
    await page.getByRole('button', { name: 'Karteczki', exact: true }).click();
    await page.getByRole('combobox', { name: 'Sortuj według' }).click();
    await expect(page.getByRole('option', { name: '#', exact: true })).toHaveCount(0);
    await page.getByRole('option', { name: 'tytuł', exact: true }).click();
    await expect.poll(() => requests.at(-1)?.searchParams.get('sortBy')).toBe('title');
    await page.getByRole('textbox', { name: 'Szukaj notatek' }).fill('Transport');
    await page.getByRole('textbox', { name: 'Szukaj notatek' }).press('Enter');
    await expect(board.getByRole('listitem')).toHaveCount(1);
    await expect(board.getByRole('heading', { name: 'Transport' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Karteczki', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('list', { name: 'Karteczki' })).toBeVisible();
    await page.getByRole('button', { name: 'Tabela', exact: true }).click();
    await page.reload();
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tabela', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('read-only sticky notes work on mobile without editing or deletion controls', async ({ page }) => {
    await authenticate(page, false, true);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/api/**', route => route.fulfill({ json: { data: { items: notes, total: notes.length } } }));
    await page.goto('/module/notes');
    const board = page.getByRole('list', { name: 'Karteczki' });
    await expect(board.getByRole('listitem')).toHaveCount(3);
    await expect(board.getByRole('checkbox')).toHaveCount(0);
    await expect(board.getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Dodaj notatkę/ })).toHaveCount(0);
    const dimensions = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});

test('sticky preview fits mobile, scrolls long content and shows fetch errors without logging out', async ({ page }) => {
    await authenticate(page);
    await page.setViewportSize({ width: 390, height: 844 });
    let fail = false;
    const content = 'Treść notatki.\n'.repeat(80) + 'DługiTekst'.repeat(40);
    await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/users/notes') return route.fulfill({ json: { data: { items: [notes[2]], total: 1 } } });
        if (path.startsWith('/api/users/notes/')) return route.fulfill(fail ? { status: 500, json: {} } : { json: { data: { ...notes[2], content } } });
        return route.fulfill({ json: {} });
    });
    await page.goto('/module/notes');
    await page.getByRole('button', { name: 'podgląd: Pomysły' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveCSS('border-top-color', 'rgb(253, 216, 53)');
    await expect(dialog).toContainText('DługiTekst');
    const dimensions = await dialog.evaluate(element => ({ width: element.getBoundingClientRect().width, viewport: window.innerWidth, content: element.scrollWidth, client: element.clientWidth }));
    expect(dimensions.width).toBeLessThan(dimensions.viewport);
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.client);
    await dialog.getByRole('button', { name: /zamknij/i }).click();
    fail = true;
    await page.getByRole('button', { name: 'podgląd: Pomysły' }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/module\/notes$/);
});

test('empty sticky notes and their previews do not display placeholder content', async ({ page }) => {
    await authenticate(page);
    const emptyNotes = [{ ...notes[0], content: '' }, { ...notes[1], content: null }];
    await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/users/notes') return route.fulfill({ json: { data: { items: emptyNotes, total: emptyNotes.length } } });
        if (path.startsWith('/api/users/notes/')) return route.fulfill({ json: { data: emptyNotes.find(note => path.endsWith(note.uuid)) } });
        return route.fulfill({ json: {} });
    });
    await page.goto('/module/notes');
    const board = page.getByRole('list', { name: 'Karteczki' });
    await expect(board.getByRole('listitem')).toHaveCount(2);
    await expect(board).not.toContainText('Brak treści');
    for (const note of emptyNotes) {
        await expect(board.getByLabel(`Treść notatki: ${note.title}`)).toBeEmpty();
        await page.getByRole('button', { name: `podgląd: ${note.title}` }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog.getByRole('progressbar')).toHaveCount(0);
        await expect(dialog).not.toContainText('Brak treści');
        await expect(dialog.locator('.MuiDialogContent-root')).toBeEmpty();
        await dialog.getByRole('button', { name: /zamknij/i }).click();
    }
});
