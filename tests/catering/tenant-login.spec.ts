import { expect, test } from "@playwright/test";

test("login selects a named tenant and sends its code instead of default", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  let loginTenant = "";
  const slug = "mapa-smakow";
  const token = [
    Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url"),
    Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: slug, tenantName: "Mapa Smaków", modules: [], accesses: [], permissions: [] })).toString("base64url"),
    "test",
  ].join(".");
  await page.route("**/api/**", route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/saas/tenant-options") return route.fulfill({ json: { items: [{ slug, name: "Mapa Smaków" }, { slug: "inna-firma", name: "Inna firma" }] } });
    if (path === "/api/login") {
      loginTenant = request.headers()["x-tenant"];
      return route.fulfill({ json: { token } });
    }
    return route.fulfill({ json: { items: [], total: 0 } });
  });
  await page.goto("/login");
  const company = page.getByRole("combobox", { name: "Kod firmy" });
  await expect(company).toHaveValue("");
  await company.click();
  await page.getByRole("option", { name: "Mapa Smaków (mapa-smakow)" }).click();
  await expect(company).toHaveValue(slug);
  await page.locator("#email").fill("admin.ec@gmail.com");
  await page.locator("#password").fill("test-password");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL("/");
  await expect(page.getByText("Zalogowano do firmy: Mapa Smaków (mapa-smakow).", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Zalogowano do firmy: Mapa Smaków (mapa-smakow).", { exact: true })).toBeVisible();
  expect(loginTenant).toBe(slug);
  expect(await page.evaluate(() => localStorage.getItem("selected_tenant"))).toBe(slug);
  expect((await page.context().cookies()).find(cookie => cookie.name === "tenant_slug")?.value).toBe(slug);
  expect(errors).toEqual([]);
  await page.goto("/login");
  await expect(company).toHaveValue(slug);
});

test("technical greeting resolves the company for an existing token without its name", async ({ page }) => {
  const token = [
    Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url"),
    Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: "inna-firma", modules: [], accesses: [], permissions: [] })).toString("base64url"),
    "test",
  ].join(".");
  await page.addInitScript(value => localStorage.setItem("auth_token", value), token);
  await page.route("**/api/**", route => route.fulfill({ json: { items: [{ slug: "mapa-smakow", name: "Mapa Smaków" }, { slug: "inna-firma", name: "Inna firma" }] } }));
  await page.goto("/");
  await expect(page.getByText("Zalogowano do firmy: Inna firma (inna-firma).", { exact: true })).toBeVisible();
  await expect(page.getByText("Mapa Smaków", { exact: true })).toHaveCount(0);
});

test("login link preselects its tenant and missing company prevents login", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/**", route => {
    if (new URL(route.request().url()).pathname === "/api/login") attempts++;
    return route.fulfill({ json: { items: [{ slug: "mapa-smakow", name: "Mapa Smaków" }, { slug: "inna-firma", name: "Inna firma" }] } });
  });
  await page.goto("/login?tenant=mapa-smakow");
  const company = page.getByRole("combobox", { name: "Kod firmy" });
  await expect(company).toHaveValue("mapa-smakow");
  await company.fill("");
  await page.locator("#email").fill("admin.ec@gmail.com");
  await page.locator("#password").fill("test-password");
  await page.locator('button[type="submit"]').click();
  await expect(page.getByText("Wybierz firmę lub wpisz jej kod.", { exact: true })).toBeVisible();
  expect(attempts).toBe(0);
});
