import { expect, test } from "@playwright/test";

test("company is visibly required and pending saves block repeated submissions, including after an error", async ({ page }) => {
    const token = [
        Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url"),
        Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, modules: ["company"], accesses: ["departments"], permissions: ["departments.*"], tenantSlug: "default" })).toString("base64url"),
        "test",
    ].join(".");
    await page.addInitScript(value => localStorage.setItem("auth_token", value), token);
    let posts = 0;
    let release: (() => void) | undefined;
    await page.route("**/api/**", async route => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path === "/api/companies/select-options") return route.fulfill({ json: { data: [{ uuid: "00000000-0000-4000-8000-000000000001", fullName: "Firma testowa" }] } });
        if (path === "/api/departments/parent-options") return route.fulfill({ json: { data: [] } });
        if (path === "/api/departments" && request.method() === "POST") {
            posts++;
            await new Promise<void>(resolve => { release = resolve; });
            return route.fulfill({ status: posts === 1 ? 422 : 201, json: { message: posts === 1 ? "Testowy błąd zapisu" : "Zapisano departament" } });
        }
        return route.fulfill({ json: { data: { items: [], total: 0 } } });
    });
    await page.goto("/manage/departments/list");
    await page.getByRole("button", { name: /dodaj departament/i }).click();
    const dialog = page.getByRole("dialog", { includeHidden: true });
    const company = dialog.getByRole("combobox", { name: /firma/i });
    await expect(company).toHaveAttribute("required", "");
    await dialog.getByRole("button", { name: /zapisz/i, includeHidden: true }).click();
    await expect(company).toHaveAttribute("aria-invalid", "true");
    const helperId = await company.getAttribute("aria-describedby");
    expect(helperId).toBeTruthy();
    await expect(page.locator(`[id="${helperId}"]`)).toHaveText(/wymagane/i);
    await dialog.getByLabel(/^nazwa/i).fill("Czystość i higiena");
    await dialog.getByLabel(/wewnętrzny kod/i).fill("czystosc");
    await company.fill("Firma");
    await page.getByRole("option", { name: "Firma testowa" }).click();
    await dialog.getByRole("combobox", { name: /kraj/i }).fill("Polska");
    await page.getByRole("option", { name: "Polska", exact: true }).click();
    await dialog.getByLabel(/miasto/i).fill("Gdańsk");
    await dialog.getByLabel(/kod pocztowy/i).fill("80-560");
    await dialog.getByLabel(/ulica/i).fill("Testowa 1");
    const save = dialog.getByRole("button", { name: /zapisz/i, includeHidden: true });
    await save.click();
    await expect(page.getByRole("status")).toBeVisible();
    await expect(save).toBeDisabled();
    await save.evaluate(button => (button as HTMLButtonElement).form?.requestSubmit());
    await expect.poll(() => posts).toBe(1);
    release?.();
    await expect(page.getByRole("status")).not.toBeVisible();
    await expect(dialog.getByText("Testowy błąd zapisu")).toBeVisible();
    await expect(save).toBeEnabled();
    await save.click();
    await expect.poll(() => posts).toBe(2);
    release?.();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("status")).not.toBeVisible();
});
