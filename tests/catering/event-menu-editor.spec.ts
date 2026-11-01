import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
    test(`adding dishes creates collapsed rows without an extra blank item at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'default', modules: ['events'], accesses: ['events'], permissions: ['events.view', 'events.plan_event_menu'] };
        const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
        await page.addInitScript(value => localStorage.setItem('auth_token', value), token);
        type Dish = { name: string; portions: number; diets: string[]; allergens: string[] };
        let event = {
            uuid: '00000000-0000-4000-8000-000000000001', title: 'Wystawa', date: '2026-11-04', timezone: 'Europe/Warsaw', status: 'draft', version: 1, guestCount: 50,
            location: { venue: '', street: '', city: '', postalCode: '', instructions: '' }, menu: [] as Dish[], attachments: [], equipment: [], staff: [], contacts: [],
        };
        let saves = 0;
        await page.route('**/api/**', route => {
            const path = new URL(route.request().url()).pathname;
            if (path === `/api/events/${event.uuid}/menu` && route.request().method() === 'PUT') {
                const body = route.request().postDataJSON();
                expect(body.items.every((item: Dish) => item.name.trim() && item.portions > 0)).toBe(true);
                for (const item of body.items) expect(item).not.toHaveProperty('clientId');
                event = { ...event, menu: body.items, version: event.version + 1 };
                saves++;
                return route.fulfill({ json: event });
            }
            return route.fulfill({ json: path === `/api/events/${event.uuid}` ? event : { data: {}, items: [] } });
        });
        await page.goto(`/catering/events/${event.uuid}`);
        const menuTab = page.getByRole('navigation', { name: 'Zakładki wydarzenia' }).getByRole('button', { name: 'Menu', exact: true });
        await menuTab.click();
        const list = page.getByRole('list', { name: 'Potrawy w menu' });
        await page.getByRole('button', { name: 'Dodaj potrawę', exact: true }).click();
        let dialog = page.getByRole('dialog', { name: 'Dodaj potrawę do menu' });
        await dialog.getByRole('button', { name: 'Dodaj do menu', exact: true }).click();
        await expect(dialog).toBeVisible();
        await expect(list.getByRole('listitem')).toHaveCount(0);
        await dialog.getByLabel('Potrawa').fill('Zupa');
        await dialog.getByLabel('Liczba porcji').fill('50');
        await dialog.getByLabel('Diety, oddziel przecinkami').fill('wegetariańska');
        await dialog.getByLabel('Wielkość porcji').fill('250 ml');
        await dialog.getByRole('button', { name: 'Dodaj do menu', exact: true }).click();
        await expect(dialog).toHaveCount(0);
        expect(saves).toBe(0);
        await expect(list.getByRole('listitem')).toHaveCount(1);
        await expect(page.getByLabel('Potrawa')).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Rozwiń potrawę: Zupa', exact: true })).toHaveAttribute('aria-expanded', 'false');
        await page.getByRole('button', { name: 'Zapisz menu wydarzenia', exact: true }).click();
        await expect.poll(() => saves).toBe(1);
        expect(event.menu).toHaveLength(1);
        await page.getByRole('button', { name: 'Rozwiń potrawę: Zupa', exact: true }).click();
        await expect(list.getByText('wegetariańska', { exact: true })).toBeVisible();
        await expect(list.getByText('250 ml', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Zwiń potrawę: Zupa', exact: true }).click();
        await page.getByRole('button', { name: 'Dodaj potrawę', exact: true }).click();
        dialog = page.getByRole('dialog');
        await dialog.getByLabel('Potrawa').fill('Zupa');
        await dialog.getByLabel('Diety, oddziel przecinkami').fill('wegańska');
        await dialog.getByRole('button', { name: 'Dodaj do menu', exact: true }).click();
        await list.getByRole('button', { name: 'Usuń potrawę', exact: true }).first().click();
        await list.getByRole('button', { name: 'Edytuj potrawę: Zupa', exact: true }).click();
        await expect(page.getByLabel('Diety, oddziel przecinkami')).toHaveValue('wegańska');
        await page.getByLabel('Liczba porcji').fill('10');
        await page.getByRole('dialog').getByRole('button', { name: 'Zapisz pozycję', exact: true }).click();
        await expect(list.getByText('Porcje: 10')).toBeVisible();
        await page.getByRole('button', { name: 'Dodaj potrawę', exact: true }).click();
        await page.getByRole('dialog').getByRole('button', { name: 'Anuluj', exact: true }).click();
        await expect(list.getByRole('listitem')).toHaveCount(1);
        await page.getByRole('button', { name: 'Zapisz menu wydarzenia', exact: true }).click();
        await expect.poll(() => saves).toBe(2);
        expect(event.menu[0]).toMatchObject({ name: 'Zupa', portions: 10, diets: ['wegańska'] });
        await page.reload();
        await menuTab.click();
        await expect(list.getByRole('listitem')).toHaveCount(1);
        await expect(list.getByRole('button', { name: 'Rozwiń potrawę: Zupa', exact: true })).toHaveAttribute('aria-expanded', 'false');
        await page.screenshot({ path: `/tmp/event-menu-collapsed-${width}.png`, fullPage: true });
    });
}
