import { expect, test } from "@playwright/test";

test("checking fictitious PESEL generates it, unchecking clears it and optional fields are not required", async ({ page }) => {
    const token = [
        Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url"),
        Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, modules: ["company"], accesses: ["employees"], permissions: ["employees.*"], tenantSlug: "default" })).toString("base64url"),
        "test",
    ].join(".");
    await page.addInitScript(value => localStorage.setItem("auth_token", value), token);
    let generated = 0;
    let created = 0;
    await page.route("**/api/**", route => {
        if (new URL(route.request().url()).pathname === "/api/employees/generate-fake-pesel") {
            generated++;
            return route.fulfill({ json: { pesel: "44051401458", isPeselFake: true } });
        }
        const path = new URL(route.request().url()).pathname;
        if (path === "/api/employees" && route.request().method() === "POST") {
            const body = route.request().postDataJSON();
            expect(body.isPeselFake).toBe(true);
            expect(body.pesel).toBe("44051401458");
            expect(body.lastName).toBe("");
            expect(body.phones).toEqual(["123456789"]);
            expect(body.email).toBe("anna@example.test");
            for (const field of ["companyUUID", "departmentUUID", "positionUUID", "contractTypeUUID", "roleUUID"]) expect(body[field]).toBe("00000000-0000-4000-8000-000000000001");
            created++;
            return route.fulfill({ status: 201, json: { message: "Dodano pracownika" } });
        }
        const options = path === "/api/employees" ? [] : [{ uuid: "00000000-0000-4000-8000-000000000001", fullName: "Firma testowa", name: "Opcja testowa" }];
        return route.fulfill({ json: { data: { items: options, total: options.length } } });
    });
    await page.goto("/manage/employees/list");
    await page.getByRole("button", { name: /dodaj pracownika/i }).click();
    const dialog = page.getByRole("dialog");
    const pesel = dialog.getByRole("textbox", { name: /^pesel/i });
    await expect(pesel).toHaveAttribute("required", "");
    await expect(dialog.getByRole("textbox", { name: /nazwisko/i })).not.toHaveAttribute("required");
    await expect(dialog.getByRole("combobox", { name: /miasto/i })).not.toHaveAttribute("required");
    const checkbox = dialog.getByRole("checkbox", { name: "Fikcyjny PESEL" });
    await checkbox.check();
    await expect(pesel).toHaveValue("44051401458");
    await expect(checkbox).toBeChecked();
    expect(generated).toBe(1);
    await expect(dialog.getByRole("textbox", { name: /nazwisko/i })).toHaveCSS("font-size", "14px");
    await checkbox.uncheck();
    await expect(pesel).toHaveValue("");
    await expect(checkbox).not.toBeChecked();
    await dialog.getByRole("button", { name: /zapisz/i }).click();
    await expect(dialog.getByText("Podaj co najmniej jeden numer telefonu")).toBeVisible();
    await dialog.getByRole("textbox", { name: /^imię/i }).fill("Anna");
    await dialog.getByRole("textbox", { name: /telefon 1/i }).fill("123456789");
    await dialog.getByRole("textbox", { name: /adres email/i }).fill("anna@example.test");
    const company = dialog.getByRole("combobox", { name: /^firma/i });
    await company.fill("Firma");
    await page.getByRole("option", { name: "Firma testowa" }).click();
    const department = dialog.getByRole("combobox", { name: /^oddział/i });
    await department.fill("Opcja");
    await page.getByRole("option", { name: "Opcja testowa" }).click();
    for (const name of [/stanowisko/i, /forma zatrud/i, /rola w serwisie/i]) {
        await dialog.getByRole("combobox", { name }).click();
        await page.getByRole("option", { name: "Opcja testowa" }).click();
    }
    await checkbox.check();
    await expect(pesel).toHaveValue("44051401458");
    await dialog.getByRole("button", { name: /zapisz/i }).click();
    await expect(dialog).not.toBeVisible();
    expect(created).toBe(1);
});
