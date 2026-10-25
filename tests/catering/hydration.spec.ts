import { expect, test } from "@playwright/test";

for (const path of ["/manage/employees/list", "/catering/events", "/module/notes"]) {
  test(`layout hydrates without errors on ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/**", route => route.fulfill({ json: { items: [], total: 0 } }));
    await page.goto(path);
    await expect(page.locator(".Toastify")).toBeAttached();
    await expect(page.locator('a[href="/login"]').first()).toBeVisible();
    await page.reload();
    await expect(page.locator(".Toastify")).toBeAttached();
    await expect(page.locator('a[href="/login"]').first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}
