import { test, expect } from '@playwright/test';

const baseUrl = 'http://localhost:3000';

test.describe('After login', () => {
    test('debug', async ({ page }) => {

        await page.goto(baseUrl);

        const storage = await page.evaluate(() => ({
            localStorage: { ...localStorage },
            sessionStorage: { ...sessionStorage },
        }));

        //console.log('STORAGE:', storage);

        const links = await page.getByRole('link').all();
        console.log(`links: ${links.length}`);

        for (const link of links) {
            // console.log({
            //     text: (await link.innerText()).trim(),
            //     href: await link.getAttribute('href'),
            // });
        }

        const buttons = await page.getByRole('button').all();
        //console.log(`buttons: ${buttons.length}`);

        for (const btn of buttons) {
            //console.log('BUTTON:', (await btn.innerText()).trim());
        }
    });

    test('po zalogowaniu istnieją linki w menu i dashboard', async ({ page }) => {
        await page.goto(`${baseUrl}/`);

        // Navigation
        const navLinks = ['STRONA GŁÓWNA', 'INFORMACJE', 'HR APP'];
        for (const text of navLinks) {
            const link = page.getByRole('link', { name: text, exact: false });
            await expect(link).toBeVisible();
        }

        // Dropdown / buttony
        const dropdownButtons = ['ZARZĄDZANIE', 'USTAWIENIA'];
        for (const text of dropdownButtons) {
            const button = page.getByRole('button', { name: text, exact: false });
            await expect(button).toBeVisible();
        }

        // Dashboard
        const dashboardLinks = ['sysytem', 'firma', 'notatki', 'dokumenty'];
        for (const text of dashboardLinks) {
            const link = page.locator('a', { hasText: text });
            await expect(link).toBeVisible();
        }
    });
});
