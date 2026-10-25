import { expect, test } from "@playwright/test";

test("equipment selects a storage location, filters by it and keeps equipment when a location is deleted", async ({ page }) => {
  const token = [
    Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url"),
    Buffer.from(JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 3600,
      modules: ["equipment"], accesses: ["equipment"], permissions: ["equipment.*"], tenantSlug: "default",
    })).toString("base64url"),
    "test",
  ].join(".");
  await page.addInitScript((value) => localStorage.setItem("auth_token", value), token);
  const locations = [
    { uuid: "00000000-0000-4000-8000-000000000001", name: "za barem", version: 1 },
    { uuid: "00000000-0000-4000-8000-000000000002", name: "na zmywaku", version: 1 },
  ];
  const category = { uuid: "00000000-0000-4000-8000-000000000003", name: "Urządzenia grzewcze", version: 1 };
  const equipment: { uuid: string; code: string; name: string; categoryUuid: string; unit: string; active: boolean; version: number; storageLocationUuid: string | null }[] = [];
  const project = (item: typeof equipment[number]) => ({
    ...item, category: category.name,
    storageLocation: locations.find((location) => location.uuid === item.storageLocationUuid)?.name ?? null,
  });
  await page.route("**/api/**", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const body = request.postData() ? request.postDataJSON() : {};
    if (url.pathname.startsWith("/api/equipment-locations")) {
      const location = locations.find((entry) => url.pathname.endsWith(entry.uuid));
      if (request.method() === "PUT" && location) {
        location.name = body.name;
        location.version++;
        return route.fulfill({ json: location });
      }
      if (request.method() === "DELETE" && location) {
        expect(body.version).toBe(location.version);
        for (const item of equipment.filter((entry) => entry.storageLocationUuid === location.uuid)) {
          item.storageLocationUuid = null;
          item.version++;
        }
        locations.splice(locations.indexOf(location), 1);
        return route.fulfill({ json: { success: true } });
      }
      const query = (url.searchParams.get("q") || "").toLowerCase();
      const items = locations.filter((entry) => entry.name.toLowerCase().includes(query));
      return route.fulfill({ json: { items, total: items.length } });
    }
    if (url.pathname === "/api/equipment-categories") return route.fulfill({ json: { items: [category], total: 1 } });
    if (url.pathname.startsWith("/api/equipment")) {
      if (request.method() === "POST") {
        expect(body.storageLocationUuid).toBe(locations[0].uuid);
        const item = { ...body, uuid: "00000000-0000-4000-8000-000000000004", active: true, version: 1 };
        equipment.push(item);
        return route.fulfill({ status: 201, json: project(item) });
      }
      const locationUuid = url.searchParams.get("storageLocationUuid");
      const items = equipment.filter((item) => !locationUuid || item.storageLocationUuid === locationUuid).map(project);
      return route.fulfill({ json: { items, total: items.length } });
    }
    return route.fulfill({ json: { items: [], total: 0 } });
  });
  await page.goto("/catering/equipment");
  await page.getByRole("button", { name: "Dodaj pozycję", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Kod").fill("HEATER");
  await dialog.getByLabel(/^Nazwa(?:\s*\*)?$/).fill("Warnik na wodę");
  await dialog.getByRole("combobox", { name: "Kategoria sprzętu" }).click();
  await page.getByRole("option", { name: category.name, exact: true }).click();
  await dialog.getByRole("combobox", { name: "Miejsce przechowywania", exact: true }).click();
  await page.getByRole("option", { name: "za barem", exact: true }).click();
  await dialog.getByRole("button", { name: "Zapisz", exact: true }).click();
  await expect(dialog).toBeHidden();
  const row = page.getByRole("row").filter({ hasText: "HEATER" });
  await expect(row).toContainText("za barem");
  await page.getByRole("link", { name: "Miejsca sprzętu", exact: true }).click();
  await expect(page).toHaveURL(/\/catering\/equipment\/locations$/);
  await page.getByRole("row").filter({ hasText: "za barem" }).getByRole("button", { name: "Edytuj", exact: true }).click();
  await dialog.getByLabel("Nazwa miejsca sprzętu").fill("Za barem, półka 2");
  await dialog.getByRole("button", { name: "Zapisz miejsce sprzętu", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("link", { name: "Wróć do sprzętu", exact: true }).click();
  await expect(row).toContainText("Za barem, półka 2");
  await page.getByRole("combobox", { name: "Filtruj miejsce przechowywania" }).click();
  await page.getByRole("option", { name: "na zmywaku", exact: true }).click();
  await expect(row).toHaveCount(0);
  await page.getByRole("combobox", { name: "Filtruj miejsce przechowywania" }).locator("..").getByRole("button", { name: "Clear", exact: true }).click();
  await expect(row).toBeVisible();
  await page.getByRole("link", { name: "Miejsca sprzętu", exact: true }).click();
  await expect(page).toHaveURL(/\/catering\/equipment\/locations$/);
  await page.getByRole("row").filter({ hasText: "Za barem, półka 2" }).getByRole("button", { name: "Usuń", exact: true }).click();
  await expect(dialog).toContainText("pozostanie w katalogu bez wskazanego miejsca");
  await dialog.getByRole("button", { name: "Usuń miejsce sprzętu", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("link", { name: "Wróć do sprzętu", exact: true }).click();
  await expect(row).toBeVisible();
  await expect(row).not.toContainText("Za barem, półka 2");
  expect(equipment[0].storageLocationUuid).toBeNull();
});
