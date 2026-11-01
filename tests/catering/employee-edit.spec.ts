import { expect, test } from '@playwright/test';

const referenceUuid = '00000000-0000-4000-8000-000000000001';
const employeeUuid = '00000000-0000-4000-8000-000000000002';
const fixture = {
    uuid: employeeUuid, firstName: 'Anna', lastName: 'Kowalska', pesel: '11111111111', isPeselFake: true,
    internalCode: 'PRAC-1', externalCode: 'EXT-1', active: false,
    company: { uuid: referenceUuid, fullName: 'Mapa Smaków' }, department: { uuid: referenceUuid, name: 'Kuchnia' },
    position: { uuid: referenceUuid, name: 'Kucharz' }, role: { uuid: referenceUuid, name: 'Pracownik' },
    contractType: { uuid: referenceUuid, name: 'Umowa' }, parentEmployee: null,
    employmentFrom: '2025-01-01', employmentTo: '2027-01-01',
    contacts: [{ type: 'email', data: 'anna@example.test' }, { type: 'phone', data: '123456789' }, { type: 'phone', data: '987654321' }],
    address: { street: '', city: '', postcode: '', country: '' }, createdAt: '2026-10-28 10:00:00', updatedAt: null,
};

for (const editable of [true, false]) {
    test(editable ? 'employee edit is visible, prefilled and persists changes using PUT with optional fields' : 'employee edit is hidden without update permission', async ({ page }) => {
        const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: 'default', tenantName: 'Test', modules: ['company'], accesses: ['employees'], permissions: editable ? ['employees.*'] : ['employees.list'] };
        const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify(claims)).toString('base64url'), 'test'].join('.');
        await page.addInitScript(token => localStorage.setItem('auth_token', token), token);
        let saved = false;
        let attempts = 0;
        let fail = true;
        await page.route('**/api/**', route => {
            const path = new URL(route.request().url()).pathname;
            if (path === `/api/employees/${employeeUuid}` && route.request().method() === 'PUT') {
                attempts++;
                const body = route.request().postDataJSON();
                expect(body.firstName).toBe('Diana');
                expect(body.lastName).toBe('Kowalska');
                expect(body.pesel).toBe(fixture.pesel);
                expect(body.isPeselFake).toBe(true);
                expect(body.phones).toEqual(['123456789', '987654321']);
                expect(body.email).toBe('diana@example.test');
                expect(body.contractTypeUUID).toBeNull();
                expect(body.employmentFrom).toBeNull();
                expect(body.employmentTo).toBe('2027-01-01');
                expect(body.active).toBe(false);
                expect(body.internalCode).toBe('PRAC-1');
                expect(body.externalCode).toBe('EXT-1');
                for (const field of ['companyUUID', 'departmentUUID', 'positionUUID', 'roleUUID']) expect(body[field]).toBe(referenceUuid);
                if (fail) return route.fulfill({ status: 409, json: { message: 'Konflikt danych pracownika' } });
                saved = true;
                return route.fulfill({ json: { message: 'Pracownik został zaktualizowany' } });
            }
            if (path === '/api/employees') return route.fulfill({ json: { data: { items: [{ ...fixture, firstName: saved ? 'Diana' : 'Anna' }], total: 1 } } });
            const option = { uuid: referenceUuid, fullName: 'Mapa Smaków', name: path === '/api/departments' ? 'Kuchnia' : path === '/api/contract-types' ? 'Umowa' : 'Opcja' };
            return route.fulfill({ json: { data: { items: [option], total: 1 } } });
        });
        await page.goto('/manage/employees/list');
        await expect(page.getByRole('cell', { name: 'Kowalska Anna', exact: true })).toBeVisible();
        const edit = page.getByRole('button', { name: 'edycja: Anna Kowalska' });
        if (!editable) {
            await expect(edit).toHaveCount(0);
            return;
        }
        await edit.click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toContainText('Edycja danych pracownika');
        await expect(dialog.getByRole('textbox', { name: /^imię/i })).toHaveValue('Anna');
        await expect(dialog.getByRole('textbox', { name: /telefon 1/i })).toHaveValue('123456789');
        await expect(dialog.getByRole('textbox', { name: /telefon 2/i })).toHaveValue('987654321');
        await expect(dialog.getByRole('textbox', { name: /adres email/i })).toHaveValue('anna@example.test');
        await expect(dialog.getByRole('checkbox', { name: 'Fikcyjny PESEL' })).toBeChecked();
        await expect(dialog.getByRole('combobox', { name: /^firma/i })).toHaveValue('Mapa Smaków');
        await expect(dialog.getByRole('combobox', { name: /^oddział/i })).toHaveValue('Kuchnia');
        await dialog.getByRole('textbox', { name: /^imię/i }).fill('Diana');
        await dialog.getByRole('textbox', { name: /adres email/i }).fill('diana@example.test');
        await dialog.locator('input[name="employmentFrom"]').fill('');
        await dialog.getByRole('combobox', { name: /forma zatrud/i }).click();
        await page.getByRole('option', { name: 'Brak', exact: true }).click();
        await dialog.getByRole('button', { name: /zapisz/i }).click();
        await expect(dialog.getByText('Konflikt danych pracownika')).toBeVisible();
        expect(await page.evaluate(() => localStorage.getItem('company-structure-changed'))).toBeNull();
        await expect(dialog.getByRole('textbox', { name: /^imię/i })).toHaveValue('Diana');
        fail = false;
        await dialog.getByRole('button', { name: /zapisz/i }).click();
        await expect(dialog).not.toBeVisible();
        await expect(page.getByRole('cell', { name: 'Kowalska Diana', exact: true })).toBeVisible();
        expect(attempts).toBe(2);
        expect(await page.evaluate(() => localStorage.getItem('company-structure-changed'))).toBeTruthy();
    });
}
