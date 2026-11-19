import { expect, test } from "@playwright/test";

const published = {
  uuid: "00000000-0000-4000-8000-000000000101",
  title: "Grafik maja",
  body: "Zmiana godzin kuchni.",
  createdByName: "Anna",
  createdAt: "2026-11-01T10:00:00+00:00",
  updatedAt: "2026-11-01T10:00:00+00:00",
  publishAt: "2026-11-01T10:00:00+00:00",
  active: true,
  archivedAt: null,
  status: "published",
  cover: null,
  gallery: [],
};
const scheduled = {
  ...published,
  uuid: "00000000-0000-4000-8000-000000000102",
  title: "Menu swiateczne",
  publishAt: "2026-12-20T08:00:00+00:00",
  status: "scheduled",
};

function token(permissions: string[]) {
  const claims = { exp: Math.floor(Date.now() / 1000) + 3600, tenantSlug: "mapa-smakow", modules: ["system"], accesses: ["company_notices"], permissions };
  return [Buffer.from('{"alg":"none"}').toString("base64url"), Buffer.from(JSON.stringify(claims)).toString("base64url"), "test"].join(".");
}

test("manager sees notices in a table and can schedule or archive them", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.addInitScript((value) => localStorage.setItem("auth_token", value), token(["company_notices.list", "company_notices.view", "company_notices.create", "company_notices.update", "company_notices.delete"]));
  const requested: string[] = [];
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/company-notices" && route.request().method() === "GET") {
      requested.push(url.searchParams.get("status") ?? "");
      const status = url.searchParams.get("status");
      const items = status === "scheduled" ? [scheduled] : status === "published" ? [published] : [];
      return route.fulfill({ json: { items } });
    }
    return route.fulfill({ json: { items: [], total: 0, unreadCount: 0, data: { pageSizes: {} } } });
  });

  await page.goto("/info");
  const table = page.getByRole("table", { name: "Lista ogłoszeń" });
  await expect(table.getByText("Grafik maja", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Opublikowane", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Czekające na publikację", exact: true }).click();
  await expect(table.getByText("Menu swiateczne", { exact: true })).toBeVisible();
  await expect(table.getByText("Grafik maja", { exact: true })).toHaveCount(0);
  expect(requested).toContain("scheduled");

  await page.getByRole("button", { name: "Dodaj ogłoszenie", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("radio", { name: "Opublikuj od razu", exact: true })).toBeChecked();
  await dialog.getByRole("radio", { name: "Opublikuj od daty", exact: true }).click();
  await expect(dialog.getByLabel("Data i godzina publikacji")).toBeVisible();
  await dialog.getByRole("button", { name: "Anuluj", exact: true }).click();

  await page.getByRole("button", { name: "Opublikowane", exact: true }).click();
  await page.getByRole("button", { name: "Edytuj: Grafik maja", exact: true }).click();
  await expect(dialog.getByRole("switch", { name: "Aktywne" })).toBeChecked();
  await expect(dialog.getByRole("switch", { name: "Zarchiwizowane" })).not.toBeChecked();
});

test("employees still see published notices as cards", async ({ page }) => {
  await page.addInitScript((value) => localStorage.setItem("auth_token", value), token(["company_notices.list", "company_notices.view"]));
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/company-notices") {
      expect(url.searchParams.get("status")).toBeNull();
      return route.fulfill({ json: { items: [published] } });
    }
    return route.fulfill({ json: { items: [], unreadCount: 0, data: { pageSizes: {} } } });
  });
  await page.goto("/info");
  await expect(page.getByRole("heading", { name: "Grafik maja", exact: true })).toBeVisible();
  await expect(page.getByRole("table", { name: "Lista ogłoszeń" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Dodaj ogłoszenie", exact: true })).toHaveCount(0);
});
