import { expect, test } from "@playwright/test";

test("equipment categories, owned quantity and employee slang name", async ({ page }) => {
  const token = [
    Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url"),
    Buffer.from(JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + 3600,
      modules: ["equipment"], accesses: ["equipment"], permissions: ["equipment.*"],
      tenantSlug: "default",
    })).toString("base64url"),
    "test",
  ].join(".");
  await page.addInitScript((value) => localStorage.setItem("auth_token", value), token);
  const categories: { uuid: string; name: string; version: number }[] = [];
  const equipment: {
    uuid: string; code: string; name: string; categoryUuid: string;
    category: string; slangName: string; stockQuantity: number; unit: string;
    version: number; active: boolean;
  }[] = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const parts = url.pathname.split("/").filter(Boolean);
    const method = request.method();
    const body = request.postData() ? request.postDataJSON() : {};
    const respond = (data: unknown, status = 200) => route.fulfill({ status, json: data });
    if (parts[1] === "equipment-categories") {
      const category = categories.find((entry) => entry.uuid === parts[2]);
      if (method === "GET") return respond({ items: categories, total: categories.length, page: 1, limit: 20 });
      if (method === "POST") {
        const created = { uuid: "00000000-0000-4000-8000-000000000001", name: body.name, version: 1 };
        categories.push(created);
        return respond(created, 201);
      }
      if (method === "PUT" && category) {
        category.name = body.name;
        category.version++;
        return respond(category);
      }
      if (method === "DELETE" && category) {
        if (equipment.some((item) => item.categoryUuid === category.uuid)) {
          return respond({ message: "Nie można usunąć kategorii przypisanej do sprzętu." }, 422);
        }
        categories.splice(categories.indexOf(category), 1);
        return respond({ success: true });
      }
    }
    if (parts[1] === "equipment") {
      if (method === "POST") {
        const created = { ...body, uuid: "00000000-0000-4000-8000-000000000002", active: true, version: 1 };
        equipment.push(created);
        return respond(created, 201);
      }
      const item = equipment.find((entry) => entry.uuid === parts[2]);
      if (method === "PUT" && item) {
        Object.assign(item, body, { version: item.version + 1 });
        return respond(item);
      }
      if (method === "GET" && item) return respond(item);
      if (method === "GET") {
        const query = (url.searchParams.get("q") || "").toLowerCase();
        const items = equipment.filter((entry) => `${entry.name} ${entry.slangName} ${entry.code}`.toLowerCase().includes(query));
        return respond({ items, total: items.length, page: 1, limit: 20 });
      }
    }
    return respond({ items: [], total: 0 });
  });

  await page.goto("/catering/equipment");
  await page.getByRole("link", { name: "Kategorie sprzętu", exact: true }).click();
  await page.getByRole("button", { name: "Dodaj kategorię", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nazwa kategorii").fill("Zastawa");
  await dialog.getByRole("button", { name: "Zapisz kategorię" }).click();
  await expect(page.getByRole("cell", { name: "Zastawa", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edytuj", exact: true }).click();
  await dialog.getByLabel("Nazwa kategorii").fill("Naczynia");
  await dialog.getByRole("button", { name: "Zapisz kategorię" }).click();
  await expect(page.getByRole("cell", { name: "Naczynia", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Usuń", exact: true }).click();
  await dialog.getByRole("button", { name: "Usuń kategorię", exact: true }).click();
  await expect(page.getByText("Brak kategorii. Dodaj pierwszą kategorię sprzętu.")).toBeVisible();
  await page.getByRole("button", { name: "Dodaj kategorię", exact: true }).click();
  await dialog.getByLabel("Nazwa kategorii").fill("Zastawa");
  await dialog.getByRole("button", { name: "Zapisz kategorię" }).click();
  await page.getByRole("link", { name: "Wróć do sprzętu" }).click();
  await page.getByRole("button", { name: "Dodaj pozycję" }).click();
  await dialog.getByLabel("Kod", { exact: false }).fill("BOWL-1");
  await dialog.getByLabel(/^Nazwa(?:\s*\*)?$/).fill("Miska do zupy");
  await dialog.getByLabel("Nazwa slangowa", { exact: true }).fill("Bulionówka");
  await dialog.getByRole("combobox", { name: "Kategoria sprzętu" }).click();
  await page.getByRole("option", { name: "Zastawa" }).click();
  await dialog.getByLabel("Ilość posiadana").fill("240");
  await dialog.getByRole("button", { name: "Zapisz", exact: true }).click();
  await expect(dialog).toBeHidden();
  const row = page.getByRole("row").filter({ hasText: "BOWL-1" });
  await expect(row).toContainText("Bulionówka");
  await expect(row).toContainText("240 szt.");
  await row.getByRole("button", { name: "Edytuj" }).click();
  await expect(dialog.getByLabel("Ilość posiadana")).toHaveValue("240");
  await dialog.getByLabel("Ilość posiadana").fill("180");
  await dialog.getByLabel("Nazwa slangowa", { exact: true }).fill("Zupówka");
  await dialog.getByRole("button", { name: "Zapisz", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByLabel("Szukaj po nazwie, nazwie slangowej lub kodzie").fill("Zupówka");
  await expect(row).toContainText("180 szt.");
  await page.getByRole("link", { name: "Kategorie sprzętu", exact: true }).click();
  await page.getByRole("button", { name: "Usuń", exact: true }).click();
  await dialog.getByRole("button", { name: "Usuń kategorię", exact: true }).click();
  await expect(dialog).toContainText("Nie można usunąć kategorii przypisanej do sprzętu.");
});
