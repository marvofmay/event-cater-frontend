import { expect, test } from "@playwright/test";

test("file manager uses the application palette", async ({ page }) => {
    const token = [
        Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url"),
        Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, modules: ["file_manager"], accesses: ["file_manager"], permissions: ["file_manager.*"], tenantSlug: "default" })).toString("base64url"),
        "test",
    ].join(".");
    await page.addInitScript(value => localStorage.setItem("auth_token", value), token);
    await page.route("**/api/**", route => route.fulfill({ json: { data: { items: [], total: 0 } } }));
    await page.goto("/module/file_manager");
    const theme = page.locator(".eventcater-file-manager .wx-willow-theme").first();
    await expect(theme).toBeVisible();
    await expect.poll(() => theme.evaluate(element => getComputedStyle(element).getPropertyValue("--wx-color-primary").trim())).toBe("#34495e");
    await expect(page.locator(".eventcater-file-manager .wx-filemanager .wx-button.wx-primary.wx-block").first()).toHaveCSS("background-color", "rgb(46, 125, 50)");
    await page.screenshot({ path: "/tmp/eventcater-file-manager-theme.png", fullPage: true });
});
